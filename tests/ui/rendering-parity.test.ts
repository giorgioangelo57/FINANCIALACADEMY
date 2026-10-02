import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { iconoSvg } from '../../src/icons/icon.ts';
import { ciudadPixel } from '../../src/scene/pixelCity.ts';
import { anilloDominio } from '../../src/ui/components/ring.ts';
import { colorDominio, porcentaje, resaltarAviso } from '../../src/ui/format.ts';
import { motorLegacy } from '../helpers/legacy.ts';

const legacy = motorLegacy();

describe('paridad visual con el prototipo', () => {
  it('formatos y colores de dominio', () => {
    for (const v of [0, 0.004, 0.2, 0.333, 0.5, 0.79, 0.8, 1]) {
      expect(colorDominio(v)).toBe(legacy.heat(v));
      expect(porcentaje(v)).toBe(legacy.pct(v));
    }
  });

  it('aviso de dato desactualizado', () => {
    for (const c of tema01.conceptos) expect(resaltarAviso(c.ejemploReal)).toBe(legacy.warn(c.ejemploReal));
  });

  it('iconos compuestos', () => {
    for (const c of tema01.conceptos) expect(iconoSvg(c.iconos, c.color)).toBe(legacy.icon(c.iconos, c.color));
    expect(iconoSvg(['bank'], '#fff')).toBe(legacy.icon(['bank'], '#fff'));
  });

  it('anillo de dominio', () => {
    for (const v of [0, 0.37, 1]) {
      expect(anilloDominio(v)).toBe(legacy.ring(v));
      expect(anilloDominio(v, 130)).toBe(legacy.ring(v, 130));
    }
  });

  it('ciudad pixel de la app: iconos en letreros sobre el tejado, no sobre la fachada', () => {
    const svg = ciudadPixel(tema01, { dominio: {}, intentos: {} }, { iconosSobreTejado: true });
    expect(svg).not.toBe(legacy.pixelCity());
    // Ningún icono empieza por debajo del tejado de su edificio.
    const iconos = [...svg.matchAll(/<svg x="[\d.]+" y="(-?[\d.]+)" width="16"/g)].map((m) => Number(m[1]));
    expect(iconos).toHaveLength(12);
    tema01.ciudad.edificios.forEach((e, i) => expect(iconos[i]! + 17).toBeLessThanOrEqual(110 - e.altura));
    expect(Math.min(...iconos)).toBeGreaterThanOrEqual(0);
  });

  it('ciudad pixel sin progreso y con progreso (prototipo)', () => {
    expect(ciudadPixel(tema01, { dominio: {}, intentos: {} })).toBe(legacy.pixelCity());
    const dom = { bde: 1, bancos: 0.5, cajas: 0.25, fgd: 1, sgr: 0.5 };
    expect(ciudadPixel(tema01, { dominio: dom, intentos: {} })).toBe(motorLegacy({ dom, tries: {} }).pixelCity());
  });
});
