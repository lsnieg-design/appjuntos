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
// --- VISTA DASHBOARD (MANUAL COMPLETO: AULA + RECURSOS + PROYECTO) ---
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
  
  // ESTADO DEL MANUAL
  const [tutorialTab, setTutorialTab] = useState('inicio'); 

  const canPost = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión'].includes(user.rol || user.role);
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  const INCLUSION_ROLES = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];
  const SEDE_ROLES = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'];
  const isInclusionStaff = INCLUSION_ROLES.includes(user.role);
  const isSedeStaff = SEDE_ROLES.includes(user.role);

  // Contador de tareas
  const myPendingTasksCount = tasks.filter(t => {
      if (t.status === 'completed') return false;
      const scheduledTime = new Date(`${t.showDate || '2000-01-01'}T${t.showTime || '00:00'}`);
      if (scheduledTime > new Date()) return false; 
      if (isSuperAdmin) return true;
      if (t.createdById === user.id) return true;
      if (t.targetType === 'user' && t.targetUserId === user.id) return true;
      if (t.targetType === 'roles' && t.targetRoles && user.role && t.targetRoles.some(r => r.toLowerCase() === user.role.toLowerCase())) return true;
      return false;
  }).length;

  useEffect(() => {
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.done - b.done)));
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const today = new Date(); const nextWeek = new Date(); nextWeek.setDate(today.getDate() + 7); let noGroupCounter = 0;
        const upcoming = snap.docs.map(d => { const data = d.data(); if (!data.groupMorning && !data.groupAfternoon && !data.daiMorning && !data.daiAfternoon) noGroupCounter++; if(!data.birthDate) return null; const dob = new Date(data.birthDate + 'T00:00:00'); const currentYearBirth = new Date(today.getFullYear(), dob.getMonth(), dob.getDate()); if (currentYearBirth < today.setHours(0,0,0,0)) currentYearBirth.setFullYear(today.getFullYear() + 1); return { ...data, id: d.id, nextBirthday: currentYearBirth }; }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday); setBirthdays(upcoming); setUngroupedCount(noGroupCounter);
    });
    return () => { unsubNotes(); unsubStudents(); };
  }, [user.id]);

  const handlePost = async (e) => { e.preventDefault(); const text = e.target.message.value; const channel = e.target.channel?.value || 'general'; if(!text.trim()) return; try { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { message: text, author: user.fullName || user.firstName, authorId: user.id, role: user.role, channel: channel, createdAt: serverTimestamp() }); setShowAnnounceModal(false); } catch(e) { alert("Error: " + e.message); } };
  const deleteAnnouncement = async (id) => { if(confirm("¿Borrar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id)); };
  const saveNote = async (e) => { e.preventDefault(); if (!newNote.trim()) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); setNewNote(''); };
  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
  
  const visibleAnnouncements = announcements.filter(a => { if (isSuperAdmin) return true; if (a.authorId === user.id) return true; if (!a.channel || a.channel === 'general') return true; if (a.channel === 'inclusion' && isInclusionStaff) return true; if (a.channel === 'sede' && isSedeStaff) return true; return false; });

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center px-2"><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter italic">¡Hola, {user.firstName}! 👋</h2><p className="text-slate-500 font-medium text-xs">Panel de Control</p></div><div className="flex gap-2"><button onClick={() => setShowTutorial(true)} className="bg-white text-violet-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm border border-violet-100 flex items-center gap-1 hover:bg-violet-50 transition"><HelpCircle size={16}/> Ayuda</button>{canPost && <button onClick={() => setShowAnnounceModal(true)} className="bg-orange-500 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-lg hover:scale-105 transition flex items-center gap-1"><Edit3 size={14}/> Aviso</button>}</div></div>
      {isManagement && ungroupedCount > 0 && (<div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-xl flex items-center justify-between shadow-sm animate-pulse"><div className="flex items-center gap-3"><AlertTriangle className="text-red-500" size={24} /><div><h4 className="font-black text-red-700 text-xs uppercase tracking-widest">Atención Administrativa</h4><p className="text-xs text-red-600 font-bold">Hay {ungroupedCount} estudiantes activos sin grupo asignado.</p></div></div></div>)}
      {birthdays.length > 0 && (<button onClick={() => setShowBirthdayModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-95 transition"><div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><Crown size={20} className="text-white"/></div><div className="text-left"><h3 className="font-bold text-sm uppercase tracking-widest">¡Hay Cumpleaños!</h3><p className="text-xs opacity-90">{birthdays.length} festejos esta semana</p></div></div><ChevronRight size={20}/></button>)}
      
      {visibleAnnouncements.length > 0 && (<div className="bg-yellow-100 p-5 rounded-[30px] border-2 border-yellow-200 shadow-sm relative"><h3 className="text-[10px] font-black text-yellow-700 uppercase tracking-widest flex items-center gap-1 mb-3"><Bell size={12}/> Cartelera Oficial</h3><div className="space-y-3">{visibleAnnouncements.map(a => (<div key={a.id} className="bg-white/80 p-3 rounded-2xl border border-yellow-200/50 text-sm text-gray-800 flex justify-between items-start"><div>{a.channel === 'inclusion' && <span className="bg-indigo-100 text-indigo-700 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-indigo-200">Canal Inclusión</span>}{a.channel === 'sede' && <span className="bg-orange-100 text-orange-700 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-orange-200">Canal Sede</span>}{(a.channel === 'general' || !a.channel) && <span className="bg-gray-100 text-gray-500 text-[8px] px-1.5 py-0.5 rounded uppercase font-bold mb-1 inline-block border border-gray-200">General</span>}<p className="italic font-medium">"{a.message}"</p><p className="text-[9px] text-yellow-600 font-bold mt-1 uppercase tracking-wider">- {a.author}</p></div>{(canPost || a.authorId === user.id) && (<button onClick={() => deleteAnnouncement(a.id)} className="text-yellow-600 hover:text-red-500 p-1 bg-yellow-50 rounded-lg transition"><Trash2 size={14}/></button>)}</div>))}</div></div>)}
      <div className="grid grid-cols-2 gap-3"><div onClick={() => setActiveTab('tasks')} className="bg-white p-5 rounded-[30px] border border-orange-100 shadow-sm cursor-pointer hover:shadow-md transition"><h4 className="text-3xl font-black text-orange-500">{myPendingTasksCount}</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Tareas Pendientes</p></div><div onClick={() => setActiveTab('calendar')} className={`p-5 rounded-[30px] border shadow-sm relative overflow-hidden cursor-pointer hover:shadow-md transition ${todayEvents.length > 0 ? 'bg-violet-600 text-white border-violet-600' : 'bg-white border-violet-100'}`}>{todayEvents.length > 0 ? ( <><h4 className="text-lg font-black leading-tight mb-1">{todayEvents[0].title}</h4><p className="text-[9px] opacity-80 uppercase tracking-widest font-bold">Es Hoy</p></> ) : ( <><h4 className="text-3xl font-black text-violet-600">0</h4><p className="text-[9px] font-bold uppercase text-gray-400 tracking-widest">Eventos Hoy</p></> )}</div></div>
      <div className="bg-gray-50 p-5 rounded-[35px] border border-gray-100 shadow-inner"><h3 className="font-black text-gray-400 uppercase tracking-widest text-[10px] mb-3 flex items-center gap-2"><Lock size={12}/> Tareas Personales</h3><form onSubmit={saveNote} className="flex gap-2 mb-3"><input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Nueva nota..." className="flex-1 p-3 rounded-xl border-none outline-none text-xs bg-white shadow-sm font-medium" /><button type="submit" className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-lg hover:bg-violet-700 transition"><Plus size={16}/></button></form><div className="space-y-2">{notes.map(n => (<div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm group"><button onClick={() => toggleNote(n)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${n.done ? 'bg-violet-400 border-violet-400' : 'border-violet-200'}`}>{n.done && <Check size={12} className="text-white"/>}</button><span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-gray-300' : 'text-gray-600'}`}>{n.text}</span><button onClick={() => deleteNote(n.id)} className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button></div>))}</div></div>
      {showAnnounceModal && (<div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"><form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95"><h3 className="text-lg font-black text-orange-500 mb-2 uppercase italic">Nuevo Aviso</h3><textarea name="message" className="w-full p-4 bg-orange-50 rounded-2xl outline-none text-sm h-32 resize-none border border-orange-100 focus:ring-2 ring-orange-200 text-gray-700" placeholder="Escribe aquí..." required></textarea><div className="mt-3"><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">¿Quién puede ver esto?</label><select name="channel" className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200 outline-none focus:border-orange-300"><option value="general">🌍 Toda la Escuela</option><option value="sede">🏫 Solo Sede</option><option value="inclusion">💙 Solo Inclusión</option></select></div><div className="flex gap-2 mt-4"><button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 text-gray-400 font-bold text-xs uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-orange-500 text-white py-3 rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-orange-600 transition">Publicar</button></div></form></div>)}
      
      {/* MANUAL DE AYUDA (TUTORIAL COMPLETO) */}
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
                                <p>Busca cualquier alumno de la escuela. Usa los filtros (Turno, Docente, DX) para refinar. Al entrar a un alumno, verás su ficha completa.</p>
                            </div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><UploadCloud size={16}/> La Nube (Gestión)</h4>
                                <p>Solo directivos: Herramientas para descargar copias de seguridad (Backup) y herramientas avanzadas de administración.</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'aula' && (
                        <>
                            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                <h4 className="font-bold text-indigo-800 mb-1 flex items-center gap-2"><Grid size={16}/> Gestión de Clases</h4>
                                <p>Aquí ves a los grupos armados. Puedes filtrar por Mañana/Tarde y Sede/Inclusión. Usa el botón de imprimir arriba para sacar la lista de asistencia.</p>
                            </div>
                            <div className="bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                                <h4 className="font-bold text-yellow-800 mb-1 flex items-center gap-2">⚡ Bitácora Express</h4>
                                <p>Toca el rayo en un alumno para registrar rápidamente una conducta, logro o incidente de salud. Queda guardado en su historia.</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'tareas' && (
                        <>
                            <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100">
                                <h4 className="font-bold text-purple-800 mb-1 flex items-center gap-2"><CheckSquare size={16}/> Pedidos y Organización</h4>
                                <p>Crea tareas para solicitar materiales o informes. Puedes asignarlas a una persona o a un rol (ej: Mantenimiento).</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                                <h4 className="font-bold text-gray-800 mb-1 flex items-center gap-2"><Eye size={16}/> Privacidad</h4>
                                <p>Las tareas solo las ven el creador, el destinatario y los directivos. Son privadas.</p>
                            </div>
                        </>
                    )}
                    {tutorialTab === 'agenda' && (
                         <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                             <h4 className="font-bold text-red-800 mb-1 flex items-center gap-2"><CalendarIcon size={16}/> Calendario</h4>
                             <p>Visualiza actos, feriados y reuniones. Toca un día para ver detalles. Los directivos pueden usar el rayo para carga rápida de fechas.</p>
                         </div>
                    )}
                    {tutorialTab === 'recursos' && (
                         <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                             <h4 className="font-bold text-emerald-800 mb-1 flex items-center gap-2"><LinkIcon size={16}/> Biblioteca Digital</h4>
                             <p>Encuentra documentos institucionales, actas y planillas organizadas por carpetas. Toca para abrir o descargar.</p>
                         </div>
                    )}
                    {tutorialTab === 'proyecto' && (
                         <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                             <h4 className="font-bold text-blue-800 mb-1 flex items-center gap-2"><PieChart size={16}/> Proyecto 2026</h4>
                             <p>Accede a la planificación anual "La Vuelta al Mundo". Puedes ver las estaciones, actividades y descargar el PDF completo.</p>
                         </div>
                    )}
                </div>
                <button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition">¡Entendido!</button>
            </div>
        </div>
      )}
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

// --- VISTA TAREAS (FINAL: RESPONSIVE MÓVIL + ORDENAMIENTO + FILTROS) ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  
  // ESTADO: MODO DE VISTA (Solo Admin)
  const [viewMode, setViewMode] = useState('mine'); // 'mine' = Mías, 'all' = Otros (Supervisión)

  const [assignType, setAssignType] = useState('user'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsersObj, setSelectedUsersObj] = useState([]); 
  
  const [checklist, setChecklist] = useState([]); 
  const [newItem, setNewItem] = useState(""); 
  const [userSearch, setUserSearch] = useState("");
  const [openCommentsId, setOpenCommentsId] = useState(null); 
  const [newComment, setNewComment] = useState("");
  const [editingTask, setEditingTask] = useState(null); 
  const [filter, setFilter] = useState('pending'); 

  const ROLES_OPTIONS = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor', 'DAI', 'Dirección Inclusión', 'Equipo Técnico Inclusión'];
  
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo'; 
  const canManage = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
        const users = snap.docs.map(d => ({id: d.id, ...d.data()}));
        setUsersList(users);
        if (editingTask) {
            if (editingTask.targetUserIds && editingTask.targetUserIds.length > 0) {
                const foundUsers = users.filter(u => editingTask.targetUserIds.includes(u.id));
                setSelectedUsersObj(foundUsers);
            } else if (editingTask.targetUserId) {
                const found = users.find(u => u.id === editingTask.targetUserId);
                if (found) setSelectedUsersObj([found]);
            }
        }
    });
    return () => unsub();
  }, [editingTask]);

  const handleSaveTask = async (e) => {
    e.preventDefault(); 
    const fd = new FormData(e.target);
    let finalTargetIds = []; let finalAssignedName = "Todos"; let finalRoles = [];

    if (assignType === 'user') { 
        if (selectedUsersObj.length === 0) return alert("⚠️ Selecciona al menos un usuario."); 
        finalTargetIds = selectedUsersObj.map(u => u.id);
        finalAssignedName = selectedUsersObj.map(u => u.firstName).join(", ");
    } else { 
        if (selectedRoles.length === 0) return alert("⚠️ Elige roles."); 
        finalRoles = selectedRoles; 
        finalAssignedName = selectedRoles.join(", "); 
    }

    const taskData = { 
        title: fd.get('title'), 
        dueDate: fd.get('dueDate') || null, 
        showDate: fd.get('showDate') || new Date().toISOString().split('T')[0],
        showTime: fd.get('showTime') || "08:00",
        priority: fd.get('priority'), 
        targetType: assignType, 
        targetUserIds: finalTargetIds, 
        targetUserId: finalTargetIds.length > 0 ? finalTargetIds[0] : null, 
        targetRoles: finalRoles, 
        assignedToName: finalAssignedName, 
        checklist: checklist 
    };

    try {
        if (editingTask) { 
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData); 
        } else { 
             const newTaskRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { ...taskData, createdByName: user.fullName || user.firstName, createdById: user.id, status: 'pending', createdAt: serverTimestamp(), comments: [] });
             const scheduledTime = new Date(`${taskData.showDate}T${taskData.showTime}`);
             const now = new Date();
             if (scheduledTime <= now) {
                 const notifData = { title: `Tarea Nueva`, message: `${user.firstName}: "${fd.get('title')}"`, read: false, createdAt: serverTimestamp(), targetTab: 'tasks', relatedId: newTaskRef.id, type: 'task_assigned' };
                 if (assignType === 'user') {
                     const promises = finalTargetIds.map(uid => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: uid }));
                     await Promise.all(promises);
                 } else if (assignType === 'roles') {
                    const targets = usersList.filter(u => u.role && finalRoles.some(r => r.toLowerCase() === u.role.toLowerCase()));
                    const promises = targets.map(t => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), { ...notifData, toUserId: t.id }));
                    await Promise.all(promises);
                 }
             }
        }
        setShowModal(false);
    } catch (err) { alert("Error: " + err.message); }
  };

  const toggleUserSelection = (u) => {
      if (selectedUsersObj.some(sel => sel.id === u.id)) setSelectedUsersObj(prev => prev.filter(sel => sel.id !== u.id));
      else setSelectedUsersObj(prev => [...prev, u]);
      setUserSearch(""); 
  };

  // --- FILTRADO Y ORDENAMIENTO ---
  const processTasks = () => {
      // 1. FILTRADO
      const filtered = tasks.filter(t => {
          const now = new Date();
          const scheduledTime = new Date(`${t.showDate || '2000-01-01'}T${t.showTime || '00:00'}`);
          
          if (filter === 'completed') {
              if (t.status !== 'completed') return false;
          } else if (filter === 'scheduled') {
              if (t.status === 'completed') return false;
              if (scheduledTime <= now) return false; 
          } else { // 'pending'
              if (t.status === 'completed') return false;
              if (scheduledTime > now) return false; 
          }
          
          const isMine = (
              t.createdById === user.id || 
              (t.targetUserIds && t.targetUserIds.includes(user.id)) || 
              (t.targetUserId === user.id) ||
              (t.targetRoles && user.role && t.targetRoles.includes(user.role))
          );

          if (isSuperAdmin) {
              if (viewMode === 'mine') return isMine;
              if (viewMode === 'all') return !isMine; 
          }
          
          return isMine; 
      });

      // 2. ORDENAMIENTO
      return filtered.sort((a, b) => {
          const dateA = new Date(`${a.showDate || '9999-12-31'}T${a.showTime || '23:59'}`);
          const dateB = new Date(`${b.showDate || '9999-12-31'}T${b.showTime || '23:59'}`);
          return dateA - dateB; 
      });
  };

  const visibleTasks = processTasks();

  const addComment = async (task) => { if (!newComment.trim()) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { comments: arrayUnion({ text: newComment, author: user.firstName, date: new Date().toISOString() }) }); setNewComment(""); };
  const handleDelete = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  const changeStatus = async (task, newStatus) => { if (newStatus === 'completed' && !confirm("¿Lista?")) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus }); };
  const openNew = () => { setEditingTask(null); setAssignType('user'); setSelectedRoles([]); setChecklist([]); setNewItem(""); setUserSearch(""); setSelectedUsersObj([]); setShowModal(true); };
  const searchResults = userSearch.length > 0 ? (usersList || []).filter(u => u.fullName.toLowerCase().includes(userSearch.toLowerCase())) : [];
  
  const getPriorityStyle = (t, isSupervision) => { 
      if (t.type === 'absenteeism' || t.title.startsWith('⚠️')) return 'bg-red-50 border-l-8 border-red-600 shadow-md transform scale-[1.01] ring-2 ring-red-100';
      if (isSupervision) return 'opacity-80 bg-gray-50 grayscale-[0.2] border-gray-200';
      if (t.priority === 'alta') return 'border-l-4 border-l-red-500 bg-red-50/50'; 
      if (t.priority === 'media') return 'border-l-4 border-l-orange-400 bg-orange-50/50'; 
      return 'border-l-4 border-l-green-400 bg-green-50/50'; 
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-20">
      
      {/* HEADER RESPONSIVE: FLEX-COL EN MÓVIL, FLEX-ROW EN PC */}
      <div className="bg-white p-4 sticky top-0 z-10 shadow-sm rounded-b-3xl flex flex-col gap-3">
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-2">
              <div>
                  <h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas</h2>
                  <p className="text-xs text-gray-400 font-bold">{visibleTasks.length} visibles</p>
              </div>
              
              {/* SWITCH ADMIN (AHORA SE ACOMODA ABAJO EN MÓVIL) */}
              {isSuperAdmin && (
                  <div className="flex bg-gray-100 p-1 rounded-xl self-start md:self-auto">
                      <button onClick={() => setViewMode('mine')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${viewMode === 'mine' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>👤 Mías</button>
                      <button onClick={() => setViewMode('all')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition ${viewMode === 'all' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>👁️ Global</button>
                  </div>
              )}
          </div>

          <div className="flex gap-2">
             {/* FILTROS CON SCROLL HORIZONTAL SI ES NECESARIO */}
             <div className="flex bg-gray-100 rounded-xl p-1 flex-1 overflow-x-auto no-scrollbar whitespace-nowrap">
                 <button onClick={()=>setFilter('pending')} className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='pending'?'bg-white shadow text-slate-800':'text-gray-400'}`}>Activas</button>
                 {canManage && <button onClick={()=>setFilter('scheduled')} className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='scheduled'?'bg-white shadow text-orange-600':'text-gray-400'}`}>Próximas</button>}
                 <button onClick={()=>setFilter('completed')} className={`flex-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition ${filter==='completed'?'bg-white shadow text-green-600':'text-gray-400'}`}>Listas</button>
             </div>
             
             <button onClick={openNew} className="bg-orange-500 text-white px-4 py-1.5 rounded-xl shadow-lg hover:scale-105 transition-all shrink-0 flex items-center justify-center">
                 <Plus size={20}/>
             </button>
          </div>
      </div>
      
      <div className="grid gap-3 px-2">
          {visibleTasks.length === 0 ? ( <div className="text-center py-10 opacity-40"><CheckCircle size={40} className="mx-auto mb-2 text-gray-400"/><p className="font-bold text-gray-500">Todo al día.</p></div> ) : visibleTasks.map(t => {
            const isMine = (t.createdById === user.id || (t.targetUserIds && t.targetUserIds.includes(user.id)) || (t.targetUserId === user.id) || (t.targetRoles && user.role && t.targetRoles.includes(user.role)));
            const isSupervision = !isMine && isSuperAdmin && viewMode === 'all';
            const isAbsenteeism = t.type === 'absenteeism' || t.title.startsWith('⚠️');

            return (
                <div key={t.id} className={`p-5 rounded-[30px] shadow-sm flex flex-col gap-3 transition-all relative ${getPriorityStyle(t, isSupervision)}`}>
                    {isSupervision && !isAbsenteeism && <div className="absolute top-2 right-10 bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1 border border-gray-300"><Eye size={10}/> Supervisión</div>}
                    {isAbsenteeism && <div className="absolute top-0 right-0 bg-red-600 text-white px-3 py-1 rounded-bl-xl rounded-tr-[20px] text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 shadow-sm"><AlertTriangle size={12}/> ALERTA SOCIAL</div>}

                    <div className="flex justify-between items-start">
                        <div className="flex-1 pr-6">
                            <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName}</p>
                            <h3 className={`font-bold text-gray-800 text-sm uppercase italic tracking-tighter leading-none ${t.status==='completed'?'line-through opacity-50':''}`}>{t.title}</h3>
                            <p className="text-[9px] text-gray-400 mt-1 italic">De: {t.createdByName}</p>
                            {new Date(`${t.showDate}T${t.showTime}`) > new Date() && (<div className="mt-2 inline-flex items-center gap-1 bg-yellow-100 text-yellow-800 text-[9px] font-bold px-2 py-1 rounded-md border border-yellow-200"><Clock size={10}/> Programada: {new Date(t.showDate).toLocaleDateString()} {t.showTime}hs</div>)}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <div className="flex gap-1">{(t.createdById === user.id || isSuperAdmin) && <button onClick={() => handleDelete(t.id)} className="text-red-300 hover:text-red-600 p-1 bg-white rounded-full shadow-sm"><Trash2 size={14}/></button>}</div>
                        </div>
                    </div>
                    {openCommentsId === t.id && ( <div className="bg-white/60 p-3 rounded-xl border border-gray-100 mt-2 animate-in fade-in"><div className="max-h-32 overflow-y-auto space-y-2 mb-2">{(t.comments || []).map((c, idx) => ( <p key={idx} className="text-xs text-gray-600 border-b border-gray-100 pb-1"><span className="font-bold text-violet-700 uppercase text-[9px]">{c.author}:</span> {c.text}</p> ))}</div><div className="flex gap-2"><input value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Escribe..." className="flex-1 text-xs p-2 rounded-lg border-none outline-none bg-white shadow-inner" /><button onClick={() => addComment(t)} className="bg-violet-600 text-white p-2 rounded-lg"><Send size={12}/></button></div></div> )}
                    <div className="pt-2 border-t border-black/5 flex justify-between items-center">
                        <button onClick={() => setOpenCommentsId(openCommentsId === t.id ? null : t.id)} className={`flex items-center gap-1.5 text-[10px] font-bold px-3 py-1.5 rounded-xl transition ${t.comments?.length > 0 ? 'bg-violet-100 text-violet-700' : 'bg-gray-100 text-gray-500 hover:bg-violet-50 hover:text-violet-600'}`}><MessageSquare size={14}/> {t.comments?.length > 0 ? `${t.comments.length} Msjs` : 'Comentar'}</button>
                        <div className="flex bg-white/60 rounded-lg p-0.5 shadow-sm">
                            <button onClick={() => changeStatus(t, 'pending')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'pending' ? 'bg-white shadow text-gray-700' : 'text-gray-400'}`}>Pend.</button>
                            <button onClick={() => changeStatus(t, 'in_process')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'in_process' ? 'bg-orange-100 text-orange-600 shadow' : 'text-gray-400'}`}>Proc.</button>
                            <button onClick={() => changeStatus(t, 'completed')} className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase transition ${t.status === 'completed' ? 'bg-green-100 text-green-700 shadow' : 'text-gray-400'}`}>Lista</button>
                        </div>
                    </div>
                </div>
            );
          })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleSaveTask} className="bg-white rounded-[50px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingTask ? 'Editar Tarea' : 'Nueva Tarea'}</h3>
            <input name="title" defaultValue={editingTask?.title} placeholder="Título de la tarea" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm shadow-inner" />
            <div className="flex gap-2 bg-gray-100 p-1 rounded-xl"><button type="button" onClick={() => setAssignType('user')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'user' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Persona(s)</button><button type="button" onClick={() => setAssignType('roles')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${assignType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button></div>
            
            {assignType === 'user' ? ( 
                <div className="space-y-2">
                    <div className="flex flex-wrap gap-2 mb-2">{selectedUsersObj.map(u => (<div key={u.id} className="flex items-center gap-1 bg-violet-100 text-violet-800 px-2 py-1 rounded-lg text-xs font-bold">{u.firstName} <button type="button" onClick={() => toggleUserSelection(u)}><X size={12}/></button></div>))}</div>
                    <div className="relative"><input placeholder="🔍 Buscar para agregar..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} autoComplete="off" className="w-full p-3 bg-gray-50 border-b-2 border-gray-200 text-sm outline-none focus:border-violet-500 rounded-t-xl" />{userSearch.length > 0 && (<div className="max-h-40 overflow-y-auto border-x border-b border-gray-200 rounded-b-xl bg-white shadow-xl absolute w-full z-50">{searchResults.length > 0 ? searchResults.map(u => (<div key={u.id} onClick={() => toggleUserSelection(u)} className={`p-3 hover:bg-violet-50 cursor-pointer flex items-center gap-2 border-b border-gray-50 last:border-0 ${selectedUsersObj.some(s=>s.id===u.id) ? 'bg-violet-50' : ''}`}><div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-[10px]">{u.firstName[0]}</div><p className="text-xs font-bold text-gray-700">{u.fullName}</p>{selectedUsersObj.some(s=>s.id===u.id) && <Check size={14} className="ml-auto text-violet-600"/>}</div>)) : <p className="p-3 text-xs text-gray-400 italic text-center">No encontrado</p>}</div>)}</div> 
                </div> 
            ) : ( 
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 max-h-32 overflow-y-auto">{ROLES_OPTIONS.map(role => ( <label key={role} className="flex items-center gap-2 mb-2 text-xs font-bold text-gray-600 cursor-pointer"><input type="checkbox" checked={selectedRoles.includes(role)} onChange={(e) => { if(e.target.checked) setSelectedRoles([...selectedRoles, role]); else setSelectedRoles(selectedRoles.filter(r => r !== role)); }} className="accent-violet-600"/> {role}</label> ))}</div> 
            )}
            
            <div className="grid grid-cols-2 gap-4"><div><label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Vencimiento</label><input name="dueDate" type="date" defaultValue={editingTask?.dueDate} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs text-gray-600 border border-gray-200" /></div><select name="priority" defaultValue={editingTask?.priority} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs uppercase text-orange-600 italic border border-gray-200 h-[66px] mt-auto"><option value="baja">🟢 Baja</option><option value="media">🟠 Media</option><option value="alta">🔴 Alta</option></select></div>
            {canManage && (<div className="bg-orange-50 p-3 rounded-xl border border-orange-100"><label className="text-[10px] font-bold text-orange-700 uppercase mb-1 block flex items-center gap-1"><Clock size={10}/> Programar Aparición</label><div className="flex gap-2"><input name="showDate" type="date" defaultValue={editingTask?.showDate} className="w-full p-2 bg-white rounded-lg outline-none font-bold text-xs text-orange-800 border border-orange-200" /><input name="showTime" type="time" defaultValue={editingTask?.showTime || "08:00"} className="w-24 p-2 bg-white rounded-lg outline-none font-bold text-xs text-orange-800 border border-orange-200" /></div><p className="text-[9px] text-orange-600 mt-1">Si pones una fecha/hora futura, la tarea quedará en "Próximas".</p></div>)}
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



// --- VISTA CALENDARIO (FINAL: ACCESO UNIVERSAL + AGENDA TÉCNICA PRIVADA) ---
function CalendarView({ events, canEdit, user }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState('TODOS'); 
  
  // MODO DE CALENDARIO
  const [calendarMode, setCalendarMode] = useState('general'); // 'general' | 'technical'

  // ESTADOS PARA CARGA RÁPIDA
  const [showQuickLoad, setShowQuickLoad] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [processing, setProcessing] = useState(false);
  
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
      e.preventDefault(); const fd = new FormData(e.target);
      const formType = fd.get('type');
      const finalType = (calendarMode === 'technical') ? 'TECNICO' : formType;

      const data = { title: fd.get('title'), date: fd.get('date'), type: finalType, description: fd.get('description'), author: user.firstName };
      
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
                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { title: finalTitle, date: isoDate, type: finalType, description: 'Carga masiva', author: user.firstName, createdAt: serverTimestamp() });
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
          <div className="flex flex-col gap-1 mt-1 overflow-y-auto no-scrollbar flex-1">{dayEvents.map((ev, idx) => { const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color; return (<div key={idx} className={`text-[9px] md:text-xs rounded-[3px] px-1 py-0.5 truncate font-bold uppercase border-l-2 shadow-sm ${style}`}>{ev.title}</div>); })}</div>
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
      
      {showModal && (<div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-sm"><form onSubmit={handleSaveEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600"><h3 className="text-lg font-black text-violet-900 uppercase italic">{editingEvent ? 'Editar Evento' : 'Nuevo Evento'}</h3>{calendarMode === 'technical' && <div className="text-xs font-bold text-teal-600 bg-teal-50 p-2 rounded-lg text-center uppercase">Creando Evento Privado Técnico</div>}<input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-violet-300" /><div className="grid grid-cols-2 gap-3"><input name="date" type="date" defaultValue={editingEvent?.date || selectedDayEvents?.date} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border" />{calendarMode === 'general' ? (<select name="type" defaultValue={editingEvent?.type || 'GENERAL'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border uppercase">{Object.keys(EVENT_TYPES).filter(t => t !== 'TECNICO').map(t => <option key={t} value={t}>{t}</option>)}</select>) : (<div className="w-full p-3 bg-teal-100 rounded-xl text-[10px] font-bold border border-teal-200 text-teal-800 flex items-center justify-center uppercase">Técnico</div>)}</div><textarea name="description" defaultValue={editingEvent?.description} placeholder="Detalles..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-20 resize-none" /><div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase hover:bg-gray-50 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700">Guardar</button></div></form></div>)}

      {selectedDayEvents && (<div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDayEvents(null)}><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-4 border-b pb-2"><h2 className="text-lg font-black text-violet-900 uppercase italic">{new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2><button onClick={() => setSelectedDayEvents(null)} className="p-1 bg-gray-100 rounded-full"><X size={18} className="text-gray-500"/></button></div>
      {/* Botón AGREGAR en el detalle (Habilitado para todos en general, o para técnicos en su modo) */}
      {(canAddGeneral || (isTechTeam && calendarMode === 'technical')) && <button onClick={()=>{ setEditingEvent({ date: selectedDayEvents.date }); setShowModal(true); }} className="w-full py-3 mb-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold text-xs hover:border-violet-400 hover:text-violet-600 transition flex items-center justify-center gap-2"><Plus size={14}/> Agregar Evento Aquí</button>}
      <div className="space-y-3">{selectedDayEvents.events.length === 0 ? <p className="text-center text-gray-400 text-xs py-4">No hay eventos para este día.</p> : selectedDayEvents.events.map(ev => { const style = EVENT_TYPES[ev.type] ? EVENT_TYPES[ev.type].color : EVENT_TYPES['GENERAL'].color; return (<div key={ev.id} className={`p-4 rounded-2xl border relative group ${style}`}><span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest bg-white/50 border border-white/20">{ev.type}</span><h3 className="font-bold mt-2 text-sm">{ev.title}</h3><p className="text-xs opacity-80 mt-1 italic">{ev.description}</p><p className="text-[9px] opacity-50 mt-2 text-right uppercase font-bold">Por: {ev.author || 'Sistema'}</p>
      {/* BOTONES EDICIÓN (PERMITIR A CREADOR O ADMIN) */}
      {(user.firstName === ev.author || isTechTeam) && (<div className="absolute top-3 right-3 flex gap-1"><button onClick={() => openEdit(ev)} className="p-1.5 bg-white/50 hover:bg-white rounded-lg shadow-sm"><Edit3 size={12}/></button><button onClick={() => deleteEvent(ev.id)} className="p-1.5 bg-white/50 hover:bg-white text-red-600 rounded-lg shadow-sm"><Trash2 size={12}/></button></div>)}</div>)})}</div></div></div>)}
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

// --- VISTA ADMINISTRACIÓN DE USUARIOS (FINAL: PRO CON CARGA MASIVA) ---
function UsersAdminView() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [processing, setProcessing] = useState(false);

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

  // --- CARGA MASIVA REAL (Texto CSV) ---
  const processBulkImport = async () => {
      if(!csvContent.trim()) return;
      setProcessing(true);
      const lines = csvContent.split('\n');
      let count = 0;
      for (let line of lines) {
          const [nombre, apellido, user, pass, rol] = line.split(',');
          if (nombre && apellido && user && pass) {
              try {
                  await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
                      firstName: nombre.trim(), lastName: apellido.trim(), fullName: `${nombre} ${apellido}`,
                      username: user.trim().toLowerCase(), password: pass.trim(), role: rol?.trim() || 'Docente',
                      rol: 'user', createdAt: serverTimestamp()
                  });
                  count++;
              } catch(e) { console.error(e); }
          }
      }
      alert(`✅ Se importaron ${count} usuarios.`);
      setProcessing(false); setShowImport(false); setCsvContent("");
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
               <button onClick={()=>setShowImport(true)} className="p-2 bg-emerald-500 text-white rounded-xl shadow hover:bg-emerald-600 transition" title="Carga Masiva"><UploadCloud size={20}/></button>
               <button onClick={()=>{setEditingUser(null); setShowModal(true);}} className="p-2 bg-orange-500 text-white rounded-xl shadow hover:bg-orange-600 transition" title="Nuevo Usuario"><Plus size={20}/></button>
            </div>
        </div>
        <div className="bg-white p-3 rounded-xl flex items-center gap-2 border border-violet-100 shadow-sm"><Search className="text-gray-400 ml-1" size={18} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre..." className="bg-transparent border-none outline-none text-gray-700 text-sm w-full font-bold" /></div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"><button onClick={analizarConflictos} className="whitespace-nowrap px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-violet-200 transition">🕵️ Detective</button><button onClick={()=>setShowRenamer(true)} className="whitespace-nowrap px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-200 transition">🔄 Reemplazar</button></div>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pb-10">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{filteredUsers.length} Usuarios Encontrados</h3>
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
                <span className="text-[9px] text-gray-400 flex items-center gap-1"><Clock size={8}/> {formatLastLogin(u.lastLogin)}</span>
            </div>
        </div>
       </div>
       <div className="flex gap-2 shrink-0">
           <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={16}/></button>
           {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>}
       </div>
      </div>
      ))}
    </div>

    {showModal && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
       <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
        <h3 className="font-bold text-violet-900 text-xl">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
        <div className="grid grid-cols-2 gap-2"><input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/><input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/></div>
        <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/>
        <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/>
        <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500 font-bold text-gray-600">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200"><input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} className="w-5 h-5 accent-violet-600"/><div><span className="text-sm font-bold text-gray-700 block">Permisos de Administrador</span><span className="text-[10px] text-gray-400 block">Puede editar tareas y eventos globales</span></div></div>
        <div className="flex gap-2 pt-2"><button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 text-gray-400 text-xs font-bold uppercase hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl text-xs font-bold uppercase shadow-lg hover:bg-violet-700">Guardar</button></div>
       </form>
      </div>
    )}

    {/* MODAL IMPORTAR */}
    {showImport && (
        <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
                <h3 className="font-bold text-emerald-600 text-xl">Importación Masiva</h3>
                <p className="text-xs text-gray-500">Pega los usuarios en formato CSV: <b>Nombre,Apellido,Usuario,Contraseña,Rol</b></p>
                <textarea value={csvContent} onChange={e=>setCsvContent(e.target.value)} className="w-full h-40 p-3 border rounded-xl text-xs font-mono" placeholder="Juan,Perez,jperez,1234,Docente&#10;Maria,Gomez,mgomez,5678,Auxiliar"/>
                <div className="flex gap-2"><button onClick={()=>setShowImport(false)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button><button onClick={processBulkImport} disabled={processing} className="flex-1 py-3 bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">{processing ? 'Cargando...' : 'Procesar'}</button></div>
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
  
  // Estados de visualización y edición
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
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
  const [statFilters, setStatFilters] = useState({ 
      modality: [], 
      level: [], 
      gender: 'all', 
      dx: 'all' 
  });

  // Estados de Bitácora
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  // Estados de Modales
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);
  const [mainTab, setMainTab] = useState('students'); // Pestaña actual
  const [staffList, setStaffList] = useState([]); // Lista de docentes
  const [editingStaff, setEditingStaff] = useState(null);
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [staffFilter, setStaffFilter] = useState('');
  
  // Estados de Procesos (Carga, Fotos, Importación)
  const [photoPreview, setPhotoPreview] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Constantes y Roles
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const canSearchDrive = isSuperAdmin || user.role === 'Administración'; 
  const canViewStaff = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Administración'].includes(user.rol) || ['Equipo Directivo', 'Dirección Inclusión', 'Administración'].includes(user.role);
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

  // ==========================================
  // 2. CARGA DE DATOS (FIREBASE)
  // ==========================================
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const uStaff = onSnapshot(qStaff, (snap) => setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
   return () => { uS(); uU(); uStaff(); };
  }, []);

  // Listas auxiliares para selects
  const staffSede = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico'].includes(u.role));
  const staffInclusion = (usersList||[]).filter(u => ['DAI', 'Equipo Técnico Inclusión', 'Inclusión'].includes(u.role));
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const staffAll = usersList || [];

  // ==========================================
  // 3. LÓGICA DE FILTRADO
  // ==========================================
  const filteredStudents = students.filter(s => {
    const isStudentActive = s.isActive === undefined || s.isActive === true;
    
    // Filtro Archivo/Activos
    if (showArchived && isStudentActive) return false; 
    if (!showArchived && !isStudentActive) return false;

    // Filtro Texto (Buscador)
    const txt = filterText.toLowerCase();
    if (txt && !((s.firstName||'').toLowerCase().includes(txt) || (s.lastName||'').toLowerCase().includes(txt) || (s.dni||'').toString().includes(txt))) return false;
    
    // Filtros Selectores
    if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
    if (filters.level !== 'all' && s.level !== filters.level) return false;
    if (filters.group !== 'all' && (s.groupMorning !== filters.group && s.groupAfternoon !== filters.group)) return false;
    if (filters.teacher !== 'all') { 
        const search = filters.teacher.toLowerCase(); 
        const tM = (s.teacherMorning || s.daiMorning || '').toLowerCase(); 
        const tT = (s.teacherAfternoon || s.daiAfternoon || '').toLowerCase(); 
        if (!tM.includes(search) && !tT.includes(search)) return false; 
    }
    if (filters.dx !== 'all' && s.dx !== filters.dx) return false;
    if (filters.gender !== 'all' && s.gender !== filters.gender) return false;
    if (filters.journey !== 'all' && s.journey !== filters.journey) return false;
    if (filters.turn === 'Mañana' && !s.groupMorning && !s.daiMorning) return false;
    if (filters.turn === 'Tarde' && !s.groupAfternoon && !s.daiAfternoon) return false;
    
    return true;
  });

  // Lógica de Estadísticas
  const statsResults = students.filter(s => { 
      if (s.isActive === false) return false; 
      if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false; 
      if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false; 
      if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false; 
      if (statFilters.gender !== 'all' && s.gender !== statFilters.gender) return false; 
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
          } else { 
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...d, isActive: true, createdAt: serverTimestamp(), incidents: [] }); 
          } 
          setShowForm(false); setEditingStudent(null); setPhotoPreview(null); 
      } catch (err) { alert("Error: " + err.message); } 
  };

  const handleDelete = async (id) => { if(confirm("⚠️ ¿Eliminar definitivamente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setShowForm(false); setEditingStudent(null); } };
  
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
  
  const deleteIncident = async (sid, inc) => { if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); };
  
  const markAsInactive = async (s) => { if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); setUnassignedList(p=>p.filter(x=>x.id!==s.id)); };
  
  const abrirLegajoDigital = (student) => { 
      const clean = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, ""); 
      const query = `name contains '${clean(student.lastName).split(' ')[0]}' and name contains '${clean(student.firstName).split(' ')[0]}' and trashed = false`; 
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`, '_blank'); 
  };

  // ==========================================
  // 6. FUNCIONES DE GESTIÓN Y NUBE (RECUPERADAS)
  // ==========================================
  const checkUnassigned = () => { 
      const found = students.filter(s => (s.isActive === undefined || s.isActive === true) && !s.groupMorning && !s.groupAfternoon && !s.daiMorning && !s.daiAfternoon); 
      setUnassignedList(found); 
      setShowDataManagement(false); 
      setShowUnassigned(true); 
  };
  
  const findDuplicates = () => alert("Función en mantenimiento.");
  
  const descargarBackup = () => { 
      if(!confirm("¿Descargar Backup?")) return; 
      const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); 
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob); 
      link.download = "BACKUP_MATRICULA.json"; 
      document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  };
  
  const handleBulkImport = () => alert("Importación en mantenimiento.");
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
// --- FUNCIÓN IMPORTACIÓN MASIVA DOCENTES ---
  const handleImportStaff = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      if (!confirm("⚠️ ¿Estás seguro de importar este archivo? Asegúrate de que el formato sea: Apellido;Nombre;DNI;Email;CargoTM;CargoTT")) {
          e.target.value = null; // Limpiar input
          return;
      }

      setProcessing(true);
      const reader = new FileReader();
      
      reader.onload = async (evt) => {
          try {
              const text = evt.target.result;
              // Separamos por líneas y quitamos la primera (encabezados)
              const rows = text.split('\n').slice(1).filter(r => r.trim() !== '');
              
              const batchPromises = rows.map(row => {
                  // Separamos por punto y coma (Excel guarda CSV así en español)
                  const cols = row.split(';');
                  
                  // Mapeamos las columnas a tus datos
                  // 0:Apellido, 1:Nombre, 2:DNI, 3:Email, 4:CargoTM, 5:CargoTT, 6:Inicio
                  const staffData = {
                      lastName: cols[0]?.trim() || '',
                      firstName: cols[1]?.trim() || '',
                      dni: cols[2]?.trim() || '',
                      email: cols[3]?.trim() || '',
                      cargoTM: cols[4]?.trim() || '',
                      cargoTT: cols[5]?.trim() || '',
                      startDate: cols[6]?.trim() || new Date().toISOString().split('T')[0],
                      isSubsidized: 'no', // Default
                      studyStatus: 'recibida', // Default
                      createdAt: serverTimestamp()
                  };

                  if (!staffData.lastName || !staffData.dni) return null; // Saltar si no hay datos básicos

                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), staffData);
              });

              const validPromises = batchPromises.filter(p => p !== null);
              await Promise.all(validPromises);
              
              alert(`✅ Se importaron ${validPromises.length} legajos correctamente.`);
          } catch (err) {
              alert("❌ Error al procesar el archivo: " + err.message);
          } finally {
              setProcessing(false);
              e.target.value = null; // Limpiar para poder subir el mismo archivo si es necesario
          }
      };
      
      reader.readAsText(file); // Leer como texto plano
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
// --- FUNCIONES PARA DOCENTES ---
  const handleSaveStaff = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const d = Object.fromEntries(fd.entries());
      d.photoUrl = photoPreview || editingStaff?.photoUrl || '';
      try {
          if (editingStaff) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id), d);
          } else {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), { ...d, createdAt: serverTimestamp() });
          }
          setShowStaffForm(false); setEditingStaff(null); setPhotoPreview(null);
      } catch (err) { alert("Error: " + err.message); }
  };

  const openEditStaff = (s) => { setEditingStaff(s); setPhotoPreview(s.photoUrl); setShowStaffForm(true); };
  const deleteStaff = async (id) => { if(confirm("¿Borrar legajo?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', id)); setShowStaffForm(false); };
  
  // Filtro simple para el buscador de docentes
  const filteredStaff = staffList.filter(s => {
      const txt = staffFilter.toLowerCase();
      return (s.firstName||'').toLowerCase().includes(txt) || (s.lastName||'').toLowerCase().includes(txt) || (s.dni||'').includes(txt);
  });
  // ==========================================
  // 8. RENDERIZADO (JSX)
  // ==========================================
return (
    <div className="animate-in fade-in pb-20">
      
      {/* HEADER DE PESTAÑAS (NUEVO) */}
      <div className="mb-6 flex gap-4 bg-white p-2 rounded-2xl shadow-sm border border-gray-100">
          <button onClick={() => setMainTab('students')} className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition ${mainTab === 'students' ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>🎓 Alumnos / Matrícula</button>
          {canViewStaff && (
             <button onClick={() => setMainTab('staff')} className={`flex-1 py-3 rounded-xl font-black uppercase text-xs transition ${mainTab === 'staff' ? 'bg-gradient-to-r from-violet-600 to-purple-500 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>👩‍🏫 Docentes / Legajos</button>
          )}
      </div>

      {/* ================= SECCIÓN ALUMNOS (TU CÓDIGO ORIGINAL) ================= */}
      {mainTab === 'students' && (
        <>
          {/* HEADER ALUMNOS */}
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
          
          {/* LISTA ALUMNOS */}
          <div className="space-y-3">{filteredStudents.map(s => { 
             const alert = getAlertStatus(s.incidents); 
             return ( 
               <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition ${!s.isActive?'border-red-400 opacity-60':alert.status==='danger'?'border-red-500 border-l-4':'border-gray-100'}`}>
                   <div className="flex gap-4 items-center">
                       <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                           {s.photoUrl?<img src={s.photoUrl} className="w-full h-full object-cover"/>:<div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                           {alert.status!=='ok' && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white"></div>}
                       </div>
                       <div>
                           <div className="flex items-center gap-2"><h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName}</h4>{s.modality === 'Inclusión' && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-200 uppercase">INCLUSIÓN</span>}</div>
                           <div className="flex gap-2 mt-1"><span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{calculateAge(s.birthDate)} años</span><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded border border-blue-100 font-bold">{s.groupMorning || s.groupAfternoon || 'Sin grupo'}</span></div>
                       </div>
                   </div>
                   <Eye className="text-gray-300"/>
               </div> 
             ); 
          })}</div>
        </>
      )}

    {/* ================= SECCIÓN DOCENTES (CON BOTÓN IMPORTAR) ================= */}
      {mainTab === 'staff' && (
          <>
            <div className="p-6 rounded-3xl shadow-lg bg-gradient-to-r from-violet-600 to-purple-500 text-white mb-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-3xl font-bold flex gap-2 items-center"><Users/> Legajos Docentes</h2>
                        <p className="opacity-80 text-sm mt-1">{filteredStaff.length} legajos</p>
                    </div>
                    
                    <div className="flex gap-2">
                        {/* --- BOTÓN IMPORTAR CSV --- */}
                        <label className="px-4 py-2 bg-white/20 border border-white/30 text-white rounded-xl shadow hover:bg-white/30 font-bold cursor-pointer flex items-center gap-2 transition">
                            {processing ? <RefreshCw className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                            <span className="text-xs uppercase hidden md:inline">Importar CSV</span>
                            <input type="file" accept=".csv" className="hidden" onChange={handleImportStaff} disabled={processing}/>
                        </label>

                        {/* --- BOTÓN NUEVO --- */}
                        <button onClick={() => {setEditingStaff(null); setPhotoPreview(null); setShowStaffForm(true);}} className="px-4 py-2 bg-white text-violet-600 rounded-xl shadow hover:bg-violet-50 font-bold">
                            <Plus size={20}/>
                        </button>
                    </div>
                </div>
                <div className="bg-white/20 p-2 rounded-xl flex items-center"><Search className="ml-2 opacity-70"/><input value={staffFilter} onChange={e=>setStaffFilter(e.target.value)} placeholder="Buscar docente por nombre o DNI..." className="bg-transparent border-none outline-none text-white w-full font-bold placeholder-white/60 ml-2"/></div>
            </div>

            <div className="space-y-3">
                {filteredStaff.map(s => (
                    <div key={s.id} onClick={() => openEditStaff(s)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition">
                        <div className="w-14 h-14 bg-gray-200 rounded-full overflow-hidden border-2 border-violet-100">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName?.[0]}</div>}</div>
                        <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</h4>
                            <p className="text-xs text-gray-500 font-bold">{s.cargoTM || '-'} / {s.cargoTT || '-'}</p>
                            <p className="text-[10px] text-gray-400 mt-1">DNI: {s.dni} | Inicio: {getSafeDate(s.startDate)}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                            {s.isSubsidized === 'si' && <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold uppercase">Subv.</span>}
                            {s.studyStatus === 'recibida' ? <span className="text-[9px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold uppercase">Titular</span> : <span className="text-[9px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-bold uppercase">En Curso</span>}
                        </div>
                    </div>
                ))}
            </div>
          </>
      )}

      {/* ================= MODALES ================= */}

      {/* 1. FICHA ALUMNO (TU CÓDIGO ORIGINAL) */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-700 p-6 text-white relative">
                    <button onClick={()=>setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                    <div className="flex gap-5 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="m-auto mt-5 text-white/50"/>}</div>
                        <div><h2 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><div className="flex gap-2 mt-2"><span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{viewingStudent.dni}</span></div></div>
                    </div>
                    <div className="flex gap-2 mt-6 bg-slate-800/50 p-1 rounded-xl"><button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white hover:bg-white/10'}`}>Datos Personales</button><button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white hover:bg-white/10'}`}>Bitácora</button></div>
                </div>
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative">
                    {activeModalTab==='info' ? (
                      <div className="space-y-4 text-sm">
                        {canSearchDrive && (<button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm transform hover:scale-[1.02]"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>)}
                        <div className="grid grid-cols-4 gap-3"><div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nivel</p><p className="font-black text-slate-800 text-xs">{viewingStudent.level || '-'}</p></div><div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center shadow-sm"><p className="text-[9px] text-purple-400 font-bold uppercase mb-1">DX</p><p className="font-black text-purple-800 text-xs">{viewingStudent.dx || '-'}</p></div><div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Género</p><p className="font-black text-slate-800 text-xs">{viewingStudent.gender || '-'}</p></div><div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Jornada</p><p className="font-black text-slate-800 text-xs">{viewingStudent.journey || '-'}</p></div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1 mb-3"><Activity size={14}/> Salud y Obra Social</h4><div className="flex justify-between items-center text-xs"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><span className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><span className="font-bold text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</span></div></div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1 mb-3"><User size={14}/> Familia</h4><div className="space-y-3"><div className="flex justify-between items-start border-b border-gray-50 pb-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><span className="font-bold text-xs">{viewingStudent.motherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.motherContact || '-'}</span></div></div><div className="flex justify-between items-start"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><span className="font-bold text-xs">{viewingStudent.fatherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.fatherContact || '-'}</span></div></div></div><div className="mt-3 pt-2 border-t border-gray-100 space-y-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p></div><div className="bg-orange-50 p-2 rounded-lg border border-orange-100"><span className="text-[9px] text-orange-700 font-bold block uppercase mb-1">Autorizados a Retirar</span><p className="font-bold text-xs text-gray-800">{viewingStudent.pickupInfo || 'Sin datos cargados.'}</p></div></div></div>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-20">
                        {!isWriting && (<div className="grid grid-cols-3 gap-2 mb-4">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => addIncident(type.severity, type.label)} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div>)}
                        <div className="space-y-3">{viewingStudent.incidents?.length > 0 ? viewingStudent.incidents.slice().reverse().map((inc,i)=>(<div key={i} className={`${getSeverityColor(inc.severity)} p-3 rounded-xl border shadow-sm`}><div className="flex justify-between border-b border-gray-200/50 pb-1 mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{new Date(inc.date).toLocaleDateString()}</span><button onClick={()=>deleteIncident(viewingStudent.id, inc)}><Trash2 size={12} className="text-gray-400 hover:text-red-500"/></button></div><p className="font-bold text-sm text-slate-800">{inc.text || inc.type}</p><p className="text-xs text-gray-500 mt-1 uppercase font-bold pl-7">Por: {inc.author}</p></div>)) : <div className="text-center py-6 text-gray-400 text-xs font-bold uppercase">Sin registros</div>}</div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">{isWriting ? (<div className="animate-in slide-in-from-bottom"><textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500"/><div className="flex gap-2"><button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Cancelar</button><button onClick={() => addIncident('medium', newNote)} disabled={!newNote.trim()} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar Nota</button></div></div>) : (<button onClick={() => setIsWriting(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] transition"><Edit3 size={18}/> Redactar Observación</button>)}</div>
                      </div>
                    )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
                    <button onClick={()=>imprimirListado([viewingStudent])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir Ficha</button>
                    <button onClick={()=>openEdit(viewingStudent)} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO ALUMNO (CON FIX DE CUD) */}
      {showForm && (<div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm"><div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-4">{editingStudent?'Editar':'Nuevo'} Legajo</h3>
      <div className="flex justify-center mb-6"><div className="relative group w-24 h-24"><div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">{photoPreview || editingStudent?.photoUrl ? <img src={photoPreview || editingStudent?.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-gray-300 m-auto mt-6"/>}</div><label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md"><input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />{uploading ? <RefreshCw className="animate-spin" size={14}/> : <Edit3 size={14}/>}</label></div></div>
      <form onSubmit={handleSave} className="space-y-4">
        <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl"><button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button><button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button></div>
        <div className={`p-3 rounded-xl border mb-2 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}><div><label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label><p className="text-[10px] text-gray-500 font-bold">{editingStudent?.isActive === false ? '🛑 BAJA / INACTIVO' : '✅ ACTIVO (CURSANDO)'}</p></div><select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none"><option value="true">Activo</option><option value="false">Inactivo (Baja)</option></select></div>
        <div className="grid grid-cols-2 gap-3"><input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/></div>
        <div className="grid grid-cols-2 gap-3"><input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/><input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500"/></div>
        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3"><h4 className="font-bold text-blue-700 text-xs uppercase">Datos Escolares ({formModalidad})</h4><div className="grid grid-cols-2 gap-2"><select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold w-full"><option value="">Nivel...</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option><option value="SECUNDARIA">SECUNDARIA</option></select><select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold w-full"><option value="">DX...</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div>{formModalidad === 'Sede' ? (<><div className="grid grid-cols-2 gap-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs w-full"/><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs w-full"/></div><div className="grid grid-cols-2 gap-2"><select name="teacherMorning" defaultValue={editingStudent?.teacherMorning} className="p-2 rounded-lg border text-xs w-full"><option value="">Docente TM...</option>{staffSede.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon} className="p-2 rounded-lg border text-xs w-full"><option value="">Docente TT...</option>{staffSede.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></>) : (<><input name="originSchool" defaultValue={editingStudent?.originSchool} placeholder="Escuela de Origen" className="w-full p-2 rounded-lg border text-xs font-bold"/><input name="originGrade" defaultValue={editingStudent?.originGrade} placeholder="Grado/Año" className="w-full p-2 rounded-lg border text-xs"/><div className="grid grid-cols-2 gap-2"><select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs"><option value="">DAI T. Mañana...</option>{staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs"><option value="">DAI T. Tarde...</option>{staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div className="bg-green-50 p-2 rounded-lg border border-green-100 mt-2"><label className="text-[10px] font-bold text-green-700 uppercase block mb-1">📂 Carpeta Drive Personal</label><input name="driveLink" defaultValue={editingStudent?.driveLink} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-lg border text-xs text-green-800"/></div></>)}</div>
        <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3"><h4 className="font-bold text-green-800 text-xs uppercase">Salud y Familia</h4>
        <div className="grid grid-cols-2 gap-2">
            <input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs"/>
            <div className="flex flex-col"><label className="text-[9px] text-green-700 font-bold uppercase">Vencimiento CUD</label><input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500"/></div>
        </div>
        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs" placeholder="Dirección"/><div className="grid grid-cols-2 gap-2"><input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs"/><input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs"/></div><div className="grid grid-cols-2 gap-2"><input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs"/><input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="w-full p-2 rounded-lg border text-xs"/></div><div className="border-t border-green-200 pt-2"><label className="text-[10px] font-bold text-green-700 uppercase block mb-1">Personas autorizadas a retirar</label><textarea name="pickupInfo" defaultValue={editingStudent?.pickupInfo} className="w-full p-2 rounded-lg border text-xs h-16 resize-none" placeholder="Abuela Marta, Tía Juana..."/></div></div>
        <div className="flex gap-2 pt-4 border-t"><button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20}/></button>}</div></form></div></div>)}

      {/* 3. MODAL FORMULARIO DOCENTE (NUEVO) */}
      {showStaffForm && (
          <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                  <h3 className="text-xl font-bold mb-4">{editingStaff?'Editar':'Nuevo'} Legajo Docente</h3>
                  <div className="flex justify-center mb-6">
                      <div className="relative group w-24 h-24">
                          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">
                              {photoPreview || editingStaff?.photoUrl ? <img src={photoPreview || editingStaff?.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-gray-300 m-auto mt-6"/>}
                          </div>
                          <label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md">
                              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                              {uploading ? <RefreshCw className="animate-spin" size={14}/> : <Edit3 size={14}/>}
                          </label>
                      </div>
                  </div>
                  <form onSubmit={handleSaveStaff} className="space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                          <input name="firstName" defaultValue={editingStaff?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                          <input name="lastName" defaultValue={editingStaff?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <input name="dni" type="number" defaultValue={editingStaff?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                          <input name="birthDate" type="date" defaultValue={getSafeDate(editingStaff?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                          <input name="cuit" defaultValue={editingStaff?.cuit} placeholder="CUIT/CUIL" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                          <input name="email" type="email" defaultValue={editingStaff?.email} placeholder="Email" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                      </div>
                      
                      <div className="bg-violet-50 p-4 rounded-xl border border-violet-100">
                          <h4 className="font-bold text-violet-700 text-xs uppercase mb-3">Cargos y Funciones</h4>
                          <div className="grid grid-cols-2 gap-3 mb-3">
                              <div><label className="text-[10px] font-bold uppercase text-gray-500">Cargo TM</label><select name="cargoTM" defaultValue={editingStaff?.cargoTM} className="w-full p-2 rounded-lg border text-xs font-bold"><option value="">-</option><option value="Docente">Docente</option><option value="Auxiliar">Auxiliar</option><option value="Preceptora">Preceptora</option><option value="Equipo Técnico">Eq. Técnico</option><option value="Docente Especial">Especial</option></select></div>
                              <div><label className="text-[10px] font-bold uppercase text-gray-500">Cargo TT</label><select name="cargoTT" defaultValue={editingStaff?.cargoTT} className="w-full p-2 rounded-lg border text-xs font-bold"><option value="">-</option><option value="Docente">Docente</option><option value="Auxiliar">Auxiliar</option><option value="Preceptora">Preceptora</option><option value="Equipo Técnico">Eq. Técnico</option><option value="Docente Especial">Especial</option></select></div>
                          </div>
                          <div><label className="text-[10px] font-bold uppercase text-gray-500">Horario</label><input name="schedule" defaultValue={editingStaff?.schedule} placeholder="Ej: Lun y Mie 8-12hs" className="w-full p-2 rounded-lg border text-xs"/></div>
                      </div>

                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold uppercase text-gray-500">Inicio Cargo</label><input name="startDate" type="date" defaultValue={getSafeDate(editingStaff?.startDate)} className="w-full p-2 rounded-lg border text-xs"/></div>
                          <div><label className="text-[10px] font-bold uppercase text-gray-500">Subvencionado</label><select name="isSubsidized" defaultValue={editingStaff?.isSubsidized || 'no'} className="w-full p-2 rounded-lg border text-xs"><option value="no">No</option><option value="si">Sí</option></select></div>
                      </div>

                      <div className="p-3 border border-gray-200 rounded-xl">
                          <label className="text-[10px] font-bold uppercase text-gray-500">Formación</label>
                          <input name="degree" defaultValue={editingStaff?.degree} placeholder="Título de Base" className="w-full p-2 rounded-lg border text-xs mb-2"/>
                          <select name="studyStatus" defaultValue={editingStaff?.studyStatus || 'recibida'} className="w-full p-2 rounded-lg border text-xs"><option value="recibida">Recibida / Completo</option><option value="en_curso">En Curso / Estudiante</option></select>
                      </div>

                      <div className="flex gap-2 pt-4 border-t">
                          <button type="button" onClick={()=>setShowStaffForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                          <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar Legajo</button>
                          {editingStaff && <button type="button" onClick={() => deleteStaff(editingStaff.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20}/></button>}
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* 4. MODAL GESTIÓN (NUBE) */}
      {showDataManagement && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]"><div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95"><div className="flex justify-between items-center mb-6"><h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><UploadCloud className="text-blue-500"/> Gestión de Datos</h3><button onClick={()=>setShowDataManagement(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button></div><div className="space-y-4"><div className="grid grid-cols-2 gap-3"><button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200 flex flex-col items-center gap-1"><Search size={16}/> Buscar Duplicados</button><button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200 flex flex-col items-center gap-1"><AlertTriangle size={16}/> Ver Sin Grupo</button></div><div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><h4 className="font-bold text-gray-600 text-xs mb-2 uppercase">Copia de Seguridad</h4><div className="flex gap-2"><button onClick={descargarBackup} className="flex-1 py-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"><Download size={14}/> Descargar JSON</button><button onClick={handleBulkImport} className="flex-1 py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 shadow-sm flex items-center justify-center gap-2"><UploadCloud size={14}/> Importar</button></div></div><button onClick={handleAutoAssignGenders} disabled={processing} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={16}/> : <><User size={16}/> Asignar Género Automático</>}</button></div></div></div>)}
      
      {/* 5. MODAL ESTADÍSTICAS */}
      {showStats && (<div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600"><div className="flex justify-between items-center mb-6"><div><h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3><p className="text-xs text-gray-500">Filtrado Acumulativo</p></div><button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button></div><div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner"><span className="text-5xl font-black text-violet-600 block mb-2">{statsResults.length}</span><span className="text-xs font-bold text-violet-400 uppercase tracking-[4px]">Coincidencias</span></div><div className="space-y-4"><div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Niveles</p><div className="flex flex-wrap gap-2">{['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (<button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>))}</div></div><div><p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Modalidad</p><div className="flex flex-wrap gap-2">{['Sede', 'Inclusión'].map(mod => (<button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>))}</div></div><div className="grid grid-cols-2 gap-2"><select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select><select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select></div></div><button onClick={() => setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all' })} className="w-full py-3 text-red-400 font-bold text-xs hover:bg-red-50 rounded-xl transition mt-4">Limpiar Filtros</button></div></div>)}
      
      {/* 6. MODAL SIN GRUPO */}
      {showUnassigned && (<div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]"><div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col"><div className="flex justify-between mb-4"><h3 className="font-bold text-red-600">Alumnos Sin Grupo ({unassignedList.length})</h3><button onClick={()=>setShowUnassigned(false)}><X/></button></div><div className="flex-1 overflow-y-auto space-y-2">{unassignedList.map(s=>(<div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl"><span className="font-bold">{s.lastName}, {s.firstName}</span><div className="flex gap-2"><button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button><button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button></div></div>))}</div></div></div>)}
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
  
  // PERMISO ADMIN (PARA EL BOTÓN)
  const isAdminRole = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  // TABS ANCHOS
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
        
        {/* --- NUEVO: VISTA ADMIN (SOLO RENDERIZA SI EL TAB ES 'ADMIN') --- */}
        {activeTab === 'admin' && <AdministracionView user={user} />}
        {/* ----------------------------------------------------------------- */}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0">
        <div className="grid grid-cols-5 md:grid-cols-8 h-full max-w-5xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          <div className="hidden md:block"><NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" /></div>
          
          <div className="relative -top-5 flex justify-center"><button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}><Grid size={24} /></button><span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span></div>
          
          <div className="block md:hidden"><NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={20} />} label="Legajos" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={20} />} label="Recursos" /></div>
          <div className="hidden md:block"><NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={20} />} label="P.I." /></div>

          {/* --- NUEVO: BOTÓN ADMIN (VERSIÓN PC) --- */}
          {isAdminRole && (
              <div className="hidden md:block">
                  <button onClick={() => setActiveTab('admin')} className={`flex flex-col items-center gap-1 transition h-full justify-center w-full ${activeTab === 'admin' ? 'text-blue-500 scale-110' : 'text-gray-400'}`}>
                      <FileText size={20} />
                      <span className="text-[9px] font-bold uppercase">Admin</span>
                  </button>
              </div>
          )}
          {/* ----------------------------------------- */}

          <div className="relative block md:hidden"><NavButton active={['matricula', 'resources', 'proyecto', 'admin'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
              {showMoreMenu && (
                  <div className="absolute bottom-16 right-0 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 w-48 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-50">
                      <button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><GraduationCap size={18} className="text-violet-500"/> Legajos</button>
                      <button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><LinkIcon size={18} className="text-green-500"/> Recursos</button>
                      <button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600"><PieChart size={18} className="text-orange-500"/> Proyecto Inst.</button>
                      
                      {/* --- NUEVO: BOTÓN ADMIN (VERSIÓN MÓVIL) --- */}
                      {isAdminRole && (
                          <button onClick={() => { setActiveTab('admin'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-blue-600 border-t border-gray-100 mt-1">
                              <FileText size={18} className="text-blue-500"/> Administración
                          </button>
                      )}
                      {/* ----------------------------------------- */}
                  </div>
              )}
          </div>
        </div>
      </nav>

      {showSearch && ( <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in"><div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div><input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/><div className="flex-1 overflow-y-auto space-y-2">{searchResults.map(s => (<div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div><div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div></div>))}{searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}</div></div> )}
      {globalViewingStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95"><div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div><div className="p-6"><div className="flex gap-4 items-center mb-4"><div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div><div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div></div><button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a la sección Legajos. Buscalo ahí para editar."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button></div></div></div>)}
    </div>
  );
}

// --- VISTA AULA (FINAL: IMPRESIÓN INDIVIDUAL ARREGLADA) ---
function GroupsView({ user }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [activeTab, setActiveTab] = useState('info');
  
  // ESTADOS
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [viewFilter, setViewFilter] = useState('all'); 
  const [groupStats, setGroupStats] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);

  // --- CONFIGURACIÓN DE TRABAJO SOCIAL ---
  const SOCIAL_TARGETS = ['mchancalay', 'Myrian Chancalay'];
  
  // REF PARA EL SCROLL (FLECHAS)
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

  // --- AGRUPAMIENTO DE DATOS ---
  const groupedData = students.reduce((acc, s) => {
      let groupKey = ""; let myTeacher = "";
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
      const sAux = s[`aux${suf}`]; const sTeacher2 = s[`teacher2${suf}`]; const sSpecial1 = s[`special1${suf}`]; const sSpecial2 = s[`special2${suf}`]; const sSpecial3 = s[`special3${suf}`]; const sSup1 = s[`sup1${suf}`]; const sSup2 = s[`sup2${suf}`]; const sClass = s.classroom; const sDrive = s[`driveLink${suf}`];
      if (s.modality === 'Inclusión') { const daiName = s[`dai${suf}`]; if (!daiName) return acc; groupKey = `DAI: ${daiName}`; myTeacher = daiName; } else { const groupName = s[`group${suf}`]; if (!groupName) return acc; groupKey = groupName.trim(); myTeacher = s[`teacher${suf}`]; }
      if (!acc[groupKey]) { acc[groupKey] = { name: groupKey, students: [], teacher: myTeacher, teacher2: sTeacher2, aux: sAux, special1: sSpecial1, special2: sSpecial2, special3: sSpecial3, sup1: sSup1, sup2: sSup2, classroom: sClass, driveLink: sDrive, isInclusionGroup: s.modality === 'Inclusión' }; } 
      else { if (!acc[groupKey].aux && sAux) acc[groupKey].aux = sAux; if (!acc[groupKey].teacher2 && sTeacher2) acc[groupKey].teacher2 = sTeacher2; if (!acc[groupKey].special1 && sSpecial1) acc[groupKey].special1 = sSpecial1; if (!acc[groupKey].special2 && sSpecial2) acc[groupKey].special2 = sSpecial2; if (!acc[groupKey].special3 && sSpecial3) acc[groupKey].special3 = sSpecial3; if (!acc[groupKey].sup1 && sSup1) acc[groupKey].sup1 = sSup1; if (!acc[groupKey].sup2 && sSup2) acc[groupKey].sup2 = sSup2; if (!acc[groupKey].classroom && sClass) acc[groupKey].classroom = sClass; if (!acc[groupKey].driveLink && sDrive) acc[groupKey].driveLink = sDrive; if (!acc[groupKey].teacher && myTeacher) acc[groupKey].teacher = myTeacher; }
      acc[groupKey].students.push(s); return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

  if (!isManagement) {
      const myName = (user.fullName || "").toLowerCase();
      groups = groups.filter(g => (g.teacher || "").toLowerCase().includes(myName) || (g.teacher2 || "").toLowerCase().includes(myName) || (g.aux || "").toLowerCase().includes(myName) || (g.special1 || "").toLowerCase().includes(myName) || (g.special2 || "").toLowerCase().includes(myName) || (g.special3 || "").toLowerCase().includes(myName));
  }
  if (viewFilter !== 'all') { groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup); }

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };

  // --- FUNCIÓN CENTRALIZADA DE IMPRESIÓN ---
  // Esta función recibe "qué grupos imprimir" (uno o todos) y genera el PDF
  const printGroups = (groupsToPrint) => {
    const iframe = document.createElement('iframe'); 
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
    document.body.appendChild(iframe);
    
    let fullHtml = `<html><head><title>Listado Institucional</title><style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap'); body{font-family:'Roboto', sans-serif; padding:20px; color:#333;} .main-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #7c3aed; padding-bottom: 10px; margin-bottom: 20px; } .main-title { font-size: 24px; font-weight: 900; color: #4c1d95; text-transform: uppercase; margin: 0; } .group-section { margin-bottom: 30px; page-break-inside: avoid; } .group-header { background-color: #f3f4f6; border-left: 6px solid #7c3aed; padding: 10px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; } .group-name { font-size: 18px; font-weight: 900; color: #5b21b6; margin: 0; } .group-staff { font-size: 10px; font-weight: bold; color: #555; margin-top: 4px; text-transform: uppercase; } table { width: 100%; border-collapse: collapse; font-size: 10px; } thead tr { background-color: #7c3aed !important; color: white !important; } th { padding: 5px; text-align: left; text-transform: uppercase; font-weight: bold; border: 1px solid #ddd; } td { border: 1px solid #e5e7eb; padding: 5px; color: #374151; } tr:nth-child(even) { background-color: #f9fafb !important; } .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; font-size: 9px; color: #9ca3af; font-style: italic; }</style></head><body><div class="main-header"><div><h1 class="main-title">Listado Institucional</h1><p class="main-subtitle">Ciclo 2026 - Turno ${turn === 'morning' ? 'Mañana' : 'Tarde'}</p></div><img src="${LOGO_URL}" style="height: 50px; opacity: 0.9;" /></div>`;
    
    // Aquí iteramos sobre la lista que recibimos como parámetro (groupsToPrint)
    groupsToPrint.forEach(g => {
        const sorted = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));
        let supText = g.sup1 || '-'; if (g.sup2) supText += ` / ${g.sup2}`;
        const aulaText = g.classroom ? ` | 🏫 AULA: ${g.classroom}` : '';
        fullHtml += `<div class="group-section"><div class="group-header"><h2 class="group-name">${g.name}</h2><div class="group-staff">DOC: ${g.teacher || 'VACANTE'} | AUX: ${g.aux || '-'} | SUP: ${supText} ${aulaText}</div></div><table><thead><tr><th width="5%">#</th><th width="30%">Apellido y Nombre</th><th width="15%">DNI</th><th width="15%">Nacimiento</th><th>Familia / Obs</th></tr></thead><tbody>`;
        sorted.forEach((s, i) => { const flia = g.isInclusionGroup ? `Esc. Origen: ${s.originSchool} (${s.originGrade})` : `M: ${s.motherName||'-'} / P: ${s.fatherName||'-'}`; fullHtml += `<tr><td style="text-align:center;font-weight:bold;color:#7c3aed;">${i+1}</td><td style="font-weight:bold;text-transform:uppercase;">${s.lastName}, ${s.firstName}</td><td>${s.dni||'-'}</td><td>${getSafeDate(s.birthDate)}</td><td>${flia}</td></tr>`; });
        fullHtml += `</tbody></table></div>`;
    });
    
    fullHtml += `<div class="footer">Generado el ${new Date().toLocaleDateString()}</div></body></html>`;
    const doc = iframe.contentWindow.document; doc.open(); doc.write(fullHtml); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

  // --- MANEJADOR: IMPRIMIR TODO ---
  const handlePrintAll = () => {
      printGroups(groups); // Le pasamos TODOS los grupos
  };
  
  // --- MANEJADOR: IMPRIMIR UNO SOLO ---
  const handlePrintSingleGroup = (g) => { 
      printGroups([g]); // Le pasamos SOLO este grupo (dentro de un array)
  };

  // --- LÓGICA DE REPORTE DE AUSENTISMO ---
  const handleReportAbsenteeism = async () => {
      if(!selectedStudent) return;
      const details = prompt(`¿Desde cuándo falta ${selectedStudent.firstName} y qué observaste?`);
      if(!details) return;

      const matchingUsers = usersList.filter(u => 
          SOCIAL_TARGETS.includes(u.username) || 
          SOCIAL_TARGETS.includes(u.email?.split('@')[0]) || 
          SOCIAL_TARGETS.includes(`${u.firstName} ${u.lastName}`) || 
          SOCIAL_TARGETS.includes(u.fullName)
      );
      
      let targetIds = matchingUsers.map(u => u.id);

      if (targetIds.length === 0) {
          const socialWorkers = usersList.filter(u => (u.role === 'Equipo Técnico' || u.role === 'Trabajadora Social' || u.role === 'Social'));
          targetIds = socialWorkers.map(u => u.id);
      }
      
      if (targetIds.length === 0) {
          const admins = usersList.filter(u => u.rol === 'admin' || u.rol === 'super-admin');
          targetIds = admins.map(u => u.id);
          alert("⚠️ No encontré a 'mchancalay' ni a nadie del Equipo Técnico. Se enviará a Dirección.");
      }

      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
              title: `⚠️ AUSENTISMO: ${selectedStudent.lastName}, ${selectedStudent.firstName}`,
              description: `Reporte de ausentismo (+3 días). Detalles: ${details}`,
              priority: 'high', status: 'pending', targetType: 'user', targetUserIds: targetIds, targetUserId: targetIds[0] || null, assignedToName: "Trabajo Social / Eq. Técnico",
              createdById: user.id, createdBy: user.firstName, createdAt: serverTimestamp(), showDate: new Date().toISOString().split('T')[0], showTime: "08:00",
              type: 'absenteeism' 
          });

          const newInc = { date: new Date().toISOString(), type: "Ausentismo", severity: "high", text: `Protocolo Ausentismo iniciado: ${details}`, author: user.firstName };
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { incidents: arrayUnion(newInc) });

          alert("✅ Reporte enviado a Trabajo Social.");
      } catch (e) { alert("Error al reportar: " + e.message); }
  };

  // --- BITÁCORA ---
  const addIncident = async (type, text = "") => { if (!showBitacoraModal) return; const newInc = { date: new Date().toISOString(), type: text ? "Nota" : type, severity: type, text: text || type, author: user.firstName }; try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id), { incidents: arrayUnion(newInc) }); setStudents(prev => prev.map(s => s.id === showBitacoraModal.id ? {...s, incidents: [...(s.incidents||[]), newInc]} : s)); setNewNote(""); setIsWriting(false); setShowBitacoraModal(null); alert("✅ Guardado."); } catch (e) { alert(e.message); } };
  const handleSaveIncident = async (type, severity) => { if (!showBitacoraModal) return; setSavingIncident(true); try { const incidentData = { type, severity, date: new Date().toISOString(), author: user.fullName || user.firstName, authorId: user.id }; await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id), { incidents: arrayUnion(incidentData) }); alert("✅ Registro guardado"); setShowBitacoraModal(null); } catch (e) { console.error(e); } finally { setSavingIncident(false); } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  
  const handleUpdateGroup = async (e) => { e.preventDefault(); if (!editingGroup) return; if (editingGroup.isInclusionGroup && !confirm("⚠️ Estás editando un grupo de INCLUSIÓN.")) return; setUpdatingGroup(true); const fd = new FormData(e.target); const updates = {}; const suf = turn === 'morning' ? 'Morning' : 'Afternoon'; if (editingGroup.isInclusionGroup) { updates[`dai${suf}`] = fd.get('teacher'); } else { updates[`teacher${suf}`] = fd.get('teacher'); updates[`teacher2${suf}`] = fd.get('teacher2'); updates[`aux${suf}`] = fd.get('aux'); updates[`special1${suf}`] = fd.get('special1'); updates[`special2${suf}`] = fd.get('special2'); updates[`special3${suf}`] = fd.get('special3'); updates[`sup1${suf}`] = fd.get('sup1'); updates[`sup2${suf}`] = fd.get('sup2'); updates[`group${suf}`] = fd.get('groupName'); updates.classroom = fd.get('classroom'); } updates[`driveLink${suf}`] = fd.get('driveLink'); try { const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)); await Promise.all(promises); alert("✅ Actualizado."); setEditingGroup(null); } catch (err) { alert(err.message); } finally { setUpdatingGroup(false); } };
  
  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales', 'DAI', 'Inclusión'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico' || u.role === 'Equipo Técnico Inclusión' || u.role === 'Trabajadora Social');
  const specialOptions = usersList.filter(u => u.role === 'Profes Especiales' || u.role === 'Docente');

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center"><div><h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2><p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p></div>{isManagement && <button onClick={handlePrintAll} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}</div>
          <div className="flex gap-2"><div className="flex bg-gray-100 p-1 rounded-xl flex-1"><button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button><button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button></div>{isManagement && (<div className="flex bg-gray-100 p-1 rounded-xl"><button onClick={() => setViewFilter('all')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'all' ? 'bg-white shadow text-gray-800' : 'text-gray-400'}`}>Todos</button><button onClick={() => setViewFilter('sede')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button><button onClick={() => setViewFilter('inclusion')} className={`px-3 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button></div>)}</div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
          <button onClick={() => scroll('left')} className="hidden md:flex absolute left-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronLeft size={24}/></button>
          <button onClick={() => scroll('right')} className="hidden md:flex absolute right-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronRight size={24}/></button>

          <div ref={scrollRef} className="h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start">
                {groups.length === 0 && (<div className="m-auto text-center opacity-50"><p className="font-bold text-gray-400">No hay grupos visibles.</p></div>)} 
                {groups.map((g) => (
                    <div key={g.name} className={`min-w-[280px] w-[300px] flex flex-col h-[calc(100vh-220px)] md:h-fit bg-white rounded-[30px] border shadow-sm relative overflow-hidden group-hover:shadow-md transition shrink-0 ${g.isInclusionGroup ? 'border-indigo-200' : 'border-gray-200'}`}>
                      <div className={`p-4 border-b-4 relative ${g.isInclusionGroup ? 'bg-indigo-50 border-indigo-400' : (turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50')}`}>
                          <div className="absolute top-2 right-2 flex gap-1">
                              {g.driveLink && (<button onClick={() => window.open(g.driveLink, '_blank')} className="p-2 bg-green-100 hover:bg-green-200 rounded-full text-green-700 shadow-sm transition" title="Carpeta Drive"><Folder size={14}/></button>)}
                              {isStrategic && (<button onClick={()=>setGroupStats(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><PieChart size={14}/></button>)}
                              <button onClick={()=>handlePrintSingleGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
                              {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                          </div>
                          <h3 className="font-black text-gray-800 text-lg">{g.name}</h3>
                          <div className="mt-2 text-xs text-gray-500 font-medium space-y-1">
                              <p>DOC: <span className="font-bold text-violet-700 uppercase">{g.teacher || 'Sin asignar'}</span> {g.teacher2 && <span className="text-violet-500 font-bold">/ {g.teacher2}</span>}</p>
                              {g.aux && <p>AUX: <span className="font-bold uppercase">{g.aux}</span></p>}
                              {(g.special1 || g.special2 || g.special3) && <p className="text-gray-400 text-[9px] uppercase font-bold">ESPECIALES: {[g.special1, g.special2, g.special3].filter(Boolean).join(', ')}</p>}
                              {(g.sup1 || g.sup2) && <p className="text-violet-600 font-bold truncate">SUP: {g.sup1 || ''} {g.sup2 ? `& ${g.sup2}` : ''}</p>}
                              {g.classroom && (<p className="text-orange-600 font-black bg-white/80 px-2 py-0.5 rounded-md inline-block shadow-sm mt-1 border border-orange-100">🏫 Aula {g.classroom}</p>)}
                          </div>
                      </div>
                      <div className="flex-1 overflow-y-auto md:overflow-visible p-3 space-y-3 bg-gray-50">
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

      {editingGroup && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3><button type="button" onClick={()=>setEditingGroup(null)}><X/></button></div><div className="space-y-4"><div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center"><p className="text-xs text-violet-500 font-bold uppercase mb-1">{editingGroup.isInclusionGroup ? 'Editando Cartera DAI' : 'Editando Grupo Sede'}</p>{!editingGroup.isInclusionGroup && <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200 focus:border-violet-500" placeholder="Nombre Grupo"/>}</div>
        <div><label className="text-xs font-bold text-gray-500 ml-1">{editingGroup.isInclusionGroup ? 'DAI Responsable' : 'Docente a Cargo'}</label><select name="teacher" defaultValue={editingGroup.teacher} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div>
        {!editingGroup.isInclusionGroup && (<><div><label className="text-xs font-bold text-gray-500 ml-1">Docente 2 (Pareja)</label><select name="teacher2" defaultValue={editingGroup.teacher2} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div><label className="text-xs font-bold text-gray-500 ml-1">Auxiliar</label><select name="aux" defaultValue={editingGroup.aux} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Sin asignar</option>{staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div><label className="text-xs font-bold text-gray-500 ml-1">Aula Física</label><input name="classroom" defaultValue={editingGroup.classroom} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" placeholder="Ej: 5"/></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] font-black text-gray-400 uppercase mb-2">Profes Especiales (Opcional)</p><div className="space-y-2"><select name="special1" defaultValue={editingGroup.special1} className="w-full p-2 bg-white rounded-lg border text-xs"><option value="">Especial 1...</option>{specialOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="special2" defaultValue={editingGroup.special2} className="w-full p-2 bg-white rounded-lg border text-xs"><option value="">Especial 2...</option>{specialOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select><select name="special3" defaultValue={editingGroup.special3} className="w-full p-2 bg-white rounded-lg border text-xs"><option value="">Especial 3...</option>{specialOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500 ml-1">Sup. 1</label><select name="sup1" defaultValue={editingGroup.sup1} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div><div><label className="text-xs font-bold text-gray-500 ml-1">Sup. 2</label><select name="sup2" defaultValue={editingGroup.sup2} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs"><option value="">Ninguno</option>{techOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select></div></div></>)}<div><label className="text-xs font-bold text-green-600 ml-1">Enlace a Carpeta Drive</label><input name="driveLink" defaultValue={editingGroup.driveLink} className="w-full p-3 bg-green-50 border border-green-100 rounded-xl outline-none font-bold text-xs text-green-700" placeholder="https://drive.google.com/..."/></div><button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest hover:bg-violet-700 transition flex justify-center items-center gap-2">{updatingGroup ? <RefreshCw className="animate-spin"/> : 'Aplicar Cambios'}</button></div></form></div>)}
      
      {groupStats && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={() => setGroupStats(null)}><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-violet-900 uppercase italic">Análisis del Grupo</h3><p className="text-xs text-gray-500 font-bold">{groupStats.name} ({groupStats.students.length} alumnos)</p></div><button onClick={() => setGroupStats(null)}><X/></button></div>{(() => { const allIncidents = groupStats.students.flatMap(s => s.incidents || []); if (allIncidents.length === 0) return <p className="text-center text-gray-400 italic">No hay registros en la bitácora aún.</p>; const dimensions = { 'Pedagógico/Social': 0, 'Salud y Bienestar': 0, 'Conducta': 0, 'Rutina': 0 }; const tagsCount = {}; allIncidents.forEach(inc => { const type = inc.type; tagsCount[type] = (tagsCount[type] || 0) + 1; if (['Trabajó Muy Bien', 'Ayudó a un amigo', 'Logro de Aprendizaje', 'Buena Conducta'].includes(type)) dimensions['Pedagógico/Social']++; else if (['Convulsión / Salud', 'Higiene / Esfínter', 'Vómito', 'No comió'].includes(type)) dimensions['Salud y Bienestar']++; else if (['Agresión / Violencia', 'Brote / Gritos', 'Fuga / Intento', 'Crisis Llanto'].includes(type)) dimensions['Conducta']++; else dimensions['Rutina']++; }); const total = allIncidents.length; const topTags = Object.entries(tagsCount).sort((a, b) => b[1] - a[1]).slice(0, 4); return (<div className="space-y-6"><div><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Dimensiones Registradas</h4><div className="space-y-3">{Object.entries(dimensions).map(([dim, count]) => { if (count === 0) return null; const pct = Math.round((count / total) * 100); const color = dim === 'Pedagógico/Social' ? 'bg-emerald-500' : dim === 'Salud y Bienestar' ? 'bg-blue-500' : dim === 'Conducta' ? 'bg-red-500' : 'bg-yellow-400'; return (<div key={dim}><div className="flex justify-between text-xs font-bold text-gray-600 mb-1"><span>{dim}</span><span>{count} ({pct}%)</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div style={{width: `${pct}%`}} className={`h-full ${color}`}></div></div></div>); })}</div></div><div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Lo que más sucede (Top 4)</h4><div className="space-y-2">{topTags.map(([tag, count]) => (<div key={tag} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm"><span className="text-xs font-bold text-gray-700">{tag}</span><span className="text-xs font-black bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md">{count} veces</span></div>))}</div></div></div>); })()}</div></div>)}
      {selectedStudent && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0"><button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{selectedStudent.lastName}, {selectedStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(selectedStudent.birthDate)} años</span></p></div></div><div className="flex gap-2 mt-6"><button onClick={() => setActiveTab('info')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'info' ? 'bg-white text-blue-600' : 'bg-black/20 text-white/70'}`}>Datos</button><button onClick={() => setActiveTab('history')} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTab === 'history' ? 'bg-white text-blue-600' : 'bg-black/20 text-white/70'}`}>Bitácora</button></div></div><div className="p-6 overflow-y-auto space-y-6">
      {activeTab === 'info' ? (
          <div className="space-y-4">
              <div className="bg-orange-50 p-4 rounded-xl border border-orange-100"><h3 className="font-bold text-orange-800 text-xs uppercase mb-2">Contacto</h3><p className="text-sm">Madre: <b>{selectedStudent.motherName}</b> ({selectedStudent.motherContact})</p><p className="text-sm">Padre: <b>{selectedStudent.fatherName}</b> ({selectedStudent.fatherContact})</p></div>
              <button onClick={handleReportAbsenteeism} className="w-full bg-red-50 text-red-700 font-bold py-4 rounded-xl border border-red-200 flex items-center justify-center gap-2 hover:bg-red-100 transition animate-in zoom-in shadow-sm"><AlertTriangle size={20}/> REPORTAR AUSENTISMO (+3 días)</button>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100"><h3 className="font-bold text-gray-500 text-xs uppercase mb-2">Ubicación</h3><p className="text-sm">TM: <b>{selectedStudent.groupMorning}</b></p><p className="text-sm">TT: <b>{selectedStudent.groupAfternoon}</b></p></div>
          </div>
      ) : (
          <div className="space-y-2">{selectedStudent.incidents?.map((inc, i) => (<div key={i} className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="font-bold text-sm">{inc.text || inc.type}</p><p className="text-xs text-gray-500">{new Date(inc.date).toLocaleDateString()} - {inc.author}</p></div>))}</div>
      )}
      </div></div></div>)}
    </div>
  );
}
// --- VISTA ADMINISTRACIÓN (FINAL: PASE ARREGLADO + FIRMAS SOLO EN CONSTANCIA) ---
function AdministracionView({ user }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filters, setFilters] = useState({ os: 'all', level: 'all', modality: 'all' });
  
  // ESTADOS DOCUMENTOS
  const [template, setTemplate] = useState('constancia_regular'); 
  const [generating, setGenerating] = useState(false);
  
  // ESTADOS VARIABLES
  const [customTarget, setCustomTarget] = useState(""); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [paseAction, setPaseAction] = useState('CONCEDE'); // 'SOLICITA' o 'CONCEDE'
  
  const LOGO_URL = "/icon-192.png";
  const FIRMA_URL = "/firma.png"; 
  const SELLO_URL = "/sello.png";

  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsub = onSnapshot(q, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsub();
  }, []);

  const filteredStudents = students.filter(s => {
      if (s.isActive === false) return false;
      const txt = filterText.toLowerCase();
      if (txt && !((s.firstName||'').toLowerCase().includes(txt) || (s.lastName||'').toLowerCase().includes(txt) || (s.dni||'').includes(txt))) return false;
      if (filters.os !== 'all') {
          if (filters.os === 'con_os' && (!s.healthInsurance || s.healthInsurance.length < 2)) return false;
          if (filters.os === 'sin_os' && (s.healthInsurance && s.healthInsurance.length > 2)) return false;
          if (filters.os !== 'con_os' && filters.os !== 'sin_os' && !(s.healthInsurance||'').toLowerCase().includes(filters.os.toLowerCase())) return false;
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false;
      if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
      return true;
  });

  const toggleSelectAll = () => { if (selectedIds.length === filteredStudents.length) setSelectedIds([]); else setSelectedIds(filteredStudents.map(s => s.id)); };
  const toggleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); };

  // --- GENERADOR DE DOCUMENTOS ---
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
          .page-break { page-break-after: always; }

          /* --- ESTILOS GENERALES --- */
          .cert-container { border: 2px solid #65a30d; border-radius: 25px; padding: 25px 40px; margin: 10px auto; position: relative; height: 140mm; box-sizing: border-box; width: 100%; max-width: 210mm; display: flex; flex-direction: column; page-break-inside: avoid; }
          .cert-header { display: flex; align-items: center; margin-bottom: 15px; }
          .cert-logo { width: 100px; height: auto; margin-right: 20px; }
          .cert-title { font-size: 16px; font-weight: bold; text-decoration: underline; text-transform: uppercase; padding-top: 15px; }
          .cert-subtitle { font-size: 12px; font-weight: bold; margin-top: 5px; }
          .cert-body { font-size: 13px; line-height: 1.6; flex-grow: 1; }
          .line-group { margin-bottom: 12px; }
          .data-field { text-align: center; font-weight: bold; font-size: 14px; border-bottom: 1px dotted #000; display: block; margin: 2px 0; padding-bottom: 2px; }
          .inline-field { font-weight: bold; border-bottom: 1px dotted #000; padding: 0 10px; }
          .date-section { margin: 15px 0; text-align: center; font-weight: bold; }
          .signatures-section { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 10px; height: 80px; }
          .sig-box { text-align: center; width: 220px; position: relative; }
          .sig-img { height: 60px; width: auto; display: block; margin: 0 auto -10px auto; position: relative; z-index: 10; }
          .sig-line { border-top: 1px solid #000; margin-top: 0; padding-top: 4px; font-size: 11px; }

          /* --- ESTILOS PLANILLA --- */
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
          .firma-col { text-align: center; width: 40%; }
          .linea-firma { border-top: 1px solid #000; margin-top: 10px; padding-top: 5px; font-size: 11px; font-weight: bold; }

          @media print { 
              body { margin: 0; padding: 0; } 
              .cert-container { margin: 5mm auto; page-break-after: always; }
              .planilla-page { page-break-after: always; }
          }
      </style></head><body>`;

      targets.forEach(s => {
          
          let presentadoAnte = customTarget.trim() !== "" ? customTarget : '................................................';

          // === OPCIÓN 1: CONSTANCIA REGULAR (LLEVA FIRMA Y SELLO) ===
          if (template === 'constancia_regular') {
              let jornadaTexto = "....................";
              if (s.journey === 'Simple Mañana') jornadaTexto = "jornada simple durante el turno mañana";
              else if (s.journey === 'Simple Tarde') jornadaTexto = "jornada simple durante el turno tarde";
              else if (s.journey === 'Doble') jornadaTexto = "jornada doble";
              else if (s.journey) jornadaTexto = `jornada ${s.journey}`;
              
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
                      <div class="line-group" style="margin-top:10px;"><span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span></div>
                      <div class="line-group">con DNI N.° <span class="inline-field">${s.dni}</span> es alumno/a regular del Nivel: <span class="inline-field" style="width: 100%; display:block; margin-top:5px;">${s.level || '................'} (${s.modality || 'Sede'})</span></div>
                      <div class="line-group">cumpliendo <span class="inline-field">${jornadaTexto}</span></div>
                      <div class="line-group">en esta institución, con &nbsp;&nbsp; CUE 0623214-00.</div>
                      <div class="line-group" style="margin-top:15px;">A pedido del interesado y al efecto de ser presentado... <span class="data-field">${presentadoAnte.toUpperCase()}</span></div>
                      <div class="date-section">${fullDate}<div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div><div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div></div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box"><img src="${FIRMA_URL}" class="sig-img"/><div class="sig-line">Firma director o vicedirector</div></div>
                      <div class="sig-box"><img src="${SELLO_URL}" class="sig-img"/><div class="sig-line">Sello institución</div></div>
                  </div>
              </div>`;
          }

          // === OPCIÓN 2: CONCESIÓN DE PASE (SIN FIRMA NI SELLO DIGITAL) ===
          else if (template === 'concesion_pase') {
              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header">
                      <img src="${LOGO_URL}" class="cert-logo"/>
                      <div>
                          <div class="cert-title">PASE - SOLICITUD CONCESIÓN</div>
                          <div class="cert-subtitle" style="font-size: 11px; font-weight: bold; margin-top: 5px;">Escuela Especial Juntos a la Par con CUE 0623214-00 y DIEGEP N°8298.</div>
                      </div>
                  </div>
                  <div class="cert-body">
                      <div class="line-group" style="margin-top:30px;">
                          La dirección del establecimiento <span style="font-weight:bold; text-decoration:underline;">${paseAction}</span> el pase del alumno:
                      </div>
                      
                      <div class="line-group" style="margin-top:15px;">
                          <span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span>
                      </div>
                      
                      <div class="line-group" style="margin-top:20px;">
                          que actualmente cursa <span class="inline-field">${s.level || '................'} (${s.modality || 'Sede'})</span>
                      </div>

                      <div class="line-group" style="margin-top:10px;">
                          en la institución <b>Juntos a la Par</b>.
                      </div>

                      <div class="line-group" style="margin-top:30px;">
                          Para ser presentado ante las autoridades de la institución:
                          <span class="data-field" style="margin-top:5px;">${presentadoAnte.toUpperCase()}</span>
                      </div>
                      
                      <div class="date-section" style="margin-top: 60px;">
                          ${fullDate}
                          <div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div>
                          <div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div>
                      </div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box"><br/><br/><div class="sig-line">Firma director o vicedirector</div></div>
                      <div class="sig-box"><br/><br/><div class="sig-line">Sello institución</div></div>
                  </div>
              </div>`;
          }

          // === OPCIÓN 3: PLANILLA MENSUAL (SIN FIRMA NI SELLO DIGITAL) ===
          else if (template === 'planilla_asistencia') {
              const months = ['MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
              let horario = ""; let prestacion = "";
              if (s.journey === 'Simple Mañana') { horario = "08:30 a 12:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Simple Tarde') { horario = "12:30 a 16:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Doble') { horario = "08:30 a 16:30"; prestacion = "Jornada Doble"; }
              else { horario = "A DEFINIR"; prestacion = s.journey || "-"; }

              months.forEach(mes => {
                  htmlContent += `
                  <div class="planilla-page">
                      <div class="planilla-header">
                          <img src="${LOGO_URL}" style="height: 40px; float: left;" />
                          <h1 class="planilla-title">PLANILLA DE ASISTENCIA MENSUAL</h1>
                          <div style="clear:both;"></div>
                      </div>

                      <div class="planilla-grid">
                          <div class="p-label">OBRA SOCIAL:</div>
                          <div class="p-value">${s.healthInsurance || 'NO DECLARA'}</div>

                          <div class="p-label">APELLIDO Y NOMBRE:</div>
                          <div class="p-value">${s.lastName}, ${s.firstName}</div>

                          <div class="p-label">DNI:</div>
                          <div class="p-value">${s.dni || '-'}</div>

                          <div class="p-label">PRESTACIÓN:</div>
                          <div class="p-value">${prestacion.toUpperCase()}</div>

                          <div class="p-label">HORARIO:</div>
                          <div class="p-value">${horario}</div>

                          <div class="p-label">LUGAR DE PRESTACIÓN:</div>
                          <div class="p-value">Escuela Especial Juntos a la Par - De las Boleadoras 2974, Ituzaingó</div>
                      </div>

                      <div class="mes-box">MES Y AÑO: <span style="border-bottom: 1px solid #000; padding: 0 10px;">${mes} ${year}</span></div>

                      <p style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">ACUERDO AL SIGUIENTE DETALLE (*):</p>

                      <table class="asistencia-table">
                          <tr>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}</tr>
                          <tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr>
                      </table>
                      <table class="asistencia-table">
                          <tr>${Array.from({length:10},(_,i)=>`<th>${i+11}</th>`).join('')}</tr>
                          <tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr>
                      </table>
                      <table class="asistencia-table">
                          <tr>${Array.from({length:10},(_,i)=>`<th>${i+21}</th>`).join('')}</tr>
                          <tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr>
                      </table>
                      <table class="asistencia-table" style="width: 10%;">
                          <tr><th>31</th></tr>
                          <tr><td></td></tr>
                      </table>

                      <div class="firmas-planilla">
                          <div class="firma-col">
                              <br/><br/><br/><br/>
                              <div class="linea-firma">FIRMA FAMILIAR / RESPONSABLE<br/>ACLARACIÓN Y DNI</div>
                          </div>
                          <div class="firma-col">
                              <br/><br/><br/><br/>
                              <div class="linea-firma">FIRMA Y SELLO DIRECTIVO</div>
                          </div>
                      </div>
                  </div>`;
              });
          }
      });

      htmlContent += '</body></html>';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document; doc.open(); doc.write(htmlContent); doc.close();
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); setGenerating(false); }, 5000); }, 1000);
  };

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  return (
    <div className="animate-in fade-in pb-20">
      {/* HEADER */}
      <div className="bg-white rounded-t-[30px] shadow-sm border-b border-gray-200 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-violet-600"></div>
          <div className="p-6 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="flex items-center gap-4"><img src={LOGO_URL} className="w-16 h-auto object-contain" /><div><h2 className="text-2xl font-black text-gray-800 uppercase italic">Administración</h2><p className="text-sm text-blue-600 font-bold uppercase">Centro de Documentación</p></div></div>
              <div className="grid grid-cols-2 gap-2 w-full md:w-auto md:flex">
                  <select onChange={e=>setFilters({...filters, os: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none"><option value="all">OS: Todas</option><option value="con_os">Con OS</option><option value="sin_os">Sin OS</option></select>
                  <select onChange={e=>setFilters({...filters, level: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                  <div className="flex bg-gray-100 rounded-lg items-center px-2"><Search size={14} className="text-gray-400"/><input placeholder="Buscar..." onChange={e=>setFilterText(e.target.value)} className="bg-transparent p-2 text-xs font-bold outline-none w-full"/></div>
              </div>
          </div>
      </div>

      {/* BARRA DE ACCIÓN */}
      <div className="bg-blue-50/80 p-4 backdrop-blur-sm border-b border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <button onClick={toggleSelectAll} className="text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full">{selectedIds.length === filteredStudents.length ? 'Deseleccionar' : 'Seleccionar'} Visibles ({selectedIds.length})</button>
          
          <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
              
              <div className="flex flex-col w-full md:w-auto">
                  <input 
                    placeholder={template === 'concesion_pase' ? "Institución Destino..." : "Presentar ante..."} 
                    value={customTarget} 
                    onChange={e => setCustomTarget(e.target.value)} 
                    className="w-full md:w-48 p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none focus:border-blue-500 placeholder-blue-300 text-blue-900"
                  />
              </div>
              
              <div className="flex flex-col w-full md:w-auto" title="Fecha de emisión">
                  <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full md:w-auto p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none focus:border-blue-500 text-blue-900"/>
              </div>

              <select value={template} onChange={e=>setTemplate(e.target.value)} className="bg-white text-gray-700 pl-4 pr-8 py-2 rounded-xl text-xs font-bold w-full md:w-auto outline-none border border-blue-200 shadow-sm">
                  <option value="constancia_regular">📄 Constancia Regular</option>
                  <option value="planilla_asistencia">🗓️ Planilla Asistencia (Mar-Dic)</option>
                  <option value="concesion_pase">✈️ Concesión de Pase</option>
              </select>

              {/* BOTONES NUEVOS: SOLICITA O CONCEDE */}
              {template === 'concesion_pase' && (
                  <div className="flex bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
                      <button onClick={() => setPaseAction('SOLICITA')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'SOLICITA' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>SOLICITA</button>
                      <button onClick={() => setPaseAction('CONCEDE')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'CONCEDE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>CONCEDE</button>
                  </div>
              )}
              
              <button onClick={generateDocument} disabled={generating || selectedIds.length === 0} className={`bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-2 ${generating || selectedIds.length === 0 ? 'opacity-50' : 'hover:scale-105'}`}>{generating ? <RefreshCw className="animate-spin"/> : <><Printer size={16}/> Imprimir</>}</button>
          </div>
      </div>

      {/* LISTA DE ALUMNOS */}
      <div className="bg-white shadow-sm border-x border-b border-gray-200 overflow-hidden rounded-b-[30px]">
          <div className="p-3 bg-gray-50 border-b border-gray-200 grid grid-cols-12 gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest"><div className="col-span-1 text-center">Sel</div><div className="col-span-4">Alumno</div><div className="col-span-2">DNI</div><div className="col-span-3">OS</div><div className="col-span-2 text-center">Mod</div></div>
          <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
              {filteredStudents.map(s => (
                  <div key={s.id} onClick={() => toggleSelect(s.id)} className={`grid grid-cols-12 gap-2 p-3 items-center cursor-pointer hover:bg-blue-50 ${selectedIds.includes(s.id) ? 'bg-blue-50/80' : ''}`}>
                      <div className="col-span-1 flex justify-center"><div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${selectedIds.includes(s.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300 bg-white'}`}>{selectedIds.includes(s.id) && <Check size={12} className="text-white"/>}</div></div>
                      <div className="col-span-4 font-bold text-sm text-gray-700 truncate">{s.lastName}, {s.firstName}</div>
                      <div className="col-span-2 text-xs text-gray-500 font-mono">{s.dni}</div>
                      <div className="col-span-3 text-xs text-blue-600 font-bold truncate">{s.healthInsurance || '-'}</div>
                      <div className="col-span-2 flex justify-center"><span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${s.modality==='Inclusión'?'bg-indigo-100 text-indigo-700':'bg-orange-100 text-orange-700'}`}>{s.modality||'Sede'}</span></div>
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






















