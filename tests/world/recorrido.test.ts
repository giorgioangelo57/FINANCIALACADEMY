import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';
import { BARRIO_RECORRIDO, recorridoDelBarrio } from '../../src/world/recorrido.ts';

describe('recorrido guiado del barrio 4', () => {
  it('sigue el orden de estudio: secciones en orden y, dentro, el orden de DATA', () => {
    const m = modeloCiudad(tema01, { dominio: {}, intentos: {} });
    const ids = recorridoDelBarrio(m, BARRIO_RECORRIDO);
    const esperado = tema01.secciones.filter((s) => s.grupoId === '4').flatMap((s) => tema01.conceptos.filter((c) => c.seccionId === s.id).map((c) => c.id));
    expect(ids).toEqual(esperado);
    expect(ids[0]).toBe('bce');
    expect(new Set(ids).size).toBe(ids.length);
  });
});
