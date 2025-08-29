import { getData, postData } from '../services/services.js';

const form = document.getElementById('consultaForm');
const listaConsultas = document.getElementById('consultasLista');
const formTitle = document.getElementById("form-title");
const cancelBtn = document.getElementById("cancelBtn");

// --- Logout ---
const logoutBtn = document.getElementById("logoutBtn");
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("sessionUser");
});

// --- Validar sesión ---
const sessionUser = JSON.parse(localStorage.getItem("sessionUser"));
if (!sessionUser) {
  // Aquí podrías redirigir: window.location.href = "login.html";
}

// Cargar las consultas cuando inicia la página
async function cargarConsultas() {
    const consultas = await getData('consultas');
    listaConsultas.innerHTML = '';
    consultas.forEach(consulta => {
        const divConsulta = document.createElement("div");
        const h3Consulta = document.createElement("h3");
        const pNombre = document.createElement("p");
        const pMensajeProf = document.createElement("p");
        const pHoraConsulta = document.createElement("p");
        const btnEstadoConsulta = document.createElement("button");
        const formatoHora = new Date(consulta.hora).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});

        // Mostrar la información
        h3Consulta.innerText = consulta.consulta;
        pNombre.innerText = `Estudiante: ${consulta.nombre}`;
        pMensajeProf.innerText = `Profesor: ${consulta.mensaje || "No hay mensaje del profesor"}`;
        pHoraConsulta.innerText = `Hora: ${formatoHora}`;

        // Estado visual
        btnEstadoConsulta.setAttribute("class", "btn-estado");
        btnEstadoConsulta.disabled = true; // No interactivo para estudiantes
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

        // Agregar al contenedor
        divConsulta.appendChild(pNombre);
        divConsulta.appendChild(h3Consulta);
        divConsulta.appendChild(pMensajeProf);
        divConsulta.appendChild(pHoraConsulta);
        divConsulta.appendChild(btnEstadoConsulta);

        divConsulta.setAttribute("class", "consulta-card");
        listaConsultas.appendChild(divConsulta);
    });
}

// Agregar una nueva consulta
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
