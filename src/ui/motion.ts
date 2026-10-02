const CONSULTA = '(prefers-reduced-motion: reduce)';

function consulta(): MediaQueryList | null {
  try {
    return typeof matchMedia === 'function' ? matchMedia(CONSULTA) : null;
  } catch {
    return null;
  }
}

/** Preferencia del sistema de reducir el movimiento. */
export const movimientoReducido = (): boolean => consulta()?.matches ?? false;

/** Avisa cuando cambia la preferencia. Devuelve la función para dejar de escuchar. */
export function alCambiarMovimiento(oyente: (reducido: boolean) => void): () => void {
  const mq = consulta();
  if (!mq?.addEventListener) return () => {};
  const manejador = (e: MediaQueryListEvent) => oyente(e.matches);
  mq.addEventListener('change', manejador);
  return () => mq.removeEventListener('change', manejador);
}
