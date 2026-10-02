import { BufferGeometry, Color, type Material, MeshBasicMaterial, MeshStandardMaterial } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Materiales compartidos por color y acabado (no se liberan nunca). */
const compartidos = new Map<string, Material>();

export interface Acabado {
  rugosidad?: number;
  metal?: number;
  /** Superficies muy finas (marcas viales, ventanas) que se apoyan en otra: evita z-fighting. */
  calco?: boolean;
}

export function mate(color: string, { rugosidad = 0.85, metal = 0, calco = false }: Acabado = {}): MeshStandardMaterial {
  const clave = `std|${color}|${rugosidad}|${metal}|${calco}`;
  let m = compartidos.get(clave) as MeshStandardMaterial | undefined;
  if (!m) {
    m = new MeshStandardMaterial({ color, roughness: rugosidad, metalness: metal });
    if (calco) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    compartidos.set(clave, m);
  }
  return m;
}

/** Material sin iluminación (luces, ventanas encendidas, pantallas). */
export function emisivo(color: string, calco = false): MeshBasicMaterial {
  const clave = `basic|${color}|${calco}`;
  let m = compartidos.get(clave) as MeshBasicMaterial | undefined;
  if (!m) {
    m = new MeshBasicMaterial({ color });
    if (calco) Object.assign(m, { polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    compartidos.set(clave, m);
  }
  return m;
}

export const esCompartido = (m: Material): boolean => {
  for (const v of compartidos.values()) if (v === m) return true;
  return false;
};

export const mezclar = (a: string, b: string, t: number): string => `#${new Color(a).lerp(new Color(b), t).getHexString()}`;

/** Une geometrías (convertidas a no indexadas) en una sola: una llamada de dibujo por material. */
export function unir(geometrias: BufferGeometry[]): BufferGeometry | null {
  if (!geometrias.length) return null;
  const planas = geometrias.map((g) => {
    const plana = g.index ? g.toNonIndexed() : g;
    if (plana !== g) g.dispose();
    // Todas deben tener los mismos atributos para poder unirse.
    for (const nombre of Object.keys(plana.attributes)) {
      if (nombre !== 'position' && nombre !== 'normal' && nombre !== 'uv') plana.deleteAttribute(nombre);
    }
    return plana;
  });
  const unida = mergeGeometries(planas, false);
  for (const g of planas) g.dispose();
  return unida ?? null;
}
