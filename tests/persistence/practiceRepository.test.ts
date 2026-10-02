import { describe, expect, it } from 'vitest';
import { registrarFallo } from '../../src/domain/practice.ts';
import { CLAVE_PRACTICA, cargarPractica, guardarPractica } from '../../src/persistence/practiceRepository.ts';
import type { AlmacenClaveValor } from '../../src/persistence/storage.ts';

function almacen(inicial: Record<string, string> = {}): AlmacenClaveValor & { datos: Record<string, string> } {
  const datos = { ...inicial };
  return { datos, getItem: (k) => datos[k] ?? null, setItem: (k, v) => void (datos[k] = v) };
}

describe('repositorio de práctica', () => {
  it('guarda y carga por tema con versión', () => {
    const a = almacen();
    const p = registrarFallo(cargarPractica(a, 1), 'q1', '2026-10-02');
    guardarPractica(a, 1, p);
    expect(JSON.parse(a.datos[CLAVE_PRACTICA]!).version).toBe(1);
    expect(cargarPractica(a, 1).fallos.q1?.veces).toBe(1);
    expect(cargarPractica(a, 2).fallos).toEqual({});
  });

  it('ignora otra versión, JSON roto o almacenamiento ausente', () => {
    expect(cargarPractica(almacen({ [CLAVE_PRACTICA]: '{"version":9,"temas":{"1":{}}}' }), 1).fallos).toEqual({});
    expect(cargarPractica(almacen({ [CLAVE_PRACTICA]: '{roto' }), 1).fallos).toEqual({});
    expect(cargarPractica(null, 1).simulacros).toEqual([]);
    expect(() => guardarPractica(null, 1, cargarPractica(null, 1))).not.toThrow();
  });
});
