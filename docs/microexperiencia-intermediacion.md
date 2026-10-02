# Microexperiencia: "Intermediación indirecta" (storyboard, sin implementar)

Concepto: `indirecta` (sección 2, zona "Funciones del sistema financiero").
Todos los textos en pantalla son **literales de DATA**: no se escribe ninguna explicación nueva. Lo
único propio son las instrucciones de interfaz (botones, "paso x de y").

Fuente literal:
- Definición: «El ahorrador **deposita su excedente en el banco** y el banco hace llegar ese dinero a
  quien tiene déficit. **Ambos agentes no tienen contacto entre ellos.**»
- Ejemplo real: «Tus ahorros en un depósito financian el préstamo de una pyme que no conoces.»
- Esquema visual: «Ahorrador ──depósito──▶ 🏦 ──préstamo──▶ Empresa»
- Su gemelo confuso: «Gemela de la directa. Aquí el riesgo lo asume el banco, que cobra el margen.»
- Frase de examen: «Indirecta: el agente con superávit ingresa su excedente en el banco y el banco
  lo hace llegar al agente con déficit.»
- Pregunta: «Metes tus ahorros en un depósito. Es intermediación…» · Directa / Indirecta ·
  explicación: «El banco hace de puente.»

Entidades y flujos: los produce ya `historiaDeConcepto(tema, 'indirecta')`
(`src/experiences/registry.ts`): `Ahorrador`, `🏦`, `Empresa`; flujos `depósito` y `préstamo`.

## Recorrido: mundo → cámara entra → historia → pregunta → mundo

Sin modal ni diapositivas: todo ocurre en el lienzo de la ciudad, y los textos van en una franja de
subtítulos HTML (accesible, `aria-live="polite"`) en el borde inferior del visor.

| # | Fotograma | Cámara | En escena | Texto en pantalla (literal) | Duración |
|---|---|---|---|---|---|
| 1 | **Llegada** | Desde el plano de zona, la cámara se acerca al edificio de `indirecta` (óptica de edificio, frente a la fachada). Los edificios vecinos se retiran (vista en corte). | El edificio en su estado actual (proyecto, obra o construido). | Nombre del concepto: «Intermediación indirecta» | 1,5 s |
| 2 | **Los dos agentes** | Se abre a un plano medio; el edificio queda en el centro. | Aparecen dos piezas de maqueta a los lados, en la acera: «Ahorrador» (izquierda) y «Empresa» (derecha). Entre ellas, el edificio, que hace de «🏦». | Esquema visual: «Ahorrador ──depósito──▶ 🏦 ──préstamo──▶ Empresa» (aparece entero, en gris) | 2,5 s |
| 3 | **Depósito** | Leve giro hacia el ahorrador. | Un flujo de luz dorada sale del ahorrador y entra en el edificio por la puerta principal. Se ilumina la palabra «depósito» del esquema. | Definición, primera parte: «El ahorrador **deposita su excedente en el banco**» | 3 s |
| 4 | **El banco** | Plano fijo sobre el edificio. | Se encienden las ventanas del patio de operaciones (el dinero está dentro). | Gemelo confuso: «Aquí el riesgo lo asume el banco, que cobra el margen.» | 3 s |
| 5 | **Préstamo** | Giro hacia la empresa. | El flujo sale por el otro lado del edificio y llega a la empresa. Se ilumina «préstamo». | Definición, segunda parte: «y el banco hace llegar ese dinero a quien tiene déficit.» | 3 s |
| 6 | **Sin contacto** | Plano general de los tres; la cámara sube un poco. | Ahorrador y empresa se quedan quietos uno frente al otro, sin ningún flujo directo entre ellos (la ausencia es el mensaje). | «**Ambos agentes no tienen contacto entre ellos.**» | 3 s |
| 7 | **En la vida real** | Mismo plano. | Sin cambios en escena. | Ejemplo real: «Tus ahorros en un depósito financian el préstamo de una pyme que no conoces.» | 3 s |
| 8 | **Compruébalo** | La cámara vuelve a la fachada. | Las piezas de los agentes se retiran. | Pregunta: «Metes tus ahorros en un depósito. Es intermediación…» con las opciones «Directa» / «Indirecta». Al acertar: «El banco hace de puente.» Después, regreso al plano de zona: si el dominio sube, el edificio se construye (crecimiento del plano de corte). | interactivo |

Duración narrativa: unos 19 s antes de la pregunta ("concepto mediano" según la escala acordada).

## Adaptación al dominio (solo los tres estados existentes)

- **Sin estudiar (0):** los 8 fotogramas.
- **A medias (0,5):** fotogramas 2, 3, 5 y 6, pidiendo al alumno que pulse el siguiente flujo
  (interacción en lugar de reproducción).
- **Dominado (1):** fotograma 2 (esquema completo) y directamente la pregunta (8). DATA solo tiene
  una pregunta por concepto, así que no hay "pregunta difícil" (anotado en `decisiones-pendientes.md`).

## Principios de motion

1. **Cada movimiento enseña algo.** El flujo dorado es el dinero; su dirección es la del esquema.
   No hay partículas, rebotes, pulsos ni brillos decorativos.
2. **Una cosa a la vez.** Solo se mueve lo que el texto está nombrando.
3. **La ausencia también comunica.** En el fotograma 6 la falta de flujo entre los agentes es la idea.
4. **Cámara física y lenta.** Transiciones de 0,9–1,2 s con aceleración suave, como las del mundo.
   Nunca cortes bruscos ni cámara en movimiento continuo.
5. **El oro solo señala.** Mismo color que la columna de "Estudia ya" y las acciones.
6. **Se puede detener y sigue siendo comprensible.** Cada fotograma tiene un estado final estable;
   botones Anterior/Siguiente y Escape para salir al mundo.
7. **Movimiento reducido:** los fotogramas se muestran como estados estáticos (sin flujo animado:
   la línea aparece dibujada entera) y la cámara salta sin transición.
8. **Sin WebGL:** el mismo guion se reproduce con el reproductor HTML existente (`historiaHtml` en
   `src/ui/world/worldPanel.ts`).

## Encaje técnico (cuando se implemente)

- Datos: ampliar `Historia` con `tomas` (cámara por paso) y `textos` (referencias a campos de DATA:
  `{campo:'definicion', fragmento}`), validados por un test que exija que cada texto sea subcadena
  literal de DATA.
- Render: un `ReproductorHistoria` en `scene/three/` que reutiliza el `Taller` para las piezas de
  los agentes, el sistema de transiciones de `cityScene.ts` y la vista en corte.
- Interfaz: la franja de subtítulos y la pregunta reutilizan `pintarPregunta`
  (`ui/components/conceptPanels.ts`) y `EstadoEstudio.responder`, así que el progreso se guarda igual
  que en la ficha.
