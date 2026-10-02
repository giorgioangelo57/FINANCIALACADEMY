/** ¿Puede este navegador crear un contexto WebGL? (Sin cargar Three.js.) */
export function webglDisponible(): boolean {
  try {
    if (typeof document === 'undefined' || typeof WebGLRenderingContext === 'undefined') return false;
    const lienzo = document.createElement('canvas');
    const contexto = lienzo.getContext('webgl2') ?? lienzo.getContext('webgl');
    if (!contexto) return false;
    (contexto as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}
