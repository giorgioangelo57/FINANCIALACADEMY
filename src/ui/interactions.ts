import type { EstadoPractica } from '../app/practiceStore.ts';
import type { EstadoEstudio } from '../app/store.ts';
import { idPregunta, idTarjetaFrase } from '../domain/practice.ts';
import { dominioConcepto } from '../domain/mastery.ts';
import { actualizarEtiquetaDominio } from './components/conceptCard.ts';
import { pintarEsquema, pintarFlashcard, pintarOtraForma, pintarPregunta, pintarPreguntaConConfianza, pintarRecuerdo, tarjetasDe } from './components/conceptPanels.ts';
import { infografiasDe, montarInfografia } from './components/infographic.ts';
import { pintarRail } from './components/rail.ts';
import type { ContextoVista } from './views/context.ts';

/** Delegación de clics de las fichas: otra forma (cicla modos), trampa y compruébalo. */
export function conectarFichas(ctx: ContextoVista, estado: EstadoEstudio, practica?: EstadoPractica): void {
  const cierres = new WeakMap<HTMLElement, () => void>();
  ctx.pagina.addEventListener('click', (e) => {
    const destino = e.target as Element;
    // Controles internos de los paneles de flashcards y de preguntas de práctica.
    const interno = destino.closest<HTMLElement>('[data-fc], [data-pq]');
    if (interno) {
      const ficha = interno.closest<HTMLElement>('.cc');
      const concepto = estado.tema.conceptos.find((c) => c.id === ficha?.dataset.id);
      if (!ficha || !concepto) return;
      if (interno.dataset.fc) {
        const panel = ficha.querySelector<HTMLElement>('.pn.f')!;
        const tarjetas = tarjetasDe(concepto, estado.tema);
        let i = Number(ficha.dataset.fi || 0);
        let girada = ficha.dataset.fg === '1';
        if (interno.dataset.fc === 'girar') girada = !girada;
        else {
          i = Math.max(0, Math.min(tarjetas.length - 1, i + (interno.dataset.fc === 'siguiente' ? 1 : -1)));
          girada = false;
        }
        ficha.dataset.fi = String(i);
        ficha.dataset.fg = girada ? '1' : '0';
        pintarFlashcard(panel, tarjetas, i, girada);
        panel.querySelector<HTMLElement>(`[data-fc="${interno.dataset.fc}"]:not(:disabled)`)?.focus();
      } else {
        pintarPractica(ficha, concepto.id, Number(ficha.dataset.pi || 0) + 1);
      }
      return;
    }
    const boton = destino.closest<HTMLElement>('.ab');
    if (!boton) return;
    const ficha = boton.closest<HTMLElement>('.cc');
    const concepto = estado.tema.conceptos.find((c) => c.id === ficha?.dataset.id);
    const accion = boton.dataset.a;
    const panel = ficha?.querySelector<HTMLElement>(`.pn.${accion}`);
    if (!ficha || !concepto || !panel) return;

    if (accion === 'o') {
      const totalModos = estado.tema.modos.length;
      const abierto = boton.getAttribute('aria-expanded') === 'true';
      const actual = Number(ficha.dataset.mo || 0);
      const indice = abierto ? (actual + 1) % totalModos : actual;
      ficha.dataset.mo = String(indice);
      pintarOtraForma(panel, concepto, estado.tema.modos, indice);
      panel.hidden = false;
      boton.setAttribute('aria-expanded', 'true');
      boton.textContent = `🔄 Otra forma (${indice + 1}/${totalModos})`;
      return;
    }

    const abierto = !panel.hidden;
    panel.hidden = abierto;
    boton.setAttribute('aria-expanded', String(!abierto));
    if (accion === 'v') {
      // Se desmonta al cerrar (para el cronómetro de reproducción y el observador de tamaño).
      cierres.get(panel)?.();
      cierres.delete(panel);
      if (!abierto) {
        panel.innerHTML = '';
        const fin: (() => void)[] = [];
        for (const info of infografiasDe(estado.tema.ampliacion?.infografias, concepto.id)) {
          const caja = document.createElement('div');
          panel.append(caja);
          fin.push(montarInfografia(caja, info));
        }
        cierres.set(panel, () => fin.forEach((f) => f()));
      }
    }
    if (accion === 'w') {
      if (abierto) ficha.classList.remove('recordando');
      else pintarRecuerdo(panel, concepto, ficha, (sabia) => practica?.calificar(idTarjetaFrase(concepto.id), sabia));
    }
    if (!abierto && accion === 'e') pintarEsquema(panel, concepto, estado.tema);
    if (!abierto && accion === 'f') {
      ficha.dataset.fi = '0';
      ficha.dataset.fg = '0';
      pintarFlashcard(panel, tarjetasDe(concepto, estado.tema), 0, false);
    }
    if (!abierto && accion === 'p') pintarPractica(ficha, concepto.id, Number(ficha.dataset.pi || 0));
    if (accion === 'q' && !abierto) {
      pintarPregunta(panel, concepto, (indiceElegido) => {
        const { correcta } = estado.responder(concepto, indiceElegido);
        // Los fallos van al repaso (el dominio sigue sus propias reglas).
        practica?.responder(idPregunta(concepto.id), correcta);
        if (correcta) {
          actualizarEtiquetaDominio(ficha, dominioConcepto(estado.progreso, concepto.id));
          pintarRail(ctx.rail, estado, ficha.closest<HTMLElement>('[data-sec]')?.dataset.sec ?? null, practica);
        }
        return correcta;
      });
    }
  });

  /**
   * "Más preguntas": preguntas de práctica del concepto (de tus apuntes), una cada vez. No cambian
   * el dominio: el dominio sigue midiéndose con "Compruébalo".
   */
  function pintarPractica(ficha: HTMLElement, conceptoId: string, indice: number): void {
    const panel = ficha.querySelector<HTMLElement>('.pn.p');
    const lista = (estado.tema.ampliacion?.preguntas ?? []).filter((p) => p.conceptoId === conceptoId);
    if (!panel || !lista.length) return;
    const i = ((indice % lista.length) + lista.length) % lista.length;
    ficha.dataset.pi = String(i);
    const pregunta = lista[i]!;
    const pie = `<div class="pq-pie"><span>Práctica ${i + 1} / ${lista.length} · no cambia tu dominio</span>${lista.length > 1 ? '<button type="button" class="fc-btn" data-pq="siguiente">Otra pregunta →</button>' : ''}</div>`;
    pintarPreguntaConConfianza(
      panel,
      pregunta,
      (correcta, confianza) => practica?.responder(idPregunta(pregunta.conceptoId, pregunta.id), correcta, { conceptoId: pregunta.conceptoId, confianza }),
      pie,
    );
  }
}

let observador: IntersectionObserver | undefined;

/** Animación de aparición de los elementos `.rev` al entrar en pantalla. */
export function activarAparicion(): void {
  observador?.disconnect();
  observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (entrada.isIntersecting) {
          entrada.target.classList.add('in');
          observador?.unobserve(entrada.target);
        }
      }
    },
    { rootMargin: '0px 0px -6% 0px' },
  );
  document.querySelectorAll('.rev:not(.in)').forEach((el) => observador?.observe(el));
}

/**
 * Índice como capa: en móvil (botón de la barra superior) y en la portada inmersiva de escritorio
 * (botón flotante). Se cierra al pulsar fuera o en un enlace.
 */
export function conectarMenuMovil(botones: HTMLElement[], rail: HTMLElement): void {
  for (const boton of botones) {
    boton.onclick = (e) => {
      e.stopPropagation();
      document.body.classList.toggle('menu');
    };
  }
  document.addEventListener('click', (e) => {
    const destino = e.target as Element;
    if (document.body.classList.contains('menu') && (!rail.contains(destino) || destino.closest('a'))) {
      document.body.classList.remove('menu');
    }
  });
}
