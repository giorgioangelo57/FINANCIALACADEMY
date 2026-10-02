import type { Infografia, TipoFlujo } from '../../content/schema.ts';

/** Color y símbolo de lo que viaja por cada tipo de flecha. */
export const ESTILO_FLUJO: Record<TipoFlujo, { color: string; simbolo: string; nombre: string }> = {
  dinero: { color: '#4ade80', simbolo: '€', nombre: 'Dinero' },
  riesgo: { color: '#ff7a59', simbolo: '!', nombre: 'Riesgo' },
  documento: { color: '#60a5fa', simbolo: '≡', nombre: 'Orden o documento' },
  garantia: { color: '#ffd23f', simbolo: '✓', nombre: 'Garantía o aval' },
  supervision: { color: '#a78bfa', simbolo: '◉', nombre: 'Supervisión' },
  prohibido: { color: '#ff5a5a', simbolo: '✕', nombre: 'No permitido' },
};

const SEGUNDOS_POR_PASO = 5;
const reducido = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Infografía animada paso a paso. Los actores se colocan en % del lienzo; las flechas se calculan
 * en píxeles (de borde a borde de cada actor) y se recalculan al cambiar el tamaño. En cada paso se
 * animan sus flechas (un símbolo viaja por ellas); las de pasos anteriores quedan tenues.
 */
export function montarInfografia(contenedor: HTMLElement, info: Infografia): () => void {
  let paso = 0;
  let reproduciendo = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;
  const tipos = [...new Set(info.flujos.map((f) => f.tipo))];
  contenedor.innerHTML = `<figure class="ig" data-ig="${info.id}"><figcaption class="ig-titulo">🎬 ${info.titulo}</figcaption>
<div class="ig-lienzo"><svg class="ig-svg" aria-hidden="true"></svg>${(info.grupos ?? []).map((g, i) => `<div class="ig-grupo" data-g="${i}" style="left:${g.x}%;top:${g.y}%;width:${g.ancho}%;height:${g.alto}%"><span>${g.etiqueta}</span></div>`).join('')}${info.actores.map((a) => `<div class="ig-actor" data-actor="${a.id}" style="left:${a.x}%;top:${a.y}%"><span class="ig-icono">${a.icono}</span><span class="ig-nombre">${a.etiqueta}</span></div>`).join('')}<div class="ig-etiquetas"></div></div>
<p class="ig-texto" aria-live="polite"></p>
<div class="ig-ctrl"><button type="button" class="fc-btn" data-ig="anterior">← Anterior</button><span class="ig-puntos">${info.pasos.map((_, i) => `<button type="button" class="ig-punto" data-ig-paso="${i}" aria-label="Paso ${i + 1}"></button>`).join('')}</span><button type="button" class="fc-btn" data-ig="siguiente">Siguiente →</button><button type="button" class="fc-btn ig-play" data-ig="play" aria-pressed="false">▶ Reproducir</button></div>
${tipos.length ? `<ul class="ig-ley">${tipos.map((t) => `<li><i style="--c:${ESTILO_FLUJO[t].color}">${ESTILO_FLUJO[t].simbolo}</i>${ESTILO_FLUJO[t].nombre}</li>`).join('')}</ul>` : ''}</figure>`;
  const lienzo = contenedor.querySelector<HTMLElement>('.ig-lienzo')!;
  const svg = contenedor.querySelector<SVGSVGElement>('.ig-svg')!;
  const capaEtq = contenedor.querySelector<HTMLElement>('.ig-etiquetas')!;
  const texto = contenedor.querySelector<HTMLElement>('.ig-texto')!;
  const play = contenedor.querySelector<HTMLButtonElement>('[data-ig="play"]')!;

  /** Flechas que ya se han visto (pasos anteriores) y las del paso actual. */
  const estadoFlujos = () => {
    const activos = new Set(info.pasos[paso]?.flujos ?? []);
    const pasados = new Set<number>();
    for (let k = 0; k < paso; k++) for (const n of info.pasos[k]!.flujos) if (!activos.has(n)) pasados.add(n);
    return { activos, pasados };
  };

  const dibujar = () => {
    const W = lienzo.clientWidth;
    const H = lienzo.clientHeight;
    if (!W || !H) return;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const { activos, pasados } = estadoFlujos();
    // Ningún actor se sale del lienzo (en móvil los nombres ocupan más): se recoloca en píxeles.
    for (const el of lienzo.querySelectorAll<HTMLElement>('.ig-actor')) {
      const a = info.actores.find((x) => x.id === el.dataset.actor)!;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      el.style.left = `${Math.min(Math.max((a.x / 100) * W, w / 2 + 4), W - w / 2 - 4)}px`;
      el.style.top = `${Math.min(Math.max((a.y / 100) * H, h / 2 + 4), H - h / 2 - 4)}px`;
    }
    const caja = new Map<string, { cx: number; cy: number; mx: number; my: number }>();
    const base = lienzo.getBoundingClientRect();
    for (const el of lienzo.querySelectorAll<HTMLElement>('.ig-actor')) {
      const r = el.getBoundingClientRect();
      caja.set(el.dataset.actor!, { cx: r.left - base.left + r.width / 2, cy: r.top - base.top + r.height / 2, mx: r.width / 2 + 6, my: r.height / 2 + 6 });
    }
    // Punto del borde de la caja del actor en dirección a (dx, dy).
    const borde = (c: { cx: number; cy: number; mx: number; my: number }, dx: number, dy: number) => {
      const t = Math.min(Math.abs(dx) > 1e-6 ? c.mx / Math.abs(dx) : Infinity, Math.abs(dy) > 1e-6 ? c.my / Math.abs(dy) : Infinity);
      return { x: c.cx + dx * t, y: c.cy + dy * t };
    };
    const animar = !reducido();
    let defs = '<defs>';
    for (const t of tipos) defs += `<marker id="ig-${info.id}-${t}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="${ESTILO_FLUJO[t].color}"/></marker>`;
    defs += '</defs>';
    let cuerpo = '';
    let etiquetas = '';
    info.flujos.forEach((f, i) => {
      const clase = activos.has(i) ? 'activo' : pasados.has(i) ? 'pasado' : '';
      if (!clase) return;
      const a = caja.get(f.desde);
      const b = caja.get(f.hacia);
      if (!a || !b) return;
      const dx = b.cx - a.cx;
      const dy = b.cy - a.cy;
      const largo = Math.hypot(dx, dy) || 1;
      const ux = dx / largo;
      const uy = dy / largo;
      // Flechas entre el mismo par de actores: se curvan hacia lados distintos.
      const mismos = info.flujos.map((g, k) => ({ g, k })).filter(({ g }) => (g.desde === f.desde && g.hacia === f.hacia) || (g.desde === f.hacia && g.hacia === f.desde));
      const orden = mismos.findIndex(({ k }) => k === i);
      const curva = mismos.length > 1 ? (orden - (mismos.length - 1) / 2) * 76 * (f.desde < f.hacia ? 1 : -1) : 0;
      const p0 = borde(a, ux, uy);
      const p1 = borde(b, -ux, -uy);
      const mx = (p0.x + p1.x) / 2 - uy * curva;
      const my = (p0.y + p1.y) / 2 + ux * curva;
      const d = `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
      const { color, simbolo } = ESTILO_FLUJO[f.tipo];
      const id = `ig-${info.id}-f${i}`;
      cuerpo += `<path id="${id}" class="ig-flecha ${clase} ${f.tipo}" d="${d}" stroke="${color}" marker-end="url(#ig-${info.id}-${f.tipo})"/>`;
      if (clase === 'activo' && animar && f.tipo !== 'prohibido') {
        cuerpo += `<g class="ig-token"><circle r="9" fill="${color}"/><text text-anchor="middle" dy="4" font-size="11" font-weight="800" fill="#000">${simbolo}</text><animateMotion dur="2.2s" repeatCount="indefinite" rotate="0"><mpath href="#${id}"/></animateMotion></g>`;
      }
      if (f.tipo === 'prohibido') {
        const cx = (p0.x + 2 * mx + p1.x) / 4;
        const cy = (p0.y + 2 * my + p1.y) / 4;
        cuerpo += `<g class="ig-prohibido ${clase}"><circle cx="${cx}" cy="${cy}" r="11" fill="#2a0c0c" stroke="${color}" stroke-width="2"/><text x="${cx}" y="${cy + 5}" text-anchor="middle" font-size="14" font-weight="800" fill="${color}">✕</text></g>`;
      }
      // Etiqueta en el punto medio de la curva (t = 0,5), desplazada hacia fuera.
      const lx = (p0.x + 2 * mx + p1.x) / 4;
      const ly = (p0.y + 2 * my + p1.y) / 4;
      etiquetas += `<span class="ig-etq ${clase}" style="left:${(lx / W) * 100}%;top:${(ly / H) * 100}%;--c:${color}">${f.etiqueta}</span>`;
    });
    svg.innerHTML = defs + cuerpo;
    capaEtq.innerHTML = etiquetas;
  };

  const pintar = () => {
    const p = info.pasos[paso]!;
    const vistos = new Set<string>();
    for (let k = 0; k <= paso; k++) for (const id of info.pasos[k]!.actores) vistos.add(id);
    for (const el of lienzo.querySelectorAll<HTMLElement>('.ig-actor')) {
      const id = el.dataset.actor!;
      el.classList.toggle('activo', p.actores.includes(id));
      el.classList.toggle('visto', vistos.has(id) && !p.actores.includes(id));
    }
    const gruposVistos = new Set<number>();
    for (let k = 0; k <= paso; k++) for (const g of info.pasos[k]!.grupos ?? []) gruposVistos.add(g);
    for (const el of lienzo.querySelectorAll<HTMLElement>('.ig-grupo')) {
      const g = Number(el.dataset.g);
      el.classList.toggle('visible', gruposVistos.has(g));
      el.classList.toggle('activo', (p.grupos ?? []).includes(g));
    }
    texto.innerHTML = `<b>Paso ${paso + 1} de ${info.pasos.length}.</b> ${p.texto}`;
    contenedor.querySelectorAll<HTMLButtonElement>('.ig-punto').forEach((b, i) => b.classList.toggle('on', i === paso));
    contenedor.querySelector<HTMLButtonElement>('[data-ig="anterior"]')!.disabled = paso === 0;
    contenedor.querySelector<HTMLButtonElement>('[data-ig="siguiente"]')!.disabled = paso === info.pasos.length - 1;
    dibujar();
  };

  const ir = (n: number) => {
    paso = Math.max(0, Math.min(info.pasos.length - 1, n));
    pintar();
  };
  const parar = () => {
    reproduciendo = false;
    if (temporizador) clearTimeout(temporizador);
    play.textContent = '▶ Reproducir';
    play.setAttribute('aria-pressed', 'false');
  };
  const avanzarSolo = () => {
    if (!reproduciendo || !contenedor.isConnected) return parar();
    if (paso >= info.pasos.length - 1) return parar();
    ir(paso + 1);
    temporizador = setTimeout(avanzarSolo, SEGUNDOS_POR_PASO * 1000);
  };
  contenedor.querySelector<HTMLButtonElement>('[data-ig="anterior"]')!.onclick = () => {
    parar();
    ir(paso - 1);
  };
  contenedor.querySelector<HTMLButtonElement>('[data-ig="siguiente"]')!.onclick = () => {
    parar();
    ir(paso + 1);
  };
  contenedor.querySelectorAll<HTMLButtonElement>('[data-ig-paso]').forEach((b) => {
    b.onclick = () => {
      parar();
      ir(Number(b.dataset.igPaso));
    };
  });
  play.onclick = () => {
    if (reproduciendo) return parar();
    reproduciendo = true;
    play.textContent = '⏸ Pausa';
    play.setAttribute('aria-pressed', 'true');
    if (paso >= info.pasos.length - 1) ir(0);
    temporizador = setTimeout(avanzarSolo, SEGUNDOS_POR_PASO * 1000);
  };

  const observador = typeof ResizeObserver === 'function' ? new ResizeObserver(() => dibujar()) : null;
  observador?.observe(lienzo);
  pintar();
  // Las fuentes y el diseño pueden asentarse justo después: se redibuja una vez más.
  requestAnimationFrame(() => dibujar());
  return () => {
    parar();
    observador?.disconnect();
  };
}

/** Infografías de un concepto (puede haber una compartida entre varios conceptos). */
export const infografiasDe = (infografias: Infografia[] | undefined, conceptoId: string): Infografia[] =>
  (infografias ?? []).filter((i) => i.conceptoIds.includes(conceptoId));
