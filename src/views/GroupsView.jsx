import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  User, FileText, Plus, Users, Grid, ChevronRight, ChevronLeft, Printer, MessageSquare, Send, Folder, Edit3, X, Search, GraduationCap, Activity 
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, increment, where } from 'firebase/firestore';

export function GroupsView({ user, db, appId, setActiveTab, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fullFileStudent, setFullFileStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [groupMessages, setGroupMessages] = useState({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [informeEpoca, setInformeEpoca] = useState(1);
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const scrollRef = useRef(null);
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';

  const INCIDENT_TYPES = [
    { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
    { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
  ];

  useEffect(() => {
    if (!db || !appId) return;
    const unsubS = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true)), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc')), (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGM = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc')), (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroupMessages(msgs.reduce((acc, m) => { if (!acc[m.groupName]) acc[m.groupName] = []; acc[m.groupName].push(m); return acc; }, {}));
    });
    return () => { unsubS(); unsubU(); unsubGM(); };
  }, [db, appId]);

  const groupedData = students.reduce((acc, s) => {
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const gName = s[`group${suf}`];
    if (!gName) return acc;
    if (!acc[gName]) acc[gName] = { name: gName, students: [], teacher: s[`teacher${suf}`], classroom: s.classroom, driveLink: s[`driveLink${suf}`], institucionalDrive: s.institucionalDrive };
    acc[gName].students.push(s);
    return acc;
  }, {});

  const groups = Object.values(groupedData).sort((a, b) => a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name));

  const printGroups = (list) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    let h = `<html><head><style>body{font-family:sans-serif;padding:20px;}.header{background:#f3f4f6;padding:10px;border-left:5px solid #7c3aed;margin-bottom:10px;}table{width:100%;border-collapse:collapse;font-size:11px;}th{background:#7c3aed;color:white;padding:8px;text-align:left;}td{border:1px solid #ddd;padding:8px;}</style></head><body>`;
    list.forEach(g => {
      h += `<div class="header"><h2>${g.name}</h2><p>Doc: ${g.teacher || 'S/D'} | Aula: ${g.classroom || '-'}</p></div><table><thead><tr><th>Alumno</th><th>DNI</th></tr></thead><tbody>`;
      g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).forEach(s => { h += `<tr><td>${s.lastName}, ${s.firstName}</td><td>${s.dni || '-'}</td></tr>`; });
      h += `</tbody></table><br/>`;
    });
    h += `</body></html>`;
    const doc = iframe.contentWindow.document; doc.open(); doc.write(h); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };

  const handleSaveIncident = async (type, severity = "medium", text = "") => {
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;
    setSavingIncident(true);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id), { incidents: arrayUnion({ date: new Date().toISOString(), type: text ? "Nota" : type, severity, text: text || type, author: user.fullName || user.firstName, authorId: user.id }) });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(10) });
      setShowBitacoraModal(null); setIsWriting(false); setNewNote("");
      alert("✅ Guardado.");
    } catch (e) { alert(e.message); } finally { setSavingIncident(false); }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault(); if (!editingGroup) return; setUpdatingGroup(true);
    const fd = new FormData(e.target);
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const updates = { [`group${suf}`]: fd.get('groupName'), classroom: fd.get('classroom') };
    try {
      await Promise.all(editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)));
      setEditingGroup(null);
    } catch (err) { alert(err.message); } finally { setUpdatingGroup(false); }
  };

  const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const nextStatus = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { [campo]: { status: nextStatus } });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(5) });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div><h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2></div>
          <button onClick={() => printGroups(groups)} className="bg-violet-100 text-violet-700 p-2.5 rounded-xl"><Printer size={24}/></button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl mx-2">
          <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'morning' ? 'bg-white text-orange-50 shadow-sm' : 'text-gray-400'}`}>☀️ MAÑANA</button>
          <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 TARDE</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div ref={scrollRef} className="h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start no-scrollbar">
          {groups.map((g) => (
            <div key={g.name} className="flex flex-col min-w-[320px] bg-white rounded-[35px] border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-250px)]">
              <div className={`p-5 border-b-4 relative ${turn === 'morning' ? 'border-orange-400 bg-orange-50' : 'border-indigo-400 bg-indigo-50'}`}>
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => printGroups([g])} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm"><Printer size={14}/></button>
                  <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg"><Plus size={16}/></button>
                  {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                </div>
                <h3 className="font-black text-slate-800 text-lg leading-tight pr-16 uppercase">{g.name}</h3>
                <div className="flex items-center gap-2 mt-2">
                  <span className="bg-white/80 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase">{g.students.length} Estudiantes</span>
                  {g.classroom && <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md text-[9px] font-black border border-orange-200 uppercase">Aula {g.classroom}</span>}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-2 content-start">
                {g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
                  <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer border border-transparent hover:border-violet-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 text-sm">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover rounded-xl"/> : s.firstName[0]}</div>
                      <span className="font-bold text-xs text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
                    </div>
                    <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s); setIsWriting(false);}} className="w-8 h-8 bg-violet-50 text-violet-400 rounded-full flex items-center justify-center">⚡</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailView student={selectedStudent} user={user} db={db} appId={appId} onClose={() => setSelectedStudent(null)} onEdit={(s) => { setSelectedStudent(null); setFullFileStudent(s); }} />
      )}

      {fullFileStudent && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3"><div className="bg-orange-500 p-2 rounded-xl"><GraduationCap size={20}/></div><h3 className="font-black uppercase italic tracking-tighter">Legajo Digital: {fullFileStudent.lastName}, {fullFileStudent.firstName}</h3></div>
               <button onClick={() => setFullFileStudent(null)} className="p-2 bg-white/10 rounded-full hover:bg-red-500"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6 no-scrollbar">
               <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-orange-600 font-black text-[10px] uppercase border-b-2 border-orange-100 pb-1 flex items-center gap-2"><User size={14}/> Identidad</h4>
                      <p className="text-sm"><b>DNI:</b> <span>{fullFileStudent.dni || '-'}</span></p>
                      <p className="text-sm"><b>DX:</b> <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase">{fullFileStudent.dx || 'S/D'}</span></p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase border-b-2 border-blue-100 pb-1 flex items-center gap-2"><Users size={14}/> Familia</h4>
                      <p className="text-sm"><b>Madre:</b> <span>{fullFileStudent.motherName || '-'}</span></p>
                    </div>
                  </div>
               </div>
            </div>
            <div className="p-5 bg-white border-t flex justify-center"><button onClick={() => setFullFileStudent(null)} className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs">Cerrar Legajo</button></div>
          </div>
        </div>
      )}

      {showBitacoraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl border-t-8 border-emerald-500 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">{showBitacoraModal.firstName}</p></div>
              <button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            {!isWriting ? (
              <div className="grid grid-cols-2 gap-3">
                {INCIDENT_TYPES.map((type) => (
                  <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}>
                    <span className="text-2xl">{type.emoji}</span>
                    <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="¿Qué pasó?..." className="w-full p-4 bg-gray-50 border rounded-2xl text-sm mb-3 h-32 outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setIsWriting(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px]">Cancelar</button>
                  <button onClick={() => handleSaveIncident("Nota", "medium", newNote)} disabled={!newNote.trim() || savingIncident} className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Guardar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in">
           <div className="p-4 border-b-4 border-violet-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 text-white p-2 rounded-xl shadow-lg"><Users size={20}/></div>
                <div><h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">{selectedGroupDetails.name}</h2><p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">Control de Gestión</p></div>
              </div>
              <button onClick={() => setSelectedGroupDetails(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
           </div>
           
           <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-4 bg-emerald-50 text-emerald-700 rounded-3xl font-black text-[10px] uppercase border border-emerald-100 flex items-center justify-center gap-2 shadow-sm"><Folder size={18}/> Fotos</button>
                    <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-4 bg-blue-50 text-blue-700 rounded-3xl font-black text-[10px] uppercase border border-blue-100 flex items-center justify-center gap-2 shadow-sm"><FileText size={18}/> Drive</button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setInformeEpoca(n)} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${informeEpoca === n ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Informe {n === 1 ? 'Inicial' : n === 2 ? 'Medio' : 'Final'}</button>
                    ))}
                </div>
                <div className="space-y-3 pb-20">
                  {selectedGroupDetails.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-5 bg-white rounded-[30px] border-2 border-slate-100 hover:border-violet-200 transition-all">
                      <span className="font-black text-base text-slate-700 uppercase tracking-tighter">{s.lastName}, {s.firstName}</span>
                      <button onClick={() => handleToggleInformeGrupo(s, informeEpoca)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-white shadow-md active:scale-95 transition-all ${s[`informe${informeEpoca}`]?.status === 'Pendiente' ? 'bg-slate-300' : 'bg-blue-600'}`}>{s[`informe${informeEpoca}`]?.status || 'Pendiente'}</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="w-full lg:w-[450px] bg-slate-50 border-l border-slate-200 flex flex-col">
                  <div className="p-5 bg-white/80 border-b flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg"><MessageSquare size={18}/></div>
                    <div><h3 className="font-black text-slate-800 uppercase italic text-sm">Muro</h3></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col-reverse space-y-3 custom-scrollbar">
                      {groupMessages[selectedGroupDetails.name]?.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.authorId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-[25px] shadow-sm ${m.authorId === user.id ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'}`}>
                            <p className="text-[9px] font-black uppercase mb-1">{m.author}</p>
                            <p className="text-sm font-medium leading-tight">{m.text}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="p-6 bg-white border-t-2 border-slate-100 flex gap-2">
                    <input name="comment" autoComplete="off" placeholder="Escribir novedad..." className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-[30px] text-sm font-bold text-slate-700 outline-none focus:border-orange-300" />
                    <button type="submit" className="bg-orange-500 text-white p-4 rounded-full shadow-lg"><Send size={20}/></button>
                  </form>
              </div>
           </div>
        </div>
      )}

      {editingGroup && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3><button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button></div>
               <div className="space-y-4">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nombre Grupo</label><input name="groupName" defaultValue={editingGroup.name} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm uppercase outline-none focus:ring-2 ring-violet-100 border-b-2 border-violet-200" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Aula Física</label><input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" /></div>
                  <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4 hover:scale-[1.02] transition-all">{updatingGroup ? "Guardando..." : "Aplicar Cambios"}</button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
}
