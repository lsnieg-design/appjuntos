import React, { useState, useEffect, useRef } from 'react';
import { GroupsView } from './views/GroupsView';
import { PersonalView } from './views/PersonalView';
import { DashboardView } from './views/DashboardView';

import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, where, getDocs, getDoc, serverTimestamp, arrayUnion, arrayRemove, limit,increment 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
const VALID_ROLES_OFFICIAL = [
  "Docente", "Preceptora", "Auxiliar", "Profe Especial", "Equipo Técnico", "Equipo Directivo",
  "Dirección Inclusión", "Equipo Técnico Inclusión", "DAI",
  "Cocina", "Limpieza", "Mantenimiento", "Administración"
];
const TURNS_LIST = ["Mañana", "Tarde", "Alternado", "Vespertino", "Doble"];
// --- CONSTANTES GLOBALES ---
const LOGO_URL = "/icon-192.png";

// --- FUNCIÓN SEGURA PARA NOTIFICACIONES ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body: body, icon: LOGO_URL, vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: LOGO_URL }); } catch (e) { console.log("Notif error"); }
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
  'Administración',
  'Dirección Inclusión', // NUEVO
  'Equipo Técnico Inclusión', // NUEVO
  'DAI' // NUEVO (Docente de Apoyo a la Inclusión)
];
// Tipos de Modalidad para filtrar
const MODALIDADES = ['Sede', 'Inclusión'];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS', 'INCLUSIÓN' ];

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
// --- Componente Principal Wrapper (CORREGIDO) ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    setTimeout(() => setMinTimePassed(true), 2500);
    if (!auth) { setConfigError(true); setLoading(false); return; }

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

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      const savedProfile = localStorage.getItem('schoolApp_profile');
      if (savedProfile) setCurrentUserProfile(JSON.parse(savedProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (profileData) => { setCurrentUserProfile(profileData); localStorage.setItem('schoolApp_profile', JSON.stringify(profileData)); };
  const handleLogout = () => { setCurrentUserProfile(null); localStorage.removeItem('schoolApp_profile'); };

  if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div></div>;
  if (configError) return <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center"><AlertCircle className="text-red-500 w-16 h-16 mb-4" /><h1 className="text-xl font-bold text-red-700">Error de Configuración</h1></div>;
  if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;

  // CORRECCIÓN: Agregado ""
 return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- PANTALLA LOGIN (CON INSTALACIÓN PWA ROBUSTA Y CLARA) ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverUser, setRecoverUser] = useState('');
  const [recoverStatus, setRecoverStatus] = useState('idle');
  
  // PWA Logic
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    // Detectar si es iOS
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Si no está instalada, mostramos el cartel
      if (!isStandalone) setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // En iOS no salta el evento, así que lo forzamos si no es standalone
    if (ios && !isStandalone) {
        setTimeout(() => setShowInstall(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setChecking(true);
    // Backdoor admin
    if (username === 'admin' && password === 'admin123') {
      onLogin({ id: 'super-admin', firstName: 'Super', lastName: 'Admin', fullName: 'Super Admin', role: 'Equipo Directivo', rol: 'super-admin', isAdmin: true, username: 'admin' }); return;
    }
    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]; const userData = userDoc.data();
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userDoc.id), { lastLogin: serverTimestamp() });
        const esAdmin = userData.rol === 'admin';
        onLogin({ ...userData, id: userDoc.id, isAdmin: esAdmin });
      } else { setError('Usuario o contraseña incorrectos.'); }
    } catch (err) { setError('Error de conexión.'); } finally { setChecking(false); }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault(); if(!recoverUser.trim()) return; setRecoverStatus('sending');
    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', recoverUser));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { setRecoverStatus('error'); setTimeout(() => setRecoverStatus('idle'), 3000); return; }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), { type: 'password_reset', username: recoverUser, status: 'pending', createdAt: serverTimestamp() });
        setRecoverStatus('sent');
    } catch (error) { setRecoverStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6 relative">
      
      {/* --- CARTEL DE INSTALACIÓN PWA MEJORADO --- */}
      {!isStandalone && showInstall && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-500">
             <div className="bg-white rounded-[35px] shadow-2xl p-6 w-full max-w-sm text-center mb-4 md:mb-0 border-t-8 border-violet-500 relative">
                 <button onClick={() => setShowInstall(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><X size={24}/></button>
                 
                 <div className="flex justify-center mb-4">
                    <div className="bg-violet-100 p-4 rounded-full animate-bounce">
                        <Smartphone className="text-violet-600" size={40} />
                    </div>
                 </div>
                 
                 <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">¡Instalá la App! 📲</h3>
                 <p className="text-sm text-gray-500 mb-6 font-medium">Para tener acceso rápido y recibir notificaciones importantes, instalá la app en tu celular.</p>
                 
                 <div className="space-y-3">
                     {!isIos ? (
                         <button onClick={handleInstallClick} className="w-full bg-violet-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl hover:bg-violet-700 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                             <Download size={20}/> Instalar Ahora
                         </button>
                     ) : (
                         <div className="text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-3">
                             <p className="font-bold text-violet-600 text-center uppercase tracking-wider mb-2">Cómo instalar en iPhone:</p>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500"><Share size={18}/></div>
                                 <span>1. Tocá el botón <b>Compartir</b> (abajo al medio).</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm text-gray-600"><PlusSquare size={18}/></div>
                                 <span>2. Buscá y elegí <b>"Agregar a Inicio"</b>.</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm font-bold text-blue-500 text-[10px]">Add</div>
                                 <span>3. Dale a <b>Agregar</b> (arriba derecha).</span>
                             </div>
                         </div>
                     )}
                     <button onClick={() => setShowInstall(false)} className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 mt-2">Usar navegador por ahora</button>
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
function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'text-orange-500 transform -translate-y-1' : 'text-gray-400 hover:text-violet-600'}`}
    >
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}
// --- APP PRINCIPAL (FINAL: CON ADMIN INTEGRADO + MANTENIMIENTO + NOTIFS) ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);
  
  // POPUPS
  const [showNotifRequest, setShowNotifRequest] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(false);

  const prevNotifCount = useRef(0);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';
  
  // --- DEFINICIÓN DE PERMISOS GLOBALES (ORDEN CORREGIDO) ---
  
  // 1. Primero definimos los permisos específicos (con ? para que sea seguro)
  const isAdminRole = ['admin', 'super-admin', 'Administración', 'Equipo Directivo', 'Dirección Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isTechTeamRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Equipo Técnico', 'Equipo Técnico Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isMedicalRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user?.role) || user?.rol === 'admin';
  
  // 2. Definimos el permiso Social (usando el texto exacto como está en Firebase)
  const canAccessSocial = ['admin', 'super-admin', 'Docente', 'Auxiliar/Preceptor', 'Equipo Directivo', 'Equipo Técnico', 'Inclusión', 'DAI'].includes(user?.role) || user?.rol === 'admin';

  // 3. Ahora que canAccessSocial EXISTE, definimos si mostramos el menú privado
  const showPrivateMenu = isAdminRole || isTechTeamRole || isMedicalRole || canAccessSocial;

  // 4. Otros estados de la interfaz
  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users', 'admin'].includes(activeTab);
  useEffect(() => {
    if (user?.id) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { lastLogin: serverTimestamp() }).catch(()=>{});
    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubResources = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc')), (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // MANTENIMIENTO
    const unsubMaint = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'), (doc) => { 
        const isActive = doc.exists() ? doc.data().active : false;
        setMaintenanceMode(isActive);
        if(isActive && user.rol !== 'super-admin') setShowMaintenanceAlert(true);
    });

    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => { 
        const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); d.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); 
        const unread = d.filter(n=>!n.read); setNotifications(unread);
        if (unread.length > prevNotifCount.current) { const latest = unread[0]; if (latest) { if ("Notification" in window && Notification.permission === "granted") { new Notification(`🔔 ${latest.title}`, { body: latest.message, icon: LOGO_URL }); } try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){} } }
        prevNotifCount.current = unread.length;
    });

    // CHECK NOTIFICACIONES AL INICIO
    if ("Notification" in window && Notification.permission === 'default') {
        setTimeout(() => setShowNotifRequest(true), 3500); // Espera 3.5s para no chocar con la carga
    }

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); unsubAnnounce(); unsubMaint(); };
  }, [user.id]);

  const handleGlobalSearch = async (text) => { setSearchQuery(text); if (text.length < 2) { setSearchResults([]); return; } const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const s = await getDocs(q); const r = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => (s.isActive===undefined || s.isActive) && (s.firstName.toLowerCase().includes(text.toLowerCase()) || s.lastName.toLowerCase().includes(text.toLowerCase()))); setSearchResults(r.slice(0, 5)); };
  const handleNotificationClick = async (n) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id)); if (n.targetTab) setActiveTab(n.targetTab); setShowNotifPanel(false); };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  
  const enableNotifications = async () => { 
      const permission = await Notification.requestPermission(); 
      if (permission === 'granted') { 
          try { 
              const { getMessaging, getToken } = await import("firebase/messaging"); const messaging = getMessaging(); 
              const token = await getToken(messaging, { vapidKey: 'BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw' }); 
              if(token) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { fcmTokens: arrayUnion(token) }); 
          } catch(e) {} 
          alert("✅ ¡Genial! Te avisaremos de las novedades."); 
      } 
      setShowNotifRequest(false); 
  };

  // PANTALLA DE BLOQUEO TOTAL (SOLO SI SE DESEA - AHORA ESTÁ EN MODO CERRABLE ARRIBA)
  // Si quisieras bloqueo total descomenta esto. Pero pediste poder cerrar.

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 font-sans text-slate-800 overflow-hidden relative">
      <style>{` *::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0">
        <div className="flex items-center space-x-3"><img src={LOGO_URL} alt="Logo" className="w-10 h-8 object-contain" /><div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div></div>
        <div className="flex items-center gap-3"><button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button><div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}><Bell size={20} />{notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}</button>{showNotifPanel && (<div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]"><div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div><div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-10 text-center text-gray-400"><p className="text-xs font-bold uppercase">Sin novedades</p></div>:notifications.map(n=>(<div key={n.id} onClick={()=>handleNotificationClick(n)} className="p-4 border-b hover:bg-gray-50 cursor-pointer"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}</div></div>)}</div><div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">{user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}</div></div>
      </header>

      {/* --- CARTEL MANTENIMIENTO CERRABLE --- */}
      {maintenanceMode && showMaintenanceAlert && (
          <div className="fixed top-16 left-0 right-0 z-[999] p-4 animate-in slide-in-from-top-5">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl p-5 text-white flex flex-col items-center gap-3 border-4 border-white/20 relative overflow-hidden">
                  <div className="absolute -top-10 -left-10 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                  <div className="flex items-center gap-3 z-10">
                      <div className="bg-white p-3 rounded-full text-orange-600 animate-spin-slow"><Settings size={28}/></div>
                      <div className="text-center">
                          <h3 className="font-black uppercase text-lg tracking-wider leading-none">¡Estamos en Obra! 🚧</h3>
                          <p className="text-xs font-medium opacity-90 mt-1">Estamos mejorando la App. Puede haber interrupciones breves.</p>
                      </div>
                  </div>
                  <div className="flex gap-2 w-full">
                      <button onClick={() => setShowMaintenanceAlert(false)} className="flex-1 bg-white text-orange-600 px-4 py-3 rounded-xl text-xs font-black uppercase shadow-lg hover:bg-orange-50 transition active:scale-95">
                          Entendido, usar con cuidado
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- POPUP DE PEDIDO DE NOTIFICACIONES --- */}
      {showNotifRequest && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[30px] p-6 w-full max-w-sm shadow-2xl text-center border-t-8 border-orange-500 mb-20 md:mb-0">
                 <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                     <Bell size={32} className="text-orange-500"/>
                 </div>
                 <h3 className="text-xl font-black text-gray-800 mb-2">¡No te pierdas nada!</h3>
                 <p className="text-sm text-gray-500 mb-6">Activa las notificaciones para saber cuando tienes una tarea nueva o un aviso urgente.</p>
                 <div className="flex flex-col gap-3">
                     <button onClick={enableNotifications} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-violet-700 transition">ACTIVAR AHORA</button>
                     <button onClick={() => setShowNotifRequest(false)} className="text-gray-400 text-xs font-bold uppercase hover:text-gray-600">Ahora no</button>
                 </div>
             </div>
         </div>
      )}

   <main className={`flex-1 overflow-y-auto no-scrollbar pb-24 pt-6 mx-auto w-full transition-all duration-300 ${isWideTab ? 'px-2 max-w-[98%]' : 'px-4 max-w-4xl'}`}>
        {activeTab === 'dashboard' && <DashboardView user={user} db={db} appId={appId} />}
        {activeTab === 'groups' && <GroupsView user={user} db={db} appId={appId} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarView events={events} canEdit={canManageContent} user={user} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} canEdit={canManageContent} />}
        {activeTab === 'matricula' && <MatriculaView user={user} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}
        {activeTab === 'equipo' && <EquipoTecnicoView user={user} />}
        {activeTab === 'admin' && <AdministracionView user={user} />}
        {activeTab === 'personal' && (
          <PersonalView 
            user={user} 
            db={db} 
            appId={appId} 
            TURNS_LIST={TURNS_LIST} 
            VALID_ROLES_OFFICIAL={VALID_ROLES_OFFICIAL} 
          />
        )}
        {activeTab === 'medical' && <MedicalView user={user} />}
        {activeTab === 'social' && <SocialView user={user} />}

        {/* BUSCADOR Y MODAL GLOBAL (Mantenidos dentro del flujo del main o justo después) */}
        {showSearch && (
          <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in">
            <div className="flex justify-between items-center text-white mb-4">
              <h3 className="font-black italic uppercase">Buscador Rápido</h3>
              <button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button>
            </div>
            <input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/>
            <div className="flex-1 overflow-y-auto space-y-2">
              {searchResults.map(s => (
                <div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">
                    {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p>
                  </div>
                </div>
              ))}
              {searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}
            </div>
          </div>
        )}

        {globalViewingStudent && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
              <div className="bg-violet-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3>
                <button onClick={() => setGlobalViewingStudent(null)}><X/></button>
              </div>
              <div className="p-6">
                <div className="flex gap-4 items-center mb-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">
                    {globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p>
                    <p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p>
                  </div>
                </div>
                <button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ver Legajo Completo</button>
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0">
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          
          <div className="relative -top-5 flex justify-center">
            <button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}>
              <Grid size={24} />
            </button>
            <span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span>
          </div>
          
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />
          
          <div className="relative">
            <NavButton active={['matricula', 'resources', 'proyecto', 'admin', 'personal', 'medical', 'equipo'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
              {showMoreMenu && (
                  <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-56 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-50">
                      <button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                          <GraduationCap size={18} className="text-violet-500"/> Legajos
                      </button>
               
                      <button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                          <LinkIcon size={18} className="text-green-500"/> Recursos
                      </button>
                      <button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                          <PieChart size={18} className="text-orange-500"/> Proyecto Inst.
                      </button>
                      
                      {/* --- SECCIÓN PRIVADA: ADMIN, PERSONAL, EQUIPO TÉCNICO, MÉDICO --- */}
                      {showPrivateMenu && (
                          <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-1">Gestión Privada</p>
                              
                              {isTechTeamRole && (
                                  <button onClick={() => { setActiveTab('equipo'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-teal-50 flex items-center gap-3 text-sm font-bold text-teal-700 transition">
                                      <Briefcase size={18} className="text-teal-500"/> Equipo Técnico
                                  </button>
                              )}

                              {isAdminRole && (
                                  <>
                                      <button onClick={() => { setActiveTab('admin'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-blue-600 transition">
                                          <FileText size={18} className="text-blue-500"/> Admin Docs
                                      </button>
                                      <button onClick={() => { setActiveTab('personal'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-violet-700 transition">
                                          <Users size={18} className="text-violet-500"/> Personal
                                      </button>
                                  </>
                              )}
                             {canAccessSocial && (
            <button 
                onClick={() => { setActiveTab('social'); setShowMoreMenu(false); }} 
                className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"
            >
                <Users size={18} className="text-blue-500"/> Trabajo Social
            </button>
        )}

                              {isMedicalRole && (
                                  <button onClick={() => { setActiveTab('medical'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition">
                                      <Activity size={18} className="text-red-500"/> Médico
                                  </button>
                              )}
                          </div>
                      )}
                  </div>
              )}
          </div>
        </div>
      </nav>

      {/* BUSCADOR Y MODAL GLOBAL */}
      {showSearch && ( <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in"><div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div><input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/><div className="flex-1 overflow-y-auto space-y-2">{searchResults.map(s => (<div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div><div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div></div>))}{searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}</div></div> )}
      {globalViewingStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95"><div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div><div className="p-6"><div className="flex gap-4 items-center mb-4"><div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div><div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div></div><button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a la sección Legajos. Buscalo ahí para editar."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button></div></div></div>)}
    </div>
  );
} // <--- CIERRE CORRECTO DE LA FUNCIÓN MainApp



// --- VISTA RECURSOS (VERSIÓN CON PLANTILLAS EN GENERADOR DE NOTAS) ---
function ResourcesView({ resources, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null); 
  
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [notaData, setNotaData] = useState({ 
    date: new Date().toLocaleDateString('es-AR'), 
    title: '', body: '', signature: 'EQUIPO DIRECTIVO',
    fontSize: 'text-[14px]', textAlign: 'text-center',
    wordSpacing: '0.12em', isPrintMode: false 
  });

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateData, setTemplateData] = useState({
      destinatario: '',
      fechaReunion: '',
      horaReunion: '',
      modalidad: 'Presencial en la Institución'
  });
  
  const LOGO_SIN_FONDO = "/logosinfondo.png";

  const handleSaveResource = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'),
      url: fd.get('url'),
      category: 'GENERAL', 
      updatedAt: serverTimestamp()
    };
    try {
      if (editingRes?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', editingRes.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false); setEditingRes(null);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteResource = async (resId) => {
    if (!confirm("¿Eliminar este link?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', resId));
    } catch (err) { alert(err.message); }
  };

  const aplicarPlantillaReunion = () => {
      if(!templateData.fechaReunion || !templateData.horaReunion) {
          alert("Completá fecha y hora."); return;
      }
      const partesFecha = templateData.fechaReunion.split('-');
      const fechaLegible = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
      const textoDestinatario = templateData.destinatario ? `Estimada familia de ${templateData.destinatario}:` : `Estimadas familias:`;
      const cuerpoMensaje = `${textoDestinatario}\n\nPor medio de la presente, nos comunicamos para citarlos a una reunión a fin de conversar sobre aspectos relacionados a la trayectoria escolar.\n\nLa misma se llevará a cabo el día ${fechaLegible} a las ${templateData.horaReunion} hs.\nModalidad: ${templateData.modalidad}.\n\nAgradecemos su compromiso y puntualidad.\nPor favor, confirmar asistencia.`;
      setNotaData({ ...notaData, title: 'CITACIÓN A REUNIÓN', body: cuerpoMensaje, textAlign: 'text-left' });
      setShowTemplates(false);
  };

 return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10 px-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Recursos</h2>
        {canEdit && (
          <button onClick={() => { setEditingRes(null); setShowModal(true); }} className="bg-orange-500 text-white p-2.5 rounded-xl shadow-lg hover:bg-orange-600 transition flex items-center gap-2 font-black text-[10px] uppercase">
            <PlusCircle size={20}/> Nuevo Link
          </button>
        )}
      </div>

      {/* BOTÓN GENERADOR DE NOTAS */}
      <button onClick={() => setShowNotaModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-orange-400 p-6 rounded-[35px] shadow-lg text-white flex items-center justify-between mb-8 group active:scale-95 transition-transform">
          <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition-transform"><Edit3 size={32}/></div>
              <div className="text-left">
                  <h3 className="font-black text-xl tracking-widest uppercase italic drop-shadow-md">Generador de Notas</h3>
                  <p className="text-xs font-bold opacity-90 mt-1">Crear comunicados oficiales</p>
              </div>
          </div>
          <ChevronRight size={24} className="opacity-50"/>
      </button>

      {/* LISTADO EN DOS COLUMNAS PARA PC */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[4px] ml-2 mb-2">Accesos Directos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-[30px] border border-violet-50 flex flex-col justify-between shadow-sm group hover:border-violet-200 hover:shadow-md transition-all relative overflow-hidden h-32">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="h-full flex flex-col justify-center">
                    <div className="w-10 h-10 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center shrink-0 mb-2 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      <ExternalLink size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-xs text-gray-700 uppercase italic leading-tight line-clamp-2">{r.title}</span>
                    </div>
                </a>

                {canEdit && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.preventDefault(); setEditingRes(r); setShowModal(true); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-orange-500"><Edit3 size={14}/></button>
                    <button onClick={(e) => { e.preventDefault(); handleDeleteResource(r.id); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL LINK */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <form onSubmit={handleSaveResource} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-orange-500">
            <h3 className="text-xl font-black text-violet-900 mb-6 uppercase italic">{editingRes ? 'Editar Link' : 'Nuevo Link'}</h3>
            <div className="space-y-4">
              <input name="title" defaultValue={editingRes?.title} placeholder="Título del Botón" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border" required />
              <input name="url" defaultValue={editingRes?.url} placeholder="https://..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border" required />
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRes(null); }} className="flex-1 py-4 font-black text-xs text-gray-400 uppercase">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase">Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {showNotaModal && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-0 md:p-4 backdrop-blur-md" onClick={() => setShowNotaModal(false)}>
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-7xl flex flex-col h-[98vh] md:h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Editor Institucional</h3>
              <button onClick={() => setShowNotaModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
              <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-6 border-r border-gray-50 relative">
                
                {/* BOTÓN DE PLANTILLAS */}
                <button 
                    onClick={() => setShowTemplates(!showTemplates)} 
                    className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-xs uppercase border border-blue-200 flex justify-center items-center gap-2 hover:bg-blue-100 transition"
                >
                    <List size={16}/> {showTemplates ? 'Ocultar Plantillas' : 'Usar una Plantilla (Ej: Reunión)'}
                </button>

                {/* PANEL DE PLANTILLAS DESPLEGABLE */}
                {showTemplates && (
                    <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm animate-in slide-in-from-top-2 space-y-3">
                        <h4 className="font-black text-blue-900 text-xs uppercase italic border-b pb-2">Plantilla: Citación a Reunión</h4>
                        
                        <div className="space-y-2">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1 mb-1">Destinatario (Opcional)</label>
                                <input 
                                    type="text" 
                                    placeholder="Ej: Pérez Juan / Grupo 1° Ciclo" 
                                    value={templateData.destinatario} 
                                    onChange={e => setTemplateData({...templateData, destinatario: e.target.value})} 
                                    className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border border-gray-200"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1 mb-1">Fecha</label>
                                    <input 
                                        type="date" 
                                        value={templateData.fechaReunion} 
                                        onChange={e => setTemplateData({...templateData, fechaReunion: e.target.value})} 
                                        className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border border-gray-200 text-gray-600"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1 mb-1">Hora</label>
                                    <input 
                                        type="time" 
                                        value={templateData.horaReunion} 
                                        onChange={e => setTemplateData({...templateData, horaReunion: e.target.value})} 
                                        className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border border-gray-200 text-gray-600"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase block ml-1 mb-1">Modalidad</label>
                                <select 
                                    value={templateData.modalidad} 
                                    onChange={e => setTemplateData({...templateData, modalidad: e.target.value})} 
                                    className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border border-gray-200 text-gray-600"
                                >
                                    <option value="Presencial en la Institución">Presencial</option>
                                    <option value="Virtual (Se enviará enlace)">Virtual (Meet/Zoom)</option>
                                </select>
                            </div>
                        </div>
                        <button 
                            onClick={aplicarPlantillaReunion} 
                            className="w-full mt-2 bg-blue-600 text-white py-2 rounded-xl font-bold text-xs uppercase shadow-md hover:bg-blue-700"
                        >
                            Generar Texto
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Fecha Arriba</label>
                    <input type="text" value={notaData.date} onChange={e => setNotaData({...notaData, date: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-gray-100"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Firma Abajo</label>
                    <input type="text" value={notaData.signature} onChange={e => setNotaData({...notaData, signature: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-violet-700 text-xs border border-gray-100"/>
                  </div>
                </div>
                
                <div className="bg-violet-50 p-4 rounded-3xl space-y-4">
                  <div className="flex gap-2">
                    {[{l:'Chica', v:'text-[11px]'}, {l:'Media', v:'text-[14px]'}, {l:'Grande', v:'text-[18px]'}].map(s => (
                      <button key={s.v} onClick={() => setNotaData({...notaData, fontSize: s.v})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${notaData.fontSize === s.v ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-violet-400'}`}>{s.l}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNotaData({...notaData, isPrintMode: false})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${!notaData.isPrintMode ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-400'}`}>🎨 COLOR</button>
                    <button onClick={() => setNotaData({...notaData, isPrintMode: true})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${notaData.isPrintMode ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-400'}`}>🖨️ BLANCO</button>
                  </div>
                  {/* ALINEACIÓN DE TEXTO */}
                  <div className="flex gap-2 justify-center pt-2 border-t border-violet-200/50">
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-left'})} className={`p-2 rounded-lg transition-colors ${notaData.textAlign === 'text-left' ? 'bg-violet-200 text-violet-800' : 'text-violet-400 hover:bg-violet-100'}`} title="Izquierda"><AlignLeft size={16}/></button>
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-center'})} className={`p-2 rounded-lg transition-colors ${notaData.textAlign === 'text-center' ? 'bg-violet-200 text-violet-800' : 'text-violet-400 hover:bg-violet-100'}`} title="Centro"><AlignCenter size={16}/></button>
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-justify'})} className={`p-2 rounded-lg transition-colors ${notaData.textAlign === 'text-justify' ? 'bg-violet-200 text-violet-800' : 'text-violet-400 hover:bg-violet-100'}`} title="Justificado"><AlignJustify size={16}/></button>
                  </div>
                </div>

                <input type="text" placeholder="TÍTULO DE LA NOTA" value={notaData.title} onChange={e => setNotaData({...notaData, title: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-black uppercase text-gray-700 border-2 border-transparent focus:border-orange-200 shadow-inner"/>
                <textarea value={notaData.body} onChange={e => setNotaData({...notaData, body: e.target.value})} placeholder="Escribe tu comunicado aquí o usa la plantilla de arriba..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm border-2 border-transparent focus:border-pink-200 h-[250px] resize-none font-medium text-gray-600 shadow-inner custom-scrollbar"/>
              </div>

              {/* LADO DE VISTA PREVIA (CANVAS) */}
              <div className="flex-1 bg-slate-100 flex flex-col items-center justify-center p-6 md:p-10 relative overflow-hidden">
                <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.8] xl:scale-[0.95] origin-top transition-all">
                  <div id="nota-canvas" className={`w-[600px] min-h-[400px] relative shadow-2xl rounded-[15px] flex flex-col overflow-hidden transition-all duration-300 ${notaData.isPrintMode ? 'bg-white border-[10px] border-gray-200' : 'bg-[#fefce8] border-[10px] border-white'}`} style={{ height: 'auto' }}>
                    {!notaData.isPrintMode && <div className="absolute inset-0 opacity-[0.04]" style={{backgroundImage: 'radial-gradient(#f97316 2px, transparent 2px)', backgroundSize: '18px 18px'}}></div>}
                    <div className={`absolute top-0 left-0 right-0 h-3 opacity-80 ${notaData.isPrintMode ? 'bg-gray-300' : 'bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400'}`}></div>
                    
                    <div className="flex flex-col h-full px-12 pt-10 pb-12 z-10">
                      <div className="flex justify-between items-start mb-6 shrink-0 text-gray-800">
                        <div className="flex items-center gap-4">
                          <img src={LOGO_SIN_FONDO} className="w-16 h-auto mix-blend-multiply" crossOrigin="anonymous"/>
                          <div className="leading-tight pt-1">
                            <h2 className="font-black text-[16px] text-violet-900 uppercase tracking-[2px]">JUNTOS A LA PAR</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-center">ESCUELA ESPECIAL</p>
                          </div>
                        </div>
                        <p className={`text-[12px] font-black uppercase pt-2 ${notaData.isPrintMode ? 'text-gray-400' : 'text-orange-600'}`}>{notaData.date}</p>
                      </div>
                      
                      <h1 className="text-2xl font-black text-gray-800 uppercase leading-tight mb-6 text-center">{notaData.title || 'COMUNICADO'}</h1>
                      
                      <div className="flex-1 w-full mb-10">
                        <div className={`text-slate-700 font-bold whitespace-pre-wrap leading-relaxed break-words w-full px-8 ${notaData.fontSize} ${notaData.textAlign}`} style={{ maxWidth: '540px', margin: '0 auto', wordSpacing: '0.15em', letterSpacing: '0.01em', textRendering: "optimizeLegibility" }}>
                          {notaData.body || 'Vista previa del mensaje...'}
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col items-center shrink-0">
                        <div className="w-48 h-[1px] bg-orange-200 mb-4 opacity-50"></div>
                        <p className="text-[16px] font-black text-violet-800 uppercase text-center italic">{notaData.signature}</p>
                        <p className={`text-[9px] font-black uppercase tracking-[3px] opacity-70 ${notaData.isPrintMode ? 'text-gray-400' : 'text-orange-500'}`}>ESCUELA JUNTOS A LA PAR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t bg-white shrink-0 z-20 shadow-2xl">
              <div className="flex gap-4 max-w-4xl mx-auto">
                <button onClick={() => setShowNotaModal(false)} className="flex-1 text-gray-400 font-black text-xs uppercase py-4">VOLVER</button>
                <button 
                  onClick={async () => {
  if(!notaData.title && !notaData.body) return alert("Escribí algo.");
  
  const element = document.getElementById('nota-canvas');
  
  try {
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;
    
    // OPCIONES ANTI-ENCIMAMIENTO PARA MÓVILES
    const canvas = await html2canvas(element, { 
      scale: 2, // Bajamos a 2 para que el móvil procese más rápido sin perder calidad
      useCORS: true, 
      allowTaint: true,
      backgroundColor: notaData.isPrintMode ? '#ffffff' : '#fefce8', 
      logging: false,
      // EL SECRETO: Forzamos el ancho para que no dependa de la pantalla del celu
      width: 600,
      windowWidth: 600, 
      onclone: (clonedDoc) => {
        const container = clonedDoc.getElementById('nota-canvas');
        // Quitamos cualquier restricción de altura y forzamos el renderizado
        container.style.transform = "none";
        container.style.width = "600px";
        
        const txt = container.querySelector('.whitespace-pre-wrap');
        if (txt) { 
          // Limpiamos estilos que causan encimamiento en móviles
          txt.style.wordSpacing = 'normal'; 
          txt.style.letterSpacing = 'normal';
          txt.style.lineHeight = '1.6';
          txt.style.paddingLeft = '40px';
          txt.style.paddingRight = '40px';
          txt.style.display = "block";
          txt.style.width = "100%";
        }
      }
    }); 

    // Convertimos a imagen y descargamos
    const imgData = canvas.toDataURL('image/jpeg', 0.9);
    const link = document.createElement('a');
    link.download = `Nota_${(notaData.title || 'Nota').substring(0,10)}.jpg`;
    link.href = imgData;
    link.click();
    
  } catch (error) { 
    console.error(error);
    alert("Error al generar imagen. Intenta de nuevo."); 
  }
}}
                  className="flex-[3] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-black text-sm uppercase tracking-[4px] rounded-2xl shadow-xl hover:scale-[1.02] transition py-4 flex items-center justify-center gap-2"
                >
                  <Download size={20}/> DESCARGAR NOTA OFICIAL
                </button>
              </div>
            </div>
          </div> 
        </div>
      )}
    </div>
  );
}
// --- VISTA TAREAS (VERSIÓN UNIFICADA Y CORREGIDA) ---
function TasksView({ tasks = [], user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [viewMode, setViewMode] = useState('mine'); 
  const [filter, setFilter] = useState('pending'); 
  const [editingTask, setEditingTask] = useState(null); 
  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsersObj, setSelectedUsersObj] = useState([]); 
  const [userSearch, setUserSearch] = useState("");
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor', 'DAI', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];

  if (!user) return <div className="p-10 text-center opacity-50 font-black uppercase italic text-violet-900">Cargando...</div>;

  const isSuperAdmin = ['admin', 'super-admin', 'Equipo Directivo'].includes(user.role || user.rol);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (editingTask && editingTask.targetType === 'user' && usersList.length > 0) {
      const ids = editingTask.targetUserIds || (editingTask.targetUserId ? [editingTask.targetUserId] : []);
      setSelectedUsersObj(usersList.filter(u => ids.includes(u.id)));
    }
  }, [editingTask, usersList]);

  const getFunnyCountdown = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(dateStr + 'T12:00:00'); due.setHours(0,0,0,0);
    const days = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
    if (isNaN(days)) return null;
    if (days < 0) return { text: "Vencida", color: "bg-red-100 text-red-700" };
    if (days === 0) return { text: "¡HOY!", color: "bg-red-500 text-white animate-pulse" };
    return { text: `Faltan ${days} días`, color: "bg-green-50 text-green-700" };
  };

 // BUSCÁ ESTA LÍNEA (alrededor de la 1320):
const handleSaveTask = async (e) => {  // <--- ASEGURATE QUE DIGA "async" AQUÍ
    e.preventDefault();
    if (!db || !appId) return alert("Error: DB no lista");
    const fd = new FormData(e.target);
    const taskData = {
      title: fd.get('title') || "Sin título",
      dueDate: fd.get('dueDate') || null,
      showDate: fd.get('showDate') || new Date().toISOString().split('T')[0],
      showTime: fd.get('showTime') || "08:00",
      priority: fd.get('priority') || "media",
      targetType: assignType,
      targetUserIds: selectedUsersObj.map(u => u.id),
      targetRoles: selectedRoles,
      assignedToName: assignType === 'user' ? selectedUsersObj.map(u => u.firstName || u.fullName).join(", ") : selectedRoles.join(", "),
    };

    try {
      if (editingTask && editingTask.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
          ...taskData, createdByName: user.firstName || user.fullName || 'Directivo', createdById: user.id, status: 'pending', createdAt: serverTimestamp(), comments: []
        });

        // --- LÓGICA DE PUNTOS DE MAYO (La que causaba el error) ---
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(5) });
        }
      }
      setShowModal(false); setEditingTask(null); setSelectedUsersObj([]); setSelectedRoles([]);
      alert("✅ Tarea guardada");
    } catch (err) { alert("Error al guardar: " + err.message); }
};

   

  const toggleUserSelection = (u) => {
    if (selectedUsersObj.some(sel => sel.id === u.id)) setSelectedUsersObj(prev => prev.filter(sel => sel.id !== u.id));
    else setSelectedUsersObj(prev => [...prev, u]);
    setUserSearch(""); 
  };

 const handleAddComment = async (taskId, comments = []) => {
    if (!newComment.trim()) return;
    const comment = {
      id: Date.now().toString(),
      text: newComment,
      author: user.firstName || user.fullName || 'Usuario',
      date: new Date().toLocaleString('es-AR')
    };
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
        comments: [...(comments || []), comment]
      });

      // --- PARCHE PUNTOS MAYO ---
      if (new Date() >= new Date('2026-05-01')) {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
          await updateDoc(userRef, { score: increment(5) });
      }
      // --------------------------

      setNewComment("");
      alert("💬 Respuesta enviada (+5 pts)");
    } catch (err) { alert(err.message); }
  };

  const visibleTasks = (tasks || []).filter(t => {
    if (!t) return false;
    const isMine = (t.createdById === user.id || (t.targetUserIds && t.targetUserIds.includes(user.id)) || (user.role && t.targetRoles && t.targetRoles.includes(user.role)));
    const now = new Date();
    const taskShowDate = t.showDate ? new Date(t.showDate + 'T' + (t.showTime || '00:00')) : null;
    if (taskShowDate && taskShowDate > now && t.createdById !== user.id && !isSuperAdmin) return false;
    if (isSuperAdmin && viewMode === 'all') return filter === 'completed' ? t.status === 'completed' : t.status !== 'completed';
    return filter === 'completed' ? (t.status === 'completed' && isMine) : (t.status !== 'completed' && isMine);
  }).sort((a,b) => (a.dueDate || '9999') > (b.dueDate || '9999') ? 1 : -1);

  const changeStatus = async (task, newStatus) => {
    if (newStatus === 'completed' && !confirm("¿Tarea terminada?")) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus });
  };

  const handleDelete = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };

  return (
    <div className="space-y-4 pb-20 animate-in fade-in">
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm rounded-b-3xl flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-violet-900 uppercase italic">Tareas</h2>
          <div className="flex gap-2 mt-1">
            <button onClick={() => setFilter('pending')} className={`text-[10px] px-2 py-1 rounded-lg font-bold ${filter==='pending'?'bg-violet-100 text-violet-700':'text-gray-400'}`}>Activas</button>
            <button onClick={() => setFilter('completed')} className={`text-[10px] px-2 py-1 rounded-lg font-bold ${filter==='completed'?'bg-green-100 text-green-700':'text-gray-400'}`}>Listas</button>
            {isSuperAdmin && (
              <button onClick={() => setViewMode(viewMode === 'mine' ? 'all' : 'mine')} className={`text-[10px] px-2 py-1 rounded-lg font-bold border ${viewMode === 'all' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {viewMode === 'mine' ? '👤 Mis Tareas' : '👁️ Auditoría'}
              </button>
            )}
          </div>
        </div>
        <button onClick={() => { setEditingTask(null); setSelectedUsersObj([]); setShowModal(true); }} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg transition-all active:scale-95"><Plus size={20}/></button>
      </div>

      <div className="grid gap-3 px-2">
        {visibleTasks.map(t => (
          <div key={t.id} className={`p-5 rounded-[30px] bg-white border-l-8 shadow-sm transition-all ${openCommentsId === t.id ? 'ring-2 ring-violet-200' : ''} ${t.priority === 'alta' ? 'border-red-500' : 'border-violet-500'}`}>
            <div className="flex justify-between items-start">
              <div className="flex-1 pr-6">
                <div className="flex flex-wrap gap-2 mb-1">
                   <p className="text-[9px] font-black text-violet-600 uppercase bg-violet-50 px-2 py-0.5 rounded-md border border-violet-100">Para: {t.assignedToName}</p>
                   <p className="text-[9px] font-black text-gray-400 uppercase bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">Por: {t.createdByName || 'Directivo'}</p>
                </div>
                {t.showDate && new Date(t.showDate + 'T' + (t.showTime || '08:00')) > new Date() && (
                  <span className="text-[8px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-black uppercase mb-1 inline-block border border-blue-200">⏳ Programada</span>
                )}
                <h3 className={`font-bold text-gray-800 text-sm uppercase italic leading-tight ${t.status==='completed'?'line-through opacity-50':''}`}>{t.title}</h3>
                {t.dueDate && (
                  <div className="mt-2">
                    <p className="text-[10px] font-bold text-gray-400 flex items-center gap-1"><CalendarIcon size={12}/> Vence {new Date(t.dueDate + 'T12:00:00').toLocaleDateString('es-AR')}</p>
                    {getFunnyCountdown(t.dueDate) && <div className={`inline-block px-2 py-0.5 rounded text-[9px] font-black mt-1 ${getFunnyCountdown(t.dueDate).color}`}>{getFunnyCountdown(t.dueDate).text}</div>}
                  </div>
                )}
              </div>
              <div className="flex gap-1">
                {(t.createdById === user.id || isSuperAdmin) && (
                  <>
                    <button onClick={() => { setEditingTask(t); setAssignType(t.targetType || 'user'); setShowModal(true); }} className="p-2 bg-gray-50 rounded-full text-blue-500 hover:bg-blue-50"><Edit3 size={14}/></button>
                    <button onClick={() => handleDelete(t.id)} className="p-2 bg-gray-50 rounded-full text-red-400 hover:bg-red-50"><Trash2 size={14}/></button>
                  </>
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-gray-50 flex justify-between items-center">
              <button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className="flex items-center gap-1.5 group">
                <div className="bg-gray-100 p-2 rounded-xl group-hover:bg-violet-100 transition-colors">
                  <MessageSquare size={16} className="text-gray-400 group-hover:text-violet-600"/>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.comments?.length || 0} msjs</span>
              </button>
              
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
                {['pending', 'completed'].map(st => (
                  <button key={st} onClick={() => changeStatus(t, st)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${t.status===st ? (st==='completed'?'bg-green-500 text-white shadow-md':'bg-white shadow text-violet-700') : 'text-gray-400'}`}>{st==='pending'?'Pend.':'Listo'}</button>
                ))}
              </div>
            </div>

            {openCommentsId === t.id && (
              <div className="mt-4 bg-violet-50/50 rounded-2xl p-4 animate-in slide-in-from-top-2 border border-violet-100">
                <div className="space-y-3 max-h-40 overflow-y-auto mb-4 pr-2 custom-scrollbar">
                  {(t.comments || []).map(c => (
                    <div key={c.id} className="bg-white p-3 rounded-2xl shadow-sm border border-violet-50">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-violet-700 uppercase italic">{c.author}</span>
                        <span className="text-[8px] font-bold text-gray-400">{c.date}</span>
                      </div>
                      <p className="text-xs text-gray-600 font-medium leading-relaxed">{c.text}</p>
                    </div>
                  ))}
                  {(!t.comments || t.comments.length === 0) && <p className="text-[10px] text-center font-bold text-gray-400 uppercase py-4 italic">Sin mensajes todavía</p>}
                </div>
                <div className="flex gap-2">
                  <input 
                    value={newComment} 
                    onChange={e => setNewComment(e.target.value)} 
                    placeholder="Escribir mensaje..." 
                    className="flex-1 p-3 bg-white rounded-xl text-xs font-bold outline-none border border-violet-100 focus:border-violet-300 shadow-inner"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddComment(t.id, t.comments)}
                  />
                  <button onClick={() => handleAddComment(t.id, t.comments)} className="bg-violet-600 text-white p-3 rounded-xl shadow-lg hover:bg-violet-700 transition-all">
                    <Send size={18}/>
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div> {/* ESTE DIV CIERRA LA GRILLA DE TAREAS (El fix) */}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveTask} className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl space-y-4 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingTask ? 'Editar' : 'Nueva'} Tarea</h3>
            <input name="title" defaultValue={editingTask?.title || ""} placeholder="¿Qué hay que hacer?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
              <button type="button" onClick={() => setAssignType('user')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assignType === 'user' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Persona</button>
              <button type="button" onClick={() => setAssignType('roles')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assignType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button>
            </div>
            {assignType === 'user' ? (
              <div className="space-y-2 relative">
                <input placeholder="🔍 Buscar personas..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-violet-200 transition-all" />
                {userSearch.length > 0 && (
                  <div className="absolute z-[120] w-full bg-white border shadow-xl rounded-2xl max-h-48 overflow-y-auto p-2 top-full mt-1 animate-in slide-in-from-top-2">
                    {usersList.filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                      <button key={u.id} type="button" onClick={() => toggleUserSelection(u)} className="w-full text-left p-3 hover:bg-violet-50 rounded-xl flex justify-between items-center transition-colors">
                        <span className="font-bold text-xs text-gray-700">{u.fullName}</span>
                        <Plus size={14} className="text-violet-400" />
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                  {selectedUsersObj.map(u => (
                    <div key={u.id} className="bg-violet-100 text-violet-800 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 border border-violet-200">
                      {u.firstName || u.fullName.split(' ')[0]} 
                      <button type="button" onClick={() => toggleUserSelection(u)} className="hover:text-red-500 transition-colors"><X size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 p-4 rounded-2xl border max-h-32 overflow-y-auto">
                {ROLES_OPTIONS.map(role => (
                  <label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => e.target.checked ? setSelectedRoles([...selectedRoles, role]) : setSelectedRoles(selectedRoles.filter(r => r !== role))} className="accent-violet-600"/> {role}</label>
                ))}
              </div>
            )}
            <div className="bg-orange-50 p-4 rounded-3xl space-y-2 border border-orange-100">
              <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest ml-1">Programar Aparición</p>
              <div className="grid grid-cols-2 gap-3">
                <input name="showDate" type="date" defaultValue={editingTask?.showDate || new Date().toISOString().split('T')[0]} className="p-2 bg-white rounded-xl text-xs font-bold outline-none" />
                <input name="showTime" type="time" defaultValue={editingTask?.showTime || "08:00"} className="p-2 bg-white rounded-xl text-xs font-bold outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Vencimiento</label><input name="dueDate" type="date" defaultValue={editingTask?.dueDate} className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold outline-none" /></div>
              <div><label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Prioridad</label>
                <select name="priority" defaultValue={editingTask?.priority || "media"} className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold text-orange-600 outline-none">
                  <option value="baja">🟢 Baja</option><option value="media">🟠 Media</option><option value="alta">🔴 Alta</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-4">
              <button type="button" onClick={() => {setShowModal(false); setEditingTask(null);}} className="flex-1 text-gray-400 font-bold text-xs uppercase py-3">Cerrar</button>
              <button type="submit" className="flex-1 bg-violet-800 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
      
// --- VISTA CALENDARIO (FINAL: IMÁGENES + GUARDADO FIX) ---
function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState('TODOS'); 
  
  // MODO DE CALENDARIO
  const [calendarMode, setCalendarMode] = useState('general'); // 'general' | 'technical'

  // ESTADOS PARA CARGA RÁPIDA Y FOTOS
  const [showQuickLoad, setShowQuickLoad] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // PERMISOS
  const isTechTeam = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Equipo Técnico Inclusión', 'Dirección Inclusión'].includes(user.role);
  // PERMISO DE EDICIÓN GENERAL: Ahora es TRUE para todos en modo general
  const canAddGeneral = true; 

  const EVENT_TYPES = {
      'FERIADO': { color: 'bg-red-200 text-red-900 border-red-400', label: 'Feriado' },
      'ACTO': { color: 'bg-orange-100 text-orange-900 border-orange-400', label: 'Actos' },
      'CUMPLEAÑOS': { color: 'bg-yellow-100 text-yellow-900 border-yellow-400', label: 'Cumples' },
      'SALIDAS EDUCATIVAS': { color: 'bg-lime-100 text-lime-900 border-lime-400', label: 'Salidas' },
      'ENCUENTROS CON FAMILIAS': { color: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300', label: 'Familias' },
      'REUNIONES': { color: 'bg-violet-100 text-violet-900 border-violet-400', label: 'Reuniones' },
      'CALENDARIO ACADÉMICO': { color: 'bg-blue-100 text-blue-900 border-blue-400', label: 'Académico' },
      'EFEMÉRIDES': { color: 'bg-cyan-100 text-cyan-900 border-cyan-400', label: 'Efemérides' },
      'TAREAS ADMINISTRATIVAS': { color: 'bg-zinc-200 text-zinc-800 border-zinc-400', label: 'Admin' },
      'TECNICO': { color: 'bg-teal-100 text-teal-900 border-teal-400', label: '🔒 Técnico' }, 
      'GENERAL': { color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'General' },
  };

  // --- SWIPE ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50; 

  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      if (distance > minSwipeDistance) changeMonth(1);
      if (distance < -minSwipeDistance) changeMonth(-1);
  };
  
  const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(new Date(d)); };
  
  const handleDayClick = (dateStr) => {
      const eventsOnDay = events.filter(e => {
          if (e.date !== dateStr) return false;
          if (e.type === 'TECNICO') return isTechTeam && calendarMode === 'technical';
          return calendarMode === 'general';
      });
      // Abrimos el modal si hay eventos o si el usuario puede agregar (que ahora son todos en general)
      if (eventsOnDay.length > 0 || (calendarMode === 'general' || isTechTeam)) {
          setSelectedDayEvents({ date: dateStr, events: eventsOnDay });
      }
  };

  const handlePhotoChange = (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload=(ev)=>{
          const img=new Image();
          img.onload=()=>{
              const c=document.createElement('canvas');
              const MAX_WIDTH = 800; // Un poco más grande para que se vea bien la invitación
              const s = img.width > MAX_WIDTH ? MAX_WIDTH/img.width : 1;
              c.width=img.width * s; c.height=img.height*s;
              const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
              setPhotoPreview(c.toDataURL('image/jpeg',0.8));
              setUploading(false);
          };
          img.src=ev.target.result;
      };
      reader.readAsDataURL(f);
  };

  const deleteEvent = async (id) => {
      // Solo permitimos borrar si es el autor, o si es admin/directivo
      if(confirm("¿Eliminar este evento?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
          if(selectedDayEvents) {
              const updated = selectedDayEvents.events.filter(e => e.id !== id);
              if (updated.length === 0 && !(calendarMode === 'general' || isTechTeam)) setSelectedDayEvents(null);
              else setSelectedDayEvents({ ...selectedDayEvents, events: updated });
          }
      }
  };

const handleSaveEvent = async (e) => {
      e.preventDefault(); 
      const fd = new FormData(e.target);
      const formType = fd.get('type');
      const finalType = (calendarMode === 'technical') ? 'TECNICO' : formType;

      // ASEGURAMOS QUE imageUrl SEA SIEMPRE UN STRING
      const imgUrl = photoPreview || editingEvent?.imageUrl || '';

      const data = { 
          title: fd.get('title') || 'Sin título', 
          date: fd.get('date'), 
          type: finalType || 'GENERAL', 
          description: fd.get('description') || '', 
          author: user.firstName || 'Usuario',
          imageUrl: String(imgUrl) 
      };
      
      try {
          setProcessing(true); // Bloqueamos para evitar doble clic
          if (editingEvent?.id) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id), data);
              if (selectedDayEvents) {
                  const updatedEvents = selectedDayEvents.events.map(ev => ev.id === editingEvent.id ? { ...ev, ...data } : ev);
                  setSelectedDayEvents({ ...selectedDayEvents, events: updatedEvents });
              }
          } else {
              const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { 
                ...data, 
                createdAt: serverTimestamp() 
              });
              
              if (selectedDayEvents) {
                 const newEventLocal = { id: docRef.id, ...data };
                 setSelectedDayEvents({ ...selectedDayEvents, events: [...selectedDayEvents.events, newEventLocal] });
              }
          }
          setShowModal(false); 
          setEditingEvent(null);
          setPhotoPreview(null);
      } catch (err) {
          console.error("Error detallado:", err);
          alert("Error al guardar: " + err.message);
      } finally {
          setProcessing(false);
      }
  };

const handleQuickSave = async () => {
      if (!quickText.trim()) return;
      setProcessing(true);
      try {
          const lines = quickText.split('\n').filter(line => line.trim() !== '');
          const validTypes = Object.keys(EVENT_TYPES); 

          // Filtramos primero las líneas válidas para que el array de promesas no tenga NULLs
          const validLines = lines.map(line => {
              const match = line.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s+(.+)$/);
              if (!match) return null;
              return { match, line };
          }).filter(Boolean);

          const promises = validLines.map(item => {
              let [_, day, month, year, rawText] = item.match;
              if (year.length === 2) year = "20" + year;
              const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              let finalType = 'GENERAL';
              let finalTitle = rawText.trim();

              for (const type of validTypes) {
                  // Verificamos que finalTitle exista antes de usar includes/indexOf
                  if (finalTitle && finalTitle.toUpperCase().includes(type)) {
                      finalType = type;
                      finalTitle = finalTitle.replace(new RegExp(`\\(?\\b${type}\\b\\)?`, 'i'), '').trim();
                      finalTitle = finalTitle.replace(/^[:\-\s]+|[:\-\s]+$/g, '');
                      break; 
                  }
              }
              
              if (!finalTitle) finalTitle = finalType;

              return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { 
                title: String(finalTitle), 
                date: isoDate, 
                type: finalType, 
                description: 'Carga masiva', 
                author: String(user.firstName), 
                imageUrl: '', 
                createdAt: serverTimestamp() 
              });
          });

          await Promise.all(promises);
          alert(`✅ Se agregaron ${promises.length} eventos.`);
          setShowQuickLoad(false); 
          setQuickText("");
      } catch (e) { 
          alert("Error en carga masiva: " + e.message); 
      } finally { 
          setProcessing(false); 
      }
  };
  
  const openNew = () => { setEditingEvent(null); setPhotoPreview(null); setShowModal(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setPhotoPreview(ev.imageUrl || null); setShowModal(true); };

  const renderGrid = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const days = []; const firstDay = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100"></div>);
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => {
          if (e.date !== dateStr) return false;
          const isPrivate = e.type === 'TECNICO';
          if (isPrivate) return isTechTeam && calendarMode === 'technical';
          if (calendarMode === 'technical') return false; 
          if (filterType !== 'TODOS' && e.type !== filterType) return false;
          return true;
      });
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr)} className={`relative border-b border-r border-gray-100 p-1 transition flex flex-col group cursor-pointer ${isToday ? 'bg-violet-50' : 'bg-white hover:bg-gray-50'}`}>
          <div className="flex justify-center"><span className={`text-[10px] md:text-sm w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500'}`}>{d}</span></div>
          <div className="flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar flex-1">{dayEvents.map((ev, idx) => { const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color; return (<div key={idx} className={`text-[9px] md:text-xs rounded-[3px] px-1 py-0.5 truncate font-bold uppercase border-l-2 shadow-sm flex items-center justify-between ${style}`}><span>{ev.title}</span>{ev.imageUrl && <span className="opacity-50 text-[8px]">📷</span>}</div>); })}</div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in select-none relative">
      <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
             <h2 className="text-xl md:text-2xl font-black text-violet-900 uppercase italic tracking-tighter">{currentDate.toLocaleDateString('es-ES', { month: 'long' })} <span className="text-gray-400 text-sm md:text-lg not-italic font-medium">{currentDate.getFullYear()}</span></h2>
             {isTechTeam && (<div className="flex bg-gray-100 p-1 rounded-lg"><button onClick={() => setCalendarMode('general')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${calendarMode === 'general' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>General</button><button onClick={() => setCalendarMode('technical')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${calendarMode === 'technical' ? 'bg-white shadow text-teal-600' : 'text-gray-400'}`}>Técnico</button></div>)}
        </div>
        <div className="flex gap-2">
             <div className="flex bg-gray-100 rounded-lg p-0.5"><button onClick={() => changeMonth(-1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronLeft size={16}/></button><button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs md:text-sm font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">HOY</button><button onClick={() => changeMonth(1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronRight size={16}/></button></div>
             {/* BOTONES DISPONIBLES PARA TODOS EN MODO GENERAL */}
             {(canAddGeneral || (isTechTeam && calendarMode === 'technical')) && (
                 <div className="flex gap-1">
                     <button onClick={() => setShowQuickLoad(!showQuickLoad)} className={`p-2 rounded-lg shadow transition ${showQuickLoad ? 'bg-yellow-400 text-white' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`} title="Carga Rápida"><span className="font-bold text-lg leading-none">⚡</span></button>
                     <button onClick={openNew} className="bg-orange-500 text-white p-2 rounded-lg shadow hover:bg-orange-600 transition"><Plus size={20}/></button>
                 </div>
             )}
        </div>
      </div>

      {calendarMode === 'general' && (<div className="flex gap-2 overflow-x-auto p-2 bg-gray-50 border-b border-gray-200 no-scrollbar"><button onClick={() => setFilterType('TODOS')} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === 'TODOS' ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>Todos</button>{Object.keys(EVENT_TYPES).filter(t => t !== 'TECNICO').map(type => (<button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === type ? `${EVENT_TYPES[type].color} ring-1 ring-offset-1` : 'bg-white text-gray-400 border-gray-200'}`}>{EVENT_TYPES[type].label}</button>))}</div>)}
      {calendarMode === 'technical' && (<div className="bg-teal-50 border-b border-teal-100 p-2 text-center text-teal-800 text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2"><Lock size={12}/> Agenda Privada Equipo Técnico</div>)}
      
      {showQuickLoad && (<div className="bg-yellow-50 p-4 border-b border-yellow-200 animate-in slide-in-from-top-5"><div className="flex justify-between items-center mb-2"><h3 className="font-bold text-yellow-800 text-xs uppercase flex items-center gap-2">⚡ Carga Masiva Inteligente</h3><button onClick={() => setShowQuickLoad(false)}><X size={16} className="text-yellow-600"/></button></div><p className="text-[10px] text-yellow-700 mb-2 leading-relaxed">Pega tu lista abajo. Para asignar color, escribe la palabra clave (ej: FERIADO, ACTO, REUNIONES) junto al título.<br/>Ej: <b>10/02/2026 Carnaval (FERIADO)</b></p><textarea value={quickText} onChange={(e) => setQuickText(e.target.value)} className="w-full h-32 p-3 rounded-xl border border-yellow-300 text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none bg-white" placeholder="12/03/2026 Inicio de clases (CALENDARIO ACADÉMICO)&#10;25/05/2026 Revolución de Mayo (ACTO)"/><button onClick={handleQuickSave} disabled={processing} className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-xl text-xs uppercase shadow transition flex justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={14}/> : 'Procesar y Guardar'}</button></div>)}
      
      <div className="grid grid-cols-7 bg-white border-b border-gray-200 shrink-0">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="py-2 text-center text-[9px] md:text-xs font-black text-gray-300 uppercase tracking-widest">{d}</div>)}</div>
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-gray-50/30">{renderGrid()}</div>
      
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-black text-violet-900 uppercase italic">{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            {calendarMode === 'technical' && <div className="text-xs font-bold text-teal-600 bg-teal-50 p-2 rounded-lg text-center uppercase">Creando Evento Privado Técnico</div>}
            
            <input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-violet-300" />
            
            <div className="grid grid-cols-2 gap-3">
              <input name="date" type="date" defaultValue={editingEvent?.date || selectedDayEvents?.date} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border" />
              {calendarMode === 'general' ? (
                <select name="type" defaultValue={editingEvent?.type || 'GENERAL'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border uppercase">{Object.keys(EVENT_TYPES).filter(t => t !== 'TECNICO').map(t => <option key={t} value={t}>{t}</option>)}</select>
              ) : (
                <div className="w-full p-3 bg-teal-100 rounded-xl text-[10px] font-bold border border-teal-200 text-teal-800 flex items-center justify-center uppercase">Técnico</div>
              )}
            </div>
            
            <textarea name="description" defaultValue={editingEvent?.description} placeholder="Detalles..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-20 resize-none" />
            
            {/* SUBIDA DE FOTO PARA EL EVENTO */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 relative overflow-hidden flex flex-col items-center justify-center gap-2">
                {photoPreview || editingEvent?.imageUrl ? (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden border border-gray-300">
                        <img src={photoPreview || editingEvent?.imageUrl} className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md shadow-md"><X size={12}/></button>
                    </div>
                ) : (
                    <div className="text-center w-full py-4 text-gray-400">
                        <FileText size={24} className="mx-auto mb-1 opacity-50"/>
                        <span className="text-[10px] font-bold uppercase tracking-widest block">Agregar Flyer/Foto</span>
                    </div>
                )}
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                {uploading && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><RefreshCw className="animate-spin text-violet-500"/></div>}
            </div>

            <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => {setShowModal(false); setPhotoPreview(null);}} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDayEvents(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 sticky top-0 bg-white z-10 pt-2">
              <h2 className="text-lg font-black text-violet-900 uppercase italic">{new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
              <button onClick={() => setSelectedDayEvents(null)} className="p-1 bg-gray-100 rounded-full"><X size={18} className="text-gray-500"/></button>
            </div>
            
            {/* Botón AGREGAR en el detalle */}
            {(canAddGeneral || (isTechTeam && calendarMode === 'technical')) && <button onClick={()=>{ setEditingEvent({ date: selectedDayEvents.date }); setShowModal(true); }} className="w-full py-3 mb-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold text-xs hover:border-violet-400 hover:text-violet-600 transition flex items-center justify-center gap-2"><Plus size={14}/> Agregar Evento Aquí</button>}
            
            <div className="space-y-4 pb-4">
              {selectedDayEvents.events.length === 0 ? <p className="text-center text-gray-400 text-xs py-4">No hay eventos para este día.</p> : selectedDayEvents.events.map(ev => { 
                  const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color; 
                  return (
                    <div key={ev.id} className={`p-4 rounded-3xl border relative group overflow-hidden ${style}`}>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-white/50 border border-white/20 inline-block mb-2">{ev.type}</span>
                        <h3 className="font-bold text-base leading-tight pr-14">{ev.title}</h3>
                        
                        {/* IMAGEN DEL EVENTO SI EXISTE */}
                        {ev.imageUrl && (
                            <div className="mt-3 mb-2 rounded-xl overflow-hidden border border-black/10 max-h-48 relative">
                                <img src={ev.imageUrl} alt="Flyer" className="w-full object-cover" />
                                <button onClick={() => window.open(ev.imageUrl, '_blank')} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-md hover:bg-black/70 backdrop-blur-sm"><ExternalLink size={14}/></button>
                            </div>
                        )}
                        
                        {ev.description && <p className="text-xs opacity-90 mt-2 font-medium whitespace-pre-wrap leading-relaxed">{ev.description}</p>}
                        <p className="text-[9px] opacity-50 mt-3 pt-2 border-t border-black/5 text-right uppercase font-bold">Por: {ev.author || 'Sistema'}</p>
                        
                        {/* BOTONES EDICIÓN */}
                        {(user.firstName === ev.author || isTechTeam) && (
                            <div className="absolute top-3 right-3 flex gap-1">
                                <button onClick={() => openEdit(ev)} className="p-2 bg-white/50 hover:bg-white rounded-xl shadow-sm transition"><Edit3 size={14}/></button>
                                <button onClick={() => deleteEvent(ev.id)} className="p-2 bg-white/50 hover:bg-white text-red-600 rounded-xl shadow-sm transition"><Trash2 size={14}/></button>
                            </div>
                        )}
                    </div>
                  )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// --- VISTA PERFIL (CORREGIDA: BOTÓN MANTENIMIENTO) ---
function ProfileView({ user, tasks, onLogout, isSuperAdmin }) {
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  // CORRECCIÓN AQUÍ: MISMA RUTA QUE MAINAPP
  useEffect(() => {
      const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'), (d) => {
          if (d.exists()) setMaintenance(d.data().active);
      });
      return () => unsub();
  }, []);

  const toggleMaintenance = async () => {
      const newState = !maintenance;
      if(!confirm(`¿${newState ? 'ACTIVAR' : 'DESACTIVAR'} el Modo Mantenimiento?\n\nEsto bloqueará el acceso a todos los usuarios excepto Super Admin.`)) return;
      const { setDoc, doc: d } = await import('firebase/firestore');
      // CORRECCIÓN AQUÍ: GUARDA EN LA CARPETA CORRECTA
      await setDoc(d(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'), { active: newState }, { merge: true });
  };

  const activarNotificaciones = async () => {
    if (!("Notification" in window)) { alert("Tu dispositivo no soporta notificaciones."); return; }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        try { new Notification("¡Juntos a la Par!", { body: "Notificaciones activadas.", icon: '/icon-192.png' }); } catch (e) {}
        try {
            const { getMessaging, getToken } = await import("firebase/messaging");
            const messaging = getMessaging();
            const token = await getToken(messaging, { vapidKey: 'BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw' });
            if (token) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { fcmTokens: arrayUnion(token) });
        } catch (error) {}
        alert("✅ Permisos concedidos.");
    } else { alert("❌ Permiso denegado."); }
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
        
        {/* BOTÓN MODO MANTENIMIENTO */}
        {isSuperAdmin && (
            <button onClick={toggleMaintenance} className={`p-4 rounded-2xl shadow-xl flex items-center gap-4 hover:scale-[1.02] transition text-white border mt-4 ${maintenance ? 'bg-red-600 border-red-800 animate-pulse' : 'bg-gray-800 border-gray-900'}`}>
                <div className="bg-white/20 p-3 rounded-xl"><Settings size={24} /></div>
                <div className="text-left"><h4 className="font-bold">{maintenance ? 'DESACTIVAR MANTENIMIENTO' : 'ACTIVAR MANTENIMIENTO'}</h4><p className="text-xs opacity-80">{maintenance ? 'El sistema está BLOQUEADO' : 'Bloquear acceso a usuarios'}</p></div>
            </button>
        )}
      </div>
      
      <div className="mt-10 pt-6 border-t border-gray-100 opacity-50 pb-10"><p className="text-[9px] font-bold text-gray-400 uppercase tracking-[4px]">Creado por <a href="https://www.somosnomade.com.ar" target="_blank" className="hover:text-violet-600 transition">NOMADE</a></p></div>

      {showAdminUsers && (<div className="fixed inset-0 bg-violet-900/95 z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto"><div className="flex justify-between items-center text-white mb-8"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Administración Personal</h2><button onClick={() => setShowAdminUsers(false)}><X size={32} /></button></div><UsersAdminView /></div>)}
      {showAudit && (<div className="fixed inset-0 bg-gray-900/95 z-[200] flex flex-col p-6 animate-in slide-in-from-bottom duration-500 overflow-y-auto"><div className="flex justify-between items-center text-white mb-8"><h2 className="text-2xl font-black uppercase italic tracking-tighter">Auditoría Institucional</h2><button onClick={() => setShowAudit(false)}><X size={32} /></button></div><ActivityLogView /></div>)}
    </div>
  );
}

// --- VISTA ADMINISTRACIÓN DE USUARIOS (FINAL: PRO CON VINCULACIÓN MANUAL) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // ESTADOS PARA AUDITORÍA
  const [staffList, setStaffList] = useState([]); // <--- EL QUE FALTABA
  const [showMissingUsers, setShowMissingUsers] = useState(false);
  const [missingUsersList, setMissingUsersList] = useState([]); 
  const [missingLegajosList, setMissingLegajosList] = useState([]);
  const [manualLinks, setManualLinks] = useState({});

  

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, snap => setStaffList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        firstName: fd.get('firstName'), lastName: fd.get('lastName'), fullName: `${fd.get('firstName')} ${fd.get('lastName')}`,
        username: fd.get('username').toLowerCase(), password: fd.get('password'), role: fd.get('role'),
        rol: fd.get('isAdmin') === 'on' ? 'admin' : 'user'
    };
    try {
        if (editingUser) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser.id), data);
        } else {
            const qCheck = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', data.username));
            const check = await getDocs(qCheck);
            if (!check.empty) return alert("El usuario ya existe.");
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingUser(null);
    } catch(e) { alert("Error: " + e.message); }
  };

  // --- 1. DETECTAR QUIÉN FALTA (BIDIRECCIONAL INTELIGENTE) ---
  const checkMissingData = async () => {
      setProcessing(true);
      setManualLinks({}); // Resetear links manuales al auditar
      try {
          const legajosSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
          const legajos = legajosSnap.docs.map(d => ({id: d.id, ...d.data()}));
          
          const faltanCuentas = [];
          const faltanLegajos = [];

          const getWords = (str) => {
              if (!str) return [];
              return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\w+/g) || [];
          };

          const isSamePerson = (legajo, userAcc) => {
              if (legajo.dni && legajo.dni.length > 5 && (userAcc.password === legajo.dni || userAcc.username.includes(legajo.dni))) return true;
              const l_names = getWords(legajo.firstName);
              const l_lasts = getWords(legajo.lastName);
              const u_all = [...getWords(userAcc.firstName), ...getWords(userAcc.lastName)];
              return l_names.some(name => u_all.includes(name)) && l_lasts.some(last => u_all.includes(last));
          };

          legajos.forEach(legajo => {
              // Buscar primero si ya hay coincidencia automática
              const existe = users.find(u => isSamePerson(legajo, u));
              // Y descartamos también si ya lo vinculó manualmente la escuela antes (revisando si el usuario guardó su DNI)
              const yaVinculado = users.find(u => u.legajoId === legajo.id);
              
              if (!existe && !yaVinculado && legajo.firstName && legajo.lastName) {
                  faltanCuentas.push(legajo);
              }
          });

          users.forEach(u => {
              if (u.username === 'admin') return; 
              const existe = legajos.find(legajo => isSamePerson(legajo, u) || u.legajoId === legajo.id);
              if (!existe && u.firstName && u.lastName) faltanLegajos.push(u);
          });

          if (faltanCuentas.length === 0 && faltanLegajos.length === 0) {
              alert("✅ ¡Todo en orden! Base de datos 100% sincronizada.");
          } else {
              setMissingUsersList(faltanCuentas);
              setMissingLegajosList(faltanLegajos);
              setShowMissingUsers(true);
          }
      } catch(e) { alert("Error: " + e.message); }
      setProcessing(false);
  };

  // --- 2. VINCULACIÓN MANUAL (EL TINDER DE CUENTAS) ---
  const handleLinkManual = async (legajoId, userId) => {
      if(!userId) return;
      if(!confirm("¿Vincular este legajo con el usuario seleccionado?")) return;
      try {
          // Guardamos el ID del legajo dentro del usuario para que queden casados para siempre
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { legajoId: legajoId });
          
          // Lo sacamos de ambas listas de faltantes
          setMissingUsersList(prev => prev.filter(m => m.id !== legajoId));
          setMissingLegajosList(prev => prev.filter(m => m.id !== userId));
          alert("🔗 ¡Cuentas vinculadas exitosamente!");
      } catch (e) { alert("Error al vincular: " + e.message); }
  };

  // --- 3. CREACIÓN INDIVIDUAL (A DEMANDA) ---
  const handleCreateSingleUser = async (legajo) => {
      if(!confirm(`¿Crear un usuario NUEVO para ${legajo.firstName} ${legajo.lastName}?`)) return;
      
      const cleanName = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '');
      const newUsername = `${cleanName(legajo.firstName)}.${cleanName(legajo.lastName)}`;
      const newPassword = legajo.dni || '123456';

      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
              firstName: legajo.firstName, lastName: legajo.lastName, fullName: `${legajo.firstName} ${legajo.lastName}`,
              username: newUsername, password: newPassword, role: legajo.role || 'Docente', rol: 'user', 
              legajoId: legajo.id, // Queda vinculado desde el nacimiento
              createdAt: serverTimestamp()
          });
          setMissingUsersList(prev => prev.filter(m => m.id !== legajo.id));
      } catch (e) { alert("Error: " + e.message); }
  };

  const handleCreateSingleLegajo = async (userAcc) => {
      if(!confirm(`¿Crear legajo oficial en blanco para el usuario ${userAcc.firstName} ${userAcc.lastName}?`)) return;
      try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), {
              firstName: userAcc.firstName, lastName: userAcc.lastName, 
              dni: userAcc.password !== '123456' ? userAcc.password : '', 
              role: userAcc.role || 'Docente', modality: 'Sede', isSubsidized: 'false', createdAt: serverTimestamp()
          });
          // Lo vinculamos
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userAcc.id), { legajoId: docRef.id });
          setMissingLegajosList(prev => prev.filter(m => m.id !== userAcc.id));
      } catch (e) { alert("Error: " + e.message); }
  };

  const deleteUser = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); };
  const openEdit = (u) => { setEditingUser(u); setShowModal(true); };
  const analizarConflictos = () => alert("Función Detective: Próximamente buscará duplicados.");
  const filteredUsers = users.filter(u => (u.fullName||'').toLowerCase().includes(searchTerm.toLowerCase()));
  const formatLastLogin = (timestamp) => { if (!timestamp) return 'Nunca'; const date = new Date(timestamp.seconds * 1000); return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); };

  return (
   <div className="flex flex-col h-full bg-slate-50 p-4 rounded-3xl overflow-hidden animate-in fade-in">
    <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex justify-between items-center">
            <h3 className="text-violet-900 font-black text-lg uppercase tracking-tighter italic">Gestión de Personal</h3>
            <div className="flex gap-2">
               {/* BOTÓN AUDITOR */}
               <button onClick={checkMissingData} disabled={processing} className="p-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 transition flex items-center justify-center" title="Sincronizar Legajos y Usuarios">
                   {processing ? <RefreshCw className="animate-spin" size={20}/> : <Users size={20}/>}
               </button>
               <button onClick={()=>setShowImport(true)} className="p-2 bg-emerald-500 text-white rounded-xl shadow hover:bg-emerald-600 transition" title="Carga Masiva"><UploadCloud size={20}/></button>
               <button onClick={()=>{setEditingUser(null); setShowModal(true);}} className="p-2 bg-orange-500 text-white rounded-xl shadow hover:bg-orange-600 transition" title="Nuevo Usuario"><Plus size={20}/></button>
            </div>
        </div>
        <div className="bg-white p-3 rounded-xl flex items-center gap-2 border border-violet-100 shadow-sm"><Search className="text-gray-400 ml-1" size={18} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre..." className="bg-transparent border-none outline-none text-gray-700 text-sm w-full font-bold" /></div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"><button onClick={analizarConflictos} className="whitespace-nowrap px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-violet-200 transition">🕵️ Detective</button><button onClick={()=>setShowRenamer(true)} className="whitespace-nowrap px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-200 transition">🔄 Reemplazar</button></div>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pb-10">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{filteredUsers.length} Usuarios Encontrados</h3>
    {/* BUSCA ESTE BLOQUE EN UsersAdminView Y REEMPLAZALO */}
{filteredUsers.map(u => (
  <div key={u.id} className="bg-white p-3 rounded-xl flex items-center justify-between group shadow-sm border border-gray-100">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black text-sm shrink-0 relative">
          {u.firstName?.[0]}
          {u.rol === 'admin' && <div className="absolute -top-1 -right-1 bg-orange-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"><Shield size={8} className="text-white"/></div>}
      </div>
      <div className="min-w-0">
          <p className="font-bold text-sm text-gray-800 truncate">{u.fullName}</p>
          <div className="flex flex-wrap gap-2 items-center mt-0.5">
              <span className="text-[9px] text-white bg-violet-400 px-1.5 py-0.5 rounded font-bold uppercase">{u.role}</span>
              {/* ESTO ES LO NUEVO: MUESTRA EL ID PARA COPIAR */}
              <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono border border-blue-100 select-all" title="Hacé triple clic para copiar el ID">
                ID: {u.id}
              </span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 mt-1 italic">
            User: <span className="text-slate-600">{u.username}</span> | Legajo: {u.legajoId ? <span className="text-green-600">✅ VINCULADO</span> : <span className="text-red-400">❌ NO VINCULADO</span>}
          </p>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
        <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={16}/></button>
        {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>}
    </div>
  </div>
))}
    </div>

    {/* MODAL AUDITORÍA BIDIRECCIONAL A DEMANDA */}
    {showMissingUsers && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-4xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-blue-500">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-2xl font-black text-blue-600 uppercase italic flex items-center gap-2"><RefreshCw size={28}/> Auditoría de Personal</h3>
                        <p className="text-xs text-gray-500 font-bold mt-1">Vinculá cuentas existentes o creá las que faltan.</p>
                    </div>
                    <button onClick={() => setShowMissingUsers(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-2 mb-6">
                  {/* COLUMNA 1: TIENEN LEGAJO, NO SABEMOS SU CUENTA */}
                    <div>
                        <h4 className="font-black text-orange-600 uppercase text-xs tracking-widest mb-3 flex items-center gap-1"><FileText size={16}/> Legajos sin Usuario App ({missingUsersList.length})</h4>
                        {missingUsersList.length === 0 ? <p className="text-xs text-gray-400 italic">Todos tienen cuenta asignada.</p> : (
                            <div className="space-y-3">
                                {missingUsersList.map((m, i) => (
                                    <div key={i} className="bg-orange-50 p-4 rounded-2xl border border-orange-200 flex flex-col gap-3">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 leading-tight">{m.lastName}, {m.firstName}</p>
                                            <p className="text-[10px] text-orange-600 font-bold uppercase mt-0.5">{m.role || 'Docente'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                <select 
                                                    onChange={(e) => setManualLinks({...manualLinks, [m.id]: e.target.value})} 
                                                    className="w-full text-[10px] p-2 rounded-lg border border-orange-300 outline-none bg-white font-bold text-gray-600"
                                                >
                                                    <option value="">¿Ya tiene cuenta?</option>
                                                    {missingLegajosList.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                                </select>
                                                {manualLinks[m.id] && (
                                                    <button onClick={() => handleLinkManual(m.id, manualLinks[m.id])} className="bg-orange-500 text-white px-2 rounded-lg font-bold">OK</button>
                                                )}
                                            </div>
                                            <button onClick={() => handleCreateSingleUser(m)} className="bg-white border-2 border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-black text-[10px] uppercase shadow-sm hover:bg-orange-100 transition whitespace-nowrap">
                                                Crear Nueva
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUMNA 2: TIENEN CUENTA APP, PERO NO TIENEN EL LEGAJO VINCULADO */}
                    <div>
                        <h4 className="font-black text-violet-600 uppercase text-xs tracking-widest mb-3 flex items-center gap-1">
                            <Smartphone size={16}/> Usuarios por Vincular ({missingLegajosList.length})
                        </h4>
                        {missingLegajosList.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Todos los usuarios tienen su legajo conectado.</p>
                        ) : (
                            <div className="space-y-3">
                                {missingLegajosList.map((u, i) => (
                                    <div key={i} className="bg-violet-50 p-4 rounded-2xl border border-violet-200 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 leading-tight">{u.fullName}</p>
                                                <p className="text-[10px] text-violet-600 font-bold uppercase mt-0.5">{u.role || 'Usuario'}</p>
                                            </div>
                                            <span className="text-[8px] bg-white px-2 py-1 rounded border border-violet-200 font-mono">ID: {u.id.substring(0,6)}...</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                <select 
                                                    onChange={(e) => setManualLinks({...manualLinks, [u.id]: e.target.value})}
                                                    className="w-full text-[10px] p-2 rounded-lg border border-violet-300 outline-none bg-white font-bold text-gray-600"
                                                >
                                                    <option value="">Vincular a Legajo...</option>
                                                    {staffList.map(staff => (
                                                        <option key={staff.id} value={staff.id}>{staff.lastName}, {staff.firstName} ({staff.dni || 'S/D'})</option>
                                                    ))}
                                                </select>
                                                {manualLinks[u.id] && (
                                                    <button 
                                                        onClick={async () => {
                                                            if(confirm("¿Vincular?")) {
                                                                try {
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { legajoId: manualLinks[u.id] });
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', manualLinks[u.id]), { userId: u.id });
                                                                    alert("🔗 Vinculado");
                                                                    checkMissingData(); 
                                                                } catch(e) { alert(e.message); }
                                                            }
                                                        }}
                                                        className="bg-violet-600 text-white px-3 rounded-lg font-black text-[10px]"
                                                    >UNIR</button>
                                                )}
                                            </div>
                                            <button onClick={() => handleCreateSingleLegajo(u)} className="bg-white border border-violet-300 text-violet-700 px-2 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-violet-100 transition">NUEVO LEGAJO</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )}

    {showModal && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-violet-900 text-xl">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
            <div className="grid grid-cols-2 gap-2">
                <input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
                <input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            </div>
            <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none font-bold text-gray-600">
                {['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Inclusión', 'Profes Especiales', 'Administración', 'Médico', 'Dirección Inclusión', 'Equipo Técnico Inclusión', 'DAI'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} className="w-5 h-5 accent-violet-600"/>
                <div><span className="text-sm font-bold text-gray-700 block">Permisos Administrador</span></div>
            </div>
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 text-gray-400 text-xs font-bold uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg">Guardar</button>
            </div>
        </form>
      </div>
    )}

    {showImport && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-emerald-600 text-xl">Importación Masiva</h3>
            <textarea value={csvContent} onChange={e=>setCsvContent(e.target.value)} className="w-full h-40 p-3 border rounded-xl text-xs font-mono" placeholder="Juan,Perez,jperez,1234,Docente"/>
            <div className="flex gap-2">
                <button onClick={()=>setShowImport(false)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button>
                <button onClick={processBulkImport} disabled={processing} className="flex-1 py-3 bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">Procesar</button>
            </div>
        </div>
      </div>
    )}
  </div>
  );
}
  
// --- VISTA PROYECTO INSTITUCIONAL (FINAL: PAÍSES COMPLETOS + BANDERAS) ---
function ProyectoView({ user }) {
  const [periods, setPeriods] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';
  
  const PERIOD_NAMES = ["MARZO", "ABRIL Y MAYO", "JUNIO Y JULIO", "AGOSTO Y SEPTIEMBRE", "OCTUBRE Y NOVIEMBRE", "DICIEMBRE"];

  // --- BASE DE DATOS PROYECTO 2026 (INFO COMPLETA DEL PDF) ---
  const PROJECT_DATA_2026 = {
      "MARZO": {
          title: "Estación 1: Los Preparativos",
          narrativa: "Un grupo de estudiantes encuentra en la biblioteca del colegio el libro 'La vuelta al mundo en 80 días'. Lo leen y deciden emprender un viaje similar.",
          paises: "🧳 LOS PREPARATIVOS DEL VIAJE\n\n• Identidad: El nombre, el DNI, la historia personal.\n• Equipaje: Qué llevar, cómo organizarnos.\n• La Ruta: Armado del itinerario y calendario.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Escritura del nombre propio.\n- Lectura de listas.\n\n📌 Cs. Sociales:\n- Identidad y DNI.\n- Objetos personales.\n\n📌 Matemática:\n- Uso del calendario.\n- Medida (alturas).",
          actividades: "1. Confección del Pasaporte.\n2. Armado de la Valija Real.\n3. Medición de alturas.\n4. Foto Carnet.\n5. Circuito de Aeropuerto.",
          herramientas: "🧠 PEDAGÓGICAS:\n• El Pasaporte: Confección del librillo.\n• Lista de Viaje: Qué 5 cosas no pueden faltar.\n• Calendario de Ruta: Marcar salida y llegada.\n• DNI Gigante: Analizar sus partes.\n\n🖐️ SENSORIALES:\n• Reconocimiento Táctil: 'La Valija Ciega'.\n• Huella de Identidad: Pintarse el dedo.\n• El Peso del Equipaje: Pesado vs Liviano.\n• Sonidos Propios: 'Adivina quién habla'.\n\n🧱 CONCRETAS:\n• Armado de Valija Real: Doblar y guardar.\n• Medición de Alturas: Cintas en la pared.\n• Foto Carnet: Simular estudio.\n• Circuito de Aeropuerto: Mostrar pasaporte.\n\n🎨 ARTÍSTICAS:\n• Autorretrato: Frente al espejo.\n• Decoración de Valijas: Cajas con collage.\n• Collage del Nombre: Relleno con papeles.\n• Sellos de Manos: Mural colectivo."
      },
      "ABRIL_Y_MAYO": {
          title: "Estación 2: América",
          narrativa: "Llegan a nuestro continente. Tierra, raíces, maíz y selva.",
          paises: "🇦🇷 ARGENTINA (Nuestra Casa)\n• Capital: Buenos Aires.\n• Comida Típica: Mate y Asado/Empanadas.\n• Animal Típico: El Hornero (construye con barro).\n• Símbolos: El Obelisco, la Escarapela, el Tango.\n\n🇧🇷 BRASIL (Vecinos y Selva)\n• Capital: Brasilia.\n• Comida Típica: Frutas tropicales (Banana, Ananá), Feijoada.\n• Animal Típico: El Tucán / Guacamayo.\n• Símbolos: El Carnaval, el Cristo Redentor, la Samba.\n\n🇲🇽 MÉXICO (Colores y Tradición)\n• Capital: Ciudad de México.\n• Comida Típica: Tacos (Maíz), Chocolate.\n• Animal Típico: Águila Real / Perro Xoloitzcuintle.\n• Símbolos: Sombrero de Mariachi, Calaveras de colores, Pirámides.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Leyendas tradicionales.\n\n📌 Cs. Sociales:\n- Pueblos Originarios.\n- Paisajes naturales/humanizados.\n\n📌 Cs. Naturales:\n- Coberturas (plumas/pelo).\n- Semillas.",
          actividades: "1. Cocina: Chipá y Ensalada de Frutas.\n2. Nido de hornero (barro).\n3. Máscaras de Carnaval.\n4. Siembra.\n5. Pintura con tierra.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Secuencia de Leyenda: Ordenar imágenes.\n• Receta de Cocina: Leer pasos.\n• Clasificación: Plumas vs Pelo.\n• Bandera Rompecabezas: Armar banderas.\n\n🖐️ SENSORIALES:\n• Taller de Aromas: Yerba, café, chocolate.\n• Caja Táctil: Lana cruda, aguayos.\n• Degustación: Frutas tropicales.\n• Sonidos de la Selva: Lluvia, pájaros.\n\n🧱 CONCRETAS:\n• Molienda Ancestral: Morteros con maíz.\n• Cocina: Amasar chipá.\n• Construcción de Nido: Barro y paja.\n• Siembra: Germinadores.\n\n🎨 ARTÍSTICAS:\n• Telar Aborigen: Tejer con lanas.\n• Máscaras de Carnaval: Plumas.\n• Papel Picado Mexicano: Papel doblado.\n• Pintura con Tierra: Tierra + cola."
      },
      "JUNIO_Y_JULIO": {
          title: "Estación 3: Europa & Mundial",
          narrativa: "Europa es historia (castillos) y presente (fútbol). El grupo recorre países, pero el mundo se detiene para jugar.",
          paises: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 INGLATERRA\n• Capital: Londres.\n• Comida Típica: Té con galletitas.\n• Animal Típico: Bulldog / León.\n• Símbolos: Big Ben, Autobús rojo.\n\n🇮🇹 ITALIA (Sabores de la Abuela)\n• Capital: Roma.\n• Comida Típica: Pizza y Pastas.\n• Animal Típico: La Loba.\n• Símbolos: Coliseo Romano, Máscaras de Venecia.\n\n🇪🇸 ESPAÑA (Música y Color)\n• Capital: Madrid.\n• Comida Típica: Paella, Tortilla.\n• Animal Típico: El Toro.\n• Símbolos: Abanicos, Molinos, Guitarra.",
          contenidos: "📌 Cs. Sociales:\n- Pasado/Presente (Castillos vs Estadios).\n- Reglas de juego.\n\n📌 Matemática:\n- Conteo (goles).\n- Espacio: Ubicación.",
          actividades: "1. Mini Mundial.\n2. Taller de Masas.\n3. Construcción de Torres.\n4. Hora del Té.\n5. Diseño de camisetas.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Álbum de Figuritas: Correspondencia número.\n• Tabla de Goles: Registro con palitos.\n• Lectura de Camisetas: Nombres y números.\n• Reglamento del Aula: 3 reglas de oro.\n\n🖐️ SENSORIALES:\n• Taller de Masas: Harina vs Masa.\n• Sonidos de Estadio: Gol vs Susurro.\n• Temperatura: Hielo (Londres) vs Té tibio.\n• Texturas: Pelotas (cuero, tenis).\n\n🧱 CONCRETAS:\n• Mini Mundial: Patear penales.\n• Construcción: Torres con bloques.\n• Hora del Té: Poner la mesa.\n• Circuito: Zigzag y túnel.\n\n🎨 ARTÍSTICAS:\n• Mosaico (Gaudí): Papel glacé.\n• Diseño de Camisetas: Estampado.\n• Abanicos Españoles: Plegado.\n• Coronas de Reyes: Cartulina."
      },
      "AGOSTO_Y_SEPTIEMBRE": {
          title: "Estación 4: Asia",
          narrativa: "El Oriente nos enseña la paciencia, el detalle y el contraste entre la luz y la sombra.",
          paises: "🇨🇳 CHINA (El Dragón)\n• Capital: Pekín.\n• Comida Típica: Arroz chaufa.\n• Animal Típico: Oso Panda / Dragón.\n• Símbolos: Muralla, Farolitos.\n\n🇮🇳 INDIA (Los Aromas)\n• Capital: Nueva Delhi.\n• Comida Típica: Especias (Curry).\n• Animal Típico: Elefante, Tigre.\n• Símbolos: Taj Mahal, Mandalas.\n\n🇯🇵 JAPÓN (La Calma)\n• Capital: Tokio.\n• Comida Típica: Sushi.\n• Animal Típico: Pez Koi, Gato de la Suerte.\n• Símbolos: Flor de Cerezo, Monte Fuji.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Haikus.\n- Trazos no convencionales.\n\n📌 Matemática:\n- Geometría (Tangram).\n- Plegado (Origami).",
          actividades: "1. Arroz Sensorial.\n2. Escritura Vertical.\n3. Sombras Chinas.\n4. Origami.\n5. Jardín Zen.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Tangram: Armar figuras.\n• Secuencia de Crecimiento: Semilla a Arroz.\n• Escritura Vertical: Tiras de papel.\n• Haikus: Leer y dibujar.\n\n🖐️ SENSORIALES:\n• Arroz Sensorial: Buscar objetos.\n• Ceremonia de Té: Oler jazmín, calma.\n• Luces y Sombras: Linternas.\n• Vibración: Cuenco tibetano.\n\n🧱 CONCRETAS:\n• Uso de Palitos: Agarrar pompones.\n• Origami Simple: Perrito o vaso.\n• Jardín Zen: Arena y tenedor.\n• Yoga Animal: Posturas.\n\n🎨 ARTÍSTICAS:\n• Manchas Sopladas: Tinta y sorbete.\n• Escritura con Pincel: Trazos gruesos.\n• Mandalas Naturales: Hojas y piedras.\n• Farolitos Chinos: Cartulina roja."
      },
      "OCTUBRE_Y_NOVIEMBRE": {
          title: "Estación 5: África y Oceanía",
          narrativa: "La fuerza de la naturaleza. Cruzamos desiertos, selvas y el inmenso océano.",
          paises: "🇪🇬 EGIPTO (El Desierto)\n• Capital: El Cairo.\n• Comida: Dátiles.\n• Animal: Camello, Escarabajo.\n• Símbolos: Pirámides, Momias, Nilo.\n\n🇿🇦 SUDÁFRICA (La Sabana)\n• Capital: Pretoria.\n• Comida: Carne asada.\n• Animal: León, Jirafa, Cebra.\n• Símbolos: Máscaras, Diamantes.\n\n🇦🇺 AUSTRALIA (El Océano)\n• Capital: Canberra.\n• Comida: Pescado.\n• Animal: Canguro, Koala.\n• Símbolos: Boomerang, Surf, Ópera.",
          contenidos: "📌 Cs. Naturales:\n- Desplazamiento animal.\n- Ambientes (Agua/Tierra).\n\n📌 Matemática:\n- Cuerpos: Pirámide, Esfera.",
          actividades: "1. Arenero Egipcio.\n2. Botellas del Océano.\n3. Juego de Momias.\n4. Puntillismo.\n5. Máscaras Tribales.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Clasificación Hábitat: Tierra vs Mar.\n• Adivinanzas: Pistas de animales.\n• Laberinto: Canguro busca mamá.\n• Conteo de Patas: Araña vs León.\n\n🖐️ SENSORIALES:\n• Arenero Egipcio: Arena y tesoros.\n• Botellas del Océano: Agua y aceite azul.\n• Percusión Corporal: Ritmo en el cuerpo.\n• Pieles: Texturas (rugosa/suave).\n\n🧱 CONCRETAS:\n• Momias: Envolver con papel higiénico.\n• Salto de Canguro: Competencia.\n• Construcción: Pirámides de vasos.\n• Pesca: Con imanes.\n\n🎨 ARTÍSTICAS:\n• Puntillismo: Hisopos y témpera.\n• Máscaras Tribales: Cartón y rafia.\n• Collares Egipcios: Platos dorados.\n• Huellas de Animales: Estampado."
      },
      "DICIEMBRE": {
          title: "Estación 6: El Regreso a Casa",
          narrativa: "Los estudiantes vuelven al colegio y socializan todo lo recorrido.",
          paises: "🏠 MUESTRA DEL VIAJERO\n\n• Recorrido por el patio transformado en mapa.\n• Merienda con sabores del mundo.\n• Entrega de Pasaportes Completos.",
          contenidos: "📌 Evaluación.\n📌 Muestra a la comunidad.",
          actividades: "1. Cierre del Pasaporte.\n2. Muestra interactiva.\n3. Fiesta de sabores.",
          herramientas: "🧠 CIERRE DEL PROYECTO:\n• Finalización de lectura del libro.\n• Armado de la muestra con los objetos creados.\n• Evaluación de la 'Bitácora de Viaje'."
      }
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

  const getCurrentPeriodId = () => {
      const month = new Date().getMonth(); 
      if (month === 2) return "MARZO";
      if (month === 3 || month === 4) return "ABRIL_Y_MAYO";
      if (month === 5 || month === 6) return "JUNIO_Y_JULIO";
      if (month === 7 || month === 8) return "AGOSTO_Y_SEPTIEMBRE";
      if (month === 9 || month === 10) return "OCTUBRE_Y_NOVIEMBRE";
      if (month === 11) return "DICIEMBRE";
      return null;
  };
  const currentId = getCurrentPeriodId();

  const handleSave = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
          narrativa: fd.get('narrativa'),
          paises: fd.get('paises'),
          fundamentacion: fd.get('fundamentacion'),
          contenidos: fd.get('contenidos'),
          actividades: fd.get('actividades'),
          herramientas: fd.get('herramientas'),
          updatedAt: serverTimestamp()
      };
      const { setDoc, doc: docRef } = await import('firebase/firestore'); 
      await setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', expandedPeriod.id), data, { merge: true });
      setEditing(false); setExpandedPeriod({...expandedPeriod, ...data});
  };

  const handleLoadProjectData = async () => {
      if(!confirm("⚠️ ¿Cargar planificación completa desde PDF?")) return;
      setLoadingAction(true);
      try {
          const { setDoc, doc: docRef } = await import('firebase/firestore');
          const promises = Object.keys(PROJECT_DATA_2026).map(key => {
              return setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', key), PROJECT_DATA_2026[key], { merge: true });
          });
          await Promise.all(promises);
          alert("✅ ¡Proyecto cargado con éxito!");
          setShowAdminMenu(false);
      } catch (e) { alert("Error: " + e.message); } finally { setLoadingAction(false); }
  };

  const handleResetProject = async () => {
      if(!confirm("⛔ PELIGRO: ¿Borrar todo el contenido?")) return;
      setLoadingAction(true);
      try {
          const { setDoc, doc: docRef } = await import('firebase/firestore');
          const promises = PERIOD_NAMES.map(name => {
              const id = name.replace(/\s+/g, '_');
              return setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', id), { 
                  paises: '', fundamentacion: '', contenidos: '', actividades: '', herramientas: '', narrativa: '' 
              });
          });
          await Promise.all(promises);
          alert("🗑️ Proyecto reiniciado.");
          setShowAdminMenu(false);
      } catch (e) { alert("Error: " + e.message); } finally { setLoadingAction(false); }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700 relative">
      
      {/* PORTADA CON LINK */}
      <div className="relative w-full h-56 rounded-[35px] overflow-hidden shadow-2xl group border border-violet-100">
          <img src="/PPI.png" alt="Portada" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-violet-900 via-violet-900/40 to-transparent flex flex-col justify-end p-8">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md mb-1">Proyecto 2026</h2>
              
              <a href="https://drive.google.com/file/d/1Cgb9QQ5XNy_RvmdIShPc2cZX317tcmga/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition shadow-lg border border-white/30">
                  <FileText size={16}/> Ver PDF Completo
              </a>

              <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">Institucional</span>
                  <p className="text-orange-200 font-bold text-xs uppercase tracking-[3px] drop-shadow-sm">La Vuelta al Mundo</p>
              </div>
          </div>
          
          {isAdmin && (
              <div className="absolute top-4 right-4">
                  <button onClick={() => setShowAdminMenu(!showAdminMenu)} className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white shadow-lg transition"><Settings size={20}/></button>
                  {showAdminMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-5 z-50">
                          <button onClick={handleLoadProjectData} disabled={loadingAction} className="w-full text-left px-4 py-3 text-xs font-bold text-violet-700 hover:bg-violet-50 flex items-center gap-2">{loadingAction ? <RefreshCw className="animate-spin" size={14}/> : <UploadCloud size={14}/>} Cargar Info 2026 (PDF)</button>
                          <button onClick={handleResetProject} disabled={loadingAction} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Reiniciar Todo</button>
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="space-y-3">
          {periods.map(period => {
              const isCurrent = period.id === currentId;
              const displayTitle = PROJECT_DATA_2026[period.id]?.title || period.name;

              return (
              <div key={period.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-500 ${isCurrent ? 'border-orange-400 ring-2 ring-orange-100 shadow-orange-100 transform scale-[1.02]' : 'border-gray-100'}`}>
                  <div onClick={() => setExpandedPeriod(expandedPeriod?.id === period.id ? null : period)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${expandedPeriod?.id === period.id ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${expandedPeriod?.id === period.id ? 'bg-violet-600 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{period.name.substring(0,3)}</div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h3 className={`font-black text-sm uppercase italic tracking-tighter ${isCurrent ? 'text-orange-600' : 'text-gray-800'}`}>{displayTitle}</h3>
                                  {isCurrent && <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">📍 Estación Actual</span>}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate max-w-[250px] font-medium">{period.fundamentacion || 'Clic para ver contenidos...'}</p>
                          </div>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${expandedPeriod?.id === period.id ? 'rotate-90 text-violet-600' : ''}`} />
                  </div>

                  {expandedPeriod?.id === period.id && (
                      <div className="p-5 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
                          {!editing ? (
                              <div className="space-y-6">
                                  
                                  {/* SECCIÓN NARRATIVA */}
                                  <div className="bg-white p-4 rounded-2xl border border-violet-100 shadow-sm relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-400"></div>
                                      <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-1"><BookOpen size={12}/> Narrativa del Cuento</h4>
                                      <p className="text-sm font-medium text-gray-700 italic leading-relaxed">"{period.narrativa || '...'}"</p>
                                  </div>

                                  {/* SECCIÓN PAÍSES (CON FORMATO PRESERVADO) */}
                                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Globe size={12}/> Países y Ejes</h4>
                                      <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-bold">{period.paises || '-'}</p>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1"><List size={12}/> Contenidos Curriculares</h4>
                                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{period.contenidos || '-'}</p>
                                      </div>
                                      
                                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                          <h4 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-2 flex items-center gap-1"><Briefcase size={12}/> Caja de Herramientas</h4>
                                          <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                                              {period.herramientas || 'Sin herramientas cargadas.'}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Lightbulb size={12}/> Actividades Sugeridas</h4>
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{period.actividades || '-'}</p>
                                  </div>

                                  {isAdmin && <button onClick={() => setEditing(true)} className="w-full py-3 bg-white border border-violet-200 text-violet-600 font-bold text-xs rounded-xl mt-2 hover:bg-violet-50 transition shadow-sm">Editar Manualmente</button>}
                              </div>
                          ) : (
                              <form onSubmit={handleSave} className="space-y-4">
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase">Narrativa</label>
                                      <textarea name="narrativa" defaultValue={period.narrativa} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-20 outline-none focus:border-violet-400" />
                                      
                                      <label className="text-[10px] font-bold text-gray-400 uppercase">Países y Ejes</label>
                                      <textarea name="paises" defaultValue={period.paises} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400" />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Contenidos</label><textarea name="contenidos" defaultValue={period.contenidos} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400" /></div>
                                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Caja Herramientas</label><textarea name="herramientas" defaultValue={period.herramientas} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400 bg-orange-50" /></div>
                                  </div>
                                  
                                  <div><label className="text-[10px] font-bold text-gray-400 uppercase">Actividades</label><textarea name="actividades" defaultValue={period.actividades} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-24 outline-none focus:border-violet-400" /></div>

                                  <div className="flex gap-2 pt-2">
                                      <button type="button" onClick={() => setEditing(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                                      <button type="submit" className="flex-1 py-3 bg-violet-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-violet-700 transition">Guardar Cambios</button>
                                  </div>
                              </form>
                          )}
                      </div>
                  )}
              </div>
          )})}
      </div>
      
      <style>{`.hidden-icon { display: none; }`}</style>
      <div className="hidden"><Settings size={0}/></div>
    </div>
  );
}
// --- VISTA MATRÍCULA (VERSIÓN EXTENDIDA Y COMPLETA) ---
function MatriculaView({ user }) {
  // ==========================================
  // 1. ESTADOS Y CONFIGURACIÓN
  // ==========================================
  const [students, setStudents] = useState([]);
  const [savingIncident, setSavingIncident] = useState(false);
  const [usersList, setUsersList] = useState([]); 
  const [showQuickFix, setShowQuickFix] = useState(false);
  const [fixingField, setFixingField] = useState('gender'); // 'gender' o 'dx'
  const [socialCases, setSocialCases] = useState([])
  
  // Estados de visualización y edición
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info' o 'history'
  
  // Filtros
  const [filterText, setFilterText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formModalidad, setFormModalidad] = useState('Sede');
  const [filters, setFilters] = useState({ 
      modality: 'all', 
      level: 'all', 
      group: 'all', 
      turn: 'all', 
      teacher: 'all', 
      dx: 'all', 
      gender: 'all', 
      journey: 'all', 
      os: 'all' 
  });
  const handleQuickUpdate = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), { [field]: value });
      // Opcional: alert sutil o feedback visual
    } catch (e) { console.error("Error actualizando:", e); }
  };
 const [statFilters, setStatFilters] = useState({ 
      modality: [], 
      level: [], 
      gender: 'all', 
      dx: 'all',
      turn: 'all',
      journey: 'all'
  });
const [statOnlyPreTaller, setStatOnlyPreTaller] = useState(false);
  // Estados de Bitácora
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  // Estados de Modales
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);
  
  // Estados de Procesos (Carga, Fotos, Importación)
  const [photoPreview, setPhotoPreview] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Constantes y Roles
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const canSearchDrive = isSuperAdmin || user.role === 'Administración'; 
  const LOGO_URL = "/icon-192.png"; 

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
  const checkCudStatus = (cudDate) => {
    if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
    
    const today = new Date();
    const exp = new Date(cudDate + 'T00:00:00');
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
    if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` }; // Alerta 3 meses
    
    return { status: 'ok', text: 'Vigente' };
  };

  // ==========================================
  // 2. CARGA DE DATOS (FIREBASE)
  // ==========================================
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qSocial = query(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'));
    const uSocial = onSnapshot(qSocial, (snap) => {
        // Guardamos los casos en un estado temporal o lo usamos directamente. 
        // Para no romper nada, lo ideal es crear un estado [socialCases, setSocialCases] arriba.
        setSocialCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
   return () => { 
        uS(); 
        uU(); 
        if (typeof uSocial === 'function') uSocial(); 
    };
  }, [appId]);

  // Listas auxiliares para selects
  const staffSede = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico'].includes(u.role));
  const staffInclusion = (usersList||[]).filter(u => ['DAI', 'Equipo Técnico Inclusión', 'Inclusión'].includes(u.role));
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const staffAll = usersList || [];

  // ==========================================
  // 3. LÓGICA DE FILTRADO
  // ==========================================
const filteredStudents = students.filter(s => {
      // 1. Filtro de Estado (Activos vs Bajas)
      // Si showArchived es true, mostramos solo los s.isActive === false
      // Si showArchived es false, mostramos solo los s.isActive !== false
      const isStudentActive = s.isActive !== false;
      if (showArchived && isStudentActive) return false;
      if (!showArchived && !isStudentActive) return false;

      // 2. BUSCADOR UNIVERSAL (Nombre, Apellido, DNI)
      const textToSearch = `${s.lastName || ''} ${s.firstName || ''} ${s.dni || ''}`.toLowerCase();
      const searchTxt = (filterText || '').toLowerCase();
      if (searchTxt && !textToSearch.includes(searchTxt)) return false;

      // 3. FILTROS DE SELECTORES (Solo si no estamos viendo bajas, para no romper la vista)
      if (!showArchived && filters) {
          if (filters.modality && filters.modality !== 'all') {
              const mod = s.modality || 'Sede';
              if (mod !== filters.modality) return false;
          }
          if (filters.level && filters.level !== 'all' && s.level !== filters.level) return false;
          if (filters.dx && filters.dx !== 'all' && s.dx !== filters.dx) return false;
          if (filters.gender && filters.gender !== 'all' && s.gender !== filters.gender) return false;
          if (filters.journey && filters.journey !== 'all' && s.journey !== filters.journey) return false;
      }

      return true;
  });
  const toggleStatFilter = (category, value) => { setStatFilters(prev => { const currentList = prev[category]; if (currentList.includes(value)) return { ...prev, [category]: currentList.filter(item => item !== value) }; else return { ...prev, [category]: [...currentList, value] }; }); };

  // ==========================================
  // 4. HELPERS Y UTILIDADES
  // ==========================================
  const getSeverityColor = (severity) => { 
      if(severity === 'positive') return 'bg-emerald-50 border-emerald-200'; 
      if(severity === 'high') return 'bg-red-50 border-red-200'; 
      if(severity === 'medium') return 'bg-orange-50 border-orange-200'; 
      return 'bg-gray-50 border-gray-100'; 
  };
  const getSafeDate = (d) => { if(!d) return ''; try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const getAlertStatus = (inc) => { if(!inc || !inc.length) return {status:'ok', count:0}; const d = new Date(); d.setDate(d.getDate()-15); const r = inc.filter(x => (x.severity==='high'||x.severity==='medium') && new Date(x.date)>=d); return { status: r.length>=5?'danger':r.length>=3?'warning':'ok', count: r.length }; };

// ==========================================
  // 5. ACCIONES Y MANEJADORES
  // ==========================================
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setFormModalidad('Sede'); setShowForm(true); };
  const openEdit = (s) => { setEditingStudent(s); setPhotoPreview(s.photoUrl); setFormModalidad(s.modality || 'Sede'); setShowForm(true); };
  
  const handlePhotoChange = async (e) => { 
      const f = e.target.files[0]; if(!f) return; 
      setUploading(true); 
      try { 
          const reader = new FileReader(); 
          reader.onload=(ev)=>{
              const img=new Image(); 
              img.onload=()=>{
                  const c=document.createElement('canvas'); 
                  const s=300/img.width; c.width=300; c.height=img.height*s; 
                  const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height); 
                  setPhotoPreview(c.toDataURL('image/jpeg',0.7)); 
                  setUploading(false);
              }; 
              img.src=ev.target.result;
          }; 
          reader.readAsDataURL(f); 
      } catch(e){ setUploading(false); } 
  };

  const handleSave = async (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target); 
      const d = Object.fromEntries(fd.entries()); 
      d.isActive = d.isActive === 'true'; 
      d.photoUrl = photoPreview || editingStudent?.photoUrl || ''; 
      d.modality = formModalidad; 
      
      try { 
          if (editingStudent) { 
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), d);
              // Actualiza la ficha abierta para que veas los cambios al instante
              if (viewingStudent?.id === editingStudent.id) {
                  setViewingStudent({ ...editingStudent, ...d });
              }
          } else { 
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...d, isActive: true, createdAt: serverTimestamp(), incidents: [] }); 
          } 
          setShowForm(false); 
          setEditingStudent(null); 
          setPhotoPreview(null); 
      } catch (err) { alert("Error: " + err.message); } 
  }; // <--- ESTA ERA LA LLAVE QUE FALTABA

  const handleDelete = async (id) => { 
      if(confirm("⚠️ ¿Eliminar definitivamente?")) { 
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); 
          setShowForm(false); 
          setEditingStudent(null); 
      } 
  };
  
  // --- FIX BITÁCORA (BOTONES Y TEXTO) ---
  const addIncident = async (type, text = "") => { 
    if (!showBitacoraModal) return; 
    const newInc = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: type, 
        text: text || type, 
        author: user.firstName 
    }; 
    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id); 
        await updateDoc(studentRef, { incidents: arrayUnion(newInc) }); 

        // --- PARCHE PUNTOS MAYO ---
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(10) });
        }
        // --------------------------

        setStudents(prev => prev.map(s => s.id === showBitacoraModal.id ? {...s, incidents: [...(s.incidents||[]), newInc]} : s)); 
        setNewNote(""); setIsWriting(false); setShowBitacoraModal(null); 
        alert("✅ Registro guardado (+10 pts)"); 
    } catch (e) { alert(e.message); } 
  };
  
// Asegúrate de que diga "async" justo antes de los paréntesis
  const handleSaveIncident = async (type, text = "", severity = "medium") => {
    // Identificar al alumno activo
    const student = (typeof showBitacoraModal !== 'undefined' && showBitacoraModal) || 
                    (typeof viewingStudent !== 'undefined' && viewingStudent) || 
                    selectedStudent;
    
    if (!student || !student.id) {
        alert("❌ Error: No se pudo identificar al alumno.");
        return;
    }

    setSavingIncident(true);

    const incidentData = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: severity, 
        text: text || type, 
        author: user.fullName || user.firstName,
        authorId: user.id 
    }; 

    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id); 
        
        // El error de Vercel estaba aquí (línea 5095) porque faltaba el async arriba
        await updateDoc(studentRef, { 
            incidents: arrayUnion(incidentData) 
        }); 

        // Puntos Challenge (Mayo 2026)
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(10) });
        }

        // Actualización de estados locales
        setStudents(prev => prev.map(s => s.id === student.id ? {...s, incidents: [...(s.incidents||[]), incidentData]} : s)); 
        
        if (typeof setViewingStudent === 'function' && viewingStudent?.id === student.id) {
            setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents||[]), incidentData]}));
        }

        // Limpieza y cierre
        setNewNote(""); 
        setIsWriting(false); 
        if (typeof setShowBitacoraModal === 'function') setShowBitacoraModal(null);
        
        alert("✅ Bitácora guardada correctamente."); 
    } catch (e) { 
        console.error("Error al guardar:", e);
        alert("❌ Error de conexión."); 
   } finally {
        setSavingIncident(false);
    }
  };
  
  const deleteIncident = async (sid, inc) => { 
      if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); 
  }; 
  
  const markAsInactive = async (s) => { 
      if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); 
      setUnassignedList(p=>p.filter(x=>x.id!==s.id)); 
  };
  
  const abrirLegajoDigital = (student) => { 
      const clean = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, ""); 
      const query = `name contains '${clean(student.lastName).split(' ')[0]}' and name contains '${clean(student.firstName).split(' ')[0]}' and trashed = false`; 
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`, '_blank'); 
  };

  // ==========================================
  // 6. FUNCIONES DE GESTIÓN Y NUBE (RECUPERADAS)
  // ==========================================
const checkUnassigned = () => {
    const found = students.filter(s => {
      if (s.isActive === false) return false; // Ignorar inactivos
      
      if (s.modality === 'Inclusión') {
        // En Inclusión, es "huérfano" si no tiene DAI
        return !s.daiMorning && !s.daiAfternoon;
      } else {
        // En Sede, es "huérfano" si no tiene Grupo
        return !s.groupMorning && !s.groupAfternoon;
      }
    });
    setUnassignedList(found);
    setShowDataManagement(false);
    setShowUnassigned(true);
  };
  
  
  
  const descargarBackup = () => { 
      if(!confirm("¿Descargar Backup?")) return; 
      const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); 
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob); 
      link.download = "BACKUP_MATRICULA.json"; 
      document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  };
  
  const handleBulkImport = async () => {
    const rawJson = prompt("Pega aquí el contenido JSON del backup de estudiantes:");
    if (!rawJson) return;

    setProcessing(true);
    try {
      const data = JSON.parse(rawJson);
      if (!Array.isArray(data)) throw new Error("El formato no es un array válido.");

      // 1. Traer todos los alumnos actuales de la base de datos para comparar
      const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const alumnosActuales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let agregados = 0;
      let actualizados = 0;

      // 2. Procesar cada alumno del JSON
      const promises = data.map(async (item) => {
        const { id, ...cleanData } = item;
        
        // 3. Buscar si el alumno ya existe (por DNI o por Nombre+Apellido exacto)
        const existe = alumnosActuales.find(s => 
           (cleanData.dni && s.dni === cleanData.dni) || 
           (s.firstName === cleanData.firstName && s.lastName === cleanData.lastName)
        );

        if (existe) {
          // Si existe, lo ACTUALIZAMOS (pisamos los datos viejos con los nuevos)
          actualizados++;
          return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', existe.id), {
            ...cleanData,
            updatedAt: serverTimestamp()
          });
        } else {
          // Si no existe, lo CREAMOS como nuevo
          agregados++;
          return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
            ...cleanData,
            isActive: true,
            createdAt: serverTimestamp(),
            incidents: cleanData.incidents || []
          });
        }
      });

      await Promise.all(promises);
      alert(`✅ ¡Importación lista!\n\nSe agregaron: ${agregados} alumnos nuevos.\nSe actualizaron: ${actualizados} alumnos existentes.`);
      setShowDataManagement(false);
    } catch (e) {
      alert("❌ Error al procesar: " + e.message);
    } finally {
      setProcessing(false);
    }
  };
  const handleDeleteAll = () => alert("Función protegida.");
  const handleResetCycle = () => alert("Protegido.");

  const handleAutoAssignGenders = async () => {
    if(!confirm("🤖 ¿Asignar género automáticamente basado en el nombre?\n(Nombres terminados en 'a' serán F, resto M)")) return;
    setProcessing(true);
    try {
        const updates = students.map(s => {
            if(s.gender) return null; 
            const name = (s.firstName || "").toLowerCase().trim();
            const gender = name.endsWith('a') ? 'F' : 'M';
            return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender });
        }).filter(p => p !== null);
        await Promise.all(updates);
        alert(`✅ Géneros asignados a ${updates.length} alumnos.`);
    } catch(e) { alert(e.message); }
    setProcessing(false);
  };

  // ==========================================
  // 7. IMPRESIÓN CON MÉTODO IFRAME
  // ==========================================
  const imprimirListado = (list) => { 
      let h = `<html><head><title>Fichas de Estudiantes</title>
      <style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');body{font-family:'Roboto',sans-serif;padding:20px;}.page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #7c3aed;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}.header-text h1{color:#4c1d95;font-size:24px;margin:0;text-transform:uppercase;}.header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}.photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #7c3aed;}.photo-box img{width:100%;height:100%;object-fit:cover;}.section-title{background:#f3f4f6;color:#4c1d95;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #7c3aed;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}.field{margin-bottom:5px;}.label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}.value{font-size:12px;font-weight:bold;color:#333;}.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}</style></head><body>`;
      
      list.forEach(s => { 
          h += `<div class="page"><div class="header"><div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Edad: ${calculateAge(s.birthDate)} años</p></div><div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : ''}</div></div><div class="section-title">Datos Personales y Salud</div><div class="grid"><div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${getSafeDate(s.birthDate)}</span></div><div class="field"><span class="label">Diagnóstico</span><span class="value">${s.dx || '-'}</span></div><div class="field"><span class="label">Obra Social</span><span class="value">${s.healthInsurance || 'NO DECLARA'}</span></div><div class="field"><span class="label">Vencimiento CUD</span><span class="value">${getSafeDate(s.cudExpiration)}</span></div></div><div class="section-title">Escolaridad (${s.modality || 'Sede'})</div><div class="grid"><div class="field"><span class="label">Nivel</span><span class="value">${s.level || '-'}</span></div>${s.modality === 'Inclusión' ? `<div class="field"><span class="label">Escuela Origen</span><span class="value">${s.originSchool} (${s.originGrade})</span></div><div class="field"><span class="label">DAI Asignada</span><span class="value">${s.daiMorning || s.daiAfternoon || '-'}</span></div>` : `<div class="field"><span class="label">Turno Mañana</span><span class="value">Grupo: ${s.groupMorning || '-'} (Doc: ${s.teacherMorning || '-'})</span></div><div class="field"><span class="label">Turno Tarde</span><span class="value">Grupo: ${s.groupAfternoon || '-'} (Doc: ${s.teacherAfternoon || '-'})</span></div>`}</div><div class="section-title">Familia y Contacto</div><div class="field" style="margin-bottom:10px;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div><div class="grid"><div class="field"><span class="label">Madre / Tutor 1</span><span class="value">${s.motherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.motherContact || '-'}</span></div><div class="field"><span class="label">Padre / Tutor 2</span><span class="value">${s.fatherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.fatherContact || '-'}</span></div></div><div class="field" style="margin-top:10px;background:#f9fafb;padding:10px;border-radius:5px;"><span class="label">PERSONAS AUTORIZADAS A RETIRAR</span><span class="value">${s.pickupInfo || 'Sin datos cargados.'}</span></div><div class="footer">Juntos a la Par - Legajo Digital generado el ${new Date().toLocaleDateString()}</div></div>`; 
      }); 
      h += '</body></html>'; 

      const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; document.body.appendChild(iframe); const doc = iframe.contentWindow.document; doc.open(); doc.write(h); doc.close(); setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Modalidad"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`, `"${s.modality||'Sede'}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
const findDuplicates = () => {
    const dniMap = {};
    const nameMap = {};
    const dupes = [];

    students.forEach(s => {
      // Buscar por DNI (si tiene más de 4 números)
      if (s.dni && s.dni.trim().length > 4) {
        if (dniMap[s.dni]) dupes.push({ type: 'DNI', s1: dniMap[s.dni], s2: s });
        else dniMap[s.dni] = s;
      }
      // Buscar por Nombre y Apellido exacto
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase().trim();
      if (fullName.length > 3) {
        if (nameMap[fullName]) {
          // Evitamos anotarlo dos veces si ya saltó por DNI
          if (!dupes.find(d => d.s2.id === s.id)) {
            dupes.push({ type: 'Nombre', s1: nameMap[fullName], s2: s });
          }
        } else nameMap[fullName] = s;
      }
    });

    if (dupes.length === 0) {
      alert("✅ ¡Excelente! La base está limpia. No hay alumnos duplicados.");
    } else {
      setDuplicates(dupes);
      setShowDataManagement(false); // Cierra el modal de la Nube para mostrar los duplicados
    }
  };

// --- CÁLCULO DE ESTADÍSTICAS (FILTRADO ESTRICTO) ---
  const statsResults = students.filter(s => {
      if (s.isActive === false) return false;
      if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false;
      if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false;
      if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false;

      // Filtro estricto de Género (Ignora X o vacíos si se elige M o F)
      if (statFilters.gender !== 'all') {
          if (s.gender !== statFilters.gender) return false;
      }

      // Filtro Especial: SOLO PRE TALLER (Busca en TM y TT)
      if (statOnlyPreTaller) {
          const nombreTM = (s.groupMorning || "").toUpperCase();
          const nombreTT = (s.groupAfternoon || "").toUpperCase();
          if (!nombreTM.includes("PRE TALLER") && !nombreTT.includes("PRE TALLER")) return false;
      }
      
      if (statFilters.journey !== 'all' && s.journey !== statFilters.journey) return false;
      if (statFilters.turn !== 'all') {
          if (statFilters.turn === 'Mañana' && !s.groupMorning && !s.daiMorning && s.turn !== 'Mañana') return false;
          if (statFilters.turn === 'Tarde' && !s.groupAfternoon && !s.daiAfternoon && s.turn !== 'Tarde') return false;
      }
      
      return true;
  });
  const getGroupLabel = (s) => {
      if (s.modality === 'Inclusión') {
          return s.daiMorning || s.daiAfternoon 
            ? `DAI: ${s.daiMorning || s.daiAfternoon}` 
            : <><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin DAI</>;
      }
      return s.groupMorning || s.groupAfternoon 
        ? `Grupo: ${s.groupMorning || s.groupAfternoon}` 
        : <><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin grupo</>;
  };
  // ==========================================
  // 8. RENDERIZADO (JSX)
  // ==========================================
  return (
    <div className="animate-in fade-in pb-20">
      {/* HEADER DE FILTROS */}
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived?'bg-gray-600':'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
         <div className="flex justify-between items-center gap-4 mb-4">
             <div><h2 className="text-3xl font-bold flex gap-2 items-center"><GraduationCap/> {showArchived?'Archivo':'Legajos 2026'}</h2><p className="opacity-80 text-sm mt-1">{filteredStudents.length} alumnos encontrados</p></div>
             <div className="flex gap-2">
                 <button onClick={()=>setShowArchived(!showArchived)} className="px-3 py-2 border border-white/30 rounded-xl text-xs font-bold uppercase hover:bg-white/10 flex items-center gap-1">{showArchived? 'Ver Activos' : 'Ver Bajas'}</button>
                 {isSuperAdmin && <button onClick={()=>setShowDataManagement(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Gestión (Nube)"><UploadCloud size={18}/></button>}
                 {isSuperAdmin && <button onClick={()=>setShowStats(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Estadísticas"><PieChart size={18}/></button>}
                 <button onClick={() => imprimirListado(filteredStudents)} className="px-3 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase shadow hover:bg-blue-50 flex gap-2 items-center"><FileText size={14}/> Imprimir</button>
                 <button onClick={exportFiltered} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Excel"><Download size={18}/></button>
                 {!showArchived && <button onClick={openNew} className="px-4 py-2 bg-white text-blue-600 rounded-xl shadow hover:bg-blue-50 font-bold"><Plus size={20}/></button>}
             </div>
         </div>
         {!showArchived && (
            <div className="mt-4 space-y-2">
                <div className="bg-white/20 p-2 rounded-xl flex items-center"><Search className="ml-2 opacity-70"/><input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Buscar alumno..." className="bg-transparent border-none outline-none text-white w-full font-bold placeholder-white/60 ml-2"/>{filterText && <button onClick={()=>setFilterText('')}><X/></button>}</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <select value={filters.modality} onChange={e=>setFilters({...filters, modality:e.target.value})} className="bg-orange-100 text-orange-800 text-xs p-2 rounded-lg font-bold min-w-[100px] border border-orange-200"><option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option></select>
                    <select value={filters.group} onChange={e=>setFilters({...filters, group:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Grupo: Todos</option>{uniqueGroups.map(g=><option key={g} value={g}>{g}</option>)}</select>
                    <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                    <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Docente: Todos</option>{staffAll.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                    <select value={filters.turn} onChange={e => setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                    <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                    <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select>
                    <select value={filters.journey} onChange={e => setFilters({...filters, journey: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                </div>
            </div>
         )}
      </div>
      
     {/* LISTA DE TARJETAS DE ALUMNOS */}
      <div className="space-y-3">
        {filteredStudents.map(s => { 
          const cudInfo = checkCudStatus(s.cudExpiration); // Nueva lógica de CUD
          const incidentAlert = getAlertStatus(s.incidents); 
          
          // Se activa la alerta si: el CUD venció/está por vencer O si hay incidentes graves
          const hasCriticalAlert = cudInfo.status === 'expired' || cudInfo.status === 'warning' || incidentAlert.status === 'danger';

          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} 
                 className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition 
                 ${!s.isActive ? 'border-red-400 opacity-60' : hasCriticalAlert ? 'border-red-500 border-l-8' : 'border-gray-100'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                        {/* Puntito rojo sobre la foto si hay alerta */}
                        {hasCriticalAlert && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName}</h4>
                            {s.modality === 'Inclusión' && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-200 uppercase">INCLUSIÓN</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{calculateAge(s.birthDate)} años</span>
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase truncate max-w-[120px] ${
                              (s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon)
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                                {s.modality === 'Inclusión' 
                                    ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : <span>⚠️ Sin DAI</span>) 
                                    : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : <span>⚠️ Sin grupo</span>)}
                            </span>
                            {/* Pequeño aviso de CUD si está por vencer */}
                            {cudInfo.status === 'warning' && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-1 rounded font-black animate-pulse border border-amber-200">
                                    CUD PRÓX. VENCER
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Eye className={hasCriticalAlert ? "text-red-500" : "text-gray-300"}/>
            </div> 
          ); 
        })}
      </div>
      {/* ================= MODALES ================= */}

     {/* 1. MODAL FICHA COMPLETA (DETALLE) - REPARADO SIN BORRAR NADA */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* CABECERA */}
                <div className="bg-slate-700 p-6 text-white relative shrink-0">
                    <button onClick={()=>setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                    <div className="flex gap-5 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg flex items-center justify-center">
                            {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <div className="bg-orange-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm">
                                    Edad: {calculateAge(viewingStudent.birthDate)} años
                                </div>
                                <div className="bg-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-bold">
                                    Nac: {getSafeDate(viewingStudent.birthDate)}
                                </div>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{viewingStudent.dni}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTONERA DE PESTAÑAS (RESTAURADA) */}
                <div className="flex gap-2 p-2 bg-slate-800/50 shrink-0">
                    <button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Ficha Técnica</button>
                    <button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Bitácora Unificada</button>
                </div>
      
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative custom-scrollbar">
                    {/* CONTENIDO PESTAÑA 1: TODA LA INFO PERSONAL (LO QUE TENÍAS ANTES) */}
                    {activeModalTab === 'info' && (
                      <div className="space-y-4 text-sm animate-in fade-in">
                        {canSearchDrive && (
                            <button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nivel</p><p className="font-black text-slate-800 text-xs">{viewingStudent.level || '-'}</p></div>
                             <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center shadow-sm"><p className="text-[9px] text-purple-400 font-bold uppercase mb-1">DX</p><p className="font-black text-purple-800 text-xs">{viewingStudent.dx || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Género</p><p className="font-black text-slate-800 text-xs">{viewingStudent.gender || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Jornada</p><p className="font-black text-slate-800 text-xs">{viewingStudent.journey || '-'}</p></div>
                        </div>
                        <div className="space-y-2">
                             <div className="bg-gray-200 p-2 rounded-lg text-[10px] font-bold text-gray-600 uppercase text-center tracking-widest">Modalidad {viewingStudent.modality || 'Sede'}</div>
                             {viewingStudent.modality === 'Inclusión' ? (
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-3"><div className="flex justify-between items-center border-b border-indigo-200 pb-2"><span className="text-[10px] text-indigo-400 font-bold uppercase">Escuela de Origen</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.originSchool || '-'} ({viewingStudent.originGrade || '-'})</span></div><div className="flex justify-between items-center"><span className="text-[10px] text-indigo-400 font-bold uppercase">DAI Asignada</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.daiMorning || viewingStudent.daiAfternoon || 'Sin asignar'}</span></div></div>
                             ) : (
                                <div className="grid grid-cols-2 gap-3"><div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><p className="text-[9px] text-yellow-600 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupMorning || '-'}</p><p className="text-[9px] text-yellow-600 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherMorning || '-'}</p></div><div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><p className="text-[9px] text-indigo-500 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupAfternoon || '-'}</p><p className="text-[9px] text-indigo-500 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherAfternoon || '-'}</p></div></div>
                             )}
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1 mb-3"><Activity size={14}/> Salud y Obra Social</h4><div className="flex justify-between items-center text-xs"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><span className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><span className="font-bold text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</span></div></div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1 mb-3"><User size={14}/> Familia</h4><div className="space-y-3"><div className="flex justify-between items-start border-b border-gray-50 pb-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><span className="font-bold text-xs">{viewingStudent.motherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.motherContact || '-'}</span></div></div><div className="flex justify-between items-start"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><span className="font-bold text-xs">{viewingStudent.fatherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.fatherContact || '-'}</span></div></div></div><div className="mt-3 pt-2 border-t border-gray-100"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p></div></div></div>
                      </div>
                    )}

                    {/* CONTENIDO PESTAÑA 2: BITÁCORA UNIFICADA */}
                    {activeModalTab === 'history' && (
                      <div className="space-y-4 pb-20 animate-in fade-in">
                        {!isWriting && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
  {INCIDENT_TYPES.map((type) => (
    <button 
      key={type.label} 
      onClick={() => handleSaveIncident(type.label, "", type.severity)} // <-- Cambio aquí
      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}
    >
      <span className="text-2xl">{type.emoji}</span>
      <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
    </button>
  ))}
</div>
                        )}
                        <div className="space-y-3">
                          {(() => {
                            const normales = (viewingStudent.incidents || []).map(inc => ({ ...inc, source: 'aula' }));
                            const sociales = (socialCases || [])
                              .filter(c => (c.studentId === viewingStudent.id) || (c.studentName === `${viewingStudent.lastName}, ${viewingStudent.firstName}`))
                              .map(c => ({
                                date: c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
                                text: `⚠️ INTERVENCIÓN SOCIAL: ${c.reason}`,
                                author: c.reportedBy || 'Gabinete',
                                severity: 'high',
                                source: 'social',
                                isClosed: c.status === 'Reincorporado'
                              }));
                            const combined = [...normales, ...sociales].sort((a, b) => new Date(b.date) - new Date(a.date));
                            if (combined.length === 0) return <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200"><p className="text-gray-400 text-xs font-bold uppercase italic">Sin registros</p></div>;
                            return combined.map((inc, i) => (
                              <div key={i} className={`p-4 rounded-2xl border shadow-sm transition-all ${inc.source === 'social' ? (inc.isClosed ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 ring-2 ring-red-50') : getSeverityColor(inc.severity)}`}>
                                <div className="flex justify-between items-center mb-2 border-b border-gray-100/50 pb-1">
                                  <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(inc.date).toLocaleDateString('es-AR')}</span>
                                  {inc.source === 'aula' && <button onClick={() => deleteIncident(viewingStudent.id, inc)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={12}/></button>}
                                </div>
                                <p className={`text-xs font-bold leading-relaxed ${inc.isClosed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{inc.text || inc.type}</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">Origen: {inc.source === 'social' ? 'Gabinete' : 'Aula'} • Por: {inc.author}</p>
                              </div>
                            ));
                          })()}
                        </div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                          {isWriting ? (
                            <div className="animate-in slide-in-from-bottom">
                              <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm mb-2 h-24 outline-none"/>
                              {/* Reemplazo para el botón de guardar nota redactada */}
<div className="flex gap-2">
  <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
  <button 
    onClick={() => handleSaveIncident("Nota", newNote, "medium")} // <-- Cambio aquí de addIncident a handleSaveIncident
    disabled={!newNote.trim()} 
    className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-[10px]"
  >
    Guardar
  </button>
</div>
                            </div>
                          ) : (
                            <button onClick={() => setIsWriting(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:scale-[1.02]"><Edit3 size={18}/> Redactar Nota</button>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* BOTONERA INFERIOR */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
                    <button onClick={()=>imprimirListado([viewingStudent])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-[10px] uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir Ficha</button>
                    <button onClick={()=>openEdit(viewingStudent)} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO DE EDICIÓN (COMPLETO Y REVISADO) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{editingStudent ? 'Editar' : 'Nuevo'} Legajo</h3>
                
                {/* FOTO PERFIL */}
                <div className="flex justify-center mb-6">
                    <div className="relative group w-24 h-24">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">
                            {photoPreview || editingStudent?.photoUrl ? (
                                <img src={photoPreview || editingStudent?.photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                <User size={40} className="text-gray-300 m-auto mt-6" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            {uploading ? <RefreshCw className="animate-spin" size={14} /> : <Edit3 size={14} />}
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {/* SELECTOR MODALIDAD */}
                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button>
                        <button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button>
                    </div>

                    {/* ESTADO ACTIVO/INACTIVO */}
                    <div className={`p-3 rounded-xl border mb-2 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label>
                            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                {editingStudent?.isActive === false ? (
                                    <><AlertCircle size={12} className="text-red-500" /> BAJA / INACTIVO</>
                                ) : (
                                    <><CheckCircle size={12} className="text-green-500" /> ACTIVO (CURSANDO)</>
                                )}
                            </p>
                        </div>
                        <select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none">
                            <option value="true">Activo</option>
                            <option value="false">Inactivo (Baja)</option>
                        </select>
                    </div>

                    {/* NOMBRE Y APELLIDO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                    </div>

                    {/* DNI Y NACIMIENTO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500" />
                    </div>

                    {/* DATOS ESCOLARES Y GÉNERO */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-bold text-blue-700 text-xs uppercase">Datos Escolares y Personales</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Nivel</label>
                                <select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">Nivel...</option>
                                    <option value="INICIAL">INICIAL</option>
                                    <option value="1° Ciclo">1° Ciclo</option>
                                    <option value="2° Ciclo">2° Ciclo</option>
                                    <option value="CFI">CFI</option>
                                    <option value="SECUNDARIA">SECUNDARIA</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">DX</label>
                                <select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">DX...</option>
                                    <option value="DI">DI</option>
                                    <option value="TES">TES</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Género</label>
                                <select name="gender" defaultValue={editingStudent?.gender || ""} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">...</option>
                                    <option value="M">Varón</option>
                                    <option value="F">Mujer</option>
                                    <option value="X">Otro</option>
                                </select>
                            </div>
                        </div>

                        {/* SUB-SECCIÓN POR MODALIDAD */}
                        {formModalidad === 'Sede' ? (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs w-full bg-white" />
                                    <input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs w-full bg-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="teacherMorning" defaultValue={editingStudent?.teacherMorning} className="p-2 rounded-lg border text-xs w-full bg-white">
                                        <option value="">Docente TM...</option>
                                        {staffSede.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                    <select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon} className="p-2 rounded-lg border text-xs w-full bg-white">
                                        <option value="">Docente TT...</option>
                                        {staffSede.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <input name="originSchool" defaultValue={editingStudent?.originSchool} placeholder="Escuela de Origen" className="w-full p-2 rounded-lg border text-xs font-bold bg-white" />
                                <input name="originGrade" defaultValue={editingStudent?.originGrade} placeholder="Grado/Año" className="w-full p-2 rounded-lg border text-xs bg-white" />
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Mañana...</option>
                                        {editingStudent?.daiMorning && !staffInclusion.find(u => u.fullName === editingStudent?.daiMorning) && <option value={editingStudent.daiMorning}>{editingStudent.daiMorning} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                    <select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Tarde...</option>
                                        {editingStudent?.daiAfternoon && !staffInclusion.find(u => u.fullName === editingStudent?.daiAfternoon) && <option value={editingStudent.daiAfternoon}>{editingStudent.daiAfternoon} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100 mt-2">
                                    <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">📂 Carpeta Drive Personal</label>
                                    <input name="driveLink" defaultValue={editingStudent?.driveLink} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-lg border text-xs text-green-800 bg-white" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* SALUD Y FAMILIA */}
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                        <h4 className="font-bold text-green-800 text-xs uppercase">Salud y Familia</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500 bg-white" />
                        </div>
                        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs bg-white" placeholder="Dirección" />
                        <div className="grid grid-cols-2 gap-2">
                            <input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="border-t border-green-200 pt-2">
                            <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">Personas autorizadas a retirar</label>
                            <textarea name="pickupInfo" defaultValue={editingStudent?.pickupInfo} className="w-full p-2 rounded-lg border text-xs h-16 resize-none bg-white" placeholder="Abuela Marta, Tía Juana..." />
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>
                        {editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20} /></button>}
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {/* 3. MODAL GESTIÓN (NUBE) */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><UploadCloud className="text-blue-500"/> Gestión de Datos</h3>
                    <button onClick={()=>setShowDataManagement(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200 flex flex-col items-center gap-1">
                            <Search size={16}/> Buscar Duplicados
                        </button>
                      <button onClick={() => { setShowQuickFix(true); setShowDataManagement(false); }} className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 border border-purple-200 flex flex-col items-center gap-1">
    <Edit3 size={16}/> Saneamiento Rápido
</button>
                        <button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200 flex flex-col items-center gap-1">
                            <AlertTriangle size={16}/> Ver Sin Grupo
                        </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-600 text-xs mb-2 uppercase">Copia de Seguridad</h4>
                        <div className="flex gap-2">
                            <button onClick={descargarBackup} className="flex-1 py-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"><Download size={14}/> Descargar JSON</button>
                            <button onClick={handleBulkImport} disabled={processing} className="flex-1 py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 shadow-sm flex items-center justify-center gap-2">
                                {processing ? <RefreshCw className="animate-spin" size={14}/> : <><UploadCloud size={14}/> Importar JSON</>}
                            </button>
                        </div>
                    </div>
                    <button onClick={handleAutoAssignGenders} disabled={processing} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                        {processing ? <RefreshCw className="animate-spin" size={16}/> : <><User size={16}/> Asignar Género Automático</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE DUPLICADOS --- */}
      {duplicates && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-black text-red-600 uppercase flex items-center gap-2 text-xl italic">
                <AlertTriangle size={24}/> Duplicados ({duplicates.length})
              </h3>
              <button onClick={() => setDuplicates(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto space-y-4 pr-2">
              {duplicates.map((d, i) => (
                <div key={i} className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 bg-white inline-block px-3 py-1 rounded-full shadow-sm">
                    Coincidencia por {d.type}: {d.type === 'DNI' ? d.s2.dni : `${d.s2.lastName}, ${d.s2.firstName}`}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registro 1 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s1.lastName}, {d.s1.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s1.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s1.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s1.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg text-xs font-black uppercase hover:bg-red-200 transition">
                        Eliminar este
                      </button>
                    </div>

                    {/* Registro 2 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-200 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s2.lastName}, {d.s2.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s2.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s2.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s2.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg text-xs font-black uppercase shadow-md hover:bg-red-600 transition">
                        Eliminar clon
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

  {/* 4. MODAL ESTADÍSTICAS (CON FILTRO PRE-TALLER Y CONTADORES) */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3>
                        <p className="text-xs text-gray-500">Filtrado Acumulativo Preciso</p>
                    </div>
                    <button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                {/* RESULTADO GRANDE Y CONTADORES DIVIDIDOS */}
                <div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner">
                    <span className="text-5xl font-black text-violet-600 block mb-1">{statsResults.length}</span>
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[4px] mb-4 block">Coincidencias</span>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-white/60 p-2 rounded-2xl border border-blue-100">
                            <span className="block text-xl font-black text-blue-600">{statsResults.filter(x => x.gender === 'M').length}</span>
                            <span className="text-[8px] font-bold text-blue-400 uppercase">Varones</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-2xl border border-pink-100">
                            <span className="block text-xl font-black text-pink-600">{statsResults.filter(x => x.gender === 'F').length}</span>
                            <span className="text-[8px] font-bold text-pink-400 uppercase">Mujeres</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* BOTÓN FILTRO PRE-TALLER */}
                    <div className="p-1 bg-gray-100 rounded-2xl">
                        <button 
                            onClick={() => setStatOnlyPreTaller(!statOnlyPreTaller)}
                            className={`w-full py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${
                                statOnlyPreTaller 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-white text-gray-400 hover:text-emerald-500'
                            }`}
                        >
                            {statOnlyPreTaller ? '✅ Solo viendo Pre Taller' : '🔍 Filtrar por Pre Taller'}
                        </button>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Niveles</p>
                        <div className="flex flex-wrap gap-2">
                            {['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (
                                <button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Modalidad</p>
                        <div className="flex flex-wrap gap-2">
                            {['Sede', 'Inclusión'].map(mod => (
                                <button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                        <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varones (M)</option><option value="F">Mujeres (F)</option></select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                        <select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all', turn: 'all', journey: 'all' });
                        setStatOnlyPreTaller(false);
                    }} 
                    className="w-full py-3 text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-xl transition mt-6 border border-dashed border-red-100"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
      )}
  {/* 6. MODAL SANEAMIENTO RÁPIDO (LÓGICA ESTRICTA M/F) */}
      {showQuickFix && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Saneamiento de Datos</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Garantizando precisión en la matrícula</p>
              </div>
              <button onClick={() => setShowQuickFix(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
              <button onClick={() => setFixingField('gender')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'gender' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Falta Género (Estricto)</button>
              <button onClick={() => setFixingField('dx')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'dx' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>Falta Diagnóstico</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {students.filter(s => {
                  if (s.isActive === false) return false;
                  const value = s[fixingField];
                  
                  // LÓGICA ESTRICTA: 
                  // Si estamos en género, solo dejamos pasar si es exactamente 'M' o 'F'.
                  // Cualquier otra cosa (X, null, "", undefined) se considera dato a sanear.
                  if (fixingField === 'gender') {
                      return value !== 'M' && value !== 'F';
                  }
                  
                  return !value || (typeof value === 'string' && value.trim() === "");
              }).length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold uppercase italic">✨ ¡Matrícula 100% precisa y saneada!</div>
              ) : (
                students.filter(s => {
                    if (s.isActive === false) return false;
                    const val = s[fixingField];
                    if (fixingField === 'gender') return val !== 'M' && val !== 'F';
                    return !val || (typeof val === 'string' && val.trim() === "");
                }).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 uppercase text-sm">{s.lastName}, {s.firstName}</span>
                        {s.gender === 'X' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black">TIENE X</span>}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{s.modality || 'Sede'} - {s.level || 'Sin Nivel'}</span>
                    </div>
                    
                    {fixingField === 'gender' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'M')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition shadow-sm">VARÓN</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'F')} className="px-4 py-2 bg-pink-100 text-pink-700 rounded-xl text-xs font-black hover:bg-pink-600 hover:text-white transition shadow-sm">MUJER</button>
                    </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'TES')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">TES</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'DI')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">DI</button>
                        <input 
                          onBlur={(e) => e.target.value && handleQuickUpdate(s.id, 'dx', e.target.value)}
                          placeholder="Otro..." 
                          className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-purple-400 shadow-sm"
                        />
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest">Los cambios se guardan automáticamente en la nube</p>
          </div>
        </div>
      )}
      {/* 5. MODAL SIN GRUPO */}
      {showUnassigned && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-red-600">Alumnos Sin Grupo / Sin DAI ({unassignedList.length})</h3>
                    <button onClick={()=>setShowUnassigned(false)}><X/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {unassignedList.map(s=>(
                        <div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl">
                            <span className="font-bold">{s.lastName}, {s.firstName} <span className="text-red-500 text-xs ml-2">({s.modality || 'Sede'})</span></span>
                            <div className="flex gap-2">
                                <button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button>
                                <button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
// --- VISTA AUDITORÍA (ESTABLE) ---
function ActivityLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({
            id: d.id,
            action: d.data().title || 'Acción del sistema',
            details: d.data().message,
            user: 'Sistema', 
            date: d.data().createdAt ? new Date(d.data().createdAt.seconds * 1000) : new Date()
        }));
        setLogs(data);
        setLoading(false);
    });
    return () => unsub();
  }, []);

  const downloadReport = () => {
      const headers = ["Fecha", "Hora", "Acción", "Detalles"];
      const rows = logs.map(l => [l.date.toLocaleDateString(), l.date.toLocaleTimeString(), l.action, `"${l.details}"`]);
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `AUDITORIA_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white rounded-3xl overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div><h2 className="text-2xl font-black uppercase italic tracking-tighter">Auditoría Global</h2><p className="text-white/50 text-xs">Registro de movimientos</p></div>
            <button onClick={downloadReport} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl shadow-lg transition"><Download size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? <p className="text-center opacity-50">Cargando...</p> : logs.map(log => (
                <div key={log.id} className="bg-white/10 p-3 rounded-xl border border-white/5 flex gap-3 items-start">
                    <div className="mt-1"><Clock size={14} className="text-orange-400"/></div>
                    <div><p className="font-bold text-xs text-orange-200">{log.date.toLocaleString()}</p><p className="font-bold text-sm">{log.action}</p><p className="text-xs text-white/70">{log.details}</p></div>
                </div>
            ))}
        </div>
    </div>
  );
}
// --- NUEVA VISTA: EQUIPO TÉCNICO (CON CHATS DE ÁREA Y POR SALIDA) ---
function EquipoTecnicoView({ user }) {
    const [items, setItems] = useState([]);
    const [messages, setMessages] = useState([]); // Nuevo: Chat general
    const [outingsChats, setOutingsChats] = useState({}); // Nuevo: Control de chats de salidas
    
    // 1. DEFINICIÓN ESTRICTA DE ROLES
    const isSedeRole = ['Equipo Directivo', 'Equipo Técnico'].includes(user.role);
    const isInclusionRole = ['Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
    const isAdmin = ['admin', 'super-admin'].includes(user.role) || user.rol === 'admin';
    const canAccess = isSedeRole || isInclusionRole || isAdmin;

    // 2. EQUIPO POR DEFECTO SEGÚN ROL
    const defaultTeam = (isInclusionRole && !isAdmin && !isSedeRole) ? 'inclusion' : 'sede';
    const [activeTeam, setActiveTeam] = useState(defaultTeam);
    
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); 

    useEffect(() => {
        // Carga de ítems generales (Tareas, fechas, temas)
        const qItems = query(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'));
        const unsubItems = onSnapshot(qItems, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Carga del Chat General del equipo activo
        const qChat = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'tech_messages'),
            where('team', '==', activeTeam),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubChat = onSnapshot(qChat, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubItems(); unsubChat(); };
    }, [activeTeam]);

    // BLOQUEO TOTAL SI NO PERTENECE A ESTOS ROLES
    if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido a Equipos de Gestión y Técnicos.</div>;

    const teamItems = items.filter(i => i.team === activeTeam);
    
    const topics = teamItems.filter(i => i.type === 'topic').sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const tasks = teamItems.filter(i => i.type === 'task').sort((a,b) => {
        const statusOrder = { 'Pendiente': 0, 'En curso': 1, 'Completada': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
    });
    const dates = teamItems.filter(i => i.type === 'date').sort((a,b) => new Date(a.date) - new Date(b.date));
    const outings = teamItems.filter(i => i.type === 'outing').sort((a,b) => new Date(a.date) - new Date(b.date));

    const today = new Date().toISOString().split('T')[0];
    const upcomingDates = dates.filter(d => d.date >= today);
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    // --- FUNCIONES DE CHAT ---
    const sendChatMessage = async (e, parentId = null) => {
        if (e) e.preventDefault();
        const text = e.target.chatText.value;
        if (!text.trim()) return;
        
        const colName = parentId ? 'outings_messages' : 'tech_messages';
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
            text,
            author: user.firstName,
            authorId: user.id,
            team: activeTeam,
            parentId, // Solo para chat de salidas
            createdAt: serverTimestamp()
        });
        e.target.reset();
    };

    const handleAddTopic = async () => {
        const text = prompt("Nuevo tema para la reunión:");
        if (!text) return;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'), {
            type: 'topic', text, team: activeTeam, author: user.firstName, createdAt: serverTimestamp()
        });
    };

    const handleClearTopics = async () => {
        if (!confirm("¿Borrar todos los temas de esta reunión?")) return;
        const promises = topics.map(t => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', t.id)));
        await Promise.all(promises);
    };

    const handleDelete = async (id) => {
        if (confirm("¿Eliminar este registro?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', id));
        }
    };

    const toggleTaskStatus = async (task) => {
        const nextStatus = task.status === 'Pendiente' ? 'En curso' : task.status === 'En curso' ? 'Completada' : 'Pendiente';
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', task.id), { status: nextStatus });
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.type = modalType;
        data.team = activeTeam;
        data.author = user.firstName;
        data.createdAt = serverTimestamp();
        if(modalType === 'task') data.status = 'Pendiente';
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'), data);
        setShowModal(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in pb-20 px-2 pt-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                            <List className="text-teal-500" size={24}/> Organizador {activeTeam === 'sede' ? 'Sede' : 'Inclusión'}
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Espacio de Trabajo Confidencial</p>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        {(isSedeRole || isAdmin) && (
                            <button onClick={() => setActiveTeam('sede')} className={`flex-1 md:px-6 py-3 rounded-lg text-xs font-black uppercase transition ${activeTeam === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Sede</button>
                        )}
                        {(isInclusionRole || isAdmin) && (
                            <button onClick={() => setActiveTeam('inclusion')} className={`flex-1 md:px-6 py-3 rounded-lg text-xs font-black uppercase transition ${activeTeam === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Inclusión</button>
                        )}
                    </div>
                </div>
            </div>

            {nextDate && (
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 rounded-2xl shadow-lg text-white flex items-center justify-between animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl"><AlertTriangle size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-teal-100">Próximo Vencimiento / Evento</p>
                            <h3 className="font-bold text-lg">{nextDate.title}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="bg-white text-teal-700 px-3 py-1 rounded-lg text-sm font-black shadow-sm">
                            {new Date(nextDate.date + 'T00:00:00').toLocaleDateString('es-AR')}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    {/* PRÓXIMA REUNIÓN */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><FileText size={18} className="text-orange-500"/> Próxima Reunión</h3>
                            <div className="flex gap-2">
                                <button onClick={handleAddTopic} className="bg-orange-100 text-orange-700 p-2 rounded-lg hover:bg-orange-200 transition"><Plus size={16}/></button>
                                {topics.length > 0 && <button onClick={handleClearTopics} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition" title="Limpiar todo"><Trash2 size={16}/></button>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {topics.length === 0 ? <p className="text-xs text-gray-400 italic">No hay temas agendados.</p> : topics.map(t => (
                                <div key={t.id} className="flex justify-between items-start bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 group">
                                    <div className="flex gap-2 items-start">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0"></div>
                                        <p className="text-sm font-bold text-gray-700">{t.text}</p>
                                    </div>
                                    <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TAREAS EQUIPO */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CheckSquare size={18} className="text-blue-500"/> Tareas del Equipo</h3>
                            <button onClick={() => {setModalType('task'); setShowModal(true);}} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {tasks.map(t => (
                                <div key={t.id} className={`p-3 rounded-xl border transition flex justify-between items-center group ${t.status === 'Completada' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div>
                                        <h4 className={`font-bold text-sm ${t.status === 'Completada' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{t.title}</h4>
                                        <p className="text-[10px] font-black text-blue-500 uppercase mt-1">Responsable: {t.assignee}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleTaskStatus(t)} className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition ${t.status === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-200' : t.status === 'En curso' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{t.status}</button>
                                        <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NUEVO: CHAT GENERAL EQUIPO */}
                    <div className="bg-slate-900 p-6 rounded-[40px] shadow-xl text-white h-[400px] flex flex-col border-b-8 border-blue-600">
                        <h3 className="font-black uppercase italic text-[10px] mb-4 flex items-center gap-2 text-blue-400"><MessageSquare size={16}/> Muro de Comunicación</h3>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar flex flex-col-reverse">
                            {messages.map(m => (
                                <div key={m.id} className={`p-3 rounded-2xl max-w-[85%] ${m.authorId === user.id ? 'bg-blue-600 self-end rounded-tr-none' : 'bg-slate-800 self-start rounded-tl-none'}`}>
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-1">{m.author}</p>
                                    <p className="text-sm font-medium">{m.text}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendChatMessage} className="flex gap-2">
                            <input name="chatText" placeholder="Escribir..." className="flex-1 bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-blue-500 outline-none" />
                            <button type="submit" className="bg-blue-600 p-3 rounded-2xl active:scale-90 transition-transform"><Send size={20}/></button>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* FECHAS IMPORTANTE */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> Fechas Importantes</h3>
                            <button onClick={() => {setModalType('date'); setShowModal(true);}} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            {dates.map(d => (
                                <div key={d.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm group">
                                    <div className="flex gap-3 items-center">
                                        <div className="bg-emerald-100 text-emerald-800 text-center rounded-lg px-2 py-1 min-w-[50px]">
                                            <span className="block text-sm font-black leading-none">{d.date.split('-')[2]}</span>
                                            <span className="block text-[9px] uppercase font-bold">{new Date(d.date+'T00:00:00').toLocaleString('es-ES', {month:'short'})}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-700">{d.title}</h4>
                                    </div>
                                    <button onClick={() => handleDelete(d.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SALIDAS / PROYECTOS CON CHAT */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><span className="text-lg">📍</span> Salidas / Proyectos</h3>
                            <button onClick={() => {setModalType('outing'); setShowModal(true);}} className="bg-purple-50 text-purple-600 p-2 rounded-lg hover:bg-purple-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {outings.map(o => (
                                <div key={o.id} className="bg-purple-50/30 rounded-2xl border border-purple-100 overflow-hidden group">
                                    <div className="p-4">
                                        <div className="flex justify-between">
                                            <h4 className="font-black text-purple-900 text-sm mb-1">{o.title}</h4>
                                            <button onClick={() => handleDelete(o.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border">📅 {new Date(o.date+'T00:00:00').toLocaleDateString('es-AR')}</span>
                                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border">👥 {o.groups}</span>
                                        </div>
                                        <button onClick={() => setOutingsChats(prev => ({...prev, [o.id]: !prev[o.id]}))} className={`w-full mt-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${outingsChats[o.id] ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-purple-600 border border-purple-100'}`}>
                                            {outingsChats[o.id] ? 'Cerrar Coordinación' : '💬 Chat de Coordinación'}
                                        </button>
                                    </div>
                                    {outingsChats[o.id] && (
                                        <div className="bg-white border-t p-4 animate-in slide-in-from-top-2">
                                            <form onSubmit={(e) => sendChatMessage(e, o.id)} className="flex gap-2">
                                                <input name="chatText" placeholder="Anotar algo..." className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-xs outline-none" />
                                                <button type="submit" className="bg-purple-600 text-white p-2 rounded-xl"><Send size={14}/></button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleSaveForm} className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase italic">
                                {modalType === 'task' ? 'Nueva Tarea' : modalType === 'date' ? 'Nueva Fecha' : 'Nueva Salida'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)}><X/></button>
                        </div>
                        <div className="space-y-3">
                            <input name="title" placeholder="Título" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-blue-300" required />
                            {modalType === 'task' && <input name="assignee" placeholder="Responsable" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />}
                            {(modalType === 'date' || modalType === 'outing') && <input name="date" type="date" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border font-bold" required />}
                            {modalType === 'outing' && (
                                <>
                                    <input name="groups" placeholder="Grupos" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />
                                    <textarea name="ideas" placeholder="Propósito..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-16 resize-none" required />
                                </>
                            )}
                            <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-xs shadow-lg mt-2">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
function SocialView({ user }) {
  const [cases, setCases] = useState([]);
  const [students, setStudents] = useState([]);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('active'); 
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState({});
  const [selectedCase, setSelectedCase] = useState(null); 
  const [searchTerm, setSearchTerm] = useState(''); // <--- NUEVO ESTADO

  const isAllowed = ['admin', 'super-admin', 'Docente', 'Auxiliar/Preceptor', 'Equipo Directivo', 'Equipo Técnico'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    if (!isAllowed) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'));
    const unsub = onSnapshot(q, (snap) => {
      setCases(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
      setLoading(false);
    });
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsub(); unsubStudents(); };
  }, [isAllowed]);

  const hasNews = (c) => {
    const lastSeenCount = parseInt(localStorage.getItem(`lastSeenSocial_${c.id}_${user.id}`) || "0");
    return (c.history?.length || 0) > lastSeenCount;
  };

  const handleOpenCase = (c) => {
    const studentInfo = students.find(s => 
      s.id === c.studentId || 
      `${s.lastName}, ${s.firstName}`.trim().toLowerCase() === c.studentName.trim().toLowerCase()
    );
    setSelectedCase({ ...c, fullInfo: studentInfo });
    localStorage.setItem(`lastSeenSocial_${c.id}_${user.id}`, c.history?.length || 0);
  };

  const updateStep = async (caseId, stepName) => {
    const c = cases.find(x => x.id === caseId);
    const field = stepName === 'continuidad' ? 'sent' : 'done';
    const currentValue = c.steps?.[stepName]?.[field] || false;
    const label = stepName === 'continuidad' ? 'CONTINUIDAD PEDAGÓGICA' : 'LLAMADA A LA FAMILIA';
    const userFullName = user.fullName || `${user.firstName} ${user.lastName}`;

    if (!currentValue) {
      const autoNote = { 
        date: new Date().toISOString(), 
        text: `📢 REGISTRO AUTOMÁTICO: ${userFullName} marcó como REALIZADA la acción de "${label}".`, 
        author: userFullName
      };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { history: arrayUnion(autoNote) });
    }

    const newSteps = { 
      ...c.steps, 
      [stepName]: { ...c.steps?.[stepName], [field]: !currentValue, date: !currentValue ? new Date().toLocaleDateString('es-AR') : null, author: userFullName } 
    };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { steps: newSteps });
    setSelectedCase(prev => ({ 
      ...prev, 
      steps: newSteps,
      history: !currentValue ? [...(prev.history || []), { text: `📢 REGISTRO AUTOMÁTICO: Marcaron como realizada "${label}".`, author: userFullName, date: new Date().toISOString() }] : prev.history 
    }));
  };

 const handleAddComment = async (caseId) => {
    const text = newComment[caseId];
    if (!text || !text.trim()) return;
    const userFullName = user.fullName || `${user.firstName} ${user.lastName}`;
    const entry = { date: new Date().toISOString(), text: text.trim(), author: userFullName };
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { 
        history: arrayUnion(entry) 
      });

      // --- PARCHE PUNTOS MAYO ---
      if (new Date() >= new Date('2026-05-01')) {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
          await updateDoc(userRef, { score: increment(10) });
      }
      // --------------------------

      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase(prev => ({ ...prev, history: [...(prev.history || []), entry] }));
      }
      setNewComment({ ...newComment, [caseId]: "" });
      alert("💬 Comentario registrado (+10 pts)");
    } catch (error) {
      alert("No se pudo enviar el mensaje.");
    }
  };

  const handleArchiveCase = async (c) => {
    const confirmMsg = c.status === 'Reincorporado' 
      ? "¿Deseas reactivar este caso?" 
      : "❗ ¿Imprimiste el reporte para el legajo físico? El caso pasará al archivo.";
    
    if (confirm(confirmMsg)) {
        const newStatus = c.status === 'Reincorporado' ? 'Pendiente' : 'Reincorporado';
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', c.id), { status: newStatus });
        setSelectedCase(null);
    }
  };

  const imprimirSeguimientoSocial = (c) => {
    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe - ${c.studentName}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; background: white; }
            .header { border-bottom: 4px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo-img { height: 50px; width: auto; }
            .main-card { border: 2px solid #e2e8f0; border-radius: 15px; padding: 15px; margin-bottom: 20px; background: #f8fafc; }
            .label { font-size: 9px; font-weight: 900; color: #2563eb; text-transform: uppercase; display: block; }
            .value { font-size: 13px; font-weight: bold; }
            .history-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .history-meta { font-size: 9px; font-weight: 800; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" class="logo-img" />
            <div style="text-align: right;">
              <h1 style="margin:0; font-size: 18px; color: #1e3a8a;">JUNTOS A LA PAR</h1>
              <p style="margin:0; font-size: 10px; font-weight: bold;">INFORME SOCIAL</p>
            </div>
          </div>
          <div class="main-card">
            <div><span class="label">Estudiante</span><div class="value">${c.studentName}</div></div>
            <div style="margin-top:10px;"><span class="label">Motivo del Reporte</span><div class="value" style="font-style:italic;">"${c.reason}"</div></div>
          </div>
          <h3>Seguimiento</h3>
          ${c.history?.map(h => `
            <div class="history-item">
              <div class="history-meta"><span>${new Date(h.date).toLocaleDateString('es-AR')}</span><span>${h.author.toUpperCase()}</span></div>
              <div style="font-size:11px; margin-top:4px;">${h.text}</div>
            </div>
          `).join('') || '<p>Sin registros.</p>'}
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 800); };</script>
        </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) { window.location.href = url; }
  };

  const filteredCases = cases.filter(c => {
    // 1. Filtro por búsqueda de texto (ignora el modo de vista si se está buscando)
    const isSearching = searchTerm.trim().length > 0;
    const matchesSearch = !isSearching || 
      c.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.fullInfo?.dni && c.fullInfo.dni.includes(searchTerm));

    if (!matchesSearch) return false;

    // 2. Filtro de vista (Activo vs Archivados) - Sólo se aplica si NO estamos buscando
    if (!isSearching) {
      const matchStatus = viewMode === 'archived' ? c.status === 'Reincorporado' : c.status !== 'Reincorporado';
      if (!matchStatus) return false;
    }

    // 3. Filtros por ciclo
    const level = (c.level || '').toUpperCase();
    if (filter === 'primeros' && !(level.includes('INICIAL') || level.includes('1°'))) return false;
    if (filter === 'segundos' && !(level.includes('2°') || level.includes('CFI'))) return false;
    
    return true;
  });

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in pb-20">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-4 md:p-6 rounded-b-[40px] shadow-sm border-b border-blue-100 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white"><Users size={24}/></div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Seguimiento Social</h2>
          </div>
          <button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all ${viewMode === 'active' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
            {viewMode === 'active' ? 'Ver Archivo' : 'Ver Activos'}
          </button>
        </div>

        {/* BUSCADOR Y FILTRO CICLO */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all">
            <Search size={18} className="text-slate-400"/>
            <input 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
              placeholder="Buscar por nombre, apellido o DNI..." 
              className="w-full p-3 bg-transparent outline-none text-sm font-bold"
            />
            {searchTerm && <button onClick={() => setSearchTerm('')}><X size={16} className="text-slate-400"/></button>}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-100 text-slate-600 font-bold text-[10px] p-3 rounded-xl uppercase outline-none border-none">
            <option value="all">Todos los Ciclos</option>
            <option value="primeros">Inicial / 1° Ciclo</option>
            <option value="segundos">2° Ciclo / CFI</option>
          </select>
        </div>
      </div>

      {/* LISTA VERTICAL */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
        {loading ? <p className="text-center py-20 opacity-20 font-black">CARGANDO...</p> : filteredCases.map(c => {
            const caseHasNews = hasNews(c);
            const isArchived = c.status === 'Reincorporado';
            return (
              <div key={c.id} onClick={() => handleOpenCase(c)} className={`bg-white p-5 rounded-[30px] border-2 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${isArchived ? 'opacity-60 grayscale' : ''} ${caseHasNews ? 'border-orange-400 ring-4 ring-orange-50 shadow-lg' : 'border-transparent shadow-sm hover:border-blue-100'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 ${isArchived ? 'bg-slate-400' : caseHasNews ? 'bg-orange-500 animate-pulse' : 'bg-blue-600 shadow-inner'}`}>{c.studentName[0]}</div>
                  <div className="truncate">
                    <h4 className="font-black text-slate-700 text-sm uppercase truncate leading-tight">{c.studentName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{c.level}</p>
                      {isArchived && <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Archivado</span>}
                    </div>
                    {caseHasNews && !isArchived && <p className="text-[8px] font-black text-orange-600 uppercase mt-1 animate-bounce">● Mensaje nuevo</p>}
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300"/>
              </div>
            );
        })}
      </div>

      {selectedCase && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-2xl">
            <button onClick={() => setSelectedCase(null)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition">
              <ChevronLeft size={20}/> <span className="text-xs font-black uppercase tracking-tighter">Volver</span>
            </button>
            <div className="text-center flex-1 min-w-0"><h2 className="text-sm font-black uppercase truncate px-4">{selectedCase.studentName}</h2></div>
            <div className="flex gap-2">
              <button onClick={() => imprimirSeguimientoSocial(selectedCase)} className="p-3 bg-white/10 rounded-xl hover:bg-blue-600 transition" title="Imprimir"><Printer size={20}/></button>
              <button onClick={() => handleArchiveCase(selectedCase)} className={`p-3 rounded-xl transition ${selectedCase.status === 'Reincorporado' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-white/10 hover:bg-emerald-600'}`} title={selectedCase.status === 'Reincorporado' ? "Reactivar" : "Archivar"}>
                {selectedCase.status === 'Reincorporado' ? <RefreshCw size={20}/> : <Folder size={20}/>}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row h-full">
            <div className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-200 p-6 space-y-6 shrink-0 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-[40px] bg-slate-100 border-4 border-white shadow-xl overflow-hidden mb-3">
                  {selectedCase.fullInfo?.photoUrl ? (
                    <img src={selectedCase.fullInfo.photoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-6xl uppercase">{selectedCase.studentName[0]}</div>
                  )}
                </div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">DNI: {selectedCase.fullInfo?.dni || 'S/D'}</p>
              </div>

              <button onClick={() => setViewingStudent(selectedCase.fullInfo)} className="w-full py-4 bg-orange-500 text-white rounded-3xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                  <BookOpen size={18}/> Ver Bitácora de Aula
              </button>

              <div className="bg-orange-50 p-5 rounded-[35px] border border-orange-100 space-y-4">
                <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">Ubicación y Equipo</h4>
                <div className="space-y-3 text-xs font-bold">
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Nivel / Ciclo</p>
                        <p className="text-slate-800 uppercase">{selectedCase.fullInfo?.level || 'S/D'}</p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Mañana: {selectedCase.fullInfo?.groupMorning || '-'}</p>
                        <p className="text-[10px] text-slate-700">Doc: {selectedCase.fullInfo?.teacherMorning || '-'}</p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Tarde: {selectedCase.fullInfo?.groupAfternoon || '-'}</p>
                        <p className="text-[10px] text-slate-700">Doc: {selectedCase.fullInfo?.teacherAfternoon || '-'}</p>
                    </div>
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-[35px] border border-blue-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1">Familia</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Madre: {selectedCase.fullInfo?.motherName || 'S/D'}</p>
                    <a href={`tel:${selectedCase.fullInfo?.motherContact}`} className="text-blue-600 text-sm font-black flex items-center gap-1">{selectedCase.fullInfo?.motherContact || 'S/N'}</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 h-full min-h-[600px]">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button onClick={() => updateStep(selectedCase.id, 'llamada')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.llamada?.done ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <Phone size={24}/> <span className="text-[11px] font-black uppercase">Llamada</span>
                </button>
                <button onClick={() => updateStep(selectedCase.id, 'continuidad')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.continuidad?.sent ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <BookOpen size={24}/> <span className="text-[11px] font-black uppercase">Continuidad</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col bg-white rounded-[45px] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/20">
                  {selectedCase.history?.map((h, i) => (
                    <div key={i} className={`flex flex-col ${h.author.includes(user.firstName) ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-[25px] text-sm font-bold shadow-sm ${h.author.includes(user.firstName) ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase opacity-60 mb-2">{h.author} • {new Date(h.date).toLocaleDateString()}</p>
                        {h.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input value={newComment[selectedCase.id] || ""} onChange={(e) => setNewComment({ ...newComment, [selectedCase.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedCase.id)} placeholder="Registrar novedad..." className="flex-1 bg-slate-100 p-4 rounded-2xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500"/>
                  <button onClick={() => handleAddComment(selectedCase.id)} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex-shrink-0"><Send size={20}/></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALLE ESTUDIANTE (BITÁCORA DE AULA) */}
      {viewingStudent && (
          <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4 backdrop-blur-md animate-in zoom-in-95">
              <div className="bg-white rounded-[45px] w-full max-w-lg p-8 relative shadow-2xl flex flex-col max-h-[90vh]">
                  <button onClick={() => setViewingStudent(null)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-500 transition"><X size={28}/></button>
                  <h3 className="font-black text-2xl text-slate-800 uppercase tracking-tighter leading-none mb-4">{viewingStudent.lastName}, {viewingStudent.firstName}</h3>
                  <div className="flex-1 overflow-y-auto space-y-6 custom-scrollbar pr-2">
                      <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 grid grid-cols-2 gap-6">
                          <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">DNI</label><p className="font-bold text-slate-800">{viewingStudent.dni || '-'}</p></div>
                          <div><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">F. Nac</label><p className="font-bold text-slate-800">{viewingStudent.birthDate || '-'}</p></div>
                          <div className="col-span-2"><label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Obra Social</label><p className="font-bold text-slate-800 uppercase">{viewingStudent.healthInsurance || 'S/D'}</p></div>
                      </div>
                      <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-violet-600 uppercase tracking-widest ml-1">Bitácora Pedagógica (Aula)</h4>
                          {viewingStudent.incidents && viewingStudent.incidents.length > 0 ? (
                              viewingStudent.incidents.slice().reverse().map((inc, idx) => (
                                <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[9px] font-black text-violet-400 uppercase">{new Date(inc.date).toLocaleDateString()}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">Por: {inc.author}</span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-700 leading-relaxed">{inc.text || inc.type}</p>
                                </div>
                              ))
                          ) : (
                              <p className="text-center text-xs text-gray-400 italic py-4">No hay incidentes de aula registrados.</p>
                          )}
                      </div>
                  </div>
                  <button onClick={() => setViewingStudent(null)} className="w-full mt-8 py-5 bg-slate-900 text-white rounded-[25px] font-black uppercase text-xs tracking-widest shadow-xl shrink-0">Cerrar Ficha</button>
              </div>
          </div>
      )}
    </div>
  );
}




function MedicalView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEvoForm, setShowEvoForm] = useState(false);

  // Permisos: Solo Salud, Directivos y Admins
  const canAccess = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user.role) || user.rol === 'admin';

 // --- DENTRO DE MEDICALVIEW ---
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    
    // CORRECCIÓN: Borramos la referencia a setUsersList que no existe aquí
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, (snap) => { 
        // Si necesitas el personal en esta vista, declará [staff, setStaff] arriba
        // sino, simplemente borrá esta suscripción.
    });

    return () => { unsubS(); unsubStaff(); };
  }, []);

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

 // --- FUNCIÓN PARA VERIFICAR ESTADO DE CUD (AGREGAR ESTA) ---
  const checkCudStatus = (cudDate) => {
    if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
    
    const today = new Date();
    const exp = new Date(cudDate + 'T00:00:00');
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
    if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` }; // Alerta 3 meses antes
    
    return { status: 'ok', text: 'Vigente' };
  };
  const handleSaveMedicalData = async (e) => {
      e.preventDefault();
      setSaving(true);
      const fd = new FormData(e.target);
      
      const updates = {
          healthInsurance: fd.get('healthInsurance'),
          cudExpiration: fd.get('cudExpiration'),
          cudDiagnosis: fd.get('cudDiagnosis'),
          allergies: fd.get('allergies'),
          medication: fd.get('medication'),
          weight: fd.get('weight'),
          vaccines: fd.get('vaccines')
      };

      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), updates);
          setSelectedStudent({ ...selectedStudent, ...updates });
          setIsEditing(false);
      } catch (err) { alert("Error al guardar: " + err.message); } 
      finally { setSaving(false); }
  };

  const handleAddEvolution = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const text = fd.get('text');
      const date = fd.get('date');
      if (!text.trim()) return;

      const newEvo = {
          id: Date.now().toString(),
          date: date,
          text: text.trim(),
          author: user.firstName + (user.lastName ? ' ' + user.lastName : '')
      };
      
      try {
          setSaving(true);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { 
            medicalEvolutions: arrayUnion(newEvo) 
          });

          // --- PARCHE PUNTOS MAYO ---
          if (new Date() >= new Date('2026-05-01')) {
              const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
              await updateDoc(userRef, { score: increment(10) });
          }
          // --------------------------

          setSelectedStudent({ ...selectedStudent, medicalEvolutions: [...(selectedStudent.medicalEvolutions || []), newEvo] });
          setShowEvoForm(false);
          alert("📋 Evolución médica guardada (+10 pts)");
      } catch (err) { alert("Error: " + err.message); }
      finally { setSaving(false); }
  };
      
    const updatedEvos = [...(selectedStudent.medicalEvolutions || []), newEvo];
      
      

  const handleDeleteEvolution = async (evoId) => {
      if (!confirm("¿Seguro que querés eliminar este registro clínico?")) return;
      const updatedEvos = (selectedStudent.medicalEvolutions || []).filter(e => e.id !== evoId);
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { medicalEvolutions: updatedEvos });
          setSelectedStudent({ ...selectedStudent, medicalEvolutions: updatedEvos });
      } catch (err) { alert("Error al eliminar: " + err.message); }
  };

  // --- FUNCIÓN DE IMPRESIÓN ACTUALIZADA CON LOGO ---
  const imprimirHistoriaClinica = (student) => {
      const fullDate = new Date().toLocaleDateString('es-AR');
      const evos = student.medicalEvolutions || [];
      
      let evosHtml = evos.length > 0 
          ? evos.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dotted #ccc;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;"><strong>${new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR')}</strong> | Registro de: ${e.author}</div>
              <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${e.text}</div>
            </div>`).join('')
          : '<p style="font-size: 13px; color: #666; font-style: italic;">No hay registros clínicos guardados en este legajo.</p>';

      let html = `
      <html><head><title>Historia Clínica - ${student.lastName}</title>
      <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #111; line-height: 1.4; position: relative; min-height: 100vh; padding-bottom: 150px;}
          .header { border-bottom: 3px solid #b91c1c; padding-bottom: 15px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between;}
          .title { font-size: 22px; font-weight: 900; color: #b91c1c; text-transform: uppercase; }
          .subtitle { font-size: 14px; font-weight: bold; color: #555; margin-top: 5px;}
          .section { margin-bottom: 25px; }
          .section-title { background: #fee2e2; color: #991b1b; padding: 8px 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 15px; border-radius: 4px;}
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .label { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px;}
          .value { font-size: 14px; font-weight: bold; color: #000;}
          .signature-box { width: 100%; max-width: 300px; text-align: center; font-size: 12px; color: #333; }
          @media print {
            .signature-container { position: fixed; bottom: 30px; left: 30px; right: 30px; display: flex; justify-content: flex-end; width: calc(100% - 60px); }
          }
          @media screen {
            .signature-container { margin-top: 50px; display: flex; justify-content: flex-end; }
          }
      </style>
      </head><body>
          <div class="header">
              <div style="display: flex; align-items: center; gap: 15px;">
                <img src="/icon-192.png" alt="Logo Escuela" style="width: 60px; height: 60px; object-fit: contain;">
                  <div>
                      <div class="title">HISTORIA CLÍNICA</div>
                      <div class="subtitle">Escuela de Educación Especial "Juntos a la Par"</div>
                  </div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #666;">
                  Documento Confidencial<br/>
                  Fecha de impresión: <strong>${fullDate}</strong>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Datos del Paciente</div>
              <div class="grid">
                  <div><span class="label">Nombre y Apellido</span><div class="value">${student.lastName.toUpperCase()}, ${student.firstName}</div></div>
                  <div><span class="label">DNI</span><div class="value">${student.dni || '-'}</div></div>
                  <div><span class="label">Fecha de Nacimiento</span><div class="value">${student.birthDate ? new Date(student.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</div></div>
                  <div><span class="label">Edad Actual</span><div class="value">${calculateAge(student.birthDate)} años</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Información Médica de Base</div>
              <div class="grid">
                  <div><span class="label">Obra Social</span><div class="value">${student.healthInsurance || 'No declara'}</div></div>
                  <div><span class="label">Vencimiento CUD</span><div class="value">${student.cudExpiration ? new Date(student.cudExpiration + 'T00:00:00').toLocaleDateString('es-AR') : 'Sin cargar'}</div></div>
                  <div style="grid-column: span 2;"><span class="label">Diagnóstico CUD / Médico</span><div class="value">${student.cudDiagnosis || 'S/D'}</div></div>
                  <div style="grid-column: span 2; padding: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 4px;">
                      <span class="label" style="color: #be123c;">Alergias Declaradas</span>
                      <div class="value" style="color: #9f1239;">${student.allergies || 'Ninguna'}</div>
                  </div>
                  <div style="grid-column: span 2;"><span class="label">Medicación Habitual</span><div class="value">${student.medication || 'S/D'}</div></div>
                  <div><span class="label">Peso Aprox.</span><div class="value">${student.weight ? student.weight + ' kg' : 'S/D'}</div></div>
                  <div><span class="label">Vacunación</span><div class="value">${student.vaccines || 'S/D'}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Registros y Evoluciones</div>
              ${evosHtml}
          </div>

          <div class="signature-container">
            <div class="signature-box">
                <img src="/firmamedico.jfif" alt="Firma del Médico" style="max-width: 220px; max-height: 120px; object-fit: contain;">
                <p style="margin: 0; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px;">_________________________</p>
                <p style="margin: 2px 0 0 0;">Firma y Sello Profesional</p>
            </div>
          </div>
      </body></html>
      `;

      const iframe = document.createElement('iframe'); 
      iframe.style.position = 'fixed'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
      document.body.appendChild(iframe); 
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close(); 
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
    return fullName.includes(filterText.toLowerCase());
  }).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido al Departamento Médico.</div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 pt-4">
        
        {!selectedStudent ? (
            /* --- PANTALLA 1: LISTADO DE PACIENTES --- */
            <>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-red-700 uppercase italic flex items-center gap-2">
                            <Activity size={24} /> Fichas Médicas
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Gabinete de Salud Institucional</p>
                    </div>
                    <div className="flex bg-gray-50 rounded-xl items-center px-3 border border-gray-200 w-full md:w-72 shadow-inner">
                        <Search size={16} className="text-gray-400"/>
                        <input 
                            placeholder="Buscar paciente..." 
                            value={filterText}
                            onChange={e=>setFilterText(e.target.value)} 
                            className="bg-transparent p-3 text-xs font-bold outline-none w-full text-gray-700"
                        />
                        {filterText && <button onClick={() => setFilterText('')} className="text-gray-400 hover:text-red-500"><X size={14}/></button>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStudents.map(s => {
                        const cud = checkCudStatus(s.cudExpiration);
                        const hasAlert = cud.status === 'expired' || cud.status === 'warning' || (s.allergies && s.allergies.length > 2);

                        return (
                            <div key={s.id} onClick={() => { setSelectedStudent(s); setIsEditing(false); setShowEvoForm(false); }} className={`bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-3 ${hasAlert ? 'border-red-200' : 'border-transparent'}`}>
                                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-300 font-black shrink-0 overflow-hidden border border-red-100">
                                    {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 text-sm truncate uppercase">{s.lastName}, {s.firstName}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold">{calculateAge(s.birthDate)} años | OS: {s.healthInsurance || 'S/D'}</p>
                                    
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {cud.status !== 'none' && (
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${cud.status === 'expired' ? 'bg-red-100 text-red-700' : cud.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                CUD: {cud.text}
                                            </span>
                                        )}
                                        {s.allergies && s.allergies.length > 2 && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase bg-orange-100 text-orange-700 flex items-center gap-1">
                                                <AlertTriangle size={8}/> Alergias
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        ) : (
            /* --- PANTALLA 2: FICHA CLÍNICA (INTEGRADA, SIN MODAL) --- */
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 fade-in duration-300">
                
                {/* ENCABEZADO DE LA FICHA */}
                <div className="bg-red-700 p-6 text-white relative">
                    <button onClick={() => setSelectedStudent(null)} className="mb-4 flex items-center gap-2 text-red-200 hover:text-white transition font-black uppercase text-xs tracking-widest">
                        ← Volver a Pacientes
                    </button>
                    
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center font-black text-2xl">
                                {selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : selectedStudent.firstName[0]}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedStudent.lastName}, {selectedStudent.firstName}</h2>
                                <p className="text-red-200 font-bold text-xs uppercase mt-1">DNI: {selectedStudent.dni || '-'} • {calculateAge(selectedStudent.birthDate)} AÑOS</p>
                            </div>
                        </div>
                        <button onClick={() => imprimirHistoriaClinica(selectedStudent)} className="bg-white text-red-700 px-4 py-3 rounded-xl shadow-md hover:bg-red-50 transition flex items-center gap-2 font-black uppercase text-[10px] md:text-xs">
                            <Printer size={18}/> Imprimir Ficha
                        </button>
                    </div>
                </div>

                {/* CUERPO DE LA FICHA */}
                <div className="p-4 md:p-6 bg-gray-50 flex-1">
                    {!isEditing ? (
                        <div className="space-y-6">
                            {/* ALERTAS */}
                            {(selectedStudent.allergies || checkCudStatus(selectedStudent.cudExpiration).status === 'expired') && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-inner">
                                    <h4 className="text-red-800 font-black text-xs uppercase flex items-center gap-1 mb-2"><AlertTriangle size={14}/> Alertas Médicas</h4>
                                    {selectedStudent.allergies && <p className="text-sm font-bold text-red-700 mb-1">Alergias: <span className="font-medium text-red-600">{selectedStudent.allergies}</span></p>}
                                    {checkCudStatus(selectedStudent.cudExpiration).status === 'expired' && <p className="text-sm font-bold text-red-700">CUD: <span className="font-medium text-red-600">Vencido ({getSafeDate(selectedStudent.cudExpiration)})</span></p>}
                                </div>
                            )}

                            {/* DATOS ESTÁTICOS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Obra Social</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.healthInsurance || 'No declara'}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento CUD</p>
                                    <p className={`font-bold ${checkCudStatus(selectedStudent.cudExpiration).status === 'expired' ? 'text-red-600' : 'text-slate-800'}`}>
                                        {getSafeDate(selectedStudent.cudExpiration)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Diagnóstico CUD / Médico</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.cudDiagnosis || 'Sin datos cargados'}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Medicación Habitual</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.medication || 'No refiere'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Peso (Aprox)</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.weight ? `${selectedStudent.weight} kg` : 'S/D'}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vacunación</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.vaccines || 'S/D'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase shadow-md hover:bg-gray-800 transition flex items-center gap-2">
                                    <Edit3 size={16}/> Editar Datos Fijos
                                </button>
                            </div>

                            {/* SECCIÓN EVOLUCIONES FORMALES */}
                            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                                    <h4 className="font-black text-red-800 uppercase flex items-center gap-2 text-lg"><FileText size={20}/> Evoluciones Médicas</h4>
                                    <button onClick={() => setShowEvoForm(true)} className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-md text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-red-700 transition">
                                        <Plus size={16}/> Nuevo Registro
                                    </button>
                                </div>
                                
                                {showEvoForm && (
                                    <form onSubmit={handleAddEvolution} className="bg-white p-6 rounded-2xl border border-red-200 shadow-lg mb-8 animate-in slide-in-from-top-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="font-black text-sm text-red-800 uppercase">Registrar Nueva Evolución</h5>
                                            <button type="button" onClick={() => setShowEvoForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={16}/></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de la Consulta / Registro</label>
                                                <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-700 mt-1"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Detalle Clínico</label>
                                                <textarea name="text" required placeholder="Escriba aquí los detalles de la consulta, indicaciones o seguimiento..." className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none text-sm font-medium resize-none h-32 mt-1 focus:border-red-400"/>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button type="button" onClick={() => setShowEvoForm(false)} className="px-5 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                                                <button type="submit" disabled={saving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-md hover:bg-red-700 transition flex items-center gap-2">
                                                    {saving ? <RefreshCw size={16} className="animate-spin"/> : 'Guardar Evolución'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4">
                                    {(!selectedStudent.medicalEvolutions || selectedStudent.medicalEvolutions.length === 0) && !showEvoForm && (
                                        <div className="bg-white border border-gray-100 p-8 rounded-2xl text-center shadow-sm">
                                            <p className="text-gray-400 font-bold">No hay evoluciones registradas en este legajo.</p>
                                        </div>
                                    )}
                                    
                                    {(selectedStudent.medicalEvolutions || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => (
                                        <div key={e.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-red-100 transition">
                                            <button onClick={() => handleDeleteEvolution(e.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 bg-gray-50 rounded-full" title="Borrar evolución"><Trash2 size={16}/></button>
                                            <div className="flex gap-3 items-center mb-3">
                                                <span className="text-[11px] font-black text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-lg uppercase tracking-widest">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">Dr/a. {e.author}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium leading-relaxed">{e.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- MODO EDICIÓN DATOS FIJOS --- */
                        <form id="medicalForm" onSubmit={handleSaveMedicalData} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 animate-in zoom-in-95">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-2">
                                <h3 className="font-black text-gray-800 uppercase text-lg">Modificar Datos de Base</h3>
                                <button type="button" onClick={() => setIsEditing(false)}><X size={20} className="text-gray-400"/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Obra Social</label>
                                    <input name="healthInsurance" defaultValue={selectedStudent.healthInsurance} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 focus:border-red-300"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vencimiento CUD</label>
                                    <input type="date" name="cudExpiration" defaultValue={selectedStudent.cudExpiration} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-700 focus:border-red-300"/>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Diagnóstico (Detalle Clínico / CUD)</label>
                                <textarea name="cudDiagnosis" defaultValue={selectedStudent.cudDiagnosis} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 h-20 resize-none focus:border-red-300"/>
                            </div>

                            <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                                <label className="text-[10px] font-black text-red-800 uppercase ml-1 tracking-widest">Alergias (Alimentarias / Medicamentosas)</label>
                                <input name="allergies" defaultValue={selectedStudent.allergies} placeholder="Ej: Penicilina, Maní..." className="w-full p-3 mt-2 bg-white rounded-xl outline-none font-bold text-sm border border-red-200 text-red-700"/>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Medicación Habitual / Dosis</label>
                                <textarea name="medication" defaultValue={selectedStudent.medication} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 h-20 resize-none focus:border-red-300"/>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Peso (kg)</label>
                                    <input name="weight" type="number" step="0.1" defaultValue={selectedStudent.weight} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 focus:border-red-300"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Plan de Vacunación</label>
                                    <select name="vaccines" defaultValue={selectedStudent.vaccines} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-800 focus:border-red-300">
                                        <option value="">Seleccionar...</option>
                                        <option value="Completas">Completas</option>
                                        <option value="Incompletas">Incompletas</option>
                                        <option value="No presenta libreta">No presenta libreta</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-red-700 transition flex items-center gap-2">
                                    {saving ? <RefreshCw size={16} className="animate-spin"/> : 'Guardar Ficha'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
// --- VISTA ADMINISTRACIÓN (FINAL: SOLO DOCUMENTOS Y ALUMNOS) ---
function AdministracionView({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filters, setFilters] = useState({ os: 'all', level: 'all', modality: 'all' });
  
  /// ESTADOS DOCUMENTOS
  const [template, setTemplate] = useState('constancia_regular'); 
  const [generating, setGenerating] = useState(false);
  const [customTarget, setCustomTarget] = useState(""); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [paseAction, setPaseAction] = useState('CONCEDE'); 
  
  const LOGO_URL = "/icon-192.png";
  const FIRMA_URL = "/firma.png"; 
  const SELLO_URL = "/sello.png";
  
  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsubStudents = onSnapshot(q, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsubStudents();
  }, []);

  const filteredStudents = students.filter(s => {
      if (s.isActive === false) return false;
      const txt = filterText.toLowerCase();
      const matchesText = !txt || `${s.lastName} ${s.firstName} ${s.dni} ${s.healthInsurance || ''} ${s.level || ''}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      if (filters.os !== 'all') {
          const sOS = (s.healthInsurance || '').toLowerCase();
          if (filters.os === 'con_os' && sOS.length < 2) return false;
          if (filters.os === 'sin_os' && sOS.length >= 2) return false;
          if (filters.os !== 'con_os' && filters.os !== 'sin_os' && !sOS.includes(filters.os.toLowerCase())) return false;
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false;
      return true;
  });

  const toggleSelectAll = () => { if (selectedIds.length === filteredStudents.length) setSelectedIds([]); else setSelectedIds(filteredStudents.map(s => s.id)); };
  const toggleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); };

  const generateDocument = () => {
      if (selectedIds.length === 0) return alert("Selecciona al menos un estudiante.");
      setGenerating(true);
      
      const targets = students.filter(s => selectedIds.includes(s.id));
      const dateObj = new Date(customDate + 'T12:00:00'); 
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString('es-AR', { month: 'long' });
      const year = dateObj.getFullYear();
      const fullDate = `Villa Udaondo, ${day} de ${month} de ${year}`;
      
      let htmlContent = `<html><head><title>Documentos</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
          body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; color: #000; }
          .cert-wrapper { width: 100%; display: block; clear: both; margin-bottom: 20px; page-break-after: always; }
          .cert-container { border: 2px solid #65a30d; border-radius: 25px; padding: 25px 40px; margin: 0 auto; position: relative; height: 175mm; box-sizing: border-box; width: 190mm; display: flex; flex-direction: column; overflow: hidden; }
          .cert-header { display: flex; align-items: center; margin-bottom: 15px; }
          .cert-logo { width: 100px; height: auto; margin-right: 20px; }
          .cert-title { font-size: 16px; font-weight: bold; text-decoration: underline; text-transform: uppercase; padding-top: 15px; }
          .cert-subtitle { font-size: 12px; font-weight: bold; margin-top: 5px; }
          .cert-body { font-size: 13px; line-height: 1.6; flex-grow: 1; }
          .line-group { margin-bottom: 12px; }
          .data-field { text-align: center; font-weight: bold; font-size: 14px; border-bottom: 1px dotted #000; display: block; margin: 2px 0; padding-bottom: 2px; }
          .inline-field { font-weight: bold; border-bottom: 1px dotted #000; padding: 0 10px; }
          .date-section { margin: 15px 0; text-align: center; font-weight: bold; }
          .signatures-section { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; height: 130px; margin-top: auto; padding-bottom: 10px; }
          .sig-box { text-align: center; width: 220px; position: relative; }
          .sig-img { height: 95px; width: auto; display: block; margin: 0 auto -10px auto; position: relative; z-index: 10; }
          .sig-line { border-top: 1px solid #000; margin-top: 0; padding-top: 4px; font-size: 11px; font-weight: bold; }

          .planilla-page { width: 100%; max-width: 210mm; padding: 15px 30px; box-sizing: border-box; margin: 0 auto; height: 297mm; position: relative; }
          .planilla-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .planilla-title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; padding-top: 10px; }
          .planilla-grid { display: grid; grid-template-columns: 180px 1fr; gap: 5px; margin-bottom: 20px; font-size: 12px; }
          .p-label { font-weight: bold; text-transform: uppercase; padding: 4px 0; }
          .p-value { border-bottom: 1px dotted #000; padding: 4px 5px; font-weight: bold; text-transform: uppercase; }
          .asistencia-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          .asistencia-table th, .asistencia-table td { border: 1px solid #000; padding: 4px; text-align: center; height: 25px; }
          .asistencia-table th { background-color: #f0f0f0; font-weight: bold; }
          .mes-box { text-align: right; font-size: 14px; font-weight: bold; margin: 15px 0; text-transform: uppercase; padding-right: 10px; }
          .firmas-planilla { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
          .firma-col { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; font-weight: bold; }
          @media print { body { margin: 0; padding: 0; } .cert-container, .planilla-page { margin: 5mm auto; page-break-after: always; } }
      </style></head><body>`;

      targets.forEach(s => {
          const nivelRaw = (s.level || '').toUpperCase();
          const modRaw = (s.modality || 'Sede');
          let nivelDetallado = nivelRaw;
          
          if (nivelRaw.includes('INICIAL')) nivelDetallado = "escolaridad especial inicial";
          else if (nivelRaw.includes('CFI')) nivelDetallado = "escolaridad especial de formación laboral";
          else if (nivelRaw.includes('1°') || nivelRaw.includes('2°') || nivelRaw.includes('PRIMARIA') || nivelRaw.includes('CICLO')) {
              nivelDetallado = `escolaridad especial primaria, ${s.level || 'ciclo a definir'}`;
          }

          let jornadaInfo = "";
          if (s.journey && s.journey !== "A DEFINIR" && s.journey.trim() !== "") {
              jornadaInfo = ` con jornada ${s.journey.toLowerCase()}`;
          }

          let fraseAlumno = modRaw === 'Inclusión' 
              ? `Es alumno/a regular de modulo de apoyo a la integración escolar (con equipo)`
              : `Es alumno/a regular de ${nivelDetallado}${jornadaInfo}`;

          let presentadoAnte = customTarget.trim() !== "" ? customTarget : (s.healthInsurance && s.healthInsurance.trim().length > 2 ? s.healthInsurance : '................................................');

          htmlContent += `<div class="cert-wrapper">`;

          if (template === 'constancia_regular') {
              if (!customTarget && s.healthInsurance && s.healthInsurance.length > 2) presentadoAnte = s.healthInsurance;
              else if (!customTarget) presentadoAnte = 'quien corresponda';

              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header">
                      <img src="${LOGO_URL}" class="cert-logo"/>
                      <div class="cert-title">CONSTANCIA DE ALUMNO REGULAR</div>
                  </div>
                  <div class="cert-body">
                      Escuela Especial Juntos a la Par hace constar que
                      <div class="line-group" style="margin-top:15px;">
                          <span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span>
                      </div>
                      <div class="line-group" style="margin-top:20px;">
                          con DNI N.° <span class="inline-field">${s.dni}</span>.
                          <div style="margin-top:20px; font-size:15px; line-height: 1.5;">${fraseAlumno}.</div>
                      </div>
                      <div class="line-group" style="margin-top:10px;">en esta institución, con &nbsp;&nbsp; CUE 0623214-00.</div>
                      <div class="line-group" style="margin-top:30px;">
                          A pedido del interesado y al efecto de ser presentado ante... 
                          <span class="data-field" style="margin-top:5px;">${presentadoAnte.toUpperCase()}</span>
                      </div>
                      <div class="date-section" style="margin-top:40px;">
                          ${fullDate}
                          <div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div>
                          <div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div>
                      </div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box">
                          <img src="${FIRMA_URL}" class="sig-img"/>
                          <div class="sig-line">Firma director o vicedirector</div>
                      </div>
                      <div class="sig-box">
                          <img src="${SELLO_URL}" class="sig-img"/>
                          <div class="sig-line">Sello institución</div>
                      </div>
                  </div>
              </div>`;
          } else if (template === 'concesion_pase') {
              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header">
                      <img src="${LOGO_URL}" class="cert-logo"/>
                      <div>
                          <div class="cert-title">PASE - SOLICITUD CONCESIÓN</div>
                          <div class="cert-subtitle">Escuela Especial Juntos a la Par con CUE 0623214-00 y DIEGEP N°8298.</div>
                      </div>
                  </div>
                  <div class="cert-body">
                      <div class="line-group" style="margin-top:30px;">La dirección del establecimiento <span style="font-weight:bold; text-decoration:underline;">${paseAction}</span> el pase del alumno:</div>
                      <div class="line-group" style="margin-top:15px;"><span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span></div>
                      <div class="line-group" style="margin-top:20px;">que actualmente cursa <span class="inline-field">${s.level || '................'} (${s.modality || 'Sede'})</span></div>
                      <div class="line-group" style="margin-top:10px;">en la institución <b>Juntos a la Par</b>.</div>
                      <div class="line-group" style="margin-top:30px;">Para ser presentado ante las autoridades de la institución:<span class="data-field" style="margin-top:5px;">${presentadoAnte.toUpperCase()}</span></div>
                      <div class="date-section" style="margin-top: 60px;">${fullDate}<div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div><div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div></div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box"><br/><br/><div class="sig-line">Firma director o vicedirector</div></div>
                      <div class="sig-box"><br/><br/><div class="sig-line">Sello institución</div></div>
                  </div>
              </div>`;
    } else if (template === 'informe_jornada') {
              const presentadoAnteJornada = s.healthInsurance && s.healthInsurance.trim().length > 2 ? s.healthInsurance : 'quien corresponda';
              htmlContent += `
              <div class="cert-container" style="height: 260mm; border: none; padding: 15px 40px; font-family: Arial, sans-serif;">
                  <div class="cert-header" style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;">
                      <img src="${LOGO_URL}" class="cert-logo" style="width: 110px; height: auto;"/>
                      <div>
                          <div class="cert-title" style="padding-top: 0; font-size: 18px;">INFORME DE FUNDAMENTACIÓN</div>
                          <div class="cert-subtitle" style="font-size: 15px;">Modalidad Jornada Doble</div>
                      </div>
                  </div>
                  <div class="cert-body" style="font-size: 16px; line-height: 1.6; padding: 0 10px;">
                      <div style="text-align: right; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; font-size: 14px;">
                          Presentado ante: ${presentadoAnteJornada}
                      </div>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">El presente informe tiene como propósito fundamentar la incorporación del estudiante <b>${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</b> con DNI <b>${s.dni}</b> a la modalidad de jornada doble en el nivel primario de la Escuela de Educación Especial "Juntos a la Par". Esta propuesta organizativa resulta fundamental para garantizar una trayectoria educativa integral, brindando al estudiante un abordaje equilibrado que potencie todas sus áreas de desarrollo.</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">Durante uno de los turnos, el trabajo se centra exclusivamente en el abordaje pedagógico-curricular. En este espacio, se prioriza la adquisición y el fortalecimiento de las habilidades cognitivas, la alfabetización, el pensamiento lógico-matemático y la construcción de la autonomía, siempre diseñando las configuraciones de apoyo necesarias para acompañar el aprendizaje de los niños.</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">En el contra-turno, el/la estudiante participa del espacio de Pre-taller con Modalidad Artística. Esta instancia es de vital importancia, ya que el arte funciona como un vehículo privilegiado para la expresión emocional, la comunicación y la socialización. A través de la exploración de lenguajes como la plástica y la música, los estudiantes desarrollan la motricidad fina y gruesa, la creatividad y la percepción. Además, este espacio funciona como un primer acercamiento paulatino a las dinámicas de trabajo en taller, preparando el terreno de manera lúdica y expresiva para su futura trayectoria en el Centro de Formación Integral (CFI).</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">La articulación de ambos turnos conforma una propuesta superadora. La complementariedad entre el núcleo pedagógico y el espacio artístico-expresivo permite sostener una rutina estructurada y enriquecedora, resultando indispensable para favorecer el bienestar, la permanencia y el desarrollo integral del/la estudiante en la institución.</p>
                      
                      <div class="date-section" style="margin-top:50px; text-align: center;">
                          <span style="font-size: 15px;">${fullDate}</span>
                          <div style="border-bottom: 1px dotted #000; width: 50%; margin: 5px auto 2px auto;"></div>
                          <div style="font-weight: normal; font-size: 12px;">Lugar y fecha</div>
                      </div>
                  </div>
                  
                  {/* SECCIÓN DE FIRMAS Y SELLOS AÑADIDA NUEVAMENTE */}
                  <div class="signatures-section" style="padding-top: 15px; margin-top: auto; height: 130px; display: flex; justify-content: space-between; align-items: flex-end;">
                      <div class="sig-box" style="text-align: center; width: 220px;">
                          <img src="${FIRMA_URL}" class="sig-img" style="height: 90px; width: auto; display: block; margin: 0 auto -10px auto;"/>
                          <div class="sig-line" style="font-size: 11px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">Firma director o vicedirector</div>
                      </div>
                      <div class="sig-box" style="text-align: center; width: 220px;">
                          <img src="${SELLO_URL}" class="sig-img" style="height: 90px; width: auto; display: block; margin: 0 auto -10px auto;"/>
                          <div class="sig-line" style="font-size: 11px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">Sello institución</div>
                      </div>
                  </div>
              </div>`;
          } else if (template === 'planilla_asistencia') {
              const months = ['MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
              let horario = ""; let prestacion = "";
              if (s.journey === 'Simple Mañana') { horario = "08:30 a 12:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Simple Tarde') { horario = "12:30 a 16:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Doble') { horario = "08:30 a 16:30"; prestacion = "Jornada Doble"; }
              else { horario = "A DEFINIR"; prestacion = s.journey || "-"; }

              months.forEach(mes => {
                  htmlContent += `
                  <div class="planilla-page">
                      <div class="planilla-header"><img src="${LOGO_URL}" style="height: 40px; float: left;" /><h1 class="planilla-title">PLANILLA DE ASISTENCIA MENSUAL</h1><div style="clear:both;"></div></div>
                      <div class="planilla-grid">
                          <div class="p-label">OBRA SOCIAL:</div><div class="p-value">${s.healthInsurance || 'NO DECLARA'}</div>
                          <div class="p-label">APELLIDO Y NOMBRE:</div><div class="p-value">${s.lastName}, ${s.firstName}</div>
                          <div class="p-label">DNI:</div><div class="p-value">${s.dni || '-'}</div>
                          <div class="p-label">PRESTACIÓN:</div><div class="p-value">${prestacion.toUpperCase()}</div>
                          <div class="p-label">HORARIO:</div><div class="p-value">${horario}</div>
                          <div class="p-label">LUGAR DE PRESTACIÓN:</div><div class="p-value">Escuela Especial Juntos a la Par - De las Boleadoras 2974, Ituzaingó</div>
                      </div>
                      <div class="mes-box">MES Y AÑO: <span style="border-bottom: 1px solid #000; padding: 0 10px;">${mes} ${year}</span></div>
                      <p style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">ACUERDO AL SIGUIENTE DETALLE (*):</p>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+11}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+21}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table" style="width: 10%;"><tr><th>31</th></tr><tr><td></td></tr></table>
                      <div class="firmas-planilla">
                          <div class="firma-col"><br/><br/><br/><br/>FIRMA FAMILIAR / RESPONSABLE<br/>ACLARACIÓN Y DNI</div>
                          <div class="firma-col"><br/><br/><br/><br/>FIRMA Y SELLO DIRECTIVO</div>
                      </div>
                  </div>`;
              });
          }
          htmlContent += `</div>`; 
      });
    
      htmlContent += '</body></html>';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; 
      iframe.style.bottom = '0'; 
      iframe.style.width = '0'; 
      iframe.style.height = '0'; 
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document; 
      doc.open(); 
      doc.write(htmlContent); 
      doc.close();

      setTimeout(() => { 
        iframe.contentWindow.focus(); 
        iframe.contentWindow.print(); 
        setTimeout(() => { document.body.removeChild(iframe); setGenerating(false); }, 5000); 
      }, 1000);
  }; 

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  return (
    <div className="animate-in fade-in pb-20 px-2 pt-4">
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-violet-600"></div>
            <div className="p-6 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <img src={LOGO_URL} className="w-16 h-auto object-contain" />
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase italic">Docs Alumnos</h2>
                        <p className="text-sm text-blue-600 font-bold uppercase">Centro de Documentación</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select value={filters.os} onChange={e => setFilters({...filters, os: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none border-none text-blue-800">
                        <option value="all">🔍 TODAS LAS O.S.</option>
                        <option value="con_os">✅ CON COBERTURA</option>
                        <option value="sin_os">❌ SIN COBERTURA</option>
                    </select>
                    <select onChange={e=>setFilters({...filters, level: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none border-none">
                        <option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option>
                    </select>
                    <div className="flex bg-gray-100 rounded-lg items-center px-2 border-none">
                        <Search size={14} className="text-gray-400"/>
                        <input placeholder="Buscar..." onChange={e=>setFilterText(e.target.value)} className="bg-transparent p-2 text-xs font-bold outline-none w-full"/>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-blue-50/80 p-4 backdrop-blur-sm border-b border-x border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <button onClick={toggleSelectAll} className="text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full">{selectedIds.length === filteredStudents.length ? 'Deseleccionar' : 'Seleccionar'} Visibles ({selectedIds.length})</button>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
                <input placeholder={template === 'concesion_pase' ? "Institución Destino..." : "Presentar ante..."} value={customTarget} onChange={e => setCustomTarget(e.target.value)} className="w-full md:w-48 p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full md:w-auto p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
              <select value={template} onChange={e=>setTemplate(e.target.value)} className="bg-white text-gray-700 pl-4 pr-8 py-2 rounded-xl text-xs font-bold w-full md:w-auto outline-none border border-blue-200 shadow-sm">
                    <option value="constancia_regular">📄 Constancia Regular</option>
                    <option value="planilla_asistencia">🗓️ Planilla Asistencia (Mar-Dic)</option>
                    <option value="concesion_pase">✈️ Concesión de Pase</option>
                    <option value="informe_jornada">📄 Informe Jornada Doble</option>
                </select>
                {template === 'concesion_pase' && (
                    <div className="flex bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
                        <button onClick={() => setPaseAction('SOLICITA')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'SOLICITA' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>SOLICITA</button>
                        <button onClick={() => setPaseAction('CONCEDE')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'CONCEDE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>CONCEDE</button>
                    </div>
                )}
                <button onClick={generateDocument} disabled={generating || selectedIds.length === 0} className={`bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-2 ${generating || selectedIds.length === 0 ? 'opacity-50' : 'hover:scale-105'}`}>{generating ? <RefreshCw className="animate-spin"/> : <><Printer size={16}/> Imprimir</>}</button>
            </div>
        </div>

        <div className="bg-white shadow-sm border-x border-b border-gray-200 overflow-hidden rounded-b-[30px]">
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {filteredStudents.map(s => (
                    <div key={s.id} onClick={() => toggleSelect(s.id)} className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50/80' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 text-blue-600">
                                {selectedIds.includes(s.id) ? <CheckSquare size={20} /> : <div className="w-5 h-5 border-2 border-gray-300 rounded text-transparent"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="font-black text-slate-800 uppercase text-sm truncate">{s.lastName}, {s.firstName}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase truncate max-w-[120px] ${(s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon) ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.modality === 'Inclusión' ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin DAI</>') : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin grupo</>')}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase shrink-0">{s.level}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">DNI: <span className="text-gray-600">{s.dni || '-'}</span></p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">OS: <span className="text-gray-600">{s.healthInsurance || 'NO DECLARA'}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}

// ===============================================================
// FUNCIONES AUXILIARES (FUERA DE CUALQUIER OTRA FUNCIÓN)
// ===============================================================
const StartIcon = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);
  
