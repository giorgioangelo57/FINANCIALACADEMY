# Esquema del tema: análisis y propuesta (sin implementar)

Objetivo: una vista que muestre la estructura del tema de un vistazo (qué contiene, cómo se
organiza, qué pesa y qué sé) usando solo lo que DATA respalda. Este documento analiza los datos
disponibles y propone una arquitectura. No hay código.

## 1. Qué datos y relaciones existen realmente en DATA

| Dato | Origen | Cantidad | Uso posible en el esquema |
|---|---|---|---|
| Grupo → sección | `Seccion.grupoId` | 4 grupos, 12 secciones | Ramas principales |
| Sección → concepto | `Concepto.seccionId` | 45 conceptos | Hojas |
| Orden de secciones y de conceptos | Orden de los arrays | Total | Recorrido de lectura (ya lo usa el paginador anterior/siguiente) |
| Peso en examen | `Seccion.pesoExamen` | 12 valores, suma 100 | Superficie o anchura de cada rama |
| Descripción de sección | `Seccion.descripcion` | 12 textos | Subtítulo de cada rama |
| Dominio | Progreso (`domain/mastery.ts`) | Por concepto: 0 / 0,5 / 1 | Estado de cada hoja |
| Prioridad de estudio | `seccionesPrioritarias` | Orden completo | Señal "siguiente recomendación" |
| Glifos | `Concepto.iconos` | 1–3 por concepto | Familia visual (la gramática de la portada); no es una relación académica |
| Esquema visual de cada concepto | `explicaciones[2]` | ~30 cadenas analizables | Entidades y flujos dentro de un concepto (ya en `experiences/esquema.ts`) |
| Edificios de la portada | `tema.ciudad` | 12 | Landmarks |

## 2. Relaciones que no existen (no deben inventarse)

- **Relaciones tipadas entre conceptos.** DATA no dice "A supervisa a B", "A forma parte de B" ni
  "A se opone a B". Las únicas jerarquías explícitas son grupo → sección → concepto.
- **Peso por concepto.** Solo existe por sección. Repartirlo entre conceptos sería inventarlo.
- **Prerrequisitos.** No hay orden pedagógico obligatorio, solo el orden de presentación.
- **Menciones de texto.** Un análisis literal encuentra 72 menciones de un concepto en los textos de
  otro (p. ej. `bce → eurosistema`, `estructura-b → ico`, `dgsfp → cnmv`). Existen, pero **no tienen
  tipo** y algunas son contrastes de examen ("no es la CNMV"). Pueden mostrarse como "aparece en"
  solo si se valida cada una; no como relación con significado.
- **Relaciones entre esquemas.** Las entidades de los esquemas ("Ahorrador", "🏦", "Empresa") son
  texto literal, no identificadores de conceptos; enlazarlas con edificios requiere validación manual.

Las dos últimas quedan registradas en `docs/decisiones-pendientes.md`.

## 3. Propuesta de arquitectura

### Modelo (puro, en `src/world/`)

Reutilizar lo existente en lugar de crear un sistema paralelo:

- `vistaAtlas(m, foco)` (`world/atlas.ts`) ya agrega peso, dominio, estudiados y prioridad por
  nivel. El esquema es la misma información para **todos los niveles a la vez**.
- Nuevo `esquemaTema(m): NodoEsquema` que recorre `ModeloCiudad` (barrios → zonas → edificios) y
  devuelve un árbol con, por nodo: `foco` (el mismo tipo `Foco`), `etiqueta`, `pesoExamen | null`,
  `dominio`, `fase`, `prioridad`, `href`. Sin datos nuevos: todo sale de `modeloCiudad`.
- Relaciones opcionales en una capa separada (`relaciones: Arista[]`), vacía por defecto. Solo se
  rellenaría con relaciones validadas y con su fuente literal, como ya hacen las historias.

### Representación

Un plano esquemático de la ciudad, no un diagrama de nodos genérico:

- Columnas por barrio con anchura proporcional al peso del grupo; dentro, bloques por sección con
  altura proporcional a su peso (mismo treemap que la ciudad, `world/geometry.ts`).
- Cada concepto es una marca pequeña dentro de su sección, con el estado de dominio en forma
  (hueca = en proyecto, media = en obra, llena = construida) y no solo en color.
- La recomendación de estudio se marca con el mismo oro que la columna de luz.
- Al pasar el ratón: la misma ficha contextual (`ui/world/contextCard.ts`). Al pulsar: el mismo
  `Foco`, así que la ciudad y el Atlas se enfocan en el mismo sitio.

### Integración con la barra lateral

La barra lateral (`ui/components/rail.ts`) ya lista grupo → sección con peso y barra de dominio.
Propuesta:

1. El esquema **no sustituye** a la barra; la barra sigue siendo la navegación accesible
   principal por secciones.
2. Añadir en la cabecera de la barra (junto al anillo de dominio global) un acceso "Esquema" que
   abra la vista en la portada, en el mismo contenedor del mundo (un cuarto modo junto a maqueta,
   Atlas y 2D).
3. Opcional: miniatura del esquema en la barra, con la sección actual resaltada. Pendiente de
   decisión (ver `decisiones-pendientes.md`), porque cambia el diseño literal del prototipo.

### Piezas compartidas con la ciudad y el Atlas

| Pieza | Archivo | Uso en el esquema |
|---|---|---|
| `Foco`, `codificarFoco`, `cadenaFoco` | `world/focus.ts` | Selección y migas comunes |
| `ModeloCiudad` | `world/cityModel.ts` | Fuente única de peso, dominio, fase y prioridad |
| `particionar` (treemap) | `world/geometry.ts` | Misma proporción de superficie que la ciudad |
| `vistaAtlas` | `world/atlas.ts` | Resumen del nivel seleccionado |
| `fichaContextual` | `ui/world/contextCard.ts` | Información al señalar |
| `TEXTO_FASE`, `TEXTO_NIVEL` | `ui/world/worldPanel.ts` | Mismo vocabulario de estado |
| Tokens `--m-*` | `styles/world.css` | Misma identidad visual |

## 4. Accesibilidad y alternativa

El esquema es HTML/SVG, no WebGL: funciona sin 3D y con movimiento reducido. Debe ser navegable con
teclado como una lista anidada (`<ol>` por niveles) con los mismos datos que el dibujo.

## 5. Siguientes pasos (cuando se apruebe)

1. `esquemaTema()` + tests (suma de pesos = 100, 45 hojas, focos válidos).
2. Vista SVG con el treemap y marcas de estado.
3. Acceso desde la barra lateral.
4. Decidir si se muestran las menciones de texto validadas.
