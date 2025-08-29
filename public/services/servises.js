"use strict";
const TAB_KEY = "stats-active-tab"; 
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $all = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
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
  $all(".tab-panel").forEach(p => p.classList.add("d-none"));
  // Resetea estado de tabs
  $all(".stats-tabs .nav-link").forEach(t => {
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
  $all(".stats-tabs .nav-link").forEach(btn => {
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
  const tbody = $("#tbody-estadisticas");
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
    const busq = $("#input-busqueda");
    if (busq) busq.value = "";
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
function initEstadisticas() {
  const tbody = document.getElementById("tbody-estadisticas");
  const inputBusqueda = document.getElementById("input-busqueda");
  const btnAplicar = document.getElementById("btn-aplicar");

  if (tbody && !tbody.children.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-muted">
          Aquí se mostrará el historial de al menos 3 días (se genera con <code>map()</code> en Día 4).
        </td>
      </tr>`;
  }
  if (inputBusqueda) inputBusqueda.placeholder = "Por estudiante o palabra clave (Día 4)";
  if (btnAplicar) btnAplicar.title = "Disponible en Día 4";
  return { tbody, inputBusqueda, btnAplicar, state };
}
function init() {
  const hasPrincipal =
    document.getElementById("lista-consultas") ||
    document.getElementById("btn-refrescar") ||
    document.getElementById("ultima-actualizacion");
  if (hasPrincipal) initPrincipal();
  const hasEstadisticas = document.getElementById("tbody-estadisticas");
  if (hasEstadisticas) {
    renderSkeleton(8);
    initTabs();
    initFiltersUI();
    initEmptyState();
    initEstadisticas();
  }
}
const ConsultasApp = {
  state,
  initPrincipal,
  initEstadisticas,
  setActiveTab,
  initTabs,
  renderSkeleton,
};
if (typeof window !== "undefined") {
  window.ConsultasApp = ConsultasApp;
  document.addEventListener("DOMContentLoaded", init);
}