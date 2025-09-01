import { getData, getConsultas, getUsuarioPorId } from './services/apiService.js';

// ================ Utilidades ================
const qs  = (sel) => document.querySelector(sel);
const qsi = (id)  => document.getElementById(id);

const debounce = (fn, wait = 200) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

const escapeHtml = (s = '') => String(s)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const isDateValid = (d) => d instanceof Date && !Number.isNaN(d);

// ================ Sesión ================
const SESSION_KEY = 'sessionUser';

function setSession({ id, nombre, rol }) {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id, nombre, rol }));
}

function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function enforceSessionIfNeeded() {
  const path = location.pathname.toLowerCase();
  const isLogin = path.includes('login');
  if (isLogin) return; // no exigir sesión en login

  if (!getSession()) {

    window.location.replace('../pages/login.html');
  }
}

function redirectByRole(rol) {
  const routes = {
    profesor:  '../pages/Consultas.html',
    estudiante:'../pages/ConsultasE.html'
  };
  window.location.href = routes[rol] ?? routes.estudiante;
}

// ================ Login ================
function initLoginPage() {
  const loginForm  = qsi('loginForm');
  if (!loginForm) return; // No estamos en la página de login

  const loginError = qsi('loginError');

  const showError = (msg) => {
    if (loginError) {
      loginError.textContent = msg;
      loginError.hidden = false;
      loginError.setAttribute('role', 'alert');
    }
  };

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError && (loginError.hidden = true);

    const userIdInput = qsi('loginUserId')?.value?.trim();
    const password    = qsi('loginPassword')?.value ?? '';

    if (!userIdInput || !password) {
      showError('Por favor, completa ambos campos.');
      return;
    }

    try {
      const usuarios = await getData('usuarios');
      // Permitimos iniciar con "id" o con "nombre" (case-insensitive)
      const usuario = usuarios.find(u =>
        (String(u.id) === userIdInput || String(u.nombre).toLowerCase() === userIdInput.toLowerCase()) &&
        u.password === password
      );

      if (!usuario) {
        showError('Credenciales incorrectas');
        return;
      }

      setSession({ id: usuario.id, nombre: usuario.nombre, rol: usuario.rol });
      redirectByRole(usuario.rol);

    } catch (err) {
      console.error('[Login] Error:', err);
      showError('No se pudo iniciar sesión. Intenta de nuevo.');
    }
  });
}

// ================ Estadísticas ================
function initEstadisticasPage() {
  
  const $tablaBody  = qsi('tbody');
  const $qNombre    = qsi('q-nombre');
  const $qTexto     = qsi('q-texto');

  if (!$tablaBody || !$qNombre || !$qTexto) return; 

  enforceSessionIfNeeded();

  let originales = [];
  const cacheUsuarios = new Map(); // id -> usuario

  const resolveUsuarioNombre = async (usuarioId) => {
    if (cacheUsuarios.has(usuarioId)) return cacheUsuarios.get(usuarioId)?.nombre;

    
    if (typeof getUsuarioPorId === 'function') {
      try {
        const u = await getUsuarioPorId(usuarioId);
        if (u) cacheUsuarios.set(usuarioId, u);
        return u?.nombre;
      } catch (e) {
        console.warn('[Estadísticas] getUsuarioPorId falló, usando fallback getData("usuarios")', e);
      }
    }


    try {
      let lista = cacheUsuarios.get('__todos__');
      if (!lista) {
        lista = await getData('usuarios');
        cacheUsuarios.set('__todos__', lista);
      }
      const found = lista.find(u => String(u.id) === String(usuarioId));
      if (found) {
        cacheUsuarios.set(usuarioId, found);
        return found.nombre;
      }
    } catch (e) {
      console.error('[Estadísticas] Fallback de usuarios falló:', e);
    }
    return undefined;
  };

  const cargar = async () => {
    try {
      const desde = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(); // últimos 3 días
      const hasta = new Date().toISOString();

      const base = await getConsultas({ desde, hasta });
      // Enriquecer con nombre si no viene
      const enriched = await Promise.all(base.map(async (c) => {
        if (c.usuarioNombre) return c;
        const nombre = await resolveUsuarioNombre(c.usuarioId);
        return { ...c, usuarioNombre: nombre ?? `ID ${c.usuarioId}` };
      }));


      originales = enriched.sort((a, b) => new Date(a.hora) - new Date(b.hora));
      render(originales);
    } catch (err) {
      console.error('[Estadísticas] Error al cargar:', err);
      const $status = qsi('stats-status');
      if ($status) {
        $status.textContent = 'No se pudieron cargar las estadísticas.';
        $status.setAttribute('role', 'alert');
      }
    }
  };

  const render = (data) => {
    renderTabla(data);
    renderMetricas(data);
  };

  const renderTabla = (data) => {
    $tablaBody.innerHTML = data.map((c) => {
      const d = new Date(c.hora);
      const fecha = isDateValid(d) ? d.toLocaleDateString() : '-';
      const hora  = isDateValid(d) ? d.toLocaleTimeString() : '-';
      const nombre = c.usuarioNombre ?? c.usuarioId;
      const consulta = escapeHtml(c.consulta ?? '');
      return `
        <tr>
          <td>${fecha}</td>
          <td>${hora}</td>
          <td>${escapeHtml(String(nombre))}</td>
          <td>${consulta}</td>
        </tr>
      `;
    }).join('');
  };

  const renderMetricas = (data) => {
    const $total = qsi('metric-total');               
    const $prom  = qsi('metric-promedio');           
    const $lista = qs('#metric-por-estudiante');      

    const porEstudiante = data.reduce((acc, c) => {
      const nombre = c.usuarioNombre ?? `ID ${c.usuarioId}`;
      acc[nombre] = (acc[nombre] || 0) + 1;
      return acc;
    }, {});

    const diasConDatos = new Set(
      data.map(c => {
        const d = new Date(c.hora);
        return isDateValid(d) ? d.toDateString() : null;
      }).filter(Boolean)
    ).size || 1;

    const promedio = data.length / diasConDatos;

    if ($total) $total.textContent = String(data.length);
    if ($prom)  $prom.textContent  = Number.isFinite(promedio) ? promedio.toFixed(2) : '0.00';

    if ($lista) {
      $lista.innerHTML = Object.entries(porEstudiante)
        .sort((a, b) => b[1] - a[1])
        .map(([nombre, total]) => `<li><strong>${escapeHtml(nombre)}</strong>: ${total}</li>`)
        .join('');
    }
  };

  const filtrar = () => {
    const n = ($qNombre.value || '').trim().toLowerCase();
    const t = ($qTexto.value  || '').trim().toLowerCase();

    const f = originales.filter(c =>
      (!n || String(c.usuarioNombre ?? '').toLowerCase().includes(n)) &&
      (!t || String(c.consulta ?? '').toLowerCase().includes(t))
    );
    render(f);
  };

  $qNombre.addEventListener('input', debounce(filtrar, 150));
  $qTexto .addEventListener('input', debounce(filtrar, 150));

  cargar();
}

document.addEventListener('DOMContentLoaded', () => {
  initLoginPage();        // corre solo si existe #loginForm
  initEstadisticasPage(); // corre solo si existen #tbody, #q-nombre, #q-texto
});