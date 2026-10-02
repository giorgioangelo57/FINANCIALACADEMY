import { Color } from 'three';
import type { Ambiente } from '../../world/ambiente.ts';

/** Los dos modos y el atardecer, que es el paso intermedio de la transición. */
export type Luz = Ambiente | 'atardecer';

/*
 * Ambientes de la maqueta: día, atardecer y noche. Son preajustes de luz (sol, cielo, relleno,
 * niebla, exposición) y de "vida nocturna" (halos de farolas, ventanas que destacan). No cambian
 * nada del contenido: solo cómo se ilumina la ciudad.
 */

export interface Preajuste {
  /** Color de la niebla (debe casar con el fondo CSS del visor). */
  niebla: string;
  hemiCielo: string;
  hemiSuelo: string;
  hemi: number;
  sol: string;
  sol_i: number;
  /** Elevación del sol (0 = horizonte, 1 = como de día). */
  solAltura: number;
  relleno: string;
  relleno_i: number;
  entorno: number;
  exposicion: number;
  /** 0–1: halos de farolas y brillo de ventanas. */
  noche: number;
}

export const AMBIENTES: Record<Luz, Preajuste> = {
  dia: {
    niebla: '#2a2521', hemiCielo: '#fff1dc', hemiSuelo: '#4a3c30', hemi: 0.4,
    sol: '#ffd9a8', sol_i: 3.3, solAltura: 1, relleno: '#c9dcff', relleno_i: 0.5, entorno: 0.3, exposicion: 0.92, noche: 0,
  },
  atardecer: {
    niebla: '#2b1d22', hemiCielo: '#ffc89a', hemiSuelo: '#3b2630', hemi: 0.34,
    sol: '#ff9152', sol_i: 2.7, solAltura: 0.42, relleno: '#8f86e0', relleno_i: 0.42, entorno: 0.22, exposicion: 0.95, noche: 0.45,
  },
  noche: {
    niebla: '#0b1020', hemiCielo: '#5a6fa8', hemiSuelo: '#0d0f18', hemi: 0.3,
    sol: '#a9bfff', sol_i: 0.75, solAltura: 0.85, relleno: '#6d86c9', relleno_i: 0.28, entorno: 0.1, exposicion: 1.05, noche: 1,
  },
};

const c1 = new Color();
const c2 = new Color();
const mezclaColor = (a: string, b: string, t: number) => `#${c1.set(a).lerp(c2.set(b), t).getHexString()}`;
const mezclaNum = (a: number, b: number, t: number) => a + (b - a) * t;

/** Interpolación entre dos preajustes (t = 0 → a, t = 1 → b). */
export function mezclarPreajustes(a: Preajuste, b: Preajuste, t: number): Preajuste {
  const k = Math.min(1, Math.max(0, t));
  const r = { ...a };
  for (const clave of Object.keys(a) as (keyof Preajuste)[]) {
    const va = a[clave];
    const vb = b[clave];
    (r as Record<string, string | number>)[clave] = typeof va === 'number' ? mezclaNum(va, vb as number, k) : mezclaColor(va, vb as string, k);
  }
  return r;
}
