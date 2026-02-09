import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder, MessageSquare, Globe, BookOpen, Lightbulb, Printer 
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion, arrayRemove } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

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

// --- PANTALLA LOGIN (CON INSTRUCCIONES DE INSTALACIÓN MEJORADAS) ---
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
    // En iOS forzamos el cartel si no está instalada
    if (iosCheck && !isStandalone) {
       const timer = setTimeout(() => setShowInstall(true), 2000);
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

    // Backdoor admin para emergencias (Opcional, podés quitarlo en prod)
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
      
      {/* CARTEL DE INSTALACIÓN (MEJORADO) */}
      {!isStandalone && showInstall && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
             <div className="bg-white rounded-[35px] shadow-2xl p-6 w-full max-w-sm text-center mb-4 md:mb-0 border-t-8 border-violet-500">
                 <div className="flex justify-between items-start mb-4">
                    <div className="bg-violet-100 p-3 rounded-2xl">
                        <Smartphone className="text-violet-600" size={32} />
                    </div>
                    <button onClick={() => setShowInstall(false)} className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-gray-200"><X size={20}/></button>
                 </div>
                 
                 <h3 className="text-xl font-black text-gray-800 mb-2 leading-tight">¡Llevanos en tu celular! 📲</h3>
                 <p className="text-gray-500 mb-6 text-xs font-medium px-4">Instalá la App para entrar más rápido y recibir notificaciones importantes.</p>
                 
                 <div className="flex flex-col gap-3">
                     {!esIos ? (
                         <button onClick={handleInstalarClick} className="w-full bg-violet-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl hover:bg-violet-700 transition flex items-center justify-center gap-2 animate-pulse">
                             <Download size={20}/> INSTALAR AHORA
                         </button>
                     ) : (
                         <div className="text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-3">
                             <p className="font-bold text-violet-600 text-center uppercase tracking-wider mb-2">Cómo instalar en iPhone:</p>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm"><Share size={16} className="text-blue-500"/></div>
                                 <span>1. Toca el botón <b>Compartir</b> (abajo al medio).</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm"><PlusSquare size={16} className="text-gray-500"/></div>
                                 <span>2. Deslizá hacia arriba y elegí <b>"Agregar a Inicio"</b>.</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm"><span className="font-bold text-blue-500 text-[10px]">Add</span></div>
                                 <span>3. Dale a <b>Agregar</b> (arriba a la derecha).</span>
                             </div>
                         </div>
                     )}
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

// --- VISTA DASHBOARD (CORREGIDA: CARTELERA VISIBLE PARA EL AUTOR) ---
function DashboardView({ user, tasks, events, announcements, setActiveTab }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [birthdays, setBirthdays] = useState([]);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);

  const canPost = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  
  const INCLUSION_ROLES = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];
  const SEDE_ROLES = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'];
  const isInclusionStaff = INCLUSION_ROLES.includes(user.role);
  const isSedeStaff = SEDE_ROLES.includes(user.role);

  useEffect(() => {
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.done - b.done)));
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); let noGroupCounter = 0;
        const upcoming = snap.docs.map(d => {
            const data = d.data();
            if (!data.groupMorning && !data.groupAfternoon && !data.daiMorning && !data.daiAfternoon) noGroupCounter++;
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate + 'T00:00:00');
            const currentYearBirth = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (currentYearBirth < today.setHours(0,0,0,0)) currentYearBirth.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: currentYearBirth };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setBirthdays(upcoming); setUngroupedCount(noGroupCounter);
    });
    return () => { unsubNotes(); unsubStudents(); };
  }, [user.id]);

  const handlePost = async (e) => { 
      e.preventDefault(); 
      const text = e.target.message.value; 
      const channel = e.target.channel?.value || 'general'; 
      if(!text.trim()) return;
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { 
              message: text, author: user.fullName || user.firstName, authorId: user.id, role: user.role, channel: channel, createdAt: serverTimestamp() 
          }); 
          setShowAnnounceModal(false); 
      } catch(e) { alert("Error al publicar: " + e.message); }
  };

  const deleteAnnouncement = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id)); };
  const saveNote = async (e) => { e.preventDefault(); if (!newNote.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); setNewNote(''); };
  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));

  const visibleAnnouncements = announcements.filter(a => {
      if (isSuperAdmin) return true;
      if (a.authorId === user.id) return true; // EL AUTOR SIEMPRE VE SU AVISO
      if (!a.channel || a.channel === 'general') return true;
      if (a.channel === 'inclusion' && isInclusionStaff) return true;
      if (a.channel === 'sede' && isSedeStaff) return true;
      return false;
  });

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div><div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div></div>
      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm animate-pulse"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase tracking-widest">Atención Administrativa</h4><p className="text-xs text-red-600 font-bold">Hay {ungroupedCount} estudiantes activos sin grupo asignado.</p></div></div></div>)}
      {birthdays.length > 0 && (<button onClick={() => setShowBirthdayModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-95 transition"><div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><Crown size={20} className="text-white"/></div><div className="text-left"><h3 className="font-bold text-sm uppercase tracking-widest">¡Hay Cumpleaños!</h3><p className="text-xs opacity-90">{birthdays.length} festejos esta semana</p></div></div><ChevronRight size={20}/></button>)}
      
      {visibleAnnouncements.length > 0 && (
          <div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative">
              <h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1 mb-3"><Bell size={12}/> Cartelera Oficial</h3>
              <div className="space-y-3">
                  {visibleAnnouncements.map(a => (
                      <div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start">
                          <div>
                              {a.channel === 'inclusion' && <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-indigo-200">Canal Inclusión</span>}
                              {a.channel === 'sede' && <span className="bg-orange-100 text-orange-700 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-orange-200">Canal Sede</span>}
                              {(a.channel === 'general' || !a.channel) && <span className="bg-gray-100 text-gray-500 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-gray-200">General</span>}
                              <p className="italic font-medium">"{a.message}"</p>
                              <p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase tracking-wider">- {a.author}</p>
                          </div>
                          {(canPost || a.authorId === user.id) && (<button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>)}
                      </div>
                  ))}
              </div>
          </div>
      )}
      
      <div className="grid grid-cols-2 gap-3"><div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition"><h4 className="text-3xl font-black text-orange-500">{tasks.filter(t=>t.status!=='completed').length}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div><div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>{todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase tracking-widest font-bold">Es Hoy</p></> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}</div></div>
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner"><h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3><form onSubmit={saveNote} className="flex gap-2 mb-3"><input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" /><button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button></form><div className="space-y-2">{notes.map(n => (<div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group"><button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={12} className="text-white"/>}</button><span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span><button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button></div>))}</div></div>
      {showAnnounceModal && (<div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"><form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-lg font-black text-orange-500 mb-2 uppercase italic">Nuevo Aviso</h3><textarea name="message" className="w-full p-4 bg-orange-50 rounded-2xl outline-none text-sm h-32 resize-none border border-orange-100 focus:ring-2 ring-orange-200 text-gray-700" placeholder="Escribe aquí..." required></textarea><div className="mt-3"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">¿Quién puede ver esto?</label><select name="channel" className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200 outline-none focus:border-orange-300"><option value="general">🌍 Toda la Escuela</option><option value="sede">🏫 Solo Sede</option><option value="inclusion">💙 Solo Inclusión</option></select></div><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition">Publicar</button></div></form></div>)}
      {showTutorial && (<div className="fixed inset-0 bg-violet-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl max-h-[80vh] overflow-y-auto relative"><button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button><div className="text-center mb-6"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Guía Rápida</h2></div><div className="space-y-6"><p className="text-sm text-gray-600">1. Gestiona alumnos en "Legajos".<br/>2. Carga eventos en "Agenda".<br/>3. Usa "Tareas" para pedidos internos.</p></div><button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-8 shadow-lg uppercase text-xs tracking-widest">¡Entendido!</button></div></div>)}
      {showBirthdayModal && (<div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowBirthdayModal(false)}><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-pink-500" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black text-pink-500 uppercase italic">Cumpleaños</h3><button onClick={() => setShowBirthdayModal(false)}><X size={24}/></button></div><div className="space-y-3 max-h-[60vh] overflow-y-auto">{birthdays.map(b => (<div key={b.id} className="flex items-center gap-4 bg-pink-50 p-3 rounded-2xl border border-pink-100"><div className="w-12 h-12 rounded-full bg-white border-2 border-pink-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-pink-400">{b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : b.firstName[0]}</div><div><h4 className="font-bold text-gray-800">{b.firstName} {b.lastName}</h4><p className="text-xs text-pink-600 font-bold">{[b.groupMorning, b.groupAfternoon].filter(Boolean).join(' / ') || 'Sin Grupo'}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(b.nextBirthday).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>))}</div></div></div>)}
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

// --- VISTA TAREAS (CORREGIDA: PRIVACIDAD ESTRICTA) ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUserObj, setSelectedUserObj] = useState(null); 
  const [checklist, setChecklist] = useState([]); 
  const [newItem, setNewItem] = useState(""); 
  const [userSearch, setUserSearch] = useState("");
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState(null); 
  const [filter, setFilter] = useState('pending'); 

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor', 'DAI', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin'; 
  const canManage = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setUsersList(users);
        if (editingTask && editingTask.targetUserId) {
            const found = users.find(u => u.id === editingTask.targetUserId);
            if (found) setSelectedUserObj(found);
        }
    });
    return () => unsub();
  }, [editingTask]);

  const handleSaveTask = async (e) => {
    e.preventDefault(); 
    const fd = new FormData(e.target);
    let finalTargetId = null; let finalAssignedName = "Todos"; let finalRoles = [];

    if (assignType === 'user') {
        if (!selectedUserObj) return alert("⚠️ Error: Selecciona un usuario.");
        finalTargetId = selectedUserObj.id; finalAssignedName = selectedUserObj.fullName;
    } else {
        if (selectedRoles.length === 0) return alert("⚠️ Error: Elige roles.");
        finalRoles = selectedRoles; finalAssignedName = selectedRoles.join(", ");
    }

    const taskData = { 
        title: fd.get('title'), dueDate: fd.get('dueDate') || null, showDate: fd.get('showDate') || new Date().toISOString().split('T')[0], 
        priority: fd.get('priority'), targetType: assignType, targetUserId: finalTargetId, targetRoles: finalRoles, 
        assignedToName: finalAssignedName, checklist: checklist 
    };

    try {
        if (editingTask) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData); } 
        else { 
             const newTaskRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { ...taskData, createdByName: user.fullName || user.firstName, createdById: user.id, status: 'pending', createdAt: serverTimestamp(), comments: [] });
             const today = new Date().toISOString().split('T')[0];
             if (!taskData.showDate || taskData.showDate <= today) {
                 const notifData = { title: `Tarea Nueva`, message: `${user.firstName}: "${fd.get('title')}"`, read: false, createdAt: serverTimestamp(), targetTab: 'tasks', relatedId: newTaskRef.id, type: 'task_assigned' };
                 if (assignType === 'user' && finalTargetId) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: finalTargetId });
                 else if (assignType === 'roles') {
                    const targets = usersList.filter(u => u.role && finalRoles.some(r => r.toLowerCase() === u.role.toLowerCase()));
                    const promises = targets.map(t => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: t.id }));
                    await Promise.all(promises);
                 }
             }
        }
        setShowModal(false);
    } catch (err) { alert("Error: " + err.message); }
  };

  const filteredTasks = tasks.filter(t => {
      const todayStr = new Date().toISOString().split('T')[0];
      const showDate = t.showDate || '2000-01-01'; 
      if (filter === 'completed' && t.status !== 'completed') return false;
      if (filter === 'scheduled' && (t.status === 'completed' || showDate <= todayStr)) return false;
      if (filter === 'pending' && (t.status === 'completed' || showDate > todayStr)) return false;
      
      // LÓGICA DE PRIVACIDAD ESTRICTA
      if (isSuperAdmin) return true; // Solo SuperAdmin ve todo
      if (t.createdById === user.id) return true; // Si la creé yo, la veo
      if (t.targetType === 'user' && t.targetUserId === user.id) return true; // Si es para mí, la veo
      if (t.targetType === 'roles' && t.targetRoles && user.role && t.targetRoles.some(r => r.toLowerCase() === user.role.toLowerCase())) return true; // Si es para mi rol, la veo
      
      return false; // Si no, oculta.
  });

  const addComment = async (task) => { if (!newComment.trim()) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: arrayUnion({ text: newComment, author: user.firstName, date: new Date().toISOString() }) }); setNewComment(""); };
  const handleDelete = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  const changeStatus = async (task, newStatus) => { if (newStatus === 'completed' && !confirm("¿Lista?")) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus }); };
  const openNew = () => { setEditingTask(null); setAssignType('user'); setSelectedRoles([]); setChecklist([]); setNewItem(""); setUserSearch(""); setSelectedUserObj(null); setShowModal(true); };
  const openEdit = (t) => { setEditingTask(t); setAssignType(t.targetType || 'user'); setSelectedRoles(t.targetRoles || []); setChecklist(t.checklist || []); setShowModal(true); };
  const searchResults = userSearch.length > 0 ? (usersList || []).filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase())) : [];
  const getPriorityStyle = (p) => { if (p === 'alta') return 'border-l-4 border-l-red-500 bg-red-50/50'; if (p === 'media') return 'border-l-4 border-l-orange-400 bg-orange-50/50'; return 'border-l-4 border-l-green-400 bg-green-50/50'; };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-20">
      <div className="flex justify-between items-center mb-2 bg-white p-4 sticky top-0 z-10 shadow-sm rounded-b-3xl">
          <div><h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas</h2><p className="text-xs text-gray-400 font-bold">{filteredTasks.length} visibles</p></div>
          <div className="flex gap-2">
             <div className="flex bg-gray-100 rounded-xl p-1"><button onClick={()=>setFilter('pending')} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='pending'?'bg-white shadow text-slate-800':'text-gray-400'}`}>Activas</button><button onClick={()=>setFilter('completed')} className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='completed'?'bg-white shadow text-green-600':'text-gray-400'}`}>Listas</button></div>
             <button onClick={openNew} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:scale-110 transition-all"><Plus size={20}/></button>
          </div>
      </div>
      <div className="grid gap-3 px-2">
          {filteredTasks.length === 0 ? ( <div className="text-center py-10 opacity-40"><CheckCircle size={40} className="mx-auto mb-2 text-gray-400"/><p className="font-bold text-gray-500">Sin tareas.</p></div> ) : filteredTasks.map(t => (
            <div key={t.id} className={`p-5 rounded-[30px] shadow-sm flex flex-col gap-3 transition-all relative ${getPriorityStyle(t.priority)}`}>
                <div className="flex justify-between items-start"><div className="flex-1 pr-6"><p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName}</p><h3 className={`font-bold text-gray-800 text-sm uppercase italic tracking-tighter leading-none ${t.status==='completed'?'line-through opacity-50':''}`}>{t.title}</h3><p className="text-[9px] text-gray-400 mt-1 italic">De: {t.createdByName}</p></div><div className="flex flex-col items-end gap-2"><div className="flex gap-1">{(t.createdById === user.id || isSuperAdmin) && <button onClick={() => handleDelete(t.id)} className="text-red-300 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14}/></button>}</div></div></div>
                {openCommentsId === t.id && ( <div className="bg-white/60 p-3 rounded-xl border border-gray-100 mt-2 animate-in fade-in"><div className="max-h-32 overflow-y-auto space-y-2 mb-2">{(t.comments || []).map((c, idx) => ( <p key={idx} className="text-xs text-gray-600 border-b border-gray-100 pb-1"><span className="font-bold text-violet-700 uppercase text-[9px]">{c.author}:</span> {c.text}</p> ))}</div><div className="flex gap-2"><input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe..." className="flex-1 text-xs p-2 rounded-lg border-none outline-none bg-white shadow-inner" /><button onClick={() => addComment(t)} className="bg-violet-600 text-white p-2 rounded-lg"><Send size={12}/></button></div></div> )}
                <div className="pt-2 border-t border-black/5 flex justify-between items-center"><button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl transition ${t.comments?.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}><MessageSquare size={14}/> {t.comments?.length > 0 ? `${t.comments.length} Msjs` : 'Comentar'}</button><div className="flex bg-white/60 rounded-lg p-0.5 shadow-sm"><button onClick={() => changeStatus(t, 'pending')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'pending' ? 'bg-white shadow text-gray-700' : 'text-gray-400'}`}>Pend.</button><button onClick={() => changeStatus(t, 'completed')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'completed' ? 'bg-green-100 text-green-700 shadow' : 'text-gray-400'}`}>Lista</button></div></div>
            </div>
          ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleSaveTask} className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
            <input name="title" defaultValue={editingTask?.title} placeholder="Título de la tarea" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl"><button type="button" onClick={() => setAssignType('user')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'user' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Persona</button><button type="button" onClick={() => setAssignType('roles')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button></div>
            {assignType === 'user' ? ( <div className="space-y-2">{selectedUserObj ? ( <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-200 rounded-xl"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-xs">{selectedUserObj.firstName[0]}</div><span className="text-xs font-bold text-violet-900">{selectedUserObj.fullName}</span></div><button type="button" onClick={() => setSelectedUserObj(null)} className="text-red-400 p-1"><X size={16}/></button></div> ) : ( <div className="relative"><input placeholder="🔍 Escribí para buscar..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} autoComplete="off" className="w-full p-3 bg-gray-50 border-b-2 border-gray-200 text-sm outline-none focus:border-violet-500 rounded-t-xl" />{userSearch.length > 0 && (<div className="max-h-40 overflow-y-auto border-x border-b border-gray-200 rounded-b-xl bg-white shadow-xl absolute w-full z-50">{searchResults.length > 0 ? searchResults.map(u => (<div key={u.id} onClick={() => { setSelectedUserObj(u); setUserSearch(""); }} className="p-3 hover:bg-violet-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"><div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">{u.firstName[0]}</div><p className="text-xs font-bold text-gray-700">{u.fullName}</p></div>)) : <p className="p-3 text-xs text-gray-400 italic text-center">No encontrado</p>}</div>)}</div> )}</div> ) : ( <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">{ROLES_OPTIONS.map(role => ( <label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => { if(e.target.checked) setSelectedRoles([...selectedRoles, role]); else setSelectedRoles(selectedRoles.filter(r => r !== role)); }} className="accent-violet-600"/> {role}</label> ))}</div> )}
            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Vencimiento</label><input name="dueDate" type="date" defaultValue={editingTask?.dueDate} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs text-gray-600 border border-gray-200" /></div><select name="priority" defaultValue={editingTask?.priority} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs uppercase text-orange-600 italic border border-gray-200 h-[66px] mt-auto"><option value="baja">🟢 Baja</option><option value="media">🟠 Media</option><option value="alta">🔴 Alta</option></select></div>
            <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">GUARDAR</button></div>
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

// --- VISTA CALENDARIO (TEXTO AJUSTADO: GRANDE EN PC, COMPACTO EN MÓVIL) ---
function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState('TODOS'); 
  
  // --- ESTADOS PARA CARGA RÁPIDA ---
  const [showQuickLoad, setShowQuickLoad] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [processing, setProcessing] = useState(false);
  
  // --- DEFINICIÓN DE TIPOS Y COLORES (NUEVA PALETA VIBRANTE) ---
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
      const eventsOnDay = events.filter(e => e.date === dateStr);
      if (eventsOnDay.length > 0 || canEdit) setSelectedDayEvents({ date: dateStr, events: eventsOnDay });
  };

  const deleteEvent = async (id) => {
      if(confirm("¿Eliminar este evento?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
          if(selectedDayEvents) {
              const updated = selectedDayEvents.events.filter(e => e.id !== id);
              if (updated.length === 0 && !canEdit) setSelectedDayEvents(null);
              else setSelectedDayEvents({ ...selectedDayEvents, events: updated });
          }
      }
  };

  const handleSaveEvent = async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const data = { title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description'), author: user.firstName };
      
      if (editingEvent) {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id), data);
      } else {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false); setEditingEvent(null);
  };

  const handleQuickSave = async () => {
      if (!quickText.trim()) return;
      setProcessing(true);
      try {
          const lines = quickText.split('\n').filter(line => line.trim() !== '');
          const validTypes = Object.keys(EVENT_TYPES); 

          const promises = lines.map(line => {
              const match = line.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s+(.+)$/);
              if (match) {
                  let [_, day, month, year, rawText] = match;
                  if (year.length === 2) year = "20" + year;
                  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  
                  let finalType = 'GENERAL';
                  let finalTitle = rawText.trim();

                  for (const type of validTypes) {
                      if (finalTitle.toUpperCase().includes(type)) {
                          finalType = type;
                          finalTitle = finalTitle.replace(new RegExp(`\\(?\\b${type}\\b\\)?`, 'i'), '').trim();
                          finalTitle = finalTitle.replace(/^[:\-\s]+|[:\-\s]+$/g, '');
                          break; 
                      }
                  }
                  
                  if (!finalTitle) finalTitle = rawText.replace(new RegExp(`\\(?\\b${finalType}\\b\\)?`, 'i'), '').trim() || finalType;

                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), {
                      title: finalTitle,
                      date: isoDate,
                      type: finalType, 
                      description: 'Carga masiva',
                      author: user.firstName,
                      createdAt: serverTimestamp()
                  });
              }
              return null; 
          });

          const results = await Promise.all(promises);
          const added = results.filter(r => r !== null).length;
          alert(`✅ Se agregaron ${added} eventos.`);
          setShowQuickLoad(false); setQuickText("");
      } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };
  
  const openNew = () => { setEditingEvent(null); setShowModal(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setShowModal(true); };

  const renderGrid = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const days = []; const firstDay = new Date(year, month, 1).getDay();
    
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100"></div>);
    
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      
      const dayEvents = events.filter(e => {
          if (e.date !== dateStr) return false;
          if (filterType !== 'TODOS' && e.type !== filterType) return false;
          return true;
      });

      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      
      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr)} className={`relative border-b border-r border-gray-100 p-1 transition flex flex-col group cursor-pointer ${isToday ? 'bg-violet-50' : 'bg-white hover:bg-gray-50'}`}>
          <div className="flex justify-center">
             {/* NÚMERO DE DÍA: AJUSTADO PARA PC (md:text-sm, md:w-7, md:h-7) */}
             <span className={`text-[10px] md:text-sm w-5 h-5 md:w-7 md:h-7 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500'}`}>{d}</span>
          </div>
          <div className="flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar flex-1">
            {dayEvents.map((ev, idx) => {
                const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color;
                return (
                    // EVENTO: AJUSTADO PARA PC (text-[9px] md:text-xs)
                    <div key={idx} className={`text-[9px] md:text-xs rounded-[3px] px-1 py-0.5 truncate font-bold uppercase border-l-2 shadow-sm ${style}`}>
                        {ev.title}
                    </div>
                );
            })}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in select-none relative">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex gap-2 items-center">
             <h2 className="text-xl md:text-2xl font-black text-violet-900 uppercase italic tracking-tighter">{currentDate.toLocaleDateString('es-ES', { month: 'long' })} <span className="text-gray-400 text-sm md:text-lg not-italic font-medium">{currentDate.getFullYear()}</span></h2>
        </div>
        <div className="flex gap-2">
             <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => changeMonth(-1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs md:text-sm font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">HOY</button>
                <button onClick={() => changeMonth(1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronRight size={16}/></button>
             </div>
             
             {canEdit && (
                 <div className="flex gap-1">
                     <button onClick={() => setShowQuickLoad(!showQuickLoad)} className={`p-2 rounded-lg shadow transition ${showQuickLoad ? 'bg-yellow-400 text-white' : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'}`} title="Carga Rápida">
                         <span className="font-bold text-lg leading-none">⚡</span>
                     </button>
                     <button onClick={openNew} className="bg-orange-500 text-white p-2 rounded-lg shadow hover:bg-orange-600 transition"><Plus size={20}/></button>
                 </div>
             )}
        </div>
      </div>

      {/* BARRA DE FILTROS (TEXTO MÁS GRANDE EN PC) */}
      <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50 border-b border-gray-200 no-scrollbar">
          <button onClick={() => setFilterType('TODOS')} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === 'TODOS' ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>Todos</button>
          {Object.keys(EVENT_TYPES).map(type => (
              <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === type ? `${EVENT_TYPES[type].color} ring-1 ring-offset-1` : 'bg-white text-gray-400 border-gray-200'}`}>
                  {EVENT_TYPES[type].label}
              </button>
          ))}
      </div>
      
      {/* PANEL DE CARGA RÁPIDA */}
      {showQuickLoad && (
          <div className="bg-yellow-50 p-4 border-b border-yellow-200 animate-in slide-in-from-top-5">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-yellow-800 text-xs uppercase flex items-center gap-2">⚡ Carga Masiva Inteligente</h3>
                  <button onClick={() => setShowQuickLoad(false)}><X size={16} className="text-yellow-600"/></button>
              </div>
              <p className="text-[10px] text-yellow-700 mb-2 leading-relaxed">
                  Pega tu lista abajo. Para asignar color, escribe la palabra clave (ej: FERIADO, ACTO, REUNIONES) junto al título.<br/>
                  Ej: <b>10/02/2026 Carnaval (FERIADO)</b>
              </p>
              <textarea value={quickText} onChange={(e) => setQuickText(e.target.value)} className="w-full h-32 p-3 rounded-xl border border-yellow-300 text-xs font-medium focus:ring-2 focus:ring-yellow-400 outline-none bg-white" placeholder="12/03/2026 Inicio de clases (CALENDARIO ACADÉMICO)&#10;25/05/2026 Revolución de Mayo (ACTO)"/>
              <button onClick={handleQuickSave} disabled={processing} className="mt-2 w-full bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 rounded-xl text-xs uppercase shadow transition flex justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={14}/> : 'Procesar y Guardar'}</button>
          </div>
      )}
      
      {/* HEADER DÍAS (TEXTO AJUSTADO) */}
      <div className="grid grid-cols-7 bg-white border-b border-gray-200 shrink-0">
         {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="py-2 text-center text-[9px] md:text-xs font-black text-gray-300 uppercase tracking-widest">{d}</div>)}
      </div>

      {/* GRILLA CALENDARIO */}
      <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd} className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto bg-gray-50/30">
        {renderGrid()}
      </div>
      
      {/* MODAL NUEVO/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600">
            <h3 className="text-lg font-black text-violet-900 uppercase italic">{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-violet-300" />
            <div className="grid grid-cols-2 gap-3">
                <input name="date" type="date" defaultValue={editingEvent?.date || selectedDayEvents?.date} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border" />
                <select name="type" defaultValue={editingEvent?.type || 'GENERAL'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border uppercase">
                    {Object.keys(EVENT_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <textarea name="description" defaultValue={editingEvent?.description} placeholder="Detalles..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-20 resize-none" />
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALLE DEL DÍA */}
      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDayEvents(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-black text-violet-900 uppercase italic">
                    {new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                <button onClick={() => setSelectedDayEvents(null)} className="p-1 bg-gray-100 rounded-full"><X size={18} className="text-gray-500"/></button>
            </div>
            
            {canEdit && <button onClick={()=>{ setEditingEvent({ date: selectedDayEvents.date }); setShowModal(true); }} className="w-full py-3 mb-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold text-xs hover:border-violet-400 hover:text-violet-600 transition flex items-center justify-center gap-2"><Plus size={14}/> Agregar Evento Aquí</button>}

            <div className="space-y-3">
                {selectedDayEvents.events.length === 0 ? <p className="text-center text-gray-400 text-xs py-4">No hay eventos para este día.</p> : 
                selectedDayEvents.events.map(ev => {
                    const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color;
                    return (
                    <div key={ev.id} className={`p-4 rounded-2xl border relative group ${style}`}>
                        <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-white/50 border border-white/20">{ev.type}</span>
                        <h3 className="font-bold mt-2 text-sm">{ev.title}</h3>
                        <p className="text-xs opacity-80 mt-1 italic">{ev.description}</p>
                        <p className="text-[9px] opacity-50 mt-2 text-right uppercase font-bold">Por: {ev.author || 'Sistema'}</p>
                        {canEdit && (
                            <div className="absolute top-3 right-3 flex gap-1">
                                <button onClick={() => openEdit(ev)} className="p-1.5 bg-white/50 hover:bg-white rounded-lg shadow-sm"><Edit3 size={12}/></button>
                                <button onClick={() => deleteEvent(ev.id)} className="p-1.5 bg-white/50 hover:bg-white text-red-600 rounded-lg shadow-sm"><Trash2 size={12}/></button>
                            </div>
                        )}
                    </div>
                )})}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
// --- VISTA PERFIL (CON MANTENIMIENTO Y AUDITORÍA ARREGLADA) ---
function ProfileView({ user, tasks, onLogout, isSuperAdmin }) {
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);
  const [showAdminUsers, setShowAdminUsers] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const [maintenance, setMaintenance] = useState(false);

  // Cargar estado de mantenimiento
  useEffect(() => {
      const unsub = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'system_config'), (d) => {
          if (d.exists()) setMaintenance(d.data().maintenance);
      });
      return () => unsub();
  }, []);

  const toggleMaintenance = async () => {
      const nuevoEstado = !maintenance;
      if(!confirm(`¿${nuevoEstado ? 'ACTIVAR' : 'DESACTIVAR'} el Modo Mantenimiento?\n\nEsto bloqueará la app para todos los usuarios excepto Super Admin.`)) return;
      const { setDoc, doc: d } = await import('firebase/firestore');
      await setDoc(d(db, 'artifacts', appId, 'public', 'data', 'system_config'), { maintenance: nuevoEstado }, { merge: true });
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
// --- VISTA ADMINISTRACIÓN DE USUARIOS (CORREGIDA: ROLES NUEVOS DISPONIBLES) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
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

  const deleteUser = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); };
  const openEdit = (u) => { setEditingUser(u); setShowModal(true); };
  
  const analizarConflictos = () => alert("Función Detective en mantenimiento.");
  const handleBulkImport = () => alert("Importación masiva en mantenimiento.");

  const filteredUsers = users.filter(u => (u.fullName||'').toLowerCase().includes(searchTerm.toLowerCase()));

  const formatLastLogin = (timestamp) => {
      if (!timestamp) return 'Nunca';
      const date = new Date(timestamp.seconds * 1000);
      return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  return (
   <div className="flex flex-col h-full bg-slate-900/50 p-4 rounded-3xl overflow-hidden">
    <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex justify-between items-center">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest">{users.length} Usuarios</h3>
            <div className="flex gap-2">
               <button onClick={()=>setShowImport(true)} className="p-2 bg-emerald-500 text-white rounded-xl shadow"><UploadCloud size={16}/></button>
               <button onClick={()=>{setEditingUser(null); setShowModal(true);}} className="p-2 bg-orange-500 text-white rounded-xl shadow"><Plus size={16}/></button>
            </div>
        </div>
        <div className="bg-black/40 p-2 rounded-xl flex items-center gap-2 border border-white/10">
            <Search className="text-white/50 ml-2" size={16} />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="bg-transparent border-none outline-none text-white text-xs w-full placeholder-white/30" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
             <button onClick={analizarConflictos} className="whitespace-nowrap px-3 py-1.5 bg-violet-600/50 border border-violet-400 text-white rounded-lg text-[10px] font-bold uppercase flex-shrink-0">🕵️ Detective</button>
             <button onClick={()=>setShowRenamer(true)} className="whitespace-nowrap px-3 py-1.5 bg-blue-600/50 border border-blue-400 text-white rounded-lg text-[10px] font-bold uppercase flex-shrink-0">🔄 Reemplazar</button>
        </div>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pb-10">
      {filteredUsers.map(u => (
      <div key={u.id} className="bg-white p-3 rounded-xl flex items-center justify-between group">
       <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black text-xs shrink-0 relative">
            {u.firstName?.[0]}
            {u.lastLogin && new Date(u.lastLogin.seconds * 1000).toDateString() === new Date().toDateString() && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>}
        </div>
        <div className="min-w-0">
            <p className="font-bold text-xs text-gray-800 truncate">{u.fullName}</p>
            <div className="flex flex-wrap gap-2 items-center">
                <p className="text-[9px] text-gray-400 truncate bg-gray-100 px-1 rounded">{u.role}</p>
                <p className="text-[8px] text-gray-400 flex items-center gap-1"><Clock size={8}/> {formatLastLogin(u.lastLogin)}</p>
            </div>
        </div>
       </div>
       <div className="flex gap-2 shrink-0">
           <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={14}/></button>
           {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>}
       </div>
      </div>
      ))}
    </div>

    {showModal && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
       <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <h3 className="font-bold text-violet-900">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
        <div className="grid grid-cols-2 gap-2"><input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-2 bg-gray-50 rounded-lg text-xs border" required/><input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-2 bg-gray-50 rounded-lg text-xs border" required/></div>
        <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-2 bg-gray-50 rounded-lg text-xs border" required/>
        <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-2 bg-gray-50 rounded-lg text-xs border" required/>
        
        <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-2 bg-gray-50 rounded-lg text-xs border">
            {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
        </select>

        <div className="flex items-center gap-2"><input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} /><span className="text-xs">¿Es Admin?</span></div>
        <div className="flex gap-2"><button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-2 text-gray-500 text-xs font-bold">Cancelar</button><button type="submit" className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold">Guardar</button></div>
       </form>
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
// --- VISTA MATRÍCULA (CORREGIDA: DATOS RECUPERADOS + ESTABILIDAD) ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info');
  
  const [filterText, setFilterText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formModalidad, setFormModalidad] = useState('Sede');
  const [filters, setFilters] = useState({ modality: 'all', level: 'all', group: 'all', turn: 'all', teacher: 'all', dx: 'all', gender: 'all', journey: 'all', os: 'all' });
  const [statFilters, setStatFilters] = useState({ modality: [], level: [], gender: 'all', dx: 'all' });

  // Bitácora
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);
  const [photoPreview, setPhotoPreview] = useState(null);
  
  // Dummy states
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showDupes, setShowDupes] = useState(false);
  const [potentialDupes, setPotentialDupes] = useState([]);
  const [uploading, setUploading] = useState(false);

  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const LOGO_URL = "/icon-192.png"; 

  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { uS(); uU(); };
  }, []);

  const staffSede = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico'].includes(u.role));
  const staffInclusion = (usersList||[]).filter(u => ['DAI', 'Equipo Técnico Inclusión', 'Inclusión'].includes(u.role));
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const staffAll = usersList || [];

  const filteredStudents = students.filter(s => {
    const isStudentActive = s.isActive === undefined || s.isActive === true;
    if (showArchived && isStudentActive) return false; 
    if (!showArchived && !isStudentActive) return false;

    const txt = filterText.toLowerCase();
    if (txt && !((s.firstName||'').toLowerCase().includes(txt) || (s.lastName||'').toLowerCase().includes(txt) || (s.dni||'').toString().includes(txt))) return false;

    if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
    if (filters.level !== 'all' && s.level !== filters.level) return false;
    if (filters.group !== 'all' && (s.groupMorning !== filters.group && s.groupAfternoon !== filters.group)) return false;
    if (filters.teacher !== 'all') { const search = filters.teacher.toLowerCase(); const tM = (s.teacherMorning || s.daiMorning || '').toLowerCase(); const tT = (s.teacherAfternoon || s.daiAfternoon || '').toLowerCase(); if (!tM.includes(search) && !tT.includes(search)) return false; }
    if (filters.dx !== 'all' && s.dx !== filters.dx) return false;
    if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
    if (filters.journey !== 'all' && s.journey !== filters.journey) return false;
    
    return true;
  });

  const getSeverityColor = (severity) => {
      if(severity === 'positive') return 'bg-emerald-50 border-emerald-200';
      if(severity === 'high') return 'bg-red-50 border-red-200';
      if(severity === 'medium') return 'bg-orange-50 border-orange-200';
      return 'bg-gray-50 border-gray-100'; 
  };

  const getSafeDate = (d) => { if(!d) return ''; try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const getAlertStatus = (inc) => { if(!inc || !inc.length) return {status:'ok', count:0}; const d = new Date(); d.setDate(d.getDate()-15); const r = inc.filter(x => (x.severity==='high'||x.severity==='medium') && new Date(x.date)>=d); return { status: r.length>=5?'danger':r.length>=3?'warning':'ok', count: r.length }; };
  
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setFormModalidad('Sede'); setShowForm(true); };
  const openEdit = (s) => { setEditingStudent(s); setPhotoPreview(s.photoUrl); setFormModalidad(s.modality || 'Sede'); setShowForm(true); };
  
  const handleSave = async (e) => { 
      e.preventDefault(); const fd = new FormData(e.target); const d = Object.fromEntries(fd.entries()); d.isActive = d.isActive === 'true'; d.photoUrl = photoPreview || editingStudent?.photoUrl || ''; d.modality = formModalidad;
      try { if (editingStudent) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), d); } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...d, isActive: true, createdAt: serverTimestamp(), incidents: [] }); } setShowForm(false); setEditingStudent(null); setPhotoPreview(null); } catch (err) { alert("Error: " + err.message); } 
  };
  const handleDelete = async (id) => { if(confirm("¿Eliminar definitivamente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setShowForm(false); setEditingStudent(null); } };
  const deleteIncident = async (sid, inc) => { if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); };
  const markAsInactive = async (s) => { if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); setUnassignedList(p=>p.filter(x=>x.id!==s.id)); };
  
  // --- NUEVA FUNCIÓN: AGREGAR INCIDENTE/NOTA ---
  const addIncident = async (type, text = "") => {
      if (!viewingStudent) return;
      const newInc = { date: new Date().toISOString(), type: text ? "Nota" : type, severity: type, text: text || type, author: user.firstName };
      try {
          const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', viewingStudent.id);
          await updateDoc(studentRef, { incidents: arrayUnion(newInc) });
          setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents || []), newInc]}));
          setNewNote(""); setIsWriting(false);
      } catch (e) { alert("Error: " + e.message); }
  };

  const abrirLegajoDigital = (student) => {
      if (student.driveLink) { window.open(student.driveLink, '_blank'); return; }
      const clean = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, "");
      const query = `name contains '${clean(student.lastName).split(' ')[0]}' and name contains '${clean(student.firstName).split(' ')[0]}' and trashed = false`;
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`, '_blank');
  };

  const imprimirListado = (list) => { const w = window.open('', '_blank'); if(!w) return alert("Permitir Pop-ups"); let h = `<html><head><title>Ficha</title></head><body><h1>${list[0].lastName}, ${list[0].firstName}</h1></body></html>`; w.document.write(h); w.document.close(); setTimeout(()=>w.print(), 500); };
  const imprimirFichasMasivas = () => { if (filteredStudents.length > 50 && !confirm(`¿Imprimir ${filteredStudents.length} fichas? Es mucho.`)) return; imprimirListado(filteredStudents); };
  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Modalidad"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`, `"${s.modality||'Sede'}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const checkUnassigned = () => { const found = students.filter(s => (s.isActive === undefined || s.isActive === true) && !s.groupMorning && !s.groupAfternoon && !s.daiMorning && !s.daiAfternoon); setUnassignedList(found); setShowDataManagement(false); setShowUnassigned(true); };
  
  // STATS HELPERS
  const statsResults = students.filter(s => { if (s.isActive === false) return false; if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false; if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false; if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false; if (statFilters.gender !== 'all' && s.gender !== statFilters.gender) return false; return true; });
  const toggleStatFilter = (category, value) => { setStatFilters(prev => { const currentList = prev[category]; if (currentList.includes(value)) return { ...prev, [category]: currentList.filter(item => item !== value) }; else return { ...prev, [category]: [...currentList, value] }; }); };
  const findDuplicates = () => alert("Función en mantenimiento.");
  const descargarBackup = () => { if(!confirm("¿Descargar Backup?")) return; const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "BACKUP_MATRICULA.json"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleBulkImport = () => alert("Importación en mantenimiento.");
  const handleDeleteAll = () => alert("Función protegida.");
  const handleAutoAssignGenders = () => alert("En mantenimiento.");
  const handleResetCycle = () => alert("Protegido.");

  return (
    <div className="animate-in fade-in pb-20">
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived?'bg-gray-600':'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
         <div className="flex justify-between items-center gap-4 mb-4">
             <div><h2 className="text-3xl font-bold flex gap-2 items-center"><GraduationCap/> {showArchived?'Archivo':'Legajos 2026'}</h2><p className="opacity-80 text-sm mt-1">{filteredStudents.length} alumnos encontrados</p></div>
             <div className="flex gap-2">
                 <button onClick={()=>setShowArchived(!showArchived)} className="px-3 py-2 border border-white/30 rounded-xl text-xs font-bold uppercase hover:bg-white/10 flex items-center gap-1">{showArchived? 'Ver Activos' : 'Ver Bajas'}</button>
                 {isSuperAdmin && <button onClick={()=>setShowDataManagement(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Gestión"><UploadCloud size={18}/></button>}
                 {isSuperAdmin && <button onClick={()=>setShowStats(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Estadísticas"><PieChart size={18}/></button>}
                 <button onClick={imprimirFichasMasivas} className="px-3 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase shadow hover:bg-blue-50 flex gap-2 items-center"><FileText size={14}/> Imprimir</button>
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
                </div>
            </div>
         )}
      </div>
      
      <div className="space-y-3">{filteredStudents.map(s => { 
          const alert = getAlertStatus(s.incidents); 
          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition ${!s.isActive?'border-red-400 opacity-60':alert.status==='danger'?'border-red-500 border-l-4':'border-gray-100'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative">
                        {s.photoUrl?<img src={s.photoUrl} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                        {alert.status!=='ok' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white"></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName}</h4>
                            {s.modality === 'Inclusión' && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-200 uppercase">INCLUSIÓN</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{calculateAge(s.birthDate)} años</span>
                            <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">{s.groupMorning || s.groupAfternoon || 'Sin grupo'}</span>
                        </div>
                    </div>
                </div>
                <Eye className="text-gray-300"/>
            </div> 
          ); 
      })}</div>
      
      {/* MODAL FICHA COMPLETA (RECUPERADO) */}
      {viewingStudent && !showForm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><div className="bg-slate-700 p-6 text-white"><div className="flex justify-between items-start"><div className="flex gap-4"><div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={30} className="m-auto mt-4 text-white/50"/>}</div><div><h2 className="text-xl font-bold uppercase">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><div className="flex gap-2 mt-1"><span className="bg-white/20 px-2 py-0.5 rounded text-xs">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-2 py-0.5 rounded text-xs">{viewingStudent.dni}</span></div></div></div><button onClick={()=>setViewingStudent(null)} className="bg-white/20 p-1 rounded-full hover:bg-white/40"><X/></button></div><div className="flex gap-2 mt-6 bg-slate-800/50 p-1 rounded-xl"><button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white'}`}>Datos Personales</button><button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white'}`}>Bitácora</button></div></div>
      
      <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative">
        {activeModalTab==='info' ? (
          <div className="space-y-4 text-sm">
            <button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1"><User size={12}/> Familia y Contacto</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><p className="font-bold text-xs">{viewingStudent.motherName || '-'}</p><p className="text-xs text-blue-600 font-bold">{viewingStudent.motherContact || '-'}</p></div>
                    <div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><p className="font-bold text-xs">{viewingStudent.fatherName || '-'}</p><p className="text-xs text-blue-600 font-bold">{viewingStudent.fatherContact || '-'}</p></div>
                </div>
                <div className="pt-2 border-t border-gray-100">
                    <span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span>
                    <p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-3">
                <h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1"><Activity size={12}/> Salud y Obra Social</h4>
                <div className="grid grid-cols-2 gap-4">
                    <div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><p className="font-bold text-xs">{viewingStudent.healthInsurance || '-'}</p></div>
                    <div><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><p className="font-bold text-xs text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</p></div>
                </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-20">
            {!isWriting && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                    <button onClick={() => addIncident('positive')} className="bg-green-100 border border-green-200 p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-green-200 transition text-green-700 font-bold text-xs gap-1 shadow-sm"><span>🌟</span><span>BIEN</span></button>
                    <button onClick={() => addIncident('medium')} className="bg-orange-100 border border-orange-200 p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-orange-200 transition text-orange-700 font-bold text-xs gap-1 shadow-sm"><span>⚠️</span><span>ATENCIÓN</span></button>
                    <button onClick={() => addIncident('high')} className="bg-red-100 border border-red-200 p-3 rounded-2xl flex flex-col items-center justify-center hover:bg-red-200 transition text-red-700 font-bold text-xs gap-1 shadow-sm"><span>🛑</span><span>GRAVE</span></button>
                </div>
            )}
            <div className="space-y-3">{viewingStudent.incidents?.length > 0 ? viewingStudent.incidents.slice().reverse().map((inc,i)=>(<div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-200"><div className="flex justify-between border-b border-gray-200/50 pb-1 mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase">{new Date(inc.date).toLocaleDateString()}</span><button onClick={()=>deleteIncident(viewingStudent.id, inc)}><Trash2 size={12} className="text-gray-400 hover:text-red-500"/></button></div><p className="font-bold text-sm text-slate-800">{inc.text || inc.type}</p><p className="text-xs text-gray-500 mt-1 uppercase font-bold pl-7">Por: {inc.author}</p></div>)) : <div className="text-center py-6 text-gray-400 text-xs font-bold uppercase">Sin registros</div>}</div>
            <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                {isWriting ? (
                    <div className="animate-in slide-in-from-bottom">
                        <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500"/>
                        <div className="flex gap-2"><button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Cancelar</button><button onClick={() => addIncident('medium', newNote)} disabled={!newNote.trim()} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar Nota</button></div>
                    </div>
                ) : (
                    <button onClick={() => setIsWriting(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition"><Edit3 size={18}/> Redactar Observación</button>
                )}
            </div>
          </div>
        )}
      </div>
      <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2"><button onClick={()=>openEdit(viewingStudent)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar</button></div></div></div>)}

      {/* FORMULARIO DE EDICIÓN */}
      {showForm && (<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-4">{editingStudent?'Editar':'Nuevo'} Legajo</h3><form onSubmit={handleSave} className="space-y-4">
        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl"><button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button><button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button></div>
        <div className="grid grid-cols-2 gap-3"><input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/></div>
        <div className="grid grid-cols-2 gap-3"><input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500"/></div>
        {formModalidad === 'Sede' ? (<div className="grid grid-cols-2 gap-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs"/><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs"/></div>) : (<div className="grid grid-cols-2 gap-2"><select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs"><option value="">DAI T. Mañana...</option>{staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs"><option value="">DAI T. Tarde...</option>{staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>)}
        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs" placeholder="Dirección"/>
        <div className="grid grid-cols-2 gap-2"><input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs"/><input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs"/></div>
        <div className="grid grid-cols-2 gap-2"><input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs"/><input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="w-full p-2 rounded-lg border text-xs"/></div>
        <div className="grid grid-cols-2 gap-2"><input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs"/><input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500"/></div>
        <div className="flex gap-2 pt-4 border-t"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20}/></button>}</div></form></div></div>)}
      {showUnassigned && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]"><div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col"><div className="flex justify-between mb-4"><h3 className="font-bold text-red-600">Alumnos Sin Grupo ({unassignedList.length})</h3><button onClick={()=>setShowUnassigned(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{unassignedList.map(s=>(<div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl"><span className="font-bold">{s.lastName}, {s.firstName}</span><div className="flex gap-2"><button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button><button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button></div></div>))}</div></div></div>)}
      
      {/* MODAL ESTADÍSTICAS */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
                <div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3><p className="text-xs text-gray-500">Filtrado Acumulativo</p></div><button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button></div>
                <div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner"><span className="text-5xl font-black text-violet-600 block mb-2">{statsResults.length}</span><span className="text-xs font-bold text-violet-400 uppercase tracking-[4px]">Coincidencias</span></div>
                <div className="space-y-4">
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Niveles (Selección Múltiple)</p><div className="flex flex-wrap gap-2">{['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (<button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>))}</div></div>
                    <div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Modalidad</p><div className="flex flex-wrap gap-2">{['Sede', 'Inclusión'].map(mod => (<button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>))}</div></div>
                    <div className="grid grid-cols-2 gap-2"><select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select><select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select></div>
                </div>
                <button onClick={() => setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all' })} className="w-full py-3 text-red-400 font-bold text-xs hover:bg-red-50 rounded-xl transition mt-4">Limpiar Filtros</button>
            </div>
        </div>
      )}

      {/* MODAL GESTIÓN */}
      {showDataManagement && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]"><div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl"><div className="flex justify-between mb-4"><h3 className="font-bold text-xl text-gray-800">Gestión de Datos</h3><button onClick={()=>setShowDataManagement(false)}><X/></button></div><div className="grid grid-cols-2 gap-3 mb-6"><button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200">🔍 Buscar Duplicados</button><button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200">⚠️ Ver Sin Grupo</button></div><div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mb-6 opacity-70 hover:opacity-100 transition"><h4 className="font-bold text-gray-600 text-sm mb-2">Zona Peligrosa</h4><div className="flex gap-2"><button onClick={handleResetCycle} disabled={processing} className="flex-1 bg-white border border-gray-300 text-gray-500 font-bold py-2 rounded-lg text-xs hover:bg-gray-200">Reiniciar Ciclo</button><button onClick={handleDeleteAll} disabled={processing} className="flex-1 bg-white border border-gray-300 text-red-500 font-bold py-2 rounded-lg text-xs hover:bg-red-50">Borrar TODO</button></div></div><h4 className="font-bold text-gray-800 text-sm mb-2">Importar / Exportar</h4><div className="flex gap-2 mb-2"><button onClick={descargarBackup} className="flex-1 py-2 bg-white border rounded-lg text-xs font-bold">Descargar JSON</button><button onClick={handleBulkImport} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Importar JSON</button></div><textarea value={importJson} onChange={e=>setImportJson(e.target.value)} placeholder="Pegar JSON aquí..." className="w-full p-2 text-xs border rounded-lg h-20"/><div className="flex gap-3 mt-4"><button onClick={handleAutoAssignGenders} disabled={processing} className="flex-1 py-3 text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 rounded-xl text-xs">Auto-Género</button></div></div></div>)}
    </div>
  );
}
// --- APP PRINCIPAL (CON CARTEL DE MANTENIMIENTO) ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Datos
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  
  // Estados de Interfaz
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);
  const [showNotifRequest, setShowNotifRequest] = useState(false);
  
  // ESTADO MANTENIMIENTO
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const prevNotifCount = useRef(0);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';
  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users'].includes(activeTab);

  useEffect(() => {
    if (user?.id) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { lastLogin: serverTimestamp() }).catch(()=>{});

    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubResources = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc')), (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    // LISTENER MANTENIMIENTO
    const unsubMaint = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'system_config'), (doc) => {
        setMaintenanceMode(doc.exists() ? doc.data().maintenance : false);
    });
    
    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => { 
        const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        d.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); 
        const unread = d.filter(n=>!n.read);
        setNotifications(unread);

        if (unread.length > prevNotifCount.current) {
            const latest = unread[0];
            if (latest) {
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`🔔 ${latest.title}`, { body: latest.message, icon: LOGO_URL });
                }
                try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
            }
        }
        prevNotifCount.current = unread.length;
    });

    if ("Notification" in window && Notification.permission === 'default') {
        setTimeout(() => setShowNotifRequest(true), 3000);
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
             const { getMessaging, getToken } = await import("firebase/messaging");
             const messaging = getMessaging();
             const token = await getToken(messaging, { vapidKey: 'BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw' });
             if(token) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { fcmTokens: arrayUnion(token) });
          } catch(e) {}
          alert("✅ ¡Genial! Te avisaremos de las novedades.");
      }
      setShowNotifRequest(false);
  };

  // PANTALLA DE MANTENIMIENTO (BLOQUEO)
  if (maintenanceMode && user.rol !== 'super-admin') {
      return (
          <div className="flex flex-col h-screen w-full bg-violet-900 items-center justify-center p-6 text-center text-white animate-in fade-in duration-1000">
              <div className="bg-white/10 p-6 rounded-full mb-6 animate-bounce"><Settings size={64} className="text-orange-400"/></div>
              <h1 className="text-3xl font-black uppercase italic mb-2">¡Estamos en Obra! 🚧</h1>
              <p className="text-lg font-medium opacity-80 max-w-xs mx-auto mb-8">Estamos ajustando unas tuercas en la App. Volvemos en unos minutos.</p>
              <div className="bg-orange-500 text-white px-6 py-2 rounded-full font-bold text-sm transform rotate-[-2deg] shadow-lg">"No rompo, mejoro" - El Desarrollador</div>
              <button onClick={() => window.location.reload()} className="mt-10 text-white/50 text-xs hover:text-white flex items-center gap-2"><RefreshCw size={12}/> Probar si ya volvió</button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 font-sans text-slate-800 overflow-hidden">
      <style>{` *::-webkit-scrollbar { display: none; } * { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0">
        <div className="flex items-center space-x-3"><img src={LOGO_URL} alt="Logo" className="w-10 h-8 object-contain" /><div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button>
          <div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}><Bell size={20} />{notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}</button>{showNotifPanel && (<div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]"><div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div><div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-10 text-center text-gray-400"><p className="text-xs font-bold uppercase">Sin novedades</p></div>:notifications.map(n=>(<div key={n.id} onClick={()=>handleNotificationClick(n)} className="p-4 border-b hover:bg-gray-50 cursor-pointer"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}</div></div>)}</div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">{user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}</div>
        </div>
      </header>

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
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0">
        <div className="grid grid-cols-5 md:grid-cols-7 h-full max-w-5xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          <div className="hidden md:block"><NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" /></div>
          <div className="relative -top-5 flex justify-center"><button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}><Grid size={24} /></button><span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span></div>
          <div className="block md:hidden"><NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={20} />} label="Legajos" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={20} />} label="Recursos" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={20} />} label="P.I." /></div>
          <div className="relative block md:hidden"><NavButton active={['matricula', 'resources', 'proyecto'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
            {showMoreMenu && (<div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-48 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-50"><button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><GraduationCap size={18} className="text-violet-500"/> Legajos</button><button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><LinkIcon size={18} className="text-green-500"/> Recursos</button><button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><PieChart size={18} className="text-orange-500"/> Proyecto Inst.</button></div>)}
          </div>
        </div>
      </nav>
      {showSearch && ( <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in"><div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div><input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/><div className="flex-1 overflow-y-auto space-y-2">{searchResults.map(s => (<div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div><div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div></div>))}{searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}</div></div> )}
      {globalViewingStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95"><div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div><div className="p-6"><div className="flex gap-4 items-center mb-4"><div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div><div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div></div><button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a la sección Legajos. Buscalo ahí para editar."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button></div></div></div>)}
      
      {showNotifRequest && (<div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"><div className="bg-white rounded-[30px] p-6 w-full max-w-sm shadow-2xl text-center border-t-8 border-orange-500"><div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><Bell size={32} className="text-orange-500"/></div><h3 className="text-xl font-black text-gray-800 mb-2">¡No te pierdas nada!</h3><p className="text-sm text-gray-500 mb-6">Activa las notificaciones para saber cuando tienes una tarea nueva o un aviso urgente.</p><div className="flex flex-col gap-3"><button onClick={enableNotifications} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-violet-700 transition">ACTIVAR AHORA</button><button onClick={() => setShowNotifRequest(false)} className="text-gray-400 text-xs font-bold uppercase hover:text-gray-600">Ahora no</button></div></div></div>)}
    </div>
  );
}

// --- VISTA AULA (FINAL: FILTROS VISUALES SEDE/INCLUSIÓN) ---
function GroupsView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [savingIncident, setSavingIncident] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  const [editingGroup, setEditingGroup] = useState(null);
  const [groupStats, setGroupStats] = useState(null); 
  const [updatingGroup, setUpdatingGroup] = useState(false);

  // NUEVO: Filtro visual para directivos (Para no ver todo mezclado)
  const [viewFilter, setViewFilter] = useState('all'); // 'all', 'sede', 'inclusion'

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const isStrategic = ['super-admin', 'admin', 'Equipo Directivo', 'Equipo Técnico', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
  
  // REFERENCIA PARA SCROLL
  const scrollContainerRef = useRef(null);
  const scroll = (direction) => {
      if (scrollContainerRef.current) {
          const scrollAmount = 350;
          scrollContainerRef.current.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
      }
  };

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

  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales', 'DAI', 'Inclusión'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico' || u.role === 'Equipo Técnico Inclusión');

  const groupedData = students.reduce((acc, s) => {
      let groupKey = "";
      let myTeacher = "";
      
      // AGRUPACIÓN INTELIGENTE
      if (s.modality === 'Inclusión') {
          const daiName = turn === 'morning' ? s.daiMorning : s.daiAfternoon;
          if (!daiName) return acc; 
          groupKey = `DAI: ${daiName}`;
          myTeacher = daiName;
      } else {
          const groupName = turn === 'morning' ? s.groupMorning : s.groupAfternoon;
          if (!groupName) return acc;
          groupKey = groupName.trim();
          myTeacher = turn === 'morning' ? s.teacherMorning : s.teacherAfternoon;
      }

      if (!acc[groupKey]) { 
          acc[groupKey] = { 
              name: groupKey, 
              students: [], 
              teacher: myTeacher, 
              aux: turn === 'morning' ? s.auxMorning : s.auxAfternoon, 
              sup1: turn === 'morning' ? s.sup1Morning : s.sup1Afternoon, 
              sup2: turn === 'morning' ? s.sup2Morning : s.sup2Afternoon,
              classroom: s.classroom, 
              driveLink: turn === 'morning' ? s.driveLinkMorning : s.driveLinkAfternoon,
              level: s.level,
              isInclusionGroup: s.modality === 'Inclusión' 
          }; 
      }
      acc[groupKey].students.push(s);
      return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

  // FILTRO 1: SEGURIDAD (Si no es management, solo ve lo suyo)
  if (!isManagement) {
      const myName = (user.fullName || "").toLowerCase();
      groups = groups.filter(g => {
          if ((g.teacher || "").toLowerCase().includes(myName)) return true;
          if ((g.aux || "").toLowerCase().includes(myName)) return true;
          return g.students.some(s => {
             const t = turn === 'morning' ? s.teacherMorning : s.teacherAfternoon;
             const dai = turn === 'morning' ? s.daiMorning : s.daiAfternoon;
             return (t || "").toLowerCase().includes(myName) || (dai || "").toLowerCase().includes(myName);
          });
      });
  }

  // FILTRO 2: VISUAL (Para que el Equipo Técnico no vea todo mezclado si no quiere)
  if (viewFilter !== 'all') {
      groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup);
  }

  // --- HANDLERS (Igual que antes) ---
  const handlePrintSingleGroup = (g) => {
    const printWindow = window.open('', '_blank'); if (!printWindow) return alert("Pop-ups bloqueados");
    const turnoTexto = turn === 'morning' ? 'MAÑANA' : 'TARDE';
    const sortedStudents = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));
    let content = `<!DOCTYPE html><html><head><title>Lista ${g.name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');*{print-color-adjust:exact!important;}body{font-family:'Roboto',sans-serif;padding:40px;color:#333;}.header{border-bottom:4px solid #7c3aed;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;}.title{font-size:28px;font-weight:900;color:#4c1d95;text-transform:uppercase;margin:0;}.subtitle{font-size:14px;font-weight:bold;color:#666;margin-top:5px;text-transform:uppercase;}.info-card{background-color:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:25px;display:flex;justify-content:space-between;font-size:12px;}.info-col strong{color:#7c3aed;text-transform:uppercase;font-size:10px;display:block;margin-bottom:2px;}table{width:100%;border-collapse:collapse;font-size:12px;}thead tr{background-color:#7c3aed!important;color:white!important;}th{padding:12px 8px;text-align:left;text-transform:uppercase;font-size:10px;}td{border-bottom:1px solid #e5e7eb;padding:10px 8px;}tr:nth-child(even){background-color:#f9fafb!important;}</style></head><body><div class="header"><div><h1 class="title">${g.isInclusionGroup ? 'Grupo Inclusión' : 'Grupo Sede'}</h1><p class="subtitle">${g.name}</p></div><img src="${LOGO_URL}" style="height:50px;opacity:0.8;"/></div><div class="info-card"><div class="info-col"><strong>Responsable</strong><p>${g.teacher||'Sin asignar'}</p></div><div class="info-col" style="text-align:right;"><strong>Cant. Alumnos</strong><p>${g.students.length}</p></div></div><table><thead><tr><th style="width:40px;">#</th><th>Apellido y Nombre</th><th>DNI</th><th>Info Extra</th></tr></thead><tbody>`;
    sortedStudents.forEach((s, i) => { const extra = s.modality === 'Inclusión' ? `Esc. ${s.originSchool} (${s.originGrade})` : `Edad: ${calculateAge(s.birthDate)}`; content += `<tr><td style="color:#7c3aed;font-weight:bold;">${i+1}</td><td><span style="font-weight:900;text-transform:uppercase;">${s.lastName}</span>, ${s.firstName}</td><td>${s.dni||'-'}</td><td><strong>${extra}</strong></td></tr>`; });
    content += `</tbody></table></body></html>`;
    printWindow.document.write(content); printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };
  const handleUpdateGroup = async (e) => {
      e.preventDefault(); if (!editingGroup) return; 
      if (editingGroup.isInclusionGroup && !confirm("⚠️ Estás editando un grupo de INCLUSIÓN. Esto cambiará el DAI asignado a todos estos alumnos.")) return;
      setUpdatingGroup(true); const fd = new FormData(e.target); const updates = {};
      if (editingGroup.isInclusionGroup) { if (turn === 'morning') updates.daiMorning = fd.get('teacher'); else updates.daiAfternoon = fd.get('teacher'); } 
      else { if (turn === 'morning') { updates.teacherMorning = fd.get('teacher'); updates.auxMorning = fd.get('aux'); updates.sup1Morning = fd.get('sup1'); updates.sup2Morning = fd.get('sup2'); updates.groupMorning = fd.get('groupName'); } else { updates.teacherAfternoon = fd.get('teacher'); updates.auxAfternoon = fd.get('aux'); updates.sup1Afternoon = fd.get('sup1'); updates.sup2Afternoon = fd.get('sup2'); updates.groupAfternoon = fd.get('groupName'); } updates.classroom = fd.get('classroom'); }
      updates.driveLink = fd.get('driveLink'); 
      try { const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)); await Promise.all(promises); alert("✅ Actualizado."); setEditingGroup(null); } catch (err) { alert(err.message); } finally { setUpdatingGroup(false); }
  };
  const handleSaveIncident = async (type, severity) => { if (!showBitacoraModal) return; setSavingIncident(true); try { const incidentData = { type, severity, date: new Date().toISOString(), author: user.fullName || user.firstName, authorId: user.id }; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id), { incidents: arrayUnion(incidentData) }); alert("✅ Registro guardado"); setShowBitacoraModal(null); } catch (e) { console.error(e); } finally { setSavingIncident(false); } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const handlePrintAll = () => { alert("Función de impresión masiva en desarrollo."); };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2><p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p></div>
              {isManagement && <button onClick={handlePrintAll} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}
          </div>
          
          <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
                  <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
                  <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
              </div>

              {/* FILTRO VISUAL SOLO PARA DIRECTIVOS/TÉCNICOS */}
              {isManagement && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setViewFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Todos</button>
                      <button onClick={() => setViewFilter('sede')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button>
                      <button onClick={() => setViewFilter('inclusion')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button>
                  </div>
              )}
          </div>
      </div>
      
      {/* BOTONES DE SCROLL LATERAL (SOLO PC) */}
      <button onClick={() => scroll('left')} className="hidden md:flex absolute left-4 top-1/2 z-20 bg-white/80 hover:bg-white text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 transition transform hover:scale-110"><ChevronLeft size={24}/></button>
      <button onClick={() => scroll('right')} className="hidden md:flex absolute right-4 top-1/2 z-20 bg-white/80 hover:bg-white text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 transition transform hover:scale-110"><ChevronRight size={24}/></button>

      <div ref={scrollContainerRef} className="flex-1 overflow-x-auto p-6 scroll-smooth">
        <div className="flex gap-6 h-full md:h-auto items-start">
            {groups.length === 0 && (<div className="m-auto text-center opacity-50"><LayoutDashboard size={48} className="mx-auto mb-2 text-gray-300"/><p className="font-bold text-gray-400">No hay grupos visibles.</p></div>)} 
            
            {groups.map((g) => (
                <div key={g.name} className={`min-w-[280px] w-[300px] flex flex-col h-[calc(100vh-220px)] md:h-fit bg-white rounded-[30px] border shadow-sm relative overflow-hidden group-hover:shadow-md transition shrink-0 ${g.isInclusionGroup ? 'border-indigo-200' : 'border-gray-200'}`}>
                  <div className={`p-4 border-b-4 relative ${g.isInclusionGroup ? 'bg-indigo-50 border-indigo-400' : (turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50')}`}>
                      <div className="absolute top-2 right-2 flex gap-1">
                          {isStrategic && (<button onClick={()=>setGroupStats(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><PieChart size={14}/></button>)}
                          {g.driveLink && (<a href={g.driveLink} target="_blank" rel="noopener noreferrer" className="p-2 bg-white/50 hover:bg-white rounded-full text-green-600 shadow-sm transition flex items-center justify-center"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg></a>)}
                          <button onClick={()=>handlePrintSingleGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
                          {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                      </div>
                      
                      {g.isInclusionGroup ? (
                          <>
                              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">DAI RESPONSABLE</p>
                              <h3 className="font-black text-indigo-900 text-lg leading-tight">{g.teacher}</h3>
                          </>
                      ) : (
                          <h3 className="font-black text-gray-800 text-lg">{g.name}</h3>
                      )}

                      <div className="mt-2 text-xs text-gray-500 font-medium space-y-1">
                          {!g.isInclusionGroup && <p>DOC: <span className="font-bold text-violet-700 uppercase">{g.teacher || 'Sin asignar'}</span></p>}
                          {g.aux && <p>AUX: <span className="font-bold uppercase">{g.aux}</span></p>}
                          {(g.sup1 || g.sup2) && <p className="text-violet-600 font-bold truncate">SUP: {g.sup1 || ''} {g.sup2 ? `& ${g.sup2}` : ''}</p>}
                          {g.classroom && <p className="inline-flex items-center gap-1 bg-white/50 px-2 rounded-md"><StartIcon size={10}/> Aula {g.classroom}</p>}
                      </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto md:overflow-visible p-3 space-y-3 bg-gray-50">
                    {g.students.map(s => (
                        <div key={s.id} onClick={() => {setSelectedStudent(s); setActiveTab('info');}} className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center w-full h-full font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                            <div>
                                <h4 className="font-bold text-gray-700 text-sm">{s.firstName} {s.lastName}</h4>
                                {g.isInclusionGroup && <p className="text-[10px] text-indigo-500 font-bold">Esc. {s.originSchool}</p>}
                            </div>
                            <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s);}} className="ml-auto w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition">⚡</button>
                        </div>
                    ))}
                  </div>
              </div>
            ))}
        </div>
      </div>
      
      {/* MODALES IGUALES A LA VERSIÓN ANTERIOR... */}
      {/* Pega aquí los modales groupStats, editingGroup, showBitacoraModal y selectedStudent del código anterior */}
      {/* ... (Son idénticos a la versión anterior que funcionaba bien, los omito para no exceder caracteres pero deben estar) ... */}
      {groupStats && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={() => setGroupStats(null)}>
              <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-violet-900 uppercase italic">Análisis del Grupo</h3><p className="text-xs text-gray-500 font-bold">{groupStats.name} ({groupStats.students.length} alumnos)</p></div><button onClick={() => setGroupStats(null)}><X/></button></div>
                  {(() => {
                      const allIncidents = groupStats.students.flatMap(s => s.incidents || []);
                      if (allIncidents.length === 0) return <p className="text-center text-gray-400 italic">No hay registros en la bitácora aún.</p>;
                      const dimensions = { 'Pedagógico/Social': 0, 'Salud y Bienestar': 0, 'Conducta': 0, 'Rutina': 0 };
                      const tagsCount = {};
                      allIncidents.forEach(inc => {
                          const type = inc.type;
                          tagsCount[type] = (tagsCount[type] || 0) + 1;
                          if (['Trabajó Muy Bien', 'Ayudó a un amigo', 'Logro de Aprendizaje', 'Buena Conducta'].includes(type)) dimensions['Pedagógico/Social']++;
                          else if (['Convulsión / Salud', 'Higiene / Esfínter', 'Vómito', 'No comió'].includes(type)) dimensions['Salud y Bienestar']++;
                          else if (['Agresión / Violencia', 'Brote / Gritos', 'Fuga / Intento', 'Crisis Llanto'].includes(type)) dimensions['Conducta']++;
                          else dimensions['Rutina']++;
                      });
                      const total = allIncidents.length;
                      const topTags = Object.entries(tagsCount).sort((a, b) => b[1] - a[1]).slice(0, 4);
                      return (
                          <div className="space-y-6">
                              <div>
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dimensiones Registradas</h4>
                                  <div className="space-y-3">{Object.entries(dimensions).map(([dim, count]) => { if (count === 0) return null; const pct = Math.round((count / total) * 100); const color = dim === 'Pedagógico/Social' ? 'bg-emerald-500' : dim === 'Salud y Bienestar' ? 'bg-blue-500' : dim === 'Conducta' ? 'bg-red-500' : 'bg-yellow-400'; return (<div key={dim}><div className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span>{dim}</span><span>{count} ({pct}%)</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div style={{width: `${pct}%`}} className={`h-full ${color}`}></div></div></div>); })}</div>
                              </div>
                              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lo que más sucede (Top 4)</h4><div className="space-y-2">{topTags.map(([tag, count]) => (<div key={tag} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm"><span className="text-xs font-bold text-gray-700">{tag}</span><span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{count} veces</span></div>))}</div></div>
                          </div>
                      );
                  })()}
              </div>
          </div>
      )}
      {editingGroup && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3><button type="button" onClick={()=>setEditingGroup(null)}><X/></button></div><div className="space-y-4"><div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center"><p className="text-xs text-violet-500 font-bold uppercase mb-1">{editingGroup.isInclusionGroup ? 'Editando Cartera DAI' : 'Editando Grupo Sede'}</p>{!editingGroup.isInclusionGroup && <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200 focus:border-violet-500" placeholder="Nombre Grupo"/>}</div><div><label className="text-xs font-bold text-gray-500 ml-1">{editingGroup.isInclusionGroup ? 'DAI Responsable' : 'Docente a Cargo'}</label><select name="teacher" defaultValue={editingGroup.teacher} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>{!editingGroup.isInclusionGroup && (<><div><label className="text-xs font-bold text-gray-500 ml-1">Auxiliar</label><select name="aux" defaultValue={editingGroup.aux} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div><label className="text-xs font-bold text-gray-500 ml-1">Aula Física</label><input name="classroom" defaultValue={editingGroup.classroom} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" placeholder="Ej: 5"/></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500 ml-1">Sup. 1</label><select name="sup1" defaultValue={editingGroup.sup1} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div><label className="text-xs font-bold text-gray-500 ml-1">Sup. 2</label><select name="sup2" defaultValue={editingGroup.sup2} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div></>)}<button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition flex justify-center items-center gap-2">{updatingGroup ? <RefreshCw className="animate-spin"/> : 'Aplicar Cambios'}</button></div></form></div>)}
      {showBitacoraModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500"><div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div><div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? 'opacity-50' : 'hover:brightness-95'}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div></div></div>)}
      {selectedStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0"><button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{selectedStudent.lastName}, {selectedStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(selectedStudent.birthDate)} años</span></p></div></div><div className="flex gap-2 mt-6"><button onClick={() => setActiveTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'info' ? 'bg-white text-blue-600' : 'bg-black/20 text-white/70'}`}>Datos</button><button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'history' ? 'bg-white text-blue-600' : 'bg-black/20 text-white/70'}`}>Bitácora</button></div></div><div className="p-6 overflow-y-auto space-y-6">{activeTab === 'info' ? (<div className="space-y-4"><div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><h3 className="font-bold text-orange-800 text-xs uppercase mb-2">Contacto</h3><p className="text-sm">Madre: <b>{selectedStudent.motherName}</b> ({selectedStudent.motherContact})</p><p className="text-sm">Padre: <b>{selectedStudent.fatherName}</b> ({selectedStudent.fatherContact})</p></div><div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Ubicación</h3><p className="text-sm">TM: <b>{selectedStudent.groupMorning}</b></p><p className="text-sm">TT: <b>{selectedStudent.groupAfternoon}</b></p></div></div>) : (<div className="space-y-2">{selectedStudent.incidents?.map((inc, i) => (<div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="font-bold text-sm">{inc.type}</p><p className="text-xs text-gray-500">{new Date(inc.date).toLocaleDateString()} - {inc.author}</p></div>))}</div>)}</div></div></div>)}
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

// 3. Vista de Auditoría (Para evitar error si clickeas el botón de admin)
// --- VISTA AUDITORÍA (REAL + DESCARGA) ---
function ActivityLogView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Escuchar cambios en tareas y notificaciones para simular un log si no hay colección dedicada aun
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({
            id: d.id,
            action: d.data().title || 'Acción del sistema',
            details: d.data().message,
            user: 'Sistema/Admin', // En una versión futura guardaremos quién lo hizo
            date: d.data().createdAt ? new Date(d.data().createdAt.seconds * 1000) : new Date()
        }));
        setLogs(data);
        setLoading(false);
    });
    return () => unsub();
  }, []);

  const downloadReport = () => {
      const headers = ["Fecha", "Hora", "Acción", "Detalles"];
      const rows = logs.map(l => [
          l.date.toLocaleDateString(),
          l.date.toLocaleTimeString(),
          l.action,
          `"${l.details}"`
      ]);
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `AUDITORIA_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/90 text-white rounded-3xl overflow-hidden p-6">
        <div className="flex justify-between items-center mb-6 shrink-0">
            <div>
                <h2 className="text-2xl font-black uppercase italic tracking-tighter">Auditoría Global</h2>
                <p className="text-white/50 text-xs">Registro de movimientos del sistema</p>
            </div>
            <button onClick={downloadReport} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl shadow-lg transition">
                <Download size={20}/>
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {loading ? <p className="text-center opacity-50">Cargando registros...</p> : logs.map(log => (
                <div key={log.id} className="bg-white/10 p-3 rounded-xl border border-white/5 flex gap-3 items-start">
                    <div className="mt-1"><Clock size={14} className="text-orange-400"/></div>
                    <div>
                        <p className="font-bold text-xs text-orange-200">{log.date.toLocaleString()}</p>
                        <p className="font-bold text-sm">{log.action}</p>
                        <p className="text-xs text-white/70">{log.details}</p>
                    </div>
                </div>
            ))}
            {logs.length === 0 && !loading && <div className="text-center opacity-30 py-10">No hay registros recientes.</div>}
        </div>
    </div>
  );
}


























































































