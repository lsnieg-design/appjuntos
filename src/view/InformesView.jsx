import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase, Search } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection } from 'firebase/firestore';

// --- CONFIGURACIÓN DE INDICADORES (Basado en tus PDFs) ---
const CONFIG_INDICADORES = {
  pedagogico: {
    'Inicial': [
      { id: 'p_ini_1', label: 'Lectoescritura', options: ['Presilábico', 'Silábico', 'Silábico-alfabético', 'Alfabético'] },
      { id: 'p_ini_2', label: 'Escritura', options: ['Grafismos', 'Copia', 'Dictado', 'Autónoma'] },
      { id: 'p_ini_3', label: 'Comprensión', options: ['No logra', 'Con ayuda', 'Sentido global', 'Autónoma'] },
      { id: 'p_ini_4', label: 'Reconocimiento', options: ['Solo nombre', 'Nombre y pares', 'Palabras frec.', 'Fluida'] }
    ],
    '1° Ciclo': [
      { id: 'p_c1_1', label: 'Producción escrita', options: ['Grafismos', 'Copia', 'Dictado', 'Autónoma'] },
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

export function InformesView({ user, students, db, appId }) {
  const [stage, setStage] = useState('select_type'); // select_type, select_number, select_student, form
  const [tipoInforme, setTipoInforme] = useState(null);
  const [informeNum, setInformeNum] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      alert("✅ Informe guardado con éxito.");
      setStage('select_type');
      setAnswers({});
      setObservations('');
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
            <button 
              key={opt}
              onClick={() => setAnswers(p => ({ ...p, [c.id]: opt }))}
              className={`py-3 px-2 rounded-xl font-black text-[9px] uppercase border-2 transition-all ${
                answers[c.id] === opt 
                ? (tipoInforme === 'pedagogico' ? 'bg-blue-600 text-white border-blue-700' : 'bg-emerald-600 text-white border-emerald-700') 
                : 'bg-gray-50 border-transparent hover:bg-gray-100'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    ));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-20 animate-in fade-in">
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Informes</h2>
        {stage !== 'select_type' && <button onClick={() => setStage('select_type')} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>}
      </div>

      {stage === 'select_type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{t:'pedagogico', l:'PEDAGÓGICO', color:'bg-blue-50', icon: ClipboardCheck}, {t:'laboral', l:'LABORAL', color:'bg-emerald-50', icon: Briefcase}].map(item => (
            <button key={item.t} onClick={() => { setTipoInforme(item.t); setStage('select_number'); }} className={`p-8 ${item.color} rounded-3xl border-2 border-transparent hover:border-violet-300 flex items-center gap-4 shadow-sm transition-all`}>
              <div className="bg-white/50 p-4 rounded-2xl"><item.icon size={32}/></div>
              <span className="font-black text-violet-900 text-lg">{item.l}</span>
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
        <div className="bg-white rounded-3xl shadow-sm border p-6">
          <input className="w-full p-4 bg-gray-50 rounded-xl mb-4 font-bold text-sm" placeholder="Buscar estudiante..." onChange={(e) => setSearchTerm(e.target.value)} />
          <div className="space-y-1">
            {students.filter(s => `${s.lastName} ${s.firstName}`.toLowerCase().includes(searchTerm.toLowerCase())).map(s => (
              <button key={s.id} onClick={() => { setSelectedStudent(s); setStage('form'); }} className="w-full text-left p-3 hover:bg-violet-50 rounded-xl font-bold text-sm">
                {s.lastName}, {s.firstName} <span className="text-[10px] text-gray-400">({s.level})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {stage === 'form' && selectedStudent && (
        <div className="bg-white p-6 rounded-[40px] shadow-lg border space-y-6 animate-in slide-in-from-bottom-4">
          <div className="border-b pb-4">
            <h3 className="font-black text-xl uppercase italic">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
            <p className="text-xs font-bold text-gray-400 uppercase">{tipoInforme} • {informeNum}° Informe</p>
          </div>

          {renderCriterios()}

          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border outline-none" placeholder="Observaciones adicionales..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 bg-violet-800 text-white font-black uppercase rounded-2xl shadow-xl hover:bg-violet-900 transition">
            {isSaving ? 'Guardando...' : 'Finalizar Informe'}
          </button>
        </div>
      )}
    </div>
  );
}
