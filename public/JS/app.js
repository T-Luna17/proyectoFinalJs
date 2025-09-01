import { getData, postData } from "../services/services.js";

const cantidadConsultas = document.getElementById("cantidad-consultas");
const promedioDiario = document.getElementById("promedio-diario");
const qNombre = document.getElementById("q-nombre");
const qTexto = document.getElementById("q-texto");
const fDesde = document.getElementById("input-fecha-desde");
const fHasta = document.getElementById("input-fecha-hasta");
const btnAplicar = document.getElementById("btn-aplicar");


async function agregarConsulta() {
  const objConsulta = {
    nombre: qNombre.value,
    consulta: qTexto.value,
    desde: fDesde.value,
    hasta: fHasta.value,
    estado: "pendiente"
  }
  const peticion = await postData("consultas", objConsulta)
  console.log(peticion);
}
btnAplicar.addEventListener("click", agregarConsulta)

async function cargarEstadisticas() {
  const estadisticas = await getData("consultas")

  const totalConsultas = estadisticas.length;
  const promedio = estadisticas.length / 7
  
  promedioDiario.textContent = promedio.toFixed(2);
  cantidadConsultas.textContent = totalConsultas;
}
cargarEstadisticas();