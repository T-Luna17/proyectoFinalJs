import { getData, postData, updateData, deleteData } from '../services/services.js';

const form = document.getElementById('consultaForm');
const listaConsultas = document.getElementById('consultasLista');
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancelBtn");

// --- Validar sesión y mostrar nombre de usuario ---
const sessionUser = JSON.parse(localStorage.getItem('sessionUser'));
if (!sessionUser) window.location.href = 'index.html';
if (sessionUser.rol !== "profesor") window.location.href = 'ConsultasE.html';

const userNameElement = document.querySelector('.user-name');
if (userNameElement) userNameElement.textContent = sessionUser.nombre;

// Llenar automáticamente el input "nombre" con el usuario logueado
const inputNombre = document.getElementById("nombre");
if (inputNombre && sessionUser) {
    inputNombre.value = sessionUser.nombre;
}


// --- Logout ---
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("sessionUser");
  window.location.href = 'index.html';
});

// --- Resto de tu código original ---
let editing = false;
let consultaEditandoId = null;
let editMode = false;
let editId = null;

async function cargarConsultas() {
    const consultas = await getData('consultas');
    listaConsultas.innerHTML = '';

    consultas.forEach(consulta => {
        const divConsulta = document.createElement("div");
        divConsulta.setAttribute("class", "consulta-card");

        const pNombre = document.createElement("p");
        pNombre.innerText = `Estudiante: ${consulta.nombre}`;

        const h3Consulta = document.createElement("h3");
        h3Consulta.innerText = consulta.consulta;

        const pMensajeProf = document.createElement("p");
        pMensajeProf.innerText = `Profesor: ${consulta.mensaje || "No hay mensaje del profesor"}`;

        const pHoraConsulta = document.createElement("p");
        const formatoHora = new Date(consulta.hora).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        pHoraConsulta.innerText = `Hora: ${formatoHora}`;

        const btnEditarConsulta = document.createElement("button");
        btnEditarConsulta.setAttribute("class", "btn-editar");
        btnEditarConsulta.innerText = "Responder";

        const btnEliminarConsulta = document.createElement("button");
        btnEliminarConsulta.setAttribute("class", "btn-eliminar");
        btnEliminarConsulta.innerText = "Eliminar";

        const btnEstadoConsulta = document.createElement("button");
        btnEstadoConsulta.setAttribute("class", "btn-estado");
        if (consulta.estado === "pendiente") {
            btnEstadoConsulta.classList.add("pendiente");
            btnEstadoConsulta.innerText = "P";
        }
        if (consulta.estado === "aceptado") {
            btnEstadoConsulta.classList.add("aceptado");
            btnEstadoConsulta.innerText = "A";
        }
        if (consulta.estado === "rechazado") {
            btnEstadoConsulta.classList.add("rechazado");
            btnEstadoConsulta.innerText = "R";
        }

        btnEstadoConsulta.addEventListener("click", async () => {
            const consultaActualizar = {
                id: consulta.id,
                mensaje: consulta.mensaje || "No hay mensaje del profesor",
                estado: consulta.estado === "pendiente" ? "aceptado" : consulta.estado === "aceptado" ? "rechazado" : "pendiente"
            };
            await updateData("consultas", consulta.id, consultaActualizar);
            cargarConsultas();
        });

        btnEditarConsulta.addEventListener("click", () => {
            startEdit(consulta);
            editarConsulta(consulta.id, consulta.mensaje);
        });

        btnEliminarConsulta.addEventListener("click", async () => {
            if (confirm('¿Seguro que deseas eliminar esta consulta?')) {
                await deleteData("consultas", consulta.id);
                cargarConsultas();
            }
        });

        divConsulta.appendChild(pNombre);
        divConsulta.appendChild(h3Consulta);
        divConsulta.appendChild(pMensajeProf);
        divConsulta.appendChild(pHoraConsulta);
        divConsulta.appendChild(btnEditarConsulta);
        divConsulta.appendChild(btnEliminarConsulta);
        divConsulta.appendChild(btnEstadoConsulta);

        listaConsultas.appendChild(divConsulta);
    });
}

form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById("nombre").value.trim();
    const mensaje = document.getElementById("descripcion").value.trim();

    if (!nombre || !mensaje) {
        alert('Por favor, completa todos los campos');
        return;
    }

    if (editing && consultaEditandoId) {
        const consultaActualizada = { mensaje: mensaje };
        await updateData('consultas', consultaEditandoId, consultaActualizada);
    } else {
        const nuevaConsulta = {
            nombre: nombre,
            consulta: mensaje,
            hora: new Date().toISOString(),
            estado: "pendiente"
        };
        await postData('consultas', nuevaConsulta);
    }

    form.reset();
    cargarConsultas();
});

function startEdit(consulta) {
    editing = true;
    consultaEditandoId = consulta.id;
}

cancelBtn.addEventListener('click', () => {
    editing = false;
    consultaEditandoId = null;
    document.getElementById("consultaForm").reset();
    formTitle.textContent = "Agregar Consulta";
    cancelBtn.style.display = "none";
});

function editarConsulta(id, nombre) {
    document.getElementById("nombre").value = nombre || "";
    formTitle.textContent = "Editar Consulta";
    cancelBtn.style.display = "inline-block";
    editMode = true;
    editId = id;
}

// Inicializar lista
cargarConsultas();
