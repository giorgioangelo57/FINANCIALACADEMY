import type { Tema } from '../../schema.ts';
import { ampliacion } from './ampliacion.ts';
import { edificios } from './ciudad.ts';
import { conceptos } from './conceptos.ts';
import { grupos, meta, modos } from './meta.ts';
import { secciones } from './secciones.ts';

export const tema01: Tema = {
  meta,
  grupos,
  secciones,
  modos,
  conceptos,
  ciudad: { edificios },
  ampliacion,
};
