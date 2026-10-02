import { describe, expect, it } from 'vitest';
import { NOMBRE_AMBIENTE, siguienteAmbiente } from '../../src/world/ambiente.ts';
import { AMBIENTES, mezclarPreajustes } from '../../src/scene/three/ambiente.ts';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';
import { etiquetasNocturnas } from '../../src/world/labels.ts';

describe('día (aprender) y noche (repasar)', () => {
  it('el botón alterna entre los dos modos', () => {
    expect(siguienteAmbiente('dia')).toBe('noche');
    expect(siguienteAmbiente('noche')).toBe('dia');
    expect(NOMBRE_AMBIENTE).toEqual({ dia: 'Aprender', noche: 'Repasar' });
  });

  it('la transición interpola números y colores y respeta los extremos', () => {
    const a = AMBIENTES.dia;
    const b = AMBIENTES.noche;
    expect(mezclarPreajustes(a, b, 0)).toEqual({ ...a });
    const fin = mezclarPreajustes(a, b, 1);
    expect(fin.niebla).toBe(b.niebla);
    expect(fin.sol_i).toBeCloseTo(b.sol_i);
    const medio = mezclarPreajustes(a, b, 0.5);
    expect(medio.noche).toBeCloseTo(0.5);
    expect(mezclarPreajustes(a, b, 7).noche).toBe(1);
  });

  it('de noche solo se rotulan los edificios con algo pendiente (y el enfocado)', () => {
    const m = modeloCiudad(tema01, { dominio: {}, intentos: {} });
    const pendientes = new Map([['bde', { total: 3 }], ['fgd', { total: 1 }], ['ico', { total: 0 }]]);
    const ciudad = etiquetasNocturnas(m, { nivel: 'ciudad' }, pendientes);
    expect(ciudad.map((f) => (f.nivel === 'edificio' ? f.conceptoId : ''))).toEqual(expect.arrayContaining(['bde', 'fgd']));
    expect(ciudad).toHaveLength(2);
    expect(etiquetasNocturnas(m, { nivel: 'ciudad' }, new Map())).toEqual([]);
    const zona = etiquetasNocturnas(m, { nivel: 'zona', seccionId: '4.1' }, pendientes);
    expect(zona).toEqual([]);
    const edificio = etiquetasNocturnas(m, { nivel: 'edificio', conceptoId: 'cajas' }, pendientes);
    expect(edificio[0]).toEqual({ nivel: 'edificio', conceptoId: 'cajas' });
    expect(edificio).toHaveLength(3);
  });
});
