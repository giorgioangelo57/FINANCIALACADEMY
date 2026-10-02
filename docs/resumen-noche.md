# Resumen de la noche 2 (02/10)

**Peticiones:**
- "Dedícate la noche entera a pensar y solucionar errores: no se muestran correctamente los menús ni
  los cuadros están bien situados".
- "Trabajar en automático toda la noche en investigar e implementar métodos más óptimos de estudio".

**Dónde está:**
- Cola: `docs/cola-trabajo.md` (tareas 11–18), todas hechas.
- Vista previa en el mismo enlace: https://claude.ai/artifact/Xkte8QVBzTan8pEMPuKg1i
- PR: https://github.com/giorgioangelo57/FINANCIALACADEMY/pull/1

## 1. Menús y cuadros
Auditoría con capturas a 1400, 1024, 820 y 390 px de portada, exploración, barrio, zona, secciones,
predicción, simulacro, repaso, menú móvil y modo 2D. Fallos encontrados y corregidos:

| Fallo | Corrección |
|---|---|
| La barra del mapa (migas + 5 botones) se partía en 2–3 líneas, y en móvil ocupaba media pantalla | Dos filas fijas, cada una desplazable en horizontal. En móvil, solo el nivel actual, y sin "Zoom con rueda" en pantallas táctiles |
| Rótulos de edificios fuera del visor, amontonados o tapados por la ficha | Se colocan dentro del visor, sin pisarse, y nunca debajo de la ficha. En móvil, los secundarios que no caben se ocultan |
| En móvil la ficha tapaba medio mapa | Ficha compacta: título, estado y acción |
| Pista de la portada pegada al borde en móvil | Centrada y con margen |
| En Examen, Simulacro o Repaso el índice no mostraba dónde estabas (grupo al final) | El índice lleva a la vista el apartado activo |
| Desplazamiento horizontal de 2 px en algunas secciones en móvil | Recorte horizontal a nivel de página |

## 2. Métodos de estudio (investigación en `docs/metodos-estudio.md`)

| Técnica (evidencia) | Qué hay ahora en la app |
|---|---|
| **Práctica de recuperación** y **espaciado** (las de mayor utilidad, Dunlosky et al. 2013) | **🎯 Estudiar hoy** (`#sesion`): sesión de 10, 15 o 25 min que mezcla tu repaso, lo que toca repasar hoy, preguntas nuevas de lo que más cae y menos dominas, y flashcards. La repetición espaciada se aplica también a las preguntas |
| **Espaciado según la fecha del examen** (Cepeda et al. 2008: intervalo ≈ 10–20 % del plazo) | Fecha de examen opcional: los intervalos nunca superan el 20 % de los días que faltan |
| **Intercalado** (g = 0,42, mayor con categorías parecidas) | La sesión nunca pone dos preguntas seguidas del mismo concepto y alterna bloques. Incluye **"¿Cuál es?"**: identificar un concepto por su definición (nombre oculto) entre otros parecidos del mismo bloque |
| **Confianza / hipercorrección** (Butterfield y Metcalfe 2001) | Antes de corregir: "Seguro / Dudo / Adivino" en práctica, repaso, sesión y simulacros. Los errores con seguridad se avisan y se repasan primero; los aciertos sin seguridad vuelven al repaso. En el simulacro hay un gráfico "¿Sabías lo que sabías?" |
| **Pretest** (Richland, Kornell y Kao 2009) | 3 preguntas rápidas al abrir cada sección, antes de las fichas |
| **Generación / recuerdo libre** | **✍️ Escríbelo tú** en cada ficha: la definición se oculta, escribes de memoria y se compara con las ideas clave de DATA |
| **Metacognición y constancia** | **📈 Mi progreso** (`#progreso`): racha, actividad de 4 semanas, memoria a largo plazo, fiabilidad de tu seguridad (con lectura de exceso o falta de confianza), acierto por bloque y evolución de los simulacros |

## Garantías
- DATA y el formato del progreso no cambian.
- La práctica se guarda en `financial-academy:practica`, ampliada de forma compatible (los datos
  anteriores se leen bien; hay test).
- El dominio solo sube con "Compruébalo".

## Verificación
- 173 tests, typecheck y build correctos.
- `scripts/verificar-chromium.mjs` en verde, con comprobaciones nuevas de sesión, progreso, pretest y
  "Escríbelo tú" en escritorio y móvil, y sin errores de consola.

## Commits
- `3f120a3 Escríbelo tú (recuerdo libre) y pretest al abrir una sección`
- `b67587f Estudiar hoy (práctica espaciada e intercalada) y Mi progreso`
- `23b3a20 Confianza antes de corregir y calibración (metacognición)`
- `58afddc Investigación de métodos de estudio y cola de la noche 2`
- `c77172b Corrige menús y cuadros mal situados`

---

# Resumen de la noche (01→02/10)

Cola completada: tareas 1–7, 9 y 10. La tarea 8 (extender la gramática urbana a los barrios 1–3) es
opcional, necesita tu aprobación y **no se ha hecho**.

- **Rama:** `claude/quirky-lovelace-79c6fm`.
- **PR:** https://github.com/giorgioangelo57/FINANCIALACADEMY/pull/1 (descripción actualizada).
- **Vista previa** (mismo enlace, versión 4): https://claude.ai/artifact/Xkte8QVBzTan8pEMPuKg1i

## Qué se ha hecho

| # | Tarea | Commit |
|---|---|---|
| 1 | **Vertical slice del barrio 4.** Gramática urbana de Ensanche, landmarks con silueta propia, rótulos mínimos, ficha contextual, columna de luz para "Estudia ya", cámara por nivel, vista en corte y entrada cinematográfica | `ecc9d34` |
| 2 | **Verificación en Chromium** con `scripts/verificar-chromium.mjs`. Corrige un desbordamiento horizontal en móvil heredado del prototipo | `68fd767` |
| 3 | **Dirección de arte** documentada en `docs/fase-2-arquitectura.md` | `b9ca606` |
| 4 | **PR actualizada** y artefacto republicado | `ce7c0b5` |
| 5 | **Análisis y propuesta del Esquema del tema** (`docs/esquema-del-tema.md`), sin implementar | `1f9de4c` |
| 6 | **Storyboard de 8 fotogramas** de "Intermediación indirecta" con textos literales de DATA (`docs/microexperiencia-intermediacion.md`), sin implementar | `62ae927` |
| 7 | **Rendimiento:** sombras bajo demanda; al orbitar, de ~600 a 175 llamadas de dibujo por fotograma. Corrige un fallo al salir de la portada durante la entrada. Tests nuevos | `eac7aaa` |
| 9 | **Portada como landing** (tu mensaje de esta noche): el mapa a pantalla completa, un clic para explorar, el scroll revela el tema y la barra lateral | `b0edc0a` |
| 10 | **Personaje jugable** (tu segundo mensaje): versión 3D peluda de tu dibujo, "Pasear" con WASD en tercera persona, colisiones, ficha del edificio cercano y E para entrar a estudiarlo | `ceb8adc` |

El plan de cierre del slice se conserva en `docs/plan-cierre-slice.md`.

## Archivos principales

- **Personaje:** `src/scene/three/avatar.ts` y `src/world/paseo.ts` (nuevos).
- **Modelo:** `src/world/urban.ts` (nuevo), `cityModel.ts`, `labels.ts`, `atlas.ts`.
- **Render:** `src/scene/three/taller.ts`, `urbanArchitecture.ts`, `urbanGround.ts` y `textures.ts`
  (nuevos); `architecture.ts`, `builders.ts`, `cityScene.ts` y `palette.ts`.
- **Interfaz:** `src/ui/world/contextCard.ts` (nuevo), `worldPanel.ts`, `worldController.ts`,
  `src/styles/world.css`; `responsive.css` (corrección de móvil) y `homeView.ts` (el bloque del tema
  aparece con animación).
- **Tests:** `tests/world/urban.test.ts`, `tests/ui/contextCard.test.ts`, `tests/scene/urbanScene.test.ts`
  y `tests/app/portada.dom.test.ts` (nuevos); `labels`, `builders`, `cityModel` y `world.dom`
  (actualizados).
- **Documentación:** `fase-2-arquitectura.md`, `esquema-del-tema.md`, `microexperiencia-intermediacion.md`,
  `decisiones-pendientes.md`, `cola-trabajo.md`, `plan-cierre-slice.md` y este resumen.

DATA, el contenido académico, la persistencia y el router no se han tocado. Los tests de paridad
con el prototipo siguen pasando.

## Tests y build

- `npm test`: **114 tests** en verde (eran 93 al empezar la noche).
- `npm run typecheck`: limpio.
- `npm run build`: correcto. Three.js sigue en un fragmento aparte que se carga bajo demanda.
- `node scripts/verificar-chromium.mjs`: **23 de 23** comprobaciones en Chromium con WebGL.
  - Portada y scroll.
  - Escritorio y navegación.
  - Vuelta al mapa tras responder una pregunta.
  - Atlas.
  - Móvil sin desbordamiento.
  - Movimiento reducido, con 0 redibujados en reposo.
  - Sin WebGL.
  - Sin errores de consola.

## Problemas encontrados

- **Desbordamiento horizontal en móvil**, heredado del prototipo (los enlaces de "Estudia ya"). Corregido.
- **Salir de la portada durante la entrada cinematográfica** dejaba un escuchador de teclado
  colgado. Corregido.
- **La rueda del ratón sobre el mapa de la portada acercaba la cámara** en lugar de desplazar la
  página. Corregido: en la portada, el mapa no captura la rueda ni el gesto táctil.
- **El servidor de vista previa local** se detiene al alcanzar su tiempo máximo en segundo plano.
  No afecta al proyecto.

## Pendiente

- **Tu aprobación** para extender la gramática urbana a los barrios 1–3 (tarea 8).
- **Decisiones abiertas** en `docs/decisiones-pendientes.md`:
  - menciones de texto entre conceptos;
  - enlazar las entidades de los esquemas con edificios;
  - miniatura del esquema en la barra lateral;
  - el texto "Fase 1 de 6…" de la portada;
  - la "pregunta difícil" de las microexperiencias.
- **Implementar** el Esquema del tema y la microexperiencia 3D, cuando apruebes los documentos.
- **Paseo:** controles táctiles en móvil y colisiones con fuentes, árboles y bancos (ver decisiones 7 y 8).
- **Mejoras menores:**
  - resaltar el edificio al pasar el ratón;
  - storytelling por scroll más allá de la portada.

La rutina horaria `trig_01EsNSKvi2kqpUXensnJE3Xn` se ha desactivado al terminar la cola.
