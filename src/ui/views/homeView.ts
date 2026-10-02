import { hrefExamen, hrefProgreso, hrefRepaso, hrefSeccion, hrefSesion, hrefSimulacro, hrefVisual } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { dominioGlobal, dominioSeccion } from '../../domain/mastery.ts';
import { seccionesPrioritarias } from '../../domain/priority.ts';
import { iconoSvg } from '../../icons/icon.ts';
import { LEYENDA_GLIFOS } from '../../icons/legend.ts';
import { ciudadPixel } from '../../scene/pixelCity.ts';
import { MARCA, MARCA_COMPLETA, tituloMarca } from '../components/brandTitle.ts';
import { anilloDominio } from '../components/ring.ts';
import { lineaTemporal } from '../components/timeline.ts';
import { colorDominio, porcentaje } from '../format.ts';
import type { ContextoVista } from './context.ts';

export function pintarInicio(ctx: ContextoVista, estado: EstadoEstudio): void {
  const { tema, progreso } = estado;
  const dominioDe = (seccionId: string) => dominioSeccion(tema, progreso, seccionId);

  const estudiaYa = seccionesPrioritarias(tema, progreso)
    .map((s) => `<a href="${hrefSeccion(s.id)}"><b>${s.id}</b>${s.titulo}<span class="w">peso ${s.pesoExamen} % · dominio ${porcentaje(dominioDe(s.id))}</span></a>`)
    .join('');

  const tiles = tema.secciones
    .map((s) => {
      const d = dominioDe(s.id);
      const n = tema.conceptos.filter((c) => c.seccionId === s.id).length;
      return `<a class="tile rev" href="${hrefSeccion(s.id)}" style="border-color:${colorDominio(d)}"><span class="i">${s.id}</span><span class="n">${s.titulo}</span><span class="w">Peso ${s.pesoExamen} % · dominio ${porcentaje(d)} · ${n} conceptos</span></a>`;
    })
    .join('');

  const gramatica = LEYENDA_GLIFOS.map(([glifo, texto]) => `<div>${iconoSvg([glifo], '#fff')}<span>${texto}</span></div>`).join('');

  ctx.pagina.innerHTML = `<section class="hero rev"><span class="pill k">Tema ${tema.meta.numero} · ${tema.meta.titulo}</span>${tituloMarca('hero', 'h1')}<p>Cada entidad del sistema financiero es un edificio con su símbolo. Lee la ficha, pide que te lo expliquen de otra forma, desactiva la trampa del examen y compruébalo.</p></section>
 <section class="mundo" data-mundo aria-label="Mapa explorable de ${MARCA.ciudad}"></section>
 ${lineaTemporal(tema, progreso)}

 <div class="dash rev"><div class="big">${anilloDominio(dominioGlobal(tema, progreso), 130)}</div><div><h3>📌 Estudia ya: lo que más pesa y menos dominas</h3><div class="ya">${estudiaYa}</div></div></div>
 <h2 class="h2 rev">Subpuntos del tema</h2><div class="tiles">${tiles}</div>
 ${tarjetaExamen(estado)}
 <h2 class="h2 rev">Gramática visual</h2><div class="gram rev">${gramatica}</div>
 <section class="historia rev" aria-labelledby="historia-t"><span class="pill">📜 Historia del proyecto</span><h2 class="h2" id="historia-t">Así empezó la ciudad</h2><p class="historia-p">La primera versión de ${MARCA.ciudad} era este dibujo en 2D: un edificio por subpunto del tema, con sus luces según tu dominio. De aquí nació la maqueta 3D de arriba.</p>
 ${ciudadPixel(tema, progreso, { iconosSobreTejado: true })}<p class="legend">Luces de cada edificio = tu dominio: <b style="color:#ff5a5a">rojo</b> flojo · <b style="color:#ffd23f">amarillo</b> regular · <b style="color:#4ade80">verde</b> dominado · apagado = sin estudiar. Pulsa un edificio para entrar.</p></section>
`;
  ctx.tituloMovil.textContent = MARCA_COMPLETA;
}

/** Al final de la portada: acceso a la predicción de examen (si el tema tiene ampliación). */
function tarjetaExamen(estado: EstadoEstudio): string {
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  if (!bloques.length) return '';
  const barras = bloques.map((b) => `<i style="flex-grow:${b.probabilidad}" title="${b.titulo}: ${b.probabilidad} %"></i>`).join('');
  return `<a class="home-examen rev" href="${hrefExamen()}"><span class="he-k">📊 Predicción de examen</span><b>¿Qué caerá en el examen?</b><span class="he-t">Los ${bloques.length} bloques ordenados por probabilidad, tu dominio en cada uno y un simulacro por bloque.</span><span class="he-barras" aria-hidden="true">${barras}</span><span class="he-ir">Ver la predicción →</span></a><p class="home-practica"><a class="principal" href="${hrefSesion()}">🎯 Estudiar hoy</a><a href="${hrefVisual()}">🎬 Infografías</a><a href="${hrefSimulacro()}">📝 Hacer un simulacro</a><a href="${hrefRepaso()}">🔁 Mi repaso de hoy</a><a href="${hrefProgreso()}">📈 Mi progreso</a></p>`;
}
