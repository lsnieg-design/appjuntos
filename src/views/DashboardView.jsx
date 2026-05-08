import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Star,
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, orderBy, limit, 
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs 
} from 'firebase/firestore';


export function DashboardView({ user, db, appId, setActiveTab, tasks = [], events = [], announcements = [] }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  const [students, setStudents] = useState([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayModalType, setBirthdayModalType] = useState('students'); 
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);
  
  const [studentBirthdays, setStudentBirthdays] = useState([]);
  const [staffBirthdays, setStaffBirthdays] = useState([]);
  const [tutorialTab, setTutorialTab] = useState('inicio'); 

  // ESTADOS DEL JUEGO
  const [userScore, setUserScore] = useState(0);
  const [showRanking, setShowRanking] = useState(false);
  const [rankingData, setRankingData] = useState([]);
  
  // ESTADOS CUENTA REGRESIVA
  const [countdown, setCountdown] = useState({ title: "Vacaciones", date: "", daysLeft: 0 });
  const [countdownDocId, setCountdownDocId] = useState(null);
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  const isInclusionStaff = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
  const isSedeStaff = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'].includes(user.role);
  const canPost = isManagement;

  useEffect(() => {
    if (!db || !appId) return;

    // 1. Tareas Personales (Notas)
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.done - b.done)));
    
    // 2. Usuarios y Ranking
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
        const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const me = usersData.find(u => u.id === user.id);
        if (me) setUserScore(me.score || 0);
        setRankingData(usersData.sort((a, b) => (b.score || 0) - (a.score || 0)));
    });

    // 3. Estudiantes y Cumpleaños
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(allStudents);
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
        const bdays = allStudents.map(data => {
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate + 'T00:00:00');
            const nextB = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
            return { ...data, nextBirthday: nextB };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStudentBirthdays(bdays);
        setUngroupedCount(allStudents.filter(s => !s.groupMorning && !s.groupAfternoon && !s.daiMorning && !s.daiAfternoon).length);
    });

    // 4. Staff y Cumples Profes
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
        const sBdays = snap.docs.map(d => {
            const data = d.data();
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate.includes('T') ? data.birthDate : data.birthDate + 'T00:00:00');
            const nextB = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: nextB };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStaffBirthdays(sBdays);
    });

    // 5. Configuración de Cuenta Regresiva
    const qSettings = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snap) => {
        if (!snap.empty) {
            const docSnap = snap.docs.find(d => d.data().title || d.data().date);
            if (docSnap) {
                setCountdownDocId(docSnap.id);
                const data = docSnap.data();
                const diffDays = Math.ceil((new Date(data.date + 'T00:00:00') - new Date()) / (1000 * 60 * 60 * 24));
                setCountdown({ title: data.title || '', date: data.date, daysLeft: diffDays > 0 ? diffDays : 0 });
            }
        }
    });

    return () => { unsubNotes(); unsubUsers(); unsubSettings(); unsubStudents(); unsubStaff(); };
  }, [user.id, appId]); 

  // --- FUNCIONES ---
  const handlePost = async (e) => { 
    e.preventDefault(); 
    const fd = new FormData(e.target);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { 
        message: fd.get('message'), 
        author: user.fullName || user.firstName, 
        authorId: user.id, 
        channel: fd.get('channel'), 
        showDate: fd.get('showDate') || todayStr,
        showTime: fd.get('showTime') || "00:00",
        createdAt: serverTimestamp() 
      }); 
      setShowAnnounceModal(false); 
    } catch(err) { alert(err.message); } 
  };

  const deleteAnnouncement = async (id) => { 
    if(confirm("¿Borrar este aviso de la cartelera?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
      } catch (err) { alert("Error al borrar: " + err.message); }
    }
  };

  const saveNote = async (e) => { 
    e.preventDefault(); 
    if (!newNote.trim()) return; 
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); 
    setNewNote(''); 
  };

  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
    } catch (err) { console.error(err); }
  };

  const handleSaveCountdown = async () => {
    if(!newCountdownTitle || !newCountdownDate) return;
    try {
        if (countdownDocId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', countdownDocId), { title: newCountdownTitle, date: newCountdownDate }); }
        else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), { title: newCountdownTitle, date: newCountdownDate }); }
        setIsEditingCountdown(false);
    } catch (err) { alert(err.message); }
  };

  const resetAllScores = async () => {
    if (!isSuperAdmin) return;
    if (!confirm("⚠️ ¿Estás segura? Esto pondrá los puntos de TODO EL PERSONAL en 0 para el nuevo mes.")) return;
    try {
      const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const querySnapshot = await getDocs(qUsers);
      const promises = querySnapshot.docs.map(uDoc => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uDoc.id), { score: 0 }));
      await Promise.all(promises);
      alert("✅ Ranking reiniciado.");
    } catch (err) { alert("Error técnico: " + err.message); }
  };

  const visibleAnnouncements = announcements.filter(a => {
    const hasPermission = isSuperAdmin || a.authorId === user.id || !a.channel || a.channel === 'general' || (a.channel === 'inclusion' && isInclusionStaff) || (a.channel === 'sede' && isSedeStaff);
    const scheduleDate = new Date(`${a.showDate || '2000-01-01'}T${a.showTime || '00:00'}`);
    return hasPermission && (new Date() >= scheduleDate);
  });

  const myPendingTasksCount = tasks.filter(t => {
      if (t.status === 'completed') return false;
      const sched = new Date(`${t.showDate || '2000-01-01'}T${t.showTime || '00:00'}`);
      if (sched > new Date()) return false; 
      return isSuperAdmin || t.createdById === user.id || t.targetUserId === user.id || t.targetRoles?.some(r => r.toLowerCase() === user.role?.toLowerCase());
  }).length;

return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in pb-20 overflow-y-auto h-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* HEADER BIENVENIDA */}
      <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2>
            <p className="text-slate-500 font-medium text-xs">Mayo: Sumá puntos participando en la App</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1"><HelpCircle size={16}/> Ayuda</button>
            {canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}
          </div>
      </div>

      {/* 1. CARTELERA */}
      {visibleAnnouncements.length > 0 && (
        <div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative mx-1">
          <h3 className="text-[10px] font-black text-yellow-700 uppercase mb-3 flex items-center gap-1"><Bell size={12}/> Cartelera Oficial</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleAnnouncements.map(a => (
              <div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start">
                <div><p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase">- {a.author}</p></div>
                {(canPost || a.authorId === user.id) && <button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 rounded-lg transition"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}

    {/* 2. SISTEMA DE PUNTOS MAYO (TABLA DEFINITIVA) */}
      <div className="bg-slate-900 p-6 rounded-[35px] text-white shadow-xl mx-1 border-b-8 border-violet-600 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
              <div className="bg-violet-500/20 p-4 rounded-2xl animate-pulse shrink-0">
                <Star className="text-yellow-400" size={40} fill="currentColor"/>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-xl uppercase italic tracking-tighter text-violet-200 mb-2">Objetivo Mayo: Tabla de Puntos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">20 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Informe Etapa</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">15 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Nota Oficial</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">10 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Bitácora / Social</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">10 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Completar Tarea</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">5 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Ausentismo / Tareas</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-yellow-400 font-black text-sm leading-none">3 pts</span>
                    <span className="text-[9px] uppercase font-bold text-slate-400">Muro de Grupo</span>
                  </div>
                </div>
              </div>
          </div>
          
          <div className="flex items-center gap-6 bg-white/10 p-5 rounded-[28px] border border-white/10 shrink-0">
              <div className="text-center">
                  <p className="text-[10px] uppercase font-black text-violet-400 tracking-widest mb-1">Tus Puntos</p>
                  <p className="text-4xl font-black text-white">{userScore} <span className="text-xs opacity-50">pts</span></p>
              </div>
              <div className="h-12 w-[1px] bg-white/20"></div>
              <button 
                onClick={() => setShowRanking(true)} 
                className="bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 rounded-2xl font-black uppercase text-[11px] tracking-widest transition-all shadow-lg active:scale-95"
              >
                Ver Ranking
              </button>
          </div>
      </div>

      {/* 3. CUMPLES Y CUENTA REGRESIVA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
          {studentBirthdays.length > 0 && (
              <button onClick={() => { setBirthdayModalType('students'); setShowBirthdayModal(true); }} className="bg-gradient-to-r from-pink-400 to-pink-500 p-4 rounded-2xl shadow-sm text-white flex items-center gap-3 active:scale-95 transition text-left">
                  <div className="bg-white/20 p-2 rounded-xl"><Crown size={20}/></div>
                  <div><h3 className="font-black text-xs uppercase">Cumples Alumnos</h3><p className="text-[10px] opacity-90">{studentBirthdays.length} esta semana</p></div>
              </button>
          )}
          {staffBirthdays.length > 0 && (
              <button onClick={() => { setBirthdayModalType('staff'); setShowBirthdayModal(true); }} className="bg-gradient-to-r from-violet-500 to-indigo-500 p-4 rounded-2xl shadow-sm text-white flex items-center gap-3 active:scale-95 transition text-left">
                  <div className="bg-white/20 p-2 rounded-xl"><User size={20}/></div>
                  <div><h3 className="font-black text-xs uppercase">Cumples Staff</h3><p className="text-[10px] opacity-90">{staffBirthdays.length} esta semana</p></div>
              </button>
          )}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm relative group flex items-center gap-4">
              {isManagement && !isEditingCountdown && (<button onClick={() => setIsEditingCountdown(true)} className="absolute top-2 right-2 text-blue-300 opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>)}
              {isEditingCountdown ? (
                  <div className="w-full flex flex-col gap-1"><input type="text" value={newCountdownTitle} onChange={e=>setNewCountdownTitle(e.target.value)} placeholder="Título" className="p-1 text-xs border rounded"/><input type="date" value={newCountdownDate} onChange={e=>setNewCountdownDate(e.target.value)} className="p-1 text-xs border rounded"/><button onClick={handleSaveCountdown} className="bg-blue-500 text-white text-[10px] font-bold p-1 rounded-lg mt-1 uppercase">Guardar</button></div>
              ) : (
                  <><div className="bg-blue-500 text-white w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-md shrink-0"><span className="text-lg font-black leading-none">{countdown.daysLeft}</span><span className="text-[7px] font-bold uppercase tracking-tighter">Días</span></div><div className="flex-1"><p className="text-[9px] text-blue-400 font-bold uppercase">Falta poco para...</p><h3 className="font-black text-blue-900 text-xs leading-tight">{countdown.title || "Configurar"}</h3></div></>
              )}
          </div>
      </div>

      {/* 4. TAREAS Y CALENDARIO */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
        <div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition flex items-center justify-between">
          <div><h4 className="text-3xl font-black text-orange-500">{myPendingTasksCount}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div>
          <ChevronRight className="text-orange-200" />
        </div>
        <div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm cursor-pointer hover:shadow-md transition flex items-center justify-between ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>
          <div>{todayEvents.length > 0 ? <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase font-bold tracking-widest">Evento de Hoy</p></> : <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></>}</div>
          <ChevronRight className={todayEvents.length > 0 ? "text-white/30" : "text-violet-100"} />
        </div>
      </div>
      
      {/* 5. TAREAS PERSONALES */}
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner mx-1">
        <h3 className="font-black text-gray-400 uppercase text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3>
        <form onSubmit={saveNote} className="flex gap-2 mb-3">
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl outline-none text-xs bg-white shadow-sm font-medium" />
          <button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {notes.map(n => (
            <div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
              <button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={10} className="text-white"/>}</button>
              <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span>
              <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODALES --- */}
      {showBirthdayModal && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowBirthdayModal(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBirthdayModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4">{birthdayModalType === 'students' ? 'Cumples Alumnos' : 'Cumples Staff'}</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {(birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).map(person => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-black text-violet-600">{person.firstName?.[0] || person.fullName?.[0]}</div>
                    <div><p className="font-bold text-slate-800 text-sm uppercase">{person.firstName || person.fullName} {person.lastName || ''}</p><p className="text-[10px] text-violet-500 font-black uppercase">{person.nextBirthday.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p></div>
                  </div>
                  <div className="text-2xl">🎂</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showRanking && (
          <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowRanking(false)}>
              <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 shrink-0">
                      <h3 className="text-lg font-black text-emerald-600 uppercase italic tracking-tighter">Ranking Institucional</h3>
                      <div className="flex gap-2">
                        {isSuperAdmin && <button onClick={resetAllScores} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition"><RefreshCw size={18}/></button>}
                        <button onClick={() => setShowRanking(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20} className="text-gray-500"/></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {rankingData.map((u, index) => (
                          <div key={u.id} className={`flex items-center justify-between p-3 rounded-2xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                              <div className="flex items-center gap-3">
                                <span className={`font-black text-lg ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{index + 1}</span>
                                <span className="font-bold text-gray-700 text-sm uppercase">{u.firstName} {u.lastName?.charAt(0)}.</span>
                              </div>
                              <div className="bg-white px-3 py-1 rounded-lg border border-gray-200 font-black text-emerald-600 text-xs">{(u.score || 0)} pts</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showAnnounceModal && (
        <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Nuevo Aviso</h3>
              <button type="button" onClick={() => setShowAnnounceModal(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">¿Cuándo?</label><input type="date" name="showDate" defaultValue={todayStr} className="w-full p-2 bg-gray-50 rounded-xl text-xs font-bold border-none" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Hora</label><input type="time" name="showTime" defaultValue="08:00" className="w-full p-2 bg-gray-50 rounded-xl text-xs font-bold border-none" /></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Canal</label><select name="channel" className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none"><option value="general">Todo el Personal</option><option value="sede">Solo Sede</option><option value="inclusion">Solo Inclusión</option></select></div>
              <textarea name="message" required placeholder="Mensaje..." className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none outline-none text-sm font-medium resize-none"></textarea>
              <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Publicar Aviso</button>
            </div>
          </form>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 bg-violet-900/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-6 shadow-2xl max-h-[85vh] flex flex-col relative">
                <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 z-10"><X size={20}/></button>
                <div className="text-center mb-6 pt-4"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Ayuda</h2></div>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                    {['inicio', 'legajos', 'aula', 'tareas', 'agenda', 'recursos', 'proyecto'].map(t => (
                      <button key={t} onClick={()=>setTutorialTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${tutorialTab===t?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-gray-600">
                    {tutorialTab === 'inicio' && <><div className="bg-orange-50 p-4 rounded-2xl border border-orange-100"><h4 className="font-bold text-orange-800 mb-1">Panel Principal</h4><p>Centro de mando con tus tareas y avisos.</p></div><div className="bg-blue-50 p-4 rounded-2xl border border-blue-100"><h4 className="font-bold text-blue-800 mb-1">Tareas Personales</h4><p>Notas privadas solo para vos.</p></div></>}
                    {tutorialTab === 'legajos' && <div className="bg-green-50 p-4 rounded-2xl border border-green-100"><h4 className="font-bold text-green-800 mb-1">Buscador</h4><p>Busca alumnos y filtra por DX o docente.</p></div>}
                    {tutorialTab === 'aula' && <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><h4 className="font-bold text-indigo-800 mb-1">Mi Aula</h4><p>Gestión de grupos y asistencia.</p></div>}
                </div>
                <button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg uppercase text-xs">¡Entendido!</button>
            </div>
        </div>
      )}
    </div>
  );
}
