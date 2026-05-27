import React, { useState, useEffect } from 'react';
import { X, Printer, Trash2, Edit3, Plus, BookOpen, CheckCircle } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, deleteDoc } from 'firebase/firestore';

// ... (CONFIG_INDICADORES igual)

export function InformesView({ user, db, appId }) {
  const [stage, setStage] = useState('main'); 
  const [tipoInforme, setTipoInforme] = useState('pedagogico');
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
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

  // 1. Lógica para expandir alumnos con múltiples grupos
  const listaExpandida = students.flatMap(s => {
    const grupos = [s.groupMorning, s.groupAfternoon, s.laboralGroup].filter(Boolean);
    if (grupos.length === 0) return [{ ...s, grupoAsignado: 'Sin Grupo' }];
    return grupos.map(g => ({ ...s, grupoAsignado: g }));
  });

  const gruposDisponibles = ['Todos', ...new Set(listaExpandida.map(s => s.grupoAsignado))].sort();

  // 2. Filtramos la lista expandida
  const filteredStudents = listaExpandida.filter(s => {
    const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchGrupo = grupoFiltro === 'Todos' || s.grupoAsignado === grupoFiltro;
    return matchSearch && matchGrupo;
  });

  const esGrupoCompleto = (grupo) => {
    if (grupo === 'Todos') return false;
    const alumnosDelGrupo = listaExpandida.filter(s => s.grupoAsignado === grupo);
    const reportesEnGrupo = savedReports.filter(r => r.tipoInforme === tipoInforme && r.grupo === grupo);
    return reportesEnGrupo.length >= alumnosDelGrupo.length && alumnosDelGrupo.length > 0;
  };

  const handleSaveInforme = async () => {
    setIsSaving(true);
    // Usamos grupoAsignado para que el ID sea único por grupo
    const idUnico = `${selectedStudent.id}_${tipoInforme}_${selectedStudent.grupoAsignado.replace(/\s+/g, '_')}`;
    await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', idUnico), {
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
      grupo: selectedStudent.grupoAsignado,
      tipoInforme,
      answers,
      observations,
      updatedAt: serverTimestamp()
    }, { merge: true });
    setStage('main');
    setIsSaving(false);
  };

  // ... (handleEdit, renderCriterios siguen igual)

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in">
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-8 rounded-[40px] shadow-xl text-white mb-8">
        <h2 className="text-2xl font-black mb-2 flex items-center gap-3"><BookOpen size={28} /> Gestión de Informes</h2>
        <p className="text-violet-100 text-sm">Mostrando: {filteredStudents.length} registros (alumnos por grupo).</p>
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
              <button key={g} onClick={() => setGrupoFiltro(g)} className={`px-6 py-3 rounded-2xl font-black text-xs border-2 ${grupoFiltro === g ? 'bg-violet-600 text-white' : esGrupoCompleto(g) ? 'bg-green-100 text-green-700 border-green-500' : 'bg-white border-gray-100'}`}>
                {g} {esGrupoCompleto(g) && <CheckCircle size={12} className="inline ml-1"/>}
              </button>
            ))}
          </div>

          <input className="w-full p-4 rounded-2xl border bg-white" placeholder="Buscar alumno..." onChange={e => setSearchTerm(e.target.value)} />
          
          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {filteredStudents.map((s, index) => {
              const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme && r.grupo === s.grupoAsignado);
              return (
                <div key={`${s.id}-${s.grupoAsignado}-${index}`} className="p-5 flex justify-between items-center hover:bg-violet-50/50">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase">Grupo: {s.grupoAsignado} | {report ? 'Cargado' : 'Pendiente'}</p>
                  </div>
                  <button onClick={() => { setSelectedStudent(s); setAnswers(report?.answers || {}); setObservations(report?.observations || ''); setStage('form'); }} className={`p-2 rounded-lg ${report ? 'bg-blue-50 text-blue-600' : 'bg-violet-600 text-white'}`}>
                    {report ? <Edit3 size={16}/> : <Plus size={16}/>}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ... stage === 'form' (el formulario de edición) ... */
      )}
    </div>
  );
}
