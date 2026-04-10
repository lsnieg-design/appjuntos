import React, { useState, useEffect, useRef } from 'react';

import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin,
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, 
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, where, getDocs, getDoc, serverTimestamp, arrayUnion, arrayRemove 
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
// --- VISTA DASHBOARD (VERSIÓN INTEGRAL: DESAFÍOS GITHUB + CUMPLES + MANUAL + RANKING) ---
function DashboardView({ user, tasks, events, announcements, setActiveTab }) {
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
    if (!msg.trim()) return;
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { 
        message: msg, author: user.fullName || `${user.firstName} ${user.lastName}`, authorId: user.id, role: user.role || user.rol, channel: chan, createdAt: serverTimestamp() 
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

    // Función mágica para limpiar textos (acentos, mayúsculas, espacios, puntos)
    const normalizar = (texto) => {
        if (!texto) return "";
        return texto.toString().trim().toLowerCase().normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "") // Quita acentos
            .replace(/[^a-z0-9]/g, "");      // Quita puntos, comas y símbolos
    };

    try {
      const cleanUser = normalizar(challengeAnswer);
      const cleanCorrect = normalizar(currentChallenge.answer);
      
      if (cleanUser === cleanCorrect) {
        // RECIÉN AQUÍ guardamos el éxito en el celular
        localStorage.setItem(`lastChallenge_${user.id}`, new Date().toDateString());
        setShowChallengeSuccess(true);
        
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        await updateDoc(userRef, { score: (Number(userScore) || 0) + 10 });
        
        setChallengeAnswer('');
        setTimeout(() => setShowChallengeSuccess(false), 4000);
      } else { 
        alert("🤔 ¡Casi! Intentá de nuevo. Revisá si es un número o palabra."); 
      }
    } catch (err) { console.error("Error validando:", err); }
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

  const visibleAnnouncements = announcements.filter(a => isSuperAdmin || a.authorId === user.id || !a.channel || a.channel === 'general' || (a.channel === 'inclusion' && isInclusionStaff) || (a.channel === 'sede' && isSedeStaff));
const resetMyDailyChallenge = () => {
    localStorage.removeItem(`lastChallenge_${user.id}`);
    setShowChallengeSuccess(false);
    setChallengeAnswer('');
    alert("🔄 Participación diaria reseteada. ¡Podés volver a jugar!");
  };
  return (
    <div className="space-y-4 animate-in fade-in pb-10">
           
     {/* CARTEL GANADOR MENSUAL (CON FILTRO DE PUNTAJE) */}
      {todayDate.getDate() === 1 && rankingData.length > 0 && rankingData[0].score > 50 && (
          <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 rounded-[35px] text-white shadow-xl animate-bounce mx-2">
              <h3 className="font-black text-center text-xl uppercase italic tracking-tighter">🏆 ¡GANADOR DEL MES ANTERIOR! 🏆</h3>
              <p className="text-center font-bold text-lg mt-2 uppercase">{rankingData[0].firstName} {rankingData[0].lastName}</p>
              <p className="text-center text-[10px] uppercase font-black opacity-80 mt-1 tracking-widest">¡Vení a buscar tu premio a Dirección! 🎁</p>
          </div>
      )}

      {/* HEADER BIENVENIDA */}
      <div className="flex justify-between items-center px-2">
          <div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div>
          <div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div>
      </div>
      
      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase">Atención</h4><p className="text-xs text-red-600 font-bold">{ungroupedCount} alumnos sin grupo.</p></div></div></div>)}
      
      {/* CUMPLES Y CUENTA REGRESIVA */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
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

{/* BLOQUE DESAFÍO VISUAL CON CORTE A LAS 19HS */}
      <div className="bg-gradient-to-br from-emerald-400 to-teal-500 p-5 rounded-[30px] shadow-md text-white relative overflow-hidden">
          <div className="absolute -right-4 -top-4 opacity-10"><Crown size={120}/></div>
          
          <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="flex-1 pr-4">
                  <div className="flex items-center gap-2">
                      <h3 className="text-[10px] font-black text-emerald-100 uppercase tracking-widest flex items-center gap-1">✨ Desafío del Día</h3>
                      {/* CUENTA REGRESIVA AL LADO DEL TÍTULO */}
                      {!isGameOver && !currentChallenge.isRestDay && (
                        <span className="bg-black/20 px-2 py-0.5 rounded-lg text-[9px] font-mono font-bold animate-pulse">
                          ⏳ Cierra en: {timeLeft}
                        </span>
                      )}
                  </div>

                  {currentChallenge.isRestDay ? (
                      <p className="font-bold text-white text-sm mt-2">⏳ {currentChallenge.q}</p>
                  ) : (
                      <div className="mt-3 rounded-2xl overflow-hidden border-2 border-white/20 bg-white/10 shadow-inner">
                          {currentChallenge.url ? (
                              <img src={currentChallenge.url} alt="Desafío" className="w-full h-auto object-contain max-h-48 mx-auto" />
                          ) : (
                              <div className="p-10 text-center text-xs animate-pulse opacity-50">Cargando desafío...</div>
                          )}
                      </div>
                  )}
              </div>

              <div className="bg-white/20 p-2 rounded-xl text-center min-w-[60px] cursor-pointer hover:bg-white/30 transition shadow-inner relative z-50" onClick={() => setShowRanking(true)}>
                  <div className="text-yellow-400 flex justify-center"><Trophy size={28} /></div>
                  <span className="block text-[7px] font-bold uppercase mt-1">Ranking</span>
              </div>
          </div>
          
          {!currentChallenge.isRestDay && (
            <div className="mt-4 relative z-10">
              {/* CASO 1: YA PASARON LAS 19HS (MUESTRA RESPUESTA) */}
              {isGameOver ? (
                <div className="bg-white/20 p-4 rounded-xl border border-white/30 text-center">
                  <p className="text-[9px] uppercase font-black opacity-70">El tiempo terminó. La respuesta era:</p>
                  <p className="text-lg font-black tracking-widest uppercase italic">✨ {currentChallenge.answer} ✨</p>
                  <p className="text-[8px] mt-2 italic opacity-60">¡Mañana hay un nuevo desafío!</p>
                </div>
              ) : 
              /* CASO 2: YA PARTICIPÓ HOY */
              localStorage.getItem(`lastChallenge_${user.id}`) === new Date().toDateString() && !showChallengeSuccess ? (
                <div className="bg-white/20 p-3 rounded-xl border border-white/30 text-center italic">
                  <p className="text-xs font-black">🚫 ¡Ya sumaste tus puntos de hoy! Volvé mañana. 😉</p>
                </div>
              ) : 
              /* CASO 3: GANÓ RECIÉN */
              showChallengeSuccess ? (
                <div className="bg-white/20 p-3 rounded-xl text-center animate-bounce border-2 border-white">
                  <p className="font-black text-sm text-white">🎉 ¡Correcto! Sumaste 10 pts.</p>
                </div>
              ) : (
                /* CASO 4: FORMULARIO ACTIVO */
                <form onSubmit={checkChallenge} className="flex gap-2">
                  <input value={challengeAnswer} onChange={e => setChallengeAnswer(e.target.value)} placeholder="¿Qué ves?..." className="flex-1 bg-white/20 text-white placeholder-emerald-100 border border-white/30 p-2.5 rounded-xl outline-none font-bold text-xs focus:bg-white/40 transition-all"/>
                  <button type="submit" className="bg-white text-emerald-600 font-black px-4 rounded-xl text-xs uppercase shadow-lg hover:scale-105 active:scale-95 transition-all">Jugar</button>
                </form>
              )}
            </div>
          )}
      </div>
      
      {/* CARTELERA */}
      {visibleAnnouncements.length > 0 && (<div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative"><h3 className="text-[10px] font-black text-yellow-700 uppercase mb-3 flex items-center gap-1"><Bell size={12}/> Cartelera Oficial</h3><div className="space-y-3">{visibleAnnouncements.map(a => (<div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start"><div><p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase">- {a.author}</p></div>{(canPost || a.authorId === user.id) && (<button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>)}</div>))}</div></div>)}
      
      {/* TAREAS Y CALENDARIO */}
      <div className="grid grid-cols-2 gap-3"><div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition"><h4 className="text-3xl font-black text-orange-500">{myPendingTasksCount}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div><div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>{todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase font-bold tracking-widest">Es Hoy</p></> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}</div></div>
      
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner"><h3 className="font-black text-gray-400 uppercase text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3><form onSubmit={saveNote} className="flex gap-2 mb-3"><input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" /><button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button></form><div className="space-y-2">{notes.map(n => (<div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group"><button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={10} className="text-white"/>}</button><span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span><button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button></div>))}</div></div>
      
      {/* MANUAL COMPLETO */}
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
                        <>
                            <div className="bg-green-50 p-4 rounded-2xl border border-green-100">
                                <h4 className="font-bold text-green-800 mb-1 flex items-center gap-2"><GraduationCap size={16}/> Buscador Institucional</h4>
                                <p>Busca cualquier alumno de la escuela. Usa los filtros (Turno, Docente, DX) para refinar.</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><UploadCloud size={16}/> La Nube (Gestión)</h4>
                                <p>Solo directivos: Herramientas para descargar copias de seguridad (Backup).</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'aula' && (
                        <>
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-800 mb-1 flex items-center gap-2"><Grid size={16}/> Gestión de Clases</h4>
                                <p>Aquí ves a los grupos armados. Usa el botón de imprimir arriba para sacar la lista de asistencia.</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                                <h4 className="font-bold text-yellow-800 mb-1 flex items-center gap-2">⚡ Bitácora Express</h4>
                                <p>Toca el rayo en un alumno para registrar rápidamente una conducta o incidente.</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'tareas' && (
                        <>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2"><CheckSquare size={16}/> Pedidos y Organización</h4>
                                <p>Crea tareas para solicitar materiales o informes.</p>
                            </div>
                        </>
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
                <button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition">¡Entendido!</button>
            </div>
        </div>
      )}

      {/* MODAL CUMPLES */}
      {showBirthdayModal && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowBirthdayModal(false)}>
              <div className={`bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl border-t-8 ${birthdayModalType === 'students' ? 'border-pink-500' : 'border-violet-500'} max-h-[85vh] flex flex-col`} onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6"><h3 className={`text-lg font-black uppercase italic flex items-center gap-2 ${birthdayModalType === 'students' ? 'text-pink-500' : 'text-violet-600'}`}>{birthdayModalType === 'students' ? <><Crown size={20}/> Cumples Alumnos</> : <><User size={20}/> Cumples Profes</>}</h3><button onClick={() => setShowBirthdayModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button></div>
                  <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                      {(birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).length === 0 ? (<p className="text-sm text-gray-400 italic text-center py-6 uppercase font-bold tracking-widest">Sin festejos cerca.</p>) : (
                          (birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).map(b => (
                              <div key={b.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition ${birthdayModalType === 'students' ? 'bg-pink-50 border-pink-100' : 'bg-violet-50 border-violet-100'}`}>
                                  <div className={`w-12 h-12 rounded-full bg-white border-2 overflow-hidden shrink-0 flex items-center justify-center font-bold ${birthdayModalType === 'students' ? 'border-pink-200 text-pink-400' : 'border-violet-200 text-violet-400'}`}>{b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : b.firstName?.charAt(0) || '👤'}</div>
                                  <div><h4 className="font-bold text-gray-800 leading-tight uppercase text-xs">{b.firstName} {b.lastName}</h4><p className={`text-[10px] font-bold uppercase mt-0.5 ${birthdayModalType === 'students' ? 'text-pink-600' : 'text-violet-600'}`}>{birthdayModalType === 'students' ? (b.modality === 'Inclusión' ? '📍 Inclusión' : `📍 ${[b.groupMorning, b.groupAfternoon].filter(Boolean).join(' / ') || 'Sin Grupo'}`) : `💼 ${b.role || 'Docente'}`}</p><p className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-black"><CalendarIcon size={10}/> {new Date(b.nextBirthday).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}

   {/* MODAL RANKING ACTUALIZADO */}
      {showRanking && (
          <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowRanking(false)}>
              <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh] relative" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6 shrink-0">
                      <h3 className="text-lg font-black text-emerald-600 uppercase italic tracking-tighter">Ranking Institucional</h3>
                      <button onClick={() => setShowRanking(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20} className="text-gray-500"/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                      <div>
                        {/* NOMBRE DEL MES DINÁMICO */}
                        <p className="text-[10px] font-black text-gray-400 uppercase mb-3 tracking-widest text-center italic border-b pb-1">
                            Top de {new Date().toLocaleDateString('es-AR', { month: 'long' })}
                        </p>
                        
                        <div className="space-y-2">
                            {rankingData.length === 0 ? (
                                <p className="text-center text-gray-400 text-xs py-4 italic">¡Aún no hay puntos registrados este mes!</p>
                            ) : (
                                rankingData.map((u, index) => (
                                    <div key={u.id || index} className={`flex items-center justify-between p-3 rounded-2xl border ${index === 0 ? 'bg-yellow-50 border-yellow-200 shadow-sm' : 'bg-gray-50 border-gray-100'}`}>
                                        <div className="flex items-center gap-3">
                                          <span className={`font-black text-lg ${index === 0 ? 'text-yellow-500' : 'text-gray-400'}`}>#{index + 1}</span>
                                          <span className="font-bold text-gray-700 text-sm uppercase">{u.firstName} {u.lastName?.charAt(0)}.</span>
                                        </div>
                                        <div className="bg-white px-3 py-1 rounded-lg border border-gray-200 font-black text-emerald-600 text-xs">{(u.score || 0)} pts</div>
                                    </div>
                                ))
                            )}
                        </div>
                      </div>
                  </div>
                  {isSuperAdmin && (
                    <button onClick={resetAllScores} className="mt-4 w-full py-2 bg-red-50 text-red-500 border border-red-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all shadow-sm">🛑 Resetear Todo el Ranking</button>
                  )}
                  <p className="text-[8px] text-center text-gray-400 mt-4 uppercase font-bold tracking-widest shrink-0">Los puntos se reinician el 1 de cada mes</p>
              </div>
          </div>
      )}

      {/* --- MODAL PARA CREAR AVISOS (UBICACIÓN CORRECTA) --- */}
      {showAnnounceModal && (
        <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Nuevo Aviso</h3>
              <button type="button" onClick={() => setShowAnnounceModal(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Canal de difusión</label>
                <select name="channel" className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none outline-none focus:ring-2 ring-orange-200">
                  <option value="general">📢 Todo el Personal (General)</option>
                  <option value="sede">🏫 Solo Sede</option>
                  <option value="inclusion">📍 Solo Inclusión</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Mensaje</label>
                <textarea name="message" required placeholder="Escribí el aviso aquí..." className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none outline-none text-sm font-medium focus:ring-2 ring-orange-200 resize-none"></textarea>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-xs">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg shadow-orange-200 hover:bg-orange-600 transition active:scale-95">Publicar Aviso</button>
              </div>
            </div>
          </form>
        </div>
      )}

    </div> // Fin del DashboardView contenedor principal
  );
} // Fin de la función


// --- VISTA RECURSOS (VERSIÓN CON PLANTILLAS EN GENERADOR DE NOTAS) ---
function ResourcesView({ resources, canEdit }) {
  const [folder, setFolder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null); 
  
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [notaData, setNotaData] = useState({ 
    date: new Date().toLocaleDateString('es-AR'), 
    title: '', body: '', signature: 'EQUIPO DIRECTIVO',
    fontSize: 'text-[14px]', textAlign: 'text-center',
    wordSpacing: '0.12em', isPrintMode: false 
  });

  // ESTADOS PARA PLANTILLAS
  const [showTemplates, setShowTemplates] = useState(false);
  const [templateData, setTemplateData] = useState({
      destinatario: '',
      fechaReunion: '',
      horaReunion: '',
      modalidad: 'Presencial en la Institución'
  });
  
  const LOGO_SIN_FONDO = "/logosinfondo.png";

  const folders = (resources || []).reduce((acc, r) => { 
    const cat = r.category || 'VARIOS'; 
    if (!acc[cat]) acc[cat] = []; 
    acc[cat].push(r); 
    return acc; 
  }, {});

  const handleSaveResource = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'),
      url: fd.get('url'),
      category: (folder || fd.get('category') || 'VARIOS').toUpperCase().trim(),
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
    if (!confirm("¿Eliminar este documento?")) return;
    try {
      if (folders[folder]?.length === 1) { setFolder(null); }
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', resId));
    } catch (err) { alert(err.message); }
  };

  const handleDeleteFolder = async (folderName) => {
    if (!confirm(`⚠️ ¿Borrar carpeta "${folderName}" y sus documentos?`)) return;
    try {
      const docsToDelete = folders[folderName];
      const promises = docsToDelete.map(d => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', d.id)));
      await Promise.all(promises);
      setFolder(null);
    } catch (err) { alert(err.message); }
  };

  const handleEditFolderName = async (oldName) => {
    const newName = prompt("Nuevo nombre:", oldName);
    if (!newName || newName === oldName) return;
    try {
      const docsToUpdate = folders[oldName];
      const promises = docsToUpdate.map(d => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', d.id), { category: newName.toUpperCase().trim() }));
      await Promise.all(promises);
      setFolder(newName.toUpperCase().trim());
    } catch (err) { alert(err.message); }
  };

  // FUNCIÓN PARA APLICAR PLANTILLA DE REUNIÓN
  const aplicarPlantillaReunion = () => {
      if(!templateData.fechaReunion || !templateData.horaReunion) {
          alert("Por favor, completá al menos la fecha y la hora.");
          return;
      }

      // Convertir fecha de YYYY-MM-DD a formato legible (ej: 15/04/2026)
      const partesFecha = templateData.fechaReunion.split('-');
      const fechaLegible = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

      const textoDestinatario = templateData.destinatario 
          ? `Estimada familia de ${templateData.destinatario}:` 
          : `Estimadas familias:`;

      const cuerpoMensaje = `${textoDestinatario}

Por medio de la presente, nos comunicamos para citarlos a una reunión a fin de conversar sobre aspectos relacionados a la trayectoria escolar.

La misma se llevará a cabo el día ${fechaLegible} a las ${templateData.horaReunion} hs.
Modalidad: ${templateData.modalidad}.

Agradecemos su compromiso y puntualidad.
Por favor, confirmar asistencia.`;

      setNotaData({
          ...notaData,
          title: 'CITACIÓN A REUNIÓN',
          body: cuerpoMensaje,
          textAlign: 'text-left' // Forzamos alineación izquierda para que quede prolijo
      });
      setShowTemplates(false);
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Recursos</h2>
        {canEdit && (
          <button onClick={() => { setEditingRes(null); setShowModal(true); }} className="bg-orange-500 text-white p-2 rounded-xl shadow-lg hover:bg-orange-600 transition flex items-center gap-2">
            <Plus size={20}/>
            <span className="text-[10px] font-black uppercase pr-1">{folder ? 'Nuevo Doc' : 'Nueva Carpeta'}</span>
          </button>
        )}
      </div>

      {!folder && (
          <button onClick={() => setShowNotaModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-orange-400 p-6 rounded-3xl shadow-lg text-white flex items-center justify-between mb-6 group active:scale-95 transition-transform mx-2">
              <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition-transform"><Edit3 size={32}/></div>
                  <div className="text-left">
                      <h3 className="font-black text-xl tracking-widest uppercase italic drop-shadow-md">Generador de Notas</h3>
                      <p className="text-xs font-bold opacity-90 mt-1">Crear comunicados oficiales</p>
                  </div>
              </div>
              <ChevronRight size={24} className="opacity-50"/>
          </button>
      )}

      {!folder ? (
        <div className="grid grid-cols-2 gap-4 pb-10 px-2">
          {Object.keys(folders).map(name => (
            <div key={name} className="relative group">
              <div onClick={() => setFolder(name)} className="bg-white p-6 rounded-[35px] border border-violet-50 text-center cursor-pointer shadow-sm border-b-4 border-orange-500 transition-all hover:scale-105 h-full">
                <div className="w-12 h-12 bg-violet-50 text-violet-200 rounded-2xl flex items-center justify-center mb-3 mx-auto shadow-inner"><Folder size={28} /></div>
                <h3 className="font-black text-[10px] uppercase tracking-widest text-gray-700 leading-tight italic">{name}</h3>
                <p className="text-[8px] font-bold text-gray-300 mt-2 uppercase tracking-[4px]">{folders[name].length} Docs</p>
              </div>
              {canEdit && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); handleEditFolderName(name); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-orange-500 transition-colors"><Edit3 size={12}/></button>
                   <button onClick={(e) => { e.stopPropagation(); handleDeleteFolder(name); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={12}/></button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="px-2">
            <button onClick={() => setFolder(null)} className="mb-4 text-xs font-black text-violet-600 uppercase flex items-center gap-1 bg-violet-50 p-2 px-4 rounded-xl shadow-sm hover:bg-violet-100 transition"><ChevronLeft size={16}/> VOLVER</button>
            <div className="grid gap-3 pb-20">
            {folders[folder].map(r => (
                <div key={r.id} className="bg-white p-4 rounded-[20px] border border-violet-50 flex justify-between items-center group shadow-sm">
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 italic font-black text-xs text-gray-700 hover:text-violet-600 flex-1 min-w-0">
                        <FileText size={18} className="text-violet-200 shrink-0" /> 
                        <span className="truncate">{r.title}</span>
                    </a>
                    {canEdit && (
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingRes(r); setShowModal(true); }} className="text-gray-300 hover:text-orange-500"><Edit3 size={16}/></button>
                        <button onClick={() => handleDeleteResource(r.id)} className="text-gray-200 hover:text-red-500"><Trash2 size={16}/></button>
                      </div>
                    )}
                </div>
            ))}
            </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <form onSubmit={handleSaveResource} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-orange-500">
            <h3 className="text-xl font-black text-violet-900 mb-6 uppercase italic">{editingRes ? 'Editar' : (folder ? `Nuevo en ${folder}` : 'Nueva Carpeta')}</h3>
            <div className="space-y-4">
              <input name="title" defaultValue={editingRes?.title} placeholder="Título" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-gray-100" required />
              <input name="url" defaultValue={editingRes?.url} placeholder="Link" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-gray-100" required />
              {!folder && <input name="category" defaultValue={editingRes?.category} placeholder="Carpeta" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border border-orange-100" required />}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRes(null); }} className="flex-1 py-4 font-black text-xs text-gray-400 uppercase">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase shadow-lg hover:bg-orange-600 transition">Guardar</button>
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
                      const canvas = await html2canvas(element, { 
                        scale: 3, 
                        useCORS: true, 
                        backgroundColor: notaData.isPrintMode ? '#ffffff' : '#fefce8', 
                        logging: false,
                        onclone: (clonedDoc) => {
                          const container = clonedDoc.getElementById('nota-canvas');
                          const txt = container.querySelector('.whitespace-pre-wrap');
                          if (txt) { 
                            txt.style.wordSpacing = '0.15em'; 
                            txt.style.letterSpacing = '0.01em';
                            txt.style.display = "block";
                            txt.style.width = "100%";
                          }
                        }
                      }); 
                      const link = document.createElement('a');
                      link.download = `Nota_${(notaData.title || 'Nota').substring(0,10)}.jpg`;
                      link.href = canvas.toDataURL('image/jpeg', 0.95);
                      link.click();
                    } catch (error) { alert("Error al generar imagen."); }
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

  const handleSaveTask = async (e) => {
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
      }
      setShowModal(false); setEditingTask(null); setSelectedUsersObj([]); setSelectedRoles([]);
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
      setNewComment("");
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
      if (!viewingStudent) return; 
      const newInc = { 
          date: new Date().toISOString(), 
          type: text ? "Nota" : type, 
          severity: type, 
          text: text || type, 
          author: user.firstName 
      }; 
      try { 
          const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', viewingStudent.id); 
          await updateDoc(studentRef, { incidents: arrayUnion(newInc) }); 
          setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents || []), newInc]})); 
          setNewNote(""); setIsWriting(false); 
      } catch (e) { alert("Error: " + e.message); } 
  };
  
const handleSaveIncident = async (type, severity) => { 
      if (!viewingStudent) return; 
      const incidentData = { 
          type, 
          severity, 
          text: type, 
          date: new Date().toISOString(), 
          author: user.fullName || user.firstName, 
          authorId: user.id 
      }; 
      try { 
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', viewingStudent.id), { incidents: arrayUnion(incidentData) }); 
          setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents || []), incidentData]})); 
          alert("✅ Registro guardado"); 
      } catch (e) { console.error(e); } 
  }; // <--- ESTA ERA LA LLAVE QUE FALTABA
  
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
                              <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}>
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
                              <div className="flex gap-2">
                                <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
                                <button onClick={() => addIncident('medium', newNote)} disabled={!newNote.trim()} className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-[10px]">Guardar</button>
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
// --- NUEVA VISTA: EQUIPO TÉCNICO (CON PERMISOS ESTRICTOS POR ÁREA) ---
function EquipoTecnicoView({ user }) {
    const [items, setItems] = useState([]);
    
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
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'));
        const unsub = onSnapshot(q, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

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
                    
                    {/* SELECTOR CONDICIONAL POR ROL */}
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

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CheckSquare size={18} className="text-blue-500"/> Tareas del Equipo</h3>
                            <button onClick={() => {setModalType('task'); setShowModal(true);}} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {tasks.length === 0 ? <p className="text-xs text-gray-400 italic">No hay tareas pendientes.</p> : tasks.map(t => (
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
                </div>

                <div className="space-y-4">
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> Fechas Importantes</h3>
                            <button onClick={() => {setModalType('date'); setShowModal(true);}} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            {dates.length === 0 ? <p className="text-xs text-gray-400 italic">Agenda libre.</p> : dates.map(d => (
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

                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><span className="text-lg">📍</span> Salidas / Proyectos</h3>
                            <button onClick={() => {setModalType('outing'); setShowModal(true);}} className="bg-purple-50 text-purple-600 p-2 rounded-lg hover:bg-purple-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {outings.length === 0 ? <p className="text-xs text-gray-400 italic">No hay salidas planificadas.</p> : outings.map(o => (
                                <div key={o.id} className="bg-purple-50/30 p-4 rounded-2xl border border-purple-100 relative group">
                                    <button onClick={() => handleDelete(o.id)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                    <h4 className="font-black text-purple-900 text-sm mb-1">{o.title}</h4>
                                    <div className="flex gap-2 mb-2">
                                        <span className="text-[9px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-200">📅 {new Date(o.date+'T00:00:00').toLocaleDateString('es-AR')}</span>
                                        <span className="text-[9px] font-bold bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-200">👥 {o.groups}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 font-medium">{o.ideas}</p>
                                    <div className="text-[10px] font-bold text-gray-500 bg-white p-2 rounded-lg border border-gray-100">
                                        <p><span className="text-purple-500">Docentes:</span> {o.teachers || '-'}</p>
                                        <p><span className="text-purple-500">Equipo Téc:</span> {o.techs || '-'}</p>
                                    </div>
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
                            <input name="title" placeholder={modalType === 'task' ? 'Ej: Revisar informes' : modalType === 'date' ? 'Ej: Entrega PPI' : 'Lugar de salida'} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-blue-300" required />
                            
                            {modalType === 'task' && <input name="assignee" placeholder="Responsable (Ej: Myrian)" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />}
                            
                            {(modalType === 'date' || modalType === 'outing') && <input name="date" type="date" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border font-bold text-gray-600" required />}
                            
                            {modalType === 'outing' && (
                                <>
                                    <input name="groups" placeholder="Grupos (Ej: 1° Ciclo TM)" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />
                                    <textarea name="ideas" placeholder="Propósito / Ideas previas..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-16 resize-none" required />
                                    <input name="teachers" placeholder="Docentes asistentes" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" />
                                    <input name="techs" placeholder="Miembros Equipo Técnico" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" />
                                </>
                            )}
                            
                            <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-xs shadow-lg hover:bg-slate-700 transition mt-2">Guardar</button>
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
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

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

  // Detector de novedades
  const hasNews = (c) => {
    const lastSeenCount = parseInt(localStorage.getItem(`lastSeenSocial_${c.id}_${user.id}`) || "0");
    return (c.history?.length || 0) > lastSeenCount;
  };

  const handleOpenCase = (c) => {
    const studentInfo = students.find(s => s.id === c.studentId || `${s.lastName}, ${s.firstName}` === c.studentName);
    setSelectedCase({ ...c, fullInfo: studentInfo });
    localStorage.setItem(`lastSeenSocial_${c.id}_${user.id}`, c.history?.length || 0);
  };

  const updateStep = async (caseId, stepName) => {
    const c = cases.find(x => x.id === caseId);
    const field = stepName === 'continuidad' ? 'sent' : 'done';
    const currentValue = c.steps?.[stepName]?.[field] || false;
    const label = stepName === 'continuidad' ? 'ENVÍO DE CONTINUIDAD PEDAGÓGICA' : 'LLAMADA A LA FAMILIA';
    
    // Solo registramos en el chat cuando se MARCA como hecho (no cuando se desmarca)
    if (!currentValue) {
      const autoNote = { 
        date: new Date().toISOString(), 
        text: `📢 REGISTRO AUTOMÁTICO: Se realizó la acción de "${label}".`, 
        author: user.firstName,
        isAuto: true // Marca para darle un estilo distinto si querés
      };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { 
        history: arrayUnion(autoNote) 
      });
    }

    const newSteps = { 
      ...c.steps, 
      [stepName]: { 
        ...c.steps?.[stepName], 
        [field]: !currentValue, 
        date: !currentValue ? new Date().toLocaleDateString('es-AR') : null, 
        author: user.firstName 
      } 
    };
    
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { steps: newSteps });
    if (selectedCase) setSelectedCase(prev => ({ ...prev, steps: newSteps }));
  };

  const handleAddComment = async (caseId) => {
    const text = newComment[caseId];
    if (!text || !text.trim()) return;
    const entry = { date: new Date().toISOString(), text: text.trim(), author: user.firstName };
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { history: arrayUnion(entry) });
    setNewComment({ ...newComment, [caseId]: "" });
    // Actualizar visto
    localStorage.setItem(`lastSeenSocial_${caseId}_${user.id}`, (selectedCase.history?.length || 0) + 1);
  };

  const handleArchiveCase = async (c) => {
    const confirmMsg = "❗ ¿Imprimiste el reporte para el legajo físico?\n\nRecordá que es obligatorio guardar el informe firmado y sellado antes de cerrar el caso.";
    if (confirm(confirmMsg)) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', c.id), { status: 'Reincorporado' });
        setSelectedCase(null);
    }
  };

  const imprimirSeguimientoSocial = (c) => {
    const docHtml = `<html><head><title>Informe - ${c.studentName}</title><style>body{font-family:sans-serif;padding:40px;color:#1e293b}.header{border-bottom:4px solid #2563eb;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center}.main-card{border:2px solid #e2e8f0;border-radius:20px;padding:25px;margin-bottom:30px;background:#f8fafc}.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}.label{font-size:9px;font-weight:900;color:#2563eb;text-transform:uppercase;display:block}.value{font-size:14px;font-weight:bold}.history-item{padding:10px 0;border-bottom:1px solid #f1f5f9;page-break-inside:avoid}.history-meta{font-size:10px;font-weight:800;color:#64748b;display:flex;justify-content:space-between}</style></head><body><div class="header"><h1>JUNTOS A LA PAR</h1><p>INFORME SOCIAL: ${new Date().toLocaleDateString()}</p></div><div class="main-card"><div class="info-grid"><div><span class="label">Estudiante</span><div class="value">${c.studentName}</div></div><div><span class="label">Ciclo</span><div class="value">${c.level}</div></div><div style="grid-column:span 2;margin-top:10px;border-top:1px solid #eee;padding-top:10px;"><span class="label">Motivo</span><div class="value">"${c.reason}"</div></div></div></div><h2>Evolución</h2><div>${c.history?.map(h=>`<div class="history-item"><div class="history-meta"><span>${new Date(h.date).toLocaleDateString()}</span><span>${h.author}</span></div><p>${h.text}</p></div>`).join('')}</div></body></html>`;
    const win = window.open('', '_blank');
    win.document.write(docHtml);
    win.document.close();
    setTimeout(() => { win.print(); }, 800);
  };

  const filteredCases = cases.filter(c => {
    const matchStatus = viewMode === 'archived' ? c.status === 'Reincorporado' : c.status !== 'Reincorporado';
    if (!matchStatus) return false;
    if (filter === 'all') return true;
    const level = (c.level || '').toUpperCase();
    if (filter === 'primeros') return level.includes('INICIAL') || level.includes('1°');
    if (filter === 'segundos') return level.includes('2°') || level.includes('CFI');
    return true;
  });

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in pb-20">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-4 md:p-6 rounded-b-[40px] shadow-sm border-b border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-xl text-white"><Users size={24}/></div>
          <h2 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">Trabajo Social</h2>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="flex-1 md:flex-none bg-slate-100 text-slate-600 font-bold text-[10px] p-3 rounded-xl uppercase outline-none">
            <option value="all">Todos los Ciclos</option>
            <option value="primeros">Inicial / 1° Ciclo</option>
            <option value="segundos">2° Ciclo / CFI</option>
          </select>
          <button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} className={`flex-1 md:flex-none px-4 py-3 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all ${viewMode === 'active' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
            {viewMode === 'active' ? 'Archivo' : 'Activos'}
          </button>
        </div>
      </div>

      {/* LISTA VERTICAL */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
        {loading ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-20"><RefreshCw className="animate-spin mb-2" size={40}/><p className="font-black uppercase text-xs">Cargando...</p></div>
        ) : filteredCases.map(c => {
            const caseHasNews = hasNews(c);
            return (
              <div key={c.id} onClick={() => handleOpenCase(c)} className={`bg-white p-4 rounded-[28px] border-2 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${caseHasNews ? 'border-orange-400 ring-4 ring-orange-50 shadow-lg' : 'border-transparent shadow-sm hover:border-blue-100'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 ${caseHasNews ? 'bg-orange-500 animate-pulse' : 'bg-blue-600 shadow-inner'}`}>
                    {caseHasNews ? '!' : c.studentName[0]}
                  </div>
                  <div className="truncate">
                    <h4 className="font-black text-slate-700 text-sm uppercase truncate leading-tight">{c.studentName}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{c.level}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300"/>
              </div>
            );
        })}
      </div>

      {/* FICHA PANTALLA COMPLETA ESTRATÉGICA */}
      {selectedCase && (
        <div className="fixed inset-0 bg-slate-50 z-[100] flex flex-col animate-in slide-in-from-right duration-300">
          
          {/* HEADER DE LA FICHA */}
          <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-2xl">
            <button onClick={() => setSelectedCase(null)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition">
              <ChevronLeft size={20}/> <span className="text-xs font-black uppercase tracking-tighter">Volver</span>
            </button>
            <div className="text-center">
              <h3 className="font-black uppercase tracking-widest text-[10px] text-blue-400">Seguimiento de Caso</h3>
              <h2 className="text-sm font-black uppercase">{selectedCase.studentName}</h2>
            </div>
            <button onClick={() => imprimirSeguimientoSocial(selectedCase)} className="p-3 bg-white/10 rounded-xl hover:bg-blue-600 transition"><Printer size={20}/></button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
            
            {/* COLUMNA IZQUIERDA: TODA LA INFO DEL ALUMNO (ESTRATÉGICA) */}
            <div className="w-full lg:w-80 bg-white border-r border-slate-200 overflow-y-auto p-6 space-y-6 shrink-0 custom-scrollbar">
              
              <div className="bg-blue-50 p-4 rounded-3xl border border-blue-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Smartphone size={14}/> Contactos Familia</h4>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-50">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Madre / Tutor 1</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{selectedCase.fullInfo?.motherName || 'S/D'}</p>
                    <a href={`tel:${selectedCase.fullInfo?.motherContact}`} className="text-blue-600 text-[11px] font-black mt-1 flex items-center gap-1 hover:underline"><Phone size={12}/> {selectedCase.fullInfo?.motherContact || 'Sin número'}</a>
                  </div>
                  <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-50">
                    <p className="text-[8px] font-black text-slate-400 uppercase">Padre / Tutor 2</p>
                    <p className="text-xs font-bold text-slate-700 truncate">{selectedCase.fullInfo?.fatherName || 'S/D'}</p>
                    <a href={`tel:${selectedCase.fullInfo?.fatherContact}`} className="text-blue-600 text-[11px] font-black mt-1 flex items-center gap-1 hover:underline"><Phone size={12}/> {selectedCase.fullInfo?.fatherContact || 'Sin número'}</a>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-3xl border border-orange-100">
                <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-3 flex items-center gap-1"><Grid size={14}/> Ubicación Escolar</h4>
                <div className="space-y-2 text-xs">
                  <p className="flex justify-between font-bold"><span>Jornada:</span> <span className="text-orange-700">{selectedCase.fullInfo?.journey || 'S/D'}</span></p>
                  <p className="flex justify-between font-bold"><span>Modalidad:</span> <span className="text-orange-700">{selectedCase.fullInfo?.modality || 'Sede'}</span></p>
                  <div className="pt-2 mt-2 border-t border-orange-200 space-y-2">
                    <div className="bg-white/50 p-2 rounded-xl">
                      <p className="text-[8px] font-black text-orange-400 uppercase">T. Mañana</p>
                      <p className="font-bold text-slate-700">{selectedCase.fullInfo?.groupMorning || 'Sin Grupo'}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Doc: {selectedCase.fullInfo?.teacherMorning || '-'}</p>
                    </div>
                    <div className="bg-white/50 p-2 rounded-xl">
                      <p className="text-[8px] font-black text-orange-400 uppercase">T. Tarde</p>
                      <p className="font-bold text-slate-700">{selectedCase.fullInfo?.groupAfternoon || 'Sin Grupo'}</p>
                      <p className="text-[9px] text-slate-400 font-bold">Doc: {selectedCase.fullInfo?.teacherAfternoon || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Motivo del Reporte</h4>
                <p className="text-xs font-bold text-slate-600 leading-relaxed italic">"{selectedCase.reason}"</p>
              </div>

              <button onClick={() => handleArchiveCase(selectedCase)} className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-emerald-600 active:scale-95 transition-all">
                Finalizar Intervención
              </button>
            </div>

            {/* SECCIÓN DERECHA: PROTOCOLO Y CHAT */}
            <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 overflow-hidden">
              
              {/* BOTONES PROTOCOLO */}
            {/* SECCIÓN DE BOTONES CON INSTRUCCIONES */}
      <div className="space-y-3 shrink-0">
        <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-lg mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest opacity-80 italic">Instrucción para el equipo:</p>
            <p className="text-xs font-bold leading-tight">Pulsá los botones de abajo para confirmar que realizaste la acción. Se notificará al chat automáticamente.</p>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => updateStep(selectedCase.id, 'llamada')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.llamada?.done ? 'bg-emerald-500 border-emerald-600 text-white shadow-emerald-100 shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${selectedCase.steps?.llamada?.done ? 'bg-white text-emerald-600 border-white' : 'border-slate-100 text-slate-200'}`}>
              {selectedCase.steps?.llamada?.done ? <CheckCircle2 size={28} strokeWidth={3}/> : <Phone size={24}/>}
            </div>
            <span className="text-[11px] font-black uppercase">{selectedCase.steps?.llamada?.done ? 'Llamada OK' : 'Marcar Llamada'}</span>
          </button>

          <button onClick={() => updateStep(selectedCase.id, 'continuidad')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.continuidad?.sent ? 'bg-indigo-600 border-indigo-700 text-white shadow-indigo-100 shadow-lg' : 'bg-white border-slate-200 text-slate-400 hover:border-blue-400'}`}>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 ${selectedCase.steps?.continuidad?.sent ? 'bg-white text-indigo-600 border-white' : 'border-slate-100 text-slate-200'}`}>
              {selectedCase.steps?.continuidad?.sent ? <CheckCircle2 size={28} strokeWidth={3}/> : <BookOpen size={24}/>}
            </div>
            <span className="text-[11px] font-black uppercase">{selectedCase.steps?.continuidad?.sent ? 'Enviado OK' : 'Marcar Envío'}</span>
          </button>
        </div>
      </div>

              {/* CHAT INTERVENCIONES */}
              <div className="flex-1 flex flex-col bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden relative">
                <div className="bg-slate-100 p-2 text-center border-b"><span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Muro de Intervenciones</span></div>
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
                  {selectedCase.history?.map((h, i) => (
                    <div key={i} className={`flex flex-col ${h.author === user.firstName ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-sm font-bold shadow-sm ${h.author === user.firstName ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                        <p className="text-[8px] font-black uppercase opacity-60 mb-1">{h.author} • {new Date(h.date).toLocaleDateString()}</p>
                        {h.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-slate-50 border-t flex gap-2">
                  <input 
                    value={newComment[selectedCase.id] || ""} 
                    onChange={(e) => setNewComment({ ...newComment, [selectedCase.id]: e.target.value })} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedCase.id)}
                    placeholder="Registrar avance o respuesta..." 
                    className="flex-1 bg-white p-3 rounded-2xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500"
                  />
                  <button onClick={() => handleAddComment(selectedCase.id)} className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg active:scale-95 transition-all flex-shrink-0"><Send size={20}/></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
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
        {activeTab === 'dashboard' && <DashboardView user={user} tasks={tasks} events={events} announcements={announcements} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarView events={events} canEdit={canManageContent} user={user} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} canEdit={canManageContent} />}
        {activeTab === 'matricula' && <MatriculaView user={user} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'groups' && <GroupsView user={user} />}
        {activeTab === 'users' && isSuperAdmin && <UsersAdminView />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}
        {activeTab === 'equipo' && <EquipoTecnicoView user={user} />}
        {/* --- NUEVO: VISTA ADMIN (SOLO RENDERIZA SI EL TAB ES 'ADMIN') --- */}
        {activeTab === 'admin' && <AdministracionView user={user} />}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'users' && isSuperAdmin && <UsersAdminView />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}
        {activeTab === 'admin' && <AdministracionView user={user} />}
        {/* PEGAR ESTA LÍNEA NUEVA: */}
        {activeTab === 'personal' && <PersonalView user={user} />}
        {activeTab === 'medical' && <MedicalView user={user} />}
        {activeTab === 'social' && <SocialView user={user} />}
    
      </main>

<nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0">
        {/* Usamos grid-cols-5 universal para PC y Celular */}
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          
          {/* BOTÓN CENTRAL: MI AULA */}
          <div className="relative -top-5 flex justify-center">
            <button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}>
              <Grid size={24} />
            </button>
            <span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span>
          </div>
          
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />

          {/* BOTÓN MÁS (UNIVERSAL PARA PC Y CELULAR) */}
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

// --- VISTA AULA CORREGIDA (SELECTOR DE DOCENTES ARREGLADO) ---
function GroupsView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [activeTab, setActiveTab] = useState('info');
  
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
  const [groupStats, setGroupStats] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]); // Para saber si imprimimos uno o todos
  const [printColumns, setPrintColumns] = useState({
    dni: true,
    birthDate: true,
    healthInsurance: false,
    contacts: true,
    photo: false
  });
  const SOCIAL_TARGETS = ['mchancalay', 'Myrian Chancalay'];
  const scrollRef = useRef(null); 
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const isStrategic = ['super-admin', 'admin', 'Equipo Directivo', 'Equipo Técnico', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
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

  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => { unsubS(); unsubU(); };
  }, []);

  const getNormRole = (r) => {
    if (!r) return '';
    return r.trim();
  };

  const groupedData = students.reduce((acc, s) => {
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
      if (s.modality === 'Inclusión') {
          const dais = [...new Set([s.daiMorning, s.daiAfternoon].filter(Boolean))];
          dais.forEach(daiName => {
              const groupKey = `DAI: ${daiName}`;
              if (!acc[groupKey]) {
                  acc[groupKey] = { name: groupKey, students: [], teacher: daiName, teacherId: s.daiId, isInclusionGroup: true };
              }
              if (!acc[groupKey].students.find(x => x.id === s.id)) { acc[groupKey].students.push(s); }
          });
      } else {
          const groupName = s[`group${suf}`];
          if (!groupName) return acc;
          const groupKey = groupName.trim();
          if (!acc[groupKey]) { 
              acc[groupKey] = { 
                  name: groupKey, students: [], teacher: s[`teacher${suf}`], teacherId: s[`teacherId${suf}`], 
                  teacher2: s[`teacher2${suf}`], aux: s[`aux${suf}`], special1: s[`special1${suf}`], 
                  special2: s[`special2${suf}`], special3: s[`special3${suf}`], sup1: s[`sup1${suf}`], 
                  sup2: s[`sup2${suf}`], classroom: s.classroom, driveLink: s[`driveLink${suf}`], isInclusionGroup: false 
              }; 
          }
          acc[groupKey].students.push(s); 
      }
      return acc;
  }, {});
// Ordenamos los grupos: INICIAL siempre primero, el resto por nombre alfabético
  let groups = Object.values(groupedData).sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      
      // Si el grupo A es inicial y el B no, A va primero
      if (nameA.includes("INICIAL") && !nameB.includes("INICIAL")) return -1;
      // Si el grupo B es inicial y el A no, B va primero
      if (!nameA.includes("INICIAL") && nameB.includes("INICIAL")) return 1;
      
      // Si ambos son iniciales o ninguno lo es, ordenamos alfabéticamente normal
      return nameA.localeCompare(nameB);
  });

 // --- LÓGICA DE FILTRADO DEFINITIVA (SÓLO POR ID - UNIFICADA) ---
  if (!isManagement) {
      groups = groups.filter(g => {
          const uId = user.id;
          const legajoId = user.legajoId;
          const suf = turn === 'morning' ? 'Morning' : 'Afternoon';

          // 1. Chequeo de Equipo del Grupo (Titular, Auxiliar, Especiales)
          // Buscamos tu ID en cualquiera de estos campos del grupo
          const groupStaffIds = [
            g.teacherId, 
            g.auxId, 
            g.special1Id, 
            g.special2Id, 
            g.special3Id,
            g.sup1Id,
            g.sup2Id
          ];
          
          if (groupStaffIds.includes(uId) || (legajoId && groupStaffIds.includes(legajoId))) return true;

          // 2. Chequeo por Alumno (DAI o Docentes específicos en ficha)
          const vinculadoAAlumnx = g.students.some(s => 
              s.daiId === uId || (legajoId && s.daiId === legajoId) ||
              s[`teacherId${suf}`] === uId || (legajoId && s[`teacherId${suf}`] === legajoId) ||
              s[`teacherId2${suf}`] === uId || (legajoId && s[`teacherId2${suf}`] === legajoId) ||
              s[`auxId${suf}`] === uId || (legajoId && s[`auxId${suf}`] === legajoId)
          );
          
          if (vinculadoAAlumnx) return true;

          return false;
      });
  } else {
      // Si es directivo, filtramos por la pestaña Sede/Inclusión
      if (viewFilter !== 'all') { 
          groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup); 
      }
  }

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };

const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe'); 
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
    document.body.appendChild(iframe);
    
    let fullHtml = `<html><head><title>Listado Institucional</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap'); 
      body{font-family:'Roboto', sans-serif; padding:20px; color:#333;} 
      .main-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #7c3aed; padding-bottom: 10px; margin-bottom: 20px; } 
      .main-title { font-size: 24px; font-weight: 900; color: #4c1d95; text-transform: uppercase; margin: 0; } 
      .group-section { margin-bottom: 30px; page-break-inside: avoid; } 
      .group-header { background-color: #f3f4f6; border-left: 6px solid #7c3aed; padding: 10px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; } 
      .group-name { font-size: 18px; font-weight: 900; color: #5b21b6; margin: 0; } 
      .group-staff { font-size: 10px; font-weight: bold; color: #555; margin-top: 4px; text-transform: uppercase; } 
      table { width: 100%; border-collapse: collapse; font-size: 10px; } 
      thead tr { background-color: #7c3aed !important; color: white !important; } 
      th { padding: 5px; text-align: left; text-transform: uppercase; font-weight: bold; border: 1px solid #ddd; } 
      td { border: 1px solid #e5e7eb; padding: 5px; color: #374151; vertical-align: middle; } 
      .photo-img { width: 30px; height: 30px; border-radius: 5px; object-fit: cover; border: 1px solid #ddd; }
      .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; font-size: 9px; color: #9ca3af; font-style: italic; }
    </style></head><body>
    <div class="main-header"><div><h1 class="main-title">Listado Institucional</h1><p class="main-subtitle">Ciclo 2026 - Turno ${turn === 'morning' ? 'Mañana' : 'Tarde'}</p></div><img src="${LOGO_URL}" style="height: 50px;" /></div>`;

    groupsList.forEach(g => {
        const sorted = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));
        let supText = g.sup1 || '-'; if (g.sup2) supText += ` / ${g.sup2}`;
        const aulaText = g.classroom ? ` | 🏫 AULA: ${g.classroom}` : '';
        
        fullHtml += `<div class="group-section"><div class="group-header"><h2 class="group-name">${g.name}</h2><div class="group-staff">DOC: ${g.teacher || 'VACANTE'} | AUX: ${g.aux || '-'} | SUP: ${supText} ${aulaText}</div></div>
        <table><thead><tr>
          <th width="3%">#</th>
          ${printColumns.photo ? '<th width="5%">Foto</th>' : ''}
          <th width="30%">Apellido y Nombre</th>
          ${printColumns.dni ? '<th width="12%">DNI</th>' : ''}
          ${printColumns.birthDate ? '<th width="12%">Nacimiento</th>' : ''}
          ${printColumns.healthInsurance ? '<th width="15%">Obra Social</th>' : ''}
          ${printColumns.contacts ? '<th>Familia / Contacto</th>' : ''}
        </tr></thead><tbody>`;

        sorted.forEach((s, i) => {
            fullHtml += `<tr>
                <td style="text-align:center;">${i+1}</td>
                ${printColumns.photo ? `<td>${s.photoUrl ? `<img src="${s.photoUrl}" class="photo-img"/>` : '-'}</td>` : ''}
                <td style="font-weight:bold;text-transform:uppercase;">${s.lastName}, ${s.firstName}</td>
                ${printColumns.dni ? `<td>${s.dni||'-'}</td>` : ''}
                ${printColumns.birthDate ? `<td>${getSafeDate(s.birthDate)}</td>` : ''}
                ${printColumns.healthInsurance ? `<td>${s.healthInsurance||'S/D'}</td>` : ''}
                ${printColumns.contacts ? `<td>${g.isInclusionGroup ? `Esc: ${s.originSchool}` : `M: ${s.motherName||'-'} (${s.motherContact||'-'}) / P: ${s.fatherName||'-'}`}</td>` : ''}
            </tr>`;
        });
        fullHtml += `</tbody></table></div>`;
    });
    fullHtml += `<div class="footer">Generado el ${new Date().toLocaleDateString()}</div></body></html>`;
    const doc = iframe.contentWindow.document; doc.open(); doc.write(fullHtml); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };
const printStaffOrganization = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);

    let html = `<html><head><title>Planilla de Organización</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
      body{font-family:'Roboto', sans-serif; padding:20px; color:#333;}
      h1 { text-align: center; color: #4c1d95; text-transform: uppercase; font-size: 20px; margin-bottom: 20px; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background-color: #7c3aed; color: white; text-transform: uppercase; font-size: 10px; padding: 10px; border: 1px solid #ddd; }
      td { padding: 10px; border: 1px solid #ddd; font-size: 11px; font-weight: bold; text-align: center; text-transform: uppercase; }
      tr:nth-child(even) { background-color: #f3f4f6; }
      .footer { margin-top: 20px; text-align: right; font-size: 9px; color: #aaa; font-style: italic; }
    </style></head><body>
    <h1>Planilla de Organización de Personal - Turno ${turn === 'morning' ? 'Mañana' : 'Tarde'}</h1>
    <table>
      <thead>
        <tr>
          <th>Nivel</th>
          <th>Grupo</th>
          <th>Docente / DAI</th>
          <th>Auxiliar</th>
          <th>Aula Física</th>
        </tr>
      </thead>
      <tbody>`;

    groupsList.forEach(g => {
        html += `<tr>
          <td>${g.students[0]?.level || '-'}</td>
          <td style="color: #7c3aed;">${g.name}</td>
          <td>${g.teacher || 'VACANTE'} ${g.teacher2 ? `/ ${g.teacher2}` : ''}</td>
          <td>${g.aux || '-'}</td>
          <td>${g.classroom || '-'}</td>
        </tr>`;
    });

    html += `</tbody></table><p class="footer">Generado el ${new Date().toLocaleDateString()}</p></body></html>`;
    
    const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };
  const handlePrintAll = () => { printGroups(groups); };
  const handlePrintSingleGroup = (g) => { printGroups([g]); };

const handleReportAbsenteeism = async () => {
      if(!selectedStudent) return;
      const details = prompt(`¿Motivo del ausentismo o conflicto de ${selectedStudent.firstName}?`);
      if(!details) return;

      try {
          const caseData = {
              studentId: selectedStudent.id,
              studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
              level: selectedStudent.level || 'Sin Nivel',
              group: turn === 'morning' ? selectedStudent.groupMorning : selectedStudent.groupAfternoon,
              reason: details,
              reportedBy: user.firstName,
              status: 'Pendiente', // Pendiente, En Proceso, Reincorporado
              steps: {
                  llamada: { done: false, date: null, obs: '' },
                  continuidad: { sent: false, date: null },
                  entrevista: { done: false, date: null }
              },
              history: [{ date: new Date().toISOString(), text: `Reporte inicial: ${details}`, author: user.firstName }],
              createdAt: serverTimestamp(),
              cycle: '2026'
          };
          
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'), caseData);
          alert("✅ Caso derivado a Trabajo Social.");
          setActiveTab('social'); // Redirige a la nueva sección
      } catch (e) { alert("Error: " + e.message); }
  };

  const addIncident = async (type, text = "") => { if (!showBitacoraModal) return; const newInc = { date: new Date().toISOString(), type: text ? "Nota" : type, severity: type, text: text || type, author: user.firstName }; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id), { incidents: arrayUnion(newInc) }); setStudents(prev => prev.map(s => s.id === showBitacoraModal.id ? {...s, incidents: [...(s.incidents||[]), newInc]} : s)); setNewNote(""); setIsWriting(false); setShowBitacoraModal(null); alert("✅ Guardado."); } catch (e) { alert(e.message); } };
  const handleSaveIncident = async (type, severity) => { if (!showBitacoraModal) return; setSavingIncident(true); try { const incidentData = { type, severity, date: new Date().toISOString(), author: user.fullName || user.firstName, authorId: user.id }; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id), { incidents: arrayUnion(incidentData) }); alert("✅ Registro guardado"); setShowBitacoraModal(null); } catch (e) { console.error(e); } finally { setSavingIncident(false); } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

const handleUpdateGroup = async (e) => { 
      e.preventDefault(); 
      if (!editingGroup) return; 
      setUpdatingGroup(true); 
      const fd = new FormData(e.target); 
      const updates = {}; 
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon'; 

      const getName = (id) => {
        if (!id) return "";
        const found = usersList.find(u => u.id === id);
        return found ? found.fullName : "";
      };

      try {
          if (!editingGroup.isInclusionGroup) { 
              // Docente 1
              const tId = fd.get('teacher');
              updates[`teacherId${suf}`] = tId; 
              updates[`teacher${suf}`] = getName(tId);

              // Docente 2 (Pareja)
              const t2Id = fd.get('teacher2Id');
              updates[`teacherId2${suf}`] = t2Id;
              updates[`teacher2${suf}`] = getName(t2Id);

              // Auxiliar
              const aId = fd.get('auxId');
              updates[`auxId${suf}`] = aId;
              updates[`aux${suf}`] = getName(aId);

              // Especiales (1, 2 y 3)
              [1, 2, 3].forEach(num => {
                const specId = fd.get(`special${num}Id`);
                updates[`special${num}Id${suf}`] = specId || "";
                updates[`special${num}${suf}`] = getName(specId);
              });

              updates[`group${suf}`] = fd.get('groupName'); 
              updates.classroom = fd.get('classroom'); 
              updates[`driveLink${suf}`] = fd.get('driveLink');
          } else { 
              const dId = fd.get('teacher');
              updates['daiId'] = dId; 
              updates['daiMorning'] = getName(dId); 
              updates['daiAfternoon'] = getName(dId);
              updates[`driveLink${suf}`] = fd.get('driveLink');
          } 
      
          const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)); 
          await Promise.all(promises); 
          setEditingGroup(null); 
      } catch (err) { 
          alert("Error: " + err.message); 
      } finally { 
          setUpdatingGroup(false); 
      } 
  };

  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales', 'DAI', 'Inclusión'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico' || u.role === 'Equipo Técnico Inclusión' || u.role === 'Trabajadora Social');
  const specialOptions = usersList.filter(u => u.role === 'Profes Especiales' || u.role === 'Docente');

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      {!isManagement && (
        <div className="bg-white px-6 py-4 border-b flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner"> <User size={24} /> </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Docente Identificada</p>
            <h2 className="text-lg font-black text-violet-900 uppercase italic leading-none">{user.fullName || `${user.firstName} ${user.lastName}`}</h2>
            <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase">ID: {user.id.substring(0,8)}...</p>
          </div>
        </div>
      )}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p>
              </div>
              {isManagement && <button onClick={() => { setGroupsToPrint(groups); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}
          </div>
          <div className={`flex gap-2 ${viewFilter === 'inclusion' ? 'justify-end' : ''}`}>
              {viewFilter !== 'inclusion' && (
                  <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
                      <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
                      <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
                  </div>
              )}
              {isManagement && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setViewFilter('sede')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button>
                      <button onClick={() => setViewFilter('inclusion')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button>
                  </div>
              )}
          </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
          <button onClick={() => scroll('left')} className="hidden md:flex absolute left-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronLeft size={24}/></button>
          <button onClick={() => scroll('right')} className="hidden md:flex absolute right-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronRight size={24}/></button>
          <div ref={scrollRef} className={`h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start ${groups.length <= 2 ? 'justify-center' : ''}`}>
                {groups.length === 0 && (<div className="m-auto text-center opacity-50"><p className="font-bold text-gray-400">No hay grupos visibles.</p></div>)} 
                {groups.map((g) => (
                   <div key={g.name} className={`flex flex-col h-[calc(100vh-220px)] md:h-fit bg-white rounded-[30px] border shadow-sm relative overflow-hidden group-hover:shadow-md transition shrink-0 ${groups.length <= 2 ? 'w-full max-w-[900px]' : 'min-w-[280px] w-[300px]'} ${g.isInclusionGroup ? 'border-indigo-200' : 'border-gray-200'}`}>
                      <div className={`p-4 border-b-4 relative ${g.isInclusionGroup ? 'bg-indigo-50 border-indigo-400' : (turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50')}`}>
                          <div className="absolute top-2 right-2 flex gap-1">
                              {g.driveLink && (<button onClick={() => window.open(g.driveLink, '_blank')} className="p-2 bg-green-100 hover:bg-green-200 rounded-full text-green-700 shadow-sm transition" title="Carpeta Drive"><Folder size={14}/></button>)}
                              {isStrategic && (<button onClick={()=>setGroupStats(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><PieChart size={14}/></button>)}
                             <button onClick={() => { setGroupsToPrint([g]); setShowPrintOptions(true); }} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
                              {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                          </div>
                          <div className="flex items-center gap-2 pr-24 flex-wrap">
                            <h3 className="font-black text-gray-800 text-lg leading-tight">{g.name}</h3>
                            <span className="bg-white/80 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm border border-violet-100 shrink-0">{g.students.length} ALUMNXS</span>
                          </div>
                          <div className="mt-2 text-xs text-gray-500 font-medium space-y-1">
                              <p>DOC: <span className="font-bold text-violet-700 uppercase">{g.teacher || 'Sin asignar'}</span> {g.teacher2 && <span className="text-violet-500 font-bold">/ {g.teacher2}</span>}</p>
                              {g.aux && <p>AUX: <span className="font-bold uppercase">{g.aux}</span></p>}
                              {(g.special1 || g.special2 || g.special3) && <p className="text-gray-400 text-[9px] uppercase font-bold">ESPECIALES: {[g.special1, g.special2, g.special3].filter(Boolean).join(', ')}</p>}
                              {(g.sup1 || g.sup2) && <p className="text-violet-600 font-bold truncate">SUP: {g.sup1 || ''} {g.sup2 ? `& ${g.sup2}` : ''}</p>}
                              {g.classroom && (<p className="text-orange-600 font-black bg-white/80 px-2 py-0.5 rounded-md inline-block shadow-sm mt-1 border border-orange-100">🏫 Aula {g.classroom}</p>)}
                          </div>
                      </div>
                     <div className="flex-1 overflow-y-auto p-4 bg-gray-50 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 content-start">
                        {g.students.map(s => (
                            <div key={s.id} onClick={() => {setSelectedStudent(s); setActiveTab('info');}} className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition">
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center w-full h-full font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                                <div><h4 className="font-bold text-gray-700 text-sm">{s.firstName} {s.lastName}</h4>{g.isInclusionGroup && <p className="text-[10px] text-indigo-500 font-bold">Esc. {s.originSchool}</p>}</div>
                                <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s); setIsWriting(false); setNewNote("");}} className="ml-auto w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition">⚡</button>
                            </div>
                        ))}
                      </div>
                    </div>
                ))}
          </div>
      </div>

      {showBitacoraModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500">
        <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
        {!isWriting ? (
            <>
                <div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? 'opacity-50' : 'hover:brightness-95'}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div>
                <button onClick={() => setIsWriting(true)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2"><Edit3 size={16}/> Escribir Nota</button>
            </>
        ) : (
            <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escribí los detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500"/>
                <div className="flex gap-2"><button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Volver</button><button onClick={() => addIncident('medium', newNote)} disabled={!newNote.trim()} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button></div>
            </div>
        )}
      </div></div>)}

     {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3>
              <button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center">
                <p className="text-xs text-violet-500 font-bold uppercase mb-1">
                  {editingGroup.isInclusionGroup ? "Editando Inclusión" : "Editando Sede"}
                </p>
                {!editingGroup.isInclusionGroup && (
                  <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200" placeholder="Nombre Grupo" />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Docente Titular (1)</label>
                <select name="teacher" defaultValue={editingGroup.teacherId || ""} className="w-full p-3 bg-white border-2 border-violet-100 rounded-xl outline-none font-bold text-xs">
                  <option value="">Seleccionar...</option>
                  {usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                </select>
              </div>

              {!editingGroup.isInclusionGroup && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Docente Pareja (2)</label>
                    <select name="teacher2Id" defaultValue={editingGroup.teacherId2 || ""} className="w-full p-3 bg-white border-2 border-violet-100 rounded-xl outline-none font-bold text-xs">
                      <option value="">Ninguno / Vacante</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                  </div>

                 <div>
  <label className="text-xs font-bold text-gray-500 ml-1">Auxiliar / Preceptora</label>
  <select 
    name="auxId" 
    defaultValue={editingGroup.auxId || ""} 
    className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-transparent focus:border-violet-200"
  >
    <option value="">Sin asignar</option>
    {/* Filtro ampliado: Aparecen Docentes, Auxiliares, Preceptores e Inclusión */}
    {usersList
      .filter(u => ['Docente', 'Auxiliar/Preceptor', 'Preceptora', 'Auxiliar', 'Inclusión'].includes(u.role))
      .map(u => (
        <option key={u.id} value={u.id}>
          {u.lastName}, {u.firstName} ({u.role})
        </option>
      ))
    }
  </select>
</div>

                  <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 space-y-3">
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest ml-1">Profesores Especiales</p>
                    <select name="special1Id" defaultValue={editingGroup.special1Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 1...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                    <select name="special2Id" defaultValue={editingGroup.special2Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 2...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                    <select name="special3Id" defaultValue={editingGroup.special3Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 3...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Aula Física</label>
                    <input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" placeholder="Ej: 4"/>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-green-600 ml-1">Drive del Grupo</label>
                <input name="driveLink" defaultValue={editingGroup.driveLink || ""} className="w-full p-3 bg-green-50 border border-green-100 rounded-xl outline-none font-bold text-xs text-green-700" placeholder="https://..." />
              </div>

              <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4">
                {updatingGroup ? <span>Cargando...</span> : <span>Aplicar Cambios</span>}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4 text-center">Info a Imprimir</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase text-center mb-4 tracking-widest">Listado de Estudiantes</p>
            <div className="grid grid-cols-1 gap-2 mb-6">
              {[
                {id: "photo", label: "📸 Foto del Alumno"},
                {id: "dni", label: "🪪 DNI"},
                {id: "birthDate", label: "📅 Fecha Nacimiento"},
                {id: "healthInsurance", label: "🏥 Obra Social"},
                {id: "contacts", label: "📞 Contactos Familia"},
              ].map(col => (
                <label key={col.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-violet-50 transition border border-transparent hover:border-violet-200">
                  <span className="text-xs font-bold text-gray-600 uppercase">{col.label}</span>
                  <input 
                    type="checkbox" 
                    checked={printColumns[col.id]} 
                    onChange={() => setPrintColumns({...printColumns, [col.id]: !printColumns[col.id]})}
                    className="w-5 h-5 accent-violet-600"
                  />
                </label>
              ))}
            </div>

            <div className="relative h-px bg-gray-100 my-6">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-3 text-[8px] font-black text-gray-300 uppercase tracking-widest">Otras Plantillas</span>
            </div>

            <button 
              onClick={() => { printStaffOrganization(groupsToPrint); setShowPrintOptions(false); }}
              className="w-full py-4 bg-teal-50 text-teal-700 border-2 border-teal-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-100 transition active:scale-95 flex items-center justify-center gap-2 mb-6"
            >
              <Users size={16}/> Solo Organización (Cargos)
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPrintOptions(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button 
                onClick={() => { printGroups(groupsToPrint); setShowPrintOptions(false); }} 
                className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-violet-700 transition"
              >
                Imprimir Alumnos
              </button>
            </div>
          </div>
        </div>
      )}

      {groupStats && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={() => setGroupStats(null)}><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-violet-900 uppercase italic">Análisis del Grupo</h3><p className="text-xs text-gray-500 font-bold">{groupStats.name}</p></div><button onClick={() => setGroupStats(null)}><X size={20}/></button></div></div></div>)}

      {selectedStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0"><button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{selectedStudent.lastName}, {selectedStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(selectedStudent.birthDate)} años</span></p></div></div><div className="flex gap-2 mt-6"><button onClick={() => setActiveTab("info")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === "info" ? "bg-white text-blue-600" : "bg-black/20 text-white/70"}`}>Datos</button><button onClick={() => setActiveTab("history")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === "history" ? "bg-white text-blue-600" : "bg-black/20 text-white/70"}`}>Bitácora</button></div></div><div className="p-6 overflow-y-auto space-y-6">{activeTab === "info" ? (<div className="space-y-4"><div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><h3 className="font-bold text-orange-800 text-xs uppercase mb-2">Contacto</h3><p className="text-sm">Madre: <b>{selectedStudent.motherName}</b> ({selectedStudent.motherContact})</p><p className="text-sm">Padre: <b>{selectedStudent.fatherName}</b> ({selectedStudent.fatherContact})</p></div><button onClick={handleReportAbsenteeism} className="w-full py-4 bg-red-50 text-red-700 font-black rounded-2xl border border-red-200 flex items-center justify-center gap-2 hover:bg-red-100 transition animate-in zoom-in shadow-sm uppercase text-[10px] tracking-widest"><AlertTriangle size={18}/> Reportar Ausentismo (+3 días)</button><div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Ubicación</h3><p className="text-sm">TM: <b>{selectedStudent.groupMorning}</b></p><p className="text-sm">TT: <b>{selectedStudent.groupAfternoon}</b></p></div></div>) : (<div className="space-y-2">{selectedStudent.incidents?.map((inc, i) => (<div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="font-bold text-sm">{inc.text || inc.type}</p><p className="text-xs text-gray-500">{new Date(inc.date).toLocaleDateString()} - {inc.author}</p></div>))}</div>)}</div></div></div>)}

      {showBitacoraModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500"><div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>{!isWriting ? (<><div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div><button onClick={() => setIsWriting(true)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2"><Edit3 size={16}/> Escribir Nota</button></>) : (<div className="animate-in slide-in-from-bottom"><textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500"/><div className="flex gap-2"><button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Volver</button><button onClick={() => addIncident("medium", newNote)} disabled={!newNote.trim()} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button></div></div>)}</div></div>)}
    </div>
  );
}
// --- VISTA PERSONAL (VERSIÓN DEFINITIVA Y COMPLETA) ---
function PersonalView({ user }) {
  const [staffList, setStaffList] = useState([]);
  const [students, setStudents] = useState([]); // <-- AGREGÁ ESTO
 const uniqueTurns = TURNS_LIST;
  
  const [staffFilterText, setStaffFilterText] = useState('');
  // ROLES COMO ARRAY PARA MULTISELECCIÓN
  const [filters, setFilters] = useState({ modality: 'all', roles: [], turn: 'all', subsidized: 'all' });
  
  const [viewingStaff, setViewingStaff] = useState(null); 
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printColumns, setPrintColumns] = useState({
      dni: true,
      cargo1: true,
      cargo2: true,
      alta: false,
      domicilio: false,
      telefono: false,
      titulo: false
  });

  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  // LISTA ESTRICTA DE ROLES OFICIALES
  const VALID_ROLES = [
      "Docente", "Preceptora", "Auxiliar", "Profe Especial", "Equipo Técnico", "Equipo Directivo",
      "Dirección Inclusión", "Equipo Técnico Inclusión", "DAI",
      "Cocina", "Limpieza", "Mantenimiento", "Administración"
  ];

  const getNormRole = (r) => {
      if (!r) return '';
      const match = VALID_ROLES.find(v => v.toLowerCase() === r.trim().toLowerCase());
      return match || r.trim();
  };

 useEffect(() => {
  const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
  const unsubStaff = onSnapshot(qStaff, (snap) => { setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

  // AGREGÁ ESTE BLOQUE:
  const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
  const unsubStudents = onSnapshot(qStudents, (snap) => { 
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
  });

  return () => { unsubStaff(); unsubStudents(); }; // Asegurate de cerrar ambos
}, []);

 const filteredStaff = staffList.filter(s => {
      const txt = staffFilterText.toLowerCase();
      const matchesText = !txt || `${s.lastName} ${s.firstName} ${s.dni}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      
      if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
      
      if (filters.subsidized !== 'all') {
          const isSub1 = s.cargo1_subsidized === 'true' || (s.isSubsidized === 'true' && s.cargo1_name);
          const isSub2 = s.cargo2_subsidized === 'true';
          const hasAnySub = isSub1 || isSub2;
          if (filters.subsidized === 'yes' && !hasAnySub) return false;
          if (filters.subsidized === 'no' && hasAnySub) return false;
      }

      const c1Role = getNormRole(s.cargo1_role || s.role); 
      const c2Role = getNormRole(s.cargo2_role);
      const c1Turn = (s.cargo1_turn || '').trim().toLowerCase();
      const c2Turn = (s.cargo2_turn || '').trim().toLowerCase();

      const filterRoles = filters.roles || [];
      const filterTurn = filters.turn.toLowerCase();

      const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || c1Turn);
      const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || c2Turn);

      // CORRECCIÓN CRÍTICA: Usamos VALID_ROLES_OFFICIAL que es la que está afuera
      const rolesValidos = typeof VALID_ROLES !== 'undefined' ? VALID_ROLES : [];
     const c1IsUnassigned = !hasC1 || !VALID_ROLES.includes(c1Role);
const c2IsUnassigned = hasC2 && !VALID_ROLES.includes(c2Role);

      let c1MatchesRole = filterRoles.length === 0;
      let c2MatchesRole = filterRoles.length === 0;

      if (filterRoles.length > 0) {
          if (filterRoles.includes('sin-asignar') && c1IsUnassigned) c1MatchesRole = true;
          if (filterRoles.includes(c1Role)) c1MatchesRole = true;
          if (filterRoles.includes('sin-asignar') && c2IsUnassigned) c2MatchesRole = true;
          if (filterRoles.includes(c2Role)) c2MatchesRole = true;
      }

      const c1MatchesTurn = filterTurn === 'all' || c1Turn.includes(filterTurn);
      const c2MatchesTurn = filterTurn === 'all' || c2Turn.includes(filterTurn);

      const c1IsValid = hasC1 && c1MatchesRole && c1MatchesTurn;
      const c2IsValid = hasC2 && c2MatchesRole && c2MatchesTurn;

      if (filterRoles.length === 0 && filterTurn === 'all') return true;
      if (!c1IsValid && !c2IsValid) return false;

      return true;
  });


  const handlePhotoChange = (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
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
  };

  const calcularAntiguedad = (aniosBase, mesesBase, fechaReferencia) => {
      const aBase = parseInt(aniosBase) || 0;
      const mBase = parseInt(mesesBase) || 0;
      if (!fechaReferencia && aBase === 0 && mBase === 0) return '-';

      const refDate = fechaReferencia ? new Date(fechaReferencia + 'T00:00:00') : new Date();
      const hoy = new Date();
      
      let diffAnios = hoy.getFullYear() - refDate.getFullYear();
      let diffMeses = hoy.getMonth() - refDate.getMonth();
      
      if (diffMeses < 0 || (diffMeses === 0 && hoy.getDate() < refDate.getDate())) {
          diffAnios--;
          diffMeses += 12;
      }

      let totalMeses = mBase + diffMeses;
      let totalAnios = aBase + diffAnios;

      if (totalMeses >= 12) {
          totalAnios += Math.floor(totalMeses / 12);
          totalMeses = totalMeses % 12;
      }

      if (totalAnios <= 0 && totalMeses <= 0) return 'Reciente';
      if (totalAnios <= 0) return `${totalMeses} meses`;
      if (totalMeses === 0) return `${totalAnios} años`;
      return `${totalAnios} años, ${totalMeses} mes${totalMeses !== 1 ? 'es' : ''}`;
  };

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };

  // IMPRIMIR FICHAS INDIVIDUALES (CARDS)
  const imprimirFichasDocentes = (lista) => {
      if (!lista || lista.length === 0) return alert("No hay docentes para imprimir.");
      let html = `<html><head><title>Fichas Docentes</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body{font-family:'Roboto',sans-serif;padding:20px; color: #222;}
          .page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #8b5cf6;}
          .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}
          .header-text h1{color:#5b21b6;font-size:24px;margin:0;text-transform:uppercase;}
          .header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}
          .photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #8b5cf6;display:flex;align-items:center;justify-content:center;font-size:30px;color:#aaa;}
          .photo-box img{width:100%;height:100%;object-fit:cover;}
          .section-title{background:#f3f4f6;color:#5b21b6;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #8b5cf6; margin-top:20px;}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}
          .field{margin-bottom:5px;}
          .label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}
          .value{font-size:12px;font-weight:bold;color:#333;}
          .footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}
          .cargo-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f9fafb; }
          .cargo-card.active { border-color: #c4b5fd; background-color: #fff; }
          .cargo-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
          .cargo-role { font-size: 16px; font-weight: 900; color: #6d28d9; text-transform: uppercase; }
          .badge-sub { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-nosub { background: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-papeles { background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 5px; }
          .cargo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      </style></head><body>`;
      
      lista.forEach(s => {
          let antiguedad = calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef);
          
          let c1Role = getNormRole(s.cargo1_role || s.role) || 'Rol Pendiente';
          let c2Role = getNormRole(s.cargo2_role) || 'Rol Pendiente';

          const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role !== 'Rol Pendiente' || (s.cargo1_turn && s.cargo1_turn.trim()));
          const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role !== 'Rol Pendiente' || (s.cargo2_turn && s.cargo2_turn.trim()));

          let c1Html = '';
          if (hasC1) {
              let subBadge = (s.cargo1_subsidized === 'true' || s.isSubsidized === 'true') ? '<span class="badge-sub">SUBVENCIONADO (MECA)</span>' : '<span class="badge-nosub">SIN SUBVENCIÓN (DENO)</span>';
              let papelesBadge = s.cargo1_en_papeles === 'true' ? '<span class="badge-papeles">SOLO EN PAPELES</span>' : '';
              c1Html = `
              <div class="cargo-card active">
                  <div class="cargo-header">
                      <span class="cargo-role">CARGO 1: ${c1Role}</span>
                      <div>${subBadge}${papelesBadge}</div>
                  </div>
                  <div class="cargo-grid">
                      <div class="field"><span class="label">N° de Cargo</span><span class="value">${s.cargo1_numero || '-'}</span></div>
                      <div class="field"><span class="label">Detalle / Nombre</span><span class="value">${s.cargo1_name || '-'}</span></div>
                      <div class="field"><span class="label">Turno</span><span class="value">${s.cargo1_turn || '-'}</span></div>
                      <div class="field"><span class="label">Sit. de Revista</span><span class="value">${s.cargo1_revista || '-'}</span></div>
                      <div class="field"><span class="label">Tipo</span><span class="value" style="text-transform:uppercase;">${s.cargo1_type || '-'}</span></div>
                      <div class="field"><span class="label">Fecha Alta</span><span class="value">${getSafeDate(s.cargo1_ingreso)}</span></div>
                  </div>
              </div>`;
          } else {
              c1Html = `<div class="cargo-card"><div class="cargo-role" style="color:#aaa; font-size: 14px;">CARGO 1: NO TRABAJA / SIN CARGO</div></div>`;
          }

          let c2Html = '';
          if (hasC2) {
              let subBadge = s.cargo2_subsidized === 'true' ? '<span class="badge-sub">SUBVENCIONADO (MECA)</span>' : '<span class="badge-nosub">SIN SUBVENCIÓN (DENO)</span>';
              let papelesBadge = s.cargo2_en_papeles === 'true' ? '<span class="badge-papeles">SOLO EN PAPELES</span>' : '';
              c2Html = `
              <div class="cargo-card active">
                  <div class="cargo-header">
                      <span class="cargo-role">CARGO 2: ${c2Role}</span>
                      <div>${subBadge}${papelesBadge}</div>
                  </div>
                  <div class="cargo-grid">
                      <div class="field"><span class="label">N° de Cargo</span><span class="value">${s.cargo2_numero || '-'}</span></div>
                      <div class="field"><span class="label">Detalle / Nombre</span><span class="value">${s.cargo2_name || '-'}</span></div>
                      <div class="field"><span class="label">Turno</span><span class="value">${s.cargo2_turn || '-'}</span></div>
                      <div class="field"><span class="label">Sit. de Revista</span><span class="value">${s.cargo2_revista || '-'}</span></div>
                      <div class="field"><span class="label">Tipo</span><span class="value" style="text-transform:uppercase;">${s.cargo2_type || '-'}</span></div>
                      <div class="field"><span class="label">Fecha Alta</span><span class="value">${getSafeDate(s.cargo2_ingreso)}</span></div>
                  </div>
              </div>`;
          } else {
              c2Html = `<div class="cargo-card"><div class="cargo-role" style="color:#aaa; font-size: 14px;">CARGO 2: NO TRABAJA / SIN CARGO</div></div>`;
          }

          html += `<div class="page">
              <div class="header">
                  <div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Modalidad: <strong style="color: #6d28d9;">${s.modality || 'Sede'}</strong></p></div>
                  <div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : s.firstName?.[0] || 'U'}</div>
              </div>
              <div class="section-title">Datos Personales y Formación</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Teléfono / Celular</span><span class="value">${s.phone || '-'}</span></div>
                  <div class="field"><span class="label">Email</span><span class="value">${s.email || '-'}</span></div>
                  <div class="field"><span class="label">Contacto de Emergencia</span><span class="value" style="color:#dc2626">${s.emergencyContact || '-'}</span></div>
                  <div class="field" style="grid-column: span 2;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div>
                  <div class="field"><span class="label">Título</span><span class="value">${s.degree || '-'}</span></div>
                  <div class="field"><span class="label">Estado de Estudios</span><span class="value">${s.studyStatus || '-'}</span></div>
              </div>
              <div class="section-title">Antigüedad e Ingreso Institucional</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Ingreso Inst.</span><span class="value">${s.fechaIngreso ? new Date(s.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Antigüedad Reconocida Total</span><span class="value" style="color:#5b21b6; font-size:14px;">${antiguedad}</span></div>
              </div>
              <div class="section-title" style="margin-bottom: 15px;">Detalle de Cargos Activos</div>
              ${c1Html}
              ${c2Html}
              <div class="footer">Juntos a la Par - Legajo Docente generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</div>
          </div>`;
      });
      html += '</body></html>';

      const iframe = document.createElement('iframe'); 
      iframe.style.position = 'fixed'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
      document.body.appendChild(iframe); 
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close(); 
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

const imprimirPlanillaGeneral = (lista) => {
    if (!lista || lista.length === 0) return alert("No hay personal para imprimir.");
    
    const LOGO_APP = "https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png";

    let html = `<html><head><title>Planilla Personalizada</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
        @page { size: landscape; margin: 10mm; }
        body { font-family: 'Roboto', sans-serif; padding: 0; color: #1e293b; font-size: 9px; }
        .header-table { width: 100%; border-bottom: 2px solid #6d28d9; margin-bottom: 15px; }
        table.data-table { width: 100%; border-collapse: collapse; }
        .data-table th { background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; text-transform: uppercase; font-weight: 900; text-align: left; }
        .data-table td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
        tr:nth-child(even) { background-color: #f1f5f9; }
        .cargo-role { font-weight: 900; color: #4338ca; font-size: 8px; text-transform: uppercase; }
    </style></head><body>
    <table class="header-table"><tr>
        <td><img src="${LOGO_APP}" style="height:40px;"></td>
        <td style="text-align:center;"><h1 style="margin:0; font-size:18px; color:#6d28d9;">Planilla de Personal Institucional</h1></td>
        <td style="text-align:right; font-weight:bold;">Ciclo 2026</td>
    </tr></table>
    <table class="data-table">
        <thead><tr>
            <th>Apellido y Nombre</th>
            ${printColumns.dni ? '<th>DNI</th>' : ''}
            ${printColumns.cargo1 ? '<th>Cargo 1</th>' : ''}
            ${printColumns.cargo2 ? '<th>Cargo 2</th>' : ''}
            ${printColumns.alta ? '<th>Ingreso Inst.</th>' : ''}
            ${printColumns.domicilio ? '<th>Dirección</th>' : ''}
            ${printColumns.telefono ? '<th>Teléfono</th>' : ''}
            ${printColumns.titulo ? '<th>Título</th>' : ''}
        </tr></thead><tbody>`;
    
    lista.forEach(s => {
        html += `<tr>
            <td style="font-weight:700; text-transform:uppercase;">${s.lastName}, ${s.firstName}</td>
            ${printColumns.dni ? `<td>${s.dni || '-'}</td>` : ''}
            ${printColumns.cargo1 ? `<td><div class="cargo-role">${s.cargo1_role || s.role || ''}</div>${s.cargo1_name || ''}</td>` : ''}
            ${printColumns.cargo2 ? `<td><div class="cargo-role">${s.cargo2_role || ''}</div>${s.cargo2_name || ''}</td>` : ''}
            ${printColumns.alta ? `<td>${s.fechaIngreso ? new Date(s.fechaIngreso+'T12:00:00').toLocaleDateString('es-AR') : '-'}</td>` : ''}
            ${printColumns.domicilio ? `<td>${s.address || '-'}</td>` : ''}
            ${printColumns.telefono ? `<td>${s.phone || '-'}</td>` : ''}
            ${printColumns.titulo ? `<td>${s.degree || '-'}</td>` : ''}
        </tr>`;
    });

    html += `</tbody></table><p style="text-align:right; font-size:8px; margin-top:10px;">Generado el ${new Date().toLocaleString('es-AR')}</p></body></html>`;

    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
};
  const handleImportStaff = async (e) => {
      const file = e.target.files[0];
      if (!file || !confirm("⚠️ ¿Importar archivo CSV completo?")) return;
      setProcessing(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const rows = evt.target.result.split('\n').slice(1).filter(r => r.trim() !== '');
              const promises = rows.map(row => {
                  const cols = row.split(';');
                  let bDate = "";
                  if (cols[3]?.trim()) {
                      const parts = cols[3].trim().split('/');
                      if (parts.length === 3) bDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), {
                      lastName: cols[0]?.trim() || '', firstName: cols[1]?.trim() || '', dni: cols[2]?.trim() || '',
                      birthDate: bDate, address: cols[4]?.trim() || '', phone: cols[5]?.trim() || '',
                      emergencyContact: cols[6]?.trim() || '', email: cols[7]?.trim() || '',
                      studyStatus: cols[8]?.trim() || '', degree: cols[9]?.trim() || '',
                      modality: cols[11]?.trim() || 'Sede',
                      cargo1_role: cols[10]?.trim() || '', 
                      cargo1_subsidized: cols[12]?.trim() === 'SI' ? 'true' : 'false',
                      cargo1_en_papeles: 'false',
                      cargo1_name: cols[13]?.trim() || '', cargo1_type: cols[14]?.trim() || '', cargo1_turn: cols[15]?.trim() || '', cargo1_revista: cols[16]?.trim() || '',
                      cargo2_name: cols[17]?.trim() || '', cargo2_type: cols[18]?.trim() || '', cargo2_turn: cols[19]?.trim() || '', cargo2_revista: cols[20]?.trim() || '',
                      cargo2_en_papeles: 'false',
                      createdAt: serverTimestamp()
                  });
              });
              await Promise.all(promises);
              alert("✅ Personal importado correctamente.");
          } catch (err) { alert("Error: " + err.message); } finally { setProcessing(false); }
      };
      reader.readAsText(file);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = Object.fromEntries(fd.entries());
    
    // ESTA LÍNEA ES CLAVE: Guarda la foto nueva o mantiene la vieja
    d.photoUrl = photoPreview || editingStaff?.photoUrl || '';
    
    // Limpieza automática de Cargo 2 si está vacío
    if(!d.cargo2_name || d.cargo2_name.trim() === '') { 
        d.cargo2_role = ''; d.cargo2_turn = ''; d.cargo2_type = ''; 
        d.cargo2_revista = ''; d.cargo2_ingreso = ''; d.cargo2_name = ''; 
        d.cargo2_subsidized = 'false'; d.cargo2_en_papeles = 'false';
    }

    try {
        setProcessing(true);
        if (editingStaff?.id) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id), d);
            // Si tenías abierta la ficha, que se actualice solita
            if (viewingStaff?.id === editingStaff.id) setViewingStaff({ ...editingStaff, ...d });
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), { ...d, createdAt: serverTimestamp() });
        }
        setShowStaffForm(false); setEditingStaff(null); setPhotoPreview(null);
        alert("✅ Legajo actualizado con éxito");
    } catch (err) { 
        alert("Error: " + err.message); 
    } finally {
        setProcessing(false);
    }
  };
  const calculateStats = () => {
      const stats = {
          cargos: { simple: 0, doble: 0 },
      };

      filteredStaff.forEach(s => {
          const c1Role = getNormRole(s.cargo1_role || s.role);
          const c2Role = getNormRole(s.cargo2_role);
          const c1Turn = (s.cargo1_turn || '').toLowerCase();
          const c2Turn = (s.cargo2_turn || '').toLowerCase();
          
          const filterRoles = filters.roles || [];
          const filterTurn = filters.turn.toLowerCase();

          const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || c1Turn);
          const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || c2Turn);

          const c1IsUnassigned = !hasC1 || !VALID_ROLES.includes(c1Role);
          const c2IsUnassigned = hasC2 && !VALID_ROLES.includes(c2Role);

          let c1MatchesRole = filterRoles.length === 0 || (filterRoles.includes('sin-asignar') && c1IsUnassigned) || filterRoles.includes(c1Role);
          let c2MatchesRole = filterRoles.length === 0 || (filterRoles.includes('sin-asignar') && c2IsUnassigned) || filterRoles.includes(c2Role);

          const c1Matches = hasC1 && c1MatchesRole && (filterTurn === 'all' || c1Turn.includes(filterTurn));
          const c2Matches = hasC2 && c2MatchesRole && (filterTurn === 'all' || c2Turn.includes(filterTurn));

          const isC1Papeles = s.cargo1_en_papeles === 'true';
          const isC2Papeles = s.cargo2_en_papeles === 'true';

          let activeCargosCount = 0;
          if (c1Matches && !isC1Papeles && s.cargo1_name) activeCargosCount++;
          if (c2Matches && !isC2Papeles && s.cargo2_name) activeCargosCount++;

          if (activeCargosCount === 2) stats.cargos.doble++;
          else if (activeCargosCount === 1) stats.cargos.simple++;
      });
      return stats;
  };

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  const currentStats = calculateStats();
  const totalCargosReales = currentStats.cargos.simple + (currentStats.cargos.doble * 2);

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 md:px-4 pt-4">
        
        {/* ENCABEZADO CON CONTADOR EN VIVO (PERSONAS Y CARGOS) */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-violet-100 shadow-sm gap-4">
            <div className="flex items-center gap-4 flex-wrap">
                <h3 className="font-black text-violet-900 uppercase italic text-xl">Personal</h3>
                
                <div className="flex gap-2">
                    {/* CARTEL DE PERSONAS FÍSICAS */}
                    <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded-xl font-black text-[10px] md:text-xs flex items-center gap-1.5 border border-orange-200 shadow-sm uppercase tracking-widest" title="Cantidad de personas físicas">
                        <User size={14}/> {filteredStaff.length} {filteredStaff.length === 1 ? 'Persona' : 'Personas'}
                    </div>
                    
                    {/* CARTEL DE CARGOS TOTALES */}
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-xl font-black text-[10px] md:text-xs flex items-center gap-1.5 border border-emerald-200 shadow-sm uppercase tracking-widest" title="Cantidad total de cargos ejercidos">
                        {totalCargosReales} {totalCargosReales === 1 ? 'Cargo Activo' : 'Cargos Activos'}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
    onClick={() => setShowPrintOptions(true)} 
    className="bg-white text-blue-600 border border-blue-200 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition" 
    title="Configurar Planilla"
>
    <Grid size={20}/>
</button>
              <button onClick={() => imprimirFichasDocentes(filteredStaff)} className="bg-white text-violet-600 border border-violet-200 p-3 rounded-2xl shadow-sm hover:bg-violet-50 transition" title="Imprimir Fichas Individuales"><Printer size={20}/></button>
                
                <label className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl cursor-pointer hover:bg-emerald-200 transition flex items-center justify-center">
                    {processing ? <RefreshCw className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportStaff} />
                </label>

                <button onClick={()=>{setEditingStaff(null); setPhotoPreview(null); setShowStaffForm(true);}} className="bg-violet-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-center"><Plus size={20}/></button>
            </div>
        </div>

        {/* BARRA DE FILTROS ACTUALIZADA PARA MULTISELECCIÓN */}
        <div className="space-y-2">
            <div className="bg-white p-2 rounded-2xl border border-gray-100 flex items-center gap-2 shadow-sm">
                <Search size={18} className="ml-2 text-gray-300"/>
                <input value={staffFilterText} onChange={e=>setStaffFilterText(e.target.value)} placeholder="Buscar por apellido, nombre o DNI..." className="w-full p-2 outline-none text-sm font-bold text-gray-700 bg-transparent"/>
                {staffFilterText && <button onClick={()=>setStaffFilterText('')} className="pr-2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
                <select value={filters.modality} onChange={e=>setFilters({...filters, modality: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option>
                </select>
                
               {/* SELECTOR DE ROLES EN BARRA DE FILTROS */}
<select 
    value="default" 
    onChange={e => {
        const val = e.target.value;
        if (val !== 'default' && !filters.roles.includes(val)) {
            setFilters({...filters, roles: [...filters.roles, val]});
        }
    }} 
    className="bg-white text-violet-700 text-xs p-2 rounded-lg font-bold min-w-[140px] border border-violet-200 shadow-sm outline-none cursor-pointer"
>
    <option value="default">+ Agregar Rol...</option>
    <option value="sin-asignar">⚠️ Sin Asignar / Error</option>
    {/* CAMBIO AQUÍ: Usamos la constante de afuera */}
   {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
</select>

               <select value={filters.turn} onChange={e=>setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
    <option value="all">Turno: Todos</option>
    {/* Corregido: uniqueTurns cambiado por TURNS_LIST con blindaje */}
    {(typeof TURNS_LIST !== 'undefined' ? TURNS_LIST : []).map(t => (
        <option key={t} value={t}>{t}</option>
    ))}
</select>
                <select value={filters.subsidized} onChange={e=>setFilters({...filters, subsidized: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Subvención: Todas</option><option value="yes">Con Subvención</option><option value="no">Sin Subvención</option>
                </select>
                <button onClick={() => setFilters({ modality: 'all', roles: [], turn: 'all', subsidized: 'all' })} className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg font-bold min-w-[80px] border border-red-100 shadow-sm hover:bg-red-100 transition">Limpiar</button>
            </div>

            {/* MOSTRAR ETIQUETAS DE ROLES SELECCIONADOS */}
            {filters.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in mt-1 mb-2">
                    {filters.roles.map(r => (
                        <span key={r} className="bg-violet-100 text-violet-800 text-[10px] font-black px-2 py-1.5 rounded-lg flex items-center gap-1 border border-violet-200 shadow-sm">
                            {r === 'sin-asignar' ? '⚠️ Sin Asignar' : r}
                            <button onClick={() => setFilters({...filters, roles: filters.roles.filter(role => role !== r)})} className="hover:text-red-500 transition-colors bg-white rounded-full p-0.5 ml-1"><X size={10}/></button>
                        </span>
                    ))}
                </div>
            )}
        </div>

        {/* LISTADO DE PERSONAL */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pb-10 mt-2">
          {filteredStaff.map(s => {
    const tieneSub = s.cargo1_subsidized === 'true' || s.cargo2_subsidized === 'true' || s.isSubsidized === 'true';
    
    const c1Role = getNormRole(s.cargo1_role || s.role);
    const c2Role = getNormRole(s.cargo2_role);

    const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || (s.cargo1_turn && s.cargo1_turn.trim()));
    const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || (s.cargo2_turn && s.cargo2_turn.trim()));

    {/* CAMBIO AQUÍ: Usamos VALID_ROLES_OFFICIAL */}
    const c1NeedsFix = !hasC1 || !VALID_ROLES_OFFICIAL.includes(c1Role);
    const c2NeedsFix = hasC2 && !VALID_ROLES_OFFICIAL.includes(c2Role);
    const needsRoleFix = c1NeedsFix || c2NeedsFix;
                
                return (
                    <div key={s.id} onClick={() => setViewingStaff(s)} className="bg-white p-4 rounded-[25px] border border-gray-100 shadow-sm flex items-center gap-4 hover:border-violet-300 transition-all cursor-pointer group relative">
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center font-black text-violet-300 overflow-hidden border-2 border-violet-100 shrink-0 relative">
                            {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName?.[0]}
                            {tieneSub && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Subvencionada"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center flex-wrap">
                                <h4 className="font-bold text-gray-800 text-sm uppercase truncate">{s.lastName}, {s.firstName}</h4>
                                <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase ${s.modality === 'Inclusión' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{s.modality || 'Sede'}</span>
                                {needsRoleFix && <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-lg border border-red-200 animate-pulse">⚠️ ASIGNAR ROL</span>}
                            </div>
                            <div className="flex gap-2 text-[10px] mt-1 text-gray-500 font-bold">
                                {s.dni && <span>DNI: {s.dni}</span>}
                                <span className="text-violet-500">Anti: {calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef)}</span>
                            </div>
                            <p className="text-[10px] font-black text-violet-600 uppercase mt-1 truncate">
                                {hasC1 ? `C1: ${c1Role || 'S/D'} (${s.cargo1_turn || '-'}) ${s.cargo1_en_papeles === 'true' ? '📝' : ''}` : <span className="text-gray-400">NO TRABAJA (C1)</span>} 
                                {hasC2 ? ` | C2: ${c2Role || 'S/D'} (${s.cargo2_turn || '-'}) ${s.cargo2_en_papeles === 'true' ? '📝' : ''}` : <span className="text-gray-400"> | NO TRABAJA (C2)</span>}
                            </p>
                        </div>
                        <Eye className="text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
                    </div>
                )
            })}
        </div>

{/* MODAL LECTURA LEGAJO - VERSIÓN COMPLETA RECONSTRUIDA */}
{viewingStaff && !showStaffForm && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingStaff(null)}>
        <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
            
            {/* CABECERA */}
            <div className="bg-violet-800 p-6 text-white relative shrink-0">
                <button onClick={()=>setViewingStaff(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                <div className="flex gap-5 items-center">
                    <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden flex items-center justify-center shadow-lg">
                        {viewingStaff.photoUrl ? <img src={viewingStaff.photoUrl} className="w-full h-full object-cover"/> : <div className="text-4xl font-black text-white/50">{viewingStaff?.firstName?.[0] || '👤'}</div>}
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStaff?.lastName}, {viewingStaff?.firstName}</h2>
                        <p className="text-orange-300 font-bold text-xs uppercase tracking-widest">{viewingStaff?.modality || 'Sede'}</p>
                        <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold inline-block mt-2">DNI: {viewingStaff?.dni || '-'}</span>
                    </div>
                </div>
            </div>
            
            <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-4">
                {/* DATOS DE CONTACTO RÁPIDO */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nacimiento</p><p className="font-black text-slate-800 text-xs">{getSafeDate(viewingStaff.birthDate)}</p></div>
                    <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Celular</p><p className="font-black text-slate-800 text-xs">{viewingStaff.phone || '-'}</p></div>
                </div>

                {/* DETALLE COMPLETO DE CARGOS (RECONSTRUIDO) */}
                <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 shadow-sm space-y-3">
                    <div className="flex justify-between text-xs border-b border-violet-200 pb-2">
                        <span className="font-bold text-gray-500">Ingreso Inst: {getSafeDate(viewingStaff.fechaIngreso)}</span>
                        <span className="font-black text-violet-700">Antigüedad: {calcularAntiguedad(viewingStaff.antiguedadAnios, viewingStaff.antiguedadMeses, viewingStaff.antiguedadFechaRef)}</span>
                    </div>
                    
                    {/* CARGO 1 - TODA LA INFO ANTERIOR */}
                    {Boolean((viewingStaff.cargo1_name && viewingStaff.cargo1_name.trim()) || viewingStaff.cargo1_role || viewingStaff.role) ? (
                        <div className={`bg-white p-3 rounded-lg border ${viewingStaff.cargo1_en_papeles === 'true' ? 'border-gray-200 opacity-70' : 'border-violet-200 shadow-sm'} text-xs relative`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-black text-violet-900 uppercase">C1: {getNormRole(viewingStaff.cargo1_role || viewingStaff.role)} {viewingStaff.cargo1_en_papeles === 'true' && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[8px] ml-1">EN PAPELES</span>}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo1_subsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{viewingStaff.cargo1_subsidized === 'true' ? 'MECA' : 'DENO'}</span>
                            </div>
                            <p className="font-bold text-gray-700">{viewingStaff.cargo1_name}</p>
                            <p className="text-gray-500 text-[10px]">N° {viewingStaff.cargo1_numero || '-'} | {viewingStaff.cargo1_type || '-'} | {viewingStaff.cargo1_turn || '-'} | {viewingStaff.cargo1_revista || '-'}</p>
                            <p className="text-[9px] text-violet-400 mt-1 font-bold">Alta: {getSafeDate(viewingStaff.cargo1_ingreso)}</p>
                        </div>
                    ) : null}

                    {/* CARGO 2 - TODA LA INFO ANTERIOR */}
                    {Boolean((viewingStaff.cargo2_name && viewingStaff.cargo2_name.trim()) || viewingStaff.cargo2_role) ? (
                        <div className={`bg-white p-3 rounded-lg border ${viewingStaff.cargo2_en_papeles === 'true' ? 'border-gray-200 opacity-70' : 'border-violet-200 shadow-sm'} text-xs relative`}>
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-black text-violet-900 uppercase">C2: {getNormRole(viewingStaff.cargo2_role)} {viewingStaff.cargo2_en_papeles === 'true' && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded text-[8px] ml-1">EN PAPELES</span>}</span>
                                <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo2_subsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{viewingStaff.cargo2_subsidized === 'true' ? 'MECA' : 'DENO'}</span>
                            </div>
                            <p className="font-bold text-gray-700">{viewingStaff.cargo2_name}</p>
                            <p className="text-gray-500 text-[10px]">N° {viewingStaff.cargo2_numero || '-'} | {viewingStaff.cargo2_type || '-'} | {viewingStaff.cargo2_turn || '-'} | {viewingStaff.cargo2_revista || '-'}</p>
                            <p className="text-[9px] text-violet-400 mt-1 font-bold">Alta: {getSafeDate(viewingStaff.cargo2_ingreso)}</p>
                        </div>
                    ) : null}
                </div>

                {/* SECCIÓN INTELIGENTE: GRUPOS A CARGO (SOLO PARA DOCENTES/AUX/PREC/DAI) */}
                {['Docente', 'Auxiliar', 'Preceptora', 'DAI', 'Inclusión'].some(role => 
                    (viewingStaff.cargo1_role || viewingStaff.role || '').includes(role) || 
                    (viewingStaff.cargo2_role || '').includes(role)
                ) && (
                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                        <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">📍 Alumnos y Grupos Asignados</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {(() => {
                                const myGroupsTM = [...new Set(students.filter(s => s.teacherIdMorning === viewingStaff.id || s.teacherId2Morning === viewingStaff.id || s.daiId === viewingStaff.id).map(s => s.groupMorning))].filter(Boolean);
                                const myGroupsTT = [...new Set(students.filter(s => s.teacherIdAfternoon === viewingStaff.id || s.teacherId2Afternoon === viewingStaff.id || s.daiId === viewingStaff.id).map(s => s.groupAfternoon))].filter(Boolean);
                                return (
                                    <>
                                        <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase">T. Mañana</p>
                                            <p className="font-bold text-emerald-700 text-xs">{myGroupsTM.length > 0 ? myGroupsTM.join(', ') : 'Ninguno'}</p>
                                        </div>
                                        <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                                            <p className="text-[8px] font-black text-gray-400 uppercase">T. Tarde</p>
                                            <p className="font-bold text-emerald-700 text-xs">{myGroupsTT.length > 0 ? myGroupsTT.join(', ') : 'Ninguno'}</p>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                        <p className="text-[7px] text-emerald-400 mt-2 italic text-center">* Información vinculada por ID de seguridad</p>
                    </div>
                )}
            </div>
            
            <div className="p-4 border-t bg-white flex justify-end gap-2 shrink-0">
                <button onClick={()=>imprimirFichasDocentes([viewingStaff])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir</button>
                <button onClick={()=>{setEditingStaff(viewingStaff); setPhotoPreview(viewingStaff.photoUrl); setShowStaffForm(true);}} className="px-4 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-violet-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Legajo</button>
            </div>
        </div>
    </div>
)}
{/* MODAL EDICIÓN LEGAJO - VERSIÓN PREMIUM RESPONSIVA DEFINITIVA */}
    {showStaffForm && (
      <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-slate-50 rounded-[30px] w-full max-w-xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20">
          
          {/* CABECERA FIJA */}
          <div className="bg-violet-700 p-5 text-white flex justify-between items-center shrink-0">
            <div className="flex-1">
              <h3 className="text-lg font-black uppercase italic tracking-tighter">
                {editingStaff ? 'Editar Legajo' : 'Nuevo Personal'}
              </h3>
              {/* CARTEL DE ATENCIÓN DINÁMICO */}
              {editingStaff && (!editingStaff?.dni || !editingStaff?.cargo1_role || !editingStaff?.modality) ? (
                <div className="bg-amber-400 text-amber-900 text-[8px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse mt-1 uppercase">
                  ⚠️ Atención: Ficha incompleta. Completar datos para vinculación.
                </div>
              ) : (
                <p className="text-[10px] opacity-70 font-bold uppercase">Configuración de ficha técnica</p>
              )}
            </div>
            <button onClick={() => setShowStaffForm(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
              <X size={20} />
            </button>
          </div>

          <form id="staffForm" onSubmit={handleSaveStaff} className="overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar">
            
            {/* SECCIÓN VINCULACIÓN DE SEGURIDAD (IMPORTANTE) */}
          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
    <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
        {/* CAMBIO AQUÍ: de Link a LinkIcon */}
        <LinkIcon size={14}/> Conexión de Seguridad y Grupos
    </p>
    <input 
        name="userId" 
        defaultValue={editingStaff?.userId || ""} 
        placeholder="ID de Usuario vinculado para login y grupos..." 
        className="p-3 bg-white rounded-xl w-full font-mono text-[10px] outline-none border border-blue-200 focus:ring-2 ring-blue-100"
    />
    <p className="text-[7px] text-blue-400 font-bold italic uppercase px-1">
      * Este ID conecta el legajo con el usuario y detecta automáticamente sus grupos asignados.
    </p>
</div>

           {/* SECCIÓN 1: IDENTIDAD Y FOTO (ACTUALIZADA) */}
<div className="flex flex-col items-center mb-6">
    <div className="w-24 h-24 rounded-3xl bg-violet-100 border-4 border-white shadow-md overflow-hidden relative group">
        {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover"/> : (editingStaff?.photoUrl ? <img src={editingStaff.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-violet-300"><User size={40}/></div>)}
        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
            <Camera className="text-white" size={24}/>
            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
        </label>
    </div>
    <p className="text-[9px] font-black text-violet-400 uppercase mt-2">Tocar para cambiar foto</p>
</div>

<details open className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
    <span className="text-[11px] font-black text-violet-600 uppercase flex items-center gap-2"><User size={14}/> Datos de Identidad</span>
    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
  </summary>
  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
    <input name="lastName" defaultValue={editingStaff?.lastName || ""} placeholder="Apellido/s" required className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
    <input name="firstName" defaultValue={editingStaff?.firstName || ""} placeholder="Nombre/s" required className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
    <input name="dni" defaultValue={editingStaff?.dni || ""} placeholder="DNI sin puntos" className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
    <input name="birthDate" type="date" defaultValue={editingStaff?.birthDate || ""} className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm"/>
    <input name="phone" defaultValue={editingStaff?.phone || ""} placeholder="Celular" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
    <input name="email" defaultValue={editingStaff?.email || ""} placeholder="Email" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
  </div>
</details>

{/* SECCIÓN NUEVA: DOMICILIO Y FORMACIÓN */}
<details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-3">
  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
    <span className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-2"><MapPin size={14}/> Domicilio y Título</span>
    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
  </summary>
  <div className="p-4 pt-0 space-y-3">
    <input name="address" defaultValue={editingStaff?.address || ""} placeholder="Dirección completa" className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm"/>
    <input name="emergencyContact" defaultValue={editingStaff?.emergencyContact || ""} placeholder="Contacto Emergencia (Nombre y Tel)" className="p-3 bg-red-50 text-red-700 rounded-xl border-none w-full font-bold text-sm placeholder:text-red-300"/>
    <div className="grid grid-cols-2 gap-2">
        <input name="degree" defaultValue={editingStaff?.degree || ""} placeholder="Título Obtenido" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
        <select name="studyStatus" defaultValue={editingStaff?.studyStatus || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
            <option value="">Estado estudios...</option>
            <option value="Completo">Completo</option>
            <option value="Incompleto">Incompleto</option>
            <option value="En curso">En curso</option>
        </select>
    </div>
  </div>
</details>
            {/* SECCIÓN 2: CARGO PRIMARIO (CON SUBVENCIÓN) */}
            <details open className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition border-l-4 border-emerald-500">
                <span className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-2">
                  <Briefcase size={14}/> Cargo Principal
                </span>
                <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select name="modality" defaultValue={editingStaff?.modality || 'Sede'} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                    <option value="Sede">Modalidad: Sede</option>
                    <option value="Inclusión">Modalidad: Inclusión</option>
                    <option value="Ambos">Modalidad: Ambos</option>
                  </select>
                  <select name="cargo1_subsidized" defaultValue={editingStaff?.cargo1_subsidized || 'false'} className={`p-3 rounded-xl border-none font-black text-xs ${editingStaff?.cargo1_subsidized === 'true' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                    <option value="false">DENO (Sin Subvención)</option>
                    <option value="true">MECA (Subvencionado)</option>
                  </select>
                </div>
                <div className="grid grid-cols-[1fr,2fr] gap-2">
                  <input name="cargo1_numero" defaultValue={editingStaff?.cargo1_numero || ""} placeholder="N° Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                  <input name="cargo1_name" defaultValue={editingStaff?.cargo1_name || ""} placeholder="Nombre del Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
  <div className="flex flex-col">
    <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Función / Rol</label>
    <select 
      name="cargo1_role" 
      defaultValue={editingStaff?.cargo1_role || editingStaff?.role || ""} 
      className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs"
      required
    >
      <option value="">Seleccionar Rol...</option>
      {/* CORRECCIÓN: Ahora usa VALID_ROLES_OFFICIAL */}
      {(typeof VALID_ROLES_OFFICIAL !== 'undefined' ? VALID_ROLES_OFFICIAL : []).map(r => (
        <option key={r} value={r}>{r}</option>
      ))}
    </select>
  </div>
  <div className="flex flex-col">
    <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Turno Horario</label>
    <select name="cargo1_turn" defaultValue={editingStaff?.cargo1_turn || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
      <option value="">Turno...</option>
      <option value="Mañana">Mañana</option>
      <option value="Tarde">Tarde</option>
      <option value="Alternado">Alternado</option>
      <option value="Vespertino">Vespertino</option>
      <option value="Doble">Doble</option>
    </select>
  </div>
</div>
                <div className="grid grid-cols-2 gap-2">
                   <select name="cargo1_revista" defaultValue={editingStaff?.cargo1_revista || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                    <option value="">Revista...</option>
                    <option value="Titular">Titular</option><option value="Provisional">Provisional</option><option value="Suplente">Suplente</option>
                  </select>
                  <div className="flex flex-col">
                    <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Alta Cargo</label>
                    <input name="cargo1_ingreso" type="date" defaultValue={editingStaff?.cargo1_ingreso || ""} className="p-2 bg-slate-50 rounded-xl border-none font-bold text-xs"/>
                  </div>
                </div>
              </div>
            </details>

            {/* SECCIÓN 3: CARGO SECUNDARIO */}
            {/* SECCIÓN 3: CARGO SECUNDARIO (CORREGIDA CON REVISTA Y ALTA) */}
            <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-3">
              <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                  <PlusCircle size={14}/> Cargo Secundario / Adicional
                </span>
                <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <input name="cargo2_numero" defaultValue={editingStaff?.cargo2_numero || ""} placeholder="N° Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm w-full"/>
                  <input name="cargo2_name" defaultValue={editingStaff?.cargo2_name || ""} placeholder="Nombre Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm w-full"/>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select name="cargo2_role" defaultValue={editingStaff?.cargo2_role || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs w-full">
                    <option value="">Rol Cargo 2...</option>
                    {VALID_ROLES.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  <select name="cargo2_subsidized" defaultValue={editingStaff?.cargo2_subsidized || 'false'} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs w-full">
                    <option value="false">DENO (Sin Subvención)</option>
                    <option value="true">MECA (Subvencionado)</option>
                  </select>
                </div>
                {/* --- NUEVOS CAMPOS AGREGADOS AQUÍ --- */}
                <div className="grid grid-cols-2 gap-2">
                   <select name="cargo2_revista" defaultValue={editingStaff?.cargo2_revista || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                    <option value="">Revista...</option>
                    <option value="Titular">Titular</option>
                    <option value="Provisional">Provisional</option>
                    <option value="Suplente">Suplente</option>
                  </select>
                  <div className="flex flex-col">
                    <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Alta Cargo 2</label>
                    <input name="cargo2_ingreso" type="date" defaultValue={editingStaff?.cargo2_ingreso || ""} className="p-2 bg-slate-50 rounded-xl border-none font-bold text-xs"/>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-2">
                   <input type="checkbox" name="cargo2_en_papeles" defaultChecked={editingStaff?.cargo2_en_papeles === 'true'} value="true" className="w-4 h-4 accent-violet-600"/>
                   <span className="text-[10px] font-bold text-gray-500 uppercase">¿Este cargo figura solo en papeles?</span>
                </div>
              </div>
            </details>

            {/* SECCIÓN 4: INSTITUCIONAL Y ANTIGÜEDAD */}
            <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                <span className="text-[11px] font-black text-violet-500 uppercase flex items-center gap-2">
                  <Clock size={14}/> Ingreso y Antigüedad
                </span>
                <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Ingreso Institución</label>
                  <input name="fechaIngreso" type="date" defaultValue={editingStaff?.fechaIngreso || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Años Anti.</label>
                    <input name="antiguedadAnios" type="number" defaultValue={editingStaff?.antiguedadAnios || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm text-center"/>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Meses Anti.</label>
                    <input name="antiguedadMeses" type="number" defaultValue={editingStaff?.antiguedadMeses || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm text-center"/>
                  </div>
                </div>
                <input name="antiguedadFechaRef" type="hidden" defaultValue={editingStaff?.antiguedadFechaRef || new Date().toISOString().split('T')[0]} />
              </div>
            </details>

            <div className="h-4"></div>
          </form>
{/* BOTONERA FIJA INFERIOR CORREGIDA */}
          <div className="p-4 bg-white border-t space-y-3 shrink-0">
            <div className="flex flex-col sm:flex-row gap-2">
              <button type="button" onClick={() => setShowStaffForm(false)} className="order-2 sm:order-1 flex-1 py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                Cancelar
              </button>
              <button 
                type="submit" 
                form="staffForm" 
                disabled={processing}
                className="order-1 sm:order-2 flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-violet-200 hover:bg-violet-700 transition active:scale-95 flex justify-center items-center gap-2"
              >
                {processing ? <RefreshCw className="animate-spin" size={16}/> : 'Guardar Cambios'}
              </button>
            </div>
            
            {editingStaff && (
              <button 
                type="button" 
                onClick={async () => {
                  if(confirm("¿Eliminar definitivamente?")) {
                    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id)); 
                    setShowStaffForm(false); 
                    setViewingStaff(null);
                  }
                }} 
                className="w-full py-2 text-red-400 font-bold text-[9px] uppercase hover:text-red-500 transition tracking-tighter"
              >
                Eliminar Personal del Sistema
              </button>
            )}
          </div>
        </div> 
      </div>
    )}

    {/* PARCHE PUNTO 3: MODAL DE OPCIONES DE IMPRESIÓN (FUERA DEL FORM) */}
    {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4 text-center">¿Qué info imprimir?</h3>
                <div className="grid grid-cols-1 gap-2 mb-6">
                    {Object.keys(printColumns).map(col => (
                        <label key={col} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-violet-50 transition border border-transparent hover:border-violet-200">
                            <span className="text-[10px] font-black text-gray-600 uppercase">
                                {col === 'alta' ? 'Fecha Ingreso' : col.replace('cargo', 'Cargo ')}
                            </span>
                            <input 
                                type="checkbox" 
                                checked={printColumns[col]} 
                                onChange={() => setPrintColumns({...printColumns, [col]: !printColumns[col]})}
                                className="w-5 h-5 accent-violet-600"
                            />
                        </label>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowPrintOptions(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
                    <button 
                        onClick={() => { imprimirPlanillaGeneral(filteredStaff); setShowPrintOptions(false); }} 
                        className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-violet-700 transition"
                    >
                        Generar Planilla
                    </button>
                </div>
            </div>
        </div>
    )}

  </div> // Fin del contenedor principal PersonalView
  ); 
} // Fin de la función
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
      
      const updatedEvos = [...(selectedStudent.medicalEvolutions || []), newEvo];
      
      try {
          setSaving(true);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { medicalEvolutions: updatedEvos });
          setSelectedStudent({ ...selectedStudent, medicalEvolutions: updatedEvos });
          setShowEvoForm(false);
      } catch (err) { alert("Error al guardar evolución: " + err.message); }
      finally { setSaving(false); }
  };

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
// PEGAR ESTO AL FINAL DEL ARCHIVO (FUERA DE CUALQUIER OTRA FUNCIÓN)
// ===============================================================

// 1. Botón del Menú Inferior (Indispensable para que se vea el menú)
function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'text-orange-500 transform -translate-y-1' : 'text-gray-400 hover:text-violet-600'}`}>
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

// 2. Icono auxiliar para "Mi Aula"
const StartIcon = ({size}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>;



















































































































































































