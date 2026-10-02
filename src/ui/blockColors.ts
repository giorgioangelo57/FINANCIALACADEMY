/**
 * Colores categóricos de los bloques del examen, en orden fijo (el color sigue al bloque en todas
 * las vistas). Validados para fondo oscuro (#111) con el validador de paleta de dataviz: banda de
 * luminosidad, croma, separación para daltonismo y contraste 3:1.
 */
export const COLORES_BLOQUE = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];

export const colorBloque = (indice: number): string => COLORES_BLOQUE[indice % COLORES_BLOQUE.length]!;

/** Nombre corto de cada bloque para etiquetas (los de la predicción de los apuntes). */
const CORTO: Record<string, string> = {
  intermediarios: 'Intermediarios',
  supervisores: 'Supervisores',
  mercados: 'Mercados',
  activos: 'Activos y trinomio',
  basicos: 'Conceptos básicos',
};
export const nombreCortoBloque = (b: { id: string; titulo: string }): string => CORTO[b.id] ?? b.titulo.split(' (')[0]!;
