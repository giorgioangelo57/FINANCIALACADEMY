import type { Concepto, Tema } from '../content/schema.ts';
import { analizarEsquema } from './esquema.ts';
import type { Historia, PasoHistoria } from './schema.ts';

/**
 * Historias escritas a mano para conceptos concretos. Tienen prioridad sobre las automáticas.
 * Vacío por ahora: cualquier historia nueva debe usar solo textos literales de DATA.
 */
export const HISTORIAS_CURADAS: Readonly<Record<string, Historia>> = {};

/** Timeline estándar: presentar las entidades, recorrer cada flujo y acabar en la pregunta. */
export function pasosEstandar(numeroFlujos: number): PasoHistoria[] {
  return [
    { tipo: 'presentacion' },
    ...Array.from({ length: numeroFlujos }, (_, indice): PasoHistoria => ({ tipo: 'flujo', indice })),
    { tipo: 'pregunta' },
  ];
}

/** Historia derivada del modo "esquema" del concepto, si su texto es una cadena clara. */
export function historiaDesdeEsquema(concepto: Concepto, tema: Tema): Historia | null {
  const indice = tema.modos.findIndex((m) => m.formato === 'esquema');
  const texto = indice >= 0 ? concepto.explicaciones[indice] : undefined;
  if (!texto) return null;
  const grafo = analizarEsquema(texto);
  if (!grafo) return null;
  return {
    conceptoId: concepto.id,
    fuente: { campo: 'explicaciones', indice, texto },
    ...grafo,
    pasos: pasosEstandar(grafo.flujos.length),
  };
}

export function historiaDeConcepto(tema: Tema, conceptoId: string): Historia | null {
  const curada = HISTORIAS_CURADAS[conceptoId];
  if (curada) return curada;
  const concepto = tema.conceptos.find((c) => c.id === conceptoId);
  return concepto ? historiaDesdeEsquema(concepto, tema) : null;
}
