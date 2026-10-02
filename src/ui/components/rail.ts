import type { EstadoEstudio } from '../../app/store.ts';
import type { EstadoPractica } from '../../app/practiceStore.ts';
import { hrefExamen, hrefInicio, hrefProgreso, hrefRepaso, hrefSeccion, hrefSesion, hrefSimulacro, hrefVisual } from '../../app/router.ts';
import { dominioGlobal, dominioSeccion } from '../../domain/mastery.ts';
import { colorDominio } from '../format.ts';
import { MARCA } from './brandTitle.ts';
import { anilloDominio } from './ring.ts';

/** Índice lateral: dominio global, una barra de dominio por sección y, al final, el grupo Examen. */
export function pintarRail(rail: HTMLElement, estado: EstadoEstudio, seccionActual: string | null, practica?: EstadoPractica): void {
  const { tema, progreso } = estado;
  const cabecera = `<a class="brand" href="${hrefInicio()}">${anilloDominio(dominioGlobal(tema, progreso))}<span><small class="brand-ante">${MARCA.asignatura}</small><b>${MARCA.ciudad}</b><small>Tema ${tema.meta.numero} · dominio global</small></span></a>`;
  const grupos = tema.grupos
    .map((g) => {
      const secciones = tema.secciones
        .filter((s) => s.grupoId === g.id)
        .map((s) => {
          const d = dominioSeccion(tema, progreso, s.id);
          return `<a class="sl${s.id === seccionActual ? ' on' : ''}" href="${hrefSeccion(s.id)}"><div class="top"><span class="id">${s.id}</span><span>${s.titulo}</span><span class="pw">${s.pesoExamen} %</span></div><div class="bar"><i style="width:${d * 100}%;background:${colorDominio(d)}"></i></div></a>`;
        })
        .join('');
      return `<div class="grp">${g.titulo}</div>${secciones}`;
    })
    .join('');
  const enlace = (id: string, href: string, icono: string, titulo: string, sub: string, insignia = '') =>
    `<a class="sl exn${seccionActual === id ? ' on' : ''}" href="${href}"><div class="top"><span class="id">${icono}</span><span>${titulo}</span>${insignia}</div><small class="ex-sub">${sub}</small></a>`;
  const n = practica?.pendientes() ?? 0;
  const insignia = n ? `<span class="pw insignia" aria-label="${n} pendientes">${n}</span>` : '';
  const examen = tema.ampliacion?.bloques.length
    ? `<div class="grp">Estudio y examen</div>${enlace('sesion', hrefSesion(), '🎯', 'Estudiar hoy', 'Sesión mezclada y espaciada')}${enlace('examen', hrefExamen(), '📊', 'Predicción de examen', 'Qué es más probable que caiga')}${tema.ampliacion?.infografias?.length ? enlace('visual', hrefVisual(), '🎬', 'Infografías', 'Lo difícil, paso a paso') : ''}${enlace('simulacro', hrefSimulacro(), '📝', 'Simulacro', 'Examen tipo test con nota')}${enlace('repaso', hrefRepaso(), '🔁', 'Repaso', 'Tus fallos y flashcards de hoy', insignia)}${enlace('progreso', hrefProgreso(), '📈', 'Mi progreso', 'Racha, calibración y evolución')}`
    : '';
  const scroll = rail.scrollTop;
  rail.innerHTML = cabecera + grupos + examen;
  rail.scrollTop = scroll;
  // El apartado activo siempre a la vista dentro del índice (p. ej. el grupo Examen, al final).
  const activo = rail.querySelector<HTMLElement>('.sl.on');
  if (activo && (activo.offsetTop < rail.scrollTop || activo.offsetTop + activo.offsetHeight > rail.scrollTop + rail.clientHeight)) {
    rail.scrollTop = Math.max(0, activo.offsetTop - rail.clientHeight / 3);
  }
}
