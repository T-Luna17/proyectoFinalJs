"use strict";

const TAB_KEY = "stats-active-tab";

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

const debounce = (fn, wait = 200) => {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
};

const escapeHtml = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const isValidDate = (d) => d instanceof Date && !Number.isNaN(d);


const state = (() => {
  let _consultas = [];
  return {
    /** @type {Array<any>} */
    get consultas() { return _consultas; },
    /** @param {Array<any>} v */
    set consultas(v) { _consultas = Array.isArray(v) ? v : []; },
    reset() { _consultas = []; }
  };
})();


const API_BASE = (import.meta?.env && import.meta.env.VITE_API_BASE) || "http://localhost:3000";

async function asJSON(res) {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[api] ${res.status} ${res.statusText} :: ${text}`);
  }
  return res.json();
}

async function getData(resource, { signal, params } = {}) {
  const url = new URL(`${API_BASE}/${resource}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") url.searchParams.set(k, v);
    });
  }
  const res = await fetch(url, { signal });
  return asJSON(res);
}

async function getConsultas({ desde, hasta, estado } = {}, { signal } = {}) {
  const params = {
    _sort: "hora",
    _order: "asc",
    ...(desde ? { hora_gte: desde } : {}),
    ...(hasta ? { hora_lte: hasta } : {}),
    ...(estado ? { estado } : {}),
  };
  return getData("consultas", { signal, params });
}

async function getUsuarioPorId(id, { signal } = {}) {
  return getData(`usuarios/${id}`, { signal });
}

function initPrincipal() {
  const lista = document.getElementById("lista-consultas");
  const btnRefrescar = document.getElementById("btn-refrescar");
  const ultimaAct = document.getElementById("ultima-actualizacion");

  if (lista && !lista.children.length) {
    lista.innerHTML = `
      <li class="list-group-item text-muted">
        La lista de consultas aparecerá aquí. (Se renderiza con <code>map()</code> en Día 3)
      </li>`;
  }
  if (btnRefrescar) btnRefrescar.title = "Disponible en Día 3";
  if (ultimaAct) ultimaAct.textContent = "Última actualización: —";
  return { lista, btnRefrescar, ultimaAct, state };
}

function setActiveTab(id) {
  $$(".tab-panel").forEach((p) => p.classList.add("d-none"));
  $$(".stats-tabs .nav-link").forEach((t) => {
    t.classList.remove("active");
    t.setAttribute("aria-selected", "false");
  });
  const btn = document.getElementById(`tab-${id}`);
  const panel = document.getElementById(`panel-${id}`);
  if (btn && panel) {
    btn.classList.add("active");
    btn.setAttribute("aria-selected", "true");
    panel.classList.remove("d-none");
    localStorage.setItem(TAB_KEY, id);
  }
}

function initTabs() {
  $$(".stats-tabs .nav-link").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-target");
      if (!target) return;
      const id = target.replace("#panel-", "");
      setActiveTab(id);
    });
  });
  const saved = localStorage.getItem(TAB_KEY) || "historial";
  setActiveTab(saved);
}

function skeletonRow(cols = 5) {
  const widths = [20, 15, 12, 35, 12];
  const tds = Array.from({ length: cols }, (_, i) => {
    const width = widths[i] ?? 20;
    return `<td><div class="skeleton" style="width:${width}%;height:.9rem"></div></td>`;
  }).join("");
  return `<tr>${tds}</tr>`;
}

function renderSkeleton(rows = 6) {
  const tbody = document.getElementById("tbody") || document.getElementById("tbody-estadisticas");
  if (!tbody) return;
  tbody.innerHTML = Array.from({ length: rows }, () => skeletonRow()).join("");
}

function initFiltersUI() {
  const desde = $("#input-fecha-desde");
  const hasta = $("#input-fecha-hasta");
  const resumen = $("#rango-resumen");
  const btnLimpiar = $("#btn-limpiar");
  const btnAplicar = $("#btn-aplicar");

  function updateResumen() {
    const d = desde?.value || "—";
    const h = hasta?.value || "—";
    if (resumen) resumen.textContent = `Rango: ${d} → ${h}`;
  }
  desde?.addEventListener("change", updateResumen);
  hasta?.addEventListener("change", updateResumen);
  updateResumen();

  btnLimpiar?.addEventListener("click", (e) => {
    e.preventDefault();
    if (desde) desde.value = "";
    if (hasta) hasta.value = "";
    const q1 = $("#q-nombre");
    const q2 = $("#q-texto");
    const qU = $("#input-busqueda");
    if (q1) q1.value = "";
    if (q2) q2.value = "";
    if (qU) qU.value = "";
    updateResumen();
  });

  btnAplicar?.addEventListener("click", (e) => {
    e.preventDefault();
  });
}

function initEmptyState() {
  const empty = $("#empty-state");
  if (empty) empty.classList.add("d-none");
}

const $status = document.getElementById("stats-status") || document.getElementById("estado");
const $tbody = document.getElementById("tbody") || document.getElementById("tbody-estadisticas");
const $qNombre = document.getElementById("q-nombre");
const $qTexto = document.getElementById("q-texto");
const $qUnico = document.getElementById("input-busqueda");
const $fDesde = document.getElementById("input-fecha-desde");
const $fHasta = document.getElementById("input-fecha-hasta");
const $btnAplicar = document.getElementById("btn-aplicar");

const $metricTotal = document.getElementById("metric-total");
const $metricProm = document.getElementById("metric-promedio");
const $metricPorEst = document.getElementById("metric-por-estudiante");
const $metricTop = document.getElementById("metric-top"); // opcional

// Estado
let originales = [];
let filtradas = [];
let abortCtrl = null;


const cacheUsuarios = new Map(); 
let cacheUsuariosLista = null;


function setStatus(html, { kind = "info", busy = false } = {}) {
  if (!$status) return;
  $status.innerHTML = html || "";
  $status.className = ""; 
  if (html) {
    const cls =
      kind === "error" ? "alert alert-danger" :
      kind === "warn"  ? "alert alert-warning" :
                          "alert alert-info";
    $status.className = cls;
  }
  $status.setAttribute("aria-busy", busy ? "true" : "false");
}

function showLoading(msg = "Cargando estadísticas…") {
  renderSkeleton(8);
  setStatus(
    `<span class="me-2 spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>${escapeHtml(msg)}`,
    { kind: "info", busy: true }
  );
}

function showError(msg = "No se pudieron cargar las estadísticas.") {
  setStatus(
    `${escapeHtml(msg)} <button id="btn-reintentar" type="button" class="btn btn-sm btn-outline-light ms-2">Reintentar</button>`,
    { kind: "error", busy: false }
  );
  $("#btn-reintentar")?.addEventListener("click", () => cargar());
}

function showEmpty(msg = "No hay datos para el rango seleccionado.") {
  setStatus(escapeHtml(msg), { kind: "warn", busy: false });
}

function clearStatus() { setStatus(""); }


async function resolveUsuarioNombre(usuarioId) {
  if (cacheUsuarios.has(usuarioId)) return cacheUsuarios.get(usuarioId)?.nombre;

  try {
    const u = await getUsuarioPorId(usuarioId, { signal: abortCtrl?.signal });
    if (u) {
      cacheUsuarios.set(usuarioId, u);
      return u.nombre;
    }
  } catch {

  }

  try {
    if (!cacheUsuariosLista) {
      cacheUsuariosLista = await getData("usuarios", { signal: abortCtrl?.signal });
      cacheUsuariosLista.forEach((u) => cacheUsuarios.set(u.id, u));
    }
    return cacheUsuarios.get(usuarioId)?.nombre;
  } catch {
    return undefined;
  }
}

async function cargar() {

  if (abortCtrl) abortCtrl.abort();
  abortCtrl = new AbortController();

  showLoading();

  const desdeISO = $fDesde?.value ? new Date($fDesde.value) : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const hastaISO = $fHasta?.value ? new Date($fHasta.value) : new Date();

  if ($fDesde?.value && !$fDesde.value.includes("T")) desdeISO.setHours(0, 0, 0, 0);
  if ($fHasta?.value && !$fHasta.value.includes("T")) hastaISO.setHours(23, 59, 59, 999);

  try {
    const base = await getConsultas(
      { desde: desdeISO.toISOString(), hasta: hastaISO.toISOString(), estado: "atendida" },
      { signal: abortCtrl.signal }
    );

    const enriched = await Promise.all(
      base.map(async (c) => {
        if (c.usuarioNombre) return c;
        const nombre = await resolveUsuarioNombre(c.usuarioId);
        return { ...c, usuarioNombre: nombre ?? `ID ${c.usuarioId}` };
      })
    );

    originales = enriched.sort((a, b) => new Date(a.hora) - new Date(b.hora));
    if (!originales.length) {
      renderTabla([]);
      renderMetricas([]);
      showEmpty();
      return;
    }
    clearStatus();
    aplicarFiltrosYRender(); 

  } catch (err) {
    if (err?.name === "AbortError") return; 
    console.error("[Estadísticas] Carga falló:", err);
    renderTabla([]);
    renderMetricas([]);
    showError("Error al obtener datos del servidor.");
  }
}

function filtrarData(data) {
  const n = ($qNombre?.value || "").trim().toLowerCase();
  const t = ($qTexto?.value || "").trim().toLowerCase();
  const u = ($qUnico?.value || "").trim().toLowerCase();

  return data.filter((c) => {
    const nom = String(c.usuarioNombre || "").toLowerCase();
    const txt = String(c.consulta || "").toLowerCase();

    if ($qNombre || $qTexto) {
      return (!n || nom.includes(n)) && (!t || txt.includes(t));
    }

    return !u || nom.includes(u) || txt.includes(u);
  });
}

const aplicarFiltrosYRender = debounce(() => {
  filtradas = filtrarData(originales);
  renderTabla(filtradas);
  renderMetricas(filtradas);
  if (!filtradas.length) showEmpty("No hay resultados para los filtros aplicados.");
  else clearStatus();
}, 120);

function renderTabla(data) {
  if (!$tbody) return;

  const frag = document.createDocumentFragment();

  for (const c of data) {
    const tr = document.createElement("tr");

    const d = new Date(c.hora);
    const fecha = isValidDate(d) ? d.toLocaleDateString() : "—";
    const hora = isValidDate(d) ? d.toLocaleTimeString() : "—";

    const tdEst = document.createElement("td");
    tdEst.textContent = c.usuarioNombre ?? c.usuarioId;

    const tdFec = document.createElement("td");
    tdFec.textContent = fecha;

    const tdHor = document.createElement("td");
    tdHor.textContent = hora;

    const tdCon = document.createElement("td");
    tdCon.innerHTML = escapeHtml(c.consulta ?? "");

    const tdEstad = document.createElement("td");
    tdEstad.textContent = c.estado ?? "—";

    tr.append(tdEst, tdFec, tdHor, tdCon, tdEstad);
    frag.appendChild(tr);
  }

  $tbody.replaceChildren(frag);
}

function renderMetricas(data) {
  if ($metricTotal) $metricTotal.textContent = String(data.length);

  const dias = new Set(
    data.map((c) => {
      const d = new Date(c.hora);
      return isValidDate(d) ? d.toDateString() : null;
    }).filter(Boolean)
  ).size || 1;

  if ($metricProm) {
    const prom = data.length / dias;
    $metricProm.textContent = Number.isFinite(prom) ? prom.toFixed(2) : "0.00";
  }

  if ($metricPorEst) {
    const totales = data.reduce((acc, c) => {
      const k = c.usuarioNombre ?? `ID ${c.usuarioId}`;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {});
    const ordenado = Object.entries(totales).sort((a, b) => b[1] - a[1]);

    const frag = document.createDocumentFragment();
    for (const [nombre, total] of ordenado) {
      const li = document.createElement("li");
      li.innerHTML = `<strong>${escapeHtml(nombre)}</strong>: ${total}`;
      frag.appendChild(li);
    }
    $metricPorEst.replaceChildren(frag);

    if ($metricTop) {
      const top = ordenado[0];
      $metricTop.textContent = top ? `${top[0]} (${top[1]})` : "—";
    }
  }
}

function validarRangoFechas() {
  if (!$btnAplicar || !$fDesde || !$fHasta) return;
  const d = $fDesde.value ? new Date($fDesde.value) : null;
  const h = $fHasta.value ? new Date($fHasta.value) : null;
  const ok = d && h && isValidDate(d) && isValidDate(h) && d <= h;
  $btnAplicar.disabled = !ok;
}


function setupEventosEstadisticas() {

  $qNombre?.addEventListener("input", aplicarFiltrosYRender);
  $qTexto?.addEventListener("input", aplicarFiltrosYRender);
  $qUnico?.addEventListener("input", aplicarFiltrosYRender);

  $fDesde?.addEventListener("input", validarRangoFechas);
  $fHasta?.addEventListener("input", validarRangoFechas);

  $("#form-filtros")?.addEventListener("submit", (e) => {
    e.preventDefault();
    if ($btnAplicar?.disabled) return;
    cargar();
  });

  [$qNombre, $qTexto, $qUnico, $fDesde, $fHasta].forEach((el) => {
    el?.addEventListener("input", () => {
      if ($status?.textContent) clearStatus();
    });
  });
}


function initEstadisticasShell() {
  // Mensajes y placeholders iniciales si no hay filas
  if ($tbody && !$tbody.children.length) {
    renderSkeleton(8);
  }
  initTabs();
  initFiltersUI();
  initEmptyState();
}

function init() {

  const hasPrincipal =
    document.getElementById("lista-consultas") ||
    document.getElementById("btn-refrescar") ||
    document.getElementById("ultima-actualizacion");
  if (hasPrincipal) initPrincipal();

  if ($tbody) {
    initEstadisticasShell();
    setupEventosEstadisticas();
    validarRangoFechas();
    cargar();
  }

}
const ConsultasApp = {
  state,
  services: { getData, getConsultas, getUsuarioPorId },
  ui: { setActiveTab, renderSkeleton, initTabs, initFiltersUI },
  stats: { cargar }
};

if (typeof window !== "undefined") {
  window.ConsultasApp = ConsultasApp;
  document.addEventListener("DOMContentLoaded", init);
  }