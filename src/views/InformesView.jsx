import React, { useState, useEffect } from 'react';
import { X, Edit3, Plus, BookOpen } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, deleteDoc } from 'firebase/firestore';

const CONFIG_INDICADORES = {
  pedagogico: {
    'Inicial': [
      { 
        id: 'lectoescritura', 
        label: 'Lectoescritura', 
        options: [
          'Presilábico: Explora la escritura con dibujos o grafismos sin valor sonoro aún.',
          'Silábico: Comienza a asignar valor sonoro a las letras, mayormente vocales.',
          'Silábico-alfabético: Transición; combina sílabas completas con letras aisladas.',
          'Alfabético: Escribe de forma autónoma representando los fonemas con coherencia.'
        ] 
      },
      { 
        id: 'escritura', 
        label: 'Escritura', 
        options: [
          'Requiere guía física constante (mano-sobre-mano) para realizar grafismos.',
          'Escribe mediante copia fiel o dictado fonético sencillo con apoyo docente.',
          'Escribe frases cortas mediante dictado fonético con supervisión frecuente.',
          'Escribe de forma autónoma y creativa, expresando ideas con sentido completo.'
        ] 
      },
      { 
        id: 'comprension', 
        label: 'Comprensión', 
        options: [
          'No logra significar el texto, se limita a identificar imágenes.',
          'Comprende textos breves y sencillos mediante lectura compartida.',
          'Comprende el sentido global de textos breves de manera guiada.',
          'Realiza lectura autónoma y comprende el sentido global de textos diversos.'
        ] 
      },
      { 
        id: 'reconocimiento', 
        label: 'Reconocimiento', 
        options: [
          'Solo identifica su propio nombre entre otras palabras.',
          'Reconoce nombre propio y de sus pares con facilidad.',
          'Reconoce palabras de uso frecuente y frases cortas.',
          'Lee palabras y frases con sentido completo de forma autónoma.'
        ] 
      },
      { 
        id: 'serie_numerica', 
        label: 'Serie numérica', 
        options: [
          'Realiza conteo hasta 10, precisando apoyo con material concreto.',
          'Realiza conteo hasta 20 y reconoce números en contextos cotidianos.',
          'Maneja series numéricas amplias y reconoce familias numéricas.',
          'Domina series numéricas complejas con total autonomía.'
        ] 
      },
      { 
        id: 'operaciones', 
        label: 'Operaciones', 
        options: [
          'Identifica cantidades, pero no logra realizar operaciones.',
          'Resuelve sumas y restas simples utilizando material didáctico.',
          'Resuelve sumas y restas complejas con apoyo esporádico.',
          'Resuelve problemas cotidianos con operaciones complejas autónomamente.'
        ] 
      },
      { 
        id: 'figuras', 
        label: 'Figuras y lógica', 
        options: [
          'Identifica figuras básicas, pero requiere mediación para clasificarlas.',
          'Clasifica elementos por forma, tamaño o color con supervisión.',
          'Resuelve problemas simples de lógica y comparación.',
          'Resuelve problemas de alta complejidad de forma autónoma.'
        ] 
      },
      { 
        id: 'rutinas', 
        label: 'Rutinas / Higiene', 
        options: [
          'Requiere asistencia total y acompañamiento cercano en toda rutina.',
          'Realiza rutinas básicas con supervisión constante y apoyo puntual.',
          'Realiza rutinas con supervisión mínima y esporádica.',
          'Es totalmente autónomo en sus rutinas escolares y cuidado personal.'
        ] 
      },
      { 
        id: 'organizacion', 
        label: 'Organización', 
        options: [
          'Precisa que el adulto organice sus materiales de trabajo siempre.',
          'Organiza sus materiales solo ante el recordatorio del docente.',
          'Mantiene sus materiales organizados de forma independiente.',
          'Anticipa y organiza todos los materiales necesarios antes de iniciar.'
        ] 
      },
      { 
        id: 'pedido_ayuda', 
        label: 'Pedido de ayuda', 
        options: [
          'Ante la dificultad, se bloquea y espera la intervención externa.',
          'Solicita ayuda mediante mediación o sugerencia del docente.',
          'Identifica cuando necesita ayuda y la solicita ante la duda.',
          'Es proactivo; ante un obstáculo busca soluciones antes de pedir ayuda.'
        ] 
      },
      { 
        id: 'vinculo_pares', 
        label: 'Vínculo con pares', 
        options: [
          'Su juego es paralelo o solitario; le cuesta integrar a otros.',
          'Interactúa con pares principalmente en actividades guiadas.',
          'Se integra espontáneamente a juegos cooperativos grupales.',
          'Lidera o propone actividades grupales de forma activa.'
        ] 
      },
      { 
        id: 'vinculo_adulto', 
        label: 'Vínculo adulto', 
        options: [
          'Dependencia total del adulto para iniciar cualquier tarea.',
          'Busca apoyo y validación constante de figuras adultas.',
          'Busca apoyo solo ante dudas específicas o situaciones nuevas.',
          'Establece un vínculo saludable de referencia, con autonomía.'
        ] 
      },
      { 
        id: 'emocional', 
        label: 'Expresión emocional', 
        options: [
          'Ante malestar reacciona con impulsividad o conductas físicas.',
          'Expresa su malestar verbalmente solo mediante mediación.',
          'Expresa sus sentimientos de forma verbal con claridad.',
          'Posee autorregulación y gestiona sus emociones de forma autónoma.'
        ] 
      },
      { 
        id: 'pautas', 
        label: 'Pautas / Turnos', 
        options: [
          'No respeta pautas de convivencia ni turnos de habla.',
          'Respeta pautas y turnos solo ante el recordatorio frecuente.',
          'Respeta pautas y turnos con mínima guía docente.',
          'Respeta los turnos y acuerdos de convivencia autónomamente.'
        ] 
      },
      { 
        id: 'escucha', 
        label: 'Escucha activa', 
        options: [
          'Se encuentra desconectado de las consignas grupales.',
          'Escucha si se lo interpela o busca individualmente.',
          'Participa en la escucha de relatos o propuestas grupales.',
          'Se muestra atento y responde correctamente a consignas grupales.'
        ] 
      },
      { 
        id: 'conflictos', 
        label: 'Conflictos', 
        options: [
          'Reacciona con conductas físicas o impulsivas ante el conflicto.',
          'Expresa el malestar pero requiere mediación docente directa.',
          'Resuelve conflictos mediante el diálogo con intervención mínima.',
          'Resuelve conflictos de forma autónoma, aceptando acuerdos de paz.'
        ] 
      },
      { 
        id: 'desplazamiento', 
        label: 'Desplazamiento', 
        options: [
          'Necesita guía física permanente para transitar la escuela.',
          'Reconoce los espacios, pero requiere recordatorios constantes.',
          'Se desplaza por la escuela con recordatorios esporádicos.',
          'Autónomo en toda la institución con sentido de pertenencia.'
        ] 
      },
      { 
        id: 'juego', 
        label: 'Tipo de juego', 
        options: [
          'Su juego es puramente exploratorio y sensorial.',
          'Desarrolla juego simbólico (imaginativo con elementos).',
          'Participa en juegos reglados simples respetando turnos.',
          'Propone y participa en juegos reglados complejos y creativos.'
        ] 
      },
      { 
        id: 'ciencias', 
        label: 'Ciencias / Indagación', 
        options: [
          'Precisa modelado paso a paso para usar materiales. Muestra curiosidad puntual sin lograr sostener la observación.',
          'Manipula los materiales con intención clara y sentido. Indaga sobre el entorno con mediación y preguntas docentes.',
          'Realiza producciones propias con intención creativa. Manifiesta curiosidad, investiga fenómenos y busca explicaciones.',
          'Utiliza y cuida los materiales con creatividad y autonomía. Investiga de forma independiente, proponiendo explicaciones propias.'
        ] 
      },
      { 
        id: 'cuidado', 
        label: 'Cuidado del entorno', 
        options: [
          'No registra el entorno ni las pautas de cuidado.',
          'Identifica normas de cuidado con supervisión constante.',
          'Identifica y aplica normas de cuidado con mínima guía.',
          'Autónomo en el cuidado del medio ambiente y los seres vivos.'
        ] 
      },
      { 
        id: 'comunicacion', 
        label: 'Comunicación', 
        options: [
          'Comunicación reactiva; utiliza gestos básicos ante necesidad inmediata.',
          'Comunicación funcional; usa señas, pictogramas o habla simple con apoyo.',
          'Comunicación activa; comunica deseos y necesidades con frases breves.',
          'Comunicación compleja; relata eventos y sostiene conversaciones con fluidez.'
        ] 
      },
      { 
        id: 'funciones', 
        label: 'Funciones Ejecutivas', 
        options: [
          'Atención muy dispersa; requiere estímulos constantes para focalizar.',
          'Atención breve; sigue instrucciones de un solo paso con mediación.',
          'Atención sostenida en tareas cortas; sigue instrucciones de dos pasos.',
          'Atención focalizada; sigue secuencias complejas con autonomía total.'
        ] 
      },
      { 
        id: 'flexibilidad', 
        label: 'Flexibilidad Cognitiva', 
        options: [
          'Gran dificultad ante cambios: desregulación frente a lo imprevisto.',
          'Acepta cambios en la rutina si se anticipan con apoyo visual.',
          'Adapta su conducta ante cambios moderados con mínima mediación.',
          'Alta flexibilidad; se ajusta a cambios imprevistos de forma autónoma.'
        ] 
      },
      { 
        id: 'sensorial', 
        label: 'Procesamiento Sensorial', 
        options: [
          'Responde con desregulación ante estímulos ambientales (ruidos/luces).',
          'Presenta sensibilidad alta; requiere espacios tranquilos para calmarse.',
          'Registra estímulos ambientales sin que afecten significativamente su tarea.',
          'Alta tolerancia sensorial; se autorregula adecuadamente en entornos activos.'
        ] 
      },
      { 
        id: 'intereses', 
        label: 'Intereses y Fortalezas', 
        options: [
          'Su interés es restringido a objetos únicos sin variante.',
          'Presenta intereses identificables que sirven como motivadores de tarea.',
          'Utiliza sus pasiones para realizar actividades y socializar con pares.',
          'Transfiere sus habilidades destacadas a múltiples contextos escolares.'
        ] 
      },
      { 
        id: 'apoyos', 
        label: 'Apoyos eficaces', 
        options: [
          'Requiere apoyos físicos y contacto directo constante.',
          'Requiere agendas visuales y soportes concretos permanentes.',
          'Utiliza apoyos puntuales ante tareas nuevas o de alta complejidad.',
          'Autónomo; requiere apoyos mínimos solo para organización avanzada.'
        ] 
      }
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

  const renderCriterios = () => {
    const nivel = selectedStudent?.level || 'Inicial';
    const indicadores = CONFIG_INDICADORES[tipoInforme]?.[nivel] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || [];
    return indicadores.map(c => (
      <div key={c.id} className="space-y-2 mb-4">
        <label className="text-xs font-black uppercase text-gray-500">{c.label}</label>
        <div className="grid grid-cols-2 gap-2">
          {c.options.map(opt => (
            <button key={opt} onClick={() => setAnswers(p => ({...p, [c.id]: opt}))} className={`p-3 rounded-xl font-black text-[10px] uppercase border-2 ${answers[c.id] === opt ? 'bg-violet-600 text-white border-violet-700' : 'bg-gray-50 border-gray-100'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    ));
  };

return (
    <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 rounded-[40px] shadow-xl text-white mb-8">
        <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><BookOpen size={28} /> Gestión de Informes</h2>
        <p className="text-violet-100 text-sm">Mostrando: {filteredStudents.length} alumnos.</p>
      </div>

      {stage === 'main' ? (
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
      ) : (
        <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-4 animate-in fade-in">
          <button onClick={() => setStage('main')} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
          <h3 className="font-black text-xl">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
          <p className="text-xs font-bold text-violet-600 uppercase">GRUPO: {grupoFiltro}</p>
          {renderCriterios()}
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border" placeholder="Observaciones..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">Guardar</button>
        </div>
      )}
    </div>
  );
}
