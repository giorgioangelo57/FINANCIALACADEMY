import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { seccionesPrioritarias } from '../../src/domain/priority.ts';
import { vistaAtlas } from '../../src/world/atlas.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';

const progreso = { dominio: { fgd: 1, bancos: 0.5 }, intentos: {} };
const m = modeloCiudad(tema01, progreso);

describe('Atlas del Conocimiento', () => {
  it('la ciudad lista los barrios con su peso real', () => {
    const v = vistaAtlas(m, { nivel: 'ciudad' });
    expect(v.entradas.map((e) => e.etiqueta)).toEqual(tema01.grupos.map((g) => g.titulo));
    expect(v.pesoExamen).toBe(tema01.secciones.reduce((s, x) => s + x.pesoExamen, 0));
    expect(v.total).toBe(45);
    expect(v.estudiados).toBe(2);
    expect(v.dominados).toBe(1);
    const primera = seccionesPrioritarias(tema01, progreso)[0]!;
    expect(v.estudiarAhora?.href).toBe(`#s/${primera.id}`);
  });

  it('una zona lista sus conceptos sin inventar pesos por concepto', () => {
    const v = vistaAtlas(m, { nivel: 'zona', seccionId: '4.2A' });
    expect(v.pesoExamen).toBe(25);
    expect(v.entradas).toHaveLength(8);
    expect(v.entradas.every((e) => e.pesoExamen === null)).toBe(true);
    expect(v.entradas.find((e) => e.foco.nivel === 'edificio' && e.foco.conceptoId === 'fgd')?.fase).toBe('completo');
    expect(v.estudiarAhora?.href).toBe('#s/4.2A');
  });

  it('un edificio lleva a su concepto', () => {
    const v = vistaAtlas(m, { nivel: 'edificio', conceptoId: 'bancos' });
    expect(v.fase).toBe('obra');
    expect(v.estudiarAhora?.href).toBe('#c/bancos');
    expect(v.entradas).toEqual([]);
  });
});
