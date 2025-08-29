import { getData,postData } from "../services/services.js";

const loginBox = document.getElementById('loginBox');
const registerBox = document.getElementById('registerBox');
const showRegister = document.getElementById('showRegister');
const showLogin = document.getElementById('showLogin');

showRegister.addEventListener('click', (e) => {
    e.preventDefault();
    loginBox.classList.add('hidden');
    registerBox.classList.remove('hidden');
});

showLogin.addEventListener('click', (e) => {
    e.preventDefault();
    registerBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
});

// LOGIN
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const userId = document.getElementById('loginUserId').value;
    const password = document.getElementById('loginPassword').value;

    const usuarios = await getUsuarios();
    const usuario = usuarios.find(u => u.id == userId && u.password === password);

    if (usuario) {
        localStorage.setItem('usuario', JSON.stringify(usuario));
        window.location.href = 'principal.html';
    } else {
        loginError.textContent = "Credenciales incorrectas";
    }
});

// REGISTRO
const registerForm = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('registerName').value;
    const password = document.getElementById('registerPassword').value;

    if (nombre.length < 4 || password.length < 4) {
        registerError.textContent = "Nombre y contraseña deben tener al menos 4 caracteres";
        return;
    }

    // Crear nuevo usuario
    const nuevoUsuario = { nombre, password, rol: "estudiante" };
    await postUsuario(nuevoUsuario);

    alert("Usuario registrado con éxito. Ahora puedes iniciar sesión.");
    registerBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
});