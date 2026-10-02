/** Rectángulo de un treemap, en las mismas unidades que el área de partida. */
export interface CeldaTreemap<T> {
  dato: T;
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

/**
 * Treemap "squarified" (Bruls, Huizing y van Wijk): el área de cada celda es proporcional a su
 * valor y se buscan celdas lo más cuadradas posible. Conserva el orden de entrada (de mayor a menor
 * se lee mejor). Puro y determinista.
 */
export function treemap<T>(datos: T[], valor: (d: T) => number, ancho: number, alto: number): CeldaTreemap<T>[] {
  const total = datos.reduce((s, d) => s + Math.max(0, valor(d)), 0);
  if (!total || ancho <= 0 || alto <= 0) return [];
  const escala = (ancho * alto) / total;
  const items = datos.map((dato) => ({ dato, area: Math.max(0, valor(dato)) * escala }));
  const celdas: CeldaTreemap<T>[] = [];
  let x = 0;
  let y = 0;
  let w = ancho;
  let h = alto;

  const peor = (fila: { area: number }[], lado: number) => {
    const s = fila.reduce((a, f) => a + f.area, 0);
    let max = 0;
    for (const f of fila) max = Math.max(max, (lado * lado * f.area) / (s * s), (s * s) / (lado * lado * f.area));
    return max;
  };

  const colocar = (fila: { dato: T; area: number }[]) => {
    const s = fila.reduce((a, f) => a + f.area, 0);
    if (w >= h) {
      // Columna a la izquierda.
      const cw = s / h;
      let cy = y;
      for (const f of fila) {
        const ch = f.area / cw;
        celdas.push({ dato: f.dato, x, y: cy, ancho: cw, alto: ch });
        cy += ch;
      }
      x += cw;
      w -= cw;
    } else {
      // Fila arriba.
      const ch = s / w;
      let cx = x;
      for (const f of fila) {
        const cw = f.area / ch;
        celdas.push({ dato: f.dato, x: cx, y, ancho: cw, alto: ch });
        cx += cw;
      }
      y += ch;
      h -= ch;
    }
  };

  let fila: { dato: T; area: number }[] = [];
  for (const item of items) {
    const lado = Math.min(w, h);
    if (!fila.length || peor([...fila, item], lado) <= peor(fila, lado)) fila.push(item);
    else {
      colocar(fila);
      fila = [item];
    }
  }
  if (fila.length) colocar(fila);
  return celdas;
}
