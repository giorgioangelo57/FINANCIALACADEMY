import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { fichaContextual } from '../../src/ui/world/contextCard.ts';
import { separarTitulo } from '../../src/ui/world/worldPanel.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';

const m = modeloCiudad(tema01, { dominio: { bde: 1, bancos: 0.5 }, intentos: {} });

describe('ficha contextual', () => {
  it('la vista general no tiene ficha: solo la ciudad', () => {
    expect(fichaContextual(m, { nivel: 'ciudad' }, 'seleccion')).toBe('');
  });

  it('zona: peso real, conceptos y dominio; la acción solo al seleccionar', () => {
    const vistazo = fichaContextual(m, { nivel: 'zona', seccionId: '4.2A' }, 'vistazo');
    expect(vistazo).toContain('<b>25</b><span>% del examen</span>');
    expect(vistazo).toContain('<b>8</b><span>conceptos</span>');
    expect(vistazo).toContain('Pulsa para acercarte');
    expect(vistazo).not.toContain('href=');
    const seleccion = fichaContextual(m, { nivel: 'zona', seccionId: '4.2A' }, 'seleccion');
    expect(seleccion).toContain('href="#s/4.2A"');
  });

  it('la recomendación de estudio se anuncia en la ficha, no con un pin', () => {
    const primera = m.zonas.find((z) => z.prioridad === 1)!;
    const html = fichaContextual(m, { nivel: 'zona', seccionId: primera.seccionId }, 'vistazo');
    expect(html).toContain('Siguiente recomendación de estudio');
    expect(html).not.toContain('📌');
  });

  it('edificio: nombre grande, estado y enlace a la ficha del concepto', () => {
    const html = fichaContextual(m, { nivel: 'edificio', conceptoId: 'bancos' }, 'seleccion');
    expect(html).toContain('Bancos privados');
    expect(html).toContain('En obra · a medias');
    expect(html).toContain('href="#c/bancos"');
    // Los conceptos no tienen peso en DATA: la ficha no lo inventa.
    expect(html).not.toContain('% del examen');
  });

  it('barrio: número y nombre separados del título de DATA', () => {
    expect(separarTitulo('4 · Estructura del sistema español')).toEqual(['4', 'Estructura del sistema español']);
    expect(separarTitulo('Sin número')).toEqual(['', 'Sin número']);
    const html = fichaContextual(m, { nivel: 'barrio', grupoId: '4' }, 'vistazo');
    expect(html).toContain('Barrio 4');
    expect(html).toContain('<b>51</b>');
  });
});
