import { hrefConcepto } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { montarInfografia } from '../components/infographic.ts';
import type { ContextoVista } from './context.ts';

let desmontar: (() => void)[] = [];

/** Para los cronómetros y observadores de las infografías al salir de la vista. */
export function detenerVisual(): void {
  for (const f of desmontar) f();
  desmontar = [];
}

/**
 * Galería de infografías: los conceptos más difíciles (ICO, EDE, SGR, EFC, FGD, fondos y
 * sociedades de inversión, dealer y bróker, seguros, bancos centrales, supervisores, MUS y MUR)
 * contados paso a paso. Cada una enlaza a la ficha de su concepto.
 */
export function pintarVisual(ctx: ContextoVista, estado: EstadoEstudio): void {
  detenerVisual();
  ctx.tituloMovil.textContent = 'Infografías';
  const infos = estado.tema.ampliacion?.infografias ?? [];
  const nombre = (id: string) => estado.tema.conceptos.find((c) => c.id === id)?.nombre ?? id;
  ctx.pagina.innerHTML = `<div class="vis"><header class="sh"><div class="kick"><span class="pill k">🎬 Infografías</span><span class="pill">${infos.length} conceptos difíciles, paso a paso</span></div><h1>Entiéndelo viéndolo</h1><p>Quién da el dinero, quién asume el riesgo y quién vigila. Pulsa «Siguiente» o «Reproducir»; cada infografía enlaza con su ficha.</p>
<nav class="vis-indice" aria-label="Infografías">${infos.map((i) => `<a href="#vis-${i.id}" data-vis="${i.id}">${i.titulo}</a>`).join('')}</nav></header>
${infos.map((i) => `<section class="vis-item" id="vis-${i.id}"><div data-vis-caja="${i.id}"></div><p class="vis-fichas">Fichas: ${i.conceptoIds.map((c) => `<a href="${hrefConcepto(c)}">${nombre(c)}</a>`).join(' · ')}</p></section>`).join('')}</div>`;
  for (const i of infos) {
    const caja = ctx.pagina.querySelector<HTMLElement>(`[data-vis-caja="${i.id}"]`);
    if (caja) desmontar.push(montarInfografia(caja, i));
  }
  for (const a of ctx.pagina.querySelectorAll<HTMLAnchorElement>('[data-vis]')) {
    // Enlaces internos sin cambiar la ruta (el hash es del router).
    a.onclick = (e) => {
      e.preventDefault();
      document.getElementById(`vis-${a.dataset.vis}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
  }
}
