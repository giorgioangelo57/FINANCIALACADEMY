import {
  AdditiveBlending,
  BoxGeometry,
  CircleGeometry,
  DoubleSide,
  Float32BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  type Material,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  type Object3D,
  PlaneGeometry,
  SphereGeometry,
} from 'three';
import { colorDominio } from '../../ui/format.ts';
import { AVENIDA, CALLE, type ModeloCiudad, tramosEntreCruces, type ZonaVisual } from '../../world/cityModel.ts';
import { centroRect, encoger, longitudSegmento, pseudoAleatorio, type Rect, type Segmento } from '../../world/geometry.ts';
import { construirArquitectura, type DatosArquitectura } from './architecture.ts';
import { emisivo, esCompartido, mate, unir } from './materials.ts';
import { NIVEL, PALETA } from './palette.ts';
import { texturaAsfalto } from './textures.ts';
import { construirManzanaUrbana, esSueloCompartido, losaPlanta, NIVEL_PASAJE, suelo } from './urbanGround.ts';

/*
 * Construcción de la maqueta a partir del modelo visual. Solo crea objetos Three.js
 * (sin renderer ni DOM), así que se puede probar en Node.
 *
 * - Capa estática: peana, calles, medianas, manzanas, plazas, arbolado y farolas.
 * - Capa dinámica: edificios, lectura de Atlas, hitos "Estudia ya" y tráfico. Se rehace cuando
 *   cambia el progreso.
 *
 * Regla anti-parpadeo: ninguna superficie visible comparte plano con otra. Cada nivel del suelo
 * está en `NIVEL` y los calcos (marcas viales, ventanas) usan polygonOffset.
 */

export type DatosSeleccionables = { tipo: 'zona'; seccionId: string } | { tipo: 'edificio'; conceptoId: string };

const MARGEN_PEANA = 3;

function losa(r: Rect, desde: number, hasta: number, material: Material | Material[]): Mesh {
  const malla = new Mesh(new BoxGeometry(r.ancho, hasta - desde, r.fondo), material);
  const c = centroRect(r);
  malla.position.set(c.x, (desde + hasta) / 2, c.z);
  malla.receiveShadow = true;
  return malla;
}

/** Caja orientada a lo largo de un eje de calle (desplazada `lateral` en perpendicular). */
function aLoLargo(s: Segmento, ancho: number, alto: number, y: number, lateral = 0): BufferGeometry {
  const largo = longitudSegmento(s);
  const horizontal = Math.abs(s.a.z - s.b.z) < 1e-9;
  const g = horizontal ? new BoxGeometry(largo, alto, ancho) : new BoxGeometry(ancho, alto, largo);
  const cx = (s.a.x + s.b.x) / 2 + (horizontal ? 0 : lateral);
  const cz = (s.a.z + s.b.z) / 2 + (horizontal ? lateral : 0);
  return g.translate(cx, y + alto / 2, cz);
}

/* ------------------------------------------------------------------ capa estática */

export function construirCapaEstatica(m: ModeloCiudad): Group {
  const capa = new Group();
  capa.name = 'estatica';
  const lado = m.lado + MARGEN_PEANA * 2;
  const ciudad: Rect = { x: -m.lado / 2, z: -m.lado / 2, ancho: m.lado, fondo: m.lado };

  // Peana de madera con canto claro: la ciudad es una maqueta sobre una mesa.
  const madera = mate(PALETA.peanaMadera, { rugosidad: 0.65 });
  const peana = losa({ x: -lado / 2, z: -lado / 2, ancho: lado, fondo: lado }, NIVEL.peana - 3, NIVEL.peana, [
    madera, madera, mate(PALETA.peanaCanto, { rugosidad: 0.9 }), madera, madera, madera,
  ]);
  peana.name = 'peana';
  const asfalto = losaPlanta(ciudad, NIVEL.peana, NIVEL.calle, suelo('#8f8a86', texturaAsfalto, 0.95));
  asfalto.name = 'asfalto';
  capa.add(peana, asfalto);

  const ejes = [...m.avenidas, ...m.calles];

  // Bulevares: mediana ajardinada entre cruces.
  const medianas = m.avenidas.flatMap((s) => tramosEntreCruces(s, ejes, AVENIDA * 0.75)).map((t) => aLoLargo(t, 1.2, NIVEL.mediana, 0));
  const mediana = unir(medianas);
  if (mediana) {
    const malla = new Mesh(mediana, mate(PALETA.mediana, { rugosidad: 1 }));
    malla.name = 'medianas';
    malla.receiveShadow = true;
    capa.add(malla);
  }

  // Marcas viales discontinuas: eje de las calles y carriles de las avenidas.
  const marcas: BufferGeometry[] = [];
  const discontinua = (t: Segmento, lateral: number) => {
    const largo = longitudSegmento(t);
    const n = Math.floor(largo / 2.4);
    for (let i = 0; i < n; i++) {
      const f0 = (i * 2.4 + 0.6) / largo;
      const f1 = (i * 2.4 + 1.7) / largo;
      const tramo = {
        a: { x: t.a.x + (t.b.x - t.a.x) * f0, z: t.a.z + (t.b.z - t.a.z) * f0 },
        b: { x: t.a.x + (t.b.x - t.a.x) * f1, z: t.a.z + (t.b.z - t.a.z) * f1 },
      };
      marcas.push(aLoLargo(tramo, 0.13, 0.03, 0, lateral));
    }
  };
  for (const s of m.calles) for (const t of tramosEntreCruces(s, ejes, CALLE)) discontinua(t, 0);
  for (const s of m.avenidas) for (const t of tramosEntreCruces(s, ejes, AVENIDA)) for (const l of [-2.2, 2.2]) discontinua(t, l);
  const marcasViales = unir(marcas);
  if (marcasViales) {
    const malla = new Mesh(marcasViales, mate(PALETA.marcaVial, { rugosidad: 0.9, calco: true }));
    malla.name = 'marcas-viales';
    malla.receiveShadow = true;
    capa.add(malla);
  }

  for (const z of m.zonas) capa.add(z.composicion === 'urbana' ? construirManzanaUrbana(z, m) : construirManzana(z, m));
  capa.add(construirAparcados(m));
  capa.add(construirArbolado(m), construirFarolas(m));
  return capa;
}

function construirManzana(z: ZonaVisual, m: ModeloCiudad): Group {
  const grupo = new Group();
  grupo.name = `zona-${z.seccionId}`;
  const indice = m.barrios.find((b) => b.grupoId === z.grupoId)?.indice ?? 0;
  const datos: DatosSeleccionables = { tipo: 'zona', seccionId: z.seccionId };

  const acera = losa(z.parcela, NIVEL.calle, NIVEL.acera, mate(PALETA.aceras[indice % PALETA.aceras.length]!, { rugosidad: 0.92 }));
  acera.name = 'plataforma';
  acera.userData = datos;
  grupo.add(acera);

  if (z.plaza) {
    // Plaza pública de la sección: pavimento, fuente y bancos.
    const p = z.plaza;
    const suelo = losa(p, NIVEL.acera, NIVEL.plaza, mate(PALETA.pavimentoPlaza, { rugosidad: 0.9 }));
    suelo.name = 'plaza';
    suelo.userData = datos;
    const c = centroRect(p);
    const r = Math.min(p.ancho, p.fondo) * 0.2;
    const fuente = new Group();
    fuente.name = 'fuente';
    const vaso = new Mesh(new CylinderGeometry(r, r * 1.05, 0.38, 28), mate(PALETA.piedra, { rugosidad: 0.8 }));
    vaso.position.set(c.x, NIVEL.plaza + 0.19, c.z);
    const agua = new Mesh(new CylinderGeometry(r * 0.86, r * 0.86, 0.06, 28), mate(PALETA.agua, { rugosidad: 0.12, metal: 0.1 }));
    agua.position.set(c.x, NIVEL.plaza + 0.33, c.z);
    const pila = new Mesh(new CylinderGeometry(0.16, 0.24, 1.0, 12), mate(PALETA.piedra, { rugosidad: 0.8 }));
    pila.position.set(c.x, NIVEL.plaza + 0.5, c.z);
    vaso.castShadow = pila.castShadow = true;
    vaso.receiveShadow = true;
    fuente.add(vaso, agua, pila);
    const bancos: BufferGeometry[] = [];
    for (const [dx, dz, giro] of [[0, 1, 0], [0, -1, 0], [1, 0, 1], [-1, 0, 1]] as const) {
      const g = new BoxGeometry(1.3, 0.22, 0.4);
      if (giro) g.rotateY(Math.PI / 2);
      bancos.push(g.translate(c.x + dx * (r + 1.1), NIVEL.plaza + 0.11, c.z + dz * (r + 1.1)));
    }
    const malla = new Mesh(unir(bancos)!, mate(PALETA.peanaMadera, { rugosidad: 0.7 }));
    malla.castShadow = true;
    grupo.add(suelo, fuente, malla);
  }
  return grupo;
}

function construirArbolado(m: ModeloCiudad): Group {
  const grupo = new Group();
  grupo.name = 'arbolado';
  const n = m.arboles.length;
  if (!n) return grupo;
  const troncos = new InstancedMesh(new CylinderGeometry(0.09, 0.13, 1, 6), mate(PALETA.tronco), n);
  const copas = new InstancedMesh(
    new IcosahedronGeometry(0.85, 1),
    new MeshStandardMaterial({ roughness: 0.95, flatShading: true }),
    n,
  );
  const matriz = new Matrix4();
  const color = new Color();
  m.arboles.forEach((a, i) => {
    const e = a.escala;
    const base = a.motivo === 'plaza' || a.motivo === 'patio' ? NIVEL.plaza : a.motivo === 'paseo' ? NIVEL_PASAJE : NIVEL.mediana;
    matriz.makeScale(e, e * 1.3, e).setPosition(a.posicion.x, base + 0.65 * e, a.posicion.z);
    troncos.setMatrixAt(i, matriz);
    matriz.makeScale(e, e * 1.12, e).setPosition(a.posicion.x, base + 1.75 * e, a.posicion.z);
    copas.setMatrixAt(i, matriz);
    copas.setColorAt(i, color.set(PALETA.copas[i % PALETA.copas.length]!));
  });
  troncos.castShadow = copas.castShadow = true;
  copas.receiveShadow = true;
  grupo.add(troncos, copas);
  return grupo;
}

function construirFarolas(m: ModeloCiudad): Group {
  const grupo = new Group();
  grupo.name = 'farolas';
  const n = m.farolas.length;
  if (!n) return grupo;
  const postes = new InstancedMesh(new CylinderGeometry(0.045, 0.06, 2.1, 6).translate(0, 1.05, 0), mate(PALETA.farola, { rugosidad: 0.5, metal: 0.4 }), n);
  const luces = new InstancedMesh(new SphereGeometry(0.17, 10, 8).translate(0, 2.15, 0), emisivo(PALETA.luzFarola), n);
  const matriz = new Matrix4();
  m.farolas.forEach((p, i) => {
    matriz.makeTranslation(p.x, NIVEL.calle, p.z);
    postes.setMatrixAt(i, matriz);
    luces.setMatrixAt(i, matriz);
  });
  postes.castShadow = true;
  grupo.add(postes, luces);
  return grupo;
}

/* ------------------------------------------------------------------ capa dinámica */

export interface RutaCoche {
  rect: Rect;
  /** Posición inicial en el recorrido (0–1) y vueltas por segundo. */
  inicio: number;
  velocidad: number;
}

const carroceria = () =>
  unir([new BoxGeometry(1.0, 0.36, 0.5).translate(0, 0.26, 0), new BoxGeometry(0.55, 0.26, 0.44).translate(-0.06, 0.57, 0)])!;

/**
 * Gramática urbana: coches aparcados junto a las aceras. Son estáticos (el barrio está habitado
 * aunque no se haya estudiado); el tráfico en movimiento sigue reservado al estudio.
 */
function construirAparcados(m: ModeloCiudad): Group {
  const grupo = new Group();
  grupo.name = 'aparcados';
  const plazas: { x: number; z: number; giro: number }[] = [];
  m.zonas.forEach((z, k) => {
    if (z.composicion !== 'urbana') return;
    const r = z.parcela;
    const lados = [
      { a: { x: r.x, z: r.z - 0.75 }, b: { x: r.x + r.ancho, z: r.z - 0.75 }, giro: 0 },
      { a: { x: r.x, z: r.z + r.fondo + 0.75 }, b: { x: r.x + r.ancho, z: r.z + r.fondo + 0.75 }, giro: 0 },
      { a: { x: r.x - 0.75, z: r.z }, b: { x: r.x - 0.75, z: r.z + r.fondo }, giro: Math.PI / 2 },
      { a: { x: r.x + r.ancho + 0.75, z: r.z }, b: { x: r.x + r.ancho + 0.75, z: r.z + r.fondo }, giro: Math.PI / 2 },
    ];
    lados.forEach((l, j) => {
      const largo = Math.hypot(l.b.x - l.a.x, l.b.z - l.a.z);
      for (let d = 3.5, i = 0; d < largo - 3.5; d += 1.45, i++) {
        if (pseudoAleatorio(k * 31 + j * 7 + i, 11) < 0.55) continue;
        const t = d / largo;
        plazas.push({ x: l.a.x + (l.b.x - l.a.x) * t, z: l.a.z + (l.b.z - l.a.z) * t, giro: l.giro });
      }
    });
  });
  if (!plazas.length) return grupo;
  const malla = new InstancedMesh(carroceria(), new MeshStandardMaterial({ roughness: 0.5, metalness: 0.2 }), plazas.length);
  const matriz = new Matrix4();
  const giro = new Matrix4();
  const tonos = ['#8a8f96', '#3f4a57', '#b7b0a4', '#6b3b33', '#2c2e33', '#c9c4ba'];
  plazas.forEach((p, i) => {
    malla.setMatrixAt(i, matriz.makeTranslation(p.x, NIVEL.calle, p.z).multiply(giro.makeRotationY(p.giro)));
    malla.setColorAt(i, new Color(tonos[i % tonos.length]!));
  });
  malla.castShadow = true;
  malla.name = 'coches-aparcados';
  grupo.add(malla);
  return grupo;
}

export interface CapaDinamica {
  raiz: Group;
  edificios: Map<string, Group>;
  /** Lámina de color por zona para la lectura de Atlas. */
  calor: Mesh[];
  /** Columnas de luz de "Estudia ya". */
  senales: Group[];
  coches: InstancedMesh | null;
  rutas: RutaCoche[];
  /** Peatones de las zonas en estudio (gramática urbana): más dominio, más vida en la acera. */
  peatones: InstancedMesh | null;
  rutasPeatones: RutaCoche[];
}

/** Altura de la lámina del Atlas: por encima de todos los edificios. */
export const ALTURA_ATLAS = 17;

export const datosArquitectura = (g: Object3D): DatosArquitectura | undefined => g.userData.arquitectura;

export function construirCapaDinamica(m: ModeloCiudad): CapaDinamica {
  const raiz = new Group();
  raiz.name = 'dinamica';
  const edificios = new Map<string, Group>();
  for (const e of m.edificios) {
    const g = construirArquitectura(e);
    edificios.set(e.conceptoId, g);
    raiz.add(g);
  }

  const calor = m.zonas.map((z) => {
    const c = centroRect(z.parcela);
    const plano = new Mesh(
      new PlaneGeometry(z.parcela.ancho, z.parcela.fondo),
      new MeshBasicMaterial({
        color: z.dominio > 0 ? colorDominio(z.dominio) : PALETA.sinEstudiar,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    plano.rotation.x = -Math.PI / 2;
    plano.position.set(c.x, ALTURA_ATLAS, c.z);
    plano.visible = false;
    plano.renderOrder = 10;
    plano.name = `calor-${z.seccionId}`;
    raiz.add(plano);
    return plano;
  });

  // "Estudia ya": una columna de luz cálida que sale del corazón de la zona recomendada. Es un
  // fenómeno del mundo, no un pin: no se mueve ni parpadea, y su intensidad sigue el orden de la
  // recomendación (la primera llama más).
  const senales = m.zonas
    .filter((z) => z.prioridad !== null)
    .map((z) => {
      const g = columnaDeLuz(1 - (z.prioridad! - 1) * 0.3);
      g.name = `senal-estudia-ya-${z.prioridad}`;
      const corazon = z.patios.reduce<Rect | null>((mayor, p) => (!mayor || p.ancho * p.fondo > mayor.ancho * mayor.fondo ? p : mayor), null)
        ?? z.plaza ?? z.parcela;
      const c = centroRect(corazon);
      g.position.set(c.x, z.patios.length || z.plaza ? NIVEL.plaza : NIVEL.acera, c.z);
      g.userData = { seccionId: z.seccionId };
      raiz.add(g);
      return g;
    });

  // Tráfico: solo hay actividad alrededor de las zonas que ya has empezado a estudiar.
  const rutas: RutaCoche[] = [];
  m.zonas.forEach((z, k) => {
    if (z.dominio <= 0) return;
    const cantidad = Math.max(1, Math.round(z.dominio * 3));
    for (let i = 0; i < cantidad; i++) {
      rutas.push({ rect: encoger(z.lote, 0.6), inicio: (i / cantidad + k * 0.137) % 1, velocidad: 0.01 + ((k * 7 + i * 3) % 5) * 0.002 });
    }
  });
  let coches: InstancedMesh | null = null;
  if (rutas.length) {
    coches = new InstancedMesh(carroceria(), new MeshStandardMaterial({ roughness: 0.45, metalness: 0.2 }), rutas.length);
    rutas.forEach((_, i) => coches!.setColorAt(i, new Color(PALETA.coches[i % PALETA.coches.length]!)));
    // Lo que se mueve no proyecta sombra: así el mapa de sombras no se recalcula en cada fotograma.
    coches.name = 'trafico';
    colocarCoches(coches, rutas, 0);
    raiz.add(coches);
  }

  const rutasPeatones: RutaCoche[] = [];
  m.zonas.forEach((z, k) => {
    if (z.composicion !== 'urbana' || z.dominio <= 0) return;
    const cantidad = Math.round(z.dominio * 10);
    for (let i = 0; i < cantidad; i++) {
      const sentido = i % 2 ? 1 : -1;
      rutasPeatones.push({ rect: encoger(z.parcela, 0.5 + (i % 3) * 0.25), inicio: (i * 0.173 + k * 0.31) % 1, velocidad: sentido * (0.0025 + (i % 4) * 0.0006) });
    }
  });
  let peatones: InstancedMesh | null = null;
  if (rutasPeatones.length) {
    const figura = unir([new CylinderGeometry(0.13, 0.15, 0.62, 8).translate(0, 0.31, 0), new SphereGeometry(0.12, 10, 8).translate(0, 0.76, 0)])!;
    peatones = new InstancedMesh(figura, new MeshStandardMaterial({ roughness: 0.8 }), rutasPeatones.length);
    const ropa = ['#3b4656', '#7a4d3a', '#c9b9a0', '#4d5b4a', '#2d2f36', '#8b6f4e'];
    rutasPeatones.forEach((_, i) => peatones!.setColorAt(i, new Color(ropa[i % ropa.length]!)));
    peatones.name = 'peatones';
    colocarEnRecorrido(peatones, rutasPeatones, 0, NIVEL.acera);
    raiz.add(peatones);
  }

  return { raiz, edificios, calor, senales, coches, rutas, peatones, rutasPeatones };
}

/** Columna de luz aditiva con degradado vertical (en los vértices) y un halo en el suelo. */
function columnaDeLuz(intensidad: number): Group {
  const g = new Group();
  const oro = new Color('#ffb84a').multiplyScalar(0.3 * intensidad);
  const fuste = new CylinderGeometry(0.75, 0.42, 24, 24, 12, true).translate(0, 12, 0);
  const colores: number[] = [];
  const pos = fuste.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 24;
    const k = (1 - t) ** 2.2;
    colores.push(oro.r * k, oro.g * k, oro.b * k);
  }
  fuste.setAttribute('color', new Float32BufferAttribute(colores, 3));
  const luz = new MeshBasicMaterial({ vertexColors: true, blending: AdditiveBlending, transparent: true, depthWrite: false, side: DoubleSide });
  const columna = new Mesh(fuste, luz);
  columna.name = 'senal-columna';
  columna.renderOrder = 5;
  const halo = new CircleGeometry(3.4, 40).rotateX(-Math.PI / 2).translate(0, 0.04, 0);
  const hpos = halo.getAttribute('position');
  const hcol: number[] = [];
  for (let i = 0; i < hpos.count; i++) {
    const r = Math.hypot(hpos.getX(i), hpos.getZ(i)) / 3.4;
    const k = (1 - r) ** 2 * 1.4;
    hcol.push(oro.r * k, oro.g * k, oro.b * k);
  }
  halo.setAttribute('color', new Float32BufferAttribute(hcol, 3));
  const suelo = new Mesh(halo, luz);
  suelo.name = 'senal-halo';
  suelo.renderOrder = 5;
  g.add(columna, suelo);
  return g;
}

const matrizCoche = new Matrix4();
const giroCoche = new Matrix4();

/** Coloca cada coche en su recorrido alrededor de la manzana en el instante `t` (segundos). */
export function colocarCoches(coches: InstancedMesh, rutas: RutaCoche[], t: number): void {
  colocarEnRecorrido(coches, rutas, t, NIVEL.calle);
}

/** Recorrido rectangular genérico (coches por la calzada, peatones por la acera). */
export function colocarEnRecorrido(malla: InstancedMesh, rutas: RutaCoche[], t: number, y: number): void {
  const coches = malla;
  rutas.forEach((ruta, i) => {
    const { rect } = ruta;
    const perimetro = 2 * (rect.ancho + rect.fondo);
    let d = ((((ruta.inicio + t * ruta.velocidad) % 1) + 1) % 1) * perimetro;
    let x: number, z: number, angulo: number;
    if (d < rect.ancho) {
      x = rect.x + d; z = rect.z; angulo = 0;
    } else if ((d -= rect.ancho) < rect.fondo) {
      x = rect.x + rect.ancho; z = rect.z + d; angulo = -Math.PI / 2;
    } else if ((d -= rect.fondo) < rect.ancho) {
      x = rect.x + rect.ancho - d; z = rect.z + rect.fondo; angulo = Math.PI;
    } else {
      d -= rect.ancho;
      x = rect.x; z = rect.z + rect.fondo - d; angulo = Math.PI / 2;
    }
    giroCoche.makeRotationY(angulo);
    matrizCoche.makeTranslation(x, y, z).multiply(giroCoche);
    coches.setMatrixAt(i, matrizCoche);
  });
  coches.instanceMatrix.needsUpdate = true;
}

/** Libera geometrías y materiales propios (no compartidos) de un subárbol. */
export function liberar(objeto: Object3D): void {
  objeto.traverse((o) => {
    const malla = o as Partial<Mesh>;
    if (malla.geometry instanceof BufferGeometry) malla.geometry.dispose();
    const lista = Array.isArray(malla.material) ? malla.material : malla.material ? [malla.material] : [];
    for (const mat of lista) if (!esCompartido(mat) && !esSueloCompartido(mat)) mat.dispose();
  });
}
