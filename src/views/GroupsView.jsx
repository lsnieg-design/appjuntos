import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, 
  RefreshCw, Plus, Trash2, Users, Grid, ChevronRight, 
  ChevronLeft, Printer, MessageSquare, Send, Folder, 
  Edit3, Star, X, Search, LayoutDashboard, AlertTriangle,
  Smartphone, GraduationCap, UploadCloud, PieChart, Eye, Trophy,
  Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, 
  CheckCircle2, Clock3, UserCheck, ChevronUp, Clock, Shield, Crown, Activity
} from 'lucide-react';
import { 
  doc, updateDoc, collection, query, orderBy, 
  onSnapshot, addDoc, serverTimestamp, arrayUnion, 
  increment, where, deleteDoc // <--- AGREGAR deleteDoc ACÁ
} from 'firebase/firestore';

export function GroupsView({ user, db, appId, setActiveTab }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [activeTabModal, setActiveTabModal] = useState('info');
  const [groupMessages, setGroupMessages] = useState({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [informeEpoca, setInformeEpoca] = useState(1);
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printColumns, setPrintColumns] = useState({
    dni: true, birthDate: true, healthInsurance: false, contacts: true, photo: false
  });

  const scrollRef = useRef(null); 
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
  const LOGO_URL = "/icon-192.png";

  // LISTA COMPLETA DE 13 BOTONES (Para que coincida con el rayo)
const INCIDENT_TYPES = [
    { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Ayudó a un amigo", emoji: "🤝", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Logro de Aprendizaje", emoji: "🚀", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
    { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-blue-100 border-blue-300 text-blue-800" }, 
    { label: "No trabajó", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-blue-50 border-blue-200 text-blue-700" }, 
    { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-indigo-100 border-indigo-300 text-indigo-800" }, 
];

  useEffect(() => {
    if (!db || !appId) return;
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qGM = query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc'));
    const unsubGM = onSnapshot(qGM, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const groupedMsgs = msgs.reduce((acc, m) => {
        if (!acc[m.groupName]) acc[m.groupName] = [];
        acc[m.groupName].push(m);
        return acc;
      }, {});
      setGroupMessages(groupedMsgs);
    });
    return () => { unsubS(); unsubU(); unsubGM(); };
  }, [db, appId]);

  const groupedData = students.reduce((acc, s) => {
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    if (s.modality === 'Inclusión') {
      const dais = [...new Set([s.daiMorning, s.daiAfternoon].filter(Boolean))];
      dais.forEach(daiName => {
        const groupKey = `DAI: ${daiName}`;
        if (!acc[groupKey]) acc[groupKey] = { name: groupKey, students: [], teacher: daiName, teacherId: s.daiId, isInclusionGroup: true };
        if (!acc[groupKey].students.find(x => x.id === s.id)) acc[groupKey].students.push(s);
      });
    } else {
      const groupName = s[`group${suf}`];
      if (!groupName) return acc;
      const groupKey = groupName.trim();
      if (!acc[groupKey]) { 
        acc[groupKey] = { 
          name: groupKey, students: [], teacher: s[`teacher${suf}`], teacherId: s[`teacherId${suf}`], 
          teacher2: s[`teacher2${suf}`], teacherId2: s[`teacherId2${suf}`], 
          aux: s[`aux${suf}`], auxId: s[`auxId${suf}`], classroom: s.classroom, 
          driveLink: s[`driveLink${suf}`], institucionalDrive: s.institucionalDrive, isInclusionGroup: false 
        }; 
      }
      acc[groupKey].students.push(s); 
    }
    return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name));

  if (!isManagement) {
    groups = groups.filter(g => {
      const uId = user.id;
      const staffIds = [g.teacherId, g.teacherId2, g.auxId, g.special1Id, g.special2Id, g.special3Id];
      return staffIds.includes(uId) || g.students.some(s => s.daiId === uId);
    });
  } else if (viewFilter !== 'all') {
    groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup);
  }

  // --- FUNCIONES RECUPERADAS ---
  const handleSaveIncident = async (type, severity = "medium", text = "") => {
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;
    setSavingIncident(true);
    const newInc = { date: new Date().toISOString(), type: text ? "Nota" : type, severity, text: text || type, author: user.fullName || user.firstName, authorId: user.id }; 
    try { 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id), { incidents: arrayUnion(newInc) }); 
      if (new Date() >= new Date('2026-05-01')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(10) });
      }
      setNewNote(""); setIsWriting(false); setShowBitacoraModal(null);
      alert("✅ Registro guardado (+10 pts).");
    } catch (e) { alert("Error: " + e.message); } 
    finally { setSavingIncident(false); }
  };

  const handleUpdateGroup = async (e) => { 
    e.preventDefault(); 
    if (!editingGroup) return; 
    setUpdatingGroup(true);
    const fd = new FormData(e.target);
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const getName = (id) => usersList.find(u => u.id === id)?.fullName || "";
    const updates = { 
      [`group${suf}`]: fd.get('groupName'), 
      classroom: fd.get('classroom'),
      [`teacherId${suf}`]: fd.get('teacher'),
      [`teacher${suf}`]: getName(fd.get('teacher')),
      [`driveLink${suf}`]: fd.get('driveLink'),
      institucionalDrive: fd.get('institucionalDrive')
    };
    try {
      await Promise.all(editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)));
      setEditingGroup(null);
    } catch (err) { alert(err.message); }
    finally { setUpdatingGroup(false); }
  };

  const handleAddGroupComment = async (e, groupName) => {
    e.preventDefault();
    const text = e.target.comment.value;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), { groupName, text, author: user.firstName, authorId: user.id, createdAt: serverTimestamp() });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };

  const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const nextStatus = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { [campo]: { status: nextStatus } });
      if (new Date() >= new Date('2026-05-01')) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(5) });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      {/* HEADER IDENTIFICACIÓN DOCENTE */}
      {!isManagement && (
        <div className="bg-white px-6 py-4 border-b flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner"> <User size={24} /> </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Docente Identificada</p>
            <h2 className="text-lg font-black text-violet-900 uppercase italic leading-none">{user.fullName || `${user.firstName} ${user.lastName}`}</h2>
            <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase">ID: {user.id.substring(0,8)}...</p>
          </div>
        </div>
      )}

      {/* BARRA DE NAVEGACIÓN Y FILTROS */}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p>
              </div>
              {isManagement && <button onClick={() => { setGroupsToPrint(groups); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition"><Printer size={24}/></button>}
          </div>
          <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
                  <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-50 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
                  <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
              </div>
              {isManagement && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setViewFilter('sede')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button>
                      <button onClick={() => setViewFilter('inclusion')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button>
                  </div>
              )}
          </div>
      </div>
      
      {/* LISTADO DE GRUPOS (CARRUSEL) */}
      <div className="relative flex-1 overflow-hidden">
          <button onClick={() => scroll('left')} className="hidden md:flex absolute left-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronLeft size={24}/></button>
          <button onClick={() => scroll('right')} className="hidden md:flex absolute right-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronRight size={24}/></button>
          <div ref={scrollRef} className="h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start">
            {groups.map((g) => (
              <div key={g.name} className="flex flex-col min-w-[320px] bg-white rounded-[35px] border shadow-sm relative overflow-hidden transition-all hover:shadow-md h-[calc(100vh-250px)]">
                <div className={`p-5 border-b-4 relative ${turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50'}`}>
                  <div className="absolute top-4 right-4 flex gap-1">
                    <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition active:scale-95"><Plus size={16}/></button>
                    {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                  </div>
                  <h3 className="font-black text-gray-800 text-lg leading-tight uppercase">{g.name}</h3>
                  <div className="mt-2 text-[11px] text-gray-500 font-bold space-y-0.5">
                    <p>DOC: <span className="text-violet-700 uppercase">{g.teacher || 'Vacante'}</span></p>
                    {g.classroom && <p className="text-orange-600">AULA: {g.classroom}</p>}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-2 content-start">
                  {g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
                    <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between group cursor-pointer hover:bg-violet-50 transition-all border border-transparent hover:border-violet-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-slate-400 border border-slate-200 uppercase text-sm">
                          {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}
                        </div>
                        <span className="font-bold text-xs text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
                      </div>
                      <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s); setIsWriting(false); setNewNote("");}} className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition">⚡</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
      </div>

      {/* MODAL DETALLE ESTUDIANTE (NUEVO ARCHIVO) */}
     {selectedStudent && (
  <StudentDetailView 
    student={selectedStudent} 
    user={user}
    db={db}
    appId={appId}
    onClose={() => setSelectedStudent(null)} 
    onEdit={(s) => {
       // Este es el puente con App.jsx que arreglaste
       setSelectedStudent(null);
       if (typeof onSelectStudent === 'function') onSelectStudent(s.id); 
       setActiveTab('matricula'); 
    }}
  />
)}
      {/* MODAL BITÁCORA EXPRESS */}
      {showBitacoraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div>
              <button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            {!isWriting ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">
                  {INCIDENT_TYPES.map((type) => (
                    <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}>
                      <span className="text-2xl">{type.emoji}</span>
                      <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setIsWriting(true)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2"><Edit3 size={16} /> Escribir Nota</button>
              </>
            ) : (
              <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500" />
                <div className="flex gap-2">
                  <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Volver</button>
                  <button onClick={() => handleSaveIncident("Nota", "medium", newNote)} disabled={!newNote.trim() || savingIncident} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">{savingIncident ? 'Guardando...' : 'Guardar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PANEL ENFOQUE GRUPO (CHAT + INFORMES) */}
      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in">
           <div className="p-4 border-b-4 border-violet-100 flex justify-between items-center bg-white shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 text-white p-2 rounded-xl shadow-lg"><Users size={20}/></div>
                <div><h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">{selectedGroupDetails.name}</h2><p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">Control de Gestión</p></div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowMobileChat(!showMobileChat)} className="lg:hidden p-3 bg-orange-100 text-orange-600 rounded-full"><MessageSquare size={24}/></button>
                <button onClick={() => setSelectedGroupDetails(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
              </div>
           </div>
           
           <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-white">
              <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${showMobileChat ? 'hidden lg:block' : 'block'}`}>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-4 bg-emerald-50 text-emerald-700 rounded-3xl font-black text-[10px] uppercase border border-emerald-100 flex items-center justify-center gap-2 shadow-sm"><Folder size={18}/> Carpeta Fotos</button>
                    <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-4 bg-blue-50 text-blue-700 rounded-3xl font-black text-[10px] uppercase border border-blue-100 flex items-center justify-center gap-2 shadow-sm"><FileText size={18}/> Drive Institucional</button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setInformeEpoca(n)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${informeEpoca === n ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Informe {n === 1 ? 'Inicial' : n === 2 ? 'Medio' : 'Final'}</button>
                    ))}
                </div>
                <div className="space-y-3 pb-20">
                  {selectedGroupDetails.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => {
                    const status = s[`informe${informeEpoca}`]?.status || 'Pendiente';
                    const colors = { 'Hecho': 'bg-blue-600', 'Impreso': 'bg-violet-600', 'Enviado': 'bg-orange-500', 'Archivado': 'bg-emerald-600', 'Pendiente': 'bg-slate-300' };
                    return (
                      <div key={s.id} className="flex items-center justify-between p-5 bg-white rounded-[30px] border-2 border-slate-100 hover:border-violet-200 transition-all">
                        <span className="font-black text-base text-slate-700 uppercase tracking-tighter">{s.lastName}, {s.firstName}</span>
                        <button onClick={() => handleToggleInformeGrupo(s, informeEpoca)} className={`px-6 py-4 rounded-2xl text-[10px] font-black uppercase text-white shadow-md active:scale-95 transition-all ${colors[status]}`}>{status}</button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* MURAL DE INTERCAMBIO (CHAT) */}
              <div className={`w-full lg:w-[450px] bg-slate-50 border-l border-slate-200 flex flex-col ${showMobileChat ? 'block' : 'hidden lg:flex'}`}>
                  <div className="p-5 bg-white/80 backdrop-blur-md border-b flex items-center gap-3 shrink-0">
                    <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg"><MessageSquare size={18}/></div>
                    <div><h3 className="font-black text-slate-800 uppercase italic text-sm">Muro de Intercambio</h3><p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">Comunicación del Equipo</p></div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col-reverse space-y-3 custom-scrollbar">
                      {groupMessages[selectedGroupDetails.name]?.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.authorId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-[25px] shadow-sm ${m.authorId === user.id ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-1 gap-6"><span className={`text-[9px] font-black uppercase ${m.authorId === user.id ? 'text-violet-200' : 'text-violet-600'}`}>{m.author}</span><span className="text-[8px] font-bold opacity-40">{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</span></div>
                            <p className="text-sm font-medium leading-tight">{m.text}</p>
                          </div>
                        </div>
                      ))}
                  </div>
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="p-6 bg-white border-t-2 border-slate-100 flex gap-2">
                    <input name="comment" autoComplete="off" placeholder="Escribir novedad..." className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-[30px] text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:bg-white transition-all shadow-inner" />
                    <button type="submit" className="bg-orange-500 text-white p-4 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all"><Send size={20}/></button>
                  </form>
              </div>
           </div>
        </div>
      )}

      {/* DIÁLOGO DE EDICIÓN (SOLO GESTIÓN) */}
      {editingGroup && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto no-scrollbar">
               <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3><button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button></div>
               <div className="space-y-4">
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nombre Grupo</label><input name="groupName" defaultValue={editingGroup.name} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm uppercase outline-none focus:ring-2 ring-violet-100 border-b-2 border-violet-200" /></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Docente Titular</label><select name="teacher" defaultValue={editingGroup.teacherId || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs uppercase outline-none">{usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}</select></div>
                  <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Aula Física</label><input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" /></div>
                  <div><label className="text-[10px] font-black text-emerald-600 uppercase ml-1 tracking-widest">Link Carpeta Fotos</label><input name="driveLink" defaultValue={editingGroup.driveLink || ""} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 outline-none" /></div>
                  <div><label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Drive Institucional</label><input name="institucionalDrive" defaultValue={editingGroup.institucionalDrive || ""} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-800 outline-none" /></div>
                  <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4 hover:scale-[1.02] transition-all">{updatingGroup ? "Guardando..." : "Aplicar Cambios"}</button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
}
