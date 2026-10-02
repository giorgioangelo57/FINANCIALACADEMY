import { CircleGeometry, type Material } from 'three';
import type { TipoTejado } from '../../content/schema.ts';
import type { GlyphName } from '../../icons/glyphs.ts';
import type { EdificioVisual } from '../../world/cityModel.ts';
import type { Tipologia } from '../../world/typology.ts';
import { emisivo, mate, mezclar } from './materials.ts';
import { type Rol, remate, type Taller } from './taller.ts';

/*
 * Arquitectura urbana (gramática "Ensanche", vertical slice del barrio 4).
 *
 * Vocabulario común de ciudad europea: zócalo, imposta, cuerpo con huecos y alféizares, cornisa
 * y remate (mansarda, cubierta o coronación). Sobre él, cada TIPOLOGÍA (de los glifos de DATA)
 * tiene una silueta propia y algunos GLIFOS añaden un rasgo que se reconoce de un vistazo:
 *   vault → zócalo almohadillado y puerta de bronce · handshake → dos volúmenes unidos por una
 *   pasarela · truck → portones · basket → celosía · store → escaparate con toldo ·
 *   chapel → hastial con rosetón · umbrella → gran alero · eye/lens → mirador.
 * Los emblemáticos (los 12 de la portada) se construyen en versión monumental.
 */

export interface Encargo {
  W: number;
  D: number;
  H: number;
  tejado: TipoTejado;
  glifos: ReadonlySet<GlyphName>;
  emblematico: boolean;
  semilla: number;
  /** Hay explanada delante: el pórtico puede adelantarse. */
  antepatio: boolean;
}

const tiene = (e: Encargo, ...g: GlyphName[]) => g.some((x) => e.glifos.has(x));

/* ------------------------------------------------------------------ piezas comunes */

function cornisa(t: Taller, w: number, d: number, y: number, x = 0, z = 0, vuelo = 0.22): void {
  t.caja('moldura', w + vuelo * 2, 0.32, d + vuelo * 2, x, y, z);
}

function imposta(t: Taller, w: number, d: number, y: number, x = 0, z = 0): void {
  t.caja('moldura', w + 0.08, 0.14, d + 0.08, x, y, z);
}

/** Zócalo almohadillado: hiladas de piedra marcadas por juntas. */
function almohadillado(t: Taller, w: number, d: number, alto: number, x = 0, z = 0): void {
  t.caja('base', w, alto, d, x, 0, z);
  for (let y = 0.32; y < alto - 0.1; y += 0.36) t.caja('junta', w + 0.05, 0.05, d + 0.05, x, y, z);
}

/** Mansarda de pizarra con buhardillas en la fachada principal. */
function mansarda(t: Taller, w: number, d: number, y: number, alto: number, x = 0, z = 0, buhardillas = true): void {
  const entrante = Math.min(0.9, Math.min(w, d) * 0.12);
  t.tronco('tejado', w, d, w - entrante * 2, d - entrante * 2, alto, x, y, z);
  if (!buhardillas) return;
  const n = Math.max(1, Math.floor((w - 1.2) / 2.2));
  for (let i = 0; i < n; i++) {
    const bx = x + (i - (n - 1) / 2) * 2.2;
    const bz = z + d / 2 - entrante * 0.75;
    t.caja('muro', 0.75, 0.8, 0.7, bx, y + 0.12, bz - 0.15);
    t.prisma('tejado', 0.9, 0.32, 0.85, bx, y + 0.92, bz - 0.15, 'z');
    t.vano('oscuro', 0.42, 0.5, bx, y + 0.25, bz + 0.2);
  }
}

/** Puerta principal en la fachada (+z): vano, recercado de bronce y, si procede, marquesina. */
function portada(t: Taller, ancho: number, alto: number, zFachada: number, marquesina: boolean, x = 0): void {
  t.vano('oscuro', ancho, alto, x, 0.05, zFachada);
  t.caja('bronce', ancho + 0.24, 0.12, 0.12, x, alto + 0.05, zFachada + 0.04);
  t.caja('bronce', 0.12, alto, 0.12, x - ancho / 2 - 0.06, 0.05, zFachada + 0.04);
  t.caja('bronce', 0.12, alto, 0.12, x + ancho / 2 + 0.06, 0.05, zFachada + 0.04);
  if (marquesina) t.caja('acento', ancho + 0.9, 0.1, 1.0, x, alto + 0.35, zFachada + 0.5);
}

/* ------------------------------------------------------------------ tipologías */

type Constructor = (t: Taller, e: Encargo) => void;

/**
 * Autoridad central (glifo brain): torre institucional sobre basamento palaciego, con pórtico en la
 * base y templete en la coronación. Es la silueta más alta de la ciudad cuando DATA lo indica.
 */
function torreCentral(t: Taller, e: Encargo): void {
  const { W, D } = e;
  const base = 4.2;
  almohadillado(t, W, D, 1.5);
  t.caja('muro', W, base - 1.5, D, 0, 1.5, 0);
  imposta(t, W, D, 1.5);
  t.ventanas({ w: W, d: D, h: base, x: 0, z: 0 }, 1.5, base - 0.2, 'perforada', 0.75, e.semilla, 1.4, true);
  cornisa(t, W, D, base);
  const P = Math.min(W * 0.5, 7);
  for (let i = 0; i < 6; i++) t.cilindro('muro', 0.18, base - 1.5 - 0.45, -P / 2 + (i * P) / 5, 1.5, D / 2 + 0.55, 12);
  t.caja('moldura', P + 0.6, 0.45, 1.2, 0, base - 0.45, D / 2 + 0.45);
  portada(t, 1.2, 2.2, D / 2, false);
  const tw = Math.min(Math.min(W, D) * 0.6, 6.5);
  const y0 = base + 0.32;
  const alto = Math.max(4, e.H + 3 - y0);
  t.caja('muro', tw, alto, tw, 0, y0, -D * 0.05);
  for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) t.caja('moldura', 0.36, alto, 0.36, (px * tw) / 2, y0, -D * 0.05 + (pz * tw) / 2);
  t.ventanas({ w: tw, d: tw, h: y0 + alto, x: 0, z: -D * 0.05 }, y0, y0 + alto - 0.2, 'perforada', 0.72, e.semilla + 5, 1.45, true);
  t.caja('acento', tw + 0.3, 0.2, tw + 0.3, 0, y0 + alto - 1.0, -D * 0.05);
  cornisa(t, tw, tw, y0 + alto, 0, -D * 0.05);
  // Templete: columnas en anillo y cúpula, el remate que la identifica desde lejos.
  const yt = y0 + alto + 0.32;
  const r = tw * 0.32;
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    t.cilindro('moldura', 0.1, 1.4, Math.sin(a) * r, yt, -D * 0.05 + Math.cos(a) * r, 8);
  }
  t.cilindro('moldura', r + 0.2, 0.22, 0, yt + 1.4, -D * 0.05, 20);
  t.esfera('tejado', r + 0.1, 0, yt + 1.62, -D * 0.05, true);
  t.principal = { w: W, d: D, h: y0 + alto + 0.32, x: 0, z: 0 };
  t.escudo = { x: 0, y: y0 + alto - 2.1, z: -D * 0.05 + tw / 2, tam: Math.min(1.9, tw * 0.34), modo: 'placa' };
}

/** Palacio institucional: zócalo almohadillado, pórtico de orden gigante y frontón o cúpula. */
const institucional: Constructor = (t, e) => {
  if (tiene(e, 'brain') && e.H >= 9) return torreCentral(t, e);
  const { W, D } = e;
  const zocalo = 1.5;
  const H = Math.max(zocalo + 3.5, e.H * 0.8);
  almohadillado(t, W, D, zocalo);
  t.caja('muro', W, H - zocalo, D, 0, zocalo, 0);
  imposta(t, W, D, zocalo);
  t.ventanas({ w: W, d: D, h: H, x: 0, z: 0 }, zocalo, H - 0.2, 'perforada', 0.78, e.semilla, 1.75, true);
  t.ventanas({ w: W, d: D, h: zocalo, x: 0, z: 0 }, -0.25, zocalo, 'perforada', 0.5, e.semilla + 2, 1.2);

  // Pórtico: columnas que suben del zócalo a la cornisa, entablamento con el friso del concepto.
  const P = Math.min(W * (e.emblematico ? 0.6 : 0.42), 11);
  const vuelo = e.antepatio ? 1.5 : 0.55;
  const zColumnas = D / 2 + vuelo - 0.35;
  // Número par de columnas: la puerta queda en el intercolumnio central.
  let n = Math.max(4, Math.round(P / 1.25));
  if (n % 2) n++;
  const altoColumna = H - zocalo - 0.55;
  for (let i = 0; i < n; i++) t.cilindro('muro', 0.2, altoColumna, -P / 2 + (i * P) / (n - 1), zocalo, zColumnas, 12);
  t.caja('moldura', P + 0.7, 0.55, vuelo + 0.35, 0, H - 0.55, D / 2 + vuelo / 2 - 0.15);
  t.caja('acento', P * 0.92, 0.16, 0.05, 0, H - 0.37, D / 2 + vuelo + 0.03);
  // Escalinata hasta el zócalo.
  for (let k = 0; k < 3; k++) {
    const alto = zocalo * (1 - k / 3);
    t.caja('base', P + 1.2 - k * 0.2, alto, vuelo + 0.2 + k * 0.45, 0, 0, D / 2 + (vuelo + 0.2 + k * 0.45) / 2 - 0.2);
  }
  portada(t, 1.4, 2.4, D / 2, false);
  cornisa(t, W, D, H);
  t.principal = { w: W, d: D, h: H + 0.32, x: 0, z: 0 };

  const y = H + 0.32;
  t.escudo = e.tejado === 'fronton'
    ? { x: 0, y: y + P * 0.075, z: D / 2 + vuelo + 0.03, tam: Math.min(1.6, P * 0.12), modo: 'placa' }
    : { x: 0, y: H, z: D / 2 + vuelo - 0.25, tam: Math.min(1.7, P * 0.2), modo: 'cresta' };
  if (e.tejado === 'fronton') {
    // Frontón sobre el pórtico y cubierta a cuatro aguas detrás.
    t.prisma('moldura', P + 0.7, P * 0.2, vuelo + 0.35, 0, y, D / 2 + vuelo / 2 - 0.15, 'z');
    t.tronco('tejado', W, D, W * 0.45, Math.max(0.2, D * 0.1), Math.min(W, D) * 0.28, 0, y, 0);
  } else if (e.tejado === 'cupula') {
    mansarda(t, W, D, y, 1.1, 0, 0, false);
    const r = Math.min(W, D) * 0.24;
    t.cilindro('muro', r, 1.3, 0, y + 1.1, 0, 24);
    t.esfera('tejado', r, 0, y + 2.4, 0, true);
    t.cilindro('moldura', r * 0.18, 0.7, 0, y + 2.4 + r * 0.95, 0, 10);
  } else {
    mansarda(t, W, D, y, 1.3);
  }
  if (tiene(e, 'brain', 'globe')) {
    // Red europea de autoridades: linterna sobre la cubierta.
    t.cilindro('moldura', 0.35, 1.2, 0, t.cima, 0, 12);
    t.esfera('tejado', 0.42, 0, t.cima, 0, true);
  }
};

/** Banco: basamento de granito con patio de operaciones acristalado y torre de piedra. */
const banco: Constructor = (t, e) => {
  const { W, D } = e;
  const base = 2.3;
  const muro = Math.min(Math.max(base + 3, e.H * 0.62), 7.5);
  (tiene(e, 'vault') ? almohadillado : (tt: Taller, w: number, d: number, a: number) => tt.caja('base', w, a, d, 0, 0, 0))(t, W, D, base);
  t.ventanas({ w: W, d: D, h: base, x: 0, z: 0 }, -0.2, base, 'perforada', 0.85, e.semilla + 1, 2.0);
  t.caja('muro', W, muro - base, D, 0, base, 0);
  imposta(t, W, D, base);
  t.ventanas({ w: W, d: D, h: muro, x: 0, z: 0 }, base, muro - 0.2, 'perforada', 0.72, e.semilla, 1.5, true);
  cornisa(t, W, D, muro);
  portada(t, 1.6, 1.9, D / 2, true);
  t.principal = { w: W, d: D, h: muro + 0.32, x: 0, z: 0 };
  t.escudo = { x: 0, y: base + (muro - base) / 2, z: D / 2 + 0.04, tam: Math.min(1.6, (muro - base) * 0.62), modo: 'placa' };

  if (e.tejado === 'ruina') {
    // La portada original dibuja la caja "mordida": nave de ladrillo con hastial y rosetón,
    // con parte de la cubierta perdida (vigas a la vista).
    const alto = Math.min(W, D) * 0.42;
    t.prisma('tejado', W * 0.68, alto, D + 0.3, -W * 0.16, muro + 0.32, 0, 'z');
    for (let k = 0; k < 3; k++) t.caja('metal', 0.12, 0.12, D, W * 0.22 + k * 0.5, muro + 0.36 + k * 0.12, 0);
    t.anadir('oscuro', new CircleGeometry(Math.min(0.9, alto * 0.35), 20).translate(-W * 0.16, muro + 0.32 + alto * 0.35, D / 2 + 0.2));
    return;
  }
  if (e.tejado === 'granero') {
    // Cooperativa: gran cubierta de teja a dos aguas con buhardillas.
    t.prisma('tejado', W + 0.4, Math.min(W, D) * 0.4, D + 0.4, 0, muro + 0.32, 0, 'x');
    return;
  }
  if (e.emblematico || e.H > muro + 1.5) {
    // Torre retranqueada sobre la fachada: la silueta del banco.
    const tw = Math.min(Math.min(W, D) * 0.58, 7);
    const z = -D * 0.08;
    const y0 = muro + 0.32;
    const alto = Math.max(3, e.H + 2 - y0);
    t.caja('muro', tw, alto, tw, 0, y0, z);
    for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) t.caja('base', 0.42, alto, 0.42, (px * tw) / 2, y0, z + (pz * tw) / 2);
    t.ventanas({ w: tw, d: tw, h: y0 + alto, x: 0, z }, y0, y0 + alto - 0.3, 'perforada', 0.7, e.semilla + 4, 1.45, true);
    cornisa(t, tw, tw, y0 + alto, 0, z);
    t.caja('muro', tw * 0.6, 1.1, tw * 0.6, 0, y0 + alto + 0.32, z);
    remate(t, e.tejado, tw * 0.6, tw * 0.6, y0 + alto + 1.42, 0, z, 'x');
  } else {
    mansarda(t, W, D, muro + 0.32, 1.2);
  }
};

/** Supervisión: podio de piedra y torre de vidrio con mirador en la coronación. */
const supervisor: Constructor = (t, e) => {
  const { W, D } = e;
  const podio = 1.7;
  t.caja('base', W, podio, D, 0, 0, 0);
  t.ventanas({ w: W, d: D, h: podio, x: 0, z: 0 }, -0.2, podio, 'banda', 0.8, e.semilla, 1.4);
  cornisa(t, W, D, podio, 0, 0, 0.12);
  const tw = Math.min(W * 0.62, 7);
  const td = Math.min(D * 0.66, 7);
  const H = Math.max(podio + 5, e.H + 1);
  t.caja('vidrio', tw, H - podio, td, 0, podio + 0.32, 0);
  for (let y = podio + 1.5; y < H - 1.2; y += 1.35) t.caja('metal', tw + 0.1, 0.1, td + 0.1, 0, y, 0);
  for (let x = -tw / 2 + 0.9; x < tw / 2 - 0.4; x += 0.9) {
    t.caja('metal', 0.06, H - podio - 1.4, 0.08, x, podio + 0.32, td / 2 + 0.03);
  }
  t.ventanas({ w: tw, d: td, h: H, x: 0, z: 0 }, podio + 0.32, H - 1.5, 'banda', 0.62, e.semilla + 3, 1.35);
  // Mirador: anillo saliente y remate acristalado.
  t.caja('acento', tw + 0.7, 0.45, td + 0.7, 0, H - 1.25, 0);
  t.caja('vidrio', tw * 0.84, 1.1, td * 0.84, 0, H - 0.8, 0);
  portada(t, 1.8, 1.25, D / 2, true);
  t.principal = { w: tw, d: td, h: H, x: 0, z: 0 };
  t.escudo = { x: 0, y: podio + (H - podio) * 0.55, z: td / 2 + 0.08, tam: Math.min(1.7, tw * 0.32), modo: 'placa' };
  if (e.tejado !== 'plano') remate(t, e.tejado, tw * 0.6, td * 0.6, H + 0.3, 0, 0, 'x');
};

/** Protección: volumen macizo; rotonda con cúpula o gran alero según el remate. */
const aseguradora: Constructor = (t, e) => {
  const { W, D } = e;
  if (e.tejado === 'cupula') {
    // Rotonda exenta sobre basamento circular, rodeada de jardín en el resto del lote.
    const r = Math.min(W, D) * 0.36;
    t.caja('entorno', W, 0.12, D, 0, 0, 0);
    t.cilindro('base', r + 0.9, 0.5, 0, 0, 0, 32);
    t.cilindro('base', r + 0.45, 1.0, 0, 0, 0, 32);
    const alto = Math.max(3, e.H * 0.62);
    t.cilindro('muro', r, alto, 0, 1.0, 0, 28);
    // Ventanales verticales alrededor del tambor.
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      t.caja('oscuro', 0.36, alto * 0.62, 0.05, Math.sin(a) * (r + 0.02), 1.0 + alto * 0.18, Math.cos(a) * (r + 0.02), a);
    }
    t.cilindro('moldura', r + 0.25, 0.32, 0, 1.0 + alto, 0, 28);
    const y = 1.32 + alto;
    if (tiene(e, 'umbrella')) {
      // Fondo de garantía: cúpula baja y ancha bajo un gran alero, como un paraguas.
      t.cilindro('acento', r * 1.3, 0.22, 0, y, 0, 32);
      const cupula = r * 1.05;
      t.esfera('tejado', cupula, 0, y + 0.22, 0, true);
    } else {
      // Contrafuertes: protección maciza.
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
        t.caja('base', 0.7, alto * 0.75, 1.1, Math.sin(a) * (r + 0.35), 1.0, Math.cos(a) * (r + 0.35), a);
      }
      t.cilindro('muro', r * 0.55, 0.9, 0, y, 0, 24);
      t.esfera('tejado', r * 0.75, 0, y + 0.9, 0, true);
    }
    portada(t, 1.3, 2.0, D / 2, true);
    t.principal = { w: r * 2, d: r * 2, h: y, x: 0, z: 0 };
    t.escudo = { x: 0, y: 1.0 + alto * 0.6, z: r + 0.06, tam: Math.min(1.4, alto * 0.34, r * 0.8), modo: 'placa' };
    return;
  }
  const H = Math.max(4, e.H);
  t.caja('base', W, 1.2, D, 0, 0, 0);
  t.caja('muro', W, H - 1.2, D, 0, 1.2, 0);
  t.ventanas({ w: W, d: D, h: H, x: 0, z: 0 }, 1.2, H - 0.3, 'perforada', 0.6, e.semilla, 1.8, true);
  // Alero corrido: la cubierta protege toda la fachada.
  t.caja('tejado', W + 1.4, 0.28, D + 1.4, 0, H, 0);
  t.tronco('tejado', W + 0.4, D + 0.4, W * 0.3, D * 0.3, Math.min(W, D) * 0.22, 0, H + 0.28, 0);
  portada(t, 1.5, 1.9, D / 2, true);
  t.principal = { w: W, d: D, h: H + 0.28, x: 0, z: 0 };
  t.escudo = { x: 0, y: Math.max(3.1, 1.2 + (H - 1.2) * 0.6), z: D / 2 + 0.04, tam: Math.min(1.5, W * 0.25, (H - 2.6) * 0.8), modo: 'placa' };
};

/** Lonja: nave de ladrillo con bóveda de zinc, grandes ventanales y panel de cotizaciones. */
const lonja: Constructor = (t, e) => {
  const { W, D } = e;
  const alto = Math.max(3, e.H * 0.75);
  t.caja('base', W, 0.5, D, 0, 0, 0);
  t.caja('muro', W, alto, D * 0.9, 0, 0.5, 0);
  const vanos = Math.max(2, Math.floor(W / 1.7));
  for (let k = 0; k < vanos; k++) {
    const x = (k - (vanos - 1) / 2) * 1.7;
    t.vano(k % 3 === 1 ? 'oscuro' : 'luz', 0.9, alto * 0.62, x, 0.8, (D * 0.9) / 2);
    t.caja('moldura', 0.22, alto, 0.12, x + 0.85, 0.5, (D * 0.9) / 2 + 0.04);
  }
  t.caja('pantalla', W * 0.86, 0.36, 0.06, 0, 0.5 + alto - 0.62, (D * 0.9) / 2 + 0.06);
  cornisa(t, W, D * 0.9, 0.5 + alto, 0, 0, 0.15);
  t.boveda('tejado', W, (D * 0.9) / 2, 0, 0.82 + alto, 0);
  t.caja('acento', 2.4, 0.1, 1.0, 0, 2.2, (D * 0.9) / 2 + 0.5);
  t.principal = { w: W, d: D * 0.9, h: 0.82 + alto + (D * 0.9) / 2, x: 0, z: 0 };
  t.escudo = { x: 0, y: 0.82 + alto, z: (D * 0.9) / 2 - 0.05, tam: Math.min(1.6, W * 0.2), modo: 'cresta' };
};

/** Pagos: caja de vidrio claro y un volumen superior girado, con líneas de luz en los forjados. */
const tecnologica: Constructor = (t, e) => {
  const { W, D } = e;
  const H = Math.max(4, e.H);
  const h1 = H * 0.58;
  t.caja('vidrio', W * 0.92, h1, D * 0.92, 0, 0, 0);
  for (let y = 1.4; y < h1; y += 1.4) t.marco('pantalla', W * 0.92 + 0.06, D * 0.92 + 0.06, 0, y, 0, 0.07, 0.05);
  t.ventanas({ w: W * 0.92, d: D * 0.92, h: h1, x: 0, z: 0 }, 0, h1 - 0.2, 'banda', 0.75, e.semilla, 1.4);
  const w2 = Math.min(W, D) * 0.66;
  t.caja('vidrio', w2, H - h1, w2, W * 0.08, h1, -D * 0.06, 0.26);
  t.caja('pantalla', w2 + 0.08, 0.08, w2 + 0.08, W * 0.08, H - 0.1, -D * 0.06, 0.26);
  portada(t, 2.0, 2.0, (D * 0.92) / 2, false);
  t.principal = { w: W * 0.92, d: D * 0.92, h: H, x: 0, z: 0 };
  t.escudo = { x: 0, y: Math.max(3.2, h1 * 0.62), z: (D * 0.92) / 2 + 0.04, tam: Math.min(1.5, W * 0.24, Math.max(0.9, h1 - 2.8)), modo: 'placa' };
};

/** Oficinas: bloque de fachada continua con ático retranqueado y rasgos según sus glifos. */
const oficina: Constructor = (t, e) => {
  const { W, D } = e;
  const H = Math.max(4, e.H);

  if (tiene(e, 'handshake')) {
    // Aval: dos volúmenes que se sostienen mutuamente, unidos por una pasarela.
    const ancho = W * 0.38;
    for (const lado of [-1, 1]) {
      const x = (lado * (W - ancho)) / 2;
      const alto = lado < 0 ? H : H * 0.82;
      t.caja('muro', ancho, alto, D, x, 0, 0);
      t.ventanas({ w: ancho, d: D, h: alto, x, z: 0 }, 0.2, alto - 0.2, 'banda', 0.7, e.semilla + lado, 1.35);
      cornisa(t, ancho, D, alto, x, 0, 0.12);
    }
    const yPasarela = H * 0.55;
    t.caja('vidrio', W - ancho * 2 + 0.2, 1.2, D * 0.45, 0, yPasarela, 0);
    t.caja('acento', W - ancho * 2 + 0.3, 0.12, D * 0.47, 0, yPasarela + 1.2, 0);
    t.caja('acento', W - ancho * 2 + 0.3, 0.12, D * 0.47, 0, yPasarela - 0.12, 0);
    portada(t, 1.4, 1.9, D / 2, true, (-(W - ancho)) / 2);
    t.principal = { w: W, d: D, h: H, x: 0, z: 0 };
    t.escudo = { x: 0, y: yPasarela + 0.6, z: D * 0.225 + 0.02, tam: Math.min(1.1, W - ancho * 2), modo: 'placa' };
    remate(t, e.tejado, ancho * 0.8, D * 0.7, H + 0.32, (-(W - ancho)) / 2, 0, 'x');
    return;
  }

  const h1 = Math.max(3, H * 0.62);
  t.caja('muro', W, h1, D, 0, 0, 0);
  t.ventanas({ w: W, d: D, h: h1, x: 0, z: 0 }, 0, h1 - 0.15, 'banda', 0.7, e.semilla, 1.35);
  cornisa(t, W, D, h1, 0, 0, 0.14);
  const uw = W * 0.74;
  const ud = D * 0.74;
  const uz = -D * 0.08;
  t.caja('muro', uw, H - h1, ud, 0, h1 + 0.32, uz);
  t.ventanas({ w: uw, d: ud, h: H, x: 0, z: uz }, h1 + 0.32, H - 0.1, 'banda', 0.7, e.semilla + 7, 1.35);
  t.caja('verde', W * 0.9, 0.22, (D - ud) / 2 - 0.2, 0, h1 + 0.32, D / 2 - (D - ud) / 4 + 0.05); // terraza

  if (tiene(e, 'truck')) {
    // Portones: la entidad sale a intervenir.
    for (let k = -1; k <= 1; k++) {
      t.vano('oscuro', 1.5, 2.3, k * 2.0, 0.05, D / 2);
      t.caja('metal', 1.7, 0.14, 0.14, k * 2.0, 2.38, D / 2 + 0.05);
    }
  } else if (tiene(e, 'store', 'car')) {
    // Escaparate con toldo.
    t.vano('luz', W * 0.8, 1.6, 0, 0.3, D / 2);
    t.tronco('acento', W * 0.84, 0.1, W * 0.84, 1.2, 0.3, 0, 2.0, D / 2 + 0.6);
  } else {
    portada(t, 1.5, 1.9, D / 2, true);
  }
  if (tiene(e, 'basket')) {
    // Celosía: lamas verticales de bronce que "tejen" la fachada.
    for (let x = -W / 2 + 0.4; x <= W / 2 - 0.4; x += 0.55) t.caja('bronce', 0.08, h1 - 2.4, 0.18, x, 2.4, D / 2 + 0.1);
  }
  t.principal = { w: W, d: D, h: H, x: 0, z: 0 };
  t.escudo = { x: W * 0.28, y: h1 + 0.32, z: D / 2 - 0.35, tam: Math.min(1.4, W * 0.22), modo: 'cresta' };
  remate(t, e.tejado, uw, ud, H + 0.05, 0, uz, 'x');
};

export const CONSTRUCTORES_URBANOS: Record<Tipologia, Constructor> = {
  institucional, banco, supervisor, aseguradora, lonja, tecnologica, oficina,
};

/* ------------------------------------------------------------------ materiales */

/** Fachadas de oficinas: tres revestimientos de la misma familia (variación sin ruido). */
const REVESTIMIENTOS = ['#d9c4a2', '#b56a4c', '#c8b08a'];

const MURO_URBANO: Record<Tipologia, string> = {
  institucional: '#e0caa3',
  banco: '#cda97a',
  supervisor: '#d5c6ad',
  aseguradora: '#c49d6e',
  lonja: '#a35a42',
  tecnologica: '#c3ccd1',
  oficina: '#d9c4a2',
};

const TEJADO_URBANO: Record<TipoTejado, string> = {
  fronton: '#44454e',
  plano: '#44454e',
  bandera: '#44454e',
  antena: '#44454e',
  cupula: '#6c9a8a',
  granero: '#a65a40',
  ruina: '#a65a40',
};

export function materialUrbano(rol: Rol, e: EdificioVisual, semilla: number): Material {
  switch (rol) {
    case 'base': return mate(e.tipologia === 'institucional' ? '#c4ad87' : '#8f8375', { rugosidad: 0.82 });
    case 'junta': return mate(e.tipologia === 'institucional' ? '#ad9f86' : '#7f7568', { rugosidad: 0.9 });
    case 'muro': {
      const color = e.tipologia === 'oficina' ? REVESTIMIENTOS[semilla % REVESTIMIENTOS.length]! : MURO_URBANO[e.tipologia];
      return mate(color, { rugosidad: 0.85 });
    }
    case 'moldura': return mate('#efe3cb', { rugosidad: 0.75 });
    case 'acento': return mate(mezclar(e.color, '#ffffff', 0.08), { rugosidad: 0.5 });
    case 'tejado': return mate(e.tipologia === 'lonja' ? '#8d9aa1' : TEJADO_URBANO[e.tejado], { rugosidad: 0.55, metal: e.tejado === 'cupula' || e.tipologia === 'lonja' ? 0.45 : 0.15 });
    case 'vidrio': return mate(e.tipologia === 'tecnologica' ? '#79a2b4' : '#34505e', { rugosidad: 0.14, metal: 0.6 });
    case 'metal': return mate('#6c6e73', { rugosidad: 0.4, metal: 0.6 });
    case 'bronce': return mate('#7d5d33', { rugosidad: 0.35, metal: 0.75 });
    case 'medallon': return mate('#22252b', { rugosidad: 0.45, metal: 0.35 });
    case 'verde': return mate('#6c9850', { rugosidad: 1 });
    case 'entorno': return mate('#6f9a52', { rugosidad: 1 });
    case 'luz': return emisivo('#ffcf86', true);
    case 'oscuro': return mate('#2c3843', { rugosidad: 0.25, metal: 0.3, calco: true });
    case 'pantalla': return emisivo(e.color, true);
    case 'baliza': return emisivo('#ff6a5a');
    case 'bandera': return mate(e.color, { rugosidad: 0.7 });
  }
}
