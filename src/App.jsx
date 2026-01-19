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

// --- FUNCIONES DE NOTIFICACIÓN ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body, icon: '/icon-192.png', vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: '/icon-192.png' }); } catch (e) { console.log("Notificación bloqueada."); }
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
  } catch (error) { console.error('Error al pedir permiso:', error); }
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
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
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
      onLogin({ id: 'super-admin', firstName: 'Admin', role: 'Dirección', rol: 'super-admin', isAdmin: true });
      return;
    }
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', username), where('password', '==', password));
      const snap = await getDocs(q);
      if (!snap.empty) {
        onLogin({ id: snap.docs[0].id, ...snap.docs[0].data(), isAdmin: snap.docs[0].data().rol === 'admin' });
      } else { setError('Usuario o contraseña incorrectos.'); }
    } catch (err) { setError('Error de conexión.'); } finally { setChecking(false); }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault(); if(!recoverUser.trim()) return; setRecoverStatus('sending');
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), { type: 'password_reset', username: recoverUser, status: 'pending', createdAt: serverTimestamp() });
      setRecoverStatus('sent');
    } catch (error) { setRecoverStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6 relative">
      {!isStandalone && showInstall && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center">
            <Smartphone className="text-violet-600 mx-auto mb-4 animate-bounce" size={40} />
            <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Instala la App! 📲</h3>
            <p className="text-gray-600 mb-6 text-sm">Accede más rápido desde tu pantalla de inicio.</p>
            <div className="flex flex-col gap-3">
              {!esIos ? (
                <button onClick={handleInstalarClick} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl shadow-lg">INSTALAR AHORA</button>
              ) : (
                <div className="text-left bg-gray-50 p-4 rounded-xl border text-sm text-gray-700">1. Toca <strong>Compartir</strong> <Share size={12} className="inline"/><br/>2. Selecciona <strong>"Agregar a Inicio"</strong> <PlusSquare size={12} className="inline"/></div>
              )}
              <button onClick={() => setShowInstall(false)} className="text-gray-400 text-sm underline mt-2">Quizás más tarde</button>
            </div>
          </div>
        </div>
      )}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
        <div className="text-center mb-8">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-16 mx-auto mb-4" />
          <h1 className="text-xl font-black text-violet-900 uppercase">Portal Institucional</h1>
        </div>
        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Usuario" onChange={e => setUsername(e.target.value)} />
            <input type="password" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Contraseña" onChange={e => setPassword(e.target.value)} />
            <button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 float-right">¿Olvidaste tu contraseña?</button>
            {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
            <button type="submit" disabled={checking} className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold shadow-lg">
              {checking ? <RefreshCw className="animate-spin mx-auto" /> : 'INGRESAR'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <Key className="mx-auto text-violet-500 mb-2" size={40} />
            <h3 className="font-bold text-violet-900 mb-4">Solicitar Blanqueo</h3>
            {recoverStatus === 'sent' ? (
              <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold italic">¡Solicitud Enviada!</div>
            ) : (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <input className="w-full p-3 bg-violet-50 rounded-xl outline-none text-center" placeholder="Tu Usuario" onChange={e => setRecoverUser(e.target.value)} required />
                <button type="submit" disabled={recoverStatus === 'sending'} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold">ENVIAR</button>
              </form>
            )}
            <button onClick={() => setShowRecover(false)} className="text-gray-400 text-xs mt-4 underline">Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- MAIN APP ---
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
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-10 w-auto" />
          <h1 className="font-bold text-sm leading-tight">Juntos a la Par <br/><span className="text-[10px] text-orange-200 uppercase">{user.firstName}</span></h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{notifications.filter(n => !n.read).length}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border p-4 z-[100] animate-in fade-in zoom-in-95">
                <h3 className="font-black text-violet-900 text-sm mb-2 uppercase tracking-tighter">Avisos Recientes</h3>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? <p className="text-xs text-gray-400 italic text-center py-4">No tienes avisos nuevos</p> : 
                  notifications.map(n => <div key={n.id} className="p-3 border-b text-xs text-gray-700 font-medium italic">{n.message}</div>)}
                </div>
              </div>
            )}
          </div>
          <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 cursor-pointer overflow-hidden">{user.photoUrl ? <img src={user.photoUrl} className="object-cover w-full h-full" /> : user.firstName?.[0]}</div>
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

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg">
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
    <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-orange-500 scale-110 transition-all' : 'text-gray-400'}`}>
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
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-violet-100 relative overflow-hidden">
        <h2 className="text-3xl font-black text-slate-800">¡Hola, {user.firstName}! 👋</h2>
        <p className="text-slate-500 mt-1 font-medium">Tenés {(tasks || []).filter(t => t.status !== 'completed').length} tareas hoy.</p>
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-violet-50 rounded-full opacity-50"></div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-500 p-6 rounded-[35px] text-white shadow-lg shadow-orange-200">
          <h4 className="text-2xl font-black">{(tasks || []).length}</h4><p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Tareas</p>
        </div>
        <div className="bg-violet-600 p-6 rounded-[35px] text-white shadow-lg shadow-violet-200">
          <h4 className="text-2xl font-black">{todayEvents.length}</h4><p className="text-[10px] font-bold uppercase opacity-80 tracking-widest">Eventos Hoy</p>
        </div>
      </div>
      <div className="space-y-3">
        <h3 className="font-black text-violet-900 text-xs uppercase tracking-widest ml-2">Agenda de hoy</h3>
        {todayEvents.length > 0 ? todayEvents.map(e => (
          <div key={e.id} className="bg-white p-4 rounded-2xl border-l-4 border-orange-500 shadow-sm flex justify-between items-center">
            <span className="font-bold text-slate-700">{e.title}</span>
            <span className="text-[9px] font-black text-orange-500 uppercase">{e.type}</span>
          </div>
        )) : <div className="p-10 text-center bg-gray-100 rounded-3xl border-2 border-dashed text-gray-400 italic text-sm">Sin eventos para hoy</div>}
      </div>
    </div>
  );
}

function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [statFilters, setStatFilters] = useState({ level: 'all', gender: 'all' });
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (editingStudent) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
    else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
    setShowForm(false); setEditingStudent(null);
  };

  const handleBulkImport = async () => {
    setProcessing(true);
    try {
      const data = JSON.parse(importJson);
      for(const s of data) if(s.lastName) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, createdAt: serverTimestamp() });
      alert("Carga completa"); setShowDataManagement(false);
    } catch(e) { alert("Error en JSON"); }
    setProcessing(false);
  };

  const filtered = students.filter(s => (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()));
  const statsResults = students.filter(s => (statFilters.level === 'all' || s.level === statFilters.level) && (statFilters.gender === 'all' || s.gender === statFilters.gender));

  return (
    <div className="animate-in fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-2xl font-black italic uppercase"><GraduationCap className="inline mr-2" /> Legajos</h2><p className="text-xs font-bold opacity-80 tracking-widest">{filtered.length} alumnos registrados</p></div>
          <div className="flex gap-2">
            {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
            <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><Activity size={20}/></button>
            {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl"><Plus size={20}/></button>}
          </div>
        </div>
        <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar por apellido, nombre o DNI..." className="w-full p-4 bg-white text-gray-800 rounded-2xl shadow-sm outline-none border-none" />
      </div>

      <div className="space-y-3">
        {filtered.map(s => (
          <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-3xl border border-gray-100 flex items-center gap-4 shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
              {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
            </div>
            <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
            <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase">{s.level}</span>
          </div>
        ))}
      </div>

      {showStats && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[80vh] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Filtros Estadísticos</h3>
              <button onClick={() => setShowStats(false)} className="text-gray-300"><X size={24} /></button>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <select onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none">
                <option value="all">Todos los niveles</option><option value="INICIAL">Inicial</option><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option><option value="CFI">CFI</option>
              </select>
              <select onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold uppercase outline-none">
                <option value="all">Todos los géneros</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="X">Otro</option>
              </select>
            </div>
            <div className="bg-violet-600 text-white p-6 rounded-3xl text-center mb-6 shadow-xl">
              <h4 className="text-4xl font-black">{statsResults.length}</h4><p className="text-[10px] font-bold uppercase opacity-80 mt-1">Coincidencias</p>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {statsResults.map(s => (
                <div key={s.id} className="p-3 bg-gray-50 rounded-xl text-[10px] font-bold border flex justify-between uppercase">
                  <span className="text-gray-700">{s.lastName}, {s.firstName}</span><span className="text-violet-600 italic">{s.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X/></button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center shadow-lg">
                  {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" /> : <User size={40}/>}
                </div>
                <div><h2 className="text-2xl font-black leading-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-80 text-xs font-bold uppercase tracking-widest mt-1">DNI: {viewingStudent.dni}</p></div>
              </div>
            </div>
            <div className="p-8 space-y-5 bg-white text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Nivel</p><p className="font-bold text-gray-700 bg-gray-50 p-2 rounded-lg">{viewingStudent.level || '-'}</p></div>
                <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Género</p><p className="font-bold text-gray-700 bg-gray-50 p-2 rounded-lg">{viewingStudent.gender || '-'}</p></div>
              </div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Jornada</p><p className="font-bold text-gray-700 bg-gray-50 p-2 rounded-lg italic">{viewingStudent.journey || '-'}</p></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase mb-1 tracking-widest">Diagnóstico (DX)</p><p className="bg-blue-50/50 p-4 rounded-xl text-blue-900 font-medium italic border border-blue-100">{viewingStudent.dx || 'Sin diagnóstico cargado.'}</p></div>
              {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg mt-2 uppercase tracking-tighter">Editar Ficha</button>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
            <h3 className="text-2xl font-black mb-8 border-b pb-4 text-gray-800 uppercase italic tracking-tighter">{editingStudent ? 'Actualizar Ficha' : 'Ingresar Alumno'}</h3>
            <form onSubmit={handleSave} className="space-y-4 text-left">
              <div className="grid grid-cols-2 gap-4">
                <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-none" />
                <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none border-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
                <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select name="level" defaultValue={editingStudent?.level} className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500">
                  <option value="">Nivel</option><option value="INICIAL">Inicial</option><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option><option value="CFI">CFI</option>
                </select>
                <select name="gender" defaultValue={editingStudent?.gender} className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500">
                  <option value="">Género</option><option value="M">M</option><option value="F">F</option><option value="X">Otro</option>
                </select>
              </div>
              <input name="journey" defaultValue={editingStudent?.journey} placeholder="Jornada (Ej: Mañana, Tarde, Completa)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
              <textarea name="dx" defaultValue={editingStudent?.dx} rows="4" placeholder="Diagnóstico detallado (DX)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-sm" />
              <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowForm(false)} className="flex-1 font-bold text-gray-400 uppercase tracking-widest">Descartar</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Guardar</button></div>
            </form>
          </div>
        </div>
      )}

      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl text-center">
            <h3 className="text-2xl font-black mb-4 text-blue-600 italic tracking-tighter uppercase">Carga Masiva</h3>
            <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='Ej: [ { "lastName": "Gomez", "firstName": "Ana", "dni": 123... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-[10px] mb-6 outline-none" />
            <div className="flex gap-3"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-4 font-bold text-gray-400 uppercase">Cerrar</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">IMPORTAR</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(d); };
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderGrid = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const days = []; const first = getFirstDayOfMonth(year, month);
    for (let i = 0; i < first; i++) days.push(<div key={`empty-${i}`} className="min-h-[70px] bg-gray-50/20 border-b border-r border-gray-100"></div>);
    for (let d = 1; d <= getDaysInMonth(year, month); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = (events || []).filter(e => e.date === dateStr);
      days.push(
        <div key={d} className="min-h-[70px] border-b border-r border-gray-100 p-1 bg-white hover:bg-violet-50 transition text-center overflow-hidden">
          <span className={`text-[10px] font-black ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-col gap-0.5 mt-1">
            {dayEvents.map((ev, idx) => (<button key={idx} onClick={() => setSelectedEvent(ev)} className="text-[7px] bg-violet-100 text-violet-700 rounded p-0.5 truncate font-black uppercase shadow-sm border border-violet-200">{ev.title}</button>))}
          </div>
        </div>
      );
    }
    return days;
  };

  const addEvent = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), {
      title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description'), createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Agenda</h2>
        <div className="flex gap-2 items-center bg-white p-1 rounded-xl shadow-sm border">
          <button onClick={() => changeMonth(-1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg"><ChevronLeft/></button>
          <span className="font-black text-violet-900 capitalize text-sm min-w-[140px] text-center">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg"><ChevronRight/></button>
        </div>
        {canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg"><Plus/></button>}
      </div>
      <div className="bg-white rounded-[35px] shadow-xl border border-gray-100 overflow-hidden grid grid-cols-7">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="text-[9px] font-black text-violet-400 uppercase p-3 border-b text-center bg-violet-50/50">{d}</div>)}
        {renderGrid()}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={addEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic uppercase text-violet-900">Nuevo Evento</h3>
            <input name="title" placeholder="Título" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
            <input name="date" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
            <select name="type" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest">
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea name="description" placeholder="Descripción (opcional)" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
            <button type="submit" className="w-full py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Guardar Evento</button>
          </form>
        </div>
      )}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <span className="text-[9px] font-black text-orange-600 border border-orange-200 px-2 py-1 rounded-full uppercase tracking-widest">{selectedEvent.type}</span>
            <h2 className="text-2xl font-black text-gray-800 leading-tight italic uppercase mt-4 tracking-tighter">{selectedEvent.title}</h2>
            <p className="text-gray-500 text-sm mt-4 leading-relaxed font-medium italic border-l-4 border-violet-100 pl-4">{selectedEvent.description || 'Sin descripción adicional.'}</p>
            <div className="mt-8 pt-6 border-t flex justify-between items-center text-gray-400 text-[10px] font-black uppercase tracking-widest">
               <div className="flex items-center gap-2"><Clock size={16}/> {formatDate(selectedEvent.date)}</div>
               <button onClick={() => setSelectedEvent(null)} className="text-violet-600 font-black tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}
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
    e.preventDefault(); const fd = new FormData(e.target);
    const targetUserId = fd.get('targetUser'); const targetUser = usersList.find(u => u.id === targetUserId);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      title: fd.get('title'), dueDate: fd.get('dueDate'), assignedToName: targetUser ? (targetUser.fullName || targetUser.firstName) : "Todos", status: 'pending', createdAt: serverTimestamp(), priority: fd.get('priority')
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Tareas Pendientes</h2><button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg"><Plus/></button></div>
      <div className="grid gap-3 pb-10">
        {(tasks || []).map(t => (
          <div key={t.id} className="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center hover:shadow-md transition">
            <div><p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mb-1">{t.assignedToName}</p><h3 className="font-bold text-gray-800 text-sm tracking-tight">{t.title}</h3></div>
            <div className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400 tracking-tighter uppercase border">{t.dueDate}</div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={addTask} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 space-y-4">
            <h3 className="text-xl font-black mb-4 uppercase italic text-violet-900 tracking-tighter">Nueva Tarea Docente</h3>
            <input name="title" placeholder="¿Qué tarea hay que realizar?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic font-medium" />
            <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest text-gray-500">
              <option value="all">Asignar a: Todos</option>
              {usersList.map(u => <option key={u.id} value={u.id}>{u.fullName || u.firstName}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-4">
              <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-gray-400 font-bold" />
              <select name="priority" className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold uppercase tracking-widest">
                <option value="baja">Prioridad Baja</option><option value="media">Media</option><option value="alta">Alta</option>
              </select>
            </div>
            <div className="flex gap-4 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">Crear Tarea</button></div>
          </form>
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
    <div className="space-y-4 animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Recursos Digitales</h2>
        {currentFolder && <button onClick={() => setCurrentFolder(null)} className="bg-gray-100 p-2 rounded-xl text-xs font-black uppercase tracking-widest text-violet-700 hover:bg-violet-100">Volver</button>}
      </div>
      {!currentFolder ? (
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(folders).map(name => (
            <div key={name} onClick={() => setCurrentFolder(name)} className="bg-white p-8 rounded-[35px] border text-center cursor-pointer shadow-sm hover:scale-105 transition-all group border-violet-50">
              <Folder size={36} className="mx-auto text-violet-200 mb-3 group-hover:text-violet-600 transition-colors"/>
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-700 leading-tight">{name}</h3>
              <p className="text-[9px] font-bold text-gray-300 mt-2 uppercase">{folders[name].length} elementos</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {folders[currentFolder].map(res => (<a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="bg-white p-5 rounded-[30px] border border-violet-50 font-bold text-sm text-gray-700 hover:border-violet-300 transition-all flex justify-between items-center group"><span className="flex items-center gap-3"><FileText size={18} className="text-violet-200 group-hover:text-violet-500" /> {res.title}</span><ChevronRight size={16} className="text-gray-300" /></a>))}
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
    return onSnapshot(q, snap => setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const inicializar = async () => {
    const names = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    for(let i=0; i<names.length; i++) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), { 
        nombre: names[i], orden: i, eje: "La Vuelta al Mundo en 360 días", 
        contenidos: "🌍 EJE: La Vuelta al Mundo en 360 días\n\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:" 
      });
    }
  };

  const handleSave = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proyecto2026', editingMes.id), {
        eje: fd.get('eje'), contenidos: fd.get('contenidos')
      });
      setEditingMes(null);
    } catch (e) { alert("Error al guardar"); }
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 duration-700 pb-10">
      <div className="bg-indigo-900 p-10 rounded-[50px] text-white shadow-2xl relative overflow-hidden text-center">
        <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Proyecto 360</h2>
        <p className="text-[10px] font-bold opacity-60 uppercase mt-2 tracking-[6px]">La Vuelta al Mundo</p>
        {isAdmin && meses.length === 0 && <button onClick={inicializar} className="mt-6 bg-orange-500 hover:bg-orange-600 px-6 py-2 rounded-2xl text-[10px] font-black shadow-lg transition">CARGAR ESTRUCTURA ANUAL</button>}
      </div>
      <div className="space-y-4 pt-4">
        {meses.map(m => (
          <div key={m.id} className="bg-white p-6 rounded-[35px] border border-violet-50 shadow-sm hover:shadow-md transition">
            <div className="flex justify-between items-center mb-4"><h3 className="font-black text-violet-900 uppercase text-sm tracking-widest">{m.nombre}</h3>{isAdmin && <button onClick={() => setEditingMes(m)} className="p-2 text-gray-300 hover:text-orange-500 transition-colors"><Edit3 size={18}/></button>}</div>
            <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed italic bg-gray-50/50 p-6 rounded-[30px] border border-gray-50 font-medium">{m.contenidos}</div>
          </div>
        ))}
      </div>
      {editingMes && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-[45px] w-full max-w-2xl p-8 shadow-2xl space-y-4 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic text-violet-900 uppercase">Editar {editingMes.nombre}</h3>
            <input name="eje" defaultValue={editingMes.eje} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold uppercase text-xs" />
            <textarea name="contenidos" defaultValue={editingMes.contenidos} rows="10" className="w-full p-5 bg-gray-50 rounded-[30px] outline-none text-xs font-mono" />
            <div className="flex gap-4 pt-4"><button type="button" onClick={() => setEditingMes(null)} className="flex-1 font-black text-gray-400 uppercase tracking-widest">Descartar</button><button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-xl uppercase tracking-widest tracking-tighter">Guardar Cambios</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

function ProfileView({ user, onLogout }) {
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); setInstallPrompt(e); });
  }, []);

  return (
    <div className="space-y-6 text-center animate-in fade-in duration-700 pb-10">
      <div className="bg-white p-12 rounded-[60px] shadow-xl border border-violet-50 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-violet-600 to-indigo-800"></div>
        <div className="w-32 h-32 rounded-[40px] bg-white mx-auto mb-6 relative z-10 shadow-2xl mt-6 p-1 border-4 border-white">
          <div className="w-full h-full rounded-[36px] bg-gray-50 flex items-center justify-center overflow-hidden">
             {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <span className="text-4xl font-black text-violet-600 uppercase">{user.firstName?.[0]}</span>}
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-800 tracking-tight">{user.fullName || user.firstName}</h2>
        <p className="text-orange-500 font-black uppercase tracking-[5px] mt-2 text-[10px]">{user.role}</p>
        
        <div className="mt-10 space-y-3">
          <button onClick={requestPermission} className="w-full flex items-center justify-between p-4 bg-violet-50 rounded-2xl text-violet-700 font-black text-[10px] uppercase tracking-widest hover:bg-violet-100 transition shadow-sm">
            <span>Habilitar Notificaciones</span><Bell size={18} />
          </button>
          {!isStandalone && (
             <button onClick={() => installPrompt?.prompt()} className="w-full flex items-center justify-between p-4 bg-orange-50 rounded-2xl text-orange-600 font-black text-[10px] uppercase tracking-widest hover:bg-orange-100 transition shadow-sm">
              <span>Descargar App Oficial</span><Download size={18} />
            </button>
          )}
        </div>
      </div>
      <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-6 rounded-[40px] font-black text-lg flex items-center justify-center gap-4 shadow-lg border-2 border-red-100 uppercase tracking-widest transition-all active:scale-95"><LogOut size={24}/> Salir del Portal</button>
      <p className="text-[9px] font-bold text-gray-300 uppercase tracking-[4px]">Versión Digital 2026.1</p>
    </div>
  );
}
