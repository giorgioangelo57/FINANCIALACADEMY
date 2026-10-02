import { BoxGeometry, CylinderGeometry, ExtrudeGeometry, Group, type Material, Mesh, MeshStandardMaterial, Shape, SphereGeometry, type Texture } from 'three';
import type { EdificioVisual, ModeloCiudad, ZonaVisual } from '../../world/cityModel.ts';
import { encoger, type Rect } from '../../world/geometry.ts';
import { emisivo, mate, unir } from './materials.ts';
import { NIVEL } from './palette.ts';
import { texturaAcera, texturaCesped, texturaLosas } from './textures.ts';

/*
 * Suelo de la gramática urbana. Cada pieza existe por una razón urbana:
 * acera con chaflán (la esquina achaflanada del Ensanche), manzana, patio ajardinado con sendas,
 * pasaje peatonal entre manzanas y antepatio delante de los edificios emblemáticos.
 */

const texturados = new Map<string, MeshStandardMaterial>();
/** Material con textura de suelo (compartido, nunca se libera). */
export function suelo(color: string, mapa: () => Texture, rugosidad = 0.92): MeshStandardMaterial {
  const clave = `${color}|${mapa.name}`;
  let m = texturados.get(clave);
  if (!m) {
    m = new MeshStandardMaterial({ color, map: mapa(), roughness: rugosidad });
    texturados.set(clave, m);
  }
  return m;
}

export const esSueloCompartido = (m: Material): boolean => [...texturados.values()].includes(m as MeshStandardMaterial);

/**
 * Losa horizontal con planta rectangular (y esquinas achaflanadas si `chaflan` > 0). Sus UV van en
 * unidades del mundo, así que las texturas de suelo mantienen su escala real.
 */
export function losaPlanta(r: Rect, desde: number, hasta: number, material: Material, chaflan = 0): Mesh {
  const c = Math.min(chaflan, r.ancho / 3, r.fondo / 3);
  const forma = new Shape();
  // La forma se dibuja en (x, -z): tras girar -90° sobre X, el eje y de la forma pasa a ser -z.
  const x0 = r.x;
  const x1 = r.x + r.ancho;
  const y0 = -(r.z + r.fondo);
  const y1 = -r.z;
  forma.moveTo(x0 + c, y0);
  forma.lineTo(x1 - c, y0);
  forma.lineTo(x1, y0 + c);
  forma.lineTo(x1, y1 - c);
  forma.lineTo(x1 - c, y1);
  forma.lineTo(x0 + c, y1);
  forma.lineTo(x0, y1 - c);
  forma.lineTo(x0, y0 + c);
  forma.closePath();
  const g = new ExtrudeGeometry(forma, { depth: hasta - desde, bevelEnabled: false });
  g.rotateX(-Math.PI / 2);
  g.translate(0, desde, 0);
  const malla = new Mesh(g, material);
  malla.receiveShadow = true;
  return malla;
}

/** Nivel de las sendas del patio y del pavimento de los pasajes (sin coplanaridad). */
export const NIVEL_PASAJE = 0.245;
const NIVEL_SENDA = 0.31;

export function construirManzanaUrbana(z: ZonaVisual, m: ModeloCiudad): Group {
  const grupo = new Group();
  grupo.name = `zona-${z.seccionId}`;
  const datos = { tipo: 'zona', seccionId: z.seccionId };

  const acera = losaPlanta(z.parcela, NIVEL.calle, NIVEL.acera, suelo('#efe8dc', texturaAcera), 2.2);
  acera.name = 'plataforma';
  acera.userData = datos;
  grupo.add(acera);

  for (const p of z.pasajes) {
    const paseo = losaPlanta(p, NIVEL.acera, NIVEL_PASAJE, suelo('#e6d9c2', texturaLosas));
    paseo.name = 'pasaje';
    paseo.userData = datos;
    grupo.add(paseo);
  }

  for (const manzana of z.manzanas) {
    const losa = losaPlanta(encoger(manzana, -0.15), NIVEL.acera, NIVEL.lote, suelo('#ddd2bf', texturaLosas), 1.6);
    losa.name = 'manzana';
    losa.userData = datos;
    grupo.add(losa);
  }

  // Patios de manzana: jardín con dos sendas en cruz y bancos donde se cruzan.
  const sendas: BoxGeometry[] = [];
  for (const p of z.patios) {
    const jardin = encoger(p, 0.45);
    if (jardin.ancho < 1.2 || jardin.fondo < 1.2) continue;
    const cesped = losaPlanta(jardin, NIVEL.lote, NIVEL.plaza, suelo('#ffffff', texturaCesped, 1));
    cesped.name = 'patio';
    cesped.userData = datos;
    grupo.add(cesped);
    const cx = jardin.x + jardin.ancho / 2;
    const cz = jardin.z + jardin.fondo / 2;
    sendas.push(new BoxGeometry(jardin.ancho, NIVEL_SENDA - NIVEL.plaza, 0.9).translate(cx, (NIVEL.plaza + NIVEL_SENDA) / 2, cz));
    sendas.push(new BoxGeometry(0.9, NIVEL_SENDA - NIVEL.plaza, jardin.fondo).translate(cx, (NIVEL.plaza + NIVEL_SENDA) / 2, cz));
  }
  const sendasUnidas = unir(sendas);
  if (sendasUnidas) {
    const malla = new Mesh(sendasUnidas, mate('#d8c9ad', { rugosidad: 0.95 }));
    malla.receiveShadow = true;
    malla.name = 'sendas';
    grupo.add(malla);
  }

  for (const e of m.edificios) if (e.seccionId === z.seccionId && e.antepatio) grupo.add(antepatio(e, datos));
  return grupo;
}

/** Explanada de un emblemático: losas de piedra, dos jardineras y dos faroles a los lados. */
function antepatio(e: EdificioVisual, datos: object): Group {
  const g = new Group();
  g.name = `antepatio-${e.conceptoId}`;
  const a = e.antepatio!;
  const losa = losaPlanta(a, NIVEL.lote, NIVEL.plaza, suelo('#ece2cf', texturaLosas));
  losa.userData = datos;
  g.add(losa);
  const horizontal = a.ancho >= a.fondo;
  const largo = horizontal ? a.ancho : a.fondo;
  const piezas: BoxGeometry[] = [];
  const faroles: { x: number; z: number }[] = [];
  for (const lado of [-1, 1]) {
    const t = (lado * largo) / 2 - lado * 0.9;
    const x = horizontal ? a.x + a.ancho / 2 + t : a.x + a.ancho / 2;
    const z = horizontal ? a.z + a.fondo / 2 : a.z + a.fondo / 2 + t;
    piezas.push(new BoxGeometry(horizontal ? 1.1 : 0.7, 0.5, horizontal ? 0.7 : 1.1).translate(x, NIVEL.plaza + 0.25, z));
    faroles.push({ x: horizontal ? x - lado * 1.0 : x, z: horizontal ? z : z - lado * 1.0 });
  }
  const jardineras = new Mesh(unir(piezas)!, mate('#b9ab94', { rugosidad: 0.85 }));
  jardineras.castShadow = true;
  const verde = new Mesh(
    unir(piezas.map((p) => p.clone().scale(0.86, 1, 0.86).translate(0, 0.08, 0)))!,
    mate('#5f8a48', { rugosidad: 1 }),
  );
  g.add(jardineras, verde);
  const postes = unir(faroles.map((f) => new CylinderGeometry(0.05, 0.07, 2.0, 8).translate(f.x, NIVEL.plaza + 1.0, f.z)))!;
  const luces = unir(faroles.map((f) => new SphereGeometry(0.16, 10, 8).translate(f.x, NIVEL.plaza + 2.05, f.z)))!;
  const mPostes = new Mesh(postes, mate('#3a3a3d', { rugosidad: 0.5, metal: 0.5 }));
  mPostes.castShadow = true;
  g.add(mPostes, new Mesh(luces, emisivo('#ffe1a6')));
  return g;
}
