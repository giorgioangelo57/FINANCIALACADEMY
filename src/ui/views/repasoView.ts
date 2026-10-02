import type { EstadoPractica } from '../../app/practiceStore.ts';
import { hrefConcepto, hrefRepaso, hrefSimulacro } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { bancoDePreguntas, type PreguntaExamen } from '../../domain/exam.ts';
import { ACIERTOS_PARA_SALIR, INTERVALOS, preguntasVencidas } from '../../domain/practice.ts';
import { colorBloque, nombreCortoBloque } from '../blockColors.ts';
import { pintarPreguntaConConfianza, type Tarjeta, tarjetasDe } from '../components/conceptPanels.ts';
import { resaltarAviso } from '../format.ts';
import type { ContextoVista } from './context.ts';

type Pestana = 'fallos' | 'tarjetas';

/**
 * Repaso: las preguntas que has fallado (en fichas, práctica y simulacros) hasta acertarlas dos
 * veces seguidas, y las flashcards que tocan hoy (repetición espaciada). No cambia el dominio.
 */
export function pintarRepaso(ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica, pestana?: Pestana, foco?: string): void {
  const concepto = foco ? estado.tema.conceptos.find((c) => c.id === foco) : undefined;
  ctx.tituloMovil.textContent = concepto ? `Repaso · ${concepto.nombre}` : 'Repaso';
  const fallos = colaPreguntas(estado, practica, concepto?.id).length;
  const tarjetas = colaTarjetas(estado, practica, concepto?.id).length;
  const activa: Pestana = pestana ?? (fallos || !tarjetas ? 'fallos' : 'tarjetas');
  const cabecera = concepto
    ? `<header class="sh"><div class="kick"><span class="pill k">🌙 Repaso de esta noche</span><span class="pill">No cambia tu dominio</span></div><h1>${concepto.nombre}</h1><p>Solo lo que este concepto tiene pendiente hoy: sus fallos, las preguntas cuyo repaso vence y sus flashcards. <a href="${hrefRepaso()}">Ver todo el repaso</a> · <a href="${hrefConcepto(concepto.id)}">Ir a la ficha</a></p></header>`
    : `<header class="sh"><div class="kick"><span class="pill k">🔁 Repaso</span><span class="pill">No cambia tu dominio</span></div><h1>Tu repaso de hoy</h1><p>Lo que has fallado vuelve hasta que lo aciertas ${ACIERTOS_PARA_SALIR} veces seguidas. Las flashcards vuelven cada vez más espaciadas si te las sabes.</p></header>`;
  ctx.pagina.innerHTML = `<div class="rep" data-repaso${concepto ? ` data-repaso-concepto="${concepto.id}"` : ''}>${cabecera}
<div class="rep-tabs" role="tablist"><button type="button" role="tab" class="rep-tab" data-tab="fallos" aria-selected="${activa === 'fallos'}">${concepto ? 'Preguntas' : 'Mis fallos'} <b>${fallos}</b></button><button type="button" role="tab" class="rep-tab" data-tab="tarjetas" aria-selected="${activa === 'tarjetas'}">Flashcards de hoy <b>${tarjetas}</b></button></div>
<div class="rep-cuerpo" data-rep-cuerpo></div></div>`;
  const raiz = ctx.pagina.querySelector<HTMLElement>('[data-repaso]')!;
  for (const t of raiz.querySelectorAll<HTMLButtonElement>('[data-tab]')) t.onclick = () => pintarRepaso(ctx, estado, practica, t.dataset.tab as Pestana, concepto?.id);
  const cuerpo = raiz.querySelector<HTMLElement>('[data-rep-cuerpo]')!;
  if (activa === 'fallos') pintarFallos(cuerpo, ctx, estado, practica, concepto?.id);
  else pintarTarjetas(cuerpo, ctx, estado, practica, concepto?.id);
}

/**
 * Preguntas del repaso: las falladas (primero las falladas con seguridad, luego las más falladas).
 * Con un concepto, además las suyas cuyo repaso espaciado vence hoy.
 */
function colaPreguntas(estado: EstadoEstudio, practica: EstadoPractica, foco?: string): string[] {
  const banco = new Map(bancoDePreguntas(estado.tema).map((p) => [p.id, p]));
  const fallos = practica.practica.fallos;
  const cola = Object.keys(fallos)
    .filter((id) => banco.has(id) && (!foco || banco.get(id)!.conceptoId === foco))
    .sort((a, b) => Number(Boolean(fallos[b]!.sorpresa)) - Number(Boolean(fallos[a]!.sorpresa)) || fallos[b]!.veces - fallos[a]!.veces);
  if (!foco) return cola;
  const vencidas = preguntasVencidas(practica.practica, practica.fecha).filter((id) => !fallos[id] && banco.get(id)?.conceptoId === foco);
  return [...cola, ...vencidas];
}

/** Flashcards de hoy; con un concepto, solo las suyas ya vistas cuyo repaso vence hoy. */
function colaTarjetas(estado: EstadoEstudio, practica: EstadoPractica, foco?: string): string[] {
  if (!foco) return practica.tarjetasDeHoy();
  const concepto = estado.tema.conceptos.find((c) => c.id === foco);
  if (!concepto) return [];
  return tarjetasDe(concepto, estado.tema)
    .map((t) => t.id)
    .filter((id) => {
      const e = practica.practica.tarjetas[id];
      return e && e.proxima <= practica.fecha;
    });
}

function vacio(texto: string): string {
  return `<div class="rep-vacio"><b>✨ ${texto}</b><a class="ab q" href="${hrefSimulacro()}">Hacer un simulacro</a></div>`;
}

function pintarFallos(cuerpo: HTMLElement, ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica, foco?: string): void {
  const banco = new Map(bancoDePreguntas(estado.tema).map((p) => [p.id, p]));
  const cola = colaPreguntas(estado, practica, foco);
  if (!cola.length) {
    cuerpo.innerHTML = vacio(foco ? 'Este concepto no tiene preguntas pendientes hoy.' : 'No tienes fallos pendientes.');
    return;
  }
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  const resumen = bloques
    .map((b, bi) => {
      const n = cola.filter((id) => banco.get(id)!.bloqueId === b.id).length;
      return n ? `<li style="--c:${colorBloque(bi)}"><i></i>${nombreCortoBloque(b)} <b>${n}</b></li>` : '';
    })
    .join('');
  cuerpo.innerHTML = `<ul class="rep-resumen">${resumen}</ul><article class="cc rep-tarjeta"><div class="pn p" data-rep-panel></div></article>`;
  const panel = cuerpo.querySelector<HTMLElement>('[data-rep-panel]')!;
  let i = 0;
  const mostrar = () => {
    const id = cola[i % cola.length]!;
    const p: PreguntaExamen = banco.get(id)!;
    const estadoFallo = practica.practica.fallos[id];
    const concepto = estado.tema.conceptos.find((c) => c.id === p.conceptoId);
    const motivo = estadoFallo?.sorpresa ? '⚡ Fallada con seguridad · ' : estadoFallo?.dudosa && !estadoFallo.veces ? 'Acertada sin seguridad · ' : '';
    const racha = estadoFallo ? `${motivo}${estadoFallo.veces ? `Fallada ${estadoFallo.veces} ${estadoFallo.veces === 1 ? 'vez' : 'veces'} · ` : ''}aciertos seguidos ${estadoFallo.racha}/${ACIERTOS_PARA_SALIR}` : '✓ Superada';
    const pie = `<div class="pq-pie"><span>Repaso ${(i % cola.length) + 1} / ${cola.length} · ${racha} · <a href="${hrefConcepto(p.conceptoId)}">${concepto?.nombre ?? ''}</a></span><button type="button" class="fc-btn" data-rep-sig>Siguiente →</button></div>`;
    pintarPreguntaConConfianza(
      panel,
      p,
      (correcta, confianza) => {
        practica.responder(p.id, correcta, { conceptoId: p.conceptoId, confianza });
        const pieTexto = panel.querySelector('.pq-pie span');
        const f = practica.practica.fallos[p.id];
        if (pieTexto) {
          const estadoTexto = f ? `Fallada ${f.veces} ${f.veces === 1 ? 'vez' : 'veces'} · aciertos seguidos ${f.racha}/${ACIERTOS_PARA_SALIR}` : '✓ Superada: sale de tu repaso';
          pieTexto.innerHTML = `Repaso ${(i % cola.length) + 1} / ${cola.length} · ${estadoTexto} · <a href="${hrefConcepto(p.conceptoId)}">${concepto?.nombre ?? ''}</a>`;
        }
      },
      pie,
    );
    panel.querySelector<HTMLButtonElement>('[data-rep-sig]')!.onclick = () => {
      // Al terminar la vuelta se recalcula la cola (lo superado ya no está).
      i++;
      if (i >= cola.length) return pintarRepaso(ctx, estado, practica, 'fallos', foco);
      mostrar();
    };
  };
  mostrar();
}

function pintarTarjetas(cuerpo: HTMLElement, ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica, foco?: string): void {
  const todas = new Map<string, Tarjeta>();
  for (const c of estado.tema.conceptos) for (const t of tarjetasDe(c, estado.tema)) todas.set(t.id, t);
  const cola = colaTarjetas(estado, practica, foco).filter((id) => todas.has(id));
  const resumenCajas = () => {
    const cajas = INTERVALOS.map((_, k) => Object.entries(practica.practica.tarjetas).filter(([id, t]) => todas.has(id) && t.caja === k).length);
    const sinVer = todas.size - Object.keys(practica.practica.tarjetas).filter((id) => todas.has(id)).length;
    return `<ul class="rep-cajas" aria-label="Tarjetas por caja">${cajas
      .map((n, k) => `<li><b>${n}</b><small>${k === 0 ? 'Por aprender' : `Cada ${INTERVALOS[k]} ${INTERVALOS[k] === 1 ? 'día' : 'días'}`}</small></li>`)
      .join('')}<li><b>${sinVer}</b><small>Sin ver</small></li></ul>`;
  };
  const resumen = resumenCajas();
  if (!cola.length) {
    cuerpo.innerHTML = resumen + vacio(foco ? 'Este concepto no tiene flashcards pendientes hoy.' : 'Has terminado las flashcards de hoy.');
    return;
  }
  cuerpo.innerHTML = `${resumen}<article class="cc rep-tarjeta"><div class="pn f" data-rep-fc></div></article>`;
  const panel = cuerpo.querySelector<HTMLElement>('[data-rep-fc]')!;
  // Las que no te sabes vuelven al final de la sesión de hoy.
  const sesion = [...cola];
  let hechas = 0;
  const mostrar = (girada: boolean) => {
    const id = sesion[0];
    if (!id) return pintarRepaso(ctx, estado, practica, 'tarjetas', foco);
    const t = todas.get(id)!;
    panel.innerHTML = `<div class="md"><b>🃏 Flashcards de hoy</b><span class="fc-n">${hechas} hechas · quedan ${sesion.length}</span></div>
 <button type="button" class="fc${girada ? ' girada' : ''}" data-rep-girar aria-pressed="${girada}">
  <span class="fc-cara fc-anverso"><small>${t.fuente}</small>${t.anverso}<em>Pulsa para ver la respuesta</em></span>
  <span class="fc-cara fc-reverso">${resaltarAviso(t.reverso)}</span>
 </button>
 <div class="fc-ctrl rep-calif"${girada ? '' : ' hidden'}><button type="button" class="fc-btn rep-no" data-rep-sabia="0">✗ No la sabía</button><button type="button" class="fc-btn rep-si" data-rep-sabia="1">✓ La sabía</button></div>`;
    panel.querySelector<HTMLButtonElement>('[data-rep-girar]')!.onclick = () => mostrar(!girada);
    for (const b of panel.querySelectorAll<HTMLButtonElement>('[data-rep-sabia]')) {
      b.onclick = () => {
        const sabia = b.dataset.repSabia === '1';
        practica.calificar(id, sabia);
        cuerpo.querySelector('.rep-cajas')?.replaceWith(document.createRange().createContextualFragment(resumenCajas()));
        sesion.shift();
        if (!sabia) sesion.push(id);
        else hechas++;
        mostrar(false);
      };
    }
  };
  mostrar(false);
}
