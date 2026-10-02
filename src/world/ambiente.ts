/*
 * Modos de la ciudad, sin Three.js (la interfaz los usa sin descargar el motor 3D):
 *  - día: APRENDER. La ciudad del temario: lo que dominas está construido.
 *  - noche: REPASAR. La ciudad se apaga y solo se encienden los edificios con algo pendiente hoy.
 * Se cambia solo con el botón (el contenido cambia, así que lo decide el alumno) y el mapa se abre
 * siempre de día. Los preajustes de luz están en scene/three/ambiente.ts.
 */

export type Ambiente = 'dia' | 'noche';

export const NOMBRE_AMBIENTE: Record<Ambiente, string> = { dia: 'Aprender', noche: 'Repasar' };
export const ICONO_AMBIENTE: Record<Ambiente, string> = { dia: '☀️', noche: '🌙' };

export function siguienteAmbiente(a: Ambiente): Ambiente {
  return a === 'dia' ? 'noche' : 'dia';
}
