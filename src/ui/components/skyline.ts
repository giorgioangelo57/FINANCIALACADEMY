import type { Concepto } from '../../content/schema.ts';
import { dominioConcepto, nivelDominio } from '../../domain/mastery.ts';
import type { Progreso } from '../../domain/progress.ts';
import { faseObra, type FaseObra } from '../../world/cityModel.ts';
import { ALTURA_TIPOLOGIA, type Tipologia, tipologiaDe } from '../../world/typology.ts';

/*
 * Silueta de la manzana de una sección: un edificio por concepto, con la misma tipología que en
 * la ciudad 3D (de sus glifos de DATA) y en el mismo estado de obra (de su dominio):
 *  - construido: en el color del concepto, con ventanas encendidas;
 *  - en obra: la mitad inferior construida y andamio por encima;
 *  - en proyecto: solo el contorno, como una maqueta sin construir.
 * Es decoración informativa: repite lo que ya dice el mapa, no añade datos.
 */

const ALTO = 96;
const SUELO = ALTO - 8;
const ESCALA = 6.2;

const ANCHO: Record<Tipologia, number> = {
  institucional: 58, banco: 40, supervisor: 30, aseguradora: 40, lonja: 64, tecnologica: 34, oficina: 36,
};

function ventanas(x: number, y: number, w: number, h: number, fase: FaseObra, semilla: number): string {
  if (fase === 'solar') return '';
  const filas = Math.max(1, Math.floor((h - 10) / 11));
  const cols = Math.max(1, Math.floor((w - 8) / 9));
  let s = '';
  for (let f = 0; f < filas; f++) {
    const fy = y + 6 + f * 11;
    if (fase === 'obra' && fy < SUELO - h / 2) continue;
    for (let c = 0; c < cols; c++) {
      const encendida = ((semilla + f * 7 + c * 3) % 5) !== 0;
      s += `<rect x="${(x + 5 + c * 9).toFixed(1)}" y="${fy.toFixed(1)}" width="4" height="5" class="${encendida ? 'sk-luz' : 'sk-apagada'}"/>`;
    }
  }
  return s;
}

/** Remate según la tipología (frontón, cúpula, antena, bóveda…). */
function remate(t: Tipologia, x: number, y: number, w: number): string {
  switch (t) {
    case 'institucional':
      return `<path d="M${x - 3} ${y}L${x + w / 2} ${y - 13}L${x + w + 3} ${y}Z"/>`;
    case 'aseguradora':
      return `<path d="M${x + 6} ${y}A${w / 2 - 6} ${w / 2 - 6} 0 0 1 ${x + w - 6} ${y}Z"/>`;
    case 'supervisor':
      return `<rect x="${x + w / 2 - 1}" y="${y - 16}" width="2" height="16"/><circle cx="${x + w / 2}" cy="${y - 17}" r="2.4" class="sk-baliza"/>`;
    case 'banco':
      return `<rect x="${x + w * 0.7}" y="${y - 14}" width="1.6" height="14"/><path d="M${x + w * 0.7 + 1.6} ${y - 14}h9v6h-9Z" class="sk-bandera"/>`;
    case 'lonja':
      return `<path d="M${x} ${y}Q${x + w / 2} ${y - 18} ${x + w} ${y}Z"/>`;
    case 'tecnologica':
      return `<rect x="${x + 4}" y="${y - 12}" width="${w - 8}" height="12"/>`;
    case 'oficina':
      return `<rect x="${x + 5}" y="${y - 9}" width="${w - 12}" height="9"/>`;
  }
}

export function skylineSeccion(conceptos: readonly Concepto[], progreso: Progreso): string {
  if (!conceptos.length) return '';
  const hueco = 10;
  const anchoTotal = conceptos.reduce((s, c) => s + ANCHO[tipologiaDe(c.iconos)] + hueco, hueco);
  let x = hueco;
  const edificios = conceptos.map((c, i) => {
    const t = tipologiaDe(c.iconos);
    const w = ANCHO[t];
    const h = Math.min(SUELO - 22, ALTURA_TIPOLOGIA[t] * ESCALA);
    const y = SUELO - h;
    const fase = faseObra(nivelDominio(dominioConcepto(progreso, c.id)));
    const cuerpo = `<rect x="${x}" y="${y}" width="${w}" height="${h}"/>${remate(t, x, y, w)}`;
    const andamio = fase === 'obra'
      ? `<path class="sk-andamio" d="M${x - 2} ${y}V${SUELO}M${x + w + 2} ${y}V${SUELO}${Array.from({ length: Math.floor(h / 2 / 8) }, (_, k) => `M${x - 2} ${y + k * 8}H${x + w + 2}`).join('')}"/>`
      : '';
    const g = `<g class="sk-ed sk-${fase}" style="--c:${c.color}"><title>${c.nombre}</title>${cuerpo}${ventanas(x, y, w, h, fase, i * 11 + c.id.length)}${andamio}</g>`;
    x += w + hueco;
    return g;
  });
  return `<svg class="manzana-sil" viewBox="0 0 ${anchoTotal} ${ALTO}" preserveAspectRatio="xMinYMax meet" role="img" aria-label="Silueta de la manzana: ${conceptos.length} edificios, uno por concepto, construidos según lo que dominas"><line x1="0" y1="${SUELO}" x2="${anchoTotal}" y2="${SUELO}" class="sk-suelo"/>${edificios.join('')}</svg>`;
}
