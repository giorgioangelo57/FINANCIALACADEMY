/**
 * "Escríbelo tú" (recuerdo libre): se compara lo que el alumno escribe de memoria con las ideas
 * clave de la definición de DATA (los fragmentos en negrita). Es una ayuda para autoevaluarse,
 * no una nota: la última palabra la tiene el alumno ("La sabía" / "No la sabía").
 */

/** Minúsculas, sin acentos ni signos. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[^a-z0-9ñ%€\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Palabras que no aportan significado al comparar. */
const VACIAS = new Set(
  'a al algo ante con contra de del desde el en entre es la las lo los para por que se sin sobre su sus un una uno unos unas y o u e ni no si mas muy ya le les tambien como cual pero porque cada otro otra'.split(' '),
);

const tokens = (t: string) => normalizar(t).split(' ').filter((w) => w.length >= 3 && !VACIAS.has(w));

/** Ideas clave de una definición: sus fragmentos en negrita (sin las etiquetas tipo "Ventajas:"). */
export function ideasClave(definicionHtml: string): string[] {
  const negritas = [...definicionHtml.matchAll(/<b>(.*?)<\/b>/g)].map((m) => m[1]!.trim());
  const ideas = negritas.filter((b) => !/:\s*$/.test(b) && tokens(b).length > 0);
  if (ideas.length) return ideas;
  // Sin negritas útiles: las palabras más largas de la definición.
  return [...new Set(tokens(definicionHtml).filter((w) => w.length >= 6))].slice(0, 6);
}

/** Una palabra del texto "cuenta" si comparte raíz (5 primeras letras) con la de la idea. */
const raiz = (w: string) => w.slice(0, Math.min(5, w.length));

export interface ResultadoRecuerdo {
  encontradas: string[];
  faltan: string[];
  /** Fracción de ideas clave presentes (0–1). */
  cobertura: number;
}

/**
 * Una idea está presente si aparecen al menos la mitad de sus palabras significativas (por raíz,
 * para admitir plurales y variaciones: "deposita" ≈ "depósito").
 */
export function compararRecuerdo(texto: string, ideas: string[]): ResultadoRecuerdo {
  const raices = new Set(tokens(texto).map(raiz));
  const encontradas: string[] = [];
  const faltan: string[] = [];
  for (const idea of ideas) {
    const palabras = tokens(idea);
    const presentes = palabras.filter((w) => raices.has(raiz(w))).length;
    (palabras.length && presentes / palabras.length >= 0.5 ? encontradas : faltan).push(idea);
  }
  return { encontradas, faltan, cobertura: ideas.length ? encontradas.length / ideas.length : 0 };
}

const escaparRegex = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Oculta el nombre de un concepto (y su sigla o alias entre paréntesis) dentro de un texto, para
 * preguntar "¿a qué concepto corresponde?" sin regalar la respuesta.
 */
export function ocultarNombre(texto: string, nombre: string, oculto = '▢▢▢'): string {
  const base = nombre.replace(/\s*\(.*?\)\s*/g, ' ').trim();
  const alias = [...nombre.matchAll(/\(([^)]+)\)/g)].map((m) => m[1]!.trim());
  let res = texto;
  for (const t of [base, ...alias].filter((x) => x.length >= 2).sort((a, b) => b.length - a.length)) {
    res = res.replace(new RegExp(`(^|[^\\p{L}])${escaparRegex(t)}(?=$|[^\\p{L}])`, 'giu'), `$1${oculto}`);
  }
  return res;
}
