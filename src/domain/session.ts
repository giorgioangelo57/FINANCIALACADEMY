import type { Tema } from '../content/schema.ts';
import { aleatorio, bancoDePreguntas, type PreguntaExamen } from './exam.ts';
import { type Practica, preguntasVencidas, tarjetasPendientes } from './practice.ts';

/**
 * Sesión de estudio de hoy: práctica de recuperación espaciada e intercalada, priorizada por lo que
 * más cae y menos se domina. Evidencia y criterios: `docs/metodos-estudio.md`.
 */

export type MotivoSesion = 'repaso' | 'espaciada' | 'nueva' | 'tarjeta' | 'identifica';

export type ItemSesion =
  | { tipo: 'pregunta'; pregunta: PreguntaExamen; motivo: Exclude<MotivoSesion, 'tarjeta'> }
  | { tipo: 'tarjeta'; tarjetaId: string; conceptoId: string; motivo: 'tarjeta' }
  /** "¿A qué concepto corresponde esta definición?": opciones del mismo bloque (discriminación). */
  | { tipo: 'identifica'; conceptoId: string; opciones: string[]; motivo: 'identifica' };

export interface OpcionesSesion {
  /** Número de elementos de la sesión (≈ 1 minuto cada uno). */
  tamano?: number;
  semilla?: number;
  /** Dominio de cada concepto (0–1), para priorizar lo que menos se sabe. */
  dominio?: (conceptoId: string) => number;
  /** Ids de todas las tarjetas, con su concepto, en orden. */
  tarjetas?: { id: string; conceptoId: string }[];
}

/** Proporciones máximas de la sesión. */
export const CUOTA = { repaso: 0.4, tarjetas: 0.2, identifica: 0.2 };

/**
 * Prioridad de cada bloque: probabilidad en el examen × lo que falta por saber (mezcla del dominio
 * de "Compruébalo" y del acierto en la práctica).
 */
export function prioridadBloques(tema: Tema, p: Practica, dominio: (id: string) => number = () => 0): Record<string, number> {
  const res: Record<string, number> = {};
  for (const b of tema.ampliacion?.bloques ?? []) {
    const ids = b.conceptoIds;
    const dom = ids.reduce((s, id) => s + dominio(id), 0) / (ids.length || 1);
    const r = ids.reduce((acc, id) => ({ a: acc.a + (p.conceptos[id]?.aciertos ?? 0), t: acc.t + (p.conceptos[id]?.total ?? 0) }), { a: 0, t: 0 });
    const acierto = r.t ? r.a / r.t : 0;
    const sabe = r.t ? (dom + acierto) / 2 : dom;
    // Nunca 0: incluso lo dominado aparece de vez en cuando (repaso de mantenimiento).
    res[b.id] = b.probabilidad * Math.max(0.1, 1 - sabe);
  }
  return res;
}

/** Ordena para intercalar: evita dos seguidos del mismo concepto y, si se puede, del mismo bloque. */
export function intercalar(items: ItemSesion[]): ItemSesion[] {
  const pendientes = [...items];
  const res: ItemSesion[] = [];
  const concepto = (x: ItemSesion) => (x.tipo === 'pregunta' ? x.pregunta.conceptoId : x.conceptoId);
  const bloque = (x: ItemSesion) => (x.tipo === 'pregunta' ? x.pregunta.bloqueId : '');
  while (pendientes.length) {
    const prev = res[res.length - 1];
    let k = prev ? pendientes.findIndex((x) => concepto(x) !== concepto(prev) && (!bloque(x) || bloque(x) !== bloque(prev))) : 0;
    if (k < 0 && prev) k = pendientes.findIndex((x) => concepto(x) !== concepto(prev));
    if (k < 0) k = 0;
    res.push(pendientes.splice(k, 1)[0]!);
  }
  return res;
}

export function construirSesion(tema: Tema, p: Practica, hoy: string, opciones: OpcionesSesion = {}): ItemSesion[] {
  const { tamano = 15, semilla = 1, dominio = () => 0, tarjetas = [] } = opciones;
  const azar = aleatorio(semilla);
  const banco = bancoDePreguntas(tema);
  const porId = new Map(banco.map((q) => [q.id, q]));
  const usadas = new Set<string>();
  const items: ItemSesion[] = [];
  const meter = (q: PreguntaExamen | undefined, motivo: 'repaso' | 'espaciada' | 'nueva') => {
    if (!q || usadas.has(q.id) || items.length >= tamano) return;
    usadas.add(q.id);
    items.push({ tipo: 'pregunta', pregunta: q, motivo });
  };

  // 1. Repaso: primero los errores con seguridad, luego lo más fallado.
  const fallos = Object.entries(p.fallos)
    .filter(([id]) => porId.has(id))
    .sort(([, a], [, b]) => Number(Boolean(b.sorpresa)) - Number(Boolean(a.sorpresa)) || b.veces - a.veces)
    .slice(0, Math.round(tamano * CUOTA.repaso));
  for (const [id] of fallos) meter(porId.get(id), 'repaso');

  // 2. Repetición espaciada: preguntas cuyo intervalo vence hoy.
  for (const id of preguntasVencidas(p, hoy)) meter(porId.get(id), 'espaciada');

  // 3. Tarjetas que tocan hoy (pocas: la sesión es sobre todo de preguntas).
  const conceptoTarjeta = new Map(tarjetas.map((t) => [t.id, t.conceptoId]));
  const huecoTarjetas = Math.min(Math.round(tamano * CUOTA.tarjetas), tamano - items.length);
  for (const id of tarjetasPendientes(tarjetas.map((t) => t.id), p, hoy).slice(0, Math.max(0, huecoTarjetas))) {
    items.push({ tipo: 'tarjeta', tarjetaId: id, conceptoId: conceptoTarjeta.get(id) ?? '', motivo: 'tarjeta' });
  }

  const prioridad = prioridadBloques(tema, p, dominio);

  // 4. Discriminación: identificar un concepto por su definición entre otros del mismo bloque
  //    (los que más se confunden). Se eligen los de más prioridad y menos dominio.
  const bloques = tema.ampliacion?.bloques ?? [];
  const huecoIdentifica = Math.min(Math.round(tamano * CUOTA.identifica), tamano - items.length);
  const candidatos = bloques
    .flatMap((b) => b.conceptoIds.map((id) => ({ id, b, peso: (prioridad[b.id] ?? 0.1) * (1.05 - dominio(id)) * (0.5 + azar()) })))
    .sort((x, y) => y.peso - x.peso);
  const yaIdentifica = new Set<string>();
  for (const c of candidatos) {
    if (yaIdentifica.size >= Math.max(0, huecoIdentifica)) break;
    if (yaIdentifica.has(c.id)) continue;
    const mismos = c.b.conceptoIds.filter((x) => x !== c.id);
    const otros = bloques.flatMap((b) => b.conceptoIds).filter((x) => x !== c.id && !mismos.includes(x));
    const distractores = [...barajarCon(mismos, azar), ...barajarCon(otros, azar)].slice(0, 2);
    if (distractores.length < 2) continue;
    yaIdentifica.add(c.id);
    items.push({ tipo: 'identifica', conceptoId: c.id, opciones: barajarCon([c.id, ...distractores], azar), motivo: 'identifica' });
  }

  // 5. Nuevas: sin ver nunca, elegidas por bloque según la prioridad (muestreo ponderado).
  const nuevasPorBloque = new Map<string, PreguntaExamen[]>();
  for (const q of banco) {
    if (p.preguntas[q.id] || usadas.has(q.id)) continue;
    const lista = nuevasPorBloque.get(q.bloqueId) ?? [];
    lista.push(q);
    nuevasPorBloque.set(q.bloqueId, lista);
  }
  // Dentro de cada bloque, primero los conceptos menos dominados; a igualdad, al azar.
  for (const [b, lista] of nuevasPorBloque) {
    nuevasPorBloque.set(
      b,
      lista.map((q) => ({ q, r: azar() })).sort((x, y) => dominio(x.q.conceptoId) - dominio(y.q.conceptoId) || x.r - y.r).map((x) => x.q),
    );
  }
  while (items.length < tamano) {
    const disponibles = [...nuevasPorBloque.entries()].filter(([, l]) => l.length);
    if (!disponibles.length) break;
    const total = disponibles.reduce((s, [b]) => s + (prioridad[b] ?? 0.1), 0);
    let x = azar() * total;
    let elegido = disponibles[0]![0];
    for (const [b] of disponibles) {
      x -= prioridad[b] ?? 0.1;
      if (x <= 0) {
        elegido = b;
        break;
      }
    }
    meter(nuevasPorBloque.get(elegido)!.shift(), 'nueva');
  }

  // 6. Si todo está visto y al día, se completa con lo que más tiempo lleva sin repasar.
  if (items.length < tamano) {
    const porFecha = Object.entries(p.preguntas).sort((a, b) => a[1].proxima.localeCompare(b[1].proxima));
    for (const [id] of porFecha) meter(porId.get(id), 'espaciada');
  }
  return intercalar(items);
}

/** Resumen de una sesión para mostrarla antes de empezar. */
export function resumenSesion(items: ItemSesion[]): Record<MotivoSesion, number> {
  const r: Record<MotivoSesion, number> = { repaso: 0, espaciada: 0, nueva: 0, tarjeta: 0, identifica: 0 };
  for (const i of items) r[i.motivo]++;
  return r;
}

function barajarCon<T>(lista: T[], azar: () => number): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1));
    [copia[i], copia[j]] = [copia[j]!, copia[i]!];
  }
  return copia;
}
