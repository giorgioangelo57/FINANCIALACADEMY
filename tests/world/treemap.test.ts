import { describe, expect, it } from 'vitest';
import { treemap } from '../../src/world/treemap.ts';

describe('treemap squarified', () => {
  const valores = [30, 25, 20, 15, 10];
  const celdas = treemap(valores, (v) => v, 100, 60);

  it('el área de cada celda es proporcional a su valor y cubre todo el rectángulo', () => {
    expect(celdas).toHaveLength(5);
    for (const c of celdas) expect((c.ancho * c.alto) / (100 * 60)).toBeCloseTo(c.dato / 100, 6);
    const area = celdas.reduce((s, c) => s + c.ancho * c.alto, 0);
    expect(area).toBeCloseTo(6000, 6);
  });

  it('las celdas quedan dentro del rectángulo y no se solapan', () => {
    for (const c of celdas) {
      expect(c.x).toBeGreaterThanOrEqual(-1e-9);
      expect(c.y).toBeGreaterThanOrEqual(-1e-9);
      expect(c.x + c.ancho).toBeLessThanOrEqual(100 + 1e-9);
      expect(c.y + c.alto).toBeLessThanOrEqual(60 + 1e-9);
    }
    for (let i = 0; i < celdas.length; i++) {
      for (let j = i + 1; j < celdas.length; j++) {
        const a = celdas[i]!;
        const b = celdas[j]!;
        const solapeX = Math.min(a.x + a.ancho, b.x + b.ancho) - Math.max(a.x, b.x);
        const solapeY = Math.min(a.y + a.alto, b.y + b.alto) - Math.max(a.y, b.y);
        expect(solapeX > 1e-6 && solapeY > 1e-6).toBe(false);
      }
    }
  });

  it('conserva el orden y no genera celdas muy alargadas', () => {
    expect(celdas.map((c) => c.dato)).toEqual(valores);
    for (const c of celdas) expect(Math.max(c.ancho / c.alto, c.alto / c.ancho)).toBeLessThan(3);
  });

  it('sin datos o sin área no hay celdas', () => {
    expect(treemap([], (v: number) => v, 100, 60)).toEqual([]);
    expect(treemap([0, 0], (v) => v, 100, 60)).toEqual([]);
  });
});
