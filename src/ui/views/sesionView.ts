import type { EstadoPractica } from '../../app/practiceStore.ts';
import { hrefConcepto, hrefProgreso, hrefRepaso, hrefSimulacro } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { dominioConcepto } from '../../domain/mastery.ts';
import { diasEntre, racha } from '../../domain/practice.ts';
import { construirSesion, type ItemSesion, type MotivoSesion, resumenSesion } from '../../domain/session.ts';
import { colorBloque, nombreCortoBloque } from '../blockColors.ts';
import { pintarPreguntaConConfianza, type Tarjeta, tarjetasDe } from '../components/conceptPanels.ts';
import { ocultarNombre } from '../../domain/recall.ts';
import { resaltarAviso } from '../format.ts';
import type { ContextoVista } from './context.ts';

const TAMANOS = [10, 15, 25];
const MOTIVO: Record<MotivoSesion, string> = {
  repaso: 'De tu repaso',
  espaciada: 'Toca repasarla hoy',
  nueva: 'Nueva',
  tarjeta: 'Flashcard',
  identifica: '¿Cuál es?',
};
/** Resumen del plan: [singular, plural]. */
const PLAN: Record<MotivoSesion, [string, string]> = {
  repaso: ['de tu repaso', 'de tu repaso'],
  espaciada: ['toca repasarla hoy', 'toca repasarlas hoy'],
  nueva: ['nueva', 'nuevas'],
  tarjeta: ['flashcard', 'flashcards'],
  identifica: ['para distinguir conceptos parecidos', 'para distinguir conceptos parecidos'],
};

/**
 * "Estudiar hoy": una sesión corta y mezclada que aplica práctica de recuperación espaciada e
 * intercalada, priorizada por lo que más cae y menos dominas. No cambia el dominio.
 */
export function pintarSesion(ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica, tamano = 15): void {
  ctx.tituloMovil.textContent = 'Estudiar hoy';
  const hoy = practica.fecha;
  const p = practica.practica;
  const items = construirSesion(estado.tema, p, hoy, {
    tamano,
    semilla: Number(hoy.replaceAll('-', '')) + Object.keys(p.preguntas).length,
    dominio: (id) => dominioConcepto(estado.progreso, id),
    tarjetas: practica.tarjetasDelTema(),
  });
  const r = resumenSesion(items);
  const dias = p.fechaExamen ? diasEntre(hoy, p.fechaExamen) : null;
  const examen = p.fechaExamen
    ? dias! >= 0
      ? `<b>${dias === 0 ? '¡El examen es hoy!' : `Faltan ${dias} ${dias === 1 ? 'día' : 'días'} para el examen.`}</b> Los repasos se ajustan para que todo vuelva antes de esa fecha.`
      : 'La fecha del examen ya ha pasado: cámbiala o bórrala.'
    : 'Indica la fecha del examen y los repasos se ajustarán para que todo vuelva antes.';
  const racha_ = racha(p, hoy);
  const hechasHoy = p.actividad[hoy]?.total ?? 0;
  const etiqueta = (m: MotivoSesion, n: number) => (n ? `<li class="ses-${m}"><b>${n}</b>${PLAN[m][n === 1 ? 0 : 1]}</li>` : '');
  ctx.pagina.innerHTML = `<div class="ses" data-sesion><header class="sh"><div class="kick"><span class="pill k">🎯 Estudiar hoy</span>${racha_ ? `<span class="pill">🔥 Racha de ${racha_} ${racha_ === 1 ? 'día' : 'días'}</span>` : ''}${hechasHoy ? `<span class="pill">${hechasHoy} respuestas hoy</span>` : ''}</div><h1>Tu sesión de hoy</h1><p>Preguntas mezcladas de todo el tema: primero lo que fallaste, después lo que toca repasar y lo nuevo que más cae en el examen. Antes de cada corrección, di cómo de seguro estás.</p></header>
<section class="ses-plan"><ul class="ses-resumen">${etiqueta('repaso', r.repaso)}${etiqueta('espaciada', r.espaciada)}${etiqueta('nueva', r.nueva)}${etiqueta('identifica', r.identifica)}${etiqueta('tarjeta', r.tarjeta)}</ul>
<div class="ses-ops"><fieldset><legend>Duración</legend>${TAMANOS.map((n) => `<label class="sim-op"><input type="radio" name="ses-n" value="${n}"${n === tamano ? ' checked' : ''}><span>${n}<small>≈ ${n} min</small></span></label>`).join('')}</fieldset>
<label class="ses-fecha"><span>Fecha del examen</span><input type="date" data-ses-fecha value="${p.fechaExamen ?? ''}" min="${hoy}">${p.fechaExamen ? '<button type="button" class="fc-btn" data-ses-borrar>Borrar</button>' : ''}</label></div>
<p class="ses-examen">${examen}</p>
<button type="button" class="ab q ses-empezar" data-ses-empezar ${items.length ? '' : 'disabled'}>Empezar (${items.length}) →</button></section>
<div class="ses-juego" data-ses-juego hidden></div></div>`;
  const raiz = ctx.pagina.querySelector<HTMLElement>('[data-sesion]')!;
  for (const i of raiz.querySelectorAll<HTMLInputElement>('input[name="ses-n"]')) i.onchange = () => pintarSesion(ctx, estado, practica, Number(i.value));
  const fecha = raiz.querySelector<HTMLInputElement>('[data-ses-fecha]')!;
  fecha.onchange = () => {
    practica.fechaExamen(fecha.value || undefined);
    pintarSesion(ctx, estado, practica, tamano);
  };
  const borrar = raiz.querySelector<HTMLButtonElement>('[data-ses-borrar]');
  if (borrar) {
    borrar.onclick = () => {
      practica.fechaExamen(undefined);
      pintarSesion(ctx, estado, practica, tamano);
    };
  }
  raiz.querySelector<HTMLButtonElement>('[data-ses-empezar]')!.onclick = () => {
    raiz.querySelector<HTMLElement>('.ses-plan')!.hidden = true;
    const juego = raiz.querySelector<HTMLElement>('[data-ses-juego]')!;
    juego.hidden = false;
    jugar(juego, estado, practica, items, 0, { aciertos: 0, hechas: 0, inicio: Date.now() }, ctx);
  };
}

interface Marcador {
  aciertos: number;
  hechas: number;
  inicio: number;
}

function jugar(juego: HTMLElement, estado: EstadoEstudio, practica: EstadoPractica, items: ItemSesion[], i: number, m: Marcador, ctx: ContextoVista): void {
  const item = items[i];
  if (!item) return final(juego, estado, practica, m, ctx);
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  const conceptoId = item.tipo === 'pregunta' ? item.pregunta.conceptoId : item.conceptoId;
  const concepto = estado.tema.conceptos.find((c) => c.id === conceptoId);
  const bi = item.tipo === 'pregunta' ? bloques.findIndex((b) => b.id === item.pregunta.bloqueId) : -1;
  const etiquetaBloque = bi >= 0 ? `<span class="sim-bloque" style="--c:${colorBloque(bi)}">${nombreCortoBloque(bloques[bi]!)}</span>` : '';
  juego.innerHTML = `<div class="sim-cab"><span class="sim-n"><b>${i + 1}</b> de ${items.length}</span><span class="ses-motivo ses-${item.motivo}">${MOTIVO[item.motivo]}</span>${etiquetaBloque}</div>
<div class="sim-progreso" role="progressbar" aria-valuemin="0" aria-valuemax="${items.length}" aria-valuenow="${i}"><i style="width:${(i / items.length) * 100}%"></i></div>
<article class="cc ses-tarjeta"><div class="pn p" data-ses-panel></div></article>`;
  const panel = juego.querySelector<HTMLElement>('[data-ses-panel]')!;
  // Mismo color que en la ficha: azul para preguntas, violeta para flashcards.
  panel.className = item.tipo === 'tarjeta' ? 'pn f' : item.tipo === 'identifica' ? 'pn e' : 'pn p';
  // En "¿Cuál es?" el nombre del concepto no se enseña hasta responder.
  const enlace = concepto ? `<a href="${hrefConcepto(concepto.id)}">${concepto.nombre}</a>` : '';
  const siguiente = `<div class="pq-pie"><span data-ses-enlace>${item.tipo === 'identifica' ? '' : enlace}</span><button type="button" class="fc-btn" data-ses-sig hidden>Siguiente →</button></div>`;
  const avanzar = () => jugar(juego, estado, practica, items, i + 1, m, ctx);
  if (item.tipo === 'identifica' && concepto) {
    const nombres = item.opciones.map((id) => estado.tema.conceptos.find((c) => c.id === id)?.nombre ?? id);
    const definicion = ocultarNombre(concepto.definicion, concepto.nombre);
    const frase = estado.tema.modos.findIndex((x) => x.etiqueta.includes('Frase de examen'));
    pintarPreguntaConConfianza(
      panel,
      {
        enunciado: '¿A qué concepto corresponde esta definición?',
        opciones: nombres,
        indiceCorrecta: item.opciones.indexOf(concepto.id),
        explicacion: resaltarAviso(concepto.explicaciones[frase >= 0 ? frase : 0] ?? ''),
      },
      (correcta, confianza) => {
        practica.responder(`identifica:${concepto.id}`, correcta, { conceptoId: concepto.id, confianza, repaso: false });
        m.hechas++;
        if (correcta) m.aciertos++;
        panel.querySelector('[data-ses-enlace]')!.innerHTML = enlace;
        const b = panel.querySelector<HTMLButtonElement>('[data-ses-sig]')!;
        b.hidden = false;
        b.focus({ preventScroll: true });
      },
      siguiente,
      `<blockquote class="ses-def">${definicion}</blockquote><p class="ses-def-pista">Son conceptos que se confunden: fíjate en el detalle que los distingue.</p>`,
    );
    panel.querySelector<HTMLButtonElement>('[data-ses-sig]')!.onclick = avanzar;
  } else if (item.tipo === 'pregunta') {
    pintarPreguntaConConfianza(
      panel,
      item.pregunta,
      (correcta, confianza) => {
        practica.responder(item.pregunta.id, correcta, { conceptoId: item.pregunta.conceptoId, confianza });
        m.hechas++;
        if (correcta) m.aciertos++;
        const b = panel.querySelector<HTMLButtonElement>('[data-ses-sig]')!;
        b.hidden = false;
        b.focus({ preventScroll: true });
      },
      siguiente,
    );
    panel.querySelector<HTMLButtonElement>('[data-ses-sig]')!.onclick = avanzar;
  } else if (item.tipo === 'tarjeta') {
    const tarjeta = concepto ? tarjetasDe(concepto, estado.tema).find((t) => t.id === item.tarjetaId) : undefined;
    if (!tarjeta) return avanzar();
    pintarTarjeta(panel, tarjeta, false, (sabia) => {
      practica.calificar(tarjeta.id, sabia);
      m.hechas++;
      if (sabia) m.aciertos++;
      avanzar();
    });
  } else {
    return avanzar();
  }
  window.scrollTo({ top: Math.max(0, juego.getBoundingClientRect().top + window.scrollY - 80) });
}

function pintarTarjeta(panel: HTMLElement, t: Tarjeta, girada: boolean, alCalificar: (sabia: boolean) => void): void {
  panel.innerHTML = `<div class="md"><b>🃏 ${t.fuente}</b></div>
 <button type="button" class="fc${girada ? ' girada' : ''}" data-ses-girar aria-pressed="${girada}">
  <span class="fc-cara fc-anverso"><small>Intenta recordarlo antes de girar</small>${t.anverso}<em>Pulsa para ver la respuesta</em></span>
  <span class="fc-cara fc-reverso">${resaltarAviso(t.reverso)}</span>
 </button>
 <div class="fc-ctrl rep-calif"${girada ? '' : ' hidden'}><button type="button" class="fc-btn rep-no" data-sabia="0">✗ No la sabía</button><button type="button" class="fc-btn rep-si" data-sabia="1">✓ La sabía</button></div>`;
  panel.querySelector<HTMLButtonElement>('[data-ses-girar]')!.onclick = () => pintarTarjeta(panel, t, !girada, alCalificar);
  for (const b of panel.querySelectorAll<HTMLButtonElement>('[data-sabia]')) b.onclick = () => alCalificar(b.dataset.sabia === '1');
}

function final(juego: HTMLElement, estado: EstadoEstudio, practica: EstadoPractica, m: Marcador, ctx: ContextoVista): void {
  const minutos = Math.max(1, Math.round((Date.now() - m.inicio) / 60000));
  const pct = m.hechas ? Math.round((m.aciertos / m.hechas) * 100) : 0;
  const r = racha(practica.practica, practica.fecha);
  const pendientes = Object.keys(practica.practica.fallos).length;
  juego.innerHTML = `<section class="ses-fin"><span class="pill k">✅ Sesión completada</span><h2>${m.aciertos} de ${m.hechas} bien · ${pct} %</h2><p>${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} de práctica${r ? ` · 🔥 racha de ${r} ${r === 1 ? 'día' : 'días'}` : ''}. Lo que has fallado o acertado sin seguridad volverá en las próximas sesiones; lo que sabes, cada vez más espaciado.</p>
<div class="acts"><button type="button" class="ab q" data-ses-otra>Otra sesión</button>${pendientes ? `<a class="ab p" href="${hrefRepaso()}">Repasar fallos (${pendientes})</a>` : ''}<a class="ab e" href="${hrefSimulacro()}">Hacer un simulacro</a><a class="ab f" href="${hrefProgreso()}">Ver mi progreso</a></div></section>`;
  juego.querySelector<HTMLButtonElement>('[data-ses-otra]')!.onclick = () => pintarSesion(ctx, estado, practica);
}
