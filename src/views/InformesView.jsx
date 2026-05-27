import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase, Search, Printer, Trash2, Edit3, Plus } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, where, deleteDoc } from 'firebase/firestore';

const CONFIG_INDICADORES = {
  pedagogico: {
    'Inicial': [
      { id: 'p1', label: 'Lectoescritura', options: ['Presilábico', 'Silábico', 'Alfabético'] },
      { id: 'p2', label: 'Comprensión', options: ['No logra', 'Con ayuda', 'Autónoma'] }
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
  const [stage, setStage] = useState('main'); // 'main' (lista) o 'form' (edición)
  const [tipoInforme, setTipoInforme] = useState('pedagogico');
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [nivelFiltro, setNivelFiltro] = useState('Todos');
  
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
      tipoInforme, informeNum, answers, observations, updatedAt: serverTimestamp()
    }, { merge: true });
    setStage('main');
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20">
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Gestión de Informes</h2>
        {stage !== 'main' && <button onClick={() => setStage('main')} className="bg-gray-100 p-2 rounded-full"><X/></button>}
      </div>

      {stage === 'main' ? (
        <div className="space-y-4">
          <div className="flex gap-2 p-2 bg-white rounded-2xl border">
            {['pedagogico', 'laboral'].map(t => (
              <button key={t} onClick={() => setTipoInforme(t)} className={`flex-1 p-3 rounded-xl font-black capitalize ${tipoInforme === t ? 'bg-violet-600 text-white' : 'bg-gray-100'}`}>{t}</button>
            ))}
          </div>
          <input className="w-full p-4 rounded-2xl border" placeholder="Buscar estudiante..." onChange={e => setSearchTerm(e.target.value)} />
          
          <div className="bg-white rounded-3xl shadow-sm border divide-y">
            {students.filter(s => `${s.lastName} ${s.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => {
              const report = savedReports.find(r => r.studentId === s.id && r.tipoInforme === tipoInforme);
              return (
                <div key={s.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-bold">{s.lastName}, {s.firstName}</p>
                    <p className="text-xs text-gray-400">{report ? 'Informe cargado' : 'Sin informe'}</p>
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
        <div className="bg-white p-6 rounded-[40px] shadow-lg border space-y-4">
          {/* Aquí iría tu renderCriterios y el botón de finalizar */}
          <button onClick={handleSaveInforme} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">Guardar</button>
        </div>
      )}
    </div>
  );
}
