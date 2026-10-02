import { DataTexture, LinearMipmapLinearFilter, RepeatWrapping, RGBAFormat, SRGBColorSpace } from 'three';
import { pseudoAleatorio } from '../../world/geometry.ts';

/*
 * Texturas procedurales del suelo (sin imágenes externas, generadas una vez y en Node también).
 * Dan materialidad a calles, aceras y jardines: la escala de una ciudad se lee en su pavimento.
 * Las geometrías del suelo llevan UV en unidades del mundo; `repeat` fija el tamaño real de la pieza.
 */

const LADO = 64;

function textura(pintar: (x: number, y: number) => [number, number, number], metrosPorTesela: number): DataTexture {
  const datos = new Uint8Array(LADO * LADO * 4);
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const [r, g, b] = pintar(x, y);
      const i = (y * LADO + x) * 4;
      datos[i] = r;
      datos[i + 1] = g;
      datos[i + 2] = b;
      datos[i + 3] = 255;
    }
  }
  const t = new DataTexture(datos, LADO, LADO, RGBAFormat);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.colorSpace = SRGBColorSpace;
  t.minFilter = LinearMipmapLinearFilter;
  t.generateMipmaps = true;
  t.anisotropy = 4;
  t.repeat.set(1 / metrosPorTesela, 1 / metrosPorTesela);
  t.needsUpdate = true;
  return t;
}

const variar = (base: number, cantidad: number, a: number, b: number) =>
  Math.max(0, Math.min(255, Math.round(base + (pseudoAleatorio(a, b) - 0.5) * cantidad)));

const cache = new Map<string, DataTexture>();
const unaVez = (clave: string, crear: () => DataTexture) => {
  let t = cache.get(clave);
  if (!t) {
    t = crear();
    cache.set(clave, t);
  }
  return t;
};

/** Losetas de acera: piezas de 16 px con junta y leve variación de tono por pieza. */
export const texturaAcera = () =>
  unaVez('acera', () =>
    textura((x, y) => {
      const junta = x % 16 === 0 || y % 16 === 0;
      const pieza = Math.floor(x / 16) * 7 + Math.floor(y / 16) * 13;
      const tono = junta ? 196 : variar(232, 14, pieza, 3) + variar(0, 6, x, y);
      return [tono, Math.round(tono * 0.96), Math.round(tono * 0.9)];
    }, 4),
  );

/** Losas grandes de piedra para plazas y antepatios, con aparejo a matajunta. */
export const texturaLosas = () =>
  unaVez('losas', () =>
    textura((x, y) => {
      const fila = Math.floor(y / 32);
      const desplazada = (x + (fila % 2) * 16) % 32;
      const junta = desplazada === 0 || y % 32 === 0;
      const pieza = Math.floor((x + (fila % 2) * 16) / 32) * 5 + fila * 11;
      const tono = junta ? 182 : variar(222, 18, pieza, 9) + variar(0, 5, x, y);
      return [tono, Math.round(tono * 0.95), Math.round(tono * 0.87)];
    }, 6),
  );

/** Asfalto: grano fino. */
export const texturaAsfalto = () =>
  unaVez('asfalto', () =>
    textura((x, y) => {
      const tono = variar(96, 26, x, y);
      return [tono, Math.round(tono * 0.97), Math.round(tono * 0.94)];
    }, 3),
  );

/** Césped cortado en franjas. */
export const texturaCesped = () =>
  unaVez('cesped', () =>
    textura((x, y) => {
      const franja = Math.floor(x / 16) % 2 ? 8 : -8;
      const g = variar(176 + franja, 22, x * 3, y);
      return [Math.round(g * 0.62), g, Math.round(g * 0.42)];
    }, 5),
  );
