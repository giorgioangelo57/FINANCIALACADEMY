import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { leerEsquema } from '../../src/ui/components/conceptPanels.ts';

describe('esquema de texto de DATA → diagrama de flujo', () => {
  it('conectores con etiqueta y sentido', () => {
    expect(leerEsquema('Ahorrador ──depósito──▶ 🏦 ──préstamo──▶ Empresa')).toEqual([
      [
        { tipo: 'nodo', texto: 'Ahorrador' },
        { tipo: 'con', etiqueta: 'depósito', sentido: 'der' },
        { tipo: 'nodo', texto: '🏦' },
        { tipo: 'con', etiqueta: 'préstamo', sentido: 'der' },
        { tipo: 'nodo', texto: 'Empresa' },
      ],
    ]);
  });

  it('varias filas, flechas a la izquierda e intercambio', () => {
    const filas = leerEsquema('Ahorrador ──€──▶ Empresa   ·   Ahorrador ◀──bono── Empresa');
    expect(filas).toHaveLength(2);
    expect(filas[1]![1]).toEqual({ tipo: 'con', etiqueta: 'bono', sentido: 'izq' });
    expect(leerEsquema('Banco A ⇄ Banco B')[0]![1]).toEqual({ tipo: 'con', etiqueta: '', sentido: 'doble' });
  });

  it('sin conectores es una lista', () => {
    expect(leerEsquema('Libertad · Profundidad · Amplitud')[0]!.map((p) => p.tipo === 'nodo' && p.texto)).toEqual(['Libertad', 'Profundidad', 'Amplitud']);
  });

  it('no pierde texto de ningún esquema de DATA', () => {
    const i = tema01.modos.findIndex((m) => m.formato === 'esquema');
    for (const c of tema01.conceptos) {
      const texto = (c.explicaciones[i] ?? '').replace(/⚠.*$/, '').trim();
      const textos = leerEsquema(texto).flat().map((p) => (p.tipo === 'nodo' ? p.texto : p.etiqueta)).join('');
      const sinAdornos = (t: string) => t.replace(/──|▶|◀|→|⇄|·|\||\s/g, '');
      expect(sinAdornos(textos), c.id).toBe(sinAdornos(texto));
    }
  });
});
