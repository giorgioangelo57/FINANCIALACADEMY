# Fase 2 · La Ciudad del Dinero como maqueta viva

La ciudad representa conocimiento: estudiar hace que se construya. Esta fase añade a la portada
una maqueta 3D explorable que también funciona como **Atlas del Conocimiento**. El Atlas no es un
sistema aparte: es la misma ciudad vista a otra escala.

## Capas

| Capa | Carpeta | Depende de | Notas |
|---|---|---|---|
| 1. DATA académica | `src/content/` | — | Sin cambios. Literal del prototipo. |
| 2. Estado de aprendizaje | `src/domain/`, `src/persistence/` | 1 | Sin cambios. |
| 3. Modelo visual derivado | `src/world/`, `src/experiences/` | 1, 2 | Puro (sin Three.js ni DOM). Testeado. |
| 4. Renderer Three.js | `src/scene/three/` | 3 | Se carga bajo demanda (`import()`), en su propio fragmento. |
| 5. UI HTML/CSS | `src/ui/world/`, `src/styles/world.css` | 3 (y 4 por tipos) | Atlas accesible, migas, etiquetas y fallback. |

`src/app/app.ts` crea un `ControladorMundo` y lo monta en la portada. Al ir a `#s/…` o a `#c/…`,
el controlador recuerda el lugar. Al volver a `#inicio`, el mapa se abre en esa zona o en ese edificio.

## Reglas de significado

- **Superficie = peso real en examen.** El treemap (`world/geometry.ts`) da a cada barrio
  (grupo) y a cada zona (sección) un área exactamente proporcional a `pesoExamen`. A nivel de
  concepto no hay peso en DATA y no se inventa (`pesoExamen: null`).
- **Estado del edificio = dominio.** Se deriva de `nivelDominio`, que ya existía. Es siempre la
  misma masa arquitectónica, más o menos construida (un plano de corte por edificio):
  - `sin-estudiar` → **en proyecto**: maqueta blanca entera, con los huecos grabados;
  - `flojo`/`regular` → **en obra**: mitad inferior acabada, mitad superior en blanco, con andamio y grúa;
  - `dominado` → **construido**: materiales, color del concepto, ventanas encendidas y remate.

  Con el motor actual solo aparecen 0, 0,5 y 1. Al subir de fase, el corte sube y el edificio "se
  construye" (sin animación si hay movimiento reducido).
- **Tipología = glifos de DATA** (`world/typology.ts`). El primer glifo del concepto que pertenece a la
  gramática visual decide su arquitectura:

  | Tipología | Glifos | Arquitectura |
  |---|---|---|
  | Institucional | brain, inst, vault, globe | Podio, pórtico de columnas, friso con el color del concepto |
  | Banco | bank, ship, chapel, hive | Basamento y torre de piedra con pilastras |
  | Supervisor | eye, lens | Torre de vidrio con forjados y mirador |
  | Aseguradora | shield, umbrella | Bloque con gran alero protector |
  | Lonja | chart, screen, metro | Nave con bóveda y panel de cotizaciones |
  | Tecnológica | card, phone, link | Volúmenes de vidrio girados con líneas de luz |
  | Oficina | el resto | Bloque escalonado con ventanas corridas y terraza |

  Los remates siguen las convenciones de la portada original: frontón institucional, antena de
  supervisión, cúpula de protección y bandera de banco.
- **Altura.** Los 12 edificios de la portada original conservan su altura y su tejado de DATA. El
  resto usan la altura de su tipología. La altura nunca codifica conocimiento.
- **Lotes.** Cada manzana se reparte en lotes que la cubren entera (solo quedan pasajes). Si sobra
  espacio por concepto, se reserva una plaza con fuente y bancos. Un lote con espacio libre es jardín.
- **Color de dominio.** La lámina del Atlas (y, solo en la gramática de parcelas, el bordillo de
  cada lote) usa `colorDominio`, el mismo código que la ciudad 2D, las fichas y el índice. En la
  gramática urbana el estado se lee en el edificio, no en marcas de color en el suelo.
- **Vegetación, luces y actividad con motivo.** Hay árboles en las medianas de los bulevares y en
  las esquinas de las plazas, nunca como relleno. Hay farolas a lo largo de las avenidas. Hay
  tráfico solo en las zonas que ya se han empezado a estudiar. Una columna de luz marca las 3 zonas
  de "Estudia ya", con el mismo criterio que la portada.
- Nada se comunica solo con animación: el estado siempre es geometría y texto.

## Parpadeo: causa y corrección

Medido en Chromium con WebGL: con la cámara quieta y movimiento reducido no cambia ningún píxel
entre fotogramas. Al orbitar, en cambio, las avenidas mostraban un rayado inestable.

1. **Z-fighting por superficies coplanares.** El canto de la peana y el asfalto tenían la cara
   superior exactamente en `y = 0`, y la GPU elegía uno u otro según el ángulo. Lo mismo pasaba
   (con márgenes de 0,02) con el césped, los anillos de dominio y las ventanas.
2. **Plano cercano fijo** en 0,5 con la cámara a unas 280 unidades: la precisión de profundidad
   (~0,01) no separaba esas superficies.
3. **Baliza intermitente y volúmenes transparentes.** La baliza parpadeaba de verdad, y los
   volúmenes fantasma cambiaban de orden de dibujo al mover la cámara.

Corrección:
- Los niveles del suelo están separados (`NIVEL` en `palette.ts`) y un test lo comprueba.
- Los calcos (marcas viales, ventanas) usan `polygonOffset`.
- El plano cercano y el lejano se ajustan a la distancia real de la cámara.
- No hay transparencias en los edificios, y nada parpadea.

## Encuadre

La cámara ya no encuadra una esfera envolvente, que dejaba la ciudad pequeña y rodeada de vacío.
Proyecta las esquinas reales del foco y busca (bisección) la distancia mínima a la que caben.

- **Vista inicial:** tres cuartos poco diagonal; casi frontal y algo más cenital en móvil.
- **Al redimensionar:** se reencuadra lo que se estaba viendo.

## Etiquetas

El mundo no es una infografía (`world/labels.ts`):

| Nivel | Qué se rotula |
|---|---|
| Ciudad | Solo los 4 barrios, en tipografía de plano, sin cifras. Las 12 zonas, solo en lectura de mapa |
| Barrio | Sus zonas |
| Zona | Nada permanente |
| Edificio | Nada permanente: el nombre está en la ficha contextual |

Los datos exactos (peso, conceptos, dominio, estado) aparecen en la ficha contextual al señalar o
seleccionar. Las etiquetas se colocan en píxeles enteros y se apartan para no taparse entre sí. En
móvil, los barrios muestran solo su número.

## Zoom conceptual

`world/focus.ts` define `Foco = ciudad | barrio | zona | edificio`. Un único foco sincroniza la
cámara (`encuadre()`), el contorno de selección, las etiquetas flotantes, las migas y el Atlas
HTML (`world/atlas.ts`). El recorrido es este:

- **Edificio → concepto:** el primer toque enfoca el edificio y el segundo abre `#c/<id>`.
  "Estudiar el concepto" (ficha) y "Entrar al concepto" (Atlas) hacen lo mismo.
- **Concepto → pregunta:** se usa la ficha existente.
- **Pregunta → mapa:** al volver, el edificio crece si ha subido de fase.

La ciudad se convierte en Atlas de dos formas: el botón "Ver Atlas" pone la cámara cenital, con
el norte arriba, y alejar la cámara tiñe cada zona con su dominio (`factorAtlas`).

## Microexperiencias

Una historia es solo datos (`experiences/schema.ts`):
concepto → entidades → flujos (`flujo` | `intercambio` | `contiene`) → pasos → pregunta.

- `experiences/esquema.ts` convierte el modo "Esquema visual" de DATA en entidades y flujos. Lo
  hace solo si el esquema es una cadena inequívoca y, si no, devuelve `null`. Hoy produce
  historias para más de 20 conceptos (intermediación, BCE ⊂ Eurosistema ⊂ SEBC, MUS, MUR, SGR,
  seguros…). Todos sus textos son literales, y un test lo verifica.
- `experiences/registry.ts`: `HISTORIAS_CURADAS` (vacío) tiene prioridad sobre las automáticas.
- Reproductor actual: HTML paso a paso en la ficha del edificio del Atlas. Un reproductor 3D
  puede consumir las mismas historias sin cambiar el modelo.

## Accesibilidad, fallback y rendimiento

- **Sin WebGL**, si falla la carga o si se pierde el contexto, se muestran la ciudad pixel art y el
  Atlas HTML con la misma navegación. La preferencia 2D/3D de cada usuario se guarda en
  `financial-academy:vista`.
- **`prefers-reduced-motion`:** no hay tráfico, peatones, crecimiento, entrada cinematográfica
  ni transiciones de cámara, y se escucha si la preferencia cambia en caliente.
- **Lienzo:** el lienzo lleva `role="img"`. Las etiquetas flotantes son `aria-hidden`, porque el
  Atlas es el equivalente navegable por teclado. `Escape` sube un nivel.
- **Rendimiento:**
  - El renderer se reutiliza entre visitas a la portada y no dibuja fuera de pantalla.
  - En reposo no redibuja (medido: 0 dibujados en 3 s).
  - Cada edificio une sus piezas por material (unas 10 llamadas de dibujo por edificio).
  - Árboles, farolas, coches y peatones van instanciados.
  - Texturas de suelo procedurales de 64×64 generadas una vez (sin imágenes externas).
  - El mapa de sombras no se recalcula al mover la cámara (`shadowMap.autoUpdate = false`): solo
    cuando cambia la escena. Lo que se mueve (coches, peatones) no proyecta sombra. Medido al orbitar
    en la vista general: de ~600 a 175 llamadas de dibujo y de ~140.000 a ~36.000 triángulos por
    fotograma.
- **Verificación:** `scripts/verificar-chromium.mjs` (19 comprobaciones en Chromium real).

## Dirección de arte (vertical slice, barrio 4)

> "Estudiar es construirla." La ciudad es la representación del conocimiento; la interfaz académica
> vive dentro de ese mundo. Este apartado describe la gramática visual validada en el barrio 4. Los
> barrios 1–3 conservan la gramática `parcelas` hasta que se apruebe extenderla (`GRAMATICA_URBANA`
> en `world/cityModel.ts`).

### Reglas

| Canal | Comunica | Ejemplo |
|---|---|---|
| Geometría | Jerarquía | Superficie de zona = peso en examen; landmarks con silueta propia |
| Materiales | Estado | Maqueta clara (sin estudiar), obra (a medias), materiales y luz (dominado) |
| Actividad | Progreso | Tráfico y peatones solo en zonas estudiadas; más dominio, más vida |
| Iluminación | Atención | Columna de luz cálida en las zonas de "Estudia ya" |
| Interacción | Qué es | Ficha contextual al señalar o seleccionar |
| Panel HTML | Datos exactos | Atlas editorial y ficha: peso, conceptos, dominio |

Prueba de cada elemento: ¿por qué existe? Si no tiene razón funcional, espacial, narrativa o
académica, no está. Por eso desaparecieron los pines, las cifras flotantes, los bordillos de color en
la gramática urbana, el vaivén de los hitos y el parpadeo de las balizas.

### Gramática urbana (Ensanche)

`world/urban.ts`. DATA sigue siendo rectangular (treemap exacto por peso); la ocupación no:

- **Manzanas cerradas** con fachada continua a la calle y **patio interior** ajardinado (sendas en
  cruz, árboles en el contorno). Hasta 5 edificios por manzana.
- **Pasajes peatonales** arbolados entre manzanas de una misma zona.
- **Aceras con chaflán**, la esquina del Ensanche; losas, asfalto y césped con textura procedural.
- **Antepatios** delante de los emblemáticos: losas de piedra, jardineras y faroles.
- Los emblemáticos ocupan las fachadas sur y este (las que se ven desde la vista inicial).
- El **entorno está siempre construido**: el dominio cambia el edificio, nunca el escenario.
  Coches aparcados (estáticos) dan vida aunque no se haya estudiado nada.

### Arquitectura con identidad

`scene/three/urbanArchitecture.ts`. Vocabulario común de ciudad europea: zócalo, imposta, huecos con
alféizar, cornisa y remate (mansarda con buhardillas, cubierta o coronación). Sobre él:

| Tipología (glifos de DATA) | Silueta |
|---|---|
| Institucional (brain, inst, vault, globe) | Palacio: zócalo almohadillado, pórtico de orden gigante con friso del color del concepto, escalinata, frontón o cúpula |
| Autoridad central (brain, altura de portada ≥ 9) | Torre institucional sobre basamento palaciego con templete: la silueta más alta |
| Banco (bank, ship, chapel, hive) | Basamento de granito con patio de operaciones y torre de piedra con pilastras |
| Supervisión (eye, lens) | Podio de piedra y torre de vidrio con montantes y mirador en la coronación |
| Protección (shield, umbrella) | Volumen macizo con gran alero; con cúpula, rotonda exenta con contrafuertes o "paraguas" |
| Lonja (chart, screen, metro) | Nave de ladrillo con bóveda de zinc, ventanales y panel de cotizaciones luminoso |
| Pagos (card, phone, link) | Vidrio claro, volumen superior girado, líneas de luz en los forjados |
| Oficina (resto) | Bloque de fachada continua, ático retranqueado y terraza |

Rasgos por glifo: `vault` zócalo almohadillado · `handshake` dos volúmenes unidos por una pasarela
(aval) · `truck` portones · `basket` celosía de bronce · `store`/`car` escaparate con toldo ·
`chapel` hastial con rosetón (con el remate "ruina" de la portada) · `umbrella` gran alero ·
`eye`/`lens` mirador. Los tejados siguen las convenciones de la portada original.

**Landmarks** (los 12 de la portada, `tema.ciudad`): Banco de España (palacio con frontón), BCE
(torre con templete), FGD y DGSFP (rotondas), CNMV y MUR (supervisión con antena), bancos (torre con
bandera), cajas (nave con rosetón), cooperativas (cubierta de teja), ICO, fondos y SGR.

### Paleta

Fondo oscuro cálido, blanco cálido (`--m-tinta`), piedras arena y ocre, pizarra, cobre verdoso en
cúpulas. El **oro** solo señala: recomendación, acción, luz. Los colores de dominio conservan su
significado y aparecen únicamente como muestra pequeña junto a un dato.

### Cámara como lenguaje

| Nivel | Óptica |
|---|---|
| Ciudad | Tres cuartos, objetivo normal (30°) |
| Mapa (Atlas) | Cenital y orientado al norte |
| Barrio | Isométrica de teleobjetivo (17°): perspectiva casi plana, como una axonometría |
| Zona | Más baja, se entra en las calles |
| Edificio | Arquitectónica (38°), frente a la fachada principal, algo de lado |

Transiciones de 1,1 s con arco (la cámara "vuela" entre lugares lejanos) e interpolación del campo
de visión. Composición asimétrica (`setViewOffset`): con la ficha a la izquierda, el sujeto se
desplaza a la derecha. Niebla de profundidad. **Vista en corte**: en el plano de edificio se retiran
los edificios que se interponen. **Entrada de primera visita**: negro → marca → la cámara desciende
mientras los barrios se levantan → "Estudiar es construirla" → navegación. Se salta con un botón,
Escape o un toque; no se repite (`financial-academy:entrada`) ni se muestra con movimiento reducido.

### Portada (landing)

Con la ciudad 3D activa, el mapa es lo primero de la portada y ocupa la pantalla completa:

1. **Portada:** solo la ciudad (con la entrada cinematográfica la primera vez) y una pista,
   "Pulsa la ciudad para explorarla · Desliza para ver el tema". Sin ruta, ficha ni Atlas. La barra
   lateral se retira y el mundo va a sangre. El mapa no captura la rueda ni el gesto táctil: desplazan
   la página.
2. **Clic en la ciudad:** el mapa pasa a **pantalla completa** (API nativa; si el navegador la
   rechaza, una capa fija) y empieza la exploración. Se sale con Esc o con "Salir de pantalla
   completa".
3. **Scroll:** cuando el mapa deja de dominar la pantalla (menos del 55 % visible), vuelve la barra
   lateral y aparece con animación el bloque del tema (título, "La Ciudad del Dinero", párrafo).

Al volver de estudiar (foco en una zona o un edificio) se entra directamente en exploración. Sin
WebGL, o en 2D, la portada conserva su orden original: primero el bloque del tema.

### Zoom con la rueda

- **En pantalla completa:** la rueda acerca y aleja.
- **Fuera de pantalla completa:** la rueda desplaza la página. Para ver la ciudad de cerca desde
  fuera hay dos opciones: el interruptor "Zoom con rueda" (se recuerda en
  `financial-academy:zoom-rueda`) o Ctrl/⌘ + rueda. Una pista lo recuerda la primera vez.

### Paseo con el personaje

Petición del usuario: su personaje en 3D y peludo, jugable con el teclado. Es una versión
procedural de su dibujo (`scene/three/avatar.ts`): cuerpo redondeado azul petróleo cubierto de 1.700
mechones instanciados, oreja negra y oreja azul, cinta roja con el lazo y las colas a un lado, ojos
grandes y dos patas.

- **"Pasear"** (en la ruta del mundo, solo con puntero fino): aparece en una plaza mirando a la
  cámara. La cámara pasa a tercera persona y se puede girar alrededor del personaje.
- **Controles:** WASD o flechas para moverse (relativo a la cámara), **espacio para saltar**,
  **doble espacio para el dash** (0,22 s a 26 u/s, con enfriamiento de 0,7 s; también en el aire), E o
  Intro para entrar en el edificio cercano y Esc para salir.
- **Orejas de gato:** triángulos de punta suave con el interior rosado y un mechón en la base.
- **Visión:** durante el paseo la niebla empieza a 60 unidades y termina a 240; la cámara se sitúa a
  15 unidades con un campo de visión de 48°.
- **Fallos corregidos** tras la primera prueba:
  - la niebla seguía a la cámara y tapaba la ciudad a ~30 unidades;
  - el personaje se quedaba a mitad de zancada al parar;
  - el espacio volvía a pulsar "Pasear";
  - un clic sacaba del paseo;
  - redimensionar (o entrar en pantalla completa) rompía la persecución;
  - el personaje flotaba o se hundía (ahora se usa la altura real de calzada, mediana, acera,
    pasaje, manzana y plaza).
- **Modelo puro** en `world/paseo.ts`: aceleración, frenada, colisiones por ejes con los lotes de
  los edificios (permiten deslizarse por una fachada), límites de la ciudad y edificio cercano.
- **Edificio cercano:** a menos de 2,2 unidades de un edificio aparece su ficha con "Estudiar el
  concepto": pasear también es una forma de llegar a estudiar.
- **Movimiento:** con movimiento reducido el personaje se desplaza sin balanceo de patas ni colas.
  La vista en corte retira los edificios que lo tapan.
- **Pendiente:** controles táctiles (joystick) para móvil (ver `decisiones-pendientes.md`).

### Interfaz editorial

Sin tarjetas ni pills: filetes finos, tipografía protagonista y números grandes. La navegación es
una ruta de lugares con tres acciones de texto. La ficha contextual sigue el orden de lectura
qué es → cuánto pesa → qué sé → dónde entrar. El Atlas es un índice con clave, nombre y estado, peso
con barra fina y dominio alineados a la derecha. La leyenda tiene cuatro claves.

## Ampliación del tema y predicción de examen

- **Origen:** `src/content/temas/tema-01/ampliacion.ts` recoge los apuntes del alumno (resumen de
  la Unidad 1 y predicción de examen). Vive aparte de DATA, que sigue intacta; los tests de paridad
  no cambian. `validarTema` comprueba la ampliación:
  - las probabilidades suman 100;
  - cada concepto pertenece a un solo bloque;
  - los ids existen;
  - las preguntas están bien formadas.
- **Ficha del concepto:** tres acciones nuevas.
  - 🗺️ **Esquema:** la cadena de la historia del concepto y árboles desplegables de los apuntes.
  - 🃏 **Flashcards:** la frase de examen de DATA y las tarjetas de los apuntes.
  - 🧠 **Más preguntas:** práctica.
- **Dominio:** la práctica y los simulacros **no cambian el dominio**, que solo mide "Compruébalo".
- **Ruta nueva `#examen`** (solo si el tema tiene ampliación) con enlace en el índice. Contiene:
  - "Por dónde empezar": probabilidad × lo que falta por dominar;
  - el mapa de bloques y conceptos, coloreado por dominio;
  - dos gráficos de barras: probabilidad estimada y preguntas disponibles (Compruébalo + práctica);
  - una tabla alternativa;
  - un simulacro por bloque.
  - Paleta del gráfico apilado validada para el daltonismo sobre `#111`.
- **Portada 2D:** los iconos de la skyline flotan sobre el tejado, sin recuadro negro.
  `ciudadPixel(..., { iconosSobreTejado: true })`; sin opciones sigue idéntica al prototipo.

## Correcciones tras la versión 6 y marca "Gestión financiera"

- **Mapa 3D:**
  - En la portada la ciudad es siempre maqueta: la lectura de mapa (placas de calor y rótulos de
    zona) solo aparece explorando o en el Atlas.
  - Si el lienzo cambia de tamaño durante una transición (la barra lateral se retira en la entrada),
    se reencuadra al terminarla.
  - Vuelve la niebla de maqueta; la niebla larga queda solo para el paseo.
- **Rótulos:**
  - **Zona:** el nombre de cada edificio.
  - **Edificio:** el enfocado, destacado, y los de su zona, atenuados.
  - **Al pasar el ratón**, el nombre del edificio en cualquier nivel.
- **Índice:**
  - Se retira solo en la portada con el mapa a pantalla; hay un botón flotante "☰ Índice" para
    abrirlo.
  - La predicción de examen va al final del índice, y hay una tarjeta al final de la portada.
- **Marca:**
  - "GESTIÓN FINANCIERA · La ciudad del dinero" con letras de moneda (CSS, `brandTitle.ts` y
    `brand.css`), en la entrada, sobre el mapa de la portada y en el hero.
  - `tema.meta.ciudad` (DATA) no cambia.
- **Predicción:**
  - reparto 100 % apilado;
  - treemap de bloques, con un ladrillo por concepto coloreado por dominio (`world/treemap.ts`);
  - tres gráficos de barras y tabla;
  - fichas con claves, conceptos y simulacro con marcador.
- **Esquemas de la ficha:**
  - El texto de DATA se lee como diagrama de flujo (`leerEsquema`), solo como presentación; un test
    comprueba que no se pierde texto.
  - Árbol con ramas y "Desplegar / Plegar todo".

## Simulacro, repaso y cierre del tema

- **Simulacro (`#simulacro`):** `domain/exam.ts` reparte las preguntas por bloque según la
  predicción, con redondeo por restos mayores (20 → 6/5/4/3/2). Las elige con semilla entre las
  oficiales y las de práctica, sin repetir.
  - Una pregunta cada vez, con tiempo opcional (60 s).
  - Al final: nota sobre 10, aciertos por bloque y corrección explicada.
- **Repaso (`#repaso`):** `domain/practice.ts` (puro) y `persistence/practiceRepository.ts` (clave
  `financial-academy:practica`).
  - **Fallos:** de "Compruébalo", "Más preguntas", simulacros de bloque y simulacro del tema. Salen
    tras 2 aciertos seguidos.
  - **Flashcards:** Leitner de 5 cajas (0, 1, 3, 7 y 14 días), con 10 nuevas al día.
  - **Índice:** el grupo "Examen" (Predicción, Simulacro y Repaso) va al final, con una insignia de
    pendientes.
- **Contenido:** apartado 3 completo y refuerzo de 4.1 y 4.2.
  - Todos los conceptos tienen al menos 2 preguntas de práctica (125 en total).
  - 50 flashcards y 18 esquemas.
  - Un test vigila la cobertura y que la respuesta correcta no esté siempre en la misma posición.
- **Móvil:** joystick táctil para pasear. La portada ya no muestra el texto de fases del prototipo.

## Métodos de estudio (noche 2)

Evidencia y criterios en `docs/metodos-estudio.md`.

- **`domain/practice.ts`:** confianza (`Seguro`, `Dudo`, `Adivino`) con calibración, repetición
  espaciada de preguntas, actividad diaria, acierto por concepto y fecha de examen
  (`intervaloAjustado`: ≤ 20 % de los días que faltan). `registrarRespuesta` reúne todo; la lectura
  de datos de la versión anterior es compatible.
- **`domain/session.ts`:** `construirSesion` mezcla repaso (primero las sorpresas), preguntas
  vencidas, flashcards y nuevas por `prioridadBloques`, e intercala por concepto y bloque.
- **`domain/recall.ts`:** "Escríbelo tú" compara el texto con las ideas clave (las negritas de DATA)
  por raíces de palabra.
- **Vistas:** `#sesion` (Estudiar hoy), `#progreso` (Mi progreso), pretest en cada sección y
  `pintarPreguntaConConfianza` (práctica, repaso, simulacros de bloque y sesión). El simulacro del
  tema pide la confianza de forma opcional y muestra la calibración.

## Infografías y correcciones (02/10, tarde)

- **Infografías animadas** (`content/temas/tema-01/infografias.ts`, `ui/components/infographic.ts`):
  12 conceptos difíciles contados paso a paso:
  - ICO, EDE, SGR, EFC, FGD;
  - fondo de inversión y sociedad de inversión;
  - dealer y bróker;
  - seguros;
  - SEBC ⊃ Eurosistema ⊃ BCE;
  - supervisores;
  - MUS y MUR.

  Los textos salen de DATA y de los apuntes.
- **Cómo se dibujan:**
  - actores en % del lienzo, recolocados para no salirse;
  - flechas calculadas en píxeles de borde a borde, con un símbolo que viaja por las activas;
  - grupos para los conjuntos.
- **Dónde están:**
  - "🎬 Visualízalo" en la ficha (solo en los conceptos con infografía);
  - galería `#visual` en el índice.
  - `validarTema` comprueba sus referencias.
- **Correcciones:**
  - En móvil se salta y se entra mientras se camina: botones con `pointerdown` (multitáctil).
  - Volver de 2D a 3D no devuelve a la portada.
  - Esc sube de nivel aunque el foco esté fuera del mapa.
  - Barra del mapa en móvil con etiquetas cortas.
  - Silueta del personaje cuando algo lo tapa.

## Detalle y decoración (02/10, noche)

- **Emblemas de fachada** (`scene/three/emblemas.ts`):
  - cada edificio lleva un medallón con el **primer glifo de su concepto en DATA**, el mismo del
    icono 2D, trazado a partir del SVG original con `SVGLoader`;
  - cada tipología fija dónde va (`Taller.escudo`): en placa sobre la fachada o en cresta sobre la
    cornisa;
  - se reparte por roles (`medallon`, `bronce`, `acento`), así que respeta el corte por fase: en
    obra solo se ve si ya está construido.
- **Día y noche:**
  - ver "Día = aprender, noche = repasar" más abajo, que sustituye al ciclo con atardecer y hora
    automática;
  - el cielo es el fondo CSS del visor (estrellas de noche) y la niebla usa el mismo color de borde.
- **Decorado vivo** (`scene/three/decorado.ts`):
  - halos de las farolas (un `Points` aditivo);
  - palomas sobre las plazas;
  - nubes en las vistas de ciudad y barrio;
  - lluvia de monedas en la entrada;
  - placa de latón grabada en el canto de la peana.
  - Las palomas y las nubes se animan a unos 30 fps. Con movimiento reducido no se anima nada y se
    mantienen los 0 redibujados en reposo.
- **Pantallas 2D:**
  - silueta de la manzana en la cabecera de cada sección (`ui/components/skyline.ts`), con la
    tipología y la fase de obra de cada concepto;
  - marca de agua del icono en las fichas;
  - monedas al acertar, sacudida al fallar y sello "¡Lo sabías!" al acertar con seguridad
    (`ui/components/celebrar.ts`);
  - medalla de la nota del simulacro;
  - fondo guilloché tenue en las vistas de práctica.

## Día = aprender, noche = repasar (02/10)

- **Botón ☀️ Aprender / 🌙 Repasar** en la barra del mapa:
  - solo lo cambia el alumno, porque cambia el contenido;
  - el mapa se abre siempre de día;
  - la elección se recuerda mientras la aplicación está abierta;
  - la luz pasa por el atardecer al cambiar.
- **Noche:**
  - la ciudad se apaga;
  - cada concepto con algo pendiente hoy enciende sus ventanas (más pendiente, más luz) y lleva un
    faro, rojo si hay errores con seguridad (`Mundo3D.fijarPendientes`);
  - se ocultan las columnas de "Estudia ya";
  - solo se rotulan los edificios encendidos, con su número (`etiquetasNocturnas`);
  - la ficha resume la noche, lista los edificios y lleva a `#repaso/<concepto>`.
- **Qué cuenta como pendiente** (`domain/pendientes.ts`):
  - fallos, preguntas cuyo repaso espaciado vence hoy y flashcards ya vistas que vencen hoy;
  - lo nuevo no cuenta: aprender es cosa del día.
- **Repaso de un solo concepto:** ruta `#repaso/<concepto>`. Muestra sus fallos y vencidas, y sus
  flashcards.

## Intro entre nubes (02/10)

> Sustituida por el tráiler de títulos (ver "Intro: tráiler de títulos" más abajo).

- **Primera visita:** cielo azul → vuelo entre nubes realistas (cúmulos generados en un lienzo
  con ruido fractal y luz desde arriba, en `ui/components/nubesRealistas.ts`, movidos con CSS 3D:
  perspectiva y `translateZ`) → el título con letras de moneda llega desde el fondo → dos nubes en primer plano
  se abren como un telón.
- **Debajo**, `Mundo3D.entrada(…, { retraso: 2600 })` empieza el descenso de la cámara justo al
  abrirse las nubes.
- **Barra:** no se ve durante la intro.
- **Control:**
  - se salta con el botón, Esc o un toque;
  - "▶ Ver la intro" en la pista de la portada la repite;
  - con movimiento reducido no se reproduce.
- **Por qué en CSS y no en la escena 3D:** las nubes no cargan la GPU.
- **Estilos:** `src/styles/intro.css`.

## Esculturas, vida en la ciudad y nubes atravesables (02/10)

- **Escultura del icono en cada edificio** (`architecture.ts`):
  - el primer glifo del concepto en DATA, macizo (`glifoSolido`: caras y contorno extruidos), sobre
    un mástil en la cubierta;
  - construido, en el color del concepto con brillo metálico; en obra, a medio color; sin estudiar,
    en maqueta blanca;
  - se mueve: el ojo y la lupa de los organismos que vigilan barren la ciudad, el euro, el globo y
    el reloj giran, y el resto se mece;
  - los rótulos quedan por encima.
- **Vida:**
  - chorros de agua en las fuentes (`Points` animado);
  - paseantes en plazas y patios;
  - palomas y nubes, como antes.
  - Nada se anima con movimiento reducido.
- **Menos monedas:** la lluvia de la entrada pasa de 70 a 14 monedas.
- **Intro:**
  - nubes realistas más grandes (cúmulos de metabolas con luz desde arriba);
  - cuatro nubes cercanas que cruzan la cámara, con un velo blanco al atravesarlas;
  - las texturas se generan en ratos libres mientras carga la escena 3D (`prepararNubesIntro`).

## Recorrido del barrio 4, edificios más grandes e historia 2D (02/10)

- **Recorrido guiado del barrio 4** (`world/recorrido.ts`, `Mundo3D.fijarRecorrido`):
  - botón "🧭 Recorrido del barrio 4" en la barra;
  - arcos dorados con flechas unen los 24 edificios en el orden de estudio (4.1 → 4.2A → 4.2B y,
    dentro de cada sección, el orden de DATA);
  - el tramo activo brilla y lleva una luz que lo recorre;
  - rótulos numerados;
  - ficha con el paso, "Anterior / Siguiente" (la cámara va de parada en parada), "Estudiar el
    concepto" y "Salir del recorrido";
  - ir a mano a una parada sigue el recorrido desde ahí.
- **Edificios:**
  - un 25 % más altos (`ESCALA_ALTURA`);
  - más detalle (`detallar`): farolillos y jardineras en la entrada y, en las cubiertas planas,
    máquinas de clima, depósitos de agua y claraboyas.
- **Modo 2D:** desaparece como opción.
  - La ciudad 2D del prototipo queda al final de la portada como "Historia del proyecto".
  - Sigue sirviendo de alternativa si no hay WebGL.
  - La preferencia antigua `financial-academy:vista` se ignora.

## Línea de tiempo del tema (02/10)

- **Ubicación:** entre el mapa (su leyenda) y el bloque "Tema 1" (`ui/components/timeline.ts`).
  - El controlador del mundo la coloca justo detrás del mapa al anteponerlo; sin 3D queda tras el
    Atlas.
- **Barra:** un tramo por subpunto, de ancho proporcional al peso en el examen, rellenado con tu
  dominio y con el color de su apartado.
- **Debajo:** los 4 apartados en columnas (apiladas en móvil), cada uno con su color, su peso y sus
  subpuntos como paradas, rellenas con tu dominio.
- **Siguiente recomendación:** destacada; su parada late.
- **Navegación:** todo lleva a la sección.

## Intro: tráiler de títulos (02/10)

Sustituye a las intros anteriores (nubes CSS y descenso 3D con nubes y bruma). En el móvil esas
intros no salían, porque ya estaban marcadas como vistas, o se congelaban mientras la 3D se
montaba.

- **Dónde:** `ui/intro/introCinematica.ts` y `styles/intro.css`. Es una capa a pantalla completa,
  antes del mapa, mientras la 3D se monta debajo.
- **Guion (~9,5 s):**

  | Instante | Plano |
  |---|---|
  | 0–1,2 s | Línea dorada y "GESTIÓN FINANCIERA" letra a letra. |
  | 1,1–3,1 s | "La ciudad del dinero", con letras de moneda, sobre el horizonte de la ciudad (`skylineSeccion`, en Ken Burns lateral). |
  | 3,0–6,4 s | Un plano por apartado del tema (`tema.grupos`): número en su color, título e iconos de sus conceptos. Entra por la derecha y sale por la izquierda. |
  | 6,3–8,3 s | Morph letra a letra a **"Bienvenido a la Ciudad Financiera"**, con Ken Burns lento. |
  | 8,0–9,4 s | Subtítulo palabra a palabra, de `tema.meta`. |

  Al final, el texto vuela hacia la cámara (fly-out), la capa se funde y debajo la cámara hace un
  acercamiento corto (`Mundo3D.acercar`) hasta el encuadre de la portada.
- **A prueba de bloqueos:**
  - todo el guion es CSS con retrasos absolutos y solo anima `transform` y `opacity`, que mueve
    el compositor aunque el hilo principal esté montando la 3D;
  - sin filtros SVG ni desenfoques animados;
  - el JS solo cierra: tras la última animación y con la 3D lista (espera como mucho 3 s; entre
    tanto, el plano final respira).
- **Clave:** `CLAVE_ENTRADA = "trailer-1"`. Quien vio una intro anterior ve el tráiler una vez.
- **Control:**
  - se salta con el botón, Esc o un toque;
  - "▶ Ver la intro" es ahora una píldora en la pista de la portada;
  - con movimiento reducido no hay intro;
  - sin WebGL, se funde sobre la página.
- **Retirado:** el descenso 3D de la intro, la capa de nubes 3D, la bruma y el generador de nubes
  realistas.
- **Portada en móvil:** la barra flotante sube (`bottom: 132px`) para no pisar la pista.

## Pendiente (siguientes pasos)

1. Reproducir las historias en 3D: entidades como piezas sobre la maqueta, flujos animados y
   cámara guiada por pasos.
2. Relaciones entre conceptos en el Atlas. Hoy solo se muestran las que DATA respalda
   (grupo → sección → concepto). Las cadenas de los esquemas podrían enlazar edificios, pero
   antes hay que validarlo.
3. Más estados visuales cuando el motor de aprendizaje los soporte (p. ej. consolidación).
4. Extender la gramática urbana a los barrios 1–3 (pendiente de aprobación).
5. Resaltar el edificio al pasar el ratón (hoy solo cambia el cursor y aparece la ficha).
6. Storytelling por scroll donde aporte comprensión.
