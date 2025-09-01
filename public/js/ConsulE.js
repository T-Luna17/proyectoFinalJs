import { getData, postData } from '../services/services.js';

const form = document.getElementById('consultaForm');
const listaConsultas = document.getElementById('consultasLista');
const formTitle = document.getElementById("form-title");

// --- Validar sesión y mostrar nombre de usuario ---
const sessionUser = JSON.parse(localStorage.getItem('sessionUser'));
if (!sessionUser) window.location.href = '../pages/inicio.html';
if (sessionUser.rol !== "estudiante") window.location.href = 'Consultas.html';

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
  window.location.href = '../pages/inicio.html';
});

// --- Resto de tu código original ---
async function cargarConsultas() {
    const consultas = await getData('consultas');
    listaConsultas.innerHTML = '';
    consultas.forEach(consulta => {
        const divConsulta = document.createElement("div");
        divConsulta.setAttribute("class", "consulta-card");

        const h3Consulta = document.createElement("h3");
        h3Consulta.innerText = consulta.consulta;

        const pNombre = document.createElement("p");
        pNombre.innerText = `Estudiante: ${consulta.nombre}`;

        const pMensajeProf = document.createElement("p");
        pMensajeProf.innerText = `Profesor: ${consulta.mensaje || "No hay mensaje del profesor"}`;

        const pHoraConsulta = document.createElement("p");
        const formatoHora = new Date(consulta.hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        pHoraConsulta.innerText = `Hora: ${formatoHora}`;

        const btnEstadoConsulta = document.createElement("button");
        btnEstadoConsulta.setAttribute("class", "btn-estado");
        btnEstadoConsulta.disabled = true;
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

        divConsulta.appendChild(pNombre);
        divConsulta.appendChild(h3Consulta);
        divConsulta.appendChild(pMensajeProf);
        divConsulta.appendChild(pHoraConsulta);
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

    const nuevaConsulta = {
        nombre: nombre,
        consulta: mensaje,
        hora: new Date().toISOString(),
        estado: "pendiente"
    };
    await postData('consultas', nuevaConsulta);

    form.reset();
    cargarConsultas();
});

// Inicializar lista
cargarConsultas();
