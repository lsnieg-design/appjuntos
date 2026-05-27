import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase, Search, Printer, Edit3, Trash2 } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';

// --- CONFIGURACIÓN DE INDICADORES ---
const CONFIG_INDICADORES = {
  pedagogico: {
    'Inicial': [
      { id: 'p_ini_1', label: 'Lectoescritura', options: ['Presilábico', 'Silábico', 'Silábico-alfabético', 'Alfabético'] },
      { id: 'p_ini_2', label: 'Escritura', options: ['Grafismos', 'Copia', 'Dictado', 'Autónoma'] },
      { id: 'p_ini_3', label: 'Comprensión', options: ['No logra', 'Con ayuda', 'Sentido global', 'Autónoma'] }
    ],
    '1° Ciclo': [
      { id: 'p_c1_1', label: 'Producción escrita', options: ['Grafismos', 'Copia', 'Autónoma'] },
      { id: 'p_c1_2', label: 'Comprensión lectora', options: ['No logra', 'Con apoyo', 'Autónoma'] }
    ]
  },
  laboral: {
    'CFI': [
      { id: 'l_cfi_1', label: 'Uso de herramientas', options: ['No identifica', 'Requiere ayuda', 'Autónomo', 'Destreza total'] },
      { id: 'l_cfi_2', label: 'Responsabilidad', options: ['Requiere supervisión', 'Cumple con apoyo', 'Autónomo', 'Proactivo'] },
      { id: 'l_cfi_3', label: 'Gestión de tiempos', options: ['No registra', 'Ritmo mínimo', 'Regula ritmo', 'Autónomo'] }
    ]
  }
};

export function InformesView({ user, students, db, appId }) { // <--- 'students' viene de acá, no lo redeclares
  const [stage, setStage] = useState('select_type');
  const [tipoInforme, setTipoInforme] = useState(null);
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedReports, setSavedReports] = useState([]);
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!db || !appId) return;
    const q = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    return onSnapshot(q, (snap) => {
      setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [db, appId]);

  const handleSaveInforme = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const docId = `${selectedStudent.id}_${tipoInforme}_${informeNum}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', docId), {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
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

  const renderCriterios = () => {
    const nivel = selectedStudent?.level || 'Inicial';
    const indicadores = CONFIG_INDICADORES[tipoInforme]?.[nivel] || CONFIG_INDICADORES[tipoInforme]?.['Inicial'] || CONFIG_INDICADORES[tipoInforme]?.['CFI'] || [];
    
    return indicadores.map(c => (
      <div key={c.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm space-y-3">
        <label className="font-black text-[10px] uppercase text-slate-500 tracking-widest">{c.label}</label>
        <div className="grid grid-cols-2 gap-2">
          {c.options.map(opt => (
            <button key={opt} onClick={() => setAnswers(p => ({ ...p, [c.id]: opt }))} className={`py-3 px-2 rounded-xl font-black text-[9px] uppercase border-2 transition-all ${answers[c.id] === opt ? 'bg-violet-600 text-white border-violet-700' : 'bg-gray-50 border-transparent'}`}>
              {opt}
            </button>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20 animate-in fade-in">
      {/* HEADER */}
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Gestión de Informes</h2>
        {stage !== 'select_type' && <button onClick={() => setStage('select_type')} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>}
      </div>

      {stage === 'select_type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{t:'pedagogico', l:'PEDAGÓGICO', color:'bg-blue-50'}, {t:'laboral', l:'LABORAL', color:'bg-emerald-50'}].map(item => (
            <button key={item.t} onClick={() => { setTipoInforme(item.t); setStage('select_number'); }} className={`p-8 ${item.color} rounded-3xl border-2 hover:border-violet-300 flex items-center justify-between shadow-sm`}>
              <span className="font-black text-violet-900 text-lg">{item.l}</span>
              <ChevronRight className="text-violet-400" />
            </button>
          ))}
        </div>
      )}

      {stage === 'select_number' && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => { setInformeNum(n); setStage('select_student'); }} className="bg-white p-8 rounded-3xl border-2 border-violet-100 font-black text-2xl text-violet-800 shadow-sm hover:bg-violet-50">
              {n}°
            </button>
          ))}
        </div>
      )}

      {stage === 'select_student' && (
        <div className="bg-white rounded-3xl shadow-sm border p-4">
          <input className="w-full p-4 bg-gray-50 rounded-xl mb-4 font-bold text-sm" placeholder="Buscar estudiante..." onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="space-y-1">
            {students.filter(s => `${s.lastName} ${s.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent(s); setStage('form'); }} className="w-full text-left p-3 hover:bg-violet-50 rounded-xl font-bold text-sm">
                {s.lastName}, {s.firstName}
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'form' && selectedStudent && (
        <div className="bg-white p-6 rounded-[40px] shadow-lg border space-y-6">
          <div className="border-b pb-4">
            <h3 className="font-black text-xl uppercase italic">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase">{tipoInforme} • {informeNum}° Informe</p>
          </div>
          {renderCriterios()}
          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border outline-none" placeholder="Observaciones..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 bg-violet-800 text-white font-black uppercase rounded-2xl shadow-xl">{isSaving ? 'Guardando...' : 'Finalizar'}</button>
        </div>
      )}
    </div>
  );
}
