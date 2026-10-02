import { sacudir, saltarMonedas } from '../components/celebrar.ts';
import { skylineSeccion } from '../components/skyline.ts';
import { hrefInicio, hrefSeccion } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import type { Concepto, Pregunta } from '../../content/schema.ts';
import { dominioSeccion } from '../../domain/mastery.ts';
import { fichaConcepto } from '../components/conceptCard.ts';
import { infografiasDe } from '../components/infographic.ts';
import { colorDominio, porcentaje } from '../format.ts';
import type { ContextoVista } from './context.ts';

export function pintarSeccion(ctx: ContextoVista, estado: EstadoEstudio, seccionId: string, conceptoFoco: string | null): void {
  const { tema, progreso } = estado;
  const i = tema.secciones.findIndex((s) => s.id === seccionId);
  const s = tema.secciones[i];
  if (!s) return;
  const anterior = tema.secciones[i - 1];
  const siguiente = tema.secciones[i + 1];
  const conceptos = tema.conceptos.filter((c) => c.seccionId === seccionId);
  const d = dominioSeccion(tema, progreso, seccionId);

  const enlaceAnterior = anterior
    ? `<a href="${hrefSeccion(anterior.id)}"><small>← Anterior</small><b>${anterior.id} ${anterior.titulo}</b></a>`
    : `<a href="${hrefInicio()}"><small>←</small><b>Inicio</b></a>`;
  const enlaceSiguiente = siguiente
    ? `<a href="${hrefSeccion(siguiente.id)}"><small>Siguiente →</small><b>${siguiente.id} ${siguiente.titulo}</b></a>`
    : `<a href="${hrefInicio()}"><small>Fin del tema →</small><b>Inicio</b></a>`;

  ctx.pagina.innerHTML = `<div data-sec="${seccionId}"><header class="sh"><div class="kick"><span class="pill k">${s.id}</span><span class="pill">Peso estimado en examen: ${s.pesoExamen} %</span><span class="pill" style="border-color:${colorDominio(d)}">Dominio ${porcentaje(d)}</span></div><h1>${s.titulo}</h1><p>${s.descripcion}</p>${skylineSeccion(conceptos, progreso)}</header>
 ${pretest(estado, conceptos)}
 ${conceptos.map((c) => fichaConcepto(c, progreso, infografiasDe(tema.ampliacion?.infografias, c.id).length > 0)).join('')}
 <nav class="pager">${enlaceAnterior}${enlaceSiguiente}</nav></div>`;
  ctx.tituloMovil.textContent = `${s.id} · ${s.titulo}`;
  conectarPretest(ctx.pagina.querySelector<HTMLElement>('[data-pretest]'), estado, conceptos);

  if (conceptoFoco) {
    const ficha = document.getElementById(`c-${conceptoFoco}`);
    if (ficha) {
      ficha.classList.add('in');
      setTimeout(() => ficha.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }
}

/** Preguntas del pretest: una de práctica por concepto de la sección (o la oficial), hasta 3. */
function preguntasPretest(estado: EstadoEstudio, conceptos: Concepto[]): (Pregunta & { conceptoId: string })[] {
  const extra = estado.tema.ampliacion?.preguntas ?? [];
  return conceptos
    .map((c) => {
      const q = extra.find((p) => p.conceptoId === c.id);
      return q ? { ...q, conceptoId: c.id } : { ...c.pregunta, conceptoId: c.id };
    })
    .slice(0, 3);
}

/**
 * Pretest: antes de leer las fichas, unas preguntas rápidas. Intentar responder antes de estudiar
 * mejora el recuerdo posterior aunque se falle (Richland, Kornell y Kao, 2009). No cuenta para nada.
 */
function pretest(estado: EstadoEstudio, conceptos: Concepto[]): string {
  const n = preguntasPretest(estado, conceptos).length;
  if (!n) return '';
  return `<section class="pre" data-pretest><div class="pre-cab"><div><h3>🔮 Antes de leer: ${n} ${n === 1 ? 'pregunta rápida' : 'preguntas rápidas'}</h3><p>Intentar responder antes de estudiar ayuda a recordar después, aunque falles. No cuenta para nada.</p></div><button type="button" class="ab o" data-pre="empezar">Probar</button></div><div class="pre-panel" hidden></div></section>`;
}

function conectarPretest(raiz: HTMLElement | null, estado: EstadoEstudio, conceptos: Concepto[]): void {
  if (!raiz) return;
  const preguntas = preguntasPretest(estado, conceptos);
  const panel = raiz.querySelector<HTMLElement>('.pre-panel')!;
  let aciertos = 0;
  const mostrar = (i: number) => {
    const q = preguntas[i];
    if (!q) {
      panel.innerHTML = `<p class="pre-fin">${aciertos} de ${preguntas.length}. Ahora lee las fichas buscando las respuestas: así se fijan mejor.</p>`;
      return;
    }
    const nombre = conceptos.find((c) => c.id === q.conceptoId)?.nombre ?? '';
    panel.innerHTML = `<p class="pre-n">${i + 1} / ${preguntas.length}</p><p><b>${q.enunciado}</b></p><div class="opts">${q.opciones.map((t, k) => `<button type="button" class="opt" data-k="${k}">${t}</button>`).join('')}</div><div class="fb"></div>`;
    for (const b of panel.querySelectorAll<HTMLButtonElement>('.opt')) {
      b.onclick = () => {
        const k = Number(b.dataset.k);
        const bien = k === q.indiceCorrecta;
        if (bien) aciertos++;
        for (const x of panel.querySelectorAll<HTMLButtonElement>('.opt')) x.disabled = true;
        panel.querySelectorAll<HTMLButtonElement>('.opt')[q.indiceCorrecta]?.classList.add('ok');
        if (!bien) b.classList.add('no');
        if (bien) saltarMonedas(b);
        else sacudir(b);
        panel.querySelector('.fb')!.innerHTML = `${bien ? '✅ ¡Bien!' : '🔎 Lo verás en la ficha'} <a href="#c-${q.conceptoId}" data-pre-ir>${nombre}</a>. <button type="button" class="fc-btn" data-pre="sig">${i + 1 < preguntas.length ? 'Siguiente →' : 'Terminar'}</button>`;
        panel.querySelector<HTMLButtonElement>('[data-pre="sig"]')!.onclick = () => mostrar(i + 1);
        panel.querySelector<HTMLAnchorElement>('[data-pre-ir]')!.onclick = (e) => {
          e.preventDefault();
          document.getElementById(`c-${q.conceptoId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
      };
    }
  };
  raiz.querySelector<HTMLButtonElement>('[data-pre="empezar"]')!.onclick = (e) => {
    (e.currentTarget as HTMLElement).hidden = true;
    panel.hidden = false;
    mostrar(0);
  };
}
