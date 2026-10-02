# Plan · Cierre del vertical slice de dirección de arte (barrio 4)

## Contexto
El usuario pidió una revisión profunda de la dirección de arte de La Ciudad del Dinero: una gramática visual propia
("Estudiar es construirla"), sin aspecto de app generada por IA. Se trabaja sobre `c30a940`, sin tocar DATA,
pesos, lógica de aprendizaje, persistencia, router, fallback 2D ni tests de paridad, y en **un único barrio**.
Se eligió el **barrio 4** porque contiene los 12 edificios históricos (landmarks).

La implementación está casi terminada **en el árbol de trabajo, sin commit**. Estado verificado en Chromium:
93 tests en verde, typecheck limpio y build correcto (última ejecución). Este plan cubre solo el cierre: revisión
final, documentación, commit, push y republicación.

## Ya implementado (sin commit)

### Modelo (puro)
- `src/world/urban.ts`: manzanas de Ensanche con patio, fachada continua, pasajes y antepatios. La superficie
  exacta por peso se conserva.
- `src/world/cityModel.ts`: `GRAMATICA_URBANA = {'4'}`; campos `composicion`, `manzanas`, `pasajes`, `patios`,
  `iconos` y `antepatio`; arbolado con motivo `patio`/`paseo`.
- `src/world/labels.ts`: ciudad → solo barrios; barrio → sus zonas; zona y edificio → nada.

### Render
- `scene/three/taller.ts`: piezas por rol (extraído de `architecture.ts`); mansarda, vanos y alféizares.
- `scene/three/urbanArchitecture.ts`: siete tipologías con vocabulario propio y rasgos por glifo
  (vault, handshake, truck, basket, store, chapel, umbrella, eye). Variantes:
  - torre central para `brain` (BCE);
  - rotonda para `cupula`.
- `scene/three/urbanGround.ts` + `textures.ts`: aceras con chaflán, losas, asfalto y césped procedurales.
  El rol `entorno` está siempre construido.
- `builders.ts`:
  - columnas de luz de "Estudia ya" en lugar de los pines;
  - coches aparcados (estáticos);
  - peatones según dominio.
- `cityScene.ts`:
  - óptica por nivel: mapa cenital, barrio isométrico con teleobjetivo, zona baja, edificio arquitectónico
    frente a la fachada;
  - transiciones con arco y FOV;
  - composición asimétrica (`setViewOffset`) y niebla de profundidad;
  - vista en corte (retira oclusores) y entrada cinematográfica saltable.

### Interfaz
- `ui/world/contextCard.ts`: ficha contextual de vistazo y de selección.
- `worldPanel.ts` + `world.css`: Atlas editorial sin tarjetas ni pills; leyenda en cuatro claves.
- `worldController.ts`: ficha, nueva política de rótulos y entrada de primera visita (`financial-academy:entrada`).

### Tests
- `tests/world/urban.test.ts`.
- Actualizados: `labels`, `builders`, `cityModel`.

## Pasos restantes
1. **Revisión visual pendiente.** Revisar la captura móvil `9-movil-mundo.png`: comprobar que ficha y rótulos no
   tapan la ciudad. Si hace falta, ajustar solo CSS (`@media (max-width:600px)` en `src/styles/world.css`).
2. **Tests.** Añadir un test DOM en `tests/app/world.dom.test.ts` para la ficha y la leyenda en el fallback 2D:
   leyenda `dl.mundo-leyenda` con 4 claves y ausencia de "📌" y de "%" en los rótulos.
3. **Documentación.** Ampliar `docs/fase-2-arquitectura.md` con una sección "Dirección de arte (vertical slice,
   barrio 4)":
   - reglas (geometría = jerarquía, materiales = estado, actividad = progreso, luz = atención, interacción y
     panel = datos);
   - gramática urbana y tipologías con su tabla de rasgos por glifo;
   - landmarks y paleta (oro solo como señal);
   - ópticas por nivel, entrada, vista en corte;
   - qué queda fuera del slice (barrios 1–3 siguen en la gramática `parcelas`).

   Quitar del documento las referencias a pines y bordillos de color.
4. **Verificación completa:**
   - `npm test`, `npm run typecheck`, `npm run build`;
   - Chromium con los guiones del scratchpad: escritorio (`vista.mjs`, `hover.mjs`), entrada (`entrada2.mjs`),
     móvil (`movil.mjs`), sin WebGL (`singl.mjs`) y reposo sin redibujar.
5. **Commit y push** en `claude/quirky-lovelace-79c6fm`, con un mensaje que describa la revisión de dirección de
   arte y el atributo `Co-Authored-By` indicado. Se actualiza la PR #1 existente.
6. **Republicar el artefacto.** Copiar el nuevo `dist/` a
   `scratchpad/vista/assets` y actualizar los nombres de los ficheros con hash en `ciudad-del-dinero.html`.
   Publicar en el mismo enlace (https://claude.ai/artifact/Xkte8QVBzTan8pEMPuKg1i).
7. **Resumen al usuario.** Qué se conserva y qué se sustituyó de `c30a940`, qué demuestra el barrio 4 y qué
   queda pendiente:
   - extender la gramática a los barrios 1–3;
   - microexperiencia de la intermediación indirecta;
   - storytelling por scroll;
   - resaltado del edificio al pasar el ratón.

## Verificación
- Tests, typecheck y build sin errores; los tests de paridad, intactos.
- En Chromium (SwiftShader):
  - vista general solo con nombres de barrio, sin % ni pines;
  - ficha al pasar el ratón y al seleccionar;
  - edificio enfocado con cámara frente a fachada;
  - entrada una sola vez;
  - sin WebGL: Atlas + ciudad 2D navegables;
  - móvil legible;
  - 0 redibujados en reposo.
