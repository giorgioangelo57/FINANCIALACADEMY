import type { TipoTejado } from '../content/schema.ts';
import type { GlyphName } from '../icons/glyphs.ts';

/*
 * Tipología arquitectónica de cada edificio. Se deriva SOLO de los glifos que el concepto ya tiene
 * en DATA (`Concepto.iconos`), es decir, de la "Gramática visual" de la portada: entidad
 * financiera, autoridad central, supervisión, protección, mercado… No codifica conocimiento ni
 * importancia: solo da a cada tipo de entidad una arquitectura reconocible.
 */
export type Tipologia = 'institucional' | 'banco' | 'supervisor' | 'aseguradora' | 'lonja' | 'tecnologica' | 'oficina';

/** Glifo → tipología. El primer glifo del concepto que aparezca aquí decide. */
const POR_GLIFO: Partial<Record<GlyphName, Tipologia>> = {
  // Autoridad central y organismos públicos.
  brain: 'institucional',
  inst: 'institucional',
  vault: 'institucional',
  globe: 'institucional',
  // Entidades financieras.
  bank: 'banco',
  ship: 'banco',
  chapel: 'banco',
  hive: 'banco',
  // Supervisión.
  eye: 'supervisor',
  lens: 'supervisor',
  // Protección.
  shield: 'aseguradora',
  umbrella: 'aseguradora',
  // Mercado y valores, plataformas.
  chart: 'lonja',
  screen: 'lonja',
  metro: 'lonja',
  // Pagos y dinero electrónico, conexión.
  card: 'tecnologica',
  phone: 'tecnologica',
  link: 'tecnologica',
};

export function tipologiaDe(iconos: readonly GlyphName[]): Tipologia {
  for (const g of iconos) {
    const t = POR_GLIFO[g];
    if (t) return t;
  }
  return 'oficina';
}

/**
 * Altura de referencia por tipología (unidades del mundo) para los edificios que no están en la
 * portada original. Los 12 de la portada conservan su altura de DATA.
 */
export const ALTURA_TIPOLOGIA: Record<Tipologia, number> = {
  institucional: 5.5,
  banco: 9,
  supervisor: 11,
  aseguradora: 8,
  lonja: 4.2,
  tecnologica: 7,
  oficina: 7,
};

/**
 * Remate por defecto, con las mismas convenciones que la portada original
 * (BdE, ICO y BCE: frontón; CNMV y MUR: antena; FGD y DGSFP: cúpula; bancos: bandera).
 */
export const TEJADO_TIPOLOGIA: Record<Tipologia, TipoTejado> = {
  institucional: 'fronton',
  banco: 'bandera',
  supervisor: 'antena',
  aseguradora: 'cupula',
  lonja: 'plano',
  tecnologica: 'plano',
  oficina: 'plano',
};
