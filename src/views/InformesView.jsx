import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, BookOpen, Printer } from 'lucide-react';
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

export function InformesView({ user, db, appId }) {
  const [stage, setStage] = useState('main'); 
  const [tipoInforme, setTipoInforme] = useState('pedagogico');
  const [periodoInforme, setPeriodoInforme] = useState('Medio');
  const [selectedStudent, setSelectedStudent] = useState(null);
   
  const [searchTerm, setSearchTerm] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('Todos');
  const [nivelFiltro, setNivelFiltro] = useState('Todos');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  
  const [students, setStudents] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [answers, setAnswers] = useState({});
  const [obsCuatrimestre1, setObsCuatrimestre1] = useState('');
  const [obsCuatrimestre2, setObsCuatrimestre2] = useState('');
  
  const [docentePrint, setDocentePrint] = useState('');
  const [preceptoraPrint, setPreceptoraPrint] = useState('');

  useEffect(() => {
    let printClone = null;
    const originalDisplays = new Map();

    const handleBeforePrint = () => {
      const printElement = document.getElementById('informe-imprimir');
      if (!printElement) return;

      printClone = printElement.cloneNode(true);
      printClone.classList.remove('hidden', 'print:block');
      printClone.style.display = 'block';
      printClone.id = 'informe-imprimir-clone';

      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'informe-imprimir-clone') {
          originalDisplays.set(child, child.style.display);
          child.style.display = 'none';
        }
      });

      document.body.appendChild(printClone);
    };

    const handleAfterPrint = () => {
      if (printClone && printClone.parentNode) {
        printClone.parentNode.removeChild(printClone);
      }
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (originalDisplays.has(child)) {
          child.style.display = originalDisplays.get(child);
        }
      });
      originalDisplays.clear();
      printClone = null;
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const triggerPrint = () => {
    window.print();
  };

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
    setObsCuatrimestre2(report?.obsCuatrimestre2 || '');
    setDocentePrint(student.teacher || student.docente || '');
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
      answers,
      obsCuatrimestre1,
      obsCuatrimestre2,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStage('main');
    setIsSaving(false);
  };

  const nivelActual = selectedStudent?.level || 'Inicial';
  const indicadoresActuales = CONFIG_INDICADORES[tipoInforme]?.[nivelActual] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || [];

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

    const DICCIONARIO = {
      // --- ÁREA PEDAGÓGICA ---
      lectoescritura: [
        `Nombre se encuentra en la etapa presilábica. En este momento, está dando sus primeros pasos en el mundo de la escritura explorándola a través de dibujos y trazos. Si bien todavía no tienen un valor sonoro definido, esta es una etapa de descubrimiento fundamental: es un proceso de juego y exploración muy valioso que prepara el terreno para todos los aprendizajes que vendrán más adelante.`,
        `Nombre se encuentra en la etapa silábica. Ha empezado a descubrir que las letras tienen sonido y, en sus producciones, ya podemos ver cómo utiliza principalmente vocales para representar lo que quiere decir. Es un avance muy importante, ya que demuestra que está conectando el mundo de lo oral con lo escrito. ¡Es un paso fundamental en su camino como escritor/a!`,
        `Nombre se encuentra en la etapa silábico-alfabética. Es un momento de muchos cambios y descubrimientos en su escritura, donde ya es capaz de combinar sílabas completas con algunas letras aisladas. Esto nos muestra que está analizando cada vez mejor cómo se forman las palabras. Es un proceso de transición muy interesante donde su curiosidad es la mejor herramienta para seguir avanzando.`,
        `Nombre se encuentra en la etapa alfabética. Ha logrado escribir de manera autónoma, representando los sonidos con coherencia y logrando que sus palabras se entiendan con claridad. Es un gran avance que demuestra cómo ha comprendido el sistema de escritura para expresar sus ideas. Celebramos este logro tan importante en su autonomía y seguiremos acompañándolo/a para que continúe explorando el mundo de las letras con confianza.`
      ],
      escritura: [
        `Nombre se encuentra en una etapa donde requiere guía física constante (mano-sobre-mano) para realizar sus grafismos. En esta fase, nuestro acompañamiento es fundamental para guiar el movimiento, favorecer la seguridad en el trazo y explorar juntos la acción de escribir. Es un momento de contacto y estimulación esencial para ir construyendo, paso a paso, la base de su expresión escrita.`,
        `Nombre escribe mediante copia fiel o dictado fonético sencillo, sosteniéndose en el apoyo directo del docente. Nuestra presencia constante le permite orientarse, despejar dudas y animarse a combinar sonidos, consolidando así sus primeras producciones escritas con mayor seguridad.`,
        `Nombre escribe frases cortas a través de dictados fonéticos, contando con nuestra supervisión frecuente. Este nivel muestra un avance importante, ya que comienza a estructurar pequeñas oraciones con sentido. Nuestra presencia constante le permite orientarse, despejar dudas y animarse a combinar sonidos, consolidando así sus primeras producciones escritas con mayor seguridad.`,
        `Nombre escribe de forma autónoma y creativa, logrando expresar sus ideas con sentido completo. Es un gran paso en su proceso de alfabetización, ya que puede organizar el lenguaje para transmitir mensajes claros por cuenta propia. Celebramos esta autonomía alcanzada, que le permite usar la escritura como una herramienta real y valiosa para compartir su mundo interior con los demás.`
      ],
      comprension: [
        `Nombre aún no logra atribuir significado al texto escrito, concentrándose principalmente en la identificación de imágenes. Este es un punto de partida muy importante: a través de las ilustraciones, Nombre empieza a explorar el mundo visual que rodea a la escritura. Estamos trabajando con propuestas que inviten a explorar los libros y materiales escritos, favoreciendo poco a poco el acercamiento a las letras como portadoras de sentido.`,
        `Nombre se encuentra en un nivel en el que comprende textos breves y sencillos a través de la lectura compartida. Este momento de intercambio con el docente o un adulto es fundamental, ya que le permite construir significados y disfrutar de la lectura en conjunto. Es un proceso de aprendizaje colaborativo donde, poco a poco, va encontrando sentido a lo que dicen las palabras más allá de las imágenes.`,
        `Nombre ya logra comprender el sentido global de textos breves de manera guiada. Esto significa que, con nuestro apoyo y orientación, puede identificar de qué trata lo que lee, captando la idea principal. Es un avance significativo que nos muestra cómo Nombre está empezando a integrar la información escrita y a darle sentido por sí mismo/a, fortaleciendo su comprensión lectora paso a paso.`,
        `Nombre ha alcanzado la capacidad de realizar una lectura autónoma y comprender el sentido global de textos diversos. Esto le permite enfrentarse a diferentes materiales de lectura por cuenta propia, extrayendo ideas y disfrutando de la autonomía que brinda el saber leer. Es un logro excelente que abre las puertas a nuevos aprendizajes y le da mucha confianza para seguir explorando el mundo de los libros.`
      ],
      reconocimiento: [
        `Nombre está comenzando a identificar su propio nombre entre otras palabras. Este es un hito sumamente especial en su proceso, ya que su nombre es la primera palabra con significado personal y afectivo para él/ella. Desde este reconocimiento inicial, estamos trabajando para ampliar su capacidad de observar otras palabras y empezar a distinguir sus formas dentro del universo escrito.`,
        `Nombre ya reconoce su nombre propio y el de sus pares con mucha facilidad. Este avance demuestra un interés genuino por el mundo que lo/la rodea y por su grupo de pertenencia en la escuela. El hecho de identificar los nombres de sus compañeros no solo es un gran paso en su alfabetización, sino también un gesto muy valioso de integración y fortalecimiento de los vínculos afectivos en el aula.`,
        `Nombre ha comenzado a reconocer palabras de uso frecuente y frases cortas. Esto significa que ya identifica conceptos que ve habitualmente en clase o en su entorno cercano, lo cual le brinda mucha seguridad al leer. Este logro nos indica que está empezando a dar sentido a la lectura de manera más fluida, permitiéndole conectar lo que lee con situaciones de la vida diaria.`,
        `Nombre ya lee palabras y frases con sentido completo de forma autónoma. Es una alegría ver cómo ha ganado confianza para leer por su cuenta, logrando interpretar mensajes escritos y dándoles un significado real sin necesidad de ayuda. Este nivel de independencia es un gran motor para su curiosidad y para el disfrute de nuevos materiales de lectura.`
      ],
      serie_numerica: [
        `Nombre se encuentra en la etapa de realizar el conteo hasta 10, utilizando apoyo con material concreto. El uso de objetos tangibles (como bloques o fichas) es fundamental en este momento, ya que le permite visualizar las cantidades y darles sentido a los números. Acompañamos este proceso con mucha paciencia, fortaleciendo esta base que es la puerta de entrada para todas sus futuras nociones matemáticas.`,
        `Nombre ya logra realizar el conteo hasta 20 y reconoce números en contextos cotidianos. Es muy gratificante observar cómo identifica los números en situaciones reales de la vida diaria, lo que demuestra que está conectando la matemática con el mundo que lo/la rodea. Seguimos trabajando para consolidar este rango numérico, incorporando nuevos desafíos que despierten su curiosidad.`,
        `Nombre maneja series numéricas amplias y ya reconoce las familias numéricas. Este nivel de avance nos indica que ha comprendido la lógica de cómo se organizan y agrupan los números. Es un logro muy importante que le brinda una visión más clara del sistema numérico, permitiéndole moverse con mayor soltura al trabajar con cantidades más grandes y relaciones entre números.`,
        `Nombre domina series numéricas complejas con total autonomía. Su capacidad para trabajar con números de gran magnitud y entender su estructura de forma independiente es excelente. Celebramos este nivel de madurez matemática, ya que le proporciona una base muy sólida para seguir explorando operaciones y desafíos numéricos más complejos con gran confianza.`
      ],
      operaciones: [
        `Nombre es capaz de identificar cantidades en diversas situaciones, aunque aún no realiza operaciones matemáticas. Estamos en una etapa de exploración donde el foco está puesto en reconocer y comprender el significado de los números y su relación con las cantidades. Este es un paso previo muy importante sobre el cual continuaremos construyendo sus futuros aprendizajes matemáticos.`,
        `Nombre resuelve sumas y restas simples utilizando material didáctico. El uso de apoyos concretos es un recurso excelente que le permite visualizar y resolver las situaciones planteadas con mayor claridad. Es un avance muy significativo que demuestra cómo está empezando a comprender la lógica de las operaciones y a aplicarla de manera efectiva en el aula.`,
        `Nombre resuelve sumas y restas más complejas, requiriendo solo apoyo esporádico. Esto nos muestra una mayor seguridad y confianza en sus procesos matemáticos, ya que logra analizar y ejecutar cálculos con más autonomía. Es un momento muy valioso de su trayectoria, donde cada vez necesita menos orientación para llegar a resultados correctos y precisos.`,
        `Nombre resuelve problemas cotidianos mediante operaciones complejas de manera totalmente autónoma. Es una gran satisfacción ver cómo ha consolidado sus habilidades matemáticas, utilizándolas con éxito para resolver situaciones reales de su día a día. Celebramos esta autonomía alcanzada, que le permite enfrentar desafíos matemáticos con seguridad, pensamiento crítico y eficacia.`
      ],
      figuras: [
        `Nombre identifica figuras geométricas básicas, aunque aún requiere nuestra mediación para poder clasificarlas. Este es un proceso de aprendizaje muy valioso, donde estamos entrenando la mirada para reconocer atributos y diferencias. Acompañamos este descubrimiento paso a paso, brindándole las herramientas necesarias para que pueda organizar la información visual de manera cada vez más precisa.`,
        `Nombre ya logra clasificar elementos considerando criterios como la forma, el tamaño o el color, contando siempre con nuestra supervisión. Este es un avance muy importante en su pensamiento lógico, ya que demuestra que está empezando a organizar el mundo que lo/la rodea a través de atributos específicos. Seguimos trabajando para fortalecer esta habilidad, fomentando que pueda realizar estas tareas con mayor seguridad cada vez.`,
        `Nombre se destaca resolviendo problemas simples de lógica y comparación. Es un gusto observar cómo analiza las situaciones, pone en juego diferentes estrategias y llega a conclusiones acertadas. Este nivel de pensamiento nos muestra que está integrando sus conocimientos previos de manera efectiva para enfrentar nuevos retos, avanzando con mucha firmeza en su razonamiento lógico.`,
        `Nombre resuelve problemas de alta complejidad con total autonomía. Su capacidad para abordar desafíos, identificar las variables necesarias y encontrar soluciones de manera independiente es excelente. Celebramos esta madurez cognitiva alcanzada, que le permite enfrentar situaciones problemáticas con pensamiento crítico, seguridad y gran eficacia.`
      ],
      rutinas: [
        `Nombre requiere asistencia total y un acompañamiento cercano durante toda su jornada escolar para realizar las rutinas de higiene y cuidado personal. Nuestra prioridad es construir un vínculo de confianza y seguridad, brindándole el sostén necesario en cada momento. A través de este contacto permanente, vamos paso a paso, acompañando su proceso de adaptación y fortaleciendo su bienestar dentro del ámbito escolar.`,
        `Nombre logra realizar sus rutinas básicas contando con supervisión constante y un apoyo puntual de nuestra parte. Este avance nos muestra cómo empieza a reconocer los pasos necesarios para su cuidado personal, sintiéndose más seguro/a en sus acciones. Seguimos a su lado, brindándole la guía precisa para que pueda ganar confianza y familiarizarse cada vez más con el hábito de cuidar de sí mismo/a.`,
        `Nombre realiza sus rutinas diarias con una supervisión mínima y esporádica. Es un avance muy positivo que demuestra su creciente capacidad de organización y su sentido de responsabilidad. Estamos muy satisfechos con el camino recorrido, ya que Nombre se muestra cada vez más seguro/a y competente al gestionar sus tareas de higiene y cuidado personal de manera independiente.`,
        `Nombre se desenvuelve con total autonomía en sus rutinas escolares y en su cuidado personal. Es una gran alegría ver cómo ha consolidado estos hábitos, demostrando madurez, seguridad y una clara capacidad para gestionar sus necesidades de forma independiente. Celebramos este logro tan significativo, que le permite participar de la vida escolar con confianza y comodidad.`
      ],
      organizacion: [
        `Nombre precisa que un adulto organice sus materiales de trabajo en todo momento. Estamos trabajando juntos para que, poco a poco, empiece a reconocer sus útiles y el espacio de trabajo. Este acompañamiento cercano es esencial para que pueda sentirse seguro/a y tranquilo/a al iniciar cada propuesta, asegurándonos de que cuente con todo lo necesario para aprender.`,
        `Nombre logra organizar sus materiales siempre que cuenta con el recordatorio del docente. Este es un avance muy positivo: significa que está empezando a integrar la importancia de tener sus elementos listos para trabajar. Es un proceso de aprendizaje donde, mediante estas pequeñas guías, estamos fortaleciendo su responsabilidad y su capacidad de prepararse para el momento de aprender.`,
        `Nombre mantiene sus materiales organizados de forma independiente durante la jornada. Es muy gratificante observar cómo ha adquirido este hábito, demostrando mayor compromiso y orden en su espacio de trabajo. Esta autonomía en el cuidado de sus pertenencias refleja cuánto ha crecido su seguridad y su capacidad de gestionar sus propias herramientas escolares.`,
        `Nombre demuestra una gran madurez al anticipar y organizar todos los materiales necesarios antes de comenzar cada actividad. Es un logro excelente que nos muestra su gran sentido de la responsabilidad y su capacidad de planificación. Celebramos esta habilidad, ya que le permite iniciar cada propuesta con total confianza, aprovechando al máximo sus tiempos de aprendizaje.`
      ],
      pedido_ayuda: [
        `Nombre suele bloquearse cuando se enfrenta a una dificultad, quedando a la espera de que intervengamos para poder continuar. En estos momentos, nuestra prioridad es acompañarlo/a con suavidad, ayudándolo/a a retomar la confianza y a descubrir que, aunque los desafíos parezcan grandes, estamos aquí para guiarlo/a paso a paso. Estamos trabajando en fortalecer su seguridad emocional para que, poco a poco, se anime a explorar diferentes caminos ante las dudas.`,
        `Nombre ha aprendido a solicitar ayuda cuando lo necesita, apoyándose en nuestras sugerencias o en la mediación docente. Es un avance muy valioso, ya que nos muestra que está empezando a reconocer cuándo una tarea le resulta desafiante y busca un "puente" para poder resolverla. Seguimos acompañando este proceso, fomentando que se sienta cada vez más cómodo/a expresando sus inquietudes.`,
        `Nombre logra identificar claramente cuándo necesita apoyo y tiene la iniciativa de solicitar ayuda ante la duda. Esta capacidad de reconocer sus propios límites y expresarlos es un gran indicador de madurez. Valoramos mucho esta actitud, ya que demuestra que Nombre se siente seguro/a en el aula y confía en el intercambio pedagógico como una herramienta fundamental para su aprendizaje.`,
        `Nombre demuestra una actitud muy proactiva: ante un obstáculo, intenta buscar sus propias soluciones antes de pedir ayuda. Es un logro excelente que refleja una gran autonomía y confianza en sus capacidades. Celebramos esta iniciativa, ya que nos muestra que Nombre está desarrollando su pensamiento crítico y la perseverancia necesaria para enfrentar y superar los desafíos escolares con mucha seguridad.`
      ],
      vinculo_pares: [
        `Nombre se encuentra en una etapa donde su juego es principalmente paralelo o solitario, ya que está descubriendo su propio espacio y sus preferencias. Es un proceso natural en su desarrollo y lo acompañamos respetando sus tiempos, facilitando encuentros graduales con sus pares para que, a su propio ritmo, se sienta cómodo/a integrándose a la dinámica grupal.`,
        `Nombre comienza a interactuar con sus compañeros, especialmente cuando la propuesta es guiada por un docente. Estos momentos de intercambio son muy valiosos para fomentar el trabajo en equipo y permitir que, de a poco, vaya construyendo vínculos más fluidos y naturales con el resto del grupo.`,
        `Nombre demuestra una gran apertura al integrarse de manera espontánea a los juegos cooperativos con sus pares. Es un gusto observar cómo participa con entusiasmo, compartiendo el espacio y las ideas, lo que fortalece significativamente sus lazos afectivos y su sentido de pertenencia dentro del grupo.`,
        `Nombre se destaca por su capacidad para proponer actividades y motivar a sus compañeros a participar. Esta actitud proactiva es una fortaleza que enriquece la dinámica grupal y demuestra la confianza y seguridad que tiene para organizar, compartir y disfrutar de los juegos junto a otros.`
      ],
      vinculo_adulto: [
        `Nombre requiere un acompañamiento cercano para iniciar cada una de sus tareas, encontrando en el adulto el sostén y la guía necesaria para dar sus primeros pasos. Estamos trabajando con mucha paciencia para fortalecer su seguridad personal, buscando que, paulatinamente, gane la confianza suficiente para realizar sus primeras acciones de manera más independiente.`,
        `Nombre busca el apoyo y la mirada constante de sus docentes para validar sus producciones y sentirse seguro/a en sus acciones. Este vínculo de confianza es nuestra base para acompañar su proceso, reforzando continuamente sus logros para que pueda sentirse cada vez más capaz y confiado/a en sus propias posibilidades.`,
        `Nombre ha logrado una buena autonomía en sus actividades diarias, recurriendo al docente principalmente cuando surgen dudas específicas o ante situaciones nuevas que le plantean un desafío. Este comportamiento es un indicador muy positivo de su capacidad para resolver por sí mismo/a y de la confianza que tiene al actuar en el entorno escolar.`,
        `Nombre ha logrado construir un vínculo muy sólido y saludable con sus docentes; nos reconoce como sus referentes, pero actúa con total seguridad y autonomía. Esta relación de confianza le permite sentirse apoyado/a sin depender del adulto, lo cual es fundamental para favorecer su crecimiento personal y su independencia escolar.`
      ],
      emocional: [
        `Nombre aún está aprendiendo a canalizar sus emociones y, ante situaciones de malestar, suele reaccionar con impulsividad o conductas físicas. Nuestro rol es brindarle un espacio de calma y contención, ayudándolo/a a identificar qué siente y a buscar formas más tranquilas de expresarlo. Estamos trabajando en fortalecer su seguridad emocional para que, poco a poco, encuentre mejores herramientas para comunicarse.`,
        `Nombre ha logrado dar un paso importante hacia la comunicación verbal de sus emociones, aunque todavía requiere de nuestra mediación para lograr expresarlas cuando siente malestar. Lo/la acompañamos en este proceso, ayudándolo/a a poner en palabras lo que le sucede para que pueda sentirse comprendido/a y aprender a gestionar sus sentimientos de manera más pausada.`,
        `Nombre ha desarrollado una muy buena capacidad para expresar sus sentimientos de forma verbal y con total claridad. Es un logro valioso que le permite comunicar qué necesita, cómo se siente y compartir su mundo interior con los demás. Esta habilidad no solo facilita su convivencia diaria, sino que también es clave para el fortalecimiento de sus vínculos afectivos.`,
        `Nombre demuestra una gran madurez emocional al poseer capacidad de autorregulación, gestionando sus emociones de manera autónoma y constructiva. Es muy grato ver cómo identifica sus estados de ánimo y sabe responder ante ellos con serenidad. Celebramos esta autonomía emocional, que le permite enfrentar las situaciones cotidianas con equilibrio, confianza y mucha seguridad en sí mismo/a.`
      ],
      pautas: [
        `Nombre se encuentra en una etapa de exploración en cuanto a la convivencia escolar, donde aún le resulta difícil seguir las pautas grupales o respetar los turnos de habla. Estamos trabajando diariamente en la construcción de estos hábitos, brindándole un acompañamiento constante para que, poco a poco, logre registrar la importancia de escuchar al otro y de esperar su momento, favoreciendo así una mejor integración con sus compañeros.`,
        `Nombre comienza a incorporar las normas de convivencia y el respeto por los turnos, siempre que contamos con el apoyo de recordatorios frecuentes. Este avance es muy positivo, ya que nos muestra que está empezando a registrar el funcionamiento del grupo. Seguimos acompañando este proceso con paciencia, reforzando la importancia de escuchar y participar de manera ordenada en las propuestas compartidas.`,
        `Nombre ha logrado integrar las pautas de convivencia y el respeto por los turnos de habla con una mínima intervención de nuestra parte. Este nivel de cumplimiento demuestra que Nombre valora el espacio compartido y comprende las normas necesarias para una buena interacción. Es un avance significativo que refleja mayor madurez y una actitud muy positiva hacia el trabajo grupal.`,
        `Nombre demuestra una gran madurez al respetar los turnos de habla y los acuerdos de convivencia de manera totalmente autónoma. Es muy gratificante ver cómo se integra a las actividades grupales considerando las necesidades de los demás y participando de forma ordenada. Celebramos esta autonomía, que le permite disfrutar plenamente de los intercambios y fortalecer vínculos de respeto con sus pares.`
      ],
      escucha: [
        `Nombre todavía se encuentra en un proceso de registrar el entorno grupal, por lo que suele mostrarse desconectado de las consignas que se dan al conjunto. Nuestro objetivo es trabajar en captar su interés a través de propuestas significativas y un acompañamiento cercano que lo/la ayude, paso a paso, a empezar a reconocer y seguir los mensajes que compartimos en el aula.`,
        `Nombre logra participar de la escucha siempre que el docente se acerca y lo/la interpela de manera individual. Este es un punto de partida muy importante, ya que demuestra que Nombre responde al contacto personal directo. Seguimos trabajando para tender puentes que le permitan, poco a poco, trasladar esa atención del cara a cara hacia las propuestas que se plantean para todo el grupo.`,
        `Nombre ya muestra una mayor disposición para la escucha activa, participando con atención en relatos y propuestas que se presentan frente a todo el grupo. Es un avance muy significativo que nos permite compartir momentos de aprendizaje colectivo, donde Nombre demuestra interés y capacidad para seguir el hilo de lo que estamos trabajando juntos.`,
        `Nombre se muestra atento/a y demuestra una gran capacidad para comprender y responder correctamente a las consignas que se dan al grupo. Esta escucha activa es una herramienta fundamental que facilita su proceso de aprendizaje y le permite integrarse con total seguridad a cada dinámica escolar, demostrando su compromiso y buen registro de la información.`
      ],
      conflictos: [
        `Nombre aún está desarrollando estrategias para resolver situaciones de desacuerdo y, ante el conflicto, suele reaccionar de manera impulsiva o con conductas físicas. Nuestra labor es brindarle un espacio de calma, acompañándolo/a a comprender lo sucedido y a encontrar modos más constructivos de expresar su enojo o frustración. Estamos trabajando para que, poco a poco, pueda incorporar otras formas de reacción basadas en la palabra y el respeto por el otro.`,
        `Nombre es capaz de expresar su malestar cuando surge un conflicto, aunque todavía necesita de nuestra mediación directa para encontrar una solución. Acompañamos este proceso de aprendizaje, ayudándolo/a a poner en palabras lo que siente y a escuchar al compañero/a, para que juntos logremos alcanzar un acuerdo satisfactorio. Es un paso importante hacia una convivencia más armoniosa.`,
        `Nombre ha logrado avanzar significativamente en la resolución de conflictos, utilizando el diálogo como herramienta principal y requiriendo solo una intervención mínima de nuestra parte. Valoramos esta actitud, ya que demuestra que Nombre comienza a comprender la importancia de escuchar, explicar su punto de vista y acordar soluciones, fortaleciendo así su autonomía y sus habilidades sociales.`,
        `Nombre demuestra una gran madurez al resolver sus conflictos de manera autónoma, siendo capaz de escuchar, negociar y aceptar acuerdos de paz de forma natural. Es un logro excelente que refleja su compromiso con la convivencia y su capacidad para gestionar las diferencias con respeto y empatía. Celebramos esta habilidad, que le permite mantener relaciones positivas y equilibradas con sus pares.`
      ],
      desplazamiento: [
        `Nombre requiere nuestra guía física permanente para transitar los distintos espacios de la escuela. En esta etapa, el acompañamiento cercano es fundamental para brindarle seguridad y confianza en sus desplazamientos, permitiéndole descubrir y habitar el entorno escolar con el sostén necesario en cada paso.`,
        `Nombre ya logra reconocer los diferentes espacios de la institución, aunque aún precisa de nuestros recordatorios constantes para desplazarse de un lugar a otro. Este proceso de aprendizaje es muy valioso, ya que, mediante nuestra guía, estamos ayudándolo/a a orientarse mejor y a ganar progresivamente mayor familiaridad con el recorrido de su escuela.`,
        `Nombre se desplaza por la escuela con mayor seguridad, requiriendo solo recordatorios esporádicos para orientarse o cambiar de sector. Este avance demuestra que ha logrado una mejor apropiación del espacio institucional, lo cual le otorga una mayor independencia y confianza al moverse dentro de la escuela.`,
        `Nombre se desplaza con total autonomía por toda la institución, demostrando un claro sentido de pertenencia y comodidad en cada espacio. Es muy gratificante ver cómo ha hecho propia la escuela, circulando con seguridad y autonomía, lo que refleja su gran madurez y su total integración a la dinámica escolar.`
      ],
      juego: [
        `Nombre se encuentra en una etapa de juego exploratorio y sensorial, donde su manera de conocer el mundo es a través de las sensaciones y el contacto directo con los objetos. Es un proceso de descubrimiento fascinante que respetamos y alentamos, proporcionándole materiales variados que despierten su curiosidad y estimulen sus sentidos, sentando las bases fundamentales para sus aprendizajes futuros.`,
        `Nombre ha comenzado a desarrollar el juego simbólico, utilizando su imaginación para transformar los objetos y crear sus propias historias. Esta etapa es clave en su desarrollo cognitivo, ya que le permite ensayar roles, expresar ideas y comprender el mundo desde nuevas perspectivas. Nos encanta ver cómo crea escenarios donde lo cotidiano se convierte en una oportunidad para la fantasía y el aprendizaje.`,
        `Nombre disfruta participando en juegos reglados simples, logrando respetar los turnos y las consignas básicas del juego. Este avance es fundamental, ya que le permite integrarse de manera coordinada con sus compañeros y comprender la importancia de las pautas compartidas. Es un paso muy valioso hacia la construcción de una convivencia armoniosa y una mayor participación grupal.`,
        `Nombre demuestra gran iniciativa y capacidad al proponer y participar activamente en juegos reglados que requieren mayor complejidad y creatividad. Su entusiasmo por organizar las dinámicas, establecer acuerdos y poner en juego sus ideas es excelente. Celebramos esta habilidad, que refleja su seguridad, su pensamiento estratégico y su excelente capacidad para disfrutar y crear junto a sus pares.`
      ],
      ciencias: [
        `Nombre comienza a mostrar curiosidad frente a diversos estímulos del entorno, aunque todavía le resulta difícil sostener la observación por mucho tiempo. Estamos trabajando en acercarle propuestas breves y llamativas que capturen su interés, brindándole el acompañamiento necesario para que, poco a poco, pueda extender sus tiempos de atención y exploración hacia todo lo que lo/la rodea.`,
        `Nombre demuestra un interés activo por el entorno, indagando y explorando aquello que le genera curiosidad con nuestra guía y mediación. A través de las preguntas que planteamos juntos, Nombre aprende a observar con mayor detenimiento, formulando sus propias hipótesis y descubriendo nuevas facetas del mundo natural y social que exploramos en la escuela.`,
        `Nombre manifiesta una curiosidad constante que lo/la lleva a investigar diferentes fenómenos y a buscar activamente sus propias explicaciones. Es muy valioso ver cómo se involucra en las propuestas de indagación, formulando interrogantes y trabajando junto a sus pares para encontrar respuestas, demostrando un compromiso creciente con su propio proceso de aprendizaje.`,
        `Nombre demuestra una gran madurez investigando de manera independiente, planteando sus propias preguntas y proponiendo explicaciones originales sobre los fenómenos que observa. Celebramos esta autonomía y su capacidad de pensamiento crítico, que lo/la convierten en un/a verdadero/a explorador/a del mundo, capaz de construir conocimiento con seguridad y gran creatividad.`
      ],
      cuidado: [
        `Nombre se encuentra en una etapa de descubrimiento, donde todavía está aprendiendo a registrar el entorno y las pequeñas pautas de cuidado que nos permiten proteger el espacio y la vida que nos rodea. Es un proceso que acompañamos con mucha paciencia, brindándole nuestro apoyo para que, paso a paso, empiece a notar la importancia de cuidar el lugar que habitamos juntos.`,
        `Nombre ya comienza a identificar las normas básicas de cuidado, aunque requiere de nuestra supervisión constante para ponerlas en práctica. Este avance es muy positivo, ya que nos muestra que está empezando a comprender cómo sus acciones impactan en los seres vivos y en el ambiente. Estamos aquí para guiarlo/a en este aprendizaje, reforzando la importancia de estas pequeñas acciones responsables.`,
        `Nombre demuestra un gran compromiso, logrando identificar y aplicar las normas de cuidado con una mínima intervención de nuestra parte. Este nivel de conciencia refleja su crecimiento y su interés por preservar el medio ambiente y respetar a los demás seres vivos, demostrando mayor seguridad y autonomía en el cumplimiento de estos valores fundamentales.`,
        `Nombre se destaca por ser totalmente autónomo en el cuidado del medio ambiente y de los seres vivos. Es un orgullo ver cómo valora la naturaleza, actuando siempre con responsabilidad y respeto sin necesidad de recordatorios. Esta capacidad es un logro maravilloso que demuestra su gran sentido de la ética y su compromiso personal con el bienestar del planeta.`
      ],
      comunicacion: [
        `Nombre se comunica de manera reactiva, utilizando gestos básicos para expresar sus necesidades más inmediatas. Es un modo de comunicación esencial que nos permite conectar y comprender sus deseos en el momento presente. Estamos trabajando para acompañarlo/a en la exploración de nuevas formas de expresión que le brinden mayor confianza para manifestar lo que siente y necesita.`,
        `Nombre emplea una comunicación funcional, utilizando señas, pictogramas o palabras simples con nuestro apoyo constante. Este es un puente fundamental para que pueda interactuar con los demás y participar de las actividades diarias. Celebramos cada uno de sus intentos y logros comunicativos, ya que son pasos muy importantes para ganar independencia y seguridad al expresarse.`,
        `Nombre ha desarrollado una comunicación activa, logrando expresar sus deseos y necesidades a través de frases breves. Es un avance muy significativo que facilita su intercambio con pares y adultos, permitiéndole ser escuchado/a y comprendido/a con mayor claridad. Valoramos mucho este progreso, que le otorga un rol mucho más participativo y protagonista en su vida escolar.`,
        `Nombre posee una comunicación compleja que le permite relatar eventos con detalle y sostener conversaciones con gran fluidez. Es un gusto escucharlo/a compartir sus ideas, vivencias y opiniones, demostrando una gran capacidad para organizar su pensamiento y transmitir mensajes con éxito. Esta habilidad es una fortaleza excelente que le abre todas las puertas para seguir construyendo aprendizajes y vínculos profundos.`
      ],
      funciones: [
        `Nombre presenta una atención muy dispersa, por lo que requiere de estímulos constantes y variados para poder focalizarse en una actividad. Estamos trabajando con propuestas dinámicas y un acompañamiento muy cercano, buscando captar su interés a través de estímulos que le resulten significativos para que, paso a paso, pueda empezar a registrar y sostener su mirada en las tareas que realizamos.`,
        `Nombre mantiene una atención breve, siendo capaz de seguir instrucciones sencillas de un solo paso siempre que contamos con nuestra mediación. Este es un avance muy importante, ya que demuestra que está empezando a comprender y ejecutar lo que se le solicita. Seguimos trabajando en fortalecer esta capacidad, alentándolo/a para que, con nuestro apoyo, pueda conectar cada vez mejor con las consignas que se le presentan.`,
        `Nombre ha logrado desarrollar una mayor atención sostenida en tareas cortas y ya puede seguir instrucciones que implican dos pasos. Este nivel de avance nos muestra que está integrando mejor la información y ganando mayor autonomía al resolver lo que se le pide. Es un proceso muy positivo que le otorga más seguridad y le permite participar con éxito de las actividades diarias.`,
        `Nombre demuestra una capacidad de atención focalizada excelente, logrando seguir secuencias complejas de manera totalmente autónoma. Es muy gratificante ver cómo organiza sus acciones para completar consignas con varios pasos sin necesidad de intervención externa. Celebramos esta habilidad, que refleja su madurez cognitiva y su gran capacidad para gestionar sus propios tiempos de aprendizaje.`
      ],
      flexibilidad: [
        `Nombre se encuentra en un proceso de construcción de su seguridad emocional y, por el momento, experimenta mucha dificultad ante los cambios, pudiendo desregularse frente a lo imprevisto. Para él/ella, la previsibilidad es fundamental, por lo que trabajamos día a día brindándole calma, contención y un entorno estable que le permita sentirse seguro/a, acompañándolo/a con mucha paciencia en cada transición.`,
        `Nombre ha logrado grandes avances en su flexibilidad, siendo capaz de aceptar cambios en la rutina siempre que los anticipamos previamente mediante apoyos visuales. Estas herramientas de organización son excelentes para brindarle seguridad, permitiéndole entender qué sucederá y, de este modo, transitar las novedades con mucha más tranquilidad y confianza.`,
        `Nombre demuestra una buena capacidad de adaptación, logrando ajustar su conducta ante cambios moderados con una mínima intervención de nuestra parte. Este es un indicador muy positivo de su madurez, ya que nos muestra que empieza a sentirse más cómodo/a con la variabilidad del día a día, confiando en sus propios recursos para afrontar lo nuevo.`,
        `Nombre posee una alta flexibilidad cognitiva, logrando ajustarse a cambios imprevistos de manera totalmente autónoma. Esta capacidad de adaptarse a lo nuevo con naturalidad, manteniendo el equilibrio y la buena disposición, es una fortaleza excelente que le permite navegar las situaciones cotidianas con mucha soltura, seguridad y una gran actitud frente a los desafíos.`
      ],
      sensorial: [
        `Nombre presenta una respuesta muy sensible ante ciertos estímulos ambientales, como ruidos intensos o luces fuertes, lo que puede provocarle momentos de desregulación. Nuestro compromiso es garantizar un entorno que lo/la cuide, brindándole el acompañamiento necesario para que pueda sentirse seguro/a y tranquilo/a, siempre atentos a su bienestar emocional y físico.`,
        `Nombre tiene una sensibilidad alta a los estímulos del entorno y, en ocasiones, necesita recurrir a espacios más tranquilos para autorregularse y volver a la calma. Estamos atentos a sus señales para ofrecerle estos momentos de pausa, ayudándolo/a a encontrar el equilibrio necesario para que pueda retomar sus actividades sintiéndose más cómodo/a y seguro/a.`,
        `Nombre logra registrar los estímulos del ambiente (como sonidos o movimientos de otros compañeros) de manera natural, sin que estos interfieran de forma significativa en su concentración o en el desarrollo de sus tareas. Este es un punto muy positivo, ya que le permite participar de la dinámica grupal con estabilidad y enfocarse con éxito en sus propuestas de aprendizaje.`,
        `Nombre demuestra una alta tolerancia a los estímulos sensoriales, logrando autorregularse adecuadamente incluso en entornos escolares más activos. Esta capacidad de mantenerse enfocado/a y tranquilo/a, conviviendo con la variedad de sonidos y movimientos propios del aula, le otorga una gran libertad para disfrutar plenamente de todas las actividades y propuestas grupales.`
      ],
      intereses: [
        `Nombre se encuentra en un momento donde su interés está centrado en objetos muy específicos, mostrando una preferencia particular por ellos. Estamos trabajando para acompañarlo/a, explorando gradualmente pequeñas variantes en sus juegos y actividades, buscando expandir poco a poco su curiosidad hacia nuevas propuestas que mantengan su interés y lo/la inviten a descubrir otras posibilidades.`,
        `Nombre tiene intereses muy claros que conocemos y aprovechamos como valiosos motivadores para sus aprendizajes. Al integrar estos temas que tanto le gustan en las tareas cotidianas, logramos que se sienta más entusiasmado/a y predispuesto/a a participar, convirtiendo cada actividad en una oportunidad significativa que conecta con su mundo interior.`,
        `Nombre ha logrado integrar sus pasiones como un puente para aprender y conectar con los demás. Es muy enriquecedor ver cómo comparte lo que le gusta con sus compañeros, utilizando estas actividades como una forma de socializar y fortalecer sus vínculos. Su entusiasmo se contagia y le permite disfrutar del trabajo grupal a través de sus propios intereses.`,
        `Nombre demuestra una gran capacidad para transferir sus habilidades y fortalezas a diversos contextos de la escuela. Es excelente observar cómo utiliza lo que mejor sabe hacer para enfrentar nuevos desafíos en diferentes áreas, demostrando gran versatilidad, confianza en sí mismo/a y una proactividad que enriquece todo su proceso escolar.`
      ],
      apoyos: [
        `Nombre requiere en esta etapa apoyos físicos y contacto directo constante para realizar sus actividades. Este sostén cuerpo a cuerpo es fundamental para brindarle la seguridad necesaria mientras explora el entorno y comienza a realizar sus primeros aprendizajes. Estamos presentes en cada momento, ofreciéndole la contención necesaria para que se sienta acompañado/a y seguro/a en su hacer diario.`,
        `Nombre se beneficia enormemente del uso de agendas visuales y soportes concretos que le brindamos de manera permanente. Estos recursos funcionan como un "mapa" que le otorga previsibilidad, ayudándolo/a a organizar su tiempo y sus acciones dentro del aula. Seguimos trabajando con estos apoyos para fortalecer su autonomía, permitiéndole entender mejor el desarrollo de la jornada escolar.`,
        `Nombre demuestra una buena autonomía en sus tareas habituales, recurriendo al uso de apoyos puntuales únicamente cuando se enfrenta a actividades nuevas o de mayor complejidad. Esta capacidad de solicitar o aceptar una guía específica en el momento justo es un gran indicador de su madurez, ya que le permite avanzar con confianza en desafíos que requieren un poquito más de esfuerzo.`,
        `Nombre ha consolidado una excelente autonomía en el aula, requiriendo apoyos mínimos y solo en instancias de organización muy avanzada. Esta capacidad de gestionar sus materiales, tiempos y propuestas de manera independiente refleja su gran crecimiento y seguridad personal. Es un logro muy importante que lo/la posiciona con mucha firmeza frente a sus futuros desafíos escolares.`
      ]
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

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in relative">
      
      {/* MAGIA CSS PARA IMPRESIÓN */}
      <style type="text/css">
        {`
          @media print {
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              margin: 1.5cm;
              size: A4 portrait;
            }
          }
        `}
      </style>

      {/* ------------------------------------------------------------- */}
      {/* VISTA PRINCIPAL (Oculta al imprimir) */}
      {/* ------------------------------------------------------------- */}
      <div className={`${stage === 'main' ? 'block' : 'hidden'} print:hidden`}>
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 rounded-[40px] shadow-xl text-white mb-8 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><BookOpen size={28} /> Gestión de Informes</h2>
            <p className="text-violet-100 text-sm">Mostrando: {filteredStudents.length} alumnos.</p>
          </div>
          
          <div className="mt-4 md:mt-0 bg-white/10 p-2 rounded-2xl border border-white/20">
             <label className="text-xs font-bold uppercase tracking-widest text-violet-200 block mb-1 px-1">Período del Informe:</label>
             <select 
               className="bg-white text-violet-900 font-black p-3 rounded-xl outline-none" 
               value={periodoInforme} 
               onChange={e => setPeriodoInforme(e.target.value)}
             >
                <option value="Inicial" disabled>Informe Inicial 2026 (Cerrado)</option>
                <option value="Medio">Informe Medio 2026</option>
                <option value="Final" disabled>Informe Final 2026 (Próximamente)</option>
             </select>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex gap-2 p-2 bg-white rounded-2xl border">
            {['pedagogico', 'laboral'].map(t => (
              <button key={t} onClick={() => setTipoInforme(t)} className={`flex-1 p-3 rounded-xl font-black capitalize ${tipoInforme === t ? 'bg-violet-600 text-white' : 'bg-gray-100'}`}>{t}</button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
             <input className="p-4 rounded-2xl border bg-white text-sm" placeholder="Buscar alumno..." onChange={e => setSearchTerm(e.target.value)} />
             
             <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={turnoFiltro} onChange={e => {setTurnoFiltro(e.target.value); setNivelFiltro('Todos'); setGrupoFiltro('Todos');}}>
                <option value="Todos">Turno: Todos</option>
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
             </select>

             {turnoFiltro !== 'Todos' && (
                <select className="p-4 rounded-2xl border bg-white text-sm font-bold" value={nivelFiltro} onChange={e => {setNivelFiltro(e.target.value); setGrupoFiltro('Todos');}}>
                    <option value="Todos">Nivel: Todos</option>
                    {['Inicial', '1° Ciclo', '2° Ciclo', 'CFI'].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
             )}

             {nivelFiltro !== 'Todos' && (
                <select className="p-4 rounded-2xl border bg-white text-sm font-bold w-full" value={grupoFiltro} onChange={e => setGrupoFiltro(e.target.value)}>
                    <option value="Todos">Grupo: Todos</option>
                    {students
                      .filter(s => s.level && s.level.toUpperCase() === nivelFiltro.toUpperCase())
                      .flatMap(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean))
                      .filter((v, i, a) => a.indexOf(v) === i)
                      .filter(g => !(nivelFiltro.toUpperCase() === '1° CICLO' && g.toUpperCase().includes('PRE TALLER')))
                      .map(g => <option key={g} value={g}>{g}</option>)}
                </select>
             )}
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {filteredStudents.map(s => {
              const report = grupoFiltro === 'Todos' ? null : savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro && r.periodo === periodoInforme);
              return (
                <div key={`${s.id}-${grupoFiltro}`} className="p-5 flex justify-between items-center hover:bg-violet-50/50">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.level} | {report ? `Cargado (${periodoInforme})` : 'Pendiente'}</p>
                  </div>
                  {grupoFiltro !== 'Todos' && (
                    <button onClick={() => handleEdit(s, report)} className={`p-2 rounded-lg ${report ? 'bg-blue-50 text-blue-600' : 'bg-violet-600 text-white'}`}>
                      {report ? <Edit3 size={16}/> : <Plus size={16}/>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* INTERFAZ DE EDICIÓN EN PANTALLA (Oculta al imprimir) */}
      {/* ------------------------------------------------------------- */}
      {stage === 'form' && (
        <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-6 print:hidden animate-in fade-in">
          
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setStage('main')} className="bg-gray-100 p-3 rounded-full hover:bg-gray-200">
              <X size={20}/>
            </button>
            <button onClick={triggerPrint} className="flex items-center gap-2 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 py-2 px-5 rounded-xl font-bold transition-all">
              <Printer size={18} /> Imprimir Documento Final
            </button>
          </div>
          
          <div className="bg-violet-50 p-6 rounded-3xl mb-6 border border-violet-100">
             <h3 className="font-black text-2xl text-violet-900">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
             <p className="text-sm font-bold text-violet-600 uppercase mb-4">GRUPO: {grupoFiltro} | INFORME: {tipoInforme} {periodoInforme}</p>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-[10px] font-black uppercase text-violet-800">Docente a cargo</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={docentePrint} onChange={e => setDocentePrint(e.target.value)} placeholder="Ej. Alejandra..." />
               </div>
               <div>
                  <label className="text-[10px] font-black uppercase text-violet-800">Auxiliar / Preceptora</label>
                  <input type="text" className="w-full p-3 rounded-xl bg-white border border-violet-200 text-sm font-bold text-gray-700" value={preceptoraPrint} onChange={e => setPreceptoraPrint(e.target.value)} placeholder="Ej. Andrea..." />
               </div>
             </div>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-4">
            {indicadoresActuales.map(c => (
              <div key={c.id} className="space-y-2 mb-4 p-4 bg-gray-50 rounded-2xl">
                <label className="text-xs font-black uppercase text-gray-700">{c.label}</label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {c.options.map(opt => {
                    const isSelected = answers[c.id] === opt;
                    return (
                      <button 
                        key={opt} 
                        onClick={() => setAnswers(p => ({...p, [c.id]: opt}))} 
                        className={`p-3 rounded-xl font-bold text-[10px] uppercase border-2 text-left transition-all
                          ${isSelected ? 'bg-violet-600 text-white border-violet-700' : 'bg-white border-gray-200 hover:border-violet-300'}
                        `}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>

                <input
                  type="text"
                  placeholder="O escribí una observación personalizada para este indicador..."
                  className={`w-full p-3 mt-3 rounded-xl text-xs font-medium border-2 transition-all outline-none
                    ${answers[c.id] && !c.options.includes(answers[c.id]) 
                      ? 'bg-violet-100 border-violet-600 text-violet-900' 
                      : 'bg-white border-gray-200 focus:border-violet-400'}`}
                  value={!c.options.includes(answers[c.id]) ? (answers[c.id] || '') : ''}
                  onChange={(e) => setAnswers(p => ({...p, [c.id]: e.target.value}))}
                />
              </div>
            ))}
            
            <div className="mt-8 space-y-4">
              <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                <label className="text-xs font-black uppercase text-violet-800 block mb-2">Observaciones sobre los objetivos planteados para este primer cuatrimestre</label>
                <textarea 
                  className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" 
                  placeholder="Escriba aquí las observaciones..." 
                  value={obsCuatrimestre1} 
                  onChange={e => setObsCuatrimestre1(e.target.value)} 
                  rows={4}
                />
              </div>

              <div className="p-4 bg-violet-50 rounded-2xl border border-violet-100">
                <label className="text-xs font-black uppercase text-violet-800 block mb-2">Objetivos para el segundo cuatrimestre</label>
                <textarea 
                  className="w-full p-4 bg-white rounded-xl text-sm border border-violet-200" 
                  placeholder="Escriba aquí los objetivos..." 
                  value={obsCuatrimestre2} 
                  onChange={e => setObsCuatrimestre2(e.target.value)} 
                  rows={4}
                />
              </div>
            </div>
          </div>

          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 mt-6 bg-violet-800 hover:bg-violet-900 text-white font-black rounded-2xl">
            {isSaving ? 'Guardando...' : 'Guardar Informe'}
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* DOCUMENTO REAL DE IMPRESIÓN (Aislado gracias al UseEffect)    */}
      {/* ------------------------------------------------------------- */}
      {stage === 'form' && (
        <div id="informe-imprimir" className="hidden print:block w-full bg-white text-black font-sans pb-4">
          
          <div className="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
            <img src="/logo.png" alt="Logo Institucional" className="h-16 object-contain mb-3" />
            
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
              <p><strong className="font-black text-gray-900">Docente a cargo:</strong> <span className="text-gray-700">{docentePrint || '....................................'}</span></p>
              <p><strong className="font-black text-gray-900">Auxiliar/Preceptora:</strong> <span className="text-gray-700">{preceptoraPrint || '....................................'}</span></p>
              <p className="col-span-2"><strong className="font-black text-gray-900">Año de cursada:</strong> <span className="text-gray-700">2026</span></p>
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
                let textoDescriptivo = '';

                if (optionIndex !== -1) {
                  textoDescriptivo = formatearTextoImpresion(c.id, optionIndex, answer, selectedStudent?.firstName);
                } else {
                  textoDescriptivo = answer;
                }

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

          {obsCuatrimestre2 && (
            <div className="mt-4 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style={{ breakInside: 'avoid' }}>
              <h2 className="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Objetivos para el segundo cuatrimestre</h2>
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{obsCuatrimestre2}</p>
            </div>
          )}

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
      )}
    </div>
  );
}
