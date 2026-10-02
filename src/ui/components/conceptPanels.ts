import { sacudir, saltarMonedas, sellar } from './celebrar.ts';
import type { Concepto, ModoExplicacion, NodoEsquema, Pregunta, Tema } from '../../content/schema.ts';
import { type Confianza, CONFIANZAS, idTarjetaFrase } from '../../domain/practice.ts';
import { compararRecuerdo, ideasClave } from '../../domain/recall.ts';
import { historiaDeConcepto } from '../../experiences/registry.ts';
import { resaltarAviso } from '../format.ts';

/** Panel "Explícamelo de otra forma" en el modo indicado. */
export function pintarOtraForma(panel: HTMLElement, concepto: Concepto, modos: ModoExplicacion[], indice: number): void {
  const modo = modos[indice];
  const texto = resaltarAviso(concepto.explicaciones[indice] ?? '');
  const puntos = modos.map((_, k) => `<i class="${k === indice ? 'on' : ''}"></i>`).join('');
  const cuerpo = modo?.formato === 'esquema' ? `<div class="esq">${texto}</div>` : `<p>${texto}</p>`;
  panel.innerHTML = `<div class="md"><b>${modo?.etiqueta ?? ''}</b><span class="dots">${puntos}</span></div>${cuerpo}`;
  // Reinicia la animación de entrada en cada cambio de modo.
  panel.style.animation = 'none';
  void panel.offsetWidth;
  panel.style.animation = '';
}

/** Panel "Compruébalo": pinta la pregunta y delega cada elección en `alResponder`. */
export function pintarPregunta(
  panel: HTMLElement,
  concepto: Concepto,
  alResponder: (indice: number) => boolean,
): void {
  pintarPreguntaEn(panel, concepto.pregunta, alResponder);
}

/** Pregunta tipo test (la oficial del concepto o una de práctica) dentro de un panel. */
export function pintarPreguntaEn(
  panel: HTMLElement,
  pregunta: Pregunta,
  alResponder: (indice: number) => boolean,
  pie = '',
): void {
  const { enunciado, opciones, explicacion } = pregunta;
  panel.innerHTML = `<p><b>${enunciado}</b></p><div class="opts">${opciones.map((t, i) => `<button class="opt" data-k="${i}">${t}</button>`).join('')}</div><div class="fb"></div>${pie}`;
  const feedback = panel.querySelector<HTMLElement>('.fb')!;
  const botones = [...panel.querySelectorAll<HTMLButtonElement>('.opt')];

  for (const boton of botones) {
    boton.onclick = () => {
      if (alResponder(Number(boton.dataset.k))) {
        boton.classList.add('ok');
        saltarMonedas(boton);
        for (const b of botones) b.disabled = true;
        feedback.innerHTML = `✅ <b>Correcto.</b> ${explicacion}`;
      } else {
        boton.classList.add('no', 'shake');
        feedback.innerHTML = '❌ No es esa. Pulsa "Explícamelo de otra forma" y vuelve a intentarlo.';
      }
    };
  }
}

/** Textos de la confianza (orden fijo: de más a menos seguridad). */
export const ETIQUETA_CONFIANZA: Record<Confianza, string> = { seguro: 'Seguro', dudo: 'Dudo', adivino: 'Adivino' };

/**
 * Pregunta de práctica con confianza: se elige una opción, se dice cómo de seguro se está y solo
 * entonces se corrige (metacognición; los errores con seguridad se corrigen mejor). La elección se
 * puede cambiar hasta indicar la confianza. `alTerminar` recibe el resultado una sola vez.
 */
export function pintarPreguntaConConfianza(
  panel: HTMLElement,
  pregunta: Pregunta,
  alTerminar: (correcta: boolean, confianza: Confianza) => void,
  pie = '',
  /** HTML entre el enunciado y las opciones (p. ej. la definición a identificar). */
  contexto = '',
): void {
  const { enunciado, opciones, explicacion, indiceCorrecta } = pregunta;
  panel.innerHTML = `<p><b>${enunciado}</b></p>${contexto}<div class="opts">${opciones.map((t, i) => `<button type="button" class="opt" data-k="${i}">${t}</button>`).join('')}</div>
<div class="conf" hidden><span>¿Cómo de seguro estás?</span>${CONFIANZAS.map((c) => `<button type="button" class="conf-btn ${c}" data-conf="${c}">${ETIQUETA_CONFIANZA[c]}</button>`).join('')}</div><div class="fb"></div>${pie}`;
  const botones = [...panel.querySelectorAll<HTMLButtonElement>('.opt')];
  const conf = panel.querySelector<HTMLElement>('.conf')!;
  const feedback = panel.querySelector<HTMLElement>('.fb')!;
  let elegida: number | null = null;
  for (const b of botones) {
    b.onclick = () => {
      elegida = Number(b.dataset.k);
      for (const x of botones) x.classList.toggle('elegida', x === b);
      conf.hidden = false;
      conf.querySelector<HTMLButtonElement>('.conf-btn')?.focus({ preventScroll: true });
    };
  }
  for (const c of conf.querySelectorAll<HTMLButtonElement>('[data-conf]')) {
    c.onclick = () => {
      if (elegida === null) return;
      const confianza = c.dataset.conf as Confianza;
      const correcta = elegida === indiceCorrecta;
      for (const x of botones) {
        x.disabled = true;
        x.classList.remove('elegida');
      }
      botones[indiceCorrecta]?.classList.add('ok');
      if (!correcta) {
        botones[elegida]?.classList.add('no');
        sacudir(botones[elegida]);
      } else {
        saltarMonedas(botones[indiceCorrecta]);
        if (confianza === 'seguro') sellar(panel);
      }
      for (const x of conf.querySelectorAll<HTMLButtonElement>('button')) {
        x.disabled = true;
        x.classList.toggle('on', x === c);
      }
      const exp = resaltarAviso(explicacion);
      feedback.innerHTML = correcta
        ? confianza === 'seguro'
          ? `✅ <b>Correcto.</b> ${exp}`
          : `✅ <b>Correcto, pero sin seguridad:</b> volverá pronto a tu repaso para afianzarla. ${exp}`
        : confianza === 'seguro'
          ? `⚡ <b>Error con seguridad.</b> Son los que mejor se corrigen si te fijas ahora: la correcta es <b>${opciones[indiceCorrecta]}</b>. ${exp}`
          : `❌ <b>No es esa.</b> La correcta es <b>${opciones[indiceCorrecta]}</b>. ${exp}`;
      feedback.classList.toggle('sorpresa', !correcta && confianza === 'seguro');
      alTerminar(correcta, confianza);
    };
  }
}

/* ------------------------------------------------------------ ampliación */

function arbol(n: NodoEsquema, nivel: number): string {
  if (!n.hijos?.length) return `<li class="esq-hoja">${n.texto}</li>`;
  return `<li><details open><summary><span>${n.texto}</span><small class="esq-n">${n.hijos.length}</small></summary><ul>${n.hijos.map((h) => arbol(h, nivel + 1)).join('')}</ul></details></li>`;
}

/** Pieza de un diagrama de flujo: una caja o un conector (con su etiqueta y sentido). */
type PiezaFlujo = { tipo: 'nodo'; texto: string } | { tipo: 'con'; etiqueta: string; sentido: 'der' | 'izq' | 'doble' | 'contiene' | 'contenido' };

/**
 * Lee el esquema de texto de DATA ("A ──x──▶ B", "A → B", "A ⇄ B", varias filas separadas por
 * "   ·   " o " | ") como filas de un diagrama de flujo. Solo cambia la presentación: los textos son los
 * de DATA tal cual. Si una fila no tiene conectores, es una lista ("A · B · C").
 */
export function leerEsquema(texto: string): PiezaFlujo[][] {
  const conector = /──(.+?)──▶|◀──(.+?)──|→|⇄|▶/g;
  return texto
    .split(/\s{2,}·\s{2,}|\s\|\s/)
    .map((fila) => {
      const piezas: PiezaFlujo[] = [];
      let ultimo = 0;
      for (const m of fila.matchAll(conector)) {
        const antes = fila.slice(ultimo, m.index).trim();
        if (antes) piezas.push({ tipo: 'nodo', texto: antes });
        if (m[1] !== undefined) piezas.push({ tipo: 'con', etiqueta: m[1].trim(), sentido: 'der' });
        else if (m[2] !== undefined) piezas.push({ tipo: 'con', etiqueta: m[2].trim(), sentido: 'izq' });
        else piezas.push({ tipo: 'con', etiqueta: '', sentido: m[0] === '⇄' ? 'doble' : 'der' });
        ultimo = (m.index ?? 0) + m[0].length;
      }
      const resto = fila.slice(ultimo).trim();
      if (resto) piezas.push({ tipo: 'nodo', texto: resto });
      // Sin conectores: es una lista de elementos.
      if (!piezas.some((p) => p.tipo === 'con')) return resto.split(/\s·\s/).map((t): PiezaFlujo => ({ tipo: 'nodo', texto: t.trim() }));
      return piezas;
    })
    .filter((f) => f.length);
}

const FLECHA: Record<Extract<PiezaFlujo, { tipo: 'con' }>['sentido'], string> = { der: '→', izq: '←', doble: '⇄', contiene: '⊃', contenido: '⊂' };

function diagramaFlujo(filas: PiezaFlujo[][]): string {
  return `<div class="flujo">${filas
    .map((fila) => {
      const lista = !fila.some((p) => p.tipo === 'con');
      const html = fila.map((p) =>
        p.tipo === 'nodo'
          ? `<span class="f-nodo">${p.texto}</span>`
          : `<span class="f-con ${p.sentido}" aria-label="${p.etiqueta || FLECHA[p.sentido]}">${p.etiqueta ? `<small>${p.etiqueta}</small>` : ''}<i aria-hidden="true">${FLECHA[p.sentido]}</i></span>`,
      );
      // Cada conector va pegado a la caja que le sigue: al partir la fila no queda una flecha suelta.
      const grupos: string[] = [];
      for (let k = 0; k < html.length; k++) {
        if (fila[k]!.tipo === 'con' && k + 1 < html.length) {
          grupos.push(`<span class="f-par">${html[k]}${html[k + 1]}</span>`);
          k++;
        } else grupos.push(html[k]!);
      }
      return `<div class="flujo-fila${lista ? ' lista' : ''}">${grupos.join('')}</div>`;
    })
    .join('')}</div>`;
}

/**
 * Panel "Esquema": diagrama de flujo (de la historia del concepto o del esquema de texto de DATA)
 * y, si los apuntes tienen un esquema de este concepto, un árbol desplegable.
 */
export function pintarEsquema(panel: HTMLElement, concepto: Concepto, tema: Tema): void {
  const indice = tema.modos.findIndex((m) => m.formato === 'esquema');
  const texto = concepto.explicaciones[indice] ?? '';
  const h = historiaDeConcepto(tema, concepto.id);
  let filas: PiezaFlujo[][];
  if (h) {
    const fila: PiezaFlujo[] = [];
    h.entidades.forEach((e, i) => {
      fila.push({ tipo: 'nodo', texto: e.etiqueta });
      const f = h.flujos[i];
      if (f && i < h.entidades.length - 1) {
        const sentido = f.tipo === 'contiene' ? (f.desde === e.id ? 'contiene' : 'contenido') : f.tipo === 'intercambio' ? 'doble' : f.desde === e.id ? 'der' : 'izq';
        fila.push({ tipo: 'con', etiqueta: f.etiqueta ?? '', sentido });
      }
    });
    filas = [fila];
  } else {
    filas = leerEsquema(texto.replace(/⚠.*$/, '').trim());
  }
  const aviso = texto.includes('⚠') ? `<p class="flujo-aviso">${resaltarAviso(texto.slice(texto.indexOf('⚠')))}</p>` : '';
  const propios = tema.ampliacion?.esquemas.filter((e) => e.conceptoId === concepto.id) ?? [];
  const desplegables = propios
    .map((e) => `<div class="esq-arbol"><div class="esq-arbol-h"><h5>${e.titulo} <small>· de tus apuntes</small></h5><span class="esq-ctrl"><button type="button" data-arbol="abrir">Desplegar todo</button><button type="button" data-arbol="cerrar">Plegar todo</button></span></div><ul class="esq-raiz">${arbol(e.raiz, 0)}</ul></div>`)
    .join('');
  panel.innerHTML = `<div class="md"><b>🗺️ Esquema visual</b></div>${diagramaFlujo(filas)}${aviso}${desplegables}`;
  for (const boton of panel.querySelectorAll<HTMLButtonElement>('[data-arbol]')) {
    boton.onclick = () => {
      const abrir = boton.dataset.arbol === 'abrir';
      boton.closest('.esq-arbol')?.querySelectorAll('details').forEach((d) => (d.open = abrir));
    };
  }
}

export interface Tarjeta {
  /** Id estable para la repetición espaciada (`frase:<concepto>` o el de la tarjeta de los apuntes). */
  id: string;
  anverso: string;
  reverso: string;
  fuente: string;
}

/** Tarjetas del concepto: la de DATA (nombre → frase de examen) y las de los apuntes. */
export function tarjetasDe(concepto: Concepto, tema: Tema): Tarjeta[] {
  const frase = tema.modos.findIndex((m) => m.etiqueta.includes('Frase de examen'));
  const propias = (tema.ampliacion?.flashcards ?? []).filter((f) => f.conceptoId === concepto.id);
  return [
    { id: idTarjetaFrase(concepto.id), anverso: concepto.nombre, reverso: concepto.explicaciones[frase >= 0 ? frase : concepto.explicaciones.length - 1] ?? '', fuente: 'Frase de examen' },
    ...propias.map((f) => ({ id: f.id, anverso: f.anverso, reverso: f.reverso, fuente: 'De tus apuntes' })),
  ];
}

/** Panel "Flashcards": una tarjeta cada vez; se gira al pulsarla. */
export function pintarFlashcard(panel: HTMLElement, tarjetas: Tarjeta[], indice: number, girada: boolean): void {
  const t = tarjetas[indice];
  if (!t) return;
  panel.innerHTML = `<div class="md"><b>🃏 Flashcards</b><span class="fc-n">${indice + 1} / ${tarjetas.length}</span></div>
 <button type="button" class="fc${girada ? ' girada' : ''}" data-fc="girar" aria-pressed="${girada}">
  <span class="fc-cara fc-anverso"><small>${t.fuente}</small>${t.anverso}<em>Pulsa para ver la respuesta</em></span>
  <span class="fc-cara fc-reverso">${resaltarAviso(t.reverso)}</span>
 </button>
 <div class="fc-ctrl"><button type="button" class="fc-btn" data-fc="anterior"${indice === 0 ? ' disabled' : ''}>← Anterior</button><button type="button" class="fc-btn" data-fc="siguiente"${indice >= tarjetas.length - 1 ? ' disabled' : ''}>Siguiente →</button></div>`;
}

/**
 * "Escríbelo tú" (recuerdo libre): con la definición oculta, se escribe de memoria y después se
 * compara con las ideas clave de DATA. La autoevaluación alimenta la repetición espaciada de la
 * tarjeta del concepto (`alCalificar`).
 */
export function pintarRecuerdo(panel: HTMLElement, concepto: Concepto, ficha: HTMLElement, alCalificar: (sabia: boolean) => void): void {
  ficha.classList.add('recordando');
  panel.innerHTML = `<div class="md"><b>✍️ Escríbelo tú</b><span class="fc-n">sin mirar</span></div>
<label class="rec-preg" for="rec-${concepto.id}">¿Qué es <b>${concepto.nombre}</b>? Escríbelo con tus palabras.</label>
<textarea id="rec-${concepto.id}" class="rec-texto" rows="4" placeholder="Lo que recuerdes, aunque sea poco: intentarlo ya ayuda a fijarlo."></textarea>
<div class="fc-ctrl"><span class="pq-pie"><span>La definición está oculta mientras escribes.</span></span><button type="button" class="fc-btn" data-rec="comparar">Comparar con la definición →</button></div>`;
  const texto = panel.querySelector<HTMLTextAreaElement>('.rec-texto')!;
  texto.focus({ preventScroll: true });
  panel.querySelector<HTMLButtonElement>('[data-rec="comparar"]')!.onclick = () => {
    ficha.classList.remove('recordando');
    const ideas = ideasClave(concepto.definicion);
    const r = compararRecuerdo(texto.value, ideas);
    const pct = Math.round(r.cobertura * 100);
    const lista = [...r.encontradas.map((i) => `<li class="si">✓ ${i}</li>`), ...r.faltan.map((i) => `<li class="no">✗ ${i}</li>`)].join('');
    panel.innerHTML = `<div class="md"><b>✍️ Escríbelo tú</b><span class="fc-n">${r.encontradas.length} de ${ideas.length} ideas clave</span></div>
<div class="rec-barra" role="img" aria-label="Has recordado el ${pct} % de las ideas clave"><i style="width:${Math.max(pct, 2)}%"></i></div>
<div class="rec-comp"><div><h5>Lo que escribiste</h5><p class="rec-tuyo">${texto.value.trim() ? escaparHtml(texto.value.trim()) : '<em>(nada)</em>'}</p></div><div><h5>Ideas clave de la definición</h5><ul class="rec-ideas">${lista}</ul></div></div>
<p class="rec-nota">La comparación es orientativa (busca las palabras clave). Decide tú:</p>
<div class="fc-ctrl rep-calif"><button type="button" class="fc-btn rep-no" data-rec="no">✗ No la sabía</button><button type="button" class="fc-btn rep-si" data-rec="si">✓ La sabía</button></div>`;
    for (const b of panel.querySelectorAll<HTMLButtonElement>('[data-rec="si"], [data-rec="no"]')) {
      b.onclick = () => {
        const sabia = b.dataset.rec === 'si';
        alCalificar(sabia);
        panel.querySelector('.rep-calif')!.outerHTML = `<p class="rec-nota">${sabia ? '✅ Anotado: volverá más espaciada.' : '🔁 Anotado: volverá pronto en tu repaso de flashcards.'}</p>`;
      };
    }
  };
}

function escaparHtml(t: string): string {
  return t.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}
