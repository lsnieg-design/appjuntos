import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder, MessageSquare, Globe, BookOpen, Lightbulb, Printer 
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

// --- VISTA DASHBOARD (SCROLL FULL SCREEN + NOTAS EXPANDIDAS) ---
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

  const canPost = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    // Notas personales
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => { 
        const rawNotes = snap.docs.map(d => ({ id: d.id, ...d.data() })); 
        // Ordenar: Pendientes primero, luego por fecha
        rawNotes.sort((a, b) => (a.done === b.done) ? 0 : a.done ? 1 : -1); 
        setNotes(rawNotes); 
    });

    // Cumpleaños y Alumnos sin grupo
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); let noGroupCounter = 0;
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
    return () => { unsubNotes(); unsubStudents(); };
  }, [user.id]);

  const handlePost = async (e) => { e.preventDefault(); const text = e.target.message.value; if(!text.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { message: text, author: user.fullName || user.firstName, role: user.role, createdAt: serverTimestamp() }); setShowAnnounceModal(false); };
  const deleteAnnouncement = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id)); };
  const saveNote = async (e) => { e.preventDefault(); if (!newNote.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); setNewNote(''); };
  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div><div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div></div>
      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm animate-pulse"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase tracking-widest">Atención Administrativa</h4><p className="text-xs text-red-600 font-bold">Hay {ungroupedCount} estudiantes activos sin grupo asignado.</p></div></div></div>)}
      
      {/* BOTÓN CUMPLEAÑOS */}
      {birthdays.length > 0 && (
        <button onClick={() => setShowBirthdayModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-95 transition">
            <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><Crown size={20} className="text-white"/></div><div className="text-left"><h3 className="font-bold text-sm uppercase tracking-widest">¡Hay Cumpleaños!</h3><p className="text-xs opacity-90">{birthdays.length} festejos esta semana</p></div></div><ChevronRight size={20}/>
        </button>
      )}

      {/* CARTELERA */}
      {announcements.length > 0 && (<div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative"><h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1 mb-3"><Bell size={12}/> Cartelera Oficial</h3><div className="space-y-3">{announcements.map(a => (<div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start"><div><p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase tracking-wider">- {a.author}</p></div>{canPost && (<button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>)}</div>))}</div></div>)}
      
      {/* RESUMEN TAREAS Y EVENTOS */}
      <div className="grid grid-cols-2 gap-3"><div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition"><h4 className="text-3xl font-black text-orange-500">{tasks.filter(t=>t.status!=='completed').length}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div><div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>{todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase tracking-widest font-bold">Es Hoy</p>{todayEvents.length > 1 && <span className="absolute top-4 right-4 text-[10px] bg-white/20 px-2 rounded-full">+{todayEvents.length - 1} más</span>}</> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}</div></div>
      
      {/* NOTAS PERSONALES (SIN SCROLL INTERNO, SE EXPANDEN) */}
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner">
          <h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3>
          <form onSubmit={saveNote} className="flex gap-2 mb-3">
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" />
              <button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button>
          </form>
          <div className="space-y-2">
              {notes.map(n => (
                  <div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group">
                      <button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>
                          {n.done && <Check size={12} className="text-white"/>}
                      </button>
                      <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span>
                      <button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                  </div>
              ))}
              {notes.length === 0 && <p className="text-center text-gray-300 text-xs py-2 italic">No tienes notas.</p>}
          </div>
      </div>
      
      {showBirthdayModal && (<div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowBirthdayModal(false)}><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-pink-500" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-black text-pink-500 uppercase italic">Cumpleaños</h3><button onClick={() => setShowBirthdayModal(false)}><X size={24}/></button></div><div className="space-y-3 max-h-[60vh] overflow-y-auto">{birthdays.map(b => (<div key={b.id} className="flex items-center gap-4 bg-pink-50 p-3 rounded-2xl border border-pink-100"><div className="w-12 h-12 rounded-full bg-white border-2 border-pink-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-pink-400">{b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : b.firstName[0]}</div><div><h4 className="font-bold text-gray-800">{b.firstName} {b.lastName}</h4><p className="text-xs text-pink-600 font-bold">{[b.groupMorning, b.groupAfternoon].filter(Boolean).join(' / ') || 'Sin Grupo'}</p><p className="text-[10px] text-gray-400 uppercase tracking-widest">{new Date(b.nextBirthday).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>))}</div></div></div>)}
      {showAnnounceModal && (<div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"><form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-lg font-black text-orange-500 mb-2 uppercase italic">Nuevo Aviso</h3><textarea name="message" className="w-full p-4 bg-orange-50 rounded-2xl outline-none text-sm h-32 resize-none border border-orange-100 focus:ring-2 ring-orange-200 text-gray-700" placeholder="Escribe aquí..." required></textarea><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition">Publicar</button></div></form></div>)}
      {showTutorial && (<div className="fixed inset-0 bg-violet-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in"><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl max-h-[80vh] overflow-y-auto relative"><button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button><div className="text-center mb-6"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Guía Rápida</h2><p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Para Docentes y Equipo</p></div><div className="space-y-6"><div className="flex gap-4 items-start"><div className="bg-orange-100 p-3 rounded-2xl text-orange-600"><Grid size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">1. Mi Aula / Grupos</h4><p className="text-xs text-gray-500 mt-1">Aquí ves a tus alumnos. Toca las pestañas "Mañana" o "Tarde" para cambiar de grupo.</p></div></div><div className="flex gap-4 items-start"><div className="bg-red-100 p-3 rounded-2xl text-red-600"><Activity size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">2. Bitácora Express (El Rayo)</h4><p className="text-xs text-gray-500 mt-1">En la tarjeta de cada alumno hay un ícono de rayo ⚡. Úsalo para registrar incidentes (golpes, crisis, salud) rápidamente con un solo toque.</p></div></div><div className="flex gap-4 items-start"><div className="bg-blue-100 p-3 rounded-2xl text-blue-600"><CheckSquare size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">3. Pedidos y tareas</h4><p className="text-xs text-gray-500 mt-1">Usa la sección "Tareas" para pedir materiales, arreglos, informes y tareas. Puedes asignar a un <b>Rol</b> o una <b>Persona</b>. Solo lo ven los involucrados.</p></div></div><div className="flex gap-4 items-start"><div className="bg-green-100 p-3 rounded-2xl text-green-600"><LinkIcon size={24}/></div><div><h4 className="font-bold text-gray-800 text-sm">4. Recursos</h4><p className="text-xs text-gray-500 mt-1">Encuentra documentos, planillas y enlaces útiles organizados por carpetas.</p></div></div></div><button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-8 shadow-lg uppercase text-xs tracking-widest">¡Entendido!</button></div></div>)}
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


// --- VISTA TAREAS (SEMÁFORO DE PRIORIDADES + LEYENDA + BUSCADOR) ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  
  // Estados formulario
  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUserObj, setSelectedUserObj] = useState(null); 
  
  // Checklist y comentarios
  const [checklist, setChecklist] = useState([]); 
  const [newItem, setNewItem] = useState(""); 
  const [userSearch, setUserSearch] = useState("");
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState(null); 
  const [filter, setFilter] = useState('pending');

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
  const canManage = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';

  useEffect(() => {
    const unsub = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc')), (snap) => {
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
    
    let finalTargetId = null;
    let finalAssignedName = "Todos";
    let finalRoles = [];

    if (assignType === 'user') {
        if (!selectedUserObj) return alert("⚠️ Error: Selecciona un usuario del buscador.");
        finalTargetId = selectedUserObj.id;
        finalAssignedName = selectedUserObj.fullName;
    } else {
        if (selectedRoles.length === 0) return alert("⚠️ Error: Elige al menos un rol.");
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
             const newTaskRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { 
                 ...taskData, 
                 createdByName: user.fullName || user.firstName, 
                 createdById: user.id, 
                 status: 'pending', 
                 createdAt: serverTimestamp(), 
                 comments: [] 
             });
             
             // NOTIFICACIONES
             const notifData = {
                 title: `Tarea ${fd.get('priority') === 'alta' ? 'URGENTE 🔴' : 'Asignada'}`,
                 message: `${user.firstName}: "${fd.get('title')}"`,
                 read: false,
                 createdAt: serverTimestamp(),
                 targetTab: 'tasks',
                 relatedId: newTaskRef.id,
                 type: 'task_assigned'
             };

             if (assignType === 'user' && finalTargetId) {
                await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: finalTargetId });
             } else if (assignType === 'roles') {
                const targets = usersList.filter(u => u.role && finalRoles.some(r => r.toLowerCase() === u.role.toLowerCase()));
                const promises = targets.map(t => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: t.id }));
                await Promise.all(promises);
             }
        }
        setShowModal(false);
    } catch (err) { console.error(err); alert("Error: " + err.message); }
  };

  const addComment = async (task) => { if (!newComment.trim()) return; const commentData = { text: newComment, author: user.firstName, date: new Date().toISOString() }; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: arrayUnion(commentData) }); setNewComment(""); };
  const handleDelete = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  
  const changeStatus = async (task, newStatus) => { 
      if (newStatus === 'completed' && !confirm("¿Marcar como lista?")) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus }); 
  };
  
  const openNew = () => { setEditingTask(null); setAssignType('user'); setSelectedRoles([]); setChecklist([]); setNewItem(""); setUserSearch(""); setSelectedUserObj(null); setShowModal(true); };
  
  const openEdit = (t) => { 
      setEditingTask(t); setAssignType(t.targetType || 'user'); setSelectedRoles(t.targetRoles || []); setChecklist(t.checklist || []); setShowModal(true); 
  };
  
  const filteredTasks = tasks.filter(t => {
      if (filter === 'pending' && t.status === 'completed') return false;
      if (filter === 'completed' && t.status !== 'completed') return false;
      if (canManage) return true; 
      if (t.createdById === user.id) return true; 
      if (t.targetType === 'user') return t.targetUserId === user.id; 
      if (t.targetType === 'roles') return t.targetRoles && user.role && t.targetRoles.some(r => r.toLowerCase() === user.role.toLowerCase()); 
      return false;
  });

  const searchResults = userSearch.length > 0 ? usersList.filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase())) : [];

  // --- FUNCIÓN DEL SEMÁFORO ---
  const getPriorityStyle = (p) => { 
      if (p === 'alta') return 'border-l-4 border-l-red-500 bg-red-50/50'; 
      if (p === 'media') return 'border-l-4 border-l-orange-400 bg-orange-50/50'; 
      return 'border-l-4 border-l-green-400 bg-green-50/50'; 
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-20">
      <div className="flex justify-between items-center mb-2 bg-white p-4 sticky top-0 z-10 shadow-sm rounded-b-3xl">
          <div><h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas</h2><p className="text-xs text-gray-400 font-bold">{filteredTasks.length} visibles</p></div>
          <div className="flex gap-2">
             <div className="flex bg-gray-100 rounded-xl p-1">
                <button onClick={()=>setFilter('pending')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='pending'?'bg-white shadow text-slate-800':'text-gray-400'}`}>Activas</button>
                <button onClick={()=>setFilter('completed')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='completed'?'bg-white shadow text-green-600':'text-gray-400'}`}>Listas</button>
             </div>
             {canManage && <button onClick={openNew} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:scale-110 transition-all"><Plus size={20}/></button>}
          </div>
      </div>

      {/* --- LEYENDA DEL SEMÁFORO (Aquí está la explicación) --- */}
      {filter === 'pending' && (
          <div className="flex justify-center gap-4 py-2 opacity-80">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500 shadow-sm"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Urgente</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-400 shadow-sm"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Media</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-400 shadow-sm"></div><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Normal</span></div>
          </div>
      )}
      
      <div className="grid gap-3 px-2">
          {filteredTasks.length === 0 ? ( <div className="text-center py-10 opacity-40"><CheckCircle size={40} className="mx-auto mb-2 text-gray-400"/><p className="font-bold text-gray-500">Sin tareas en esta vista.</p></div> ) : filteredTasks.map(t => (
            <div key={t.id} className={`p-5 rounded-[30px] shadow-sm flex flex-col gap-3 transition-all relative ${getPriorityStyle(t.priority)}`}>
                <div className="flex justify-between items-start">
                    <div className="flex-1 pr-6">
                        <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName}</p>
                        <h3 className={`font-bold text-gray-800 text-sm uppercase italic tracking-tighter leading-none ${t.status==='completed'?'line-through opacity-50':''}`}>{t.title}</h3>
                        <p className="text-[9px] text-gray-400 mt-1 italic">De: {t.createdByName}</p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-[9px] font-black bg-white px-2 py-1 rounded-full text-gray-400 border uppercase tracking-tighter italic shadow-inner">{t.dueDate}</div>
                        <div className="flex gap-1">{canManage && <button onClick={() => openEdit(t)} className="text-blue-300 hover:text-blue-600 p-1 bg-white rounded-full shadow-sm"><Edit3 size={14}/></button>}{canManage && <button onClick={() => handleDelete(t.id)} className="text-red-300 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14}/></button>}</div>
                    </div>
                </div>
                {openCommentsId === t.id && ( <div className="bg-white/60 p-3 rounded-xl border border-gray-100 mt-2 animate-in fade-in"><div className="max-h-32 overflow-y-auto space-y-2 mb-2">{(t.comments || []).map((c, idx) => ( <p key={idx} className="text-xs text-gray-600 border-b border-gray-100 pb-1"><span className="font-bold text-violet-700 uppercase text-[9px]">{c.author}:</span> {c.text}</p> ))}</div><div className="flex gap-2"><input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Comentar..." className="flex-1 text-xs p-2 rounded-lg border-none outline-none bg-white shadow-inner" /><button onClick={() => addComment(t)} className="bg-violet-600 text-white p-2 rounded-lg"><Send size={12}/></button></div></div> )}
                <div className="pt-2 border-t border-black/5 flex justify-between items-center">
                    <button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className="flex items-center gap-1 text-xs font-bold text-gray-500 hover:text-violet-600 bg-white/50 px-2 py-1 rounded-lg"><MessageSquare size={14}/> {t.comments?.length || 0}</button>
                    <div className="flex bg-white/60 rounded-lg p-0.5 shadow-sm">
                        <button onClick={() => changeStatus(t, 'pending')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'pending' ? 'bg-white shadow text-gray-700' : 'text-gray-400'}`}>Pend.</button>
                        <button onClick={() => changeStatus(t, 'in_process')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'in_process' ? 'bg-orange-100 text-orange-600 shadow' : 'text-gray-400'}`}>Proc.</button>
                        <button onClick={() => changeStatus(t, 'completed')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'completed' ? 'bg-green-100 text-green-700 shadow' : 'text-gray-400'}`}>Lista</button>
                    </div>
                </div>
            </div>
          ))}
      </div>

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
                <div className="space-y-2">
                   {selectedUserObj ? (
                       <div className="flex items-center justify-between p-3 bg-violet-50 border border-violet-200 rounded-xl">
                           <div className="flex items-center gap-2"><div className="w-8 h-8 bg-violet-600 text-white rounded-full flex items-center justify-center font-bold text-xs">{selectedUserObj.firstName[0]}</div><span className="text-xs font-bold text-violet-900">{selectedUserObj.fullName}</span></div>
                           <button type="button" onClick={() => setSelectedUserObj(null)} className="text-red-400 p-1"><X size={16}/></button>
                       </div>
                   ) : (
                       <div className="relative">
                           <input placeholder="🔍 Escribí para buscar..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="w-full p-3 bg-gray-50 border-b-2 border-gray-200 text-sm outline-none focus:border-violet-500 rounded-t-xl" />
                           {userSearch.length > 0 && (<div className="max-h-40 overflow-y-auto border-x border-b border-gray-200 rounded-b-xl bg-white shadow-xl absolute w-full z-50">{searchResults.length > 0 ? searchResults.map(u => (<div key={u.id} onClick={() => { setSelectedUserObj(u); setUserSearch(""); }} className="p-3 hover:bg-violet-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0"><div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">{u.firstName[0]}</div><p className="text-xs font-bold text-gray-700">{u.fullName}</p></div>)) : <p className="p-3 text-xs text-gray-400 italic text-center">No encontrado</p>}</div>)}
                       </div>
                   )}
                </div>
            ) : (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">{ROLES_OPTIONS.map(role => ( <label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => { if(e.target.checked) setSelectedRoles([...selectedRoles, role]); else setSelectedRoles(selectedRoles.filter(r => r !== role)); }} className="accent-violet-600"/> {role}</label> ))}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <input name="dueDate" type="date" defaultValue={editingTask?.dueDate} required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs text-gray-400" />
                <select name="priority" defaultValue={editingTask?.priority} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase text-orange-600 italic">
                    <option value="baja">🟢 Baja</option>
                    <option value="media">🟠 Media</option>
                    <option value="alta">🔴 Alta</option>
                </select>
            </div>
            <div className="flex gap-2 pt-4"><button type="button" onClick={() => setShowModal(false)} className="flex-1 font-bold text-gray-400 text-xs uppercase">Cancelar</button><button type="submit" className="flex-1 py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest text-xs">GUARDAR</button></div>
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

// --- VISTA CALENDARIO (FULL SCREEN + SWIPE + RESPONSIVE) ---
function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  
  // --- LÓGICA DE SWIPE (TÁCTIL) ---
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
  // ---------------------------------
  
  const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(new Date(d)); };
  
  const handleDayClick = (dateStr) => {
      const eventsOnDay = events.filter(e => e.date === dateStr);
      // Permitimos abrir el día aunque no tenga eventos si se quiere agregar uno (opcional)
      // Si prefieres solo ver eventos existentes, mantén el if(length > 0)
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
  
  const openNew = () => { setEditingEvent(null); setShowModal(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setShowModal(true); };

  const renderGrid = () => {
    const year = currentDate.getFullYear(); const month = currentDate.getMonth();
    const days = []; const firstDay = new Date(year, month, 1).getDay();
    
    // Celdas vacías del mes anterior
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100"></div>);
    
    // Días del mes
    for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
      
      days.push(
        <div key={d} onClick={() => handleDayClick(dateStr)} className={`relative border-b border-r border-gray-100 p-1 transition flex flex-col group cursor-pointer ${isToday ? 'bg-violet-50' : 'bg-white hover:bg-gray-50'}`}>
          <div className="flex justify-center">
             <span className={`text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500'}`}>{d}</span>
          </div>
          <div className="flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar flex-1">
            {dayEvents.map((ev, idx) => (
                <div key={idx} className={`text-[7px] rounded-[3px] px-1 py-0.5 truncate font-bold uppercase border-l-2 ${ev.type === 'FERIADO' ? 'bg-red-50 text-red-600 border-red-400' : 'bg-violet-100 text-violet-700 border-violet-400'}`}>
                    {ev.title}
                </div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in select-none">
      {/* HEADER */}
      <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex gap-2 items-center">
             <h2 className="text-xl font-black text-violet-900 uppercase italic tracking-tighter">{currentDate.toLocaleDateString('es-ES', { month: 'long' })} <span className="text-gray-400 text-sm not-italic font-medium">{currentDate.getFullYear()}</span></h2>
        </div>
        <div className="flex gap-2">
             <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button onClick={() => changeMonth(-1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronLeft size={16}/></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs font-bold text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition">HOY</button>
                <button onClick={() => changeMonth(1)} className="p-2 text-gray-600 hover:bg-white hover:shadow-sm rounded-md transition"><ChevronRight size={16}/></button>
             </div>
             {canEdit && <button onClick={openNew} className="bg-orange-500 text-white p-2 rounded-lg shadow hover:bg-orange-600 transition"><Plus size={20}/></button>}
        </div>
      </div>
      
      {/* DÍAS SEMANA (HEADER FIJO) */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200 shrink-0">
         {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="py-2 text-center text-[9px] font-black text-violet-400 uppercase tracking-widest">{d}</div>)}
      </div>

      {/* GRILLA CALENDARIO (EXPANDIBLE) */}
      <div 
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
        className="flex-1 grid grid-cols-7 auto-rows-fr overflow-y-auto" // auto-rows-fr hace que las celdas se estiren
      >
        {renderGrid()}
      </div>
      
      {/* MODAL NUEVO/EDITAR */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-orange-500">
            <h3 className="text-lg font-black text-violet-900 uppercase italic">{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-violet-300" />
            <div className="grid grid-cols-2 gap-3">
                <input name="date" type="date" defaultValue={editingEvent?.date || selectedDayEvents?.date} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border" />
                <select name="type" defaultValue={editingEvent?.type || 'GENERAL'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border">
                    {['GENERAL', 'SALIDA EDUCATIVA', 'EFEMÉRIDES', 'ACTO', 'REUNIÓN', 'FERIADO'].map(t => <option key={t} value={t}>{t}</option>)}
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
                selectedDayEvents.events.map(ev => (
                    <div key={ev.id} className="bg-gray-50 p-4 rounded-2xl border border-gray-100 relative group">
                        <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${ev.type === 'FERIADO' ? 'bg-red-100 text-red-600 border-red-200' : 'bg-blue-100 text-blue-600 border-blue-200'}`}>{ev.type}</span>
                        <h3 className="font-bold text-gray-800 mt-2 text-sm">{ev.title}</h3>
                        <p className="text-xs text-gray-500 mt-1 italic">{ev.description}</p>
                        <p className="text-[9px] text-gray-300 mt-2 text-right uppercase font-bold">Por: {ev.author || 'Sistema'}</p>
                        {canEdit && (
                            <div className="absolute top-3 right-3 flex gap-1">
                                <button onClick={() => openEdit(ev)} className="p-1.5 bg-white text-blue-400 rounded-lg shadow-sm border border-gray-100"><Edit3 size={12}/></button>
                                <button onClick={() => deleteEvent(ev.id)} className="p-1.5 bg-white text-red-400 rounded-lg shadow-sm border border-gray-100"><Trash2 size={12}/></button>
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
    if (!("Notification" in window)) {
        alert("Tu dispositivo no soporta notificaciones.");
        return;
    }
    
    // Paso 1: Pedir permiso simple
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        // Intentamos enviar una notificación de prueba local (no falla si no hay server)
        try {
            new Notification("¡Juntos a la Par!", { 
                body: "Notificaciones activadas correctamente en este dispositivo.",
                icon: '/icon-192.png'
            });
        } catch (e) {
            console.log("Notificación nativa enviada.");
        }
        
        // Paso 2: Intentamos conectar con Firebase (si falla, no mostramos error feo)
        try {
            const messaging = getMessaging(app);
            const token = await getToken(messaging, { vapidKey: 'BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw' });
            if (token) {
                 const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
                 await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
            }
        } catch (error) {
            console.log("Firebase Messaging no disponible (probablemente falta HTTPS o sw.js), pero las notificaciones locales funcionarán.");
        }
        alert("✅ Permisos concedidos.");
    } else {
        alert("❌ Permiso denegado. Habilitá las notificaciones en la configuración del navegador.");
    }
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
// --- VISTA ADMINISTRACIÓN DE USUARIOS (FIX ERROR + RESPONSIVE + LAST LOGIN) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  // IMPORTANTE: Aquí definimos la variable correcta 'editingUser'
  const [editingUser, setEditingUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');

  // Estados dummy para funciones no implementadas (para que no rompa)
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
        // CORRECCIÓN CRÍTICA: Aquí usamos 'editingUser' (no editUser)
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
  
  // Funciones placeholder para evitar errores si faltan las reales
  const analizarConflictos = () => alert("Función Detective en mantenimiento.");
  const handleBulkImport = () => alert("Importación masiva en mantenimiento.");

  const filteredUsers = users.filter(u => (u.fullName||'').toLowerCase().includes(searchTerm.toLowerCase()));

  // Formatear fecha de último ingreso
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
        
        {/* CORRECCIÓN MÓVIL: Scroll horizontal para que los botones no se salgan */}
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
            {/* Punto verde si se conectó hoy */}
            {u.lastLogin && new Date(u.lastLogin.seconds * 1000).toDateString() === new Date().toDateString() && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border border-white"></div>}
        </div>
        <div className="min-w-0">
            <p className="font-bold text-xs text-gray-800 truncate">{u.fullName}</p>
            <div className="flex flex-wrap gap-2 items-center">
                <p className="text-[9px] text-gray-400 truncate bg-gray-100 px-1 rounded">{u.role}</p>
                {/* DATO NUEVO: Último ingreso */}
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

    {/* MODAL EDICIÓN */}
    {showModal && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
       <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
        <h3 className="font-bold text-violet-900">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
        <div className="grid grid-cols-2 gap-2"><input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-2 bg-gray-50 rounded-lg text-xs border" required/><input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-2 bg-gray-50 rounded-lg text-xs border" required/></div>
        <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-2 bg-gray-50 rounded-lg text-xs border" required/>
        <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-2 bg-gray-50 rounded-lg text-xs border" required/>
        <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-2 bg-gray-50 rounded-lg text-xs border">{['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar', 'Inclusión', 'Profes Especiales', 'Administración'].map(r=><option key={r} value={r}>{r}</option>)}</select>
        <div className="flex items-center gap-2"><input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} /><span className="text-xs">¿Es Admin?</span></div>
        <div className="flex gap-2"><button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-2 text-gray-500 text-xs font-bold">Cancelar</button><button type="submit" className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-xs font-bold">Guardar</button></div>
       </form>
      </div>
    )}
   </div>
  );
}
// --- VISTA PROYECTO INSTITUCIONAL (CON PORTADA PPI.png) ---
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
      
      {/* --- AQUÍ ESTÁ LA NUEVA PORTADA --- */}
      <div className="relative w-full h-56 rounded-[35px] overflow-hidden shadow-2xl group border border-violet-100">
          {/* La Imagen de Fondo */}
          <img 
            src="/PPI.png" 
            alt="Portada Proyecto" 
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
            onError={(e) => {
                e.target.style.display = 'none'; // Si falla la imagen, se oculta y queda el color de fondo
            }}
          />
          
          {/* El Degradado (para que se lea el texto) */}
          <div className="absolute inset-0 bg-gradient-to-t from-violet-900 via-violet-900/40 to-transparent flex flex-col justify-end p-8">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md mb-1">
                  Proyecto 2026
              </h2>
              <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">
                      Institucional
                  </span>
                  <p className="text-orange-200 font-bold text-xs uppercase tracking-[3px] drop-shadow-sm">
                      La Vuelta al Mundo
                  </p>
              </div>
          </div>
      </div>
      {/* ---------------------------------- */}

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
// --- VISTA MATRÍCULA (CORREGIDA: ETIQUETAS EN SU LUGAR CORRECTO) ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info');
  
  // Modales
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showDupes, setShowDupes] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);

  // Estados de Datos
  const [editingStudent, setEditingStudent] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [potentialDupes, setPotentialDupes] = useState([]);
  const [unassignedList, setUnassignedList] = useState([]);

  // Estados de Proceso
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Filtros
  const [statFilters, setStatFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' });
  const [filters, setFilters] = useState({ level: 'all', group: 'all', turn: 'all', teacher: 'all', dx: 'all', gender: 'all', journey: 'all', os: 'all' });

  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo';
  const LOGO_URL = "/icon-192.png"; 

  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { uS(); uU(); };
  }, []);

  const staffOptions = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales'].includes(u.role));
  const techOptions = (usersList||[]).filter(u => u.role === 'Equipo Técnico');
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const uniqueOS = [...new Set(students.map(s => s.healthInsurance ? String(s.healthInsurance).toUpperCase().trim() : 'SIN COBERTURA'))].sort();

  // --- FILTRADO ---
  const filteredStudents = students.filter(s => {
    const isStudentActive = s.isActive === undefined || s.isActive === true;
    if (showArchived && isStudentActive) return false; 
    if (!showArchived && !isStudentActive) return false;

    const txt = filterText.toLowerCase();
    const matchText = (s.firstName||'').toLowerCase().includes(txt) || (s.lastName||'').toLowerCase().includes(txt) || (s.dni||'').toString().includes(txt);
    if (!matchText) return false;

    if (filters.level !== 'all' && s.level !== filters.level) return false;
    if (filters.group !== 'all' && s.groupMorning !== filters.group && s.groupAfternoon !== filters.group) return false;
    
    if (filters.teacher !== 'all') {
        const search = filters.teacher.toLowerCase();
        const tM = (s.teacherMorning || '').toLowerCase();
        const tT = (s.teacherAfternoon || '').toLowerCase();
        if (!tM.includes(search) && !tT.includes(search)) return false;
    }

    if (filters.dx !== 'all' && s.dx !== filters.dx) return false;
    if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
    if (filters.journey !== 'all' && s.journey !== filters.journey) return false;
    const currentOS = s.healthInsurance ? String(s.healthInsurance).toUpperCase().trim() : 'SIN COBERTURA';
    if (filters.os !== 'all' && currentOS !== filters.os) return false;
    if (filters.turn === 'Mañana' && !s.groupMorning) return false;
    if (filters.turn === 'Tarde' && !s.groupAfternoon) return false;

    return true;
  });

  // --- ESTADÍSTICAS ---
  const statsResults = students.filter(s => {
     if (s.isActive === false) return false;
     if (statFilters.turn !== 'all') {
         if (statFilters.turn === 'Mañana' && !s.groupMorning) return false;
         if (statFilters.turn === 'Tarde' && !s.groupAfternoon) return false;
     }
     if (statFilters.level !== 'all' && s.level !== statFilters.level) return false;
     if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false;
     if (statFilters.gender !== 'all' && s.gender !== statFilters.gender) return false;
     if (statFilters.journey !== 'all' && s.journey !== statFilters.journey) return false;
     return true;
  });

  // --- UTILS ---
  const getSafeDate = (d) => { if(!d) return ''; try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const getAlertStatus = (inc) => { if(!inc || !inc.length) return {status:'ok', count:0}; const d = new Date(); d.setDate(d.getDate()-15); const r = inc.filter(x => (x.severity==='high'||x.severity==='medium') && new Date(x.date)>=d); return { status: r.length>=5?'danger':r.length>=3?'warning':'ok', count: r.length }; };
  
  // --- HANDLERS ---
  const handlePhotoChange = async (e) => { const f = e.target.files[0]; if(!f) return; setUploading(true); try { const reader = new FileReader(); reader.onload=(ev)=>{const img=new Image(); img.onload=()=>{const c=document.createElement('canvas'); const s=300/img.width; c.width=300; c.height=img.height*s; const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height); setPhotoPreview(c.toDataURL('image/jpeg',0.7)); setUploading(false);}; img.src=ev.target.result;}; reader.readAsDataURL(f); } catch(e){ setUploading(false); } };
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setShowForm(true); };
  const openEdit = (s) => { setEditingStudent(s); setPhotoPreview(s.photoUrl); setViewingStudent(null); setShowForm(true); };
  
  const handleSave = async (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target); 
      const d = Object.fromEntries(fd.entries()); 
      d.isActive = d.isActive === 'true'; 
      d.photoUrl = photoPreview || editingStudent?.photoUrl || ''; 
      try { 
          if (editingStudent) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), d); } 
          else { const newStatus = d.isActive !== undefined ? d.isActive : true; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...d, isActive: newStatus, createdAt: serverTimestamp(), incidents: [] }); } 
          setShowForm(false); setEditingStudent(null); setPhotoPreview(null); 
      } catch (err) { alert("Error: " + err.message); } 
  };
  
  const handleDelete = async (id) => { if(confirm("⚠️ ¿Eliminar definitivamente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setShowForm(false); setEditingStudent(null); } };
  const deleteIncident = async (sid, inc) => { if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); };
  const markAsInactive = async (s) => { if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); setUnassignedList(p=>p.filter(x=>x.id!==s.id)); };
  
  // --- HERRAMIENTA CLAVE: DETECTIVE DE DUPLICADOS 2.0 ---
  const findDuplicates = () => { 
      setProcessing(true); 
      const found = []; 
      const checkedIds = new Set();
      
      const normalize = (str) => (str || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const getKeywords = (s) => (s.firstName + " " + s.lastName).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/).filter(w => w.length > 2);

      const levenshtein = (a, b) => { const matrix = []; for(let i=0; i<=b.length; i++) matrix[i] = [i]; for(let j=0; j<=a.length; j++) matrix[0][j] = j; for(let i=1; i<=b.length; i++){ for(let j=1; j<=a.length; j++){ if(b.charAt(i-1) == a.charAt(j-1)){ matrix[i][j] = matrix[i-1][j-1]; } else { matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1)); } } } return matrix[b.length][a.length]; }; 

      for (let i = 0; i < students.length; i++) { 
          for (let j = i + 1; j < students.length; j++) { 
              const s1 = students[i]; 
              const s2 = students[j]; 
              if(checkedIds.has(s1.id) || checkedIds.has(s2.id)) continue;

              const name1 = normalize(s1.lastName + s1.firstName);
              const name2 = normalize(s2.lastName + s2.firstName);
              
              if (name1 === name2) { found.push({ original: s1, duplicate: s2, type: 'exacto' }); checkedIds.add(s2.id); continue; }
              if (s1.dni && s2.dni && s1.dni === s2.dni) { found.push({ original: s1, duplicate: s2, type: 'dni' }); checkedIds.add(s2.id); continue; }
              if (levenshtein(name1, name2) <= 3) { found.push({ original: s1, duplicate: s2, type: 'similar' }); checkedIds.add(s2.id); continue; }

              const keys1 = getKeywords(s1);
              const keys2 = getKeywords(s2);
              const matches = keys1.filter(k => keys2.includes(k));
              if (matches.length >= 2 && (matches.length === keys1.length || matches.length === keys2.length)) {
                  found.push({ original: s1, duplicate: s2, type: 'palabras' });
                  checkedIds.add(s2.id);
              }
          } 
      } 
      setPotentialDupes(found); 
      setProcessing(false); 
      setShowDataManagement(false); 
      setShowDupes(true); 
  };

  const mergeStudents = async (keep, drop) => { 
      if(!confirm(`⚠️ ¿FUSIONAR?\n\nSe pasará la info faltante de "${drop.firstName}" a "${keep.firstName}" y se borrará el duplicado.`)) return; 
      try { 
          const mergedData = { ...keep, updatedAt: serverTimestamp() }; 
          Object.keys(drop).forEach(key => {
              const valKeep = mergedData[key];
              const valDrop = drop[key];
              if ((valKeep === null || valKeep === undefined || valKeep === "") && (valDrop)) { mergedData[key] = valDrop; }
          });
          if (keep.isActive === false && drop.isActive === true) mergedData.isActive = true;
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', keep.id), mergedData); 
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', drop.id)); 
          setPotentialDupes(prev => prev.filter(p => p.original.id !== keep.id && p.duplicate.id !== drop.id)); 
          alert("✅ Fusión completada."); 
      } catch (e) { alert("Error al fusionar: " + e.message); } 
  };

  const dismissMatch = (index) => {
      const newList = [...potentialDupes];
      newList.splice(index, 1);
      setPotentialDupes(newList);
  };

  const checkUnassigned = () => { const found = students.filter(s => (s.isActive === undefined || s.isActive === true) && !s.groupMorning && !s.groupAfternoon); setUnassignedList(found); setShowDataManagement(false); setShowUnassigned(true); };
  const limpiarEspaciosMasivo = async () => { if (!confirm("⚠️ ¿Limpiar?")) return; setProcessing(true); try { const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const updates = []; snapshot.docs.forEach(docSnap => { const data = docSnap.data(); const cambios = {}; let change = false; ['firstName', 'lastName', 'groupMorning', 'teacherMorning', 'auxMorning'].forEach(c => { if(data[c] && typeof data[c]==='string' && data[c]!==data[c].trim()) { cambios[c]=data[c].trim(); change=true; } }); if(change) updates.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id), cambios)); }); await Promise.all(updates); alert("Listo"); setShowDataManagement(false); } catch(e){ alert(e); } finally { setProcessing(false); } };
  const descargarBackup = () => { if(!confirm("¿Descargar?")) return; const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = "BACKUP.json"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
  const handleBulkImport = async () => { try { if(!importJson.trim()) return alert("Pegá el JSON."); setProcessing(true); const cleanJson = importJson.substring(importJson.indexOf('['), importJson.lastIndexOf(']')+1); const data = JSON.parse(cleanJson); let u=0, c=0; const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const dbS = snap.docs.map(d => ({id:d.id, ...d.data(), k: (d.data().firstName+d.data().lastName).replace(/\s/g,'').toLowerCase()})); for(const s of data) { const k = (s.firstName+s.lastName).replace(/\s/g,'').toLowerCase(); const m = dbS.find(x => x.k===k); if(m) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', m.id), { ...s, updatedAt: serverTimestamp() }); u++; } else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {...s, isActive:true, createdAt:serverTimestamp()}); c++; } } alert(`Listo: ${c} nuevos, ${u} act.`); setShowDataManagement(false); } catch(e){ alert(e); } finally { setProcessing(false); } };
  const handleResetCycle = async () => { if(!confirm("⚠️ ¿ESTÁS SEGURO? ESTO BORRARÁ TODOS LOS ALUMNOS.")) return; setProcessing(true); try { const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const batchSize = 400; let batch = []; for(const docSnap of snap.docs) { batch.push(deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id))); } await Promise.all(batch); alert("Ciclo reiniciado."); setShowDataManagement(false); } catch(e){ alert("Error: "+e.message); } finally { setProcessing(false); } };
  const handleDeleteAll = handleResetCycle; 
  const handleAutoAssignGenders = async () => { if(!confirm("¿Asignar género auto?")) return; setProcessing(true); try { const snap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const updates = []; snap.docs.forEach(docSnap => { const s = docSnap.data(); if(!s.gender){ const name = s.firstName.split(' ')[0].toUpperCase(); let g = 'M'; if(name.endsWith('A')) g = 'F'; updates.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id), {gender: g})); } }); await Promise.all(updates); alert("Listo"); } catch(e){} finally { setProcessing(false); } };

  // --- IMPRESIÓN ---
  const imprimirListado = (list) => { const w = window.open('', '_blank'); if(!w) return alert("Permitir Pop-ups"); let h = `<html><head><title>Fichas</title><style>body{font-family:sans-serif;padding:20px}.card{border:1px solid #ccc;padding:20px;margin-bottom:20px;page-break-after:always}.head{display:flex;justify-content:space-between;border-bottom:2px solid #6d28d9;padding-bottom:10px;margin-bottom:15px}h1{color:#4c1d95;margin:0}img{height:50px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.label{font-size:10px;color:#666;font-weight:bold;text-transform:uppercase}.val{font-weight:bold}</style></head><body>`; list.forEach(s => { h += `<div class="card"><div class="head"><div><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni} - Edad: ${calculateAge(s.birthDate)}</p></div><img src="${LOGO_URL}"/></div><div class="grid"><div><span class="label">Nacimiento</span><div class="val">${getSafeDate(s.birthDate)}</div></div><div><span class="label">Diagnóstico</span><div class="val">${s.dx}</div></div><div><span class="label">Obra Social</span><div class="val">${s.healthInsurance||'-'}</div></div><div><span class="label">CUD Vto</span><div class="val">${getSafeDate(s.cudExpiration)}</div></div></div><br><h3>Escolaridad 2026</h3><div class="grid"><div><span class="label">Nivel</span><div class="val">${s.level||'-'}</div></div><div><span class="label">Jornada</span><div class="val">${s.journey||'-'}</div></div><div><span class="label">Aula</span><div class="val">${s.classroom||'-'}</div></div></div><br><div class="grid"><div><span class="label" style="background:#fef08a;padding:2px;">Turno Mañana</span><div class="val">${s.groupMorning||'-'} (Prof: ${s.teacherMorning||'-'})</div></div><div><span class="label" style="background:#c7d2fe;padding:2px;">Turno Tarde</span><div class="val">${s.groupAfternoon||'-'} (Prof: ${s.teacherAfternoon||'-'})</div></div></div><br><h3>Familia</h3><p><b>Madre:</b> ${s.motherName} (${s.motherContact})</p><p><b>Padre:</b> ${s.fatherName} (${s.fatherContact})</p><p><b>Dirección:</b> ${s.address}</p></div>`; }); h += '</body></html>'; w.document.write(h); w.document.close(); setTimeout(()=>w.print(), 500); };
  const imprimirFichasMasivas = () => { if (filteredStudents.length > 20 && !confirm(`¿Imprimir ${filteredStudents.length} fichas?`)) return; imprimirListado(filteredStudents); };
  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Obra Social"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`, `"${s.healthInsurance}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };

  // --- RENDER ---
  return (
    <div className="animate-in fade-in pb-20">
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived?'bg-gray-600':'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
         <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-4">
             <div><h2 className="text-3xl font-bold flex gap-2 items-center"><GraduationCap/> {showArchived?'Archivo':'Legajos 2026'}</h2><p className="opacity-80 text-sm mt-1">{filteredStudents.length} alumnos encontrados</p></div>
             <div className="flex gap-2 flex-wrap justify-center md:justify-end">
                 <button onClick={()=>setShowArchived(!showArchived)} className="px-3 py-2 border border-white/30 rounded-xl text-xs font-bold uppercase hover:bg-white/10 flex items-center gap-1">{showArchived? <><CheckCircle size={14}/> Activos</> : <><LogOut size={14}/> Bajas</>}</button>
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
                    <select value={filters.os} onChange={e=>setFilters({...filters, os:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Obra Social: Todas</option>{uniqueOS.map(o=><option key={o} value={o}>{o}</option>)}</select>
                    <select value={filters.group} onChange={e=>setFilters({...filters, group:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Grupo: Todos</option>{uniqueGroups.map(g=><option key={g} value={g}>{g}</option>)}</select>
                    <select value={filters.turn} onChange={e=>setFilters({...filters, turn:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                    <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                    <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Docente: Todos</option>{staffOptions.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                    <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                </div>
            </div>
         )}
      </div>
      
      {/* LISTA DE ALUMNOS (ARREGLADO: ETIQUETAS DENTRO DEL LOOP) */}
      <div className="space-y-3">{filteredStudents.map(s => { 
          const alert = getAlertStatus(s.incidents); 
          const age = calculateAge(s.birthDate); 
          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info');}} className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition ${!s.isActive?'border-red-400 opacity-60':alert.status==='danger'?'border-red-500 border-l-4':'border-gray-100'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative">
                        {s.photoUrl?<img src={s.photoUrl} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                        {alert.status!=='ok' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white"></div>}
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName} {s.dx && <span className="bg-purple-100 text-purple-700 text-[9px] px-1.5 py-0.5 rounded border border-purple-200">{s.dx}</span>}</h4>
                        
                        {/* --- AQUÍ ESTÁN LAS ETIQUETAS CORREGIDAS --- */}
                        <div className="flex flex-wrap gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{age} años</span>
                            {(s.groupMorning || s.groupAfternoon) ? (
                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">{[s.groupMorning, s.groupAfternoon].filter(Boolean).join(' / ')}</span>
                            ) : (
                                <span className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded border border-red-100 font-bold">Sin grupo</span>
                            )}
                            {s.classroom && (
                                <span className="text-[10px] bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded border border-yellow-200 font-bold flex items-center gap-1 shadow-sm">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                                    Aula {s.classroom}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Eye className="text-gray-300"/>
            </div> 
          ); 
      })}</div>
      
      {/* MODAL VER ALUMNO */}
      {viewingStudent && !showForm && (<div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"><div className="bg-slate-700 p-6 text-white"><div className="flex justify-between items-start"><div className="flex gap-4"><div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={30} className="m-auto mt-4 text-white/50"/>}</div><div><h2 className="text-xl font-bold uppercase">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><div className="flex gap-2 mt-1"><span className="bg-white/20 px-2 py-0.5 rounded text-xs">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-2 py-0.5 rounded text-xs">{viewingStudent.dni}</span></div></div></div><button onClick={()=>setViewingStudent(null)} className="bg-white/20 p-1 rounded-full hover:bg-white/40"><X/></button></div><div className="flex gap-2 mt-6 bg-slate-800/50 p-1 rounded-xl"><button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white'}`}>Datos Personales</button><button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white'}`}>Bitácora</button></div></div><div className="p-6 overflow-y-auto bg-gray-50">{activeModalTab==='info' ? (
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-4 gap-2"><div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase">Nivel</p><p className="font-bold text-slate-800">{viewingStudent.level || '-'}</p></div><div className="bg-purple-50 p-2 rounded-xl border border-purple-100 text-center shadow-sm"><p className="text-[9px] text-purple-400 font-bold uppercase">DX</p><p className="font-bold text-purple-800">{viewingStudent.dx || '-'}</p></div><div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase">Género</p><p className="font-bold text-slate-800">{viewingStudent.gender || '-'}</p></div><div className="bg-white p-2 rounded-xl border border-gray-100 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase">Jornada</p><p className="font-bold text-slate-800">{viewingStudent.journey || '-'}</p></div></div>
        <div><h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2 text-xs uppercase"><Briefcase size={14} className="text-blue-500"/> Escolaridad 2026</h4><div className="grid grid-cols-2 gap-3"><div className="bg-yellow-50 p-3 rounded-xl border border-yellow-200 relative shadow-sm"><span className="absolute top-0 right-0 bg-yellow-300 text-yellow-900 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">Mañana</span><div className="space-y-2 mt-1"><div><span className="text-[9px] text-yellow-600 font-bold block uppercase">Grupo</span><p className="font-bold text-slate-800 text-xs">{viewingStudent.groupMorning || '-'}</p></div><div><span className="text-[9px] text-yellow-600 font-bold block uppercase">Docente</span><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherMorning || '-'}</p></div></div></div><div className="bg-indigo-50 p-3 rounded-xl border border-indigo-200 relative shadow-sm"><span className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[9px] px-2 py-0.5 rounded-bl-lg font-bold uppercase">Tarde</span><div className="space-y-2 mt-1"><div><span className="text-[9px] text-indigo-500 font-bold block uppercase">Grupo</span><p className="font-bold text-slate-800 text-xs">{viewingStudent.groupAfternoon || '-'}</p></div><div><span className="text-[9px] text-indigo-500 font-bold block uppercase">Docente</span><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherAfternoon || '-'}</p></div></div></div></div></div>
        <div className="grid grid-cols-1 gap-3"><div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex justify-between items-center"><div><h4 className="font-bold text-green-600 mb-1 text-xs uppercase flex items-center gap-1"><Activity size={12}/> Salud</h4><p className="text-xs text-gray-500 font-bold">OBRA SOCIAL</p><p className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</p></div><div className="text-right"><p className="text-xs text-gray-500 font-bold">VENCIMIENTO CUD</p><p className="font-bold text-slate-800">{getSafeDate(viewingStudent.cudExpiration) || '-'}</p></div></div><div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 mb-2 text-xs uppercase flex items-center gap-1"><User size={12}/> Familia</h4><div className="grid grid-cols-2 gap-4"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><p className="font-bold text-xs">{viewingStudent.motherName}</p><p className="text-xs text-gray-500">{viewingStudent.motherContact}</p></div><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><p className="font-bold text-xs">{viewingStudent.fatherName}</p><p className="text-xs text-gray-500">{viewingStudent.fatherContact}</p></div></div><div className="mt-2 pt-2 border-t border-gray-50"><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs">{viewingStudent.address}</p></div></div></div>
      </div>) : (<div className="space-y-3">{viewingStudent.incidents?.map((inc,i)=>(<div key={i} className="bg-white p-3 rounded-xl border border-gray-100 shadow-sm"><div className="flex justify-between border-b border-gray-50 pb-1 mb-1"><span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{new Date(inc.date).toLocaleDateString()}</span><button onClick={()=>deleteIncident(viewingStudent.id, inc)}><Trash2 size={12} className="text-red-300 hover:text-red-500"/></button></div><p className="font-bold text-sm text-slate-700">{inc.type}</p><p className="text-xs text-gray-400 mt-1 uppercase font-bold">{inc.author}</p></div>))}</div>)}</div><div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2"><button onClick={()=>imprimirListado([viewingStudent])} className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir Ficha</button><button onClick={()=>openEdit(viewingStudent)} className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button></div></div></div>)}

      {/* MODAL GESTIÓN DE DATOS (NUBE) */}
      {showDataManagement && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[80]"><div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl"><div className="flex justify-between mb-4"><h3 className="font-bold text-xl text-gray-800">Gestión de Datos</h3><button onClick={()=>setShowDataManagement(false)}><X/></button></div><div className="grid grid-cols-2 gap-3 mb-6"><button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200">🔍 Buscar Duplicados</button><button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200">⚠️ Ver Sin Grupo</button><button onClick={limpiarEspaciosMasivo} className="p-3 bg-indigo-50 text-indigo-700 rounded-xl font-bold text-xs hover:bg-indigo-100 border border-indigo-200 col-span-2">✨ Limpiar Espacios en Nombres</button></div><div className="bg-gray-100 p-4 rounded-xl border border-gray-200 mb-6 opacity-70 hover:opacity-100 transition"><h4 className="font-bold text-gray-600 text-sm mb-2">Zona Peligrosa</h4><div className="flex gap-2"><button onClick={handleResetCycle} disabled={processing} className="flex-1 bg-white border border-gray-300 text-gray-500 font-bold py-2 rounded-lg text-xs hover:bg-gray-200">Reiniciar Ciclo</button><button onClick={handleDeleteAll} disabled={processing} className="flex-1 bg-white border border-gray-300 text-red-500 font-bold py-2 rounded-lg text-xs hover:bg-red-50">Borrar TODO</button></div></div><h4 className="font-bold text-gray-800 text-sm mb-2">Importar / Exportar</h4><div className="flex gap-2 mb-2"><button onClick={descargarBackup} className="flex-1 py-2 bg-white border rounded-lg text-xs font-bold">Descargar JSON</button><button onClick={handleBulkImport} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold">Importar JSON</button></div><textarea value={importJson} onChange={e=>setImportJson(e.target.value)} placeholder="Pegar JSON aquí..." className="w-full p-2 text-xs border rounded-lg h-20"/><div className="flex gap-3 mt-4"><button onClick={handleAutoAssignGenders} disabled={processing} className="flex-1 py-3 text-blue-600 font-bold bg-blue-50 hover:bg-blue-100 rounded-xl text-xs">Auto-Género</button></div></div></div>)}

      {/* MODAL DUPLICADOS (CON BOTÓN "X") */}
      {showDupes && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]"><div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col"><div className="flex justify-between mb-4"><h3 className="font-bold">Posibles Duplicados ({potentialDupes.length})</h3><button onClick={()=>setShowDupes(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{potentialDupes.length === 0 ? <p className="text-gray-400 text-center mt-10">No se encontraron duplicados.</p> : potentialDupes.map((d,i)=>(<div key={i} className="flex gap-2 items-center bg-gray-50 p-3 rounded-xl border border-gray-200"><div className="flex-1"><p className="font-bold text-sm text-blue-700 uppercase">{d.original.lastName}, {d.original.firstName}</p><p className="text-xs text-gray-500">Origen: {d.original.groupMorning || 'Sin grupo'} (Edad: {calculateAge(d.original.birthDate)})</p></div><div className="flex-1"><p className="font-bold text-sm text-red-700 uppercase">{d.duplicate.lastName}, {d.duplicate.firstName}</p><p className="text-xs text-gray-500">Duplicado: {d.duplicate.groupMorning || 'Sin grupo'} (Edad: {calculateAge(d.duplicate.birthDate)})</p></div><div className="flex gap-2 shrink-0"><button onClick={()=>mergeStudents(d.original, d.duplicate)} className="px-4 py-2 bg-green-500 text-white rounded-xl font-bold text-xs shadow-lg hover:bg-green-600 transition">FUSIONAR</button><button onClick={()=>dismissMatch(i)} className="p-2 bg-gray-200 text-gray-500 rounded-xl hover:bg-red-100 hover:text-red-500 transition"><X size={16}/></button></div></div>))}</div></div></div>)}

      {/* FORMULARIO EDITAR + ESTADÍSTICAS + OTROS MODALES (SE MANTIENEN IGUAL) */}
      {showStats && (<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600"><div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3><p className="text-xs text-gray-500">Filtrado en tiempo real</p></div><button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button></div><div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner"><span className="text-5xl font-black text-violet-600 block mb-2">{statsResults.length}</span><span className="text-xs font-bold text-violet-400 uppercase tracking-[4px]">Estudiantes Encontrados</span></div><div className="space-y-3"><div className="grid grid-cols-2 gap-2"><select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select><select value={statFilters.level} onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select><select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select><select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select><select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select></div><button onClick={() => setStatFilters({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' })} className="w-full py-3 text-red-400 font-bold text-xs hover:bg-red-50 rounded-xl transition mt-2">Limpiar Filtros</button></div></div></div>)}
      {showUnassigned && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]"><div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col"><div className="flex justify-between mb-4"><h3 className="font-bold text-red-600">Alumnos Sin Grupo ({unassignedList.length})</h3><button onClick={()=>setShowUnassigned(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{unassignedList.map(s=>(<div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl"><span className="font-bold">{s.lastName}, {s.firstName}</span><div className="flex gap-2"><button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button><button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button></div></div>))}</div></div></div>)}
      {showForm && (<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-4">{editingStudent?'Editar':'Nuevo'} Legajo</h3><form onSubmit={handleSave} className="space-y-4"><div className={`p-3 rounded-xl border mb-4 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}><div><label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label><p className="text-[10px] text-gray-500 font-bold">{editingStudent?.isActive === false ? '🛑 BAJA / INACTIVO' : '✅ ACTIVO (CURSANDO)'}</p></div><select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none"><option value="true">Activo</option><option value="false">Inactivo (Baja)</option></select></div><div className="grid grid-cols-2 gap-3"><input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/></div><div className="grid grid-cols-2 gap-3"><input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500"/></div><div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-2"><p className="text-xs font-bold text-blue-800 uppercase">Institucional</p><div className="grid grid-cols-2 gap-2"><select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold"><option value="">Nivel...</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select><select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold"><option value="">DX...</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div><div className="grid grid-cols-2 gap-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs"/><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs"/></div><div className="grid grid-cols-2 gap-2"><select name="teacherMorning" defaultValue={editingStudent?.teacherMorning} className="p-2 rounded-lg border text-xs"><option value="">Docente TM...</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon} className="p-2 rounded-lg border text-xs"><option value="">Docente TT...</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><select name="auxMorning" defaultValue={editingStudent?.auxMorning} className="p-2 rounded-lg border text-xs"><option value="">Auxiliar TM...</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="auxAfternoon" defaultValue={editingStudent?.auxAfternoon} className="p-2 rounded-lg border text-xs"><option value="">Auxiliar TT...</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><select name="sup1Morning" defaultValue={editingStudent?.sup1Morning} className="p-2 rounded-lg border text-xs text-violet-700 font-bold"><option value="">Sup. 1 TM...</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="sup2Morning" defaultValue={editingStudent?.sup2Morning} className="p-2 rounded-lg border text-xs text-violet-700 font-bold"><option value="">Sup. 2 TM...</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="grid grid-cols-2 gap-2"><select name="sup1Afternoon" defaultValue={editingStudent?.sup1Afternoon} className="p-2 rounded-lg border text-xs text-violet-700 font-bold"><option value="">Sup. 1 TT...</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="sup2Afternoon" defaultValue={editingStudent?.sup2Afternoon} className="p-2 rounded-lg border text-xs text-violet-700 font-bold"><option value="">Sup. 2 TT...</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div><div className="p-3 bg-green-50 rounded-xl border border-green-100 space-y-2"><p className="text-xs font-bold text-green-800 uppercase">Salud y Familia</p><div className="grid grid-cols-2 gap-2"><input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs"/><input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500"/></div><input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs" placeholder="Dirección"/><div className="grid grid-cols-2 gap-2"><input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs"/><input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs"/></div><div className="grid grid-cols-2 gap-2"><input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs"/><input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="w-full p-2 rounded-lg border text-xs"/></div></div><div className="flex gap-2 pt-4 border-t"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20}/></button>}</div></form></div></div>)}
    </div>
  );
}
// --- APP PRINCIPAL (FIX NOTIFICACIONES + SCROLL GLOBAL) ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  
  // Datos
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

  const prevNotifCount = useRef(0);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';
  // IMPORTANTE: Quitamos 'dashboard' de isWideTab para que no se ensanche de más, pero controlamos el scroll
  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users'].includes(activeTab);

  useEffect(() => {
    if (user?.id) updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { lastLogin: serverTimestamp() }).catch(()=>{});

    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubResources = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    // SUSCRIPCIÓN A NOTIFICACIONES ROBUSTA
    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => { 
        const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        d.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); 
        const unread = d.filter(n=>!n.read);
        
        setNotifications(unread);

        // Si hay más notificaciones que antes, disparar alerta
        if (unread.length > prevNotifCount.current) {
            const latest = unread[0];
            if (latest) {
                // Notificación Nativa
                if ("Notification" in window && Notification.permission === "granted") {
                    new Notification(`🔔 ${latest.title}`, { body: latest.message, icon: LOGO_URL });
                }
                // Sonido
                try { new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{}); } catch(e){}
            }
        }
        prevNotifCount.current = unread.length;
    });

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); };
  }, [user.id]);

  const handleGlobalSearch = async (text) => { setSearchQuery(text); if (text.length < 2) { setSearchResults([]); return; } const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students')); const s = await getDocs(q); const r = s.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => (s.isActive===undefined || s.isActive) && (s.firstName.toLowerCase().includes(text.toLowerCase()) || s.lastName.toLowerCase().includes(text.toLowerCase()))); setSearchResults(r.slice(0, 5)); };
  const handleNotificationClick = async (n) => { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id)); if (n.targetTab) setActiveTab(n.targetTab); setShowNotifPanel(false); };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      {/* --- PARCHE CSS GLOBAL: OCULTA BARRAS, PERMITE SCROLL --- */}
      <style>{`
        *::-webkit-scrollbar {
          display: none;
        }
        * {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3"><img src={LOGO_URL} alt="Logo" className="w-10 h-8 object-contain" /><div><h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p></div></div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button>
          <div className="relative"><button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}><Bell size={20} />{notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}</button>{showNotifPanel && (<div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]"><div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div><div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-10 text-center text-gray-400"><p className="text-xs font-bold uppercase">Sin novedades</p></div>:notifications.map(n=>(<div key={n.id} onClick={()=>handleNotificationClick(n)} className="p-4 border-b hover:bg-gray-50 cursor-pointer"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}</div></div>)}</div>
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">{user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}</div>
        </div>
      </header>

      {/* SCROLL GLOBAL ARREGLADO */}
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

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe">
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
    </div>
  );
}
// --- VISTA AULA (MODIFICADA: SCROLL INFINITO HACIA ABAJO EN PC) ---
function GroupsView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [savingIncident, setSavingIncident] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  
  // Estado para editar grupo
  const [editingGroup, setEditingGroup] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración'].includes(user.role) || user.rol === 'admin';
  const LOGO_URL = "/icon-192.png";
  const INCIDENT_TYPES = [ { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" }, { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" }, { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" }, { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-red-100 border-red-300 text-red-800" }, { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" }, { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" }, { label: "Vómito", emoji: "🤮", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" }, { label: "Golpe / Caída", emoji: "🤕", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" }, { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" }, { label: "Durmió en clase", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" }, { label: "Sin Medicación", emoji: "💊", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" }, { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" }, ];

  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => { unsubS(); unsubU(); };
  }, []);

  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico');

  const groupedData = students.reduce((acc, s) => {
      const groupName = turn === 'morning' ? s.groupMorning : s.groupAfternoon;
      if (!groupName) return acc;
      
      const key = groupName.trim(); 
      const myTeacher = turn === 'morning' ? s.teacherMorning : s.teacherAfternoon;
      const myAux = turn === 'morning' ? s.auxMorning : s.auxAfternoon;
      const mySup1 = turn === 'morning' ? s.sup1Morning : s.sup1Afternoon;
      const mySup2 = turn === 'morning' ? s.sup2Morning : s.sup2Afternoon;

      if (!acc[key]) { 
          acc[key] = { 
              name: key, 
              students: [], 
              teacher: myTeacher, 
              aux: myAux, 
              sup1: mySup1, 
              sup2: mySup2,
              classroom: s.classroom, 
              level: s.level 
          }; 
      }
      if (!acc[key].teacher && myTeacher) acc[key].teacher = myTeacher;
      if (!acc[key].aux && myAux) acc[key].aux = myAux;
      if (!acc[key].sup1 && mySup1) acc[key].sup1 = mySup1;
      if (!acc[key].sup2 && mySup2) acc[key].sup2 = mySup2;

      acc[key].students.push(s);
      return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

  if (!isManagement) {
      const myName = (user.fullName || "").toLowerCase();
      groups = groups.filter(g => {
          if ((g.teacher || "").toLowerCase().includes(myName)) return true;
          if ((g.aux || "").toLowerCase().includes(myName)) return true;
          return g.students.some(s => {
             const t = turn === 'morning' ? s.teacherMorning : s.teacherAfternoon;
             const a = turn === 'morning' ? s.auxMorning : s.auxAfternoon;
             return (t || "").toLowerCase().includes(myName) || (a || "").toLowerCase().includes(myName);
          });
      });
  }

  // --- FUNCIÓN DE IMPRESIÓN (La misma corregida de antes) ---
  const handlePrintSingleGroup = (g) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Por favor, permite ventanas emergentes.");
    const turnoTexto = turn === 'morning' ? 'MAÑANA' : 'TARDE';
    const fecha = new Date().toLocaleDateString('es-AR');
    const sortedStudents = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));

    let content = `<!DOCTYPE html><html><head><title>Lista ${g.name}</title><style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');*{ -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }body{font-family:'Roboto',sans-serif;padding:40px;color:#333;}.header{border-bottom:4px solid #7c3aed;padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:center;}.title{font-size:28px;font-weight:900;color:#4c1d95;text-transform:uppercase;margin:0;line-height:1;}.subtitle{font-size:14px;font-weight:bold;color:#666;margin-top:5px;text-transform:uppercase;letter-spacing:1px;}.info-card{background-color:#f3f4f6;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:25px;display:flex;justify-content:space-between;font-size:12px;}.info-col strong{color:#7c3aed;text-transform:uppercase;font-size:10px;display:block;margin-bottom:2px;}.info-col p{margin:0 0 10px 0;font-weight:bold;font-size:14px;}table{width:100%;border-collapse:collapse;font-size:12px;}thead tr{background-color:#7c3aed!important;color:white!important;}th{padding:12px 8px;text-align:left;text-transform:uppercase;font-size:10px;letter-spacing:0.5px;}td{border-bottom:1px solid #e5e7eb;padding:10px 8px;}tr:nth-child(even){background-color:#f9fafb!important;}.footer{margin-top:40px;text-align:right;font-size:10px;color:#9ca3af;border-top:1px dashed #e5e7eb;padding-top:10px;}.badge{display:inline-block;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:bold;background:#eee;}</style></head><body><div class="header"><div><h1 class="title">Grupo: ${g.name}</h1><p class="subtitle">Turno ${turnoTexto} • Ciclo 2026</p></div><img src="${LOGO_URL}" style="height:50px;opacity:0.8;"/></div><div class="info-card"><div class="info-col"><strong>Docente a Cargo</strong><p>${g.teacher||'Sin asignar'}</p><strong>Auxiliar / Preceptor</strong><p>${g.aux||'Sin asignar'}</p></div><div class="info-col" style="text-align:right;"><strong>Aula Física</strong><p>${g.classroom||'-'}</p><strong>Nivel</strong><p>${g.level||'-'}</p></div></div><table><thead><tr><th style="width:40px;">#</th><th>Apellido y Nombre</th><th>DNI</th><th>Fecha Nac.</th><th>Edad</th></tr></thead><tbody>`;
   sortedStudents.forEach((s, index) => {
        const birth = s.birthDate ? new Date(s.birthDate + 'T00:00').toLocaleDateString('es-AR') : '-';
        const today = new Date();
        const dob = new Date(s.birthDate + 'T00:00');
        let age = '-';
        if(s.birthDate) {
            age = today.getFullYear() - dob.getFullYear();
            const m = today.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
        }

        content += `
              <tr>
                <td style="color: #7c3aed; font-weight: bold;">${index + 1}</td>
                <td>
                    <span style="font-weight: 900; text-transform: uppercase;">${s.lastName}</span>, ${s.firstName}
                </td>
                <td>${s.dni || '-'}</td>
                <td>${birth}</td>
                <td><strong>${age}</strong></td>
              </tr>
        `;
    });
    content += `</tbody></table><div class="footer">Reporte generado automáticamente el ${fecha} • Juntos a la Par</div></body></html>`;
    printWindow.document.write(content); printWindow.document.close(); setTimeout(() => { printWindow.focus(); printWindow.print(); }, 500);
  };

  const handleUpdateGroup = async (e) => {
      e.preventDefault();
      if (!editingGroup) return;
      if (!confirm(`⚠️ ¿Estás seguro?\n\nEsto actualizará a ${editingGroup.students.length} alumnos.`)) return;
      setUpdatingGroup(true);
      const fd = new FormData(e.target);
      const updates = {};
      
      if (turn === 'morning') {
          updates.teacherMorning = fd.get('teacher'); updates.auxMorning = fd.get('aux'); updates.sup1Morning = fd.get('sup1'); updates.sup2Morning = fd.get('sup2'); updates.groupMorning = fd.get('groupName'); 
      } else {
          updates.teacherAfternoon = fd.get('teacher'); updates.auxAfternoon = fd.get('aux'); updates.sup1Afternoon = fd.get('sup1'); updates.sup2Afternoon = fd.get('sup2'); updates.groupAfternoon = fd.get('groupName');
      }
      updates.classroom = fd.get('classroom'); updates.updatedAt = serverTimestamp();
      try {
          const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates));
          await Promise.all(promises);
          alert("✅ Grupo actualizado correctamente."); setEditingGroup(null);
      } catch (err) { alert("Error: " + err.message); } finally { setUpdatingGroup(false); }
  };

  const handleSaveIncident = async (type, severity) => { if (!showBitacoraModal) return; setSavingIncident(true); try { const incidentData = { type, severity, date: new Date().toISOString(), author: user.fullName || user.firstName, authorId: user.id }; const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id); await updateDoc(studentRef, { incidents: arrayUnion(incidentData), lastIncident: incidentData.date, lastIncidentType: type }); alert("✅ Registro guardado"); setShowBitacoraModal(null); } catch (e) { console.error(e); } finally { setSavingIncident(false); } };
  const calculateAge = (dateString) => { if (!dateString) return '-'; const today = new Date(); const birthDate = new Date(dateString); let age = today.getFullYear() - birthDate.getFullYear(); const m = today.getMonth() - birthDate.getMonth(); if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--; return age; };

  // --- REEMPLAZAR FUNCIÓN handlePrintAll ---
  const handlePrintAll = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return alert("Permitir ventanas emergentes");
    
    const turnoTexto = turn === 'morning' ? 'MAÑANA' : 'TARDE';
    const fecha = new Date().toLocaleDateString('es-AR');

    let content = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Listado Completo - Turno ${turnoTexto}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
          body { font-family: 'Roboto', sans-serif; padding: 20px; color: #333; background: white; }
          
          /* ESTILOS DE LA TARJETA (Iguales a la individual) */
          .page-container {
             page-break-after: always; /* ESTO SEPARA CADA GRUPO EN UNA HOJA */
             margin-bottom: 50px;
             display: block;
          }
          .page-container:last-child { page-break-after: auto; }

          .header { border-bottom: 4px solid #7c3aed; padding-bottom: 10px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .title { font-size: 24px; font-weight: 900; color: #4c1d95; text-transform: uppercase; margin: 0; }
          .subtitle { font-size: 12px; font-weight: bold; color: #666; margin-top: 5px; text-transform: uppercase; letter-spacing: 1px; }
          
          .info-card { background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 11px; }
          .info-col strong { color: #7c3aed; text-transform: uppercase; font-size: 9px; display: block; margin-bottom: 2px; }
          .info-col p { margin: 0 0 5px 0; font-weight: bold; font-size: 12px; }

          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          thead tr { background-color: #7c3aed !important; color: white !important; }
          th { padding: 8px; text-align: left; text-transform: uppercase; font-size: 9px; }
          td { border-bottom: 1px solid #e5e7eb; padding: 8px; }
          tr:nth-child(even) { background-color: #f9fafb !important; }
          
          .footer { text-align: right; font-size: 9px; color: #9ca3af; border-top: 1px dashed #e5e7eb; padding-top: 5px; margin-top: 20px; }
        </style>
      </head>
      <body>
    `;

    // RECORREMOS CADA GRUPO
    groups.forEach(g => {
        // Ordenamos alumnos
        const sortedStudents = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));

        content += `
        <div class="page-container">
          <div class="header">
            <div>
              <h1 class="title">${g.name}</h1>
              <p class="subtitle">Turno ${turnoTexto} • Ciclo 2026</p>
            </div>
            <img src="${LOGO_URL}" style="height: 40px; opacity: 0.8;" />
          </div>

          <div class="info-card">
            <div class="info-col">
              <strong>Docente</strong> <p>${g.teacher || 'Sin asignar'}</p>
              <strong>Auxiliar</strong> <p>${g.aux || 'Sin asignar'}</p>
            </div>
            <div class="info-col" style="text-align: right;">
              <strong>Aula</strong> <p>${g.classroom || '-'}</p>
              <strong>Cant. Alumnos</strong> <p>${g.students.length}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Apellido y Nombre</th>
                <th>DNI</th>
                <th>Fecha Nac.</th>
                <th>Edad</th>
              </tr>
            </thead>
            <tbody>
        `;

        sortedStudents.forEach((s, index) => {
            const birth = s.birthDate ? new Date(s.birthDate + 'T00:00').toLocaleDateString('es-AR') : '-';
            const today = new Date(); const dob = new Date(s.birthDate + 'T00:00'); let age = '-';
            if(s.birthDate) { age = today.getFullYear() - dob.getFullYear(); const m = today.getMonth() - dob.getMonth(); if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--; }
            
            content += `
              <tr>
                <td style="color: #7c3aed; font-weight: bold;">${index + 1}</td>
                <td><span style="font-weight: 900; text-transform: uppercase;">${s.lastName}</span>, ${s.firstName}</td>
                <td>${s.dni || '-'}</td>
                <td>${birth}</td>
                <td><strong>${age}</strong></td>
              </tr>
            `;
        });

        content += `
            </tbody>
          </table>
          <div class="footer">Juntos a la Par • Generado el ${fecha}</div>
        </div> 
        `; // Fin del page-container
    });

    content += `</body></html>`;
    
    printWindow.document.write(content); 
    printWindow.document.close(); 
    setTimeout(() => { printWindow.focus(); printWindow.print(); }, 1000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
      {/* HEADER DE GRUPOS */}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div><h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2><p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p></div>
              {isManagement && <button onClick={handlePrintAll} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}
          </div>
          <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
              <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
          </div>
      </div>
      
      {/* CAMBIOS CLAVE AQUÍ PARA EL SCROLL:
         1. h-full -> md:h-auto (Para que la altura no esté bloqueada en PC)
         2. items-start (Para que las columnas no se estiren innecesariamente)
      */}
      <div className="flex-1 overflow-x-auto p-6">
        <div className="flex gap-6 h-full md:h-auto items-start">
            {groups.length === 0 && (<div className="m-auto text-center opacity-50"><LayoutDashboard size={48} className="mx-auto mb-2 text-gray-300"/><p className="font-bold text-gray-400">No tienes grupos en este turno.</p></div>)} 
            
            {groups.map((g) => (
                /* CAMBIO AQUÍ: 
                   h-full -> h-[calc(100vh-220px)] md:h-fit 
                   (En móvil altura fija, en PC altura ajustable al contenido)
                */
                <div key={g.name} className="min-w-[280px] w-[300px] flex flex-col h-[calc(100vh-220px)] md:h-fit bg-white rounded-[30px] border border-gray-200 shadow-sm relative overflow-hidden group-hover:shadow-md transition shrink-0">
                  <div className={`p-4 border-b-4 ${turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50'} relative`}>
                      <div className="absolute top-2 right-2 flex gap-1">
                          <button onClick={()=>handlePrintSingleGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition" title="Imprimir Lista"><Printer size={14}/></button>
                          {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition" title="Editar Grupo"><Edit3 size={14}/></button>}
                      </div>
                      <h3 className="font-black text-gray-800 text-lg">{g.name}</h3>
                      <div className="mt-2 text-xs text-gray-500 font-medium space-y-1">
                          <p>DOC: <span className="font-bold text-violet-700 uppercase">{g.teacher || 'Sin asignar'}</span></p>
                          {g.aux && <p>AUX: <span className="font-bold uppercase">{g.aux}</span></p>}
                          {(g.sup1 || g.sup2) && <p className="text-violet-600 font-bold truncate">SUP: {g.sup1 || ''} {g.sup2 ? `& ${g.sup2}` : ''}</p>}
                          {g.classroom && <p className="inline-flex items-center gap-1 bg-white/50 px-2 rounded-md"><StartIcon size={10}/> Aula {g.classroom}</p>}
                      </div>
                  </div>
                  
                  {/* CAMBIO AQUÍ: 
                     overflow-y-auto -> md:overflow-visible 
                     (Quitamos scroll interno en PC)
                  */}
                  <div className="flex-1 overflow-y-auto md:overflow-visible p-3 space-y-3 bg-gray-50">
                    {g.students.map(s => (
                        <div key={s.id} onClick={() => {setSelectedStudent(s); setActiveTab('info');}} className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition">
                            <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center w-full h-full font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                            <div><h4 className="font-bold text-gray-700 text-sm">{s.firstName} {s.lastName}</h4></div>
                            <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s);}} className="ml-auto w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition">⚡</button>
                        </div>
                    ))}
                  </div>
              </div>
          ))}
        </div>
      </div>

      {/* MODAL EDICIÓN */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
            <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3>
                    <button type="button" onClick={()=>setEditingGroup(null)}><X/></button>
                </div>
                <div className="space-y-4">
                    <div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center">
                        <p className="text-xs text-violet-500 font-bold uppercase mb-1">Editando Turno {turn === 'morning' ? 'Mañana' : 'Tarde'}</p>
                        <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200 focus:border-violet-500" placeholder="Nombre Grupo"/>
                    </div>
                    <div><label className="text-xs font-bold text-gray-500 ml-1">Docente a Cargo</label><select name="teacher" defaultValue={editingGroup.teacher} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-gray-500 ml-1">Auxiliar / Preceptor</label><select name="aux" defaultValue={editingGroup.aux} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                    <div><label className="text-xs font-bold text-gray-500 ml-1">Aula Física</label><input name="classroom" defaultValue={editingGroup.classroom} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" placeholder="Ej: 5"/></div>
                    <div className="grid grid-cols-2 gap-3">
                         <div><label className="text-xs font-bold text-gray-500 ml-1">Supervisor 1</label><select name="sup1" defaultValue={editingGroup.sup1} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                         <div><label className="text-xs font-bold text-gray-500 ml-1">Supervisor 2</label><select name="sup2" defaultValue={editingGroup.sup2} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
                    </div>
                    <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition flex justify-center items-center gap-2">{updatingGroup ? <RefreshCw className="animate-spin"/> : 'Aplicar a Todos'}</button>
                </div>
            </form>
        </div>
      )}

      {/* BITÁCORA Y MODAL ALUMNO (IGUAL QUE ANTES) */}
      {showBitacoraModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600"><div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div><div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-1">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? 'opacity-50' : 'hover:brightness-95'}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div></div></div>)}
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























































