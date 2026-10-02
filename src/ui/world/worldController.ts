import { reproducirIntro } from '../intro/introCinematica.ts';
import type { EstadoPractica } from '../../app/practiceStore.ts';
import { type PendienteConcepto, pendientesPorConcepto } from '../../domain/pendientes.ts';
import { type Ambiente, siguienteAmbiente } from '../../world/ambiente.ts';
import { MARCA } from '../components/brandTitle.ts';
import { hrefConcepto } from '../../app/router.ts';
import type { EstadoEstudio } from '../../app/store.ts';
import { historiaDeConcepto } from '../../experiences/registry.ts';
import { type AlmacenClaveValor, escribirJson, leerJson } from '../../persistence/storage.ts';
import type { DatosSeleccionables } from '../../scene/three/builders.ts';
import type { Mundo3D } from '../../scene/three/cityScene.ts';
import { webglDisponible } from '../../scene/webgl.ts';
import { vistaAtlas } from '../../world/atlas.ts';
import { type ModeloCiudad, modeloCiudad } from '../../world/cityModel.ts';
import { etiquetasDelNivel, etiquetasNocturnas } from '../../world/labels.ts';
import {
  buscarBarrio,
  buscarEdificio,
  buscarZona,
  cadenaFoco,
  codificarFoco,
  decodificarFoco,
  FOCO_CIUDAD,
  type Foco,
  focoPadre,
  focoValido,
  igualFoco,
} from '../../world/focus.ts';
import { alCambiarMovimiento, movimientoReducido } from '../motion.ts';
import { fichaContextual, fichaNocturna, fichaRecorrido } from './contextCard.ts';
import { BARRIO_RECORRIDO, recorridoDelBarrio } from '../../world/recorrido.ts';
import { atlasHtml, barraMundo, esqueletoMundo, historiaHtml, type Miga, separarTitulo } from './worldPanel.ts';

/** Preferencia de vista de cada usuario (comodidad local, no es progreso). */
export const CLAVE_VISTA = 'financial-academy:vista';
/** Zoom con la rueda fuera de pantalla completa (comodidad local). */
export const CLAVE_ZOOM = 'financial-academy:zoom-rueda';
/** La intro solo se muestra sola la primera vez. */
export const CLAVE_ENTRADA = 'financial-academy:entrada';
/** Valor de la intro actual: quien vio una intro anterior (otro valor) ve el tráiler una vez. */
export const INTRO_VISTA = 'trailer-1';

/**
 * Orquesta el mundo de la portada: un único foco compartido por la cámara 3D, las etiquetas
 * flotantes y el Atlas HTML. El renderer Three.js se carga bajo demanda y se reutiliza entre
 * visitas a la portada; si no hay WebGL, el Atlas y la ciudad 2D siguen funcionando.
 */
export class ControladorMundo {
  private foco: Foco = FOCO_CIUDAD;
  private vistaAtlas = false;
  private modo3d: boolean;
  private disponible3d: boolean | null = null;
  private mundo: Mundo3D | null = null;
  private modelo: ModeloCiudad;
  private raiz: HTMLElement | null = null;
  private pasoHistoria = 0;
  private reducido = movimientoReducido();
  private etiquetas: { foco: Foco; el: HTMLElement }[] = [];
  private modoMapa = false;
  /** Lo que el puntero está señalando ahora mismo (ficha de vistazo). */
  private vistazo: Foco | null = null;
  /** Si la entrada cinematográfica está en curso, la salta y la cierra. */
  private cerrarEntrada: (() => void) | null = null;
  /**
   * Portada (landing): el mapa a pantalla completa, sin interfaz. Un clic pasa a la exploración;
   * el scroll revela el bloque del tema y la barra lateral.
   */
  private enPortada = false;
  /** Paseo con el personaje (teclado). */
  private paseando = false;
  private cercano: string | null = null;
  private teclas = new Set<string>();
  private alTecladoPaseo: ((e: KeyboardEvent) => void) | null = null;
  private ultimoEspacio = 0;
  /** El mapa está en pantalla completa (API nativa o capa de reserva). */
  private pantallaCompleta = false;
  private zoomRueda: boolean;
  /**
   * Día (aprender) o noche (repasar). Se recuerda mientras la aplicación está abierta; al cargarla,
   * el mapa se abre siempre de día.
   */
  private modo: Ambiente = 'dia';
  /** Recorrido guiado activo: los edificios en orden y el paso actual. */
  private recorrido: { ids: string[]; i: number } | null = null;
  private pistaZoomMostrada = false;
  private observadorPortada: IntersectionObserver | null = null;
  /** El mapa ocupa la mayor parte de la pantalla (≥ 55 % visible). */
  private mapaDomina = false;

  constructor(
    private readonly estado: EstadoEstudio,
    private readonly almacen: AlmacenClaveValor | null,
    private readonly practica: EstadoPractica | null = null,
  ) {
    // El modo 2D ya no se elige: la ciudad 2D del prototipo queda al final de la portada como
    // historia del proyecto y como alternativa automática si no hay WebGL.
    this.modo3d = true;
    this.zoomRueda = leerJson(almacen, CLAVE_ZOOM) === true;
    document.addEventListener('fullscreenchange', () => {
      const nativa = Boolean(this.raiz && document.fullscreenElement === this.raiz);
      if (!nativa && !this.raiz?.classList.contains('pantalla-completa')) this.fijarPantallaCompleta(false);
    });
    this.modelo = modeloCiudad(estado.tema, estado.progreso);
    alCambiarMovimiento((reducido) => {
      this.reducido = reducido;
      if (this.mundo) this.mundo.movimientoReducido = reducido;
    });
  }

  /** Ambiente vigente: el elegido o, si no hay elección, el de la hora local. */
  get ambiente(): Ambiente {
    return this.modo;
  }

  /** De noche, lo que cada concepto tiene pendiente de repaso hoy; de día, null. */
  private pendientes(): Map<string, PendienteConcepto> | null {
    if (this.modo !== 'noche' || !this.practica) return null;
    return pendientesPorConcepto(this.estado.tema, this.practica.practica, this.practica.fecha, this.practica.tarjetasDelTema());
  }

  /** Recuerda el último lugar visitado para volver a él al regresar al mapa. */
  recordar(foco: Foco): void {
    if (!igualFoco(foco, this.foco)) this.pasoHistoria = 0;
    this.foco = foco;
  }

  montar(raiz: HTMLElement): void {
    this.raiz = raiz;
    this.modelo = modeloCiudad(this.estado.tema, this.estado.progreso);
    if (!focoValido(this.modelo, this.foco)) this.foco = FOCO_CIUDAD;
    raiz.innerHTML = esqueletoMundo();
    raiz.dataset.ambiente = this.ambiente;
    raiz.addEventListener('click', (e) => this.alPulsar(e));
    // Esc se escucha en todo el documento: al navegar con el Atlas, el botón pulsado se repinta y
    // el foco vuelve al documento (fuera del mapa).
    document.removeEventListener('keydown', this.alEscape);
    document.addEventListener('keydown', this.alEscape);
    this.pintarPanel();
    // Primera visita: la intro va ANTES del mapa, a pantalla completa, mientras la 3D carga debajo.
    let avisar: (ok: boolean) => void = () => {};
    if (this.foco.nivel === 'ciudad' && !this.vistaAtlas && !this.reducido && leerJson(this.almacen, CLAVE_ENTRADA) !== INTRO_VISTA) {
      this.lanzarIntro(new Promise<boolean>((r) => (avisar = r)));
    }
    void this.prepararVista().then(avisar, () => avisar(false));
  }

  /** Empieza, avanza, retrocede o termina el recorrido guiado del barrio 4. */
  private moverRecorrido(accion: string): void {
    if (accion === 'salir') {
      this.recorrido = null;
      this.mundo?.fijarRecorrido(null, 0);
      this.pintarPanel();
      return;
    }
    if (accion === 'empezar' || !this.recorrido) {
      const ids = recorridoDelBarrio(this.modelo, BARRIO_RECORRIDO);
      if (!ids.length) return;
      this.recorrido = { ids, i: 0 };
    } else {
      this.recorrido.i = Math.min(this.recorrido.ids.length - 1, Math.max(0, this.recorrido.i + Number(accion)));
    }
    const { ids, i } = this.recorrido;
    this.mundo?.fijarRecorrido(ids, i);
    this.enfocar({ nivel: 'edificio', conceptoId: ids[i]! });
    this.raiz?.querySelector<HTMLButtonElement>('[data-recorrido="1"]:not(:disabled)')?.focus({ preventScroll: true });
  }

  private alEscape = (e: KeyboardEvent): void => {
    const raiz = this.raiz;
    if (!raiz || e.key !== 'Escape' || e.defaultPrevented) return;
    const destino = e.target as Element | null;
    if (destino?.closest('input, textarea, select, [contenteditable="true"]') || document.body.classList.contains('menu')) return;
    // Solo si el foco está en el mapa o en ningún sitio concreto (no en otra parte de la página).
    if (destino && destino !== document.body && !raiz.contains(destino)) return;
    // Capa de reserva (sin API nativa): Esc sale de la pantalla completa.
    if (raiz.classList.contains('pantalla-completa') && !this.paseando) {
      e.preventDefault();
      void this.salirPantallaCompleta();
      return;
    }
    if (this.paseando) return;
    if (this.subir()) e.preventDefault();
  };

  desmontar(): void {
    document.removeEventListener('keydown', this.alEscape);
    // Salir a mitad de la entrada la da por vista: no deja escuchadores ni edificios a medio levantar.
    this.cerrarEntrada?.();
    this.detenerPaseo(false);
    if (this.pantallaCompleta) void this.salirPantallaCompleta();
    this.observadorPortada?.disconnect();
    this.observadorPortada = null;
    this.mapaDomina = false;
    document.body.classList.remove('portada-inmersiva');
    this.mundo?.desmontar();
    this.raiz = null;
    this.etiquetas = [];
  }

  /* ------------------------------------------------------------ vista 3D / 2D */

  /** `explorando`: se vuelve a 3D desde la exploración (botón «Ver en 3D»): sin portada ni entrada. */
  /** Devuelve si la ciudad 3D ha quedado montada. */
  private async prepararVista(explorando = false): Promise<boolean> {
    const raiz = this.raiz;
    if (!raiz) return false;
    if (!this.modo3d) {
      this.mostrar2d('');
      return false;
    }
    this.disponible3d ??= webglDisponible();
    if (!this.disponible3d) {
      this.mostrar2d('La vista 3D no está disponible en este navegador: usa el Atlas o la ciudad 2D del final de la página.');
      return false;
    }

    this.aviso('Cargando la ciudad 3D…');
    let mundo: Mundo3D;
    try {
      if (this.mundo) this.mundo.actualizar(this.modelo);
      else {
        this.mundo = await this.crearMundo();
        this.mundo.fijarAmbiente(this.ambiente, false);
        this.mundo.fijarPendientes(this.pendientes());
        this.mundo.fijarRecorrido(this.recorrido?.ids ?? null, this.recorrido?.i ?? 0);
      }
      mundo = this.mundo;
    } catch (error) {
      console.error('No se pudo iniciar la vista 3D', error);
      this.disponible3d = false;
      if (this.raiz === raiz) this.mostrar2d('No se pudo iniciar la vista 3D: usa el Atlas o la ciudad 2D del final de la página.');
      return false;
    }
    // El usuario puede haber salido de la portada o cambiado a 2D mientras cargaba.
    if (this.raiz !== raiz || !this.modo3d) return false;

    const vista = this.el('[data-mundo-vista]');
    vista.hidden = false;
    this.alternarCiudad2d(false);
    mundo.lienzo.setAttribute('aria-label', `Maqueta 3D de ${MARCA.ciudad}. El Atlas de abajo ofrece la misma navegación en texto.`);
    // Con la ciudad 3D funcionando, el mundo pasa a ser lo primero de la portada. Se vuelve a la
    // portada (landing) cuando se llega a la vista general; desde un lugar estudiado, a explorar.
    raiz.parentElement?.prepend(raiz);
    // La línea de tiempo del tema acompaña al mapa: queda entre su leyenda y el bloque del tema.
    const linea = raiz.parentElement?.querySelector('.tl');
    if (linea) raiz.after(linea);
    this.fijarPortada(!explorando && this.foco.nivel === 'ciudad' && !this.vistaAtlas);
    this.vigilarInmersion(vista);
    this.aplicarZoom();
    mundo.montarEn(vista);
    mundo.enfocar(this.foco, this.vistaAtlas ? 'atlas' : 'maqueta', false);
    this.aviso('');
    this.pintarPanel();
    return true;
  }

  /**
   * Intro (primera visita o "Ver la intro"): tráiler de títulos a pantalla completa antes del
   * mapa, mientras la 3D se monta debajo. Se salta con el botón, Escape o un toque.
   */
  private lanzarIntro(mundoListo: Promise<boolean>): void {
    this.cerrarEntrada?.();
    this.cerrarEntrada = reproducirIntro({
      tema: this.estado.tema,
      progreso: this.estado.progreso,
      mundoListo,
      // Mientras la capa se funde, la ciudad recibe al usuario con un acercamiento corto.
      alSalir: () => {
        if (this.activo3d && this.foco.nivel === 'ciudad' && !this.vistaAtlas) this.mundo!.acercar();
      },
      alTerminar: () => {
        escribirJson(this.almacen, CLAVE_ENTRADA, INTRO_VISTA);
        this.cerrarEntrada = null;
      },
    });
  }

  private async crearMundo(): Promise<Mundo3D> {
    // Si la intro va a sonar, sus nubes se generan mientras se descarga y monta la escena 3D.
    // Three.js va en un fragmento aparte: la portada 2D no lo descarga.
    const { Mundo3D } = await import('../../scene/three/cityScene.ts');
    return new Mundo3D(this.modelo, {
      movimientoReducido: this.reducido,
      alSeleccionar: (s) => this.alSeleccionar(s),
      alSobrevolar: (s) => this.alSobrevolar(s),
      alFotograma: () => this.colocarEtiquetas(),
      alAcercarse: (id) => {
        this.cercano = id;
        this.pintarFicha();
      },
      alPerderContexto: () => {
        this.disponible3d = false;
        this.mundo?.destruir();
        this.mundo = null;
        this.mostrar2d('La vista 3D se ha detenido: usa el Atlas o la ciudad 2D del final de la página.');
      },
    });
  }

  private mostrar2d(mensaje: string): void {
    if (!this.raiz) return;
    this.mundo?.desmontar();
    this.el('[data-mundo-vista]').hidden = true;
    this.alternarCiudad2d(true);
    this.aviso(mensaje);
    this.pintarPanel();
  }

  /** La ciudad pixel art sigue siendo la alternativa 2D: se oculta solo con la 3D funcionando. */
  /** La ciudad 2D del prototipo vive al final de la portada (historia del proyecto): siempre visible. */
  private alternarCiudad2d(_visible: boolean): void {
    // Nada que ocultar: ya no compite con la vista 3D.
  }

  private aviso(texto: string): void {
    const el = this.raiz?.querySelector<HTMLElement>('[data-mundo-aviso]');
    if (el) {
      el.textContent = texto;
      el.hidden = !texto;
    }
  }

  private get activo3d(): boolean {
    return Boolean(this.mundo && this.modo3d && this.disponible3d && this.raiz);
  }

  /* ------------------------------------------------------------ paseo */

  private empezarPaseo(): void {
    if (!this.activo3d || this.paseando) return;
    if (this.enPortada) this.fijarPortada(false);
    this.vistaAtlas = false;
    this.paseando = true;
    this.mundo!.iniciarPaseo();
    this.raiz?.classList.add('paseando');
    // El foco no puede quedarse en el botón: el espacio lo volvería a pulsar.
    (document.activeElement as HTMLElement | null)?.blur?.();
    const direccion = () => {
      const t = this.teclas;
      const x = (t.has('d') || t.has('arrowright') ? 1 : 0) - (t.has('a') || t.has('arrowleft') ? 1 : 0);
      const y = (t.has('w') || t.has('arrowup') ? 1 : 0) - (t.has('s') || t.has('arrowdown') ? 1 : 0);
      this.mundo?.fijarEntradaPaseo({ x, y });
    };
    const MOVER = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    this.alTecladoPaseo = (e: KeyboardEvent) => {
      const destino = e.target as Element | null;
      if (destino?.closest('input, textarea, select, [contenteditable="true"]')) return;
      const tecla = e.key.toLowerCase();
      if (e.type === 'keydown' && tecla === 'escape') {
        e.preventDefault();
        this.detenerPaseo(true);
        return;
      }
      if (e.type === 'keydown' && (tecla === 'e' || tecla === 'enter') && this.cercano) {
        e.preventDefault();
        location.hash = hrefConcepto(this.cercano);
        return;
      }
      if (tecla === ' ' || e.code === 'Space') {
        // Espacio salta; dos espacios seguidos (menos de 280 ms), dash.
        e.preventDefault();
        if (e.type === 'keydown' && !e.repeat) this.saltarODash();
        return;
      }
      if (!MOVER.has(tecla)) return;
      e.preventDefault();
      if (e.type === 'keydown') this.teclas.add(tecla);
      else this.teclas.delete(tecla);
      direccion();
    };
    window.addEventListener('keydown', this.alTecladoPaseo);
    window.addEventListener('keyup', this.alTecladoPaseo);
    window.addEventListener('blur', this.soltarTeclas);
    this.conectarJoystick();
    this.pintarPanel();
  }

  /** Espacio o botón "Saltar": salta; dos seguidos en menos de 280 ms, dash. */
  private saltarODash(): void {
    const ahora = performance.now();
    if (ahora - this.ultimoEspacio < 280) {
      this.mundo?.dashear();
      this.ultimoEspacio = 0;
    } else {
      this.mundo?.saltar();
      this.ultimoEspacio = ahora;
    }
  }

  /**
   * Controles táctiles del paseo (se ven con puntero grueso): un joystick que da la misma entrada
   * que WASD y botones de saltar (doble toque: dash) y entrar. Se conectan una vez por mundo.
   */
  private conectarJoystick(): void {
    const raiz = this.raiz;
    const joy = raiz?.querySelector<HTMLElement>('[data-joy]');
    if (!raiz || !joy || joy.dataset.listo) return;
    joy.dataset.listo = '1';
    const pomo = joy.querySelector<HTMLElement>('.joy-pomo')!;
    let dedo: number | null = null;
    const mover = (e: PointerEvent) => {
      const caja = joy.getBoundingClientRect();
      const radio = caja.width / 2;
      let dx = (e.clientX - (caja.left + radio)) / radio;
      let dy = (e.clientY - (caja.top + radio)) / radio;
      const largo = Math.hypot(dx, dy);
      if (largo > 1) {
        dx /= largo;
        dy /= largo;
      }
      pomo.style.transform = `translate(${dx * radio * 0.6}px, ${dy * radio * 0.6}px)`;
      // Zona muerta en el centro; arriba en pantalla = adelante.
      this.mundo?.fijarEntradaPaseo(largo < 0.2 ? { x: 0, y: 0 } : { x: dx, y: -dy });
    };
    const soltar = () => {
      dedo = null;
      joy.classList.remove('activo');
      pomo.style.transform = '';
      this.mundo?.fijarEntradaPaseo({ x: 0, y: 0 });
    };
    joy.addEventListener('pointerdown', (e) => {
      if (!this.paseando) return;
      e.preventDefault();
      dedo = e.pointerId;
      try {
        joy.setPointerCapture(e.pointerId);
      } catch {
        /* sin captura (puntero ya liberado): el gesto sigue con los eventos del propio joystick */
      }
      joy.classList.add('activo');
      mover(e);
    });
    joy.addEventListener('pointermove', (e) => {
      if (e.pointerId === dedo) mover(e);
    });
    joy.addEventListener('pointerup', soltar);
    joy.addEventListener('pointercancel', soltar);
    // Con un dedo en el joystick, el navegador no genera `click` para el segundo dedo: los botones
    // responden a `pointerdown` (multitáctil) y se ignora el `click` posterior para no repetir.
    const pulsar = (sel: string, accion: () => void) => {
      const b = raiz.querySelector<HTMLButtonElement>(sel);
      if (!b) return;
      b.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        b.classList.add('pulsado');
        accion();
      });
      for (const fin of ['pointerup', 'pointercancel', 'pointerleave'] as const) b.addEventListener(fin, () => b.classList.remove('pulsado'));
      // Teclado y lectores de pantalla (sin puntero): `click` con `detail === 0`.
      b.addEventListener('click', (e) => {
        if (e.detail === 0) accion();
      });
    };
    pulsar('[data-paseo-saltar]', () => this.paseando && this.saltarODash());
    pulsar('[data-paseo-entrar]', () => {
      if (this.paseando && this.cercano) location.hash = hrefConcepto(this.cercano);
    });
  }

  private soltarTeclas = () => {
    this.teclas.clear();
    this.mundo?.fijarEntradaPaseo({ x: 0, y: 0 });
  };

  /** Termina el paseo; `reencuadrar` devuelve la cámara al foco (no hace falta si se va a enfocar otro). */
  private detenerPaseo(reencuadrar: boolean): void {
    if (!this.paseando) return;
    this.paseando = false;
    this.cercano = null;
    this.soltarTeclas();
    if (this.alTecladoPaseo) {
      window.removeEventListener('keydown', this.alTecladoPaseo);
      window.removeEventListener('keyup', this.alTecladoPaseo);
      this.alTecladoPaseo = null;
    }
    window.removeEventListener('blur', this.soltarTeclas);
    this.raiz?.classList.remove('paseando');
    if (reencuadrar) this.mundo?.terminarPaseo();
    if (this.raiz) this.pintarPanel();
  }

  /* ------------------------------------------------------------ pantalla completa y zoom */

  /** Pantalla completa del mapa: API nativa si el navegador la permite; si no, capa fija. */
  private async entrarPantallaCompleta(): Promise<void> {
    const raiz = this.raiz;
    if (!raiz || !this.activo3d) return;
    if (this.enPortada) this.fijarPortada(false);
    let nativa = false;
    try {
      if (raiz.requestFullscreen) {
        await raiz.requestFullscreen();
        nativa = document.fullscreenElement === raiz;
      }
    } catch {
      nativa = false;
    }
    if (!nativa) raiz.classList.add('pantalla-completa');
    this.fijarPantallaCompleta(true);
  }

  private async salirPantallaCompleta(): Promise<void> {
    this.raiz?.classList.remove('pantalla-completa');
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        /* ya no estaba en pantalla completa */
      }
    }
    this.fijarPantallaCompleta(false);
  }

  private fijarPantallaCompleta(activa: boolean): void {
    if (this.pantallaCompleta === activa) return;
    this.pantallaCompleta = activa;
    this.raiz?.classList.toggle('en-pantalla-completa', activa);
    this.aplicarZoom();
    if (this.raiz) this.pintarPanel();
  }

  /** La rueda hace zoom en pantalla completa o con el interruptor; si no, desplaza la página. */
  private aplicarZoom(): void {
    if (this.mundo) this.mundo.zoom = this.pantallaCompleta || this.zoomRueda;
  }

  private fijarPortada(activa: boolean): void {
    this.enPortada = activa;
    this.raiz?.classList.toggle('portada', activa);
    if (this.mundo) this.mundo.exploracion = !activa;
    this.actualizarInmersion();
  }

  /**
   * Regla única del índice lateral: solo se retira en la portada (sin explorar) mientras el mapa
   * domina la pantalla. Explorando, al bajar por la página o fuera de la portada, siempre se ve.
   */
  private actualizarInmersion(): void {
    const retirar = Boolean(this.raiz) && this.enPortada && this.mapaDomina;
    document.body.classList.toggle('portada-inmersiva', retirar);
    if (!retirar) document.body.classList.remove('menu');
  }

  /** Mientras el mapa domina la pantalla, la barra lateral se retira y el mundo ocupa todo el ancho. */
  private vigilarInmersion(vista: HTMLElement): void {
    // Cualquier clic (no arrastre) sobre el mapa de la portada entra en la exploración.
    if (!vista.dataset.portadaLista) {
      vista.dataset.portadaLista = '1';
      let inicio: { x: number; y: number } | null = null;
      vista.addEventListener('pointerdown', (e) => (inicio = { x: e.clientX, y: e.clientY }));
      // Zoom puntual con Ctrl/⌘ + rueda cuando el zoom libre está desactivado.
      vista.addEventListener(
        'wheel',
        (e) => {
          if (this.enPortada || !this.activo3d || this.pantallaCompleta || this.zoomRueda) return;
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            this.mundo!.zoomPuntual(e.deltaY);
          } else if (!this.pistaZoomMostrada) {
            this.pistaZoomMostrada = true;
            const pista = this.raiz?.querySelector<HTMLElement>('[data-pista-zoom]');
            if (pista) {
              pista.hidden = false;
              setTimeout(() => (pista.hidden = true), 2600);
            }
          }
        },
        { passive: false },
      );
      vista.addEventListener('pointerup', (e) => {
        if (this.enPortada && inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) <= 6 && !(e.target as Element).closest('.ver-intro, .mundo-acciones')) {
          // Clic en el mapa de la portada: pantalla completa y exploración.
          void this.entrarPantallaCompleta();
        }
        inicio = null;
      });
    }
    this.observadorPortada?.disconnect();
    this.observadorPortada = new IntersectionObserver(
      ([e]) => {
        this.mapaDomina = Boolean(e && e.intersectionRatio >= 0.55);
        this.actualizarInmersion();
      },
      { threshold: [0, 0.55, 1] },
    );
    this.observadorPortada.observe(vista);
  }

  /* ------------------------------------------------------------ navegación */

  private enfocar(foco: Foco): void {
    if (this.enPortada) this.fijarPortada(false);
    // Si se va a mano a una parada del recorrido, el recorrido sigue desde ahí.
    if (this.recorrido && foco.nivel === 'edificio') {
      const k = this.recorrido.ids.indexOf(foco.conceptoId);
      if (k >= 0 && k !== this.recorrido.i) {
        this.recorrido.i = k;
        this.mundo?.fijarRecorrido(this.recorrido.ids, k);
      }
    }
    if (this.paseando) this.detenerPaseo(false);
    if (!igualFoco(foco, this.foco)) this.pasoHistoria = 0;
    this.foco = foco;
    this.pintarPanel();
    if (this.activo3d) this.mundo!.enfocar(foco, this.vistaAtlas ? 'atlas' : 'maqueta', true);
  }

  private subir(): boolean {
    const padre = focoPadre(this.modelo, this.foco);
    if (!padre) return false;
    this.enfocar(padre);
    return true;
  }

  private alSeleccionar(s: DatosSeleccionables): void {
    // En la portada, el primer clic solo entra en la ciudad (lo gestiona `vigilarInmersion`).
    if (this.enPortada) return;
    // Paseando, un clic en un edificio muestra su ficha sin sacar del paseo.
    if (this.paseando) {
      if (s.tipo === 'edificio') {
        this.cercano = s.conceptoId;
        this.pintarFicha();
      }
      return;
    }
    if (s.tipo === 'edificio') {
      const foco: Foco = { nivel: 'edificio', conceptoId: s.conceptoId };
      // Segundo toque sobre el edificio ya enfocado: entrar al concepto.
      if (igualFoco(foco, this.foco)) location.hash = hrefConcepto(s.conceptoId);
      else this.enfocar(foco);
    } else {
      this.enfocar({ nivel: 'zona', seccionId: s.seccionId });
    }
  }

  private alSobrevolar(s: DatosSeleccionables | null): void {
    const foco: Foco | null = s?.tipo === 'edificio'
      ? { nivel: 'edificio', conceptoId: s.conceptoId }
      : s?.tipo === 'zona'
        ? { nivel: 'zona', seccionId: s.seccionId }
        : null;
    if ((foco && this.vistazo && igualFoco(foco, this.vistazo)) || (!foco && !this.vistazo)) return;
    this.vistazo = foco;
    this.pintarFicha();
    if (!this.paseando) this.pintarEtiquetas();
  }

  /**
   * Ficha contextual en una esquina del visor: lo que se señala (vistazo) o, si no, lo que está
   * seleccionado. En la vista general sin nada señalado no hay ficha: solo la ciudad.
   */
  private pintarFicha(): void {
    const el = this.raiz?.querySelector<HTMLElement>('[data-mundo-ficha]');
    if (!el) return;
    if (this.paseando) {
      const html = this.cercano ? fichaContextual(this.modelo, { nivel: 'edificio', conceptoId: this.cercano }, 'seleccion') + `<p class="ficha-pista">${matchMedia('(pointer: coarse)').matches ? 'Pulsa «Entrar»' : 'Pulsa E para entrar'}</p>` : '';
      el.innerHTML = html;
      el.hidden = !html;
      el.classList.remove('vistazo');
      el.removeAttribute('aria-hidden');
      this.colocarEtiquetas();
      return;
    }
    const vistazo = this.vistazo && !igualFoco(this.vistazo, this.foco) ? this.vistazo : null;
    const noche = this.activo3d ? this.pendientes() : null;
    const html = this.recorrido && !vistazo
      ? fichaRecorrido(this.modelo, this.recorrido.ids, this.recorrido.i)
      : noche
      ? fichaNocturna(this.modelo, vistazo ?? this.foco, vistazo ? 'vistazo' : 'seleccion', noche)
      : vistazo
        ? fichaContextual(this.modelo, vistazo, 'vistazo')
        : this.foco.nivel !== 'ciudad'
          ? fichaContextual(this.modelo, this.foco, 'seleccion')
          : '';
    el.innerHTML = html;
    el.hidden = !html;
    el.classList.toggle('vistazo', Boolean(vistazo));
    if (vistazo) el.setAttribute('aria-hidden', 'true');
    else el.removeAttribute('aria-hidden');
    // La ficha cambia de tamaño: los rótulos se recolocan para no quedar debajo.
    this.colocarEtiquetas();
  }

  private alPulsar(e: Event): void {
    const objetivo = (e.target as Element).closest<HTMLButtonElement>('button');
    if (!objetivo || objetivo.disabled) return;
    const { dataset } = objetivo;
    // Desde la portada, cualquier acción de la barra (salvo la pantalla completa, que lo hace sola)
    // entra en la exploración, para que se vean la barra completa, los rótulos y la ficha.
    if (this.enPortada && objetivo.closest('.mundo-acciones') && !('mundoCompleta' in dataset)) this.fijarPortada(false);
    if (dataset.foco) {
      const foco = decodificarFoco(this.modelo, dataset.foco);
      if (foco) this.enfocar(foco);
    } else if ('mundoSubir' in dataset) {
      this.subir();
    } else if ('mundoAtlas' in dataset) {
      this.vistaAtlas = !this.vistaAtlas;
      this.pintarPanel();
      if (this.activo3d) this.mundo!.enfocar(this.foco, this.vistaAtlas ? 'atlas' : 'maqueta', true);
    } else if ('mundoCompleta' in dataset) {
      if (this.pantallaCompleta) void this.salirPantallaCompleta();
      else void this.entrarPantallaCompleta();
    } else if ('mundoZoom' in dataset) {
      this.zoomRueda = !this.zoomRueda;
      escribirJson(this.almacen, CLAVE_ZOOM, this.zoomRueda);
      this.aplicarZoom();
      this.pintarPanel();
    } else if ('mundoAmbiente' in dataset) {
      this.modo = siguienteAmbiente(this.modo);
      if (this.raiz) this.raiz.dataset.ambiente = this.ambiente;
      this.mundo?.fijarAmbiente(this.ambiente, true);
      this.mundo?.fijarPendientes(this.pendientes());
      this.aviso(this.modo === 'noche' ? 'Modo repaso: solo se encienden los edificios con algo que repasar hoy.' : 'Modo aprender: la ciudad completa del temario.');
      this.pintarPanel();
      this.raiz?.querySelector<HTMLButtonElement>('[data-mundo-ambiente]')?.focus();
    } else if ('mundoPaseo' in dataset) {
      if (this.paseando) this.detenerPaseo(true);
      else this.empezarPaseo();
    } else if (dataset.recorrido) {
      this.moverRecorrido(dataset.recorrido);
    } else if ('mundoRecorrido' in dataset) {
      this.moverRecorrido(this.recorrido ? 'salir' : 'empezar');
    } else if ('verIntro' in dataset) {
      // Volver a ver la intro (desde la portada).
      if (this.activo3d && !this.reducido) {
        this.foco = FOCO_CIUDAD;
        this.lanzarIntro(Promise.resolve(true));
      }
    } else if (dataset.historia) {
      this.pasoHistoria = Math.max(0, this.pasoHistoria + Number(dataset.historia));
      this.pintarPanel();
      this.raiz?.querySelector<HTMLButtonElement>(`[data-historia="${dataset.historia}"]:not(:disabled)`)?.focus();
    }
  }

  /* ------------------------------------------------------------ pintado */

  private etiquetaFoco(f: Foco): string {
    switch (f.nivel) {
      case 'ciudad':
        return MARCA.ciudad;
      case 'barrio':
        return buscarBarrio(this.modelo, f.grupoId)?.titulo ?? '';
      case 'zona': {
        const z = buscarZona(this.modelo, f.seccionId);
        return z ? `${z.seccionId} ${z.titulo}` : '';
      }
      case 'edificio':
        return buscarEdificio(this.modelo, f.conceptoId)?.nombre ?? '';
    }
  }

  private pintarPanel(): void {
    if (!this.raiz) return;
    const migas: Miga[] = cadenaFoco(this.modelo, this.foco).map((foco) => ({ foco, etiqueta: this.etiquetaFoco(foco) }));
    this.el('[data-mundo-barra]').innerHTML = barraMundo({
      migas,
      puedeSubir: this.foco.nivel !== 'ciudad',
      modo3d: this.modo3d,
      disponible3d: this.disponible3d,
      vistaAtlas: this.vistaAtlas,
      paseando: this.paseando,
      pantallaCompleta: this.pantallaCompleta,
      zoomRueda: this.zoomRueda,
      ambiente: this.ambiente,
      recorrido: Boolean(this.recorrido),
    });

    let historia = '';
    if (this.foco.nivel === 'edificio') {
      const h = historiaDeConcepto(this.estado.tema, this.foco.conceptoId);
      if (h) {
        this.pasoHistoria = Math.min(this.pasoHistoria, h.pasos.length - 1);
        historia = historiaHtml(h, this.estado.tema.modos, this.pasoHistoria);
      }
    }
    this.el('[data-atlas]').innerHTML = atlasHtml(vistaAtlas(this.modelo, this.foco), historia);
    this.pintarEtiquetas();
    this.pintarFicha();
  }

  /** Etiquetas flotantes del nivel actual (ver `etiquetasDelNivel`). */
  private pintarEtiquetas(): void {
    const capa = this.raiz?.querySelector<HTMLElement>('[data-mundo-etiquetas]');
    if (!capa) return;
    const f = this.foco;
    this.modoMapa = this.vistaAtlas || (this.mundo?.factorAtlas ?? 0) > 0.5;
    capa.innerHTML = '';
    const noche = this.activo3d ? this.pendientes() : null;
    const rec = this.activo3d ? this.recorrido : null;
    const focos = rec
      ? rec.ids.map((conceptoId): Foco => ({ nivel: 'edificio', conceptoId }))
      : noche ? etiquetasNocturnas(this.modelo, f, noche) : etiquetasDelNivel(this.modelo, f, this.modoMapa);
    // El edificio que señala el puntero lleva siempre su nombre, en cualquier nivel.
    const v = this.vistazo;
    if (v?.nivel === 'edificio' && !focos.some((x) => igualFoco(x, v))) focos.push(v);
    this.etiquetas = focos.map((foco) => {
      const el = document.createElement('button');
      el.type = 'button';
      el.tabIndex = -1;
      el.className = 'm-etq';
      el.dataset.foco = codificarFoco(foco);
      if (foco.nivel === 'barrio') {
        // Rótulo de barrio: discreto, como el nombre de un distrito en un plano. Sin cifras.
        const b = buscarBarrio(this.modelo, foco.grupoId)!;
        const [numero, nombre] = separarTitulo(b.titulo);
        el.classList.add('barrio');
        el.innerHTML = `<span class="m-num">${numero}</span><span class="m-largo">${nombre}</span>`;
        el.setAttribute('aria-label', b.titulo);
      } else if (foco.nivel === 'zona') {
        const z = buscarZona(this.modelo, foco.seccionId)!;
        el.innerHTML = `<span class="m-num">${z.seccionId}</span><span class="m-largo">${z.titulo}</span>`;
      } else if (foco.nivel === 'edificio') {
        el.textContent = buscarEdificio(this.modelo, foco.conceptoId)!.nombre;
        el.classList.add('edificio');
        const paso = rec ? rec.ids.indexOf(foco.conceptoId) : -1;
        if (paso >= 0) {
          // Recorrido: cada parada con su número; la actual destacada y el resto atenuado.
          el.insertAdjacentHTML('afterbegin', `<b class="m-paso">${paso + 1}</b> `);
          el.classList.add('paso');
          el.classList.toggle('tenue', paso !== rec!.i);
        }
        const p = noche?.get(foco.conceptoId);
        if (p?.total) {
          // De noche, cada rótulo dice cuánto hay que repasar.
          el.classList.add('pendiente');
          el.classList.toggle('sorpresa', p.sorpresas > 0);
          el.insertAdjacentHTML('beforeend', ` <b class="m-pend">${p.total}</b>`);
        }
        if (f.nivel === 'edificio') el.classList.toggle('tenue', !igualFoco(foco, f));
        if (v && igualFoco(foco, v)) el.classList.add('sobrevuelo');
      }
      capa.append(el);
      return { foco, el };
    });
    this.colocarEtiquetas();
  }

  private colocarEtiquetas(): void {
    if (!this.activo3d) return;
    // Al alejarse, la ciudad pasa a leerse como mapa y cambian las etiquetas.
    if ((this.vistaAtlas || this.mundo!.factorAtlas > 0.5) !== this.modoMapa) return this.pintarEtiquetas();
    // Reglas: dentro del visor, sin pisarse entre sí y sin quedar debajo de la ficha. Primero se
    // colocan los rótulos principales (no atenuados); los secundarios que no caben se ocultan.
    const capa = this.raiz?.querySelector<HTMLElement>('[data-mundo-etiquetas]');
    if (!capa) return;
    const W = capa.clientWidth;
    const H = capa.clientHeight;
    const fichaEl = this.raiz?.querySelector<HTMLElement>('[data-mundo-ficha]');
    const ficha = fichaEl && !fichaEl.hidden && fichaEl.offsetWidth
      ? { x0: fichaEl.offsetLeft - 4, x1: fichaEl.offsetLeft + fichaEl.offsetWidth + 4, y0: fichaEl.offsetTop - 4, y1: fichaEl.offsetTop + fichaEl.offsetHeight + 4 }
      : null;
    type Caja = { x0: number; x1: number; y0: number; y1: number };
    // Margen entre rótulos: más aire en pantallas estrechas para que no formen una maraña.
    const m = W < 600 ? 4 : 1;
    const pisa = (a: Caja, b: Caja) => a.x0 - m < b.x1 && a.x1 + m > b.x0 && a.y0 - m < b.y1 && a.y1 + m > b.y0;
    const colocadas: Caja[] = [];
    const puntos = this.etiquetas
      // En pantallas estrechas los nombres de edificio son secundarios (se ocultan si no caben),
      // salvo el que se señala.
      .map(({ foco, el }) => ({
        el,
        p: this.mundo!.proyectarFoco(foco),
        principal: !el.classList.contains('tenue') && (W >= 600 || !el.classList.contains('edificio') || el.classList.contains('sobrevuelo') || el.classList.contains('pendiente')),
      }))
      .sort((a, b) => Number(b.principal) - Number(a.principal) || a.p.y - b.p.y);
    for (const { el, p, principal } of puntos) {
      el.hidden = !p.visible;
      if (!p.visible) continue;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const x = Math.round(Math.min(Math.max(p.x, w / 2 + 6), W - w / 2 - 6));
      const y0 = Math.round(Math.min(Math.max(p.y, h + 6), H - 6));
      let y = y0;
      let caja: Caja = { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y };
      // Se baja lo justo para no pisar otro rótulo (unas pocas veces como mucho).
      for (let intento = 0; intento < 6; intento++) {
        const choque = colocadas.find((c) => pisa(caja, c));
        if (!choque) break;
        y = Math.round(choque.y1 + h + 3);
        caja = { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y };
      }
      if (ficha && pisa(caja, ficha)) {
        // Los principales suben por encima de la ficha; los secundarios se ocultan.
        if (principal && ficha.y0 - 6 > h) {
          y = Math.round(ficha.y0 - 6);
          caja = { x0: x - w / 2, x1: x + w / 2, y0: y - h, y1: y };
        } else {
          el.hidden = true;
          continue;
        }
      }
      const desplazado = Math.abs(y - y0) > h * 3;
      if (y > H - 4 || colocadas.some((c) => pisa(caja, c)) || (!principal && desplazado)) {
        el.hidden = true;
        continue;
      }
      colocadas.push(caja);
      // Píxeles enteros: sin temblor de las etiquetas al mover la cámara.
      el.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
    }
  }

  private el(selector: string): HTMLElement {
    return this.raiz!.querySelector<HTMLElement>(selector)!;
  }
}
