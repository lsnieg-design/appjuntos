import React, { useState } from 'react';
import { 
  X, Phone, MessageSquare, MapPin, Calendar, 
  User, Shield, FileText, Activity, Heart, Printer,
  CheckCircle2, AlertTriangle, Send, RefreshCw, Star
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, serverTimestamp, increment } from 'firebase/firestore';

export function StudentDetailView({ student, onClose, onEdit, db, appId, user }) {
  const [loading, setLoading] = useState(false);
  const [quickNote, setQuickNote] = useState('');

  if (!student) return null;

  const calculateAge = (d) => {
    if (!d) return '-';
    const t = new Date();
    const b = new Date(d);
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  };

  // --- FUNCIÓN: REPORTAR AUSENCIA ---
  const handleReportAbsence = async () => {
    if (!confirm(`¿Confirmás que ${student.firstName} se encuentra ausente hoy?`)) return;
    setLoading(true);
    try {
      const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
      const absenceNote = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        type: 'AUSENCIA',
        text: 'Reportado como ausente desde Mi Aula.',
        author: user.firstName + ' ' + (user.lastName || '')
      };
      
      await updateDoc(studentRef, { notes: arrayUnion(absenceNote) });

      // Premio por reportar (Mayo)
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      await updateDoc(userRef, { score: increment(2) });

      alert("✅ Ausencia registrada. ¡Sumaste 2 puntos!");
      onClose();
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  // --- FUNCIÓN: GUARDAR BITÁCORA RÁPIDA ---
  const handleSaveQuickNote = async (e) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    setLoading(true);
    try {
      const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
      const newEntry = {
        id: Date.now().toString(),
        date: new Date().toISOString().split('T')[0],
        type: 'SEGUIMIENTO',
        text: quickNote.trim(),
        author: user.firstName + ' ' + (user.lastName || '')
      };
      await updateDoc(studentRef, { notes: arrayUnion(newEntry) });
      setQuickNote('');
      alert("📝 Nota guardada en la bitácora.");
    } catch (e) { alert("Error: " + e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[250] flex items-center justify-center p-2 md:p-4">
      <div className="bg-white rounded-[40px] w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[95vh]">
        
        {/* CABECERA DINÁMICA */}
        <div className="bg-violet-700 p-6 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 p-2 rounded-full hover:bg-white/30 transition"><X size={20}/></button>
          <div className="flex gap-5 items-center">
            <div className="w-20 h-20 bg-white/20 rounded-3xl border-2 border-white/40 overflow-hidden flex items-center justify-center font-black text-3xl shadow-inner">
              {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover"/> : student.firstName?.[0]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-black uppercase leading-none tracking-tight">{student.lastName}, {student.firstName}</h2>
              <p className="text-violet-200 font-bold text-[10px] uppercase mt-1.5 tracking-[2px]">{student.level} • {calculateAge(student.birthDate)} AÑOS</p>
              <div className="flex gap-2 mt-3">
                 {student.allergies && <span className="bg-red-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase flex items-center gap-1"><AlertTriangle size={10}/> Alergia</span>}
                 {student.medication && <span className="bg-orange-500 text-white text-[8px] font-black px-2 py-1 rounded-full uppercase flex items-center gap-1"><Activity size={10}/> Medicado</span>}
              </div>
            </div>
          </div>
        </div>

        {/* CUERPO SCROLLEABLE */}
        <div className="p-5 overflow-y-auto space-y-6 no-scrollbar">
          
          {/* BITÁCORA EXPRES */}
          <div className="bg-violet-50 p-5 rounded-[30px] border border-violet-100 shadow-inner">
            <h4 className="text-violet-800 font-black text-[10px] uppercase mb-3 flex items-center gap-2">
              <FileText size={14}/> Bitácora Exprés (Seguimiento Hoy)
            </h4>
            <form onSubmit={handleSaveQuickNote} className="space-y-3">
              <textarea 
                value={quickNote}
                onChange={(e) => setQuickNote(e.target.value)}
                placeholder="Escribí un avance, observación o novedad del día..."
                className="w-full p-4 bg-white rounded-2xl border-none outline-none text-sm font-medium shadow-sm h-24 resize-none"
              />
              <button 
                type="submit" 
                disabled={loading || !quickNote.trim()}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <RefreshCw className="animate-spin" size={14}/> : <><Send size={14}/> Guardar en Legajo</>}
              </button>
            </form>
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div className="grid grid-cols-2 gap-3">
             <button 
                onClick={handleReportAbsence}
                className="bg-white border-2 border-orange-100 p-4 rounded-3xl flex flex-col items-center gap-2 hover:bg-orange-50 transition group"
             >
                <div className="bg-orange-100 p-3 rounded-2xl text-orange-600 group-hover:scale-110 transition"><Calendar size={24}/></div>
                <span className="text-[10px] font-black text-orange-800 uppercase">Reportar Ausencia</span>
             </button>
             
             <a 
                href={student.phone ? `https://wa.me/${student.phone.replace(/\D/g,'')}` : '#'} 
                target="_blank"
                className="bg-white border-2 border-emerald-100 p-4 rounded-3xl flex flex-col items-center gap-2 hover:bg-emerald-50 transition group"
             >
                <div className="bg-emerald-100 p-3 rounded-2xl text-emerald-600 group-hover:scale-110 transition"><MessageSquare size={24}/></div>
                <span className="text-[10px] font-black text-emerald-800 uppercase">Chat Familiar</span>
             </a>
          </div>

          {/* DATOS MÉDICOS DE ALERTA */}
          {(student.dx || student.allergies) && (
            <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100">
               <h4 className="text-slate-400 font-black text-[10px] uppercase mb-3 tracking-widest">Información de Salud</h4>
               {student.dx && <p className="text-sm font-bold text-slate-700 mb-2"><span className="text-slate-400">DX:</span> {student.dx}</p>}
               {student.allergies && <p className="text-sm font-bold text-red-600"><span className="text-red-300">Alergias:</span> {student.allergies}</p>}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="p-4 bg-gray-50 border-t border-gray-100 flex gap-3 shrink-0">
           <button 
             onClick={() => { onClose(); onEdit(student); }}
             className="flex-1 bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-black transition flex items-center justify-center gap-2"
           >
             <User size={16}/> Ver Legajo Completo
           </button>
        </div>
      </div>
    </div>
  );
}
