import { hrefConcepto, hrefRepaso, hrefSeccion } from '../../app/router.ts';
import { type PendienteConcepto, resumenPendiente } from '../../domain/pendientes.ts';
import type { ModeloCiudad } from '../../world/cityModel.ts';
import { buscarBarrio, buscarEdificio, buscarZona, type Foco } from '../../world/focus.ts';
import { colorDominio } from '../format.ts';
import { separarTitulo, TEXTO_FASE } from './worldPanel.ts';

/*
 * Ficha contextual: la información aparece porque el usuario la pide (pasa por encima o
 * selecciona). Vive fuera del mundo, en una esquina del visor; la ciudad queda limpia.
 * Orden de lectura: qué es → cuánto pesa → qué sé → dónde entrar.
 */

export type ModoFicha = 'vistazo' | 'seleccion';

function cifra(valor: string, unidad: string): string {
  return `<div class="ficha-cifra"><b>${valor}</b><span>${unidad}</span></div>`;
}

function dominio(valor: number, texto: string): string {
  return `<div class="ficha-cifra"><b>${Math.round(valor * 100)}<small>%</small></b><span><i class="ficha-muestra" style="background:${valor > 0 ? colorDominio(valor) : 'transparent'}"></i>${texto}</span></div>`;
}

export function fichaContextual(m: ModeloCiudad, foco: Foco, modo: ModoFicha): string {
  const pista = '<p class="ficha-pista">Pulsa para acercarte</p>';
  switch (foco.nivel) {
    case 'barrio': {
      const b = buscarBarrio(m, foco.grupoId);
      if (!b) return '';
      const [numero, nombre] = separarTitulo(b.titulo);
      const zonas = m.zonas.filter((z) => z.grupoId === b.grupoId);
      const total = zonas.reduce((s, z) => s + z.conceptoIds.length, 0);
      return `<p class="ficha-antetitulo">Barrio ${numero}</p><h3 class="ficha-titulo">${nombre}</h3>
 <div class="ficha-datos">${cifra(String(b.pesoExamen), '% del examen')}${cifra(String(total), 'conceptos')}${dominio(b.dominio, 'dominio')}</div>${modo === 'vistazo' ? pista : ''}`;
    }
    case 'zona': {
      const z = buscarZona(m, foco.seccionId);
      if (!z) return '';
      const antetitulo = z.prioridad === 1
        ? 'Siguiente recomendación de estudio'
        : z.prioridad
          ? `Recomendación de estudio · ${z.prioridad}`
          : `Zona ${z.seccionId}`;
      const accion = modo === 'seleccion'
        ? `<a class="ficha-accion" href="${hrefSeccion(z.seccionId)}">Estudiar la sección ${z.seccionId}</a>`
        : pista;
      return `<p class="ficha-antetitulo${z.prioridad ? ' llamada' : ''}">${antetitulo}</p><h3 class="ficha-titulo">${z.titulo}</h3>
 <div class="ficha-datos">${cifra(String(z.pesoExamen), '% del examen')}${cifra(String(z.conceptoIds.length), z.conceptoIds.length === 1 ? 'concepto' : 'conceptos')}${dominio(z.dominio, `dominio · ${z.estudiados} estudiados`)}</div>${accion}`;
    }
    case 'edificio': {
      const e = buscarEdificio(m, foco.conceptoId);
      if (!e) return '';
      const z = buscarZona(m, e.seccionId);
      const accion = modo === 'seleccion'
        ? `<a class="ficha-accion" href="${hrefConcepto(e.conceptoId)}">Estudiar el concepto</a>`
        : pista;
      return `<p class="ficha-antetitulo">Zona ${e.seccionId}${z ? ` · ${z.titulo}` : ''}</p><h3 class="ficha-titulo grande">${e.nombre}</h3>
 <div class="ficha-datos">${dominio(e.dominio, TEXTO_FASE[e.fase])}</div>${accion}`;
    }
    case 'ciudad':
      return '';
  }
}


/** Botón con el nombre de un edificio pendiente (lleva a él en el mapa). */
function enlaceEdificio(m: ModeloCiudad, id: string, p: PendienteConcepto): string {
  const e = buscarEdificio(m, id);
  return e ? `<li><button type="button" class="ficha-pend" data-foco="edificio:${id}"${p.sorpresas ? ' data-sorpresa' : ''}><span>${e.nombre}</span><b>${p.total}</b></button></li>` : '';
}

/**
 * Ficha del modo noche (repaso): cuánto hay pendiente en lo que se mira y dónde entrar a
 * repasarlo. En la ciudad resume la noche; en un barrio o una zona lista sus edificios encendidos.
 */
export function fichaNocturna(m: ModeloCiudad, foco: Foco, modo: ModoFicha, pendientes: ReadonlyMap<string, PendienteConcepto>): string {
  const dentro = (ids: readonly string[]) =>
    ids.map((id) => [id, pendientes.get(id)] as const).filter((x): x is readonly [string, PendienteConcepto] => Boolean(x[1]?.total))
      .sort((a, b) => b[1].sorpresas - a[1].sorpresas || b[1].total - a[1].total);
  const lista = (pares: ReturnType<typeof dentro>) =>
    pares.length ? `<ul class="ficha-pendientes">${pares.slice(0, 5).map(([id, p]) => enlaceEdificio(m, id, p)).join('')}</ul>` : '';
  const resumen = (pares: ReturnType<typeof dentro>) => {
    const total = pares.reduce((s, [, p]) => s + p.total, 0);
    const sorpresas = pares.reduce((s, [, p]) => s + p.sorpresas, 0);
    return `<div class="ficha-datos">${cifra(String(total), 'por repasar')}${cifra(String(pares.length), pares.length === 1 ? 'edificio encendido' : 'edificios encendidos')}${sorpresas ? cifra(String(sorpresas), sorpresas === 1 ? 'error con seguridad' : 'errores con seguridad') : ''}</div>`;
  };
  switch (foco.nivel) {
    case 'ciudad': {
      const pares = dentro(m.edificios.map((e) => e.conceptoId));
      if (!pares.length) {
        return `<p class="ficha-antetitulo llamada">🌙 Repaso de esta noche</p><h3 class="ficha-titulo">Nada pendiente hoy</h3><p class="ficha-texto">La ciudad se encenderá cuando tengas fallos, preguntas o flashcards que repasar. De día se aprende: estudia un concepto o haz un simulacro.</p><button type="button" class="ficha-accion" data-mundo-ambiente>☀️ Volver al día</button>`;
      }
      return `<p class="ficha-antetitulo llamada">🌙 Repaso de esta noche</p><h3 class="ficha-titulo">Los edificios encendidos te esperan</h3>${resumen(pares)}${modo === 'seleccion' ? lista(pares) : ''}<a class="ficha-accion" href="${hrefRepaso()}">Repasar todo</a>`;
    }
    case 'barrio':
    case 'zona': {
      const ids = foco.nivel === 'barrio'
        ? m.zonas.filter((z) => z.grupoId === foco.grupoId).flatMap((z) => z.conceptoIds)
        : buscarZona(m, foco.seccionId)?.conceptoIds ?? [];
      const titulo = foco.nivel === 'barrio' ? separarTitulo(buscarBarrio(m, foco.grupoId)?.titulo ?? '')[1] : buscarZona(m, foco.seccionId)?.titulo ?? '';
      const pares = dentro(ids);
      return `<p class="ficha-antetitulo llamada">🌙 Repaso · ${foco.nivel === 'barrio' ? `Barrio ${foco.grupoId}` : `Zona ${foco.seccionId}`}</p><h3 class="ficha-titulo">${titulo}</h3>${pares.length ? `${resumen(pares)}${lista(pares)}` : '<p class="ficha-texto">Nada pendiente aquí esta noche.</p>'}${modo === 'vistazo' ? '<p class="ficha-pista">Pulsa para acercarte</p>' : ''}`;
    }
    case 'edificio': {
      const e = buscarEdificio(m, foco.conceptoId);
      if (!e) return '';
      const p = pendientes.get(e.conceptoId);
      const accion = modo !== 'seleccion'
        ? '<p class="ficha-pista">Pulsa para acercarte</p>'
        : p?.total
          ? `<a class="ficha-accion" href="${hrefRepaso(e.conceptoId)}">Repasar ahora</a>`
          : `<a class="ficha-accion" href="${hrefConcepto(e.conceptoId)}">Ir a la ficha</a>`;
      return `<p class="ficha-antetitulo llamada">🌙 Repaso · Zona ${e.seccionId}</p><h3 class="ficha-titulo grande">${e.nombre}</h3>${p?.total
        ? `<p class="ficha-texto">${p.sorpresas ? '⚡ ' : ''}${resumenPendiente(p)}${p.sorpresas ? ` · ${p.sorpresas} con seguridad: repásalo primero` : ''}</p>`
        : '<p class="ficha-texto">Nada pendiente hoy en este edificio.</p>'}${accion}`;
    }
  }
}

/** Ficha del recorrido guiado: paso actual, anterior/siguiente y entrar a estudiar. */
export function fichaRecorrido(m: ModeloCiudad, ids: readonly string[], i: number): string {
  const e = buscarEdificio(m, ids[i] ?? '');
  if (!e) return '';
  const z = buscarZona(m, e.seccionId);
  const puntos = ids.map((_, k) => `<i class="${k === i ? 'on' : k < i ? 'hecho' : ''}"></i>`).join('');
  return `<p class="ficha-antetitulo llamada">🧭 Recorrido · Paso ${i + 1} de ${ids.length}</p><h3 class="ficha-titulo grande">${e.nombre}</h3>
 <p class="ficha-texto">Zona ${e.seccionId}${z ? ` · ${z.titulo}` : ''}</p>
 <div class="rec-puntos" aria-hidden="true">${puntos}</div>
 <div class="rec-ctrl"><button type="button" class="rec-btn" data-recorrido="-1"${i === 0 ? ' disabled' : ''}>← Anterior</button><button type="button" class="rec-btn principal" data-recorrido="1"${i === ids.length - 1 ? ' disabled' : ''}>Siguiente →</button></div>
 <div class="rec-pie"><a class="ficha-accion" href="${hrefConcepto(e.conceptoId)}">Estudiar el concepto</a><button type="button" class="rec-salir" data-recorrido="salir">Salir del recorrido</button></div>`;
}
