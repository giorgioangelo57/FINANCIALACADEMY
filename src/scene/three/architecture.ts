import {
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  MeshStandardMaterial,
  type Object3D,
  type Material,
  Mesh,
  Plane,
  PlaneGeometry,
  Vector3,
} from 'three';
import type { TipoTejado } from '../../content/schema.ts';
import type { GlyphName } from '../../icons/glyphs.ts';
import { colorDominio } from '../../ui/format.ts';
import type { EdificioVisual, Frente } from '../../world/cityModel.ts';
import { pseudoAleatorio } from '../../world/geometry.ts';
import type { Tipologia } from '../../world/typology.ts';
import { emisivo, mate, mezclar, unir } from './materials.ts';
import { type Rol, remate, SOLO_ACABADO, Taller, type Volumen } from './taller.ts';
import { CONSTRUCTORES_URBANOS, materialUrbano } from './urbanArchitecture.ts';
import { emblema, glifoDelEmblema, glifoSolido } from './emblemas.ts';
import { NIVEL, PALETA } from './palette.ts';

/*
 * Arquitectura de cada concepto. Cada tipología (ver world/typology.ts) produce una masa con
 * piezas etiquetadas por "rol" (zócalo, muro, acento, tejado, vidrio…). Con esas mismas piezas
 * se monta:
 *  - el ACABADO: materiales reales, ventanas encendidas, color del concepto;
 *  - el PROYECTO: la misma masa en maqueta blanca (lo que aún no se ha estudiado).
 * Un plano de corte por edificio decide qué parte está construida: 0 (solar), la mitad (en
 * obra) o todo (construido). Animar ese corte hace "crecer" el edificio.
 */

/* ------------------------------------------------------------------ tipologías */

type Constructor = (t: Taller, W: number, D: number, H: number, tejado: TipoTejado, semilla: number) => void;

const institucional: Constructor = (t, W, D, H, tejado, s) => {
  const w = Math.min(W * 0.76, 12);
  const d = Math.min(D * 0.6, 9.5);
  const z = -Math.min(0.5, D * 0.05);
  const podio = 0.55;
  t.caja('base', Math.min(W * 0.92, w + 2.6), podio, Math.min(D * 0.9, d + 3.2), 0, 0, z + 0.3);
  t.caja('base', Math.min(W * 0.5, w * 0.6), 0.28, 0.8, 0, 0, z + Math.min(D * 0.45, d / 2 + 1.9)); // escalinata
  const h = Math.max(3, H * 0.72);
  t.caja('muro', w, h, d, 0, podio, z);
  // Pórtico: columnata y entablamento con el friso en el color del concepto.
  const columnas = Math.max(4, Math.floor(w / 1.2));
  const alturaColumna = h * 0.8;
  const zPortico = z + d / 2 + 0.75;
  for (let i = 0; i < columnas; i++) {
    t.cilindro('muro', 0.17, alturaColumna, -w * 0.45 + (i * w * 0.9) / (columnas - 1), podio, zPortico, 10);
  }
  t.caja('muro', w, 0.55, 1.7, 0, podio + alturaColumna, z + d / 2 + 0.6);
  t.caja('acento', w * 0.92, 0.16, 0.06, 0, podio + alturaColumna + 0.2, z + d / 2 + 1.47);
  t.ventanas({ w, d, h, x: 0, z }, podio + 0.2, podio + h, 'perforada', 0.7, s, 1.8);
  t.principal = { w, d, h: podio + h, x: 0, z };
  remate(t, tejado, w, d, podio + h, 0, z, 'z');
};

const banco: Constructor = (t, W, D, H, tejado, s) => {
  const ph = 1.7;
  const pw = Math.min(W * 0.88, 13);
  const pd = Math.min(D * 0.86, 13);
  t.caja('base', pw, ph, pd, 0, 0, 0);
  t.ventanas({ w: pw, d: pd, h: ph, x: 0, z: 0 }, -0.15, ph, 'banda', 0.8, s + 3, 1.3);
  const tw = Math.min(Math.min(W, D) * 0.56, 7.2);
  const th = Math.max(ph + 3, H);
  const z = -Math.min(0.4, pd * 0.05);
  t.caja('muro', tw, th - ph, tw, 0, ph, z);
  for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const) {
    t.caja('base', 0.38, th - ph, 0.38, (px * tw) / 2, ph, z + (pz * tw) / 2);
  }
  t.caja('acento', tw + 0.4, 0.3, tw + 0.4, 0, th - 0.3, z);
  t.ventanas({ w: tw, d: tw, h: th, x: 0, z }, ph, th - 0.4, 'perforada', 0.72, s);
  const cw = tw * 0.66;
  t.caja('muro', cw, 1.0, cw, 0, th, z);
  t.caja('acento', 2.4, 0.12, 1.1, 0, 1.25, pd / 2 + 0.5); // marquesina de la entrada
  t.principal = { w: tw, d: tw, h: th, x: 0, z };
  remate(t, tejado, cw, cw, th + 1.0, 0, z, 'x');
};

const supervisor: Constructor = (t, W, D, H, tejado, s) => {
  t.caja('base', Math.min(W * 0.7, 9), 1.1, Math.min(D * 0.7, 9), 0, 0, 0);
  const tw = Math.min(Math.min(W, D) * 0.42, 5.4);
  const h = Math.max(4, H);
  t.caja('vidrio', tw, h - 1.1, tw, 0, 1.1, 0);
  for (let y = 1.1 + 1.35; y < h - 0.6; y += 1.35) t.caja('muro', tw + 0.14, 0.12, tw + 0.14, 0, y, 0);
  t.ventanas({ w: tw, d: tw, h, x: 0, z: 0 }, 1.1, h - 0.4, 'banda', 0.6, s, 1.35);
  t.cilindro('acento', tw * 0.8, 0.5, 0, h - 1.5, 0, 20); // mirador
  t.principal = { w: tw, d: tw, h, x: 0, z: 0 };
  remate(t, tejado, tw, tw, h, 0, 0, 'x');
};

const aseguradora: Constructor = (t, W, D, H, tejado, s) => {
  t.caja('base', Math.min(W * 0.8, 11), 0.9, Math.min(D * 0.8, 11), 0, 0, 0);
  const bw = Math.min(Math.min(W, D) * 0.6, 8);
  const h = Math.max(3.5, H);
  t.caja('muro', bw, h - 1.3, bw, 0, 0.9, 0);
  t.ventanas({ w: bw, d: bw, h, x: 0, z: 0 }, 0.9, h - 0.5, 'banda', 0.65, s, 1.4);
  t.cilindro('tejado', bw * 0.64, 0.3, 0, h - 0.4, 0, 28); // alero protector
  t.cilindro('acento', bw * 0.645, 0.1, 0, h - 0.32, 0, 28);
  t.principal = { w: bw, d: bw, h, x: 0, z: 0 };
  remate(t, tejado, bw * 0.9, bw * 0.9, h - 0.05, 0, 0, 'x');
};

const lonja: Constructor = (t, W, D, H, _tejado, s) => {
  const largo = Math.min(W * 0.88, 16);
  const d = Math.min(D * 0.62, 8.5);
  const h = Math.max(2.4, H * 0.62);
  t.caja('base', largo + 0.6, 0.45, d + 0.6, 0, 0, 0);
  t.caja('muro', largo, h, d, 0, 0.45, 0);
  t.boveda('tejado', largo, d / 2, 0, 0.45 + h, 0);
  // Grandes ventanales del patio de operaciones.
  const vanos = Math.max(2, Math.floor(largo / 1.6));
  for (let k = 0; k < vanos; k++) {
    const x = (k - (vanos - 1) / 2) * 1.6;
    for (const lado of [1, -1]) {
      const g = new PlaneGeometry(0.8, h * 0.62).rotateY(lado > 0 ? 0 : Math.PI).translate(x, 0.45 + h * 0.45, lado * (d / 2 + 0.03));
      t.anadir(pseudoAleatorio(s + k, lado) < 0.7 ? 'luz' : 'oscuro', g);
    }
  }
  // Panel de cotizaciones en el color del concepto: el elemento financiero de la lonja.
  t.caja('pantalla', largo * 0.86, 0.34, 0.06, 0, 0.45 + h - 0.62, d / 2 + 0.05);
  t.principal = { w: largo, d, h: 0.45 + h + d / 2, x: 0, z: 0 };
};

const tecnologica: Constructor = (t, W, D, H, tejado, s) => {
  const w1 = Math.min(Math.min(W, D) * 0.62, 8);
  const h = Math.max(4, H);
  const h1 = h * 0.55;
  t.caja('vidrio', w1, h1, w1, 0, 0, 0);
  t.ventanas({ w: w1, d: w1, h: h1, x: 0, z: 0 }, 0, h1 - 0.2, 'banda', 0.7, s, 1.3);
  t.marco('pantalla', w1 + 0.1, w1 + 0.1, 0, h1 - 0.12, 0, 0.12, 0.08);
  const w2 = w1 * 0.8;
  const giro = 0.22;
  t.caja('vidrio', w2, h - h1, w2, 0.3, h1, -0.3, giro);
  t.caja('pantalla', w2 + 0.1, 0.12, w2 + 0.1, 0.3, h - 0.12, -0.3, giro);
  t.caja('muro', w2 * 0.92, 0.12, w2 * 0.92, 0.3, h, -0.3, giro);
  t.principal = { w: w1, d: w1, h, x: 0, z: 0 };
  if (tejado !== 'plano') remate(t, tejado, w2 * 0.7, w2 * 0.7, h + 0.12, 0.3, -0.3, 'x');
};

const oficina: Constructor = (t, W, D, H, tejado, s) => {
  const bw = Math.min(W * 0.72, 10);
  const bd = Math.min(D * 0.66, 9);
  const h = Math.max(3.5, H);
  const h1 = h * 0.5;
  t.caja('muro', bw, h1, bd, 0, 0, 0);
  t.ventanas({ w: bw, d: bd, h: h1, x: 0, z: 0 }, 0, h1 - 0.15, 'banda', 0.7, s, 1.35);
  const uw = bw * 0.72;
  const ud = bd * 0.72;
  const ux = -bw * 0.1;
  const uz = -bd * 0.08;
  t.caja('muro', uw, h - h1, ud, ux, h1, uz);
  t.ventanas({ w: uw, d: ud, h, x: ux, z: uz }, h1, h - 0.3, 'banda', 0.7, s + 7, 1.35);
  t.caja('verde', bw * 0.2, 0.3, bd * 0.6, bw * 0.37, h1, 0); // terraza ajardinada
  t.caja('acento', bw * 0.4, 0.12, 1.1, 0, 1.15, bd / 2 + 0.5); // marquesina
  t.principal = { w: bw, d: bd, h, x: 0, z: 0 };
  remate(t, tejado, uw, ud, h, ux, uz, 'x');
};

const CONSTRUCTORES: Record<Tipologia, Constructor> = {
  institucional, banco, supervisor, aseguradora, lonja, tecnologica, oficina,
};

/* ------------------------------------------------------------------ montaje */

const MURO_TIPOLOGIA: Record<Tipologia, string> = {
  institucional: PALETA.piedra,
  banco: PALETA.revoco,
  supervisor: PALETA.revoco,
  aseguradora: PALETA.revoco,
  lonja: PALETA.ladrillo,
  tecnologica: PALETA.revoco,
  oficina: PALETA.revoco,
};

const TEJADO_MATERIAL: Record<TipoTejado, string> = {
  fronton: PALETA.pizarra,
  granero: PALETA.teja,
  cupula: PALETA.cobre,
  antena: PALETA.zinc,
  bandera: PALETA.zinc,
  ruina: PALETA.zinc,
  plano: PALETA.zinc,
};

function materialAcabado(rol: Rol, e: EdificioVisual): Material {
  switch (rol) {
    case 'base': return mate(PALETA.granito, { rugosidad: 0.8 });
    case 'muro': return mate(MURO_TIPOLOGIA[e.tipologia], { rugosidad: 0.82 });
    case 'acento': return mate(mezclar(e.color, '#ffffff', 0.12), { rugosidad: 0.55 });
    case 'tejado': return mate(TEJADO_MATERIAL[e.tejado], { rugosidad: 0.6, metal: e.tejado === 'cupula' ? 0.35 : 0.1 });
    case 'vidrio': return mate(e.tipologia === 'tecnologica' ? PALETA.vidrioClaro : PALETA.vidrio, { rugosidad: 0.22, metal: 0.35 });
    case 'metal': return mate(PALETA.metal, { rugosidad: 0.45, metal: 0.5 });
    case 'verde': return mate(PALETA.ajardinado, { rugosidad: 1 });
    case 'luz': return emisivo(PALETA.ventanaEncendida, true);
    case 'oscuro': return mate(PALETA.ventanaApagada, { rugosidad: 0.3, metal: 0.2, calco: true });
    case 'pantalla': return emisivo(e.color, true);
    case 'baliza': return emisivo('#ff6a5a');
    case 'bandera': return mate(e.color, { rugosidad: 0.7 });
    case 'moldura': return mate(PALETA.piedra, { rugosidad: 0.8 });
    case 'junta': return mate(PALETA.granito, { rugosidad: 0.85 });
    case 'bronce': return mate('#9a7a45', { rugosidad: 0.4, metal: 0.6 });
    case 'medallon': return mate('#22252b', { rugosidad: 0.45, metal: 0.35 });
    case 'entorno': return mate(PALETA.cesped, { rugosidad: 1 });
  }
}

const GIRO_FRENTE: Record<Frente, number> = { sur: 0, norte: Math.PI, este: Math.PI / 2, oeste: -Math.PI / 2 };

/** Fracción de la altura del edificio que está construida en cada fase. */
export const CONSTRUIDO_POR_FASE = { solar: 0, obra: 0.5, completo: 1 } as const;

export interface DatosArquitectura {
  /** Altura (mundo) de la parte más alta del edificio. */
  cima: number;
  /** Volumen principal en coordenadas locales (para andamios y encuadres). */
  principal: Volumen;
  /** Fija la altura (mundo) hasta la que el edificio está acabado. */
  fijarCorte(y: number): void;
  /** Altura de corte que corresponde a la fase actual. */
  corteFase: number;
}

/** Edificio completo de un concepto: lote, bordillo de dominio, acabado, proyecto y obra. */
export function construirArquitectura(e: EdificioVisual): Group {
  const grupo = new Group();
  grupo.name = `edificio-${e.conceptoId}`;
  grupo.position.set(e.posicion.x, NIVEL.lote, e.posicion.z);
  grupo.userData = { tipo: 'edificio', conceptoId: e.conceptoId };

  // Gramática de parcelas: lote con bordillo en el color de dominio (mismo código que la ciudad
  // 2D). En la gramática urbana el edificio ocupa toda su huella y el estado se lee en el propio
  // edificio (materiales, luz, obra), sin marcas de color en el suelo.
  if (e.composicion === 'parcelas') {
    const holgado = e.lote.ancho * e.lote.fondo > 90;
    const lote = new Mesh(
      new BoxGeometry(e.lote.ancho, NIVEL.lote - NIVEL.acera, e.lote.fondo),
      mate(holgado ? PALETA.cesped : PALETA.pavimentoLote, { rugosidad: 0.95 }),
    );
    lote.position.y = -(NIVEL.lote - NIVEL.acera) / 2;
    lote.receiveShadow = true;
    lote.name = 'lote';
    const colorBordillo = e.dominio > 0 ? colorDominio(e.dominio) : PALETA.sinEstudiar;
    const bordillo = new Taller();
    bordillo.marco('acento', e.lote.ancho, e.lote.fondo, 0, 0, 0, 0.07, 0.22);
    const mallaBordillo = new Mesh(unir(bordillo.piezas.get('acento')!)!, mate(colorBordillo, { rugosidad: 0.6 }));
    mallaBordillo.name = 'bordillo-dominio';
    grupo.add(lote, mallaBordillo);
  }

  // La arquitectura se gira para que la fachada principal mire a la calle.
  const cuerpo = new Group();
  cuerpo.rotation.y = GIRO_FRENTE[e.frente];
  const girado = e.frente === 'este' || e.frente === 'oeste';
  const W = girado ? e.lote.fondo : e.lote.ancho;
  const D = girado ? e.lote.ancho : e.lote.fondo;
  const taller = new Taller();
  const semilla = [...e.conceptoId].reduce((s, c) => s + c.charCodeAt(0), 0);
  if (e.composicion === 'urbana') {
    CONSTRUCTORES_URBANOS[e.tipologia](taller, {
      W, D, H: e.alturaCompleta, tejado: e.tejado, glifos: new Set(e.iconos), emblematico: e.emblematico, semilla, antepatio: Boolean(e.antepatio),
    });
  } else {
    CONSTRUCTORES[e.tipologia](taller, W, D, e.alturaCompleta, e.tejado, semilla);
  }
  detallar(taller, e);
  // Emblema de fachada con el icono del concepto (ver emblemas.ts).
  const v = taller.principal;
  emblema(taller, e.iconos, taller.escudo ?? {
    x: v.x, y: Math.max(2.8, v.h * 0.6), z: v.z + v.d / 2, tam: Math.min(1.5, v.w * 0.3, Math.max(0.9, v.h * 0.22)), modo: 'placa',
  });
  const material = (rol: Rol) => (e.composicion === 'urbana' ? materialUrbano(rol, e, semilla) : materialAcabado(rol, e));

  const cimaMundo = NIVEL.lote + taller.cima;
  const corteFase = e.fase === 'completo' ? cimaMundo + 1 : NIVEL.lote + taller.principal.h * CONSTRUIDO_POR_FASE[e.fase];
  const planoAcabado = new Plane(new Vector3(0, -1, 0), corteFase);
  const planoProyecto = new Plane(new Vector3(0, 1, 0), -corteFase);

  const proyectoPiezas: BufferGeometry[] = [];
  const proyectoHuecos: BufferGeometry[] = [];
  for (const [rol, piezas] of taller.piezas) {
    if (!SOLO_ACABADO.has(rol)) proyectoPiezas.push(...piezas.map((g) => g.clone()));
    if (rol === 'luz' || rol === 'oscuro') proyectoHuecos.push(...piezas.map((g) => g.clone()));
    const propio = material(rol).clone();
    // El entorno del lote no se recorta: el mundo está construido aunque el concepto no.
    if (rol !== 'entorno') Object.assign(propio, { clippingPlanes: [planoAcabado], clipShadows: true });
    const malla = new Mesh(unir(piezas)!, propio);
    malla.name = `acabado-${rol}`;
    malla.castShadow = !SOLO_ACABADO.has(rol) || rol === 'entorno';
    malla.receiveShadow = true;
    cuerpo.add(malla);
  }
  const blanco = mate(PALETA.proyecto, { rugosidad: 0.92 }).clone();
  Object.assign(blanco, { clippingPlanes: [planoProyecto], clipShadows: true });
  const proyecto = new Mesh(unir(proyectoPiezas)!, blanco);
  proyecto.name = 'proyecto';
  proyecto.castShadow = proyecto.receiveShadow = true;
  cuerpo.add(proyecto);
  const huecos = unir(proyectoHuecos);
  const gris = mate(PALETA.proyectoHueco, { rugosidad: 0.95, calco: true }).clone();
  Object.assign(gris, { clippingPlanes: [planoProyecto], clipShadows: true });
  const mallaHuecos = huecos ? new Mesh(huecos, gris) : null;
  if (mallaHuecos) {
    mallaHuecos.name = 'proyecto-huecos';
    mallaHuecos.receiveShadow = true;
    cuerpo.add(mallaHuecos);
  }

  if (e.fase === 'obra') cuerpo.add(obras(taller.principal, W, D, taller.cima, corteFase - NIVEL.lote));
  // Escultura del icono sobre la cubierta: lo que representa el edificio se reconoce de lejos.
  const escultura = construirEscultura(e, taller, W, D);
  if (escultura) cuerpo.add(escultura.raiz);
  grupo.add(cuerpo);

  if (escultura) grupo.userData.escultura = escultura;
  const datos: DatosArquitectura = {
    cima: escultura ? NIVEL.lote + escultura.cima : cimaMundo,
    principal: taller.principal,
    corteFase,
    fijarCorte(y: number) {
      planoAcabado.constant = y;
      planoProyecto.constant = -y;
      proyecto.visible = y < cimaMundo;
      if (mallaHuecos) mallaHuecos.visible = proyecto.visible;
    },
  };
  datos.fijarCorte(corteFase);
  grupo.userData.arquitectura = datos;
  return grupo;
}

/** Andamio sobre la parte por construir y una grúa en el lote: el edificio está en obra. */
function obras(v: Volumen, W: number, D: number, cima: number, corte: number): Group {
  const t = new Taller();
  const sep = 0.35;
  const w = v.w + sep * 2;
  const d = v.d + sep * 2;
  const desde = Math.max(0, corte - 0.6);
  // Pies derechos y barandillas.
  const pasos = (largo: number) => Math.max(2, Math.round(largo / 1.6));
  for (const [largo, eje] of [[w, 'x'], [d, 'z']] as const) {
    const n = pasos(largo);
    for (let i = 0; i <= n; i++) {
      const p = -largo / 2 + (i * largo) / n;
      for (const lado of [-1, 1]) {
        const [x, z] = eje === 'x' ? [v.x + p, v.z + (lado * d) / 2] : [v.x + (lado * w) / 2, v.z + p];
        t.caja('metal', 0.07, v.h - desde, 0.07, x, desde, z);
      }
    }
  }
  for (let y = desde + 0.9; y < v.h; y += 1.2) t.marco('metal', w, d, v.x, y, v.z, 0.06, 0.06);

  // Grúa torre en una esquina del lote.
  const gx = Math.min(W / 2 - 0.5, v.x + v.w / 2 + 1.1);
  const gz = Math.max(-D / 2 + 0.5, v.z - v.d / 2 - 0.9);
  const alto = cima + 2.6;
  const g = new Taller();
  g.caja('metal', 0.32, alto, 0.32, gx, 0, gz);
  const pluma = Math.min(5.5, Math.max(3.5, v.w * 0.9));
  g.caja('metal', pluma, 0.22, 0.22, gx - pluma / 2 + 0.3, alto, gz);
  g.caja('metal', 1.8, 0.22, 0.22, gx + 1.1, alto, gz);
  g.caja('metal', 0.6, 0.5, 0.5, gx + 1.7, alto - 0.3, gz); // contrapeso
  g.caja('metal', 0.5, 0.45, 0.45, gx, alto - 0.5, gz + 0.3); // cabina
  g.caja('metal', 0.03, 2.2, 0.03, gx - pluma * 0.6, alto - 2.2, gz); // cable

  const grupo = new Group();
  grupo.name = 'obra';
  const andamio = new Mesh(unir(t.piezas.get('metal')!)!, mate(PALETA.andamio, { rugosidad: 0.7 }));
  andamio.name = 'andamio';
  const grua = new Mesh(unir(g.piezas.get('metal')!)!, mate(PALETA.grua, { rugosidad: 0.5 }));
  grua.name = 'grua';
  andamio.castShadow = grua.castShadow = true;
  grupo.add(andamio, grua);
  return grupo;
}

/* ------------------------------------------------------------------ escultura del icono */

/** Cómo se mueve cada escultura: los organismos que vigilan barren la ciudad; las monedas giran. */
export type MovimientoEscultura = 'vigila' | 'gira' | 'mece';
const MOVIMIENTO: Partial<Record<GlyphName, MovimientoEscultura>> = {
  eye: 'vigila', lens: 'vigila', euro: 'gira', globe: 'gira', clock: 'gira', brain: 'vigila',
};

export interface Escultura {
  raiz: Group;
  /** Pieza que se anima (gira en torno al eje vertical). */
  pieza: Object3D;
  movimiento: MovimientoEscultura;
  fase: number;
  /** Altura (local, sobre el lote) de lo más alto de la escultura. */
  cima: number;
}

/**
 * El icono principal del concepto (su primer glifo de DATA) en grande y macizo sobre un mástil en
 * la cubierta. Construido: en el color del concepto, con brillo metálico. En obra: a medio color.
 * Sin estudiar: en maqueta blanca, como el resto del edificio.
 */
function construirEscultura(e: EdificioVisual, t: Taller, W: number, D: number): Escultura | null {
  const glifo = glifoDelEmblema(e.iconos);
  const solido = glifo ? glifoSolido(glifo) : null;
  if (!glifo || !solido) return null;
  const v = t.principal;
  const tam = Math.min(4.2, Math.max(2.3, Math.min(W, D) * 0.5));
  const apoyo = Math.max(v.h, t.cima - 0.6);
  const altoMastil = Math.max(0.5, t.cima + 0.4 - apoyo);
  const raiz = new Group();
  raiz.name = 'escultura';
  raiz.position.set(v.x, apoyo, v.z);
  const metal = mate('#5d6168', { rugosidad: 0.4, metal: 0.6 });
  const mastil = new Mesh(new CylinderGeometry(0.07, 0.1, altoMastil, 8).translate(0, altoMastil / 2, 0), metal);
  const peana = new Mesh(new CylinderGeometry(0.42, 0.5, 0.18, 16).translate(0, 0.09, 0), metal);
  const color = e.fase === 'completo' ? e.color : e.fase === 'obra' ? mezclar(e.color, PALETA.proyecto, 0.5) : PALETA.proyecto;
  const material = e.fase === 'solar'
    ? mate(PALETA.proyecto, { rugosidad: 0.9 })
    : new MeshStandardMaterial({ color, metalness: 0.45, roughness: 0.32, emissive: color, emissiveIntensity: e.fase === 'completo' ? 0.22 : 0.06 });
  const pieza = new Group();
  pieza.position.y = altoMastil + tam / 2;
  const icono = new Mesh(solido, material);
  icono.scale.set(tam, tam, tam);
  icono.name = `escultura-${glifo}`;
  pieza.add(icono);
  raiz.add(peana, mastil, pieza);
  return {
    raiz, pieza, movimiento: MOVIMIENTO[glifo] ?? 'mece',
    fase: [...e.conceptoId].reduce((s, c) => s + c.charCodeAt(0), 0) % 7,
    cima: apoyo + altoMastil + tam,
  };
}

/** Anima la escultura de un edificio (t en segundos). */
export function animarEscultura(x: Escultura, t: number): void {
  const p = x.pieza;
  if (x.movimiento === 'vigila') {
    // Barre la ciudad de un lado a otro, como quien vigila.
    p.rotation.y = Math.sin(t * 0.55 + x.fase) * 1.25;
    p.rotation.x = Math.sin(t * 0.37 + x.fase) * 0.12;
  } else if (x.movimiento === 'gira') {
    p.rotation.y = t * 0.7 + x.fase;
  } else {
    p.rotation.y = Math.sin(t * 0.45 + x.fase) * 0.38;
  }
}

/* ------------------------------------------------------------------ detalle */

/**
 * Detalle de maqueta fina, común a todas las tipologías: farolillos a los lados de la entrada,
 * jardineras delante de la fachada y, en las cubiertas planas, máquinas de clima, un depósito de
 * agua y claraboyas (dejando libre el centro, donde va la escultura).
 */
function detallar(t: Taller, e: EdificioVisual): void {
  const v = t.principal;
  const zf = v.z + v.d / 2;
  const s = [...e.conceptoId].reduce((a, c) => a + c.charCodeAt(0), 0);
  // Farolillos y jardineras en la fachada principal.
  for (const lado of [-1, 1]) {
    t.caja('metal', 0.08, 0.5, 0.08, v.x + lado * 1.25, 1.55, zf + 0.12);
    t.caja('luz', 0.2, 0.26, 0.2, v.x + lado * 1.25, 2.02, zf + 0.12);
    t.caja('base', 0.7, 0.32, 0.4, v.x + lado * Math.min(v.w / 2 - 0.5, 2.1), 0, zf + 0.45);
    t.caja('verde', 0.6, 0.26, 0.32, v.x + lado * Math.min(v.w / 2 - 0.5, 2.1), 0.32, zf + 0.45);
  }
  // Cubierta: solo en las planas (en las inclinadas, cúpulas y frontones no cabe).
  if (!['plano', 'bandera', 'antena'].includes(e.tejado) || v.w < 3 || v.d < 3) return;
  const y = v.h;
  const ex = v.w / 2 - 0.65;
  const ez = v.d / 2 - 0.65;
  const esquinas: [number, number][] = [[-ex, -ez], [ex, -ez], [-ex, ez * 0.2], [ex, ez * 0.2]];
  esquinas.forEach(([x, z], k) => {
    const tipo = (s + k) % 3;
    if (tipo === 0) {
      // Máquina de clima: caja con rejilla.
      t.caja('metal', 0.8, 0.45, 0.6, v.x + x, y, v.z + z);
      t.caja('oscuro', 0.6, 0.06, 0.4, v.x + x, y + 0.45, v.z + z);
    } else if (tipo === 1) {
      // Depósito de agua sobre patas.
      for (const [px, pz] of [[-0.25, -0.25], [0.25, -0.25], [-0.25, 0.25], [0.25, 0.25]] as const) t.caja('metal', 0.06, 0.5, 0.06, v.x + x + px, y, v.z + z + pz);
      t.cilindro('muro', 0.38, 0.6, v.x + x, y + 0.5, v.z + z, 12);
      t.cilindro('tejado', 0.42, 0.08, v.x + x, y + 1.1, v.z + z, 12);
    } else {
      // Claraboya acristalada.
      t.caja('base', 0.95, 0.18, 0.7, v.x + x, y, v.z + z);
      t.caja('vidrio', 0.8, 0.12, 0.55, v.x + x, y + 0.18, v.z + z);
    }
  });
}
