import { postData, getData } from "../services/services.js";
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');
// --- Registro ---
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('registerName').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const rol = document.getElementById('registerRol').value; // Tomamos el rol seleccionado
    if (nombre.length < 4 || password.length < 4) {
        registerError.textContent = "Nombre y contraseña deben tener al menos 4 caracteres";
        return;
    }
    const nuevoUsuario = { nombre, password, rol };
    try {
        await postData("usuarios", nuevoUsuario);
        alert(":marca_de_verificación_blanca: Usuario registrado con éxito. Ahora puedes iniciar sesión.");
        window.location.href = "inicio.html"; // Redirige al login
    } catch (err) {
        registerError.textContent = ":x: Error al registrar usuario.";
        console.error(err);
    }
});
