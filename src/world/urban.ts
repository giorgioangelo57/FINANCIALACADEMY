import type { Frente } from './cityModel.ts';
import { encoger, type Rect } from './geometry.ts';

/*
 * Composición urbana (gramática "Ensanche"). DATA sigue definiendo la superficie exacta de cada
 * zona; aquí solo se decide CÓMO se ocupa: manzanas cerradas con patio interior, edificios que
 * forman fachada continua a la calle, pasajes peatonales entre manzanas y antepatios delante de
 * los edificios emblemáticos. Así la estructura académica deja de leerse como una cuadrícula.
 */

export interface PiezaUrbana {
  conceptoId: string;
  emblematico: boolean;
}

export interface HuecoUrbano {
  conceptoId: string;
  /** Planta del edificio. */
  huella: Rect;
  /** Lado que da a la calle. */
  frente: Frente;
  /** Explanada delante de la fachada (solo emblemáticos con fondo suficiente). */
  antepatio: Rect | null;
}

export interface ComposicionUrbana {
  manzanas: Rect[];
  /** Calles peatonales entre manzanas de una misma zona. */
  pasajes: Rect[];
  /** Patios interiores de manzana. */
  patios: Rect[];
  huecos: HuecoUrbano[];
}

export const PASAJE_URBANO = 3.2;
const SEPARACION = 0.45;
const PESO_EMBLEMATICO = 1.7;
const ANTEPATIO = 1.9;

/** Edificios por manzana: una manzana de Ensanche tiene pocos edificios grandes. */
const POR_MANZANA = 5;

export function componerZonaUrbana(interior: Rect, piezas: readonly PiezaUrbana[]): ComposicionUrbana {
  const n = piezas.length;
  const salida: ComposicionUrbana = { manzanas: [], pasajes: [], patios: [], huecos: [] };
  if (!n) {
    salida.patios.push(interior);
    return salida;
  }

  // Manzanas a lo largo del lado largo, cada una con un número parecido de edificios.
  const numero = Math.max(1, Math.ceil(n / POR_MANZANA));
  const reparto = Array.from({ length: numero }, (_, i) => Math.floor(n / numero) + (i < n % numero ? 1 : 0));
  const horizontal = interior.ancho >= interior.fondo;
  const largo = horizontal ? interior.ancho : interior.fondo;
  const util = largo - (numero - 1) * PASAJE_URBANO;
  let cursor = 0;
  let indice = 0;
  reparto.forEach((cantidad, k) => {
    const tramo = (util * cantidad) / n;
    const manzana: Rect = horizontal
      ? { x: interior.x + cursor, z: interior.z, ancho: tramo, fondo: interior.fondo }
      : { x: interior.x, z: interior.z + cursor, ancho: interior.ancho, fondo: tramo };
    salida.manzanas.push(manzana);
    if (k < numero - 1) {
      salida.pasajes.push(horizontal
        ? { x: interior.x + cursor + tramo, z: interior.z, ancho: PASAJE_URBANO, fondo: interior.fondo }
        : { x: interior.x, z: interior.z + cursor + tramo, ancho: interior.ancho, fondo: PASAJE_URBANO });
    }
    cursor += tramo + PASAJE_URBANO;
    const propias = piezas.slice(indice, indice + cantidad);
    indice += cantidad;
    ocuparManzana(manzana, propias, salida);
  });
  return salida;
}

const pesoDe = (p: PiezaUrbana) => (p.emblematico ? PESO_EMBLEMATICO : 1);

function ocuparManzana(m: Rect, piezas: PiezaUrbana[], salida: ComposicionUrbana): void {
  const lado = Math.min(m.ancho, m.fondo);
  const fondo = Math.min(8.5, Math.max(4.5, lado * 0.34));
  // Los emblemáticos primero: ocupan las fachadas que se ven desde la vista inicial (sur y este).
  const orden = [...piezas].sort((a, b) => Number(b.emblematico) - Number(a.emblematico));

  if (lado < 2 * fondo + 3) {
    hilera(m, orden, salida);
    return;
  }

  const lados: { frente: Frente; largo: number }[] = [
    { frente: 'sur', largo: m.ancho },
    { frente: 'este', largo: m.fondo - 2 * fondo },
    { frente: 'oeste', largo: m.fondo - 2 * fondo },
    { frente: 'norte', largo: m.ancho },
  ];
  const cuotas = repartirCuotas(orden.length, lados.map((l) => l.largo));
  let i = 0;
  lados.forEach((l, k) => {
    const grupo = orden.slice(i, i + cuotas[k]!);
    i += cuotas[k]!;
    alinear(m, l.frente, fondo, grupo, salida);
  });
  salida.patios.push(encoger(m, fondo));
}

/** Reparto entero proporcional (restos mayores). */
export function repartirCuotas(total: number, pesos: number[]): number[] {
  const suma = pesos.reduce((s, p) => s + Math.max(0, p), 0) || 1;
  const exactas = pesos.map((p) => (total * Math.max(0, p)) / suma);
  const cuotas = exactas.map(Math.floor);
  let resto = total - cuotas.reduce((s, c) => s + c, 0);
  const porResto = exactas.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0]);
  for (const [, i] of porResto) {
    if (resto <= 0) break;
    cuotas[i]!++;
    resto--;
  }
  return cuotas;
}

/** Edificios alineados a lo largo de un lado de la manzana, formando fachada continua. */
function alinear(m: Rect, frente: Frente, fondo: number, grupo: PiezaUrbana[], salida: ComposicionUrbana): void {
  if (!grupo.length) return;
  const paralelo = frente === 'sur' || frente === 'norte';
  const inicio = paralelo ? m.x : m.z + fondo;
  const largo = paralelo ? m.ancho : m.fondo - 2 * fondo;
  const pesoTotal = grupo.reduce((s, p) => s + pesoDe(p), 0);
  let cursor = inicio;
  for (const p of grupo) {
    const tramo = (largo * pesoDe(p)) / pesoTotal;
    const desde = cursor + SEPARACION / 2;
    const hasta = cursor + tramo - SEPARACION / 2;
    cursor += tramo;
    const retranqueo = p.emblematico && fondo - ANTEPATIO >= 3.6 ? ANTEPATIO : 0;
    const profundo = fondo - retranqueo;
    let huella: Rect;
    let antepatio: Rect | null = null;
    switch (frente) {
      case 'sur':
        huella = { x: desde, z: m.z + m.fondo - fondo, ancho: hasta - desde, fondo: profundo };
        if (retranqueo) antepatio = { x: desde, z: m.z + m.fondo - retranqueo, ancho: hasta - desde, fondo: retranqueo };
        break;
      case 'norte':
        huella = { x: desde, z: m.z + retranqueo, ancho: hasta - desde, fondo: profundo };
        if (retranqueo) antepatio = { x: desde, z: m.z, ancho: hasta - desde, fondo: retranqueo };
        break;
      case 'este':
        huella = { x: m.x + m.ancho - fondo, z: desde, ancho: profundo, fondo: hasta - desde };
        if (retranqueo) antepatio = { x: m.x + m.ancho - retranqueo, z: desde, ancho: retranqueo, fondo: hasta - desde };
        break;
      case 'oeste':
        huella = { x: m.x + retranqueo, z: desde, ancho: profundo, fondo: hasta - desde };
        if (retranqueo) antepatio = { x: m.x, z: desde, ancho: retranqueo, fondo: hasta - desde };
        break;
    }
    salida.huecos.push({ conceptoId: p.conceptoId, huella, frente, antepatio });
  }
}

/** Manzana estrecha: una sola hilera de edificios mirando a la calle principal. */
function hilera(m: Rect, orden: PiezaUrbana[], salida: ComposicionUrbana): void {
  const horizontal = m.ancho >= m.fondo;
  const frente: Frente = horizontal ? 'sur' : 'este';
  const fondo = (horizontal ? m.fondo : m.ancho) * 0.92;
  const largo = horizontal ? m.ancho : m.fondo;
  const pesoTotal = orden.reduce((s, p) => s + pesoDe(p), 0);
  let cursor = horizontal ? m.x : m.z;
  for (const p of orden) {
    const tramo = (largo * pesoDe(p)) / pesoTotal;
    const desde = cursor + SEPARACION / 2;
    const hasta = cursor + tramo - SEPARACION / 2;
    cursor += tramo;
    const retranqueo = p.emblematico && fondo - ANTEPATIO >= 3.6 ? ANTEPATIO : 0;
    const huella: Rect = horizontal
      ? { x: desde, z: m.z + m.fondo - fondo, ancho: hasta - desde, fondo: fondo - retranqueo }
      : { x: m.x + m.ancho - fondo, z: desde, ancho: fondo - retranqueo, fondo: hasta - desde };
    const antepatio: Rect | null = retranqueo
      ? horizontal
        ? { x: desde, z: m.z + m.fondo - retranqueo, ancho: hasta - desde, fondo: retranqueo }
        : { x: m.x + m.ancho - retranqueo, z: desde, ancho: retranqueo, fondo: hasta - desde }
      : null;
    salida.huecos.push({ conceptoId: p.conceptoId, huella, frente, antepatio });
  }
  const resto = horizontal
    ? { x: m.x, z: m.z, ancho: m.ancho, fondo: m.fondo - fondo }
    : { x: m.x, z: m.z, ancho: m.ancho - fondo, fondo: m.fondo };
  if (resto.ancho > 0.5 && resto.fondo > 0.5) salida.patios.push(resto);
}
