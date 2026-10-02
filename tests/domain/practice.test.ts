import { describe, expect, it } from 'vitest';
import {
  calificarTarjeta,
  diasEntre,
  intervaloAjustado,
  preguntasVencidas,
  racha,
  registrarRespuesta,
  idPregunta,
  practicaVacia,
  registrarAcierto,
  registrarFallo,
  registrarSimulacro,
  sanearPractica,
  sumarDias,
  tarjetasPendientes,
} from '../../src/domain/practice.ts';

const HOY = '2026-10-02';

describe('repaso de fallos', () => {
  it('ids estables de pregunta', () => {
    expect(idPregunta('fgd')).toBe('oficial:fgd');
    expect(idPregunta('fgd', 'fgd-1')).toBe('fgd-1');
  });

  it('un fallo entra en el repaso y sale tras 2 aciertos seguidos', () => {
    let p = registrarFallo(practicaVacia(), 'q1', HOY);
    expect(p.fallos.q1).toEqual({ veces: 1, racha: 0, ultima: HOY });
    p = registrarAcierto(p, 'q1');
    expect(p.fallos.q1?.racha).toBe(1);
    p = registrarFallo(p, 'q1', HOY);
    expect(p.fallos.q1).toEqual({ veces: 2, racha: 0, ultima: HOY });
    p = registrarAcierto(registrarAcierto(p, 'q1'), 'q1');
    expect(p.fallos.q1).toBeUndefined();
  });

  it('acertar una pregunta que no estaba en el repaso no cambia nada', () => {
    const p = practicaVacia();
    expect(registrarAcierto(p, 'q9')).toBe(p);
  });
});

describe('flashcards con repetición espaciada (Leitner)', () => {
  it('sumar días cruza meses', () => {
    expect(sumarDias('2026-10-30', 3)).toBe('2026-11-02');
  });

  it('saberla sube de caja y aplaza; no saberla vuelve a la caja 0 (hoy)', () => {
    let p = calificarTarjeta(practicaVacia(), 't', true, HOY);
    expect(p.tarjetas.t).toEqual({ caja: 1, proxima: '2026-10-03', inicio: HOY });
    p = calificarTarjeta(p, 't', true, '2026-10-03');
    expect(p.tarjetas.t).toEqual({ caja: 2, proxima: '2026-10-06', inicio: HOY });
    p = calificarTarjeta(p, 't', false, '2026-10-06');
    expect(p.tarjetas.t).toEqual({ caja: 0, proxima: '2026-10-06', inicio: HOY });
  });

  it('pendientes: vencidas más nuevas hasta el cupo del día', () => {
    const ids = ['a', 'b', 'c', 'd', 'e'];
    expect(tarjetasPendientes(ids, practicaVacia(), HOY, 3)).toEqual(['a', 'b', 'c']);
    let p = calificarTarjeta(practicaVacia(), 'a', true, HOY); // vuelve mañana
    p = calificarTarjeta(p, 'b', false, HOY); // vuelve hoy
    // Ya se empezaron 2 de las 3 nuevas de hoy: queda 1.
    expect(tarjetasPendientes(ids, p, HOY, 3)).toEqual(['b', 'c']);
    // Al día siguiente: vuelven a y b, y el cupo de nuevas se renueva.
    expect(tarjetasPendientes(ids, p, '2026-10-03', 3)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('simulacros y saneado', () => {
  it('guarda como mucho los 10 últimos simulacros', () => {
    let p = practicaVacia();
    for (let i = 0; i < 12; i++) p = registrarSimulacro(p, { fecha: HOY, aciertos: i, total: 20 });
    expect(p.simulacros).toHaveLength(10);
    expect(p.simulacros[0]!.aciertos).toBe(2);
  });

  it('descarta datos corruptos', () => {
    const p = sanearPractica({
      fallos: { ok: { veces: 1, racha: 0, ultima: HOY }, malo: { veces: 'x' } },
      tarjetas: { ok: { caja: 2, proxima: HOY }, malo: { caja: 9, proxima: HOY } },
      simulacros: [{ fecha: HOY, aciertos: 5, total: 10 }, { fecha: 'ayer' }],
    });
    expect(Object.keys(p.fallos)).toEqual(['ok']);
    expect(Object.keys(p.tarjetas)).toEqual(['ok']);
    expect(p.simulacros).toHaveLength(1);
    expect(sanearPractica(null)).toEqual(practicaVacia());
  });
});

describe('confianza, espaciado de preguntas y actividad', () => {
  const R = (correcta: boolean, confianza?: 'seguro' | 'dudo' | 'adivino', hoy = HOY) => ({ id: 'q', conceptoId: 'fgd', correcta, confianza, hoy });

  it('un error con "Seguro" entra al repaso como sorpresa', () => {
    const p = registrarRespuesta(practicaVacia(), R(false, 'seguro'));
    expect(p.fallos.q).toMatchObject({ veces: 1, racha: 0, sorpresa: true });
    expect(p.calibracion.seguro).toEqual({ aciertos: 0, total: 1 });
  });

  it('un acierto dudoso entra al repaso; uno seguro cuenta para salir', () => {
    let p = registrarRespuesta(practicaVacia(), R(true, 'dudo'));
    expect(p.fallos.q).toMatchObject({ veces: 0, dudosa: true });
    p = registrarRespuesta(p, R(true, 'seguro'));
    p = registrarRespuesta(p, R(true, 'seguro'));
    expect(p.fallos.q).toBeUndefined();
  });

  it('repetición espaciada de la pregunta según la confianza', () => {
    let p = registrarRespuesta(practicaVacia(), R(true, 'seguro'));
    expect(p.preguntas.q).toMatchObject({ caja: 1, proxima: '2026-10-03' });
    p = registrarRespuesta(p, R(true, 'dudo', '2026-10-03'));
    expect(p.preguntas.q!.caja).toBe(1);
    p = registrarRespuesta(p, R(true, 'adivino', '2026-10-04'));
    expect(p.preguntas.q).toMatchObject({ caja: 0, proxima: '2026-10-04' });
    expect(preguntasVencidas(p, '2026-10-04')).toEqual(['q']);
  });

  it('con examen cerca, los intervalos no superan el 20 % de lo que falta', () => {
    expect(intervaloAjustado(4, HOY)).toBe(14);
    expect(intervaloAjustado(4, HOY, sumarDias(HOY, 10))).toBe(2);
    expect(intervaloAjustado(1, HOY, sumarDias(HOY, 3))).toBe(1);
    expect(intervaloAjustado(0, HOY, sumarDias(HOY, 3))).toBe(0);
    expect(intervaloAjustado(3, HOY, sumarDias(HOY, -1))).toBe(7);
    expect(diasEntre('2026-10-30', '2026-11-02')).toBe(3);
  });

  it('actividad por día y racha de días seguidos', () => {
    let p = registrarRespuesta(practicaVacia(), R(true, undefined, '2026-09-30'));
    p = registrarRespuesta(p, R(false, undefined, '2026-10-01'));
    expect(racha(p, '2026-10-01')).toBe(2);
    // Hoy aún sin responder: la racha cuenta hasta ayer.
    expect(racha(p, '2026-10-02')).toBe(2);
    expect(racha(p, '2026-10-03')).toBe(0);
    expect(p.actividad['2026-10-01']).toEqual({ aciertos: 0, total: 1 });
    expect(p.conceptos.fgd).toEqual({ aciertos: 1, total: 2 });
  });

  it('datos de la versión anterior (sin campos nuevos) se leen bien', () => {
    const p = sanearPractica({ fallos: {}, tarjetas: {}, simulacros: [] });
    expect(p.calibracion.dudo).toEqual({ aciertos: 0, total: 0 });
    expect(p.preguntas).toEqual({});
    const q = sanearPractica({ fechaExamen: '2026-11-15', calibracion: { seguro: { aciertos: 3, total: 2 } } });
    expect(q.fechaExamen).toBe('2026-11-15');
    expect(q.calibracion.seguro).toEqual({ aciertos: 0, total: 0 });
  });
});
