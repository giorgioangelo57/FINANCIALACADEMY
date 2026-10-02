import type { Tema } from '../content/schema.ts';
import { validarTema } from '../content/validate.ts';
import { almacenNavegador } from '../persistence/storage.ts';
import { pintarRail } from '../ui/components/rail.ts';
import { activarAparicion, conectarFichas, conectarMenuMovil } from '../ui/interactions.ts';
import type { ContextoVista } from '../ui/views/context.ts';
import { pintarExamen } from '../ui/views/examView.ts';
import { pintarProgreso } from '../ui/views/progresoView.ts';
import { pintarRepaso } from '../ui/views/repasoView.ts';
import { pintarSesion } from '../ui/views/sesionView.ts';
import { detenerVisual, pintarVisual } from '../ui/views/visualView.ts';
import { detenerSimulacro, pintarSimulacro } from '../ui/views/simulacroView.ts';
import { pintarInicio } from '../ui/views/homeView.ts';
import { pintarSeccion } from '../ui/views/sectionView.ts';
import { ControladorMundo } from '../ui/world/worldController.ts';
import { resolverRuta } from './router.ts';
import { EstadoPractica } from './practiceStore.ts';
import { EstadoEstudio } from './store.ts';

function elemento(selector: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Falta ${selector} en index.html`);
  return el;
}

export function iniciarApp(tema: Tema): void {
  if (import.meta.env.DEV) {
    const errores = validarTema(tema);
    if (errores.length) console.error('Contenido del tema con errores:', errores);
  }

  const ctx: ContextoVista = { pagina: elemento('#page'), rail: elemento('#rail'), tituloMovil: elemento('#mt') };
  const almacen = almacenNavegador();
  const estado = new EstadoEstudio(tema, almacen);
  const practica = new EstadoPractica(tema, almacen);
  const mundo = new ControladorMundo(estado, almacen, practica);

  let seccionActual: string | null = null;

  function pintar(): void {
    document.body.classList.remove('menu');
    const ruta = resolverRuta(location.hash, tema);
    seccionActual = null;
    detenerSimulacro();
    detenerVisual();
    if (ruta.vista !== 'inicio' && ruta.vista !== 'seccion') {
      seccionActual = ruta.vista;
      mundo.desmontar();
      if (ruta.vista === 'examen') pintarExamen(ctx, estado, practica);
      else if (ruta.vista === 'simulacro') pintarSimulacro(ctx, estado, practica);
      else if (ruta.vista === 'sesion') pintarSesion(ctx, estado, practica);
      else if (ruta.vista === 'progreso') pintarProgreso(ctx, estado, practica);
      else if (ruta.vista === 'visual') pintarVisual(ctx, estado);
      else pintarRepaso(ctx, estado, practica, undefined, 'conceptoId' in ruta ? ruta.conceptoId : undefined);
    } else if (ruta.vista === 'seccion') {
      seccionActual = ruta.seccionId;
      mundo.desmontar();
      // Al volver a la portada, el mapa se abre donde se estaba estudiando.
      mundo.recordar(ruta.conceptoFoco ? { nivel: 'edificio', conceptoId: ruta.conceptoFoco } : { nivel: 'zona', seccionId: ruta.seccionId });
      pintarSeccion(ctx, estado, ruta.seccionId, ruta.conceptoFoco);
    } else {
      pintarInicio(ctx, estado);
      const raizMundo = ctx.pagina.querySelector<HTMLElement>('[data-mundo]');
      if (raizMundo) mundo.montar(raizMundo);
    }
    pintarRail(ctx.rail, estado, seccionActual, practica);
    if (ruta.scrollArriba) window.scrollTo(0, 0);
    activarAparicion();
  }

  conectarFichas(ctx, estado, practica);
  // La insignia de pendientes del índice sigue a la práctica.
  practica.escuchar(() => pintarRail(ctx.rail, estado, seccionActual, practica));
  const flotante = document.querySelector<HTMLElement>('#ib');
  conectarMenuMovil(flotante ? [elemento('#mb'), flotante] : [elemento('#mb')], ctx.rail);
  addEventListener('hashchange', pintar);
  pintar();
}
