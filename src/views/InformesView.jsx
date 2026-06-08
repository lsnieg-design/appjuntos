import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, BookOpen, Printer, PieChart } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, deleteDoc } from 'firebase/firestore';

const CONFIG_INDICADORES = {
 pedagogico: {
  'Inicial': [
   { id: 'lectoescritura', label: 'Lectoescritura', options: ['Presilábico: Explora la escritura con dibujos o grafismos sin valor sonoro aún.', 'Silábico: Comienza a asignar valor sonoro a las letras, mayormente vocales.', 'Silábico-alfabético: Transición; combina sílabas completas con letras aisladas.', 'Alfabético: Escribe de forma autónoma representando los fonemas con coherencia.'] },
   { id: 'escritura', label: 'Escritura', options: ['Requiere guía física constante (mano-sobre-mano) para realizar grafismos.', 'Escribe mediante copia fiel o dictado fonético sencillo con apoyo docente.', 'Escribe frases cortas mediante dictado fonético con supervisión frecuente.', 'Escribe de forma autónoma y creativa, expresando ideas con sentido completo.'] },
   { id: 'comprension', label: 'Comprensión', options: ['No logra significar el texto, se limita a identificar imágenes.', 'Comprende textos breves y sencillos mediante lectura compartida.', 'Comprende el sentido global de textos breves de manera guiada.', 'Realiza lectura autónoma y comprende el sentido global de textos diversos.'] },
   { id: 'reconocimiento', label: 'Reconocimiento', options: ['Solo identifica su propio nombre entre otras palabras.', 'Reconoce nombre propio y de sus pares con facilidad.', 'Reconoce palabras de uso frecuente y frases cortas.', 'Lee palabras y frases con sentido completo de forma autónoma.'] },
   { id: 'serie_numerica', label: 'Serie numérica', options: ['Realiza conteo hasta 10, precisando apoyo con material concreto.', 'Realiza conteo hasta 20 y reconoce números en contextos cotidianos.', 'Maneja series numéricas amplias y reconoce familias numéricas.', 'Domina series numéricas complejas con total autonomía.'] },
   { id: 'operaciones', label: 'Operaciones', options: ['Identifica cantidades, pero no logra realizar operaciones.', 'Resuelve sumas y restas simples utilizando material didáctico.', 'Resuelve sumas y restas complejas con apoyo esporádico.', 'Resuelve problemas cotidianos con operaciones complejas autónomamente.'] },
   { id: 'figuras', label: 'Figuras y lógica', options: ['Identifica figuras básicas, pero requiere mediación para clasificarlas.', 'Clasifica elementos por forma, tamaño o color con supervisión.', 'Resuelve problemas simples de lógica y comparación.', 'Resuelve problemas de alta complejidad de forma autónoma.'] },
   { id: 'rutinas', label: 'Rutinas / Higiene', options: ['Requiere asistencia total y acompañamiento cercano en toda rutina.', 'Realiza rutinas básicas con supervisión constante y apoyo puntual.', 'Realiza rutinas con supervisión mínima y esporádica.', 'Es totalmente autónomo en sus rutinas escolares y cuidado personal.'] },
   { id: 'organizacion', label: 'Organización', options: ['Precisa que el adulto organice sus materiales de trabajo siempre.', 'Organiza sus materiales solo ante el recordatorio del docente.', 'Mantiene sus materiales organizados de forma independiente.', 'Anticipa y organiza todos los materiales necesarios antes de iniciar.'] },
   { id: 'pedido_ayuda', label: 'Pedido de ayuda', options: ['Ante la dificultad, se bloquea y espera la intervención externa.', 'Solicita ayuda mediante mediación o sugerencia del docente.', 'Identifica cuando necesita ayuda y la solicita ante la duda.', 'Es proactivo; ante un obstáculo busca soluciones antes de pedir ayuda.'] },
   { id: 'vinculo_pares', label: 'Vínculo con pares', options: ['Su juego es paralelo o solitario; le cuesta integrar a otros.', 'Interactúa con pares principalmente en actividades guiadas.', 'Se integra espontáneamente a juegos cooperativos grupales.', 'Lidera o propone actividades grupales de forma activa.'] },
   { id: 'vinculo_adulto', label: 'Vínculo adulto', options: ['Dependencia total del adulto para iniciar cualquier tarea.', 'Busca apoyo y validación constante de figuras adultas.', 'Busca apoyo solo ante dudas específicas o situaciones nuevas.', 'Establece un vínculo saludable de referencia, con autonomía.'] },
   { id: 'emocional', label: 'Expresión emocional', options: ['Ante malestar reacciona con impulsividad o conductas físicas.', 'Expresa su malestar verbalmente solo mediante mediación.', 'Expresa sus sentimientos de forma verbal con claridad.', 'Posee autorregulación y gestiona sus emociones de forma autónoma.'] },
   { id: 'pautas', label: 'Pautas / Turnos', options: ['No respeta pautas de convivencia ni turnos de habla.', 'Respeta pautas y turnos solo ante el recordatorio frecuente.', 'Respeta pautas y turnos con mínima guía docente.', 'Respeta los turnos y acuerdos de convivencia autónomamente.'] },
   { id: 'escucha', label: 'Escucha activa', options: ['Se encuentra desconectado de las consignas grupales.', 'Escucha si se lo interpela o busca individualmente.', 'Participa en la escucha de relatos o propuestas grupales.', 'Se muestra atento y responde correctamente a consignas grupales.'] },
   { id: 'conflictos', label: 'Conflictos', options: ['Reacciona con conductas físicas o impulsivas ante el conflicto.', 'Expresa el malestar pero requiere mediación docente directa.', 'Resuelve conflictos mediante el diálogo con intervención mínima.', 'Resuelve conflictos de forma autónoma, aceptando acuerdos de paz.'] },
   { id: 'desplazamiento', label: 'Desplazamiento', options: ['Necesita guía física permanente para transitar la escuela.', 'Reconoce los espacios, pero requiere recordatorios constantes.', 'Se desplaza por la escuela con recordatorios esporádicos.', 'Autónomo en toda la institución con sentido de pertenencia.'] },
   { id: 'juego', label: 'Tipo de juego', options: ['Su juego es puramente exploratorio y sensorial.', 'Desarrolla juego simbólico (imaginativo con elementos).', 'Participa en juegos reglados simples respetando turnos.', 'Propone y participa en juegos reglados complejos y creativos.'] },
   { id: 'ciencias', label: 'Ciencias / Indagación', options: ['Precisa modelado paso a paso para usar materiales. Muestra curiosidad puntual sin lograr sostener la observación.', 'Manipula los materiales con intención clara y sentido. Indaga sobre el entorno con mediación y preguntas docentes.', 'Realiza producciones propias con intención creativa. Manifiesta curiosidad, investiga fenómenos y busca explicaciones.', 'Utiliza y cuida los materiales con creatividad y autonomía. Investiga de forma independiente, proponiendo explicaciones propias.'] },
   { id: 'cuidado', label: 'Cuidado del entorno', options: ['No registra el entorno ni las pautas de cuidado.', 'Identifica normas de cuidado con supervisión constante.', 'Identifica y aplica normas de cuidado con mínima guía.', 'Autónomo en el cuidado del medio ambiente y los seres vivos.'] },
   { id: 'comunicacion', label: 'Comunicación', options: ['Comunicación reactiva; utiliza gestos básicos ante necesidad inmediata.', 'Comunicación funcional; usa señas, pictogramas o habla simple con apoyo.', 'Comunicación activa; comunica deseos y necesidades con frases breves.', 'Comunicación compleja; relata eventos y sostiene conversaciones con fluidez.'] },
   { id: 'funciones', label: 'Funciones Ejecutivas', options: ['Atención muy dispersa; requiere estímulos constantes para focalizar.', 'Atención breve; sigue instrucciones de un solo paso con mediación.', 'Atención sostenida en tareas cortas; sigue instrucciones de dos pasos.', 'Atención focalizada; sigue secuencias complejas con autonomía total.'] },
   { id: 'flexibilidad', label: 'Flexibilidad Cognitiva', options: ['Gran dificultad ante cambios: desregulación frente a lo imprevisto.', 'Acepta cambios en la rutina si se anticipan con apoyo visual.', 'Adapta su conducta ante cambios moderados con mínima mediación.', 'Alta flexibilidad; se ajusta a cambios imprevistos de forma autónoma.'] },
   { id: 'sensorial', label: 'Procesamiento Sensorial', options: ['Responde con desregulación ante estímulos ambientales (ruidos/luces).', 'Presenta sensibilidad alta; requiere espacios tranquilos para calmarse.', 'Registra estímulos ambientales sin que afecten significativamente su tarea.', 'Alta tolerancia sensorial; se autorregula adecuadamente en entornos activos.'] },
   { id: 'intereses', label: 'Intereses y Fortalezas', options: ['Su interés es restringido a objetos únicos sin variante.', 'Presenta intereses identificables que sirven como motivadores de tarea.', 'Utiliza sus pasiones para realizar actividades y socializar con pares.', 'Transfiere sus habilidades destacadas a múltiples contextos escolares.'] },
   { id: 'apoyos', label: 'Apoyos eficaces', options: ['Requiere apoyos físicos y contacto directo constante.', 'Requiere agendas visuales y soportes concretos permanentes.', 'Utiliza apoyos puntuales ante tareas nuevas o de alta complejidad.', 'Autónomo; requiere apoyos mínimos solo para organización avanzada.'] }
  ]
 },
 psicomotricidad: {
  'Inicial': [
   { id: 'estabilidad', label: 'Desempeño en actividades de estabilidad postural', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'coordinacion', label: 'Coordinación motriz (manipulación y desplazamiento)', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'juegos_corporales', label: 'Participación en juegos con consignas corporales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'espera', label: 'Tolerancia a tiempos de espera y turnos', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'adaptacion', label: 'Adaptación a cambios en la dinámica', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'conducta', label: 'Manejo de conductas ante demandas', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'iniciativa', label: 'Iniciativa y participación sostenida', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ]
 },
 plastica: {
  '1° Ciclo': [
   { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'colores_primarios', label: 'Utiliza colores primarios y secundarios', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'mezclas', label: 'Realiza mezclas de colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'comunicacion', label: 'Comunica ideas y emociones', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
   { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  '2° Ciclo': [
    { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'analisis_obra', label: 'Observa y analiza obras de arte', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'experimenta_color', label: 'Explora y experimenta colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'espacio_trabajo', label: 'Reconoce y respeta espacio de trabajo', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  'CFI': [
    { id: 'uso_materiales', label: 'Reconoce uso de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'experimenta_color', label: 'Experimenta colores', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'analisis_obra', label: 'Observa y analiza obras de arte', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'espacio_marco', label: 'Reconoce espacio, marco y límite', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'operaciones', label: 'Operaciones básicas de forma autónoma', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'participacion', label: 'Participa activamente', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'solicita_ayuda', label: 'Solicita ayuda', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'higiene', label: 'Cuidado e higiene de materiales', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ]
 },
musica: {
    'Nivel 1': [
      { id: 'reconocimiento_corporal', label: 'Reconocimiento corporal: Explora y produce sonidos con su cuerpo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'seguimiento_pulso', label: 'Seguimiento del pulso: Identifica y sigue el tiempo en la ronda.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'atencion_estructural', label: 'Atención estructural: Descubre y respeta el inicio y el corte.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'manejo_instrumentos', label: 'Manejo de instrumentos: Examina y toca percusión menor.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'asociacion_efectos', label: 'Asociación de efectos: Rastrea ruidos para creaciones artísticas del momento.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
    ],
    'Nivel 2': [
      { id: 'coordinacion_sonora', label: 'Dominio de coordinación: Ensaya y combina planos sonoros.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'ensamble', label: 'Práctica en ensamble: Distingue su ritmo junto a compañeros.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'control_matices', label: 'Control de matices: Experimenta cambios de velocidad e intensidad.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'uso_registro', label: 'Uso de registro: Interpreta gráficos para recordar ritmos.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
      { id: 'sincronia', label: 'Logro de sincronía: Testea tocar coordinando con la imagen.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
    ]
  },
 educacion_fisica: {
  '2° Ciclo': [
    { id: 'ef_acoplamiento', label: 'Acoplamiento de movimientos: Coordinar dos o más acciones sin interrupción.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ajuste', label: 'Ajuste espacio-temporal.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_disociacion', label: 'Disociación Segmentaria: la capacidad de mover las extremidades de forma independiente.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_equilibrio', label: 'Equilibrio dinámico / habilidades manipulativas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ritmo', label: 'Ritmo: Adaptar el movimiento corporal a estímulos externos.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_diferenciacion', label: 'Diferenciación: aplicar la fuerza justa.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_condicionales', label: 'Capacidades condicionales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_docente', label: 'Se relaciona con el docente y acude a él sin dificultades.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_propuestas', label: 'Responde a las propuestas de la clase.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_materiales', label: 'Utiliza los materiales con el grupo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_social_colabora', label: 'Puede colaborar para guardar y transportar materiales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_norma', label: 'Aceptación de la norma.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_reglas', label: 'Modificación de reglas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_sociomotor', label: 'El juego Sociomotor.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_simbolico', label: 'Del juego simbólico al juego reglado.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_ludico_deporte', label: 'Iniciación al Deporte Escolar.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
  ],
  'CFI': [
    { id: 'ef_cfi_tecnicas', label: 'Técnicas básicas de deportes.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_combinacion', label: 'Combinación de habilidades en velocidad.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ambidextra', label: 'Ambidextra funcional.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_condicionales', label: 'Desarrollo de las Capacidades Condicionales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_coordinativas', label: 'Capacidades Coordinativas Complejas.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_resolucion', label: 'Resolución Motriz Autónoma.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_lenguaje', label: 'Lenguaje Corporal.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_docente', label: 'Se relaciona con el docente y acude a él sin dificultades.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_propuestas', label: 'Responde a las propuestas de la clase.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_materiales', label: 'Utiliza los materiales con el grupo.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_social_colabora', label: 'Puede colaborar para guardar y transportar materiales.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_motriz', label: 'Dimensión Motriz y Funcional.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_socio', label: 'Dimensión Socio-Afectiva.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_cognitiva', label: 'Dimensión Cognitiva y Estratégica.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_reglado', label: 'Juego / deportes Reglado.', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] },
    { id: 'ef_cfi_ludico_iniciacion', label: 'Iniciación al Deporte Adaptado (handball, vóley, softbol, futbol).', options: ['Realiza con autonomía', 'Realiza con apoyo', 'En proceso'] }
   ]
 },
 laboral: {
  'CFI': [
   { id: 'herramientas_reconocimiento', label: 'Herramientas: Reconocimiento', options: ['No identifica herramientas; requiere asistencia para seleccionarlas.', 'Identifica herramientas básicas con apoyo visual o señalamiento.', 'Identifica y nombra herramientas de uso frecuente en el taller.', 'Reconoce y diferencia una amplia gama de herramientas según su función.'] },
   { id: 'herramientas_uso', label: 'Herramientas: Uso adecuado', options: ['Requiere guía física total para manipular cualquier herramienta.', 'Manipula herramientas con supervisión constante y seguridad asistida.', 'Usa herramientas con autonomía bajo supervisión mínima de seguridad.', 'Manipula herramientas con destreza, seguridad y total autonomía.'] },
   { id: 'produccion_proceso', label: 'Producción: Proceso', options: ['No logra seguir pasos; requiere mediación en cada acción.', 'Sigue pasos simples mediante apoyos visuales o instrucciones cortas.', 'Realiza tareas productivas siguiendo secuencias establecidas.', 'Desarrolla productos terminados cumpliendo el proceso completo solo.'] },
   { id: 'produccion_calidad', label: 'Producción: Calidad/Terminación', options: ['Requiere que el docente finalice o corrija su producción.', 'Realiza producciones con supervisión frecuente de los detalles.', 'Logra acabados de buena calidad con revisiones esporádicas.', 'Realiza producciones con alta calidad y atención a los detalles.'] },
   { id: 'autonomia_trabajo', label: 'Autonomía: Trabajo autónomo', options: ['Dependencia absoluta del adulto para iniciar y sostener la tarea.', 'Sostiene la tarea por tiempos breves con recordatorio docente.', 'Mantiene el ritmo de trabajo con supervisión intermitente.', 'Trabaja con autonomía, organizando sus tiempos y tareas solo.'] },
   { id: 'autonomia_seguridad', label: 'Autonomía: Seguridad e Higiene', options: ['Desconoce las normas; requiere control físico constante.', 'Conoce las normas básicas si se le recuerdan antes de empezar.', 'Respeta las normas de seguridad e higiene de forma consistente.', 'Es referente en normas de seguridad y cuida su espacio de trabajo.'] },
   { id: 'rol_pautas', label: 'Rol Laboral: Respeto de pautas', options: ['No respeta pautas; interrumpe el trabajo de otros.', 'Respeta pautas y horarios con supervisión frecuente.', 'Cumple con las pautas de trabajo y los tiempos del taller.', 'Demuestra compromiso y sentido de responsabilidad laboral.'] },
   { id: 'rol_equipo', label: 'Rol Laboral: Trabajo en equipo', options: ['Realiza su tarea de forma aislada sin considerar el entorno.', 'Participa en tareas compartidas cuando el docente lo coordina.', 'Colabora con pares en producciones grupales de forma fluida.', 'Propone tareas colaborativas y ayuda a otros en el taller.'] },
   { id: 'comprension_proceso', label: 'Comprensión del proceso', options: ['Ejecuta acciones aisladas sin comprender el resultado final del producto.', 'Comprende una parte del proceso con mediación docente constante.', 'Comprende la secuencia del proceso productivo y su lugar en el mismo.', 'Entiende el proceso productivo integral y cómo su tarea aporta al resultado.'] },
   { id: 'responsabilidad_rol', label: 'Responsabilidad de rol', options: ['Requiere supervisión para mantenerse en su puesto o función asignada.', 'Asume un rol simple con supervisión; cumple tareas asignadas por terceros.', 'Mantiene su rol y función con autonomía dentro del grupo de trabajo.', 'Identifica necesidades del sistema y asume funciones de forma proactiva.'] },
   { id: 'adaptabilidad', label: 'Adaptabilidad al cambio', options: ['Presenta rigidez frente a variaciones en la tarea o en el puesto de trabajo.', 'Acepta cambios en su función tras una explicación y acompañamiento.', 'Se adapta a diferentes roles o tareas dentro del taller con mínima guía.', 'Muestra gran versatilidad; cambia de función según la necesidad del sistema.'] },
   { id: 'gestion_tiempos', label: 'Gestión de tiempos', options: ['No registra el tiempo; requiere guía para iniciar, pausar o terminar.', 'Realiza la tarea respetando ritmos mínimos bajo supervisión externa.', 'Regula su propio ritmo de trabajo para cumplir con los tiempos de entrega.', 'Planifica su tiempo y recursos para optimizar la producción del sistema.'] }
  ]
 }
};
const DICCIONARIO = {
 // ==========================================
 // ÁREA PEDAGÓGICA 
 // ==========================================
 lectoescritura: [
  `Nombre se encuentra en la etapa presilábica, explorando la escritura a través de dibujos y trazos sin valor sonoro convencional. Este proceso exploratorio constituye la base inicial para la futura adquisición del sistema de escritura, permitiendo la familiarización con las herramientas gráficas y la direccionalidad del trazo. En esta etapa, el alumno está aprendiendo a usar el lápiz y a entender que lo que dibuja o marca puede representar ideas, aunque todavía no use letras.`,
  `Nombre se encuentra en la etapa silábica. En sus producciones, comienza a asignar valor sonoro a las letras, utilizando principalmente las vocales para representar sílabas. Esto evidencia el inicio de la correspondencia fonema-grafema, estableciendo una relación directa entre la pauta sonora de la palabra y su representación escrita. Es decir, ya empieza a entender que los sonidos de las palabras se pueden escribir con letras.`,
  `Nombre se encuentra en la etapa silábico-alfabética de transición. Sus producciones combinan sílabas completas con letras aisladas, evidenciando un análisis progresivo y más detallado de la composición interna de las palabras, superando la correspondencia estricta de una grafía por sílaba. Esto significa que está dejando atrás la etapa anterior y empezando a armar palabras más completas, analizando mejor cómo suenan.`,
  `Nombre se encuentra en la etapa alfabética, escribiendo de manera autónoma. Representa los fonemas con coherencia y sentido, produciendo textos comprensibles y evidenciando una apropiación funcional del sistema de escritura que le permite estructurar mensajes claros y de mayor complejidad sintáctica. Ya puede escribir solo/a y sus textos se entienden perfectamente porque usa las letras adecuadas para cada sonido.`
 ],
 escritura: [
  `Nombre requiere guía física constante (modalidad mano-sobre-mano) para la realización de grafismos y el manejo de los útiles. El acompañamiento docente se centra en guiar el movimiento motor para favorecer el desarrollo visomotor, la prensión adecuada y la seguridad en el trazado continuo. Lo acompañamos físicamente para que gane confianza y seguridad al mover la mano en el papel.`,
  `Nombre escribe mediante copia fiel del pizarrón o dictado fonético sencillo, requiriendo apoyo directo. La intervención del adulto permite orientar la atención en la tarea, organizar adecuadamente el espacio gráfico en la hoja y despejar dudas fonológicas durante la producción del texto. Lo ayudamos a ordenar su hoja y a revisar qué letras usar para escribir lo que quiere decir.`,
  `Nombre escribe frases cortas mediante dictado fonético bajo supervisión frecuente. El acompañamiento docente asiste en la estructuración lógica de la oración, la segmentación léxica (separación de palabras) y la resolución de dudas fonológicas u ortográficas específicas. Lo asistimos para que separe las palabras y para que sus oraciones sean claras y organizadas.`,
  `Nombre escribe de forma autónoma, produciendo textos con sentido completo. Organiza el lenguaje escrito adecuadamente para transmitir mensajes claros, estructurando sus ideas con coherencia y cohesión, sin requerir de intervención directa ni supervisión organizativa. Ya puede escribir solo/a, organizando sus propias ideas sin que necesitemos ayudarlo/a paso a paso.`
 ],
 comprension: [
  `Nombre no logra aún atribuir significado al texto escrito, limitándose a la identificación y descripción de imágenes. Las intervenciones actuales se centran en favorecer el acercamiento progresivo al formato material de los textos y a las letras como elementos portadores de sentido y narratividad. Por ahora se guía por los dibujos; estamos trabajando para que vea que las letras también tienen un mensaje.`,
  `Nombre comprende textos breves y sencillos a través de la dinámica de lectura compartida o mediada por el docente. Esta intervención externa facilita el análisis del relato, la anticipación de secuencias y la construcción conjunta de significados a partir del material de lectura presentado. Leemos juntos para que él/ella pueda seguir la historia y entenderla mejor.`,
  `Nombre comprende el sentido global de textos breves de manera guiada. Logra identificar la idea principal, secuenciar hechos y extraer la información más relevante contando con la orientación del docente mediante preguntas focalizadas que guían su interpretación. Lo guiamos con preguntas clave para que identifique lo más importante de lo que leyó.`,
  `Nombre realiza una lectura autónoma fluida y comprende el sentido global de textos diversos. Extrae ideas principales, realiza inferencias e interpreta funcionalmente los materiales escritos, logrando procesar la información de manera eficiente sin requerir mediación del adulto. Ya puede leer solo/a y entender el mensaje sin ayuda.`
 ],
 reconocimiento: [
  `Nombre identifica visualmente su propio nombre de manera global entre otras palabras escritas. Las intervenciones pedagógicas actuales apuntan a utilizar esta base significativa para ampliar progresivamente el reconocimiento de nuevas letras y palabras frecuentes del entorno áulico. Su nombre es su primer referente para empezar a reconocer otras palabras en el salón.`,
  `Nombre reconoce su nombre propio y el de sus pares con facilidad y rapidez visual. Logra identificar globalmente palabras significativas y recurrentes dentro del contexto de su grupo de pertenencia, utilizándolas como referentes para futuras producciones escritas. Ya identifica los nombres de sus amigos y eso le sirve de guía para leer y escribir otras cosas.`,
  `Nombre reconoce palabras de uso frecuente y frases cortas de manera autónoma. Identifica conceptos habituales en el entorno áulico y de cartelería, logrando conectar de manera funcional la decodificación del texto con situaciones prácticas y cotidianas. Ya puede leer palabras de los carteles del aula y relacionarlas con su día a día.`,
  `Nombre lee palabras y frases con sentido completo de forma autónoma y fluida. Interpreta los mensajes escritos dándoles un significado real en su contexto de uso, demostrando una consolidación de la vía léxica que le permite acceder al significado sin requerir de asistencia externa. Ya interpreta mensajes escritos por cuenta propia sin ayuda.`
 ],
 serie_numerica: [
  `Nombre realiza el conteo numérico hasta el 10 utilizando apoyo con material concreto. El uso de elementos tangibles facilita la correspondencia término a término, la visualización de la secuencia y la cuantificación durante la resolución de consignas matemáticas iniciales. Contar objetos físicos le permite entender mejor qué significa cada número.`,
  `Nombre realiza el conteo numérico secuenciado hasta el 20 y reconoce la representación escrita de estos números en contextos cotidianos. El trabajo áulico actual se orienta a la consolidación progresiva de este rango numérico y al afianzamiento del recitado oral sin omisiones. Está practicando el recitado y el reconocimiento de los números que ve en su vida diaria.`,
  `Nombre maneja series numéricas amplias y reconoce la estructura y regularidades de las familias de números. Se desenvuelve con soltura al trabajar con cantidades de mayor magnitud, logrando establecer relaciones de anterior, posterior y ordenamientos funcionales. Ya cuenta y ordena cantidades grandes con mayor seguridad y soltura.`,
  `Nombre domina series numéricas complejas con total autonomía. Comprende de forma independiente la lógica posicional del sistema decimal, lo que le permite operar y organizar números de gran magnitud de forma precisa, ágil y sistemática. Ya entiende cómo se forman los números grandes y los usa con total independencia.`
 ],
 operaciones: [
  `Nombre identifica cantidades en diversas situaciones prácticas, aunque no realiza operaciones matemáticas formales o escritas. El enfoque de trabajo aborda el reconocimiento perceptual de los números y el establecimiento de relaciones de equivalencia simples con cantidades reales manipulables. Trabajamos para que relacione los números con lo que significan en cantidad.`,
  `Nombre resuelve operaciones de sumas y restas simples utilizando material didáctico de apoyo. El uso de elementos concretos facilita la visualización espacial de la operación (agregar o quitar) y permite una comprensión inicial de la lógica procedimental del cálculo. Usar objetos le ayuda a ver cómo se agregan o quitan elementos al calcular.`,
  `Nombre resuelve sumas y restas de mayor complejidad requiriendo únicamente apoyo o revisión esporádica. Evidencia capacidad de análisis en la ejecución del algoritmo matemático, necesitando orientación mínima para verificar los resultados o despejar dudas puntuales. Ya tiene confianza para calcular y solo nos consulta para confirmar si el resultado está bien.`,
  `Nombre resuelve problemas cotidianos mediante el uso de operaciones complejas de manera totalmente autónoma. Aplica las herramientas matemáticas adquiridas para el planteo lógico, la selección del cálculo pertinente y la resolución eficaz de situaciones problemáticas de la vida diaria. Ya sabe usar la matemática para resolver problemas reales sin ayuda.`
 ],
 figuras: [
  `Nombre identifica visualmente figuras geométricas básicas, requiriendo mediación directa para proceder a su clasificación u ordenamiento. Las propuestas se centran en el entrenamiento perceptivo visual para reconocer atributos básicos, contornos, y establecer diferencias notorias. Trabajamos para que note las diferencias entre formas o colores.`,
  `Nombre clasifica elementos aplicando criterios de forma, tamaño o color, contando con la supervisión y validación del docente. Demuestra capacidad para agrupar, seriar y organizar objetos a partir de propiedades específicas de manera sistemática y estructurada. Ya puede ordenar objetos siguiendo una pauta clara que le damos.`,
  `Nombre resuelve problemas simples vinculados a la lógica matemática y la comparación de elementos. Analiza las situaciones presentadas, reconoce los datos útiles y aplica estrategias pertinentes para alcanzar resoluciones funcionales de forma progresivamente más independiente. Ya sabe comparar objetos y resolver situaciones lógicas sencillas solo/a.`,
  `Nombre resuelve situaciones y problemas de lógica de alta complejidad de forma autónoma. Aborda los desafíos identificando múltiples variables intervinientes y desarrollando procedimientos de resolución ordenados, evidenciando un alto grado de pensamiento crítico y abstracto. Tiene gran capacidad para pensar cómo solucionar problemas difíciles sin ayuda externa.`
 ],
 rutinas: [
  `Nombre requiere asistencia total y acompañamiento directo, continuo y paso a paso durante las rutinas escolares, de higiene y de cuidado personal. Se le provee de sostén físico y verbal, junto con anticipación estructurada, para garantizar su desenvolvimiento seguro en la dinámica diaria. Lo ayudamos en todo momento para que se sienta seguro/a en sus actividades.`,
  `Nombre realiza las rutinas básicas con supervisión constante y apoyo puntual de un adulto en momentos de transición. Logra ejecutar los pasos necesarios para su cuidado personal guiado por indicaciones externas secuenciadas que le permiten ordenar y sistematizar su accionar. Ya conoce los pasos de la rutina, pero le recordamos qué sigue después.`,
  `Nombre desarrolla las rutinas diarias institucionales con una supervisión mínima y de carácter esporádico. Evidencia una consolidación en su capacidad de organización temporal y niveles de autogestión progresivos y estables en la realización de sus tareas de cuidado e higiene. Es mucho más independiente y solo nos necesita para verificar que terminó bien.`,
  `Nombre se desenvuelve de forma totalmente autónoma y segura en la ejecución de sus rutinas escolares y pautas de cuidado personal. Gestionan de manera independiente sus tiempos, tareas y necesidades durante la jornada, sin requerir mediación del equipo de apoyo y supervisión. Hace todo solo/a sin que tengamos que estar presentes.`
 ],
 organizacion: [
  `Nombre requiere que un adulto estructure y organice permanentemente sus materiales de trabajo y el espacio físico. La intervención externa le brinda el encuadre organizativo necesario y exclusivo previo al inicio y durante el desarrollo de las diversas propuestas áulicas. Necesita que organicemos todo para que pueda empezar a trabajar.`,
  `Nombre organiza sus materiales de trabajo contando con el recordatorio explícito y la supervisión del docente. El estudiante inicia la consolidación del hábito de preparación y orden de los elementos requeridos a través de la mediación verbal y el soporte visual constante. Ya sabe que debe preparar sus útiles si se lo recordamos antes de empezar.`,
  `Nombre mantiene sus materiales y elementos de trabajo organizados de forma independiente a lo largo de la jornada escolar. Evidencia un manejo funcional de su propio espacio y un registro adecuado de sus pertenencias personales e institucionales. Ya incorporó el hábito de orden y mantiene sus cosas organizadas solo/a.`,
  `Nombre anticipa y organiza proactivamente todos los materiales necesarios antes de iniciar la actividad escolar asignada. Planifica de forma autónoma la disposición del espacio de trabajo y selecciona los recursos pertinentes, optimizando su desenvolvimiento integral en la tarea. Es muy responsable y se prepara solo/a sin que tengamos que decirle nada.`
 ],
 pedido_ayuda: [
  `Nombre tiende a presentar bloqueos conductuales o cognitivos ante la dificultad de una consigna, requiriendo intervención externa, directa e inmediata para destrabar la situación. Se implementan estrategias de sostén constante para favorecer la tolerancia a la frustración y la continuidad de la propuesta. Se queda paralizado ante dificultades y nos necesita para continuar.`,
  `Nombre solicita ayuda frente a los obstáculos operativos apoyándose en la mediación o sugerencia del docente a cargo. Logra identificar la situación desafiante y busca de manera activa el soporte, la guía o la explicación necesaria para poder avanzar en la resolución de la actividad. Identifica cuando algo no le sale y nos busca para que lo guiemos.`,
  `Nombre identifica con claridad en qué momento de la tarea requiere apoyo y toma la iniciativa de solicitar asistencia pertinente ante la duda. Reconoce los límites de la propia resolución y utiliza el intercambio pedagógico con el docente como herramienta compensatoria de manera totalmente funcional. Sabe cuándo necesita ayuda y nos pregunta para seguir avanzando.`,
  `Nombre se muestra proactivo ante los obstáculos cognitivos o procedimentales, intentando implementar soluciones y estrategias de ensayo y error propias de manera independiente. Evalúa alternativas y desarrolla herramientas propias antes de recurrir a la ayuda externa o a la guía docente directa. Intenta resolverlo solo/a y nos consulta si no encuentra la salida.`
 ],
 vinculo_pares: [
  `Nombre presenta una modalidad de juego y participación predominantemente paralela o solitaria, centrada en sus propios intereses. Las intervenciones docentes apuntan a propiciar acercamientos graduales, mediados y estructurados para fomentar el inicio del vínculo social y el reconocimiento de sus pares. Juega solo/a o al lado de otros, así que lo acercamos de a poco al grupo.`,
  `Nombre interactúa con sus compañeros de manera funcional, fundamentalmente en el marco de propuestas lúdicas o pedagógicas guiadas e iniciadas por el adulto, logrando sostener intercambios positivos y ajustados al contexto en dinámicas pautadas, grupales y bajo supervisión. Juega con otros si nosotros intervenimos para que la comunicación fluya.`,
  `Nombre se integra de manera espontánea y activa a dinámicas de juego cooperativo y propuestas de trabajo grupal con sus pares. Logra compartir el espacio, negociar el uso de los materiales y sostener la interacción de forma armónica sin requerir de intervención ni mediación adulta constante. Se suma solo/a a los juegos y disfruta compartir con sus amigos.`,
  `Nombre se posiciona desde un rol activo y propositivo, generando dinámicas y liderando actividades conjuntas de manera funcional. Evidencia capacidad organizativa, habilidades sociales asertivas para incentivar la participación conjunta y aptitud sostenida para coordinar acciones dentro del grupo de pares. Ayuda a organizar juegos y a integrar a sus amigos.`
 ],
 vinculo_adulto: [
  `Nombre presenta dependencia total del adulto para iniciar, sostener y finalizar cualquier tipo de tarea escolar. Requiere de contención afectiva, guía externa constante y señalamientos continuos y direccionales para poder desenvolverse con seguridad en el abanico de las propuestas áulicas. Nos necesita siempre cerca para poder hacer sus tareas.`,
  `Nombre busca el apoyo y la validación constante de las figuras docentes. Requiere de aprobación verbal o supervisión externa frecuente durante el desarrollo del proceso de aprendizaje para reasegurar sus acciones, validar sus producciones y afianzar su desenvolvimiento en el aula. Necesita saber que estamos cerca para sentirse seguro/a.`,
  `Nombre evidencia autonomía sostenida en la resolución de sus actividades habituales. Recurre a las figuras docentes de manera puntual frente a dudas concretas de la tarea asignada o cuando se presentan situaciones novedades, imprevistas o que le resultan altamente desafiantes. Trabaja solo/a y solo nos busca si tiene una duda difícil.`,
  `Nombre establece un vínculo saludable, asimétrico y de referencia funcional con el equipo docente. Actúa con total seguridad, organizándose y resolviendo demandas u obstáculos de forma independiente dentro del encuadre normativo y la dinámica de trabajo estructurada por la institución. Confía en nosotros, pero hace sus tareas de forma independiente sin depender de nuestra ayuda.`
 ],
 emocional: [
  `Nombre reacciona con impulsividad o exteriorizaciones físicas ante situaciones de frustración, exigencia o malestar agudo. El abordaje actual provee estrategias externas de contención, tiempos de pausa y regulación emocional asistida ante las instancias de desborde conductual o tensión. Expresa su frustración físicamente y lo ayudamos a calmarse para contar qué le pasa.`,
  `Nombre logra expresar la causa de su malestar de forma verbal a través de la mediación directa del adulto referente. Requiere de asistencia, andamiaje e interrogación guiada para canalizar sus emociones incipientes y comunicar de manera más adaptativa lo que experimenta internamente. Nos cuenta qué le molesta si lo ayudamos a ponerlo en palabras.`,
  `Nombre reconoce y expresa sus sentimientos, necesidades e incomodidades de manera verbal, clara y asertiva. Identifica sus estados emocionales primarios y logra comunicarlos al entorno general de forma funcional, operando sin requerir asistencia externa o interpretación de terceros. Sabe expresar qué le gusta y qué le molesta sin que tengamos que ayudarlo/a.`,
  `Nombre posee adecuadas y consolidadas capacidades de autorregulación psíquica. Identifica sus propios estados de ánimo y gestiona sus emociones de manera constructiva, equilibrada y autónoma ante las frustraciones, las contingencias operativas y las exigencias propias del contexto escolar. Gestiona sus emociones solo/a y sabe cómo calmarse.`
 ],
 pautas: [
  `Nombre presenta marcadas dificultades para el seguimiento autónomo de las pautas grupales de convivencia y el respeto de los turnos de habla. Las intervenciones se dirigen a fomentar de forma reiterada, constante y directiva la internalización progresiva de las normativas básicas del espacio. Estamos trabajando para que entienda que debe esperar su turno y escuchar.`,
  `Nombre respeta las normas de convivencia y el sostenimiento de los turnos de intercambio social, siempre que cuenta de manera contextual con el recordatorio explícito, el anticipo visual o el señalamiento normativo frecuente por parte del docente a cargo de la dinámica. Sigue las reglas si le recordamos seguido qué debe hacer.`,
  `Nombre respeta las pautas operativas de trabajo, los tiempos de espera grupales y los turnos de habla con requerimientos de intervenciones o señalamientos externos mínimos. Demuestra un registro adecuado del encuadre pedagógico y de la necesidad organizativa de la dinámica compartida. Participa bien en el grupo y respeta las reglas con muy poca ayuda.`,
  `Nombre respeta los turnos, horarios institucionales y acuerdos de convivencia preestablecidos de forma completamente autónoma. Adecúa su conducta motora y verbal a las normativas, rutinas de trabajo y exigencias generales del espacio áulico sin requerir ningún tipo de monitoreo continuo. Sigue las reglas solo/a sin que tengamos que decirle nada.`
 ],
 escucha: [
  `Nombre suele mostrarse desconectado/a o disperso/a frente a las consignas impartidas a nivel general en el aula. Se implementan apoyos visuales y directivas individualizadas de cercanía para lograr captar su atención, focalizar su percepción e integrarlo/a operativamente en el inicio de la propuesta. Está disperso/a y buscamos captar su interés para que atienda a lo que hacemos.`,
  `Nombre responde al requerimiento de escucha activa únicamente cuando el docente se aproxima físicamente y lo/la interpela de manera individual y sostenida durante el desarrollo de la actividad, requiriendo este anclaje interpersonal para decodificar operativamente la demanda solicitada. Nos atiende si le hablamos directamente, pero no si la consigna es para todo el grupo.`,
  `Nombre evidencia participación activa y adecuados niveles de atención sostenida en instancias de escucha de relatos grupales o al recibir directivas y propuestas presentadas de manera abierta, oral y simultánea a la totalidad de los alumnos presentes en el espacio áulico. Ya puede atender cuando hablamos a todo el grupo y seguir lo que pedimos.`,
  `Nombre atiende, decodifica, comprende y responde de manera precisa a las consignas grupales de forma totalmente autónoma. Evidencia un óptimo registro auditivo y de procesamiento superior de las indicaciones dadas de forma general, aplicándolas de manera inmediata y asertiva en su propia tarea. Sigue las consignas del grupo perfectamente sin que tengamos que repetirle.`
 ],
 conflictos: [
  `Nombre tiende a reaccionar de manera impulsiva, disruptiva o con conductas físicas directas frente a conflictos vinculares, frustraciones operativas o desacuerdos. Las intervenciones docentes operan de manera inmediata para desactivar la situación, garantizar la seguridad y promover abordajes más funcionales. Reacciona físicamente ante los problemas, así que intervenimos para que encuentre otra forma de actuar.`,
  `Nombre logra expresar de manera inteligible la causa de su malestar ante un conflicto interaccional, pero requiriendo de mediación docente directa para articular la problemática de forma clara, regular la intensidad de su respuesta e intentar facilitar un intercambio orientado hacia la resolución pacífica. Nos cuenta qué le molesta, pero nos necesita cerca para encontrar una solución.`,
  `Nombre emplea el diálogo y el intercambio verbal organizado como herramienta principal para el manejo de conflictos interpersonales. Logra exponer sus posturas, argumentar y buscar acuerdos viables y concretos, requiriendo intervenciones o guiaturas mínimas y puntuales por parte del adulto referente. Ya usa el diálogo y solo nos necesita para dar el visto bueno al acuerdo.`,
  `Nombre resuelve de manera autónoma, madura y asertiva los conflictos y diferencias emergentes con sus pares. Demuestra flexibilidad cognitiva para escuchar posturas diversas, implementa habilidades de negociación efectivas y acepta pautas conciliatorias reales en favor de la preservación del buen clima grupal. Resuelve sus problemas con los demás solo/a de forma madura.`
 ],
 desplazamiento: [
  `Nombre requiere guía física directa, asistencia motriz y/o supervisión visual permanente para realizar desplazamientos a lo largo de los diferentes espacios generales de la institución. Precisa referentes de orientación constantes para garantizar su contención, su seguridad física y su movilidad operativa. Lo guiamos todo el tiempo por la escuela para que se sienta seguro/a.`,
  `Nombre reconoce funcionalmente el uso y la distribución de los diversos sectores escolares habituales. Sin embargo, requiere de indicaciones verbales, señalamientos directivos y recordatorios constantes de parte del adulto para orientarse en el trayecto y trasladarse de un espacio físico a otro de manera estructurada y ordenada. Conoce dónde están los lugares, pero le recordamos cómo llegar.`,
  `Nombre se desplaza por los espacios institucionales con un adecuado y consolidado sentido de orientación espacial. Necesita únicamente de recordatorios verbales de carácter esporádico o preventivo para guiarse funcionalmente hacia nuevos sectores, modificar su recorrido habitual o adaptarse a desvíos eventuales. Ya conoce los caminos y solo le recordamos cómo llegar si vamos a un lugar nuevo.`,
  `Nombre se desplaza de manera autónoma, fluida y completamente segura por la totalidad de las instalaciones y sectores de la institución. Evidencia un claro reconocimiento topográfico y un dominio funcional del espacio, apropiándose del entorno físico escolar y de sus rutinas de traslado de manera independiente. Se mueve solo/a por toda la escuela sin ayuda de nadie.`
 ],
 juego: [
  `Nombre presenta una modalidad lúdica centrada fundamentalmente en componentes de tipo exploratorio, motor y sensorial. Su interacción focalizada con el medio y los objetos se orienta al contacto directo, repetitivo, táctil o de escrutinio visual, abordando el material a través de la manipulación simple de sus cualidades físicas. Su forma de jugar es descubriendo objetos tocándolos.`,
  `Nombre desarrolla secuencias incipientes y sostenidas de juego de carácter simbólico. Utiliza los diversos elementos del entorno dotándolos de imaginación interpretativa para representar funcionalmente acciones concretas de la vida cotidiana, estructurar lúdicamente diferentes roles y construir escenarios ficticios simples. Ya juega a 'hacer de cuenta' que los objetos son cosas distintas.`,
  `Nombre se incluye y participa de manera funcional en dinámicas de juego con reglas simples y objetivos preestablecidos. Comprende el formato estructural de la actividad pautada, ajustando y adecuando su conducta de manera pertinente para tolerar la espera grupal y respetar asertivamente los turnos correspondientes. Participa bien en juegos con reglas y entiende que debe esperar su turno.`,
  `Nombre propone, organiza y participa de forma plenamente sostenida en juegos reglados de mayor complejidad tanto normativa como cognitiva. Aporta al desarrollo lúdico demostrando estructuración estratégica de las reglas, anticipación táctica e interactuando de forma asociativa, recíproca y altamente colaborativa con su grupo. Organiza juegos, crea estrategias y ayuda al grupo a seguir las normas.`
 ],
 ciencias: [
  `Nombre precisa de modelado físico e instigación externa de carácter constante para el uso correcto y guiado de materiales en experiencias de indagación o manipulación. Manifiesta curiosidad de orden puntual y perceptiva, presentando marcadas dificultades para sostener la observación prolongada o la atención en el fenómeno. Le da curiosidad, pero le cuesta prestar atención a lo que hacemos.`,
  `Nombre se vincula con los materiales didácticos o los elementos naturales demostrando clara intencionalidad exploratoria. Requiere, no obstante, de la formulación estructurada de interrogantes por parte del docente y de guía directiva continua para sostener temporalmente y dar sentido al proceso de indagación y observación. Explora si le hacemos preguntas que lo guíen a descubrir cosas nuevas.`,
  `Nombre manifiesta un nivel de curiosidad constante y desarrolla producciones exploratorias con genuina intencionalidad de descubrimiento. Se involucra de manera activa y metódica en las actividades e investigaciones de diversos fenómenos para la recolección de datos y la búsqueda estructurada de respuestas comprobables. Participa mucho y busca entender cómo funcionan las cosas.`,
  `Nombre investiga los fenómenos del entorno natural, químico y social de manera profundamente independiente y analítica. Posee iniciativa propia para formular sus propios interrogantes de investigación, elaborando sistemáticamente hipótesis explicativas coherentes y estructurando los recursos empíricos con total autonomía. Investiga solo/a, hace preguntas, intenta explicar lo que sucede y tiene mucha iniciativa.`
 ],
 cuidado: [
  `Nombre no evidencia un registro consciente ni duradero del impacto de sus acciones directas sobre el entorno, ni logra aplicar normativas autónomas de cuidado o preservación de los espacios físicos. Se requiere de abordaje presencial y corrección correctiva directa para fomentar la paulatina incorporación de hábitos mínimos. No registra que debe cuidar el espacio y trabajamos en que aprenda hábitos básicos.`,
  `Nombre identifica cognitivamente las normativas básicas e institucionales vinculadas al cuidado del entorno físico, del medio natural y de los materiales de uso compartido. No obstante, requiere de supervisión externa constante y señalamientos de tipo in situ para asegurar su efectiva y sostenida aplicación en la práctica diaria. Sabe que debe cuidar el material, pero le recordamos seguido que lo haga.`,
  `Nombre identifica, reconoce e internaliza de manera operativa las pautas institucionales de cuidado ambiental, de preservación comunitaria de los elementos y del respeto genuino por los seres vivos. Evidencia una aplicación práctica funcional, estable y recurrente que demanda niveles de señalamientos o correcciones sumamente mínimos. Ya cuida el material y el espacio sin que se lo recordemos.`,
  `Nombre se desenvuelve de manera completamente responsable, proactiva y plenamente autónoma en lo que respecta al mantenimiento higiénico de los espacios físicos, el trato adecuado e intencionado hacia el medio ambiente y la preservación minuciosa de todo el material, el equipamiento y el mobiliario institucional. Es muy responsable y cuida todo solo/a.`
 ],
 comunicacion: [
  `Nombre emplea una modalidad comunicativa predominantemente de carácter reactivo y situacional. Se vale en primera instancia de manifestaciones fisiológicas, alteraciones conductuales o de la utilización de gestos básicos (señalamientos o vocalizaciones inespecíficas) para dar cuenta de necesidades perentorias e inmediatas del contexto presente. Se comunica con gestos o sonidos cuando necesita algo urgente.`,
  `Nombre sostiene una comunicación intencional y de uso funcional mediante la utilización sistemática de señas, apoyos pictográficos concretos (sistemas aumentativos/alternativos) y/o vocalizaciones simples asociadas. Requiere de andamiaje permanente, estructuración y anticipación contextual para lograr sostener el intercambio con su interlocutor. Usa señas, dibujos o palabras simples para comunicarse con ayuda nuestra.`,
  `Nombre evidencia un rol de comunicación social de carácter indudablemente activo y propositivo. Transmite deseos, demandas, necesidades específicas u opiniones personales e interactúa socialmente mediante la estructuración oral de frases breves, dotadas de una adecuada coherencia lógica y funcionalmente comprensibles para su entorno inmediato. Ya puede decir claramente lo que piensa o necesita usando frases cortas.`,
  `Nombre posee un nivel de comunicación y un desarrollo integral del lenguaje de carácter complejo. Comprende con facilidad consignas abstractas, relata eventos pasados de manera cronológica, estructura narrativas sumamente detalladas con vocabulario pertinente y sostiene de forma fluida, dinámica y asertiva intercambios conversacionales extendidos y coherentes. Habla muy bien, cuenta lo que vivió y conversa sin ninguna traba.`
 ],
 funciones: [
  `Nombre presenta niveles de atención altamente dispersa, fatigabilidad o labilidad atencional sumamente significativa. Requiere indispensablemente de la implementación de estímulos visuales o verbales focalizados, y de la constante reconducción directiva de su conducta, para lograr sostenerse mínimamente en la actividad operativa de referencia planteada. Se dispersa y necesita mucha ayuda nuestra para concentrarse.`,
  `Nombre logra sostener los dispositivos de atención de manera ciertamente funcional pero limitándose de manera estricta a períodos breves de tiempo. Accede con éxito a la ejecución práctica de instrucciones sencillas conformadas por un solo paso o comando operativo explícito, contando siempre con la mediación y el control estructurado del docente. Se concentra en tareas cortas si le damos una consigna clara, con nuestra guía.`,
  `Nombre evidencia una adecuada e integrada capacidad de atención sostenida durante el lapso temporal que comúnmente implican las tareas escolares habituales. Demuestra la habilidad cognitiva y la memoria de trabajo requeridas para retener, procesar y ejecutar de forma ordenada consignas formadas por secuencias de dos o más pasos encadenados. Ya puede prestar atención toda la tarea y seguir dos pasos seguidos solo/a.`,
  `Nombre presenta un desarrollo óptimo, estructurado y sumamente maduro de sus funciones ejecutivas superiores. Evidencia una atención focalizada de muy alta calidad y ejecuta con total grado de autonomía instrucciones globales constituidas por secuencias cognitivas altamente complejas, o conformadas por múltiples pasos integrados y de realización simultánea. Tiene una gran concentración y hace tareas difíciles solo/a.`
 ],
 flexibilidad: [
  `Nombre presenta una marcada rigidez cognitiva y conductual frente a las variaciones en la dinámica habitual de trabajo o ante la incertidumbre. Experimenta una notoria dificultad adaptativa y exterioriza posibles signos de desregulación conductual y emocional inmediata frente a imprevistos, transiciones de espacio o alteraciones de su cronograma de rutina. Se molesta si las cosas cambian de golpe y necesita estabilidad.`,
  `Nombre logra aceptar de manera paulatina y asimilar paulatinamente diversas alteraciones o variaciones estructurales en el cronograma escolar. Esto es posible siempre y cuando las mismas se presenten con la debida anticipación temporal, mediante mediación verbal concreta y apoyándose eficazmente en la estructura y previsibilidad brindada por los recursos o agendas visuales. Acepta cambios si se los contamos antes y usamos agendas.`,
  `Nombre adapta y moldea su esquema de respuesta conductual de manera altamente funcional y operativa frente a modificaciones de carácter moderado en el desarrollo previsto de la jornada diaria. Requiere para asimilar y flexibilizar cognitivamente frente al cambio transitorio tan solo de intervenciones de apoyo, confirmaciones o señalamientos verbales verdaderamente mínimos. Se adapta rápido a cambios del día con mínima ayuda.`,
  `Nombre evidencia en su desenvolvimiento altos, sólidos y consolidados niveles de flexibilidad cognitiva y de adaptación plena al contexto. Ajusta de forma rápida, eficiente y sumamente operativa su respuesta de acción ante modificaciones repentinas del entorno o frente a cambios estructurales de la rutina general, sosteniendo plenamente y en todo momento su nivel de autorregulación conductual. Es muy flexible ante cualquier cambio y se adapta rápido aunque las cosas salgan distinto a lo planeado.`
 ],
 sensorial: [
  `Nombre presenta respuestas manifiestas de muy alta labilidad, sobrecarga sensitiva y posible desregulación conductual frente a la incidencia de múltiples estímulos sensoriales ambientales de moderada o alta intensidad (tales como pueden ser el ruido áulico fluctuante, el nivel de estimulación visual global acumulado en el aula o la aglomeración física). Le molestan ruidos o luces; lo ayudamos dándole calma para que no se sienta abrumado/a.`,
  `Nombre evidencia un nivel de reactividad o sensibilidad moderada frente al caudal sensorial normal del entorno general escolar. Requiere de manera recurrente u ocasional del apartamiento estratégico, el uso de diversas herramientas de bloqueo sensorial o de la necesaria reubicación en espacios tranquilos y de bajo estímulo para lograr procesar la información y recobrar su eje de autorregulación. A veces el ruido lo/la afecta y necesita un lugar tranquilo.`,
  `Nombre procesa de forma sumamente integrada y globalmente adaptativa los diversos estímulos convergentes del ambiente áulico, logrando desarrollar procesos de habituación exitosa. Esto le permite que la incidencia de factores ambientales regulares (movimiento de pares, bullicio moderado, cambios lumínicos) no perturbe el normal desarrollo de sus tareas prácticas o altere de forma significativa sus procesos formales de aprendizaje. Tolera bien el ruido y el movimiento y trabaja sin problemas.`,
  `Nombre posee un muy alto y consolidado grado de tolerancia, modulación neurológica y un óptimo y destacable nivel de integración global para el procesamiento sensorial de todo el flujo continuo de información ambiental escolar. Participa de manera plenamente y activamente operativa, y mantiene inalterable su eje de autorregulación interna aún desenvolviéndose en entornos de estímulos altamente múltiples, dinámicos o sumamente activos. Está muy tranquilo/a aunque haya mucho movimiento a su alrededor.`
 ],
 intereses: [
  `Nombre evidencia un patrón perfilado de intereses altamente focalizado o de carácter eminentemente restringido. Tiende a centrar su motivación, atención y exploración de forma reiterativa, y a menudo estereotipada, en la manipulación de objetos o en el abordaje de temáticas de características singulares. No presenta, por el momento analizado, una apertura genuina y consistente a la incorporación de novedosas o variadas alternativas lúdicas o pedagógicas espontáneas propiciadas por el entorno. Le interesan siempre los mismos objetos, así que sumamos otros de a poco.`,
  `Nombre presenta áreas de interés fuertemente delimitables, sumamente claras y altamente predecibles para la estructuración de su entorno cotidiano. La inclusión de tipo pedagógica explícita y planificada de estas preferencias específicas y de estos tópicos articulares, resulta un recurso metodológico estructurante e indispensable que opera como el motor, el anclaje o el incentivo principal y fundamental en el desarrollo de la inmensa mayoría de las situaciones que exigen un nivel de trabajo sostenido o instancias de aprendizaje prolongado. Tiene gustos definidos que usamos para motivarlo/a en todas las tareas.`,
  `Nombre recurre frecuentemente a sus preferencias temáticas o áreas de interés personalizadas como un recurso de tipo cognitivo y social plenamente funcional e integrativo. Las emplea y las pone en práctica no solo para afianzar el sostenimiento del disfrute y potenciar su involucramiento directo en las múltiples y diversas actividades áulicas propuestas, sino también que estas logran operar de manera sumamente natural como una base temática totalmente efectiva, concreta y motivacional para lograr iniciar, extender y sostener un intercambio de orden social y comunicativo con sus diversos pares. Usa lo que le gusta para compartir y vincularse con sus amigos.`,
  `Nombre logra extrapolar de manera absolutamente funcional la totalidad de su campo de intereses primarios y aplica metódicamente todas sus fortalezas intrínsecas y sus habilidades cognitivas destacadas para lograr resolver de forma sumamente operativa las diversas y variadas consignas escolares planteadas. Emplea de manera recurrente estos valiosos y consolidados recursos intrínsecos para poder enfrentar de forma totalmente autónoma, sumamente analítica y altamente creativa variados y desafiantes retos que pueden presentar un carácter pedagógico, organizativo o de propia dinámica vincular. Aplica lo que más le gusta en todo lo que hace, usando sus habilidades para resolver desafíos solo/a.`
 ],
 apoyos: [
  `Nombre requiere sin excepción el suministro directo y de tipo constante de un conjunto de configuraciones de apoyo materializadas exclusivamente en intervenciones físicas, guía manual orientada (modelado continuo) y un contacto de orden presencial extremadamente cercano. Depende íntegramente de un soporte de encuadre altamente directivo y de altísima y recurrentes intensidad provisto por parte de la totalidad de los profesionales responsables del espacio para poder garantizar la estructuración organizativa, el propiciar y dar inicio a la tarea, y lograr finalmente un sostenimiento en el curso general del abanico de todas y cada una de las actividades. Necesita nuestra presencia física para todo y lo guiamos constantemente para que se sienta seguro/a al trabajar.`,
  `Nombre precisa la disposición integral y el uso continuo e invariable de diferentes y complementarias herramientas de formato instrumental, estructuradas de manera primordialmente externa. El estudiante logra sostenerse de una forma funcional a partir de la provisión y el diseño de elementos clave, tales como agendas visuales de rutina, estructurados sistemas visuales de anticipación paso a paso de los eventos, y puntuales soportes referenciales de carácter eminentemente e innegablemente concreto. Todo este conjunto le permite llegar a organizar temporal y secuencialmente las pautas básicas de la estructura total de todo su desempeño áulico e institucional. Usa apoyos visuales y soportes concretos para organizarse y entender qué sigue.`,
  `Nombre cuenta y evidencia de manera observable con niveles de autonomía intermedios y de carácter sumamente funcional para su desempeño. Recurre ocasionalmente al lógico y natural requerimiento de la disposición presencial de ciertos apoyos pedagógicos sumamente puntuales, breves orientaciones directivas de tipo verbal y limitadas en el tiempo, o a eventuales configuraciones de marco organizativo únicamente, y de forma casi exclusiva, cuando el estudiante debe necesariamente afrontar y estructurar el abordaje general de tareas que le resultan plenamente no familiares, transiciones de eventos consideradas atípicas para su rutina, o bien ante propuestas académicas de una notoria, evidente y comprobable complejidad de tipo cognitiva o procesual. Es bastante autónomo/a y solo nos busca para que lo guiemos en tareas nuevas o muy difíciles.`,
  `Nombre presenta un destacado y consolidado perfil de independencia absolutamente operativa, de carácter sustained, sumamente constante e ininterrumpido en todas sus esferas dentro de la dinámica normal del aula escolar. Se desenvuelve acudiendo de forma totalmente excepcional o en la mayoría de los casos de forma directamente nula, a cualquier tipo de andamiajes de soporte estructural y orientaciones o directrices de baja intensidad. La necesidad de estos soportes mínimos, si es que logra presentarse en algún momento del ciclo, se asocia de forma exclusiva y puramente ocasional al estricto abordaje analítico, reflexivo y estratégico de complejas consignas u órdenes de trabajo que demandan y requieren estrictamente un nivel funcional de procesamiento cognitivo, de estructuración organizacional, o de un nivel de razonamiento de orden analítico marcadamente avanzado y plenamente superior. Es totalmente independiente y casi no necesita ayuda nuestra; se gestiona solo/a.`
 ],

 // ==========================================
 // ÁREA LABORAL / CFI 
 // ==========================================
 herramientas_reconocimiento: [
  `Nombre presenta dificultades para identificar las herramientas de trabajo por cuenta propia. Requiere de asistencia constante y señalamientos directos para poder seleccionar los elementos necesarios para cada tarea propuesta en el taller. En esta etapa, estamos ayudándole de cerca a conocer qué herramientas existen y para qué sirve cada una.`,
  `Nombre logra identificar las herramientas básicas del taller, apoyándose de manera funcional en referencias visuales o mediante el señalamiento y la guía puntual brindada por el docente a cargo. Ya empezó a reconocer las herramientas y de a poco se va familiarizando con su nombre y utilidad.`,
  `Nombre identifica y nombra de manera autónoma las herramientas de uso frecuente dentro del taller. Reconoce los elementos de trabajo habituales y los selecciona de manera pertinente para las actividades cotidianas. Ya conoce muy bien las herramientas de todos los días y sabe buscarlas solito/a cuando las necesita.`,
  `Nombre reconoce, diferencia y categoriza de forma autónoma una amplia y variada gama de herramientas. Demuestra un claro entendimiento de la función específica de cada elemento, seleccionando el instrumental más adecuado para cada requerimiento técnico. Conoce todas las herramientas a la perfección y siempre sabe elegir la correcta para el trabajo que tiene que hacer.`
 ],
 herramientas_uso: [
  `Para manipular las diversas herramientas del taller, Nombre requiere de una guía física total y acompañamiento de tipo mano-sobre-mano. La intervención adulta es indispensable para garantizar el uso y el aprendizaje del gesto motor seguro. Lo acompañamos guiando sus manos para que aprenda a usarlas sin lastimarse y gane mucha confianza.`,
  `Nombre manipula las herramientas de trabajo requiriendo supervisión constante por parte del equipo docente. Se le asiste en las pautas de seguridad y en el control del uso de los elementos para afianzar paulatinamente el dominio técnico. Las usa con cuidado mientras estamos a su lado para asegurarnos de que todo salga bien y sin ningún riesgo.`,
  `Nombre utiliza los elementos y herramientas del taller con un grado de autonomía funcional, requiriendo únicamente de una supervisión mínima y esporádica orientada a validar las normas generales de seguridad. Ya maneja las herramientas casi sin ayuda, solo lo miramos un poquito de lejos para confirmar que trabaje seguro.`,
  `Nombre manipula todo tipo de herramientas con notoria destreza, absoluta seguridad y total autonomía. Aplica correctamente las técnicas de uso, demostrando un excelente dominio instrumental en sus labores prácticas. Es un experto/a usando las herramientas, trabaja con muchísima habilidad y sin necesitar que lo supervisemos.`
 ],
 produccion_proceso: [
  `Nombre presenta un importante desafío para seguir la secuencia de pasos en el proceso productivo. Necesita de la mediación directa y estructurada del adulto en cada una de las acciones que componen la tarea para poder avanzar. Estamos trabajando cerquita suyo, ayudándole paso a paso para que empiece a entender cómo se hace el producto.`,
  `Nombre logra llevar a cabo pasos simples del proceso productivo, apoyándose de manera efectiva en soportes visuales, esquemas gráficos o mediante la recepción de instrucciones verbales cortas y precisas. Con alguna imagen de ayuda o explicándole cortito, ya puede hacer varios pasos del trabajo muy bien.`,
  `Nombre realiza de forma adecuada las diversas tareas productivas, logrando seguir e internalizar las secuencias preestablecidas de trabajo con un grado de independencia sumamente funcional para la dinámica del taller. Trabaja súper bien siguiendo las indicaciones y ya hace gran parte del producto por su propia cuenta.`,
  `Nombre es capaz de desarrollar y concretar productos terminados abordando el proceso productivo en su totalidad de manera plenamente independiente. Planifica, ejecuta y concluye los pasos secuenciales sin requerir ningún tipo de asistencia. Sabe exactamente qué tiene que hacer desde que empieza hasta que termina el producto, sin que le digamos nada.`
 ],
 produccion_calidad: [
  `En cuanto a la calidad de terminación, Nombre requiere que el docente intervenga de manera directa para corregir, ajustar o finalizar sus producciones y así lograr alcanzar los estándares mínimos requeridos en el taller. Por ahora lo ayudamos a terminar y emprolijar las cosas para que el resultado final quede muy lindo.`,
  `Nombre concreta producciones de manera funcional, aunque precisa de la supervisión frecuente y la corrección externa de los detalles y acabados para optimizar el nivel de calidad del producto final. Trabaja muy lindo, solo le damos una manito al final para corregir pequeños detalles de prolijidad.`,
  `Nombre logra plasmar acabados de muy buena calidad en sus trabajos, evidenciando esmero en la terminación. Únicamente requiere de revisiones esporádicas o sugerencias puntuales para perfeccionar su producción. Hace trabajos hermosos y muy prolijos, casi no hace falta que le corrijamos nada.`,
  `Nombre realiza sus tareas logrando producciones de altísima calidad. Demuestra una minuciosa y excelente atención a los detalles, entregando productos con acabados sobresalientes y de nivel plenamente profesional. Los productos que hace son impecables, trabaja con muchísimo cuidado y amor por los detalles.`
 ],
 autonomia_trabajo: [
  `Nombre manifiesta una dependencia absoluta hacia la figura del adulto para lograr iniciar, estructurar y sostener temporalmente cualquier tipo de tarea laboral. Requiere instigación permanente para mantenerse activo/a en su puesto. Necesita que estemos muy presentes animándolo/a para que empiece y sostenga sus ganas de trabajar.`,
  `Nombre logra sostener la atención y el esfuerzo en la tarea por períodos breves de tiempo. Precisa de recordatorios verbales y estímulos constantes por parte del docente para poder retomar y dar continuidad al trabajo. Trabaja un ratito por su cuenta, pero necesita que le recordemos seguir adelante para no distraerse.`,
  `Nombre mantiene un ritmo de trabajo sostenido, constante y productivo, requiriendo tan solo de una supervisión de carácter intermitente. Demuestra capacidad para autorregular su actividad operativa de forma funcional. Trabaja re bien a su propio ritmo y casi no necesita que le digamos qué hacer a continuación.`,
  `Nombre trabaja con un nivel de autonomía sumamente destacado, organizando de manera personal sus tiempos, prioridades y tareas operativas. Gestiona su propia jornada laboral de forma plenamente independiente y responsable. Organiza todo su día de trabajo de manera increíble, hace sus tareas solo/a y con muchísima responsabilidad.`
 ],
 autonomia_seguridad: [
  `Nombre aún no ha internalizado las normas básicas de seguridad e higiene del taller. Requiere de control físico, supervisión constante y modelado preventivo para evitar situaciones de riesgo en el espacio de trabajo. Le estamos enseñando a cuidarse y a cuidar a los demás mientras trabaja, acompañándolo/a en todo momento.`,
  `Nombre evidencia conocimiento teórico de las normas básicas de seguridad e higiene, logrando aplicarlas si cuenta con el recordatorio explícito y la anticipación verbal del docente justo antes de comenzar sus actividades. Conoce las reglas para no lastimarse, solo se las recordamos un poquito antes de empezar a trabajar.`,
  `Nombre respeta y aplica de forma metódica y consistente las normativas vigentes de seguridad e higiene industrial. Demuestra cuidado por su propia integridad y mantiene los estándares de limpieza durante su desempeño. Es muy cuidadoso/a, sabe qué cosas son peligrosas y mantiene su lugar siempre limpio y seguro.`,
  `Nombre se posiciona como un verdadero referente dentro del grupo en materia de normas de seguridad e higiene. Cuida de forma proactiva y autónoma tanto su espacio personal de trabajo como el entorno general del taller. Nos da muchísimo orgullo ver cómo se cuida y ayuda a que todo el grupo trabaje seguro. Es un gran ejemplo.`
 ],
 rol_pautas: [
  `Nombre presenta notorias dificultades para ajustarse a las pautas del taller, tendiendo a la deambulación o interrumpiendo frecuentemente el trabajo de sus compañeros. Requiere constante reconducción a su puesto y tarea. Le está costando un poquito quedarse en su lugar de trabajo y seguir el ritmo, así que lo acompañamos con mucha paciencia.`,
  `Nombre logra respetar de forma básica las pautas de convivencia, las normas de funcionamiento y los horarios establecidos del entorno laboral, precisando para ello de supervisión externa y señalamientos frecuentes. Va aprendiendo muy bien las reglas de convivencia del grupo con un poco de guía nuestra.`,
  `Nombre cumple adecuadamente con las pautas estructurales de trabajo, asimilando con responsabilidad los tiempos, los cronogramas y las rutinas normativas propias de la dinámica cotidiana del taller pre-profesional. Entendió perfecto cómo funcionamos en el taller y respeta súper bien los horarios y las normas.`,
  `Nombre demuestra un nivel de compromiso, puntualidad y sentido de responsabilidad laboral absolutamente intachables. Sostiene una actitud sumamente madura y respetuosa hacia las normativas generales de la institución. Es súper responsable y respetuoso/a con todas las reglas, da gusto ver el compromiso que tiene con su trabajo.`
 ],
 rol_equipo: [
  `Nombre tiende a ejecutar sus tareas de manera totalmente aislada, centrando su foco únicamente en su propia actividad sin considerar, registrar o articular su desempeño con el resto del entorno productivo y humano. Estamos incentivándolo/a para que empiece a notar el trabajo de sus compañeros y de a poquito comparta con ellos.`,
  `Nombre logra participar de manera funcional en tareas de tipo compartido y proyectos asociativos únicamente cuando es el docente quien pauta, coordina de forma directa y media la dinámica vincular con el resto del grupo. Comparte muy bien el trabajo con sus compañeros cuando nosotros organizamos la actividad y lo acompañamos.`,
  `Nombre colabora asertivamente con sus pares en el desarrollo de producciones grupales. Logra sostener una comunicación técnica fluida, respetando su función y engranando su tarea con la de sus compañeros de manera natural. Trabaja hermoso en grupo, charla, comparte y hace su parte para que el trabajo entre todos salga bárbaro.`,
  `Nombre asume un rol proactivo y solidario frente a sus compañeros. Constantemente propone nuevas tareas de índole colaborativa, asiste a sus pares ante las dificultades y fomenta un excelente clima de trabajo en equipo. Es un compañero/a de oro, siempre ayuda a los demás y tira para adelante con todo el grupo.`
 ],
 comprension_proceso: [
  `Nombre se limita a ejecutar acciones repetitivas o pasos productivos de manera aislada y descontextualizada, sin lograr aún comprender el sentido global de la tarea o el resultado final del producto que se está elaborando. Está aprendiendo recién a hacer una partecita del trabajo, pero todavía le falta entender para qué sirve lo que estamos fabricando.`,
  `Nombre logra comprender parcialmente ciertas etapas de la secuencia de producción, necesitando de la explicación reiterada y la mediación conceptual constante por parte del docente para otorgarle sentido a su trabajo. Va entendiendo de a poco qué es lo que hacemos, y le explicamos para qué sirve su enorme esfuerzo.`,
  `Nombre comprende claramente la secuencia lógica y el encadenamiento integral del proceso productivo. Identifica con asertividad su lugar funcional dentro del sistema y la importancia de su tarea específica. Sabe muy bien qué lugar ocupa en el taller y por qué su ayuda es tan importante para terminar el producto.`,
  `Nombre posee un entendimiento absolutamente global y detallado del proceso productivo integral de la institución. Identifica, valora y analiza de manera crítica cómo cada mínima intervención propia aporta al éxito del resultado final. Entiende a la perfección todo lo que hacemos en el taller y sabe que su trabajo es súper valioso para que todo quede excelente.`
 ],
 responsabilidad_rol: [
  `Nombre requiere de estímulos y supervisión directiva de manera continua para lograr mantenerse físicamente en su puesto de trabajo y focalizado/a en la función operativa que le ha sido asignada dentro de la jornada. Necesita que lo/la animemos mucho para que no deje su tarea y entienda qué tiene que hacer.`,
  `Nombre logra asumir un rol productivo de características simples bajo supervisión general. Cumple de manera obediente y operativa con las tareas directas que le son explícitamente asignadas y demandadas por el docente. Hace muy bien las tareas que le pedimos, siempre con un poquito de guía nuestra para no perderse.`,
  `Nombre asume, respeta y mantiene su rol laboral y su función específica con total autonomía y responsabilidad. Se desenvuelve con soltura e independencia dentro del andamiaje general del grupo de trabajo. Es súper responsable con lo que le toca hacer y se maneja solo/a sin que tengamos que estar encima.`,
  `Nombre demuestra una sobresaliente madurez laboral. Es capaz de identificar por cuenta propia las diferentes necesidades o falencias emergentes del sistema productivo, asumiendo proactivamente nuevas funciones para darles solución. Es tan responsable que si ve que falta hacer algo que no era su tarea, se ofrece a ayudar sin que se lo pidamos.`
 ],
 adaptabilidad: [
  `Nombre manifiesta una notoria rigidez de tipo conductual ante cualquier mínima variación introducida en su tarea habitual, en el uso de los materiales o ante posibles y necesarios cambios de su puesto físico de trabajo. Le cuestan mucho los cambios repentinos, así que tratamos de mantener su rutina para que se sienta seguro/a.`,
  `Nombre logra aceptar de forma transitoria ciertos cambios en su función productiva, siempre y cuando estas modificaciones cuenten previamente con una explicación clara, un encuadre anticipatorio visual y un acompañamiento empático. Acepta probar cosas nuevas o cambiar de tarea si se lo explicamos con tiempo y mucha tranquilidad.`,
  `Nombre se adapta de forma sumamente flexible y operativa a la rotación por diferentes roles o estaciones de trabajo dentro del taller, requiriendo tan solo de una guía técnica de inducción mínima frente al nuevo desafío. Se adapta rapidísimo si un día le toca hacer una tarea distinta o trabajar con otro compañero.`,
  `Nombre exhibe una extraordinaria versatilidad y plasticidad sociolaboral. Cambia rápidamente de rol, puesto o función operativa basándose pura y exclusivamente en las demandas situacionales y las necesidades del sistema productivo. Es un todoterreno, no tiene problemas en cambiar de tarea mil veces si hace falta y siempre con excelente actitud.`
 ],
 gestion_tiempos: [
  `Nombre no evidencia un registro consciente, funcional ni autónomo del paso del tiempo laboral. Depende imperativamente de directivas externas para iniciar su labor, comprender los momentos de receso o finalizar su tarea. Le estamos enseñando a darse cuenta de cuándo es momento de trabajar y cuándo es momento de descansar.`,
  `Nombre ejecuta las consignas de trabajo respetando ciertos márgenes y ritmos mínimos de productividad, contando siempre con la estructuración, el andamiaje y la pautación de tiempos controlada por la supervisión externa. Sigue bien los tiempos si nosotros le avisamos cuándo empezar y cuándo frenar a tomar algo o descansar.`,
  `Nombre logra autorregular su propio ritmo, velocidad y nivel de exigencia en el trabajo. Gestiona sus tiempos de descanso y actividad de manera equilibrada para cumplir funcionalmente con los objetivos y plazos de entrega. Sabe organizarse perfecto: trabaja a buen ritmo y frena a descansar lo justo y necesario.`,
  `Nombre planifica de manera estratégica e independiente todo su tiempo laboral y la disposición de sus recursos técnicos con el fin de optimizar al máximo los niveles y la eficiencia global de la producción del taller. Maneja los tiempos como un profesional, organizándose tan bien que hace que todo el equipo trabaje mejor.`
 ]
};

// ⚠️ ACÁ ARRIBA DEJÁ TUS CONSTANTES INTACTAS: 
// CONFIG_INDICADORES y DICCIONARIO

const formatearTextoImpresion = (idIndicador, indiceOpcion, respuestaCorta, firstNameRaw) => {
 if (!respuestaCorta || typeof respuestaCorta !== 'string') return '';

 const nombreReal = firstNameRaw ? firstNameRaw.split(' ')[0] : 'El/la estudiante';

 const obtenerSujeto = () => {
  const nom = nombreReal.trim().toLowerCase();
  const excepcionesMasculinas = ['bautista', 'luca', 'noa', 'sasha', 'borja', 'mika', 'andrea'];
  let esMujer = false;
  if (nom.endsWith('a') && !excepcionesMasculinas.includes(nom)) {
   esMujer = true;
  }
  const articuloEstudiante = esMujer ? 'La estudiante' : 'El estudiante';
  const articuloAlumno = esMujer ? 'Nuestra alumna' : 'Nuestro alumno';

  const opciones = [nombreReal, articuloEstudiante, articuloAlumno, nombreReal];
  return opciones[Math.floor(Math.random() * opciones.length)];
 };

 let textoFinal = '';
 if (DICCIONARIO[idIndicador] && DICCIONARIO[idIndicador][indiceOpcion]) {
  textoFinal = DICCIONARIO[idIndicador][indiceOpcion];
 } else {
  let textoMinuscula = respuestaCorta.charAt(0).toLowerCase() + respuestaCorta.slice(1);
  textoFinal = `Se observa que Nombre ${textoMinuscula}`;
 }

 const sujetoDinamico = obtenerSujeto();
 textoFinal = textoFinal.replace('Nombre', sujetoDinamico);
 textoFinal = textoFinal.replace(/Nombre/g, nombreReal);

 return textoFinal;
};

const generarHTMLImpresion = (s, report) => {
  // 1. Determinamos el nivel (Crucial para Música)
  const nivel = report.tipoInforme === 'musica' ? (report.nivelMusica || 'Nivel 1') : (s?.level || 'Inicial');
  const indicadores = CONFIG_INDICADORES[report.tipoInforme]?.[nivel] || CONFIG_INDICADORES[report.tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[report.tipoInforme]?.['CFI'] || [];

  // 2. Definimos qué áreas usan la Grilla con X y cuáles usan texto redactado
 
  const materiasConGrilla = ['plastica', 'musica', 'psicomotricidad', 'educacion_fisica'];
  let desarrolloHTML = '';

  // 3. Agregamos Contenidos o Fundamentación antes de la tabla (Solo materias especiales)
  if (report.tipoInforme === 'plastica' && report.contenidosPlastica) {
    desarrolloHTML += `
      <div class="mb-4" style="break-inside: avoid;">
        <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Contenidos Abordados</h3>
        <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">${report.contenidosPlastica}</p>
      </div>
    `;
  }
  
  if (report.tipoInforme === 'musica') {
    desarrolloHTML += `
      <div class="mb-4" style="break-inside: avoid;">
        <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
        <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">El trabajo rítmico estructurado en formato de círculo favorece la eliminación de jerarquías, promueve el contacto visual continuo y estimula procesos de autorregulación, atención conjunta y empatía a través de la producción de un pulso compartido.</p>
      </div>
    `;
  }

  if (report.tipoInforme === 'psicomotricidad') {
    desarrolloHTML += `
      <div class="mb-4" style="break-inside: avoid;">
        <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
        <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">El espacio de Psicomotricidad ofrece propuestas que favorecen el desarrollo integral de los estudiantes a través del movimiento, el juego y la interacción con otros. Mediante experiencias adaptadas a las posibilidades e intereses de cada alumno, se promueve la exploración corporal, la participación activa, la comunicación y la construcción de recursos que contribuyen a una mayor autonomía en los distintos contextos cotidianos.\nLas actividades propuestas buscan acompañar el fortalecimiento de habilidades motrices, la organización de la acción, la adaptación a diferentes situaciones y el desarrollo de estrategias que favorezcan una participación cada vez más significativa dentro de las experiencias compartidas.</p>
      </div>
    `;
  }
 if (report.tipoInforme === 'educacion_fisica') {
    const isCFI = s?.level?.toUpperCase() === 'CFI' || s?.level?.toUpperCase() === 'FINES';
    const fundacionEducacionFisica = isCFI 
      ? "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo y la introducción a los deportes adaptados, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido."
      : "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido.";

    desarrolloHTML += `
      <div class="mb-4" style="break-inside: avoid;">
        <h3 class="font-black uppercase text-violet-900 text-[10px] tracking-widest mb-1 border-b border-violet-100 pb-1">Fundamentación</h3>
        <p class="text-gray-800 leading-relaxed font-medium text-[11px] mt-2 whitespace-pre-wrap">${fundacionEducacionFisica}</p>
      </div>
    `;
  }

  // 4. Renderizamos la Grilla (Materias Especiales) o el Texto (Pedagógico/Laboral)
  if (materiasConGrilla.includes(report.tipoInforme)) {
    desarrolloHTML += `
      <table class="w-full text-left border-collapse mt-4 text-[11px] mb-6" style="break-inside: avoid;">
        <thead>
          <tr class="bg-violet-100 text-violet-900">
            <th class="border border-violet-200 p-2 font-black uppercase">Objetivos / Indicadores</th>
            <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>autonomía</th>
            <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">Realiza con<br/>apoyo</th>
            <th class="border border-violet-200 p-2 font-black uppercase text-center w-20 leading-tight">En<br/>proceso</th>
          </tr>
        </thead>
        <tbody>
    `;
    indicadores.forEach(c => {
      const answer = report.answers?.[c.id];
      if (!answer) return;
      
      // Colocamos la 'X' en la columna que corresponda según la opción elegida
      const xAutonomia = answer === c.options[0] ? 'X' : '';
      const xApoyo = answer === c.options[1] ? 'X' : '';
      const xProceso = answer === c.options[2] ? 'X' : '';

      desarrolloHTML += `
        <tr>
          <td class="border border-violet-200 p-2 font-medium text-gray-800">${c.label}</td>
          <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xAutonomia}</td>
          <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xApoyo}</td>
          <td class="border border-violet-200 p-2 font-black text-center text-violet-800 text-sm">${xProceso}</td>
        </tr>
      `;
    });
    desarrolloHTML += `</tbody></table>`;
  } else {
    // Lógica original de redacción de texto para Pedagógico y Laboral
    desarrolloHTML += `<div class="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">`;
    indicadores.forEach(c => {
      const answer = report.answers?.[c.id];
      if (!answer) return;
      const optionIndex = c.options.indexOf(answer);
      let textoDescriptivo = optionIndex !== -1 ? formatearTextoImpresion(c.id, optionIndex, answer, s?.firstName) : answer;
      
      if (textoDescriptivo) {
        desarrolloHTML += `
        <div class="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style="break-inside: avoid;">
            <span class="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">${c.label}</span>
            <span class="text-gray-800 leading-relaxed font-medium text-[11px]">${textoDescriptivo}</span>
        </div>`;
      }
    });
    desarrolloHTML += `</div>`;
  }

  // 5. Renderizamos Observaciones y Objetivos dependiendo del área
  let obsYObjetivosHTML = '';
  
  if (materiasConGrilla.includes(report.tipoInforme)) {
   // Si es materia de grilla, mostramos solo sus observaciones especiales
     const obsEspeciales = report.observacionesPlastica || report.observacionesMusica || report.observacionesPsicomotricidad || report.observacionesEducacionFisica || '';
     if (obsEspeciales) {
       obsYObjetivosHTML = `
       <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
           <h2 class="font-black uppercase text-violet-900 mb-2 text-[10px] tracking-widest border-b border-violet-200 pb-1">Observaciones del período</h2>
           <p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${obsEspeciales}</p>
       </div>`;
     }
  } else {
     // Si es Pedagógico/Laboral, mostramos la lógica original de Cuatrimestre 1 y Objetivos C2
     obsYObjetivosHTML += report.obsCuatrimestre1 ? `
     <div class="mt-6 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
         <h2 class="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Observaciones sobre los objetivos planteados para este primer cuatrimestre</h2>
         <p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">${report.obsCuatrimestre1}</p>
     </div>` : '';

     obsYObjetivosHTML += (report.objConductual || report.objPedagogico || report.objSocioafectivo) ? `
     <div class="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style="break-inside: avoid;">
         <h2 class="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Objetivos para el segundo cuatrimestre</h2>
         ${report.objConductual ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Conductual:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objConductual}</p></div>` : ''}
         ${report.objPedagogico ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Pedagógico:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objPedagogico}</p></div>` : ''}
         ${report.objSocioafectivo ? `<div class="mb-2"><strong class="text-xs font-black text-violet-800">Objetivo Socioafectivo:</strong><p class="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">${report.objSocioafectivo}</p></div>` : ''}
     </div>` : '';
  }

  // Etiqueta del título del informe (Ej: "Música (Nivel 1)" o "Plástica")
  const subtituloArea = report.tipoInforme === 'musica' ? `${report.tipoInforme} (${report.nivelMusica || 'Nivel 1'})` : report.tipoInforme;

  // 6. Evaluamos si debe mostrarse o no el Auxiliar
  const mostrarAuxiliar = !materiasConGrilla.includes(report.tipoInforme);

  return `
  <div class="pagina w-full bg-white text-black font-sans pb-4">
      <div class="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
          <img src="/logosinfondo.png" alt="Logo Institucional" class="h-16 object-contain mb-3" />
          <h1 class="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME ${report.periodo.toUpperCase()} 2026</h1>
          <p class="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
              Área: ${subtituloArea}
          </p>
      </div>
      
      <div class="border border-violet-200 rounded-xl p-5 mb-6 bg-white shadow-sm" style="break-inside: avoid;">
          <h2 class="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
          <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <p><strong class="font-black text-gray-900">Alumno/a:</strong> <span class="text-gray-700">${s.lastName}, ${s.firstName}</span></p>
              <p><strong class="font-black text-gray-900">DNI:</strong> <span class="text-gray-700">${s.dni || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Fecha de Nac.:</strong> <span class="text-gray-700">${s.birthDate || s.fechaNac || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Grupo:</strong> <span class="text-gray-700 font-bold">${report.grupo}</span></p>
             <p><strong class="font-black text-gray-900">Docente a cargo:</strong> <span class="text-gray-700">${report?.docente || s.teacher || s.docente || '....................................'}</span></p>

${mostrarAuxiliar ? `<p><strong class="font-black text-gray-900">Auxiliar/Preceptora:</strong> <span class="text-gray-700">${report?.auxiliar || s.auxiliary || s.auxiliar || s.preceptora || '....................................'}</span></p>` : ''}
              <p class="col-span-2"><strong class="font-black text-gray-900">Año de cursada:</strong> <span class="text-gray-700">2026</span></p>
          </div>
      </div>
      
      <div class="mb-6">
          <h2 class="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-4 shadow-sm inline-block" style="break-inside: avoid;">
              Desarrollo de ${report.tipoInforme}
          </h2>
          ${desarrolloHTML}
      </div>
      
      ${obsYObjetivosHTML}

      <div class="mt-8 mb-2 px-4 text-center" style="break-inside: avoid;">
          <p class="text-xs text-gray-700 italic font-medium">
              Continuaremos abordando, desde la perspectiva constructivista, el aprendizaje subjetivo del alumno, centrándonos en su bienestar y motivación, para avanzar durante el siguiente periodo.
          </p>
      </div>

      <div class="mt-10 pt-6 flex flex-col items-center justify-center border-t border-dashed border-gray-300" style="break-inside: avoid;">
          <img src="/firmasylogo.png" alt="Firmas y Logo Institucional" class="max-w-[300px] w-full object-contain mb-10" />
          <div class="w-full flex justify-between px-12 mt-12">
              <div class="flex flex-col items-center w-48">
                  <div class="w-full border-t-2 border-black mb-2"></div>
                  <span class="text-[10px] font-black uppercase text-gray-900">Firma de Docente</span>
              </div>
              <div class="flex flex-col items-center w-48">
                  <div class="w-full border-t-2 border-black mb-2"></div>
                  <span class="text-[10px] font-black uppercase text-gray-900">Firma de Familia</span>
              </div>
          </div>
      </div>
  </div>`;
};

export function InformesView({ user, db, appId }) {
 const [stage, setStage] = useState('main'); 
 const [tipoInforme, setTipoInforme] = useState('pedagogico');
 const [periodoInforme, setPeriodoInforme] = useState('Medio');
 const [selectedStudent, setSelectedStudent] = useState(null);
 const [contenidosPlastica, setContenidosPlastica] = useState('');
  const [observacionesPlastica, setObservacionesPlastica] = useState('');
 const [searchTerm, setSearchTerm] = useState('');
 const [turnoFiltro, setTurnoFiltro] = useState('Todos');
 const [nivelFiltro, setNivelFiltro] = useState('Todos');
 const [grupoFiltro, setGrupoFiltro] = useState('Todos');
 const [nivelMusica, setNivelMusica] = useState('');
  const [observacionesMusica, setObservacionesMusica] = useState('');
 const [observacionesPsicomotricidad, setObservacionesPsicomotricidad] = useState('');
 const [observacionesEducacionFisica, setObservacionesEducacionFisica] = useState('');
 const [showStatsModal, setShowStatsModal] = useState(false);
 
 const [students, setStudents] = useState([]);
 const [savedReports, setSavedReports] = useState([]);
 const [isSaving, setIsSaving] = useState(false);
 
 const [answers, setAnswers] = useState({});
 const [obsCuatrimestre1, setObsCuatrimestre1] = useState('');
 const [objConductual, setObjConductual] = useState('');
 const [objPedagogico, setObjPedagogico] = useState('');
 const [objSocioafectivo, setObjSocioafectivo] = useState('');
 
 const [docentePrint, setDocentePrint] = useState('');
 const [preceptoraPrint, setPreceptoraPrint] = useState('');

 // Efecto estricto para impresión limpia
 useEffect(() => {
  const originalDisplays = new Map();

  const handleBeforePrint = () => {
   const bodyChildren = Array.from(document.body.children);
   bodyChildren.forEach(child => {
    // Ocultamos TODO excepto el contenedor de impresión, scripts y styles
    if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'impresion-masiva') {
     originalDisplays.set(child, child.style.display);
     child.style.display = 'none';
    }
   });
  };

  const handleAfterPrint = () => {
   // Destruimos el contenedor fantasma
   const masiva = document.getElementById('impresion-masiva');
   if (masiva) {
    masiva.remove();
   }

   // Restauramos la app normal
   const bodyChildren = Array.from(document.body.children);
   bodyChildren.forEach(child => {
    if (originalDisplays.has(child)) {
     child.style.display = originalDisplays.get(child);
    }
   });
   originalDisplays.clear();
  };

  window.addEventListener('beforeprint', handleBeforePrint);
  window.addEventListener('afterprint', handleAfterPrint);

  return () => {
   window.removeEventListener('beforeprint', handleBeforePrint);
   window.removeEventListener('afterprint', handleAfterPrint);
  };
 }, []);

 useEffect(() => {
  if (!db || !appId) return;
  const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
  const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
  const unsubR = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => { unsubS(); unsubR(); };
 }, [db, appId]);

 const estudiantesSede = students.filter(s => !s.modalidad || s.modalidad === 'Sede');
 
 const filteredStudents = estudiantesSede.filter(s => {
  const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
  const matchTurno = turnoFiltro === 'Todos' || (turnoFiltro === 'Mañana' ? s.groupMorning : s.groupAfternoon);
  const matchNivel = nivelFiltro === 'Todos' || (s.level && s.level.toUpperCase() === nivelFiltro.toUpperCase());
  const matchGrupo = grupoFiltro === 'Todos' || [s.groupMorning, s.groupAfternoon, s.laboralGroup].includes(grupoFiltro);
  return matchSearch && matchTurno && matchNivel && matchGrupo;
 });

 const handleEdit = (student, report) => {
  setSelectedStudent(student);
  setAnswers(report?.answers || {});
  setObsCuatrimestre1(report?.obsCuatrimestre1 || '');
  setObjConductual(report?.objConductual || '');
  setObjPedagogico(report?.objPedagogico || '');
  setObjSocioafectivo(report?.objSocioafectivo || '');
  setNivelMusica(report?.nivelMusica || '');
    setObservacionesMusica(report?.observacionesMusica || '');
  setObservacionesPsicomotricidad(report?.observacionesPsicomotricidad || '');
  setObservacionesEducacionFisica(report?.observacionesEducacionFisica || '');
  
  let docenteAsignado = student.teacher || student.docente || '';
  if (tipoInforme === 'musica') docenteAsignado = 'Francisco Jaime';
  if (tipoInforme === 'plastica') docenteAsignado = 'Rosario Cozzarín';
  if (tipoInforme === 'educacion_fisica') docenteAsignado = 'Juan Cruz Ricchi';
  if (tipoInforme === 'psicomotricidad') docenteAsignado = 'Pablo Pagliuca';
  
 setDocentePrint(docenteAsignado);
  
  let defaultPlastica = '';
  const lvl = student?.level?.toUpperCase() || '';
  if (lvl.includes('1° CICLO')) {
    defaultPlastica = '- El espacio, aprovechamiento y utilización consciente del plano.\n- El color.\n- Textura visual y táctil.';
  } else if (lvl.includes('2° CICLO')) {
    defaultPlastica = 'Organización dentro del plano.\n- Textura visual y táctil.\n- El color.';
  } else if (lvl.includes('CFI')) {
    defaultPlastica = 'Espacio plástico bidimensional. El marco. Límite de la obra.\n- Texturas. Textura visual y táctil.\n- El color. Mezclas.\n- La composición.';
  }
  setContenidosPlastica(report?.contenidosPlastica || defaultPlastica);
   setObservacionesPlastica(report?.observacionesPlastica || '');
  setPreceptoraPrint(student.auxiliary || student.auxiliar || student.preceptora || '');
  setStage('form');
 };

 const handleSaveInforme = async () => {
  if (grupoFiltro === 'Todos') { alert("Por favor, seleccioná un grupo específico para guardar."); return; }
  setIsSaving(true);
  const idUnico = `${selectedStudent.id}_${tipoInforme}_${grupoFiltro}_${periodoInforme}`; 
  await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', idUnico), {
   studentId: selectedStudent.id,
   studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
   grupo: grupoFiltro,
   tipoInforme,
   periodo: periodoInforme,
   observacionesPsicomotricidad,
   observacionesEducacionFisica,
   answers,
   nivelMusica,
      observacionesMusica,
   obsCuatrimestre1,
   objConductual,
   objPedagogico,
   objSocioafectivo,
   docente: docentePrint,
 auxiliar: preceptoraPrint,
 updatedAt: serverTimestamp()
   contenidosPlastica, // <-- Agregá esto
      observacionesPlastica, // <-- Agregá esto
   updatedAt: serverTimestamp()
  }, { merge: true });
  setStage('main');
  setIsSaving(false);
 };

const nivelActual = tipoInforme === 'musica' ? (nivelMusica || 'Nivel 1') : (selectedStudent?.level || 'Inicial');
  const indicadoresActuales = CONFIG_INDICADORES[tipoInforme]?.[nivelActual] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || [];

 // LÓGICA DE FILTRADO DINÁMICO
 const nivelesDisponibles = tipoInforme === 'laboral' 
  ? ['2° Ciclo', 'CFI'] 
  : ['Inicial', '1° Ciclo', '2° Ciclo', 'CFI'];

 return (
  <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in relative">
   
   {/* MAGIA CSS PARA IMPRESIÓN (Destruye la app de fondo y muestra solo el papel) */}
   <style>{`
    @media screen {
     #impresion-masiva { display: none !important; }
    }
    @media print {
     body > *:not(#impresion-masiva):not(script):not(style) {
      display: none !important;
     }
     #impresion-masiva {
      display: block !important;
      visibility: visible !important;
      position: relative; 
      width: 100%;
     }
     .pagina { page-break-after: always; }
     @page { margin: 1cm; }
     body { background: white; margin: 0; padding: 0; }
    }
   `}</style>

   {/* VISTA PRINCIPAL */}
   <div className={`${stage === 'main' ? 'block' : 'hidden'} print:hidden`}>
    <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-xl text-white mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
     <div className="w-full md:w-auto text-center md:text-left">
      <h2 className="text-xl md:text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
       <BookOpen size={24} className="md:w-[28px] md:h-[28px]" /> Gestión de Informes
      </h2>
      <p className="text-violet-100 text-xs md:text-sm">Mostrando: {filteredStudents.length} alumnos en la base Sede.</p>
     </div>

  <div className="w-full md:w-auto bg-white/10 p-3 rounded-2xl border border-white/20 flex flex-col md:flex-row items-end gap-3">
      <div className="w-full md:w-auto">
       <label className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-violet-200 block mb-1 px-1 text-center md:text-left">
        Período del Informe:
       </label>
       <select 
        className="w-full bg-white text-violet-900 font-black text-sm md:text-base py-2 px-3 md:p-3 rounded-xl outline-none" 
        value={periodoInforme} 
        onChange={e => setPeriodoInforme(e.target.value)}
       >
        <option value="Inicial" disabled>Informe Inicial (Cerrado)</option>
        <option value="Medio">Informe Medio 2026</option>
        <option value="Final" disabled>Informe Final (Pronto)</option>
       </select>
      </div>
      <button 
        onClick={() => setShowStatsModal(true)} 
        className="w-full md:w-auto bg-white text-violet-900 hover:bg-violet-50 font-black py-2.5 px-4 md:p-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
      >
        <PieChart size={20} /> <span className="md:inline">Estadísticas</span>
      </button>
     </div>
    </div>

 <div className="flex flex-wrap gap-2 p-2 bg-white rounded-2xl border mb-6">
          {[
            { id: 'pedagogico', label: 'Pedagógico' },
            { id: 'laboral', label: 'Laboral' },
            { id: 'psicomotricidad', label: 'Psicomotricidad' },
            { id: 'plastica', label: 'Plástica' },
            { id: 'musica', label: 'Música' },
            { id: 'educacion_fisica', label: 'Ed. Física' }
          ].map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTipoInforme(t.id); setNivelFiltro('Todos'); setGrupoFiltro('Todos'); }} 
              className={`flex-auto min-w-fit whitespace-nowrap px-3 py-2 md:p-3 text-xs md:text-sm rounded-xl font-black transition-all ${tipoInforme === t.id ? 'bg-violet-600 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200 text-gray-600'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

    
      {/* AVISO PARA EL DOCENTE */}
      {grupoFiltro === 'Todos' && !searchTerm && (
  <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-center gap-3 mb-6">
         <span className="text-xl">👉</span>
         <p className="text-sm text-indigo-900 font-medium">Por favor, <strong>seleccioná el Turno, Nivel y Grupo</strong> (o utilizá el buscador) para ver a los alumnos y empezar a cargar sus informes.</p>
       </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <input className="p-4 rounded-2xl border bg-white text-sm" placeholder="Buscar por apellido..." onChange={e => setSearchTerm(e.target.value)} />
        
        <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={turnoFiltro} onChange={e => {setTurnoFiltro(e.target.value); setNivelFiltro('Todos'); setGrupoFiltro('Todos');}}>
         <option value="Todos">Turno: Todos</option>
         <option value="Mañana">Mañana</option>
         <option value="Tarde">Tarde</option>
        </select>

        {turnoFiltro !== 'Todos' && (
         <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={nivelFiltro} onChange={e => {setNivelFiltro(e.target.value); setGrupoFiltro('Todos');}}>
           <option value="Todos">Nivel: Todos</option>
           {nivelesDisponibles.map(n => <option key={n} value={n}>{n}</option>)}
         </select>
        )}

        {nivelFiltro !== 'Todos' && (
         <select className="p-4 rounded-2xl border bg-white text-sm font-bold w-full" value={grupoFiltro} onChange={e => setGrupoFiltro(e.target.value)}>
           <option value="Todos">Grupo: Todos</option>
           {students
            .filter(s => s.level && s.level.toUpperCase() === nivelFiltro.toUpperCase())
            .flatMap(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean))
            .filter((v, i, a) => a.indexOf(v) === i)
            .filter(g => {
              // Lógica para mostrar/ocultar Talleres según el Área
              const isTaller = g.toUpperCase().includes('TALLER') || g.toUpperCase().includes('PRE TALLER') || g.toUpperCase().includes('PRETALLER');
              if (tipoInforme === 'laboral') return isTaller; 
              if (tipoInforme === 'pedagogico') return !isTaller; 
              return true;
            })
            .map(g => <option key={g} value={g}>{g}</option>)}
         </select>
        )}
      </div>

      {/* CONDICIONAL: Solo mostrar alumnos si hay un grupo elegido o si están buscando por nombre */}
      {grupoFiltro === 'Todos' && !searchTerm ? (
        <div className="bg-white rounded-3xl shadow-sm border p-12 text-center border-dashed border-gray-300">
          <p className="text-gray-400 font-bold text-lg">Esperando selección de grupo...</p>
          <p className="text-gray-400 text-sm mt-2">Utilizá los filtros de arriba para empezar a editar.</p>
        </div>
      ) : (
        <>
        
         {/* BOTÓN IMPRESIÓN GRUPAL */}
         {grupoFiltro !== 'Todos' && filteredStudents.length > 0 && (
          <button 
           onClick={() => {
            let contenedor = document.getElementById('impresion-masiva');
            if (!contenedor) {
             contenedor = document.createElement('div');
             contenedor.id = 'impresion-masiva';
             contenedor.className = 'print:block';
             document.body.appendChild(contenedor);
            }
            
            let htmlMasivo = '';
            filteredStudents.forEach(s => {
              // ACÁ ESTÁ EL ARREGLO PARA IMPRIMIR SOLO EL ÁREA ACTUAL
              const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme);
              if(report) {
                htmlMasivo += generarHTMLImpresion(s, report);
              }
            });
            contenedor.innerHTML = htmlMasivo;
            
            setTimeout(() => {
             window.print();
            }, 500);
           }}
           className="w-full mt-4 mb-4 bg-emerald-600 text-white p-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 transition"
          >
           {/* ACÁ ESTÁ EL ARREGLO PARA EL NÚMERO DEL BOTÓN */}
           <Printer size={20} /> Imprimir todos los informes del grupo ({filteredStudents.filter(s => savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme)).length})
          </button>
         )}
         
       {/* LISTA DE ALUMNOS */}
         <div className="bg-white rounded-3xl shadow-sm border divide-y">
          {filteredStudents.length === 0 ? (
           <div className="p-8 text-center text-gray-400 font-medium">No se encontraron estudiantes para este filtro.</div>
          ) : (
           filteredStudents.map(s => {
            const report = grupoFiltro === 'Todos' ? null : savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme);
            return (
             <div key={`${s.id}-${grupoFiltro}`} className={`p-5 flex justify-between items-center transition-colors ${report ? 'bg-emerald-50' : 'hover:bg-violet-50/50'}`}>
              <div>
               <p className={`font-bold ${report ? 'text-emerald-900' : 'text-gray-900'}`}>{s.lastName}, {s.firstName}</p>
               <p className={`text-[10px] font-bold uppercase ${report ? 'text-emerald-600' : 'text-gray-400'}`}>
                {s.level} | {report ? `Cargado (${periodoInforme})` : 'Pendiente'}
               </p>
              </div>
              {grupoFiltro !== 'Todos' && (
               <div className="flex items-center gap-2">
                {report && (
                 <button 
                  onClick={() => {
                   let contenedor = document.getElementById('impresion-masiva');
                   if (!contenedor) {
                    contenedor = document.createElement('div');
                    contenedor.id = 'impresion-masiva';
                    contenedor.className = 'print:block';
                    document.body.appendChild(contenedor);
                   }
                   contenedor.innerHTML = generarHTMLImpresion(s, report);
                   setTimeout(() => { window.print(); }, 500);
                  }} 
                  className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                  title="Imprimir informe individual"
                 >
                  <Printer size={16}/>
                 </button>
                )}
                <button onClick={() => handleEdit(s, report)} className={`p-2 rounded-lg transition-colors ${report ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-violet-600 text-white hover:bg-violet-700'}`}>
                 {report ? <Edit3 size={16}/> : <Plus size={16}/>}
              </button>
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
</>
)}
</div>
{/* MODAL DE ESTADÍSTICAS */}
  {showStatsModal && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-[30px] shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 bg-violet-800 text-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2"><PieChart size={24} /> Progreso de Carga</h2>
            <p className="text-violet-200 text-sm">Informes del período: {periodoInforme}</p>
          </div>
          <button onClick={() => setShowStatsModal(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6 bg-gray-50">
          {(() => {
            const areasStats = [
              { id: 'pedagogico', label: 'Pedagógico' },
              { id: 'laboral', label: 'Laboral' },
              { id: 'psicomotricidad', label: 'Psicomotricidad' },
              { id: 'plastica', label: 'Plástica' },
              { id: 'musica', label: 'Música' },
              { id: 'educacion_fisica', label: 'Ed. Física' }
            ].map(area => {
              let expected = 0;
              let completed = 0;
              const reportsCurrentPeriod = savedReports.filter(r => r.periodo === periodoInforme);

              estudiantesSede.forEach(s => {
                const lvl = s.level ? s.level.toUpperCase() : '';
                let expects = false;
                const groups = [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean).map(g => g.toUpperCase());
                const hasTaller = groups.some(g => g.includes('TALLER') || g.includes('PRE TALLER') || g.includes('PRETALLER'));

                if (area.id === 'pedagogico' && !hasTaller) expects = true;
                if (area.id === 'laboral' && hasTaller) expects = true;
                if (area.id === 'psicomotricidad') expects = true;
                if (area.id === 'musica') expects = true;
                if (area.id === 'plastica' && lvl !== 'INICIAL') expects = true;
                if (area.id === 'educacion_fisica' && lvl !== 'INICIAL' && !lvl.includes('1° CICLO')) expects = true;

                if (expects) {
                  expected++;
                  if (reportsCurrentPeriod.some(r => r.studentId === s.id && r.tipoInforme === area.id)) {
                    completed++;
                  }
                }
              });

              const percentage = expected === 0 ? 0 : Math.round((completed / expected) * 100);
              return { ...area, expected, completed, percentage };
            });

            const totalExpected = areasStats.reduce((acc, curr) => acc + curr.expected, 0);
            const totalCompleted = areasStats.reduce((acc, curr) => acc + curr.completed, 0);
            const totalPercentage = totalExpected === 0 ? 0 : Math.round((totalCompleted / totalExpected) * 100);

            return (
              <>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                  <p className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-2">Progreso Global Escuela</p>
                  <div className="flex items-end justify-center gap-2 mb-4">
                    <span className="text-5xl font-black text-violet-700">{totalPercentage}%</span>
                    <span className="text-gray-400 font-medium pb-1">({totalCompleted} de {totalExpected})</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-violet-600 h-3 rounded-full transition-all duration-1000" style={{ width: `${totalPercentage}%` }}></div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-black text-gray-800 uppercase text-xs tracking-widest px-2">Desglose por Área</h3>
                  {areasStats.map(stat => (
                    <div key={stat.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-800">{stat.label}</span>
                        <span className="text-xs font-black px-2 py-1 bg-gray-100 rounded-md text-gray-600">
                          {stat.completed} / {stat.expected} listos
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-2.5 rounded-full transition-all duration-1000 ${stat.percentage === 100 ? 'bg-emerald-500' : stat.percentage > 40 ? 'bg-indigo-500' : 'bg-amber-500'}`} 
                            style={{ width: `${stat.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-xs font-black w-10 text-right text-gray-700">{stat.percentage}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  )}

   {/* INTERFAZ DE EDICIÓN EN PANTALLA */}
   {stage === 'form' && (
    <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-6 print:hidden animate-in fade-in">
     
     <div className="flex justify-between items-center mb-4">
      <button onClick={() => setStage('main')} className="bg-gray-100 p-3 rounded-full hover:bg-gray-200">
       <X size={20}/>
      </button>
      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
       <span>Guardado automático</span>
      </div>
     </div>
     
     <div className="bg-violet-50 p-6 rounded-3xl mb-6 border border-violet-100">
       <h3 className="font-black text-2xl text-violet-900">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
       <p className="text-sm font-bold text-violet-600 uppercase mb-4">GRUPO: {grupoFiltro} | INFORME: {tipoInforme} {periodoInforme}</p>
       
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
         <label className="text-[10px] font-black uppercase text-violet-800">Docente a cargo</label>
         <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={docentePrint} onChange={e => setDocentePrint(e.target.value)} placeholder="Ej. Alejandra..." />
        </div>
        {!['plastica', 'musica', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
         <div>
          <label className="text-[10px] font-black uppercase text-violet-800">Auxiliar / Preceptora</label>
          <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={preceptoraPrint} onChange={e => setPreceptoraPrint(e.target.value)} placeholder="Ej. Andrea..." />
         </div>
        )}
       </div>
     </div>

     <div className="space-y-4">
            
      {/* BLOQUEOS PARA PLÁSTICA Y ED. FÍSICA SEGÚN NIVEL */}
            {(tipoInforme === 'plastica' && selectedStudent?.level?.toUpperCase() === 'INICIAL') || (tipoInforme === 'educacion_fisica' && ['INICIAL', '1° CICLO'].includes(selectedStudent?.level?.toUpperCase())) ? (
              <div className="bg-amber-50 border border-amber-200 p-8 rounded-3xl text-center">
                <span className="text-4xl block mb-2">⚠️</span>
                <p className="text-amber-900 font-black text-lg">El nivel {selectedStudent?.level} no posee informe de {tipoInforme.replace('_', ' ')}.</p>
                <p className="text-amber-700 text-sm mt-1">Por favor, seleccioná otra área u otro grupo.</p>
              </div>
            ) : (
              <>
                {/* 1. ESPACIO DE CONTENIDOS (SOLO PARA PLÁSTICA) */}
                {tipoInforme === 'plastica' && (
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-6">
                    <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Contenidos Abordados</label>
                    <textarea 
                      className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                      placeholder="Ej: El espacio, aprovechamiento y utilización consciente del plano. El color..." 
                      value={contenidosPlastica} 
                      onChange={e => setContenidosPlastica(e.target.value)} 
                      rows={3}
                    />
                  </div>
                )}
             {/* SELECTOR DE NIVEL PARA MÚSICA */}
                {tipoInforme === 'musica' && (
                  <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 mb-6 text-center">
                    <h3 className="text-sm font-black text-indigo-900 uppercase mb-4">Seleccione el Nivel de Música a evaluar</h3>
                    <div className="flex gap-4 max-w-md mx-auto">
                      <button 
                        onClick={() => setNivelMusica('Nivel 1')} 
                        className={`flex-1 p-4 rounded-xl font-black uppercase text-sm transition-all ${nivelMusica === 'Nivel 1' ? 'bg-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-indigo-100 hover:border-violet-400 text-gray-600'}`}
                      >
                        Nivel 1
                      </button>
                      <button 
                        onClick={() => setNivelMusica('Nivel 2')} 
                        className={`flex-1 p-4 rounded-xl font-black uppercase text-sm transition-all ${nivelMusica === 'Nivel 2' ? 'bg-violet-600 text-white shadow-md scale-105' : 'bg-white border-2 border-indigo-100 hover:border-violet-400 text-gray-600'}`}
                      >
                        Nivel 2
                      </button>
                    </div>
                  </div>
                )}

                {/* BLOQUEO: SI ES MÚSICA Y NO ELIGIÓ NIVEL, CORTAMOS ACÁ */}
                {tipoInforme === 'musica' && !nivelMusica ? (
                  <div className="p-12 text-center text-gray-400 font-medium border-2 border-dashed border-gray-200 rounded-3xl mb-8">
                    👆 Por favor, seleccioná Nivel 1 o Nivel 2 arriba para desplegar la rúbrica correspondiente.
                  </div>
                ) : (
                  <>
                    {/* FUNDAMENTACIÓN (SOLO PARA MÚSICA CUANDO YA ELIGIÓ NIVEL) */}
                    {tipoInforme === 'musica' && (
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                        <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                        <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                          El trabajo rítmico estructurado en formato de círculo favorece la eliminación de jerarquías, promueve el contacto visual continuo y estimula procesos de autorregulación, atención conjunta y empatía a través de la producción de un pulso compartido.
                        </p>
                      </div>
                    )}

                    {/* FUNDAMENTACIÓN (SOLO PARA PSICOMOTRICIDAD) */}
                    {tipoInforme === 'psicomotricidad' && (
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                        <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                        <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                          El espacio de Psicomotricidad ofrece propuestas que favorecen el desarrollo integral de los estudiantes a través del movimiento, el juego y la interacción con otros. Mediante experiencias adaptadas a las posibilidades e intereses de cada alumno, se promueve la exploración corporal, la participación activa, la comunicación y la construcción de recursos que contribuyen a una mayor autonomía en los distintos contextos cotidianos.
                          
                          Las actividades propuestas buscan acompañar el fortalecimiento de habilidades motrices, la organización de la acción, la adaptación a diferentes situaciones y el desarrollo de estrategias que favorezcan una participación cada vez más significativa dentro de las experiencias compartidas.
                        </p>
                      </div>
                    )}
                   {tipoInforme === 'educacion_fisica' && (
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 mb-6">
                        <h3 className="text-sm font-black text-indigo-900 uppercase mb-2">Fundamentación</h3>
                        <p className="text-xs text-indigo-800 font-medium leading-relaxed whitespace-pre-wrap">
                         {['CFI', 'FINES'].includes(selectedStudent?.level?.toUpperCase()) ? 
                          "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo y la introducción a los deportes adaptados, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido." :
                          "En este ciclo lectivo, la Educación Física se propone como un espacio de encuentro, disfrute y aprendizaje a través del cuerpo. Desde una mirada inclusiva, priorizamos el desarrollo de la autonomía, la confianza y las habilidades motrices de cada alumno, respetando sus tiempos y singularidades. A través del juego cooperativo, buscamos que la clase sea un lugar de participación plena para todos, donde las reglas y materiales se transforman para que la diversidad enriquezca la convivencia y el aprendizaje compartido."
                         }
                        </p>
                      </div>
                    )}

                {/* 2. RÚBRICA DE INDICADORES (PARA TODOS) */}
              {indicadoresActuales.map(c => (
  <div key={c.id} className="space-y-2 mb-4 p-4 bg-gray-50 rounded-2xl">
    <label className="text-xs font-black uppercase text-gray-700">{c.label}</label>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
      {c.options.map(opt => {
        const isSelected = answers[c.id] === opt;
        return (
          <button 
            key={opt} 
            onClick={() => setAnswers(p => ({...p, [c.id]: opt}))} 
            className={"p-3 rounded-xl font-bold text-[10px] uppercase border-2 text-center transition-all " + (isSelected ? "bg-violet-600 text-white border-violet-700 shadow-md" : "bg-white border-gray-200 hover:border-violet-300")}
          >
            {opt}
          </button>
        );
      })}
    </div>

    {/* PARCHE: Cuadro de texto personalizado para áreas pedagógica y laboral */}
    {['pedagogico', 'laboral'].includes(tipoInforme) && (
      <div className="mt-3/2">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1">O escribir una opción personalizada:</label>
        <textarea
          className="w-full p-3 bg-white rounded-xl text-xs border border-gray-200 font-medium text-gray-700 placeholder-gray-400"
          placeholder="Escribí acá un texto a medida para este indicador..."
          value={answers[c.id] || ''}
          onChange={e => setAnswers(p => ({...p, [c.id]: e.target.value}))}
          rows={2}
        />
      </div>
    )}
  </div>
))}

                {/* 3. ESPACIO DE OBSERVACIONES (SOLO PARA PLÁSTICA) */}
                {tipoInforme === 'plastica' && (
                  <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                    <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                    <textarea 
                      className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                      placeholder="Escriba aquí las observaciones finales..." 
                      value={observacionesPlastica} 
                      onChange={e => setObservacionesPlastica(e.target.value)} 
                      rows={4}
                    />
                  </div>
                )}
                   {/* ESPACIO DE OBSERVACIONES (SOLO PARA PSICOMOTRICIDAD) */}
                    {tipoInforme === 'psicomotricidad' && (
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                        <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                        <textarea 
                          className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                          placeholder="Escriba aquí las observaciones finales de psicomotricidad..." 
                          value={observacionesPsicomotricidad} 
                          onChange={e => setObservacionesPsicomotricidad(e.target.value)} 
                          rows={4}
                        />
                      </div>
                    )}
                   {/* ESPACIO DE OBSERVACIONES (SOLO PARA MÚSICA) */}
                    {tipoInforme === 'musica' && (
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                        <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                        <textarea 
                          className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                          placeholder="Escriba aquí las observaciones finales de música..." 
                          value={observacionesMusica} 
                          onChange={e => setObservacionesMusica(e.target.value)} 
                          rows={4}
                        />
                      </div>
                    )}
                   {tipoInforme === 'educacion_fisica' && (
                      <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mt-6">
                        <label className="text-xs font-black uppercase text-indigo-800 block mb-2">Observaciones del período</label>
                        <textarea 
                          className="w-full p-4 bg-white rounded-xl text-sm border border-indigo-200" 
                          placeholder="Escriba aquí las observaciones finales de educación física..." 
                          value={observacionesEducacionFisica} 
                          onChange={e => setObservacionesEducacionFisica(e.target.value)} 
                          rows={4}
                        />
                      </div>
                    )}

              {/* 4. OBJETIVOS Y OBS. CUATRIMESTRE 1 (OCULTOS EN MATERIAS ESPECIALES) */}
                {!['plastica', 'musica', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
                  <div className="mt-8 space-y-4">
                    <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                      <label className="text-xs font-black uppercase text-violet-800 block mb-2">Observaciones sobre los objetivos planteados para este primer cuatrimestre</label>
                      <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" placeholder="Escriba aquí las observaciones..." value={obsCuatrimestre1} onChange={e => setObsCuatrimestre1(e.target.value)} rows={4} />
                    </div>

                    <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100 space-y-4">
                      <h3 className="text-sm font-black uppercase text-violet-900 border-b border-violet-200 pb-2">Objetivos para el segundo cuatrimestre</h3>
                      <div>
                        <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Conductual</label>
                        <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objConductual} onChange={e => setObjConductual(e.target.value)} rows={2} />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Pedagógico</label>
                        <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objPedagogico} onChange={e => setObjPedagogico(e.target.value)} rows={2} />
                      </div>
                      <div>
                        <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivo Socioafectivo</label>
                        <textarea className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" value={objSocioafectivo} onChange={e => setObjSocioafectivo(e.target.value)} rows={2} />
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

     <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 mt-6 bg-violet-800 hover:bg-violet-900 text-white font-black rounded-2xl">
      {isSaving ? 'Guardando...' : 'Guardar Informe'}
     </button>
    </div>
   )}

   {/* DOCUMENTO DE IMPRESIÓN OCULTO AL FONDO (No lo vas a ver hasta que presiones Imprimir) */}
   {stage === 'form' && (
    <div id="informe-imprimir" className="hidden">
     <div className="pagina w-full bg-white text-black font-sans pb-4">
      <div className="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
       <img src="/logosinfondo.png" alt="Logo Institucional" className="h-16 object-contain mb-3" />
       <h1 className="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME {periodoInforme.toUpperCase()} 2026</h1>
       <p className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
        Área: {tipoInforme}
       </p>
      </div>
      
      <div className="border border-violet-200 rounded-xl p-5 mb-6 bg-white shadow-sm" style={{ breakInside: 'avoid' }}>
       <h2 className="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
       <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
        <p><strong className="font-black text-gray-900">Alumno/a:</strong> <span className="text-gray-700">{selectedStudent?.lastName}, {selectedStudent?.firstName}</span></p>
        <p><strong className="font-black text-gray-900">DNI:</strong> <span className="text-gray-700">{selectedStudent?.dni || '....................................'}</span></p>
        <p><strong className="font-black text-gray-900">Fecha de Nac.:</strong> <span className="text-gray-700">{selectedStudent?.birthDate || selectedStudent?.fechaNac || '....................................'}</span></p>
        <p><strong className="font-black text-gray-900">Grupo:</strong> <span className="text-gray-700 font-bold">{grupoFiltro}</span></p>
   <p>
          <strong className="font-black text-gray-900">Docente a cargo:</strong>{" "}
          <span className="text-gray-700">
            {docentePrint || selectedStudent?.teacher || selectedStudent?.docente || '....................................'}
          </span>
        </p>
        
        {!['plastica', 'musica', 'psicomotricidad', 'educacion_fisica'].includes(tipoInforme) && (
          <p>
            <strong className="font-black text-gray-900">Auxiliar/Preceptora:</strong>{" "}
            <span className="text-gray-700">
              {preceptoraPrint || selectedStudent?.auxiliary || selectedStudent?.auxiliar || selectedStudent?.preceptora || '....................................'}
            </span>
          </p>
        )}
       </div>
      </div>

      <div className="mb-6">
       <h2 className="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-4 shadow-sm inline-block" style={{ breakInside: 'avoid' }}>
        Desarrollo {tipoInforme}
       </h2>
       <div className="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">
        {indicadoresActuales.map(c => {
         const answer = answers[c.id];
         if (!answer) return null; 
         const optionIndex = c.options.indexOf(answer);
         let textoDescriptivo = optionIndex !== -1 ? formatearTextoImpresion(c.id, optionIndex, answer, selectedStudent?.firstName) : answer;
         if (!textoDescriptivo) return null;
         return (
          <div key={c.id} className="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style={{ breakInside: 'avoid' }}>
           <span className="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">{c.label}</span>
           <span className="text-gray-800 leading-relaxed font-medium text-[11px]">{textoDescriptivo}</span>
          </div>
         );
        })}
       </div>
      </div>

      {obsCuatrimestre1 && (
       <div className="mt-6 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style={{ breakInside: 'avoid' }}>
        <h2 className="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Observaciones sobre los objetivos planteados para este primer cuatrimestre</h2>
        <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{obsCuatrimestre1}</p>
       </div>
      )}

      {(objConductual || objPedagogico || objSocioafectivo) && (
       <div className="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style={{ breakInside: 'avoid' }}>
        <h2 className="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Objetivos para el segundo cuatrimestre</h2>
        {objConductual && (
         <div className="mb-2">
          <strong className="text-xs font-black text-violet-800">Objetivo Conductual:</strong>
          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">{objConductual}</p>
         </div>
        )}
        {objPedagogico && (
         <div className="mb-2">
          <strong className="text-xs font-black text-violet-800">Objetivo Pedagógico:</strong>
          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">{objPedagogico}</p>
         </div>
        )}
        {objSocioafectivo && (
         <div className="mb-2">
          <strong className="text-xs font-black text-violet-800">Objetivo Socioafectivo:</strong>
          <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium mt-1">{objSocioafectivo}</p>
         </div>
        )}
       </div>
      )}

      <div className="mt-8 mb-2 px-4 text-center" style={{ breakInside: 'avoid' }}>
       <p className="text-xs text-gray-700 italic font-medium">
         Continuaremos abordando, desde la perspectiva constructivista, el aprendizaje subjetivo del alumno, centrándonos en su bienestar y motivación, para avanzar durante el siguiente periodo.
       </p>
      </div>

      <div className="mt-10 pt-6 flex flex-col items-center justify-center border-t border-dashed border-gray-300" style={{ breakInside: 'avoid' }}>
       <img src="/firmasylogo.png" alt="Firmas y Logo Institucional" className="max-w-[300px] w-full object-contain mb-10" />
       <div className="w-full flex justify-between px-12 mt-12">
        <div className="flex flex-col items-center w-48">
         <div className="w-full border-t-2 border-black mb-2"></div>
         <span className="text-[10px] font-black uppercase text-gray-900">Firma de Docente</span>
        </div>
        <div className="flex flex-col items-center w-48">
         <div className="w-full border-t-2 border-black mb-2"></div>
         <span className="text-[10px] font-black uppercase text-gray-900">Firma de Familia</span>
        </div>
       </div>
      </div>
     </div>
    </div>
   )}

  </div>
 );
}
