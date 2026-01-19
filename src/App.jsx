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
 } catch (e) { console.log("Config global..."); }
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

// --- FUNCIONES DE NOTIFICACIÓN ---
const triggerMobileNotification = (title, body) => {
 if (!("Notification" in window)) return;
 if (Notification.permission === "granted") {
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
   navigator.serviceWorker.ready.then((registration) => {
    registration.showNotification(title, { body, icon: '/icon-192.png', vibrate: [200, 100, 200] });
   });
  } else {
   try { new Notification(title, { body, icon: '/icon-192.png' }); } catch (e) { console.log("Bloqueada"); }
  }
 }
};

const requestPermission = async () => {
 try {
  const permission = await Notification.requestPermission();
  if (permission === 'granted' && messaging) {
   const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
   return currentToken;
  }
 } catch (error) { console.error('Error permiso:', error); }
};

const onMessageListener = () => new Promise((resolve) => {
 if (messaging) onMessage(messaging, (payload) => resolve(payload));
});

// --- UTILS ---
const calculateAge = (dateString) => {
 if (!dateString) return '-';
 const birthDate = new Date(dateString);
 const today = new Date();
 let age = today.getFullYear() - birthDate.getFullYear();
 const m = today.getMonth() - birthDate.getMonth();
 if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
 return age;
};

const formatDate = (dateString) => {
 if (!dateString) return '';
 return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
 const [currentUserProfile, setCurrentUserProfile] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  requestPermission();
  onMessageListener().then((payload) => {
   if (payload?.notification) triggerMobileNotification(payload.notification.title, payload.notification.body);
  });
 }, []);

 useEffect(() => {
  if (!auth) { setLoading(false); return; }
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

 if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><RefreshCw className="animate-spin text-violet-600" /></div>;
 if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;

 return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- PANTALLA LOGIN ---
function LoginScreen({ onLogin }) {
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [checking, setChecking] = useState(false);
 const [showRecover, setShowRecover] = useState(false);
 const [recoverUser, setRecoverUser] = useState('');
 const [recoverStatus, setRecoverStatus] = useState('idle');
 const [showInstall, setShowInstall] = useState(false);
 const [deferredPrompt, setDeferredPrompt] = useState(null);
 const [esIos, setEsIos] = useState(false);
 const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

 useEffect(() => {
  const iosCheck = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
  setEsIos(iosCheck);
  const handleBeforeInstallPrompt = (e) => {
   e.preventDefault(); setDeferredPrompt(e);
   if (!isStandalone) setShowInstall(true);
  };
  window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  if (iosCheck && !isStandalone) {
   const timer = setTimeout(() => setShowInstall(true), 3000);
   return () => clearTimeout(timer);
  }
  return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
 }, [isStandalone]);

 const handleInstalarClick = async () => {
  if (deferredPrompt) {
   deferredPrompt.prompt();
   const { outcome } = await deferredPrompt.userChoice;
   if (outcome === 'accepted') setShowInstall(false);
   setDeferredPrompt(null);
  }
 };

 const handleSubmit = async (e) => {
  e.preventDefault(); setError(''); setChecking(true);
  if (username === 'admin' && password === 'admin123') {
   onLogin({ id: 'super-admin', firstName: 'Super', lastName: 'Admin', fullName: 'Super Admin', role: 'Equipo Directivo', rol: 'super-admin', isAdmin: true, username: 'admin' });
   return;
  }
  try {
   const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
   const q = query(usersRef, where('username', '==', username), where('password', '==', password));
   const snap = await getDocs(q);
   if (!snap.empty) {
    const userDoc = snap.docs[0];
    const userData = userDoc.data();
    onLogin({ ...userData, id: userDoc.id, isAdmin: userData.rol === 'admin' });
   } else { setError('Usuario o contraseña incorrectos.'); }
  } catch (err) { setError('Error de conexión.'); } finally { setChecking(false); }
 };

 return (
  <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6 relative">
   {!isStandalone && showInstall && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
     <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
      <Smartphone className="text-violet-600 mx-auto mb-4 animate-bounce" size={40} />
      <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Instalá la App! 📲</h3>
      <p className="text-gray-600 mb-6 text-sm">Accedé más rápido agregando el Portal a tu pantalla de inicio.</p>
      <div className="flex flex-col gap-3">
       {!esIos ? (
        <button onClick={handleInstalarClick} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg">INSTALAR AHORA</button>
       ) : (
        <div className="text-left bg-gray-50 p-4 rounded-xl border text-sm text-gray-700">1. Tocá <strong>Compartir</strong> <Share size={12} className="inline"/><br/>2. Seleccioná <strong>"Agregar a Inicio"</strong> <PlusSquare size={12} className="inline"/></div>
       )}
       <button onClick={() => setShowInstall(false)} className="text-gray-400 text-sm font-medium underline mt-2">Quizás más tarde</button>
      </div>
     </div>
    </div>
   )}
   <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
    <div className="text-center mb-8">
     <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-20 mx-auto mb-4" />
     <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">PORTAL INSTITUCIONAL<br/><span className="text-orange-500 text-lg">JUNTOS A LA PAR</span></h1>
    </div>
    {!showRecover ? (
     <form onSubmit={handleSubmit} className="space-y-6">
      <input type="text" required className="w-full p-4 bg-violet-50 border border-violet-100 rounded-xl outline-none" placeholder="Usuario" onChange={(e) => setUsername(e.target.value)} />
      <input type="password" required className="w-full p-4 bg-violet-50 border border-violet-100 rounded-xl outline-none" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
      <button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 float-right">¿Olvidaste tu contraseña?</button>
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl font-bold border border-red-100 clear-both">{error}</div>}
      <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg shadow-xl">{checking ? <RefreshCw className="animate-spin mx-auto" /> : 'INGRESAR AL PORTAL'}</button>
     </form>
    ) : (
     <div className="text-center">
      <Key className="mx-auto text-violet-500 mb-2" size={40} />
      <h3 className="font-bold text-violet-900 text-lg mb-4 tracking-tighter uppercase">Solicitar Blanqueo</h3>
      {recoverStatus === 'sent' ? (
       <div className="bg-green-100 text-green-700 p-4 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
      ) : (
       <form onSubmit={async (e) => {
        e.preventDefault(); if(!recoverUser.trim()) return; setRecoverStatus('sending');
        try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), { type: 'password_reset', username: recoverUser, status: 'pending', createdAt: serverTimestamp() }); setRecoverStatus('sent'); } 
        catch (e) { setRecoverStatus('error'); }
       }}>
        <input className="w-full p-3 bg-white border rounded-xl mb-3 text-center outline-none focus:ring-2 ring-orange-400" placeholder="Tu Usuario" onChange={(e) => setRecoverUser(e.target.value)} required />
        <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition shadow-lg">ENVIAR SOLICITUD</button>
       </form>
      )}
      <button onClick={() => setShowRecover(false)} className="text-gray-400 text-xs font-bold mt-4 underline">Volver al inicio</button>
     </div>
    )}
   </div>
  </div>
 );
}

function MainApp({ user, onLogout }) {
 const [activeTab, setActiveTab] = useState('dashboard');
 const [tasks, setTasks] = useState([]);
 const [events, setEvents] = useState([]);
 const [resources, setResources] = useState([]);
 const [notifications, setNotifications] = useState([]);
 const [showNotifPanel, setShowNotifPanel] = useState(false);

 const isSuperAdmin = user.rol === 'super-admin';
 const canManageContent = user.rol === 'admin' || isSuperAdmin;

 useEffect(() => {
  const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const unsubNotifs = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id)), snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const unsubRes = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), snap => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubRes(); };
 }, [user.id]);

 const unreadCount = notifications.filter(n => !n.read).length;

 return (
  <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
   <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
    <div className="flex items-center space-x-3">
     <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
     <div><h1 className="font-bold text-sm leading-tight tracking-tighter">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div>
    </div>
    <div className="flex items-center gap-3">
     <div className="relative">
      <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
       <Bell size={20} />
       {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{unreadCount}</span>}
      </button>
      {showNotifPanel && (
       <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 z-[100]">
        <div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos Recientes</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div>
        <div className="max-h-80 overflow-y-auto">
         {notifications.length === 0 ? <p className="p-8 text-center text-xs text-gray-400 italic">No tenés avisos nuevos</p> : 
         notifications.map(n => (<div key={n.id} className="p-4 border-b hover:bg-gray-50 transition"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}
        </div>
       </div>
      )}
     </div>
     <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer shadow-inner">
      {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName[0]}
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

   <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg pb-safe">
    <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
     <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
     <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" />
     <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
     <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Legajos" />
     <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24} />} label="P.I." />
    </div>
   </nav>
  </div>
 );
}

function NavButton({ active, onClick, icon, label, badge }) {
 return (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all ${active ? 'text-orange-500' : 'text-gray-400 hover:text-violet-600'}`}>
   <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
    {icon}
    {badge > 0 && <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">{badge}</span>}
   </div>
   <span className={`text-[10px] font-black ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
  </button>
 );
}

// --- VISTA DASHBOARD ---
function DashboardView({ user, tasks, events }) {
 const todayStr = new Date().toISOString().split('T')[0];
 const todayEvents = events.filter(e => e.date === todayStr);
 return (
  <div className="space-y-6 animate-in fade-in duration-700">
   <div className="bg-white p-8 rounded-[40px] shadow-sm border border-violet-100 relative overflow-hidden">
    <div className="relative z-10">
     <h2 className="text-3xl font-black text-slate-800 tracking-tight italic">¡Hola, {user.firstName}! 👋</h2>
     <p className="text-slate-500 font-medium mt-1">Tenés {(tasks || []).filter(t => t.status !== 'completed').length} tareas para hoy.</p>
    </div>
    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-violet-50 rounded-full opacity-50"></div>
   </div>
   <div className="grid grid-cols-2 gap-4">
    <div className="bg-orange-500 p-6 rounded-[35px] text-white shadow-lg shadow-orange-200">
     <div className="flex justify-between items-start mb-4"><div className="bg-white/20 p-2 rounded-xl"><CheckSquare size={20}/></div><span className="text-2xl font-black">{tasks.filter(t => t.status !== 'completed').length}</span></div>
     <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 italic">Tareas Pendientes</p>
    </div>
    <div className="bg-violet-600 p-6 rounded-[35px] text-white shadow-lg shadow-violet-200">
     <div className="flex justify-between items-start mb-4"><div className="bg-white/20 p-2 rounded-xl"><CalendarIcon size={20}/></div><span className="text-2xl font-black">{todayEvents.length}</span></div>
     <p className="text-[10px] font-bold uppercase tracking-wider opacity-80 italic">Eventos Hoy</p>
    </div>
   </div>
   <div className="space-y-3">
    <h3 className="font-black text-slate-800 ml-2 uppercase text-xs tracking-widest text-violet-900 italic">Agenda del día</h3>
    {todayEvents.length > 0 ? todayEvents.map(e => (
     <div key={e.id} className="bg-white p-4 rounded-3xl border-l-8 border-orange-400 shadow-sm flex items-center justify-between">
      <span className="font-bold text-slate-700 italic">{e.title}</span><span className="text-[10px] font-black text-orange-500 uppercase">{e.type}</span>
     </div>
    )) : <div className="bg-slate-100/50 p-6 rounded-3xl border-2 border-dashed border-slate-200 text-center"><p className="text-slate-400 text-xs font-bold italic">No hay eventos para hoy</p></div>}
   </div>
  </div>
 );
}

// --- VISTA MATRÍCULA (RESTAURADA) ---
function MatriculaView({ user }) {
 const [students, setStudents] = useState([]);
 const [filterText, setFilterText] = useState('');
 const [viewingStudent, setViewingStudent] = useState(null);
 const [showStats, setShowStats] = useState(false);
 const [showForm, setShowForm] = useState(false);
 const [showDataManagement, setShowDataManagement] = useState(false);
 const [editingStudent, setEditingStudent] = useState(null);
 const [importJson, setImportJson] = useState('');
 const [statFilters, setStatFilters] = useState({ level: 'all', gender: 'all' });
 const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
  return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 const filteredStudents = students.filter(s => {
  const textMatch = (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText);
  return textMatch;
 });

 const statsResults = students.filter(s => (statFilters.level === 'all' || s.level === statFilters.level) && (statFilters.gender === 'all' || s.gender === statFilters.gender));

 const handleSave = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  if (editingStudent) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
  else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
  setShowForm(false); setEditingStudent(null);
 };

 return (
  <div className="animate-in fade-in">
   <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
    <div className="flex justify-between items-center mb-4">
     <div><h2 className="text-2xl font-black italic uppercase"><GraduationCap className="inline mr-2" /> Legajos</h2><p className="text-xs font-bold opacity-80 uppercase tracking-widest">{filteredStudents.length} alumnos registrados</p></div>
     <div className="flex gap-2">
      {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
      <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><Activity size={20}/></button>
      {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl"><Plus size={20}/></button>}
     </div>
    </div>
    <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar por apellido, nombre o DNI..." className="w-full p-4 bg-white text-gray-800 rounded-2xl shadow-sm outline-none border-none shadow-inner" />
   </div>

   <div className="space-y-3">
    {filteredStudents.map(s => (
     <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition cursor-pointer">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
       {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
      </div>
      <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400 font-black tracking-tighter">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase border border-blue-100 shadow-sm">{s.level}</span>
     </div>
    ))}
   </div>

   {/* MODALES DE MATRÍCULA */}
   {showStats && (
    <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
     <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-blue-600 uppercase italic">Estadísticas</h3><button onClick={() => setShowStats(false)} className="text-gray-300 hover:text-red-500"><X size={24} /></button></div>
      <div className="grid grid-cols-2 gap-4 mb-6">
       <select onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none border border-gray-100">
        <option value="all">Niveles</option><option value="INICIAL">Inicial</option><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option><option value="CFI">CFI</option>
       </select>
       <select onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none border border-gray-100">
        <option value="all">Géneros</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro</option>
       </select>
      </div>
      <div className="bg-blue-600 text-white p-8 rounded-[35px] text-center mb-6 shadow-xl"><h4 className="text-5xl font-black">{statsResults.length}</h4><p className="text-[10px] font-bold opacity-80 uppercase tracking-[5px] mt-2">Coincidencias</p></div>
      <div className="flex-1 overflow-y-auto space-y-2">
       {statsResults.map(s => (<div key={s.id} className="p-4 bg-gray-50 rounded-2xl text-[10px] font-black border flex justify-between uppercase italic"><span>{s.lastName}, {s.firstName}</span><span className="text-blue-600">{s.level}</span></div>))}
      </div>
     </div>
    </div>
   )}

   {viewingStudent && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
     <div className="bg-white rounded-[45px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
      <div className="bg-blue-600 p-8 text-white relative">
       <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X/></button>
       <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-lg">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" /> : <User size={40}/>}</div>
        <div><h2 className="text-2xl font-black leading-tight italic uppercase">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-80 text-xs font-bold uppercase tracking-widest mt-1 italic">DNI: {viewingStudent.dni}</p></div>
       </div>
      </div>
      <div className="p-8 space-y-5 bg-white text-sm">
       <div className="grid grid-cols-2 gap-4">
        <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest italic">Nivel</p><p className="font-black text-gray-700 bg-gray-50 p-2 rounded-lg text-xs">{viewingStudent.level || '-'}</p></div>
        <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest italic">Género</p><p className="font-black text-gray-700 bg-gray-50 p-2 rounded-lg text-xs">{viewingStudent.gender || '-'}</p></div>
       </div>
       <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest italic">Jornada</p><p className="font-black text-gray-700 bg-gray-50 p-2 rounded-lg italic text-xs uppercase">{viewingStudent.journey || '-'}</p></div>
       <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest italic">Diagnóstico (DX)</p><p className="bg-blue-50/50 p-4 rounded-xl text-blue-900 font-medium italic border border-blue-100 leading-relaxed text-xs">{viewingStudent.dx || 'Sin diagnóstico cargado.'}</p></div>
       {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg mt-2 uppercase tracking-tighter">Editar Ficha</button>}
      </div>
     </div>
    </div>
   )}

   {showForm && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
      <h3 className="text-2xl font-black mb-8 border-b pb-4 text-gray-800 uppercase italic tracking-tighter">{editingStudent ? 'Actualizar Ficha' : 'Nueva Ficha Alumno'}</h3>
      <form onSubmit={handleSave} className="space-y-4 text-left">
       <div className="grid grid-cols-2 gap-4">
        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-none font-bold" />
        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-none font-bold" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
        <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <select name="level" defaultValue={editingStudent?.level} className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500">
         <option value="">Nivel</option><option value="INICIAL">Inicial</option><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option><option value="CFI">CFI</option>
        </select>
        <select name="gender" defaultValue={editingStudent?.gender} className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500">
         <option value="">Género</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro</option>
        </select>
       </div>
       <input name="journey" defaultValue={editingStudent?.journey} placeholder="Jornada (Ej: Mañana, Tarde, Completa)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold italic" />
       <textarea name="dx" defaultValue={editingStudent?.dx} rows="4" placeholder="Diagnóstico (DX)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-sm font-medium" />
       <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowForm(false)} className="flex-1 font-bold text-gray-400 uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Guardar Cambios</button></div>
      </form>
     </div>
    </div>
   )}

   {showDataManagement && (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
     <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl text-center">
      <h3 className="text-2xl font-black mb-4 text-blue-600 italic tracking-tighter uppercase">Importar Base de Alumnos</h3>
      <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='Ej: [ { "lastName": "Gómez", "firstName": "Ana"... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-[10px] mb-6 outline-none" />
      <div className="flex gap-3"><button onClick={() => setShowDataManagement(false)} className="flex-1 font-bold text-gray-400 uppercase">Cerrar</button><button onClick={async () => {
       try { const data = JSON.parse(importJson); for(const s of data) if(s.lastName) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, createdAt: serverTimestamp() }); alert("Éxito"); setShowDataManagement(false); } catch(e) { alert("Error"); }
      }} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg uppercase">IMPORTAR JSON</button></div>
     </div>
    </div>
   )}
  </div>
 );
}

// --- VISTA TAREAS (RESTAURADA) ---
function TasksView({ tasks, user, canEdit }) {
 const [showModal, setShowModal] = useState(false);
 const [usersList, setUsersList] = useState([]);
 useEffect(() => {
  const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users')), snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  return () => unsub();
 }, []);

 const addTask = async (e) => {
  e.preventDefault(); const fd = new FormData(e.target);
  const tId = fd.get('targetUser'); const tUser = usersList.find(u => u.id === tId);
  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
   title: fd.get('title'), dueDate: fd.get('dueDate'), priority: fd.get('priority'), 
   assignedToName: tUser ? (tUser.fullName || tUser.firstName) : "Todos",
   createdBy: user.firstName, status: 'pending', createdAt: serverTimestamp()
  });
  setShowModal(false);
 };

 return (
  <div className="space-y-4 animate-in slide-in-from-bottom-4">
   <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Tareas de Gestión</h2><button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition"><Plus/></button></div>
   <div className="grid gap-3">
    {(tasks || []).map(t => (
     <div key={t.id} className="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center group hover:border-orange-200 transition">
      <div><p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1 italic">{t.assignedToName}</p><h3 className="font-bold text-gray-800 text-sm tracking-tight">{t.title}</h3></div>
      <div className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400 border border-gray-100 uppercase tracking-tighter italic">{t.dueDate}</div>
     </div>
    ))}
   </div>
   {showModal && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
     <form onSubmit={addTask} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 space-y-4">
      <h3 className="text-xl font-black mb-4 uppercase italic text-violet-900 tracking-tighter">Nueva Tarea Institucional</h3>
      <input name="title" placeholder="¿Qué hay que hacer?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic font-medium" />
      <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500 border border-gray-100 shadow-inner">
       <option value="all">Asignar a: Todos</option>{usersList.map(u => <option key={u.id} value={u.id}>{u.fullName || u.firstName}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-4">
       <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-gray-400 font-bold text-xs" />
       <select name="priority" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest border border-gray-100 shadow-inner text-orange-500">
        <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
       </select>
      </div>
      <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 uppercase tracking-widest">Descartar</button><button type="submit" className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Crear Tarea</button></div>
     </form>
    </div>
   )}
  </div>
 );
}

function CalendarView({ events, canEdit, user }) {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedEvent, setSelectedEvent] = useState(null);
 const [showModal, setShowModal] = useState(false);
 const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(new Date(d)); };
 
 const renderGrid = () => {
  const year = currentDate.getFullYear(); const month = currentDate.getMonth();
  const days = []; const first = new Date(year, month, 1).getDay();
  for (let i = 0; i < first; i++) days.push(<div key={`e-${i}`} className="min-h-[70px] bg-gray-50/20 border-b border-r border-gray-100"></div>);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
   const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
   const dayEvents = (events || []).filter(e => e.date === dateStr);
   days.push(
    <div key={d} className="min-h-[70px] border-b border-r border-gray-100 p-1 bg-white hover:bg-violet-50 transition text-center overflow-hidden">
     <span className={`text-[10px] font-black ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
     <div className="flex flex-col gap-0.5 mt-1">
      {dayEvents.map((ev, idx) => (<button key={idx} onClick={() => setSelectedEvent(ev)} className="text-[7px] bg-violet-100 text-violet-700 rounded p-0.5 truncate font-bold uppercase shadow-sm">{ev.title}</button>))}
     </div>
    </div>
   );
  }
  return days;
 };

 return (
  <div className="space-y-4 animate-in fade-in duration-500 pb-10">
   <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Calendario</h2>
    <div className="flex gap-2 items-center bg-white p-1 rounded-xl shadow-sm border border-gray-100">
     <button onClick={() => changeMonth(-1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg"><ChevronLeft size={20}/></button>
     <span className="font-black text-violet-900 capitalize text-sm min-w-[140px] text-center italic">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
     <button onClick={() => changeMonth(1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg"><ChevronRight size={20}/></button>
    </div>
    {canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg"><Plus/></button>}
   </div>
   <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden grid grid-cols-7 border-t-8 border-violet-600">
    {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="text-[9px] font-black text-violet-400 uppercase p-3 border-b text-center bg-violet-50/50 tracking-[2px]">{d}</div>)}
    {renderGrid()}
   </div>
   {showModal && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <form onSubmit={async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description'), createdAt: serverTimestamp() });
      setShowModal(false);
     }} className="bg-white rounded-[45px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95">
      <h3 className="text-xl font-black italic uppercase text-violet-900 tracking-tighter">Agendar Evento</h3>
      <input name="title" placeholder="Título del evento" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic font-bold" />
      <input name="date" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
      <select name="type" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest shadow-inner border border-gray-100">
       {['GENERAL', 'SALIDA EDUCATIVA', 'EFEMÉRIDES', 'ACTO', 'REUNIÓN'].map(t => <option key={t} value={t}>{t}</option>)}
      </select>
      <textarea name="description" placeholder="Observaciones adicionales" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-sm" />
      <button type="submit" className="w-full py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Guardar Evento</button>
     </form>
    </div>
   )}
   {selectedEvent && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
     <div className="bg-white rounded-[45px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
      <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-[3px] border border-orange-100 shadow-sm">{selectedEvent.type}</span>
      <h2 className="text-2xl font-black text-gray-800 leading-tight italic uppercase mt-5 tracking-tighter">{selectedEvent.title}</h2>
      <p className="text-gray-500 text-sm mt-5 leading-relaxed font-medium italic border-l-4 border-violet-100 pl-4 bg-gray-50/50 p-4 rounded-r-2xl shadow-inner">{selectedEvent.description || 'Sin descripción institucional.'}</p>
      <div className="mt-10 pt-6 border-t flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-[2px]">
       <div className="flex items-center gap-2 italic"><Clock size={16}/> {formatDate(selectedEvent.date)}</div><button onClick={() => setSelectedEvent(null)} className="text-violet-600 font-black tracking-[4px]">CERRAR</button>
      </div>
     </div>
    </div>
   )}
  </div>
 );
}

function ResourcesView({ resources }) {
 const [folder, setFolder] = useState(null);
 const folders = resources.reduce((acc, r) => { const cat = r.category || 'VARIOS'; if (!acc[cat]) acc[cat] = []; acc[cat].push(r); return acc; }, {});
 return (
  <div className="space-y-4 animate-in slide-in-from-bottom-4">
   <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase italic">Recursos</h2>
    {folder && <button onClick={() => setFolder(null)} className="bg-gray-100 p-2 rounded-xl text-xs font-black uppercase text-violet-700 shadow-sm border border-gray-100 flex items-center gap-1"><ChevronLeft size={14}/> Volver</button>}
   </div>
   {!folder ? (
    <div className="grid grid-cols-2 gap-4 pb-10">
     {Object.keys(folders).map(name => (
      <div key={name} onClick={() => setFolder(name)} className="bg-white p-8 rounded-[45px] border border-violet-50 text-center cursor-pointer shadow-sm hover:scale-105 transition-all group">
       <div className="w-16 h-16 bg-violet-50 text-violet-200 rounded-3xl flex items-center justify-center mb-4 mx-auto group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner"><Folder size={32} /></div>
       <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-700 leading-none">{name}</h3>
       <p className="text-[9px] font-bold text-gray-300 mt-3 uppercase tracking-widest">{folders[name].length} elementos</p>
      </div>
     ))}
    </div>
   ) : (
    <div className="grid gap-3 pb-20">
     {folders[folder].map(r => (
      <a key={r.id} href={r.url} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-[30px] border border-violet-50 font-black text-sm text-gray-700 hover:border-violet-300 transition-all flex justify-between items-center shadow-sm hover:shadow-md">
       <span className="flex items-center gap-4 italic tracking-tight"><FileText size={20} className="text-violet-200" /> {r.title}</span><ChevronRight size={18} className="text-gray-200" />
      </a>
     ))}
    </div>
   )}
  </div>
 );
}

function ProyectoView({ user }) {
 const [meses, setMeses] = useState([]);
 const [editing, setEditing] = useState(null);
 const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';
 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), orderBy('orden', 'asc'));
  return onSnapshot(q, snap => setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 return (
  <div className="space-y-6 pb-24">
   <div className="bg-indigo-900 p-10 rounded-[55px] text-white shadow-2xl relative overflow-hidden text-center border-b-8 border-orange-500">
    <h2 className="text-3xl font-black italic tracking-tighter uppercase italic">Proyecto 360</h2>
    <p className="text-[10px] font-bold opacity-60 uppercase mt-3 tracking-[8px] italic">Vuelta al Mundo</p>
    {isAdmin && meses.length === 0 && <button onClick={async () => {
     const names = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
     for(let i=0; i<names.length; i++) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), { nombre: names[i], orden: i, eje: "La Vuelta al Mundo en 360 días", contenidos: "🌍 EJE: La Vuelta al Mundo\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:" });
    }} className="mt-6 bg-orange-500 px-8 py-3 rounded-full text-[10px] font-black shadow-lg uppercase tracking-widest hover:scale-110 transition shadow-orange-500/20">Inicializar Proyecto</button>}
   </div>
   <div className="space-y-5">
    {meses.map(m => (
     <div key={m.id} className="bg-white p-7 rounded-[40px] border border-violet-50 shadow-sm relative group hover:shadow-xl transition-all border-l-8 border-violet-100">
      <div className="flex justify-between items-center mb-4"><h3 className="font-black text-violet-900 uppercase text-sm tracking-widest italic">{m.nombre}</h3>{isAdmin && <button onClick={() => setEditing(m)} className="p-2 text-gray-200 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"><Edit3 size={20}/></button>}</div>
      <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed italic bg-gray-50/50 p-6 rounded-[35px] border border-gray-50 font-medium font-serif shadow-inner">{m.contenidos}</div>
     </div>
    ))}
   </div>
   {editing && (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
     <form onSubmit={async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proyecto2026', editing.id), { eje: fd.get('eje'), contenidos: fd.get('contenidos') });
      setEditing(null);
     }} className="bg-white rounded-[50px] w-full max-w-2xl p-10 shadow-2xl space-y-5 animate-in zoom-in-95 border-t-8 border-violet-600">
      <h3 className="text-xl font-black italic text-violet-900 uppercase italic tracking-[2px]">Editando {editing.nombre}</h3>
      <input name="eje" defaultValue={editing.eje} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-black uppercase text-[10px] tracking-widest border border-gray-100 shadow-inner" />
      <textarea name="contenidos" defaultValue={editing.contenidos} rows="10" className="w-full p-6 bg-gray-50 rounded-[35px] outline-none text-xs font-mono font-bold text-slate-500 italic shadow-inner border border-gray-100" />
      <div className="flex gap-4 pt-4"><button type="button" onClick={() => setEditing(null)} className="flex-1 font-black text-gray-400 uppercase tracking-widest text-[10px]">Descartar</button><button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest text-[10px] shadow-violet-500/20">Guardar Cambios</button></div>
     </form>
    </div>
   )}
  </div>
 );
}

function ProfileView({ user, onLogout }) {
 const [installPrompt, setInstallPrompt] = useState(null);
 useEffect(() => { window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); }); }, []);
 return (
  <div className="space-y-6 text-center animate-in fade-in duration-700 pb-20">
   <div className="bg-white p-12 rounded-[65px] shadow-2xl border border-violet-50 relative overflow-hidden border-b-8 border-violet-600">
    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-violet-600 to-indigo-800 shadow-inner"></div>
    <div className="w-36 h-36 rounded-[45px] bg-white mx-auto mb-6 relative z-10 shadow-2xl mt-6 p-1 border-4 border-white">
     <div className="w-full h-full rounded-[40px] bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-violet-100 shadow-inner">
      {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover shadow-lg" /> : <div className="text-5xl font-black text-violet-600 uppercase italic font-serif">{user.firstName?.[0]}</div>}
     </div>
    </div>
    <h2 className="text-3xl font-black text-gray-800 tracking-tight italic uppercase tracking-widest">{user.fullName}</h2>
    <p className="text-orange-500 font-black uppercase tracking-[6px] mt-2 text-[10px] bg-orange-50 inline-block px-4 py-1 rounded-full shadow-sm">{user.role}</p>
    <div className="mt-12 space-y-3">
     <button onClick={requestPermission} className="w-full flex items-center justify-between p-5 bg-violet-50 rounded-2xl text-violet-700 font-black text-[10px] uppercase tracking-[3px] hover:bg-violet-600 hover:text-white transition-all shadow-sm border border-violet-100"><span>Habilitar Notificaciones</span><Bell size={18} /></button>
     {installPrompt && (<button onClick={() => installPrompt.prompt()} className="w-full flex items-center justify-between p-5 bg-orange-50 rounded-2xl text-orange-600 font-black text-[10px] uppercase tracking-[3px] hover:bg-orange-600 hover:text-white transition-all shadow-sm border border-orange-100"><span>Instalar App Oficial</span><Download size={18} /></button>)}
    </div>
   </div>
   <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-7 rounded-[45px] font-black text-lg flex items-center justify-center gap-5 shadow-xl border-2 border-red-100 uppercase tracking-[5px] transition-all active:scale-95 shadow-red-500/10 hover:bg-red-600 hover:text-white"><LogOut size={26}/> SALIR DEL PORTAL</button>
   <p className="text-[9px] font-black text-gray-300 uppercase tracking-[5px] italic">Soporte Digital 2026</p>
  </div>
 );
}
