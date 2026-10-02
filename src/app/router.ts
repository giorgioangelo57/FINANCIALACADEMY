import type { Tema } from '../content/schema.ts';

export type Ruta =
  | { vista: 'inicio'; scrollArriba: boolean }
  | { vista: 'examen' | 'simulacro' | 'repaso' | 'sesion' | 'progreso' | 'visual'; scrollArriba: boolean }
  /** Repaso de un solo concepto (desde el modo noche del mapa). */
  | { vista: 'repaso'; conceptoId: string; scrollArriba: boolean }
  | { vista: 'seccion'; seccionId: string; conceptoFoco: string | null; scrollArriba: boolean };

/**
 * Rutas del prototipo: `#inicio`, `#s/<sección>`, `#c/<concepto>`; y `#examen` (predicción),
 * `#simulacro`, `#repaso` (o `#repaso/<concepto>`), `#sesion` (estudiar hoy) y `#progreso`, solo si el tema tiene ampliación
 * con bloques.
 * Un id desconocido lleva al inicio. Con `#c/…` no se vuelve arriba porque se hace scroll al concepto.
 */
export function resolverRuta(hash: string, tema: Tema): Ruta {
  const h = (hash || '#inicio').slice(1);
  const scrollArriba = !h.startsWith('c/');

  if ((h === 'examen' || h === 'simulacro' || h === 'repaso' || h === 'sesion' || h === 'progreso') && tema.ampliacion?.bloques.length) return { vista: h, scrollArriba };
  if (h === 'visual' && tema.ampliacion?.infografias?.length) return { vista: 'visual', scrollArriba };
  if (h.startsWith('repaso/') && tema.ampliacion?.bloques.length) {
    const id = h.slice(7);
    if (tema.conceptos.some((c) => c.id === id)) return { vista: 'repaso', conceptoId: id, scrollArriba };
  }
  if (h.startsWith('s/')) {
    const id = h.slice(2);
    if (tema.secciones.some((s) => s.id === id)) return { vista: 'seccion', seccionId: id, conceptoFoco: null, scrollArriba };
  } else if (h.startsWith('c/')) {
    const concepto = tema.conceptos.find((c) => c.id === h.slice(2));
    if (concepto) return { vista: 'seccion', seccionId: concepto.seccionId, conceptoFoco: concepto.id, scrollArriba };
  }
  return { vista: 'inicio', scrollArriba };
}

export const hrefInicio = () => '#inicio';
export const hrefSeccion = (seccionId: string) => `#s/${seccionId}`;
export const hrefConcepto = (conceptoId: string) => `#c/${conceptoId}`;
export const hrefExamen = () => '#examen';
export const hrefSimulacro = () => '#simulacro';
export const hrefRepaso = (conceptoId?: string) => (conceptoId ? `#repaso/${conceptoId}` : '#repaso');
export const hrefSesion = () => '#sesion';
export const hrefProgreso = () => '#progreso';
export const hrefVisual = () => '#visual';
