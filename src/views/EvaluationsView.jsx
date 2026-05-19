import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, X, Printer, Save, FileText, 
  CheckCircle2, AlertCircle, Calendar, User, ChevronRight
} from 'lucide-react';
import { 
  collection, doc, setDoc, onSnapshot, serverTimestamp, updateDoc, increment, query, where 
} from 'firebase/firestore';

export function EvaluationsView({ user, db, appId }) {
  const [students, setStudents] = useState([]);
  const [monthlyEvaluations, setMonthlyEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTurn, setFilterTurn] = useState('');
  const [filterGroup, setFilterGroup] = useState(''); // Nuevo estado
  
  // Filtros de organización inicial
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('es-AR', { month: 'long' }).toUpperCase());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Formulario Múltiple Choice
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAllowed = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico'].includes(user.role) || user.rol === 'admin';
  const LOGO_INSTITUCIONAL = "https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png";

  const SPECIALTIES = [
    { id: 'psicologia', label: 'Psicología', color: 'from-purple-500 to-indigo-600' },
    { id: 'to', label: 'Terapia Ocupacional', color: 'from-teal-500 to-emerald-600' },
    { id: 'fono', label: 'Fonoaudiología', color: 'from-blue-500 to-cyan-600' },
    { id: 'psicopedagogia', label: 'Psicopedagogía', color: 'from-pink-500 to-rose-600' },
    { id: 'trabajosocial', label: 'Trabajo Social', color: 'from-amber-500 to-orange-600' }
  ];

  const LEVELS = ['Inicial', '1° Ciclo', '2° Ciclo', 'CFI'];
  const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  // VALORACIONES FIJAS MULTIPLE CHOICE
  const OPTIONS = [
    { value: 'Logrado', label: 'Logrado' },
    { value: 'En Proceso', label: 'En Proceso' },
    { value: 'Iniciado', label: 'Iniciado' },
    { value: 'No Observado', label: 'No Observado' }
  ];

const EVALUATION_CRITERIA = {
  'Inicial': [
    { id: 'ini_psi_1', category: 'Psicología', label: 'Regulación emocional', options: ['Logra autorregularse', 'Requiere contención', 'Desregulación frecuente'] },
    { id: 'ini_psi_2', category: 'Psicología', label: 'Vínculo con adultos', options: ['Busca contacto', 'Selectivo', 'No muestra interés'] },
    { id: 'ini_psi_3', category: 'Psicología', label: 'Juego compartido', options: ['Participa', 'Imitativo', 'Individual'] },
    { id: 'ini_pp_1', category: 'Psicopedagogía', label: 'Exploración del entorno', options: ['Activa', 'Guiada', 'Escasa'] },
    { id: 'ini_pp_2', category: 'Psicopedagogía', label: 'Escritura inicial', options: ['Realiza grafismos/trazos', 'Escribe con apoyo', 'Escritura espontánea'] },
    { id: 'ini_pp_3', category: 'Psicopedagogía', label: 'Atención en propuestas', options: ['Sostiene', 'Intermitente', 'Disperso'] },
    { id: 'ini_to_1', category: 'Terapia Ocupacional', label: 'Participación en rutinas', options: ['Autónomo', 'Requiere asistencia', 'No presenta interés'] },
    { id: 'ini_to_2', category: 'Terapia Ocupacional', label: 'Propuestas grafo-motoras', options: ['Las realiza con interés', 'Requiere asistencia', 'No presenta interés'] },
    { id: 'ini_to_3', category: 'Terapia Ocupacional', label: 'Participación y juego', options: ['Permanece en actividad grupal', 'Explora materiales', 'Inicia juego espontáneo'] },
    { id: 'ini_fo_1', category: 'Fonoaudiología', label: 'Comprensión de órdenes', options: ['Responde', 'Con apoyo visual', 'Con indicación verbal'] },
    { id: 'ini_fo_2', category: 'Fonoaudiología', label: 'Emisión de sonidos', options: ['Variada', 'Escasa', 'Ausente'] },
    { id: 'ini_fo_3', category: 'Fonoaudiología', label: 'Intención comunicativa', options: ['Espontánea', 'A demanda', 'No evidente'] },
    { id: 'ini_mt_1', category: 'Musicoterapia', label: 'Respuesta a estímulos', options: ['Activa', 'Selectiva', 'Nula'] },
    { id: 'ini_mt_2', category: 'Musicoterapia', label: 'Exploración corporal', options: ['Se involucra', 'Guiada', 'Pasiva'] },
    { id: 'ini_mt_3', category: 'Musicoterapia', label: 'Exploración sonora', options: ['Espontánea', 'Imitativa', 'Limitada'] },
    { id: 'ini_ts_1', category: 'Trabajo Social', label: 'Vínculo Escuela/Familia', options: ['Activo', 'Intermitente', 'Escaso'] },
    { id: 'ini_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
    { id: 'ini_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
  ],
  '1° Ciclo': [
    { id: 'c1_psi_1', category: 'Psicología', label: 'Regulación emocional', options: ['Autónoma', 'Con apoyo', 'Desregulación'] },
    { id: 'c1_psi_2', category: 'Psicología', label: 'Vínculo pares y adultos', options: ['Adecuado', 'Selectivo', 'Conflictivo'] },
    { id: 'c1_psi_3', category: 'Psicología', label: 'Expresión emocional', options: ['Verbal', 'Conductual', 'Limitada'] },
    { id: 'c1_pp_1', category: 'Psicopedagogía', label: 'Comprensión de consignas', options: ['Autónomo', 'Con apoyo', 'Requiere guía'] },
    { id: 'c1_pp_2', category: 'Psicopedagogía', label: 'Proceso de lectoescritura', options: ['Realiza grafismos/trazos', 'Escribe con apoyo', 'Escritura espontánea'] },
    { id: 'c1_pp_3', category: 'Psicopedagogía', label: 'Atención en las propuestas', options: ['Sostenida', 'Intermitente', 'Dispersa'] },
    { id: 'c1_to_1', category: 'Terapia Ocupacional', label: 'Motricidad/praxis', options: ['Usa útiles escolares', 'Planifica acciones simples', 'Coordinación bimanual'] },
    { id: 'c1_to_2', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas', options: ['Organiza materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
    { id: 'c1_to_3', category: 'Terapia Ocupacional', label: 'Procesamiento sensorial', options: ['Tolera entorno áulico', 'Requiere pausas', 'Utiliza estrategias'] },
    { id: 'c1_fo_1', category: 'Fonoaudiología', label: 'Comprensión del lenguaje', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
    { id: 'c1_fo_2', category: 'Fonoaudiología', label: 'Expresión verbal', options: ['Clara', 'Poco inteligible', 'Escasa'] },
    { id: 'c1_fo_3', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Espontánea', 'A demanda', 'No funcional'] },
    { id: 'c1_mt_1', category: 'Musicoterapia', label: 'Expresión sonora', options: ['Activa', 'Guiada', 'Pasiva'] },
    { id: 'c1_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Espontánea', 'Imitativa', 'Limitada'] },
    { id: 'c1_mt_3', category: 'Musicoterapia', label: 'Juegos rítmicos sonoros', options: ['Espontáneo', 'Variable', 'Pasivo'] },
    { id: 'c1_ts_1', category: 'Trabajo Social', label: 'Vínculo Escuela/Familia', options: ['Activo', 'Intermitente', 'Escaso'] },
    { id: 'c1_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
    { id: 'c1_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
  ],
  '2° Ciclo': [
    { id: 'c2_psi_1', category: 'Psicología', label: 'Regulación emocional autónoma', options: ['Adecuada', 'Con apoyo', 'Desregulación'] },
    { id: 'c2_psi_2', category: 'Psicología', label: 'Habilidades sociales', options: ['Adecuadas', 'Selectivas', 'Dificultosas'] },
    { id: 'c2_psi_3', category: 'Psicología', label: 'Expresión emocional', options: ['Pertinente', 'Variable', 'Inadecuada'] },
    { id: 'c2_pp_1', category: 'Psicopedagogía', label: 'Comprensión de consignas', options: ['Autónomo', 'Con apoyo', 'Requiere andamiaje'] },
    { id: 'c2_pp_2', category: 'Psicopedagogía', label: 'Producción escrita', options: ['Alfabetizado', 'En proceso', 'Requiere apoyo'] },
    { id: 'c2_pp_3', category: 'Psicopedagogía', label: 'Organización en propuestas', options: ['Sostenida', 'Variable', 'Dispersa'] },
    { id: 'c2_to_1', category: 'Terapia Ocupacional', label: 'Motricidad/praxis', options: ['Organiza materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
    { id: 'c2_to_2', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas', options: ['Organiza materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
    { id: 'c2_to_3', category: 'Terapia Ocupacional', label: 'Procesamiento sensorial', options: ['Tolera entorno áulico', 'Requiere pausas', 'Utiliza estrategias'] },
    { id: 'c2_fo_1', category: 'Fonoaudiología', label: 'Comprensión del lenguaje', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
    { id: 'c2_fo_2', category: 'Fonoaudiología', label: 'Expresión verbal', options: ['Clara', 'Poco inteligible', 'Escasa'] },
    { id: 'c2_fo_3', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Espontánea', 'A demanda', 'No funcional'] },
    { id: 'c2_mt_1', category: 'Musicoterapia', label: 'Participación musical', options: ['Activa', 'Guiada', 'Pasiva'] },
    { id: 'c2_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Creativa', 'Imitativa', 'Limitada'] },
    { id: 'c2_mt_3', category: 'Musicoterapia', label: 'Participación rítmica', options: ['Adecuada', 'Variable', 'Dificultosa'] },
    { id: 'c2_ts_1', category: 'Trabajo Social', label: 'Acompañamiento familiar', options: ['Activo', 'Intermitente', 'Escaso'] },
    { id: 'c2_ts_2', category: 'Trabajo Social', label: 'Asistencia escolar', options: ['Regular', 'Irregular', 'Inasistencias'] },
    { id: 'c2_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
  ],
  'CFI': [
    { id: 'cfi_psi_1', category: 'Psicología', label: 'Regulación emocional contextos sociales', options: ['Adecuada', 'Con apoyo', 'Dificultosa'] },
    { id: 'cfi_psi_2', category: 'Psicología', label: 'Habilidades sociales', options: ['Adecuadas', 'Selectivas', 'Conflictivas'] },
    { id: 'cfi_psi_3', category: 'Psicología', label: 'Toma de decisiones', options: ['Autónoma', 'Guiada', 'Dependiente'] },
    { id: 'cfi_pp_1', category: 'Psicopedagogía', label: 'Comprensión de propuestas', options: ['Autónomo', 'Con apoyo', 'Requiere guía'] },
    { id: 'cfi_pp_2', category: 'Psicopedagogía', label: 'Lectoescritura', options: ['Alfabetizado', 'En proceso', 'Requiere apoyo'] },
    { id: 'cfi_pp_3', category: 'Psicopedagogía', label: 'Resolución situaciones cotidianas', options: ['Autónoma', 'Con guía/apoyos', 'Requiere asistencia'] },
    { id: 'cfi_to_1', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas', options: ['Administra su tiempo', 'Organiza materiales', 'Requiere asistencia'] },
    { id: 'cfi_to_2', category: 'Terapia Ocupacional', label: 'Habilidades', options: ['Logra organizarse', 'Inicia tareas', 'Requiere asistencia'] },
    { id: 'cfi_to_3', category: 'Terapia Ocupacional', label: 'Aspecto interpersonal', options: ['Trabaja en grupos', 'Respeta turnos', 'Requiere ser motivado'] },
    { id: 'cfi_fo_1', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
    { id: 'cfi_fo_2', category: 'Fonoaudiología', label: 'Comprensión compleja', options: ['Adecuada', 'Parcial', 'Limitada'] },
    { id: 'cfi_fo_3', category: 'Fonoaudiología', label: 'Expresión efectiva', options: ['Clara', 'Poco clara', 'Escasa'] },
    { id: 'cfi_mt_1', category: 'Musicoterapia', label: 'Participación y expresión', options: ['Activa', 'Guiada', 'Pasiva'] },
    { id: 'cfi_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Creativa', 'Imitativa', 'Limitada'] },
    { id: 'cfi_mt_3', category: 'Musicoterapia', label: 'Participación rítmica sonora', options: ['Adecuada', 'Variable', 'Dificultosa'] },
    { id: 'cfi_ts_1', category: 'Trabajo Social', label: 'Acompañamiento familiar', options: ['Activo', 'Intermitente', 'Escaso'] },
    { id: 'cfi_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
    { id: 'cfi_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
  ]
};
  useEffect(() => {
    if (!isAllowed || !db || !appId) return;

    // Escuchar estudiantes activos
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Escuchar las evaluaciones unificadas de la base de datos
    const qEvals = collection(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations');
    const unsubEvals = onSnapshot(qEvals, (snap) => {
      setMonthlyEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubStudents(); unsubEvals(); };
  }, [isAllowed, db, appId]);

  // Busca el documento unificado del estudiante si ya existe para ese mes y año específico
  const getExistingEvaluation = (studentId) => {
    const docId = `${studentId}_${selectedMonth}_${selectedYear}`;
    return monthlyEvaluations.find(ev => ev.id === docId);
  };

  // Al seleccionar un estudiante, precargamos lo que ya esté escrito en su área
  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    const existingDoc = getExistingEvaluation(student.id);
    
    if (existingDoc && existingDoc.areas?.[selectedSpecialty]) {
      setAnswers(existingDoc.areas[selectedSpecialty].answers || {});
      setObservations(existingDoc.areas[selectedSpecialty].observations || '');
    } else {
      setAnswers({});
      setObservations('');
    }
  };

  // 1. Edición: Carga los datos del informe seleccionado al formulario para editar
  const handleEditEvaluation = (ev) => {
    // Buscamos al estudiante para cargarlo al formulario
    const student = students.find(s => s.id === ev.studentId);
    if (student) {
      setSelectedStudent(student);
      setSelectedSpecialty(Object.keys(ev.areas)[0]); // Opcional: podrías preguntar qué área editar
      setAnswers(ev.areas[Object.keys(ev.areas)[0]].answers);
      setObservations(ev.areas[Object.keys(ev.areas)[0]].observations);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 2. Borrado: Elimina el registro de la base de datos
  const handleDeleteEvaluation = async (evId) => {
    if (window.confirm("¿Estás segura de que quieres eliminar este informe completo? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations', evId));
        alert("✅ Informe eliminado correctamente.");
      } catch (err) {
        alert("Error al borrar: " + err.message);
      }
    }
  };
const handleSaveArea = async () => {
    if (!selectedStudent || !selectedSpecialty || !selectedLevel) {
      return alert("Falta definir la especialidad, nivel o estudiante.");
    }

    // AQUI ESTA EL CAMBIO: Filtramos los criterios solo del área seleccionada
    const criteriaDelArea = EVALUATION_CRITERIA[selectedLevel].filter(
      q => q.category.toLowerCase() === SPECIALTIES.find(s => s.id === selectedSpecialty)?.label.toLowerCase()
    );

    // Comparamos las respuestas solo contra las preguntas del área filtrada
    const respuestasCargadas = Object.keys(answers).filter(key => 
      criteriaDelArea.some(q => q.id === key)
    );

    if (respuestasCargadas.length < criteriaDelArea.length) {
      return alert(`Por favor responde todos los indicadores de esta área (${respuestasCargadas.length}/${criteriaDelArea.length} completados).`);
    }

    setIsSaving(true);
    const docId = `${selectedStudent.id}_${selectedMonth}_${selectedYear}`;
    
    try {
      const existingDoc = getExistingEvaluation(selectedStudent.id);
      
      // Armamos o actualizamos la estructura de áreas en el mismo archivo físico
      const updatedAreas = existingDoc ? { ...existingDoc.areas } : {};
      
      updatedAreas[selectedSpecialty] = {
        answers: answers,
        observations: observations,
        author: user.fullName || user.firstName,
        updatedAt: new Date().toISOString()
      };

      const finalPayload = {
        id: docId,
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
        studentDni: selectedStudent.dni || '-',
        level: selectedLevel,
        group: selectedStudent.groupMorning || selectedStudent.groupAfternoon || '-',
        month: selectedMonth,
        year: selectedYear,
        areas: updatedAreas,
        lastUpdatedBy: user.firstName,
        serverUpdatedAt: serverTimestamp()
      };

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations', docId), finalPayload);

      // Sumar puntos
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      await updateDoc(userRef, { score: increment(25) });

      alert(`✅ Área de ${SPECIALTIES.find(s => s.id === selectedSpecialty)?.label} guardada con éxito en la ficha mensual del estudiante.`);
      setSelectedStudent(null);
      setSearchTerm('');
      setAnswers({});
      setObservations('');
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // FUNCIÓN MAESTRA DE IMPRESIÓN CON ESTRELLA INSTITUTIONAL UNIFICADA
  const handlePrintFullEvaluation = (evalDoc) => {
    const criteria = EVALUATION_CRITERIA[evalDoc.level] || [];
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);

    let htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SEGUIMIENTO MENSUAL - EQUIPO TECNICO</title>
        <style>
          body { font-family: 'Arial', sans-serif; padding: 30px; color: #1e293b; font-size: 11px; }
          .header { border-bottom: 4px solid #4c1d95; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .logo-img { height: 50px; width: auto; mix-blend-multiply: true; }
          .main-title { margin: 0; font-size: 18px; font-weight: 900; color: #4c1d95; text-transform: uppercase; }
          .subtitle { margin: 2px 0 0 0; font-size: 10px; font-weight: bold; color: #ea580c; text-transform: uppercase; }
          
          .student-card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 15px; margin-bottom: 20px; background: #f8fafc; display: grid; grid-template-cols: 1fr 1fr; gap: 8px; }
          .data-box { font-weight: bold; color: #475569; }
          .data-box span { color: #0f172a; font-weight: 900; text-transform: uppercase; }
          
          .section-area-title { background: #4c1d95; color: white; padding: 6px 12px; font-weight: 900; text-transform: uppercase; font-size: 11px; margin-top: 25px; border-radius: 4px; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { background: #cbd5e1; color: #1e293b; padding: 8px; text-align: left; font-weight: 900; font-size: 10px; border: 1px solid #cbd5e1; }
          td { border: 1px solid #cbd5e1; padding: 8px; font-weight: bold; }
          
          .badge { font-weight: 900; text-transform: uppercase; font-size: 9px; }
          
          .obs-box { margin-top: 8px; background: #f1f5f9; padding: 10px; border-radius: 8px; border-left: 4px solid #ea580c; font-style: italic; }
          .author-footer { text-align: right; font-size: 9px; color: #64748b; font-weight: bold; margin-top: 4px; }
          
          .page-break { page-break-before: always; }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="display:flex; align-items:center; gap:10px;">
            <img src="${LOGO_INSTITUCIONAL}" class="logo-img" />
            <div>
              <h3 style="margin:0; font-size:12px; font-weight:900; color:#4c1d95;">ESCUELA ESPECIAL</h3>
              <p style="margin:0; font-size:9px; font-weight:bold; color:#64748b;">JUNTOS A LA PAR</p>
            </div>
          </div>
          <div style="text-align: right;">
            <h1 class="main-title">SEGUIMIENTO MENSUAL</h1>
            <p class="subtitle">DOCUMENTO UNIFICADO EQUIPO TÉCNICO</p>
          </div>
        </div>

        <div class="student-card">
          <div class="data-box">ESTUDIANTE: <span>${evalDoc.studentName}</span></div>
          <div class="data-box">DNI: <span>${evalDoc.studentDni}</span></div>
          <div class="data-box">NIVEL / CICLO: <span>${evalDoc.level}</span></div>
          <div class="data-box">GRUPO / AULA: <span>${evalDoc.group}</span></div>
          <div class="data-box">PERÍODO EVALUADO: <span>${evalDoc.month} ${evalDoc.year}</span></div>
          <div class="data-box">EMISIÓN DIGITAL: <span>${new Date().toLocaleDateString()}</span></div>
        </div>
    `;

    // Procesamos cada una de las especialidades completas dentro de la misma hoja de impresión
    Object.keys(evalDoc.areas).forEach((areaKey) => {
      const areaData = evalDoc.areas[areaKey];
      const specLabel = SPECIALTIES.find(s => s.id === areaKey)?.label || areaKey;

      htmlContent += `
        <div class="section-area-title">INFORME DE ÁREA: ${specLabel.toUpperCase()}</div>
        <table>
          <thead>
            <tr>
              <th style="width: 75%;">Indicadores de Evaluación de Categoría</th>
              <th style="width: 25%; text-align: center;">Valoración</th>
            </tr>
          </thead>
          <tbody>
            ${criteria.map(q => `
              <tr>
                <td><small style="color:#ea580c; font-weight:900; block">${q.category}</small> ${q.label}</td>
                <td style="text-align:center;" class="badge">${areaData.answers[q.id] || 'No Observado'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        ${areaData.observations ? `
          <div class="obs-box"><b>Observaciones del área:</b> ${areaData.observations}</div>
        ` : ''}
        <div class="author-footer">Evaluación realizada por: ${areaData.author}</div>
      `;
    });

    htmlContent += `</body></html>`;
    const docIframe = iframe.contentWindow.document;
    docIframe.open(); docIframe.write(htmlContent); docIframe.close();
    
    setTimeout(() => {
      iframe.contentWindow.focus(); iframe.contentWindow.print();
      document.body.removeChild(iframe);
    }, 500);
  };
// 1. FILTRADO INTELIGENTE POR TEXTO Y POR NIVEL SELECCIONADO
  const filteredStudents = students.filter(s => {
    // Forzamos que coincida el nivel elegido en el Paso 2 con el del alumno
    const matchLevel = s.level?.toLowerCase().trim() === selectedLevel?.toLowerCase().trim();
    if (!matchLevel) return false;

    // Si hay texto en el buscador, filtramos también por nombre/DNI
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      return `${s.lastName} ${s.firstName}`.toLowerCase().includes(term) || (s.dni && s.dni.includes(term));
    }

    return true;
  });

  // Ordenamos de la A a la Z por apellido antes de mostrar la grilla
  const sortedStudents = [...filteredStudents].sort((a, b) => a.lastName.localeCompare(b.lastName));

  if (!isAllowed) {
    return <div className="p-8 text-center font-bold text-red-600">⛔ Acceso exclusivo para el Equipo Directivo o Técnico de la institución.</div>;
  }
// Extraemos grupos únicos de los datos existentes para el dropdown
const availableGroups = [...new Set(monthlyEvaluations.map(ev => ev.group).filter(Boolean))].sort();
  return (
    <div className="space-y-6 animate-in fade-in pb-16 px-2 max-w-7xl mx-auto">
      {/* SECCIÓN CABECERA */}
      <div className="bg-white p-6 rounded-[35px] shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-violet-950 uppercase italic flex items-center gap-3">
            <ClipboardCheck size={28} className="text-orange-500" /> Seguimiento Mensual - Equipo Técnico
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unificación de Grillas y Legajos</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full sm:w-auto">
          <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setSelectedStudent(null); }} className="bg-white px-3 py-2 rounded-xl text-xs font-black text-slate-700 uppercase outline-none border shadow-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedStudent(null); }} className="bg-white px-3 py-2 rounded-xl text-xs font-black text-slate-700 outline-none border shadow-sm">
            {['2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* RUTA DE PASOS COMPLETAMENTE LIMPIA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PASO 1: ESPECIALIDAD */}
        <div className="bg-white p-6 rounded-[35px] border shadow-sm space-y-4">
          <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">Área Terapéutica</h3>
          <div className="flex flex-col gap-2">
            {SPECIALTIES.map(spec => (
              <button 
                key={spec.id}
                onClick={() => { setSelectedSpecialty(spec.id); setSelectedStudent(null); setAnswers({}); setObservations(''); }}
                className={`w-full p-4 rounded-2xl font-black text-sm uppercase text-left transition-all flex justify-between items-center border-2 ${
                  selectedSpecialty === spec.id 
                    ? 'bg-gradient-to-r ' + spec.color + ' text-white border-transparent shadow-md' 
                    : 'bg-slate-50 text-slate-700 border-slate-100 hover:bg-slate-100/70'
                }`}
              >
                {spec.label}
                {selectedSpecialty === spec.id && <CheckCircle2 size={18} />}
              </button>
            ))}
          </div>
        </div>

        {/* PASO 2: NIVEL */}
        <div className="bg-white p-6 rounded-[35px] border shadow-sm space-y-4">
          <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">Nivel Técnico</h3>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                disabled={!selectedSpecialty}
                onClick={() => { setSelectedLevel(lvl); setSelectedStudent(null); }}
                className={`p-6 rounded-2xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center gap-2 border-2 ${
                  !selectedSpecialty ? 'opacity-40 cursor-not-allowed' : ''
                } ${
                  selectedLevel === lvl ? 'bg-violet-950 text-white border-transparent shadow-md' : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}
              >
                <span className="text-xl">🏫</span>
                {lvl}
              </button>
            ))}
          </div>
        </div>

  {/* PASO 3: BUSCADOR DE ESTUDIANTE */}
        <div className="bg-white p-6 rounded-[35px] border shadow-sm space-y-4">
          <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">Seleccionar Estudiante</h3>
          <div className="bg-slate-50 rounded-xl flex items-center px-3 border focus-within:bg-white transition-all shadow-inner">
            <Search size={18} className="text-slate-400" />
            <input 
              disabled={!selectedLevel}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Escribir apellido o DNI..." 
              className="w-full p-3 bg-transparent outline-none text-xs font-bold disabled:cursor-not-allowed"
            />
          </div>

          <div className="max-h-64 overflow-y-auto space-y-1.5 custom-scrollbar pr-1 bg-slate-50/50 p-2 rounded-2xl border border-slate-100/60">
            {selectedLevel && students
              .filter(s => {
                const matchLevel = s.level?.toLowerCase().trim() === selectedLevel?.toLowerCase().trim();
                if (!matchLevel) return false;
                
                const term = searchTerm.trim().toLowerCase();
                if (term) {
                  return `${s.lastName} ${s.firstName}`.toLowerCase().includes(term) || (s.dni && s.dni.includes(term));
                }
                return true;
              })
              .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
              .map(s => {
                const statusDoc = getExistingEvaluation(s.id);
                const areasCount = statusDoc ? Object.keys(statusDoc.areas || {}).length : 0;
                return (
                  <div 
                    key={s.id} 
                    onClick={() => handleSelectStudent(s)} 
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-200 ${
                      selectedStudent?.id === s.id 
                        ? 'bg-orange-50 border-orange-200 text-orange-950 font-black shadow-sm' 
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200/60 font-bold'
                    } text-xs uppercase`}
                  >
                    <span>{s.lastName}, {s.firstName}</span>
                    <span className={`text-[8px] px-2 py-0.5 rounded font-black tracking-wider transition-colors ${
                      areasCount === 5 ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {areasCount}/5 ÁREAS
                    </span>
                  </div>
                );
              })
            }
            {selectedLevel && students.filter(s => s.level?.toLowerCase().trim() === selectedLevel?.toLowerCase().trim()).length === 0 && (
              <p className="text-center text-xs text-slate-400 italic py-6">No hay alumnos registrados en {selectedLevel}.</p>
            )}
            {!selectedLevel && (
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-8">Define Nivel en Paso 2 para desplegar la lista</p>
            )}
          </div>
        </div>
            
            {/* Mensajes dinámicos informativos para el usuario */}
            {selectedLevel && students.filter(s => s.level?.toLowerCase().trim() === selectedLevel?.toLowerCase().trim()).length === 0 && (
              <p className="text-center text-xs text-slate-400 italic py-6">No hay alumnos registrados en {selectedLevel}.</p>
            )}
            {!selectedLevel && (
              <p className="text-center text-[10px] text-slate-400 font-bold uppercase py-8">Define Nivel en Paso 2 para desplegar la lista</p>
            )}
          </div>
    
     

      {/* FORMULARIO DE VALORACIÓN MÚLTIPLE CHOICE */}
{selectedStudent && (
  <div className="bg-white p-6 md:p-8 rounded-[40px] border shadow-md space-y-8 animate-in slide-in-from-bottom-4">
    <div className="bg-slate-950 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase bg-white/10 px-2.5 py-1 rounded-md">Carga Express Activada</span>
        <h4 className="text-xl font-black uppercase mt-2">{selectedStudent.lastName}, {selectedStudent.firstName}</h4>
        <p className="text-xs font-bold text-slate-400">DNI: {selectedStudent.dni || '-'} • Nivel: {selectedLevel}</p>
      </div>
      <div className="text-right md:border-l-2 border-white/20 md:pl-4">
        <p className="text-lg font-black text-white uppercase italic">{selectedMonth} {selectedYear}</p>
        <p className="text-[10px] font-black text-violet-300 uppercase">Área: {SPECIALTIES.find(s => s.id === selectedSpecialty)?.label}</p>
      </div>
    </div>

    <div className="space-y-6">
      {/* FILTRO EXACTO POR CATEGORÍA */}
      {EVALUATION_CRITERIA[selectedLevel]
        ?.filter(q => q.category.toLowerCase() === SPECIALTIES.find(s => s.id === selectedSpecialty)?.label.toLowerCase())
        .map((q, idx) => (
          <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-orange-600 uppercase tracking-wider">{q.category}</span>
              <p className="font-black text-sm text-slate-800 mt-0.5">{idx + 1}. {q.label}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {q.options.map(optLabel => (
                <button
                  key={optLabel}
                  onClick={() => setAnswers(p => ({ ...p, [q.id]: optLabel }))}
                  className={`p-3 rounded-xl font-black text-[10px] uppercase border transition-all ${
                    answers[q.id] === optLabel 
                      ? 'bg-violet-700 text-white border-transparent shadow-lg' 
                      : 'bg-white text-slate-600 border-slate-200 hover:border-violet-300'
                  }`}
                >
                  {optLabel}
                </button>
              ))}
            </div>
          </div>
      ))}
      
      {/* MENSAJE SI NO HAY PREGUNTAS (Para detectar errores) */}
      {EVALUATION_CRITERIA[selectedLevel]?.filter(q => q.category.toLowerCase() === SPECIALTIES.find(s => s.id === selectedSpecialty)?.label.toLowerCase()).length === 0 && (
        <p className="text-center text-xs font-bold text-red-500 py-4">No se encontraron indicadores para esta área.</p>
      )}
    </div>

    <div className="space-y-2">
      <label className="font-black text-xs text-slate-500 uppercase block">Observaciones y Evaluación Cualitativa</label>
      <textarea
        value={observations}
        onChange={e => setObservations(e.target.value)}
        placeholder="Registrar evolución..."
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium h-24 outline-none focus:bg-white focus:border-violet-400 transition-all"
      />
    </div>

    <div className="flex justify-end gap-2 border-t pt-4">
      <button onClick={() => setSelectedStudent(null)} className="px-5 py-3 font-black text-xs text-slate-400 uppercase">Cerrar</button>
      <button onClick={handleSaveArea} disabled={isSaving} className="px-6 py-3 bg-violet-700 text-white font-black text-xs uppercase rounded-xl shadow hover:bg-violet-800 transition-all">
        {isSaving ? 'Guardando...' : '💾 Guardar esta especialidad'}
      </button>
    </div>
  </div>
)}
            
{/* HISTORIAL: GRILLA DE INFORMES UNIFICADOS POR ESTUDIANTE */}
      <div className="bg-white p-6 rounded-[40px] border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <h3 className="font-black text-sm text-violet-950 uppercase italic flex items-center gap-2">Registros del Período</h3>
          
          {/* BARRA DE FILTROS */}
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <select onChange={(e) => setFilterLevel(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Niveles</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            
            <select onChange={(e) => setFilterTurn(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Turnos</option>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>

            <select onChange={(e) => setFilterGroup(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Grupos</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-[10px] font-black text-slate-400 uppercase bg-slate-50/50">
                <th className="p-4">Estudiante</th>
                <th className="p-4">Nivel</th>
                <th className="p-4">Grupo/Turno</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-bold text-slate-600 uppercase">
              {monthlyEvaluations
                .filter(ev => {
                  const matchLevel = !filterLevel || ev.level === filterLevel;
                  const matchTurn = !filterTurn || ev.group?.includes(filterTurn);
                  const matchGroup = !filterGroup || ev.group === filterGroup; // Filtro exacto por grupo
                  return matchLevel && matchTurn && matchGroup;
                })
                .map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-800">{ev.studentName}</td>
                    <td className="p-4">{ev.level}</td>
                    <td className="p-4">{ev.group || '-'}</td>
                    <td className="p-4 text-emerald-600">Cargado</td>
                    <td className="p-4 text-center flex gap-2 justify-center">
                      <button onClick={() => handlePrintFullEvaluation(ev)} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase">Imprimir</button>
                      <button onClick={() => handleEditEvaluation(ev)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase">Editar</button>
                      <button 
    onClick={() => handleDeleteEvaluation(ev.id)} 
    className="px-3 py-2 bg-red-500 text-white rounded-xl text-[9px] font-black uppercase hover:bg-red-600 transition-all"
  >
    Borrar
  </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
    
