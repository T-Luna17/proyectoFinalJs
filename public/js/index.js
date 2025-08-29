import { getData } from "../services/services.js";
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('loginUserId').value;
    const password = document.getElementById('loginPassword').value;
    const usuarios = await getData("usuarios");
    const usuario = usuarios.find(u => u.id == userId && u.password === password);
    if (usuario) {
        // Guardar sesión
        localStorage.setItem('sessionUser', JSON.stringify(usuario));
        // Redirigir según rol
        if (usuario.rol === "profesor") {
            window.location.href = "Consultas.html";
        } else {
            window.location.href = "ConsultasE.html";
        }
    } else {
        loginError.textContent = "Credenciales incorrectas";
    }
});