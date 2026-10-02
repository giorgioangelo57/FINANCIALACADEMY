import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { bancoDePreguntas } from '../../src/domain/exam.ts';
import { calificarTarjeta, practicaVacia, registrarRespuesta } from '../../src/domain/practice.ts';
import { construirSesion, intercalar, prioridadBloques, resumenSesion } from '../../src/domain/session.ts';

const HOY = '2026-10-02';
const banco = bancoDePreguntas(tema01);
const tarjetas = tema01.conceptos.map((c) => ({ id: `frase:${c.id}`, conceptoId: c.id }));

describe('sesión de estudio de hoy', () => {
  it('discriminación: identificar un concepto entre otros del mismo bloque, sin repetir opciones', () => {
    const s = construirSesion(tema01, practicaVacia(), HOY, { semilla: 5 });
    const ids = s.filter((i) => i.tipo === 'identifica');
    expect(ids.length).toBe(3);
    for (const i of ids) {
      if (i.tipo !== 'identifica') continue;
      expect(i.opciones).toHaveLength(3);
      expect(new Set(i.opciones).size).toBe(3);
      expect(i.opciones).toContain(i.conceptoId);
      const bloque = tema01.ampliacion!.bloques.find((b) => b.conceptoIds.includes(i.conceptoId))!;
      // Si el bloque tiene al menos 3 conceptos, los distractores son del mismo bloque.
      if (bloque.conceptoIds.length >= 3) for (const o of i.opciones) expect(bloque.conceptoIds).toContain(o);
    }
  });

  it('sin historial: 15 preguntas nuevas y algunas tarjetas, sin repetir', () => {
    const s = construirSesion(tema01, practicaVacia(), HOY, { semilla: 3, tarjetas });
    expect(s).toHaveLength(15);
    const r = resumenSesion(s);
    expect(r.repaso).toBe(0);
    expect(r.tarjeta).toBe(3);
    expect(r.identifica).toBe(3);
    expect(r.nueva).toBe(9);
    const ids = s.map((i) => (i.tipo === 'pregunta' ? i.pregunta.id : i.tipo === 'tarjeta' ? i.tarjetaId : `identifica:${i.conceptoId}`));
    expect(new Set(ids).size).toBe(15);
  });

  it('el repaso va primero en prioridad (con tope) y los errores con seguridad delante', () => {
    let p = practicaVacia();
    for (const q of banco.slice(0, 10)) p = registrarRespuesta(p, { id: q.id, conceptoId: q.conceptoId, correcta: false, hoy: HOY });
    const sorpresa = banco[20]!;
    p = registrarRespuesta(p, { id: sorpresa.id, conceptoId: sorpresa.conceptoId, correcta: false, confianza: 'seguro', hoy: HOY });
    const s = construirSesion(tema01, p, HOY, { semilla: 1 });
    const repasos = s.filter((i) => i.motivo === 'repaso');
    expect(repasos).toHaveLength(6); // 40 % de 15
    expect(repasos.some((i) => i.tipo === 'pregunta' && i.pregunta.id === sorpresa.id)).toBe(true);
  });

  it('incluye las preguntas cuyo repaso espaciado vence hoy', () => {
    const q = banco[5]!;
    // Acertada con seguridad ayer: vence hoy (caja 1, 1 día).
    const p = registrarRespuesta(practicaVacia(), { id: q.id, conceptoId: q.conceptoId, correcta: true, confianza: 'seguro', hoy: '2026-10-01' });
    const s = construirSesion(tema01, p, HOY);
    expect(s.some((i) => i.motivo === 'espaciada' && i.tipo === 'pregunta' && i.pregunta.id === q.id)).toBe(true);
  });

  it('las nuevas se reparten según la prioridad: más del bloque que más pesa y menos se sabe', () => {
    const cuenta: Record<string, number> = {};
    for (let sem = 1; sem <= 40; sem++) {
      for (const i of construirSesion(tema01, practicaVacia(), HOY, { semilla: sem })) {
        if (i.tipo === 'pregunta') cuenta[i.pregunta.bloqueId] = (cuenta[i.pregunta.bloqueId] ?? 0) + 1;
      }
    }
    expect(cuenta.intermediarios!).toBeGreaterThan(cuenta.basicos!);
    // Con un bloque dominado, su prioridad baja.
    const dom = (id: string) => (tema01.ampliacion!.bloques[0]!.conceptoIds.includes(id) ? 1 : 0);
    const pr = prioridadBloques(tema01, practicaVacia(), dom);
    expect(pr.intermediarios).toBeCloseTo(3);
    expect(pr.supervisores).toBe(25);
  });

  it('intercala: nunca dos seguidas del mismo concepto si hay alternativa', () => {
    const s = construirSesion(tema01, practicaVacia(), HOY, { semilla: 9, tamano: 30, tarjetas });
    const conceptos = s.map((i) => (i.tipo === 'pregunta' ? i.pregunta.conceptoId : i.conceptoId));
    for (let k = 1; k < conceptos.length; k++) expect(conceptos[k]).not.toBe(conceptos[k - 1]);
    const q = banco.filter((x) => x.conceptoId === 'fgd').slice(0, 2);
    const otro = banco.find((x) => x.conceptoId === 'bce')!;
    const orden = intercalar([...q, otro].map((pregunta) => ({ tipo: 'pregunta' as const, pregunta, motivo: 'nueva' as const })));
    expect(orden.map((i) => (i.tipo === 'pregunta' ? i.pregunta.conceptoId : ''))).toEqual(['fgd', 'bce', 'fgd']);
  });

  it('todo visto y al día: completa con lo que más tiempo lleva sin repasar', () => {
    let p = practicaVacia();
    for (const q of banco) p = registrarRespuesta(p, { id: q.id, conceptoId: q.conceptoId, correcta: true, confianza: 'seguro', hoy: HOY });
    for (const t of tarjetas) p = calificarTarjeta(p, t.id, true, HOY);
    const s = construirSesion(tema01, p, HOY, { tarjetas });
    expect(s).toHaveLength(15);
    expect(s.every((i) => i.motivo === 'espaciada' || i.motivo === 'identifica')).toBe(true);
  });
});
