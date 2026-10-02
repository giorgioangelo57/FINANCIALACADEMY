import { GLYPHS } from '../icons/glyphs.ts';
import type { Tema } from './schema.ts';

/** Devuelve la lista de incoherencias del tema; vacía si es válido. */
export function validarTema(tema: Tema): string[] {
  const errores: string[] = [];
  const duplicados = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i);

  for (const id of duplicados(tema.grupos.map((g) => g.id))) errores.push(`Grupo duplicado: ${id}`);
  for (const id of duplicados(tema.secciones.map((s) => s.id))) errores.push(`Sección duplicada: ${id}`);
  for (const id of duplicados(tema.conceptos.map((c) => c.id))) errores.push(`Concepto duplicado: ${id}`);

  const grupos = new Set(tema.grupos.map((g) => g.id));
  for (const s of tema.secciones) {
    if (!grupos.has(s.grupoId)) errores.push(`Sección ${s.id}: grupo inexistente ${s.grupoId}`);
    if (!(s.pesoExamen >= 0)) errores.push(`Sección ${s.id}: peso no válido`);
  }

  const secciones = new Set(tema.secciones.map((s) => s.id));
  for (const c of tema.conceptos) {
    if (!secciones.has(c.seccionId)) errores.push(`Concepto ${c.id}: sección inexistente ${c.seccionId}`);
    for (const g of c.iconos) if (!(g in GLYPHS)) errores.push(`Concepto ${c.id}: glifo inexistente ${g}`);
    if (c.explicaciones.length !== tema.modos.length) {
      errores.push(`Concepto ${c.id}: ${c.explicaciones.length} explicaciones para ${tema.modos.length} modos`);
    }
    const { opciones, indiceCorrecta } = c.pregunta;
    if (!Number.isInteger(indiceCorrecta) || indiceCorrecta < 0 || indiceCorrecta >= opciones.length) {
      errores.push(`Concepto ${c.id}: respuesta correcta fuera de rango`);
    }
  }

  const conceptos = new Set(tema.conceptos.map((c) => c.id));
  for (const e of tema.ciudad.edificios) {
    if (!conceptos.has(e.conceptoId)) errores.push(`Edificio: concepto inexistente ${e.conceptoId}`);
  }

  const a = tema.ampliacion;
  if (a) {
    const suma = a.bloques.reduce((t, b) => t + b.probabilidad, 0);
    if (suma !== 100) errores.push(`Bloques de examen: las probabilidades suman ${suma}, no 100`);
    const enBloques = a.bloques.flatMap((b) => b.conceptoIds);
    for (const id of duplicados(enBloques)) errores.push(`Concepto en dos bloques: ${id}`);
    for (const c of tema.conceptos) if (!enBloques.includes(c.id)) errores.push(`Concepto sin bloque de examen: ${c.id}`);
    for (const id of enBloques) if (!conceptos.has(id)) errores.push(`Bloque: concepto inexistente ${id}`);
    for (const id of duplicados(a.preguntas.map((p) => p.id))) errores.push(`Pregunta duplicada: ${id}`);
    for (const p of a.preguntas) {
      if (!conceptos.has(p.conceptoId)) errores.push(`Pregunta ${p.id}: concepto inexistente`);
      if (!Number.isInteger(p.indiceCorrecta) || p.indiceCorrecta < 0 || p.indiceCorrecta >= p.opciones.length) errores.push(`Pregunta ${p.id}: respuesta fuera de rango`);
      if (new Set(p.opciones).size !== p.opciones.length) errores.push(`Pregunta ${p.id}: opciones repetidas`);
    }
    for (const f of a.flashcards) if (!conceptos.has(f.conceptoId)) errores.push(`Flashcard ${f.id}: concepto inexistente`);
    for (const e of a.esquemas) if (!conceptos.has(e.conceptoId)) errores.push(`Esquema ${e.titulo}: concepto inexistente`);
    const idsInfo = new Set<string>();
    for (const i of a.infografias ?? []) {
      if (idsInfo.has(i.id)) errores.push(`Infografía ${i.id}: id repetido`);
      idsInfo.add(i.id);
      for (const c of i.conceptoIds) if (!conceptos.has(c)) errores.push(`Infografía ${i.id}: concepto inexistente ${c}`);
      const actores = new Set(i.actores.map((x) => x.id));
      for (const x of i.actores) if (x.x < 0 || x.x > 100 || x.y < 0 || x.y > 100) errores.push(`Infografía ${i.id}: actor ${x.id} fuera del lienzo`);
      for (const f of i.flujos) if (!actores.has(f.desde) || !actores.has(f.hacia)) errores.push(`Infografía ${i.id}: flujo con actor inexistente (${f.desde} → ${f.hacia})`);
      if (!i.pasos.length) errores.push(`Infografía ${i.id}: sin pasos`);
      i.pasos.forEach((p, k) => {
        for (const id of p.actores) if (!actores.has(id)) errores.push(`Infografía ${i.id}, paso ${k + 1}: actor inexistente ${id}`);
        for (const n of p.flujos) if (!i.flujos[n]) errores.push(`Infografía ${i.id}, paso ${k + 1}: flujo ${n} inexistente`);
        for (const n of p.grupos ?? []) if (!i.grupos?.[n]) errores.push(`Infografía ${i.id}, paso ${k + 1}: grupo ${n} inexistente`);
      });
    }
  }

  return errores;
}
