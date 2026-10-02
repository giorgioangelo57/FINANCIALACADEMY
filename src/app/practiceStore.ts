import type { Tema } from '../content/schema.ts';
import {
  calificarTarjeta,
  type Confianza,
  fechaDe,
  fijarFechaExamen,
  type Practica,
  registrarRespuesta,
  registrarSimulacro,
  tarjetasPendientes,
} from '../domain/practice.ts';
import { cargarPractica, guardarPractica } from '../persistence/practiceRepository.ts';
import type { AlmacenClaveValor } from '../persistence/storage.ts';
import { tarjetasDe } from '../ui/components/conceptPanels.ts';

/**
 * Estado de la práctica del tema (repaso de fallos, flashcards espaciadas y simulacros), junto al
 * de estudio. Cada cambio se guarda y avisa a quien escuche (p. ej. la insignia del índice).
 */
export class EstadoPractica {
  private actual: Practica;
  private readonly oyentes = new Set<() => void>();

  constructor(
    readonly tema: Tema,
    private readonly almacen: AlmacenClaveValor | null,
    private readonly hoy: () => string = () => fechaDe(new Date()),
  ) {
    this.actual = cargarPractica(almacen, tema.meta.numero);
  }

  get practica(): Practica {
    return this.actual;
  }

  get fecha(): string {
    return this.hoy();
  }

  escuchar(fn: () => void): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  /**
   * Resultado de responder una pregunta de cualquier sitio: alimenta el repaso, la repetición
   * espaciada, la calibración (si se indicó la confianza) y la actividad.
   */
  responder(idPregunta: string, correcta: boolean, extra: { conceptoId?: string; confianza?: Confianza; repaso?: boolean } = {}): void {
    const conceptoId = extra.conceptoId ?? (idPregunta.startsWith('oficial:') ? idPregunta.slice(8) : this.conceptoDe(idPregunta));
    this.cambiar(registrarRespuesta(this.actual, { id: idPregunta, conceptoId, correcta, confianza: extra.confianza, hoy: this.hoy(), repaso: extra.repaso }));
  }

  fechaExamen(fecha: string | undefined): void {
    this.cambiar(fijarFechaExamen(this.actual, fecha));
  }

  private conceptoDe(idExtra: string): string | undefined {
    return this.tema.ampliacion?.preguntas.find((p) => p.id === idExtra)?.conceptoId;
  }

  calificar(idTarjeta: string, sabia: boolean): void {
    this.cambiar(calificarTarjeta(this.actual, idTarjeta, sabia, this.hoy()));
  }

  simulacro(aciertos: number, total: number): void {
    this.cambiar(registrarSimulacro(this.actual, { fecha: this.hoy(), aciertos, total }));
  }

  /** Ids de todas las tarjetas del tema, en el orden de los conceptos. */
  idsTarjetas(): string[] {
    return this.tarjetasDelTema().map((t) => t.id);
  }

  /** Tarjetas del tema con su concepto (para intercalarlas en la sesión). */
  tarjetasDelTema(): { id: string; conceptoId: string }[] {
    return this.tema.conceptos.flatMap((c) => tarjetasDe(c, this.tema).map((t) => ({ id: t.id, conceptoId: c.id })));
  }

  tarjetasDeHoy(): string[] {
    return tarjetasPendientes(this.idsTarjetas(), this.actual, this.hoy());
  }

  /** Lo pendiente de repasar hoy: preguntas falladas + tarjetas que tocan. */
  pendientes(): number {
    return Object.keys(this.actual.fallos).length + this.tarjetasDeHoy().length;
  }

  private cambiar(nueva: Practica): void {
    if (nueva === this.actual) return;
    this.actual = nueva;
    guardarPractica(this.almacen, this.tema.meta.numero, nueva);
    for (const fn of this.oyentes) fn();
  }
}
