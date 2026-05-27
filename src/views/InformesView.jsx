import React, { useState, useEffect } from 'react';
import { X, ClipboardCheck, Briefcase, Printer, Trash2, Edit3, Plus, BookOpen } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, where, deleteDoc } from 'firebase/firestore';

const CONFIG_INDICADORES = {
  pedagogico: {
    'Inicial': [
      { id: 'p1', label: 'Lectoescritura', options: ['Presilábico', 'Silábico', 'Alfabético'] },
      { id: 'p2', label: 'Comprensión', options: ['No logra', 'Con ayuda', 'Autónoma'] }
    ],
    '1° Ciclo': [
      { id: 'p3', label: 'Producción escrita', options: ['Grafismos', 'Copia', 'Autónoma'] },
      { id: 'p4', label: 'Comprensión lectora', options: ['No logra', 'Con apoyo', 'Autónoma'] }
    ]
  },
  laboral: {
    'CFI': [
      { id: 'l1', label: 'Uso de herramientas', options: ['No identifica', 'Requiere ayuda', 'Autónomo'] },
      { id: 'l2', label: 'Responsabilidad', options: ['Requiere supervisión', 'Autónomo'] }
    ]
  }
};

export function InformesView({ user, db, appId }) {
  const [stage, setStage] = useState('main'); 
  const [tipoInforme, setTipoInforme] = useState('pedagogico');
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('Todos');
  const [grupoFiltro, setGrupoFiltro] = useState('Todos');
  
  const [students, setStudents] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!db || !appId) return;
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    const unsubR = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubS(); unsubR(); };
  }, [db, appId]);

  // FILTRO ESTRICTO: Solo Sede
  const estudiantesSede = students.filter(s => s.modalidad === 'Sede');
  
  const nivelesDisponibles = ['Todos', ...new Set(estudiantesSede.map(s => s.level).filter(Boolean))];
  const gruposDisponibles = ['Todos', ...new Set(estudiantesSede.flatMap(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean)))];

  const filteredStudents = estudiantesSede.filter(s => {
    const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchNivel = nivelFiltro === 'Todos' || s.level === nivelFiltro;
    const matchGrupo = grupoFiltro === 'Todos' || s.groupMorning === grupoFiltro || s.groupAfternoon === grupoFiltro || s.laboralGroup === grupoFiltro;
    return matchSearch && matchNivel && matchGrupo;
  });

  const handleEdit = (student, report) => {
    setSelectedStudent(student);
    setAnswers(report?.answers || {});
    setObservations(report?.observations || '');
    setStage('form');
  };

  const handleDelete = async (id) => {
    if (window.confirm("¿Eliminar este informe?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', id));
    }
  };

  const handleSaveInforme = async () => {
    setIsSaving(true);
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', `${selectedStudent.id}_${tipoInforme}_${informeNum}`), {
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
      level: selectedStudent.level || 'Inicial',
      tipoInforme, informeNum, answers, observations, updatedAt: serverTimestamp()
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
        <p className="text-violet-100 text-sm font-medium opacity-90">Seleccioná el tipo de informe, buscá al estudiante y gestioná sus evaluaciones pedagógicas o laborales.</p>
      </div>

      {stage === 'main' ? (
        <div className="space-y-4">
          <div className="flex gap-2 p-2 bg-white rounded-2xl border">
            {['pedagogico', 'laboral'].map(t => (
              <button key={t} onClick={() => setTipoInforme(t)} className={`flex-1 p-3 rounded-xl font-black capitalize ${tipoInforme === t ? 'bg-violet-600 text-white' : 'bg-gray-100'}`}>{t}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input className="p-4 rounded-2xl border bg-white" placeholder="Buscar alumno..." onChange={e => setSearchTerm(e.target.value)} />
            <select className="p-4 rounded-2xl border bg-white" onChange={e => setNivelFiltro(e.target.value)}>{nivelesDisponibles.map(n => <option key={n}>{n}</option>)}</select>
            <select className="p-4 rounded-2xl border bg-white" onChange={e => setGrupoFiltro(e.target.value)}>{gruposDisponibles.map(g => <option key={g}>{g}</option>)}</select>
          </div>
          
          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {filteredStudents.map(s => {
              const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme);
              return (
                <div key={s.id} className="p-5 flex justify-between items-center hover:bg-violet-50/50">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] uppercase font-bold text-gray-400">{s.level} | {report ? 'Cargado' : 'Pendiente'}</p>
                  </div>
                  <div className="flex gap-2">
                    {report ? (
                      <>
                        <button onClick={() => handleEdit(s, report)} className="p-2 bg-blue-50 text-blue-600 rounded-lg"><Edit3 size={16}/></button>
                        <button onClick={() => window.print()} className="p-2 bg-green-50 text-green-600 rounded-lg"><Printer size={16}/></button>
                        <button onClick={() => handleDelete(report.id)} className="p-2 bg-red-50 text-red-600 rounded-lg"><Trash2 size={16}/></button>
                      </>
                    ) : (
                      <button onClick={() => handleEdit(s, null)} className="p-2 bg-violet-600 text-white rounded-lg"><Plus size={16}/></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-4">
          <div className="flex items-center gap-4 border-b pb-4">
             <button onClick={() => setStage('main')} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
             <h3 className="font-black text-xl">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
          </div>
          {renderCriterios()}
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border" placeholder="Observaciones..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">{isSaving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      )}
    </div>
  );
}
