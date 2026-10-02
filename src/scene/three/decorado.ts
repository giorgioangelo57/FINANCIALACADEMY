import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DynamicDrawUsage,
  Float32BufferAttribute,
  Group,
  IcosahedronGeometry,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Points,
  PointsMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { ModeloCiudad } from '../../world/cityModel.ts';
import { encoger, pseudoAleatorio } from '../../world/geometry.ts';
import { colocarEnRecorrido, type RutaCoche } from './builders.ts';
import { unir } from './materials.ts';
import { NIVEL } from './palette.ts';

/*
 * Decorado vivo de la maqueta, sin significado de estudio (por eso es discreto y se apaga con
 * movimiento reducido):
 *  - halos de las farolas, que se encienden al atardecer y de noche;
 *  - bandadas de palomas que vuelan en círculo sobre las plazas;
 *  - nubes de algodón que derivan sobre la ciudad (solo vistas de lejos, de día);
 *  - la lluvia de monedas de la entrada.
 */

const ALTURA_LUZ_FAROLA = 2.15;
const MARGEN_PEANA = 3;
const PALOMAS_POR_PLAZA = 7;
const GOTAS_POR_FUENTE = 48;
const MONEDAS = 14;
const DURACION_LLUVIA = 3400;

export function texturaHalo(): CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const lienzo = document.createElement('canvas');
  lienzo.width = lienzo.height = 64;
  const ctx = lienzo.getContext('2d');
  if (!ctx) return null;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,236,190,1)');
  g.addColorStop(0.25, 'rgba(255,214,140,0.55)');
  g.addColorStop(1, 'rgba(255,200,120,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return new CanvasTexture(lienzo);
}

/** Paloma en "V": al escalar la altura de la V, aletea. */
function geometriaPaloma(): BufferGeometry {
  const pos = [
    // ala izquierda y ala derecha (dos triángulos por ala, visibles por las dos caras)
    0, 0, 0.12, -0.42, 0.18, 0, 0, 0, -0.12,
    0, 0, -0.12, -0.42, 0.18, 0, 0, 0, 0.12,
    0, 0, 0.12, 0, 0, -0.12, 0.42, 0.18, 0,
    0, 0, -0.12, 0, 0, 0.12, 0.42, 0.18, 0,
  ];
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  const cuerpo = new CylinderGeometry(0.05, 0.08, 0.36, 5).rotateX(Math.PI / 2);
  const cuerpoPlano = cuerpo.toNonIndexed();
  cuerpo.dispose();
  cuerpoPlano.deleteAttribute('uv');
  return unir([g, cuerpoPlano])!;
}

function geometriaNube(semilla: number): BufferGeometry {
  const piezas: BufferGeometry[] = [];
  const n = 4 + Math.floor(pseudoAleatorio(semilla, 1) * 3);
  for (let i = 0; i < n; i++) {
    const r = 1.6 + pseudoAleatorio(semilla, i + 2) * 1.6;
    const g = new IcosahedronGeometry(r, 1).scale(1, 0.62, 1);
    g.translate((i - (n - 1) / 2) * 2.2, pseudoAleatorio(semilla, i + 9) * 0.8, (pseudoAleatorio(semilla, i + 17) - 0.5) * 2.4);
    piezas.push(g);
  }
  return unir(piezas)!;
}

interface Plaza {
  x: number;
  z: number;
  r: number;
  /** Radio del vaso de la fuente. */
  fuente: number;
}

export class Decorado {
  readonly raiz = new Group();
  private readonly halos: Points | null = null;
  private readonly palomas: InstancedMesh | null = null;
  private readonly plazas: Plaza[] = [];
  private readonly agua: Points | null = null;
  private readonly paseantes: { malla: InstancedMesh; rutas: RutaCoche[] } | null = null;
  private readonly nubes = new Group();
  private readonly monedas: InstancedMesh;
  private lluvia: { inicio: number; caidas: { x: number; z: number; y0: number; retraso: number; giro: number }[] } | null = null;
  private readonly lado: number;
  private noche = 0;
  private nubesVisibles = true;
  private readonly m = new Matrix4();
  private readonly q = new Quaternion();
  private readonly v = new Vector3();
  private readonly s = new Vector3();
  private readonly eje = new Vector3();

  constructor(modelo: ModeloCiudad) {
    this.raiz.name = 'decorado';
    this.lado = modelo.lado;

    // Halos de farola: un único Points aditivo (barato), invisible de día.
    const textura = texturaHalo();
    if (modelo.farolas.length && textura) {
      const pos = modelo.farolas.flatMap((p) => [p.x, NIVEL.calle + ALTURA_LUZ_FAROLA, p.z]);
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(pos, 3));
      const halos = new Points(g, new PointsMaterial({
        map: textura, size: 4.6, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending, color: '#ffd9a0',
      }));
      halos.name = 'halos-farolas';
      halos.visible = false;
      halos.renderOrder = 3;
      this.halos = halos;
      this.raiz.add(halos);
    }

    // Palomas sobre las plazas.
    for (const z of modelo.zonas) {
      if (!z.plaza) continue;
      this.plazas.push({ x: z.plaza.x + z.plaza.ancho / 2, z: z.plaza.z + z.plaza.fondo / 2, r: Math.max(2.4, Math.min(z.plaza.ancho, z.plaza.fondo) * 0.35), fuente: Math.min(z.plaza.ancho, z.plaza.fondo) * 0.2 });
    }
    if (this.plazas.length) {
      const palomas = new InstancedMesh(geometriaPaloma(), new MeshStandardMaterial({ color: '#d9d6cf', roughness: 0.9, side: 2 }), this.plazas.length * PALOMAS_POR_PLAZA);
      palomas.instanceMatrix.setUsage(DynamicDrawUsage);
      palomas.name = 'palomas';
      palomas.frustumCulled = false;
      const gris = ['#cfccc6', '#9ea1a8', '#e9e6df', '#7d8088'];
      for (let i = 0; i < palomas.count; i++) palomas.setColorAt(i, new Color(gris[i % gris.length]!));
      this.palomas = palomas;
      this.raiz.add(palomas);
      this.animar(0);
    }

    // Fuentes de las plazas: chorros de agua (un Points por toda la ciudad).
    if (this.plazas.length) {
      const n = this.plazas.length * GOTAS_POR_FUENTE;
      const g = new BufferGeometry();
      g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3));
      const agua = new Points(g, new PointsMaterial({ color: '#cfeaff', size: 0.22, sizeAttenuation: true, transparent: true, opacity: 0.85, depthWrite: false }));
      agua.name = 'fuentes';
      agua.frustumCulled = false;
      this.agua = agua;
      this.raiz.add(agua);
    }

    // Paseantes: dan vuelta a las plazas y a los patios de manzana (vida de fondo, sin significado).
    const rutas: RutaCoche[] = [];
    let k = 0;
    for (const z of modelo.zonas) {
      const recintos = [...(z.plaza ? [z.plaza] : []), ...z.patios];
      for (const r of recintos) {
        const cuantos = r === z.plaza ? 6 : 3;
        for (let i = 0; i < cuantos; i++, k++) {
          rutas.push({ rect: encoger(r, 0.45 + (i % 3) * 0.35), inicio: pseudoAleatorio(k, 3), velocidad: (i % 2 ? 1 : -1) * (0.006 + pseudoAleatorio(k, 5) * 0.006) });
        }
      }
    }
    if (rutas.length) {
      const figura = unir([new CylinderGeometry(0.13, 0.16, 0.6, 8).translate(0, 0.3, 0), new SphereGeometry(0.12, 10, 8).translate(0, 0.74, 0)])!;
      const gente = new InstancedMesh(figura, new MeshStandardMaterial({ roughness: 0.8 }), rutas.length);
      const ropa = ['#3b4656', '#a8473a', '#c9b9a0', '#4d6b4a', '#2d2f36', '#c48a3e', '#6b5ea8'];
      rutas.forEach((_, i) => gente.setColorAt(i, new Color(ropa[i % ropa.length]!)));
      gente.instanceMatrix.setUsage(DynamicDrawUsage);
      gente.name = 'paseantes';
      this.paseantes = { malla: gente, rutas };
      colocarEnRecorrido(gente, rutas, 0, NIVEL.plaza);
      this.raiz.add(gente);
    }

    // Nubes: pocas, altas, sin sombra (el mapa de sombras no se recalcula al moverlas).
    const blanco = new MeshStandardMaterial({ color: '#fbf7ef', roughness: 1, transparent: true, opacity: 0.92, flatShading: true });
    for (let k = 0; k < 4; k++) {
      const nube = new Object3D();
      nube.add(new Mesh(geometriaNube(k * 7 + 3), blanco));
      nube.userData = { fase: pseudoAleatorio(k, 41), altura: 26 + k * 3.5, carril: (k / 3 - 0.5) * this.lado * 0.8, velocidad: 0.9 + pseudoAleatorio(k, 43) * 0.6 };
      this.nubes.add(nube);
    }
    this.nubes.name = 'nubes';
    this.raiz.add(this.nubes);

    // Monedas de la entrada.
    const moneda = new CylinderGeometry(1.3, 1.3, 0.22, 20);
    this.monedas = new InstancedMesh(moneda, new MeshStandardMaterial({ color: '#e1b53e', metalness: 0.85, roughness: 0.28, emissive: '#3a2600' }), MONEDAS);
    this.monedas.instanceMatrix.setUsage(DynamicDrawUsage);
    this.monedas.visible = false;
    this.monedas.frustumCulled = false;
    this.monedas.name = 'lluvia-monedas';
    this.raiz.add(this.monedas);
    this.colocarNubes(0);
    this.placa();
  }

  /** Placa de latón grabada en el canto frontal de la peana, como en una maqueta de exposición. */
  private placa(): void {
    if (typeof document === 'undefined') return;
    const lienzo = document.createElement('canvas');
    lienzo.width = 2048;
    lienzo.height = 128;
    const ctx = lienzo.getContext('2d');
    if (!ctx) return;
    const dibujar = () => {
      const latón = ctx.createLinearGradient(0, 0, 0, 128);
      latón.addColorStop(0, '#f1d48a');
      latón.addColorStop(0.45, '#c9a14e');
      latón.addColorStop(1, '#8c6a2a');
      ctx.fillStyle = latón;
      ctx.fillRect(0, 0, 2048, 128);
      ctx.strokeStyle = 'rgba(70,48,12,.8)';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 2028, 108);
      for (const x of [34, 2014]) {
        ctx.fillStyle = '#7a5a20';
        ctx.beginPath();
        ctx.arc(x, 64, 9, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '700 62px "Bricolage Grotesque", "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // Grabado: sombra clara debajo y letra oscura encima.
      ctx.fillStyle = 'rgba(255,240,200,.55)';
      ctx.fillText('GESTIÓN FINANCIERA  ·  LA CIUDAD DEL DINERO', 1024, 68);
      ctx.fillStyle = '#3d2a08';
      ctx.fillText('GESTIÓN FINANCIERA  ·  LA CIUDAD DEL DINERO', 1024, 65);
    };
    dibujar();
    const textura = new CanvasTexture(lienzo);
    textura.anisotropy = 4;
    // La tipografía de la marca puede llegar después: se vuelve a grabar con ella.
    void document.fonts?.ready.then(() => {
      dibujar();
      textura.needsUpdate = true;
    });
    const ancho = Math.min(this.lado * 0.62, 40);
    const placa = new Mesh(
      new BoxGeometry(ancho, ancho / 16, 0.12),
      [
        new MeshStandardMaterial({ color: '#a8823a', metalness: 0.8, roughness: 0.35 }),
        new MeshStandardMaterial({ color: '#a8823a', metalness: 0.8, roughness: 0.35 }),
        new MeshStandardMaterial({ color: '#a8823a', metalness: 0.8, roughness: 0.35 }),
        new MeshStandardMaterial({ color: '#a8823a', metalness: 0.8, roughness: 0.35 }),
        new MeshStandardMaterial({ map: textura, metalness: 0.55, roughness: 0.4 }),
        new MeshStandardMaterial({ color: '#a8823a', metalness: 0.8, roughness: 0.35 }),
      ],
    );
    placa.position.set(0, NIVEL.peana - 1.5, this.lado / 2 + MARGEN_PEANA + 0.07);
    placa.name = 'placa-peana';
    this.raiz.add(placa);
  }

  /** 0 = de día, 1 = noche cerrada. */
  fijarNoche(k: number): void {
    this.noche = k;
    if (this.halos) {
      (this.halos.material as PointsMaterial).opacity = Math.min(1, k * 1.1);
      this.halos.visible = k > 0.02;
    }
    for (const n of this.nubes.children) {
      const mat = (n.children[0] as Mesh).material as MeshStandardMaterial;
      mat.opacity = 0.92 * (1 - k * 0.75);
      mat.color.set(k > 0.5 ? '#7d86a3' : '#fbf7ef');
    }
    this.nubes.visible = this.nubesVisibles && k < 0.9;
  }

  /** Las nubes solo acompañan las vistas de conjunto (de cerca taparían la ciudad). */
  set nubesEnVista(v: boolean) {
    this.nubesVisibles = v;
    this.nubes.visible = v && this.noche < 0.9;
  }

  /** Empieza la lluvia de monedas de la entrada. */
  llover(ahora: number): void {
    const caidas = Array.from({ length: MONEDAS }, (_, i) => ({
      x: (pseudoAleatorio(i, 3) - 0.5) * this.lado * 0.85,
      z: (pseudoAleatorio(i, 5) - 0.5) * this.lado * 0.85,
      y0: 45 + pseudoAleatorio(i, 7) * 35,
      retraso: pseudoAleatorio(i, 11) * 1200,
      giro: 2 + pseudoAleatorio(i, 13) * 5,
    }));
    this.lluvia = { inicio: ahora, caidas };
    this.monedas.visible = true;
  }

  get lloviendo(): boolean {
    return this.lluvia !== null;
  }

  terminarLluvia(): void {
    this.lluvia = null;
    this.monedas.visible = false;
  }

  /** Avanza la lluvia de monedas; devuelve si sigue activa. */
  animarLluvia(ahora: number): boolean {
    const l = this.lluvia;
    if (!l) return false;
    const suelo = NIVEL.lote + 0.1;
    let vivas = 0;
    l.caidas.forEach((c, i) => {
      const t = Math.max(0, (ahora - l.inicio - c.retraso) / 1000);
      // Caída con gravedad; al tocar suelo, un bote corto y se encoge hasta desaparecer.
      const caida = Math.sqrt((2 * (c.y0 - suelo)) / 38);
      let y: number;
      let escala = 1;
      if (t < caida) y = c.y0 - 19 * t * t;
      else {
        const b = t - caida;
        y = suelo + Math.max(0, 3.2 * b - 19 * b * b);
        escala = Math.max(0, 1 - b / 0.9);
      }
      if (t === 0) escala = 0;
      if (escala > 0) vivas++;
      this.q.setFromAxisAngle(this.eje.set(1, 0, 0.4).normalize(), t * c.giro);
      this.m.compose(this.v.set(c.x, y, c.z), this.q, this.s.setScalar(escala));
      this.monedas.setMatrixAt(i, this.m);
    });
    this.monedas.instanceMatrix.needsUpdate = true;
    if (!vivas && ahora - l.inicio > DURACION_LLUVIA * 0.5) {
      this.terminarLluvia();
      return true;
    }
    return true;
  }

  private colocarNubes(t: number): void {
    const recorrido = this.lado * 1.6;
    for (const n of this.nubes.children) {
      const d = n.userData as { fase: number; altura: number; carril: number; velocidad: number };
      const x = ((((d.fase * recorrido + t * d.velocidad) % recorrido) + recorrido) % recorrido) - recorrido / 2;
      n.position.set(x, d.altura, d.carril);
    }
  }

  /** Palomas y nubes. `t` en segundos. */
  animar(t: number): boolean {
    const palomas = this.palomas;
    if (palomas) {
      let i = 0;
      this.plazas.forEach((p, k) => {
        for (let j = 0; j < PALOMAS_POR_PLAZA; j++, i++) {
          const fase = (j / PALOMAS_POR_PLAZA) * Math.PI * 2 + k;
          const w = 0.55 + (k % 3) * 0.08;
          const a = t * w + fase;
          const r = p.r * (0.85 + 0.25 * Math.sin(j * 1.7));
          const y = NIVEL.plaza + 4.2 + Math.sin(t * 1.3 + j) * 0.5 + (j % 3) * 0.35;
          this.v.set(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r);
          // Mira en la dirección del vuelo (tangente) y aletea escalando la V.
          this.q.setFromAxisAngle(this.eje.set(0, 1, 0), -a);
          const aleteo = 0.35 + 0.65 * Math.abs(Math.sin(t * 9 + j * 1.3));
          this.m.compose(this.v, this.q, this.s.set(0.9, aleteo, 0.9));
          palomas.setMatrixAt(i, this.m);
        }
      });
      palomas.instanceMatrix.needsUpdate = true;
    }
    const agua = this.agua;
    if (agua) {
      const pos = agua.geometry.getAttribute('position') as Float32BufferAttribute;
      let i = 0;
      for (const p of this.plazas) {
        for (let j = 0; j < GOTAS_POR_FUENTE; j++, i++) {
          // Cada gota sale de la pila, sube y cae en arco dentro del vaso.
          const tau = (t * 0.85 + j / GOTAS_POR_FUENTE) % 1;
          const ang = j * 2.399;
          const d = tau * p.fuente * 0.8;
          pos.setXYZ(i, p.x + Math.cos(ang) * d, NIVEL.plaza + 1.0 + 2.4 * tau - 2.6 * tau * tau, p.z + Math.sin(ang) * d);
        }
      }
      pos.needsUpdate = true;
    }
    if (this.paseantes) colocarEnRecorrido(this.paseantes.malla, this.paseantes.rutas, t, NIVEL.plaza);
    if (this.nubes.visible) this.colocarNubes(t);
    return Boolean(this.palomas || this.agua || this.paseantes) || this.nubes.visible;
  }

  liberar(): void {
    this.raiz.traverse((o) => {
      const malla = o as Partial<InstancedMesh>;
      malla.geometry?.dispose();
      const mats = ([] as (MeshBasicMaterial | undefined)[]).concat(malla.material as MeshBasicMaterial | MeshBasicMaterial[] | undefined);
      for (const mat of mats) {
        mat?.map?.dispose();
        mat?.dispose();
      }
    });
  }
}
