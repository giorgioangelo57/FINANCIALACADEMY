import type { EntidadHistoria, FlujoHistoria, TipoFlujo } from './schema.ts';

/*
 * Lee los "Esquemas visuales" de DATA (p. ej. `Ahorrador ──depósito──▶ 🏦 ──préstamo──▶ Empresa`)
 * y los convierte en entidades y flujos. Es deliberadamente conservador: si el esquema no es una
 * única cadena inequívoca devuelve null y ese concepto simplemente no tiene historia automática.
 */

export interface GrafoEsquema {
  entidades: EntidadHistoria[];
  flujos: FlujoHistoria[];
}

// Conectores reconocidos. Grupo 1: etiqueta de un flujo hacia delante; grupo 2: hacia atrás.
const CONECTOR = /─+(?:\(?([^─▶◀()]+?)\)?─+)?▶|◀─+(?:([^─▶◀]+?)─+)?|→|⇄|⊂|⊃/gu;

/** ¿Hay un " · " fuera de paréntesis, corchetes o llaves? (indica varias ideas sueltas). */
function tieneSeparadorSuelto(texto: string): boolean {
  let profundidad = 0;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (c === '(' || c === '[' || c === '{') profundidad++;
    else if (c === ')' || c === ']' || c === '}') profundidad = Math.max(0, profundidad - 1);
    else if (c === '·' && profundidad === 0) return true;
  }
  return false;
}

export function analizarEsquema(texto: string): GrafoEsquema | null {
  // Varios bloques independientes (DATA los separa con tres espacios o con "|").
  if (/\s{3}|\|/.test(texto)) return null;

  const nodos: string[] = [];
  const conectores: { tipo: TipoFlujo; etiqueta: string | null; invertido: boolean }[] = [];
  let ultimo = 0;
  for (const m of texto.matchAll(CONECTOR)) {
    nodos.push(texto.slice(ultimo, m.index).trim());
    ultimo = m.index + m[0].length;
    const simbolo = m[0];
    if (simbolo === '⇄') conectores.push({ tipo: 'intercambio', etiqueta: null, invertido: false });
    else if (simbolo === '⊃') conectores.push({ tipo: 'contiene', etiqueta: null, invertido: false });
    else if (simbolo === '⊂') conectores.push({ tipo: 'contiene', etiqueta: null, invertido: true });
    else if (simbolo.startsWith('◀')) conectores.push({ tipo: 'flujo', etiqueta: m[2]?.trim() || null, invertido: true });
    else conectores.push({ tipo: 'flujo', etiqueta: m[1]?.trim() || null, invertido: false });
  }
  nodos.push(texto.slice(ultimo).trim());

  if (!conectores.length || nodos.some((n) => !n)) return null;
  // Solo el último nodo puede enumerar varios destinos ("CNMV → bolsa · ESI · IIC").
  if (nodos.slice(0, -1).some(tieneSeparadorSuelto)) return null;

  const entidades = nodos.map((etiqueta, i) => ({ id: `e${i}`, etiqueta }));
  const flujos = conectores.map((c, i) => {
    const a = `e${i}`;
    const b = `e${i + 1}`;
    return { desde: c.invertido ? b : a, hacia: c.invertido ? a : b, tipo: c.tipo, etiqueta: c.etiqueta };
  });
  return { entidades, flujos };
}
