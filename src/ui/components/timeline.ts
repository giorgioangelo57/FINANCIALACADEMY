import { hrefSeccion } from '../../app/router.ts';
import type { Tema } from '../../content/schema.ts';
import { dominioSeccion } from '../../domain/mastery.ts';
import type { Progreso } from '../../domain/progress.ts';
import { seccionesPrioritarias } from '../../domain/priority.ts';
import { colorBloque } from '../blockColors.ts';
import { colorDominio, porcentaje } from '../format.ts';

/*
 * Línea de tiempo del tema: sus apartados (los barrios del mapa) en orden, cada uno con su color,
 * y dentro sus subpuntos como paradas. El ancho de cada apartado es lo que pesa en el examen; cada
 * parada se rellena con el color de tu dominio y la siguiente recomendada late. Todo es pulsable.
 * No añade datos: ordena los que ya están (secciones, pesos de DATA y tu progreso).
 */

export function lineaTemporal(tema: Tema, progreso: Progreso): string {
  const siguiente = seccionesPrioritarias(tema, progreso, 1)[0]?.id;
  const apartados = tema.grupos.map((g, gi) => {
    const secciones = tema.secciones.filter((s) => s.grupoId === g.id);
    const peso = secciones.reduce((s, x) => s + x.pesoExamen, 0);
    const [numero, ...resto] = g.titulo.split(' · ');
    const nombre = resto.join(' · ') || g.titulo;
    const paradas = secciones
      .map((s) => {
        const d = dominioSeccion(tema, progreso, s.id);
        const estado = d > 0 ? `dominio ${porcentaje(d)}` : 'sin estudiar';
        return `<li><a class="tl-parada${s.id === siguiente ? ' siguiente' : ''}" href="${hrefSeccion(s.id)}" style="--dom:${d > 0 ? colorDominio(d) : 'transparent'}" aria-label="${s.id} ${s.titulo}: peso ${s.pesoExamen} %, ${estado}${s.id === siguiente ? ', siguiente recomendación' : ''}"><i class="tl-punto"></i><b>${s.id}</b><span class="tl-nombre">${s.titulo}</span><small>${s.pesoExamen} % · ${estado}</small></a></li>`;
      })
      .join('');
    return `<li class="tl-apartado" style="--c:${colorBloque(gi)}"><div class="tl-cab"><span class="tl-num">${numero}</span><span class="tl-tit">${nombre}</span><span class="tl-peso">${peso} % del examen</span></div><ol class="tl-paradas">${paradas}</ol></li>`;
  });
  // Barra del tema: un tramo por subpunto, ancho = peso en el examen, relleno = tu dominio.
  const tramos = tema.secciones
    .map((s) => {
      const gi = tema.grupos.findIndex((g) => g.id === s.grupoId);
      const d = dominioSeccion(tema, progreso, s.id);
      return `<a class="tl-tramo${s.id === siguiente ? ' siguiente' : ''}" href="${hrefSeccion(s.id)}" style="--c:${colorBloque(gi)};flex-grow:${s.pesoExamen}" title="${s.id} ${s.titulo} · ${s.pesoExamen} % del examen · dominio ${porcentaje(d)}" aria-label="${s.id} ${s.titulo}"><i style="width:${Math.round(d * 100)}%"></i><span>${s.pesoExamen >= 8 ? s.id : ''}</span></a>`;
    })
    .join('');
  return `<section class="tl rev" aria-labelledby="tl-t"><div class="tl-encabezado"><h2 class="h2" id="tl-t">El tema, de principio a fin</h2><p>Los ${tema.grupos.length} apartados en orden, cada uno con su color. En la barra, el ancho de cada subpunto es lo que pesa en el examen y el relleno, tu dominio.</p></div><div class="tl-barra" role="group" aria-label="Peso en el examen y dominio de cada subpunto">${tramos}</div><ol class="tl-pista">${apartados.join('')}</ol></section>`;
}
