import { type Practica, sanearPractica } from '../domain/practice.ts';
import { type AlmacenClaveValor, escribirJson, leerJson } from './storage.ts';

/** Práctica (repaso de fallos, flashcards y simulacros). Clave aparte: el progreso no cambia. */
export const CLAVE_PRACTICA = 'financial-academy:practica';
export const VERSION_PRACTICA = 1;

interface DocumentoPractica {
  version: typeof VERSION_PRACTICA;
  temas: Record<string, Practica>;
}

function leerDocumento(almacen: AlmacenClaveValor | null): DocumentoPractica {
  const crudo = leerJson(almacen, CLAVE_PRACTICA) as Partial<DocumentoPractica> | undefined;
  const temas: Record<string, Practica> = {};
  if (crudo && crudo.version === VERSION_PRACTICA && crudo.temas && typeof crudo.temas === 'object') {
    for (const [numero, practica] of Object.entries(crudo.temas)) temas[numero] = sanearPractica(practica);
  }
  return { version: VERSION_PRACTICA, temas };
}

export function cargarPractica(almacen: AlmacenClaveValor | null, numeroTema: number): Practica {
  return leerDocumento(almacen).temas[numeroTema] ?? sanearPractica(undefined);
}

export function guardarPractica(almacen: AlmacenClaveValor | null, numeroTema: number, practica: Practica): void {
  const documento = leerDocumento(almacen);
  documento.temas[numeroTema] = practica;
  escribirJson(almacen, CLAVE_PRACTICA, documento);
}
