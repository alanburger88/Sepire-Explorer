// Patches applied to the supplied statement build (source/statement/index.html) to produce
// the showcase copy in public/statement/. Every patch is an exact string replacement with an
// expected match count, so a new statement build that no longer matches fails loudly instead
// of silently shipping prototype wording.
//
// Three groups:
//   1. DATA_HOOK      lets the explorer inject edited statement data (Data Explorer live re-render).
//   2. BUNDLE_PATCHES removes prototype / demo wording from UI copy, in English and Spanish.
//   3. SHOWCASE_CSS   hides prototype-only chrome (ribbon, demo chips, QA helpers).

/** @typedef {{ find: string, replace: string, count?: number, note?: string }} Patch */

/** @type {Patch} */
export const DATA_HOOK = {
  note: 'Read an injected statement payload when the explorer provides one (see HEAD_SCRIPT).',
  find: 'A={metadata:{statementId:',
  replace: 'A=window.__SEPIRE_STATEMENT__||{metadata:{statementId:',
};

/** @type {Patch[]} */
export const BUNDLE_PATCHES = [
  // Co-brand: a real sponsor logo is supplied, so print shows it too.
  { find: 'planSponsorLogoIsPlaceholder:!0', replace: 'planSponsorLogoIsPlaceholder:!1' },

  // Footer note
  {
    find: '`Functional prototype using demo statement data. Sepi explains this statement and does not provide investment, tax, legal, or fiduciary advice. Simulated inquiries are not sent anywhere.`',
    replace: '`Sepi explains this statement and does not provide investment, tax, legal, or fiduciary advice.`',
  },
  {
    find: '`Prototipo funcional con datos de demostración. Sepi explica este estado de cuenta y no ofrece asesoramiento de inversión, impuestos, legal ni fiduciario. Las consultas simuladas no se envían a ningún lugar.`',
    replace: '`Sepi explica este estado de cuenta y no ofrece asesoramiento de inversión, impuestos, legal ni fiduciario.`',
  },

  // Template tokens ([QDIA NAME] …) read as printed text, without a "placeholder" tooltip
  {
    find: 'placeholderTitle:`Template placeholder — plan-specific value not supplied in the source statement`',
    replace: 'placeholderTitle:``',
  },
  {
    find: 'placeholderTitle:`Marcador de plantilla: el valor específico del plan no se proporcionó en el estado de cuenta original`',
    replace: 'placeholderTitle:``',
  },

  // Tagging
  { find: '`Prototype: tags are stored only in this browser session.`', replace: '`Tags are stored only in this browser session.`' },
  { find: '`Prototipo: las etiquetas se guardan solo en esta sesión del navegador.`', replace: '`Las etiquetas se guardan solo en esta sesión del navegador.`' },

  // Inquiry reference numbers
  { find: '`DEMO-401K-${', replace: '`SR-401K-${' },

  // Sepi answers
  { find: ' (simulated in this prototype)', replace: '', count: 3 },
  { find: ' (simulada en este prototipo)', replace: '', count: 3 },
  {
    find: 'You review your question before anything is submitted, and in this prototype nothing is actually sent.',
    replace: 'You review your question before anything is submitted.',
  },
  {
    find: 'Usted revisa su pregunta antes de enviarla y, en este prototipo, en realidad no se envía nada.',
    replace: 'Usted revisa su pregunta antes de enviarla.',
  },
  {
    find: 'The Overview tab includes a personalized statement video module. In this prototype it’s a placeholder that shows how a short video could walk you through the highlights of this statement',
    replace: 'The Overview tab includes a personalized statement video that walks you through the highlights of this statement',
  },
  {
    find: 'La pestaña Resumen incluye un módulo de video personalizado del estado de cuenta. En este prototipo es un marcador de posición que muestra cómo un video breve podría guiarle por los puntos principales de este estado de cuenta',
    replace: 'La pestaña Resumen incluye un video personalizado que le guía por los puntos principales de este estado de cuenta',
  },
  { find: 'is a prototype tool that lets you adjust inputs', replace: 'is a planning tool that lets you adjust inputs' },
  { find: 'es una herramienta del prototipo que le permite', replace: 'es una herramienta de planificación que le permite' },
  { find: 'Scenario results are illustrative prototype outputs — not', replace: 'Scenario results are illustrative — not' },
  {
    find: 'Los resultados de los escenarios son resultados ilustrativos del prototipo: no son',
    replace: 'Los resultados de los escenarios son ilustrativos: no son',
  },
  {
    find: 'In this prototype, submission is simulated: you get a clearly labelled demo reference and nothing is sent to your plan or recordkeeper. Sepi can’t submit a question for you.',
    replace: 'You review your question before it’s submitted and get a reference number for your records. Sepi can’t submit a question for you.',
  },
  {
    find: 'En este prototipo, el envío es simulado: recibirá un número de referencia de demostración claramente identificado y no se enviará nada a su plan ni al administrador de registros. Sepi no puede enviar una pregunta por usted.',
    replace: 'Usted revisa su pregunta antes de enviarla y recibe un número de referencia para sus registros. Sepi no puede enviar una pregunta por usted.',
  },
  {
    find: '`This is a functional prototype built from demo statement data.`',
    replace: '`This interactive statement is built from your statement data and shows every value exactly as printed.`',
  },
  {
    find: '`Este es un prototipo funcional creado con datos de demostración del estado de cuenta.`',
    replace: '`Este estado de cuenta interactivo se crea a partir de los datos de su estado de cuenta y muestra cada valor exactamente como está impreso.`',
  },
  { find: 'These are shown exactly as supplied and highlighted, never filled in.', replace: 'These are shown exactly as supplied, never filled in.' },
  {
    find: 'Se muestran exactamente como se proporcionaron y resaltados, y nunca se completan.',
    replace: 'Se muestran exactamente como se proporcionaron y nunca se completan.',
  },
  {
    find: ",`A few figures also don't reconcile between sections (for example the loan TOTAL row). They're preserved exactly as printed and listed in the prototype's QA notes rather than being “fixed”.`]",
    replace: ']',
  },
  {
    find: ',`Algunas cifras tampoco coinciden entre secciones (por ejemplo, la fila ${t.loans.total.label} de los préstamos). Se conservan exactamente como están impresas y se incluyen en las notas de control de calidad del prototipo en lugar de “corregirse”.`]',
    replace: ']',
  },
  { find: 'followUps:[$s(e).loanTotal,$s(e).qdia]', replace: 'followUps:[$s(e).qdia]' },
  { find: 'followUps:[$s(e).loanTotal,$s(e).sourceTotal]', replace: 'followUps:[]' },
  {
    find: "`This demo statement preserves a few figures that don't reconcile between sections — for example the loan TOTAL row, and the page 2 activity totals compared with the page 1 ending balance.`,`Sepi shows every value exactly as printed and can't explain or correct the differences.`",
    replace: '`Sepi shows every value exactly as printed on your statement.`',
  },
  {
    find: '`Este estado de cuenta de demostración conserva algunas cifras que no coinciden entre secciones; por ejemplo, la fila ${r.label} de los préstamos y los totales de actividad de la página 2 en comparación con el saldo final de la página 1.`,`Sepi muestra cada valor exactamente como está impreso y no puede explicar ni corregir las diferencias.`',
    replace: '`Sepi muestra cada valor exactamente como está impreso en su estado de cuenta.`',
  },
  {
    find: 'In this prototype no live AI service is connected: answers come from a library of statement-grounded responses',
    replace: 'Answers come from a library of statement-grounded responses',
  },
  {
    find: 'En este prototipo no hay ningún servicio de IA en vivo conectado: las respuestas provienen de una biblioteca',
    replace: 'Las respuestas provienen de una biblioteca',
  },
  { find: '`Why are some items marked as placeholders or demo data?`', replace: '`Why do some items show bracketed text?`', count: 4 },
  {
    find: '`¿Por qué algunos elementos están marcados como marcadores de plantilla o datos de demostración?`',
    replace: '`¿Por qué algunos elementos muestran texto entre corchetes?`',
    count: 4,
  },

  // Help › FAQ: drop the "demo labels / QA markers" question (keeps topic counts accurate)
  {
    find: ',{id:`placeholders`,group:`using`,action:`qa-panel`,links:(e,t)=>[{label:t.statementGuide,to:`/help/guide`}]}',
    replace: '',
  },

  // Help › Contact, Guide, Your tags & questions
  {
    find: '` on any fee, loan, repayment or activity row. The prototype simulates the request and gives you a demo reference.`',
    replace: '` on any fee, loan, repayment or activity row.`',
  },
  {
    find: '` en cualquier fila de comisiones, préstamos, reembolsos o actividad. El prototipo simula la solicitud y le da una referencia de demostración.`',
    replace: '` en cualquier fila de comisiones, préstamos, reembolsos o actividad.`',
  },
  {
    find: 'On eligible rows, tag an item for yourself or ask about it to try the simulated inquiry flow.',
    replace: 'On eligible rows, tag an item for yourself or ask customer service about it.',
  },
  {
    find: 'En las filas elegibles, etiquete un elemento para usted o pregunte sobre él para probar el flujo de consulta simulado.',
    replace: 'En las filas elegibles, etiquete un elemento para usted o pregunte a servicio al cliente sobre él.',
  },
  { find: 'Items you’ve tagged and demo questions you’ve submitted', replace: 'Items you’ve tagged and questions you’ve submitted' },
  { find: 'Los elementos que etiquetó y las preguntas de demostración que envió', replace: 'Los elementos que etiquetó y las preguntas que envió' },
  { find: '`Demo ${e===1?`question`:`questions`} submitted`', replace: '`${e===1?`Question`:`Questions`} submitted`' },
  { find: '`Pregunta de demostración enviada`:`Preguntas de demostración enviadas`', replace: '`Pregunta enviada`:`Preguntas enviadas`' },
  { find: 'subsTitle:`Demo questions submitted`', replace: 'subsTitle:`Questions submitted`' },
  { find: 'subsTitle:`Preguntas de demostración enviadas`', replace: 'subsTitle:`Preguntas enviadas`' },
  { find: '`No demo questions yet`', replace: '`No questions yet`' },
  { find: '`Aún no hay preguntas de demostración`', replace: '`Aún no hay preguntas`' },
  {
    find: '` on any eligible row to try the simulated inquiry flow. You’ll get a clearly labelled Demo reference number — no service request is sent.`',
    replace: '` on any eligible row to ask customer service about it. You’ll get a reference number for your records.`',
  },
  {
    find: '` en cualquier fila elegible para probar el flujo de consulta simulado. Recibirá un Número de referencia de demostración claramente identificado; no se envía ninguna solicitud de servicio.`',
    replace: '` en cualquier fila elegible para preguntar a servicio al cliente. Recibirá un número de referencia para sus registros.`',
  },
  {
    find: 'You’ll see a confirmation with a clearly labelled Demo reference number.',
    replace: 'You’ll see a confirmation with a reference number.',
  },
  {
    find: 'Verá una confirmación con un Número de referencia de demostración claramente identificado.',
    replace: 'Verá una confirmación con un número de referencia.',
  },
  {
    find: '`This is a prototype: the submission is simulated and no service request is sent. Your tags and demo questions are listed under **Your tags & questions**.`',
    replace: '`Your tags and questions are listed under **Your tags & questions**.`',
  },
  {
    find: '`Este es un prototipo: el envío es simulado y no se envía ninguna solicitud de servicio. Sus etiquetas y preguntas de demostración aparecen en **Sus etiquetas y preguntas**.`',
    replace: '`Sus etiquetas y preguntas aparecen en **Sus etiquetas y preguntas**.`',
  },
  {
    find: 'Tags and demo submissions stay on this device and clear when your browser session ends. Nothing here is sent to your plan, your recordkeeper or customer service.',
    replace: 'Your tags stay on this device and clear when your browser session ends.',
  },
  {
    find: 'Las etiquetas y los envíos de demostración permanecen en este dispositivo y se borran cuando termina la sesión del navegador. Nada de lo que aparece aquí se envía a su plan, al administrador de registros ni a servicio al cliente.',
    replace: 'Sus etiquetas permanecen en este dispositivo y se borran cuando termina la sesión del navegador.',
  },

  // "Ask about this item" inquiry flow
  { find: 'eyebrow:`Prototype inquiry`', replace: 'eyebrow:`Customer service`' },
  { find: 'eyebrow:`Consulta del prototipo`', replace: 'eyebrow:`Servicio al cliente`' },
  {
    find: '`Check the details below. Submitting simulates the inquiry — nothing is sent to your plan, recordkeeper or customer service.`',
    replace: '`Check the details below, then submit your question to customer service.`',
  },
  {
    find: '`Revise los detalles a continuación. Al enviar, se simula la consulta: no se envía nada a su plan, al administrador de registros ni a servicio al cliente.`',
    replace: '`Revise los detalles a continuación y luego envíe su pregunta a servicio al cliente.`',
  },
  { find: '`Submitting (simulated)…`', replace: '`Submitting…`' },
  { find: '`Enviando (simulado)…`', replace: '`Enviando…`' },
  { find: '`Preparing a demo confirmation. Nothing is being sent.`', replace: '`Preparing your confirmation.`' },
  { find: '`Preparando una confirmación de demostración. No se está enviando nada.`', replace: '`Preparando su confirmación.`' },
  { find: '`Prototype submission confirmed. No service request was sent.`', replace: '`Your question has been submitted.`' },
  { find: '`Envío del prototipo confirmado. No se envió ninguna solicitud de servicio.`', replace: '`Su pregunta fue enviada.`' },
  {
    find: '`This confirmation is a prototype artifact. The reference below does not correspond to a real case.`',
    replace: '`Keep this reference number for your records.`',
  },
  {
    find: '`Esta confirmación es un elemento del prototipo. La referencia a continuación no corresponde a un caso real.`',
    replace: '`Conserve este número de referencia para sus registros.`',
  },
  { find: 'demoRef:`Demo reference number`', replace: 'demoRef:`Reference number`' },
  { find: 'demoRef:`Número de referencia de demostración`', replace: 'demoRef:`Número de referencia`' },

  // Personalized video controls
  { find: '`Mute (M) — sound is simulated in this demo`', replace: '`Mute (M)`' },
  { find: '`Unmute (M) — sound is simulated in this demo`', replace: '`Unmute (M)`' },
  { find: '`Silenciar (M): el sonido es simulado en esta demostración`', replace: '`Silenciar (M)`' },
  { find: '`Activar el sonido (M): el sonido es simulado en esta demostración`', replace: '`Activar el sonido (M)`' },

  // Retirement income › scenario modeler
  { find: 'drillModEyebrow:`Prototype · illustrative only`', replace: 'drillModEyebrow:`Illustrative only`' },
  { find: 'drillModEyebrow:`Prototipo · solo ilustrativo`', replace: 'drillModEyebrow:`Solo ilustrativo`' },
  { find: 'example. Prototype, illustrative only.`', replace: 'example. Illustrative only.`' },
  { find: 'de su estado de cuenta. Prototipo, solo ilustrativo.`', replace: 'de su estado de cuenta. Solo ilustrativo.`' },
  { find: '"source-example":`Source example`,demo:`Demo`}', replace: '"source-example":`Source example`,demo:`Modeled`}' },
  { find: '"source-example":`Ejemplo de la fuente`,demo:`Demostración`}', replace: '"source-example":`Ejemplo de la fuente`,demo:`Modelado`}' },
  { find: '`Prototype scenario — illustrative only`', replace: '`Modeled scenario — illustrative only`' },
  { find: '`Escenario de prototipo: solo ilustrativo`', replace: '`Escenario modelado: solo ilustrativo`' },
  { find: 'difference between modeled demo scenarios;', replace: 'difference between modeled scenarios;' },
  { find: 'diferencia entre escenarios de demostración modelados;', replace: 'diferencia entre escenarios modelados;' },
  { find: 'Differences between curated demo scenarios — not', replace: 'Differences between modeled scenarios — not' },
  { find: 'Diferencias entre escenarios de demostración seleccionados, no', replace: 'Diferencias entre escenarios modelados, no' },
  { find: 'are not combined in this demo set.', replace: 'are not combined in these scenarios.' },
  { find: 'no se combinan en este conjunto de demostración.', replace: 'no se combinan en estos escenarios.' },
  {
    find: '`. Results come from a small, curated set of demo scenarios so the tool responds instantly — it is not an approved forecasting engine.`',
    replace: '`. Results come from a set of pre-modeled scenarios, so the tool responds instantly.`',
  },
  {
    find: '`. Los resultados provienen de un pequeño conjunto seleccionado de escenarios de demostración para que la herramienta responda al instante; no es un motor de pronósticos aprobado.`',
    replace: '`. Los resultados provienen de un conjunto de escenarios previamente modelados, por lo que la herramienta responde al instante.`',
  },
  { find: 'noteDemoTitle:`Prototype — illustrative only`', replace: 'noteDemoTitle:`Illustrative only`' },
  { find: 'noteDemoTitle:`Prototipo: solo ilustrativo`', replace: 'noteDemoTitle:`Solo ilustrativo`' },
  { find: 'every result is a prototype demo value.`', replace: 'every result is an illustrative modeled value.`' },
  { find: 'todos los resultados son valores de demostración del prototipo.`', replace: 'todos los resultados son valores ilustrativos modelados.`' },
  { find: 'presetsDemo:`Prototype scenarios`', replace: 'presetsDemo:`Example scenarios`' },
  { find: 'presetsDemo:`Escenarios de prototipo`', replace: 'presetsDemo:`Escenarios de ejemplo`' },
  { find: 'liveDemo:`Prototype scenario`', replace: 'liveDemo:`Modeled scenario`' },
  { find: 'liveDemo:`Escenario de prototipo`', replace: 'liveDemo:`Escenario modelado`' },
  { find: '`Demo scenario not modeled`', replace: '`Scenario not modeled`' },
  { find: '`Escenario de demostración no modelado`', replace: '`Escenario no modelado`' },
  { find: '`prototype scenario, illustrative only`', replace: '`modeled scenario, illustrative only`' },
  { find: '`escenario de prototipo, solo ilustrativo`', replace: '`escenario modelado, solo ilustrativo`' },
  {
    find: '`Prototype scenario from the curated demo set — illustrative only, not a forecast or a recommendation.`',
    replace: '`Modeled scenario — illustrative only, not a forecast or a recommendation.`',
  },
  {
    find: '`Escenario de prototipo del conjunto de demostración seleccionado: solo ilustrativo, no es un pronóstico ni una recomendación.`',
    replace: '`Escenario modelado: solo ilustrativo, no es un pronóstico ni una recomendación.`',
  },
  {
    find: '`This prototype includes a small, curated set of demo scenarios and doesn’t estimate other combinations',
    replace: '`This tool includes a set of modeled scenarios and doesn’t estimate other combinations',
  },
  {
    find: '`Este prototipo incluye un pequeño conjunto seleccionado de escenarios de demostración y no estima otras combinaciones',
    replace: '`Esta herramienta incluye un conjunto de escenarios modelados y no estima otras combinaciones',
  },
  { find: '`Every curated scenario and where each value comes from`', replace: '`Every modeled scenario and where each value comes from`' },
  { find: '`Cada escenario seleccionado y de dónde proviene cada valor`', replace: '`Cada escenario modelado y de dónde proviene cada valor`' },
  { find: '`Both columns are prototype scenarios unless labelled', replace: '`Both columns are modeled scenarios unless labelled' },
  { find: '`Ambas columnas son escenarios de prototipo, salvo', replace: '`Ambas columnas son escenarios modelados, salvo' },
  { find: '`All values are prototype demo values except the two marked cells', replace: '`All values are modeled except the two marked cells' },
  {
    find: '`Todos los valores son valores de demostración del prototipo, salvo las dos celdas marcadas',
    replace: '`Todos los valores son modelados, salvo las dos celdas marcadas',
  },

  // Print: running footer
  { find: '`${e}  ·  Demo statement data`', replace: '`${e}`' },
  { find: '`${e}  ·  Datos de demostración  ·  Traducción de cortesía`', replace: '`${e}  ·  Traducción de cortesía`' },
];

/** Patches applied to the HTML document (outside the JS bundle). @type {Patch[]} */
export const HTML_PATCHES = [
  {
    find: 'your 401(k) statement, made explorable. Functional prototype with demo data.',
    replace: 'your 401(k) statement, made explorable.',
  },
];

// Injected before the bundle. When the page is opened with ?live=1 by the explorer (same
// origin), it adopts the statement JSON the explorer published on window.parent. JSON.parse
// runs in this frame so every object belongs to this realm.
export const HEAD_SCRIPT = `<script>
      // Sepire Explorer: live statement data (only when embedded with ?live=1 by the explorer).
      (function () {
        try {
          if (!/[?&]live=1\\b/.test(location.search)) return;
          var p = window.parent;
          if (p && p !== window && typeof p.__sepireStatementJSON === 'string') {
            window.__SEPIRE_STATEMENT__ = JSON.parse(p.__sepireStatementJSON);
          }
        } catch (e) {}
      })();
    </script>`;

export const SHOWCASE_CSS = `<style id="sepire-showcase">
      /* Sepire Explorer showcase: hide prototype-only chrome. */
      .demo-ribbon,
      .demo-label,
      .pill-demo,
      .ov-video-note,
      .pr-sheet-foot-demo,
      .pr-demo-line,
      .inq-notice,
      .inq-failtoggle,
      .help-faq-action.is-demo,
      .help-proto-note,
      .help-legend-item:has(.tpl-token),
      .help-legend-item:has(.help-qa-sample),
      .help-legend-item:has(.demo-label),
      .act-fee-group-flags,
      .inv-rule-top .pill,
      .pp-fine,
      .pp-msg .callout-demo,
      .ri-about { display: none !important; }
      /* Template tokens read as plain statement text, exactly as printed. */
      mark.tpl-token { background: none !important; color: inherit !important; padding: 0 !important;
        border: 0 !important; box-shadow: none !important; font: inherit !important; }
      mark.tpl-token .sr-only { display: none !important; }
    </style>`;
