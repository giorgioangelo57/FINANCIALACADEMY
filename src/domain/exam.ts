import type { BloqueExamen, Pregunta, Tema } from '../content/schema.ts';
import { idPregunta } from './practice.ts';

/** Pregunta de examen con su procedencia: concepto, bloque e id estable (para el repaso). */
export interface PreguntaExamen extends Pregunta {
  id: string;
  conceptoId: string;
  bloqueId: string;
  /** La de "Compruébalo" (oficial) o una de práctica de la ampliación. */
  oficial: boolean;
}

/** Todas las preguntas del tema agrupables por bloque: la oficial de cada concepto y las de práctica. */
export function bancoDePreguntas(tema: Tema): PreguntaExamen[] {
  const amp = tema.ampliacion;
  if (!amp) return [];
  const bloqueDe = new Map<string, string>();
  for (const b of amp.bloques) for (const id of b.conceptoIds) bloqueDe.set(id, b.id);
  const oficiales = tema.conceptos
    .filter((c) => bloqueDe.has(c.id))
    .map((c): PreguntaExamen => ({ ...c.pregunta, id: idPregunta(c.id), conceptoId: c.id, bloqueId: bloqueDe.get(c.id)!, oficial: true }));
  const practica = amp.preguntas
    .filter((p) => bloqueDe.has(p.conceptoId))
    .map((p): PreguntaExamen => ({
      enunciado: p.enunciado,
      opciones: p.opciones,
      indiceCorrecta: p.indiceCorrecta,
      explicacion: p.explicacion,
      id: idPregunta(p.conceptoId, p.id),
      conceptoId: p.conceptoId,
      bloqueId: bloqueDe.get(p.conceptoId)!,
      oficial: false,
    }));
  return [...oficiales, ...practica];
}

/**
 * Cuántas preguntas de cada bloque: proporcional a su probabilidad, con redondeo por restos
 * mayores (la suma es exactamente `total`) y sin pedir más de las disponibles.
 */
export function repartoPorBloque(bloques: BloqueExamen[], total: number, disponibles: Record<string, number> = {}): Record<string, number> {
  const suma = bloques.reduce((s, b) => s + b.probabilidad, 0) || 1;
  const exactos = bloques.map((b) => ({ id: b.id, exacto: (b.probabilidad / suma) * total }));
  const reparto: Record<string, number> = {};
  for (const e of exactos) reparto[e.id] = Math.floor(e.exacto);
  let resto = total - Object.values(reparto).reduce((s, n) => s + n, 0);
  for (const e of [...exactos].sort((a, b) => b.exacto - Math.floor(b.exacto) - (a.exacto - Math.floor(a.exacto)))) {
    if (resto <= 0) break;
    reparto[e.id]! += 1;
    resto--;
  }
  // Si un bloque no tiene bastantes preguntas, el sobrante pasa a los bloques con más probabilidad.
  let sobrante = 0;
  for (const b of bloques) {
    const max = disponibles[b.id] ?? Infinity;
    if (reparto[b.id]! > max) {
      sobrante += reparto[b.id]! - max;
      reparto[b.id] = max;
    }
  }
  for (const b of [...bloques].sort((x, y) => y.probabilidad - x.probabilidad)) {
    const max = disponibles[b.id] ?? Infinity;
    const cabe = Math.min(sobrante, max - reparto[b.id]!);
    reparto[b.id]! += cabe;
    sobrante -= cabe;
  }
  return reparto;
}

/** Generador pseudoaleatorio con semilla (mulberry32): mismo simulacro para la misma semilla. */
export function aleatorio(semilla: number): () => number {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}

export interface OpcionesSimulacro {
  total?: number;
  semilla?: number;
}

/**
 * Simulacro del tema: preguntas repartidas por bloque según la predicción, elegidas al azar entre
 * las oficiales y las de práctica (sin repetir) y en orden barajado.
 */
export function construirSimulacro(tema: Tema, { total = 20, semilla = Date.now() }: OpcionesSimulacro = {}): PreguntaExamen[] {
  const bloques = tema.ampliacion?.bloques ?? [];
  const banco = bancoDePreguntas(tema);
  const azar = aleatorio(semilla);
  const disponibles: Record<string, number> = {};
  for (const p of banco) disponibles[p.bloqueId] = (disponibles[p.bloqueId] ?? 0) + 1;
  const reparto = repartoPorBloque(bloques, Math.min(total, banco.length), disponibles);
  const elegidas = bloques.flatMap((b) => barajar(banco.filter((p) => p.bloqueId === b.id), azar).slice(0, reparto[b.id] ?? 0));
  return barajar(elegidas, azar);
}

export interface ResultadoBloque {
  bloqueId: string;
  aciertos: number;
  total: number;
}

export interface CorreccionSimulacro {
  aciertos: number;
  total: number;
  /** Nota sobre 10 con un decimal. */
  nota: number;
  porBloque: ResultadoBloque[];
  fallos: PreguntaExamen[];
}

/** Corrige un simulacro; una respuesta `null` (sin contestar o fuera de tiempo) cuenta como fallo. */
export function corregirSimulacro(preguntas: PreguntaExamen[], respuestas: (number | null)[]): CorreccionSimulacro {
  const porBloque = new Map<string, ResultadoBloque>();
  const fallos: PreguntaExamen[] = [];
  let aciertos = 0;
  preguntas.forEach((p, i) => {
    const r = porBloque.get(p.bloqueId) ?? { bloqueId: p.bloqueId, aciertos: 0, total: 0 };
    r.total++;
    if (respuestas[i] === p.indiceCorrecta) {
      r.aciertos++;
      aciertos++;
    } else fallos.push(p);
    porBloque.set(p.bloqueId, r);
  });
  const total = preguntas.length;
  return { aciertos, total, nota: total ? Math.round((aciertos / total) * 100) / 10 : 0, porBloque: [...porBloque.values()], fallos };
}
