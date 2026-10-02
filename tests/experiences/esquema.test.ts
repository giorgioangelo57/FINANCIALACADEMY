import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { analizarEsquema } from '../../src/experiences/esquema.ts';
import { historiaDeConcepto } from '../../src/experiences/registry.ts';

describe('microexperiencias derivadas de los esquemas', () => {
  it('intermediación indirecta: entidades y flujos con lo que viaja', () => {
    const h = historiaDeConcepto(tema01, 'indirecta')!;
    expect(h.entidades.map((e) => e.etiqueta)).toEqual(['Ahorrador', '🏦', 'Empresa']);
    expect(h.flujos).toEqual([
      { desde: 'e0', hacia: 'e1', tipo: 'flujo', etiqueta: 'depósito' },
      { desde: 'e1', hacia: 'e2', tipo: 'flujo', etiqueta: 'préstamo' },
    ]);
    expect(h.pasos.map((p) => p.tipo)).toEqual(['presentacion', 'flujo', 'flujo', 'pregunta']);
  });

  it('jerarquía BCE ⊂ Eurosistema ⊂ SEBC: el mayor engloba al menor', () => {
    const h = historiaDeConcepto(tema01, 'bce')!;
    expect(h.flujos.every((f) => f.tipo === 'contiene')).toBe(true);
    expect(h.flujos[0]).toMatchObject({ desde: 'e1', hacia: 'e0' });
  });

  it('flechas hacia atrás (SGR)', () => {
    const h = historiaDeConcepto(tema01, 'sgr')!;
    expect(h.flujos[1]).toMatchObject({ desde: 'e2', hacia: 'e1', tipo: 'flujo' });
  });

  it('no fuerza esquemas ambiguos o con varios bloques', () => {
    expect(analizarEsquema('Directo: A ⇄ B   ·   Intermediado: A ⇄ 🤝 (comisión) ⇄ B')).toBeNull();
    expect(analizarEsquema('AES → Europa · BM → desarrollo mundial')).toBeNull();
    expect(analizarEsquema('Tipo cobrado (4 %) − tipo pagado (1 %) = margen (3 %)')).toBeNull();
    expect(historiaDeConcepto(tema01, 'bde')).toBeNull();
  });

  it('todos los textos de las historias son literales del esquema de DATA', () => {
    let conHistoria = 0;
    for (const c of tema01.conceptos) {
      const h = historiaDeConcepto(tema01, c.id);
      if (!h) continue;
      conHistoria++;
      expect(h.fuente.texto).toBe(c.explicaciones[h.fuente.indice]);
      expect(tema01.modos[h.fuente.indice]!.formato).toBe('esquema');
      for (const e of h.entidades) expect(h.fuente.texto).toContain(e.etiqueta);
      for (const f of h.flujos) if (f.etiqueta) expect(h.fuente.texto).toContain(f.etiqueta);
    }
    expect(conHistoria).toBeGreaterThan(20);
  });
});
