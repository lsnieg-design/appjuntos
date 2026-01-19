import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder 
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// --- CONFIGURACIÓN DE FIREBASE ---
const getFirebaseConfig = () => {
  try {
    if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
    }
  } catch (e) { console.log("Buscando config global..."); }
  if (typeof __firebase_config !== 'undefined') return JSON.parse(__firebase_config);
  return {};
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'escuela-app-prod';
const messaging = app ? getMessaging(app) : null;
const VAPID_KEY = "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw";

// --- UTILS ---
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const savedProfile = localStorage.getItem('schoolApp_profile');
      if (savedProfile) setCurrentUserProfile(JSON.parse(savedProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (profileData) => {
    setCurrentUserProfile(profileData);
    localStorage.setItem('schoolApp_profile', JSON.stringify(profileData));
  };

  const handleLogout = () => {
    setCurrentUserProfile(null);
    localStorage.removeItem('schoolApp_profile');
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-violet-50"><RefreshCw className="animate-spin text-violet-600" /></div>;
  if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;
  return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- PANTALLA LOGIN ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setChecking(true);
    if (username === 'admin' && password === 'admin123') {
      onLogin({ id: 'admin-id', firstName: 'Admin', role: 'Dirección', rol: 'admin' });
      return;
    }
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', username), where('password', '==', password));
      const snap = await getDocs(q);
      if (!snap.empty) {
        onLogin({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else { setError('Datos incorrectos'); }
    } catch (err) { setError('Error de conexión'); }
    setChecking(false);
  };

  return (
    <div className="min-h-screen bg-violet-900 flex items-center justify-center p-6 text-center">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[40px] w-full max-w-md shadow-2xl">
        <h1 className="text-2xl font-black text-violet-900 mb-6 uppercase">Portal Docente</h1>
        <input type="text" placeholder="Usuario" className="w-full p-4 bg-gray-50 rounded-2xl mb-4 outline-none" onChange={e => setUsername(e.target.value)} />
        <input type="password" placeholder="Contraseña" className="w-full p-4 bg-gray-50 rounded-2xl mb-6 outline-none" onChange={e => setPassword(e.target.value)} />
        {error && <p className="text-red-500 text-xs mb-4 font-bold">{error}</p>}
        <button className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg">INGRESAR</button>
      </form>
    </div>
  );
}

// --- MAIN APP (Contenedor Principal) ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const canManageContent = user.rol === 'admin' || user.rol === 'super-admin';

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qRes = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubRes = onSnapshot(qRes, snap => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubEvents(); unsubRes(); unsubNotifs(); };
  }, [user.id]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <h1 className="font-bold text-sm leading-tight">Juntos a la Par <br/><span className="text-[10px] text-orange-200 uppercase">{user.firstName}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2 bg-violet-900/50 rounded-full">
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 w-4 h-4 rounded-full text-[10px] flex items-center justify-center font-bold animate-pulse">{notifications.length}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl p-4 text-gray-800 z-[100] border animate-in fade-in zoom-in-95">
                <h3 className="font-bold text-xs uppercase mb-2 text-violet-900">Avisos</h3>
                <div className="max-h-60 overflow-y-auto">
                  {notifications.length === 0 ? <p className="text-xs text-gray-400 italic">Sin avisos</p> : 
                    notifications.map(n => <div key={n.id} className="text-xs py-2 border-b last:border-none">{n.message}</div>)
                  }
                </div>
              </div>
            )}
          </div>
          <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 cursor-pointer overflow-hidden">
            {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardView user={user} tasks={tasks} events={events} />}
        {activeTab === 'calendar' && <CalendarView events={events} canEdit={canManageContent} user={user} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} canEdit={canManageContent} />}
        {activeTab === 'matricula' && <MatriculaView user={user} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} />}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t h-20 z-30 shadow-lg">
        <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24}/>} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24}/>} label="Tareas" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24}/>} label="Agenda" />
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24}/>} label="Matrícula" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<Folder size={24}/>} label="Recursos" />
          <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24}/>} label="P.I." />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-orange-500 scale-110' : 'text-gray-400'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}

// --- VISTAS ESPECÍFICAS ---

function DashboardView({ user, tasks, events }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = (events || []).filter(e => e.date === todayStr);
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-[40px] border shadow-sm relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800">¡Hola, {user.firstName}! 👋</h2>
          <p className="text-slate-500">Tenés {(tasks || []).filter(t => t.status !== 'completed').length} tareas pendientes.</p>
        </div>
        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-violet-50 rounded-full opacity-50"></div>
      </div>
      <div className="grid grid-cols-2 gap-4 text-white font-bold">
        <div className="bg-orange-500 p-6 rounded-[35px] shadow-lg">Total Tareas: {(tasks || []).length}</div>
        <div className="bg-violet-600 p-6 rounded-[35px] shadow-lg">Eventos Hoy: {todayEvents.length}</div>
      </div>
    </div>
  );
}

function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    return onSnapshot(q, snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const targetUserId = fd.get('targetUser');
    const targetUser = usersList.find(u => u.id === targetUserId);

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      title: fd.get('title'),
      dueDate: fd.get('dueDate'),
      createdBy: user.firstName,
      assignedToName: targetUser ? (targetUser.fullName || targetUser.firstName) : "Todos",
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-black text-violet-900 italic">TAREAS</h2>
        <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition"><Plus/></button>
      </div>
      <div className="grid gap-3">
        {(tasks || []).map(t => (
          <div key={t.id} className="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-orange-500 uppercase">{t.assignedToName}</p>
              <h3 className="font-bold text-gray-800">{t.title}</h3>
            </div>
            <div className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400">{t.dueDate}</div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white p-8 rounded-[40px] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 text-violet-900 uppercase italic">Nueva Tarea</h3>
            <form onSubmit={addTask} className="space-y-4">
              <input name="title" placeholder="¿Qué hay que hacer?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-violet-200" />
              <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none">
                <option value="all">Asignar a: Todos</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.fullName || u.firstName}</option>)}
              </select>
              <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-gray-400">CANCELAR</button>
                <button type="submit" className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-bold shadow-lg">GUARDAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({ events, canEdit, user }) {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const changeMonth = (offset) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + offset);
    setCurrentDate(d);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[60px] bg-gray-50/30 border border-gray-100"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = (events || []).filter(e => e.date === dateStr);
      days.push(
        <div key={d} className="min-h-[60px] border border-gray-100 p-1 bg-white hover:bg-violet-50 transition overflow-hidden">
          <span className={`text-[10px] font-bold block mb-1 ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-col gap-0.5">
            {dayEvents.map((ev, idx) => (
              <button key={idx} onClick={() => setSelectedEvent(ev)} className="text-[7px] text-left truncate px-1 py-0.5 rounded bg-violet-100 text-violet-700 font-bold w-full">{ev.title}</button>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-violet-900 italic">AGENDA</h2>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-white rounded-xl border shadow-sm text-violet-700"><ChevronLeft size={20}/></button>
          <button onClick={() => changeMonth(1)} className="p-2 bg-white rounded-xl border shadow-sm text-violet-700"><ChevronRight size={20}/></button>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="grid grid-cols-7 text-center py-2 bg-violet-50 text-[9px] font-black text-violet-400 uppercase border-b">
          <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
        </div>
        <div className="grid grid-cols-7 bg-gray-50 gap-px border-b">
          {renderCalendarGrid()}
        </div>
      </div>
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-gray-800 leading-tight">{selectedEvent.title}</h2>
            <p className="text-gray-500 text-sm mt-4 leading-relaxed">{selectedEvent.description || 'Sin descripción adicional.'}</p>
            <div className="mt-8 pt-6 border-t flex justify-between items-center text-gray-400 text-xs font-bold">
               <div className="flex items-center gap-2"><Clock size={16}/> {formatDate(selectedEvent.date)}</div>
               <button onClick={() => setSelectedEvent(null)} className="text-violet-600 font-black">CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [showStats, setShowStats] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleBulkImport = async () => {
    setProcessing(true);
    try {
      const data = JSON.parse(importJson);
      for(const s of data) if(s.lastName) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, createdAt: serverTimestamp() });
      alert("Importación completa");
      setShowDataManagement(false);
    } catch(e) { alert("Error en JSON"); }
    setProcessing(false);
  };

  const filtered = students.filter(s => (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()));

  return (
    <div className="animate-in fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-2xl font-black flex items-center gap-2 italic"><GraduationCap /> LEGAJOS</h2><p className="text-xs font-bold opacity-80 uppercase tracking-widest">{filtered.length} alumnos</p></div>
          <div className="flex gap-2">
            {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
            <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><Activity size={20}/></button>
          </div>
        </div>
        <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar alumno..." className="w-full p-4 bg-white text-gray-800 rounded-2xl shadow-sm outline-none" />
      </div>

      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
            </div>
            <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-[10px] text-gray-400 font-bold uppercase">DNI: {s.dni}</p></div>
            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-tight">{s.level}</span>
          </div>
        ))}
      </div>

      {showStats && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-blue-600 uppercase italic tracking-tighter">Estadísticas</h3>
              <button onClick={() => setShowStats(false)} className="text-gray-300"><X size={24} /></button>
            </div>
            <div className="bg-blue-600 text-white p-8 rounded-[35px] text-center mb-6 shadow-xl">
              <h4 className="text-5xl font-black">{students.length}</h4>
              <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mt-2">Alumnos Registrados</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2">
              {students.map(s => (
                <div key={s.id} className="p-4 bg-gray-50 rounded-2xl text-[10px] font-bold border flex justify-between uppercase">
                  <span className="text-gray-700">{s.lastName}, {s.firstName}</span>
                  <span className="text-blue-600">{s.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-4 text-blue-600 uppercase italic">Importar Alumnos</h3>
            <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "lastName": "Gomez", "firstName": "Ana"... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-xs mb-6 outline-none" />
            <div className="flex gap-3">
              <button onClick={() => setShowDataManagement(false)} className="flex-1 py-4 font-bold text-gray-400">CERRAR</button>
              <button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">{processing ? <RefreshCw className="animate-spin" /> : 'IMPORTAR'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ResourcesView({ resources, canEdit }) {
  const [currentFolder, setCurrentFolder] = useState(null);
  const folders = (resources || []).reduce((acc, res) => {
    const cat = res.category || 'VARIOS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(res);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <div><h2 className="text-2xl font-black text-violet-900 italic uppercase tracking-tighter">RECURSOS</h2><p className="text-[10px] font-bold text-gray-400 uppercase tracking-[4px]">{currentFolder ? `Carpeta: ${currentFolder}` : 'Documentos Institucionales'}</p></div>
        {currentFolder && <button onClick={() => setCurrentFolder(null)} className="bg-gray-100 text-gray-400 p-3 rounded-2xl hover:text-violet-600 transition"><ChevronLeft/></button>}
      </div>

      {!currentFolder ? (
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(folders).map(name => (
            <div key={name} onClick={() => setCurrentFolder(name)} className="bg-white p-8 rounded-[40px] border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer text-center group">
              <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-4 mx-auto group-hover:bg-violet-600 group-hover:text-white transition duration-300">
                <Folder size={32} />
              </div>
              <h3 className="font-black text-gray-700 uppercase text-[10px] tracking-tight">{name}</h3>
              <p className="text-[9px] text-gray-300 font-bold uppercase mt-1">{folders[name].length} elementos</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {folders[currentFolder].map(res => (
            <a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-[30px] border border-gray-100 flex items-center justify-between group hover:border-violet-200 transition">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-50 text-gray-400 rounded-xl group-hover:text-violet-500"><LinkIcon size={18} /></div>
                <span className="font-bold text-gray-700 text-sm">{res.title}</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function ProyectoView({ user }) {
  const [meses, setMeses] = useState([]);
  const [editingMes, setEditingMes] = useState(null);
  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), orderBy('orden', 'asc'));
    return onSnapshot(q, (snap) => setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const inicializarProyecto = async () => {
    const estructuraBase = "🌍 EJE: La Vuelta al Mundo en 360 días\n\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:";
    const mesesNombres = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    for (let i = 0; i < mesesNombres.length; i++) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), {
        nombre: mesesNombres[i],
        orden: i,
        eje: "La Vuelta al Mundo en 360 días",
        contenidos: estructuraBase
      });
    }
  };

  return (
    <div className="animate-in slide-in-from-bottom-6 duration-700">
      <div className="bg-indigo-900 p-10 rounded-[50px] text-white mb-8 relative overflow-hidden shadow-2xl">
        <h2 className="text-3xl font-black italic tracking-tighter">Proyecto 360</h2>
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-[6px] mt-2">La Vuelta al Mundo</p>
        {isAdmin && meses.length === 0 && (
          <button onClick={inicializarProyecto} className="mt-6 bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-2xl text-[10px] font-black shadow-lg transition-all active:scale-95">CARGAR ESTRUCTURA ANUAL</button>
        )}
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full"></div>
      </div>

      <div className="space-y-4">
        {meses.map(m => (
          <div key={m.id} className="bg-white p-6 rounded-[40px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-indigo-900 uppercase text-sm tracking-widest">{m.nombre}</h3>
              <span className="text-[9px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase">{m.eje}</span>
            </div>
            <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-6 rounded-[30px] border border-gray-50 font-medium">
              {m.contenidos}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProfileView({ user, onLogout }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-12 rounded-[60px] text-center shadow-xl border relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-violet-600 to-indigo-800"></div>
        <div className="w-32 h-32 rounded-[40px] bg-white mx-auto mb-6 relative z-10 shadow-2xl mt-6 p-1">
          <div className="w-full h-full rounded-[36px] bg-gray-50 flex items-center justify-center overflow-hidden">
             {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-violet-600 uppercase">{user.firstName?.[0]}</span>}
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">{user.fullName || user.firstName}</h2>
        <p className="text-orange-500 font-black uppercase tracking-[5px] mt-2 text-[10px]">{user.role}</p>
      </div>
      <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-6 rounded-[40px] font-black text-lg flex items-center justify-center gap-4 shadow-lg border-2 border-red-100 uppercase tracking-widest transition-all active:scale-95"><LogOut size={24}/> Salir del Portal</button>
    </div>
  );
}
