/*
 * Microexperiencias: historias visuales pequeñas ligadas a un concepto.
 *
 *   concepto → entidades → flujos → pasos (timeline) → pregunta
 *
 * Una historia es solo datos: el mismo reproductor (HTML hoy, escena 3D mañana) sirve para
 * cualquier concepto. Los textos son siempre literales de DATA; la fuente queda registrada para
 * poder verificarlo.
 */

export interface EntidadHistoria {
  id: string;
  /** Texto literal tomado de la fuente. */
  etiqueta: string;
}

/**
 * - `flujo`: algo viaja de `desde` a `hacia` (dinero, títulos, información…).
 * - `intercambio`: relación en los dos sentidos.
 * - `contiene`: `desde` engloba a `hacia` (jerarquías como SEBC ⊃ Eurosistema ⊃ BCE).
 */
export type TipoFlujo = 'flujo' | 'intercambio' | 'contiene';

export interface FlujoHistoria {
  desde: string;
  hacia: string;
  tipo: TipoFlujo;
  /** Lo que viaja, si la fuente lo dice (p. ej. "depósito"). */
  etiqueta: string | null;
}

export type PasoHistoria =
  | { tipo: 'presentacion' }
  | { tipo: 'flujo'; indice: number }
  | { tipo: 'pregunta' };

export interface FuenteHistoria {
  campo: 'explicaciones';
  indice: number;
  texto: string;
}

export interface Historia {
  conceptoId: string;
  fuente: FuenteHistoria;
  entidades: EntidadHistoria[];
  flujos: FlujoHistoria[];
  pasos: PasoHistoria[];
}
