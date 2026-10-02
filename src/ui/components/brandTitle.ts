/** Nombre de la aplicación: asignatura y metáfora del tema. DATA (`tema.meta.ciudad`) no cambia. */
export const MARCA = {
  asignatura: 'Gestión financiera',
  ciudad: 'La ciudad del dinero',
} as const;

export const MARCA_COMPLETA = `${MARCA.asignatura} · ${MARCA.ciudad}`;

export type TamanoMarca = 'entrada' | 'portada' | 'hero';

/**
 * Título con letras de moneda: cada letra cae girando como una moneda lanzada y se posa en relieve
 * dorado; después, un brillo la recorre de vez en cuando y unas monedas giran junto al título.
 * Solo CSS (`brand.css`): funciona sin WebGL y se queda quieto con movimiento reducido.
 */
export function tituloMarca(tamano: TamanoMarca, etiqueta: 'h1' | 'p' = 'p'): string {
  let i = 0;
  const palabras = MARCA.ciudad
    .split(' ')
    .map((p) => `<span class="marca-pal">${[...p].map((l) => `<span class="marca-l" style="--i:${i++}">${l}</span>`).join('')}</span>`)
    .join(' ');
  const monedas = [0, 1, 2].map((k) => `<i class="marca-moneda m${k}"><b>€</b></i>`).join('');
  return `<${etiqueta} class="marca marca-${tamano}" aria-label="${MARCA.asignatura}: ${MARCA.ciudad}"><span class="marca-ante" aria-hidden="true">${MARCA.asignatura}</span><span class="marca-titulo" aria-hidden="true">${palabras}<span class="marca-monedas">${monedas}</span></span></${etiqueta}>`;
}
