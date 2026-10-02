import type { Tema } from '../../content/schema.ts';
import type { Progreso } from '../../domain/progress.ts';
import { iconoSvg } from '../../icons/icon.ts';
import { colorBloque } from '../blockColors.ts';
import { MARCA, tituloMarca } from '../components/brandTitle.ts';
import { skylineSeccion } from '../components/skyline.ts';

/*
 * Intro: tráiler de títulos a pantalla completa antes de ver el mapa.
 *   título de la asignatura → "La ciudad del dinero" sobre el horizonte de la ciudad →
 *   un plano por apartado del tema → morph a "Bienvenido a la Ciudad Financiera" → fly-out → mapa.
 * Todo el guion es una única línea de tiempo CSS (retrasos absolutos) que solo anima `transform` y
 * `opacity`: la mueve el compositor, así que no se congela aunque el hilo principal esté ocupado
 * montando la 3D. El JS solo construye la capa, la cierra y la deja saltar.
 * Los textos salen de DATA (grupos, conceptos y meta del tema) y de la marca: nada inventado.
 */

export interface OpcionesIntro {
  tema: Tema;
  progreso: Progreso;
  /** Se resuelve cuando la escena 3D está montada (false si no hay 3D). */
  mundoListo: Promise<boolean>;
  /** Empieza la salida (fly-out y fundido) del final natural: el mapa ya asoma debajo. */
  alSalir: () => void;
  /** La capa ha terminado (sola o saltada); `saltada` si fue el usuario. */
  alTerminar: (saltada: boolean) => void;
}

/** Instantes del guion, en ms (los retrasos del CSS de `intro.css` los siguen). */
export const GUION = {
  titulo: 1100,
  planos: 3000,
  plano: 850,
  morph: 6600,
  subtitulo: 8000,
  /** Fin de la última animación de entrada: desde aquí se puede cerrar. */
  listo: 9400,
  /** Duración del fly-out y el fundido final. */
  salida: 900,
} as const;

/** Espera máxima por la 3D una vez acabado el guion. */
const ESPERA_MAXIMA = 3000;

const letras = (texto: string, clase: string, desde = 0): string => {
  let i = desde;
  return texto
    .split(' ')
    .map((p) => `<span class="pal">${[...p].map((l) => `<span class="${clase}" style="--i:${i++}">${l}</span>`).join('')}</span>`)
    .join(' ');
};

/** Reproduce la intro. Devuelve una función que la salta. */
export function reproducirIntro(o: OpcionesIntro): () => void {
  const { tema } = o;
  const planos = tema.grupos
    .map((g, k) => {
      const secciones = new Set(tema.secciones.filter((s) => s.grupoId === g.id).map((s) => s.id));
      const iconos = tema.conceptos
        .filter((c) => secciones.has(c.seccionId))
        .slice(0, 8)
        .map((c, j) => `<i style="--j:${j}">${iconoSvg(c.iconos, c.color)}</i>`)
        .join('');
      const [numero, ...resto] = g.titulo.split(' · ');
      return `<section class="intro-plano" style="--k:${k};--c:${colorBloque(k)}"><div class="intro-iconos" aria-hidden="true">${iconos}</div><p class="intro-num">${numero}</p><h2 class="intro-apartado">${resto.join(' · ') || g.titulo}</h2></section>`;
    })
    .join('');
  const subtitulo = `${MARCA.asignatura} · Tema ${tema.meta.numero} · ${tema.meta.titulo}`
    .split(' ')
    .map((p, i) => `<span style="--i:${i}">${p}</span>`)
    .join(' ');

  const capa = document.createElement('div');
  capa.className = 'intro';
  capa.setAttribute('role', 'dialog');
  capa.setAttribute('aria-label', 'Introducción: Bienvenido a la Ciudad Financiera');
  capa.style.setProperty('--planos', String(tema.grupos.length));
  capa.innerHTML = `<div class="intro-escena">
<div class="intro-apertura"><i class="intro-linea"></i><p class="intro-ante">${letras(MARCA.asignatura.toUpperCase(), 'l')}</p></div>
<div class="intro-titulo"><div class="intro-horizonte" aria-hidden="true">${skylineSeccion(tema.conceptos, o.progreso)}</div>${tituloMarca('entrada')}</div>
${planos}
<div class="intro-final"><div class="intro-morph"><p class="m-a" aria-hidden="true">${letras(MARCA.ciudad, 'la')}</p><h2 class="m-b">${letras('Bienvenido a la Ciudad Financiera', 'lb')}</h2></div><p class="intro-sub">${subtitulo}</p></div>
</div>
<button type="button" class="intro-saltar">Saltar intro</button>`;
  document.body.append(capa);
  document.body.classList.add('intro-activa');

  const temporizadores: number[] = [];
  let terminada = false;
  let cerrando = false;

  const terminar = (saltada: boolean) => {
    if (terminada) return;
    terminada = true;
    for (const t of temporizadores) clearTimeout(t);
    document.removeEventListener('keydown', alTeclado);
    capa.remove();
    document.body.classList.remove('intro-activa');
    o.alTerminar(saltada);
  };
  const saltar = () => terminar(true);
  const alTeclado = (e: KeyboardEvent) => {
    if (e.key === 'Escape') saltar();
  };
  document.addEventListener('keydown', alTeclado);
  capa.querySelector('.intro-saltar')!.addEventListener('click', saltar);
  capa.addEventListener('pointerdown', (e) => {
    if (!(e.target as Element).closest('button')) saltar();
  });

  // Cierre: guion terminado y 3D lista (o pasado el tope). Fly-out del texto, fundido de la capa
  // y, debajo, el acercamiento de la cámara.
  const cerrar = () => {
    if (cerrando || terminada) return;
    cerrando = true;
    capa.classList.add('fuera');
    o.alSalir();
    temporizadores.push(window.setTimeout(() => terminar(false), GUION.salida));
  };
  let guionAcabado = false;
  let hay3d: boolean | null = null;
  const probar = () => {
    if (guionAcabado && hay3d !== null) cerrar();
  };
  void o.mundoListo.then(
    (ok) => {
      hay3d = ok;
      probar();
    },
    () => {
      hay3d = false;
      probar();
    },
  );
  const acabarGuion = () => {
    if (guionAcabado) return;
    guionAcabado = true;
    capa.classList.add('espera');
    probar();
    temporizadores.push(window.setTimeout(cerrar, ESPERA_MAXIMA));
  };
  // El final del guion lo marca la última palabra del subtítulo (animationend) o, si el navegador
  // no la anima (pestaña oculta), el reloj.
  capa.querySelector('.intro-sub span:last-child')?.addEventListener('animationend', acabarGuion);
  temporizadores.push(window.setTimeout(acabarGuion, GUION.listo + 400));

  return saltar;
}
