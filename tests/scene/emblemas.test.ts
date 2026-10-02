// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { GLYPHS, type GlyphName } from '../../src/icons/glyphs.ts';
import { emblema, glifoDelEmblema, trazosDeGlifo } from '../../src/scene/three/emblemas.ts';
import { Taller } from '../../src/scene/three/taller.ts';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';

describe('emblemas de fachada', () => {
  it('todos los glifos de DATA producen trazos planos, centrados y mirando a +z', () => {
    for (const g of Object.keys(GLYPHS) as GlyphName[]) {
      const geo = trazosDeGlifo(g);
      expect(geo, g).not.toBeNull();
      geo!.computeBoundingBox();
      const b = geo!.boundingBox!;
      expect(b.min.x).toBeGreaterThanOrEqual(-0.56);
      expect(b.max.x).toBeLessThanOrEqual(0.56);
      expect(b.min.z).toBe(0);
      expect(b.max.z).toBe(0);
      // Todos los triángulos con la cara hacia +z.
      const p = geo!.getAttribute('position');
      for (let i = 0; i < p.count; i += 3) {
        const ax = p.getX(i + 1) - p.getX(i), ay = p.getY(i + 1) - p.getY(i);
        const bx = p.getX(i + 2) - p.getX(i), by = p.getY(i + 2) - p.getY(i);
        expect(ax * by - ay * bx).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('el emblema usa el primer glifo del concepto y añade disco, canto y glifo', () => {
    for (const c of tema01.conceptos) expect(glifoDelEmblema(c.iconos)).toBe(c.iconos[0]);
    const t = new Taller();
    expect(emblema(t, ['euro'], { x: 0, y: 3, z: 2, tam: 1.4, modo: 'placa' })).toBe(true);
    expect(t.piezas.get('medallon')).toHaveLength(1);
    expect(t.piezas.get('bronce')).toHaveLength(1);
    expect(t.piezas.get('acento')).toHaveLength(1);
    const c = new Taller();
    emblema(c, ['scale'], { x: 0, y: 5, z: 1, tam: 1.2, modo: 'cresta' });
    expect(c.piezas.get('acento')).toHaveLength(2); // cara y dorso
    expect(c.cima).toBeGreaterThan(5 + 1.2);
    expect(emblema(new Taller(), [], { x: 0, y: 0, z: 0, tam: 1, modo: 'placa' })).toBe(false);
  });
});
