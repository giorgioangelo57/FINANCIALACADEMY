/*
 * Respuesta visual al contestar: un puñado de monedas que saltan al acertar, una sacudida al
 * fallar y un sello "¡Lo sabías!" cuando se acierta con seguridad. Breve y sin sonido; con
 * movimiento reducido solo queda el sello (estático).
 */

const reducido = (): boolean => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Monedas que saltan desde el centro de `origen` y caen (≈ 0,8 s). */
export function saltarMonedas(origen: Element | null | undefined, cantidad = 9): void {
  if (!origen || reducido() || typeof document === 'undefined') return;
  const r = origen.getBoundingClientRect();
  if (!r.width) return;
  const capa = document.createElement('div');
  capa.className = 'monedas-salto';
  capa.setAttribute('aria-hidden', 'true');
  capa.style.left = `${r.left + r.width / 2}px`;
  capa.style.top = `${r.top + r.height / 2}px`;
  for (let i = 0; i < cantidad; i++) {
    const m = document.createElement('i');
    const angulo = -Math.PI / 2 + (i / (cantidad - 1) - 0.5) * 2.2;
    const fuerza = 60 + (i % 3) * 22;
    m.style.setProperty('--dx', `${Math.cos(angulo) * fuerza}px`);
    m.style.setProperty('--dy', `${Math.sin(angulo) * fuerza}px`);
    m.style.setProperty('--giro', `${(i % 2 ? 1 : -1) * (240 + i * 40)}deg`);
    m.style.animationDelay = `${i * 18}ms`;
    capa.append(m);
  }
  document.body.append(capa);
  setTimeout(() => capa.remove(), 1000);
}

/** Sacudida corta de un botón (respuesta incorrecta). */
export function sacudir(el: Element | null | undefined): void {
  if (!el || reducido()) return;
  el.classList.remove('shake');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('shake');
}

/** Sello "¡Lo sabías!" sobre el panel (acierto con seguridad). */
export function sellar(panel: Element | null | undefined, texto = '¡Lo sabías!'): void {
  if (!panel) return;
  panel.querySelector('.sello')?.remove();
  const s = document.createElement('span');
  s.className = 'sello';
  s.setAttribute('aria-hidden', 'true');
  s.textContent = texto;
  panel.append(s);
}
