// @vitest-environment happy-dom
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { iniciarApp } from '../../src/app/app.ts';
import { tema01 } from '../../src/content/temas/tema-01/index.ts';
import { CLAVE_PROGRESO } from '../../src/persistence/progressRepository.ts';

const LEGACY = JSON.stringify({ dom: { fgd: 1 }, tries: {} });
const $ = <T extends Element = HTMLElement>(s: string, raiz: ParentNode = document) => raiz.querySelector<T>(s)!;
const $$ = (s: string, raiz: ParentNode = document) => [...raiz.querySelectorAll<HTMLElement>(s)];

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
  localStorage.setItem('cdd-t1', LEGACY);
  document.body.innerHTML = `<nav class="rail" id="rail"></nav><main><div class="topbar"><button id="mb">Índice</button><span id="mt">La Ciudad del Dinero</span></div><div class="page" id="page"></div></main>`;
  location.hash = '';
  iniciarApp(tema01);
});

describe('app en el navegador', () => {
  it('pinta la portada con el progreso migrado de cdd-t1', () => {
    expect($$('.tile')).toHaveLength(12);
    expect($$('.skyline a')).toHaveLength(12);
    expect($$('.ya a')).toHaveLength(3);
    // 4.2A tiene 8 conceptos y fgd está dominado: 1/8 → 13 %.
    const tile = $$('.tile').find((t) => t.getAttribute('href') === '#s/4.2A')!;
    expect(tile.textContent).toContain('dominio 13 %');
    expect($('#mt').textContent).toBe('Gestión financiera · La ciudad del dinero');
    expect($('.hero h1').getAttribute('aria-label')).toBe('Gestión financiera: La ciudad del dinero');
  });

  it('abre una sección por hash y marca el índice', () => {
    navegar('#s/4.2A');
    expect($$('.cc')).toHaveLength(8);
    expect($('#mt').textContent).toBe('4.2A · Intermediarios bancarios');
    expect($('.sl.on').getAttribute('href')).toBe('#s/4.2A');
    expect($('.pager a:last-child').getAttribute('href')).toBe('#s/4.2B');
  });

  it('"Explícamelo de otra forma" recorre los 5 modos y el tercero es esquema', () => {
    const ficha = $('#c-fgd');
    const boton = $<HTMLButtonElement>('.ab.o', ficha);
    const panel = $('.pn.o', ficha);
    boton.click();
    expect(panel.hidden).toBe(false);
    expect(boton.textContent).toBe('🔄 Otra forma (1/5)');
    expect($('.md b', panel).textContent).toBe(tema01.modos[0]!.etiqueta);
    boton.click();
    boton.click();
    expect(boton.textContent).toBe('🔄 Otra forma (3/5)');
    expect($('.esq', panel).textContent).toBe(tema01.conceptos.find((c) => c.id === 'fgd')!.explicaciones[2]);
    boton.click();
    boton.click();
    boton.click();
    expect(boton.textContent).toBe('🔄 Otra forma (1/5)');
  });

  it('"Trampa de examen" se abre y se cierra', () => {
    const ficha = $('#c-fgd');
    const boton = $<HTMLButtonElement>('.ab.t', ficha);
    boton.click();
    expect($('.pn.t', ficha).hidden).toBe(false);
    expect(boton.getAttribute('aria-expanded')).toBe('true');
    boton.click();
    expect($('.pn.t', ficha).hidden).toBe(true);
  });

  it('"Compruébalo": fallar y luego acertar da 50 % y se guarda en el nuevo formato', () => {
    const ficha = $('#c-cajas');
    $<HTMLButtonElement>('.ab.q', ficha).click();
    const opciones = $$('.opt', ficha) as HTMLButtonElement[];
    const correcta = tema01.conceptos.find((c) => c.id === 'cajas')!.pregunta.indiceCorrecta;
    const mala = opciones.find((_, i) => i !== correcta)!;
    mala.click();
    expect(mala.classList.contains('no')).toBe(true);
    expect(JSON.parse(localStorage.getItem(CLAVE_PROGRESO) ?? 'null')).toBeNull();

    opciones[correcta]!.click();
    expect(opciones[correcta]!.classList.contains('ok')).toBe(true);
    expect(opciones.every((o) => o.disabled)).toBe(true);
    expect($('.dm', ficha).textContent).toBe('Dominio 50 %');

    const guardado = JSON.parse(localStorage.getItem(CLAVE_PROGRESO)!);
    expect(guardado.temas['1'].dominio).toEqual({ fgd: 1, cajas: 0.5 });
    expect(localStorage.getItem('cdd-t1')).toBe(LEGACY);
    // El índice lateral se repinta con el nuevo dominio de la sección (1,5/8 → barra al 18,75 %).
    expect($('.sl.on .bar i').getAttribute('style')).toContain('width:18.75%');
  });

  it('Esquema: la cadena de DATA y el árbol desplegable de los apuntes', () => {
    navegar('#s/4.2A');
    const ficha = $('#c-ico');
    $<HTMLButtonElement>('.ab.e', ficha).click();
    const panel = $('.pn.e', ficha);
    expect(panel.hidden).toBe(false);
    expect($('.esq-arbol h5', panel).textContent).toContain('Las dos vías del ICO');
    expect($$('details', panel).length).toBeGreaterThan(0);
    expect($$('.flujo .f-nodo', panel).length).toBeGreaterThan(1);
    $<HTMLButtonElement>('[data-arbol="cerrar"]', panel).click();
    expect($$('details', panel).every((d) => !(d as HTMLDetailsElement).open)).toBe(true);
    $<HTMLButtonElement>('[data-arbol="abrir"]', panel).click();
    expect($$('details', panel).every((d) => (d as HTMLDetailsElement).open)).toBe(true);
  });

  it('Flashcards: se gira y se pasa a la siguiente', () => {
    const ficha = $('#c-fgd');
    $<HTMLButtonElement>('.ab.f', ficha).click();
    const panel = $('.pn.f', ficha);
    expect($('.fc-anverso', panel).textContent).toContain('Fondo de Garantía');
    $<HTMLButtonElement>('[data-fc="girar"]', panel).click();
    expect($('.fc', panel).classList.contains('girada')).toBe(true);
    $<HTMLButtonElement>('[data-fc="siguiente"]', panel).click();
    expect($('.fc-n', panel).textContent).toBe('2 / 2');
    expect($('.fc', panel).classList.contains('girada')).toBe(false);
  });

  it('Más preguntas: práctica que no cambia el dominio', () => {
    const ficha = $('#c-ico');
    const antes = localStorage.getItem(CLAVE_PROGRESO);
    $<HTMLButtonElement>('.ab.p', ficha).click();
    const panel = $('.pn.p', ficha);
    const pregunta = tema01.ampliacion!.preguntas.filter((p) => p.conceptoId === 'ico')[0]!;
    expect($('p b', panel).textContent).toBe(pregunta.enunciado);
    ($$('.opt', panel) as HTMLButtonElement[])[pregunta.indiceCorrecta]!.click();
    // Antes de corregir se pide la confianza.
    expect($('.fb', panel).textContent).toBe('');
    expect($('.conf', panel).hidden).toBe(false);
    $<HTMLButtonElement>('[data-conf="dudo"]', panel).click();
    expect($('.fb', panel).textContent).toContain('Correcto, pero sin seguridad');
    expect(localStorage.getItem(CLAVE_PROGRESO)).toBe(antes);
    // Un acierto dudoso entra al repaso.
    const practica = JSON.parse(localStorage.getItem('financial-academy:practica')!).temas['1'];
    expect(practica.fallos[pregunta.id]).toMatchObject({ dudosa: true });
    expect(practica.calibracion.dudo).toEqual({ aciertos: 1, total: 1 });
    $<HTMLButtonElement>('[data-pq="siguiente"]', panel).click();
    expect($('.pq-pie span', panel).textContent).toContain('Práctica 2 / 3');
  });

  it('Escríbelo tú: oculta la definición, compara con las ideas clave y anota la tarjeta', () => {
    navegar('#s/4.2A');
    const ficha = $('#c-fgd');
    $<HTMLButtonElement>('.ab.w', ficha).click();
    expect(ficha.classList.contains('recordando')).toBe(true);
    const panel = $('.pn.w', ficha);
    $<HTMLTextAreaElement>('.rec-texto', panel).value = 'Garantiza los depósitos hasta 100.000 euros por titular';
    $<HTMLButtonElement>('[data-rec="comparar"]', panel).click();
    expect(ficha.classList.contains('recordando')).toBe(false);
    expect($$('.rec-ideas li', panel).length).toBeGreaterThan(0);
    $<HTMLButtonElement>('[data-rec="si"]', panel).click();
    const practica = JSON.parse(localStorage.getItem('financial-academy:practica')!).temas['1'];
    expect(practica.tarjetas['frase:fgd'].caja).toBe(1);
  });

  it('Pretest: preguntas rápidas antes de las fichas, sin afectar al dominio', () => {
    navegar('#s/4.2A');
    const antes = localStorage.getItem(CLAVE_PROGRESO);
    const pre = $('[data-pretest]');
    expect($('.pre-panel', pre).hidden).toBe(true);
    $<HTMLButtonElement>('[data-pre="empezar"]', pre).click();
    for (let i = 0; i < 3; i++) {
      $<HTMLButtonElement>('.opt[data-k="0"]', pre).click();
      expect($$('.opt.ok', pre)).toHaveLength(1);
      $<HTMLButtonElement>('[data-pre="sig"]', pre).click();
    }
    expect($('.pre-fin', pre).textContent).toMatch(/de 3/);
    expect(localStorage.getItem(CLAVE_PROGRESO)).toBe(antes);
  });

  it('Visualízalo: infografía paso a paso del ICO en su ficha', () => {
    navegar('#s/4.2A');
    expect($('#c-bancos .ab.v')).toBeNull(); // solo los conceptos con infografía
    const ficha = $('#c-ico');
    $<HTMLButtonElement>('.ab.v', ficha).click();
    const panel = $('.pn.v', ficha);
    expect(panel.hidden).toBe(false);
    expect($('.ig-titulo', panel).textContent).toContain('ICO');
    expect($('.ig-texto', panel).textContent).toMatch(/^Paso 1 de 5/);
    expect($$('.ig-actor.activo', panel).map((a) => a.dataset.actor)).toEqual(['estado', 'mercados', 'ico']);
    $<HTMLButtonElement>('[data-ig="siguiente"]', panel).click();
    expect($('.ig-texto', panel).textContent).toMatch(/^Paso 2 de 5.*mediación/);
    $<HTMLButtonElement>('[data-ig-paso="4"]', panel).click();
    expect($<HTMLButtonElement>('[data-ig="siguiente"]', panel).disabled).toBe(true);
  });

  it('#visual: galería con todas las infografías', () => {
    navegar('#visual');
    expect($('#mt').textContent).toBe('Infografías');
    expect($$('.ig')).toHaveLength(tema01.ampliacion!.infografias!.length);
    expect($('.sl.on').getAttribute('href')).toBe('#visual');
  });

  it('#c/<id> abre la sección del concepto y lo muestra', () => {
    navegar('#c/bce');
    expect($('[data-sec]').dataset.sec).toBe('4.1');
    expect($('#c-bce').classList.contains('in')).toBe(true);
  });

  it('#examen: predicción con los 5 bloques ordenados, gráficos, tabla y simulacro', () => {
    navegar('#examen');
    expect($('#mt').textContent).toBe('Predicción de examen');
    expect($('.sl.on').getAttribute('href')).toBe('#examen');
    // La predicción va al final del índice.
    expect($$('#rail a').slice(-6).map((a) => a.getAttribute('href'))).toEqual(['#sesion', '#examen', '#visual', '#simulacro', '#repaso', '#progreso']);
    expect($$('.ex-bloque .ex-pct').map((e) => e.textContent)).toEqual(['30 %', '25 %', '20 %', '15 %', '10 %']);
    // Cada concepto del tema aparece una vez en el mapa.
    expect($$('.ex-chip')).toHaveLength(tema01.conceptos.length);
    expect($$('.ex-barra.prob')).toHaveLength(5);
    expect($$('.ex-tabla tbody tr')).toHaveLength(5);

    const antes = localStorage.getItem(CLAVE_PROGRESO);
    const ficha = $('#ex-activos');
    $<HTMLButtonElement>('[data-sim="abrir"]', ficha).click();
    const panel = $('.pn.p', ficha);
    expect(panel.hidden).toBe(false);
    // Primero la pregunta oficial de "instrumento".
    const correcta = tema01.conceptos.find((c) => c.id === 'instrumento')!.pregunta.indiceCorrecta;
    $<HTMLButtonElement>(`.opt[data-k="${correcta}"]`, panel).click();
    $<HTMLButtonElement>('[data-conf="seguro"]', panel).click();
    expect($('.fb', panel).textContent).toContain('Correcto');
    expect($('.ex-marcador', panel).textContent).toBe('Aciertos 1 / 1');
    expect(localStorage.getItem(CLAVE_PROGRESO)).toBe(antes);
    $<HTMLButtonElement>('[data-sim="siguiente"]', panel).click();
    expect($('.pq-pie', panel).textContent).toContain('Simulacro 2 /');
  });

  it('Simulacro: 10 preguntas sin corrección inmediata, nota final y fallos al repaso', () => {
    vi.useFakeTimers();
    try {
      navegar('#simulacro');
      expect($('#mt').textContent).toBe('Simulacro');
      $<HTMLInputElement>('input[name="sim-n"][value="10"]').click();
      $<HTMLButtonElement>('[data-sim-empezar]').click();
      for (let i = 0; i < 10; i++) {
        expect($('.sim-n b').textContent).toBe(String(i + 1));
        // Siempre la primera opción: algunas acertarán y otras no.
        $<HTMLButtonElement>('.opt[data-k="0"]').click();
        $<HTMLButtonElement>(i % 2 ? '[data-conf="seguro"]' : '[data-conf="adivino"]').click();
        expect($$('.opt.ok, .opt.no')).toHaveLength(0);
        vi.advanceTimersByTime(300);
      }
      const nota = $('[data-sim-nota]').textContent!;
      expect(Number(nota.replace(',', '.'))).toBeGreaterThanOrEqual(0);
      expect($$('.sim-correccion li')).toHaveLength(10);
      // Calibración: aciertos según la seguridad declarada.
      expect($('.sim-cal')).toBeTruthy();
      expect($$('.sim-cal .ex-fila')).toHaveLength(2);
      const guardado = JSON.parse(localStorage.getItem('financial-academy:practica')!);
      expect(guardado.temas['1'].simulacros).toHaveLength(1);
      expect(guardado.temas['1'].simulacros[0].total).toBe(10);
    } finally {
      vi.useRealTimers();
    }
  });

  it('Repaso: los fallos aparecen y una flashcard que te sabes sale de las de hoy', () => {
    navegar('#repaso');
    expect(Number($('.rep-tab[data-tab="fallos"] b').textContent)).toBeGreaterThan(0);
    expect($('[data-rep-panel] .pq-pie').textContent).toContain('Fallada');
    // El índice muestra la insignia de pendientes.
    expect(Number($('#rail .insignia').textContent)).toBeGreaterThan(0);
    $<HTMLButtonElement>('.rep-tab[data-tab="tarjetas"]').click();
    const antes = Number($('.rep-tab[data-tab="tarjetas"] b').textContent);
    expect(antes).toBeGreaterThan(0);
    expect($('.rep-calif').hidden).toBe(true);
    $<HTMLButtonElement>('[data-rep-girar]').click();
    $<HTMLButtonElement>('[data-rep-sabia="1"]').click();
    $<HTMLButtonElement>('.rep-tab[data-tab="tarjetas"]').click();
    expect(Number($('.rep-tab[data-tab="tarjetas"] b').textContent)).toBe(antes - 1);
  });

  it('Estudiar hoy: sesión mezclada con confianza, tarjetas y resumen final', () => {
    navegar('#sesion');
    expect($('#mt').textContent).toBe('Estudiar hoy');
    expect($('.sl.on').getAttribute('href')).toBe('#sesion');
    // Fecha de examen: se guarda en la práctica.
    const fecha = $<HTMLInputElement>('[data-ses-fecha]');
    fecha.value = '2026-12-01';
    fecha.dispatchEvent(new Event('change'));
    expect(JSON.parse(localStorage.getItem('financial-academy:practica')!).temas['1'].fechaExamen).toBe('2026-12-01');
    expect($('.ses-examen').textContent).toMatch(/Faltan \d+ días/);
    $<HTMLInputElement>('input[name="ses-n"][value="10"]').click();
    $<HTMLInputElement>('input[name="ses-n"][value="10"]').dispatchEvent(new Event('change'));
    $<HTMLButtonElement>('[data-ses-empezar]').click();
    for (let i = 0; i < 10; i++) {
      const panel = $('[data-ses-panel]');
      if ($('[data-ses-girar]', panel)) {
        $<HTMLButtonElement>('[data-ses-girar]', panel).click();
        $<HTMLButtonElement>('[data-sabia="1"]', panel).click();
      } else {
        $<HTMLButtonElement>('.opt[data-k="0"]', panel).click();
        $<HTMLButtonElement>('[data-conf="seguro"]', panel).click();
        $<HTMLButtonElement>('[data-ses-sig]', panel).click();
      }
    }
    expect($('.ses-fin h2').textContent).toMatch(/de 10 bien/);
  });

  it('Mi progreso: racha, memoria, calibración, bloques y simulacros', () => {
    navegar('#progreso');
    expect($('#mt').textContent).toBe('Mi progreso');
    expect($$('.prog-tile').length).toBeGreaterThanOrEqual(4);
    expect($('.prog-tile b').textContent).toBe('1');
    expect($$('.prog-dia').length).toBeGreaterThanOrEqual(28);
    expect($$('.prog-memoria i').length).toBeGreaterThan(1);
    expect($$('.prog-sim').length).toBeGreaterThan(0);
  });

  it('un id desconocido vuelve a la portada', () => {
    navegar('#s/zzz');
    expect($$('.tile')).toHaveLength(12);
    expect($$('.sl.on')).toHaveLength(0);
  });
});
