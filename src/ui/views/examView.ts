import { hrefConcepto } from '../../app/router.ts';
import type { EstadoPractica } from '../../app/practiceStore.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import type { BloqueExamen, Concepto, Pregunta, Tema } from '../../content/schema.ts';
import { bancoDePreguntas } from '../../domain/exam.ts';
import { dominioConcepto } from '../../domain/mastery.ts';
import { treemap } from '../../world/treemap.ts';
import { pintarPreguntaConConfianza } from '../components/conceptPanels.ts';
import { anilloDominio } from '../components/ring.ts';
import { COLORES_BLOQUE, nombreCortoBloque } from '../blockColors.ts';
import { colorDominio, porcentaje } from '../format.ts';
import type { ContextoVista } from './context.ts';

interface DatosBloque {
  bloque: BloqueExamen;
  conceptos: Concepto[];
  oficiales: Pregunta[];
  practica: Pregunta[];
  dominio: number;
  /** Probabilidad × lo que falta por dominar: dónde rinde más estudiar ahora. */
  prioridad: number;
  /** Color de identidad del bloque (el mismo en todos los gráficos de la vista). */
  color: string;
}

function datosDe(estado: EstadoEstudio): DatosBloque[] {
  const { tema, progreso } = estado;
  const amp = tema.ampliacion;
  if (!amp) return [];
  return amp.bloques.map((bloque, i) => {
    const conceptos = bloque.conceptoIds.map((id) => tema.conceptos.find((c) => c.id === id)).filter((c): c is Concepto => Boolean(c));
    const dominio = conceptos.reduce((s, c) => s + dominioConcepto(progreso, c.id), 0) / (conceptos.length || 1);
    return {
      bloque,
      conceptos,
      oficiales: conceptos.map((c) => c.pregunta),
      practica: amp.preguntas.filter((p) => bloque.conceptoIds.includes(p.conceptoId)),
      dominio,
      prioridad: bloque.probabilidad * (1 - dominio),
      color: COLORES_BLOQUE[i % COLORES_BLOQUE.length]!,
    };
  });
}

const corto = nombreCortoBloque;
const tip = (html: string) => `data-tip="${encodeURIComponent(html)}"`;

/* ------------------------------------------------------------ reparto */

/** Barra 100 % apilada: cómo se reparte el examen entre los cinco bloques. */
function reparto(datos: DatosBloque[]): string {
  const segmentos = datos
    .map(({ bloque: b, color }) => {
      const ancho = b.probabilidad >= 18 ? `<span>${corto(b)}</span>` : '';
      return `<a class="ex-seg" href="#ex-${b.id}" style="flex-grow:${b.probabilidad};--c:${color}" ${tip(`<b>${b.titulo}</b><br>${b.probabilidad} % del examen (estimado)`)} aria-label="${b.titulo}: ${b.probabilidad} %"><b>${b.probabilidad} %</b>${ancho}</a>`;
    })
    .join('');
  const leyenda = datos.map(({ bloque: b, color }) => `<li><i style="--c:${color}"></i>${corto(b)} <b>${b.probabilidad} %</b></li>`).join('');
  return `<figure class="ex-reparto"><figcaption>Reparto estimado del examen</figcaption><div class="ex-segs">${segmentos}</div><ul class="ex-ley-bloques">${leyenda}</ul></figure>`;
}

/* ------------------------------------------------------------ mapa (treemap) */

function mapa(datos: DatosBloque[], estado: EstadoEstudio): string {
  const celdas = treemap(datos, (d) => d.bloque.probabilidad, 100, 100);
  const teselas = celdas
    .map(({ dato: d, x, y, ancho, alto }, i) => {
      const b = d.bloque;
      const ladrillos = d.conceptos
        .map((c) => {
          const dc = dominioConcepto(estado.progreso, c.id);
          return `<a class="ex-ladrillo" href="${hrefConcepto(c.id)}" style="--d:${colorDominio(dc)}" ${tip(`<b>${c.nombre}</b><br>Tu dominio: ${porcentaje(dc)}`)} aria-label="${c.nombre}: dominio ${porcentaje(dc)}"></a>`;
        })
        .join('');
      const dominados = d.conceptos.filter((c) => dominioConcepto(estado.progreso, c.id) >= 0.8).length;
      return `<div class="ex-bloque" style="--x:${x}%;--y:${y}%;--w:${ancho}%;--h:${alto}%;--c:${d.color}"><div class="ex-bh"><span class="ex-rank">#${i + 1}</span><b class="ex-pct">${b.probabilidad} %</b></div><h4><a href="#ex-${b.id}">${corto(b)}</a></h4><div class="ex-bdom">${anilloDominio(d.dominio, 34)}<small>${dominados} de ${d.conceptos.length} dominados</small></div><div class="ex-ladrillos">${ladrillos}</div></div>`;
    })
    .join('');
  const leyenda = `<ul class="ex-ley-dom"><li><i style="--d:${colorDominio(0)}"></i>Sin estudiar</li><li><i style="--d:${colorDominio(0.3)}"></i>Flojo</li><li><i style="--d:${colorDominio(0.6)}"></i>Regular</li><li><i style="--d:${colorDominio(1)}"></i>Dominado</li></ul>`;
  return `<section class="ex-sec"><h2>Mapa del examen</h2><p class="ex-intro">Cada bloque ocupa el área de su probabilidad. Cada cuadradito es un concepto, con el color de tu dominio: pásale el ratón para ver cuál es y púlsalo para ir a su ficha.</p><div class="ex-treemap">${teselas}</div>${leyenda}</section>`;
}

/* ------------------------------------------------------------ gráficos de barras */

/** Marcas del eje: 0 y múltiplos de `paso` hasta `max` (incluido), con rejilla tenue. */
function eje(max: number, paso: number, sufijo = ''): string {
  const marcas: string[] = [];
  for (let v = 0; v <= max; v += paso) marcas.push(`<span style="left:${(v / max) * 100}%">${v}${sufijo}</span>`);
  return `<div class="ex-fila ex-fila-eje"><span></span><div class="ex-eje" aria-hidden="true">${marcas.join('')}</div></div>`;
}

function rejilla(max: number, paso: number): string {
  const lineas: string[] = [];
  for (let v = paso; v < max; v += paso) lineas.push(`<i style="left:${(v / max) * 100}%"></i>`);
  return `<div class="ex-rejilla" aria-hidden="true">${lineas.join('')}</div>`;
}

function graficoProbabilidad(datos: DatosBloque[]): string {
  const max = 30;
  const filas = datos
    .map(({ bloque: b, color }) => `<div class="ex-fila"><span class="ex-et">${corto(b)}</span><div class="ex-pista"><i class="ex-barra prob" style="width:${(b.probabilidad / max) * 100}%;--c:${color}" tabindex="0" ${tip(`<b>${b.titulo}</b><br>${b.probabilidad} % de probabilidad estimada<br><span>${b.formato}</span>`)} aria-label="${b.titulo}: ${b.probabilidad} %"></i><b class="ex-val">${b.probabilidad} %</b></div></div>`)
    .join('');
  return `<figure class="ex-graf rev"><figcaption><h3>Probabilidad de que caiga</h3><small>Estimada según tus apuntes · % del examen</small></figcaption><div class="ex-plot">${rejilla(max, 10)}${filas}</div>${eje(max, 10, ' %')}</figure>`;
}

function graficoPreguntas(datos: DatosBloque[]): string {
  const mayor = Math.max(...datos.map((d) => d.oficiales.length + d.practica.length));
  const max = Math.ceil(mayor / 10) * 10;
  const filas = datos
    .map(({ bloque: b, oficiales, practica }) => {
      const n = oficiales.length + practica.length;
      return `<div class="ex-fila"><span class="ex-et">${corto(b)}</span><div class="ex-pista" tabindex="0" ${tip(`<b>${b.titulo}</b><br>${oficiales.length} de «Compruébalo» (miden tu dominio)<br>${practica.length} de práctica (de tus apuntes)`)} aria-label="${b.titulo}: ${oficiales.length} de Compruébalo y ${practica.length} de práctica"><i class="ex-barra of" style="width:${(oficiales.length / max) * 100}%"></i><i class="ex-barra pr" style="width:${(practica.length / max) * 100}%"></i><b class="ex-val">${n}</b></div></div>`;
    })
    .join('');
  const leyenda = `<div class="ex-ley"><span><i class="of"></i>Compruébalo · miden tu dominio</span><span><i class="pr"></i>Práctica · de tus apuntes</span></div>`;
  return `<figure class="ex-graf rev"><figcaption><h3>Preguntas para entrenar cada bloque</h3><small>Número de preguntas tipo test disponibles</small></figcaption>${leyenda}<div class="ex-plot">${rejilla(max, 10)}${filas}</div>${eje(max, 10)}</figure>`;
}

function graficoDominio(datos: DatosBloque[]): string {
  const filas = datos
    .map(({ bloque: b, dominio }) => `<div class="ex-fila"><span class="ex-et">${corto(b)}</span><div class="ex-pista"><i class="ex-barra dom" style="width:${Math.max(dominio * 100, 0.6)}%;--c:${colorDominio(dominio)}" tabindex="0" ${tip(`<b>${b.titulo}</b><br>Tu dominio: ${porcentaje(dominio)}`)} aria-label="${b.titulo}: dominio ${porcentaje(dominio)}"></i><b class="ex-val">${porcentaje(dominio)}</b></div></div>`)
    .join('');
  return `<figure class="ex-graf rev"><figcaption><h3>Tu dominio por bloque</h3><small>Media de los conceptos del bloque · sube con «Compruébalo»</small></figcaption><div class="ex-plot">${rejilla(100, 25)}${filas}</div>${eje(100, 25, ' %')}</figure>`;
}

function tabla(datos: DatosBloque[]): string {
  const filas = datos
    .map((d) => `<tr><th scope="row">${d.bloque.titulo}</th><td>${d.bloque.probabilidad} %</td><td>${d.oficiales.length}</td><td>${d.practica.length}</td><td>${porcentaje(d.dominio)}</td></tr>`)
    .join('');
  return `<details class="ex-tabla"><summary>Ver los datos en tabla</summary><div class="ex-tw"><table><thead><tr><th scope="col">Bloque</th><th scope="col">Probabilidad</th><th scope="col">Compruébalo</th><th scope="col">Práctica</th><th scope="col">Tu dominio</th></tr></thead><tbody>${filas}</tbody></table></div></details>`;
}

/* ------------------------------------------------------------ prioridades y fichas */

function porDondeEmpezar(datos: DatosBloque[]): string {
  const orden = [...datos].filter((d) => d.prioridad > 0).sort((a, b) => b.prioridad - a.prioridad);
  if (!orden.length) return `<p class="ex-intro">Dominas todos los bloques. Repasa con los simulacros.</p>`;
  return `<ol class="ex-orden">${orden
    .slice(0, 3)
    .map((d, i) => `<li style="--c:${d.color}"><a href="#ex-${d.bloque.id}"><span class="ex-on">${i + 1}</span><span><b>${d.bloque.titulo}</b><small>${d.bloque.probabilidad} % del examen · dominas el ${porcentaje(d.dominio)}</small></span></a></li>`)
    .join('')}</ol>`;
}

function fichaBloque(d: DatosBloque, i: number, estado: EstadoEstudio): string {
  const b = d.bloque;
  const n = d.oficiales.length + d.practica.length;
  const chips = d.conceptos
    .map((c) => `<a class="ex-chip" href="${hrefConcepto(c.id)}" style="--d:${colorDominio(dominioConcepto(estado.progreso, c.id))}">${c.nombre}</a>`)
    .join('');
  return `<article class="cc ex-ficha rev" id="ex-${b.id}" data-bloque="${b.id}" style="--c:${d.color}"><header class="ex-fh"><div class="ex-fpct"><b>${b.probabilidad}<small>%</small></b><span>#${i + 1} más probable</span></div><div><h2>${b.titulo}</h2><p class="ex-formato">${b.formato}</p></div><div class="ex-fdom">${anilloDominio(d.dominio, 64)}<small>tu dominio</small></div></header><h5>Qué te preguntarán</h5><ul class="ex-claves">${b.claves.map((k) => `<li>${k}</li>`).join('')}</ul><h5>Conceptos del bloque</h5><div class="ex-chips">${chips}</div><div class="acts"><button type="button" class="ab p" data-sim="abrir" aria-expanded="false">🎯 Simulacro del bloque (${n} preguntas)</button></div><div class="pn p" hidden></div></article>`;
}

/**
 * Predicción de examen: reparto estimado (según los apuntes del alumno), mapa de bloques y
 * conceptos con el dominio, gráficos, tabla y un simulacro por bloque. El simulacro es práctica:
 * no cambia el dominio (que solo mide "Compruébalo" en cada ficha).
 */
export function pintarExamen(ctx: ContextoVista, estado: EstadoEstudio, practica?: EstadoPractica): void {
  const datos = datosDe(estado);
  const fuente = estado.tema.ampliacion?.fuente ?? '';
  ctx.pagina.innerHTML = `<div class="ex" data-examen><header class="sh ex-cab"><div class="kick"><span class="pill k">📊 Predicción de examen</span><span class="pill">Fuente: ${fuente}</span></div><h1>¿Qué caerá en el examen?</h1><p>Los cinco bloques del tema, ordenados por la probabilidad de que salgan. Es una estimación de tus apuntes, no un dato oficial.</p>${reparto(datos)}</header>
<section class="ex-sec"><h2>Por dónde empezar</h2><p class="ex-intro">Lo que más cae y menos dominas.</p>${porDondeEmpezar(datos)}</section>
${mapa(datos, estado)}
<section class="ex-sec"><h2>En cifras</h2><div class="ex-grafs">${graficoProbabilidad(datos)}${graficoPreguntas(datos)}${graficoDominio(datos)}</div>${tabla(datos)}</section>
<section class="ex-sec"><h2>Bloque a bloque</h2>${datos.map((d, i) => fichaBloque(d, i, estado)).join('')}</section>
<div class="ex-tip" role="tooltip" hidden></div></div>`;
  ctx.tituloMovil.textContent = 'Predicción de examen';

  const raiz = ctx.pagina.querySelector<HTMLElement>('[data-examen]')!;
  conectarTooltip(raiz);
  raiz.addEventListener('click', (e) => {
    const boton = (e.target as Element).closest<HTMLElement>('[data-sim]');
    const ficha = boton?.closest<HTMLElement>('[data-bloque]');
    const d = datos.find((x) => x.bloque.id === ficha?.dataset.bloque);
    if (!boton || !ficha || !d) return;
    const panel = ficha.querySelector<HTMLElement>('.pn.p')!;
    if (boton.dataset.sim === 'abrir') {
      const abierto = !panel.hidden;
      panel.hidden = abierto;
      boton.setAttribute('aria-expanded', String(!abierto));
      if (!abierto) pintarSimulacro(ficha, panel, d, Number(ficha.dataset.si || 0), estado.tema, practica);
    } else {
      pintarSimulacro(ficha, panel, d, Number(ficha.dataset.si || 0) + 1, estado.tema, practica);
    }
  });
}

/** Una pregunta del simulacro con el marcador de la sesión (aciertos a la primera / respondidas). */
function pintarSimulacro(ficha: HTMLElement, panel: HTMLElement, d: DatosBloque, indice: number, tema: Tema, practica?: EstadoPractica): void {
  const lista = bancoDePreguntas(tema).filter((p) => p.bloqueId === d.bloque.id);
  const i = indice % lista.length;
  ficha.dataset.si = String(i);
  const pregunta = lista[i]!;
  const marcador = () => `Aciertos ${ficha.dataset.ok ?? 0} / ${ficha.dataset.hechas ?? 0}`;
  const pie = `<div class="pq-pie"><span>Simulacro ${i + 1} / ${lista.length} · <b class="ex-marcador">${marcador()}</b> · no cambia tu dominio</span><button type="button" class="fc-btn" data-sim="siguiente">Siguiente →</button></div>`;
  pintarPreguntaConConfianza(
    panel,
    pregunta,
    (correcta, confianza) => {
      ficha.dataset.hechas = String(Number(ficha.dataset.hechas ?? 0) + 1);
      if (correcta) ficha.dataset.ok = String(Number(ficha.dataset.ok ?? 0) + 1);
      const m = panel.querySelector('.ex-marcador');
      if (m) m.textContent = marcador();
      practica?.responder(pregunta.id, correcta, { conceptoId: pregunta.conceptoId, confianza });
    },
    pie,
  );
}

/** Tooltip compartido de los gráficos: aparece al pasar el ratón o al enfocar una marca. */
function conectarTooltip(raiz: HTMLElement): void {
  const tip = raiz.querySelector<HTMLElement>('.ex-tip')!;
  const mostrar = (el: HTMLElement, x: number, y: number) => {
    tip.innerHTML = decodeURIComponent(el.dataset.tip ?? '');
    tip.hidden = false;
    const caja = raiz.getBoundingClientRect();
    const ancho = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(caja.width - ancho, x - caja.left + 14))}px`;
    tip.style.top = `${y - caja.top + 16}px`;
  };
  raiz.addEventListener('pointermove', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-tip]');
    if (el) mostrar(el, e.clientX, e.clientY);
    else tip.hidden = true;
  });
  raiz.addEventListener('pointerleave', () => (tip.hidden = true));
  raiz.addEventListener('focusin', (e) => {
    const el = (e.target as Element).closest<HTMLElement>('[data-tip]');
    if (!el) return;
    const r = el.getBoundingClientRect();
    mostrar(el, r.left + r.width / 2, r.bottom - 8);
  });
  raiz.addEventListener('focusout', () => (tip.hidden = true));
}
