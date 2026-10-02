// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { skylineSeccion } from '../../src/ui/components/skyline.ts';
import { tipologiaDe } from '../../src/world/typology.ts';

describe('silueta de la manzana de una sección', () => {
  const conceptos = tema01.conceptos.filter((c) => c.seccionId === '4.2A');
  const progreso = { dominio: { [conceptos[0]!.id]: 1, [conceptos[1]!.id]: 0.5 }, intentos: {} } as never;

  it('un edificio por concepto, con su nombre y en su estado de obra', () => {
    const div = document.createElement('div');
    div.innerHTML = skylineSeccion(conceptos, progreso);
    const eds = [...div.querySelectorAll('.sk-ed')];
    expect(eds).toHaveLength(conceptos.length);
    expect(eds.map((e) => e.querySelector('title')?.textContent)).toEqual(conceptos.map((c) => c.nombre));
    expect(div.querySelectorAll('.sk-solar').length).toBeGreaterThan(0);
    expect(div.querySelector('svg')?.getAttribute('aria-label')).toContain(`${conceptos.length} edificios`);
  });

  it('la tipología sale de los glifos de DATA', () => {
    expect(tipologiaDe(conceptos.find((c) => c.id === 'bde')!.iconos)).toBe('institucional');
    expect(skylineSeccion([], progreso)).toBe('');
  });
});
