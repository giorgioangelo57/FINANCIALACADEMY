/**
 * Práctica persistente de un tema: preguntas falladas (para repasarlas), repetición espaciada de
 * flashcards y preguntas (Leitner), confianza y calibración, actividad diaria y notas de los
 * simulacros. No afecta al dominio. Métodos y evidencia: `docs/metodos-estudio.md`.
 */

/** Seguridad declarada antes de ver la corrección (metacognición). */
export type Confianza = 'seguro' | 'dudo' | 'adivino';
export const CONFIANZAS: Confianza[] = ['seguro', 'dudo', 'adivino'];

export interface EstadoFallo {
  /** Veces que se ha fallado. */
  veces: number;
  /** Aciertos seguidos desde el último fallo. */
  racha: number;
  /** Fecha (AAAA-MM-DD) del último fallo. */
  ultima: string;
  /** Fallada con "Seguro": error sorpresa, se repasa primero (efecto de hipercorrección). */
  sorpresa?: boolean;
  /** Acertada sin seguridad ("Dudo" o "Adivino"): aún no se sabe. */
  dudosa?: boolean;
}

export interface Recuento {
  aciertos: number;
  total: number;
}

export interface EstadoTarjeta {
  /** Caja de Leitner: 0 (nueva o fallada) … 4 (bien sabida). */
  caja: number;
  /** Fecha (AAAA-MM-DD) a partir de la que vuelve a tocar. */
  proxima: string;
  /** Fecha (AAAA-MM-DD) en que se vio por primera vez (cuenta para el cupo de nuevas del día). */
  inicio: string;
}

export interface ResultadoSimulacroGuardado {
  fecha: string;
  aciertos: number;
  total: number;
}

export interface Practica {
  fallos: Record<string, EstadoFallo>;
  tarjetas: Record<string, EstadoTarjeta>;
  simulacros: ResultadoSimulacroGuardado[];
  /** Repetición espaciada de las preguntas (misma mecánica que las tarjetas). */
  preguntas: Record<string, EstadoTarjeta>;
  /** Aciertos según la confianza declarada (calibración). */
  calibracion: Record<Confianza, Recuento>;
  /** Respuestas por día (AAAA-MM-DD), para la racha y la actividad. */
  actividad: Record<string, Recuento>;
  /** Aciertos por concepto en la práctica (para el acierto por bloque). */
  conceptos: Record<string, Recuento>;
  /** Fecha del examen (AAAA-MM-DD), si se ha indicado: ajusta los intervalos de repaso. */
  fechaExamen?: string;
}

const recuentoVacio = (): Recuento => ({ aciertos: 0, total: 0 });

export const practicaVacia = (): Practica => ({
  fallos: {},
  tarjetas: {},
  simulacros: [],
  preguntas: {},
  calibracion: { seguro: recuentoVacio(), dudo: recuentoVacio(), adivino: recuentoVacio() },
  actividad: {},
  conceptos: {},
});

/** Aciertos seguidos que hacen falta para que una pregunta salga del repaso. */
export const ACIERTOS_PARA_SALIR = 2;
/** Días hasta la siguiente vez, según la caja (0 = hoy mismo). */
export const INTERVALOS = [0, 1, 3, 7, 14];
/** Tarjetas nuevas que entran cada día (las demás esperan). */
export const NUEVAS_POR_DIA = 10;
export const SIMULACROS_GUARDADOS = 10;
/** Días de actividad que se guardan. */
export const DIAS_ACTIVIDAD = 90;
/**
 * Con fecha de examen, ningún intervalo supera esta fracción del tiempo que falta: el intervalo
 * óptimo ronda el 10–20 % del plazo hasta el examen (Cepeda et al., 2008).
 */
export const FRACCION_HASTA_EXAMEN = 0.2;

/** Id estable de una pregunta: la oficial del concepto o la de práctica. */
export const idPregunta = (conceptoId: string, idExtra?: string): string => idExtra ?? `oficial:${conceptoId}`;
/** Id de la tarjeta de DATA de un concepto (nombre → frase de examen). */
export const idTarjetaFrase = (conceptoId: string): string => `frase:${conceptoId}`;

/** Fecha local AAAA-MM-DD. */
export function fechaDe(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split('-').map(Number);
  return fechaDe(new Date(a!, m! - 1, d! + dias));
}

/** Días de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: string, hasta: string): number {
  const f = (x: string) => {
    const [a, m, d] = x.split('-').map(Number);
    return Date.UTC(a!, m! - 1, d!);
  };
  return Math.round((f(hasta) - f(desde)) / 86_400_000);
}

/** Intervalo de una caja, acortado si hay examen cerca (nunca más del 20 % de lo que queda). */
export function intervaloAjustado(caja: number, hoy: string, fechaExamen?: string): number {
  const base = INTERVALOS[Math.min(caja, INTERVALOS.length - 1)]!;
  if (!fechaExamen) return base;
  const quedan = diasEntre(hoy, fechaExamen);
  if (quedan <= 0) return base;
  return Math.min(base, Math.max(base === 0 ? 0 : 1, Math.floor(quedan * FRACCION_HASTA_EXAMEN)));
}

export function registrarFallo(p: Practica, id: string, hoy: string): Practica {
  const previo = p.fallos[id];
  return { ...p, fallos: { ...p.fallos, [id]: { veces: (previo?.veces ?? 0) + 1, racha: 0, ultima: hoy } } };
}

/** Un acierto solo cuenta si la pregunta estaba en el repaso; con 2 seguidos, sale de él. */
export function registrarAcierto(p: Practica, id: string): Practica {
  const previo = p.fallos[id];
  if (!previo) return p;
  const fallos = { ...p.fallos };
  if (previo.racha + 1 >= ACIERTOS_PARA_SALIR) delete fallos[id];
  else fallos[id] = { ...previo, racha: previo.racha + 1 };
  return { ...p, fallos };
}

export function calificarTarjeta(p: Practica, id: string, sabia: boolean, hoy: string): Practica {
  const previa = p.tarjetas[id];
  const caja = sabia ? Math.min(INTERVALOS.length - 1, (previa?.caja ?? 0) + 1) : 0;
  return { ...p, tarjetas: { ...p.tarjetas, [id]: { caja, proxima: sumarDias(hoy, intervaloAjustado(caja, hoy, p.fechaExamen)), inicio: previa?.inicio ?? hoy } } };
}

export interface Respuesta {
  /** Id estable de la pregunta (`idPregunta`). */
  id: string;
  conceptoId?: string;
  correcta: boolean;
  confianza?: Confianza;
  hoy: string;
  /** `false`: solo cuenta para la calibración y la actividad (no entra al repaso ni al espaciado). */
  repaso?: boolean;
}

const sumar = (r: Recuento | undefined, acierto: boolean): Recuento => ({ aciertos: (r?.aciertos ?? 0) + (acierto ? 1 : 0), total: (r?.total ?? 0) + 1 });

/**
 * Registra una respuesta de práctica:
 * - repaso: un fallo entra (con "Seguro" es sorpresa); un acierto dudoso también entra; un acierto
 *   seguro cuenta para salir;
 * - repetición espaciada de la pregunta: acierto seguro sube de caja, dudoso se queda, adivinado o
 *   fallo vuelve a la caja 0;
 * - calibración, actividad del día y acierto por concepto.
 */
export function registrarRespuesta(p: Practica, r: Respuesta): Practica {
  const { id, correcta, confianza, hoy } = r;
  let n: Practica = p;
  if (r.repaso === false) {
    const calibracion = confianza ? { ...n.calibracion, [confianza]: sumar(n.calibracion[confianza], correcta) } : n.calibracion;
    const actividad = recortarActividad({ ...n.actividad, [hoy]: sumar(n.actividad[hoy], correcta) });
    const conceptos = r.conceptoId ? { ...n.conceptos, [r.conceptoId]: sumar(n.conceptos[r.conceptoId], correcta) } : n.conceptos;
    return { ...n, calibracion, actividad, conceptos };
  }
  if (!correcta) {
    n = registrarFallo(n, id, hoy);
    if (confianza === 'seguro') n = { ...n, fallos: { ...n.fallos, [id]: { ...n.fallos[id]!, sorpresa: true } } };
  } else if (confianza === 'dudo' || confianza === 'adivino') {
    const previo = n.fallos[id];
    n = { ...n, fallos: { ...n.fallos, [id]: { veces: previo?.veces ?? 0, racha: 0, ultima: previo?.ultima ?? hoy, dudosa: true, ...(previo?.sorpresa ? { sorpresa: true } : {}) } } };
  } else {
    n = registrarAcierto(n, id);
  }
  const previa = n.preguntas[id];
  const cajaPrevia = previa?.caja ?? 0;
  const caja = !correcta || confianza === 'adivino' ? 0 : confianza === 'dudo' ? Math.max(1, cajaPrevia) : Math.min(INTERVALOS.length - 1, cajaPrevia + 1);
  const preguntas = { ...n.preguntas, [id]: { caja, proxima: sumarDias(hoy, intervaloAjustado(caja, hoy, n.fechaExamen)), inicio: previa?.inicio ?? hoy } };
  const calibracion = confianza ? { ...n.calibracion, [confianza]: sumar(n.calibracion[confianza], correcta) } : n.calibracion;
  const actividad = recortarActividad({ ...n.actividad, [hoy]: sumar(n.actividad[hoy], correcta) });
  const conceptos = r.conceptoId ? { ...n.conceptos, [r.conceptoId]: sumar(n.conceptos[r.conceptoId], correcta) } : n.conceptos;
  return { ...n, preguntas, calibracion, actividad, conceptos };
}

function recortarActividad(a: Record<string, Recuento>): Record<string, Recuento> {
  const dias = Object.keys(a).sort();
  if (dias.length <= DIAS_ACTIVIDAD) return a;
  const quedan = dias.slice(-DIAS_ACTIVIDAD);
  return Object.fromEntries(quedan.map((d) => [d, a[d]!]));
}

/** Preguntas cuyo repaso espaciado toca hoy (las vencidas). */
export function preguntasVencidas(p: Practica, hoy: string): string[] {
  return Object.entries(p.preguntas)
    .filter(([, e]) => e.proxima <= hoy)
    .sort((a, b) => a[1].caja - b[1].caja || a[1].proxima.localeCompare(b[1].proxima))
    .map(([id]) => id);
}

/** Días seguidos con alguna respuesta, contando hacia atrás desde hoy (o desde ayer si hoy aún no). */
export function racha(p: Practica, hoy: string): number {
  let dia = p.actividad[hoy]?.total ? hoy : sumarDias(hoy, -1);
  let n = 0;
  while (p.actividad[dia]?.total) {
    n++;
    dia = sumarDias(dia, -1);
  }
  return n;
}

export function fijarFechaExamen(p: Practica, fecha: string | undefined): Practica {
  const n = { ...p };
  if (fecha) n.fechaExamen = fecha;
  else delete n.fechaExamen;
  return n;
}

/**
 * Tarjetas que tocan hoy: las ya vistas cuya fecha ha llegado y, además, nuevas (en el orden dado)
 * hasta completar el cupo del día (`nuevas` menos las que ya se empezaron hoy).
 */
export function tarjetasPendientes(ids: string[], p: Practica, hoy: string, nuevas = NUEVAS_POR_DIA): string[] {
  const vencidas = ids.filter((id) => p.tarjetas[id] && p.tarjetas[id]!.proxima <= hoy);
  const empezadasHoy = Object.values(p.tarjetas).filter((t) => t.inicio === hoy).length;
  const sinVer = ids.filter((id) => !p.tarjetas[id]).slice(0, Math.max(0, nuevas - empezadasHoy));
  return [...vencidas, ...sinVer];
}

export function registrarSimulacro(p: Practica, r: ResultadoSimulacroGuardado): Practica {
  return { ...p, simulacros: [...p.simulacros, r].slice(-SIMULACROS_GUARDADOS) };
}

/** Normaliza lo leído del almacenamiento: descarta lo que no tiene la forma esperada. */
export function sanearPractica(crudo: unknown): Practica {
  const p = practicaVacia();
  if (!crudo || typeof crudo !== 'object') return p;
  const c = crudo as Partial<Practica>;
  const esFecha = (f: unknown): f is string => typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f);
  for (const [id, f] of Object.entries(c.fallos ?? {})) {
    if (f && Number.isFinite(f.veces) && Number.isFinite(f.racha) && esFecha(f.ultima)) p.fallos[id] = { veces: f.veces, racha: f.racha, ultima: f.ultima };
  }
  for (const [id, t] of Object.entries(c.tarjetas ?? {})) {
    if (t && Number.isInteger(t.caja) && t.caja >= 0 && t.caja < INTERVALOS.length && esFecha(t.proxima)) {
      p.tarjetas[id] = { caja: t.caja, proxima: t.proxima, inicio: esFecha(t.inicio) ? t.inicio : t.proxima };
    }
  }
  if (Array.isArray(c.simulacros)) {
    p.simulacros = c.simulacros
      .filter((s) => s && esFecha(s.fecha) && Number.isFinite(s.aciertos) && Number.isFinite(s.total))
      .slice(-SIMULACROS_GUARDADOS);
  }
  // Campos añadidos después (02/10): si faltan, quedan vacíos.
  for (const [id, f] of Object.entries(c.fallos ?? {})) {
    if (p.fallos[id] && f) {
      if (f.sorpresa === true) p.fallos[id]!.sorpresa = true;
      if (f.dudosa === true) p.fallos[id]!.dudosa = true;
    }
  }
  for (const [id, t] of Object.entries(c.preguntas ?? {})) {
    if (t && Number.isInteger(t.caja) && t.caja >= 0 && t.caja < INTERVALOS.length && esFecha(t.proxima)) {
      p.preguntas[id] = { caja: t.caja, proxima: t.proxima, inicio: esFecha(t.inicio) ? t.inicio : t.proxima };
    }
  }
  const esRecuento = (r: unknown): r is Recuento => {
    const x = r as Recuento;
    return Boolean(x) && Number.isFinite(x.aciertos) && Number.isFinite(x.total) && x.aciertos >= 0 && x.total >= x.aciertos;
  };
  for (const k of CONFIANZAS) if (esRecuento(c.calibracion?.[k])) p.calibracion[k] = { aciertos: c.calibracion[k].aciertos, total: c.calibracion[k].total };
  for (const [dia, r] of Object.entries(c.actividad ?? {})) if (esFecha(dia) && esRecuento(r)) p.actividad[dia] = { aciertos: r.aciertos, total: r.total };
  for (const [id, r] of Object.entries(c.conceptos ?? {})) if (esRecuento(r)) p.conceptos[id] = { aciertos: r.aciertos, total: r.total };
  if (esFecha(c.fechaExamen)) p.fechaExamen = c.fechaExamen;
  return p;
}
