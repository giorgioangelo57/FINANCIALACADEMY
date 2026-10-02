import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { bancoDePreguntas } from '../../src/domain/exam.ts';
import { pendientesPorConcepto, resumenPendiente } from '../../src/domain/pendientes.ts';
import { calificarTarjeta, practicaVacia, registrarRespuesta } from '../../src/domain/practice.ts';

const HOY = '2026-10-02';
const banco = bancoDePreguntas(tema01);
const tarjetas = tema01.conceptos.map((c) => ({ id: `frase:${c.id}`, conceptoId: c.id }));

describe('lo pendiente de repaso por concepto (modo noche)', () => {
  it('sin práctica no hay nada pendiente (lo nuevo es aprender, no repasar)', () => {
    expect(pendientesPorConcepto(tema01, practicaVacia(), HOY, tarjetas).size).toBe(0);
  });

  it('cuenta fallos, errores con seguridad, preguntas vencidas y tarjetas vencidas', () => {
    const [q1, q2] = banco.filter((q) => q.conceptoId === 'bde');
    let p = practicaVacia();
    p = registrarRespuesta(p, { id: q1!.id, conceptoId: 'bde', correcta: false, hoy: HOY });
    p = registrarRespuesta(p, { id: q2!.id, conceptoId: 'bde', correcta: false, confianza: 'seguro', hoy: HOY });
    // Acertada ayer con seguridad: su repaso vence hoy.
    const qf = banco.find((q) => q.conceptoId === 'fgd')!;
    p = registrarRespuesta(p, { id: qf.id, conceptoId: 'fgd', correcta: true, confianza: 'seguro', hoy: '2026-10-01' });
    // Tarjeta vista y fallada ayer: vuelve hoy.
    p = calificarTarjeta(p, 'frase:ico', false, '2026-10-01');
    const r = pendientesPorConcepto(tema01, p, HOY, tarjetas);
    expect(r.get('bde')).toMatchObject({ fallos: 2, sorpresas: 1, total: 2 });
    expect(r.get('fgd')).toMatchObject({ vencidas: 1, total: 1 });
    expect(r.get('ico')).toMatchObject({ tarjetas: 1, total: 1 });
    expect(resumenPendiente(r.get('bde')!)).toBe('2 fallos');
    expect(resumenPendiente({ fallos: 1, sorpresas: 0, vencidas: 2, tarjetas: 1, total: 4 })).toBe('1 fallo · 2 preguntas por repasar · 1 tarjeta');
  });
});
