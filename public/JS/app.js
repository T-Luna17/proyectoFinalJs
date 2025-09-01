"use strict";

/* =========================================
 * Config
 * ======================================= */
const API_BASE =
  (import.meta?.env && import.meta.env.VITE_API_BASE) ||
  "http://localhost:3000"; // ajusta si usas otro puerto/origen

/* =========================================
 * Utils
 * ======================================= */
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

/* =========================================
 * Servicios (json-server)
 * ======================================= */
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

/* =========================================
 * DOM refs (según tu HTML)
 * ======================================= */
const $status           = $("#stats-status");
const $tbody            = $("#tbody");
const $qNombre          = $("#q-nombre");
const $qTexto           = $("#q-texto");
const $fDesde           = $("#input-fecha-desde");
const $fHasta           = $("#input-fecha-hasta");
const $btnAplicar       = $("#btn-aplicar");
const $formFiltros      = $("#form-filtros");

const $metricTotal      = $("#metric-total");
const $metricProm       = $("#metric-promedio");
const $metricPorEst     = $("#metric-por-estudiante");

/* =========================================
 * Estado
 * ======================================= */
let originales = [];
let filtradas  = [];
let abortCtrl  = null;

const cacheUsuarios = new Map(); // id -> { id, nombre, ... }
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

function skeletonRow(cols = 5) {
  const widths = [20, 15, 12, 35, 12];
  const tds = Array.from({ length: cols }, (_, i) => {
    const width = widths[i] ?? 20;
    return `<td><div class="placeholder-glow"><span class="placeholder col-${Math.max(2, Math.min(12, Math.round(width/10)))}"></span></div></td>`;
  }).join("");
  return `<tr>${tds}</tr>`;
}

function renderSkeleton(rows = 6) {
  if (!$tbody) return;
  $tbody.innerHTML = Array.from({ length: rows }, () => skeletonRow()).join("");
}

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

function normalizeRangeFromInputs() {
  const desde = $fDesde?.value ? new Date($fDesde.value) : new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const hasta = $fHasta?.value ? new Date($fHasta.value) : new Date();

  if ($fDesde?.value && !$fDesde.value.includes("T")) desde.setHours(0, 0, 0, 0);
  if ($fHasta?.value && !$fHasta.value.includes("T")) hasta.setHours(23, 59, 59, 999);

  return { desdeISO: desde.toISOString(), hastaISO: hasta.toISOString() };
}

async function cargar() {

  if (abortCtrl) abortCtrl.abort();
  abortCtrl = new AbortController();

  showLoading();

  const { desdeISO, hastaISO } = normalizeRangeFromInputs();

  try {
    const base = await getConsultas(
      { desde: desdeISO, hasta: hastaISO, estado: "atendida" },
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
    if (err?.name === "AbortError") return; // petición cancelada por un nuevo cargar()
    console.error("[Estadísticas] Carga falló:", err);
    renderTabla([]);
    renderMetricas([]);
    showError("Error al obtener datos del servidor.");
  }
}

function filtrarData(data) {
  const n = ($qNombre?.value || "").trim().toLowerCase();
  const t = ($qTexto?.value || "").trim().toLowerCase();

  return data.filter((c) => {
    const nom = String(c.usuarioNombre || "").toLowerCase();
    const txt = String(c.consulta || "").toLowerCase();
    return (!n || nom.includes(n)) && (!t || txt.includes(t));
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
    const hora  = isValidDate(d) ? d.toLocaleTimeString() : "—";

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
  }
}


function validarRangoFechas() {
  if (!$btnAplicar || !$fDesde || !$fHasta) return;
  const d = $fDesde.value ? new Date($fDesde.value) : null;
  const h = $fHasta.value ? new Date($fHasta.value) : null;
  const ok = d && h && isValidDate(d) && isValidDate(h) && d <= h;
  $btnAplicar.disabled = !ok;
}

function setupEventos() {

  $qNombre?.addEventListener("input", aplicarFiltrosYRender);
  $qTexto?.addEventListener("input", aplicarFiltrosYRender);

  $fDesde?.addEventListener("input", validarRangoFechas);
  $fHasta?.addEventListener("input", validarRangoFechas);

  $formFiltros?.addEventListener("submit", (e) => {
    e.preventDefault();
    if ($btnAplicar?.disabled) return;
    cargar();
  });

  [$qNombre, $qTexto, $fDesde, $fHasta].forEach((el) => {
    el?.addEventListener("input", () => {
      if ($status?.textContent) clearStatus();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!$tbody) return;           
  renderSkeleton(8);             
  setupEventos();
  validarRangoFechas();
  cargar();
});