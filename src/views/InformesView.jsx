import React, { useState, useEffect } from 'react';
import { X, Printer, Trash2, Edit3, Plus, BookOpen, CheckCircle } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, deleteDoc } from 'firebase/firestore';

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
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
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
  const nivelesDisponibles = ['Todos', ...new Set(estudiantesSede.map(s => s.level).filter(Boolean))];
  const gruposDisponibles = ['Todos', ...new Set(estudiantesSede.flatMap(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean)))];

  const esGrupoCompleto = (grupo) => {
    if (grupo === 'Todos') return false;
    const alumnosDelGrupo = estudiantesSede.filter(s => [s.groupMorning, s.groupAfternoon, s.laboralGroup].includes(grupo));
    const reportes = savedReports.filter(r => r.tipoInforme === tipoInforme && r.grupo === grupo);
    return reportes.length >= alumnosDelGrupo.length && alumnosDelGrupo.length > 0;
  };

  const filteredStudents = estudiantesSede.filter(s => {
    const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchNivel = nivelFiltro === 'Todos' || s.level === nivelFiltro;
    const matchGrupo = grupoFiltro === 'Todos' || [s.groupMorning, s.groupAfternoon, s.laboralGroup].includes(grupoFiltro);
    return matchSearch && matchNivel && matchGrupo;
  });

  const handleEdit = (student, report) => {
    setSelectedStudent(student);
    setAnswers(report?.answers || {});
    setObservations(report?.observations || '');
    setStage('form');
  };

  const handleSaveInforme = async () => {
    setIsSaving(true);
    // ID único incluye el grupo para permitir doble informe
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

          <div className="flex gap-2 overflow-x-auto pb-2">
            {gruposDisponibles.map(g => (
              <button key={g} onClick={() => setGrupoFiltro(g)} className={`px-6 py-3 rounded-2xl font-black text-xs border-2 ${grupoFiltro === g ? 'bg-violet-600 text-white border-violet-700' : esGrupoCompleto(g) ? 'bg-green-100 text-green-700 border-green-500' : 'bg-white border-gray-100'}`}>
                {g} {esGrupoCompleto(g) && <CheckCircle size={12} className="inline ml-1"/>}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {filteredStudents.map(s => {
              // Buscamos el reporte específico para este alumno EN ESTE GRUPO
              const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === grupoFiltro);
              return (
                <div key={`${s.id}-${grupoFiltro}`} className="p-5 flex justify-between items-center hover:bg-violet-50/50">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">{s.level} | {report ? 'Cargado' : 'Pendiente'}</p>
                  </div>
                  <button onClick={() => handleEdit(s, report)} className={`p-2 rounded-lg ${report ? 'bg-blue-50 text-blue-600' : 'bg-violet-600 text-white'}`}>
                    {report ? <Edit3 size={16}/> : <Plus size={16}/>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white p-8 rounded-[40px] shadow-lg border space-y-4">
          <button onClick={() => setStage('main')} className="bg-gray-100 p-2 rounded-full"><X size={18}/></button>
          <h3 className="font-black text-xl">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
          <p className="text-xs font-bold text-violet-600">GRUPO: {grupoFiltro}</p>
          {/* Tu renderCriterios acá */}
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm" value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">Guardar</button>
        </div>
      )}
    </div>
  );
}
