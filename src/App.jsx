import React, { useState, useEffect, useRef } from 'react';
import { GroupsView } from './views/GroupsView';
import { PersonalView } from './views/PersonalView';
import { DashboardView } from './views/DashboardView';
import { ResourcesView } from './views/ResourcesView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { MedicalView } from './views/MedicalView';
import { MatriculaView } from './views/MatriculaView';
import { AdministracionView } from './views/AdministracionView';
import { SocialView } from './views/SocialView';
import { UsersAdminView } from './views/UsersAdminView';
import { EquipoTecnicoView } from './views/EquipoTecnicoView';

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
  
  // --- DEFINICIÓN DE PERMISOS GLOBALES ---
  const isAdminRole = ['admin', 'super-admin', 'Administración', 'Equipo Directivo', 'Dirección Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isTechTeamRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Equipo Técnico', 'Equipo Técnico Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isMedicalRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user?.role) || user?.rol === 'admin';
  const canAccessSocial = ['admin', 'super-admin', 'Docente', 'Auxiliar/Preceptor', 'Equipo Directivo', 'Equipo Técnico', 'Inclusión', 'DAI'].includes(user?.role) || user?.rol === 'admin';

  const showPrivateMenu = isAdminRole || isTechTeamRole || isMedicalRole || canAccessSocial;

  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users', 'admin'].includes(activeTab);

  useEffect(() => {
    if (user?.id) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { lastLogin: serverTimestamp() }).catch(()=>{});
    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubResources = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc')), (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
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

    if ("Notification" in window && Notification.permission === 'default') {
        setTimeout(() => setShowNotifRequest(true), 3500);
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

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 font-sans text-slate-800 overflow-hidden relative">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0">
        <div className="flex items-center space-x-3"><img src={LOGO_URL} alt="Logo" className="w-10 h-8 object-contain" /><div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button>
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}><Bell size={20} />{notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}</button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div>
                <div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-10 text-center text-gray-400"><p className="text-xs font-bold uppercase">Sin novedades</p></div>:notifications.map(n=>(<div key={n.id} onClick={()=>handleNotificationClick(n)} className="p-4 border-b hover:bg-gray-50 cursor-pointer"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}</div>
              </div>
            )}
          </div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">{user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}</div>
        </div>
      </header>

      {/* --- CARTEL MANTENIMIENTO --- */}
      {maintenanceMode && showMaintenanceAlert && (
          <div className="fixed top-16 left-0 right-0 z-[999] p-4 animate-in slide-in-from-top-5">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl p-5 text-white flex flex-col items-center gap-3 border-4 border-white/20 relative overflow-hidden">
                  <div className="flex items-center gap-3 z-10">
                      <div className="bg-white p-3 rounded-full text-orange-600"><Settings size={28}/></div>
                      <div className="text-center">
                          <h3 className="font-black uppercase text-lg leading-none">¡Estamos en Obra! 🚧</h3>
                          <p className="text-xs font-medium opacity-90 mt-1">Mejorando la App para vos.</p>
                      </div>
                  </div>
                  <button onClick={() => setShowMaintenanceAlert(false)} className="w-full bg-white text-orange-600 py-3 rounded-xl text-xs font-black uppercase">Entendido</button>
              </div>
          </div>
      )}

      {/* --- POPUP NOTIFICACIONES --- */}
      {showNotifRequest && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[30px] p-6 w-full max-w-sm shadow-2xl text-center border-t-8 border-orange-500 mb-20 md:mb-0">
                 <Bell size={32} className="text-orange-500 mx-auto mb-4"/>
                 <h3 className="text-xl font-black text-gray-800">¡No te pierdas nada!</h3>
                 <p className="text-sm text-gray-500 mb-6">Activá los avisos urgentes.</p>
                 <div className="flex flex-col gap-3">
                     <button onClick={enableNotifications} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl">ACTIVAR AHORA</button>
                     <button onClick={() => setShowNotifRequest(false)} className="text-gray-400 text-xs font-bold uppercase">Ahora no</button>
                 </div>
             </div>
         </div>
      )}

      <main className={`flex-1 overflow-y-auto no-scrollbar pb-24 pt-6 mx-auto w-full transition-all duration-300 ${isWideTab ? 'px-2 max-w-[98%]' : 'px-4 max-w-4xl'}`}>
        {activeTab === 'dashboard' && <DashboardView user={user} db={db} appId={appId} />}
        {activeTab === 'groups' && <GroupsView user={user} db={db} appId={appId} setActiveTab={setActiveTab} />}
      {activeTab === 'calendar' && (
  <CalendarView 
    events={events} 
    canEdit={canManageContent} 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
     {activeTab === 'tasks' && (
  <TasksView 
    tasks={tasks} 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
        {activeTab === 'matricula' && (
  <MatriculaView 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
       {activeTab === 'resources' && (
  <ResourcesView 
    resources={resources} 
    canEdit={canManageContent} 
    db={db} 
    appId={appId} 
  />
)}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}
       {activeTab === 'equipo' && (
  <EquipoTecnicoView 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
       {activeTab === 'admin' && (
  <AdministracionView 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
        {activeTab === 'personal' && <PersonalView user={user} db={db} appId={appId} TURNS_LIST={TURNS_LIST} VALID_ROLES_OFFICIAL={VALID_ROLES_OFFICIAL} />}
       {activeTab === 'medical' && (
  <MedicalView 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
    {activeTab === 'social' && (
  <SocialView 
    user={user} 
    db={db} 
    appId={appId} 
  />
)}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0 text-center">
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          {activeTab === 'users' && isSuperAdmin && (
  <UsersAdminView 
    db={db} 
    appId={appId} 
  />
)}
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          <div className="relative -top-5 flex justify-center">
            <button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}><Grid size={24} /></button>
            <span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span>
          </div>
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />
          <div className="relative">
            <NavButton active={['matricula', 'resources', 'proyecto', 'admin', 'personal', 'medical', 'equipo', 'social'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-56 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-50">
                <button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><GraduationCap size={18} className="text-violet-500"/> Legajos</button>
                <button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><LinkIcon size={18} className="text-green-500"/> Recursos</button>
                <button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><PieChart size={18} className="text-orange-500"/> Proyecto Inst.</button>
                {showPrivateMenu && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-1">Gestión Privada</p>
                    {isTechTeamRole && <button onClick={() => { setActiveTab('equipo'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-teal-50 flex items-center gap-3 text-sm font-bold text-teal-700 transition"><Briefcase size={18} className="text-teal-500"/> Equipo Técnico</button>}
                    {isAdminRole && (
                      <>
                        <button onClick={() => { setActiveTab('admin'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-blue-600 transition"><FileText size={18} className="text-blue-500"/> Admin Docs</button>
                        <button onClick={() => { setActiveTab('personal'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-violet-700 transition"><Users size={18} className="text-violet-500"/> Personal</button>
                      </>
                    )}
                    {canAccessSocial && <button onClick={() => { setActiveTab('social'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Users size={18} className="text-blue-500"/> Trabajo Social</button>}
                    {isMedicalRole && <button onClick={() => { setActiveTab('medical'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition"><Activity size={18} className="text-red-500"/> Médico</button>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* MODALES GLOBALES */}
      {showSearch && ( 
        <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in">
          <div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div>
          <input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/>
          <div className="flex-1 overflow-y-auto space-y-2">
            {searchResults.map(s => (
              <div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                <div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div>
              </div>
            ))}
            {searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}
          </div>
        </div> 
      )}
      
      {globalViewingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div>
            <div className="p-6">
              <div className="flex gap-4 items-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div>
                <div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div>
              </div>
              <button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a Legajos. Buscalo ahí para ver más."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button>
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

// --- FUNCIONES AUXILIARES (Poner al final del archivo) ---


const StartIcon = ({size}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
  </svg>
);
