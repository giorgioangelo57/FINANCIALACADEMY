import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { compararRecuerdo, ideasClave, normalizar, ocultarNombre } from '../../src/domain/recall.ts';

describe('Escríbelo tú: comparar el recuerdo con las ideas clave', () => {
  it('normaliza acentos, mayúsculas, signos y etiquetas', () => {
    expect(normalizar('<b>Déficit</b>, ¡AHORRO!')).toBe('deficit ahorro');
  });

  it('las ideas clave son las negritas de DATA, sin etiquetas tipo "X:"', () => {
    const sf = tema01.conceptos.find((c) => c.id === 'sf')!;
    expect(ideasClave(sf.definicion)).toEqual(['instituciones, medios (activos) y mercados', 'superávit', 'déficit']);
    expect(ideasClave('<b>Ventajas:</b> facilitan el acceso a los <b>instrumentos</b>')).toEqual(['instrumentos']);
    expect(ideasClave('Una definición sin negritas con palabras importantes').length).toBeGreaterThan(0);
  });

  it('reconoce ideas aunque cambien plurales o la forma de las palabras', () => {
    const ideas = ['deposita su excedente en el banco', 'Ambos agentes no tienen contacto entre ellos.'];
    const r = compararRecuerdo('El ahorrador hace un depósito con su excedente en un banco y este presta', ideas);
    expect(r.encontradas).toEqual(['deposita su excedente en el banco']);
    expect(r.faltan).toHaveLength(1);
    expect(r.cobertura).toBe(0.5);
  });

  it('texto vacío: ninguna idea; todas las ideas de DATA son comparables', () => {
    expect(compararRecuerdo('', ['superávit']).cobertura).toBe(0);
    for (const c of tema01.conceptos) {
      const ideas = ideasClave(c.definicion);
      expect(ideas.length, c.id).toBeGreaterThan(0);
      // Copiar la definición entera cubre todas sus ideas.
      expect(compararRecuerdo(c.definicion, ideas).cobertura, c.id).toBe(1);
    }
  });
});

describe('ocultar el nombre de un concepto', () => {
  it('oculta el nombre y su sigla, sin tocar palabras que solo lo contienen', () => {
    expect(ocultarNombre('El ICO es la agencia financiera; el ICO presta.', 'Instituto de Crédito Oficial (ICO)')).toBe('El ▢▢▢ es la agencia financiera; el ▢▢▢ presta.');
    expect(ocultarNombre('Ley de Autonomía del Banco de España', 'Banco de España')).toBe('Ley de Autonomía del ▢▢▢');
    expect(ocultarNombre('Los BCEX no', 'Banco Central Europeo (BCE)')).toBe('Los BCEX no');
  });

  it('ninguna definición de DATA deja ver el nombre de su concepto', () => {
    for (const c of tema01.conceptos) {
      const plano = ocultarNombre(c.definicion.replace(/<[^>]+>/g, ''), c.nombre).toLowerCase();
      expect(plano.includes(c.nombre.replace(/\s*\(.*?\)/g, '').toLowerCase()), c.id).toBe(false);
    }
  });
});
