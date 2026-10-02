// Infografías animadas paso a paso de los conceptos más difíciles del Tema 1. Todos los textos y
// datos salen de DATA (definición, ejemplo y esquema de cada concepto) y de los apuntes del alumno
// (Bloques IV–VI); no se añade información nueva. Coordenadas en % del lienzo (16:10).

import type { ActorInfografia, FlujoInfografia, Infografia, TipoFlujo } from '../../schema.ts';

const A = (id: string, etiqueta: string, icono: string, x: number, y: number): ActorInfografia => ({ id, etiqueta, icono, x, y });
const F = (desde: string, hacia: string, etiqueta: string, tipo: TipoFlujo): FlujoInfografia => ({ desde, hacia, etiqueta, tipo });

export const infografias: Infografia[] = [
  {
    id: 'ico',
    conceptoIds: ['ico'],
    titulo: 'Cómo funciona el ICO: dos papeles, tres vías',
    actores: [
      A('estado', 'Estado / Gobierno', '🏛️', 14, 18),
      A('mercados', 'Mercados', '📈', 14, 72),
      A('ico', 'ICO', '🏦', 46, 45),
      A('banco', 'Banco privado', '🏧', 78, 14),
      A('pyme', 'Pyme o autónomo', '🧑‍💼', 92, 46),
      A('proyecto', 'Proyecto de más de 10 M€', '🏗️', 78, 80),
      A('ayudas', 'Destinatarios de fondos públicos', '🤝', 46, 88),
    ],
    flujos: [
      F('mercados', 'ico', 'se financia', 'dinero'),
      F('estado', 'ico', 'garantía explícita', 'garantia'),
      F('ico', 'banco', 'línea de mediación', 'dinero'),
      F('banco', 'pyme', 'préstamo · el banco asume el riesgo', 'riesgo'),
      F('ico', 'proyecto', 'financiación directa · el ICO asume el riesgo', 'riesgo'),
      F('estado', 'ico', 'fondos públicos', 'dinero'),
      F('ico', 'ayudas', 'catástrofes, exportación, desarrollo', 'dinero'),
    ],
    pasos: [
      { texto: 'El ICO es una entidad pública empresarial y agencia financiera del Estado. Se financia en los mercados y sus deudas tienen garantía explícita del Estado.', actores: ['ico', 'mercados', 'estado'], flujos: [0, 1] },
      { texto: 'Como banco público, vía 1 · líneas de mediación: el dinero del ICO llega a pymes y autónomos a través de un banco privado, que tramita, estudia la viabilidad y asume el riesgo.', actores: ['ico', 'banco', 'pyme'], flujos: [2, 3] },
      { texto: 'Como banco público, vía 2 · financiación directa para proyectos de más de 10 millones de euros: aquí el riesgo lo asume el propio ICO.', actores: ['ico', 'proyecto'], flujos: [4] },
      { texto: 'Como agencia financiera del Estado: gestiona fondos públicos que le asigna el Gobierno (catástrofes naturales, fomento de exportaciones, ayuda al desarrollo). El ICO no asume el riesgo.', actores: ['estado', 'ico', 'ayudas'], flujos: [5, 6] },
      { texto: 'Para el examen: mediación → riesgo del banco · directa (> 10 M€) → riesgo del ICO · agencia del Estado → el ICO no arriesga. Es entidad de crédito, pero no de depósito.', actores: ['ico', 'banco', 'proyecto', 'ayudas'], flujos: [] },
    ],
  },
  {
    id: 'ede',
    conceptoIds: ['ede'],
    titulo: 'Dinero electrónico: las tres E',
    actores: [
      A('cliente', 'Tú', '👤', 12, 50),
      A('ede', 'Entidad de dinero electrónico', '📱', 46, 50),
      A('comercio', 'Otra empresa (comercio)', '🏪', 84, 50),
      A('bde', 'Banco de España', '🏛️', 46, 12),
      A('sepblac', 'SEPBLAC', '🔎', 84, 12),
    ],
    flujos: [
      F('cliente', 'ede', 'entregas dinero', 'dinero'),
      F('ede', 'cliente', 'saldo electrónico', 'documento'),
      F('cliente', 'comercio', 'pagas con ese saldo', 'dinero'),
      F('comercio', 'ede', 'lo exige a la EDE', 'documento'),
      F('sepblac', 'bde', 'informe previo', 'supervision'),
      F('bde', 'ede', 'autoriza', 'supervision'),
    ],
    pasos: [
      { texto: 'Una EDE emite dinero electrónico: le das dinero y te devuelve un saldo almacenado en soporte electrónico.', actores: ['cliente', 'ede'], flujos: [0, 1] },
      { texto: 'Ese saldo es un medio de pago aceptado por empresas distintas de la emisora ("extraños").', actores: ['cliente', 'comercio'], flujos: [2] },
      { texto: 'Es exigible a su emisor: quien lo recibe puede pedírselo a la EDE.', actores: ['comercio', 'ede'], flujos: [3] },
      { texto: 'Ley 21/2011. Las autoriza el Banco de España, previo informe del SEPBLAC. Truco: Exigible · Electrónico · aceptado por Extraños.', actores: ['bde', 'sepblac', 'ede'], flujos: [4, 5] },
    ],
  },
  {
    id: 'sgr',
    conceptoIds: ['sgr'],
    titulo: 'SGR: "yo te avalo"',
    actores: [
      A('pyme', 'Pyme (socia)', '🏢', 14, 50),
      A('banco', 'Banco', '🏦', 82, 50),
      A('sgr', 'SGR', '🤝', 48, 18),
      A('cersa', 'CERSA', '🛡️', 48, 82),
    ],
    flujos: [
      F('pyme', 'banco', 'pide un préstamo', 'documento'),
      F('pyme', 'sgr', 'es socia', 'documento'),
      F('sgr', 'banco', 'aval', 'garantia'),
      F('banco', 'pyme', 'préstamo en mejores condiciones', 'dinero'),
      F('cersa', 'sgr', 'reaval', 'garantia'),
    ],
    pasos: [
      { texto: 'Una pyme pide financiación al banco, pero no consigue el préstamo o le salen malas condiciones.', actores: ['pyme', 'banco'], flujos: [0] },
      { texto: 'La SGR es una sociedad mercantil de capital variable cuyos socios son las pymes: concede avales a sus socios.', actores: ['pyme', 'sgr'], flujos: [1, 2] },
      { texto: 'Con el aval, el banco dice que sí: la pyme obtiene financiación bancaria en mejores condiciones.', actores: ['banco', 'pyme', 'sgr'], flujos: [3] },
      { texto: 'Las SGR tienen un sistema de reaval (CERSA). Ojo en el examen: sus socios son las pymes, no los bancos. SGR avala ≠ EFC presta.', actores: ['cersa', 'sgr'], flujos: [4] },
    ],
  },
  {
    id: 'efc',
    conceptoIds: ['efc'],
    titulo: 'EFC: prestan, pero no pueden captar depósitos',
    actores: [
      A('ahorrador', 'Ahorrador', '🐷', 12, 18),
      A('efc', 'EFC', '🏪', 46, 50),
      A('empresa', 'Empresa', '🏢', 84, 18),
      A('furgoneta', 'Bien (p. ej. furgoneta)', '🚚', 84, 50),
      A('clientes', 'Facturas de clientes', '🧾', 12, 82),
      A('proveedores', 'Proveedores', '📦', 84, 82),
    ],
    flujos: [
      F('ahorrador', 'efc', 'depósito: prohibido', 'prohibido'),
      F('efc', 'empresa', 'leasing: alquiler con opción de compra', 'dinero'),
      F('furgoneta', 'empresa', 'uso del bien', 'documento'),
      F('clientes', 'efc', 'factoring: cedes tus facturas', 'documento'),
      F('efc', 'empresa', 'cobras ya', 'dinero'),
      F('efc', 'proveedores', 'confirming: gestiona tus pagos', 'dinero'),
    ],
    pasos: [
      { texto: 'Los EFC son entidades de crédito especializadas (Ley 5/2015) que NO pueden captar depósitos del público. Es la diferencia clave con un banco.', actores: ['efc', 'ahorrador'], flujos: [0] },
      { texto: 'Leasing: arrendamiento financiero con opción de compra. Alquilas una furgoneta y al final puedes comprarla.', actores: ['efc', 'empresa', 'furgoneta'], flujos: [1, 2] },
      { texto: 'Factoring: cesión de la cartera de cobros. Cedes tus facturas para cobrar ya.', actores: ['clientes', 'efc', 'empresa'], flujos: [3, 4] },
      { texto: 'Confirming: gestión integral de los pagos a proveedores. Además: créditos al consumo, hipotecas, avales y tarjetas.', actores: ['efc', 'proveedores'], flujos: [5] },
    ],
  },
  {
    id: 'fgd',
    conceptoIds: ['fgd'],
    titulo: 'Fondo de Garantía de Depósitos: el paraguas de 100.000 €',
    actores: [
      A('tu', 'Tú: 150.000 € depositados', '👤', 14, 50),
      A('banco', 'Banco que quiebra', '🏚️', 48, 18),
      A('fgd', 'FGDEC', '☂️', 48, 82),
      A('recuperas', 'Recuperas 100.000 €', '💶', 86, 50),
    ],
    flujos: [
      F('tu', 'banco', 'depósito', 'dinero'),
      F('banco', 'fgd', 'adhesión obligatoria', 'garantia'),
      F('fgd', 'recuperas', 'hasta 100.000 € por titular y entidad', 'dinero'),
    ],
    pasos: [
      { texto: 'Tienes 150.000 € en un banco. Todas las entidades de crédito españolas están adheridas obligatoriamente al Fondo (voluntario para sucursales de la UE).', actores: ['tu', 'banco', 'fgd'], flujos: [0, 1] },
      { texto: 'El banco quiebra: el FGDEC garantiza los depósitos en dinero hasta 100.000 € por titular y entidad. Recuperas 100.000 €, no 150.000.', actores: ['fgd', 'recuperas'], flujos: [2] },
      { texto: 'Real Decreto Ley 16/2011: los tres fondos (bancos, cajas y cooperativas) se unificaron en el FGDEC. Para clientes de ESI y gestoras de IIC existe el FOGAIN. Ojo: el FGD devuelve depósitos; el MUR resuelve la entidad.', actores: ['fgd'], flujos: [] },
    ],
  },
  {
    id: 'fondo',
    conceptoIds: ['fondo'],
    titulo: 'Fondo de inversión: quién hace qué',
    actores: [
      A('participes', 'Partícipes', '👥', 12, 50),
      A('fondo', 'Fondo (patrimonio)', '🧺', 48, 50),
      A('gestora', 'Sociedad gestora', '👔', 48, 14),
      A('depositaria', 'Entidad depositaria', '🔐', 48, 86),
      A('activos', 'Inversiones', '📈', 86, 50),
    ],
    flujos: [
      F('participes', 'fondo', 'aportan dinero → participaciones', 'dinero'),
      F('gestora', 'fondo', 'administra e invierte (comisión)', 'documento'),
      F('fondo', 'activos', 'invierte', 'dinero'),
      F('depositaria', 'fondo', 'custodia los títulos y vigila', 'supervision'),
    ],
    pasos: [
      { texto: 'Un fondo es el patrimonio de varios inversores (partícipes), dividido en participaciones. NO tiene personalidad jurídica.', actores: ['participes', 'fondo'], flujos: [0] },
      { texto: 'Por eso necesita obligatoriamente una sociedad gestora, que lo administra e invierte a cambio de una comisión…', actores: ['gestora', 'fondo', 'activos'], flujos: [1, 2] },
      { texto: '…y una entidad depositaria (banco, caja o sociedad de valores inscrita en la CNMV) que custodia los títulos y vigila a la gestora.', actores: ['depositaria', 'fondo'], flujos: [3] },
      { texto: 'Valor liquidativo = patrimonio ÷ número de participaciones. Caso práctico 5: 4 amigos ponen 10.000 € → 40 participaciones de 1.000 €; si el fondo sube a 80.000 €, cada una vale 2.000 €.', actores: ['fondo', 'participes'], flujos: [] },
    ],
  },
  {
    id: 'sociedad-inv',
    conceptoIds: ['sociedad-inv'],
    titulo: 'Sociedad de inversión frente a fondo',
    actores: [
      A('accionistas', 'Accionistas', '👥', 12, 50),
      A('sa', 'SICAV o SII (sociedad anónima)', '🏢', 48, 50),
      A('gestora', 'Gestora: no obligatoria', '👔', 48, 14),
      A('depositaria', 'Depositaria: sí', '🔐', 48, 86),
      A('sicav', 'SICAV: activos financieros', '📈', 86, 28),
      A('sii', 'SII: inmuebles urbanos para alquilar', '🏠', 86, 74),
    ],
    flujos: [
      F('accionistas', 'sa', 'compran acciones', 'dinero'),
      F('gestora', 'sa', 'no hace falta', 'prohibido'),
      F('depositaria', 'sa', 'custodia', 'supervision'),
      F('sa', 'sicav', 'invierte', 'dinero'),
      F('sa', 'sii', 'compra y alquila', 'dinero'),
    ],
    pasos: [
      { texto: 'Una sociedad de inversión es una IIC con forma de sociedad anónima: tiene personalidad jurídica propia y sus socios son accionistas.', actores: ['accionistas', 'sa'], flujos: [0] },
      { texto: 'Por tener personalidad jurídica NO necesita obligatoriamente una sociedad gestora, pero SÍ una entidad depositaria.', actores: ['gestora', 'depositaria', 'sa'], flujos: [1, 2] },
      { texto: 'SICAV: invierte en activos financieros (sus acciones suelen cotizar en bolsa). SII: compra inmuebles urbanos para alquilarlos.', actores: ['sa', 'sicav', 'sii'], flujos: [3, 4] },
    ],
  },
  {
    id: 'valores',
    conceptoIds: ['sv', 'av'],
    titulo: 'Dealer frente a bróker',
    actores: [
      A('cliente', 'Cliente', '👤', 12, 50),
      A('av', 'Agencia de valores (bróker)', '📨', 46, 18),
      A('sv', 'Sociedad de valores (dealer)', '🤲', 46, 82),
      A('mercado', 'Mercado', '📈', 86, 50),
    ],
    flujos: [
      F('cliente', 'av', 'orden', 'documento'),
      F('av', 'mercado', 'solo por cuenta ajena', 'documento'),
      F('cliente', 'sv', 'orden', 'documento'),
      F('sv', 'mercado', 'cuenta ajena', 'documento'),
      F('sv', 'mercado', 'cuenta propia: su dinero', 'dinero'),
    ],
    pasos: [
      { texto: 'Agencia de valores (bróker): recibe, transmite y ejecuta las órdenes de sus clientes. Opera únicamente por cuenta ajena.', actores: ['cliente', 'av', 'mercado'], flujos: [0, 1] },
      { texto: 'Sociedad de valores (dealer): ejecuta tu orden y, a la vez, puede invertir su propio dinero. Opera por cuenta ajena y por cuenta propia.', actores: ['cliente', 'sv', 'mercado'], flujos: [2, 3, 4] },
      { texto: 'Truco: "Dos manos = sociedad; una flecha = agencia". Ambas son empresas de servicios de inversión, como las gestoras de carteras y las EAF.', actores: ['av', 'sv'], flujos: [] },
    ],
  },
  {
    id: 'seguros',
    conceptoIds: ['seguros'],
    titulo: 'Contrato de seguro: cuatro papeles',
    actores: [
      A('tomador', 'Tomador (contrata y paga)', '✍️', 12, 30),
      A('aseguradora', 'Aseguradora', '🛡️', 50, 30),
      A('asegurado', 'Asegurado (persona o bien expuesto)', '🧍', 12, 80),
      A('beneficiario', 'Beneficiario', '🎁', 88, 30),
      A('siniestro', 'Siniestro', '⚡', 50, 80),
    ],
    flujos: [
      F('tomador', 'aseguradora', 'prima', 'dinero'),
      F('siniestro', 'asegurado', 'ocurre', 'riesgo'),
      F('aseguradora', 'beneficiario', 'indemnización', 'dinero'),
    ],
    pasos: [
      { texto: 'El tomador contrata la póliza y paga la prima a la aseguradora, que asume el riesgo.', actores: ['tomador', 'aseguradora'], flujos: [0] },
      { texto: 'El asegurado es la persona o el bien expuesto al riesgo. Si ocurre el siniestro…', actores: ['asegurado', 'siniestro'], flujos: [1] },
      { texto: '…la aseguradora paga la indemnización al beneficiario. Ejemplo: seguro de vida de tu padre a tu favor: él es el tomador, su vida es lo asegurado y tú el beneficiario.', actores: ['aseguradora', 'beneficiario'], flujos: [2] },
      { texto: 'Son intermediarios financieros no bancarios: la póliza no es medio de pago. Los supervisa la DGSFP.', actores: ['aseguradora'], flujos: [] },
    ],
  },
  {
    id: 'bancos-centrales',
    conceptoIds: ['sebc', 'eurosistema', 'bce'],
    titulo: 'SEBC ⊃ Eurosistema ⊃ BCE',
    grupos: [
      { etiqueta: 'SEBC: BCE + bancos centrales de toda la UE', x: 4, y: 6, ancho: 92, alto: 88 },
      { etiqueta: 'Eurosistema: BCE + bancos centrales con euro', x: 8, y: 22, ancho: 56, alto: 66 },
    ],
    actores: [
      A('bce', 'BCE (Frankfurt)', '🧠', 36, 42),
      A('bde', 'Banco de España', '🇪🇸', 18, 72),
      A('bdf', 'Banco de Francia', '🇫🇷', 50, 72),
      A('suecia', 'Banco central de Suecia', '🇸🇪', 82, 52),
    ],
    flujos: [],
    pasos: [
      { texto: 'El BCE es el banco central de los países de la UE con euro: mantiene la estabilidad de precios y da la autorización final para crear nuevas entidades de crédito.', actores: ['bce'], flujos: [] },
      { texto: 'Eurosistema = BCE + bancos centrales nacionales de los países con euro (como el Banco de España). Define la política monetaria y autoriza la emisión de billetes y monedas.', actores: ['bce', 'bde', 'bdf'], flujos: [], grupos: [1] },
      { texto: 'SEBC = BCE + bancos centrales de TODOS los países de la UE, tengan o no el euro. El de Suecia está en el SEBC, pero no en el Eurosistema.', actores: ['bce', 'bde', 'bdf', 'suecia'], flujos: [], grupos: [0, 1] },
    ],
  },
  {
    id: 'supervisores',
    conceptoIds: ['bde', 'cnmv', 'dgsfp'],
    titulo: 'Quién vigila a quién',
    actores: [
      A('bde', 'Banco de España', '🏛️', 16, 18),
      A('cnmv', 'CNMV', '🔎', 50, 18),
      A('dgsfp', 'DGSFP', '🛡️', 84, 18),
      A('credito', 'Bancos, cajas, cooperativas, ICO, EFC, EDE', '🏦', 16, 78),
      A('valores', 'Bolsa, ESI e IIC (fondos y sociedades)', '📈', 50, 78),
      A('seguros', 'Aseguradoras y fondos de pensiones', '☂️', 84, 78),
    ],
    flujos: [
      F('bde', 'credito', 'solvencia y normas', 'supervision'),
      F('cnmv', 'valores', 'mercados de valores', 'supervision'),
      F('dgsfp', 'seguros', 'seguros y pensiones', 'supervision'),
    ],
    pasos: [
      { texto: 'La supervisión en España va por el tipo de producto y de mercado, no por la oficina donde se vende. Banco de España: entidades de crédito (y EFC).', actores: ['bde', 'credito'], flujos: [0] },
      { texto: 'CNMV: mercados de valores (bolsa), empresas de servicios de inversión e instituciones de inversión colectiva.', actores: ['cnmv', 'valores'], flujos: [1] },
      { texto: 'DGSFP (Ministerio de Economía): compañías aseguradoras y fondos de pensiones.', actores: ['dgsfp', 'seguros'], flujos: [2] },
    ],
  },
  {
    id: 'mus-mur',
    conceptoIds: ['mus', 'mur'],
    titulo: 'MUS vigila, MUR resuelve',
    actores: [
      A('mus', 'MUS (liderado por el BCE)', '👁️', 16, 30),
      A('banco', 'Banco de la zona euro', '🏦', 50, 30),
      A('crisis', 'Banco no viable', '🔥', 50, 80),
      A('mur', 'MUR', '🚒', 84, 80),
    ],
    flujos: [
      F('mus', 'banco', 'regulación, supervisión, corrección, sanción', 'supervision'),
      F('banco', 'crisis', 'si deja de ser viable', 'riesgo'),
      F('mur', 'crisis', 'resolución ordenada', 'supervision'),
    ],
    pasos: [
      { texto: 'El MUS es el supervisor bancario único de la zona euro, en funcionamiento desde el 4 de noviembre de 2014. Cuatro elementos: regulación, supervisión continuada, medidas correctoras y régimen sancionador.', actores: ['mus', 'banco'], flujos: [0] },
      { texto: 'Si una entidad deja de ser viable, entra en juego el MUR, que trabaja junto al MUS para gestionar su crisis.', actores: ['banco', 'crisis', 'mur'], flujos: [1, 2] },
      { texto: 'MUS = "te vigilo"; MUR = "si hay incendio, intervengo". No confundas el MUR con el FGD: el FGD devuelve depósitos; el MUR resuelve la entidad.', actores: ['mus', 'mur'], flujos: [] },
    ],
  },
];
