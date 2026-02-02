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
// --- COMPONENTE VISUAL: INTRO ---
function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 z-[9999] flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards">
      <div className="bg-white p-6 rounded-[40px] shadow-2xl animate-bounce">
        <img 
          src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" 
          alt="Logo" 
          className="w-32 h-auto" 
        />
      </div>
      <h1 className="mt-8 text-3xl font-black text-white tracking-widest uppercase italic animate-pulse">
        Juntos a la Par
      </h1>
      <p className="text-white/60 text-xs font-bold mt-2 uppercase tracking-[4px]">Cargando Sistema...</p>
    </div>
  );
}
// --- Componente Principal Wrapper ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  // Estado para controlar el tiempo mínimo de la intro (2 segundos)
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    // Timer visual: fuerza que la intro se vea al menos 2.5 segundos
    setTimeout(() => setMinTimePassed(true), 2500);

    if (!auth) { setConfigError(true); setLoading(false); return; }

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
      if (savedProfile) {
        setCurrentUserProfile(JSON.parse(savedProfile));
      }
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


// --- APP PRINCIPAL (CORREGIDA: MENÚ DESTACADO, LIMPIEZA Y NOTIFICACIONES) ---
function MainApp({ user, onLogout, onProfileUpdate }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  
  // ESTADOS DEL BUSCADOR GLOBAL
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);

  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => { setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))); });

    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha
      data.sort((a, b) => {
          const dateA = a.createdAt ? a.createdAt.seconds : 0;
          const dateB = b.createdAt ? b.createdAt.seconds : 0;
          return dateB - dateA;
      });
      setNotifications(data.filter(n => !n.read)); // Solo las no leídas
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); };
  }, [user.id]);

  const handleGlobalSearch = async (text) => {
      setSearchQuery(text);
      if (text.length < 2) { setSearchResults([]); return; }
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const snapshot = await getDocs(q); 
      const results = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => (s.isActive === undefined || s.isActive === true) && (s.firstName.toLowerCase().includes(text.toLowerCase()) || s.lastName.toLowerCase().includes(text.toLowerCase())));
      setSearchResults(results.slice(0, 5));
  };

  const handleNotificationClick = async (notif) => {
      await deleteNotification(notif.id); // La borramos al tocarla
      if (notif.targetTab) { setActiveTab(notif.targetTab); } 
      setShowNotifPanel(false);
  };

  // CAMBIO: Función para BORRAR notificación (Tacho)
  const deleteNotification = async (id) => {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', id));
  };

  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button>

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
                    <div className="p-10 text-center flex flex-col items-center"><div className="bg-gray-50 p-3 rounded-full mb-3"><Bell size={24} className="text-gray-300" /></div><p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sin novedades</p></div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} onClick={() => handleNotificationClick(n)} className="p-4 border-b last:border-none hover:bg-gray-50 transition relative group cursor-pointer">
                        <div className="flex justify-between items-start">
                            <div className="pr-6">
                                <p className="text-[10px] font-bold text-orange-600 mb-1 uppercase tracking-tighter">{n.title}</p>
                                <p className="text-xs text-gray-700 leading-tight">{n.message}</p>
                                <p className="text-[9px] text-gray-400 mt-2">{n.createdAt ? new Date(n.createdAt.seconds * 1000).toLocaleString() : '-'}</p>
                            </div>
                            {/* BOTÓN TACHO PARA BORRAR */}
                            <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="text-gray-300 hover:text-red-500 transition p-2 bg-gray-50 rounded-full absolute right-2 top-2"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">
            {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardView user={user} tasks={tasks} events={events} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarView events={events} canEdit={canManageContent} user={user} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} canEdit={canManageContent} />}
        {activeTab === 'matricula' && <MatriculaView user={user} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} onProfileUpdate={onProfileUpdate} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'groups' && <GroupsView user={user} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={canManageContent} user={user} />}
      </main>

      {/* --- NUEVA BARRA DE NAVEGACIÓN (CON MI AULA DESTACADA) --- */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe">
        <div className="flex justify-between items-center h-full max-w-4xl mx-auto px-4 relative">
          
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />
          
          {/* BOTÓN CENTRAL FLOTANTE (MI AULA) */}
          <div className="relative -top-5">
              <button 
                onClick={() => setActiveTab('groups')}
                className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}
              >
                  <Grid size={24} />
              </button>
              <span className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span>
          </div>

          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={20} />} label="Legajos" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={20} />} label="Recursos" />
          <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={20} />} label="P.I." />
        </div>
      </nav>

      {/* MODALES DE BUSCADOR Y DETALLE (IGUAL QUE ANTES) */}
      {showSearch && (
          <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in">
              <div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div>
              <input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/>
              <div className="flex-1 overflow-y-auto space-y-2">{searchResults.map(s => (<div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div><div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div></div>))}{searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}</div>
          </div>
      )}
      {globalViewingStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95"><div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div><div className="p-6"><div className="flex gap-4 items-center mb-4"><div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div><div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div></div><button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a la sección Legajos. Buscalo ahí para editar."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button></div></div></div>)}
    </div>
  );
}
// Componente auxiliar pequeño para los botones normales

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

// --- VISTA DASHBOARD (ARREGLADA: NOTAS PERSONALES VISIBLES) ---
function DashboardView({ user, tasks, events, setActiveTab }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  const [announcements, setAnnouncements] = useState([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [birthdays, setBirthdays] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);

  const canPost = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    // 1. Avisos
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => setAnnouncements(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    // 2. Notas Personales (ARREGLADO: Quitamos el orderBy de la query para evitar error de índice)
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => {
        const rawNotes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        // Las ordenamos acá manualmente (Javascript) en vez de la base de datos
        rawNotes.sort((a, b) => {
            const dateA = a.createdAt?.seconds || 0;
            const dateB = b.createdAt?.seconds || 0;
            return dateB - dateA; // Más nuevas primero
        });
        setNotes(rawNotes);
    });

    // 3. Cumpleaños y Alumnos sin grupo
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); 
        let noGroupCounter = 0;
        const upcoming = snap.docs.map(d => {
            const data = d.data();
            if (!data.groupMorning && !data.groupAfternoon) noGroupCounter++;
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate + 'T00:00:00');
            const currentYearBirth = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (currentYearBirth < today.setHours(0,0,0,0)) currentYearBirth.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: currentYearBirth };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setBirthdays(upcoming); setUngroupedCount(noGroupCounter);
    });
    
    return () => { unsub(); unsubNotes(); unsubStudents(); };
  }, [user.id]);

  const handlePost = async (e) => { e.preventDefault(); const text = e.target.message.value; if(!text.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { message: text, author: user.fullName || user.firstName, role: user.role, createdAt: serverTimestamp() }); setShowAnnounceModal(false); };
  const deleteAnnouncement = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id)); };
  
  // Funciones de Notas
  const saveNote = async (e) => { 
      e.preventDefault(); 
      if (!newNote.trim()) return; 
      try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { 
            text: newNote, 
            userId: user.id, 
            done: false, 
            createdAt: serverTimestamp() 
        }); 
        setNewNote(''); // Limpiar input
      } catch (err) {
          console.error("Error al guardar nota:", err);
          alert("No se pudo guardar la nota.");
      }
  };
  
  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      {/* Encabezado */}
      <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div><div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div></div>
      
      {/* Alerta Administrativa */}
      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm animate-pulse"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase tracking-widest">Atención Administrativa</h4><p className="text-xs text-red-600 font-bold">Hay {ungroupedCount} estudiantes activos sin grupo asignado.</p></div></div></div>)}
      
      {/* Cumpleaños */}
      {birthdays.length > 0 && (<div className="bg-gradient-to-r from-pink-500 to-rose-500 p-5 rounded-[30px] shadow-lg text-white relative overflow-hidden"><div className="flex items-center gap-2 mb-3"><span className="bg-white/20 p-2 rounded-lg"><Crown size={16} className="text-white"/></span><h3 className="font-bold text-sm uppercase tracking-widest">Cumples de la Semana</h3></div><div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">{birthdays.map(b => (<div key={b.id} className="bg-white/10 p-2 rounded-xl flex items-center gap-3 min-w-[140px] border border-white/10"><div className="w-8 h-8 rounded-full bg-white/20 overflow-hidden shrink-0">{b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-xs">{b.firstName[0]}</div>}</div><div><p className="font-bold text-xs leading-none">{b.firstName}</p><p className="text-[10px] opacity-80">{new Date(b.nextBirthday).toLocaleDateString('es-AR', {day: 'numeric', month:'short'})}</p></div></div>))}</div></div>)}
      
      {/* Cartelera */}
      {announcements.length > 0 && (<div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative"><h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1 mb-3"><Bell size={12}/> Cartelera Oficial</h3><div className="space-y-3">{announcements.map(a => (<div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start"><div><p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase tracking-wider">- {a.author}</p></div>{canPost && (<button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>)}</div>))}</div></div>)}
      
      {/* Resumen Tareas y Eventos */}
      <div className="grid grid-cols-2 gap-3"><div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition"><h4 className="text-3xl font-black text-orange-500">{tasks.filter(t=>t.status!=='completed').length}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div><div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>{todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase tracking-widest font-bold">Es Hoy</p>{todayEvents.length > 1 && <span className="absolute top-4 right-4 text-[10px] bg-white/20 px-2 rounded-full">+{todayEvents.length - 1} más</span>}</> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}</div></div>
      
      {/* --- SECCIÓN NOTAS PERSONALES (CORREGIDA) --- */}
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner">
        <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3>
        
        <form onSubmit={saveNote} className="flex gap-2 mb-3">
            <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" />
            <button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button>
        </form>
        
        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {notes.map(n => (
                <div key={n.id} className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-gray-100 shadow-sm group">
                    <button onClick={() => toggleNote(n)} className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>
                        {n.done && <Check size={10} className="text-white"/>}
                    </button>
                    <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span>
                    <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={12}/></button>
                </div>
            ))}
            {notes.length === 0 && <p className="text-[10px] text-center text-gray-300 italic mt-2">No tenés notas personales.</p>}
        </div>
      </div>

      {/* Modales (Avisos y Tutorial) */}
      {showAnnounceModal && (<div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"><form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-lg font-black text-orange-500 mb-2 uppercase italic">Nuevo Aviso</h3><textarea name="message" className="w-full p-4 bg-orange-50 rounded-2xl outline-none text-sm h-32 resize-none border border-orange-100 focus:ring-2 ring-orange-200 text-gray-700" placeholder="Escribe aquí..." required></textarea><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition">Publicar</button></div></form></div>)}
      {showTutorial && (<div className="fixed inset-0 bg-violet-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl max-h-[80vh] overflow-y-auto relative"><button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button><div className="text-center mb-6"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Guía Rápida</h2><p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Para Docentes y Equipo</p></div><div className="space-y-6"><div className="flex gap-4 items-start"><div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Grid size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">1. Mi Aula / Grupos</h4><p className="text-xs text-gray-500 mt-1">Aquí ves a tus alumnos. Toca las pestañas "Mañana" o "Tarde" para cambiar de grupo.</p></div></div><div className="flex gap-4 items-start"><div className="bg-red-100 p-3 rounded-2xl text-red-600"><Activity size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">2. Bitácora Express (El Rayo)</h4><p className="text-xs text-gray-500 mt-1">En la tarjeta de cada alumno hay un ícono de rayo ⚡. Úsalo para registrar incidentes (golpes, crisis, salud) rápidamente con un solo toque.</p></div></div><div className="flex gap-4 items-start"><div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><CheckSquare size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">3. Pedidos a Administración</h4><p className="text-xs text-gray-500 mt-1">Usa la sección "Tareas" para pedir materiales o arreglos. Puedes asignar a un <b>Rol</b> o una <b>Persona</b>. <b>¡Es privado!</b> Solo lo ven tú y el destinatario.</p></div></div><div className="flex gap-4 items-start"><div className="bg-green-100 p-3 rounded-2xl text-green-600"><LinkIcon size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">4. Recursos</h4><p className="text-xs text-gray-500 mt-1">Encuentra documentos, planillas y enlaces útiles organizados por carpetas.</p></div></div></div><button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-8 shadow-lg uppercase text-xs tracking-widest">¡Entendido!</button></div></div>)}
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


// --- VISTA TAREAS (LIMPIA: SIN CHECKLIST VISUAL) ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  
  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [targetUserId, setTargetUserId] = useState(''); 
  
  // Mantenemos la lógica interna por seguridad, pero no la mostramos
  const [checklist, setChecklist] = useState([]); 
  const [newItem, setNewItem] = useState(""); 
  const [userSearch, setUserSearch] = useState("");
  
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState(null); 

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
  const canManage = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc')), (snap) => {
        const users = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setUsersList(users);
        if (users.length > 0) setTargetUserId(users[0].id);
    });
    return () => unsub();
  }, []);

  const filteredTasks = tasks.filter(t => {
      if (canManage) return true; 
      if (t.createdById === user.id) return true; 
      if (t.targetType === 'user') return t.targetUserId === user.id; 
      if (t.targetType === 'roles') return t.targetRoles && t.targetRoles.includes(user.role); 
      return false;
  });

  const getPriorityStyle = (p) => {
    if (p === 'alta') return 'border-l-red-500 bg-red-50';
    if (p === 'media') return 'border-l-orange-500 bg-orange-50';
    return 'border-l-green-500 bg-green-50';
  };

  const addChecklistItem = () => {
    if (newItem.trim()) { setChecklist([...checklist, { text: newItem, done: false }]); setNewItem(""); }
  };
  const removeChecklistItem = (index) => {
    const newList = [...checklist]; newList.splice(index, 1); setChecklist(newList);
  };

  const handleSaveTask = async (e) => {
    e.preventDefault(); 
    const fd = new FormData(e.target);
    
    let finalTargetId = null;
    let finalAssignedName = "Todos";
    let finalRoles = [];

    if (assignType === 'user') {
        const selectedUser = usersList.find(u => u.id === targetUserId);
        if (!selectedUser) return alert("Error: Debes seleccionar un usuario.");
        finalTargetId = selectedUser.id;
        finalAssignedName = selectedUser.fullName;
    } else {
        if (selectedRoles.length === 0) return alert("Error: Debes elegir al menos un rol.");
        finalRoles = selectedRoles;
        finalAssignedName = selectedRoles.join(", ");
    }

    const taskData = { 
        title: fd.get('title'), 
        dueDate: fd.get('dueDate'), 
        priority: fd.get('priority'), 
        targetType: assignType, 
        targetUserId: finalTargetId, 
        targetRoles: finalRoles, 
        assignedToName: finalAssignedName,
        checklist: checklist 
    };

    try {
        if (editingTask) {
             await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData);
        } else {
             const newTask = { 
                 ...taskData, 
                 createdByName: user.fullName || user.firstName, 
                 createdById: user.id, 
                 status: 'pending', 
                 createdAt: serverTimestamp(), 
                 comments: [] 
             };
             await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), newTask);
             
             if (assignType === 'user' && finalTargetId !== user.id) {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { 
                    toUserId: finalTargetId, 
                    title: "Nueva Tarea", 
                    message: `${user.firstName} te asignó: "${fd.get('title')}"`, 
                    read: false, createdAt: serverTimestamp(), targetTab: 'tasks' 
                });
             }
        }
        setShowModal(false);
    } catch (err) { console.error(err); alert("Error al guardar tarea."); }
  };

  const addComment = async (task) => {
      if (!newComment.trim()) return;
      const commentData = { text: newComment, author: user.firstName, date: new Date().toISOString() };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: arrayUnion(commentData) });
      setNewComment("");
  };

  const handleDelete = async (id) => { if(confirm("¿Seguro que deseas eliminar esta tarea?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  const changeStatus = async (task, newStatus) => { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus }); };
  
  const openNew = () => { 
      setEditingTask(null); setAssignType('user'); setSelectedRoles([]); setChecklist([]); setNewItem(""); setUserSearch(""); 
      if(usersList.length > 0) setTargetUserId(usersList[0].id); 
      setShowModal(true); 
  };

  const openEdit = (t) => { 
      setEditingTask(t); setAssignType(t.targetType || 'user'); setTargetUserId(t.targetUserId || (usersList[0]?.id)); 
      setSelectedRoles(t.targetRoles || []); setChecklist(t.checklist || []); 
      setShowModal(true); 
  };

  const filteredUsers = usersList.filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase()));

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10">
      <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas</h2>
          <button onClick={openNew} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition-all"><Plus/></button>
      </div>
      
      {filteredTasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[40px] border-2 border-dashed border-gray-100 opacity-80">
            <div className="bg-green-50 p-4 rounded-full mb-3"><CheckCircle size={40} className="text-green-400" /></div>
            <h3 className="font-black text-gray-400 text-sm uppercase tracking-widest">¡Todo listo!</h3>
            <p className="text-xs text-gray-300 font-medium">No tenés tareas pendientes</p>
        </div>
      ) : (
        <div className="grid gap-3 pb-10">
            {filteredTasks.map(t => {
            const canDelete = canManage || t.createdById === user.id || t.targetUserId === user.id;

            return (
            <div key={t.id} className={`p-5 rounded-[30px] border-l-8 shadow-sm flex flex-col gap-3 bg-white ${getPriorityStyle(t.priority)} transition-all relative`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-6">
                        <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName}</p>
                        <h3 className="font-bold text-gray-800 text-sm uppercase italic tracking-tighter leading-none">{t.title}</h3>
                        <p className="text-[9px] text-gray-400 mt-1 italic">De: {t.createdByName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[9px] font-black bg-white px-2 py-1 rounded-full text-gray-400 border uppercase tracking-tighter italic shadow-inner">{t.dueDate}</div>
                        <div className="flex gap-1">
                                {canManage && <button onClick={() => openEdit(t)} className="text-blue-300 hover:text-blue-600 p-1 bg-white rounded-full shadow-sm"><Edit3 size={14}/></button>}
                                {canDelete && <button onClick={() => handleDelete(t.id)} className="text-red-300 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14}/></button>}
                        </div>
                    </div>
                </div>
                
                {/* --- AQUÍ ESTABA EL CHECKLIST VISUAL, LO ELIMINÉ --- */}

                {openCommentsId === t.id && (
                    <div className="bg-white/50 p-3 rounded-xl border border-gray-100 mt-2 animate-in fade-in">
                        <div className="max-h-32 overflow-y-auto space-y-2 mb-2">
                            {(t.comments || []).map((c, idx) => (
                                <p key={idx} className="text-xs text-gray-600 border-b border-gray-100 pb-1">
                                    <span className="font-bold text-violet-700 uppercase text-[9px]">{c.author}:</span> {c.text}
                                </p>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribir..." className="flex-1 text-xs p-2 rounded-lg border-none outline-none bg-white shadow-inner" />
                            <button onClick={() => addComment(t)} className="bg-violet-600 text-white p-2 rounded-lg"><Send size={12}/></button>
                        </div>
                    </div>
                )}

                <div className="pt-2 border-t border-black/5 flex justify-between items-center">
                    <button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-violet-600 bg-gray-50 px-2 py-1 rounded-lg">
                        <MessageSquare size={14}/> {t.comments?.length || 0}
                    </button>
                    <select value={t.status || 'pending'} onChange={(e) => changeStatus(t, e.target.value)} className="text-xs bg-white/50 border rounded-lg p-1 font-bold text-gray-600 outline-none cursor-pointer">
                        <option value="pending">Pendiente</option>
                        <option value="in_process">En Proceso</option>
                        <option value="completed">Finalizado</option>
                    </select>
                </div>
            </div>
            );
            })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleSaveTask} className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
            <input name="title" defaultValue={editingTask?.title} placeholder="Título de la tarea" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
            
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                <button type="button" onClick={() => setAssignType('user')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'user' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Persona</button>
                <button type="button" onClick={() => setAssignType('roles')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button>
            </div>
            
            {assignType === 'user' ? (
                <div>
                   <input placeholder="🔍 Buscar nombre..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full mb-2 p-2 bg-white border-b border-gray-200 text-xs outline-none" />
                   <select value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase tracking-widest border border-gray-100">
                      {filteredUsers.length > 0 ? ( filteredUsers.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>) ) : ( <option>No hay coincidencias</option> )}
                   </select>
                </div>
            ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">
                    {ROLES_OPTIONS.map(role => (
                        <label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600 cursor-pointer">
                            <input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => { if(e.target.checked) setSelectedRoles([...selectedRoles, role]); else setSelectedRoles(selectedRoles.filter(r => r !== role)); }} className="accent-violet-600"/> {role}
                        </label>
                    ))}
                </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
                <input name="dueDate" type="date" defaultValue={editingTask?.dueDate} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs text-gray-400" />
                <select name="priority" defaultValue={editingTask?.priority} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase text-orange-600 italic">
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                </select>
            </div>
            
            <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 text-xs uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">GUARDAR</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

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

// --- VISTA PERFIL (CON FOOTER) ---
function ProfileView({ user, tasks, onLogout, isSuperAdmin }) {
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [showAudit, setShowAudit] = useState(false);

  const activarNotificaciones = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(app);
        const currentToken = await getToken(messaging, { vapidKey: 'BAEl7uzkT1NyeMtxaYgiCDlYNeyZ8WLqpB1Gc4UPx8B5EN1YVbcXPfDVsMixqIqpVGFxQGbBVogZHXZAScmCpMY' });
        if (currentToken) {
           const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
           await updateDoc(userRef, { fcmTokens: arrayUnion(currentToken), lastTokenUpdate: serverTimestamp() });
           alert("✅ ¡Listo! Notificaciones activadas.");
           triggerMobileNotification("Dispositivo Conectado", "Ahora recibirás los comunicados aquí.");
        } else { alert("Error de ID."); }
      } else { alert("Permiso denegado."); }
    } catch (e) { console.error(e); alert("Error al activar: " + e.message); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) { setUploading(true); try { const resized = await resizeImage(file); const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id); await updateDoc(userRef, { photoUrl: resized }); setFormData({ ...formData, photoUrl: resized }); alert("Foto actualizada."); } catch (error) { alert("Error al subir."); } finally { setUploading(false); } }
  };
  const resizeImage = (file) => { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 300; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.src = e.target.result; }; reader.readAsDataURL(file); }); };
  const exportData = () => { if(!tasks || tasks.length === 0) return alert("No hay datos."); const csvContent = "Titulo,Fecha Limite,Estado\n" + tasks.map(t => `${t.title},${t.dueDate},${t.status}`).join("\n"); const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Mis_Tareas.csv"; link.click(); };

  return (
    <div className="space-y-6 text-center animate-in fade-in duration-700 pb-20">
      <div className="bg-white rounded-3xl shadow-sm border border-violet-50 overflow-hidden mb-6 relative">
          <div className="bg-gradient-to-r from-violet-600 to-orange-500 h-28 relative"></div>
          <div className="px-6 pb-6 pt-12 relative">
             <div className="absolute -top-10 left-6 w-24 h-24 bg-white p-1 rounded-2xl shadow-lg group">
                <div className="w-full h-full rounded-xl overflow-hidden relative border border-violet-100 bg-violet-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition">{formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" alt="Perfil" /> : <div className="text-violet-600 font-bold text-3xl">{user.firstName?.[0]}{user.lastName?.[0]}</div>}<input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />{uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}</div>
             </div>
             <div className="flex justify-between items-start"><div className="pl-2 text-left pt-2"><h2 className="text-2xl font-bold text-gray-800 leading-tight">{user.fullName}</h2><p className="text-orange-600 font-bold text-xs uppercase tracking-wider">{user.role}</p></div></div>
          </div>
      </div>
      <h3 className="text-lg font-bold text-violet-900 mb-4 px-2 text-left">Acciones</h3>
      <div className="grid gap-3">
        {isSuperAdmin && (<><button onClick={() => setShowAdminUsers(true)} className="bg-orange-600 p-4 rounded-2xl shadow-xl flex items-center gap-4 hover:scale-[1.02] transition text-white"><div className="bg-white/20 p-3 rounded-xl"><Users size={24} /></div><div className="text-left"><h4 className="font-bold">Gestionar Personal</h4><p className="text-xs opacity-80">Administración de usuarios</p></div></button><button onClick={() => setShowAudit(true)} className="bg-indigo-900 p-4 rounded-2xl shadow-xl flex items-center gap-4 hover:scale-[1.02] transition text-white border border-indigo-700"><div className="bg-white/20 p-3 rounded-xl"><Activity size={24} /></div><div className="text-left"><h4 className="font-bold">Auditoría Global</h4><p className="text-xs opacity-80">Ver registro de todas las tareas</p></div></button></>)}
        <button onClick={exportData} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]"><div className="bg-green-100 text-green-700 p-3 rounded-xl"><Download size={24} /></div><div className="text-left"><h4 className="font-bold text-gray-800">Exportar Reporte</h4><p className="text-xs text-gray-500">Descargar mis tareas en Excel</p></div></button>
        <button onClick={activarNotificaciones} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]"><div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl"><Bell size={24} /></div><div className="text-left"><h4 className="font-bold text-gray-800">Activar Notificaciones</h4><p className="text-xs text-gray-500">Habilitar avisos en este dispositivo</p></div></button>
        <button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98]"><div className="bg-white text-red-500 p-3 rounded-xl"><LogOut size={24} /></div><div className="text-left"><h4 className="font-bold text-red-600">Cerrar Sesión</h4><p className="text-xs text-red-400">Salir de la cuenta segura</p></div></button>
      </div>
      
      <div className="mt-10 pt-6 border-t border-gray-100 opacity-50 pb-10">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[4px]">Creado por <a href="https://www.somosnomade.com.ar" target="_blank" className="hover:text-violet-600 transition">NOMADE</a></p>
      </div>

      {showAdminUsers && (<div className="fixed inset-0 bg-violet-900/95 z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto"><div className="flex justify-between items-center text-white mb-8"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Administración Personal</h2><button onClick={() => setShowAdminUsers(false)}><X size={32} /></button></div><UsersAdminView /></div>)}
      {showAudit && (<div className="fixed inset-0 bg-gray-900/95 z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto"><div className="flex justify-between items-center text-white mb-8"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Auditoría Institucional</h2><button onClick={() => setShowAudit(false)}><X size={32} /></button></div><ActivityLogView /></div>)}
    </div>
  );
}
// --- VISTA ADMINISTRACIÓN DE USUARIOS (CON BUSCADOR) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  // NUEVO: Estado para el buscador
  const [searchTerm, setSearchTerm] = useState('');

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

  // NUEVO: Lógica de filtrado
  const filteredUsers = users.filter(u => 
    u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
   <div className="flex-1 flex flex-col min-h-0 bg-white/5 rounded-3xl p-4 mt-4">
    <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
            <div><h3 className="text-white font-bold text-sm uppercase tracking-widest">{users.length} Usuarios</h3></div>
            <div className="flex gap-2">
              <button onClick={() => setShowImport(true)} className="bg-emerald-500 text-white px-3 py-2 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-1 hover:bg-emerald-600 transition"><UploadCloud size={16}/> Importar</button>
              <button onClick={openNew} className="bg-orange-500 text-white px-3 py-2 rounded-xl font-black text-xs uppercase shadow-lg flex items-center gap-1 hover:bg-orange-600 transition"><Plus size={16}/> Manual</button>
            </div>
        </div>
        
        {/* --- NUEVO: INPUT BUSCADOR --- */}
        <div className="bg-black/20 p-2 rounded-xl flex items-center gap-2 border border-white/10">
            <Search className="text-white/50 ml-2" size={18} />
            <input 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre, usuario o rol..."
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-white/30"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')}><X size={16} className="text-white/50 hover:text-white mr-2" /></button>}
        </div>
    </div>

    <div className="grid gap-3 pb-20 overflow-y-auto max-h-[60vh]">
     {filteredUsers.length > 0 ? filteredUsers.map(u => (
      <div key={u.id} className="bg-white p-4 rounded-2xl border border-white/50 shadow-sm flex items-center justify-between group">
       <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black text-xs uppercase border border-violet-200">{u.firstName?.[0]}{u.lastName?.[0]}</div>
        <div>
            <p className="font-bold text-sm text-gray-800 uppercase italic tracking-tighter">{u.fullName}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{u.role} | {u.username}</p>
            <p className="text-[9px] text-green-600 font-bold mt-1 flex items-center gap-1"><Activity size={8}/> Activo: {formatLastLogin(u.lastLogin)}</p>
        </div>
       </div>
       <div className="flex gap-2">
           <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-500 rounded-full hover:bg-blue-500 hover:text-white transition"><Edit3 size={16}/></button>
           {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-500 rounded-full hover:bg-red-500 hover:text-white transition"><Trash2 size={16}/></button>}
       </div>
      </div>
     )) : (
        <p className="text-center text-white/50 italic text-sm py-4">No se encontraron usuarios.</p>
     )}
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
       <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs font-black uppercase border border-gray-100">
          {['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Inclusión', 'Profes Especiales', 'Administración'].map(r => <option key={r} value={r}>{r}</option>)}
       </select>
       <div className="flex items-center gap-2 p-2 bg-violet-50 rounded-xl"><input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} className="w-4 h-4 accent-violet-600" /><label className="text-xs font-bold text-violet-900">¿Es Administrador?</label></div>
       <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 text-gray-400 font-bold uppercase text-[10px]">Volver</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">Guardar</button></div>
      </form>
     </div>
    )}
   </div>
  );
}
// --- VISTA PROYECTO INSTITUCIONAL (LISTA COMPACTA) ---
function ProyectoView({ user }) {
  const [periods, setPeriods] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [editing, setEditing] = useState(false);
  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';
  
  const PERIOD_NAMES = ["MARZO", "ABRIL Y MAYO", "JUNIO Y JULIO", "AGOSTO Y SEPTIEMBRE", "OCTUBRE Y NOVIEMBRE", "DICIEMBRE"];

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
      await setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', expandedPeriod.id), data, { merge: true });
      setEditing(false); setExpandedPeriod({...expandedPeriod, ...data});
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700">
      <div className="bg-white p-6 rounded-[30px] border-l-8 border-violet-600 shadow-lg">
          <h2 className="text-2xl font-black text-gray-800 uppercase italic tracking-tighter">Proyecto 2026</h2>
          <p className="text-violet-500 font-bold text-xs uppercase tracking-[3px] mt-1">La Vuelta al Mundo</p>
      </div>

      <div className="space-y-3">
          {periods.map(period => (
              <div key={period.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div 
                    onClick={() => setExpandedPeriod(expandedPeriod?.id === period.id ? null : period)}
                    className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${expandedPeriod?.id === period.id ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                  >
                      <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-[10px] ${expandedPeriod?.id === period.id ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-500'}`}>{period.name.substring(0,3)}</div>
                          <div>
                              <h3 className="font-bold text-gray-800 text-xs uppercase">{period.name}</h3>
                              <p className="text-[10px] text-gray-400">{period.paises || 'Sin asignar'}</p>
                          </div>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${expandedPeriod?.id === period.id ? 'rotate-90 text-violet-600' : ''}`} />
                  </div>

                  {expandedPeriod?.id === period.id && (
                      <div className="p-4 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
                          {!editing ? (
                              <div className="space-y-4">
                                  <div><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">País / Eje</h4><p className="text-sm font-bold text-violet-700">{period.paises || '-'}</p></div>
                                  <div><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Contenidos</h4><p className="text-xs text-gray-600 whitespace-pre-wrap">{period.contenidos || '-'}</p></div>
                                  <div><h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Actividades</h4><p className="text-xs text-gray-600 whitespace-pre-wrap">{period.actividades || '-'}</p></div>
                                  {isAdmin && <button onClick={() => setEditing(true)} className="w-full py-2 bg-white border border-violet-200 text-violet-600 font-bold text-xs rounded-xl mt-2 hover:bg-violet-50">Editar</button>}
                              </div>
                          ) : (
                              <form onSubmit={handleSave} className="space-y-3">
                                  <input name="paises" defaultValue={period.paises} placeholder="País / Eje" className="w-full p-3 rounded-xl border border-gray-200 text-sm font-bold" />
                                  <textarea name="contenidos" defaultValue={period.contenidos} placeholder="Contenidos..." className="w-full p-3 rounded-xl border border-gray-200 text-xs h-24" />
                                  <textarea name="actividades" defaultValue={period.actividades} placeholder="Actividades..." className="w-full p-3 rounded-xl border border-gray-200 text-xs h-24" />
                                  <div className="flex gap-2">
                                      <button type="button" onClick={() => setEditing(false)} className="flex-1 py-2 text-gray-400 font-bold text-xs">Cancelar</button>
                                      <button type="submit" className="flex-1 py-2 bg-violet-600 text-white font-bold text-xs rounded-xl shadow-lg">Guardar</button>
                                  </div>
                              </form>
                          )}
                      </div>
                  )}
              </div>
          ))}
      </div>
    </div>
  );
}
// --- VISTA MATRÍCULA (CON RADAR VISIBLE EN CAJA AMARILLA) ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info');
  
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [showArchived, setShowArchived] = useState(false);

  // --- ESTADOS DE HERRAMIENTAS ---
  const [showDupes, setShowDupes] = useState(false);
  const [potentialDupes, setPotentialDupes] = useState([]);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);

  // Permisos ampliados para que Directivos también vean la nube
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo';
  
  const [statFilters, setStatFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' });
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', group: 'all', teacher: 'all' });

  useEffect(() => {
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsubStudents = onSnapshot(qStudents, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubUsers = onSnapshot(qUsers, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => { unsubStudents(); unsubUsers(); };
  }, []);

  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico'); 

  // Utils
  const calculateAge = (dateString) => { if (!dateString) return '-'; const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; return age; };
  const getAlertStatus = (incidents) => { if (!incidents || incidents.length === 0) return { status: 'ok', count: 0 }; const fifteenDaysAgo = new Date(); fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15); const recentHighRisk = incidents.filter(inc => (inc.severity === 'high' || inc.severity === 'medium') && new Date(inc.date) >= fifteenDaysAgo); return { status: recentHighRisk.length >= 5 ? 'danger' : recentHighRisk.length >= 3 ? 'warning' : 'ok', count: recentHighRisk.length }; };
  const downloadHistory = (student) => { if (!student.incidents || student.incidents.length === 0) return alert("No hay historial."); const headers = ["Fecha", "Hora", "Tipo", "Severidad", "Reportado Por"]; const rows = student.incidents.map(inc => [new Date(inc.date).toLocaleDateString('es-AR'), new Date(inc.date).toLocaleTimeString('es-AR'), inc.type, inc.severity === 'high' ? 'ALTA' : inc.severity === 'medium' ? 'MEDIA' : 'BAJA', inc.author]); const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Bitacora_${student.lastName}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const deleteIncident = async (studentId, incident) => { if(!confirm("¿Borrar esta entrada?")) return; try { const { updateDoc, doc, arrayRemove } = await import('firebase/firestore'); const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId); await updateDoc(studentRef, { incidents: arrayRemove(incident) }); } catch (e) { alert("Error al borrar: " + e.message); } };
  const resizeImage = (file) => { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = (e) => { const img = new Image(); img.onload = () => { const canvas = document.createElement('canvas'); const MAX_WIDTH = 300; const scaleSize = MAX_WIDTH / img.width; canvas.width = MAX_WIDTH; canvas.height = img.height * scaleSize; const ctx = canvas.getContext('2d'); ctx.drawImage(img, 0, 0, canvas.width, canvas.height); resolve(canvas.toDataURL('image/jpeg', 0.7)); }; img.src = e.target.result; }; reader.readAsDataURL(file); }); };
  const handlePhotoChange = async (e) => { const file = e.target.files[0]; if (!file) return; setUploading(true); try { const resized = await resizeImage(file); setPhotoPreview(resized); } catch (error) { alert("Error imagen"); } finally { setUploading(false); } };
  const predictGender = (fullName) => { if (!fullName) return ''; const name = fullName.trim().split(' ')[0].toUpperCase(); if (['LUCA', 'LUKA', 'NICOLA'].includes(name)) return 'M'; if (name.endsWith('A')) return 'F'; return 'M'; };
  const handleNameChange = (e) => { const name = e.target.value; const guess = predictGender(name); const genderSelect = document.getElementById('genderSelect'); if (genderSelect && guess) { genderSelect.value = guess; } };
  
  // Filtros
  const filteredStudents = students.filter(s => { const isStudentActive = s.isActive === undefined || s.isActive === true; if (showArchived && isStudentActive) return false; if (!showArchived && !isStudentActive) return false; const textMatch = s.firstName?.toLowerCase().includes(filterText.toLowerCase()) || s.lastName?.toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText); const levelMatch = filters.level === 'all' || s.level === filters.level; const dxMatch = filters.dx === 'all' || s.dx === filters.dx; const genderMatch = filters.gender === 'all' || s.gender === filters.gender; const journeyMatch = filters.journey === 'all' || s.journey === filters.journey; const groupMatch = filters.group === 'all' || (s.groupMorning === filters.group) || (s.groupAfternoon === filters.group); const teacherMatch = filters.teacher === 'all' || s.teacherMorning === filters.teacher || s.teacherAfternoon === filters.teacher; return textMatch && levelMatch && dxMatch && genderMatch && journeyMatch && groupMatch && teacherMatch; });
  const statsResults = students.filter(s => { const isStudentActive = s.isActive === undefined || s.isActive === true; if (!isStudentActive) return false; const levelMatch = statFilters.level === 'all' || s.level === statFilters.level; const dxMatch = statFilters.dx === 'all' || s.dx === statFilters.dx; const genderMatch = statFilters.gender === 'all' || s.gender === statFilters.gender; const journeyMatch = statFilters.journey === 'all' || s.journey === statFilters.journey; let turnMatch = true; if (statFilters.turn === 'Mañana') turnMatch = !!s.groupMorning; if (statFilters.turn === 'Tarde') turnMatch = !!s.groupAfternoon; return levelMatch && dxMatch && genderMatch && journeyMatch && turnMatch; });
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  
  // Handlers CRUD
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setShowForm(true); };
  const openEdit = (student) => { setEditingStudent(student); setPhotoPreview(student.photoUrl); setViewingStudent(null); setShowForm(true); };
  const handleSave = async (e) => { e.preventDefault(); const formData = new FormData(e.target); const data = { firstName: formData.get('firstName'), lastName: formData.get('lastName'), dni: formData.get('dni'), birthDate: formData.get('birthDate'), gender: formData.get('gender'), dx: formData.get('dx'), journey: formData.get('journey'), level: formData.get('level'), healthInsurance: formData.get('healthInsurance'), cudExpiration: formData.get('cudExpiration'), groupMorning: formData.get('groupMorning'), teacherMorning: formData.get('teacherMorning'), auxMorning: formData.get('auxMorning'), sup1Morning: formData.get('sup1Morning'), sup2Morning: formData.get('sup2Morning'), groupAfternoon: formData.get('groupAfternoon'), teacherAfternoon: formData.get('teacherAfternoon'), auxAfternoon: formData.get('auxAfternoon'), sup1Afternoon: formData.get('sup1Afternoon'), sup2Afternoon: formData.get('sup2Afternoon'), classroom: formData.get('classroom'), address: formData.get('address'), motherName: formData.get('motherName'), motherContact: formData.get('motherContact'), fatherName: formData.get('fatherName'), fatherContact: formData.get('fatherContact'), photoUrl: photoPreview || editingStudent?.photoUrl || '', isActive: formData.get('isActive') === 'true', updatedAt: serverTimestamp() }; try { if (editingStudent) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, isActive: true, createdAt: serverTimestamp() }); } setShowForm(false); setEditingStudent(null); setPhotoPreview(null); } catch (err) { alert("Error: " + err.message); } };
  const handleResetCycle = async () => { if(!confirm("⚠️ ¿REINICIAR CICLO?")) return; setProcessing(true); try { const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const updates = snapshot.docs.map(docSnap => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id), { groupMorning: '', teacherMorning: '', auxMorning: '', sup1Morning: '', sup2Morning: '', groupAfternoon: '', teacherAfternoon: '', auxAfternoon: '', sup1Afternoon: '', sup2Afternoon: '', classroom: '' })); await Promise.all(updates); alert("✅ Ciclo reiniciado."); } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); } };
  const handleDeleteAll = async () => { if(!confirm("⚠️ PELIGRO: ¿BORRAR TODOS?")) return; setProcessing(true); try { const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id))); await Promise.all(deletePromises); alert("✅ Base vaciada."); } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); } };
  const handleAutoAssignGenders = async () => { if(!confirm("¿Auto-completar?")) return; setProcessing(true); let count = 0; const updates = []; for (const s of students) { if (!s.gender) { const prediction = predictGender(s.firstName); if (prediction) { updates.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender: prediction })); count++; } } } await Promise.all(updates); alert(`Listo: ${count}`); setProcessing(false); };
  const handleDelete = async (id) => { if(confirm("¿Borrar?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setViewingStudent(null); setEditingStudent(null); setShowForm(false); } };
  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  // --- IMPORTADOR V8 (Anti-Error) ---
  const handleBulkImport = async () => { try { if(!importJson.trim()) return alert("Pegá el JSON primero."); setProcessing(true); const firstBracket = importJson.indexOf('['); const lastBracket = importJson.lastIndexOf(']'); if (firstBracket === -1 || lastBracket === -1) throw new Error("Faltan los corchetes [ ]"); const cleanJson = importJson.substring(firstBracket, lastBracket + 1); const data = JSON.parse(cleanJson); let updated = 0; let created = 0; const getFirstWord = (txt) => { if (!txt) return ""; return txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().split(' ')[0].replace(/[^a-z0-9]/g, ''); }; const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const dbStudents = snap.docs.map(d => ({ id: d.id, ...d.data(), _keyFirst: getFirstWord(d.data().firstName), _keyLast: getFirstWord(d.data().lastName) })); for (const s of data) { const inputFirst = getFirstWord(s.firstName); const inputLast = getFirstWord(s.lastName); const match = dbStudents.find(dbS => dbS._keyFirst === inputFirst && dbS._keyLast === inputLast); if (match) { let finalJourney = s.journey; const hadMorning = match.groupMorning || (match.journey && match.journey.includes("Mañana")); const hadAfternoon = match.groupAfternoon || (match.journey && match.journey.includes("Tarde")); const isBringingMorning = s.journey && s.journey.includes("Mañana"); const isBringingAfternoon = s.journey && s.journey.includes("Tarde"); if ((hadMorning && isBringingAfternoon) || (hadAfternoon && isBringingMorning)) { finalJourney = "Doble"; } const updateData = { ...s, journey: finalJourney, updatedAt: serverTimestamp() }; if (!s.groupMorning && match.groupMorning) { updateData.groupMorning = match.groupMorning || ""; updateData.teacherMorning = match.teacherMorning || ""; updateData.auxMorning = match.auxMorning || ""; updateData.sup1Morning = match.sup1Morning || ""; updateData.sup2Morning = match.sup2Morning || ""; } if (!s.groupAfternoon && match.groupAfternoon) { updateData.groupAfternoon = match.groupAfternoon || ""; updateData.teacherAfternoon = match.teacherAfternoon || ""; updateData.auxAfternoon = match.auxAfternoon || ""; updateData.sup1Afternoon = match.sup1Afternoon || ""; updateData.sup2Afternoon = match.sup2Afternoon || ""; } await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', match.id), updateData); updated++; } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, isActive: true, createdAt: serverTimestamp(), incidents: [] }); created++; } } alert(`🏁 LISTO:\n\n✨ Nuevos: ${created}\n🔄 Fusionados: ${updated}`); setShowDataManagement(false); setImportJson(''); } catch (e) { console.error(e); alert("Error: " + e.message); } finally { setProcessing(false); } };

  // --- DUPLICADOS (FUZZY MATCH) ---
  const findDuplicates = () => {
      setProcessing(true);
      const threshold = 2; 
      const levenshtein = (a, b) => { const matrix = []; for(let i=0; i<=b.length; i++) matrix[i] = [i]; for(let j=0; j<=a.length; j++) matrix[0][j] = j; for(let i=1; i<=b.length; i++){ for(let j=1; j<=a.length; j++){ if(b.charAt(i-1) == a.charAt(j-1)){ matrix[i][j] = matrix[i-1][j-1]; } else { matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1)); } } } return matrix[b.length][a.length]; };
      const found = [];
      const checkedIds = new Set();
      for (let i = 0; i < students.length; i++) {
          for (let j = i + 1; j < students.length; j++) {
              const s1 = students[i]; const s2 = students[j];
              if(checkedIds.has(s1.id) || checkedIds.has(s2.id)) continue;
              const name1 = (s1.firstName + s1.lastName).toLowerCase().replace(/\s/g, '');
              const name2 = (s2.firstName + s2.lastName).toLowerCase().replace(/\s/g, '');
              const dist = levenshtein(name1, name2);
              if (dist <= threshold && dist > 0) found.push({ original: s1, duplicate: s2, distance: dist });
          }
      }
      setPotentialDupes(found); setProcessing(false); setShowDataManagement(false); setShowDupes(true);
  };

  const mergeStudents = async (keep, drop) => {
      if(!confirm(`¿Fusionar?`)) return;
      try {
          const mergedData = { ...keep, journey: "Doble", updatedAt: serverTimestamp() };
          if(!mergedData.groupMorning && drop.groupMorning) { mergedData.groupMorning = drop.groupMorning; mergedData.teacherMorning = drop.teacherMorning; mergedData.auxMorning = drop.auxMorning; mergedData.sup1Morning = drop.sup1Morning; mergedData.sup2Morning = drop.sup2Morning; }
          if(!mergedData.groupAfternoon && drop.groupAfternoon) { mergedData.groupAfternoon = drop.groupAfternoon; mergedData.teacherAfternoon = drop.teacherAfternoon; mergedData.auxAfternoon = drop.auxAfternoon; mergedData.sup1Afternoon = drop.sup1Afternoon; mergedData.sup2Afternoon = drop.sup2Afternoon; }
          if(!mergedData.dni && drop.dni) mergedData.dni = drop.dni;
          if(!mergedData.birthDate && drop.birthDate) mergedData.birthDate = drop.birthDate;
          if(!mergedData.dx && drop.dx) mergedData.dx = drop.dx;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', keep.id), mergedData);
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', drop.id));
          setPotentialDupes(prev => prev.filter(p => p.original.id !== keep.id && p.duplicate.id !== drop.id));
          alert("✅ Fusionado.");
      } catch (e) { alert("Error al fusionar."); }
  };

  // --- RADAR SIN ASIGNAR ---
  const checkUnassigned = () => {
      const found = students.filter(s => (s.isActive === undefined || s.isActive === true) && !s.groupMorning && !s.groupAfternoon);
      setUnassignedList(found);
      setShowDataManagement(false);
      setShowUnassigned(true);
  };

  const markAsInactive = async (student) => {
      if(!confirm(`¿Dar de baja a ${student.firstName} ${student.lastName}?`)) return;
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id), { isActive: false });
          setUnassignedList(prev => prev.filter(s => s.id !== student.id));
      } catch(e) { alert("Error."); }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived ? 'bg-gray-600' : 'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div><h2 className="text-3xl font-bold flex items-center gap-2"><GraduationCap /> {showArchived ? 'Archivo de Bajas' : 'Legajos 2026'}</h2><p className="text-white/80 opacity-90">{filteredStudents.length} estudiantes {showArchived ? 'archivados' : 'activos'}</p></div>
          <div className="flex gap-2">
             <button onClick={() => setShowArchived(!showArchived)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase shadow-lg transition flex items-center gap-2 border ${showArchived ? 'bg-blue-500 border-blue-400 text-white' : 'bg-gray-800/40 border-white/20 hover:bg-gray-800/60'}`}>{showArchived ? <><CheckCircle size={16}/> Ver Activos</> : <><LogOut size={16}/> Ver Bajas</>}</button>
             {isSuperAdmin && (<><button onClick={() => setShowDataManagement(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><UploadCloud size={20}/></button><button onClick={() => setShowStats(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><PieChart size={20}/></button></>)}
             <button onClick={exportFiltered} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold"><Download size={20}/></button>
             {!showArchived && <button onClick={openNew} className="bg-white text-blue-600 p-3 rounded-xl shadow-lg hover:bg-blue-50 transition font-bold"><Plus size={24} /></button>}
          </div>
        </div>
        {!showArchived && (
            <div className="mt-6 space-y-3">
            <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl flex items-center gap-2 border border-white/20"><Search className="text-white ml-2 opacity-70" size={20} /><input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar alumno activo..." className="bg-transparent border-none outline-none text-white placeholder-blue-200 w-full" />{filterText && <button onClick={() => setFilterText('')}><X className="text-white opacity-70" size={16}/></button>}</div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                <select value={filters.group} onChange={e => setFilters({...filters, group: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Grupo: Todos</option>{uniqueGroups.map(g => <option key={g} value={g} className="text-gray-800">{g}</option>)}</select>
            </div>
            </div>
        )}
      </div>

      <div className="space-y-3">
        {filteredStudents.length === 0 ? <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><Filter size={40} className="mx-auto mb-2 text-gray-200"/><p>No hay coincidencias.</p></div> : filteredStudents.map(s => {
            const age = calculateAge(s.birthDate);
            const alertInfo = getAlertStatus(s.incidents);
            return (
            <div key={s.id} onClick={() => { setViewingStudent(s); setActiveModalTab('info'); }} className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center justify-between group hover:shadow-md transition cursor-pointer active:scale-[0.99] ${!s.isActive ? 'border-l-4 border-l-red-400 opacity-70' : alertInfo.status === 'danger' ? 'border-l-4 border-l-red-500' : 'border-gray-100'}`}>
              <div className="flex items-center gap-4 w-full">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">
                    {s.photoUrl ? ( <img src={s.photoUrl} className="w-full h-full object-cover" alt="Foto" /> ) : ( <User className="text-gray-300" size={24} /> )}
                    {alertInfo.status !== 'ok' && <div className={`absolute top-0 right-0 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold text-white ${alertInfo.status === 'danger' ? 'bg-red-500 animate-pulse' : 'bg-orange-400'}`}>!</div>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start">
                      <h4 className="font-bold text-gray-800 text-lg truncate pr-2">{s.lastName}, {s.firstName}</h4>
                      {s.dx && !showArchived && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-purple-200 shrink-0">{s.dx}</span>}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium border border-gray-200">{age !== '-' ? `${age} años` : '-'}</span>
                      {s.classroom && <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded font-bold border border-orange-100">Aula {s.classroom}</span>}
                      {(s.groupMorning || s.groupAfternoon) && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100">{s.groupMorning || s.groupAfternoon}</span>}
                  </div>
                </div>
              </div>
              <Eye className="text-gray-300 group-hover:text-blue-500 transition ml-3" size={20} />
            </div>
          )})}
      </div>

      {/* --- MODAL DE GESTIÓN (LA NUBE) --- */}
      {showDataManagement && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
                  
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold text-gray-800">Gestión de Base de Datos</h3>
                      <button onClick={() => setShowDataManagement(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
                  </div>

                  {/* 1. MANTENIMIENTO Y LIMPIEZA (AQUÍ ESTÁ EL RADAR) */}
                  <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-200 mb-6">
                      <h4 className="font-bold text-yellow-800 text-sm mb-3 flex items-center gap-2">
                          <RefreshCw size={16}/> Mantenimiento y Limpieza
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={findDuplicates} disabled={processing} className="bg-white border border-yellow-200 text-yellow-700 font-bold py-2 rounded-lg text-xs hover:bg-yellow-100 transition shadow-sm">
                              Buscar Duplicados
                          </button>
                          <button onClick={checkUnassigned} className="bg-red-500 text-white font-bold py-2 rounded-lg text-xs hover:bg-red-600 transition shadow-sm flex items-center justify-center gap-1">
                              <AlertTriangle size={12}/> Buscar Sin Asignar
                          </button>
                      </div>
                  </div>

                  {/* 2. ZONA DE RIESGO */}
                  <div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mb-6 opacity-70 hover:opacity-100 transition">
                      <h4 className="font-bold text-gray-600 text-sm mb-2">Zona Peligrosa</h4>
                      <div className="flex gap-2">
                          <button onClick={handleResetCycle} disabled={processing} className="flex-1 bg-white border border-gray-300 text-gray-500 font-bold py-2 rounded-lg text-xs hover:bg-gray-200">Reiniciar Ciclo</button>
                          <button onClick={handleDeleteAll} disabled={processing} className="flex-1 bg-white border border-gray-300 text-red-500 font-bold py-2 rounded-lg text-xs hover:bg-red-50">Borrar TODO</button>
                      </div>
                  </div>

                  {/* 3. IMPORTADOR JSON */}
                  <h4 className="font-bold text-gray-800 text-sm mb-2">Importar Datos (JSON)</h4>
                  <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='Pegá aquí el código...' className="w-full h-32 p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-400"></textarea>
                  
                  <div className="flex gap-3 mt-4">
                      <button onClick={handleAutoAssignGenders} disabled={processing} className="flex-1 py-3 text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 rounded-xl text-xs">Auto-Género</button>
                      <button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-[2] py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">{processing ? <RefreshCw className="animate-spin" /> : <><UploadCloud size={20} /> Procesar Datos</>}</button>
                  </div>

              </div>
          </div>
      )}

      {/* --- MODAL DE DUPLICADOS --- */}
      {showDupes && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] w-full max-w-4xl p-8 shadow-2xl animate-in zoom-in-95 h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black text-violet-900 uppercase italic">Posibles Duplicados</h3><p className="text-sm text-gray-500">Se encontraron {potentialDupes.length} parejas con nombre similar.</p></div><button onClick={() => setShowDupes(false)}><X size={32}/></button></div>
                  <div className="flex-1 overflow-y-auto space-y-4">{potentialDupes.length === 0 ? (<div className="text-center py-20 text-gray-400"><CheckCircle size={48} className="mx-auto mb-2 text-green-200"/><p>¡Todo limpio!</p></div>) : (potentialDupes.map((dupe, idx) => (<div key={idx} className="bg-gray-50 p-4 rounded-3xl border border-gray-200 flex flex-col md:flex-row items-center justify-between gap-4"><div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-l-4 border-l-blue-500 w-full"><h4 className="font-black text-gray-800">{dupe.original.lastName}, {dupe.original.firstName}</h4><p className="text-xs text-gray-500 mt-1">{dupe.original.groupMorning ? `☀️ ${dupe.original.groupMorning}` : ''} {dupe.original.groupAfternoon ? ` 🌙 ${dupe.original.groupAfternoon}` : ''}</p><button onClick={() => mergeStudents(dupe.original, dupe.duplicate)} className="mt-3 w-full bg-blue-100 text-blue-700 py-2 rounded-lg text-xs font-bold hover:bg-blue-200 transition">Conservar ESTE y fusionar</button></div><div className="text-gray-300 font-bold"><RefreshCw /></div><div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-l-4 border-l-orange-500 w-full"><h4 className="font-black text-gray-800">{dupe.duplicate.lastName}, {dupe.duplicate.firstName}</h4><p className="text-xs text-gray-500 mt-1">{dupe.duplicate.groupMorning ? `☀️ ${dupe.duplicate.groupMorning}` : ''} {dupe.duplicate.groupAfternoon ? ` 🌙 ${dupe.duplicate.groupAfternoon}` : ''}</p><button onClick={() => mergeStudents(dupe.duplicate, dupe.original)} className="mt-3 w-full bg-orange-100 text-orange-700 py-2 rounded-lg text-xs font-bold hover:bg-orange-200 transition">Conservar ESTE y fusionar</button></div></div>)))}</div>
              </div>
          </div>
      )}

      {/* --- MODAL: SIN ASIGNAR --- */}
      {showUnassigned && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl animate-in zoom-in-95 h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black text-red-600 uppercase italic">Alumnos Sin Grupo</h3><p className="text-sm text-gray-500">Detectados {unassignedList.length} activos sin asignación.</p></div><button onClick={() => setShowUnassigned(false)}><X size={32}/></button></div>
                  <div className="flex-1 overflow-y-auto space-y-3">{unassignedList.length === 0 ? (<div className="text-center py-20 text-gray-400"><CheckCircle size={48} className="mx-auto mb-2 text-green-200"/><p>¡Excelente! Todos los alumnos tienen grupo.</p></div>) : (unassignedList.map((s) => (<div key={s.id} className="bg-red-50 p-4 rounded-2xl border border-red-100 flex items-center justify-between"><div><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-red-400">Sin turno asignado</p></div><div className="flex gap-2"><button onClick={() => { setShowUnassigned(false); openEdit(s); }} className="bg-white text-gray-600 px-3 py-2 rounded-lg text-xs font-bold shadow-sm">Editar</button><button onClick={() => markAsInactive(s)} className="bg-red-600 text-white px-3 py-2 rounded-lg text-xs font-bold shadow-sm hover:bg-red-700">Dar de Baja</button></div></div>)))}</div>
              </div>
          </div>
      )}

      {/* MODALES EDITAR Y VER (Mismos de siempre) */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className={`bg-gradient-to-r p-6 text-white relative shrink-0 ${!viewingStudent.isActive ? 'from-gray-500 to-gray-700' : 'from-blue-600 to-cyan-500'}`}>
                    <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button>
                    <div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-2 py-0.5 rounded">{viewingStudent.dni}</span></p></div></div>
                    <div className="flex gap-2 mt-6"><button onClick={() => setActiveModalTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab === 'info' ? 'bg-white text-blue-600 shadow-md' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}>Ficha Técnica</button><button onClick={() => setActiveModalTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab === 'history' ? 'bg-white text-blue-600 shadow-md' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}>Bitácora</button></div>
                </div>
                <div className="p-6 overflow-y-auto space-y-6">
                    {activeModalTab === 'info' ? (
                        <>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Nivel</p><p className="font-bold text-gray-800">{viewingStudent.level || '-'}</p></div><div className="bg-purple-50 p-3 rounded-xl border border-purple-100"><p className="text-xs text-purple-400 font-bold uppercase">DX</p><p className="font-bold text-purple-800">{viewingStudent.dx || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Género</p><p className="font-bold text-gray-800">{viewingStudent.gender || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Jornada</p><p className="font-bold text-gray-800">{viewingStudent.journey || '-'}</p></div></div>
                            <div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Escolaridad 2026</h3>{viewingStudent.classroom && <div className="bg-orange-50 p-3 rounded-xl border border-orange-100 text-center font-bold text-orange-700">AULA / SALÓN: {viewingStudent.classroom}</div>}<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupMorning || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherMorning || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxMorning || '-'}</p>{(viewingStudent.sup1Morning || viewingStudent.sup2Morning) && <p className="text-xs text-violet-600 font-bold mt-2 pt-2 border-t border-yellow-200">Sup: {viewingStudent.sup1Morning} {viewingStudent.sup2Morning ? `& ${viewingStudent.sup2Morning}` : ''}</p>}</div></div><div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxAfternoon || '-'}</p>{(viewingStudent.sup1Afternoon || viewingStudent.sup2Afternoon) && <p className="text-xs text-violet-600 font-bold mt-2 pt-2 border-t border-indigo-200">Sup: {viewingStudent.sup1Afternoon} {viewingStudent.sup2Afternoon ? `& ${viewingStudent.sup2Afternoon}` : ''}</p>}</div></div></div></div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Activity size={18} className="text-green-500"/> Salud</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Obra Social</span> {viewingStudent.healthInsurance || 'No declara'}</p><p><span className="text-gray-500 font-bold block text-xs uppercase">Vencimiento CUD</span> {viewingStudent.cudExpiration ? formatDate(viewingStudent.cudExpiration) : '-'}</p></div></div><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><User size={18} className="text-orange-500"/> Familia</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Madre</span> {viewingStudent.motherName} <span className="text-gray-400">({viewingStudent.motherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Padre</span> {viewingStudent.fatherName} <span className="text-gray-400">({viewingStudent.fatherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Dirección</span> {viewingStudent.address}</p></div></div></div>
                        </>
                    ) : (
                        <div className="animate-in fade-in">
                            {(() => { const status = getAlertStatus(viewingStudent.incidents); if (status.count > 0) { return (<div className={`p-4 rounded-xl border mb-6 flex items-center gap-4 ${status.status === 'danger' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}><div className={`p-3 rounded-full ${status.status === 'danger' ? 'bg-red-100' : 'bg-orange-100'}`}><AlertTriangle size={24}/></div><div><h4 className="font-black uppercase text-sm">Monitor de Alertas</h4><p className="text-xs">Este estudiante tuvo <b>{status.count} incidentes</b> de riesgo en los últimos 15 días.</p></div></div>); } return <div className="p-4 rounded-xl border border-green-200 bg-green-50 text-green-800 mb-6 flex items-center gap-3"><CheckCircle/> <p className="text-xs font-bold">Sin alertas recientes de conducta/salud.</p></div>; })()}
                            <div className="flex justify-between items-center mb-4"><h3 className="font-bold text-gray-800">Historial de Eventos</h3><button onClick={() => downloadHistory(viewingStudent)} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 flex items-center gap-1"><Download size={14}/> Descargar</button></div>
                            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {viewingStudent.incidents && viewingStudent.incidents.length > 0 ? (
                                    [...viewingStudent.incidents].reverse().map((inc, i) => (
                                        <div key={i} className="pl-8 relative group">
                                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${inc.severity === 'high' ? 'bg-red-500' : inc.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start hover:shadow-md transition">
                                                <div>
                                                    <div className="flex justify-between items-start"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(inc.date).toLocaleDateString()} • {new Date(inc.date).toLocaleTimeString()}</span></div>
                                                    <p className="font-bold text-gray-800 text-sm mt-1">{inc.type}</p>
                                                    <span className="text-[9px] bg-gray-50 px-2 py-0.5 rounded text-gray-400 font-bold uppercase mt-1 inline-block">{inc.author}</span>
                                                </div>
                                                <button onClick={() => deleteIncident(viewingStudent.id, inc)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={14}/></button>
                                            </div>
                                        </div>
                                    ))
                                ) : (<p className="pl-8 text-xs text-gray-400 italic">No hay registros aún.</p>)}
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0"><button onClick={() => openEdit(viewingStudent)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg"><Edit3 size={18}/> Editar Ficha</button></div>
            </div>
        </div>
      )}
      {showForm && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{editingStudent ? 'Editar Ficha' : 'Nueva Ficha'}</h3><form onSubmit={handleSave} className="space-y-6"><div className={`p-4 rounded-xl border flex items-center justify-between ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}><div><label className="text-sm font-bold text-gray-700 block">Estado del Alumno</label><p className="text-[10px] text-gray-500">Los inactivos no suman en la matrícula.</p></div><select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border font-bold text-xs outline-none bg-white"><option value="true">✅ ACTIVO (Cursando)</option><option value="false">❌ INACTIVO (Baja/Egreso)</option></select></div><div className="flex gap-4 flex-col sm:flex-row"><div className="flex flex-col items-center gap-2"><div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer">{photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center px-2">Subir Foto</span>}<input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />{uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}</div></div><div className="flex-1 space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Apellido *</label><input name="lastName" defaultValue={editingStudent?.lastName || ''} required className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nombre *</label><input name="firstName" defaultValue={editingStudent?.firstName || ''} required onChange={handleNameChange} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-bold text-gray-500">DNI</label><input name="dni" type="number" defaultValue={editingStudent?.dni || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nacimiento</label><input name="birthDate" type="date" defaultValue={editingStudent?.birthDate || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Género</label><select id="genderSelect" name="gender" defaultValue={editingStudent?.gender || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="M">Varón</option><option value="F">Mujer</option></select></div></div></div></div><div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3"><p className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Datos Institucionales</p><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Nivel</label><select name="level" defaultValue={editingStudent?.level || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option><option value="TALLER">Taller</option><option value="Pre-Taller">Pre-Taller</option><option value="FINES">Fines</option></select></div><div><label className="text-xs font-bold text-gray-500">Jornada</label><select name="journey" defaultValue={editingStudent?.journey || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble Jornada</option></select></div><div><label className="text-xs font-bold text-gray-500">Diagnóstico</label><select name="dx" defaultValue={editingStudent?.dx || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Ninguno</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div></div></div><div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3"><div className="flex justify-between items-center"><p className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1"><GraduationCap size={12}/> Ubicación 2026</p><input name="classroom" defaultValue={editingStudent?.classroom || ''} placeholder="Nº Aula" className="w-20 p-1 bg-white text-center rounded border text-xs outline-none" /></div><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO MAÑANA</p><div className="grid grid-cols-2 gap-2 mb-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning || ''} placeholder="Grupo TM" className="p-2 bg-white rounded border text-xs outline-none" /><select name="teacherMorning" defaultValue={editingStudent?.teacherMorning || ''} className="p-2 bg-white rounded border text-xs outline-none"><option value="">Docente TM...</option>{staffOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="auxMorning" defaultValue={editingStudent?.auxMorning || ''} className="p-2 bg-white rounded border text-xs outline-none"><option value="">Auxiliar TM...</option>{staffOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><select name="sup1Morning" defaultValue={editingStudent?.sup1Morning || ''} className="p-2 bg-white rounded border text-xs outline-none text-violet-700 font-bold"><option value="">Supervisora 1...</option>{techOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="sup2Morning" defaultValue={editingStudent?.sup2Morning || ''} className="p-2 bg-white rounded border text-xs outline-none text-violet-700 font-bold"><option value="">Supervisora 2...</option>{techOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO TARDE</p><div className="grid grid-cols-2 gap-2 mb-2"><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon || ''} placeholder="Grupo TT" className="p-2 bg-white rounded border text-xs outline-none" /><select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon || ''} className="p-2 bg-white rounded border text-xs outline-none"><option value="">Docente TT...</option>{staffOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="auxAfternoon" defaultValue={editingStudent?.auxAfternoon || ''} className="p-2 bg-white rounded border text-xs outline-none"><option value="">Auxiliar TT...</option>{staffOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><select name="sup1Afternoon" defaultValue={editingStudent?.sup1Afternoon || ''} className="p-2 bg-white rounded border text-xs outline-none text-violet-700 font-bold"><option value="">Supervisora 1...</option>{techOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="sup2Afternoon" defaultValue={editingStudent?.sup2Afternoon || ''} className="p-2 bg-white rounded border text-xs outline-none text-violet-700 font-bold"><option value="">Supervisora 2...</option>{techOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div></div><div className="space-y-3 pt-2 border-t border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salud y Familia</p><div className="grid grid-cols-2 gap-3"><input name="healthInsurance" defaultValue={editingStudent?.healthInsurance || ''} placeholder="Obra Social" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="cudExpiration" type="date" defaultValue={editingStudent?.cudExpiration || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><input name="address" defaultValue={editingStudent?.address || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" placeholder="Dirección" /><div className="grid grid-cols-2 gap-3"><input name="motherName" defaultValue={editingStudent?.motherName || ''} placeholder="Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="motherContact" defaultValue={editingStudent?.motherContact || ''} placeholder="Contacto Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><div className="grid grid-cols-2 gap-3"><input name="fatherName" defaultValue={editingStudent?.fatherName || ''} placeholder="Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="fatherContact" defaultValue={editingStudent?.fatherContact || ''} placeholder="Contacto Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div></div><div className="flex gap-3 mt-6 pt-4 border-t border-gray-100"><button type="button" onClick={() => {setShowForm(false); setEditingStudent(null); setPhotoPreview(null);}} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20}/></button>}</div></form></div></div>)}
    </div>
  );
}
// --- VISTA TABLERO DE GRUPOS (FICHA COMPLETA SOLO LECTURA) ---
function GroupsView({ user }) {
  const [students, setStudents] = useState([]);
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [savingIncident, setSavingIncident] = useState(false);
  const [activeTab, setActiveTab] = useState('info'); // Estado para solapas de la ficha

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración'].includes(user.role) || user.rol === 'admin';

  const INCIDENT_TYPES = [
      { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "Vómito", emoji: "🤮", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "Golpe / Caída", emoji: "🤕", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "Durmió en clase", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "Sin Medicación", emoji: "💊", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  ];

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsub = onSnapshot(q, (snap) => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const groupedData = students.reduce((acc, s) => {
      const groupName = turn === 'morning' ? s.groupMorning : s.groupAfternoon;
      if (!groupName) return acc;
      if (!acc[groupName]) {
          acc[groupName] = {
              name: groupName,
              students: [],
              teacher: turn === 'morning' ? s.teacherMorning : s.teacherAfternoon,
              aux: turn === 'morning' ? s.auxMorning : s.auxAfternoon,
              sup1: turn === 'morning' ? s.sup1Morning : s.sup1Afternoon,
              sup2: turn === 'morning' ? s.sup2Morning : s.sup2Afternoon,
              classroom: s.classroom,
              level: s.level
          };
      }
      acc[groupName].students.push(s);
      return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

  if (!isManagement) {
      groups = groups.filter(g => 
          g.teacher === user.fullName || 
          g.aux === user.fullName ||
          g.sup1 === user.fullName ||
          g.sup2 === user.fullName
      );
  }

  const handleSaveIncident = async (type, severity) => {
      if (!showBitacoraModal) return;
      setSavingIncident(true);
      try {
          const incidentData = { type, severity, date: new Date().toISOString(), author: user.fullName || user.firstName, authorId: user.id };
          const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id);
          await updateDoc(studentRef, { incidents: arrayUnion(incidentData), lastIncident: incidentData.date, lastIncidentType: type });
          alert("✅ Registro guardado");
          setShowBitacoraModal(null);
      } catch (e) { console.error(e); alert("Error: " + e.message); } finally { setSavingIncident(false); }
  };

  const deleteIncident = async (studentId, incident) => {
      if(!confirm("¿Borrar esta entrada de la bitácora?")) return;
      try {
          const { updateDoc, doc, arrayRemove } = await import('firebase/firestore');
          const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId);
          await updateDoc(studentRef, { incidents: arrayRemove(incident) });
      } catch (e) {
          alert("Error al borrar: " + e.message);
      }
  };

  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Por favor, permití las ventanas emergentes para imprimir.");
    const turnoTexto = turn === 'morning' ? 'MAÑANA' : 'TARDE';
    let content = `<html><head><title>Listado de Grupos</title>`;
    content += `<style>body{font-family: sans-serif; padding: 20px;} table{width:100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px;} th, td{border: 1px solid #000; padding: 8px; text-align: left;} th{background-color: #f0f0f0; text-transform: uppercase;} h1{text-align: center; font-size: 18px; margin-bottom: 20px; text-decoration: underline;} .group-container{margin-bottom: 40px; page-break-inside: avoid;} .group-header { border: 1px solid #000; background: #eee; padding: 10px; margin-bottom: 10px; display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-size: 13px; } .header-item { margin-bottom: 2px; } </style>`;
    content += `</head><body>`;
    content += `<h1>LISTADO DE GRUPOS - TURNO ${turnoTexto}</h1>`;
    groups.forEach(g => {
        content += `<div class="group-container">`;
        content += `
            <div class="group-header">
                <div class="header-item"><strong>GRUPO:</strong> ${g.name}</div>
                <div class="header-item"><strong>NIVEL:</strong> ${g.level || '-'}</div>
                <div class="header-item"><strong>AULA:</strong> ${g.classroom || '-'}</div>
                <div class="header-item"><strong>DOCENTE:</strong> ${g.teacher || '-'}</div>
                <div class="header-item"><strong>AUXILIAR:</strong> ${g.aux || '-'}</div>
                <div class="header-item" style="grid-column: span 2; border-top: 1px solid #ccc; padding-top:5px; margin-top:5px;"><strong>SUPERVISIÓN TÉCNICA:</strong> ${g.sup1 || '-'} / ${g.sup2 || '-'}</div>
            </div>
        `;
        content += '<table><thead><tr><th>Apellido y Nombre</th><th>DNI</th><th>Edad</th><th>Fecha Nac.</th><th>DX</th></tr></thead><tbody>';
        g.students.sort((a,b) => a.lastName.localeCompare(b.lastName)).forEach(s => {
            const edad = calculateAge(s.birthDate);
            const fechaNac = s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-';
            content += `<tr><td>${s.lastName}, ${s.firstName}</td><td>${s.dni}</td><td>${edad}</td><td>${fechaNac}</td><td>${s.dx || '-'}</td></tr>`;
        });
        content += '</tbody></table></div>';
    });
    content += `</body></html>`;
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); }, 500);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in duration-500">
      <div className="bg-white p-4 shadow-sm z-10 flex justify-between items-center sticky top-0">
          <div><h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2><p className="text-xs text-gray-400 font-bold uppercase tracking-widest">{isManagement ? "Vista Global Institucional" : `Espacio de ${user.firstName}`}</p></div>
          <div className="flex gap-2">
              <button onClick={handlePrint} className="bg-white border border-gray-200 text-gray-600 p-2 rounded-xl shadow-sm hover:bg-gray-50 transition" title="Imprimir Listas"><Download size={20}/></button>
              <div className="flex bg-gray-100 p-1 rounded-xl"><button onClick={() => setTurn('morning')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-md transform scale-105' : 'text-gray-400'}`}>☀️ Mañana</button><button onClick={() => setTurn('afternoon')} className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-md transform scale-105' : 'text-gray-400'}`}>🌙 Tarde</button></div>
          </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex gap-6 h-full">
              {groups.length === 0 && (<div className="m-auto text-center opacity-50"><LayoutDashboard size={48} className="mx-auto mb-2 text-gray-300"/><p className="font-bold text-gray-400">No hay grupos asignados.</p></div>)}
              {groups.map((group) => (
                  <div key={group.name} className="min-w-[280px] w-[300px] flex flex-col h-full bg-white rounded-[30px] border border-gray-200 shadow-sm relative overflow-hidden group-hover:shadow-md transition">
                      <div className={`p-4 border-b-4 ${turn === 'morning' ? 'border-orange-400 bg-orange-50' : 'border-indigo-400 bg-indigo-50'}`}>
                          <div className="flex justify-between items-start mb-1"><h3 className="font-black text-gray-800 text-lg leading-none uppercase italic">{group.name}</h3><span className="bg-white/50 px-2 py-1 rounded text-[10px] font-bold text-gray-500">{group.students.length} alum.</span></div>
                          <div className="flex flex-col gap-1 mt-2">
                              {group.classroom && (<span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-600 bg-white px-2 py-1 rounded w-fit shadow-sm"><StartIcon size={10}/> Aula {group.classroom}</span>)}
                              <p className="text-[10px] text-gray-500 font-medium truncate">PROFE: <span className="font-bold uppercase">{group.teacher || 'Sin asignar'}</span></p>
                              {group.aux && <p className="text-[10px] text-gray-500 font-medium truncate">AUX: <span className="font-bold uppercase">{group.aux}</span></p>}
                              {(group.sup1 || group.sup2) && (<div className="mt-1 pt-1 border-t border-gray-200/50"><p className="text-[9px] text-violet-600 font-bold truncate">SUP: {group.sup1 || ''} {group.sup2 ? `& ${group.sup2}` : ''}</p></div>)}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/50">
                          {group.students.map(student => (
                              <div key={student.id} className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3 relative hover:scale-[1.02] transition-transform duration-200">
                                  <div onClick={() => { setSelectedStudent(student); setActiveTab('info'); }} className="w-12 h-12 rounded-full bg-gray-200 border-2 border-white shadow-sm flex-shrink-0 overflow-hidden cursor-pointer relative">{student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold">{student.firstName[0]}</div>}{student.lastIncident && new Date(student.lastIncident).toDateString() === new Date().toDateString() && (<div className="absolute bottom-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>)}</div>
                                  <div className="flex-1 min-w-0" onClick={() => { setSelectedStudent(student); setActiveTab('info'); }}><h4 className="font-bold text-gray-700 text-sm truncate cursor-pointer">{student.firstName} {student.lastName}</h4><p className="text-[10px] text-gray-400">{student.dx || 'Sin DX'}</p></div>
                                  <button onClick={() => setShowBitacoraModal(student)} className="w-8 h-8 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center shadow-sm hover:bg-violet-600 hover:text-white transition-colors">⚡</button>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      </div>

      {/* --- MODAL BITÁCORA EXPRESS --- */}
      {showBitacoraModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
              <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
                  <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
                  <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? 'opacity-50' : 'hover:brightness-95'}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div>
                  <p className="text-[9px] text-center text-gray-400 mt-4 italic">Al tocar se guarda fecha y hora automáticamente.</p>
              </div>
          </div>
      )}

      {/* --- MODAL FICHA DE ESTUDIANTE (TIPO LEGAJO) --- */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0">
                    <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button>
                    <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">
                            {selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{selectedStudent.lastName}, {selectedStudent.firstName}</h2>
                            <p className="opacity-90 flex gap-2 text-sm mt-1">
                                <span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(selectedStudent.birthDate)} años</span>
                                <span className="bg-white/20 px-2 py-0.5 rounded">{selectedStudent.dni}</span>
                            </p>
                        </div>
                    </div>
                    {/* SOLAPAS */}
                    <div className="flex gap-2 mt-6">
                        <button onClick={() => setActiveTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'info' ? 'bg-white text-blue-600 shadow-md' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}>Datos Personales</button>
                        <button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeTab === 'history' ? 'bg-white text-blue-600 shadow-md' : 'bg-black/20 text-white/70 hover:bg-black/30'}`}>Historial</button>
                    </div>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {activeTab === 'info' ? (
                        <>
                            {/* FAMILIA Y CONTACTO (PRIORITARIO) */}
                            <div className="bg-orange-50 p-4 rounded-xl border border-orange-100">
                                <h3 className="font-black text-orange-800 uppercase text-xs flex items-center gap-2 mb-3"><User size={14}/> Familia & Contacto</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between border-b border-orange-200 pb-2">
                                        <span className="text-orange-400 font-bold text-xs uppercase">Madre</span>
                                        <span className="font-bold text-gray-800">{selectedStudent.motherName || '-'} <span className="text-gray-500 font-normal">({selectedStudent.motherContact || '-'})</span></span>
                                    </div>
                                    <div className="flex justify-between border-b border-orange-200 pb-2">
                                        <span className="text-orange-400 font-bold text-xs uppercase">Padre</span>
                                        <span className="font-bold text-gray-800">{selectedStudent.fatherName || '-'} <span className="text-gray-500 font-normal">({selectedStudent.fatherContact || '-'})</span></span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-orange-400 font-bold text-xs uppercase">Domicilio</span>
                                        <span className="font-bold text-gray-800 text-right">{selectedStudent.address || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* SALUD Y DX */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-purple-50 p-3 rounded-xl border border-purple-100">
                                    <p className="text-[10px] text-purple-400 font-black uppercase">Diagnóstico</p>
                                    <p className="font-bold text-purple-800 text-sm">{selectedStudent.dx || '-'}</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-xl border border-green-100">
                                    <p className="text-[10px] text-green-500 font-black uppercase">Obra Social</p>
                                    <p className="font-bold text-green-800 text-sm truncate">{selectedStudent.healthInsurance || 'No declara'}</p>
                                </div>
                            </div>

                            {/* DATOS ESCOLARES (RESUMEN) */}
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <h3 className="font-black text-gray-400 uppercase text-xs mb-3">Ubicación Escolar</h3>
                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div>
                                        <p className="text-gray-400 font-bold">Turno Mañana</p>
                                        <p className="font-bold text-gray-800">{selectedStudent.groupMorning || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold">Turno Tarde</p>
                                        <p className="font-bold text-gray-800">{selectedStudent.groupAfternoon || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="animate-in fade-in">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-800">Bitácora de Incidentes</h3>
                            </div>
                            <div className="space-y-4 relative before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-200">
                                {selectedStudent.incidents && selectedStudent.incidents.length > 0 ? (
                                    [...selectedStudent.incidents].reverse().map((inc, i) => (
                                        <div key={i} className="pl-8 relative group">
                                            <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${inc.severity === 'high' ? 'bg-red-500' : inc.severity === 'medium' ? 'bg-orange-400' : 'bg-yellow-400'}`}></div>
                                            <div className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm flex justify-between items-start">
                                                <div>
                                                    <div className="flex justify-between items-start gap-2"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(inc.date).toLocaleDateString()} • {new Date(inc.date).toLocaleTimeString()}</span></div>
                                                    <p className="font-bold text-gray-800 text-sm mt-1">{inc.type}</p>
                                                    <span className="text-[9px] bg-gray-50 px-2 py-0.5 rounded text-gray-400 font-bold uppercase mt-1 inline-block">Por: {inc.author}</span>
                                                </div>
                                                <button onClick={() => deleteIncident(selectedStudent.id, inc)} className="text-gray-300 hover:text-red-500 p-2"><Trash2 size={12}/></button>
                                            </div>
                                        </div>
                                    ))
                                ) : (<div className="pl-8 text-xs text-gray-400 italic">No hay eventos registrados.</div>)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}

// Icono auxiliar (necesario para el código)
const StartIcon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;












