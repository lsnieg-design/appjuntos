import React, { useState, useEffect } from 'react';
import { ChevronRight, X, ClipboardCheck, Briefcase, Search, Printer, Trash2, Edit3 } from 'lucide-react';
import { doc, setDoc, onSnapshot, serverTimestamp, collection, deleteDoc, query, where } from 'firebase/firestore';

// Indicadores configurados
const CRITERIOS = {
  pedagogico: [
    { id: 'lecto', label: 'Lectoescritura', options: ['Presilábico', 'Silábico', 'Silábico-alfabético', 'Alfabético'] },
    { id: 'escritura', label: 'Escritura', options: ['Requiere guía física', 'Copia', 'Dictado fonético', 'Autónoma/Creativa'] },
    { id: 'comprension', label: 'Comprensión', options: ['No logra', 'Textos breves (ayuda)', 'Sentido global', 'Autónoma'] },
    { id: 'reconocimiento', label: 'Reconocimiento', options: ['Solo nombre propio', 'Nombre y pares', 'Palabras frecuentes', 'Lectura fluida'] }
  ],
  laboral: [
    { id: 'herramientas', label: 'Uso de herramientas', options: ['No identifica', 'Con apoyo visual', 'Con supervisión', 'Autonomía total'] },
    { id: 'produccion', label: 'Proceso productivo', options: ['No logra', 'Acciones aisladas', 'Secuencias simples', 'Proceso completo autónomo'] },
    { id: 'responsabilidad', label: 'Responsabilidad de rol', options: ['Requiere supervisión', 'Cumple con apoyo', 'Autonomía en rol', 'Proactivo'] },
    { id: 'tiempos', label: 'Gestión de tiempos', options: ['No registra', 'Ritmo mínimo', 'Regula su ritmo', 'Autónomo'] }
  ]
};

export function InformesView({ user, db, appId }) {
  const [stage, setStage] = useState('select_type');
  const [tipoInforme, setTipoInforme] = useState(null);
  const [informeNum, setInformeNum] = useState('1');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS LOCALES PROTEGIDOS
  const [students, setStudents] = useState([]); 
  const [savedReports, setSavedReports] = useState([]);
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!db || !appId) return;

    // Carga autónoma de alumnos
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // Carga de informes
    const qR = collection(db, 'artifacts', appId, 'public', 'data', 'pedagogical_reports');
    const unsubReports = onSnapshot(qR, (snap) => setSavedReports(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubStudents(); unsubReports(); };
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

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6 pb-20 animate-in fade-in">
      <div className="bg-white p-6 rounded-[40px] shadow-sm border flex justify-between items-center">
        <h2 className="text-xl font-black text-violet-900 uppercase italic">Informes</h2>
        {stage !== 'select_type' && <button onClick={() => setStage('select_type')} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>}
      </div>

      {stage === 'select_type' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[{t:'pedagogico', l:'PEDAGÓGICO', color:'bg-blue-50'}, {t:'laboral', l:'LABORAL', color:'bg-emerald-50'}].map(item => (
            <button key={item.t} onClick={() => { setTipoInforme(item.t); setStage('select_number'); }} className={`p-8 ${item.color} rounded-3xl border-2 hover:border-violet-500 shadow-sm transition-all flex items-center justify-between`}>
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
           {/* ... aquí iría el formulario igual al anterior ... */}
           <button onClick={handleSaveInforme} className="w-full py-4 bg-violet-800 text-white font-black rounded-2xl">Guardar</button>
        </div>
      )}
    </div>
  );
}
