import { hrefConcepto } from '../app/router.ts';
import type { EdificioCiudad, Tema } from '../content/schema.ts';
import { dominioConcepto } from '../domain/mastery.ts';
import type { Progreso } from '../domain/progress.ts';
import { iconoSvg } from '../icons/icon.ts';
import { colorDominio, porcentaje } from '../ui/format.ts';

// Portada en pixel art (SVG). En la fase 2 la sustituirá la ciudad 3D con Three.js.

const ANCHO = 330;
const SUELO = 110;
const ANCHO_EDIFICIO = 22;
const SEPARACION = 27;

/** Pseudoaleatorio determinista: la ciudad es siempre la misma. */
const pseudoAleatorio = (a: number, b: number) => {
  const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function cielo(): string {
  let o = '';
  for (let i = 0; i < 40; i++) {
    o += `<rect class="tw" style="animation-delay:${(i * 0.53) % 3}s" x="${Math.floor(pseudoAleatorio(i, 1) * ANCHO)}" y="${Math.floor(pseudoAleatorio(i, 2) * 40)}" width="1" height="1" fill="#fff"/>`;
  }
  // Luna creciente.
  for (let y = -7; y <= 7; y++) {
    for (let x = -7; x <= 7; x++) {
      if (x * x + y * y <= 49 && !((x - 3) * (x - 3) + (y + 2) * (y + 2) <= 40)) {
        o += `<rect x="${300 + x}" y="${16 + y}" width="1" height="1" fill="#fef3c7"/>`;
      }
    }
  }
  return o;
}

function tejado(tipo: EdificioCiudad['tejado'], x: number, top: number, w: number): string {
  switch (tipo) {
    case 'fronton':
      return `<rect x="${x + 2}" y="${top - 2}" width="${w - 4}" height="2" fill="#1a2030"/><rect x="${x + 5}" y="${top - 4}" width="${w - 10}" height="2" fill="#1a2030"/><rect x="${x + 8}" y="${top - 6}" width="${w - 16}" height="2" fill="#1a2030"/>`;
    case 'bandera':
      return `<rect x="${x + 11}" y="${top - 12}" width="1" height="12" fill="#666"/><rect class="fl" x="${x + 12}" y="${top - 12}" width="5" height="3" fill="#ff5a5a"/>`;
    case 'granero':
      return `<rect x="${x + 1}" y="${top - 2}" width="${w - 2}" height="2" fill="#3a2a10"/><rect x="${x + 4}" y="${top - 4}" width="${w - 8}" height="2" fill="#3a2a10"/><rect x="${x + 7}" y="${top - 6}" width="${w - 14}" height="2" fill="#3a2a10"/>`;
    case 'cupula':
      return `<rect x="${x + 6}" y="${top - 3}" width="${w - 12}" height="3" fill="#1a2030"/><rect x="${x + 8}" y="${top - 5}" width="${w - 16}" height="2" fill="#1a2030"/>`;
    case 'antena':
      return `<rect x="${x + 10}" y="${top - 10}" width="1" height="10" fill="#666"/><rect class="tw" x="${x + 9}" y="${top - 12}" width="3" height="2" fill="#ff5a5a"/>`;
    default:
      return '';
  }
}

/** La ruina se dibuja encima de la fachada: "muerde" las esquinas del edificio. */
const ruina = (x: number, top: number) =>
  `<rect x="${x + 14}" y="${top - 1}" width="9" height="5" fill="#04060d"/><rect x="${x + 18}" y="${top + 3}" width="5" height="3" fill="#04060d"/><rect x="${x - 1}" y="${top - 1}" width="4" height="3" fill="#04060d"/>`;

/** Altura (px) que ocupa cada remate por encima de la fachada. */
const ALTO_TEJADO: Record<EdificioCiudad['tejado'], number> = {
  fronton: 6, bandera: 12, granero: 6, cupula: 5, antena: 12, ruina: 1, plano: 0,
};

export interface OpcionesCiudadPixel {
  /**
   * Los iconos van en un letrero por encima del tejado en lugar de sobre la fachada. Es la vista de
   * la app; `false` reproduce el prototipo original (lo usan los tests de paridad).
   */
  iconosSobreTejado?: boolean;
}

function edificio(tema: Tema, progreso: Progreso, e: EdificioCiudad, i: number, sobreTejado = false): string {
  const c = tema.conceptos.find((z) => z.id === e.conceptoId);
  if (!c) return '';
  const d = dominioConcepto(progreso, c.id);
  const color = d > 0 ? colorDominio(d) : '#3d4456';
  const w = ANCHO_EDIFICIO;
  const x = 6 + i * SEPARACION;
  const top = SUELO - e.altura;

  let b = `<a href="${hrefConcepto(c.id)}" aria-label="${c.nombre}"><title>${c.nombre} · dominio ${porcentaje(d)}</title>`;
  b += `<rect x="${x - 1}" y="${SUELO}" width="${w + 2}" height="3" fill="${d > 0 ? color : '#222'}" opacity=".5"/>`;
  b += tejado(e.tejado, x, top, w);
  b += `<rect x="${x}" y="${top}" width="${w}" height="${e.altura}" fill="#0f1320" stroke="${d > 0 ? color : '#2a3142'}" stroke-width="1"/>`;
  if (e.tejado === 'ruina') b += ruina(x, top);
  const icono = iconoSvg(c.iconos, c.color).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  if (sobreTejado) {
    // Letrero: poste de 1 px desde el remate hasta el icono, que flota sobre el edificio.
    const y = top - ALTO_TEJADO[e.tejado] - 20;
    b += `<rect x="${x + 10}" y="${y + 18}" width="1" height="${top - ALTO_TEJADO[e.tejado] - y - 18}" fill="#666"/>`;
    // Sin recuadro ni fondo: el icono se funde con el cielo (solo su anillo y su glifo).
    const iconoCielo = icono.replace('fill="#121212"', 'fill="none"');
    b += `<svg x="${x + 3}" y="${y + 1}" width="16" height="16" viewBox="0 0 120 120">${iconoCielo}</svg>`;
  } else {
    b += `<rect x="${x + 2}" y="${top + 2}" width="18" height="18" fill="#000"/><svg x="${x + 3}" y="${top + 3}" width="16" height="16" viewBox="0 0 120 120">${icono}</svg>`;
  }

  // Ventanas: cuanto más dominio, más luces encendidas.
  const encendidas = d > 0 ? 0.25 + d * 0.7 : 0.18;
  // Sin el icono en la fachada, las ventanas empiezan arriba.
  for (let wy = top + (sobreTejado ? 4 : 23), fila = 0; wy <= 100; wy += 6, fila++) {
    for (let col = 0; col < 3; col++) {
      const on = pseudoAleatorio(i * 31 + fila, col) < encendidas;
      b += `<rect class="${on ? 'wf' : ''}" style="animation-delay:${(pseudoAleatorio(i, fila * 7 + col) * 5).toFixed(2)}s" x="${x + 3 + col * 6}" y="${wy}" width="4" height="3" fill="${on ? color : '#1b2130'}"/>`;
    }
  }
  b += `<rect x="${x + 8}" y="104" width="6" height="6" fill="${d > 0 ? color : '#2a3142'}"/></a>`;
  return b;
}

export function ciudadPixel(tema: Tema, progreso: Progreso, opciones: OpcionesCiudadPixel = {}): string {
  let o = cielo();
  tema.ciudad.edificios.forEach((e, i) => {
    o += edificio(tema, progreso, e, i, opciones.iconosSobreTejado);
  });
  o += `<rect x="0" y="${SUELO}" width="${ANCHO}" height="10" fill="#000"/>`;
  return `<div class="skyline px"><svg viewBox="0 0 ${ANCHO} 120" shape-rendering="crispEdges">${o}</svg></div>`;
}
