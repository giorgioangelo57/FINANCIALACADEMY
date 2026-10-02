// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { iniciarApp } from '../../src/app/app.ts';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { CLAVE_VISTA } from '../../src/ui/world/worldController.ts';

const $ = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = (s: string) => [...document.querySelectorAll<HTMLElement>(s)];
const pulsar = (foco: string) => $(`.atlas [data-foco="${foco}"], .migas [data-foco="${foco}"]`).click();

function navegar(hash: string): void {
  location.hash = hash;
  dispatchEvent(new HashChangeEvent('hashchange'));
}

beforeAll(() => {
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.scrollTo = () => {};
  Element.prototype.scrollIntoView = () => {};
  localStorage.clear();
  localStorage.setItem('cdd-t1', JSON.stringify({ dom: { bancos: 1 }, tries: {} }));
  document.body.innerHTML = `<nav class="rail" id="rail"></nav><main><div class="topbar"><button id="mb">Índice</button><span id="mt"></span></div><div class="page" id="page"></div></main>`;
  location.hash = '';
  iniciarApp(tema01);
});

describe('mundo de la portada sin WebGL', () => {
  it('muestra el Atlas y mantiene la ciudad 2D como alternativa', () => {
    expect($('[data-mundo-aviso]').textContent).toContain('3D no está disponible');
    expect($('[data-mundo-vista]').hidden).toBe(true);
    expect($('.skyline').hidden).toBe(false);
    expect($$('.skyline a')).toHaveLength(12);
    expect($$('.atlas-item')).toHaveLength(tema01.grupos.length);
    expect($('[data-mundo-modo]')).toBeNull();
    // Sin 3D no hay pantalla completa, zoom ni paseo.
    expect($('[data-mundo-completa]')).toBeNull();
    expect($('[data-mundo-zoom]')).toBeNull();
    expect($('[data-mundo-paseo]')).toBeNull();
  });

  it('zoom conceptual: ciudad → barrio → zona → edificio', () => {
    pulsar('barrio:4');
    expect($$('.atlas-item').map((b) => b.dataset.foco)).toEqual(['zona:4.1', 'zona:4.2A', 'zona:4.2B']);
    pulsar('zona:4.2A');
    expect($$('.atlas-item')).toHaveLength(8);
    expect($('.atlas-ir').getAttribute('href')).toBe('#s/4.2A');
    expect($('.atlas-item[data-foco="edificio:bancos"]').textContent).toContain('Construido');
    pulsar('edificio:bancos');
    expect($('.migas [aria-current]').textContent).toBe('Bancos privados');
    expect($('.atlas-ir').getAttribute('href')).toBe('#c/bancos');
  });

  it('subir de nivel y migas', () => {
    $('[data-mundo-subir]').click();
    expect($('.migas [aria-current]').textContent).toBe('4.2A Intermediarios bancarios');
    pulsar('ciudad');
    expect($('[data-mundo-subir]')).toBeNull();
  });

  it('la historia visual recorre sus pasos hasta la pregunta', () => {
    pulsar('barrio:2');
    pulsar('zona:2');
    pulsar('edificio:indirecta');
    expect($$('.h-ent').map((e) => e.textContent)).toEqual(['Ahorrador', '🏦', 'Empresa']);
    $<HTMLButtonElement>('[data-historia="1"]').click();
    expect($('.h-paso').textContent).toContain('Ahorrador → 🏦 (depósito)');
    $<HTMLButtonElement>('[data-historia="1"]').click();
    $<HTMLButtonElement>('[data-historia="1"]').click();
    expect($('.h-paso a').getAttribute('href')).toBe('#c/indirecta');
    expect($<HTMLButtonElement>('[data-historia="1"]').disabled).toBe(true);
  });

  it('interfaz editorial: leyenda en cuatro claves y recomendación sin pines', () => {
    expect($$('.mundo-leyenda dt').map((d) => d.textContent)).toEqual(['Superficie', 'Edificio', 'Columna de luz', 'Tráfico']);
    expect($('.mundo').textContent).not.toContain('📌');
    pulsar('ciudad');
    expect($('.atlas-ir').textContent).toContain('Siguiente recomendación');
    // La ficha vive en el visor 3D: sin WebGL no se muestra.
    expect($('[data-mundo-ficha]').hidden).toBe(true);
  });

  it('al volver del estudio, el mapa se abre donde se estaba', () => {
    navegar('#c/mur');
    navegar('#inicio');
    expect($('.migas [aria-current]').textContent).toBe(tema01.conceptos.find((c) => c.id === 'mur')!.nombre);
    expect(localStorage.getItem(CLAVE_VISTA)).toBeNull();
  });
});
