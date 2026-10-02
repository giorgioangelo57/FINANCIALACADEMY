import { hrefConcepto, hrefSeccion } from '../app/router.ts';
import { type NivelDominio, nivelDominio } from '../domain/mastery.ts';
import type { FaseObra, ModeloCiudad, ZonaVisual } from './cityModel.ts';
import { buscarBarrio, buscarEdificio, buscarZona, type Foco } from './focus.ts';

/*
 * Atlas del Conocimiento: la misma ciudad leída como mapa. Para cada foco responde
 * qué contiene, qué pesa más, qué sé, qué me falta y dónde estudiar ahora.
 * Solo usa datos existentes: pesos de examen por sección y dominio por concepto.
 */

export interface EntradaAtlas {
  foco: Foco;
  /** Identificador visible (id de sección) si lo hay. */
  clave: string | null;
  etiqueta: string;
  /** Peso real en examen; null para conceptos (el dato no existe por concepto). */
  pesoExamen: number | null;
  dominio: number;
  nivel: NivelDominio;
  fase: FaseObra | null;
  total: number;
  estudiados: number;
  prioridad: number | null;
}

export interface Enlace {
  href: string;
  texto: string;
}

export interface VistaAtlas {
  foco: Foco;
  titulo: string;
  clave: string | null;
  pesoExamen: number | null;
  dominio: number;
  nivel: NivelDominio;
  fase: FaseObra | null;
  total: number;
  estudiados: number;
  dominados: number;
  entradas: EntradaAtlas[];
  /** Peso máximo entre las entradas, para escalar las barras de peso. */
  pesoMaximo: number;
  /** Dónde estudiar ahora desde este nivel. */
  estudiarAhora: Enlace | null;
}

const entradaZona = (z: ZonaVisual): EntradaAtlas => ({
  foco: { nivel: 'zona', seccionId: z.seccionId },
  clave: z.seccionId,
  etiqueta: z.titulo,
  pesoExamen: z.pesoExamen,
  dominio: z.dominio,
  nivel: z.nivel,
  fase: null,
  total: z.conceptoIds.length,
  estudiados: z.estudiados,
  prioridad: z.prioridad,
});

const recuento = (zonas: ZonaVisual[]) => ({
  total: zonas.reduce((s, z) => s + z.conceptoIds.length, 0),
  estudiados: zonas.reduce((s, z) => s + z.estudiados, 0),
  dominados: zonas.reduce((s, z) => s + z.dominados, 0),
});

/** La zona más urgente según el orden de "Estudia ya", con algo pendiente si lo hay. */
function zonaUrgente(zonas: ZonaVisual[]): ZonaVisual | undefined {
  const ordenadas = [...zonas].sort((a, b) => a.ordenEstudio - b.ordenEstudio);
  return ordenadas.find((z) => z.dominados < z.conceptoIds.length) ?? ordenadas[0];
}

const enlaceZona = (z: ZonaVisual | undefined): Enlace | null =>
  z ? { href: hrefSeccion(z.seccionId), texto: `Siguiente recomendación: ${z.seccionId} ${z.titulo}` } : null;

const pesoMaximo = (entradas: EntradaAtlas[]) => Math.max(0, ...entradas.map((e) => e.pesoExamen ?? 0));

export function vistaAtlas(m: ModeloCiudad, foco: Foco): VistaAtlas {
  switch (foco.nivel) {
    case 'barrio': {
      const barrio = buscarBarrio(m, foco.grupoId);
      if (!barrio) break;
      const zonas = m.zonas.filter((z) => z.grupoId === barrio.grupoId);
      const entradas = zonas.map(entradaZona);
      return {
        foco,
        titulo: barrio.titulo,
        clave: null,
        pesoExamen: barrio.pesoExamen,
        dominio: barrio.dominio,
        nivel: barrio.nivel,
        fase: null,
        ...recuento(zonas),
        entradas,
        pesoMaximo: pesoMaximo(entradas),
        estudiarAhora: enlaceZona(zonaUrgente(zonas)),
      };
    }
    case 'zona': {
      const zona = buscarZona(m, foco.seccionId);
      if (!zona) break;
      const entradas: EntradaAtlas[] = m.edificios
        .filter((e) => e.seccionId === zona.seccionId)
        .map((e) => ({
          foco: { nivel: 'edificio', conceptoId: e.conceptoId },
          clave: null,
          etiqueta: e.nombre,
          pesoExamen: null,
          dominio: e.dominio,
          nivel: e.nivel,
          fase: e.fase,
          total: 1,
          estudiados: e.dominio > 0 ? 1 : 0,
          prioridad: null,
        }));
      return {
        foco,
        titulo: zona.titulo,
        clave: zona.seccionId,
        pesoExamen: zona.pesoExamen,
        dominio: zona.dominio,
        nivel: zona.nivel,
        fase: null,
        ...recuento([zona]),
        entradas,
        pesoMaximo: 0,
        estudiarAhora: { href: hrefSeccion(zona.seccionId), texto: `Estudiar la sección ${zona.seccionId}` },
      };
    }
    case 'edificio': {
      const e = buscarEdificio(m, foco.conceptoId);
      if (!e) break;
      return {
        foco,
        titulo: e.nombre,
        clave: e.seccionId,
        pesoExamen: null,
        dominio: e.dominio,
        nivel: e.nivel,
        fase: e.fase,
        total: 1,
        estudiados: e.dominio > 0 ? 1 : 0,
        dominados: e.nivel === 'dominado' ? 1 : 0,
        entradas: [],
        pesoMaximo: 0,
        estudiarAhora: { href: hrefConcepto(e.conceptoId), texto: 'Entrar al concepto' },
      };
    }
    case 'ciudad':
      break;
  }

  // Ciudad (y cualquier foco que ya no exista).
  const entradas: EntradaAtlas[] = m.barrios.map((b) => {
    const zonas = m.zonas.filter((z) => z.grupoId === b.grupoId);
    const r = recuento(zonas);
    return {
      foco: { nivel: 'barrio', grupoId: b.grupoId },
      clave: null,
      etiqueta: b.titulo,
      pesoExamen: b.pesoExamen,
      dominio: b.dominio,
      nivel: b.nivel,
      fase: null,
      total: r.total,
      estudiados: r.estudiados,
      prioridad: null,
    };
  });
  const pesoTotal = m.barrios.reduce((s, b) => s + b.pesoExamen, 0);
  const dominio = pesoTotal > 0 ? m.barrios.reduce((s, b) => s + b.dominio * b.pesoExamen, 0) / pesoTotal : 0;
  return {
    foco: { nivel: 'ciudad' },
    titulo: 'Toda la ciudad',
    clave: null,
    pesoExamen: pesoTotal,
    dominio,
    nivel: nivelDominio(dominio),
    fase: null,
    ...recuento(m.zonas),
    entradas,
    pesoMaximo: pesoMaximo(entradas),
    estudiarAhora: enlaceZona(zonaUrgente(m.zonas)),
  };
}
