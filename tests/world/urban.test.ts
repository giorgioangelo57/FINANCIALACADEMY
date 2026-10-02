import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { GRAMATICA_URBANA, modeloCiudad } from '../../src/world/cityModel.ts';
import { areaRect, type Rect } from '../../src/world/geometry.ts';
import { componerZonaUrbana, repartirCuotas } from '../../src/world/urban.ts';

const m = modeloCiudad(tema01, { dominio: {}, intentos: {} });
const solapan = (a: Rect, b: Rect) =>
  a.x < b.x + b.ancho - 1e-6 && b.x < a.x + a.ancho - 1e-6 && a.z < b.z + b.fondo - 1e-6 && b.z < a.z + a.fondo - 1e-6;
const dentro = (a: Rect, b: Rect) =>
  a.x >= b.x - 1e-6 && a.z >= b.z - 1e-6 && a.x + a.ancho <= b.x + b.ancho + 1e-6 && a.z + a.fondo <= b.z + b.fondo + 1e-6;

describe('gramática urbana (Ensanche)', () => {
  const urbanas = m.zonas.filter((z) => z.composicion === 'urbana');

  it('solo el barrio del vertical slice usa la nueva gramática', () => {
    expect([...new Set(urbanas.map((z) => z.grupoId))]).toEqual([...GRAMATICA_URBANA]);
    expect(m.zonas.filter((z) => z.composicion === 'parcelas').every((z) => !GRAMATICA_URBANA.has(z.grupoId))).toBe(true);
  });

  it('la superficie de cada zona sigue siendo la del peso de examen', () => {
    // La gramática cambia cómo se ocupa la zona, no su lote.
    const b = m.barrios.find((x) => x.grupoId === '4')!;
    for (const z of urbanas) expect(areaRect(z.lote) / areaRect(b.parcela)).toBeCloseTo(z.pesoExamen / b.pesoExamen, 6);
  });

  it('cada concepto tiene un edificio dentro de su zona, sin solapes', () => {
    for (const z of urbanas) {
      const propios = m.edificios.filter((e) => e.seccionId === z.seccionId);
      expect(propios.map((e) => e.conceptoId)).toEqual(z.conceptoIds);
      for (const e of propios) {
        expect(dentro(e.lote, z.interior)).toBe(true);
        if (e.antepatio) {
          expect(dentro(e.antepatio, z.interior)).toBe(true);
          expect(solapan(e.antepatio, e.lote)).toBe(false);
        }
      }
      for (let i = 0; i < propios.length; i++) {
        for (let j = i + 1; j < propios.length; j++) expect(solapan(propios[i]!.lote, propios[j]!.lote)).toBe(false);
      }
      for (const p of z.pasajes) for (const e of propios) expect(solapan(p, e.lote)).toBe(false);
    }
  });

  it('los emblemáticos dan a las fachadas visibles y tienen antepatio cuando cabe', () => {
    const emblematicos = m.edificios.filter((e) => e.composicion === 'urbana' && e.emblematico);
    expect(emblematicos.length).toBe(12);
    expect(emblematicos.filter((e) => e.frente === 'sur' || e.frente === 'este').length).toBeGreaterThanOrEqual(9);
    expect(emblematicos.some((e) => e.antepatio)).toBe(true);
  });

  it('no es una retícula: hay patios interiores y fachada continua', () => {
    expect(urbanas.some((z) => z.patios.length > 0)).toBe(true);
    const zona = componerZonaUrbana({ x: 0, z: 0, ancho: 40, fondo: 40 }, Array.from({ length: 5 }, (_, i) => ({ conceptoId: `c${i}`, emblematico: i === 0 })));
    expect(zona.manzanas).toHaveLength(1);
    expect(zona.patios).toHaveLength(1);
    expect(new Set(zona.huecos.map((h) => h.frente)).size).toBeGreaterThan(1);
  });

  it('reparto proporcional entero', () => {
    expect(repartirCuotas(5, [40, 30, 30, 40])).toEqual([2, 1, 1, 1]);
    expect(repartirCuotas(4, [1, 1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(4);
  });
});
