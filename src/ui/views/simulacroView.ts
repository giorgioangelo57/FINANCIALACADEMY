import type { EstadoPractica } from '../../app/practiceStore.ts';
import { hrefConcepto, hrefRepaso } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { type CorreccionSimulacro, construirSimulacro, corregirSimulacro, type PreguntaExamen } from '../../domain/exam.ts';
import { colorBloque, nombreCortoBloque } from '../blockColors.ts';
import { CONFIANZAS, type Confianza } from '../../domain/practice.ts';
import { ETIQUETA_CONFIANZA } from '../components/conceptPanels.ts';
import { anilloDominio } from '../components/ring.ts';
import { resaltarAviso } from '../format.ts';
import type { ContextoVista } from './context.ts';

/** Segundos por pregunta con el modo "con tiempo". */
export const SEGUNDOS_POR_PREGUNTA = 60;
const TAMANOS = [10, 20, 30];

let reloj: ReturnType<typeof setInterval> | undefined;

/** Para el cronómetro si se sale de la vista a mitad de un simulacro. */
export function detenerSimulacro(): void {
  if (reloj) clearInterval(reloj);
  reloj = undefined;
}

interface Config {
  total: number;
  conTiempo: boolean;
  /** Pedir la confianza en cada respuesta (calibración e hipercorrección). */
  conConfianza: boolean;
}

/**
 * Simulacro del tema: examen tipo test repartido por bloques según la predicción, una pregunta
 * cada vez y sin corrección hasta el final. No cambia el dominio; los fallos van al repaso.
 */
export function pintarSimulacro(ctx: ContextoVista, estado: EstadoEstudio, practica: EstadoPractica): void {
  ctx.tituloMovil.textContent = 'Simulacro';
  ctx.pagina.innerHTML = `<div class="sim" data-simulacro></div>`;
  const raiz = ctx.pagina.querySelector<HTMLElement>('[data-simulacro]')!;
  inicio(raiz, estado, practica, { total: 20, conTiempo: false, conConfianza: true });
}

function inicio(raiz: HTMLElement, estado: EstadoEstudio, practica: EstadoPractica, config: Config): void {
  detenerSimulacro();
  const previos = practica.practica.simulacros.slice(-5).reverse();
  const historial = previos.length
    ? `<div class="sim-hist"><h3>Tus últimos simulacros</h3><ol>${previos
        .map((s) => {
          const nota = Math.round((s.aciertos / s.total) * 100) / 10;
          return `<li><span>${s.fecha.split('-').reverse().join('/')}</span><i style="--p:${(s.aciertos / s.total) * 100}%"></i><b>${nota.toLocaleString('es-ES')}</b><small>${s.aciertos}/${s.total}</small></li>`;
        })
        .join('')}</ol></div>`
    : '';
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  raiz.innerHTML = `<header class="sh"><div class="kick"><span class="pill k">📝 Simulacro</span><span class="pill">No cambia tu dominio · los fallos van a tu repaso</span></div><h1>Simulacro de examen</h1><p>Preguntas tipo test de todo el tema, repartidas según la predicción (${bloques.map((b) => `${nombreCortoBloque(b)} ${b.probabilidad} %`).join(' · ')}). La corrección llega al final.</p></header>
<div class="sim-config"><fieldset><legend>Número de preguntas</legend>${TAMANOS.map((n) => `<label class="sim-op"><input type="radio" name="sim-n" value="${n}"${n === config.total ? ' checked' : ''}><span>${n}</span></label>`).join('')}</fieldset>
<label class="sim-tiempo"><input type="checkbox" name="sim-t"${config.conTiempo ? ' checked' : ''}><span>Con tiempo (${SEGUNDOS_POR_PREGUNTA} s por pregunta)</span></label>
<label class="sim-tiempo"><input type="checkbox" name="sim-c"${config.conConfianza ? ' checked' : ''}><span>Decir cómo de seguro estoy en cada respuesta</span></label>
<button type="button" class="ab q sim-empezar" data-sim-empezar>Empezar el simulacro →</button></div>${historial}`;
  raiz.querySelector<HTMLButtonElement>('[data-sim-empezar]')!.onclick = () => {
    const total = Number(raiz.querySelector<HTMLInputElement>('input[name="sim-n"]:checked')?.value ?? 20);
    const conTiempo = Boolean(raiz.querySelector<HTMLInputElement>('input[name="sim-t"]')?.checked);
    const conConfianza = Boolean(raiz.querySelector<HTMLInputElement>('input[name="sim-c"]')?.checked);
    const preguntas = construirSimulacro(estado.tema, { total, semilla: Date.now() });
    jugar(raiz, estado, practica, { total, conTiempo, conConfianza }, preguntas, [], []);
  };
}

function jugar(raiz: HTMLElement, estado: EstadoEstudio, practica: EstadoPractica, config: Config, preguntas: PreguntaExamen[], respuestas: (number | null)[], confianzas: (Confianza | null)[]): void {
  detenerSimulacro();
  const i = respuestas.length;
  if (i >= preguntas.length) return resultado(raiz, estado, practica, config, preguntas, respuestas, confianzas);
  const p = preguntas[i]!;
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  const bi = bloques.findIndex((b) => b.id === p.bloqueId);
  const bloque = bloques[bi];
  const tiempo = config.conTiempo ? `<div class="sim-reloj" aria-hidden="true"><i data-sim-reloj></i></div><span class="sim-seg" data-sim-seg>${SEGUNDOS_POR_PREGUNTA} s</span>` : '';
  raiz.innerHTML = `<div class="sim-cab"><span class="sim-n">Pregunta <b>${i + 1}</b> de ${preguntas.length}</span>${bloque ? `<span class="sim-bloque" style="--c:${colorBloque(bi)}">${nombreCortoBloque(bloque)}</span>` : ''}<button type="button" class="fc-btn" data-sim-salir>Abandonar</button></div>
<div class="sim-progreso" role="progressbar" aria-valuemin="0" aria-valuemax="${preguntas.length}" aria-valuenow="${i}"><i style="width:${(i / preguntas.length) * 100}%"></i></div>${tiempo}
<article class="sim-pregunta"><h2>${p.enunciado}</h2><div class="opts">${p.opciones.map((t, k) => `<button type="button" class="opt" data-k="${k}">${t}</button>`).join('')}</div>
<div class="conf" hidden><span>¿Cómo de seguro estás?</span>${CONFIANZAS.map((c) => `<button type="button" class="conf-btn ${c}" data-conf="${c}">${ETIQUETA_CONFIANZA[c]}</button>`).join('')}</div>
<div class="sim-pie"><button type="button" class="fc-btn" data-sim-saltar>Dejar en blanco</button></div></article>`;
  const responder = (k: number | null, confianza: Confianza | null = null) => {
    detenerSimulacro();
    for (const b of raiz.querySelectorAll<HTMLButtonElement>('.opt, .conf-btn')) b.disabled = true;
    for (const b of raiz.querySelectorAll<HTMLButtonElement>('.opt')) b.classList.toggle('elegida', k !== null && Number(b.dataset.k) === k);
    // Un instante para ver la elección marcada y se pasa a la siguiente (sin decir si es correcta).
    setTimeout(() => raiz.isConnected && jugar(raiz, estado, practica, config, preguntas, [...respuestas, k], [...confianzas, confianza]), k === null ? 0 : 280);
  };
  let elegida: number | null = null;
  const conf = raiz.querySelector<HTMLElement>('.conf')!;
  for (const b of raiz.querySelectorAll<HTMLButtonElement>('.opt')) {
    b.onclick = () => {
      if (!config.conConfianza) return responder(Number(b.dataset.k));
      // Con confianza: se marca la elección (se puede cambiar) y se pregunta la seguridad.
      elegida = Number(b.dataset.k);
      for (const x of raiz.querySelectorAll<HTMLButtonElement>('.opt')) x.classList.toggle('elegida', x === b);
      conf.hidden = false;
    };
  }
  for (const c of conf.querySelectorAll<HTMLButtonElement>('[data-conf]')) c.onclick = () => elegida !== null && responder(elegida, c.dataset.conf as Confianza);
  raiz.querySelector<HTMLButtonElement>('[data-sim-saltar]')!.onclick = () => responder(null);
  raiz.querySelector<HTMLButtonElement>('[data-sim-salir]')!.onclick = () => inicio(raiz, estado, practica, config);
  if (config.conTiempo) {
    const fin = Date.now() + SEGUNDOS_POR_PREGUNTA * 1000;
    const barra = raiz.querySelector<HTMLElement>('[data-sim-reloj]');
    const seg = raiz.querySelector<HTMLElement>('[data-sim-seg]');
    reloj = setInterval(() => {
      if (!raiz.isConnected) return detenerSimulacro();
      const queda = Math.max(0, fin - Date.now());
      if (barra) barra.style.width = `${(queda / (SEGUNDOS_POR_PREGUNTA * 1000)) * 100}%`;
      if (seg) seg.textContent = `${Math.ceil(queda / 1000)} s`;
      if (!queda) responder(elegida, null);
    }, 250);
  }
}

function resultado(raiz: HTMLElement, estado: EstadoEstudio, practica: EstadoPractica, config: Config, preguntas: PreguntaExamen[], respuestas: (number | null)[], confianzas: (Confianza | null)[]): void {
  const r: CorreccionSimulacro = corregirSimulacro(preguntas, respuestas);
  practica.simulacro(r.aciertos, r.total);
  preguntas.forEach((p, i) => practica.responder(p.id, respuestas[i] === p.indiceCorrecta, { conceptoId: p.conceptoId, confianza: confianzas[i] ?? undefined }));
  const bloques = estado.tema.ampliacion?.bloques ?? [];
  const veredicto = r.nota >= 9 ? '¡Sobresaliente!' : r.nota >= 7 ? 'Notable: vas muy bien.' : r.nota >= 5 ? 'Aprobado: repasa tus fallos.' : 'Toca repasar: empieza por tus fallos.';
  const barras = bloques
    .map((b, bi) => {
      const x = r.porBloque.find((y) => y.bloqueId === b.id);
      if (!x) return '';
      return `<div class="ex-fila"><span class="ex-et">${nombreCortoBloque(b)}</span><div class="ex-pista"><i class="ex-barra prob" style="width:${Math.max((x.aciertos / x.total) * 100, 0.6)}%;--c:${colorBloque(bi)}"></i><b class="ex-val">${x.aciertos}/${x.total}</b></div></div>`;
    })
    .join('');
  const conceptoNombre = (id: string) => estado.tema.conceptos.find((c) => c.id === id)?.nombre ?? id;
  const correccion = preguntas
    .map((p, i) => {
      const elegida = respuestas[i];
      const bien = elegida === p.indiceCorrecta;
      const tuya = elegida === null || elegida === undefined ? '<em>En blanco</em>' : p.opciones[elegida];
      const c = confianzas[i];
      const sorpresa = !bien && c === 'seguro';
      const etiquetaC = c ? `<span class="sim-c-conf ${c}${sorpresa ? ' sorpresa' : ''}">${sorpresa ? '⚡ ' : ''}${ETIQUETA_CONFIANZA[c]}</span>` : '';
      return `<li class="${bien ? 'bien' : 'mal'}${sorpresa ? ' sorpresa' : ''}"><div class="sim-c-h"><span class="sim-c-n">${i + 1}</span><b>${p.enunciado}</b><span class="sim-c-r" aria-label="${bien ? 'Correcta' : 'Incorrecta'}">${bien ? '✓' : '✗'}</span></div>${etiquetaC}${bien ? '' : `<p class="sim-tuya">Tu respuesta: ${tuya}</p>`}<p class="sim-ok">Correcta: <b>${p.opciones[p.indiceCorrecta]}</b></p><p class="sim-exp">${resaltarAviso(p.explicacion)}</p><a class="sim-ficha" href="${hrefConcepto(p.conceptoId)}">Ir a la ficha: ${conceptoNombre(p.conceptoId)} →</a></li>`;
    })
    .join('');
  raiz.innerHTML = `<header class="sim-nota"><div class="sim-anillo">${anilloDominio(r.aciertos / (r.total || 1), 150)}</div><div>${medalla(r.nota)}<span class="pill k">📝 Resultado</span><h1><span data-sim-nota>${r.nota.toLocaleString('es-ES')}</span><small>/10</small></h1><p>${r.aciertos} de ${r.total} correctas · ${veredicto}</p><div class="acts"><button type="button" class="ab q" data-sim-repetir>Otro simulacro</button>${r.fallos.length ? `<a class="ab p" href="${hrefRepaso()}">Repasar mis fallos (${r.fallos.length})</a>` : ''}</div></div></header>
${calibracionSimulacro(preguntas, respuestas, confianzas)}<figure class="ex-graf"><figcaption><h3>Aciertos por bloque</h3><small>Dónde has fallado más</small></figcaption><div class="ex-plot">${barras}</div></figure>
<section class="sim-correccion"><h2>Corrección</h2><div class="sim-filtro"><button type="button" class="fc-btn on" data-ver="todas">Todas</button><button type="button" class="fc-btn" data-ver="mal">Solo fallos (${r.fallos.length})</button></div><ol>${correccion}</ol></section>`;
  raiz.querySelector<HTMLButtonElement>('[data-sim-repetir]')!.onclick = () => inicio(raiz, estado, practica, config);
  for (const b of raiz.querySelectorAll<HTMLButtonElement>('[data-ver]')) {
    b.onclick = () => {
      raiz.querySelectorAll('[data-ver]').forEach((x) => x.classList.toggle('on', x === b));
      raiz.querySelector('.sim-correccion ol')?.classList.toggle('solo-mal', b.dataset.ver === 'mal');
    };
  }
  window.scrollTo(0, 0);
}

/**
 * Calibración del simulacro: qué % acertaste según lo seguro que estabas. Bien calibrado = "Seguro"
 * cerca del 100 % y "Adivino" bajo. Los errores con seguridad se señalan (son los que más enseñan).
 */
function calibracionSimulacro(preguntas: PreguntaExamen[], respuestas: (number | null)[], confianzas: (Confianza | null)[]): string {
  if (!confianzas.some(Boolean)) return '';
  const filas = CONFIANZAS.map((c) => {
    const idx = confianzas.map((x, i) => (x === c ? i : -1)).filter((i) => i >= 0);
    if (!idx.length) return '';
    const ok = idx.filter((i) => respuestas[i] === preguntas[i]!.indiceCorrecta).length;
    const pct = Math.round((ok / idx.length) * 100);
    return `<div class="ex-fila"><span class="ex-et">${ETIQUETA_CONFIANZA[c]} <small>(${idx.length})</small></span><div class="ex-pista"><i class="ex-barra cal ${c}" style="width:${Math.max(pct, 0.6)}%"></i><b class="ex-val">${pct} %</b></div></div>`;
  }).join('');
  const sorpresas = confianzas.filter((c, i) => c === 'seguro' && respuestas[i] !== preguntas[i]!.indiceCorrecta).length;
  const nota = sorpresas
    ? `<p class="sim-cal-nota">⚡ <b>${sorpresas} ${sorpresas === 1 ? 'error' : 'errores'} con seguridad.</b> Revísalos en la corrección: son los que mejor se fijan si los entiendes ahora.</p>`
    : '<p class="sim-cal-nota">Sin errores con seguridad: tu confianza es fiable.</p>';
  return `<figure class="ex-graf sim-cal"><figcaption><h3>¿Sabías lo que sabías?</h3><small>% de aciertos según tu seguridad</small></figcaption><div class="ex-plot">${filas}</div>${nota}</figure>`;
}

/** Medalla de la nota: bronce (aprobado), plata (notable) u oro (sobresaliente). */
function medalla(nota: number): string {
  const [clase, nombre] = nota >= 9 ? ['oro', 'Sobresaliente'] : nota >= 7 ? ['plata', 'Notable'] : nota >= 5 ? ['bronce', 'Aprobado'] : ['', ''];
  return clase ? `<span class="medalla m-${clase}" role="img" aria-label="Medalla de ${clase}: ${nombre}"><i>€</i></span>` : '';
}
