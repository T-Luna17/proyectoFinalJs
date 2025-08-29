import { postUsuario } from './services.js';

const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nombre = document.getElementById('registerName').value.trim();
    const password = document.getElementById('registerPassword').value.trim();

    if (nombre.length < 4 || password.length < 4) {
        registerError.textContent = "Nombre y contraseña deben tener al menos 4 caracteres";
        return;
    }

    const nuevoUsuario = { nombre, password, rol: "estudiante" };

    try {
        await postUsuario(nuevoUsuario);
        alert("✅ Usuario registrado con éxito. Ahora puedes iniciar sesión.");
        window.location.href = "index.html"; // redirigir al login
    } catch (err) {
        registerError.textContent = "❌ Error al registrar usuario.";
        console.error(err);
    }
});