import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, query, where } from 'firebase/firestore';

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
  const [stage, setStage] = useState('select_type');
  const [tipoInforme, setTipoInforme] = useState(null);
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADO ÚNICO PARA ESTUDIANTES
  const [students, setStudents] = useState([]);
  const [savedReports, setSavedReports] = useState([]);
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!db || !appId) return;
    
    // Carga de estudiantes
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Carga de informes
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    const unsubR = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubS(); unsubR(); };
  }, [db, appId]);

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

  const handleSaveInforme = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', `${selectedStudent.id}_${tipoInforme}_${informeNum}`), {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName || ''}, ${selectedStudent.firstName || ''}`,
        level: selectedStudent.level || 'Inicial',
        tipoInforme,
        informeNum,
        answers,
        observations,
        updatedAt: serverTimestamp()
      }, { merge: true });
      alert("✅ Informe guardado.");
      setStage('select_type');
    } catch (e) { alert("Error: " + e.message); } finally { setIsSaving(false); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-in fade-in">
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center mb-6">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Informes</h2>
        {stage !== 'select_type' && <button onClick={() => setStage('select_type')} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>}
      </div>

      {stage === 'select_type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{t:'pedagogico', l:'PEDAGÓGICO'}, {t:'laboral', l:'LABORAL'}].map(item => (
            <button key={item.t} onClick={() => { setTipoInforme(item.t); setStage('select_number'); }} className="p-8 bg-white rounded-3xl border-2 hover:border-violet-300 shadow-sm">
              <span className="font-black text-violet-900">{item.l}</span>
            </button>
          ))}
        </div>
      )}

      {stage === 'select_number' && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => { setInformeNum(n); setStage('select_student'); }} className="bg-white p-8 rounded-3xl border-2 font-black text-2xl text-violet-800 shadow-sm">{n}°</button>
          ))}
        </div>
      )}

      {stage === 'select_student' && (
        <div className="bg-white rounded-3xl shadow-sm border p-4">
          <input className="w-full p-4 bg-gray-50 rounded-xl mb-4" placeholder="Buscar..." onChange={(e) => setSearchTerm(e.target.value)} />
          {students.filter(s => `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
            <button key={s.id} onClick={() => { setSelectedStudent(s); setStage('form'); }} className="w-full text-left p-3 hover:bg-violet-50 rounded-xl font-bold text-sm">
              {s.lastName}, {s.firstName}
            </button>
          ))}
        </div>
      )}

      {stage === 'form' && selectedStudent && (
        <div className="bg-white p-6 rounded-[40px] shadow-lg border space-y-4">
          <h3 className="font-black text-xl">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
          {renderCriterios()}
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border" placeholder="Observaciones..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">Finalizar</button>
        </div>
      )}
    </div>
  );
}
