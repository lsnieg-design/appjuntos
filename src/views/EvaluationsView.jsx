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

  // CATEGORÍAS E INDICADORES OFICIALES POR NIVEL
  const EVALUATION_CRITERIA = {
    'Inicial': [
      { id: 'ini_1', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Tolerancia a la frustración durante propuestas lúdicas y dirigidas.' },
      { id: 'ini_2', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Interacción y respuesta social frente a pares y adultos del aula.' },
      { id: 'ini_3', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Sostiene la atención conjunta y contacto visual con el interlocutor.' },
      { id: 'ini_4', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Comprensión y ejecución de consignas simples de carácter contextual.' },
      { id: 'ini_5', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Manipulación instrumental básica y prensiones visomotrices finas.' },
      { id: 'ini_6', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Regulación frente a estímulos táctiles, auditivos o ambientales de la sala.' }
    ],
    '1° Ciclo': [
      { id: 'c1_1', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Reconocimiento y expresión de estados emocionales primarios.' },
      { id: 'c1_2', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Aceptación de pautas de convivencia elementales y límites en grupo.' },
      { id: 'c1_3', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Uso funcional de lenguaje (o SAAC) para peticiones de necesidad básica.' },
      { id: 'c1_4', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Seguimiento de secuencias operacionales breves dadas por consigna.' },
      { id: 'c1_5', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Nivel de independencia en hábitos de higiene personal y alimentación.' },
      { id: 'c1_6', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Organización espacial del material escolar y cuidado de pertenencias.' }
    ],
    '2° Ciclo': [
      { id: 'c2_1', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Despliegue de estrategias adaptativas ante resolución de conflictos.' },
      { id: 'c2_2', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Sostenimiento de la actividad compartida y colaboración de tareas.' },
      { id: 'c2_3', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Habilidades pragmáticas y discursivas en intercambios de pares.' },
      { id: 'c2_4', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Comprensión de enunciados verbales o gráficos abstractos e instructivos.' },
      { id: 'c2_5', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Coordinación visomotriz gruesa y fina orientada al trabajo escolar.' },
      { id: 'c2_6', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Autonomía en traslados internos e instrumentación de rutinas institucionales.' }
    ],
    'CFI': [
      { id: 'cfi_1', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Habilidades sociolaborales, perfil ocupacional y tolerancia al trabajo sostenido.' },
      { id: 'cfi_2', category: 'ÁREA SOCIO-EMOCIONAL', label: 'Autorregulación emocional frente a la corrección o demanda técnica.' },
      { id: 'cfi_3', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Claridad en la expresión funcional orientada a entornos laborales/comunitarios.' },
      { id: 'cfi_4', category: 'ÁREA COMUNICATIVO-LINGÜÍSTICA', label: 'Decodificación y acatamiento de directivas complejas de jerarquía.' },
      { id: 'cfi_5', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Uso seguro y ergonómico de herramientas complejas de talleres formativos.' },
      { id: 'cfi_6', category: 'ÁREA SENSORIOMOTRIZ Y AUTONOMÍA', label: 'Autonomía instrumental y planificación de tareas de manera independiente.' }
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

  const handleSaveArea = async () => {
    if (!selectedStudent || !selectedSpecialty || !selectedLevel) {
      return alert("Falta definir la especialidad, nivel o estudiante.");
    }

    const criteria = EVALUATION_CRITERIA[selectedLevel] || [];
    if (Object.keys(answers).length < criteria.length) {
      return alert("Por favor responde todos los indicadores múltiple opción.");
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
        </div>
      {/* FORMULARIO DE VALORACIÓN MÚLTIPLE CHOICE */}
      {selectedStudent && (
        <div className="bg-white p-6 md:p-8 rounded-[40px] border shadow-md space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-950 text-white p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="text-[9px] font-black tracking-widest text-orange-400 uppercase bg-white/10 px-2.5 py-1 rounded-md">Carga Express Activada</span>
              <h4 className="text-xl font-black uppercase mt-2">{selectedStudent.lastName}, {selectedStudent.firstName}</h4>
              <p className="text-xs font-bold text-slate-400">DNI: {selectedStudent.dni || '-'} • Nivel base: {selectedLevel}</p>
            </div>
            <div className="text-right md:border-l-2 border-white/20 md:pl-4">
              <p className="text-lg font-black text-white uppercase italic">{selectedMonth} {selectedYear}</p>
              <p className="text-[10px] font-black text-violet-300 uppercase">Área: {SPECIALTIES.find(s => s.id === selectedSpecialty)?.label}</p>
            </div>
          </div>

          <div className="space-y-6">
            {EVALUATION_CRITERIA[selectedLevel]?.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-orange-600 uppercase tracking-wider">{q.category}</span>
                  <p className="font-black text-sm text-slate-800 mt-0.5">{idx + 1}. {q.label}</p>
                </div>
                
                {/* Botones grandes de opción múltiple */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {OPTIONS.map(opt => {
                    const isSelected = answers[q.id] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => handleOptionChange(q.id, opt.value)}
                        className={`p-3 rounded-xl font-black text-[11px] uppercase border transition-all ${
                          isSelected ? 'bg-violet-700 text-white border-transparent shadow' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100/50'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="font-black text-xs text-slate-500 uppercase block">Observaciones y Evaluación Cualitativa</label>
            <textarea
              value={observations}
              onChange={e => setObservations(e.target.value)}
              placeholder="Registrar evolución cualitativa observada en este mes..."
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
      <div className="bg-white p-6 rounded-[40px] border shadow-sm space-y-4">
        <h3 className="font-black text-sm text-violet-950 uppercase italic border-b pb-3 flex items-center gap-2">Registros del Período</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-[10px] font-black text-slate-400 uppercase bg-slate-50/50">
                <th className="p-4">Estudiante</th>
                <th className="p-4">Nivel</th>
                <th className="p-4">Mes / Año</th>
                <th className="p-4">Estado de Especialidades</th>
                <th className="p-4 text-center">Acciones de Impresión</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-bold text-slate-600 uppercase">
              {monthlyEvaluations.map(ev => {
                const totalAreas = Object.keys(ev.areas || {}).length;
                return (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-800">{ev.studentName}</td>
                    <td className="p-4">{ev.level}</td>
                    <td className="p-4 font-mono text-orange-600">{ev.month} / {ev.year}</td>
                    <td className="p-4">
                      <div className="flex gap-1.5 flex-wrap">
                        {SPECIALTIES.map(sp => {
                          const completo = ev.areas?.[sp.id];
                          return (
                            <span key={sp.id} className={`px-2 py-0.5 rounded text-[8px] font-black ${completo ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-400'}`}>
                              {sp.label.substring(0, 4)}.
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button 
                        onClick={() => handlePrintFullEvaluation(ev)}
                        className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm flex items-center gap-2 mx-auto ${
                          totalAreas === 5 
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:brightness-105' 
                            : 'bg-slate-800 text-white hover:bg-slate-900'
                        }`}
                      >
                        <Printer size={12} /> {totalAreas === 5 ? '🖨️ IMPRIMIR COMPLETO' : 'IMPRIMIR AVANCE'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
