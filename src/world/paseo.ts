import type { ModeloCiudad } from './cityModel.ts';
import { encoger, type Punto, type Rect } from './geometry.ts';

/*
 * Paseo por la ciudad con el personaje: movimiento, colisiones y cercanía a los edificios.
 * Es puro (sin Three.js ni DOM). Los edificios son obstáculos; las calles, plazas y patios, no.
 */

export interface EstadoPaseo {
  posicion: Punto;
  /** Hacia dónde mira, en radianes (0 = +z, hacia el sur). */
  rumbo: number;
  velocidad: number;
  /** Altura sobre el suelo (salto) y velocidad vertical. */
  altura?: number;
  vy?: number;
  /** Segundos de dash restantes y de enfriamiento hasta poder repetirlo. */
  dash?: number;
  enfriamiento?: number;
}

/** Dirección pedida por el teclado en el plano de la cámara: x = derecha, y = adelante (−1…1). */
export interface EntradaPaseo {
  x: number;
  y: number;
}

export const RADIO_PERSONAJE = 0.55;
export const VELOCIDAD_MAXIMA = 9;
const ACELERACION = 30;
const FRENADA = 24;
export const IMPULSO_SALTO = 8;
export const GRAVEDAD = 24;
export const VELOCIDAD_DASH = 26;
export const DURACION_DASH = 0.22;
export const ENFRIAMIENTO_DASH = 0.7;

export const enElSuelo = (e: EstadoPaseo): boolean => (e.altura ?? 0) <= 0 && (e.vy ?? 0) <= 0;

/** Salta si está en el suelo; en el aire no hace nada. */
export function saltar(e: EstadoPaseo): EstadoPaseo {
  return enElSuelo(e) ? { ...e, vy: IMPULSO_SALTO } : e;
}

/** Impulso breve en la dirección en que mira (también en el aire), con enfriamiento. */
export function dashear(e: EstadoPaseo): EstadoPaseo {
  return (e.enfriamiento ?? 0) > 0 ? e : { ...e, dash: DURACION_DASH, enfriamiento: ENFRIAMIENTO_DASH };
}

/** ¿Hay algo que animar aunque no se pulse ninguna tecla? */
export const enMovimiento = (e: EstadoPaseo): boolean =>
  e.velocidad > 0 || !enElSuelo(e) || (e.dash ?? 0) > 0 || (e.enfriamiento ?? 0) > 0;

/** Distancia (desde el borde del lote) a la que un edificio "se nota" al pasar. */
export const DISTANCIA_CERCANIA = 2.2;

export const obstaculosDe = (m: ModeloCiudad): { conceptoId: string; rect: Rect }[] =>
  m.edificios.map((e) => ({ conceptoId: e.conceptoId, rect: e.lote }));

/** Lugar de aparición: la primera plaza o patio libre; si no hay, el centro de la ciudad. */
export function puntoDeSalida(m: ModeloCiudad): Punto {
  const libre = m.zonas.find((z) => z.plaza)?.plaza ?? m.zonas.find((z) => z.patios.length)?.patios[0];
  // Junto al borde sur, no en el centro (allí está la fuente).
  if (libre) return { x: libre.x + libre.ancho / 2, z: libre.z + libre.fondo * 0.85 };
  return { x: 0, z: 0 };
}

const dentro = (p: Punto, r: Rect, margen: number) =>
  p.x > r.x - margen && p.x < r.x + r.ancho + margen && p.z > r.z - margen && p.z < r.z + r.fondo + margen;

/** Distancia de un punto al rectángulo (0 si está dentro). */
export function distanciaARect(p: Punto, r: Rect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - (r.x + r.ancho));
  const dz = Math.max(r.z - p.z, 0, p.z - (r.z + r.fondo));
  return Math.hypot(dx, dz);
}

/**
 * Avanza el paseo `dt` segundos. `angulo` es la orientación horizontal de la cámara (las teclas
 * son relativas a lo que se ve). Las colisiones se resuelven por ejes para poder deslizarse
 * a lo largo de una fachada.
 */
export function avanzarPaseo(
  estado: EstadoPaseo,
  entrada: EntradaPaseo,
  angulo: number,
  dt: number,
  obstaculos: readonly { rect: Rect }[],
  limites: Rect,
): EstadoPaseo {
  const largo = Math.hypot(entrada.x, entrada.y);
  let { velocidad, rumbo } = estado;
  if (largo > 0) {
    // Adelante = alejándose de la cámara.
    const ax = entrada.x / largo;
    const ay = entrada.y / largo;
    const dx = -Math.sin(angulo) * ay + Math.cos(angulo) * ax;
    const dz = -Math.cos(angulo) * ay - Math.sin(angulo) * ax;
    const objetivo = Math.atan2(dx, dz);
    // Giro suave hacia la dirección pedida.
    let diferencia = objetivo - rumbo;
    diferencia = Math.atan2(Math.sin(diferencia), Math.cos(diferencia));
    rumbo += diferencia * Math.min(1, dt * 12);
    velocidad = Math.min(VELOCIDAD_MAXIMA, velocidad + ACELERACION * dt);
  } else {
    velocidad = Math.max(0, velocidad - FRENADA * dt);
  }

  // Salto: integración vertical con gravedad; al tocar el suelo se detiene.
  let altura = estado.altura ?? 0;
  let vy = estado.vy ?? 0;
  if (altura > 0 || vy > 0) {
    vy -= GRAVEDAD * dt;
    altura += vy * dt;
    if (altura <= 0) {
      altura = 0;
      vy = 0;
    }
  }
  const dash = Math.max(0, (estado.dash ?? 0) - dt);
  const enfriamiento = Math.max(0, (estado.enfriamiento ?? 0) - dt);
  const enDash = (estado.dash ?? 0) > 0;
  const rapidez = enDash ? VELOCIDAD_DASH : velocidad;
  const base = { rumbo, velocidad, altura, vy, dash, enfriamiento };
  if (rapidez === 0) return { ...estado, ...base };

  const paso = rapidez * dt;
  const libres = encoger(limites, RADIO_PERSONAJE);
  const choca = (p: Punto) => obstaculos.some((o) => dentro(p, o.rect, RADIO_PERSONAJE));
  let { x, z } = estado.posicion;
  const nx = Math.min(libres.x + libres.ancho, Math.max(libres.x, x + Math.sin(rumbo) * paso));
  if (!choca({ x: nx, z })) x = nx;
  const nz = Math.min(libres.z + libres.fondo, Math.max(libres.z, z + Math.cos(rumbo) * paso));
  if (!choca({ x, z: nz })) z = nz;
  return { posicion: { x, z }, ...base };
}

/** El edificio más cercano al personaje, si está a menos de `DISTANCIA_CERCANIA`. */
export function edificioCercano(p: Punto, obstaculos: readonly { conceptoId: string; rect: Rect }[]): string | null {
  let mejor: string | null = null;
  let distancia = DISTANCIA_CERCANIA;
  for (const o of obstaculos) {
    const d = distanciaARect(p, o.rect);
    if (d < distancia) {
      distancia = d;
      mejor = o.conceptoId;
    }
  }
  return mejor;
}
