import type { EstadoPractica } from '../../app/practiceStore.ts';
import { hrefSesion } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { bancoDePreguntas } from '../../domain/exam.ts';
import { CONFIANZAS, diasEntre, INTERVALOS, racha, type Recuento, sumarDias } from '../../domain/practice.ts';
import { colorBloque, nombreCortoBloque } from '../blockColors.ts';
import { ETIQUETA_CONFIANZA } from '../components/conceptPanels.ts';
import type { ContextoVista } from './context.ts';

const DIAS_CALENDARIO = 28;
const pct = (r: Recuento | undefined) => (r && r.total ? Math.round((r.aciertos / r.total) * 100) : null);

/**
 * Mi progreso: constancia (racha y actividad), memoria a largo plazo (cajas de repetición
 * espaciada), calibración de la confianza, acierto por bloque y evolución de los simulacros.
 * Todo sale de la práctica guardada; el dominio de "Compruébalo" se ve en el índice.
 */
export function pintarProgreso(ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica): void {
  ctx.tituloMovil.textContent = 'Mi progreso';
  const p = practica.practica;
  const hoy = practica.fecha;
  const banco = bancoDePreguntas(estado.tema);
  const total = Object.values(p.actividad).reduce((s, r) => s + r.total, 0);
  const vistas = banco.filter((q) => p.preguntas[q.id]).length;
  const firmes = banco.filter((q) => (p.preguntas[q.id]?.caja ?? 0) >= 3).length;
  const r = racha(p, hoy);
  const dias = p.fechaExamen ? diasEntre(hoy, p.fechaExamen) : null;

  if (!total && !p.simulacros.length) {
    ctx.pagina.innerHTML = `<div class="prog"><header class="sh"><div class="kick"><span class="pill k">📈 Mi progreso</span></div><h1>Aún no hay datos</h1><p>Haz tu primera sesión de estudio: aquí verás tu racha, lo que ya tienes fijado en la memoria y si tu seguridad es fiable.</p></header><a class="ab q" href="${hrefSesion()}">🎯 Empezar a estudiar hoy</a></div>`;
    return;
  }

  const tiles = [
    [`${r}`, r === 1 ? 'día de racha' : 'días de racha'],
    [`${p.actividad[hoy]?.total ?? 0}`, 'respuestas hoy'],
    [`${total}`, 'respuestas en total'],
    [`${firmes}<small>/${banco.length}</small>`, 'preguntas fijadas (repaso a 7+ días)'],
    ...(dias !== null && dias >= 0 ? [[`${dias}`, dias === 1 ? 'día para el examen' : 'días para el examen']] : []),
  ]
    .map(([n, t]) => `<div class="prog-tile"><b>${n}</b><span>${t}</span></div>`)
    .join('');

  // Actividad de los últimos 28 días (escala de un solo tono).
  const maxDia = Math.max(1, ...Array.from({ length: DIAS_CALENDARIO }, (_, i) => p.actividad[sumarDias(hoy, -i)]?.total ?? 0));
  const celdas = Array.from({ length: DIAS_CALENDARIO }, (_, i) => {
    const dia = sumarDias(hoy, i - DIAS_CALENDARIO + 1);
    const n = p.actividad[dia]?.total ?? 0;
    const nivel = n ? Math.min(4, Math.ceil((n / maxDia) * 4)) : 0;
    return `<i class="prog-dia n${nivel}" title="${dia.split('-').reverse().join('/')}: ${n} respuestas" aria-label="${dia}: ${n} respuestas"></i>`;
  }).join('');

  // Memoria: preguntas por caja de repetición espaciada.
  const cajas = INTERVALOS.map((_, k) => banco.filter((q) => p.preguntas[q.id]?.caja === k).length);
  const sinVer = banco.length - vistas;
  const segmentos = [
    ...cajas.map((n, k) => ({ n, t: k === 0 ? 'Por aprender' : `Cada ${INTERVALOS[k]} ${INTERVALOS[k] === 1 ? 'día' : 'días'}`, c: `c${k}` })),
    { n: sinVer, t: 'Sin ver', c: 'sin' },
  ].filter((s) => s.n);
  const memoria = `<div class="prog-memoria">${segmentos.map((s) => `<i class="${s.c}" style="flex-grow:${s.n}" title="${s.t}: ${s.n}"></i>`).join('')}</div><ul class="prog-ley">${segmentos.map((s) => `<li><i class="${s.c}"></i>${s.t} <b>${s.n}</b></li>`).join('')}</ul>`;

  // Calibración.
  const cal = CONFIANZAS.map((c) => ({ c, v: pct(p.calibracion[c]), n: p.calibracion[c].total }));
  const filasCal = cal
    .filter((x) => x.n)
    .map((x) => `<div class="ex-fila"><span class="ex-et">${ETIQUETA_CONFIANZA[x.c]} <small>(${x.n})</small></span><div class="ex-pista"><i class="ex-barra cal ${x.c}" style="width:${Math.max(x.v ?? 0, 0.6)}%"></i><b class="ex-val">${x.v} %</b></div></div>`)
    .join('');
  const seguro = cal[0]!;
  const dudo = cal[1]!;
  const lectura = !filasCal
    ? 'Responde indicando tu seguridad para ver si es fiable.'
    : seguro.n >= 5 && (seguro.v ?? 100) < 75
      ? '⚠️ <b>Exceso de confianza:</b> fallas bastantes de las que das por seguras. Antes de responder, intenta justificar por qué.'
      : dudo.n >= 5 && (dudo.v ?? 0) > 80
        ? '💡 <b>Sabes más de lo que crees:</b> aciertas casi todas las que dudas. Confía un poco más.'
        : '✅ <b>Buena calibración:</b> tu seguridad se corresponde con tus aciertos.';

  // Acierto por bloque en la práctica.
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  const filasBloque = bloques
    .map((b, bi) => {
      const rr = b.conceptoIds.reduce((acc, id) => ({ aciertos: acc.aciertos + (p.conceptos[id]?.aciertos ?? 0), total: acc.total + (p.conceptos[id]?.total ?? 0) }), { aciertos: 0, total: 0 });
      const v = pct(rr);
      return `<div class="ex-fila"><span class="ex-et">${nombreCortoBloque(b)}</span><div class="ex-pista"><i class="ex-barra prob" style="width:${Math.max(v ?? 0, 0.6)}%;--c:${colorBloque(bi)}"></i><b class="ex-val">${v === null ? '—' : `${v} %`} <small>${rr.total ? `(${rr.total})` : ''}</small></b></div></div>`;
    })
    .join('');

  // Simulacros (nota sobre 10).
  const sims = p.simulacros.slice(-10);
  const simulacros = sims.length
    ? `<div class="prog-sims">${sims
        .map((s) => {
          const nota = Math.round((s.aciertos / s.total) * 100) / 10;
          return `<div class="prog-sim" title="${s.fecha.split('-').reverse().join('/')}: ${nota} (${s.aciertos}/${s.total})"><b>${nota.toLocaleString('es-ES')}</b><i style="height:${Math.max(nota * 10, 2)}%" class="${nota >= 5 ? 'apr' : 'sus'}"></i><small>${s.fecha.slice(8)}/${s.fecha.slice(5, 7)}</small></div>`;
        })
        .join('')}</div>`
    : '<p class="ex-intro">Aún no has hecho ningún simulacro.</p>';

  ctx.pagina.innerHTML = `<div class="prog"><header class="sh"><div class="kick"><span class="pill k">📈 Mi progreso</span></div><h1>Mi progreso</h1><p>Constancia, memoria a largo plazo y fiabilidad de tu seguridad. El dominio de cada concepto está en el índice.</p></header>
<div class="prog-tiles">${tiles}</div>
<div class="ex-grafs">
<figure class="ex-graf"><figcaption><h3>Actividad</h3><small>Respuestas por día · últimas 4 semanas</small></figcaption><div class="prog-cal">${celdas}</div><div class="prog-cal-ley"><span>Menos</span>${[0, 1, 2, 3, 4].map((n) => `<i class="prog-dia n${n}"></i>`).join('')}<span>Más</span></div></figure>
<figure class="ex-graf"><figcaption><h3>Memoria a largo plazo</h3><small>Preguntas según cada cuánto vuelven (repetición espaciada)</small></figcaption>${memoria}</figure>
<figure class="ex-graf"><figcaption><h3>¿Es fiable tu seguridad?</h3><small>% de aciertos según lo seguro que estabas</small></figcaption><div class="ex-plot">${filasCal}</div><p class="sim-cal-nota">${lectura}</p></figure>
<figure class="ex-graf"><figcaption><h3>Acierto por bloque</h3><small>En la práctica (sesiones, repaso y simulacros)</small></figcaption><div class="ex-plot">${filasBloque}</div></figure>
<figure class="ex-graf"><figcaption><h3>Simulacros</h3><small>Nota sobre 10 · últimos ${sims.length || ''}</small></figcaption>${simulacros}</figure>
</div><p class="home-practica"><a class="principal" href="${hrefSesion()}">🎯 Estudiar hoy</a></p></div>`;
}
