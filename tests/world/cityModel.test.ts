import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { dominioGlobal } from '../../src/domain/mastery.ts';
import { seccionesPrioritarias } from '../../src/domain/priority.ts';
import type { Progreso } from '../../src/domain/progress.ts';
import { vistaAtlas } from '../../src/world/atlas.ts';
import { ESCALA_ALTURA, faseObra, modeloCiudad } from '../../src/world/cityModel.ts';
import { ALTURA_TIPOLOGIA, TEJADO_TIPOLOGIA, tipologiaDe } from '../../src/world/typology.ts';
import { areaRect } from '../../src/world/geometry.ts';

const progreso: Progreso = { dominio: { sf: 1, bancos: 0.5, bde: 1, cajas: 0.25 }, intentos: {} };
const m = modeloCiudad(tema01, progreso);

describe('modelo visual de la ciudad', () => {
  it('un barrio por grupo, una zona por sección y un edificio por concepto', () => {
    expect(m.barrios.map((b) => b.grupoId)).toEqual(tema01.grupos.map((g) => g.id));
    expect(m.zonas.map((z) => z.seccionId)).toEqual(tema01.secciones.map((s) => s.id));
    expect(m.edificios.map((e) => e.conceptoId)).toEqual(tema01.conceptos.map((c) => c.id));
  });

  it('la superficie representa el peso real en examen', () => {
    const ciudad = m.lado * m.lado;
    const pesoTotal = tema01.secciones.reduce((s, x) => s + x.pesoExamen, 0);
    for (const b of m.barrios) {
      expect(b.pesoExamen).toBe(tema01.secciones.filter((s) => s.grupoId === b.grupoId).reduce((s, x) => s + x.pesoExamen, 0));
      expect(areaRect(b.rect) / ciudad).toBeCloseTo(b.pesoExamen / pesoTotal, 6);
      for (const z of m.zonas.filter((z) => z.grupoId === b.grupoId)) {
        expect(areaRect(z.lote) / areaRect(b.parcela)).toBeCloseTo(z.pesoExamen / b.pesoExamen, 6);
      }
    }
  });

  it('el estado de cada edificio sale del dominio (solo los niveles existentes)', () => {
    const fase = (id: string) => m.edificios.find((e) => e.conceptoId === id)!.fase;
    expect(fase('sf')).toBe('completo');
    expect(fase('bancos')).toBe('obra');
    expect(fase('cajas')).toBe('obra');
    expect(fase('mur')).toBe('solar');
    expect(faseObra('dominado')).toBe('completo');
    expect(faseObra('sin-estudiar')).toBe('solar');
  });

  it('los 12 edificios de la portada conservan su altura y su tejado de DATA', () => {
    for (const e of m.edificios) {
      const portada = tema01.ciudad.edificios.find((x) => x.conceptoId === e.conceptoId);
      expect(e.emblematico).toBe(Boolean(portada));
      if (portada) {
        expect(e.tejado).toBe(portada.tejado);
        expect(e.alturaCompleta).toBeCloseTo((portada.altura / 6) * ESCALA_ALTURA);
      } else {
        expect(e.tejado).toBe(TEJADO_TIPOLOGIA[e.tipologia]);
        expect(e.alturaCompleta).toBeCloseTo(ALTURA_TIPOLOGIA[e.tipologia] * ESCALA_ALTURA);
      }
    }
  });

  it('la tipología sale de los glifos del concepto (gramática visual)', () => {
    const tipo = (id: string) => m.edificios.find((e) => e.conceptoId === id)!.tipologia;
    expect(tipo('bce')).toBe('institucional'); // brain
    expect(tipo('bde')).toBe('institucional'); // vault
    expect(tipo('bancos')).toBe('banco'); // ship
    expect(tipo('cnmv')).toBe('supervisor'); // lens
    expect(tipo('seguros')).toBe('aseguradora'); // shield
    expect(tipo('mercado')).toBe('lonja'); // store → chart
    expect(tipo('pagos')).toBe('tecnologica'); // card
    expect(tipo('fondo')).toBe('oficina'); // basket
    for (const e of m.edificios) {
      expect(e.tipologia).toBe(tipologiaDe(tema01.conceptos.find((c) => c.id === e.conceptoId)!.iconos));
    }
  });

  it('gramática de parcelas: los lotes llenan la manzana', () => {
    for (const z of m.zonas.filter((x) => x.composicion === 'parcelas')) {
      const lotes = m.edificios.filter((e) => e.seccionId === z.seccionId).map((e) => e.lote);
      const ocupado = lotes.reduce((s, r) => s + areaRect(r), 0) + (z.plaza ? areaRect(z.plaza) : 0);
      // Solo quedan libres los pasajes entre lotes.
      expect(ocupado / areaRect(z.interior)).toBeGreaterThan(0.7);
      for (const r of lotes) {
        expect(r.x).toBeGreaterThanOrEqual(z.interior.x - 1e-9);
        expect(r.x + r.ancho).toBeLessThanOrEqual(z.interior.x + z.interior.ancho + 1e-9);
      }
    }
    for (const e of m.edificios) expect(e.posicion.x).toBeCloseTo(e.lote.x + e.lote.ancho / 2);
  });

  it('calles y avenidas forman la red entre manzanas', () => {
    expect(m.avenidas.length).toBeGreaterThan(0);
    expect(m.calles.length).toBeGreaterThan(0);
    // Las zonas con mucho espacio por concepto tienen plaza; las densas, no.
    expect(m.zonas.find((z) => z.seccionId === '2')!.plaza).not.toBeNull();
    expect(m.zonas.find((z) => z.seccionId === '4.2A')!.plaza).toBeNull(); // urbana: patios en vez de plaza
  });

  it('el arbolado tiene motivo y nunca pisa un lote', () => {
    expect(m.arboles.every((a) => ['bulevar', 'plaza', 'patio', 'paseo'].includes(a.motivo))).toBe(true);
    for (const a of m.arboles) {
      for (const e of m.edificios) {
        const dentro = a.posicion.x > e.lote.x && a.posicion.x < e.lote.x + e.lote.ancho && a.posicion.z > e.lote.z && a.posicion.z < e.lote.z + e.lote.fondo;
        expect(dentro).toBe(false);
      }
    }
    // No es relleno: es una fracción de lo que había antes (cientos de árboles sueltos).
    expect(m.arboles.length).toBeLessThan(200);
  });

  it('las prioridades coinciden con "Estudia ya" de la portada', () => {
    const ya = seccionesPrioritarias(tema01, progreso).map((s) => s.id);
    const marcadas = m.zonas.filter((z) => z.prioridad).sort((a, b) => a.prioridad! - b.prioridad!).map((z) => z.seccionId);
    expect(marcadas).toEqual(ya);
  });

  it('es determinista', () => {
    expect(modeloCiudad(tema01, progreso)).toEqual(m);
  });

  it('el dominio de la ciudad en el Atlas es el dominio global', () => {
    expect(vistaAtlas(m, { nivel: 'ciudad' }).dominio).toBeCloseTo(dominioGlobal(tema01, progreso), 10);
  });
});
