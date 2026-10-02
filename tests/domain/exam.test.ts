import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { bancoDePreguntas, construirSimulacro, corregirSimulacro, repartoPorBloque } from '../../src/domain/exam.ts';

const bloques = tema01.ampliacion!.bloques;

describe('simulacro del tema', () => {
  it('el banco incluye la oficial de cada concepto y todas las de práctica', () => {
    const banco = bancoDePreguntas(tema01);
    expect(banco.filter((p) => p.oficial)).toHaveLength(tema01.conceptos.length);
    expect(banco.filter((p) => !p.oficial)).toHaveLength(tema01.ampliacion!.preguntas.length);
    expect(new Set(banco.map((p) => p.id)).size).toBe(banco.length);
  });

  it('reparte por bloque según la probabilidad (restos mayores)', () => {
    expect(repartoPorBloque(bloques, 20)).toEqual({ intermediarios: 6, supervisores: 5, mercados: 4, activos: 3, basicos: 2 });
    expect(Object.values(repartoPorBloque(bloques, 10)).reduce((s, n) => s + n, 0)).toBe(10);
    expect(Object.values(repartoPorBloque(bloques, 30)).reduce((s, n) => s + n, 0)).toBe(30);
  });

  it('no pide más preguntas de las que tiene un bloque: el sobrante va a los de más peso', () => {
    const r = repartoPorBloque(bloques, 20, { intermediarios: 99, supervisores: 99, mercados: 99, activos: 1, basicos: 99 });
    expect(r.activos).toBe(1);
    expect(Object.values(r).reduce((s, n) => s + n, 0)).toBe(20);
  });

  it('sin repetidas, con el reparto pedido y determinista con la misma semilla', () => {
    const a = construirSimulacro(tema01, { total: 20, semilla: 7 });
    const b = construirSimulacro(tema01, { total: 20, semilla: 7 });
    const c = construirSimulacro(tema01, { total: 20, semilla: 8 });
    expect(a).toHaveLength(20);
    expect(new Set(a.map((p) => p.id)).size).toBe(20);
    expect(a.map((p) => p.id)).toEqual(b.map((p) => p.id));
    expect(a.map((p) => p.id)).not.toEqual(c.map((p) => p.id));
    const cuenta = (id: string) => a.filter((p) => p.bloqueId === id).length;
    expect([cuenta('intermediarios'), cuenta('supervisores'), cuenta('mercados'), cuenta('activos'), cuenta('basicos')]).toEqual([6, 5, 4, 3, 2]);
  });

  it('corrige con nota sobre 10, desglose por bloque y fallos; sin respuesta cuenta como fallo', () => {
    const s = construirSimulacro(tema01, { total: 10, semilla: 3 });
    const respuestas = s.map((p, i) => (i < 7 ? p.indiceCorrecta : i === 7 ? null : (p.indiceCorrecta + 1) % p.opciones.length));
    const r = corregirSimulacro(s, respuestas);
    expect(r.aciertos).toBe(7);
    expect(r.nota).toBe(7);
    expect(r.fallos).toHaveLength(3);
    expect(r.porBloque.reduce((x, b) => x + b.total, 0)).toBe(10);
    expect(r.porBloque.reduce((x, b) => x + b.aciertos, 0)).toBe(7);
  });
});
