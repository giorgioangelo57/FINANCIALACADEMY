import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';
import { cadenaFoco, codificarFoco, decodificarFoco, encuadre, type Foco, focoPadre, rectFoco } from '../../src/world/focus.ts';

const m = modeloCiudad(tema01, { dominio: {}, intentos: {} });
const focos: Foco[] = [
  { nivel: 'ciudad' },
  { nivel: 'barrio', grupoId: '4' },
  { nivel: 'zona', seccionId: '4.2A' },
  { nivel: 'edificio', conceptoId: 'bde' },
];

describe('foco del mundo (zoom conceptual)', () => {
  it('se codifica y decodifica sin pérdida', () => {
    for (const f of focos) expect(decodificarFoco(m, codificarFoco(f))).toEqual(f);
    expect(decodificarFoco(m, 'zona:zzz')).toBeNull();
    expect(decodificarFoco(m, 'otra:1')).toBeNull();
  });

  it('ciudad → barrio → zona → edificio', () => {
    expect(cadenaFoco(m, focos[3]!)).toEqual(focos);
    expect(focoPadre(m, focos[0]!)).toBeNull();
  });

  it('cada nivel encuadra una superficie menor y contenida en la anterior', () => {
    const rects = focos.map((f) => rectFoco(m, f));
    for (let i = 1; i < rects.length - 1; i++) {
      const [a, b] = [rects[i - 1]!, rects[i]!];
      expect(b.x).toBeGreaterThanOrEqual(a.x);
      expect(b.x + b.ancho).toBeLessThanOrEqual(a.x + a.ancho + 1e-9);
    }
    const radios = focos.map((f) => encuadre(m, f).radio);
    for (let i = 1; i < radios.length; i++) expect(radios[i]).toBeLessThan(radios[i - 1]!);
  });
});
