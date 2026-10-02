import type { BarrioVisual, EdificioVisual, ModeloCiudad, ZonaVisual } from './cityModel.ts';
import { centroRect, type Rect } from './geometry.ts';

/**
 * Escala de exploración del mundo: ciudad → barrio (grupo) → zona (sección) → edificio (concepto).
 * Es la misma jerarquía que el Atlas; la cámara y el panel HTML siguen el mismo foco.
 */
export type Foco =
  | { nivel: 'ciudad' }
  | { nivel: 'barrio'; grupoId: string }
  | { nivel: 'zona'; seccionId: string }
  | { nivel: 'edificio'; conceptoId: string };

export const FOCO_CIUDAD: Foco = { nivel: 'ciudad' };

export const buscarBarrio = (m: ModeloCiudad, id: string): BarrioVisual | undefined => m.barrios.find((b) => b.grupoId === id);
export const buscarZona = (m: ModeloCiudad, id: string): ZonaVisual | undefined => m.zonas.find((z) => z.seccionId === id);
export const buscarEdificio = (m: ModeloCiudad, id: string): EdificioVisual | undefined =>
  m.edificios.find((e) => e.conceptoId === id);

export function focoValido(m: ModeloCiudad, foco: Foco): boolean {
  switch (foco.nivel) {
    case 'ciudad':
      return true;
    case 'barrio':
      return Boolean(buscarBarrio(m, foco.grupoId));
    case 'zona':
      return Boolean(buscarZona(m, foco.seccionId));
    case 'edificio':
      return Boolean(buscarEdificio(m, foco.conceptoId));
  }
}

export function igualFoco(a: Foco, b: Foco): boolean {
  return codificarFoco(a) === codificarFoco(b);
}

/** Forma textual estable (para atributos `data-foco`). */
export function codificarFoco(foco: Foco): string {
  switch (foco.nivel) {
    case 'ciudad':
      return 'ciudad';
    case 'barrio':
      return `barrio:${foco.grupoId}`;
    case 'zona':
      return `zona:${foco.seccionId}`;
    case 'edificio':
      return `edificio:${foco.conceptoId}`;
  }
}

/** Inversa de `codificarFoco`; null si el texto no corresponde a nada del modelo. */
export function decodificarFoco(m: ModeloCiudad, texto: string): Foco | null {
  const separador = texto.indexOf(':');
  const nivel = separador < 0 ? texto : texto.slice(0, separador);
  const id = separador < 0 ? '' : texto.slice(separador + 1);
  let foco: Foco | null = null;
  if (nivel === 'ciudad') foco = FOCO_CIUDAD;
  else if (nivel === 'barrio') foco = { nivel, grupoId: id };
  else if (nivel === 'zona') foco = { nivel, seccionId: id };
  else if (nivel === 'edificio') foco = { nivel, conceptoId: id };
  return foco && focoValido(m, foco) ? foco : null;
}

/** Un nivel más arriba en la jerarquía (null en la ciudad). */
export function focoPadre(m: ModeloCiudad, foco: Foco): Foco | null {
  switch (foco.nivel) {
    case 'ciudad':
      return null;
    case 'barrio':
      return FOCO_CIUDAD;
    case 'zona': {
      const zona = buscarZona(m, foco.seccionId);
      return zona ? { nivel: 'barrio', grupoId: zona.grupoId } : FOCO_CIUDAD;
    }
    case 'edificio': {
      const edificio = buscarEdificio(m, foco.conceptoId);
      return edificio ? { nivel: 'zona', seccionId: edificio.seccionId } : FOCO_CIUDAD;
    }
  }
}

/** Cadena desde la ciudad hasta el foco, ambos incluidos. */
export function cadenaFoco(m: ModeloCiudad, foco: Foco): Foco[] {
  const cadena: Foco[] = [];
  for (let f: Foco | null = foco; f; f = focoPadre(m, f)) cadena.unshift(f);
  return cadena;
}

/** Superficie que ocupa el foco en el suelo. */
export function rectFoco(m: ModeloCiudad, foco: Foco): Rect {
  const ciudad = { x: -m.lado / 2, z: -m.lado / 2, ancho: m.lado, fondo: m.lado };
  switch (foco.nivel) {
    case 'ciudad':
      return ciudad;
    case 'barrio':
      return buscarBarrio(m, foco.grupoId)?.parcela ?? ciudad;
    case 'zona':
      return buscarZona(m, foco.seccionId)?.parcela ?? ciudad;
    case 'edificio': {
      const e = buscarEdificio(m, foco.conceptoId);
      if (!e) return ciudad;
      // Un poco de aire alrededor del edificio para verlo con su entorno.
      const lado = Math.max(e.huella * 2.6, e.alturaCompleta * 1.4);
      return { x: e.posicion.x - lado / 2, z: e.posicion.z - lado / 2, ancho: lado, fondo: lado };
    }
  }
}

export interface Encuadre {
  centro: { x: number; y: number; z: number };
  /** Radio de la esfera que hay que ver entera. */
  radio: number;
}

/** Qué debe abarcar la cámara para mostrar el foco. Independiente del renderer. */
export function encuadre(m: ModeloCiudad, foco: Foco): Encuadre {
  const r = rectFoco(m, foco);
  const c = centroRect(r);
  const altura = foco.nivel === 'edificio' ? (buscarEdificio(m, foco.conceptoId)?.alturaCompleta ?? 0) : 0;
  const radio = Math.max(Math.hypot(r.ancho, r.fondo) / 2, altura * 0.8, 4);
  return { centro: { x: c.x, y: altura / 2, z: c.z }, radio };
}
