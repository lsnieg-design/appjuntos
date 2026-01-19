import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, PieChart, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder 
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { 
 getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
 getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion 
} from 'firebase/firestore';
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
 } catch (e) {
  console.log("Buscando config global...");
 }
 if (typeof __firebase_config !== 'undefined') {
  return JSON.parse(__firebase_config);
 }
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
    registration.showNotification(title, {
     body: body,
     icon: '/icon-192.png',
     vibrate: [200, 100, 200]
    });
   });
  } else {
   try {
    new Notification(title, { body, icon: '/icon-192.png' });
   } catch (e) {
    console.log("Notificación bloqueada.");
   }
  }
 }
};

const requestPermission = async () => {
 try {
  const permission = await Notification.requestPermission();
  if (permission === 'granted' && messaging) {
   const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
   if (currentToken) return currentToken;
  }
 } catch (error) {
  console.error('Error al pedir permiso:', error);
 }
};

const onMessageListener = () =>
 new Promise((resolve) => {
  if (messaging) {
   onMessage(messaging, (payload) => {
    resolve(payload);
   });
  }
 });

// --- CONSTANTES ---
const ROLES = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS'];

// --- UTILS ---
const calculateDaysLeft = (dateString) => {
 if (!dateString) return 0;
 const eventDate = new Date(dateString);
 const today = new Date();
 today.setHours(0,0,0,0);
 eventDate.setHours(0,0,0,0);
 const diffTime = eventDate - today;
 return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString) => {
 if (!dateString) return '';
 const date = new Date(dateString + 'T00:00:00');
 return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
 const [firebaseUser, setFirebaseUser] = useState(null);
 const [currentUserProfile, setCurrentUserProfile] = useState(null);
 const [loading, setLoading] = useState(true);
 const [configError, setConfigError] = useState(false);

 useEffect(() => {
  requestPermission();
  onMessageListener().then((payload) => {
   if (payload?.notification) {
    triggerMobileNotification(payload.notification.title, payload.notification.body);
   }
  });
 }, []);

 useEffect(() => {
  if (!auth) {
   setConfigError(true);
   setLoading(false);
   return;
  }
  const initAuth = async () => {
   try {
    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
     await signInWithCustomToken(auth, __initial_auth_token);
    } else {
     await signInAnonymously(auth);
    }
   } catch (error) {
    console.error("Auth error:", error);
   }
  };
  initAuth();
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
   setFirebaseUser(user);
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

 if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div></div>;
 if (configError) return <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center"><AlertCircle className="text-red-500 w-16 h-16 mb-4" /><h1 className="text-xl font-bold text-red-700">Error de Configuración</h1></div>;
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
   const querySnapshot = await getDocs(q);
   if (!querySnapshot.empty) {
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userDoc.id), { lastLogin: serverTimestamp() });
    onLogin({ ...userData, id: userDoc.id, isAdmin: userData.rol === 'admin' });
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
      <div className="mx-auto bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-bounce">
       <Smartphone className="text-violet-600" size={40} />
      </div>
      <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Instala la App! 📲</h3>
      <p className="text-gray-600 mb-6 text-sm">Para mejor experiencia, descarga la aplicación ahora.</p>
      <div className="flex flex-col gap-3">
       {!esIos ? (
        <button onClick={handleInstalarClick} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg">INSTALAR AHORA</button>
       ) : (
        <div className="text-left bg-gray-50 p-4 rounded-xl border text-sm text-gray-700"><p className="mb-2 font-bold">En iPhone:</p>1. Toca <strong>Compartir</strong> <Share size={12} className="inline"/><br/>2. Selecciona <strong>"Agregar a Inicio"</strong> <PlusSquare size={12} className="inline"/></div>
       )}
       <button onClick={() => setShowInstall(false)} className="text-gray-400 text-sm font-medium hover:text-gray-600 underline mt-2">Quizás más tarde</button>
      </div>
     </div>
    </div>
   )}
   <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500 relative z-0">
    <div className="text-center mb-8">
     <div className="flex justify-center mb-4"><img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-24 w-auto object-contain drop-shadow-md" /></div>
     <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">PORTAL INSTITUCIONAL<br/><span className="text-orange-500">JUNTOS A LA PAR</span></h1>
    </div>
    {!showRecover ? (
     <form onSubmit={handleSubmit} className="space-y-6">
      <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Usuario</label><div className="relative group"><User className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="text" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div>
      <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Contraseña</label><div className="relative group"><Lock className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="password" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
      <div className="flex justify-end"><button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 transition">¿Olvidaste tu contraseña?</button></div>
      {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100">{error}</div>}
      <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition duration-300 shadow-xl disabled:opacity-70 flex justify-center items-center">{checking ? <RefreshCw className="animate-spin" /> : 'Ingresar al Portal'}</button>
     </form>
    ) : (
     <div className="animate-in fade-in slide-in-from-right">
      <div className="bg-violet-50 p-6 rounded-2xl text-center mb-6 border border-violet-100">
       <Key className="mx-auto text-violet-500 mb-2" size={40} />
       <h3 className="font-bold text-violet-900 text-lg mb-2">Solicitar Blanqueo</h3>
       {recoverStatus === 'sent' ? (
        <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
       ) : (
        <form onSubmit={handleRequestReset} className="mb-4">
         <input className="w-full p-3 bg-white border border-violet-200 rounded-xl mb-3 text-center focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Tu Usuario" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
         <button type="submit" disabled={recoverStatus === 'sending'} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2">{recoverStatus === 'sending' ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> Enviar Solicitud</>}</button>
         {recoverStatus === 'error' && <p className="text-xs text-red-500 mt-2 font-bold">Error de red o usuario incorrecto.</p>}
        </form>
       )}
      </div>
      <button onClick={() => {setShowRecover(false); setRecoverStatus('idle');}} className="w-full text-gray-500 font-bold py-3 hover:text-gray-700 transition">Volver al inicio</button>
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

  const isSuperAdmin = user.rol === 'super-admin';
  const canManageContent = user.rol === 'admin' || isSuperAdmin;

  useEffect(() => {
    // 1. Tareas
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    
    // 2. Avisos (Filtrados por el ID del usuario actual)
    const qNotifs = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'notifications'),
      where('toUserId', '==', user.id)
    );
    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // 3. Otros datos
    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); };
  }, [user.id]);

  const unreadCount = (notifications || []).filter(n => !n.read).length;

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <div>
            <h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1>
            <p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
              <Bell size={20} />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse">{unreadCount}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 z-[100]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-violet-900 text-sm">Avisos Recientes</h3>
                  <button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? <p className="p-8 text-center text-xs text-gray-400 italic">No tienes avisos nuevos</p> : 
                  notifications.map(n => (
                    <div key={n.id} className="p-4 border-b hover:bg-gray-50 transition">
                      <p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p>
                      <p className="text-xs text-gray-700">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer">
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

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg pb-safe">
        <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Matrícula" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<Folder size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24} />} label="P.I." />
        </div>
      </nav>
    </div>
  );
}

function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsub = onSnapshot(q, snap => {
      setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    }, () => {});
    return () => unsub();
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const targetUserId = fd.get('targetUser');
    const targetUser = usersList.find(u => u.id === targetUserId);

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      title: fd.get('title'),
      dueDate: fd.get('dueDate'),
      priority: fd.get('priority'),
      createdBy: user.firstName || "Admin",
      createdById: user.id,
      assignedToId: targetUserId,
      assignedToName: targetUser ? (targetUser.fullName || targetUser.firstName) : "Todos",
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  return (
    <div className="animate-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900">Tareas</h2>
        <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg"><Plus/></button>
      </div>
      <div className="grid gap-3">
        {tasks && tasks.length > 0 ? tasks.map(t => (
          <div key={t.id} className="bg-white p-5 rounded-[30px] border border-gray-100 shadow-sm flex justify-between items-center">
            <div>
              <p className="text-[10px] font-bold text-orange-500 uppercase">{t.assignedToName}</p>
              <h3 className="font-bold text-gray-800">{t.title}</h3>
            </div>
            <div className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400">
              {t.dueDate}
            </div>
          </div>
        )) : <p className="text-center text-gray-400 py-10 italic text-sm">No hay tareas pendientes</p>}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl">
            <h3 className="text-xl font-black mb-6">Nueva Tarea</h3>
            <form onSubmit={addTask} className="space-y-4">
              <input name="title" placeholder="¿Qué hay que hacer?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
              <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none">
                <option value="all">Asignar a: Todos</option>
                {usersList.map(u => <option key={u.id} value={u.id}>{u.fullName || u.firstName}</option>)}
              </select>
              <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-gray-400">CANCELAR</button>
                <button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-bold">GUARDAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
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
   <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
  </button>
 );
}

// --- VISTA MATRÍCULA ---
function MatriculaView({ user }) {
 const [students, setStudents] = useState([]);
 const [filterText, setFilterText] = useState('');
 const [viewingStudent, setViewingStudent] = useState(null);
 const [showStats, setShowStats] = useState(false);
 const [showForm, setShowForm] = useState(false);
 const [showDataManagement, setShowDataManagement] = useState(false);
 const [editingStudent, setEditingStudent] = useState(null);
 const isSuperAdmin = user.rol === 'super-admin';
 const [filters, setFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', group: 'all', teacher: 'all' });
 const [statFilters, setStatFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' });
 const [importJson, setImportJson] = useState('');
 const [processing, setProcessing] = useState(false);
 const [photoPreview, setPhotoPreview] = useState(null);

 const calculateAge = (dateString) => {
  if (!dateString) return '-';
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
 };

 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
  return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 const filteredStudents = students.filter(s => {
  const textMatch = (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText);
  const levelMatch = filters.level === 'all' || s.level === filters.level;
  const dxMatch = filters.dx === 'all' || s.dx === filters.dx;
  return textMatch && levelMatch && dxMatch;
 });

 const statsResults = students.filter(s => {
  const levelMatch = statFilters.level === 'all' || s.level === statFilters.level;
  const genderMatch = statFilters.gender === 'all' || s.gender === statFilters.gender;
  return levelMatch && genderMatch;
 });

 const handleSave = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  data.photoUrl = photoPreview || editingStudent?.photoUrl || '';
  if (editingStudent) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
  else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
  setShowForm(false); setEditingStudent(null); setPhotoPreview(null);
 };

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

 return (
  <div className="animate-in fade-in">
   <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
    <div className="flex justify-between items-center">
     <div><h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap /> Legajos 2026</h2><p className="opacity-90">{filteredStudents.length} alumnos</p></div>
     <div className="flex gap-2">
      {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
      <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><PieChart size={20}/></button>
      {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl"><Plus/></button>}
     </div>
    </div>
   </div>
   <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar alumno..." className="w-full p-4 bg-white rounded-2xl shadow-sm mb-4 outline-none border" />
   <div className="space-y-3">
    {filteredStudents.map(s => (
     <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl border flex items-center gap-4 cursor-pointer hover:shadow-md transition">
      <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
       {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
      </div>
      <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
      <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">{s.level}</span>
     </div>
    ))}
   </div>

   {showStats && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
     <div className="bg-white rounded-3xl w-full max-w-2xl p-6 h-[80vh] flex flex-col shadow-2xl">
      <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><PieChart/> Estadísticas Matrícula</h3><button onClick={() => setShowStats(false)}><X/></button></div>
      <div className="bg-violet-600 text-white p-10 rounded-3xl text-center mb-6 shadow-xl">
       <p className="text-lg opacity-80">Coincidencias</p>
       <h4 className="text-6xl font-black">{statsResults.length}</h4>
      </div>
      <div className="flex-1 overflow-y-auto"><div className="grid grid-cols-1 gap-2">{statsResults.map(s => <div key={s.id} className="p-3 bg-gray-50 rounded-xl text-sm border flex justify-between"><span>{s.lastName}, {s.firstName}</span><span className="font-bold text-violet-600 uppercase">{s.level}</span></div>)}</div></div>
     </div>
    </div>
   )}

   {viewingStudent && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
     <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
      <div className="bg-blue-600 p-8 text-white relative">
       <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X/></button>
       <div className="flex items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">
         {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" /> : <User size={40}/>}
        </div>
        <div><h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-80">DNI: {viewingStudent.dni}</p></div>
       </div>
      </div>
      <div className="p-8 space-y-4 bg-white">
       <p><strong>Nivel:</strong> {viewingStudent.level}</p>
       <p><strong>DX:</strong> {viewingStudent.dx || '-'}</p>
       <p><strong>Género:</strong> {viewingStudent.gender}</p>
       <p><strong>Jornada:</strong> {viewingStudent.journey}</p>
       {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg">EDITAR FICHA</button>}
      </div>
     </div>
    </div>
   )}

   {showForm && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
      <h3 className="text-2xl font-bold mb-8 border-b pb-4 text-gray-800">{editingStudent ? 'Editar Legajo' : 'Nueva Ficha'}</h3>
      <form onSubmit={handleSave} className="space-y-6">
       <div className="grid grid-cols-2 gap-4">
        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="w-full p-3 bg-gray-50 border rounded-xl" />
        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="w-full p-3 bg-gray-50 border rounded-xl" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-3 bg-gray-50 border rounded-xl" />
        <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-3 bg-gray-50 border rounded-xl" />
       </div>
       <div className="flex gap-4 pt-4 border-t"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">CANCELAR</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">GUARDAR</button></div>
      </form>
     </div>
    </div>
   )}

   {showDataManagement && (
    <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
     <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
      <h3 className="text-2xl font-bold mb-4 text-blue-600 flex items-center gap-2"><UploadCloud/> Carga Masiva</h3>
      <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "lastName": "Gomez", "firstName": "Ana"... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-xs mb-6 outline-none" />
      <div className="flex gap-3"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">CERRAR</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">{processing ? <RefreshCw className="animate-spin" /> : 'IMPORTAR'}</button></div>
     </div>
    </div>
   )}
  </div>
 );
}

// --- VISTAS RESTANTES ---
function DashboardView({ user, tasks, events }) {
 const todayStr = new Date().toISOString().split('T')[0];
 const eventsToday = events.filter(e => e.date === todayStr);
 const [announcements, setAnnouncements] = useState([]);
 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
   const now = new Date();
   setAnnouncements(snapshot.docs.map(doc => {
    const data = doc.data();
    const msgDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
    return { id: doc.id, ...data, timeAgo: Math.floor((now - msgDate) / (1000 * 60 * 60)) };
   }).filter(a => a.timeAgo < 48));
  });
 }, []);
 return (
  <div className="space-y-6">
   <div className="bg-white p-6 rounded-3xl border shadow-sm"><h2 className="text-2xl font-bold text-violet-900 tracking-tight">¡Hola, {user.firstName}! 👋</h2></div>
   <div className="grid grid-cols-2 gap-4">
    <div className="bg-orange-500 text-white p-6 rounded-[35px] shadow-lg relative overflow-hidden"><h3 className="text-4xl font-black">{tasks.length}</h3><p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Tareas</p><CheckSquare className="absolute -right-4 -bottom-4 opacity-20" size={90}/></div>
    <div className="bg-violet-600 text-white p-6 rounded-[35px] shadow-lg relative overflow-hidden"><h3 className="text-4xl font-black">{eventsToday.length}</h3><p className="text-xs font-bold opacity-80 uppercase tracking-widest mt-1">Hoy</p><CalendarIcon className="absolute -right-4 -bottom-4 opacity-20" size={90}/></div>
   </div>
   <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
    <h3 className="font-bold flex items-center gap-2 mb-4"><Bell size={20}/> Cartelera</h3>
    <div className="space-y-3">
     {announcements.map(a => (<div key={a.id} className="bg-black/20 p-3 rounded-xl"><p className="text-sm font-medium leading-relaxed">"{a.message}"</p><div className="mt-2 flex justify-between text-[10px] opacity-70 font-bold uppercase"><span>{a.author}</span><span>hace {a.timeAgo}h</span></div></div>))}
     {announcements.length === 0 && <div className="text-center py-6 opacity-60 italic text-sm">No hay comunicados.</div>}
    </div>
   </div>
  </div>
 );
}

function CalendarView({ events, canEdit, user }) {
  const [showModal, setShowModal] = useState(false);
  // CAMBIO CLAVE: Ahora el estado inicial es 'grid'
  const [viewMode, setViewMode] = useState('grid'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const addEvent = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), {
      title: fd.get('title'),
      date: fd.get('date'),
      type: fd.get('type'),
      description: fd.get('description'),
      createdBy: user.id,
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const getTypeStyle = (type) => {
    const styles = { 
      'SALIDA EDUCATIVA': 'bg-green-100 text-green-800 border-green-200', 
      'GENERAL': 'bg-gray-100 text-gray-800 border-gray-200', 
      'ADMINISTRATIVO': 'bg-blue-100 text-blue-800 border-blue-200', 
      'INFORMES': 'bg-amber-100 text-amber-800 border-amber-200', 
      'EVENTOS': 'bg-violet-100 text-violet-800 border-violet-200', 
      'ACTOS': 'bg-red-100 text-red-800 border-red-200', 
      'EFEMÉRIDES': 'bg-cyan-100 text-cyan-800 border-cyan-200', 
      'CUMPLEAÑOS': 'bg-pink-100 text-pink-800 border-pink-200' 
    };
    return styles[type] || styles['GENERAL'];
  };

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    // Espacios vacíos del mes anterior
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="min-h-[70px] bg-gray-50/30 border border-gray-100"></div>);
    }

    // Días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      
      days.push(
        <div key={d} className="min-h-[70px] border border-gray-100 p-1 bg-white hover:bg-violet-50 transition group overflow-hidden">
          <span className={`text-[10px] font-bold block mb-1 ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-col gap-0.5">
            {dayEvents.map((ev, idx) => (
              <button 
                key={idx} 
                onClick={() => setSelectedEvent(ev)} 
                className={`text-[8px] text-left truncate px-1 py-0.5 rounded font-bold w-full ${getTypeStyle(ev.type)} shadow-sm`}
              >
                {ev.title}
              </button>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-violet-900">Agenda</h2>
          <p className="text-xs text-gray-400 uppercase font-bold tracking-widest">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white p-1 rounded-xl border flex shadow-sm">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-100 text-violet-700' : 'text-gray-400'}`}><Grid size={20}/></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-violet-100 text-violet-700' : 'text-gray-400'}`}><List size={20}/></button>
          </div>
          {canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg"><Plus/></button>}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="p-4 flex justify-between items-center bg-violet-50 border-b">
            <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition shadow-sm text-violet-700">< size={24} /></button>
            <span className="font-bold text-violet-900 capitalize">{currentDate.toLocaleDateString('es-ES', { month: 'long' })}</span>
            <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition shadow-sm text-violet-700"><ChevronRight size={24} /></button>
          </div>
          <div className="grid grid-cols-7 text-center py-2 bg-white text-[9px] font-black text-gray-400 uppercase border-b">
            <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>
          <div className="grid grid-cols-7 bg-gray-50 gap-px border-b">
            {renderCalendarGrid()}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map(e => (
            <div key={e.id} onClick={() => setSelectedEvent(e)} className="bg-white p-4 rounded-2xl border flex items-center gap-4 cursor-pointer">
               <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex flex-col items-center justify-center font-bold">
                 <span className="text-[8px] uppercase">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', {month: 'short'})}</span>
                 <span>{new Date(e.date + 'T00:00:00').getDate()}</span>
               </div>
               <h3 className="font-bold text-sm text-gray-800">{e.title}</h3>
            </div>
          ))}
        </div>
      )}

      {/* MODAL VER EVENTO */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase border ${getTypeStyle(selectedEvent.type)}`}>{selectedEvent.type}</span>
            <h2 className="text-2xl font-black text-gray-800 mt-4 leading-tight">{selectedEvent.title}</h2>
            <p className="text-gray-500 text-sm mt-4 leading-relaxed">{selectedEvent.description || 'Sin descripción adicional.'}</p>
            <div className="mt-8 pt-6 border-t flex justify-between items-center text-gray-400">
               <div className="flex items-center gap-2"><Clock size={16}/> <span className="text-xs font-bold uppercase">{formatDate(selectedEvent.date)}</span></div>
               <button onClick={() => setSelectedEvent(null)} className="font-black text-violet-600 text-sm">CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


function ResourcesView({ resources, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [currentFolder, setCurrentFolder] = useState(null); // Estado para saber qué carpeta está abierta

  const addResource = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), {
      title: fd.get('title'),
      url: fd.get('url'),
      category: fd.get('category'), // Carpeta
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  // Agrupamos los recursos por categoría (Carpetas)
  const folders = resources.reduce((acc, res) => {
    const cat = res.category || 'VARIOS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(res);
    return acc;
  }, {});

  const folderNames = Object.keys(folders);

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-violet-900">Recursos</h2>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">
            {currentFolder ? `Carpeta: ${currentFolder}` : 'Documentos y Enlaces'}
          </p>
        </div>
        <div className="flex gap-2">
          {currentFolder && (
            <button onClick={() => setCurrentFolder(null)} className="bg-gray-100 text-gray-600 p-3 rounded-xl">
              < size={20} />
            </button>
          )}
          {canEdit && (
            <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg">
              <Plus />
            </button>
          )}
        </div>
      </div>

      {/* VISTA DE CARPETAS */}
      {!currentFolder ? (
        <div className="grid grid-cols-2 gap-4">
          {folderNames.map(name => (
            <div 
              key={name} 
              onClick={() => setCurrentFolder(name)}
              className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm hover:shadow-md transition cursor-pointer group flex flex-col items-center text-center"
            >
              <div className="w-16 h-16 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-violet-600 group-hover:text-white transition duration-300">
                <Folder size={32} fill="currentColor" opacity="0.2" />
              </div>
              <h3 className="font-black text-gray-700 uppercase text-[11px] tracking-tight">{name}</h3>
              <p className="text-[10px] text-gray-400 mt-1">{folders[name].length} elementos</p>
            </div>
          ))}
        </div>
      ) : (
        /* VISTA DE ARCHIVOS DENTRO DE LA CARPETA */
        <div className="grid gap-3">
          {folders[currentFolder].map(res => (
            <a 
              key={res.id} 
              href={res.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center justify-between group hover:border-orange-200 transition"
            >
              <div className="flex items-center gap-4">
                <div className="p-2 bg-gray-50 text-gray-400 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-500">
                  <LinkIcon size={18} />
                </div>
                <span className="font-bold text-gray-700 text-sm">{res.title}</span>
              </div>
              <ChevronRight size={16} className="text-gray-300" />
            </a>
          ))}
        </div>
      )}

      {/* MODAL NUEVO RECURSO */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
            <h3 className="text-xl font-black mb-6 italic text-violet-900">Nuevo Recurso</h3>
            <form onSubmit={addResource} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-2">TÍTULO DEL DOCUMENTO</label>
                <input name="title" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" placeholder="Ej: Protocolo de Convivencia" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-2">ENLACE (URL)</label>
                <input name="url" type="url" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" placeholder="https://drive.google.com/..." />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-400 ml-2">CARPETA / CATEGORÍA</label>
                <select name="category" className="w-full p-4 bg-gray-50 rounded-2xl outline-none appearance-none">
                  <option value="DOCUMENTOS">Documentos</option>
                  <option value="UTILIDADES">Utilidades</option>
                  <option value="NORMATIVAS">Normativas</option>
                  <option value="ACTAS">Actas</option>
                  <option value="PROYECTOS">Proyectos</option>
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 font-bold text-gray-400">CANCELAR</button>
                <button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-bold shadow-lg">GUARDAR</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function NotificationsView({ notifications }) {
 return (
  <div className="space-y-4 pb-20 text-center">
   <h2 className="text-2xl font-bold text-violet-900 mb-6 text-left">Avisos</h2>
   <div className="py-24 bg-white rounded-[40px] border-4 border-dashed border-violet-50 opacity-50 shadow-inner">
    <Bell size={64} className="mx-auto text-violet-200 mb-6 animate-bounce"/><p className="font-black text-gray-300 uppercase tracking-widest">Sin notificaciones nuevas</p>
   </div>
  </div>
 );
}

function UsersView() {
 const [users, setUsers] = useState([]);
 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
  return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
 }, []);
 return (
  <div className="space-y-4">
   <h2 className="text-2xl font-bold text-violet-900 mb-6">Personal</h2>
   <div className="grid gap-3">{users.map(u => (
    <div key={u.id} className="bg-white p-5 rounded-[30px] border flex items-center gap-5">
     <div className="w-12 h-12 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-black text-lg border-2 border-white shadow-md overflow-hidden">{u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover"/> : u.firstName?.[0]}</div>
     <div className="min-w-0 flex-1"><h4 className="font-bold text-gray-800 truncate">{u.fullName}</h4><p className="text-[9px] text-orange-600 font-black uppercase tracking-widest">{u.role}</p></div>
    </div>
   ))}</div>
  </div>
 );
}

function ProfileView({ user, onLogout }) {
 return (
  <div className="space-y-6 pb-20 animate-in slide-in-from-bottom duration-700">
   <div className="bg-white p-10 rounded-[50px] text-center shadow-xl border border-violet-50 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-28 bg-gradient-to-r from-violet-600 to-orange-500 shadow-inner"></div>
    <div className="w-36 h-36 rounded-[40px] bg-white p-1 mx-auto mb-6 relative z-10 shadow-2xl mt-4">
     <div className="w-full h-full rounded-[36px] bg-violet-50 flex items-center justify-center overflow-hidden border-4 border-violet-100 shadow-inner">
      {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <span className="text-5xl font-black text-violet-600">{user.firstName?.[0]}</span>}
     </div>
    </div>
    <h2 className="text-3xl font-black text-gray-800 tracking-tight">{user.fullName}</h2>
    <p className="text-orange-600 font-black uppercase tracking-[5px] mt-2 text-xs">{user.role}</p>
   </div>
   <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-6 rounded-[35px] font-black text-xl flex items-center justify-center gap-4 active:scale-95 transition shadow-lg border-2 border-red-100 uppercase tracking-[4px]"><LogOut size={28}/> Salir del Portal</button>
  </div>
 );
}

function ProyectoView({ user }) {
  const [meses, setMeses] = useState([]);
  const [editingMes, setEditingMes] = useState(null);
  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';

  useEffect(() => {
    // Escuchamos la colección específica del proyecto
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), orderBy('orden', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => console.error("Error en Proyecto:", error));
    return () => unsub();
  }, []);

  const inicializarProyecto = async () => {
    const estructuraBase = "🌍 EJE: La Vuelta al Mundo en 360 días\n\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:";
    const mesesNombres = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    
    try {
      for (let i = 0; i < mesesNombres.length; i++) {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), {
          nombre: mesesNombres[i],
          orden: i,
          eje: "La Vuelta al Mundo en 360 días",
          contenidos: estructuraBase,
          actividades: "Propuestas de cada eje..."
        });
      }
      alert("¡Estructura 360 creada con éxito!");
    } catch (e) {
      alert("Error al crear: " + e.message);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proyecto2026', editingMes.id), {
        eje: fd.get('eje'),
        contenidos: fd.get('contenidos'),
        actividades: fd.get('actividades')
      });
      setEditingMes(null);
    } catch (e) {
      alert("Error al guardar: " + e.message);
    }
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-indigo-900 to-violet-800 p-8 rounded-[40px] text-white mb-6 shadow-xl">
        <h2 className="text-2xl font-black italic">Proyecto 360</h2>
        <p className="text-[10px] font-bold opacity-60 uppercase tracking-widest">La Vuelta al Mundo en un Año</p>
        
        {isAdmin && meses.length === 0 && (
          <button 
            onClick={inicializarProyecto} 
            className="mt-4 bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded-2xl text-xs font-black shadow-lg transition-all active:scale-95"
          >
            CARGAR ESTRUCTURA ANUAL
          </button>
        )}
      </div>

      <div className="space-y-4">
        {meses.length > 0 ? meses.map(m => (
          <div key={m.id} className="bg-white p-6 rounded-[35px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-black text-violet-900 uppercase text-sm tracking-tight">{m.nombre}</h3>
                <span className="text-[9px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold uppercase">
                  {m.eje || "Sin Eje"}
                </span>
              </div>
              {isAdmin && (
                <button onClick={() => setEditingMes(m)} className="p-2 bg-gray-50 text-gray-300 rounded-xl hover:text-orange-500 transition">
                  <Edit3 size={18}/>
                </button>
              )}
            </div>
            
            <div className="text-[11px] text-gray-600 whitespace-pre-wrap leading-relaxed bg-gray-50/50 p-5 rounded-3xl border border-gray-50">
              {m.contenidos || "Sin contenidos cargados"}
            </div>
          </div>
        )) : (
          <div className="text-center py-20 opacity-20">
            <PieChart size={64} className="mx-auto mb-4" />
            <p className="font-bold text-sm italic">Esperando datos del proyecto...</p>
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN */}
      {editingMes && (
        <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[45px] w-full max-w-2xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900">Editar {editingMes.nombre}</h3>
              <button onClick={() => setEditingMes(null)} className="text-gray-400"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 ml-4 uppercase">Eje Transversal</label>
                <input name="eje" defaultValue={editingMes.eje} className="w-full p-4 bg-gray-50 rounded-2xl outline-none focus:ring-2 ring-violet-200" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 ml-4 uppercase">Contenidos Esquematizados</label>
                <textarea name="contenidos" defaultValue={editingMes.contenidos} rows="12" className="w-full p-5 bg-gray-50 rounded-[30px] outline-none text-xs font-mono leading-relaxed" />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setEditingMes(null)} className="flex-1 py-4 font-bold text-gray-400">DESCARTAR</button>
                <button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-bold shadow-xl">GUARDAR CAMBIOS</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}









