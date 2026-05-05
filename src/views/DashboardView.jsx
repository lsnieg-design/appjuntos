import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, User, CheckSquare, Calendar, 
  MessageSquare, Trophy, Star, Activity, Clock 
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, orderBy, limit 
} from 'firebase/firestore';

export function DashboardView({ user, db, appId, tasks = [], events = [], announcements = [] }) {
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
const [currentChallenge, setCurrentChallenge] = useState({ q: "Cargando desafío...", isRestDay: false, url: "", answer: "" });
  const [timeLeft, setTimeLeft] = useState(""); // Para la cuenta regresiva
  const [isGameOver, setIsGameOver] = useState(false); // Para el corte de las 19hs
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const [showChallengeSuccess, setShowChallengeSuccess] = useState(false);
  const [userScore, setUserScore] = useState(0);
  const [showRanking, setShowRanking] = useState(false);
  const [rankingData, setRankingData] = useState([]);
  
  // ESTADOS CUENTA REGRESIVA
  const [countdown, setCountdown] = useState({ title: "Vacaciones", date: "", daysLeft: 0 });
  const [countdownDocId, setCountdownDocId] = useState(null);
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');

  // CONFIGURACIÓN GITHUB PARA DESAFÍOS
 const GITHUB_USER = "lsnieg-design"; // CAMBIAR ESTO
const GITHUB_REPO = "appjuntos";           // CAMBIAR ESTO
const GITHUB_FOLDER = "desafios";

 const canPost = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión'].some(r => 
  [user.rol, user.role].includes(r)
);
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  const INCLUSION_ROLES = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];
  const SEDE_ROLES = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'];
  const isInclusionStaff = INCLUSION_ROLES.includes(user.role);
  const isSedeStaff = SEDE_ROLES.includes(user.role);

  const todayDate = new Date();
  const dayOfWeek = todayDate.getDay(); 
  const monthStr = (todayDate.getMonth() + 1).toString().padStart(2, '0');
  const dayStr = todayDate.getDate().toString().padStart(2, '0');
  const dateString = `${monthStr}-${dayStr}`;

  const feriadosDocentes2026 = [
      '01-01', '02-16', '02-17', '03-24', '04-02', '04-03', '05-01', '05-25', 
      '06-15', '06-20', '07-09', '08-17', '09-11', '10-12', '11-23', '12-08', '12-25'
  ];

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isHoliday = feriadosDocentes2026.includes(dateString);
  const isWorkingDay = !isWeekend && !isHoliday;

  const myPendingTasksCount = tasks.filter(t => {
      if (t.status === 'completed') return false;
      const scheduledTime = new Date(`${t.showDate || '2000-01-01'}T${t.showTime || '00:00'}`);
      if (scheduledTime > new Date()) return false; 
      if (isSuperAdmin || t.createdById === user.id || (t.targetType === 'user' && t.targetUserId === user.id)) return true;
      if (t.targetType === 'roles' && t.targetRoles?.some(r => r.toLowerCase() === user.role?.toLowerCase())) return true;
      return false;
  }).length;
useEffect(() => {
    // 1. Notas
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.done - b.done)));
    
    // 2. Usuarios y Ranking
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
        const usersData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        const me = usersData.find(u => u.id === user.id);
        if (me) setUserScore(me.score || 0);
       const sortedRanking = usersData.sort((a, b) => (b.score || 0) - (a.score || 0));
    setRankingData(sortedRanking);
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

    // LÓGICA DEL RELOJ PARA EL CORTE DE LAS 19HS
    const timer = setInterval(() => {
        const now = new Date();
        const deadline = new Date();
        deadline.setHours(19, 0, 0, 0); 
        if (now >= deadline) {
            setIsGameOver(true);
            setTimeLeft("00:00:00");
        } else {
            setIsGameOver(false);
            const diff = deadline - now;
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    }, 1000);

    // 6. Cargar Desafío desde Github
    const loadGithubChallenge = async () => {
        try {
            if (!isWorkingDay) {
                setCurrentChallenge({ q: "¡Hoy es día de descanso!", isRestDay: true });
                return;
            }
            const res = await fetch(`https://api.github.com/repos/${GITHUB_USER}/${GITHUB_REPO}/contents/${GITHUB_FOLDER}`);
            const files = await res.json();
            const images = files.filter(f => f.name.match(/\.(jpg|jpeg|png|webp|gif|bmp)$/i));
            if (images.length > 0) {
                const seed = todayDate.getFullYear() + todayDate.getMonth() + todayDate.getDate();
                const idx = seed % images.length;
                const file = images[idx];
                const fileNameOnly = file.name.substring(0, file.name.lastIndexOf('.'));
                setCurrentChallenge({ url: file.download_url, answer: fileNameOnly, isRestDay: false });
            }
        } catch (e) { console.error("Error Github:", e); }
    };
    loadGithubChallenge();

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

    return () => { 
      unsubNotes(); unsubUsers(); unsubSettings(); unsubStudents(); unsubStaff(); 
      clearInterval(timer);
    };
  }, [user.id, appId, isWorkingDay]); 

  // --- EL RANKING AHORA MUESTRA A TODOS (Quité el slice) ---
  const handlePost = async (e) => { 
    e.preventDefault(); 
    const msg = e.target.message.value;
    const chan = e.target.channel.value;
    const sDate = e.target.showDate.value;
    const sTime = e.target.showTime.value;
    
    if (!msg.trim()) return;
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { 
        message: msg, 
        author: user.fullName || `${user.firstName} ${user.lastName}`, 
        authorId: user.id, 
        role: user.role || user.rol, 
        channel: chan, 
        showDate: sDate || todayStr,
        showTime: sTime || "00:00",
        createdAt: serverTimestamp() 
      }); 
      setShowAnnounceModal(false); 
    } catch(err) { alert("Error: " + err.message); } 
  };
  const deleteAnnouncement = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id)); };
  const saveNote = async (e) => { e.preventDefault(); if (!newNote.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); setNewNote(''); };
  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
  
const handleSaveCountdown = async () => {
      if(!newCountdownTitle || !newCountdownDate) return;
      try {
          if (countdownDocId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', countdownDocId), { title: newCountdownTitle, date: newCountdownDate }); }
          else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), { title: newCountdownTitle, date: newCountdownDate }); }
          setIsEditingCountdown(false);
      } catch (err) { alert(err.message); }
  };

  const checkChallenge = async (e) => {
    if (e) e.preventDefault();
    if (!challengeAnswer || !currentChallenge.url || !user) return;

    const normalizar = (texto) => {
        if (!texto) return "";
        return texto.toString().trim().toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
    };

    try {
      const cleanUser = normalizar(challengeAnswer);
      const cleanCorrect = normalizar(currentChallenge.answer);
      
      if (cleanUser === cleanCorrect) {
        // Marcamos éxito local
        localStorage.setItem(`lastChallenge_${user.id}`, new Date().toDateString());
        
        // Referencia a la base de datos
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        
        // PARCHE 100+ : Forzamos que sea número y sumamos
        const currentScore = Number(userScore) || 0;
        const newScore = currentScore + 10;

        await updateDoc(userRef, { 
            score: newScore,
            lastWin: serverTimestamp() 
        });
        
        // Actualización de estados visuales
        setUserScore(newScore);
        setShowChallengeSuccess(true);
        setChallengeAnswer('');
        
        setTimeout(() => setShowChallengeSuccess(false), 4000);
      } else { 
        alert("🤔 ¡Casi! Intentá de nuevo. Revisá si es un número o palabra."); 
      }
    } catch (err) { 
      console.error("Error validando desafío:", err);
      alert("Error al guardar puntos. Reintentá.");
    }
  };

  const resetAllScores = async () => {
    if (!isSuperAdmin) return;
    if (!confirm("⚠️ ¿Estás segura? Esto pondrá los puntos de TODO EL PERSONAL en 0.")) return;
    try {
      const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const querySnapshot = await getDocs(qUsers);
      const promises = querySnapshot.docs.map(uDoc => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', uDoc.id), { score: 0 }));
      await Promise.all(promises);
      alert("✅ Ranking reseteado con éxito.");
    } catch (err) { alert("Error técnico al resetear."); }
  };

 const visibleAnnouncements = announcements.filter(a => {
    // Primero el filtro de permisos que ya tenías
    const hasPermission = isSuperAdmin || a.authorId === user.id || !a.channel || a.channel === 'general' || (a.channel === 'inclusion' && isInclusionStaff) || (a.channel === 'sede' && isSedeStaff);
    
    // Segundo: Filtro de programación (Solo si ya pasó la fecha y hora)
    const now = new Date();
    const scheduleDate = new Date(`${a.showDate || '2000-01-01'}T${a.showTime || '00:00'}`);
    const isReleased = now >= scheduleDate;

    return hasPermission && isReleased;
  });
  const resetMyDailyChallenge = () => {
    localStorage.removeItem(`lastChallenge_${user.id}`);
    setShowChallengeSuccess(false);
    setChallengeAnswer('');
    alert("🔄 Participación diaria reseteada. ¡Podés volver a jugar!");
  };

  // --- LÓGICA DE PUNTOS Y RECOMPENSAS (PLAN DE MAYO) ---
// --- LÓGICA DE PUNTOS Y RECOMPENSAS (PLAN DE MAYO) ---
  const renderChallengeOrIncentives = () => {
    const hasPlayedToday = localStorage.getItem(`lastChallenge_${user.id}`) === new Date().toDateString();

    if (hasPlayedToday || isGameOver || !isWorkingDay) {
      return (
        <div className="bg-slate-900 p-6 rounded-[35px] text-white shadow-xl mx-1 border-b-8 border-violet-600">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="text-yellow-400" size={20} />
              <span className="font-black text-xs uppercase italic">Tus Puntos: {userScore}</span>
            </div>
            <button onClick={() => setShowRanking(true)} className="text-[10px] font-black uppercase text-violet-400 border border-violet-800 px-3 py-1 rounded-full">Ver Ranking</button>
          </div>
          <p className="text-center text-xs font-bold opacity-70">¡Gracias por participar hoy! Mañana hay un nuevo desafío.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-5 rounded-[35px] shadow-sm border border-violet-100 mx-1">
        <h3 className="font-black text-violet-900 uppercase text-xs mb-3 flex items-center gap-2">Desafío del Día</h3>
        {currentChallenge.url ? (
          <div className="space-y-4">
            <img src={currentChallenge.url} className="w-full h-48 object-contain rounded-2xl bg-slate-50" alt="Desafío" />
            <div className="flex gap-2">
              <input value={challengeAnswer} onChange={e => setChallengeAnswer(e.target.value)} placeholder="Tu respuesta..." className="flex-1 p-3 bg-slate-100 rounded-xl text-sm font-bold border-none outline-none" />
              <button onClick={checkChallenge} className="bg-violet-600 text-white p-3 rounded-xl"><Star size={20} /></button>
            </div>
            <p className="text-[10px] text-center text-gray-400 font-bold uppercase">Cierra en: {timeLeft}</p>
          </div>
        ) : <p className="text-xs text-gray-400">Cargando...</p>}
      </div>
    );
  };
 return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {/* HEADER BIENVENIDA */}
      <div className="flex justify-between items-center px-2">
          <div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div>
          <div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div>
      </div>

      {/* 1. CARTELERA (Ahora arriba) */}
      {visibleAnnouncements.length > 0 && (
        <div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative mx-1">
          <h3 className="text-[10px] font-black text-yellow-700 uppercase mb-3 flex items-center gap-1"><Bell size={12}/> Cartelera Oficial</h3>
          <div className="space-y-3">
            {visibleAnnouncements.map(a => (
              <div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start">
                <div><p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase">- {a.author}</p></div>
                {(canPost || a.authorId === user.id) && <button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 rounded-lg transition"><Trash2 size={14}/></button>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. GANADOR MENSUAL */}
      {todayDate.getDate() <= 5 && rankingData.length > 0 && rankingData[0].score > 10 && (
          <div className="bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 p-6 rounded-[35px] text-white shadow-xl animate-in zoom-in duration-500 mx-2 border-4 border-white/30 relative">
              <div className="absolute top-2 right-4 opacity-20"><Trophy size={40}/></div>
              <h3 className="font-black text-center text-xl uppercase italic tracking-tighter">🏆 ¡DESTACADO DE ABRIL! 🏆</h3>
              <p className="text-center font-black text-2xl mt-2 uppercase drop-shadow-md">{rankingData[0].firstName} {rankingData[0].lastName}</p>
              <p className="text-center text-[10px] uppercase font-black opacity-90 mt-1 tracking-widest text-center">¡Vení a buscar tu premio a Dirección! 🎁</p>
              {isSuperAdmin && todayDate.getDate() <= 3 && (
                <button onClick={resetAllScores} className="mt-4 w-full py-1 bg-white/20 rounded-lg text-[8px] font-black uppercase hover:bg-red-500 transition-colors">Confirmar Reinicio de Puntos para Mayo</button>
              )}
          </div>
      )}

      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm mx-1"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase">Atención</h4><p className="text-xs text-red-600 font-bold">{ungroupedCount} alumnos sin grupo.</p></div></div></div>)}

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
                  <div><h3 className="font-black text-xs uppercase">Cumples Profes</h3><p className="text-[10px] opacity-90">{staffBirthdays.length} esta semana</p></div>
              </button>
          )}
          {(countdown.daysLeft > 0 || isManagement) && (
              <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 shadow-sm relative group flex items-center gap-4">
                  {isManagement && !isEditingCountdown && (<button onClick={() => { setNewCountdownTitle(countdown.title); setNewCountdownDate(countdown.date); setIsEditingCountdown(true); }} className="absolute top-2 right-2 text-blue-300 opacity-0 group-hover:opacity-100"><Edit3 size={14}/></button>)}
                  {isEditingCountdown ? (
                      <div className="w-full flex flex-col gap-1"><input type="text" value={newCountdownTitle} onChange={e=>setNewCountdownTitle(e.target.value)} placeholder="Título" className="p-1 text-xs border rounded outline-none"/><input type="date" value={newCountdownDate} onChange={e=>setNewCountdownDate(e.target.value)} className="p-1 text-xs border rounded outline-none"/><button onClick={handleSaveCountdown} className="bg-blue-500 text-white text-[10px] font-bold p-1.5 rounded-lg mt-1 uppercase">Guardar</button></div>
                  ) : (
                      <><div className="bg-blue-500 text-white w-10 h-10 rounded-xl flex flex-col items-center justify-center shadow-md shrink-0"><span className="text-lg font-black leading-none">{countdown.daysLeft}</span><span className="text-[7px] font-bold uppercase tracking-tighter">Días</span></div><div className="flex-1"><p className="text-[9px] text-blue-400 font-bold uppercase">Falta poco para...</p><h3 className="font-black text-blue-900 text-xs leading-tight">{countdown.title || "Configurar"}</h3></div></>
                  )}
              </div>
          )}
      </div>

      {/* 4. PLAN DE MAYO */}
      {renderChallengeOrIncentives()}

      {/* 5. TAREAS Y CALENDARIO */}
      <div className="grid grid-cols-2 gap-3 px-1">
        <div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition">
          <h4 className="text-3xl font-black text-orange-500">{myPendingTasksCount}</h4>
          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p>
        </div>
        <div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>
          {todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase font-bold tracking-widest">Es Hoy</p></> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}
        </div>
      </div>
      
      {/* 6. TAREAS PERSONALES */}
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner mx-1">
        <h3 className="font-black text-gray-400 uppercase text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3>
        <form onSubmit={saveNote} className="flex gap-2 mb-3">
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" />
          <button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button>
        </form>
        <div className="space-y-2">
          {notes.map(n => (
            <div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
              <button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={10} className="text-white"/>}</button>
              <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span>
              <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL AYUDA (Aquí mantenemos todo tu manual original) --- */}
      {showTutorial && (
        <div className="fixed inset-0 bg-violet-900/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-6 shadow-2xl max-h-[85vh] flex flex-col relative">
                <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 z-10"><X size={20}/></button>
                <div className="text-center mb-6 pt-4"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Manual de Ayuda</h2><p className="text-xs text-gray-500 font-bold uppercase tracking-widest">¿Cómo usar la App?</p></div>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
                    <button onClick={()=>setTutorialTab('inicio')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='inicio'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Inicio</button>
                    <button onClick={()=>setTutorialTab('legajos')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='legajos'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Legajos</button>
                    <button onClick={()=>setTutorialTab('aula')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='aula'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Mi Aula</button>
                    <button onClick={()=>setTutorialTab('tareas')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='tareas'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Tareas</button>
                    <button onClick={()=>setTutorialTab('agenda')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='agenda'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Agenda</button>
                    <button onClick={()=>setTutorialTab('recursos')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='recursos'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Recursos</button>
                    <button onClick={()=>setTutorialTab('proyecto')} className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition ${tutorialTab==='proyecto'?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>Proyecto</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-gray-600 leading-relaxed">
                    {tutorialTab === 'inicio' && (
                        <>
                            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                <h4 className="font-bold text-orange-800 mb-1 flex items-center gap-2"><LayoutDashboard size={16}/> Panel Principal</h4>
                                <p>Es tu centro de mando. El contador de <b>Tareas</b> muestra tus pendientes. La <b>Cartelera</b> te avisa de noticias institucionales.</p>
                            </div>
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2"><Lock size={16}/> Tareas Personales</h4>
                                <p>Anota recordatorios rápidos aquí. Son privados, solo tú puedes verlos.</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'legajos' && (
                        <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                            <h4 className="font-bold text-green-800 mb-1 flex items-center gap-2"><GraduationCap size={16}/> Buscador Institucional</h4>
                            <p>Busca cualquier alumno de la escuela. Usa los filtros (Turno, Docente, DX) para refinar.</p>
                        </div>
                    )}
                    {tutorialTab === 'aula' && (
                        <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                            <h4 className="font-bold text-indigo-800 mb-1 flex items-center gap-2"><Grid size={16}/> Gestión de Clases</h4>
                            <p>Aquí ves a los grupos armados. Usa el botón de imprimir arriba para sacar la lista de asistencia.</p>
                        </div>
                    )}
                    {tutorialTab === 'tareas' && (
                        <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                            <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2"><CheckSquare size={16}/> Pedidos y Organización</h4>
                            <p>Crea tareas para solicitar materiales o informes.</p>
                        </div>
                    )}
                    {tutorialTab === 'agenda' && (
                         <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                             <h4 className="font-bold text-red-800 mb-1 flex items-center gap-2"><CalendarIcon size={16}/> Calendario</h4>
                             <p>Visualiza actos, feriados y reuniones. Toca un día para ver detalles.</p>
                         </div>
                    )}
                    {tutorialTab === 'recursos' && (
                         <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                             <h4 className="font-bold text-emerald-800 mb-1 flex items-center gap-2"><LinkIcon size={16}/> Biblioteca Digital</h4>
                             <p>Encuentra documentos institucionales, actas y planillas organizadas por carpetas.</p>
                         </div>
                    )}
                    {tutorialTab === 'proyecto' && (
                         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                             <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2"><PieChart size={16}/> Proyecto 2026</h4>
                             <p>Accede a la planificación anual "La Vuelta al Mundo".</p>
                         </div>
                    )}
                </div>
                <button onClick={() => setShowTutorial(false)} className="order-last w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition">¡Entendido!</button>
            </div>
        </div>
      )}

      {/* MODAL RANKING */}
      {showRanking && (
          <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowRanking(false)}>
              <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 shrink-0">
                      <h3 className="text-lg font-black text-emerald-600 uppercase italic tracking-tighter">Ranking Institucional</h3>
                      <button onClick={() => setShowRanking(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20} className="text-gray-500"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                      {rankingData.map((u, index) => (
                          <div key={u.id || index} className={`flex items-center justify-between p-3 rounded-2xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
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

      {/* MODAL ANUNCIOS */}
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

    </div>
  );
}
