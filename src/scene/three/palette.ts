/**
 * Paleta de la maqueta: piedra cálida, asfalto, vegetación natural y una "maqueta blanca" para
 * lo que aún no se ha estudiado. El color de cada concepto (DATA) se reserva para acentos.
 */
export const PALETA = {
  peanaMadera: '#4d392b',
  peanaCanto: '#e8e1d4',
  asfalto: '#5d5a57',
  marcaVial: '#ece5d6',
  mediana: '#8fae6f',
  bordillo: '#cfc6b6',
  /** Acera de cada barrio: misma piedra con un matiz que distingue los distritos. */
  aceras: ['#ddd1bb', '#d0d8c6', '#d2d3dc', '#e0d0c4'],
  pavimentoLote: '#cdbfa8',
  cesped: '#8fb06a',
  pavimentoPlaza: '#e3d6bf',
  agua: '#7fb3c4',
  // Arquitectura acabada.
  piedra: '#efe6d3',
  granito: '#b7a993',
  ladrillo: '#c98b68',
  revoco: '#ece6dc',
  vidrio: '#5d7c8c',
  vidrioClaro: '#86a9ba',
  pizarra: '#626070',
  cobre: '#7fa298',
  teja: '#b8634a',
  zinc: '#8d9aa2',
  metal: '#9a9a9e',
  ajardinado: '#7fa65f',
  ventanaEncendida: '#ffd59a',
  ventanaApagada: '#40505f',
  /** Maqueta blanca: el proyecto de lo que se construirá al estudiar. */
  proyecto: '#dedbd5',
  /** Huecos grabados en la maqueta blanca: dan escala sin color. */
  proyectoHueco: '#b2b1ad',
  andamio: '#c98a3a',
  grua: '#d2a03c',
  sinEstudiar: '#a49e93',
  tronco: '#6f5038',
  copas: ['#6e9a55', '#7aa65d', '#628e4c', '#86ad66'],
  farola: '#3e3d40',
  luzFarola: '#ffe3a8',
  marcador: '#ff4f8b',
  coches: ['#d9584b', '#3f74b8', '#efc04f', '#f2efe8', '#4f9a8f', '#2f3136'],
  seleccion: '#ffffff',
} as const;

/** Niveles del suelo (sin superficies coplanares: el z-fighting producía el parpadeo). */
export const NIVEL = {
  peana: -0.3,
  calle: 0,
  mediana: 0.16,
  acera: 0.22,
  lote: 0.27,
  plaza: 0.29,
} as const;

/** Compatibilidad con el resto del renderer: el suelo de los edificios. */
export const ALTO_ZONA = NIVEL.lote;
