import type { ModeloCiudad } from './cityModel.ts';

/*
 * Recorrido guiado de un barrio: sus edificios en el orden de estudio del tema (las secciones en
 * su orden y, dentro de cada una, los conceptos en el orden de DATA). Es lo que dibuja el mapa de
 * ruta con flechas.
 */

/** Barrio del recorrido: el 4, "Estructura del sistema español". */
export const BARRIO_RECORRIDO = '4';

export function recorridoDelBarrio(m: ModeloCiudad, grupoId: string): string[] {
  const existe = new Set(m.edificios.map((e) => e.conceptoId));
  return m.zonas.filter((z) => z.grupoId === grupoId).flatMap((z) => z.conceptoIds.filter((id) => existe.has(id)));
}
