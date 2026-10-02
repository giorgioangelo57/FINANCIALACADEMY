import { BoxGeometry, BufferGeometry, CylinderGeometry, Float32BufferAttribute, PlaneGeometry, SphereGeometry } from 'three';
import type { TipoTejado } from '../../content/schema.ts';
import { pseudoAleatorio } from '../../world/geometry.ts';
import type { Escudo } from './emblemas.ts';

/*
 * Taller de piezas: acumula geometría etiquetada por "rol" (zócalo, muro, moldura, vidrio…) en
 * coordenadas locales del edificio (suelo en y = 0, fachada principal hacia +z). Lo comparten la
 * arquitectura de parcelas y la urbana; cada una decide los materiales de cada rol.
 */

export type Rol =
  | 'base' | 'muro' | 'acento' | 'tejado' | 'vidrio' | 'metal' | 'verde'
  | 'luz' | 'oscuro' | 'pantalla' | 'baliza' | 'bandera'
  | 'moldura' | 'junta' | 'bronce'
  /** Disco del emblema de fachada (ver emblemas.ts). */
  | 'medallon'
  /** Entorno del edificio (jardín del lote): siempre construido, no depende del dominio. */
  | 'entorno';

/** Roles que solo existen en el acabado (detalles que no lleva una maqueta blanca). */
export const SOLO_ACABADO: ReadonlySet<Rol> = new Set(['luz', 'oscuro', 'pantalla', 'baliza', 'bandera', 'entorno']);

export interface Volumen {
  w: number;
  d: number;
  h: number;
  x: number;
  z: number;
}

/** Acumula piezas en coordenadas locales del lote (suelo en y = 0, fachada principal hacia +z). */
export class Taller {
  readonly piezas = new Map<Rol, BufferGeometry[]>();
  principal: Volumen = { w: 1, d: 1, h: 1, x: 0, z: 0 };
  cima = 0;
  /** Sitio del emblema que fija cada tipología; si falta, se usa la fachada del volumen principal. */
  escudo: Escudo | null = null;

  anadir(rol: Rol, g: BufferGeometry): void {
    const lista = this.piezas.get(rol) ?? [];
    lista.push(g);
    this.piezas.set(rol, lista);
    g.computeBoundingBox();
    this.cima = Math.max(this.cima, g.boundingBox!.max.y);
  }

  caja(rol: Rol, w: number, h: number, d: number, x: number, y: number, z: number, giro = 0): void {
    const g = new BoxGeometry(w, h, d);
    if (giro) g.rotateY(giro);
    this.anadir(rol, g.translate(x, y + h / 2, z));
  }

  cilindro(rol: Rol, r: number, h: number, x: number, y: number, z: number, lados = 16): void {
    this.anadir(rol, new CylinderGeometry(r, r, h, lados).translate(x, y + h / 2, z));
  }

  esfera(rol: Rol, r: number, x: number, y: number, z: number, media = false): void {
    const g = new SphereGeometry(r, 20, media ? 8 : 12, 0, Math.PI * 2, 0, media ? Math.PI / 2 : Math.PI);
    this.anadir(rol, g.translate(x, y, z));
  }

  /** Cubierta a dos aguas; la cumbrera va a lo largo de `cumbrera`. */
  prisma(rol: Rol, w: number, h: number, d: number, x: number, y: number, z: number, cumbrera: 'x' | 'z'): void {
    const [a, b] = cumbrera === 'x' ? [w / 2, d / 2] : [d / 2, w / 2];
    // Perfil triangular en el plano (b, y), extruido a lo largo de a.
    const v = [
      [-a, 0, -b], [a, 0, -b], [a, h, 0], [-a, h, 0], // faldón 1
      [-a, 0, b], [-a, h, 0], [a, h, 0], [a, 0, b], // faldón 2
    ];
    const tri = (p: number[], q: number[], r: number[]) => [...p, ...q, ...r];
    const pos = [
      ...tri(v[0]!, v[2]!, v[1]!), ...tri(v[0]!, v[3]!, v[2]!),
      ...tri(v[4]!, v[6]!, v[5]!), ...tri(v[4]!, v[7]!, v[6]!),
      ...tri([-a, 0, -b], [-a, 0, b], [-a, h, 0]), ...tri([a, 0, b], [a, 0, -b], [a, h, 0]),
    ];
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    if (cumbrera === 'z') g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    this.anadir(rol, g.translate(x, y, z));
  }

  /** Bóveda de cañón (media caña) a lo largo de x. */
  boveda(rol: Rol, largo: number, radio: number, x: number, y: number, z: number): void {
    const g = new CylinderGeometry(radio, radio, largo, 18, 1, false, 0, Math.PI).rotateZ(Math.PI / 2);
    this.anadir(rol, g.translate(x, y, z));
  }

  /** Cerco perimetral (pretil, marco de luces…). */
  marco(rol: Rol, w: number, d: number, x: number, y: number, z: number, alto: number, grosor: number): void {
    this.caja(rol, w, alto, grosor, x, y, z + d / 2 - grosor / 2);
    this.caja(rol, w, alto, grosor, x, y, z - d / 2 + grosor / 2);
    this.caja(rol, grosor, alto, d - 2 * grosor, x + w / 2 - grosor / 2, y, z);
    this.caja(rol, grosor, alto, d - 2 * grosor, x - w / 2 + grosor / 2, y, z);
  }

  /** Tronco de pirámide (mansardas, áticos, basamentos en talud). */
  tronco(rol: Rol, wb: number, db: number, wt: number, dt: number, h: number, x: number, y: number, z: number): void {
    const b = [[-wb / 2, 0, -db / 2], [wb / 2, 0, -db / 2], [wb / 2, 0, db / 2], [-wb / 2, 0, db / 2]];
    const t = [[-wt / 2, h, -dt / 2], [wt / 2, h, -dt / 2], [wt / 2, h, dt / 2], [-wt / 2, h, dt / 2]];
    const pos: number[] = [];
    const quad = (p: number[], q: number[], r: number[], u: number[]) => pos.push(...p, ...q, ...r, ...p, ...r, ...u);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quad(b[i]!, b[j]!, t[j]!, t[i]!);
    }
    quad(t[3]!, t[2]!, t[1]!, t[0]!);
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new Float32BufferAttribute(new Array((pos.length / 3) * 2).fill(0), 2));
    g.computeVertexNormals();
    this.anadir(rol, g.translate(x, y, z));
  }

  /** Plano de fachada (vano, puerta, rosetón) en la cara frontal (+z) de un volumen de fondo `d`. */
  vano(rol: Rol, ancho: number, alto: number, x: number, y: number, zFachada: number): void {
    this.anadir(rol, new PlaneGeometry(ancho, alto).translate(x, y + alto / 2, zFachada + 0.03));
  }

  /** Huecos de fachada en las cuatro caras de un volumen. */
  ventanas(v: Volumen, y0: number, y1: number, estilo: 'perforada' | 'banda', encendidas: number, semilla: number, planta = 1.45, alfeizar = false): void {
    const filas = Math.floor((y1 - y0 - 0.3) / planta);
    if (filas <= 0) return;
    const caras: { largo: number; giro: number; dx: number; dz: number }[] = [
      { largo: v.w, giro: 0, dx: 0, dz: v.d / 2 + 0.03 },
      { largo: v.w, giro: Math.PI, dx: 0, dz: -v.d / 2 - 0.03 },
      { largo: v.d, giro: Math.PI / 2, dx: v.w / 2 + 0.03, dz: 0 },
      { largo: v.d, giro: -Math.PI / 2, dx: -v.w / 2 - 0.03, dz: 0 },
    ];
    caras.forEach((cara, c) => {
      for (let f = 0; f < filas; f++) {
        const y = y0 + 0.35 + planta * (f + 0.5);
        const n = Math.max(1, Math.floor((cara.largo - 0.5) / 1.05));
        const huecos = estilo === 'banda'
          ? [{ ancho: Math.max(0.4, cara.largo - 0.6), offset: 0 }]
          : Array.from({ length: n }, (_, k) => ({ ancho: 0.5, offset: (k - (n - 1) / 2) * 1.05 }));
        huecos.forEach((h, k) => {
          const alto = estilo === 'banda' ? planta * 0.42 : planta * 0.5;
          const g = new PlaneGeometry(h.ancho, alto).translate(h.offset, 0, 0).rotateY(cara.giro);
          g.translate(v.x + cara.dx, y, v.z + cara.dz);
          this.anadir(pseudoAleatorio(semilla + f * 13 + c * 5, k) < encendidas ? 'luz' : 'oscuro', g);
          if (alfeizar && estilo === 'perforada') {
            const sill = new BoxGeometry(h.ancho + 0.16, 0.07, 0.16).translate(h.offset, -alto / 2 - 0.04, 0.05).rotateY(cara.giro);
            this.anadir('moldura', sill.translate(v.x + cara.dx, y, v.z + cara.dz));
          }
        });
      }
    });
  }
}

/** Remate de cubierta: mismas convenciones de tejado que la portada original. */
export function remate(t: Taller, tejado: TipoTejado, w: number, d: number, y: number, x: number, z: number, cumbrera: 'x' | 'z'): void {
  const m = Math.min(w, d);
  switch (tejado) {
    case 'fronton':
      t.prisma('tejado', w + 0.3, m * 0.3, d + 0.3, x, y, z, cumbrera);
      break;
    case 'granero':
      t.prisma('tejado', w + 0.4, m * 0.45, d + 0.4, x, y, z, 'x');
      break;
    case 'cupula':
      t.cilindro('muro', m * 0.33, 0.6, x, y, z, 20);
      t.esfera('tejado', m * 0.33, x, y + 0.6, z, true);
      break;
    case 'antena':
      t.caja('metal', m * 0.35, 0.5, m * 0.35, x, y, z);
      t.cilindro('metal', 0.07, 3.2, x, y + 0.5, z, 6);
      t.esfera('baliza', 0.17, x, y + 3.75, z);
      break;
    case 'bandera':
      t.marco('muro', w, d, x, y, z, 0.3, 0.18);
      t.cilindro('metal', 0.06, 2.6, x + w * 0.25, y, z + d * 0.2, 6);
      t.caja('bandera', 1.15, 0.68, 0.05, x + w * 0.25 + 0.6, y + 1.85, z + d * 0.2);
      break;
    case 'ruina':
      // La portada dibuja la caja "mordida": coronación rota en una esquina.
      t.caja('muro', w * 0.55, 0.9, d * 0.5, x - w * 0.22, y, z - d * 0.25);
      t.caja('muro', w * 0.3, 0.45, d * 0.35, x + w * 0.2, y, z - d * 0.3);
      break;
    case 'plano':
      t.marco('muro', w, d, x, y, z, 0.3, 0.18);
      t.caja('metal', w * 0.3, 0.6, d * 0.26, x + w * 0.12, y, z - d * 0.12);
      break;
  }
}

