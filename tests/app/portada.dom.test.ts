// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from 'vitest';
import { iniciarApp } from '../../src/app/app.ts';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';

beforeAll(() => {
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver;
  window.scrollTo = () => {};
  localStorage.clear();
  document.body.innerHTML = `<nav class="rail" id="rail"></nav><main><div class="topbar"><button id="mb">Índice</button><span id="mt"></span></div><div class="page" id="page"></div></main>`;
  location.hash = '';
  iniciarApp(tema01);
});

describe('portada sin WebGL', () => {
  it('no activa la portada inmersiva: el bloque del tema sigue primero y la barra lateral visible', () => {
    const pagina = document.getElementById('page')!;
    expect(pagina.firstElementChild?.classList.contains('hero')).toBe(true);
    expect(document.querySelector('.mundo.portada')).toBeNull();
    expect(document.body.classList.contains('portada-inmersiva')).toBe(false);
  });

  it('el bloque del tema aparece con animación al hacer scroll', () => {
    expect(document.querySelector('.hero')!.classList.contains('rev')).toBe(true);
  });

  it('la pista de la portada existe pero solo se muestra en modo portada', () => {
    expect(document.querySelector('.portada-pista')!.textContent).toContain('Pulsa la ciudad para explorarla');
  });
});
