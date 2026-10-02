import type { ModeloCiudad } from './cityModel.ts';
import type { Foco } from './focus.ts';

/**
 * Qué se rotula sobre la maqueta. El mundo no es una infografía: la geometría comunica la
 * jerarquía y la ficha contextual da los datos cuando se piden.
 * - Ciudad: solo los barrios, discretos (en lectura de mapa, las zonas).
 * - Barrio: sus zonas.
 * - Zona: el nombre de cada uno de sus edificios.
 * - Edificio: el edificio enfocado y, atenuados por la vista, los demás de su zona.
 */
export function etiquetasDelNivel(m: ModeloCiudad, foco: Foco, modoMapa: boolean): Foco[] {
  switch (foco.nivel) {
    case 'ciudad':
      return modoMapa
        ? m.zonas.map((z): Foco => ({ nivel: 'zona', seccionId: z.seccionId }))
        : m.barrios.map((b): Foco => ({ nivel: 'barrio', grupoId: b.grupoId }));
    case 'barrio':
      return m.zonas.filter((z) => z.grupoId === foco.grupoId).map((z): Foco => ({ nivel: 'zona', seccionId: z.seccionId }));
    case 'zona':
      return edificiosDeZona(m, foco.seccionId);
    case 'edificio': {
      const zona = m.zonas.find((z) => z.conceptoIds.includes(foco.conceptoId));
      const resto = zona ? edificiosDeZona(m, zona.seccionId).filter((f) => f.nivel === 'edificio' && f.conceptoId !== foco.conceptoId) : [];
      return [{ nivel: 'edificio', conceptoId: foco.conceptoId }, ...resto];
    }
  }
}

function edificiosDeZona(m: ModeloCiudad, seccionId: string): Foco[] {
  const zona = m.zonas.find((z) => z.seccionId === seccionId);
  return (zona?.conceptoIds ?? [])
    .filter((id) => m.edificios.some((e) => e.conceptoId === id))
    .map((conceptoId): Foco => ({ nivel: 'edificio', conceptoId }));
}

/**
 * Rótulos del modo noche (repaso): solo los edificios con algo pendiente dentro de lo que se mira,
 * y el enfocado aunque no tenga nada. La ciudad apagada queda sin rótulos.
 */
export function etiquetasNocturnas(m: ModeloCiudad, foco: Foco, pendientes: ReadonlyMap<string, { total: number }>): Foco[] {
  const ids = (() => {
    switch (foco.nivel) {
      case 'ciudad':
        return m.edificios.map((e) => e.conceptoId);
      case 'barrio':
        return m.zonas.filter((z) => z.grupoId === foco.grupoId).flatMap((z) => z.conceptoIds);
      case 'zona':
        return m.zonas.find((z) => z.seccionId === foco.seccionId)?.conceptoIds ?? [];
      case 'edificio':
        return m.zonas.find((z) => z.conceptoIds.includes(foco.conceptoId))?.conceptoIds ?? [];
    }
  })();
  const encendidos = ids.filter((id) => pendientes.get(id)?.total && m.edificios.some((e) => e.conceptoId === id));
  if (foco.nivel === 'edificio' && !encendidos.includes(foco.conceptoId)) encendidos.unshift(foco.conceptoId);
  return encendidos.map((conceptoId): Foco => ({ nivel: 'edificio', conceptoId }));
}
