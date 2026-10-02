import type { GlyphName } from '../icons/glyphs.ts';

export interface TemaMeta {
  numero: number;
  titulo: string;
  ciudad: string;
  fuente: string;
}

export interface Grupo {
  id: string;
  titulo: string;
}

export interface Seccion {
  id: string;
  grupoId: string;
  titulo: string;
  /** Peso estimado en examen, en puntos porcentuales. */
  pesoExamen: number;
  descripcion: string;
}

/** Cada modo corresponde, por posición, a una entrada de `Concepto.explicaciones`. */
export interface ModoExplicacion {
  etiqueta: string;
  formato: 'texto' | 'esquema';
}

export interface Pregunta {
  enunciado: string;
  opciones: string[];
  indiceCorrecta: number;
  explicacion: string;
}

export interface Concepto {
  id: string;
  seccionId: string;
  nombre: string;
  /** El primero es el glifo principal; los siguientes, insignias (máximo 2 se dibujan). */
  iconos: [GlyphName, ...GlyphName[]];
  color: string;
  /** HTML de confianza (puede contener <b>). */
  definicion: string;
  ejemploReal: string;
  explicaciones: string[];
  trampaExamen: string;
  pregunta: Pregunta;
}

export type TipoTejado = 'fronton' | 'bandera' | 'ruina' | 'granero' | 'cupula' | 'antena' | 'plano';

export interface EdificioCiudad {
  conceptoId: string;
  altura: number;
  tejado: TipoTejado;
}

export interface Tema {
  meta: TemaMeta;
  grupos: Grupo[];
  secciones: Seccion[];
  modos: ModoExplicacion[];
  conceptos: Concepto[];
  ciudad: { edificios: EdificioCiudad[] };
  /** Material añadido a partir de los apuntes (opcional; no forma parte de DATA). */
  ampliacion?: AmpliacionTema;
}

/*
 * Ampliación del tema: material de estudio añadido a partir de los apuntes del alumno. Vive aparte
 * de DATA (que conserva la paridad literal con el prototipo) y no altera el cálculo del dominio:
 * las preguntas extra son de práctica.
 */

/** Bloque temático del examen con su probabilidad estimada (dato de los apuntes, no de DATA). */
export interface BloqueExamen {
  id: string;
  titulo: string;
  /** Probabilidad estimada de aparecer en el examen, en %. Los bloques suman 100. */
  probabilidad: number;
  /** Cómo suele preguntarse. */
  formato: string;
  conceptoIds: string[];
  /** "Qué te preguntarán con total seguridad". */
  claves: string[];
}

export interface PreguntaExtra extends Pregunta {
  id: string;
  conceptoId: string;
}

export interface Flashcard {
  id: string;
  conceptoId: string;
  anverso: string;
  reverso: string;
}

/** Esquema desplegable: un árbol de nodos con texto breve. */
export interface NodoEsquema {
  texto: string;
  hijos?: NodoEsquema[];
}

export interface EsquemaConcepto {
  conceptoId: string;
  titulo: string;
  raiz: NodoEsquema;
}

/** Un participante de una infografía, colocado en % del lienzo (x: 0–100 izq.→der., y: 0–100 arriba→abajo). */
export interface ActorInfografia {
  id: string;
  etiqueta: string;
  icono: string;
  x: number;
  y: number;
}

/** Recuadro que agrupa actores (p. ej. SEBC ⊃ Eurosistema), en % del lienzo. */
export interface GrupoInfografia {
  etiqueta: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/** Qué viaja por una flecha: decide el color y el símbolo que se mueve. */
export type TipoFlujo = 'dinero' | 'riesgo' | 'documento' | 'garantia' | 'supervision' | 'prohibido';

export interface FlujoInfografia {
  desde: string;
  hacia: string;
  etiqueta: string;
  tipo: TipoFlujo;
}

/** Un paso: lo que se cuenta y qué actores, flechas y grupos se destacan. */
export interface PasoInfografia {
  texto: string;
  actores: string[];
  /** Índices de `flujos` que se animan en este paso (los de pasos anteriores quedan tenues). */
  flujos: number[];
  grupos?: number[];
}

/**
 * Infografía animada paso a paso de un concepto difícil. Los textos salen de DATA y de los apuntes
 * del alumno; no se añaden datos nuevos.
 */
export interface Infografia {
  id: string;
  conceptoIds: string[];
  titulo: string;
  actores: ActorInfografia[];
  grupos?: GrupoInfografia[];
  flujos: FlujoInfografia[];
  pasos: PasoInfografia[];
}

export interface AmpliacionTema {
  fuente: string;
  bloques: BloqueExamen[];
  preguntas: PreguntaExtra[];
  flashcards: Flashcard[];
  esquemas: EsquemaConcepto[];
  infografias?: Infografia[];
}
