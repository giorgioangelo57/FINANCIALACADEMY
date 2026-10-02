import type { TipoTejado, Tema } from '../content/schema.ts';
import { dominioConcepto, dominioSeccion, type NivelDominio, nivelDominio } from '../domain/mastery.ts';
import { seccionesPrioritarias } from '../domain/priority.ts';
import type { Progreso } from '../domain/progress.ts';
import {
  centroRect,
  encoger,
  longitudSegmento,
  particionar,
  type Punto,
  type Rect,
  type Segmento,
  segmentosInteriores,
} from './geometry.ts';
import { ALTURA_TIPOLOGIA, TEJADO_TIPOLOGIA, type Tipologia, tipologiaDe } from './typology.ts';
import type { GlyphName } from '../icons/glyphs.ts';
import { componerZonaUrbana, type ComposicionUrbana } from './urban.ts';

/*
 * Modelo visual derivado: traduce contenido + progreso a una ciudad. Es puro (sin Three.js ni DOM)
 * y lo consumen tanto el renderer 3D como el Atlas HTML.
 *
 * Reglas de significado (no mezclar):
 * - Superficie de barrios y zonas = peso real en examen (`Seccion.pesoExamen`). Los lotes de una
 *   zona se reparten su superficie a partes iguales, así que también derivan del peso.
 * - Estado de cada edificio (proyecto / en obra / construido) = dominio del concepto.
 * - Tipología arquitectónica = glifos del concepto en DATA (ver `typology.ts`).
 * - Altura: los 12 edificios de la portada conservan la suya (dato de `tema.ciudad`); el resto
 *   usan la de su tipología. La altura no codifica conocimiento.
 * - Arbolado y farolas existen por la calle en la que están (bulevares, plazas, antejardines),
 *   nunca como relleno.
 */

/** Fase de construcción de un edificio, derivada del nivel de dominio existente. */
export type FaseObra = 'solar' | 'obra' | 'completo';

export function faseObra(nivel: NivelDominio): FaseObra {
  if (nivel === 'sin-estudiar') return 'solar';
  if (nivel === 'dominado') return 'completo';
  return 'obra';
}

/** Lado del lote que da a la calle (donde va la fachada principal). */
export type Frente = 'norte' | 'sur' | 'este' | 'oeste';

export interface BarrioVisual {
  grupoId: string;
  titulo: string;
  indice: number;
  /** Parcela del barrio en el treemap (área ∝ peso). */
  rect: Rect;
  /** Zona edificable del barrio, ya descontadas las avenidas. */
  parcela: Rect;
  pesoExamen: number;
  /** Dominio medio de sus secciones ponderado por peso (misma regla que el dominio global). */
  dominio: number;
  nivel: NivelDominio;
  seccionIds: string[];
}

export interface ZonaVisual {
  seccionId: string;
  grupoId: string;
  titulo: string;
  /** Lote del treemap (área ∝ peso dentro del barrio). Sus bordes son ejes de calle. */
  lote: Rect;
  /** Manzana: plataforma de la zona, sin las calles. */
  parcela: Rect;
  /** Espacio donde se reparten los lotes de los edificios. */
  interior: Rect;
  /** Plaza pública de la zona (si la manzana tiene espacio para ella). */
  plaza: Rect | null;
  /** Gramática visual de la zona (ver GRAMATICA_URBANA). */
  composicion: Composicion;
  /** Solo en la gramática urbana: manzanas, pasajes peatonales y patios interiores. */
  manzanas: Rect[];
  pasajes: Rect[];
  patios: Rect[];
  pesoExamen: number;
  dominio: number;
  nivel: NivelDominio;
  /** Puesto en "Estudia ya" (1, 2, 3) o null si no está entre las prioritarias. */
  prioridad: number | null;
  /** Posición (1…n) en el orden completo de prioridad de estudio. */
  ordenEstudio: number;
  conceptoIds: string[];
  estudiados: number;
  dominados: number;
}

export interface EdificioVisual {
  conceptoId: string;
  seccionId: string;
  grupoId: string;
  nombre: string;
  color: string;
  tipologia: Tipologia;
  /** Glifos del concepto en DATA: dan rasgos arquitectónicos (ver architecture). */
  iconos: readonly GlyphName[];
  composicion: Composicion;
  /** Explanada delante de la fachada de un emblemático (gramática urbana). */
  antepatio: Rect | null;
  /** Lote del edificio dentro de la manzana. */
  lote: Rect;
  frente: Frente;
  posicion: Punto;
  /** Lado menor del lote: escala de referencia para la masa del edificio. */
  huella: number;
  /** Altura cuando está construido del todo. */
  alturaCompleta: number;
  tejado: TipoTejado;
  /** Uno de los edificios de la portada original. */
  emblematico: boolean;
  dominio: number;
  nivel: NivelDominio;
  fase: FaseObra;
}

export type MotivoArbol = 'bulevar' | 'plaza' | 'patio' | 'paseo';

/**
 * - `parcelas`: lotes en retícula (gramática de c30a940).
 * - `urbana`: manzanas de Ensanche con patio, fachada continua y antepatios (vertical slice).
 */
export type Composicion = 'parcelas' | 'urbana';

/** Barrios que ya usan la gramática urbana. Se amplía cuando el lenguaje visual esté validado. */
export const GRAMATICA_URBANA: ReadonlySet<string> = new Set(['4']);
/** Acera entre la calle y las manzanas en la gramática urbana. */
export const ACERA_URBANA = 1.5;

export interface ArbolVisual {
  posicion: Punto;
  escala: number;
  motivo: MotivoArbol;
}

export interface ModeloCiudad {
  lado: number;
  barrios: BarrioVisual[];
  zonas: ZonaVisual[];
  edificios: EdificioVisual[];
  /** Ejes de las avenidas entre barrios (con mediana arbolada). */
  avenidas: Segmento[];
  /** Ejes de las calles entre zonas de un mismo barrio. */
  calles: Segmento[];
  arboles: ArbolVisual[];
  farolas: Punto[];
}

export const LADO_CIUDAD = 120;
export const AVENIDA = 5;
export const CALLE = 2.6;
/** Acera entre el borde de la manzana y los lotes. */
export const ACERA = 0.8;
/** Pasaje entre lotes vecinos. */
export const PASAJE = 0.9;
/** Superficie mínima por concepto para reservar una plaza en la manzana. */
const SUPERFICIE_PLAZA = 140;
/** Altura estándar (tipología oficina) para los edificios que no están en la portada. */
export const ALTURA_ESTANDAR = ALTURA_TIPOLOGIA.oficina;
/** La portada muestra 3 secciones en "Estudia ya" (valor por defecto de `seccionesPrioritarias`). */
export const PUESTOS_ESTUDIA_YA = 3;
/** Las alturas de la portada están en píxeles del SVG (50–80). */
const PIXELES_POR_UNIDAD = 6;
/** Los edificios de la maqueta, algo más altos que en la portada 2D original (más presencia). */
export const ESCALA_ALTURA = 1.25;

export function modeloCiudad(tema: Tema, progreso: Progreso): ModeloCiudad {
  const lado = LADO_CIUDAD;
  const ciudad: Rect = { x: -lado / 2, z: -lado / 2, ancho: lado, fondo: lado };
  // Mismo criterio que "Estudia ya" de la portada, aplicado a todas las secciones.
  const ordenEstudio = seccionesPrioritarias(tema, progreso, tema.secciones.length).map((s) => s.id);
  const emblematicos = new Map(tema.ciudad.edificios.map((e) => [e.conceptoId, e]));

  const pesoGrupo = (grupoId: string) =>
    tema.secciones.filter((s) => s.grupoId === grupoId).reduce((suma, s) => suma + s.pesoExamen, 0);
  const rectsBarrio = particionar(tema.grupos.map((g) => ({ id: g.id, peso: pesoGrupo(g.id) })), ciudad);

  const barrios: BarrioVisual[] = [];
  const zonas: ZonaVisual[] = [];
  const edificios: EdificioVisual[] = [];
  const calles: Segmento[] = [];

  tema.grupos.forEach((g, indice) => {
    const rect = rectsBarrio.get(g.id)!;
    const parcela = encoger(rect, AVENIDA / 2);
    const secciones = tema.secciones.filter((s) => s.grupoId === g.id);
    const pesoExamen = pesoGrupo(g.id);
    const dominio = pesoExamen > 0
      ? secciones.reduce((suma, s) => suma + dominioSeccion(tema, progreso, s.id) * s.pesoExamen, 0) / pesoExamen
      : 0;
    barrios.push({
      grupoId: g.id,
      titulo: g.titulo,
      indice,
      rect,
      parcela,
      pesoExamen,
      dominio,
      nivel: nivelDominio(dominio),
      seccionIds: secciones.map((s) => s.id),
    });

    const lotes = particionar(secciones.map((s) => ({ id: s.id, peso: s.pesoExamen })), parcela);
    calles.push(...segmentosInteriores([...lotes.values()], parcela));

    for (const s of secciones) {
      const lote = lotes.get(s.id)!;
      const manzana = encoger(lote, CALLE / 2);
      const composicion: Composicion = GRAMATICA_URBANA.has(g.id) ? 'urbana' : 'parcelas';
      const interior = encoger(manzana, composicion === 'urbana' ? ACERA_URBANA : ACERA);
      const conceptos = tema.conceptos.filter((c) => c.seccionId === s.id);
      let plaza: Rect | null = null;
      let urbana: ComposicionUrbana | null = null;
      let lotesEdificio: Rect[] = [];
      if (composicion === 'urbana') {
        urbana = componerZonaUrbana(interior, conceptos.map((c) => ({ conceptoId: c.id, emblematico: emblematicos.has(c.id) })));
      } else {
        const conPlaza = conceptos.length > 0 && (interior.ancho * interior.fondo) / conceptos.length >= SUPERFICIE_PLAZA;
        const celdas = repartirLotes(interior, conceptos.length + (conPlaza ? 1 : 0));
        const indicePlaza = conPlaza ? Math.floor(celdas.length / 2) : -1;
        plaza = conPlaza ? encoger(celdas[indicePlaza]!, PASAJE / 2) : null;
        lotesEdificio = celdas.filter((_, i) => i !== indicePlaza).map((c) => encoger(c, PASAJE / 2));
      }

      conceptos.forEach((c, k) => {
        const d = dominioConcepto(progreso, c.id);
        const nivel = nivelDominio(d);
        const emblema = emblematicos.get(c.id);
        const tipologia = tipologiaDe(c.iconos);
        const hueco = urbana?.huecos.find((h) => h.conceptoId === c.id);
        const loteEdificio = hueco ? hueco.huella : lotesEdificio[k]!;
        edificios.push({
          conceptoId: c.id,
          seccionId: s.id,
          grupoId: g.id,
          nombre: c.nombre,
          color: c.color,
          tipologia,
          iconos: c.iconos,
          composicion,
          antepatio: hueco?.antepatio ?? null,
          lote: loteEdificio,
          frente: hueco ? hueco.frente : frenteHaciaCalle(loteEdificio, manzana),
          posicion: centroRect(loteEdificio),
          huella: Math.min(loteEdificio.ancho, loteEdificio.fondo),
          alturaCompleta: (emblema ? emblema.altura / PIXELES_POR_UNIDAD : ALTURA_TIPOLOGIA[tipologia]) * ESCALA_ALTURA,
          tejado: emblema ? emblema.tejado : TEJADO_TIPOLOGIA[tipologia],
          emblematico: Boolean(emblema),
          dominio: d,
          nivel,
          fase: faseObra(nivel),
        });
      });

      const orden = ordenEstudio.indexOf(s.id) + 1;
      zonas.push({
        seccionId: s.id,
        grupoId: g.id,
        titulo: s.titulo,
        lote,
        parcela: manzana,
        interior,
        plaza,
        composicion,
        manzanas: urbana?.manzanas ?? [],
        pasajes: urbana?.pasajes ?? [],
        patios: urbana?.patios ?? [],
        pesoExamen: s.pesoExamen,
        dominio: dominioZona(tema, progreso, s.id),
        nivel: nivelDominio(dominioZona(tema, progreso, s.id)),
        prioridad: orden > 0 && orden <= PUESTOS_ESTUDIA_YA ? orden : null,
        ordenEstudio: orden,
        conceptoIds: conceptos.map((c) => c.id),
        estudiados: conceptos.filter((c) => dominioConcepto(progreso, c.id) > 0).length,
        dominados: conceptos.filter((c) => nivelDominio(dominioConcepto(progreso, c.id)) === 'dominado').length,
      });
    }
  });

  const avenidas = segmentosInteriores([...rectsBarrio.values()], ciudad);
  const arboles = [...arbolesDeBulevar(avenidas, [...avenidas, ...calles]), ...arbolesDePlaza(zonas), ...arbolesUrbanos(zonas)];
  const farolas = farolasDeAvenida(avenidas, [...avenidas, ...calles]);

  return { lado, barrios, zonas, edificios, avenidas, calles, arboles, farolas };
}

const dominioZona = (tema: Tema, progreso: Progreso, seccionId: string) => dominioSeccion(tema, progreso, seccionId);

/**
 * Divide el interior de la manzana en celdas que lo cubren entero (sin huecos): la última fila,
 * si queda incompleta, reparte su anchura entre las celdas que tiene.
 */
export function repartirLotes(interior: Rect, cantidad: number): Rect[] {
  if (cantidad <= 0) return [];
  const proporcion = interior.ancho / Math.max(interior.fondo, 0.001);
  const columnas = Math.min(cantidad, Math.max(1, Math.round(Math.sqrt(cantidad * proporcion))));
  const filas = Math.ceil(cantidad / columnas);
  const alto = interior.fondo / filas;
  const celdas: Rect[] = [];
  for (let fila = 0; fila < filas; fila++) {
    const enFila = Math.min(columnas, cantidad - fila * columnas);
    const ancho = interior.ancho / enFila;
    for (let c = 0; c < enFila; c++) {
      celdas.push({ x: interior.x + c * ancho, z: interior.z + fila * alto, ancho, fondo: alto });
    }
  }
  return celdas;
}

/** El lado del lote más cercano al borde de la manzana es el que da a la calle. */
export function frenteHaciaCalle(lote: Rect, manzana: Rect): Frente {
  const distancias: [Frente, number][] = [
    ['norte', lote.z - manzana.z],
    ['sur', manzana.z + manzana.fondo - (lote.z + lote.fondo)],
    ['oeste', lote.x - manzana.x],
    ['este', manzana.x + manzana.ancho - (lote.x + lote.ancho)],
  ];
  return distancias.reduce((mejor, d) => (d[1] < mejor[1] - 1e-9 ? d : mejor))[0];
}

const esHorizontal = (s: Segmento) => Math.abs(s.a.z - s.b.z) < 1e-9;

/**
 * Distancia de un punto situado sobre un eje (horizontal o vertical) al cruce más cercano con un eje
 * perpendicular. `tolerancia` alarga los ejes perpendiculares: las calles de un barrio terminan en la
 * acera, a media avenida del eje.
 */
function distanciaACruce(p: Punto, horizontal: boolean, ejes: Segmento[], tolerancia = AVENIDA): number {
  let minima = Infinity;
  for (const s of ejes) {
    if (esHorizontal(s) === horizontal) continue;
    if (horizontal) {
      const [z0, z1] = [Math.min(s.a.z, s.b.z), Math.max(s.a.z, s.b.z)];
      if (p.z >= z0 - tolerancia && p.z <= z1 + tolerancia) minima = Math.min(minima, Math.abs(p.x - s.a.x));
    } else {
      const [x0, x1] = [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)];
      if (p.x >= x0 - tolerancia && p.x <= x1 + tolerancia) minima = Math.min(minima, Math.abs(p.z - s.a.z));
    }
  }
  return minima;
}

/**
 * Tramos de un eje que quedan libres entre cruces, recortando `holgura` a cada lado del cruce
 * (para medianas y marcas viales que no deben invadir las intersecciones).
 */
export function tramosEntreCruces(s: Segmento, ejes: Segmento[], holgura: number, tolerancia = AVENIDA): Segmento[] {
  const horizontal = esHorizontal(s);
  const [inicio, fin] = horizontal ? [Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)] : [Math.min(s.a.z, s.b.z), Math.max(s.a.z, s.b.z)];
  const fijo = horizontal ? s.a.z : s.a.x;
  const cortes: number[] = [];
  for (const e of ejes) {
    if (esHorizontal(e) === horizontal) continue;
    const posicion = horizontal ? e.a.x : e.a.z;
    const [e0, e1] = horizontal ? [Math.min(e.a.z, e.b.z), Math.max(e.a.z, e.b.z)] : [Math.min(e.a.x, e.b.x), Math.max(e.a.x, e.b.x)];
    if (fijo >= e0 - tolerancia && fijo <= e1 + tolerancia && posicion > inicio - 1e-9 && posicion < fin + 1e-9) cortes.push(posicion);
  }
  const limites = [inicio, ...cortes.sort((a, b) => a - b), fin];
  const tramos: Segmento[] = [];
  for (let i = 0; i < limites.length - 1; i++) {
    const desde = limites[i]! + (i === 0 && !cortes.includes(inicio) ? 0 : holgura);
    const hasta = limites[i + 1]! - (i + 1 === limites.length - 1 && !cortes.includes(fin) ? 0 : holgura);
    if (hasta - desde < 0.5) continue;
    tramos.push(horizontal
      ? { a: { x: desde, z: fijo }, b: { x: hasta, z: fijo } }
      : { a: { x: fijo, z: desde }, b: { x: fijo, z: hasta } });
  }
  return tramos;
}

function puntosALoLargo(s: Segmento, paso: number, desplazamiento = 0): Punto[] {
  const largo = longitudSegmento(s);
  const ux = (s.b.x - s.a.x) / largo;
  const uz = (s.b.z - s.a.z) / largo;
  const puntos: Punto[] = [];
  const n = Math.floor(largo / paso);
  const inicio = (largo - n * paso) / 2;
  for (let i = 0; i <= n; i++) {
    const t = inicio + i * paso;
    // Perpendicular al eje: (-uz, ux).
    puntos.push({ x: s.a.x + ux * t - uz * desplazamiento, z: s.a.z + uz * t + ux * desplazamiento });
  }
  return puntos;
}

/** Bulevares: una hilera de árboles en la mediana de cada avenida, sin invadir los cruces. */
function arbolesDeBulevar(avenidas: Segmento[], ejes: Segmento[]): ArbolVisual[] {
  const arboles: ArbolVisual[] = [];
  avenidas.forEach((s, i) => {
    for (const [k, p] of puntosALoLargo(s, 3.6).entries()) {
      if (distanciaACruce(p, esHorizontal(s), ejes) < AVENIDA * 0.9) continue;
      arboles.push({ posicion: p, escala: 0.9 + ((i * 7 + k * 3) % 5) * 0.05, motivo: 'bulevar' });
    }
  });
  return arboles;
}

/** Plazas: un árbol en cada esquina, enmarcando el espacio público. */
function arbolesDePlaza(zonas: ZonaVisual[]): ArbolVisual[] {
  const arboles: ArbolVisual[] = [];
  for (const z of zonas) {
    if (!z.plaza) continue;
    const m = Math.min(1.4, Math.min(z.plaza.ancho, z.plaza.fondo) * 0.18);
    const r = encoger(z.plaza, m);
    for (const p of [
      { x: r.x, z: r.z },
      { x: r.x + r.ancho, z: r.z },
      { x: r.x, z: r.z + r.fondo },
      { x: r.x + r.ancho, z: r.z + r.fondo },
    ]) {
      arboles.push({ posicion: p, escala: 1.05, motivo: 'plaza' });
    }
  }
  return arboles;
}

/**
 * Gramática urbana: arbolado de patio de manzana (jardín interior) y de paseo (en el eje de los
 * pasajes peatonales). Nunca dentro de una huella de edificio.
 */
function arbolesUrbanos(zonas: ZonaVisual[]): ArbolVisual[] {
  const arboles: ArbolVisual[] = [];
  for (const z of zonas) {
    if (z.composicion !== 'urbana') continue;
    for (const p of z.patios) {
      const r = encoger(p, 1.6);
      if (r.ancho < 1 || r.fondo < 1) continue;
      const nx = Math.max(1, Math.floor(r.ancho / 3.4));
      const nz = Math.max(1, Math.floor(r.fondo / 3.4));
      for (let i = 0; i <= nx; i++) {
        for (let j = 0; j <= nz; j++) {
          // Solo el contorno del patio: el centro queda libre como jardín.
          if (i > 0 && i < nx && j > 0 && j < nz) continue;
          arboles.push({ posicion: { x: r.x + (r.ancho * i) / nx, z: r.z + (r.fondo * j) / nz }, escala: 0.95, motivo: 'patio' });
        }
      }
    }
    for (const p of z.pasajes) {
      const largo = Math.max(p.ancho, p.fondo);
      const n = Math.floor(largo / 4.2);
      for (let i = 1; i < n; i++) {
        const t = (largo * i) / n;
        arboles.push({
          posicion: p.ancho >= p.fondo ? { x: p.x + t, z: p.z + p.fondo / 2 } : { x: p.x + p.ancho / 2, z: p.z + t },
          escala: 0.8,
          motivo: 'paseo',
        });
      }
    }
  }
  return arboles;
}

/** Farolas a ambos lados de las avenidas, alternadas. */
function farolasDeAvenida(avenidas: Segmento[], ejes: Segmento[]): Punto[] {
  const farolas: Punto[] = [];
  const borde = AVENIDA / 2 + CALLE / 2 - 0.45;
  for (const s of avenidas) {
    const izquierda = puntosALoLargo(s, 7, -borde);
    const derecha = puntosALoLargo(s, 7, borde);
    izquierda.forEach((p, k) => {
      const q = k % 2 ? derecha[k]! : p;
      if (distanciaACruce(q, esHorizontal(s), ejes) > AVENIDA / 2 + CALLE + 0.6) farolas.push(q);
    });
  }
  return farolas;
}

export const centroZona = (z: ZonaVisual): Punto => centroRect(z.parcela);
