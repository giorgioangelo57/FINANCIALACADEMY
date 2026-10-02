import { tituloMarca } from '../components/brandTitle.ts';
import { hrefConcepto, hrefSeccion } from '../../app/router.ts';
import type { ModoExplicacion } from '../../content/schema.ts';
import type { NivelDominio } from '../../domain/mastery.ts';
import type { Historia, PasoHistoria } from '../../experiences/schema.ts';
import type { EntradaAtlas, VistaAtlas } from '../../world/atlas.ts';
import type { FaseObra } from '../../world/cityModel.ts';
import { type Ambiente, ICONO_AMBIENTE, NOMBRE_AMBIENTE, siguienteAmbiente } from '../../world/ambiente.ts';
import { codificarFoco, type Foco } from '../../world/focus.ts';
import { colorDominio } from '../format.ts';

/* Marcado HTML del mundo: barra de navegación, Atlas accesible y ficha del edificio enfocado. */

export const TEXTO_NIVEL: Record<NivelDominio, string> = {
  dominado: 'Dominado',
  regular: 'Regular',
  flojo: 'Flojo',
  'sin-estudiar': 'Sin estudiar',
};

export const TEXTO_FASE: Record<FaseObra, string> = {
  completo: 'Construido · dominado',
  obra: 'En obra · a medias',
  solar: 'En proyecto · sin estudiar',
};

/** "4 · Estructura del sistema español" → ["4", "Estructura del sistema español"]. */
export function separarTitulo(titulo: string): [string, string] {
  const corte = titulo.indexOf(' · ');
  return corte > 0 ? [titulo.slice(0, corte), titulo.slice(corte + 3)] : ['', titulo];
}

export interface Miga {
  foco: Foco;
  etiqueta: string;
}

export interface EstadoBarra {
  migas: Miga[];
  puedeSubir: boolean;
  modo3d: boolean;
  /** null mientras se comprueba o se carga. */
  disponible3d: boolean | null;
  vistaAtlas: boolean;
  paseando?: boolean;
  pantallaCompleta?: boolean;
  zoomRueda?: boolean;
  /** Ambiente de la maqueta (solo en 3D). */
  ambiente?: Ambiente;
  /** Recorrido guiado activo. */
  recorrido?: boolean;
}

/** Contenedor estable del mundo; la barra y el Atlas se repintan dentro. */
export function esqueletoMundo(): string {
  return `<div class="mundo-barra" data-mundo-barra></div>
 <div class="mundo-vista" data-mundo-vista hidden><div class="mundo-etiquetas" data-mundo-etiquetas aria-hidden="true"></div><aside class="ficha" data-mundo-ficha hidden></aside><p class="paseo-pista" aria-hidden="true"><span><b>WASD</b> o flechas para moverte</span><span><b>Espacio</b> saltar · <b>doble</b> dash</span><span><b>E</b> para entrar</span><span><b>Esc</b> para salir</span></p><div class="paseo-tactil"><div class="joy" data-joy aria-label="Joystick: arrastra para mover al personaje"><i class="joy-pomo"></i></div><div class="joy-botones"><button type="button" class="joy-btn" data-paseo-saltar aria-label="Saltar (doble toque: dash)">⤒<small>Saltar</small></button><button type="button" class="joy-btn" data-paseo-entrar aria-label="Entrar en el edificio cercano">⏎<small>Entrar</small></button></div></div><p class="pista-zoom" data-pista-zoom aria-hidden="true" hidden>Ctrl + rueda para acercar · o activa «Zoom con rueda»</p><div class="portada-marca">${tituloMarca('portada')}</div><p class="portada-pista"><span aria-hidden="true">Pulsa la ciudad para explorarla a pantalla completa</span><button type="button" class="ver-intro" data-ver-intro>▶ Ver la intro</button><span aria-hidden="true">Desliza para ver el tema</span></p></div>
 <p class="mundo-aviso" data-mundo-aviso role="status"></p>
 <div class="atlas" data-atlas></div>
 <dl class="mundo-leyenda">
  <div><dt>Superficie</dt><dd>Lo que pesa en el examen: cuanto mayor la zona, más pesa.</dd></div>
  <div><dt>Edificio</dt><dd>Lo que sabes: en proyecto (maqueta clara), en obra (grúa y andamio) o construido (materiales y luces).</dd></div>
  <div><dt>Columna de luz</dt><dd>Dónde conviene estudiar ahora.</dd></div>
  <div><dt>Tráfico</dt><dd>Solo circula por las zonas que ya estudias.</dd></div>
 </dl>`;
}

export function barraMundo(e: EstadoBarra): string {
  const migas = e.migas
    .map((m, i) => {
      const actual = i === e.migas.length - 1;
      return `<li><button type="button" data-foco="${codificarFoco(m.foco)}"${actual ? ' aria-current="location"' : ''}>${m.etiqueta}</button></li>`;
    })
    .join('');
  // Texto largo en pantallas anchas; icono + palabra en móvil (todas caben sin desplazar).
  const btn = (atributos: string, largo: string, corto: string) =>
    `<button type="button" class="mb-btn" ${atributos} aria-label="${largo}"><span class="mb-largo">${largo}</span><span class="mb-corto" aria-hidden="true">${corto}</span></button>`;
  const con3d = e.modo3d && e.disponible3d;
  const acciones = [
    e.puedeSubir ? btn('data-mundo-subir', 'Subir de nivel', '↑ Subir') : '',
    con3d ? btn(`data-mundo-completa aria-pressed="${Boolean(e.pantallaCompleta)}"`, e.pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa', e.pantallaCompleta ? '✕ Salir' : '⛶ Completa') : '',
    con3d && !e.pantallaCompleta ? btn(`data-mundo-zoom aria-pressed="${Boolean(e.zoomRueda)}"`, 'Zoom con rueda', 'Zoom') : '',
    con3d ? btn(`data-mundo-paseo aria-pressed="${Boolean(e.paseando)}"`, e.paseando ? 'Dejar de pasear' : 'Pasear', e.paseando ? '■ Parar' : '🚶 Pasear') : '',
    con3d ? btn(`data-mundo-recorrido aria-pressed="${Boolean(e.recorrido)}" title="Ruta guiada por el barrio 4, en el orden de estudio"`, e.recorrido ? 'Salir del recorrido' : '🧭 Recorrido del barrio 4', e.recorrido ? '✕ Ruta' : '🧭 Ruta') : '',
    con3d && e.ambiente ? btn(`data-mundo-ambiente aria-pressed="${e.ambiente === 'noche'}" aria-label="Modo ${NOMBRE_AMBIENTE[e.ambiente].toLowerCase()} (${e.ambiente === 'dia' ? 'día' : 'noche'}). Cambiar a ${NOMBRE_AMBIENTE[siguienteAmbiente(e.ambiente)].toLowerCase()}" title="${e.ambiente === 'dia' ? 'De noche solo se encienden los edificios con algo que repasar hoy' : 'De día, la ciudad completa del temario'}"`, `${ICONO_AMBIENTE[e.ambiente]} ${NOMBRE_AMBIENTE[e.ambiente]}`, ICONO_AMBIENTE[e.ambiente]) : '',
    con3d ? btn(`data-mundo-atlas aria-pressed="${e.vistaAtlas}"`, e.vistaAtlas ? 'Ver maqueta' : 'Ver Atlas', e.vistaAtlas ? 'Maqueta' : 'Atlas') : '',
  ].join('');
  return `<nav aria-label="Nivel del mapa"><ol class="migas">${migas}</ol></nav><div class="mundo-acciones">${acciones}</div>`;
}

function estado(nivel: NivelDominio, fase: FaseObra | null): string {
  const texto = fase ? TEXTO_FASE[fase] : TEXTO_NIVEL[nivel];
  return `<span class="atlas-estado" data-nivel="${nivel}"><i style="background:${nivel === 'sin-estudiar' ? 'transparent' : colorDominio(nivelValor(nivel))}"></i>${texto}</span>`;
}

/** Valor representativo de cada nivel, solo para elegir el color. */
const nivelValor = (n: NivelDominio) => ({ dominado: 1, regular: 0.5, flojo: 0.2, 'sin-estudiar': 0 })[n];

/** Fila del índice: clave, nombre y estado; peso (si existe en DATA) y dominio alineados a la derecha. */
function entrada(e: EntradaAtlas, pesoMaximo: number): string {
  const peso = e.pesoExamen !== null
    ? `<span class="atlas-peso"><b>${e.pesoExamen}</b><small>% examen</small>${pesoMaximo > 0 ? `<i aria-hidden="true"><i style="width:${((e.pesoExamen / pesoMaximo) * 100).toFixed(1)}%"></i></i>` : ''}</span>`
    : '';
  const recomendada = e.prioridad ? `<span class="atlas-prio">${e.prioridad === 1 ? 'Siguiente recomendación' : `Recomendación ${e.prioridad}`}</span>` : '';
  const progreso = e.total > 1 ? `<small>${e.estudiados}/${e.total} estudiados</small>` : '';
  // Los barrios llevan su número dentro del título de DATA ("4 · …"): se lleva a la columna de clave.
  const [numero, nombre] = e.clave ? [e.clave, e.etiqueta] : e.foco.nivel === 'barrio' ? separarTitulo(e.etiqueta) : ['', e.etiqueta];
  return `<li><button type="button" class="atlas-item" data-foco="${codificarFoco(e.foco)}">
 <span class="atlas-clave">${numero}</span>
 <span class="atlas-nombre">${nombre}${estado(e.nivel, e.fase)}${recomendada}</span>
 ${peso}<span class="atlas-dominio"><b>${Math.round(e.dominio * 100)}</b><small>% dominio</small>${progreso}</span></button></li>`;
}

export function atlasHtml(v: VistaAtlas, historia: string): string {
  const pendientes = v.total - v.dominados;
  const nivel = { ciudad: 'Índice del tema', barrio: 'Barrio', zona: 'Zona', edificio: 'Concepto' }[v.foco.nivel];
  const cifras = [
    v.pesoExamen !== null ? `<div><b>${v.pesoExamen}</b><span>% del examen</span></div>` : '',
    `<div><b>${Math.round(v.dominio * 100)}</b><span>% de dominio</span></div>`,
    v.total > 1 ? `<div><b>${pendientes}</b><span>de ${v.total} conceptos por dominar</span></div>` : '',
  ].join('');
  const ir = v.estudiarAhora ? `<a class="atlas-ir" href="${v.estudiarAhora.href}">${v.estudiarAhora.texto}</a>` : '';
  const seccion = v.foco.nivel === 'edificio' && v.clave
    ? `<a class="atlas-ir sec" href="${hrefSeccion(v.clave)}">Ver la sección ${v.clave}</a>`
    : '';
  const lista = v.entradas.length
    ? `<ol class="atlas-lista">${v.entradas.map((e) => entrada(e, v.pesoMaximo)).join('')}</ol>`
    : '';
  return `<header class="atlas-cab"><div class="atlas-tit"><p class="atlas-nivel">${nivel}${v.clave ? ` · ${v.clave}` : ''}</p><h3>${v.titulo}</h3>${estado(v.nivel, v.fase)}</div>
 <div class="atlas-cifras">${cifras}</div><div class="atlas-ires">${ir}${seccion}</div></header>${lista}${historia}`;
}

/* ------------------------------------------------------------ microexperiencia */

function textoPaso(h: Historia, paso: PasoHistoria): string {
  const nombre = (id: string) => h.entidades.find((e) => e.id === id)?.etiqueta ?? '';
  switch (paso.tipo) {
    case 'presentacion':
      return 'Los elementos del esquema.';
    case 'flujo': {
      const f = h.flujos[paso.indice];
      if (!f) return '';
      if (f.tipo === 'contiene') return `${nombre(f.desde)} engloba a ${nombre(f.hacia)}.`;
      const simbolo = f.tipo === 'intercambio' ? '⇄' : '→';
      return `${nombre(f.desde)} ${simbolo} ${nombre(f.hacia)}${f.etiqueta ? ` (${f.etiqueta})` : ''}`;
    }
    case 'pregunta':
      return 'Ahora compruébalo con la pregunta del concepto.';
  }
}

/** Reproductor HTML de una historia: misma estructura que usará la escena 3D. */
export function historiaHtml(h: Historia, modos: ModoExplicacion[], indicePaso: number): string {
  const paso = h.pasos[indicePaso] ?? h.pasos[0]!;
  const activo = paso.tipo === 'flujo' ? h.flujos[paso.indice] : undefined;
  const resaltadas = new Set(activo ? [activo.desde, activo.hacia] : paso.tipo === 'presentacion' ? h.entidades.map((e) => e.id) : []);

  const cadena = h.entidades
    .map((e, i) => {
      const nodo = `<li class="h-ent${resaltadas.has(e.id) ? ' on' : ''}">${e.etiqueta}</li>`;
      const f = h.flujos[i];
      if (!f) return nodo;
      const simbolo = f.tipo === 'contiene' ? (f.desde === e.id ? '⊃' : '⊂') : f.tipo === 'intercambio' ? '⇄' : f.desde === e.id ? '→' : '←';
      const on = activo === f ? ' on' : '';
      return `${nodo}<li class="h-flu${on}" aria-hidden="true">${f.etiqueta ? `<small>${f.etiqueta}</small>` : ''}${simbolo}</li>`;
    })
    .join('');

  const final = paso.tipo === 'pregunta'
    ? ` <a href="${hrefConcepto(h.conceptoId)}">Ir a «Compruébalo» →</a>`
    : '';
  return `<section class="historia" aria-label="Historia visual">
 <h4>${modos[h.fuente.indice]?.etiqueta ?? 'Esquema'} · historia</h4>
 <ol class="h-cadena">${cadena}</ol>
 <p class="h-paso" aria-live="polite">Paso ${indicePaso + 1} de ${h.pasos.length}: ${textoPaso(h, paso)}${final}</p>
 <div class="h-ctrl"><button type="button" class="mb-btn" data-historia="-1"${indicePaso === 0 ? ' disabled' : ''}>← Anterior</button><button type="button" class="mb-btn" data-historia="1"${indicePaso >= h.pasos.length - 1 ? ' disabled' : ''}>Siguiente →</button></div>
</section>`;
}
