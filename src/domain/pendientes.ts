import type { Tema } from '../content/schema.ts';
import { bancoDePreguntas } from './exam.ts';
import { type Practica, preguntasVencidas } from './practice.ts';

/*
 * Lo que cada concepto tiene pendiente de repaso hoy. Es lo que enciende la ciudad de noche
 * (modo repaso): solo cuenta lo que YA se ha practicado y toca volver a ver, nunca lo nuevo
 * (eso es aprender, el modo día).
 *  - fallos: preguntas falladas que aún no se han acertado 2 veces seguidas;
 *  - sorpresas: de esas, las falladas con "Seguro" (se repasan primero);
 *  - vencidas: preguntas acertadas cuyo repaso espaciado vence hoy;
 *  - tarjetas: flashcards ya vistas cuyo repaso vence hoy.
 */

export interface PendienteConcepto {
  fallos: number;
  sorpresas: number;
  vencidas: number;
  tarjetas: number;
  total: number;
}

export function pendientesPorConcepto(
  tema: Tema,
  p: Practica,
  hoy: string,
  tarjetas: readonly { id: string; conceptoId: string }[],
): Map<string, PendienteConcepto> {
  const conceptoDe = new Map(bancoDePreguntas(tema).map((q) => [q.id, q.conceptoId]));
  const r = new Map<string, PendienteConcepto>();
  const de = (id: string) => {
    let e = r.get(id);
    if (!e) {
      e = { fallos: 0, sorpresas: 0, vencidas: 0, tarjetas: 0, total: 0 };
      r.set(id, e);
    }
    return e;
  };
  for (const [id, f] of Object.entries(p.fallos)) {
    const c = conceptoDe.get(id);
    if (!c) continue;
    const e = de(c);
    e.fallos++;
    if (f.sorpresa) e.sorpresas++;
  }
  for (const id of preguntasVencidas(p, hoy)) {
    const c = conceptoDe.get(id);
    // Una pregunta en el repaso de fallos ya cuenta como fallo.
    if (c && !p.fallos[id]) de(c).vencidas++;
  }
  for (const t of tarjetas) {
    const e = p.tarjetas[t.id];
    if (e && e.proxima <= hoy) de(t.conceptoId).tarjetas++;
  }
  for (const e of r.values()) e.total = e.fallos + e.vencidas + e.tarjetas;
  return r;
}

/** Texto corto de lo pendiente: "2 fallos · 1 tarjeta". */
export function resumenPendiente(e: PendienteConcepto): string {
  const partes: string[] = [];
  if (e.fallos) partes.push(`${e.fallos} ${e.fallos === 1 ? 'fallo' : 'fallos'}`);
  if (e.vencidas) partes.push(`${e.vencidas} ${e.vencidas === 1 ? 'pregunta' : 'preguntas'} por repasar`);
  if (e.tarjetas) partes.push(`${e.tarjetas} ${e.tarjetas === 1 ? 'tarjeta' : 'tarjetas'}`);
  return partes.join(' · ');
}
