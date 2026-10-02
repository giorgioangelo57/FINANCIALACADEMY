import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';
import { etiquetasDelNivel } from '../../src/world/labels.ts';

const m = modeloCiudad(tema01, { dominio: {}, intentos: {} });

describe('jerarquía de etiquetas sobre la maqueta', () => {
  it('la vista general solo rotula los barrios: sin zonas, cifras ni pines', () => {
    const f = etiquetasDelNivel(m, { nivel: 'ciudad' }, false);
    expect(f.map((x) => x.nivel)).toEqual(['barrio', 'barrio', 'barrio', 'barrio']);
    // En lectura de mapa (Atlas) se identifican las zonas.
    expect(etiquetasDelNivel(m, { nivel: 'ciudad' }, true)).toHaveLength(12);
  });

  it('el barrio identifica sus zonas; la zona y el edificio rotulan los edificios', () => {
    expect(etiquetasDelNivel(m, { nivel: 'barrio', grupoId: '4' }, false)).toHaveLength(3);
    const zona = etiquetasDelNivel(m, { nivel: 'zona', seccionId: '4.2A' }, false);
    expect(zona).toHaveLength(8);
    expect(zona.every((f) => f.nivel === 'edificio')).toBe(true);
    const edificio = etiquetasDelNivel(m, { nivel: 'edificio', conceptoId: 'fgd' }, false);
    // Primero el enfocado, después el resto de su zona (sin repetirlo).
    expect(edificio[0]).toEqual({ nivel: 'edificio', conceptoId: 'fgd' });
    expect(edificio).toHaveLength(8);
    expect(new Set(edificio.map((f) => (f.nivel === 'edificio' ? f.conceptoId : ''))).size).toBe(8);
  });
});
