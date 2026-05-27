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
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [turnoFiltro, setTurnoFiltro] = useState('Todos');
  const [nivelFiltro, setNivelFiltro] = useState('Todos');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  
  const [students, setStudents] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  
  const [docentePrint, setDocentePrint] = useState('');
  const [preceptoraPrint, setPreceptoraPrint] = useState('');

  // --------------------------------------------------------------------------
  // LÓGICA DE AISLAMIENTO DE IMPRESIÓN (La magia para que no salgan los menúes)
  // --------------------------------------------------------------------------
  useEffect(() => {
    let printClone = null;
    const originalDisplays = new Map();

    const handleBeforePrint = () => {
      const printElement = document.getElementById('informe-imprimir');
      if (!printElement) return;

      // Clonamos el reporte
      printClone = printElement.cloneNode(true);
      printClone.classList.remove('hidden', 'print:block');
      printClone.style.display = 'block';
      printClone.id = 'informe-imprimir-clone';

      // Ocultamos TODO el resto de la aplicación
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'informe-imprimir-clone') {
          originalDisplays.set(child, child.style.display);
          child.style.display = 'none';
        }
      });

      // Pegamos el reporte solo y aislado en el body
      document.body.appendChild(printClone);
    };

    const handleAfterPrint = () => {
      // Destruimos el clon
      if (printClone && printClone.parentNode) {
        printClone.parentNode.removeChild(printClone);
      }
      // Restauramos la app
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

  // --------------------------------------------------------------------------

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
    setObservations(report?.observations || '');
    setDocentePrint(student.teacher || student.docente || '');
    setPreceptoraPrint(student.auxiliary || student.auxiliar || student.preceptora || '');
    setStage('form');
  };

  const handleSaveInforme = async () => {
    if (grupoFiltro === 'Todos') { alert("Por favor, seleccioná un grupo específico para guardar."); return; }
    setIsSaving(true);
    const idUnico = `${selectedStudent.id}_${tipoInforme}_${grupoFiltro}`; 
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', idUnico), {
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
      grupo: grupoFiltro,
      tipoInforme,
      answers,
      observations,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStage('main');
    setIsSaving(false);
  };

  const nivelActual = selectedStudent?.level || 'Inicial';
  const indicadoresActuales = CONFIG_INDICADORES[tipoInforme]?.[nivelActual] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || [];

 // Transformador inteligente de texto para la impresión
  const formatearTextoImpresion = (respuesta, firstNameRaw) => {
    if (!respuesta) return '';
    
    // Extraemos solo el primer nombre
    const primerNombre = firstNameRaw ? firstNameRaw.split(' ')[0] : 'El/la estudiante';

    // 1. Casos específicos de Lectoescritura
    if (respuesta.startsWith('Presilábico:')) return `${primerNombre} se encuentra en una etapa presilábica de la escritura, en donde explora la misma a través de dibujos o grafismos sin valor sonoro aún. Este es un primer acercamiento lúdico y de descubrimiento muy valioso hacia el mundo de la comunicación escrita.`;
    if (respuesta.startsWith('Silábico:')) return `${primerNombre} transita una etapa silábica de la escritura, donde comienza a asignar valor sonoro a las letras, mayormente vocales. Se observa un avance significativo en su comprensión de la relación fonema-grafema, vital para su proceso de alfabetización.`;
    if (respuesta.startsWith('Silábico-alfabético:')) return `${primerNombre} transita una etapa silábico-alfabética de transición, combinando sílabas completas con letras aisladas. Esto demuestra una consolidación progresiva en su discriminación fonológica, dando pasos firmes hacia la escritura convencional.`;
    if (respuesta.startsWith('Alfabético:')) return `${primerNombre} escribe de forma autónoma en una etapa alfabética, representando los fonemas con coherencia. Ha logrado plasmar sus ideas de manera clara, demostrando una excelente apropiación del sistema de escritura.`;

    // 2. Transformación dinámica para el resto
    let textoMinuscula = respuesta.charAt(0).toLowerCase() + respuesta.slice(1);
    
    // Limpiamos el punto final si lo tiene para que la concatenación no quede con doble punto
    if (textoMinuscula.endsWith('.')) {
      textoMinuscula = textoMinuscula.slice(0, -1);
    }

    // Armamos la primera parte de la oración hilada
    let oracionBase = '';
    if (respuesta.startsWith('Su ')) {
      oracionBase = `En este aspecto, el perfil de ${primerNombre} indica que ${textoMinuscula}`;
    } else if (respuesta.startsWith('Atención ') || respuesta.startsWith('Comunicación ') || respuesta.startsWith('Dependencia ') || respuesta.startsWith('Gran dificultad ') || respuesta.startsWith('Alta ')) {
      oracionBase = `En relación a su desempeño, ${primerNombre} presenta ${textoMinuscula}`;
    } else {
      oracionBase = `Se observa que ${primerNombre} ${textoMinuscula}`;
    }

    // 3. Ampliación pedagógica inteligente según la connotación de tu respuesta
    const respLower = respuesta.toLowerCase();
    let ampliacion = '';

    // Si el indicador habla de dificultades o falta de autonomía
    if (respLower.includes('no logra') || respLower.includes('gran dificultad') || respLower.includes('dependencia total') || respLower.includes('no respeta') || respLower.startsWith('solo ') || respLower.includes('desconectado') || respLower.includes('se bloquea')) {
      ampliacion = '. Desde el equipo continuaremos brindando las herramientas, los apoyos y el andamiaje necesario para acompañar sus propios tiempos y fomentar mayores niveles de autonomía.';
    } 
    // Si el indicador habla de que requiere supervisión o mediación
    else if (respLower.includes('requiere') || respLower.includes('precisa') || respLower.includes('con supervisión') || respLower.includes('con apoyo') || respLower.includes('mediación') || respLower.includes('ante malestar')) {
      ampliacion = '. Se continuará ofreciendo una guía cercana, contención y anticipación para seguir fortaleciendo progresivamente su seguridad y confianza en este proceso.';
    } 
    // Si el indicador habla de autonomía, proactividad o dominio complejo
    else if (respLower.includes('autónomo') || respLower.includes('autónomamente') || respLower.includes('total autonomía') || respLower.includes('proactivo') || respLower.includes('lidera') || respLower.includes('alta flexibilidad') || respLower.includes('complejas') || respLower.includes('fluidez')) {
      ampliacion = '. Su desempeño en este punto es sumamente destacable, mostrando una gran iniciativa personal que enriquece de forma muy positiva la dinámica de trabajo grupal.';
    } 
    // Desarrollo normal / en proceso / participación activa
    else {
      ampliacion = '. Este nivel de desarrollo refleja un avance muy positivo, producto de su esfuerzo sostenido y de las propuestas implementadas en el espacio escolar cotidiano.';
    }

    return oracionBase + ampliacion;
  };
  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in relative">
      
      {/* MAGIA CSS PARA ASEGURAR COLORES EN IMPRESIÓN */}
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
      {/* VISTA PRINCIPAL */}
      {/* ------------------------------------------------------------- */}
      <div className={`${stage === 'main' ? 'block' : 'hidden'} print:hidden`}>
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 rounded-[40px] shadow-xl text-white mb-8">
          <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><BookOpen size={28} /> Gestión de Informes</h2>
          <p className="text-violet-100 text-sm">Mostrando: {filteredStudents.length} alumnos.</p>
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
              const report = grupoFiltro === 'Todos' ? null : savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro);
              return (
                <div key={`${s.id}-${grupoFiltro}`} className="p-5 flex justify-between items-center hover:bg-violet-50/50">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.level} | {report ? 'Cargado' : 'Pendiente'}</p>
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
             <p className="text-sm font-bold text-violet-600 uppercase mb-4">GRUPO: {grupoFiltro} | INFORME: {tipoInforme}</p>
             
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
              </div>
            ))}
            
            <div className="mt-6 p-4 bg-gray-50 rounded-2xl">
              <label className="text-xs font-black uppercase text-gray-700 block mb-2">Observaciones Generales</label>
              <textarea 
                className="w-full p-4 bg-white rounded-xl text-sm border border-gray-200" 
                placeholder="Escriba aquí las observaciones..." 
                value={observations} 
                onChange={e => setObservations(e.target.value)} 
                rows={4}
              />
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
          
          {/* ENCABEZADO INSTITUCIONAL CON LOGO Y COLOR */}
          <div className="flex items-center justify-between border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
            {/* LOGO SUPERIOR: Asegurate de tener "logo.png" en tu carpeta public */}
            <img src="/logo.png" alt="Logo Institucional" className="h-16 object-contain" />
            
            <div className="text-right">
              <h1 className="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME MEDIO 2026</h1>
              <p className="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
                Área: {tipoInforme}
              </p>
            </div>
          </div>

          {/* DATOS DEL ESTUDIANTE RECUADRADOS */}
          <div className="border border-violet-200 rounded-xl p-5 mb-6 bg-white shadow-sm" style={{ breakInside: 'avoid' }}>
            <h2 className="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <p><strong className="font-black text-gray-900">Alumno/a:</strong> <span className="text-gray-700">{selectedStudent.lastName}, {selectedStudent.firstName}</span></p>
              <p><strong className="font-black text-gray-900">DNI:</strong> <span className="text-gray-700">{selectedStudent.dni || '....................................'}</span></p>
              <p><strong className="font-black text-gray-900">Fecha de Nac.:</strong> <span className="text-gray-700">{selectedStudent.birthDate || selectedStudent.fechaNac || '....................................'}</span></p>
              <p><strong className="font-black text-gray-900">Grupo:</strong> <span className="text-gray-700 font-bold">{grupoFiltro}</span></p>
              <p><strong className="font-black text-gray-900">Docente a cargo:</strong> <span className="text-gray-700">{docentePrint || '....................................'}</span></p>
              <p><strong className="font-black text-gray-900">Auxiliar/Preceptora:</strong> <span className="text-gray-700">{preceptoraPrint || '....................................'}</span></p>
              <p className="col-span-2"><strong className="font-black text-gray-900">Año de cursada:</strong> <span className="text-gray-700">2026</span></p>
            </div>
          </div>

          {/* SECCIÓN DE DESARROLLO (ORACIONES DESCRIPTIVAS) */}
          <div className="mb-6">
            <h2 className="text-sm font-black text-white bg-violet-800 uppercase px-4 py-1.5 rounded-md mb-4 shadow-sm inline-block" style={{ breakInside: 'avoid' }}>
              Desarrollo {tipoInforme}
            </h2>
            
            <div className="space-y-4 border-l-2 border-violet-200 ml-1 pl-4">
              {indicadoresActuales.map(c => {
                const answer = answers[c.id];
                if (!answer) return null; 
                
                // Aplicamos la magia de transformar el botón en oración
                const textoDescriptivo = formatearTextoImpresion(answer, selectedStudent.firstName);

                return (
                  <div key={c.id} className="text-xs flex flex-col mb-2 pb-3 border-b border-gray-100 last:border-0" style={{ breakInside: 'avoid' }}>
                    <span className="font-black text-violet-900 uppercase text-[10px] tracking-widest mb-1">{c.label}</span>
                    <span className="text-gray-800 leading-relaxed font-medium text-[11px]">{textoDescriptivo}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECCIÓN DE OBSERVACIONES */}
          {observations && (
            <div className="mt-6 bg-violet-50 p-5 rounded-xl border border-violet-200 shadow-sm" style={{ breakInside: 'avoid' }}>
              <h2 className="font-black uppercase text-violet-900 mb-2 text-sm border-b border-violet-200 pb-1">Observaciones Generales</h2>
              <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">{observations}</p>
            </div>
          )}

          {/* SECCIÓN DE FIRMAS Y LOGO INSTITUCIONAL */}
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
