import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase, Search, Printer, Trash2, Edit3 } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, deleteDoc, query, where } from 'firebase/firestore';

export function InformesView({ user, db, appId }) {
  const [stage, setStage] = useState('select_type');
  const [tipoInforme, setTipoInforme] = useState(null);
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS ESENCIALES (AQUÍ ESTÁ EL FIX)
  const [students, setStudents] = useState([]); 
  const [savedReports, setSavedReports] = useState([]);
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // EFECTO PARA CARGAR ESTUDIANTES E INFORMES
  useEffect(() => {
    if (!db || !appId) return;
    
    // Cargar Estudiantes
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Cargar Informes
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    const unsubR = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubS(); unsubR(); };
  }, [db, appId]);

  // CRITERIOS
  const CRITERIOS = {
    pedagogico: [
      { id: 'p1', label: 'Participación en propuestas', options: ['Logrado', 'En Proceso', 'Iniciado', 'No Observado'] },
      { id: 'p2', label: 'Vinculación con pares', options: ['Logrado', 'En Proceso', 'Iniciado', 'No Observado'] }
    ],
    laboral: [
      { id: 'l1', label: 'Uso de herramientas', options: ['Logrado', 'En Proceso', 'Iniciado', 'No Observado'] },
      { id: 'l2', label: 'Responsabilidad de rol', options: ['Logrado', 'En Proceso', 'Iniciado', 'No Observado'] }
    ]
  };

  const handleSaveInforme = async () => {
    if (!selectedStudent) return;
    setIsSaving(true);
    const docId = `${selectedStudent.id}_${tipoInforme}_${informeNum}`;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports', docId), {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
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
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20 animate-in fade-in">
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Informes</h2>
        {stage !== 'select_type' && <button onClick={() => setStage('select_type')} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>}
      </div>

      {stage === 'select_type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{t:'pedagogico', l:'PEDAGÓGICO', icon: ClipboardCheck}, {t:'laboral', l:'LABORAL', icon: Briefcase}].map(item => (
            <button key={item.t} onClick={() => { setTipoInforme(item.t); setStage('select_number'); }} className="p-8 bg-white rounded-3xl border-2 hover:border-violet-500 shadow-sm transition-all flex items-center gap-4">
              <div className="bg-violet-100 p-4 rounded-2xl text-violet-600"><item.icon size={32}/></div>
              <span className="font-black text-violet-900 text-lg">{item.l}</span>
            </button>
          ))}
        </div>
      )}

      {stage === 'select_number' && (
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map(n => (
            <button key={n} onClick={() => { setInformeNum(n); setStage('select_student'); }} className="bg-white p-8 rounded-3xl border-2 border-violet-100 font-black text-2xl text-violet-800 shadow-sm hover:bg-violet-50">{n}°</button>
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

          {(CRITERIOS[tipoInforme] || []).map(c => (
            <div key={c.id} className="space-y-2">
              <label className="font-black text-xs uppercase text-gray-500">{c.label}</label>
              <div className="grid grid-cols-2 gap-2">
                {c.options.map(opt => (
                  <button key={opt} onClick={() => setAnswers(p => ({ ...p, [c.id]: opt }))} className={`py-3 rounded-xl font-black text-[10px] uppercase border-2 transition ${answers[c.id] === opt ? 'bg-violet-600 text-white border-violet-600' : 'bg-gray-50'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <textarea className="w-full p-4 bg-gray-50 rounded-2xl text-sm border outline-none" placeholder="Observaciones..." value={observations} onChange={e => setObservations(e.target.value)} rows={4}/>
          <button onClick={handleSaveInforme} disabled={isSaving} className="w-full py-4 bg-violet-800 text-white font-black uppercase rounded-2xl shadow-xl">{isSaving ? 'Guardando...' : 'Finalizar'}</button>
        </div>
      )}
    </div>
  );
}
