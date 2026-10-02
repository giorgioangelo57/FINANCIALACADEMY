import type { Group, Mesh, Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { construirCapaDinamica, construirCapaEstatica, datosArquitectura } from '../../src/scene/three/builders.ts';
import { NIVEL } from '../../src/scene/three/palette.ts';
import { modeloCiudad } from '../../src/world/cityModel.ts';

const m = modeloCiudad(tema01, { dominio: { bde: 1, bancos: 0.5 }, intentos: {} });
const nombres = (g: Object3D) => {
  const n: string[] = [];
  g.traverse((o) => n.push(o.name));
  return n;
};

describe('maqueta Three.js (sin renderer)', () => {
  const capa = construirCapaDinamica(m);
  const edificio = (id: string) => capa.edificios.get(id)!;

  it('un grupo seleccionable por concepto', () => {
    expect(capa.edificios.size).toBe(45);
    for (const [id, g] of capa.edificios) expect(g.userData).toMatchObject({ tipo: 'edificio', conceptoId: id });
  });

  it('no hay wireframes ni volúmenes transparentes en los edificios', () => {
    capa.raiz.traverse((o) => {
      if (o.name.startsWith('calor-') || o.name.startsWith('senal-')) return;
      const malla = o as Mesh;
      expect((o as { isLine?: boolean }).isLine).toBeFalsy();
      if (malla.isMesh && !Array.isArray(malla.material)) expect(malla.material.transparent).toBe(false);
    });
  });

  it('cada fase es la misma masa con distinto grado de construcción', () => {
    const corte = (id: string) => datosArquitectura(edificio(id))!;
    // Solar: maqueta blanca entera, nada acabado.
    const solar = corte('mur');
    expect(solar.corteFase).toBeCloseTo(NIVEL.lote);
    expect(edificio('mur').getObjectByName('proyecto')!.visible).toBe(true);
    // En obra: mitad acabada, mitad proyecto, con andamio y grúa.
    const obra = corte('bancos');
    expect(obra.corteFase).toBeCloseTo(NIVEL.lote + obra.principal.h / 2);
    expect(nombres(edificio('bancos'))).toEqual(expect.arrayContaining(['andamio', 'grua']));
    // Construido: todo acabado, sin obra ni proyecto visible.
    const hecho = corte('bde');
    expect(hecho.corteFase).toBeGreaterThan(hecho.cima);
    expect(edificio('bde').getObjectByName('proyecto')!.visible).toBe(false);
    expect(nombres(edificio('bde'))).not.toContain('grua');
  });

  it('las tipologías producen arquitecturas distintas', () => {
    const roles = (id: string) => nombres(edificio(id)).filter((n) => n.startsWith('acabado-')).sort().join();
    expect(roles('mercado')).toContain('acabado-pantalla'); // lonja con panel de cotizaciones
    expect(roles('cnmv')).toContain('acabado-vidrio'); // torre de supervisión
    expect(roles('bde')).not.toBe(roles('cnmv'));
  });

  it('"Estudia ya" como columnas de luz, lámina del Atlas y tráfico solo donde hay estudio', () => {
    expect(capa.senales).toHaveLength(3);
    // Es luz del mundo, no un pin: no proyecta sombra ni se puede seleccionar.
    for (const g of capa.senales) g.traverse((o) => expect(o.castShadow).toBe(false));
    expect(capa.calor).toHaveLength(12);
    expect(capa.rutas.length).toBeGreaterThan(0);
    expect(construirCapaDinamica(modeloCiudad(tema01, { dominio: {}, intentos: {} })).coches).toBeNull();
  });

  it('las zonas de la capa estática son seleccionables', () => {
    const zonas: string[] = [];
    construirCapaEstatica(m).traverse((o) => {
      if (o.userData.tipo === 'zona' && o.name === 'plataforma') zonas.push(o.userData.seccionId);
    });
    expect(zonas).toEqual(tema01.secciones.map((s) => s.id));
  });

  it('el suelo no tiene superficies coplanares (causa del parpadeo)', () => {
    const niveles = Object.values(NIVEL).sort((a, b) => a - b);
    for (let i = 1; i < niveles.length; i++) expect(niveles[i]! - niveles[i - 1]!).toBeGreaterThan(0.019);
    const estatica = construirCapaEstatica(m) as Group;
    const caras = new Map<string, string[]>();
    estatica.traverse((o) => {
      const malla = o as Mesh;
      if (!malla.isMesh || !['peana', 'asfalto', 'plataforma', 'plaza'].includes(o.name)) return;
      malla.geometry.computeBoundingBox();
      const techo = (malla.geometry.boundingBox!.max.y + o.position.y).toFixed(3);
      caras.set(techo, [...(caras.get(techo) ?? []), o.name]);
    });
    for (const nombresEnNivel of caras.values()) expect(new Set(nombresEnNivel).size).toBe(1);
  });
});
