import { describe, expect, it } from 'vitest';
import { areaRect, encoger, particionar } from '../../src/world/geometry.ts';

const CAJA = { x: -50, z: -50, ancho: 100, fondo: 100 };
const solapan = (a: { x: number; z: number; ancho: number; fondo: number }, b: typeof a) =>
  a.x < b.x + b.ancho - 1e-9 && b.x < a.x + a.ancho - 1e-9 && a.z < b.z + b.fondo - 1e-9 && b.z < a.z + a.fondo - 1e-9;

describe('treemap por peso', () => {
  const items = [3, 10, 4, 3, 12, 5, 5, 4, 3, 8, 25, 18].map((peso, i) => ({ id: `s${i}`, peso }));
  const rects = particionar(items, CAJA);

  it('el área de cada parcela es proporcional a su peso', () => {
    for (const it of items) expect(areaRect(rects.get(it.id)!)).toBeCloseTo((it.peso / 100) * 10000, 6);
  });

  it('cubre el rectángulo sin solapes', () => {
    const lista = [...rects.values()];
    expect(lista.reduce((s, r) => s + areaRect(r), 0)).toBeCloseTo(10000, 6);
    for (let i = 0; i < lista.length; i++) for (let j = i + 1; j < lista.length; j++) expect(solapan(lista[i]!, lista[j]!)).toBe(false);
  });

  it('con pesos nulos reparte a partes iguales', () => {
    const r = particionar([{ id: 'a', peso: 0 }, { id: 'b', peso: 0 }], CAJA);
    expect(areaRect(r.get('a')!)).toBeCloseTo(5000);
  });

  it('encoger no invierte rectángulos pequeños', () => {
    expect(encoger({ x: 0, z: 0, ancho: 2, fondo: 10 }, 3)).toEqual({ x: 1, z: 3, ancho: 0, fondo: 4 });
  });
});
