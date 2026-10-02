import { BufferGeometry, CylinderGeometry, Float32BufferAttribute, ShapeGeometry, TorusGeometry } from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';
import { GLYPHS, type GlyphName } from '../../icons/glyphs.ts';
import type { Taller } from './taller.ts';

/*
 * Emblema de fachada: el icono del concepto (su PRIMER glifo de DATA, el mismo que dibuja el icono
 * 2D dentro de un círculo) en relieve sobre un medallón oscuro con canto de bronce. No añade
 * significado: traslada a la maqueta la "Gramática visual" que el alumno ya ve en las fichas, de
 * modo que cada edificio se reconoce por su icono aunque comparta tipología con otros.
 */

/** Dónde va el medallón, en coordenadas locales del edificio (fachada principal hacia +z). */
export interface Escudo {
  x: number;
  /** Placa: centro del medallón. Cresta: cota de apoyo (el medallón se alza sobre un pedestal). */
  y: number;
  /** Plano de la fachada o del apoyo. */
  z: number;
  /** Diámetro del medallón. */
  tam: number;
  modo: 'placa' | 'cresta';
}

const LADO_SVG = 64;
const GROSOR = 0.12;
/** Fracción del medallón que ocupa el glifo (como en el icono 2D: 64 de 120 → algo más de la mitad). */
const ESCALA_GLIFO = 0.68;

const cacheTrazos = new Map<GlyphName, BufferGeometry | null>();

/**
 * Geometría plana del glifo: plano z = 0, centrada, lado 1, caras hacia +z.
 * Se generan los trazos (y los rellenos con fill) del SVG original con SVGLoader.
 */
export function trazosDeGlifo(g: GlyphName): BufferGeometry | null {
  if (cacheTrazos.has(g)) return cacheTrazos.get(g)!;
  let resultado: BufferGeometry | null = null;
  try {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g fill="none" stroke="#000" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${GLYPHS[g].replaceAll('currentColor', '#000')}</g></svg>`;
    const datos = new SVGLoader().parse(svg);
    const xy: number[] = [];
    const recoger = (geo: BufferGeometry) => {
      const plana = geo.index ? geo.toNonIndexed() : geo;
      const a = plana.getAttribute('position');
      for (let i = 0; i < a.count; i++) xy.push(a.getX(i), a.getY(i));
      plana.dispose();
      if (plana !== geo) geo.dispose();
    };
    for (const ruta of datos.paths) {
      const estilo = (ruta.userData?.style ?? {}) as { fill?: string; stroke?: string; strokeWidth?: number };
      if (estilo.fill && estilo.fill !== 'none') for (const forma of ruta.toShapes()) recoger(new ShapeGeometry(forma, 6));
      if (estilo.stroke && estilo.stroke !== 'none') {
        const trazo = SVGLoader.getStrokeStyle(estilo.strokeWidth ?? 5, '#000', 'round', 'round', 4);
        for (const sub of ruta.subPaths) {
          const geo = SVGLoader.pointsToStroke(sub.getPoints(), trazo, 6, 0.01);
          if (geo) recoger(geo);
        }
      }
    }
    if (xy.length >= 6) {
      const v = new Float32Array((xy.length / 2) * 3);
      for (let i = 0, j = 0; i < xy.length; i += 2, j += 3) {
        // SVG: y hacia abajo y origen en la esquina → centrado, invertido y normalizado a lado 1.
        v[j] = (xy[i]! - LADO_SVG / 2) / LADO_SVG;
        v[j + 1] = -(xy[i + 1]! - LADO_SVG / 2) / LADO_SVG;
      }
      // Al invertir y, o según el trazo, los triángulos pueden quedar del revés: todos hacia +z.
      for (let t = 0; t + 8 < v.length; t += 9) {
        const ax = v[t + 3]! - v[t]!;
        const ay = v[t + 4]! - v[t + 1]!;
        const bx = v[t + 6]! - v[t]!;
        const by = v[t + 7]! - v[t + 1]!;
        if (ax * by - ay * bx < 0) {
          for (let k = 0; k < 3; k++) {
            const aux = v[t + 3 + k]!;
            v[t + 3 + k] = v[t + 6 + k]!;
            v[t + 6 + k] = aux;
          }
        }
      }
      const n = new Float32Array(v.length);
      for (let j = 2; j < n.length; j += 3) n[j] = 1;
      resultado = new BufferGeometry();
      resultado.setAttribute('position', new Float32BufferAttribute(v, 3));
      resultado.setAttribute('normal', new Float32BufferAttribute(n, 3));
      resultado.setAttribute('uv', new Float32BufferAttribute(new Float32Array((v.length / 3) * 2), 2));
    }
  } catch {
    resultado = null;
  }
  cacheTrazos.set(g, resultado);
  return resultado;
}

/** Glifo del emblema: el principal del concepto (el primero que tenga trazos). */
export function glifoDelEmblema(glifos: readonly GlyphName[]): GlyphName | null {
  for (const g of glifos) if (trazosDeGlifo(g)) return g;
  return null;
}

/**
 * Añade el medallón al taller: disco oscuro ('medallon'), canto de bronce y el glifo en el color
 * del concepto ('acento'), mirando a +z. En modo cresta, además un pedestal de piedra.
 */
export function emblema(t: Taller, glifos: readonly GlyphName[], e: Escudo): boolean {
  const g = glifoDelEmblema(glifos);
  if (!g) return false;
  const tam = e.tam * 1.25;
  const r = tam / 2;
  const cy = e.modo === 'cresta' ? e.y + 0.28 + r : e.y;
  const zDisco = e.modo === 'cresta' ? e.z : e.z + GROSOR / 2 + 0.02;
  if (e.modo === 'cresta') {
    t.caja('moldura', tam * 0.55, 0.16, GROSOR * 2.2, e.x, e.y, e.z);
    t.caja('moldura', tam * 0.3, 0.14, GROSOR * 1.6, e.x, e.y + 0.16, e.z);
  }
  t.anadir('medallon', new CylinderGeometry(r, r, GROSOR, 28).rotateX(Math.PI / 2).translate(e.x, cy, zDisco));
  t.anadir('bronce', new TorusGeometry(r, Math.max(0.035, r * 0.07), 6, 28).translate(e.x, cy, zDisco + GROSOR / 2));
  const lado = tam * ESCALA_GLIFO;
  const glifo = trazosDeGlifo(g)!.clone().scale(lado, lado, 1).translate(e.x, cy, zDisco + GROSOR / 2 + 0.012);
  t.anadir('acento', glifo);
  if (e.modo === 'cresta') {
    // Cara trasera: la cresta se ve también desde detrás (el glifo se lee bien por los dos lados).
    t.anadir('acento', trazosDeGlifo(g)!.clone().scale(lado, lado, 1).rotateY(Math.PI).translate(e.x, cy, zDisco - GROSOR / 2 - 0.012));
  }
  return true;
}

const cacheSolidos = new Map<GlyphName, BufferGeometry | null>();

/**
 * El glifo como pieza maciza (lado 1, grosor `grosor`, centrada): la cara de delante, la de detrás
 * y las paredes de su contorno. El contorno son las aristas que solo usa un triángulo; los trazos
 * que se solapan dejan alguna pared interior, que queda oculta dentro del sólido.
 */
export function glifoSolido(g: GlyphName, grosor = 0.14): BufferGeometry | null {
  if (cacheSolidos.has(g)) return cacheSolidos.get(g)!;
  const plano = trazosDeGlifo(g);
  if (!plano) {
    cacheSolidos.set(g, null);
    return null;
  }
  const p = plano.getAttribute('position');
  const h = grosor / 2;
  const pos: number[] = [];
  const nor: number[] = [];
  const clave = (i: number) => `${Math.round(p.getX(i) * 1e4)},${Math.round(p.getY(i) * 1e4)}`;
  const aristas = new Map<string, { a: number; b: number; n: number }>();
  for (let t = 0; t < p.count; t += 3) {
    // Delante (+z) y detrás (−z, orden invertido).
    for (const k of [0, 1, 2]) pos.push(p.getX(t + k), p.getY(t + k), h), nor.push(0, 0, 1);
    for (const k of [0, 2, 1]) pos.push(p.getX(t + k), p.getY(t + k), -h), nor.push(0, 0, -1);
    for (const [a, b] of [[t, t + 1], [t + 1, t + 2], [t + 2, t]] as const) {
      const ka = clave(a);
      const kb = clave(b);
      if (ka === kb) continue;
      const id = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = aristas.get(id);
      if (e) e.n++;
      else aristas.set(id, { a, b, n: 1 });
    }
  }
  for (const { a, b, n } of aristas.values()) {
    if (n !== 1) continue;
    const ax = p.getX(a), ay = p.getY(a), bx = p.getX(b), by = p.getY(b);
    // Normal hacia fuera: a la derecha del sentido a→b (los triángulos van en sentido antihorario).
    const nx = by - ay, ny = -(bx - ax);
    const l = Math.hypot(nx, ny) || 1;
    const quad = [[ax, ay, h], [bx, by, h], [bx, by, -h], [ax, ay, h], [bx, by, -h], [ax, ay, -h]];
    // Orden de vértices para que la cara mire hacia fuera.
    for (const v of [quad[0]!, quad[2]!, quad[1]!, quad[3]!, quad[5]!, quad[4]!]) pos.push(v[0]!, v[1]!, v[2]!), nor.push(nx / l, ny / l, 0);
  }
  const geo = new BufferGeometry();
  geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new Float32BufferAttribute(new Float32Array((pos.length / 3) * 2), 2));
  cacheSolidos.set(g, geo);
  return geo;
}
