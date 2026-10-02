import { Box3, type Mesh, type Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { construirCapaDinamica, construirCapaEstatica } from '../../src/scene/three/builders.ts';
import { Taller } from '../../src/scene/three/taller.ts';
import { texturaAcera, texturaAsfalto, texturaCesped, texturaLosas } from '../../src/scene/three/textures.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';

const nombres = (o: Object3D) => {
  const n: string[] = [];
  o.traverse((x) => n.push(x.name));
  return n;
};

describe('escena urbana (barrio 4)', () => {
  const sinEstudiar = modeloCiudad(tema01, { dominio: {}, intentos: {} });
  const estudiado = modeloCiudad(tema01, { dominio: { bde: 1, bancos: 1, cajas: 0.5, cnmv: 1 }, intentos: {} });

  it('texturas de suelo procedurales, compartidas y repetibles', () => {
    for (const crear of [texturaAcera, texturaLosas, texturaAsfalto, texturaCesped]) {
      const t = crear();
      expect(t.image.width).toBe(64);
      expect(t).toBe(crear()); // se generan una sola vez
      expect(t.repeat.x).toBeGreaterThan(0);
    }
  });

  it('taller: el tronco de pirámide queda dentro de su base y altura', () => {
    const t = new Taller();
    t.tronco('tejado', 4, 2, 2, 1, 1.5, 0, 3, 0);
    const caja = new Box3().setFromBufferAttribute(t.piezas.get('tejado')![0]!.getAttribute('position') as never);
    expect(caja.min.y).toBeCloseTo(3);
    expect(caja.max.y).toBeCloseTo(4.5);
    expect(caja.max.x - caja.min.x).toBeCloseTo(4);
    expect(t.cima).toBeCloseTo(4.5);
  });

  it('el mundo está construido aunque no se haya estudiado nada', () => {
    const estatica = nombres(construirCapaEstatica(sinEstudiar));
    for (const pieza of ['patio', 'pasaje', 'manzana', 'sendas', 'coches-aparcados', 'arbolado', 'farolas']) {
      expect(estatica).toContain(pieza);
    }
    expect(estatica.some((n) => n.startsWith('antepatio-'))).toBe(true);
  });

  it('la actividad en movimiento solo aparece con estudio y no proyecta sombras', () => {
    const vacia = construirCapaDinamica(sinEstudiar);
    expect(vacia.coches).toBeNull();
    expect(vacia.peatones).toBeNull();
    const viva = construirCapaDinamica(estudiado);
    expect(viva.peatones).not.toBeNull();
    expect(viva.rutasPeatones.length).toBeGreaterThan(0);
    // Si proyectaran sombra, el mapa de sombras tendría que recalcularse en cada fotograma.
    expect(viva.coches!.castShadow).toBe(false);
    expect(viva.peatones!.castShadow).toBe(false);
  });

  it('los landmarks urbanos tienen silueta propia', () => {
    const capa = construirCapaDinamica(estudiado);
    const altura = (id: string) => new Box3().setFromObject(capa.edificios.get(id)!).max.y;
    // La autoridad central (BCE) es la silueta más alta de su barrio.
    const barrio4 = estudiado.edificios.filter((e) => e.grupoId === '4').map((e) => e.conceptoId);
    expect(Math.max(...barrio4.map(altura))).toBeCloseTo(altura('bce'));
    // Rasgos por glifo: la SGR (handshake) tiene pasarela de vidrio; la caja (chapel) su hastial.
    const roles = (id: string) => nombres(capa.edificios.get(id)!).filter((n) => n.startsWith('acabado-'));
    expect(roles('sgr')).toContain('acabado-vidrio');
    expect(roles('cajas')).toContain('acabado-tejado');
    const malla = capa.edificios.get('bde')!.getObjectByName('acabado-moldura') as Mesh;
    expect(malla.geometry.getAttribute('position').count).toBeGreaterThan(100);
  });
});
