import {
  BoxGeometry,
  Color,
  ConeGeometry,
  ExtrudeGeometry,
  GreaterDepth,
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector3,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { pseudoAleatorio } from '../../world/geometry.ts';

/*
 * El personaje jugable: versión 3D y peluda del dibujo del usuario. Cuerpo redondeado azul petróleo
 * cubierto de pelo (mechones instanciados), dos orejas (una negra y otra azul), cinta roja con el
 * lazo y las colas a un lado, ojos grandes y dos patas. Mira hacia +z. Mide unas 1,6 unidades.
 */

const PALETA_AVATAR = {
  pelo: '#174b61',
  peloClaro: '#2b6c87',
  negro: '#101418',
  cinta: '#e8424a',
  lazo: '#a50f2f',
  ojo: '#f7f4ee',
  pupila: '#0c2633',
  orejaInterior: '#e3a0aa',
} as const;

export interface PartesAvatar {
  raiz: Group;
  cuerpo: Group;
  pataIzquierda: Mesh;
  pataDerecha: Mesh;
  colas: Group;
}

const mat = (color: string, rugosidad = 0.9) => new MeshStandardMaterial({ color, roughness: rugosidad });

/** Mechones repartidos sobre una caja redondeada (w × h × d), orientados según la normal. */
function pelaje(w: number, h: number, d: number, cantidad: number): InstancedMesh {
  const mechon = new ConeGeometry(0.075, 0.13, 5).translate(0, 0.05, 0);
  const malla = new InstancedMesh(mechon, new MeshStandardMaterial({ roughness: 1 }), cantidad);
  const m = new Matrix4();
  const q = new Quaternion();
  const arriba = new Vector3(0, 1, 0);
  const color = new Color();
  const base = new Color(PALETA_AVATAR.pelo);
  const claro = new Color(PALETA_AVATAR.peloClaro);
  let i = 0;
  for (let k = 0; i < cantidad; k++) {
    // Dirección aleatoria determinista → punto de la superficie de una "caja suave" (superelipsoide).
    const u = pseudoAleatorio(k, 1) * 2 - 1;
    const t = pseudoAleatorio(k, 2) * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    const dir = new Vector3(r * Math.cos(t), u, r * Math.sin(t));
    const e = 6;
    const escala = 1 / ((Math.abs(dir.x) ** e + Math.abs(dir.y) ** e + Math.abs(dir.z) ** e) ** (1 / e));
    const p = new Vector3(dir.x * escala * (w / 2), dir.y * escala * (h / 2), dir.z * escala * (d / 2));
    // Sin pelo en la cara (donde van los ojos y la cinta) ni bajo el cuerpo.
    if (p.z > d / 2 - 0.08 && Math.abs(p.x) < w * 0.42 && p.y > -h * 0.35 && p.y < h * 0.3) continue;
    if (p.y < -h / 2 + 0.05) continue;
    const normal = new Vector3(p.x / (w / 2) ** 2, p.y / (h / 2) ** 2, p.z / (d / 2) ** 2).normalize();
    // Los mechones caen un poco: el pelo pesa.
    normal.y -= 0.45;
    normal.normalize();
    q.setFromUnitVectors(arriba, normal);
    const largo = 0.6 + pseudoAleatorio(k, 3) * 0.5;
    m.compose(p, q, new Vector3(1, largo, 1));
    malla.setMatrixAt(i, m);
    malla.setColorAt(i, color.copy(base).lerp(claro, pseudoAleatorio(k, 4) * 0.7));
    i++;
  }
  malla.castShadow = true;
  malla.name = 'pelaje';
  return malla;
}

export function construirAvatar(): PartesAvatar {
  const raiz = new Group();
  raiz.name = 'avatar';
  const cuerpo = new Group();
  cuerpo.name = 'avatar-cuerpo';
  const W = 1.15;
  const H = 1.0;
  const D = 0.9;
  const yCuerpo = 0.42 + H / 2;
  cuerpo.position.y = yCuerpo;

  const nucleo = new Mesh(new RoundedBoxGeometry(W, H, D, 4, 0.32), mat(PALETA_AVATAR.pelo));
  nucleo.castShadow = true;
  cuerpo.add(nucleo, pelaje(W, H, D, 1700));
  // Silueta "rayos X": solo se dibuja donde algo tapa al personaje (árboles, edificios), para no
  // perderlo de vista al pasear. GreaterDepth = visible únicamente detrás de otra geometría.
  const silueta = new Mesh(
    nucleo.geometry,
    new MeshBasicMaterial({ color: '#7cc8e8', depthWrite: false, depthFunc: GreaterDepth }),
  );
  silueta.name = 'avatar-silueta';
  silueta.scale.setScalar(0.96);
  cuerpo.add(silueta);

  // Orejas de gato: triángulos de punta suave con el interior rosado y un mechón en la base.
  // La izquierda negra y la derecha azul, como en el dibujo.
  const oreja = (color: string, lado: number) => {
    const g = new Group();
    g.name = lado < 0 ? 'avatar-oreja-izquierda' : 'avatar-oreja-derecha';
    const triangulo = (ancho: number, alto: number) => {
      const f = new Shape();
      f.moveTo(-ancho / 2, 0);
      f.lineTo(ancho / 2, 0);
      f.quadraticCurveTo(ancho * 0.12, alto * 0.7, 0, alto);
      f.quadraticCurveTo(-ancho * 0.12, alto * 0.7, -ancho / 2, 0);
      return f;
    };
    const exterior = new Mesh(
      new ExtrudeGeometry(triangulo(0.44, 0.46), { depth: 0.1, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 2 }).translate(0, 0, -0.05),
      mat(color),
    );
    exterior.castShadow = true;
    const interior = new Mesh(new ExtrudeGeometry(triangulo(0.26, 0.3), { depth: 0.02, bevelEnabled: false }), mat(PALETA_AVATAR.orejaInterior, 0.8));
    interior.position.set(0, 0.04, 0.07);
    g.add(exterior, interior);
    // Mechón de pelo en la base, para que la oreja "salga" del pelaje.
    for (let k = -1; k <= 1; k++) {
      const mechon = new Mesh(new ConeGeometry(0.06, 0.16, 5), mat(PALETA_AVATAR.peloClaro, 1));
      mechon.position.set(k * 0.1, 0.06, 0.09);
      mechon.rotation.set(-0.3, 0, k * 0.4);
      g.add(mechon);
    }
    g.position.set(lado * 0.3, H / 2 - 0.02, -0.02);
    // Abiertas hacia fuera e inclinadas un poco hacia delante.
    g.rotation.set(-0.12, lado * -0.25, lado * -0.26);
    return g;
  };
  cuerpo.add(oreja(PALETA_AVATAR.negro, -1), oreja(PALETA_AVATAR.pelo, 1));

  // Cinta roja alrededor de la cabeza, por encima del pelo.
  const cinta = new Mesh(new RoundedBoxGeometry(W + 0.32, 0.22, D + 0.32, 2, 0.1), mat(PALETA_AVATAR.cinta, 0.7));
  cinta.position.y = 0.16;
  cinta.castShadow = true;
  cuerpo.add(cinta);

  // Lazo y colas a la derecha: se mecen al caminar.
  const colas = new Group();
  colas.name = 'avatar-colas';
  colas.position.set(W / 2 + 0.15, 0.12, -0.1);
  const nudo = new Mesh(new SphereGeometry(0.17, 14, 10), mat(PALETA_AVATAR.lazo, 0.7));
  const cola1 = new Mesh(new BoxGeometry(0.1, 0.55, 0.3).translate(0, -0.27, 0), mat(PALETA_AVATAR.lazo, 0.7));
  cola1.rotation.set(0.35, 0, -0.35);
  const cola2 = new Mesh(new BoxGeometry(0.1, 0.45, 0.24).translate(0, -0.22, 0), mat(PALETA_AVATAR.lazo, 0.7));
  cola2.rotation.set(-0.3, 0, -0.55);
  for (const p of [nudo, cola1, cola2]) p.castShadow = true;
  colas.add(nudo, cola1, cola2);
  cuerpo.add(colas);

  // Ojos grandes bajo la cinta.
  for (const lado of [-1, 1]) {
    const ojo = new Mesh(new SphereGeometry(0.2, 18, 14), mat(PALETA_AVATAR.ojo, 0.35));
    ojo.scale.set(1, 1, 0.45);
    ojo.position.set(lado * 0.24, -0.12, D / 2 + 0.03);
    const pupila = new Mesh(new SphereGeometry(0.07, 12, 10), mat(PALETA_AVATAR.pupila, 0.3));
    pupila.position.set(lado * 0.2, -0.08, D / 2 + 0.11);
    cuerpo.add(ojo, pupila);
  }

  // Patas: la izquierda negra, la derecha azul.
  const pata = (color: string, x: number) => {
    const p = new Mesh(new BoxGeometry(0.2, 0.46, 0.24).translate(0, -0.23, 0), mat(color));
    p.position.set(x, 0.46, 0);
    p.castShadow = true;
    return p;
  };
  const pataIzquierda = pata(PALETA_AVATAR.negro, -0.26);
  const pataDerecha = pata(PALETA_AVATAR.pelo, 0.26);
  pataIzquierda.name = 'avatar-pata-izquierda';
  pataDerecha.name = 'avatar-pata-derecha';

  raiz.add(cuerpo, pataIzquierda, pataDerecha);
  // Orden de dibujado: escenario (0) → silueta (1, solo donde algo tapa) → personaje (2, encima
  // de su propia silueta cuando está a la vista).
  raiz.traverse((o) => {
    o.renderOrder = o === silueta ? 1 : 2;
  });
  return { raiz, cuerpo, pataIzquierda, pataDerecha, colas };
}

/**
 * Animación del personaje: balanceo al caminar (proporcional a la velocidad) y colas de la cinta
 * que se quedan atrás. Con movimiento reducido solo se desplaza, sin balanceo.
 */
export interface PoseAvatar {
  velocidad: number;
  /** Altura del salto (0 en el suelo). */
  altura: number;
  /** En pleno dash. */
  dash: boolean;
  /** 0–1: aplastamiento al aterrizar. */
  aterrizaje: number;
}

export function animarAvatar(p: PartesAvatar, t: number, pose: PoseAvatar, reducido: boolean): void {
  const enElAire = pose.altura > 0.01;
  const k = reducido || enElAire ? 0 : Math.min(1, pose.velocidad / 6);
  const fase = t * 11;
  p.pataIzquierda.rotation.x = Math.sin(fase) * 0.7 * k + (enElAire && !reducido ? 0.5 : 0);
  p.pataDerecha.rotation.x = -Math.sin(fase) * 0.7 * k + (enElAire && !reducido ? -0.3 : 0);
  p.cuerpo.position.y = 0.42 + 0.5 + Math.abs(Math.sin(fase)) * 0.09 * k;
  p.cuerpo.rotation.z = Math.sin(fase) * 0.06 * k;
  // Dash: el cuerpo se inclina hacia delante y las colas de la cinta se tensan detrás.
  p.cuerpo.rotation.x = reducido ? 0 : pose.dash ? 0.35 : 0;
  // Aterrizaje: aplastamiento breve.
  const aplastar = reducido ? 0 : pose.aterrizaje * 0.18;
  p.cuerpo.scale.set(1 + aplastar * 0.6, 1 - aplastar, 1 + aplastar * 0.6);
  p.colas.rotation.x = reducido ? 0 : pose.dash ? -1.3 : -0.6 * k + Math.sin(t * 6) * 0.15 * k + (enElAire ? -0.4 : 0);
}
