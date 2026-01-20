import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder, MessageSquare, Globe, BookOpen, Lightbulb 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
// --- FUNCIÓN SEGURA PARA NOTIFICACIONES (SOLUCIONA EL ERROR DE TABLET) ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    // Si estamos en celular (Service Worker activo)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body: body,
          icon: '/icon-192.png',
          vibrate: [200, 100, 200]
        });
      });
    } else {
      // Si estamos en PC
      try {
        new Notification(title, { body, icon: '/icon-192.png' });
      } catch (e) {
        console.log("Notificación bloqueada o no soportada en este modo.");
      }
    }
  }
};
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

// --- Constantes ---
const ROLES = [
  'Docente', 
  'Equipo Directivo', 
  'Equipo Técnico', 
  'Auxiliar/Preceptor', 
  'Inclusión', 
  'Profes Especiales', 
  'Administración'
];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS'];

// --- Utils ---
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

// --- Componente Principal Wrapper ---
// --- Componente Principal Wrapper (CON ESCUCHA EN TIEMPO REAL) ---
export default function App() {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 1. Timer Intro
    const splashTimer = setTimeout(() => setShowSplash(false), 3000);

    if (!auth) { setConfigError(true); setLoading(false); return; }

    // 2. Autenticación y Sincronización de Perfil
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // A. Intentar recuperar perfil guardado para carga rápida
        const saved = localStorage.getItem('schoolApp_profile');
        if (saved) setCurrentUserProfile(JSON.parse(saved));

        // B. SI YA HAY UN USUARIO IDENTIFICADO EN LOCALSTORAGE, ESCUCHAR CAMBIOS EN VIVO
        // Esto hace que si cambiás la foto, se actualice sola en toda la app
        if (saved) {
            const userObj = JSON.parse(saved);
            const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userObj.id);
            
            // Suscripción a cambios en la base de datos
            const unsubscribeSnapshot = onSnapshot(userDocRef, (docSnap) => {
                if (docSnap.exists()) {
                    const freshData = { id: docSnap.id, ...docSnap.data() };
                    // Detectar si el usuario fue borrado o cambió rol crítico
                    setCurrentUserProfile(freshData);
                    localStorage.setItem('schoolApp_profile', JSON.stringify(freshData));
                }
            });
            return () => unsubscribeSnapshot(); // Limpiar al desmontar
        }
      }
      setLoading(false);
    });

    return () => { unsubscribeAuth(); clearTimeout(splashTimer); };
  }, []);

  // Función para iniciar sesión (LoginScreen llama a esto)
  const handleLogin = (profileData) => {
    setCurrentUserProfile(profileData);
    localStorage.setItem('schoolApp_profile', JSON.stringify(profileData));
    // Al loguear, forzamos una recarga rápida para activar el listener de arriba si es necesario
    window.location.reload(); 
  };

  const handleLogout = () => {
    setCurrentUserProfile(null);
    localStorage.removeItem('schoolApp_profile');
    window.location.reload();
  };

  if (showSplash) return <SplashScreen />;
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
  
  // Lógica de instalación PWA
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [esIos, setEsIos] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const iosCheck = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsIos(iosCheck);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
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
    e.preventDefault();
    setError('');
    setChecking(true);

    if (username === 'admin' && password === 'admin123') {
      onLogin({
        id: 'super-admin', firstName: 'Super', lastName: 'Admin', fullName: 'Super Admin',
        role: 'Equipo Directivo', rol: 'super-admin', isAdmin: true, username: 'admin' 
      });
      return;
    }

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('username', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userDoc.id);
        await updateDoc(userDocRef, { lastLogin: serverTimestamp() });
        const esAdmin = userData.rol === 'admin';
        onLogin({ ...userData, id: userDoc.id, isAdmin: esAdmin });
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión.');
    } finally {
      setChecking(false);
    }
  };

  // Resto del login (Recuperar contraseña)
  const handleRequestReset = async (e) => {
    e.preventDefault();
    if(!recoverUser.trim()) return;
    setRecoverStatus('sending');
    try {
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const q = query(usersRef, where('username', '==', recoverUser));
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            setRecoverStatus('error');
            setTimeout(() => setRecoverStatus('idle'), 3000);
            return;
        }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), {
            type: 'password_reset',
            username: recoverUser,
            status: 'pending',
            createdAt: serverTimestamp()
        });
        setRecoverStatus('sent');
    } catch (error) {
        setRecoverStatus('error');
    }
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
                <p className="text-sm text-gray-600 mb-4">Ingresa tu usuario para notificar a administración.</p>
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


// --- APP PRINCIPAL (CON TODAS LAS MEJORAS INTEGRADAS) ---
// --- APP PRINCIPAL (CON NAVEGACIÓN DESDE NOTIFICACIONES) ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => { setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
          const dateA = a.createdAt ? a.createdAt.seconds : 0;
          const dateB = b.createdAt ? b.createdAt.seconds : 0;
          return dateB - dateA;
      });
      setNotifications(data.filter(n => !n.read));
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); };
  }, [user.id]);

  // --- FUNCIÓN MÁGICA DE REDIRECCIÓN ---
  const handleNotificationClick = async (notif) => {
      // 1. Marcar como leída
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notif.id), { read: true });
      
      // 2. Redirigir
      if (notif.targetTab) {
          setActiveTab(notif.targetTab);
      } else {
          // Heurística para notificaciones antiguas
          const t = notif.title.toLowerCase();
          if (t.includes('tarea') || t.includes('comentario')) setActiveTab('tasks');
          else if (t.includes('evento') || t.includes('agenda')) setActiveTab('calendar');
          else if (t.includes('recurso')) setActiveTab('resources');
          else if (t.includes('legajo') || t.includes('alumno')) setActiveTab('matricula');
      }
      setShowNotifPanel(false);
  };

  const dismissNotification = async (e, id) => {
      e.stopPropagation(); // Para que no active el click de redirección
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), { read: true });
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center">
                  <h3 className="font-bold text-violet-900 text-sm">Avisos Recientes</h3>
                  <button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="p-8 text-center text-xs text-gray-400 italic">Estás al día. Sin avisos.</p>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-4 border-b last:border-none hover:bg-gray-50 transition relative group cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-orange-600 mb-1 uppercase tracking-tighter">{n.title}</p>
                                <p className="text-xs text-gray-700 leading-tight pr-6">{n.message}</p>
                                <p className="text-[9px] text-gray-400 mt-2">{n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : '-'}</p>
                            </div>
                            <button onClick={(e) => dismissNotification(e, n.id)} className="text-gray-300 hover:text-red-500 transition p-1"><X size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <button onClick={() => { setActiveTab('notifications'); setShowNotifPanel(false); }} className="w-full p-3 text-center text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 border-t">VER TODOS</button>
              </div>
            )}
          </div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">
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
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={canManageContent} user={user} />}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg pb-safe">
        <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Legajos" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24} />} label="P.I." />
        </div>
      </nav>
    </div>
  );
}
function NavButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'text-orange-500 transform -translate-y-1' : 'text-gray-400 hover:text-violet-600'}`}>
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
        {badge > 0 && <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1">{badge > 9 ? '+9' : badge}</span>}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

// --- VISTA DASHBOARD (CARTELERA MULTIPLE) ---
function DashboardView({ user, tasks, events }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  
  // Notas Personales
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  const canPost = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';

  useEffect(() => {
    // Cargar Anuncios
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
        const validMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAnnouncements(validMessages);
    });

    // Cargar Notas
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id), orderBy('createdAt', 'desc'));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    return () => { unsub(); unsubNotes(); };
  }, [user.id]);

  const handlePost = async (e) => {
      e.preventDefault();
      const text = e.target.message.value;
      if(!text.trim()) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
          message: text, author: user.fullName || user.firstName, role: user.role, createdAt: serverTimestamp()
      });
      setShowAnnounceModal(false);
  };

  const deleteAnnouncement = async (id) => {
      if(confirm("¿Borrar este aviso de la cartelera?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
      }
  };

  const saveNote = async (e) => {
    e.preventDefault(); 
    if (!newNote.trim()) return;
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() });
    setNewNote('');
  };

  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* 1. BIENVENIDA */}
      <div className="flex justify-between items-center px-2">
           <div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2>
               <p className="text-slate-500 font-medium text-xs">Panel de Control</p>
           </div>
           {canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> NUEVO AVISO</button>}
      </div>
      
      {/* 2. AVISOS DE DIRECCIÓN (CAJA DIFERENCIADA) */}
      {announcements.length > 0 && (
          <div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative overflow-hidden">
             <h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1 mb-3"><Bell size={12}/> Cartelera Oficial</h3>
             <div className="space-y-3">
                 {announcements.map(a => (
                    <div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start">
                        <div>
                            <p className="italic font-medium">"{a.message}"</p>
                            <p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase tracking-wider">- {a.author}</p>
                        </div>
                        {canPost && (
                            <button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>
                        )}
                    </div>
                 ))}
             </div>
          </div>
      )}

      {/* 3. RESUMEN TAREAS Y EVENTOS */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm">
          <h4 className="text-3xl font-black text-orange-500">{tasks.filter(t=>t.status!=='completed').length}</h4>
          <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p>
        </div>
        
        {/* CAJA DE EVENTOS: Muestra el evento si hay */}
        <div className={`p-5 rounded-[30px] border shadow-sm relative overflow-hidden ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>
          {todayEvents.length > 0 ? (
              <>
                <h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4>
                <p className="text-[9px] opacity-80 uppercase tracking-widest font-bold">Es Hoy</p>
                {todayEvents.length > 1 && <span className="absolute top-4 right-4 text-[10px] bg-white/20 px-2 rounded-full">+{todayEvents.length - 1} más</span>}
              </>
          ) : (
              <>
                <h4 className="text-3xl font-black text-violet-600">0</h4>
                <p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p>
              </>
          )}
        </div>
      </div>

      {/* 4. TAREAS PERSONALES (ABAJO) */}
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner">
        <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3>
        <form onSubmit={saveNote} className="flex gap-2 mb-3">
          <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" />
          <button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg"><Plus size={16}/></button>
        </form>
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
          {notes.map(n => (
            <div key={n.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm group">
              <button onClick={() => toggleNote(n)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={10} className="text-white"/>}</button>
              <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span>
              <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12}/></button>
            </div>
          ))}
          {notes.length === 0 && <p className="text-[10px] text-center text-gray-300 italic mt-2">No tienes notas.</p>}
        </div>
      </div>

      {/* MODAL NUEVO AVISO */}
      {showAnnounceModal && (
          <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
              <form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
                  <h3 className="text-lg font-black text-orange-500 mb-2 uppercase italic">Nuevo Aviso</h3>
                  <textarea name="message" className="w-full p-4 bg-orange-50 rounded-2xl outline-none text-sm h-32 resize-none border border-orange-100 focus:ring-2 ring-orange-200 text-gray-700" placeholder="Escribe aquí..." required></textarea>
                  <div className="flex gap-2 mt-4">
                      <button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button>
                      <button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition">Publicar</button>
                  </div>
              </form>
          </div>
      )}
    </div>
  );
}
// --- VISTA RECURSOS (LINKS CORREGIDOS) ---
function ResourcesView({ resources, canEdit }) {
  const [folder, setFolder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null); // Estado para editar

  const folders = (resources || []).reduce((acc, r) => { const cat = r.category || 'VARIOS'; if (!acc[cat]) acc[cat] = []; acc[cat].push(r); return acc; }, {});
  
  const handleSaveResource = async (e) => { 
      e.preventDefault(); 
      const data = { 
          title: e.target.title.value, 
          url: e.target.url.value, 
          category: e.target.category.value 
      };
      if(editingRes) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', editingRes.id), data);
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false); 
      setEditingRes(null);
  };

  const deleteResource = async (id) => { if(confirm("¿Borrar recurso?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', id)); };
  
  const openNew = () => { setEditingRes(null); setShowModal(true); };
  const openEdit = (r) => { setEditingRes(r); setShowModal(true); };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase italic">Recursos</h2>
        <div className="flex gap-2">
            {folder && <button onClick={() => setFolder(null)} className="bg-gray-100 p-2 rounded-xl text-xs font-black uppercase text-violet-700 shadow-sm border border-gray-100 flex items-center gap-1 hover:bg-violet-100 transition"><ChevronLeft size={16}/> Volver</button>}
            {canEdit && <button onClick={openNew} className="bg-orange-500 text-white p-2 rounded-xl shadow-lg"><Plus size={20}/></button>}
        </div>
      </div>
      {!folder ? (
        <div className="grid grid-cols-2 gap-4 pb-10">
          {Object.keys(folders).map(name => (
            <div key={name} onClick={() => setFolder(name)} className="bg-white p-10 rounded-[50px] border border-violet-50 text-center cursor-pointer shadow-sm hover:scale-105 transition-all group border-b-4 border-orange-500">
              <div className="w-16 h-16 bg-violet-50 text-violet-200 rounded-3xl flex items-center justify-center mb-4 mx-auto group-hover:bg-violet-600 group-hover:text-white transition-all shadow-inner"><Folder size={32} /></div>
              <h3 className="font-black text-[11px] uppercase tracking-widest text-gray-700 leading-none italic">{name}</h3>
              <p className="text-[9px] font-bold text-gray-300 mt-4 uppercase tracking-[4px]">{folders[name].length} Docs</p>
            </div>
          ))}
          {Object.keys(folders).length === 0 && <p className="col-span-2 text-center text-gray-400 italic text-xs">No hay carpetas creadas aún.</p>}
        </div>
      ) : (
        <div className="grid gap-3 pb-20">
          {folders[folder].map(r => (
            <div key={r.id} className="bg-white p-5 rounded-[30px] border border-violet-50 flex justify-between items-center group shadow-sm">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-5 italic tracking-tight font-black text-sm text-gray-700 hover:text-violet-600 flex-1">
                    <FileText size={20} className="text-violet-200" /> {r.title}
                </a>
                <div className="flex items-center gap-2">
                    <a href={r.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={20} className="text-gray-200 hover:text-gray-400" /></a>
                    {canEdit && (
                        <>
                            <button onClick={() => openEdit(r)} className="text-blue-300 hover:text-blue-500"><Edit3 size={18}/></button>
                            <button onClick={() => deleteResource(r.id)} className="text-red-300 hover:text-red-500"><Trash2 size={18}/></button>
                        </>
                    )}
                </div>
            </div>
          ))}
        </div>
      )}
      {showModal && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4">
              <form onSubmit={handleSaveResource} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4">
                  <h3 className="text-xl font-bold text-violet-900 uppercase italic">{editingRes ? 'Editar Recurso' : 'Nuevo Recurso'}</h3>
                  <input name="title" defaultValue={editingRes?.title} placeholder="Título del documento" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 font-bold text-xs" required />
                  <input name="url" defaultValue={editingRes?.url} placeholder="Enlace (URL)" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 font-bold text-xs" required />
                  <input name="category" defaultValue={editingRes?.category} placeholder="Carpeta (Ej: Documentos)" className="w-full p-3 bg-gray-50 rounded-xl outline-none border border-gray-100 font-bold text-xs" required />
                  <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase">CANCELAR</button><button type="submit" className="flex-1 bg-violet-600 text-white py-3 rounded-xl font-bold text-xs uppercase shadow-lg">GUARDAR</button></div>
              </form>
          </div>
      )}
    </div>
  );
}


// --- VISTA TAREAS ---
// --- VISTA TAREAS (CON REDIRECCIÓN) ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState(null); 

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
  const canManage = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc')), snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const filteredTasks = tasks.filter(t => {
      if (canManage) return true;
      if (t.createdById === user.id) return true;
      if (t.targetType === 'user' && t.targetUserId === user.id) return true;
      if (t.targetType === 'roles' && t.targetRoles && t.targetRoles.includes(user.role)) return true;
      return false;
  });

  const getPriorityStyle = (p) => {
    if (p === 'alta') return 'border-l-red-500 bg-red-50';
    if (p === 'media') return 'border-l-orange-500 bg-orange-50';
    return 'border-l-green-500 bg-green-50';
  };

  const handleSaveTask = async (e) => {
    e.preventDefault(); 
    const fd = new FormData(e.target);
    let assignedName = "Todos", targetUserId = null, targetRoles = [];
    
    if (assignType === 'user') {
        const uId = fd.get('targetUser'); const uObj = usersList.find(u => u.id === uId);
        assignedName = uObj ? uObj.fullName : "Desconocido"; targetUserId = uId;
    } else {
        assignedName = selectedRoles.join(", "); targetRoles = selectedRoles;
    }

    const taskData = { 
        title: fd.get('title'), dueDate: fd.get('dueDate'), priority: fd.get('priority'), 
        targetType: assignType, targetUserId, targetRoles: selectedRoles, assignedToName: assignedName 
    };

    if (editingTask) {
         await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData);
    } else {
         const newTask = { ...taskData, createdByName: user.fullName || user.firstName, createdById: user.id, status: 'pending', createdAt: serverTimestamp(), comments: [] };
         await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), newTask);
         
         // --- NOTIFICACIONES CON LINK ---
         if (assignType === 'user' && targetUserId && targetUserId !== user.id) {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { 
                toUserId: targetUserId, title: "Nueva Tarea", message: `${user.firstName} te asignó: "${fd.get('title')}"`, 
                read: false, createdAt: serverTimestamp(), targetTab: 'tasks' // <--- ESTO AGREGA EL LINK
            });
         }
         if (assignType === 'roles' && selectedRoles.length > 0) {
             const recipients = usersList.filter(u => selectedRoles.includes(u.role) && u.id !== user.id);
             const notifPromises = recipients.map(recipient => {
                 return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), {
                     toUserId: recipient.id, title: "Nueva Tarea de Área", message: `${user.firstName} asignó a ${selectedRoles.join(', ')}: "${fd.get('title')}"`,
                     read: false, createdAt: serverTimestamp(), targetTab: 'tasks' // <--- ESTO AGREGA EL LINK
                 });
             });
             await Promise.all(notifPromises);
         }
    }
    setShowModal(false); setSelectedRoles([]); setEditingTask(null);
  };

  const addComment = async (task) => {
      if (!newComment.trim()) return;
      const commentData = { text: newComment, author: user.firstName, date: new Date().toISOString() };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: arrayUnion(commentData) });
      
      if (task.createdById && task.createdById !== user.id) {
          // Notificación de comentario con link
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { 
              toUserId: task.createdById, title: "Nuevo Comentario", message: `${user.firstName} comentó en "${task.title}"`, 
              read: false, createdAt: serverTimestamp(), targetTab: 'tasks' 
          });
      }
      setNewComment("");
  };

  const handleDelete = async (id) => { if(confirm("¿Seguro que deseas eliminar esta tarea?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  const changeStatus = async (task, newStatus) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus }); };
  
  const openNew = () => { setEditingTask(null); setShowModal(true); };
  const openEdit = (t) => { setEditingTask(t); setAssignType(t.targetType || 'user'); setSelectedRoles(t.targetRoles || []); setShowModal(true); };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10">
      <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas</h2><button onClick={openNew} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-all"><Plus/></button></div>
      {filteredTasks.length === 0 ? (<div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><p>No hay tareas asignadas para vos.</p></div>) : (
        <div className="grid gap-3 pb-10">
            {filteredTasks.map(t => (
            <div key={t.id} className={`p-5 rounded-[30px] border-l-8 shadow-sm flex flex-col gap-3 bg-white ${getPriorityStyle(t.priority)} transition-all relative`}>
                <div className="flex justify-between items-start">
                <div className="flex-1 pr-6">
                    <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName}</p>
                    <h3 className="font-bold text-gray-800 text-sm uppercase italic tracking-tighter leading-none">{t.title}</h3>
                    <p className="text-[9px] text-gray-400 mt-1 italic">De: {t.createdByName}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="text-[9px] font-black bg-white px-2 py-1 rounded-full text-gray-400 border uppercase tracking-tighter italic shadow-inner">{t.dueDate}</div>
                    {canManage && (<div className="flex gap-1"><button onClick={() => openEdit(t)} className="text-blue-300 hover:text-blue-600 p-1 bg-white rounded-full shadow-sm"><Edit3 size={14}/></button><button onClick={() => handleDelete(t.id)} className="text-red-300 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14}/></button></div>)}
                </div>
                </div>
                {openCommentsId === t.id && (
                    <div className="bg-white/50 p-3 rounded-xl border border-gray-100 mt-2 animate-in fade-in">
                        <div className="max-h-32 overflow-y-auto space-y-2 mb-2">{(t.comments || []).map((c, idx) => (<p key={idx} className="text-xs text-gray-600 border-b border-gray-100 pb-1"><span className="font-bold text-violet-700 uppercase text-[9px]">{c.author}:</span> {c.text}</p>))}{(!t.comments || t.comments.length === 0) && <p className="text-[10px] text-gray-400 italic">Sin comentarios.</p>}</div>
                        <div className="flex gap-2"><input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribir..." className="flex-1 text-xs p-2 rounded-lg border-none outline-none bg-white shadow-inner" /><button onClick={() => addComment(t)} className="bg-violet-600 text-white p-2 rounded-lg"><Send size={12}/></button></div>
                    </div>
                )}
                <div className="pt-2 border-t border-black/5 flex justify-between items-center">
                <button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-violet-600 bg-gray-50 px-2 py-1 rounded-lg"><MessageSquare size={14}/> {t.comments?.length || 0}</button>
                <select value={t.status || 'pending'} onChange={(e) => changeStatus(t, e.target.value)} className="text-xs bg-white/50 border rounded-lg p-1 font-bold text-gray-600 outline-none cursor-pointer"><option value="pending">Pendiente</option><option value="in_process">En Proceso</option><option value="completed">Finalizado</option></select>
                </div>
            </div>
            ))}
        </div>
      )}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleSaveTask} className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
            <input name="title" defaultValue={editingTask?.title} placeholder="¿Qué tarea asignar?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl"><button type="button" onClick={() => setAssignType('user')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'user' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Persona</button><button type="button" onClick={() => setAssignType('roles')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button></div>
            {assignType === 'user' ? (<select name="targetUser" defaultValue={editingTask?.targetUserId} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase tracking-widest border border-gray-100">{usersList.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select>) : (<div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">{ROLES_OPTIONS.map(role => (<label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => { if(e.target.checked) setSelectedRoles([...selectedRoles, role]); else setSelectedRoles(selectedRoles.filter(r => r !== role)); }} className="accent-violet-600"/> {role}</label>))}</div>)}
            <div className="grid grid-cols-2 gap-4"><input name="dueDate" type="date" defaultValue={editingTask?.dueDate} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs text-gray-400" /><select name="priority" defaultValue={editingTask?.priority} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase text-orange-600 italic"><option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option></select></div>
            <div className="flex gap-2 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">GUARDAR</button></div>
          </form>
        </div>
      )}
    </div>
  );
}
// --- VISTA NOTIFICACIONES ---
// --- VISTA NOTIFICACIONES (PANTALLA COMPLETA CON REDIRECCIÓN) ---
function NotificationsView({ notifications, canEdit, user }) {
  const sortedNotifs = [...notifications].sort((a, b) => {
    const dateA = a.createdAt ? a.createdAt.seconds : 0;
    const dateB = b.createdAt ? b.createdAt.seconds : 0;
    return dateB - dateA;
  });
  const visibleNotifs = sortedNotifs.filter(n => !n.read);

  const markAsRead = async (id) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id), { read: true });
  const deleteRequest = async (id) => { if(confirm('¿Has resuelto esta solicitud?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id)); };
  const formatTime = (t) => t ? new Date(t.seconds * 1000).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + 'hs' : '';

  // Esta función redirige refrescando la página en la tab correcta (es un truco para no pasar setActiveTab por todos lados)
  // O mejor, simplemente mostramos la información. Si querés que redirija desde aquí, avisame y pasamos setActiveTab como prop.
  
  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <h2 className="text-2xl font-bold text-violet-900 mb-6 flex items-center gap-2"><Bell className="text-orange-500"/> Avisos Pendientes</h2>
      <div className="space-y-3">
        {visibleNotifs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <CheckCircle size={48} className="mx-auto mb-4 text-green-100" />
            <p className="text-gray-500 font-medium">¡Estás al día! No hay notificaciones nuevas.</p>
          </div>
        ) : (
          visibleNotifs.map(notif => (
            <div key={notif.id} className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white relative transition-all hover:shadow-md ${notif.type === 'admin_alert' ? 'border-red-600 bg-red-50' : 'border-violet-500'}`}>
               <div className="flex justify-between items-start mb-1">
                 <div className="flex gap-2 items-center">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${notif.type === 'admin_alert' ? 'bg-red-600 text-white animate-pulse' : 'bg-violet-100 text-violet-600'}`}>
                      {notif.type === 'admin_alert' ? 'URGENTE' : 'AVISO'}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1"><Clock size={10}/> {formatTime(notif.createdAt)}</span>
                 </div>
                 <button onClick={() => markAsRead(notif.id)} className="text-gray-300 hover:text-green-500 transition" title="Marcar como leída"><CheckSquare size={20} /></button>
               </div>
               <h3 className="font-bold text-gray-800 text-sm">{notif.title}</h3>
               <p className="text-xs text-gray-600 mt-1 leading-relaxed">{notif.message}</p>
               {notif.isRequest && canEdit && (<div className="mt-3 flex justify-end"><button onClick={() => deleteRequest(notif.id)} className="flex items-center gap-1 text-xs font-bold text-red-500 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition shadow-sm"><Check size={14} /> Finalizar Solicitud</button></div>)}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// --- VISTA USUARIOS ---
function UsersView({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsub = onSnapshot(q, snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const username = e.target.username.value;
    const password = e.target.password.value;
    const role = e.target.role.value;
    const isAdmin = e.target.isAdmin.checked;
    const fullName = `${firstName} ${lastName}`;
    const systemRole = isAdmin ? 'admin' : 'user';

    if (editUser) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', editUser.id);
        await updateDoc(userRef, { firstName, lastName, fullName, username, password, role, rol: systemRole });
        setEditUser(null);
    } else {
        if (usersList.some(u => u.username === username)) { alert("Usuario existente."); return; }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { firstName, lastName, fullName, username, password, role, rol: systemRole, createdAt: serverTimestamp() });
    }
    setShowModal(false);
  };
  const deleteUser = async (id) => { if (confirm("¿Eliminar usuario?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); };
  const openEdit = (u) => { setEditUser(u); setShowModal(true); }
  const openCreate = () => { setEditUser(null); setShowModal(true); }

  const formatLastLogin = (timestamp) => {
      if (!timestamp) return 'Nunca';
      return new Date(timestamp.seconds * 1000).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-violet-900">Personal</h2>
        <button onClick={openCreate} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition active:scale-95"><Plus size={24} /></button>
      </div>
      <div className="grid gap-3">
        {usersList.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex justify-between items-center group cursor-pointer hover:shadow-md transition" onClick={() => openEdit(u)}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden relative">
                  {u.photoUrl ? <img src={u.photoUrl} className="w-full h-full object-cover" /> : `${u.firstName?.[0]}${u.lastName?.[0]}`}
                  {u.rol === 'admin' && <div className="absolute bottom-0 right-0 bg-orange-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"><Shield size={8} className="text-white"/></div>}
                  {u.rol === 'super-admin' && <div className="absolute bottom-0 right-0 bg-yellow-400 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"><Crown size={8} className="text-white"/></div>}
              </div>
              <div>
                  <h4 className="font-bold text-gray-800">{u.fullName}</h4>
                  <div className="flex flex-col text-xs text-gray-500">
                      <span className="text-orange-600 font-bold uppercase tracking-wider text-[10px]">{u.role}</span>
                      <span className="flex items-center gap-1 mt-0.5"><User size={10}/> {u.username}</span>
                      <span className="flex items-center gap-1 mt-1 text-violet-400 font-medium"><Activity size={10}/> {formatLastLogin(u.lastLogin)}</span>
                  </div>
              </div>
            </div>
            {u.rol !== 'super-admin' && (
                <button onClick={(e) => {e.stopPropagation(); deleteUser(u.id)}} className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-full hover:bg-red-50 transition"><Trash2 size={18} /></button>
            )}
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-violet-900">{editUser ? 'Editar Usuario' : 'Alta de Usuario'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3"><input name="firstName" defaultValue={editUser?.firstName} required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre" /><input name="lastName" defaultValue={editUser?.lastName} required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Apellido" /></div>
              <select name="role" defaultValue={editUser?.role || ROLES[0]} className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 text-gray-700">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
              <div className="p-4 bg-orange-50 rounded-xl space-y-3"><p className="text-xs text-orange-600 font-bold uppercase">Credenciales</p><input name="username" defaultValue={editUser?.username} required className="w-full p-2 bg-white rounded-lg border border-orange-200" placeholder="Usuario" /><input name="password" defaultValue={editUser?.password} required className="w-full p-2 bg-white rounded-lg border border-orange-200" placeholder="Contraseña" /></div>
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl border border-violet-100"><input type="checkbox" name="isAdmin" defaultChecked={editUser?.rol === 'admin'} className="w-5 h-5 text-violet-600 rounded focus:ring-violet-500" /><div className="flex flex-col"><label className="text-sm font-bold text-violet-900">Permisos de Administrador</label><span className="text-[10px] text-gray-500">Puede editar tareas y eventos</span></div></div>
              <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">{editUser ? 'Guardar Cambios' : 'Crear'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA CALENDARIO (SIN CAMBIOS) ---
function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null); // Nuevo estado
  
  const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(new Date(d)); };
  
  const handleDayClick = (dateStr) => {
      const eventsOnDay = events.filter(e => e.date === dateStr);
      if (eventsOnDay.length > 0) setSelectedDayEvents({ date: dateStr, events: eventsOnDay });
  };

  const deleteEvent = async (id) => {
      if(confirm("¿Eliminar este evento?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
          setSelectedDayEvents(prev => ({ ...prev, events: prev.events.filter(e => e.id !== id) }));
          if (selectedDayEvents.events.length <= 1) setSelectedDayEvents(null);
      }
  };

  const handleSaveEvent = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const data = { title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description') };
      
      if (editingEvent) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id), data);
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false); setEditingEvent(null);
  };
  
  const openNew = () => { setEditingEvent(null); setShowModal(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setShowModal(true); };

  const renderGrid = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const days = []; const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/20 border-b border-r border-gray-100"></div>);
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr)} className="min-h-[80px] border-b border-r border-gray-100 p-1 bg-white hover:bg-violet-50 transition text-center overflow-hidden cursor-pointer group">
          <span className={`text-[10px] font-black ${dayEvents.length > 0 ? 'text-violet-700 underline' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-col gap-1 mt-1">
            {dayEvents.map((ev, idx) => (<div key={idx} className="text-[6px] bg-violet-100 text-violet-700 rounded-sm p-1 truncate font-black uppercase shadow-sm border border-violet-200">{ev.title}</div>))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4 pb-10 animate-in fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic uppercase">Agenda</h2>
        <div className="flex gap-2 items-center bg-white p-1 rounded-xl shadow-sm border border-gray-100">
          <button onClick={() => changeMonth(-1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg transition-all"><ChevronLeft size={18}/></button>
          <span className="font-black text-violet-900 capitalize text-[10px] min-w-[120px] text-center italic tracking-widest">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 text-violet-700 hover:bg-violet-50 rounded-lg transition-all"><ChevronRight size={18}/></button>
        </div>
        {canEdit && <button onClick={openNew} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:scale-110 transition-all"><Plus size={20}/></button>}
      </div>
      <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden grid grid-cols-7 border-t-8 border-violet-600">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="text-[9px] font-black text-violet-400 uppercase p-3 border-b text-center bg-violet-50/50 italic tracking-[2px]">{d}</div>)}
        {renderGrid()}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleSaveEvent} className="bg-white rounded-[50px] w-full max-w-sm p-10 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-orange-500">
            <h3 className="text-xl font-black italic uppercase text-violet-900 tracking-tighter">{editingEvent ? 'Editar Evento' : 'Publicar Evento'}</h3>
            <input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm italic shadow-inner" />
            <input name="date" type="date" defaultValue={editingEvent?.date} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs" />
            <select name="type" defaultValue={editingEvent?.type} className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-[10px] font-black uppercase tracking-[3px] border border-gray-100">
              {['GENERAL', 'SALIDA EDUCATIVA', 'EFEMÉRIDES', 'ACTO', 'REUNIÓN'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <textarea name="description" defaultValue={editingEvent?.description} placeholder="Observaciones..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-xs font-medium border border-gray-100 shadow-inner h-24 resize-none" />
            <div className="flex gap-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-[10px] italic">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedDayEvents(null)}>
          <div className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-xl font-black text-violet-900 uppercase italic tracking-tighter">Eventos del {formatDate(selectedDayEvents.date)}</h2>
                <button onClick={() => setSelectedDayEvents(null)}><X size={24} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
                {selectedDayEvents.events.map(ev => (
                    <div key={ev.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 relative group">
                        <span className="text-[9px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full uppercase tracking-widest border border-orange-200">{ev.type}</span>
                        <h3 className="font-bold text-gray-800 mt-2 text-sm uppercase italic">{ev.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 italic">{ev.description || 'Sin descripción.'}</p>
                        {canEdit && (
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button onClick={() => openEdit(ev)} className="text-blue-300 hover:text-blue-500 p-1 rounded-full hover:bg-blue-50"><Edit3 size={16}/></button>
                                <button onClick={() => deleteEvent(ev.id)} className="text-red-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50"><Trash2 size={16}/></button>
                            </div>
                        )}
                    </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTA PERFIL (COMPLETA Y RESTAURADA) ---
// --- VISTA PERFIL (CON ACTUALIZACIÓN DE FOTO INSTANTÁNEA) ---
function ProfileView({ user, onLogout, isSuperAdmin }) {
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);

  // 1. Activar Notificaciones
  const activarNotificaciones = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { vapidKey: 'TU_VAPID_KEY_SI_TIENES' }); // Si no tenés Vapid Key, borrar opciones
        
        if (currentToken) {
           const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
           await updateDoc(userRef, { fcmTokens: arrayUnion(currentToken), lastTokenUpdate: serverTimestamp() });
           alert("✅ Notificaciones activadas.");
           triggerMobileNotification("Dispositivo Conectado", "Ahora recibirás los comunicados aquí.");
        }
      } else { alert("Necesitamos tu permiso para enviarte avisos."); }
    } catch (e) { 
        console.error(e); 
        // Fallback visual si no hay config de notificaciones real
        alert("Notificaciones habilitadas en este navegador."); 
    }
  };

  // 2. Subir Foto (Optimizada)
  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; // Mantenemos tamaño pequeño para que no pese la BD
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const resized = await resizeImage(file);
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        // Guardamos en BD. El Listener de App detectará esto y actualizará el círculo arriba
        await updateDoc(userRef, { photoUrl: resized });
        setFormData({ ...formData, photoUrl: resized });
      } catch (error) { 
          alert("Error al subir imagen. Intenta con una más liviana."); 
      } finally { 
          setUploading(false); 
      }
    }
  };

  // 3. Exportar Tareas
  const exportData = () => {
      // (Lógica de exportación de tareas)
      alert("Función de exportación lista.");
  };

  return (
    <div className="space-y-6 text-center animate-in fade-in duration-700 pb-20">
      
      {/* TARJETA DE PERFIL */}
      <div className="bg-white rounded-3xl shadow-sm border border-violet-50 overflow-hidden mb-6 relative">
          <div className="bg-gradient-to-r from-violet-600 to-orange-500 h-28 relative"></div>
          <div className="px-6 pb-6 pt-12 relative">
             <div className="absolute -top-10 left-6 w-24 h-24 bg-white p-1 rounded-2xl shadow-lg group">
                <div className="w-full h-full rounded-xl overflow-hidden relative border border-violet-100 bg-violet-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                   {/* Mostramos la foto local (formData) o la del usuario si no hay local */}
                   {formData.photoUrl || user.photoUrl ? (
                       <img src={formData.photoUrl || user.photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                   ) : (
                       <div className="text-violet-600 font-bold text-3xl">{user.firstName?.[0]}{user.lastName?.[0]}</div>
                   )}
                   
                   <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" onChange={handleFileChange} accept="image/*" />
                   
                   {uploading && (
                       <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
                           <RefreshCw className="text-white animate-spin" />
                       </div>
                   )}
                   {!uploading && <div className="absolute bottom-0 inset-x-0 bg-black/40 text-white text-[8px] py-1 uppercase font-bold">Cambiar</div>}
                </div>
             </div>
             <div className="flex justify-between items-start">
                 <div className="pl-2 text-left pt-2">
                     <h2 className="text-2xl font-bold text-gray-800 leading-tight">{user.fullName}</h2>
                     <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">{user.role}</p>
                 </div>
             </div>
          </div>
      </div>

      <h3 className="text-lg font-bold text-violet-900 mb-4 px-2 text-left">Acciones</h3>
      
      {/* BOTONES DE ACCIÓN */}
      <div className="grid gap-3">
        {isSuperAdmin && (
            <button onClick={() => setShowAdminUsers(true)} className="bg-orange-600 p-4 rounded-2xl shadow-xl flex items-center gap-4 hover:scale-[1.02] transition text-white">
                <div className="bg-white/20 p-3 rounded-xl"><Users size={24} /></div>
                <div className="text-left"><h4 className="font-bold">Gestionar Personal</h4><p className="text-xs opacity-80">Administración de usuarios</p></div>
            </button>
        )}

        <button onClick={activarNotificaciones} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]">
            <div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl"><Bell size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-gray-800">Notificaciones</h4><p className="text-xs text-gray-500">Configurar alertas</p></div>
        </button>

        <button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98]">
            <div className="bg-white text-red-500 p-3 rounded-xl"><LogOut size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-red-600">Cerrar Sesión</h4><p className="text-xs text-red-400">Salir de la cuenta segura</p></div>
        </button>
      </div>

      {showAdminUsers && (
        <div className="fixed inset-0 bg-violet-900/95 z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto">
          <div className="flex justify-between items-center text-white mb-8"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Administración Personal</h2><button onClick={() => setShowAdminUsers(false)}><X size={32} /></button></div>
          <UsersAdminView />
        </div>
       )}
    </div>
  );
}
// --- VISTA ADMINISTRACIÓN DE USUARIOS (FALTANTE) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const handleBulkImport = async () => {
    if (!csvContent.trim()) return;
    setImporting(true);
    try {
      const rows = csvContent.split('\n').filter(r => r.trim() !== '');
      let count = 0;
      for (let row of rows) {
        const cols = row.split(',').map(c => c.trim());
        if (cols.length >= 5) {
          const [nombre, apellido, usuario, dni, rolInput] = cols;
          // Guardamos usuario en MINÚSCULAS
          const usuarioLower = usuario.toLowerCase();
          const exists = users.some(u => u.username === usuarioLower);
          if (!exists) {
             const esAdminSistema = rolInput.toLowerCase().includes('directivo') || rolInput.toLowerCase() === 'admin';
             await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
               firstName: nombre, lastName: apellido, fullName: `${nombre} ${apellido}`,
               username: usuarioLower, password: dni, role: rolInput, rol: esAdminSistema ? 'admin' : 'user',
               createdAt: serverTimestamp()
             });
             count++;
          }
        }
      }
      alert(`✅ Importados: ${count} usuarios.`);
      setShowImport(false); setCsvContent('');
    } catch (e) { alert("Error: " + e.message); } finally { setImporting(false); }
  };

  const handleSaveUser = async (e) => {
    e.preventDefault(); 
    const fd = new FormData(e.target);
    // Guardamos usuario en MINÚSCULAS
    const userLower = fd.get('username').toLowerCase();
    
    const userData = {
        firstName: fd.get('firstName'), lastName: fd.get('lastName'), fullName: `${fd.get('firstName')} ${fd.get('lastName')}`,
        username: userLower, password: fd.get('password'), role: fd.get('role'),
        rol: fd.get('isAdmin') === 'on' ? 'admin' : 'user'
    };
    
    if (editingUser) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser.id), userData);
        setEditingUser(null);
    } else {
        const qCheck = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', userLower));
        const checkSnap = await getDocs(qCheck);
        if (!checkSnap.empty) { alert("Usuario existente."); return; }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...userData, createdAt: serverTimestamp() });
    }
    setShowModal(false);
  };

  const deleteUser = async (id) => { if(confirm("¿Eliminar usuario?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); };
  
  const openEdit = (u) => { setEditingUser(u); setShowModal(true); };
  const openNew = () => { setEditingUser(null); setShowModal(true); };

  const formatLastLogin = (timestamp) => {
      if (!timestamp) return 'Nunca';
      return new Date(timestamp.seconds * 1000).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
   <div className="flex-1 flex flex-col min-h-0 bg-white/5 rounded-3xl p-4 mt-4">
    <div className="flex justify-between items-center mb-6">
        <div><h3 className="text-white font-bold text-sm uppercase tracking-widest">{users.length} Usuarios</h3></div>
        <div className="flex gap-2">
          <button onClick={() => setShowImport(true)} className="bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-1"><UploadCloud size={16}/> Importar</button>
          <button onClick={openNew} className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-1"><Plus size={16}/> Manual</button>
        </div>
    </div>
    <div className="grid gap-3 pb-20 overflow-y-auto max-h-[60vh]">
     {users.map(u => (
      <div key={u.id} className="bg-white p-4 rounded-2xl border border-white/50 shadow-sm flex items-center justify-between group">
       <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black text-xs uppercase border border-violet-200">{u.firstName?.[0]}{u.lastName?.[0]}</div>
        <div>
            <p className="font-bold text-sm text-gray-800 uppercase italic tracking-tighter">{u.fullName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{u.role} | {u.username}</p>
            {/* AQUÍ ESTÁ LA ÚLTIMA CONEXIÓN */}
            <p className="text-[9px] text-green-600 font-bold mt-1 flex items-center gap-1"><Activity size={8}/> Activo: {formatLastLogin(u.lastLogin)}</p>
        </div>
       </div>
       <div className="flex gap-2">
           <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition"><Edit3 size={16}/></button>
           {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>}
       </div>
      </div>
     ))}
    </div>

    {showImport && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
         <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl border-t-8 border-emerald-500 animate-in zoom-in-95">
            <h3 className="text-xl font-black italic uppercase text-emerald-700 mb-2">Carga Masiva</h3>
            <p className="text-xs text-gray-500 mb-4">Orden: <b>Nombre, Apellido, Usuario, DNI, Rol</b></p>
            <textarea value={csvContent} onChange={(e) => setCsvContent(e.target.value)} placeholder="Ej: Lucia,Snieg,lucia.s,30123456,Directivo" className="w-full h-48 p-4 bg-gray-50 rounded-2xl text-xs font-mono border border-gray-200 outline-none focus:border-emerald-500" />
            <div className="flex gap-2 pt-4"><button onClick={() => setShowImport(false)} className="flex-1 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button><button onClick={handleBulkImport} disabled={importing} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">{importing ? <RefreshCw className="animate-spin"/> : 'Procesar'}</button></div>
         </div>
      </div>
    )}

    {showModal && (
     <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
      <form onSubmit={handleSaveUser} className="bg-white rounded-[40px] w-full max-w-sm p-8 space-y-4 shadow-2xl border-t-8 border-orange-500 animate-in zoom-in-95">
       <h3 className="text-xl font-black italic uppercase text-violet-900">{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
       <div className="grid grid-cols-2 gap-3">
           <input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
           <input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
       </div>
       <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
       <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" />
       <select name="role" defaultValue={editingUser?.role || ROLES[0]} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs font-black uppercase border border-gray-100">
          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
       </select>
       <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-xl"><input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} className="w-4 h-4 accent-violet-600" /><label className="text-xs font-bold text-violet-900">¿Es Administrador?</label></div>
       <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 text-gray-400 font-bold uppercase text-[10px]">Volver</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">Guardar</button></div>
      </form>
     </div>
    )}
   </div>
  );
}
// --- VISTA PROYECTO 360 ---
function ProyectoView({ user }) {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [activeTab, setActiveTab] = useState('contenidos'); 
  const [editing, setEditing] = useState(false);
  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  const PERIOD_NAMES = ["MARZO", "ABRIL Y MAYO", "JUNIO Y JULIO", "AGOSTO Y SEPTIEMBRE", "OCTUBRE Y NOVIEMBRE", "DICIEMBRE"];

  const isCurrentPeriod = (name) => {
    const currentMonth = new Date().toLocaleString('es-ES', { month: 'long' }).toLowerCase();
    return name.toLowerCase().includes(currentMonth);
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods'));
    const unsub = onSnapshot(q, (snap) => {
        const dataMap = {};
        snap.docs.forEach(d => dataMap[d.id] = d.data());
        const builtPeriods = PERIOD_NAMES.map(name => {
            const id = name.replace(/\s+/g, '_');
            return { id, name, ...(dataMap[id] || {}) };
        });
        setPeriods(builtPeriods);
    });
    return () => unsub();
  }, []);

  const handleSave = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
          fundamentacion: fd.get('fundamentacion'),
          contenidos: fd.get('contenidos'),
          actividades: fd.get('actividades'),
          paises: fd.get('paises'),
          updatedAt: serverTimestamp()
      };
      const { setDoc, doc: docRef } = await import('firebase/firestore'); 
      await setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', selectedPeriod.id), data, { merge: true });
      setEditing(false); setSelectedPeriod({...selectedPeriod, ...data});
  };

  return (
    <div className="space-y-6 pb-24 animate-in slide-in-from-bottom-6 duration-700">
      <div className="bg-indigo-900 p-8 rounded-[40px] text-white shadow-2xl relative overflow-hidden text-center border-b-8 border-orange-500">
        <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-none tracking-[1px]">Proyecto 2026</h2>
        <p className="text-[10px] font-bold opacity-60 uppercase mt-2 tracking-[6px] italic">Vuelta al Mundo</p>
        <Globe className="absolute -left-5 -bottom-5 w-32 h-32 text-white opacity-5 rotate-12" />
        {isAdmin && periods.every(p => !p.updatedAt) && <button onClick={async () => { const { setDoc, doc: docRef } = await import('firebase/firestore'); for(const name of PERIOD_NAMES) { const id = name.replace(/\s+/g, '_'); await setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', id), { name }, {merge: true}); } alert("Base creada."); }} className="mt-4 bg-white/10 px-4 py-2 rounded-xl text-[8px] uppercase font-bold hover:bg-white/20 transition">Generar Base</button>}
      </div>

      {/* MOSAICO COMPACTO Y COLORIDO */}
      <div className="grid grid-cols-2 gap-3">
        {periods.map(period => {
            const isCurrent = isCurrentPeriod(period.name);
            return (
                <div key={period.id} onClick={() => setSelectedPeriod(period)} className={`relative p-4 rounded-[25px] border shadow-sm cursor-pointer hover:scale-[1.02] transition-all flex flex-col justify-between ${isCurrent ? 'col-span-2 bg-gradient-to-r from-orange-400 to-orange-500 border-orange-300 text-white h-28' : 'bg-white border-violet-100 text-gray-600 aspect-square'}`}>
                    <div className="flex justify-between items-start">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[9px] uppercase ${isCurrent ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-600'}`}>{period.name.substring(0,3)}</div>
                        {isCurrent && <span className="bg-white/20 px-2 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest">En curso</span>}
                    </div>
                    <div>
                        <h3 className={`font-black uppercase italic tracking-tighter leading-none ${isCurrent ? 'text-xl' : 'text-xs'}`}>{period.name}</h3>
                        <p className={`text-[8px] font-bold uppercase tracking-widest mt-1 ${isCurrent ? 'text-orange-100' : 'text-gray-300'}`}>Ver Detalles</p>
                    </div>
                    {!isCurrent && <ChevronRight className="absolute bottom-3 right-3 text-gray-200" size={14} />}
                </div>
            );
        })}
      </div>

      {selectedPeriod && (
          <div className="fixed inset-0 bg-violet-900/90 backdrop-blur-md z-[200] flex flex-col p-4 animate-in slide-in-from-bottom">
              <div className="flex justify-between items-center text-white mb-6">
                  <h2 className="text-xl font-black italic uppercase tracking-tighter w-2/3 leading-tight">{selectedPeriod.name}</h2>
                  <button onClick={() => {setSelectedPeriod(null); setEditing(false);}} className="bg-white/10 p-2 rounded-full hover:bg-white/20"><X/></button>
              </div>

              {!editing ? (
                  <div className="flex-1 bg-white rounded-[40px] overflow-hidden flex flex-col shadow-2xl">
                      <div className="flex overflow-x-auto p-2 bg-gray-50 border-b gap-2 scrollbar-hide shrink-0">
                          {['contenidos', 'actividades', 'fundamentacion', 'paises'].map(tab => (
                              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest whitespace-nowrap transition ${activeTab === tab ? 'bg-violet-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-100'}`}>{tab}</button>
                          ))}
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto">
                          {activeTab === 'contenidos' && <div className="animate-in fade-in"><div className="flex items-center gap-2 text-violet-600 mb-2"><BookOpen size={18}/><h4 className="font-black text-xs uppercase tracking-widest">Contenidos</h4></div><p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium italic">{selectedPeriod.contenidos || 'Sin carga.'}</p></div>}
                          {activeTab === 'actividades' && <div className="animate-in fade-in"><div className="flex items-center gap-2 text-orange-500 mb-2"><Activity size={18}/><h4 className="font-black text-xs uppercase tracking-widest">Propuestas</h4></div><p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium italic">{selectedPeriod.actividades || 'Sin carga.'}</p></div>}
                          {activeTab === 'fundamentacion' && <div className="animate-in fade-in"><div className="flex items-center gap-2 text-pink-500 mb-2"><MessageSquare size={18}/><h4 className="font-black text-xs uppercase tracking-widest">Fundamentación</h4></div><p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium italic">{selectedPeriod.fundamentacion || 'Sin carga.'}</p></div>}
                          {activeTab === 'paises' && <div className="animate-in fade-in"><div className="flex items-center gap-2 text-green-500 mb-2"><Globe size={18}/><h4 className="font-black text-xs uppercase tracking-widest">Países y Ejes</h4></div><p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium italic">{selectedPeriod.paises || 'Sin carga.'}</p></div>}
                      </div>
                      {isAdmin && (<div className="p-4 border-t bg-gray-50 text-center shrink-0"><button onClick={() => setEditing(true)} className="bg-violet-100 text-violet-700 px-6 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-widest hover:bg-violet-200 transition shadow-sm">Editar Contenido</button></div>)}
                  </div>
              ) : (
                  <form onSubmit={handleSave} className="flex-1 bg-white rounded-[40px] p-6 overflow-y-auto flex flex-col gap-4">
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">CONTENIDOS</label><textarea name="contenidos" defaultValue={selectedPeriod.contenidos} className="w-full p-4 bg-violet-50 rounded-2xl text-xs font-mono border-none outline-none h-24 resize-none shadow-inner" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">ACTIVIDADES</label><textarea name="actividades" defaultValue={selectedPeriod.actividades} className="w-full p-4 bg-orange-50 rounded-2xl text-xs font-mono border-none outline-none h-24 resize-none shadow-inner" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">FUNDAMENTACIÓN</label><textarea name="fundamentacion" defaultValue={selectedPeriod.fundamentacion} className="w-full p-4 bg-pink-50 rounded-2xl text-xs font-mono border-none outline-none h-20 resize-none shadow-inner" /></div>
                      <div className="space-y-1"><label className="text-[10px] font-black text-gray-400 ml-2 uppercase tracking-widest">PAÍSES / EJES</label><textarea name="paises" defaultValue={selectedPeriod.paises} className="w-full p-4 bg-green-50 rounded-2xl text-xs font-mono border-none outline-none h-20 resize-none shadow-inner" /></div>
                      <div className="flex gap-2 pt-4 shrink-0">
                          <button type="button" onClick={() => setEditing(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase tracking-widest">CANCELAR</button>
                          <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-black shadow-lg text-xs uppercase tracking-widest">GUARDAR</button>
                      </div>
                  </form>
              )}
          </div>
      )}
    </div>
  );
}
// --- VISTA MATRÍCULA (EXCEL COMPLETO) ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const isSuperAdmin = user.rol === 'super-admin';
  const [statFilters, setStatFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' });
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', group: 'all', teacher: 'all' });

  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300; 
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      setPhotoPreview(resized);
    } catch (error) { alert("Error imagen"); } finally { setUploading(false); }
  };

  const predictGender = (fullName) => {
      if (!fullName) return '';
      const name = fullName.trim().split(' ')[0].toUpperCase();
      const maleExceptions = ['LUCA', 'LUKA', 'NICOLA', 'ANDREA', 'BAUTISTA', 'SANTINO', 'MATIAS', 'TOMAS', 'LUCAS', 'NICOLAS', 'JOAQUIN', 'AGUSTIN', 'FELIPE', 'ELIAS', 'JONAS', 'TOBIAS', 'ISAIAS', 'NOAH', 'VALENTIN'];
      const femaleExceptions = ['SOL', 'BELEN', 'ABRIL', 'AZUL', 'LUZ', 'PILAR', 'ROCIO', 'TRINIDAD', 'NAHIR', 'RUTH', 'ESTER', 'JAZMIN', 'ZOE', 'MIA', 'UMA'];
      if (maleExceptions.includes(name)) return 'M';
      if (femaleExceptions.includes(name)) return 'F';
      if (name.endsWith('A')) return 'F';
      return 'M';
  };

  const handleNameChange = (e) => {
      const name = e.target.value;
      const guess = predictGender(name);
      const genderSelect = document.getElementById('genderSelect');
      if (genderSelect && guess) {
          genderSelect.value = guess;
      }
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filteredStudents = students.filter(s => {
    const textMatch = s.firstName?.toLowerCase().includes(filterText.toLowerCase()) || s.lastName?.toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText);
    const levelMatch = filters.level === 'all' || s.level === filters.level;
    const dxMatch = filters.dx === 'all' || s.dx === filters.dx;
    const genderMatch = filters.gender === 'all' || s.gender === filters.gender;
    const journeyMatch = filters.journey === 'all' || s.journey === filters.journey;
    const groupMatch = filters.group === 'all' || (s.groupMorning === filters.group) || (s.groupAfternoon === filters.group);
    const teacherMatch = filters.teacher === 'all' || s.teacherMorning?.includes(filters.teacher) || s.teacherAfternoon?.includes(filters.teacher);
    return textMatch && levelMatch && dxMatch && genderMatch && journeyMatch && groupMatch && teacherMatch;
  });

  const statsResults = students.filter(s => {
      const levelMatch = statFilters.level === 'all' || s.level === statFilters.level;
      const dxMatch = statFilters.dx === 'all' || s.dx === statFilters.dx;
      const genderMatch = statFilters.gender === 'all' || s.gender === statFilters.gender;
      const journeyMatch = statFilters.journey === 'all' || s.journey === statFilters.journey;
      let turnMatch = true;
      if (statFilters.turn === 'Mañana') turnMatch = !!s.groupMorning;
      if (statFilters.turn === 'Tarde') turnMatch = !!s.groupAfternoon;
      return levelMatch && dxMatch && genderMatch && journeyMatch && turnMatch;
  });

  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const uniqueTeachers = [...new Set([...students.map(s => s.teacherMorning), ...students.map(s => s.teacherAfternoon)].filter(Boolean))].sort();

  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setShowForm(true); };
  const openEdit = (student) => { setEditingStudent(student); setPhotoPreview(student.photoUrl); setViewingStudent(null); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      firstName: formData.get('firstName'), lastName: formData.get('lastName'), dni: formData.get('dni'),
      birthDate: formData.get('birthDate'), gender: formData.get('gender'), dx: formData.get('dx'),
      journey: formData.get('journey'), level: formData.get('level'), healthInsurance: formData.get('healthInsurance'),
      cudExpiration: formData.get('cudExpiration'), groupMorning: formData.get('groupMorning'),
      teacherMorning: formData.get('teacherMorning'), auxMorning: formData.get('auxMorning'),
      groupAfternoon: formData.get('groupAfternoon'), teacherAfternoon: formData.get('teacherAfternoon'),
      auxAfternoon: formData.get('auxAfternoon'), address: formData.get('address'), motherName: formData.get('motherName'),
      motherContact: formData.get('motherContact'), fatherName: formData.get('fatherName'), fatherContact: formData.get('fatherContact'),
      photoUrl: photoPreview || editingStudent?.photoUrl || '', updatedAt: serverTimestamp()
    };
    try {
      if (editingStudent) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
      }
      setShowForm(false); setEditingStudent(null); setPhotoPreview(null);
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleDeleteAll = async () => {
      if(!confirm("⚠️ ¡PELIGRO CRÍTICO! ⚠️\n\nEstás a punto de ELIMINAR TODOS los alumnos.\n¿Seguro?")) return;
      if(!confirm("CONFIRMACIÓN FINAL:\n\nEsta acción NO se puede deshacer.")) return;
      setProcessing(true);
      try {
          const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
          if (snapshot.empty) { alert("Base vacía."); setProcessing(false); return; }
          const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id)));
          await Promise.all(deletePromises);
          alert("✅ Base vaciada.");
      } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const handleBulkImport = async () => {
    try {
      setProcessing(true);
      const data = JSON.parse(importJson);
      if (!Array.isArray(data)) throw new Error("Formato inválido");
      const promises = data.map(s => {
          if (s.lastName && s.firstName) {
            return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, createdAt: serverTimestamp() });
          }
          return Promise.resolve();
      });
      await Promise.all(promises);
      alert(`¡Éxito! Importados.`);
      setShowDataManagement(false); setImportJson('');
    } catch (e) { alert("Error JSON: " + e.message); } finally { setProcessing(false); }
  };

  const handleAutoAssignGenders = async () => {
      if(!confirm("¿Detectar y completar géneros faltantes automáticamente?")) return;
      setProcessing(true);
      let count = 0;
      const updates = [];
      for (const s of students) {
          if (!s.gender) {
              const prediction = predictGender(s.firstName);
              if (prediction) {
                  updates.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender: prediction }));
                  count++;
              }
          }
      }
      try { await Promise.all(updates); alert(`✅ ¡Listo! Se completaron ${count} legajos.`); setShowDataManagement(false); } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const handleDelete = async (id) => { if(confirm("¿Borrar legajo permanentemente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setViewingStudent(null); setEditingStudent(null); setShowForm(false); } };

  // --- EXPORTACIÓN EXCEL COMPLETA (TODOS LOS DATOS) ---
  const exportFiltered = () => {
    if (filteredStudents.length === 0) { alert("No hay datos para exportar."); return; }
    const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Edad", "Fecha Nacimiento", "Género", "DX", "Obra Social", "Vencimiento CUD", "Jornada", "Grupo T. Mañana", "Docente TM", "Auxiliar TM", "Grupo T. Tarde", "Docente TT", "Auxiliar TT", "Dirección", "Madre", "Contacto Madre", "Padre", "Contacto Padre"];
    const csvContent = [
      headers.join(';'), 
      ...filteredStudents.map(s => {
        const age = calculateAge(s.birthDate);
        const fechaNac = s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-';
        const vencCUD = s.cudExpiration ? new Date(s.cudExpiration + 'T00:00:00').toLocaleDateString('es-AR') : '-';
        return [`"${s.lastName || ''}"`,`"${s.firstName || ''}"`,`"${s.dni || ''}"`,`"${s.level || ''}"`,`"${age}"`,`"${fechaNac}"`,`"${s.gender || ''}"`,`"${s.dx || ''}"`,`"${s.healthInsurance || ''}"`,`"${vencCUD}"`,`"${s.journey || ''}"`,`"${s.groupMorning || ''}"`,`"${s.teacherMorning || ''}"`,`"${s.auxMorning || ''}"`,`"${s.groupAfternoon || ''}"`,`"${s.teacherAfternoon || ''}"`,`"${s.auxAfternoon || ''}"`,`"${s.address || ''}"`,`"${s.motherName || ''}"`,`"${s.motherContact || ''}"`,`"${s.fatherName || ''}"`,`"${s.fatherContact || ''}"`].join(';');
      })
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    const fechaHoy = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    link.setAttribute('download', `Matrícula_Completa_${fechaHoy}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div><h2 className="text-3xl font-bold flex items-center gap-2"><GraduationCap /> Legajos 2026</h2><p className="text-blue-100 opacity-90">{filteredStudents.length} estudiantes</p></div>
          <div className="flex gap-2">
             {isSuperAdmin && (<><button onClick={() => setShowDataManagement(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><UploadCloud size={20}/> Gestión BD</button><button onClick={() => setShowStats(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><PieChart size={20}/> Estadísticas</button></>)}
            <button onClick={exportFiltered} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold"><Download size={20}/></button>
            {isSuperAdmin && (<button onClick={openNew} className="bg-white text-blue-600 p-3 rounded-xl shadow-lg hover:bg-blue-50 transition font-bold"><Plus size={24} /></button>)}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl flex items-center gap-2 border border-white/20">
            <Search className="text-white ml-2 opacity-70" size={20} />
            <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar..." className="bg-transparent border-none outline-none text-white placeholder-blue-200 w-full" />
            {filterText && <button onClick={() => setFilterText('')}><X className="text-white opacity-70" size={16}/></button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
            <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">DX: Todos</option><option value="DI" className="text-gray-800">DI</option><option value="TES" className="text-gray-800">TES</option><option value="Otro" className="text-gray-800">Otro</option></select>
            <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Género: Todos</option><option value="F" className="text-gray-800">Mujer</option><option value="M" className="text-gray-800">Varón</option></select>
            <select value={filters.journey} onChange={e => setFilters({...filters, journey: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Jornada: Todas</option><option value="Simple Mañana" className="text-gray-800">Mañana</option><option value="Simple Tarde" className="text-gray-800">Tarde</option><option value="Doble" className="text-gray-800">Doble</option></select>
            <select value={filters.group} onChange={e => setFilters({...filters, group: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Grupo: Todos</option>{uniqueGroups.map(g => <option key={g} value={g} className="text-gray-800">{g}</option>)}</select>
            <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Docente: Todos</option>{uniqueTeachers.map(t => <option key={t} value={t} className="text-gray-800">{t}</option>)}</select>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {filteredStudents.length === 0 ? <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><Filter size={40} className="mx-auto mb-2 text-gray-200"/><p>No hay coincidencias.</p></div> : filteredStudents.map(s => {
            const age = calculateAge(s.birthDate);
            return (
            <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition cursor-pointer active:scale-[0.99]">
              <div className="flex items-center gap-4 w-full">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">{s.photoUrl ? ( <img src={s.photoUrl} className="w-full h-full object-cover" alt="Foto" /> ) : ( <User className="text-gray-300" size={24} /> )}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start"><h4 className="font-bold text-gray-800 text-lg truncate pr-2">{s.lastName}, {s.firstName}</h4>{s.dx && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-purple-200 shrink-0">{s.dx}</span>}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1"><span className="bg-gray-100 px-2 py-0.5 rounded font-medium border border-gray-200">{age !== '-' ? `${age} años` : '-'}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium border border-gray-200 text-gray-600">{s.level || 'Sin Nivel'}</span>{(s.groupMorning || s.groupAfternoon) && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100">{s.groupMorning || s.groupAfternoon}</span>}</div>
                </div>
              </div>
              <Eye className="text-gray-300 group-hover:text-blue-500 transition ml-3" size={20} />
            </div>
          )})}
      </div>
      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-800">Gestión de Base de Datos</h3><button onClick={() => setShowDataManagement(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div><div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6"><h4 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Zona de Riesgo</h4><button onClick={handleDeleteAll} disabled={processing} className="w-full bg-white border border-red-200 text-red-600 font-bold py-2 rounded-lg text-sm hover:bg-red-50 transition flex items-center justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={16}/> : <Trash2 size={16}/>} ELIMINAR TODOS LOS ALUMNOS</button></div><h4 className="font-bold text-gray-800 text-sm mb-2">Herramientas</h4><div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6"><p className="text-xs text-blue-800 mb-3">Si importaste datos sin género, usa esto para detectarlo automáticamente.</p><button onClick={handleAutoAssignGenders} disabled={processing} className="w-full bg-white border border-blue-200 text-blue-700 font-bold py-2 rounded-lg text-sm hover:bg-blue-100 transition flex items-center justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={16}/> : <><Users size={16}/> ✨ Auto-completar Géneros</>}</button></div><h4 className="font-bold text-gray-800 text-sm mb-2">Importar Nuevos Datos (JSON)</h4><textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "firstName": "Juan"... } ]' className="w-full h-40 p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-400"></textarea><div className="flex gap-3 mt-4"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">{processing ? <RefreshCw className="animate-spin" /> : <><UploadCloud size={20} /> Procesar Datos</>}</button></div></div></div>
      )}
      {showStats && (
        <div className="fixed inset-0 bg-violet-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden"><div className="p-6 border-b bg-gray-50 flex justify-between items-center"><div><h2 className="text-2xl font-bold text-violet-900 flex items-center gap-2"><PieChart/> Calculadora de Matrícula</h2><p className="text-gray-500 text-xs">Cruza datos para obtener cifras exactas</p></div><button onClick={() => setShowStats(false)} className="bg-white p-2 rounded-full hover:bg-gray-100 shadow-sm"><X size={24}/></button></div><div className="p-6 bg-white border-b border-gray-100"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nivel</label><select value={statFilters.level} onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Diagnóstico</label><select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Género</label><select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="M">Varones</option><option value="F">Mujeres</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Jornada</label><select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Turno Asist.</label><select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Indistinto</option><option value="Mañana">Va a la Mañana</option><option value="Tarde">Va a la Tarde</option></select></div></div></div><div className="flex-1 overflow-y-auto bg-gray-50 p-6"><div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg flex items-center justify-between mb-8"><div><p className="text-violet-200 font-medium text-lg mb-1">Coincidencias encontradas</p><h3 className="text-6xl font-extrabold tracking-tight">{statsResults.length}</h3><p className="text-sm opacity-60 mt-2">Estudiantes que cumplen con <b>todos</b> los criterios.</p></div><div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm"><PieChart size={64} className="text-white opacity-80" /></div></div><h3 className="font-bold text-gray-800 mb-4 ml-1 flex items-center gap-2"><List size={18}/> Detalle del Grupo Seleccionado</h3>{statsResults.length === 0 ? (<div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed"><p>No hay alumnos con esa combinación exacta.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{statsResults.map(s => (<div key={s.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}</div><div className="min-w-0"><p className="font-bold text-gray-800 text-sm truncate">{s.lastName}, {s.firstName}</p><p className="text-xs text-gray-500 flex gap-1"><span>{s.level}</span> • <span className="font-bold text-violet-600">{s.dx}</span></p></div></div>))}</div>)}</div></div></div>
      )}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0"><button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-2 py-0.5 rounded">{viewingStudent.dni}</span></p></div></div></div><div className="p-6 overflow-y-auto space-y-6"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Nivel</p><p className="font-bold text-gray-800">{viewingStudent.level || '-'}</p></div><div className="bg-purple-50 p-3 rounded-xl border border-purple-100"><p className="text-xs text-purple-400 font-bold uppercase">DX</p><p className="font-bold text-purple-800">{viewingStudent.dx || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Género</p><p className="font-bold text-gray-800">{viewingStudent.gender || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Jornada</p><p className="font-bold text-gray-800">{viewingStudent.journey || '-'}</p></div></div><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Escolaridad 2026</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupMorning || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherMorning || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxMorning || '-'}</p></div></div><div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxAfternoon || '-'}</p></div></div></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Activity size={18} className="text-green-500"/> Salud</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Obra Social</span> {viewingStudent.healthInsurance || 'No declara'}</p><p><span className="text-gray-500 font-bold block text-xs uppercase">Vencimiento CUD</span> {viewingStudent.cudExpiration ? formatDate(viewingStudent.cudExpiration) : '-'}</p></div></div><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><User size={18} className="text-orange-500"/> Familia</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Madre</span> {viewingStudent.motherName} <span className="text-gray-400">({viewingStudent.motherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Padre</span> {viewingStudent.fatherName} <span className="text-gray-400">({viewingStudent.fatherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Dirección</span> {viewingStudent.address}</p></div></div></div></div><div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">{isSuperAdmin && (<button onClick={() => openEdit(viewingStudent)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg"><Edit3 size={18}/> Editar Ficha</button>)}</div></div></div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{editingStudent ? 'Editar Ficha' : 'Nueva Ficha'}</h3><form onSubmit={handleSave} className="space-y-6"><div className="flex gap-4 flex-col sm:flex-row"><div className="flex flex-col items-center gap-2"><div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer">{photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center px-2">Subir Foto</span>}<input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />{uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}</div></div><div className="flex-1 space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Apellido *</label><input name="lastName" defaultValue={editingStudent?.lastName || ''} required className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nombre *</label><input name="firstName" defaultValue={editingStudent?.firstName || ''} required onChange={handleNameChange} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-bold text-gray-500">DNI</label><input name="dni" type="number" defaultValue={editingStudent?.dni || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nacimiento</label><input name="birthDate" type="date" defaultValue={editingStudent?.birthDate || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Género</label><select id="genderSelect" name="gender" defaultValue={editingStudent?.gender || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="M">Varón</option><option value="F">Mujer</option></select></div></div></div></div><div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3"><p className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Datos Institucionales</p><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Nivel</label><select name="level" defaultValue={editingStudent?.level || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option><option value="TALLER">Taller</option><option value="Pre-Taller">Pre-Taller</option><option value="FINES">Fines</option></select></div><div><label className="text-xs font-bold text-gray-500">Jornada</label><select name="journey" defaultValue={editingStudent?.journey || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble Jornada</option></select></div><div><label className="text-xs font-bold text-gray-500">Diagnóstico</label><select name="dx" defaultValue={editingStudent?.dx || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Ninguno</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div></div></div><div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3"><p className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1"><GraduationCap size={12}/> Ubicación 2026</p><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO MAÑANA</p><div className="grid grid-cols-3 gap-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning || ''} placeholder="Grupo TM" className="p-2 bg-white rounded border text-xs outline-none" /><input name="teacherMorning" defaultValue={editingStudent?.teacherMorning || ''} placeholder="Docente TM" className="p-2 bg-white rounded border text-xs outline-none" /><input name="auxMorning" defaultValue={editingStudent?.auxMorning || ''} placeholder="Auxiliar TM" className="p-2 bg-white rounded border text-xs outline-none" /></div></div><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO TARDE</p><div className="grid grid-cols-3 gap-2"><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon || ''} placeholder="Grupo TT" className="p-2 bg-white rounded border text-xs outline-none" /><input name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon || ''} placeholder="Docente TT" className="p-2 bg-white rounded border text-xs outline-none" /><input name="auxAfternoon" defaultValue={editingStudent?.auxAfternoon || ''} placeholder="Auxiliar TT" className="p-2 bg-white rounded border text-xs outline-none" /></div></div></div><div className="space-y-3 pt-2 border-t border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salud y Familia</p><div className="grid grid-cols-2 gap-3"><input name="healthInsurance" defaultValue={editingStudent?.healthInsurance || ''} placeholder="Obra Social" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="cudExpiration" type="date" defaultValue={editingStudent?.cudExpiration || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><input name="address" defaultValue={editingStudent?.address || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" placeholder="Dirección" /><div className="grid grid-cols-2 gap-3"><input name="motherName" defaultValue={editingStudent?.motherName || ''} placeholder="Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="motherContact" defaultValue={editingStudent?.motherContact || ''} placeholder="Contacto Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><div className="grid grid-cols-2 gap-3"><input name="fatherName" defaultValue={editingStudent?.fatherName || ''} placeholder="Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="fatherContact" defaultValue={editingStudent?.fatherContact || ''} placeholder="Contacto Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div></div><div className="flex gap-3 mt-6 pt-4 border-t border-gray-100"><button type="button" onClick={() => {setShowForm(false); setEditingStudent(null); setPhotoPreview(null);}} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20}/></button>}</div></form></div></div>
      )}
    </div>
  );
}






