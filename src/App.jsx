import React, { useState, useEffect, useRef } from 'react';

// Lista de iconos optimizada: Incluye los de alineación para el Generador de Notas
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, 
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, 
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, Printer,
  // Iconos específicos para el formato de las notas
  AlignLeft, AlignCenter, AlignRight, AlignJustify, FileSquare
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion, arrayRemove 
} from 'firebase/firestore';
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
// --- VISTA DASHBOARD (MANUAL COMPLETO + CUMPLES UNIFICADOS) ---
function DashboardView({ user, tasks, events, announcements, setActiveTab }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter(e => e.date === todayStr);
  
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);
  
  // NUEVOS ESTADOS DE CUMPLEAÑOS
  const [studentBirthdays, setStudentBirthdays] = useState([]);
  const [staffBirthdays, setStaffBirthdays] = useState([]);

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
    
    // LÓGICA DE CUMPLEAÑOS UNIFICADA
    const today = new Date(); today.setHours(0,0,0,0);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7); nextWeek.setHours(23,59,59,999);

    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        let noGroupCounter = 0;
        const upcoming = snap.docs.map(d => {
            const data = d.data();
            if (!data.groupMorning && !data.groupAfternoon && !data.daiMorning && !data.daiAfternoon) noGroupCounter++;
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate + 'T00:00:00');
            const currentYearBirth = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (currentYearBirth < today) currentYearBirth.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: currentYearBirth };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        
        setStudentBirthdays(upcoming);
        setUngroupedCount(noGroupCounter);
    });

    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
        const upcoming = snap.docs.map(d => {
            const data = d.data();
            if(!data.birthDate) return null;
            // Para el staff la fecha puede venir con distinto formato (Y-M-D) o sin tiempo
            const dob = new Date(data.birthDate.includes('T') ? data.birthDate : data.birthDate + 'T00:00:00');
            const currentYearBirth = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (currentYearBirth < today) currentYearBirth.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: currentYearBirth };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        
        setStaffBirthdays(upcoming);
    });

    return () => { unsubNotes(); unsubStudents(); unsubStaff(); };
  }, [user.id]);

  const totalBirthdays = studentBirthdays.length + staffBirthdays.length;

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
      
      {totalBirthdays > 0 && (
          <button onClick={() => setShowBirthdayModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-rose-500 p-3 rounded-2xl shadow-md text-white flex items-center justify-between active:scale-95 transition">
              <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl"><Crown size={20} className="text-white"/></div>
                  <div className="text-left"><h3 className="font-bold text-sm uppercase tracking-widest">¡Hay Cumpleaños!</h3><p className="text-xs opacity-90">{totalBirthdays} festejos esta semana</p></div>
              </div>
              <ChevronRight size={20}/>
          </button>
      )}
      
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

      {/* --- MODAL CUMPLEAÑOS UNIFICADO (DOS COLUMNAS) --- */}
      {showBirthdayModal && (
          <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowBirthdayModal(false)}>
              <div className="bg-white rounded-[40px] w-full max-w-3xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-pink-500 max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
                  
                  <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                      <h3 className="text-xl md:text-2xl font-black text-pink-500 uppercase italic flex items-center gap-2"><Crown size={28}/> Cumpleaños de la Semana</h3>
                      <button onClick={() => setShowBirthdayModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
                  </div>

                  <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pr-2">
                      
                      {/* --- COLUMNA ESTUDIANTES --- */}
                      <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><GraduationCap size={16}/> Estudiantes ({studentBirthdays.length})</h4>
                          {studentBirthdays.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-6">No hay alumnos cumpliendo años.</p> : (
                              <div className="space-y-3">
                                  {studentBirthdays.map(b => (
                                      <div key={b.id} className="flex items-center gap-4 bg-pink-50 p-3 rounded-2xl border border-pink-100 hover:shadow-sm transition">
                                          <div className="w-12 h-12 rounded-full bg-white border-2 border-pink-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-pink-400">
                                              {b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : b.firstName[0]}
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-gray-800 leading-tight">{b.firstName} {b.lastName}</h4>
                                              <p className="text-[10px] text-pink-600 font-bold uppercase mt-0.5">{b.modality === 'Inclusión' ? '📍 Inclusión' : `📍 ${[b.groupMorning, b.groupAfternoon].filter(Boolean).join(' / ') || 'Sin Grupo'}`}</p>
                                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 flex items-center gap-1"><CalendarIcon size={10}/> {new Date(b.nextBirthday).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* --- COLUMNA PERSONAL --- */}
                      <div>
                          <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Users size={16}/> Personal de la Casa ({staffBirthdays.length})</h4>
                          {staffBirthdays.length === 0 ? <p className="text-sm text-gray-400 italic text-center py-6">No hay docentes cumpliendo años.</p> : (
                              <div className="space-y-3">
                                  {staffBirthdays.map(b => (
                                      <div key={b.id} className="flex items-center gap-4 bg-violet-50 p-3 rounded-2xl border border-violet-100 hover:shadow-sm transition">
                                          <div className="w-12 h-12 rounded-full bg-white border-2 border-violet-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-violet-400">
                                              {b.photoUrl ? <img src={b.photoUrl} className="w-full h-full object-cover"/> : b.firstName[0]}
                                          </div>
                                          <div>
                                              <h4 className="font-bold text-gray-800 leading-tight">{b.firstName} {b.lastName}</h4>
                                              <p className="text-[10px] text-violet-600 font-bold uppercase mt-0.5">💼 {b.role || 'Docente'}</p>
                                              <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-0.5 flex items-center gap-1"><CalendarIcon size={10}/> {new Date(b.nextBirthday).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
    </div>
  );
}
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

      const data = { 
          title: fd.get('title'), 
          date: fd.get('date'), 
          type: finalType, 
          description: fd.get('description'), 
          author: user.firstName,
          imageUrl: photoPreview || editingEvent?.imageUrl || '' // Se guarda la imagen
      };
      
      try {
          if (editingEvent) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id), data);
              // Actualizamos visualmente el día seleccionado para no tener que cerrar y abrir
              if (selectedDayEvents) {
                  const updatedEvents = selectedDayEvents.events.map(ev => ev.id === editingEvent.id ? { ...ev, ...data } : ev);
                  setSelectedDayEvents({ ...selectedDayEvents, events: updatedEvents });
              }
          } else {
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...data, createdAt: serverTimestamp() });
              // Si agregamos un evento estando dentro del día, recargamos la data manual para verlo rápido
              if (selectedDayEvents) {
                 const newEventLocal = { id: Date.now().toString(), ...data };
                 setSelectedDayEvents({ ...selectedDayEvents, events: [...selectedDayEvents.events, newEventLocal] });
              }
          }
          setShowModal(false); 
          setEditingEvent(null);
          setPhotoPreview(null);
      } catch (err) {
          alert("Error al guardar: " + err.message);
      }
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
                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { title: finalTitle, date: isoDate, type: finalType, description: 'Carga masiva', author: user.firstName, imageUrl: '', createdAt: serverTimestamp() });
              }
              return null; 
          });
          const results = await Promise.all(promises);
          const added = results.filter(r => r !== null).length;
          alert(`✅ Se agregaron ${added} eventos.`);
          setShowQuickLoad(false); setQuickText("");
      } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
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
  const [showMissingUsers, setShowMissingUsers] = useState(false);
  const [missingUsersList, setMissingUsersList] = useState([]); 
  const [missingLegajosList, setMissingLegajosList] = useState([]);

  // ESTADO PARA VINCULACIÓN MANUAL
  const [manualLinks, setManualLinks] = useState({});

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
                {u.legajoId && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded uppercase font-bold border border-green-200">Vinculado</span>}
            </div>
            <p className="text-[9px] font-bold text-gray-400 mt-1">Usuario: <span className="text-blue-500">{u.username}</span> | Clave: <span className="text-blue-500">{u.password}</span></p>
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
                                        
                                        {/* ACCIONES PARA ESTE LEGAJO */}
                                        <div className="flex gap-2">
                                            {/* Si sabemos que la persona ya tiene cuenta con otro nombre, la vinculamos */}
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
                                            
                                            {/* Si definitivamente no tiene cuenta, se la creamos de cero */}
                                            <button onClick={() => handleCreateSingleUser(m)} className="bg-white border-2 border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-black text-[10px] uppercase shadow-sm hover:bg-orange-100 transition whitespace-nowrap">
                                                Crear Nueva
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUMNA 2: TIENEN CUENTA APP, NO TIENEN LEGAJO */}
                    <div>
                        <h4 className="font-black text-violet-600 uppercase text-xs tracking-widest mb-3 flex items-center gap-1"><Smartphone size={16}/> Usuarios sin Legajo ({missingLegajosList.length})</h4>
                        {missingLegajosList.length === 0 ? <p className="text-xs text-gray-400 italic">Todos tienen legajo oficial.</p> : (
                            <div className="space-y-3">
                                {missingLegajosList.map((m, i) => (
                                    <div key={i} className="bg-violet-50 p-4 rounded-2xl border border-violet-200 flex justify-between items-center group">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 leading-tight">{m.lastName}, {m.firstName}</p>
                                            <p className="text-[10px] text-violet-600 font-bold uppercase mt-0.5">{m.role || 'Usuario'}</p>
                                        </div>
                                        <button onClick={() => handleCreateSingleLegajo(m)} className="bg-white border-2 border-violet-300 text-violet-700 px-3 py-2 rounded-lg font-black text-[10px] uppercase shadow-sm hover:bg-violet-100 transition">
                                            Crear Ficha
                                        </button>
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
        <div className="grid grid-cols-2 gap-2"><input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/><input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/></div>
        <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/>
        <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500" required/>
        <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none focus:border-violet-500 font-bold text-gray-600">
            {['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Inclusión', 'Profes Especiales', 'Administración', 'Médico', 'Dirección Inclusión', 'Equipo Técnico Inclusión', 'DAI'].map(r => <option key={r} value={r}>{r}</option>)}
        </select>
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
 const [statFilters, setStatFilters] = useState({ 
      modality: [], 
      level: [], 
      gender: 'all', 
      dx: 'all',
      turn: 'all',
      journey: 'all'
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

  // ==========================================
  // 2. CARGA DE DATOS (FIREBASE)
  // ==========================================
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { uS(); uU(); };
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
      // 1. BUSCADOR UNIVERSAL (Nombre, Apellido, DNI)
      const textToSearch = `${s.lastName || ''} ${s.firstName || ''} ${s.dni || ''}`.toLowerCase();
      const searchTxt = (filterText || '').toLowerCase(); // Usamos filterText
      
      if (searchTxt && !textToSearch.includes(searchTxt)) return false;

      // 2. FILTROS DE SELECTORES (Modalidad y Nivel)
      // Validamos que 'filters' exista antes de leerlo para que no se rompa
      if (filters) {
          if (filters.modality && filters.modality !== 'all') {
              const mod = s.modality || 'Sede';
              if (mod !== filters.modality) return false;
          }
          if (filters.level && filters.level !== 'all' && s.level !== filters.level) return false;
      }

      // 3. OCULTAR INACTIVOS (Por defecto)
      if (s.isActive === false) return false;

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
 // --- CÁLCULO DE ESTADÍSTICAS ---
 // --- CÁLCULO DE ESTADÍSTICAS ---
  const statsResults = students.filter(s => {
      if (s.isActive === false) return false;
      if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false;
      if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false;
      if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false;
      if (statFilters.gender !== 'all' && s.gender !== statFilters.gender) return false;
      
      // NUEVOS FILTROS
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
          const alert = getAlertStatus(s.incidents); 
          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition ${!s.isActive?'border-red-400 opacity-60':alert.status==='danger'?'border-red-500 border-l-4':'border-gray-100'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
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
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase truncate max-w-[120px] ${
                              (s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon)
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                                {s.modality === 'Inclusión' 
                                    ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin DAI</>') 
                                    : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin grupo</>')}
                            </span>
                        </div>
                    </div>
                </div>
                <Eye className="text-gray-300"/>
            </div> 
          ); 
        })}
      </div>
      
      {/* ================= MODALES ================= */}

      {/* 1. MODAL FICHA COMPLETA (DETALLE) */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="bg-slate-700 p-6 text-white relative">
                    <button onClick={()=>setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                    <div className="flex gap-5 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg">
                            {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="m-auto mt-5 text-white/50"/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
                            <div className="flex gap-2 mt-2">
                               <div className="flex flex-wrap gap-2 mt-3">
                                  <div className="bg-orange-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm">
                                    Edad: {calculateAge(viewingStudent.birthDate)} años
                                  </div>
                                  <div className="bg-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-bold">
                                    Nac: {getSafeDate(viewingStudent.birthDate)}
                                  </div>
                                </div>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{viewingStudent.dni}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2 mt-6 bg-slate-800/50 p-1 rounded-xl">
                        <button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white hover:bg-white/10'}`}>Datos Personales</button>
                        <button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/50 hover:text-white hover:bg-white/10'}`}>Bitácora</button>
                    </div>
                </div>
      
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative">
                    {activeModalTab==='info' ? (
                      <div className="space-y-4 text-sm">
                        {canSearchDrive && (
                            <button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm transform hover:scale-[1.02]"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>
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
                        <div className="grid grid-cols-1 gap-3">
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1 mb-3"><Activity size={14}/> Salud y Obra Social</h4><div className="flex justify-between items-center text-xs"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><span className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><span className="font-bold text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</span></div></div></div>
                            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1 mb-3"><User size={14}/> Familia</h4><div className="space-y-3"><div className="flex justify-between items-start border-b border-gray-50 pb-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><span className="font-bold text-xs">{viewingStudent.motherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.motherContact || '-'}</span></div></div><div className="flex justify-between items-start"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><span className="font-bold text-xs">{viewingStudent.fatherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.fatherContact || '-'}</span></div></div></div><div className="mt-3 pt-2 border-t border-gray-100 space-y-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p></div><div className="bg-orange-50 p-2 rounded-lg border border-orange-100"><span className="text-[9px] text-orange-700 font-bold block uppercase mb-1">Autorizados a Retirar</span><p className="font-bold text-xs text-gray-800">{viewingStudent.pickupInfo || 'Sin datos cargados.'}</p></div></div></div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4 pb-20">
                        {!isWriting && (
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {INCIDENT_TYPES.map((type) => (
                                    <button 
                                        key={type.label} 
                                        onClick={() => handleSaveIncident(type.label, type.severity)} 
                                        className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}
                                    >
                                        <span className="text-2xl">{type.emoji}</span>
                                        <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                        <div className="space-y-3">{viewingStudent.incidents?.length > 0 ? viewingStudent.incidents.slice().reverse().map((inc,i)=>(<div key={i} className={`${getSeverityColor(inc.severity)} p-3 rounded-xl border shadow-sm`}><div className="flex justify-between border-b border-gray-200/50 pb-1 mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{new Date(inc.date).toLocaleDateString()}</span><button onClick={()=>deleteIncident(viewingStudent.id, inc)}><Trash2 size={12} className="text-gray-400 hover:text-red-500"/></button></div><p className="font-bold text-sm text-slate-800">{inc.text || inc.type}</p><p className="text-xs text-gray-500 mt-1 uppercase font-bold pl-7">Por: {inc.author}</p></div>)) : <div className="text-center py-6 text-gray-400 text-xs font-bold uppercase">Sin registros</div>}</div>
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
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2">
                    <button onClick={()=>imprimirListado([viewingStudent])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir Ficha</button>
                    <button onClick={()=>openEdit(viewingStudent)} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO DE EDICIÓN (COMPLETO) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{editingStudent?'Editar':'Nuevo'} Legajo</h3>
                <div className="flex justify-center mb-6">
                    <div className="relative group w-24 h-24">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">
                            {photoPreview || editingStudent?.photoUrl ? <img src={photoPreview || editingStudent?.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-gray-300 m-auto mt-6"/>}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            {uploading ? <RefreshCw className="animate-spin" size={14}/> : <Edit3 size={14}/>}
                        </label>
                    </div>
                </div>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button>
                        <button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button>
                    </div>
                    <div className={`p-3 rounded-xl border mb-2 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label>
                            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
  {editingStudent?.isActive === false ? (
    <><AlertCircle size={12} className="text-red-500"/> BAJA / INACTIVO</>
  ) : (
    <><CheckCircle size={12} className="text-green-500"/> ACTIVO (CURSANDO)</>
  )}
</p>
                        </div>
                        <select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none">
                            <option value="true">Activo</option>
                            <option value="false">Inactivo (Baja)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm"/>
                        <input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500"/>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-bold text-blue-700 text-xs uppercase">Datos Escolares ({formModalidad})</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold w-full"><option value="">Nivel...</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option><option value="SECUNDARIA">SECUNDARIA</option></select>
                            <select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold w-full"><option value="">DX...</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                        </div>
                        {formModalidad === 'Sede' ? (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs w-full"/>
                                    <input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs w-full"/>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="teacherMorning" defaultValue={editingStudent?.teacherMorning} className="p-2 rounded-lg border text-xs w-full"><option value="">Docente TM...</option>{staffSede.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                                    <select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon} className="p-2 rounded-lg border text-xs w-full"><option value="">Docente TT...</option>{staffSede.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                                </div>
                            </>
                        ) : (
                            <>
                                <input name="originSchool" defaultValue={editingStudent?.originSchool} placeholder="Escuela de Origen" className="w-full p-2 rounded-lg border text-xs font-bold"/>
                                <input name="originGrade" defaultValue={editingStudent?.originGrade} placeholder="Grado/Año" className="w-full p-2 rounded-lg border text-xs"/>
                               <div className="grid grid-cols-2 gap-2">
        <select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs">
            <option value="">DAI T. Mañana...</option>
            {editingStudent?.daiMorning && !staffInclusion.find(u => u.fullName === editingStudent?.daiMorning) && <option value={editingStudent.daiMorning}>{editingStudent.daiMorning} (Nombre Viejo)</option>}
            {staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}
        </select>
        <select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs">
            <option value="">DAI T. Tarde...</option>
            {editingStudent?.daiAfternoon && !staffInclusion.find(u => u.fullName === editingStudent?.daiAfternoon) && <option value={editingStudent.daiAfternoon}>{editingStudent.daiAfternoon} (Nombre Viejo)</option>}
            {staffInclusion.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}
        </select>
    </div>
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100 mt-2">
                                    <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">📂 Carpeta Drive Personal</label>
                                    <input name="driveLink" defaultValue={editingStudent?.driveLink} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-lg border text-xs text-green-800"/>
                                </div>
                            </>
                        )}
                    </div>
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                        <h4 className="font-bold text-green-800 text-xs uppercase">Salud y Familia</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs"/>
                            <input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500"/>
                        </div>
                        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs" placeholder="Dirección"/>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs"/>
                            <input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs"/>
                            <input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="w-full p-2 rounded-lg border text-xs"/>
                        </div>
                        <div className="border-t border-green-200 pt-2">
                            <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">Personas autorizadas a retirar</label>
                            <textarea name="pickupInfo" defaultValue={editingStudent?.pickupInfo} className="w-full p-2 rounded-lg border text-xs h-16 resize-none" placeholder="Abuela Marta, Tía Juana..."/>
                        </div>
                    </div>
                    <div className="flex gap-2 pt-4 border-t">
                        <button type="button" onClick={()=>setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>
                        {editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20}/></button>}
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

      {/* 4. MODAL ESTADÍSTICAS */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3>
                        <p className="text-xs text-gray-500">Filtrado Acumulativo</p>
                    </div>
                    <button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                <div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner">
                    <span className="text-5xl font-black text-violet-600 block mb-2">{statsResults.length}</span>
                    <span className="text-xs font-bold text-violet-400 uppercase tracking-[4px]">Coincidencias</span>
                </div>
                <div className="space-y-4">
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Niveles</p>
                        <div className="flex flex-wrap gap-2">
                            {['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (
                                <button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Modalidad</p>
                        <div className="flex flex-wrap gap-2">
                            {['Sede', 'Inclusión'].map(mod => (
                                <button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>
                            ))}
                        </div>
                    </div>
                  <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                        <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select>
                    </div>
                    {/* NUEVOS SELECTORES DE TURNO Y JORNADA */}
                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200">
                            <option value="all">Turno: Todos</option>
                            <option value="Mañana">Mañana</option>
                            <option value="Tarde">Tarde</option>
                        </select>
                        <select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200">
                            <option value="all">Jornada: Todas</option>
                            <option value="Simple Mañana">Simple Mañana</option>
                            <option value="Simple Tarde">Simple Tarde</option>
                            <option value="Doble">Doble</option>
                        </select>
                    </div>
                </div>
                <button onClick={() => setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all', turn: 'all', journey: 'all' })} className="w-full py-3 text-red-400 font-bold text-xs hover:bg-red-50 rounded-xl transition mt-4">Limpiar Filtros</button>  </div>
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
  // --- DEFINICIÓN DE PERMISOS GLOBALES ---
  const isAdminRole = ['admin', 'super-admin', 'Administración', 'Equipo Directivo', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isTechTeamRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Equipo Técnico', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const isMedicalRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user.role) || user.rol === 'admin';
  const showPrivateMenu = isAdminRole || isTechTeamRole || isMedicalRole;
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
        {activeTab === 'admin' && <ew user={user} />}
        {/* ----------------------------------------------------------------- */}
        {activeTab === 'users' && isSuperAdmin && <UsersAdminView />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}
        {activeTab === 'admin' && <AdministracionView user={user} />}
        {/* PEGAR ESTA LÍNEA NUEVA: */}
        {activeTab === 'personal' && <PersonalView user={user} />}
        {activeTab === 'medical' && <MedicalView user={user} />}
    
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
  // Detecta si es inclusión leyendo cualquier parte de su rol (ej: "Docente de apoyo a la inclusión")
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
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
 // --- AGRUPAMIENTO DE DATOS ---
  const groupedData = students.reduce((acc, s) => {
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
      
      if (s.modality === 'Inclusión') {
          const dais = [...new Set([s.daiMorning, s.daiAfternoon].filter(Boolean))];
          dais.forEach(daiName => {
              const groupKey = `DAI: ${daiName}`;
              if (!acc[groupKey]) {
                  acc[groupKey] = { 
                    name: groupKey, 
                    students: [], 
                    teacher: daiName, 
                    teacherId: s.daiId, // <--- GUARDAMOS EL ID EN EL GRUPO
                    isInclusionGroup: true 
                  };
              }
              if (!acc[groupKey].students.find(x => x.id === s.id)) {
                  acc[groupKey].students.push(s);
              }
          });
      } else {
          const groupName = s[`group${suf}`];
          if (!groupName) return acc;
          const groupKey = groupName.trim();
          const myTeacher = s[`teacher${suf}`];
          const myTeacherId = s[`teacherId${suf}`]; // <--- LEEMOS EL ID DEL ALUMNO
          
          if (!acc[groupKey]) { 
              acc[groupKey] = { 
                  name: groupKey, 
                  students: [], 
                  teacher: myTeacher, 
                  teacherId: myTeacherId, // <--- ASIGNAMOS EL ID AL GRUPO
                  teacher2: s[`teacher2${suf}`], 
                  aux: s[`aux${suf}`], 
                  special1: s[`special1${suf}`], 
                  special2: s[`special2${suf}`], 
                  special3: s[`special3${suf}`], 
                  sup1: s[`sup1${suf}`], 
                  sup2: s[`sup2${suf}`], 
                  classroom: s.classroom, 
                  driveLink: s[`driveLink${suf}`], 
                  isInclusionGroup: false 
              }; 
          } else { 
              if (!acc[groupKey].aux && s[`aux${suf}`]) acc[groupKey].aux = s[`aux${suf}`]; 
              if (!acc[groupKey].teacher2 && s[`teacher2${suf}`]) acc[groupKey].teacher2 = s[`teacher2${suf}`]; 
              if (!acc[groupKey].teacher && myTeacher) {
                  acc[groupKey].teacher = myTeacher;
                  acc[groupKey].teacherId = myTeacherId;
              }
              // ... el resto de tus verificaciones de especiales, sup, etc ...
              if (!acc[groupKey].special1 && s[`special1${suf}`]) acc[groupKey].special1 = s[`special1${suf}`]; 
              if (!acc[groupKey].special2 && s[`special2${suf}`]) acc[groupKey].special2 = s[`special2${suf}`]; 
              if (!acc[groupKey].special3 && s[`special3${suf}`]) acc[groupKey].special3 = s[`special3${suf}`]; 
              if (!acc[groupKey].sup1 && s[`sup1${suf}`]) acc[groupKey].sup1 = s[`sup1${suf}`]; 
              if (!acc[groupKey].sup2 && s[`sup2${suf}`]) acc[groupKey].sup2 = s[`sup2${suf}`]; 
              if (!acc[groupKey].classroom && s.classroom) acc[groupKey].classroom = s.classroom; 
              if (!acc[groupKey].driveLink && s[`driveLink${suf}`]) acc[groupKey].driveLink = s[`driveLink${suf}`]; 
          }
          acc[groupKey].students.push(s); 
      }
      return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.localeCompare(b.name));

 // --- FILTRADO FINAL INFALIBLE (POR ID Y POR NOMBRE) ---
  if (!isManagement) {
      // Función para "limpiar" nombres y compararlos sin importar tildes o mayúsculas
      const normalizeName = (name) => {
          if (!name) return "";
          return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      };

      groups = groups.filter(g => {
          const uNameRaw = user.fullName || `${user.firstName} ${user.lastName}`;
          const uName = normalizeName(uNameRaw);
          const uId = user.id;

          // 1. Verificar si es el Docente principal (por ID o por Nombre)
          if (g.teacherId === uId || normalizeName(g.teacher) === uName) return true;

          // 2. Verificar si está como Auxiliar, Pareja Pedagógica o Equipo de Apoyo en el Grupo
          if (normalizeName(g.aux) === uName || 
              normalizeName(g.teacher2) === uName || 
              normalizeName(g.sup1) === uName || 
              normalizeName(g.sup2) === uName) return true;

          // 3. Verificar si es algún Profe Especial de este grupo
          if (normalizeName(g.special1) === uName || 
              normalizeName(g.special2) === uName || 
              normalizeName(g.special3) === uName) return true;

          // 4. Si no es nada de eso a nivel grupo, revisamos alumno por alumno
          const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
          const isAssignedToAnyStudent = g.students.some(s => {
              return s[`teacherId${suf}`] === uId || 
                     normalizeName(s[`teacher${suf}`]) === uName || 
                     s.daiId === uId || 
                     normalizeName(s.daiMorning) === uName || 
                     normalizeName(s.daiAfternoon) === uName;
          });

          return isAssignedToAnyStudent;
      });
  } else {
      if (viewFilter !== 'all') { 
          groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup); 
      }
  }

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
  
const handleUpdateGroup = async (e) => { 
      e.preventDefault(); 
      if (!editingGroup) return; 
      if (editingGroup.isInclusionGroup && !confirm("⚠️ Estás editando un grupo de INCLUSIÓN. Esto cambiará la DAI para todos los alumnos de la lista.")) return; 
      
      setUpdatingGroup(true); 
      const fd = new FormData(e.target); 
      const updates = {}; 
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon'; 
      
      // Buscamos el ID del docente seleccionado para que sea infalible
      const selectedTeacherName = fd.get('teacher');
      const teacherObj = usersList.find(u => u.fullName === selectedTeacherName);
      const teacherId = teacherObj ? teacherObj.id : null;

      if (editingGroup.isInclusionGroup) { 
          // Para Inclusión, actualizamos en ambos turnos porque ahora están unificados
          updates['daiMorning'] = selectedTeacherName; 
          updates['daiAfternoon'] = selectedTeacherName;
          updates['daiId'] = teacherId; // <--- GUARDAMOS EL ID ÚNICO
      } else { 
          updates[`teacher${suf}`] = selectedTeacherName; 
          updates[`teacherId${suf}`] = teacherId; // <--- GUARDAMOS EL ID ÚNICO
          updates[`teacher2${suf}`] = fd.get('teacher2'); 
          updates[`aux${suf}`] = fd.get('aux'); 
          updates[`special1${suf}`] = fd.get('special1'); 
          updates[`special2${suf}`] = fd.get('special2'); 
          updates[`special3${suf}`] = fd.get('special3'); 
          updates[`sup1${suf}`] = fd.get('sup1'); 
          updates[`sup2${suf}`] = fd.get('sup2'); 
          updates[`group${suf}`] = fd.get('groupName'); 
          updates.classroom = fd.get('classroom'); 
      } 
      updates[`driveLink${suf}`] = fd.get('driveLink'); 
      
      try { 
          const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)); 
          await Promise.all(promises); 
          alert("✅ Actualizado correctamente con ID de seguridad."); 
          setEditingGroup(null); 
      } catch (err) { alert(err.message); } finally { setUpdatingGroup(false); } 
  };
  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales', 'DAI', 'Inclusión'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico' || u.role === 'Equipo Técnico Inclusión' || u.role === 'Trabajadora Social');
  const specialOptions = usersList.filter(u => u.role === 'Profes Especiales' || u.role === 'Docente');

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
     {/* CABECERA DE PERFIL IDENTIFICADA POR ID (Fix para Yaninas) */}
      {!isManagement && (
        <div className="bg-white px-6 py-4 border-b flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner">
            <User size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Docente Identificada</p>
            <h2 className="text-lg font-black text-violet-900 uppercase italic leading-none">
              {user.fullName || `${user.firstName} ${user.lastName}`}
            </h2>
            <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase">ID de seguridad: {user.id.substring(0,8)}...</p>
          </div>
        </div>
      )}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p>
              </div>
              {isManagement && <button onClick={handlePrintAll} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}
          </div>
          
          <div className={`flex gap-2 ${viewFilter === 'inclusion' ? 'justify-end' : ''}`}>
              {/* Ocultamos los turnos si estamos viendo Inclusión */}
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
                              <button onClick={()=>handlePrintSingleGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
                              {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
                          </div>
                          <div className="flex items-center gap-2 pr-24 flex-wrap">
    <h3 className="font-black text-gray-800 text-lg leading-tight">{g.name}</h3>
    <span className="bg-white/80 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm border border-violet-100 shrink-0">
        {g.students.length} ALUMNXS
    </span>
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

      {editingGroup && (<div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto"><div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3><button type="button" onClick={()=>setEditingGroup(null)}><X/></button></div><div className="space-y-4"><div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center"><p className="text-xs text-violet-500 font-bold uppercase mb-1">{editingGroup.isInclusionGroup ? 'Editando Cartera DAI' : 'Editando Grupo Sede'}</p>{!editingGroup.isInclusionGroup && <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200 focus:border-violet-500" placeholder="Nombre Grupo"/>}</div>
       <div>
        <label className="text-xs font-bold text-gray-500 ml-1">{editingGroup.isInclusionGroup ? 'DAI Responsable' : 'Docente a Cargo'}</label>
        <select name="teacher" defaultValue={editingGroup.teacher} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs">
            <option value="">Sin asignar</option>
            {editingGroup?.teacher && !staffOptions.find(u => u.fullName === editingGroup.teacher) && <option value={editingGroup.teacher}>{editingGroup.teacher} (Nombre Viejo)</option>}
            {staffOptions.map(u=><option key={u.id} value={u.fullName}>{u.fullName}</option>)}
        </select>
    </div>
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
// --- VISTA PERSONAL (ACTUALIZADA: SUBVENCIÓN POR CARGO INDIVIDUAL) ---
function PersonalView({ user }) {
  const [staffList, setStaffList] = useState([]);
  
  // Estados de Filtros
  const [staffFilterText, setStaffFilterText] = useState('');
  const [filters, setFilters] = useState({ modality: 'all', role: 'all', turn: 'all', subsidized: 'all' });
  
  // Modales
  const [viewingStaff, setViewingStaff] = useState(null); 
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showStats, setShowStats] = useState(false); 
  
  // Estados de proceso
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, (snap) => { setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsubStaff();
  }, []);

  // LÓGICA DE FILTRADO
  const filteredStaff = staffList.filter(s => {
      const txt = staffFilterText.toLowerCase();
      const matchesText = !txt || `${s.lastName} ${s.firstName} ${s.dni}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      
      if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
      if (filters.role !== 'all' && (s.role || 'Sin Definir') !== filters.role) return false;
      
      if (filters.subsidized !== 'all') {
          // Revisamos si ALGUNO de sus cargos está subvencionado (o el flag viejo por retrocompatibilidad)
          const isSub1 = s.cargo1_subsidized === 'true' || (s.isSubsidized === 'true' && s.cargo1_name);
          const isSub2 = s.cargo2_subsidized === 'true';
          const hasAnySub = isSub1 || isSub2;
          
          if (filters.subsidized === 'yes' && !hasAnySub) return false;
          if (filters.subsidized === 'no' && hasAnySub) return false;
      }

      if (filters.turn !== 'all') {
          const c1T = (s.cargo1_turn || '').toLowerCase();
          const c2T = (s.cargo2_turn || '').toLowerCase();
          const targetTurn = filters.turn.toLowerCase();
          if (!c1T.includes(targetTurn) && !c2T.includes(targetTurn)) return false;
      }

      return true;
  });

  const uniqueRoles = [...new Set(staffList.map(s => s.role || 'Sin Definir'))].sort();
  const uniqueTurns = [...new Set([...staffList.map(s => s.cargo1_turn), ...staffList.map(s => s.cargo2_turn)].filter(Boolean))].sort();

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

  const imprimirFichasDocentes = (lista) => {
      if (!lista || lista.length === 0) return alert("No hay docentes para imprimir.");
      let html = `<html><head><title>Fichas Docentes</title>
      <style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');body{font-family:'Roboto',sans-serif;padding:20px;}.page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #8b5cf6;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}.header-text h1{color:#5b21b6;font-size:24px;margin:0;text-transform:uppercase;}.header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}.photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #8b5cf6;display:flex;align-items:center;justify-content:center;font-size:30px;color:#aaa;}.photo-box img{width:100%;height:100%;object-fit:cover;}.section-title{background:#f3f4f6;color:#5b21b6;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #8b5cf6;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}.field{margin-bottom:5px;}.label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}.value{font-size:12px;font-weight:bold;color:#333;}.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}</style></head><body>`;
      
      lista.forEach(s => {
          let antiguedad = calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef);
          
          let sub1Text = (s.cargo1_subsidized === 'true' || s.isSubsidized === 'true') ? 'SUBVENCIONADO' : 'SIN SUBVENCIÓN';
          let c1 = s.cargo1_name ? `Cargo N°${s.cargo1_numero || '-'} | ${s.cargo1_name} (${s.cargo1_type}) - ${s.cargo1_turn} - ${s.cargo1_revista} - <b>${sub1Text}</b> <br/><span style="color:#666; font-size:9px; text-transform:uppercase;">ALTA CARGO: ${getSafeDate(s.cargo1_ingreso)}</span>` : '-';
          
          let sub2Text = s.cargo2_subsidized === 'true' ? 'SUBVENCIONADO' : 'SIN SUBVENCIÓN';
          let c2 = s.cargo2_name ? `Cargo N°${s.cargo2_numero || '-'} | ${s.cargo2_name} (${s.cargo2_type}) - ${s.cargo2_turn} - ${s.cargo2_revista} - <b>${sub2Text}</b> <br/><span style="color:#666; font-size:9px; text-transform:uppercase;">ALTA CARGO: ${getSafeDate(s.cargo2_ingreso)}</span>` : '-';

          html += `<div class="page">
              <div class="header">
                  <div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Rol: ${s.role || 'Docente'}</p></div>
                  <div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : s.firstName?.[0] || 'U'}</div>
              </div>
              <div class="section-title">Datos Personales y Contacto</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Teléfono / Celular</span><span class="value">${s.phone || '-'}</span></div>
                  <div class="field"><span class="label">Email</span><span class="value">${s.email || '-'}</span></div>
                  <div class="field"><span class="label">Contacto de Emergencia</span><span class="value" style="color:#dc2626">${s.emergencyContact || '-'}</span></div>
              </div>
              <div class="field" style="margin-bottom:15px;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div>
              <div class="section-title">Formación Académica</div>
              <div class="grid">
                  <div class="field"><span class="label">Estado de Estudios</span><span class="value">${s.studyStatus || '-'}</span></div>
                  <div class="field"><span class="label">Título</span><span class="value">${s.degree || '-'}</span></div>
              </div>
              <div class="section-title">Datos de Contratación (${s.modality || 'Sede'})</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Ingreso Inst.</span><span class="value">${s.fechaIngreso ? new Date(s.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Antigüedad Reconocida Total</span><span class="value">${antiguedad}</span></div>
              </div>
              <div class="field" style="margin-bottom:10px; margin-top:5px;"><span class="label">Cargo 1</span><span class="value">${c1}</span></div>
              <div class="field"><span class="label">Cargo 2</span><span class="value">${c2}</span></div>
              <div class="footer">Juntos a la Par - Legajo Docente generado el ${new Date().toLocaleDateString('es-AR')}</div>
          </div>`;
      });
      html += '</body></html>';

      const iframe = document.createElement('iframe'); 
      iframe.style.position = 'fixed'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
      document.body.appendChild(iframe); 
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close(); 
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
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
                      role: cols[10]?.trim() || 'Docente', modality: cols[11]?.trim() || 'Sede',
                      cargo1_subsidized: cols[12]?.trim() === 'SI' ? 'true' : 'false', // Mapeamos el viejo isSubsidized al cargo 1
                      cargo1_name: cols[13]?.trim() || '', cargo1_type: cols[14]?.trim() || '', cargo1_turn: cols[15]?.trim() || '', cargo1_revista: cols[16]?.trim() || '',
                      cargo2_name: cols[17]?.trim() || '', cargo2_type: cols[18]?.trim() || '', cargo2_turn: cols[19]?.trim() || '', cargo2_revista: cols[20]?.trim() || '',
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
    d.photoUrl = photoPreview || editingStaff?.photoUrl || '';
    
    try {
        if (editingStaff) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id), d);
            if (viewingStaff?.id === editingStaff.id) setViewingStaff({ ...editingStaff, ...d });
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), { ...d, createdAt: serverTimestamp() });
        }
        setShowStaffForm(false); setEditingStaff(null); setPhotoPreview(null);
    } catch (err) { alert(err.message); }
  };

  // --- LÓGICA DE ESTADÍSTICAS ACTUALIZADA (CUENTA CARGOS SUBVENCIONADOS) ---
  const calculateStats = () => {
      const stats = {
          total: filteredStaff.length,
          sede: filteredStaff.filter(s => (s.modality || 'Sede') === 'Sede').length,
          inclusion: filteredStaff.filter(s => s.modality === 'Inclusión').length,
          roles: {},
          cargos: { simple: 0, doble: 0 },
          subvencion: { si: 0, no: 0 } // AHORA CUENTA CARGOS (No personas)
      };

      filteredStaff.forEach(s => {
          const rol = (s.role || 'Sin Definir');
          stats.roles[rol] = (stats.roles[rol] || 0) + 1;

          const tieneCargo1 = s.cargo1_name && s.cargo1_name.trim() !== '';
          const tieneCargo2 = s.cargo2_name && s.cargo2_name.trim() !== '';
          
          if (tieneCargo1 && tieneCargo2) stats.cargos.doble++;
          else if (tieneCargo1 || tieneCargo2) stats.cargos.simple++;

          if (tieneCargo1) {
              if (s.cargo1_subsidized === 'true' || s.isSubsidized === 'true') stats.subvencion.si++;
              else stats.subvencion.no++;
          }
          if (tieneCargo2) {
              if (s.cargo2_subsidized === 'true') stats.subvencion.si++;
              else stats.subvencion.no++;
          }
      });

      stats.rolesSorted = Object.entries(stats.roles).sort((a,b) => b[1] - a[1]);
      return stats;
  };

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  const currentStats = calculateStats();

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 md:px-4 pt-4">
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-violet-100 shadow-sm gap-4">
            <div>
                <h3 className="font-black text-violet-900 uppercase italic text-xl">Personal</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase">{filteredStaff.length} Legajos visibles</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowStats(true)} className="bg-white text-orange-500 border border-orange-200 p-3 rounded-2xl shadow-sm hover:bg-orange-50 transition" title="Ver Estadísticas"><PieChart size={20}/></button>
                <button onClick={() => imprimirFichasDocentes(filteredStaff)} className="bg-white text-violet-600 border border-violet-200 p-3 rounded-2xl shadow-sm hover:bg-violet-50 transition" title="Imprimir Lista"><Printer size={20}/></button>
                <label className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl cursor-pointer hover:bg-emerald-200 transition">
                    {processing ? <RefreshCw className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportStaff} />
                </label>
                <button onClick={()=>{setEditingStaff(null); setPhotoPreview(null); setShowStaffForm(true);}} className="bg-violet-600 text-white p-3 rounded-2xl shadow-lg"><Plus size={20}/></button>
            </div>
        </div>

        <div className="space-y-2">
            <div className="bg-white p-2 rounded-2xl border border-gray-100 flex items-center gap-2 shadow-sm">
                <Search size={18} className="ml-2 text-gray-300"/>
                <input value={staffFilterText} onChange={e=>setStaffFilterText(e.target.value)} placeholder="Buscar por apellido, nombre o DNI..." className="w-full p-2 outline-none text-sm font-bold text-gray-700 bg-transparent"/>
                {staffFilterText && <button onClick={()=>setStaffFilterText('')} className="pr-2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <select value={filters.modality} onChange={e=>setFilters({...filters, modality: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option>
                </select>
                <select value={filters.role} onChange={e=>setFilters({...filters, role: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Rol: Todos</option>
                    {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <select value={filters.turn} onChange={e=>setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Turno: Todos</option>
                    {uniqueTurns.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <select value={filters.subsidized} onChange={e=>setFilters({...filters, subsidized: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Subvención: Todas</option><option value="yes">Con Subvención (Algún cargo)</option><option value="no">Sin Subvención</option>
                </select>
                <button onClick={() => setFilters({ modality: 'all', role: 'all', turn: 'all', subsidized: 'all' })} className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg font-bold min-w-[80px] border border-red-100 shadow-sm hover:bg-red-100 transition">Limpiar</button>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[65vh] overflow-y-auto pb-10 mt-2">
            {filteredStaff.map(s => {
                // Pequeño chequeo visual rápido para ver si tiene subvención en algún lado
                const tieneSub = s.cargo1_subsidized === 'true' || s.cargo2_subsidized === 'true' || s.isSubsidized === 'true';
                
                return (
                    <div key={s.id} onClick={() => setViewingStaff(s)} className="bg-white p-4 rounded-[25px] border border-gray-100 shadow-sm flex items-center gap-4 hover:border-violet-300 transition-all cursor-pointer group">
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center font-black text-violet-300 overflow-hidden border-2 border-violet-100 shrink-0 relative">
                            {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName?.[0]}
                            {tieneSub && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Subvencionada"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center flex-wrap">
                                <h4 className="font-bold text-gray-800 text-sm uppercase truncate">{s.lastName}, {s.firstName}</h4>
                                <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase ${s.modality === 'Inclusión' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{s.modality || 'Sede'}</span>
                            </div>
                            <div className="flex gap-2 text-[10px] mt-1 text-gray-500 font-bold">
                                {s.dni && <span>DNI: {s.dni}</span>}
                                <span className="text-violet-500">Anti: {calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef)}</span>
                            </div>
                            <p className="text-[10px] font-black text-violet-500 uppercase mt-1 truncate">
                                {s.cargo1_name ? `C1: ${s.cargo1_name}` : 'Sin Cargos'} 
                                {s.cargo2_name ? ` | C2: ${s.cargo2_name}` : ''}
                            </p>
                        </div>
                        <Eye className="text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
                    </div>
                )
            })}
        </div>

        {/* MODAL ESTADÍSTICAS */}
        {showStats && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setShowStats(false)}>
                <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-orange-500 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-2xl font-black text-violet-900 uppercase italic">Métricas</h3>
                            <p className="text-xs text-gray-500 font-bold">Resumen del Personal (Filtrado)</p>
                        </div>
                        <button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                    </div>

                    <div className="space-y-6">
                        <div className="flex gap-3">
                            <div className="flex-1 bg-violet-50 rounded-2xl p-4 text-center border border-violet-100">
                                <span className="block text-3xl font-black text-violet-700">{currentStats.total}</span>
                                <span className="text-[9px] font-bold text-violet-500 uppercase tracking-widest">Total Staff</span>
                            </div>
                            <div className="flex-1 bg-indigo-50 rounded-2xl p-4 text-center border border-indigo-100">
                                <span className="block text-xl font-black text-indigo-700">{currentStats.inclusion}</span>
                                <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest">Inclusión</span>
                            </div>
                            <div className="flex-1 bg-orange-50 rounded-2xl p-4 text-center border border-orange-100">
                                <span className="block text-xl font-black text-orange-700">{currentStats.sede}</span>
                                <span className="text-[9px] font-bold text-orange-500 uppercase tracking-widest">Sede</span>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Distribución por Rol</h4>
                            <div className="space-y-2">
                                {currentStats.rolesSorted.map(([rol, count]) => {
                                    const percentage = Math.round((count / currentStats.total) * 100);
                                    return (
                                        <div key={rol} className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                                            <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                                                <span>{rol}</span>
                                                <span>{count} ({percentage}%)</span>
                                            </div>
                                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                <div style={{width: `${percentage}%`}} className="h-full bg-violet-500"></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white border-2 border-gray-100 p-4 rounded-2xl">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 text-center">Tipo de Cargo</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Simples</span><span className="text-gray-800">{currentStats.cargos.simple}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="text-gray-500">Dobles</span><span className="text-gray-800">{currentStats.cargos.doble}</span></div>
                                </div>
                            </div>
                            <div className="bg-white border-2 border-gray-100 p-4 rounded-2xl">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase mb-2 text-center">Subvención (Cargos)</h4>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold"><span className="text-emerald-500">Aprobados</span><span className="text-gray-800">{currentStats.subvencion.si}</span></div>
                                    <div className="flex justify-between text-xs font-bold"><span className="text-red-400">Sin aval</span><span className="text-gray-800">{currentStats.subvencion.no}</span></div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        )}

        {/* MODAL LECTURA LEGAJO */}
        {viewingStaff && !showStaffForm && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingStaff(null)}>
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-violet-800 p-6 text-white relative">
                        <button onClick={()=>setViewingStaff(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                        <div className="flex gap-5 items-center">
                            <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg">
                                {viewingStaff.photoUrl ? <img src={viewingStaff.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="m-auto mt-5 text-white/50"/>}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStaff.lastName}, {viewingStaff.firstName}</h2>
                                <p className="text-orange-300 font-bold text-xs uppercase">{viewingStaff.role || 'Docente'} - {viewingStaff.modality || 'Sede'}</p>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold inline-block mt-2">DNI: {viewingStaff.dni || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nacimiento</p><p className="font-black text-slate-800 text-xs">{getSafeDate(viewingStaff.birthDate)}</p></div>
                            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Celular</p><p className="font-black text-slate-800 text-xs">{viewingStaff.phone || '-'}</p></div>
                            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Email</p><p className="font-black text-slate-800 text-xs truncate">{viewingStaff.email || '-'}</p></div>
                            <div className="bg-red-50 p-3 rounded-2xl border border-red-200 shadow-sm"><p className="text-[9px] text-red-400 font-bold uppercase mb-1">Emergencia</p><p className="font-black text-red-800 text-xs">{viewingStaff.emergencyContact || '-'}</p></div>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                            <h4 className="font-bold text-violet-600 text-xs uppercase mb-2">Formación</h4>
                            <p className="text-sm font-bold text-gray-800">{viewingStaff.degree || 'Sin cargar'}</p>
                            <p className="text-xs text-gray-500 mt-1">Estado: {viewingStaff.studyStatus || '-'}</p>
                        </div>

                        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 shadow-sm space-y-3">
                            <div className="flex justify-between text-xs border-b border-violet-200 pb-2">
                                <span className="font-bold text-gray-500">Ingreso Inst: {getSafeDate(viewingStaff.fechaIngreso)}</span>
                                <span className="font-black text-violet-700">Anti. total: {calcularAntiguedad(viewingStaff.antiguedadAnios, viewingStaff.antiguedadMeses, viewingStaff.antiguedadFechaRef)}</span>
                            </div>
                            
                            {(viewingStaff.cargo1_name || viewingStaff.cargo2_name) && (
                                <div className="pt-1 space-y-2">
                                    {viewingStaff.cargo1_name && (
                                        <div className="bg-white p-3 rounded-lg border border-violet-200 text-xs shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black text-violet-900">C1: {viewingStaff.cargo1_name}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo1_subsidized === 'true' || viewingStaff.isSubsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {viewingStaff.cargo1_subsidized === 'true' || viewingStaff.isSubsidized === 'true' ? 'Subvencionado' : 'Sin Subvención'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 mb-1">N° {viewingStaff.cargo1_numero || '-'} | {viewingStaff.cargo1_type} | {viewingStaff.cargo1_turn} | {viewingStaff.cargo1_revista}</p>
                                            <p className="text-[10px] text-violet-600 font-bold">Alta Cargo: {getSafeDate(viewingStaff.cargo1_ingreso)}</p>
                                        </div>
                                    )}
                                    {viewingStaff.cargo2_name && (
                                        <div className="bg-white p-3 rounded-lg border border-violet-200 text-xs shadow-sm">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black text-violet-900">C2: {viewingStaff.cargo2_name}</span>
                                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo2_subsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                                                    {viewingStaff.cargo2_subsidized === 'true' ? 'Subvencionado' : 'Sin Subvención'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 mb-1">N° {viewingStaff.cargo2_numero || '-'} | {viewingStaff.cargo2_type} | {viewingStaff.cargo2_turn} | {viewingStaff.cargo2_revista}</p>
                                            <p className="text-[10px] text-violet-600 font-bold">Alta Cargo: {getSafeDate(viewingStaff.cargo2_ingreso)}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
                        <button onClick={()=>imprimirFichasDocentes([viewingStaff])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-xs uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir</button>
                        <button onClick={()=>{setEditingStaff(viewingStaff); setPhotoPreview(viewingStaff.photoUrl); setShowStaffForm(true);}} className="px-4 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-violet-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL EDICIÓN LEGAJO */}
        {showStaffForm && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm animate-in zoom-in-95">
              <div className="bg-white rounded-[40px] w-full max-w-xl p-8 shadow-2xl max-h-[90vh] overflow-y-auto border-t-8 border-violet-600 custom-scrollbar">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-violet-900 uppercase italic">{editingStaff ? 'Editar Legajo' : 'Nuevo Legajo'}</h3>
                      <button onClick={()=>setShowStaffForm(false)}><X size={24} className="text-gray-300"/></button>
                  </div>
                  
                  <div className="flex justify-center mb-6">
                      <div className="relative group w-24 h-24">
                          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-violet-100 bg-gray-50 shadow-inner flex items-center justify-center">
                              {photoPreview || editingStaff?.photoUrl ? <img src={photoPreview || editingStaff?.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-gray-300"/>}
                          </div>
                          <label className="absolute -bottom-2 -right-2 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-lg border-2 border-white transition-transform hover:scale-110">
                              <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                              {uploading ? <RefreshCw className="animate-spin" size={14}/> : <Edit3 size={14}/>}
                          </label>
                      </div>
                  </div>

                  <form onSubmit={handleSaveStaff} className="space-y-4">
                      <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3">
                          <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Datos Personales</h4>
                          <div className="grid grid-cols-2 gap-3"><input name="firstName" defaultValue={editingStaff?.firstName} placeholder="Nombre" required className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/><input name="lastName" defaultValue={editingStaff?.lastName} placeholder="Apellido" required className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/></div>
                          <div className="grid grid-cols-2 gap-3"><input name="dni" defaultValue={editingStaff?.dni} placeholder="DNI" className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/><input name="birthDate" type="date" defaultValue={editingStaff?.birthDate} className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-xs text-gray-500"/></div>
                          <div className="grid grid-cols-2 gap-3"><input name="phone" defaultValue={editingStaff?.phone} placeholder="Celular" className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/><input name="email" defaultValue={editingStaff?.email} placeholder="Email" type="email" className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/></div>
                          <input name="address" defaultValue={editingStaff?.address} placeholder="Dirección" className="p-3 bg-white rounded-xl w-full border border-gray-200 outline-none font-bold text-sm"/>
                          <input name="emergencyContact" defaultValue={editingStaff?.emergencyContact} placeholder="Teléfono/Contacto de Emergencia" className="p-3 bg-red-50 text-red-800 rounded-xl w-full border border-red-100 outline-none font-bold text-xs"/>
                      </div>

                      <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 space-y-4">
                          <div className="flex justify-between items-center border-b border-violet-200 pb-2">
                              <h4 className="text-[10px] font-black text-violet-500 uppercase tracking-widest">Contratación</h4>
                              <select name="modality" defaultValue={editingStaff?.modality || 'Sede'} className="p-1 bg-white rounded-lg border border-violet-200 outline-none font-bold text-[10px] text-violet-900"><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option><option value="Ambos">Ambos</option></select>
                          </div>

                          <div className="grid grid-cols-2 gap-2 bg-white p-3 rounded-xl border border-violet-100 shadow-sm">
                              <div>
                                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Ingreso Inst.</label>
                                  <input name="fechaIngreso" type="date" defaultValue={editingStaff?.fechaIngreso} className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs text-gray-600" />
                              </div>
                              <div>
                                  <label className="text-[9px] font-black text-gray-400 uppercase ml-1 tracking-widest">Antigüedad Inicial</label>
                                  <div className="flex gap-1">
                                      <input name="antiguedadAnios" type="number" placeholder="Años" defaultValue={editingStaff?.antiguedadAnios || ''} className="w-1/2 p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs text-center border border-gray-200" />
                                      <input name="antiguedadMeses" type="number" placeholder="Meses" defaultValue={editingStaff?.antiguedadMeses || ''} className="w-1/2 p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs text-center border border-gray-200" />
                                  </div>
                                  <div className="mt-1 flex items-center gap-1">
                                      <label className="text-[8px] font-bold text-gray-400 uppercase w-1/3 leading-tight text-center">Calculada al:</label>
                                      <input name="antiguedadFechaRef" type="date" defaultValue={editingStaff?.antiguedadFechaRef || new Date().toISOString().split('T')[0]} className="w-2/3 p-1 bg-gray-50 rounded-lg outline-none font-bold text-[9px] text-gray-600 border border-gray-200" />
                                  </div>
                              </div>
                          </div>

                          {/* CARGO 1 */}
                          <div className="space-y-2 bg-white p-3 rounded-xl border border-violet-100 shadow-sm">
                              <h5 className="text-[10px] font-black text-gray-400 uppercase">Cargo 1</h5>
                              <div className="grid grid-cols-[1fr,2fr,1.5fr] gap-2">
                                  <input name="cargo1_numero" defaultValue={editingStaff?.cargo1_numero} placeholder="N° Cargo" className="p-2 bg-violet-50 text-violet-900 rounded-lg outline-none font-black text-xs w-full border border-violet-100"/>
                                  <input name="cargo1_name" defaultValue={editingStaff?.cargo1_name} placeholder="Nombre (Ej: MG)" className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full border border-gray-200"/>
                                  <input name="cargo1_ingreso" type="date" defaultValue={editingStaff?.cargo1_ingreso} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-[10px] text-gray-500 w-full border border-gray-200" title="Fecha Alta Cargo"/>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <select name="cargo1_type" defaultValue={editingStaff?.cargo1_type} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"><option value="">Tipo...</option><option value="meca">Mecanizada</option><option value="deno">Deno</option></select>
                                  <input name="cargo1_turn" defaultValue={editingStaff?.cargo1_turn} placeholder="Turno" className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"/>
                                  <select name="cargo1_revista" defaultValue={editingStaff?.cargo1_revista} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"><option value="">Revista...</option><option value="Titular">Titular</option><option value="Provicional">Provisional</option><option value="Suplente">Suplente</option></select>
                                  <select name="cargo1_subsidized" defaultValue={editingStaff?.cargo1_subsidized === 'true' || editingStaff?.isSubsidized === 'true' ? 'true' : 'false'} className="p-2 bg-emerald-50 text-emerald-800 rounded-lg outline-none font-bold text-xs w-full border border-emerald-100"><option value="false">Sin Subv</option><option value="true">Subvencionado</option></select>
                              </div>
                          </div>

                          {/* CARGO 2 */}
                          <div className="space-y-2 bg-white p-3 rounded-xl border border-violet-100 shadow-sm">
                              <h5 className="text-[10px] font-black text-gray-400 uppercase">Cargo 2 (Opcional)</h5>
                              <div className="grid grid-cols-[1fr,2fr,1.5fr] gap-2">
                                  <input name="cargo2_numero" defaultValue={editingStaff?.cargo2_numero} placeholder="N° Cargo" className="p-2 bg-violet-50 text-violet-900 rounded-lg outline-none font-black text-xs w-full border border-violet-100"/>
                                  <input name="cargo2_name" defaultValue={editingStaff?.cargo2_name} placeholder="Nombre (Ej: AUX)" className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full border border-gray-200"/>
                                  <input name="cargo2_ingreso" type="date" defaultValue={editingStaff?.cargo2_ingreso} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-[10px] text-gray-500 w-full border border-gray-200" title="Fecha Alta Cargo"/>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                  <select name="cargo2_type" defaultValue={editingStaff?.cargo2_type} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"><option value="">Tipo...</option><option value="meca">Mecanizada</option><option value="deno">Deno</option></select>
                                  <input name="cargo2_turn" defaultValue={editingStaff?.cargo2_turn} placeholder="Turno" className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"/>
                                  <select name="cargo2_revista" defaultValue={editingStaff?.cargo2_revista} className="p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs w-full"><option value="">Revista...</option><option value="Titular">Titular</option><option value="Provicional">Provisional</option><option value="Suplente">Suplente</option></select>
                                  <select name="cargo2_subsidized" defaultValue={editingStaff?.cargo2_subsidized === 'true' ? 'true' : 'false'} className="p-2 bg-emerald-50 text-emerald-800 rounded-lg outline-none font-bold text-xs w-full border border-emerald-100"><option value="false">Sin Subv</option><option value="true">Subvencionado</option></select>
                              </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                              <select name="studyStatus" defaultValue={editingStaff?.studyStatus} className="p-3 bg-white rounded-xl w-full border border-violet-200 outline-none font-bold text-xs text-violet-900"><option value="">Estado Estudios...</option><option value="Finalizado">Finalizado</option><option value="En curso 0% - 30%">En curso 0% - 30%</option><option value="En curso 30% - 50%">En curso 30% - 50%</option><option value="En curso 50% - 70%">En curso 50% - 70%</option><option value="En curso 70% - 99%">En curso 70% - 99%</option></select>
                              <select name="role" defaultValue={editingStaff?.role || ''} className="p-3 bg-white rounded-xl w-full border border-violet-200 outline-none font-bold text-xs text-violet-900" required>
                                  <option value="">Rol Principal...</option>
                                  <optgroup label="SEDE">
                                      <option value="Docente">Docente</option>
                                      <option value="Preceptora">Preceptora</option>
                                      <option value="Auxiliar">Auxiliar</option>
                                      <option value="Profe Especial">Profe especial</option>
                                      <option value="Equipo Técnico">Equipo técnico</option>
                                      <option value="Equipo Directivo">Equipo directivo</option>
                                  </optgroup>
                                  <optgroup label="INCLUSIÓN">
                                      <option value="Dirección Inclusión">Dirección</option>
                                      <option value="Equipo Técnico Inclusión">Equipo técnico</option>
                                      <option value="DAI">DAI</option>
                                  </optgroup>
                                  <optgroup label="ADMIN / MAESTRANZA">
                                      <option value="Cocina">Cocina</option>
                                      <option value="Limpieza">Limpieza</option>
                                      <option value="Mantenimiento">Mantenimiento</option>
                                      <option value="Administración">Administración</option>
                                  </optgroup>
                              </select>
                          </div>
                          <input name="degree" defaultValue={editingStaff?.degree} placeholder="Título Alcanzado / En curso" className="p-3 bg-white rounded-xl w-full border border-violet-200 outline-none font-bold text-xs text-violet-900"/>
                      </div>

                      <div className="flex gap-2">
                          <button type="button" onClick={()=>setShowStaffForm(false)} className="flex-1 py-4 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                          <button type="submit" className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg hover:bg-violet-700 transition">Guardar Legajo</button>
                      </div>
                      
                      {editingStaff && <button type="button" onClick={async () => {if(confirm("¿Eliminar definitivamente?")) {await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id)); setShowStaffForm(false); setViewingStaff(null);}}} className="w-full py-2 text-red-400 font-bold text-xs hover:text-red-500 mt-4">Eliminar definitivamente</button>}

                  </form>
              </div>
          </div>
      )}
    </div>
  );
}
// --- VISTA MÉDICA (COMPLETA: DATOS CLÍNICOS, EVOLUCIONES E IMPRESIÓN CON FIRMA) ---
function MedicalView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvoText, setNewEvoText] = useState('');

  // Permisos: Solo Salud, Directivos y Admins
  const canAccess = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubS();
  }, []);

  const filteredStudents = students.filter(s => {
      const txt = filterText.toLowerCase();
      return !txt || `${s.lastName} ${s.firstName} ${s.dni}`.toLowerCase().includes(txt);
  });

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

  const checkCudStatus = (cudDate) => {
      if (!cudDate) return { status: 'none', text: 'Sin CUD cargado' };
      const today = new Date();
      const exp = new Date(cudDate + 'T00:00:00');
      const diffTime = exp - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays < 0) return { status: 'expired', text: 'CUD Vencido' };
      if (diffDays <= 30) return { status: 'warning', text: `Vence en ${diffDays} días` };
      return { status: 'ok', text: 'CUD Vigente' };
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

  const handleAddEvolution = async () => {
      if (!newEvoText.trim()) return;
      const newEvo = {
          id: Date.now().toString(),
          date: new Date().toISOString(),
          text: newEvoText.trim(),
          author: user.firstName + (user.lastName ? ' ' + user.lastName : '')
      };
      const updatedEvos = [...(selectedStudent.medicalEvolutions || []), newEvo];
      
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { medicalEvolutions: updatedEvos });
          setSelectedStudent({ ...selectedStudent, medicalEvolutions: updatedEvos });
          setNewEvoText('');
      } catch (err) { alert("Error al guardar evolución: " + err.message); }
  };

  const handleDeleteEvolution = async (evoId) => {
      if (!confirm("¿Seguro que querés eliminar esta evolución?")) return;
      const updatedEvos = (selectedStudent.medicalEvolutions || []).filter(e => e.id !== evoId);
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { medicalEvolutions: updatedEvos });
          setSelectedStudent({ ...selectedStudent, medicalEvolutions: updatedEvos });
      } catch (err) { alert("Error al eliminar: " + err.message); }
  };

  const imprimirHistoriaClinica = (student) => {
      const fullDate = new Date().toLocaleDateString('es-AR');
      const evos = student.medicalEvolutions || [];
      let evosHtml = evos.length > 0 
          ? evos.slice().reverse().map(e => `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dotted #ccc;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;"><strong>${new Date(e.date).toLocaleDateString('es-AR')}</strong> | Cargado por: ${e.author}</div>
              <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${e.text}</div>
            </div>`).join('')
          : '<p style="font-size: 13px; color: #666; font-style: italic;">No hay evoluciones registradas en la historia clínica.</p>';

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
            .signature-container {
              position: fixed;
              bottom: 30px;
              left: 30px;
              right: 30px;
              display: flex;
              justify-content: flex-end;
              width: calc(100% - 60px);
            }
          }
          @media screen {
            .signature-container {
              margin-top: 50px;
              display: flex;
              justify-content: flex-end;
            }
          }
      </style>
      </head><body>
          <div class="header">
              <div>
                  <div class="title">HISTORIA CLÍNICA</div>
                  <div class="subtitle">Escuela de Educación Especial "Juntos a la Par"</div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #666;">
                  Documento Confidencial<br/>
                  Fecha de impresión: <strong>${fullDate}</strong>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Datos del Estudiante</div>
              <div class="grid">
                  <div><span class="label">Nombre y Apellido</span><div class="value">${student.lastName.toUpperCase()}, ${student.firstName}</div></div>
                  <div><span class="label">DNI</span><div class="value">${student.dni || '-'}</div></div>
                  <div><span class="label">Fecha de Nacimiento</span><div class="value">${student.birthDate ? new Date(student.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</div></div>
                  <div><span class="label">Edad Actual</span><div class="value">${calculateAge(student.birthDate)} años</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Información Clínica General</div>
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
              <div class="section-title">Evoluciones y Registros Médicos</div>
              ${evosHtml}
          </div>

          <div class="signature-container">
            <div class="signature-box">
                <img src="/firmamedico.jfif" alt="Firma del Médico" style="max-width: 220px; max-height: 120px; object-fit: contain;">
                <p style="margin: 0; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px;">_________________________</p>
                <p style="margin: 2px 0 0 0;">Firma y Sello Médico</p>
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

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido al Departamento Médico.</div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 pt-4">
        {/* HEADER */}
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

        {/* LISTADO DE PACIENTES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto pr-1">
            {filteredStudents.map(s => {
                const cud = checkCudStatus(s.cudExpiration);
                const hasAlert = cud.status === 'expired' || cud.status === 'warning' || (s.allergies && s.allergies.length > 2);

                return (
                    <div key={s.id} onClick={() => { setSelectedStudent(s); setIsEditing(false); setNewEvoText(''); }} className={`bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-3 ${hasAlert ? 'border-red-200' : 'border-transparent'}`}>
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

        {/* MODAL FICHA CLÍNICA */}
        {selectedStudent && (
            <div className="fixed inset-0 bg-black/80 z-[200] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
                <div className="bg-white rounded-[35px] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                    
                    <div className="bg-red-700 p-6 text-white relative shrink-0">
                        <button onClick={() => setSelectedStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center font-black text-2xl">
                                {selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : selectedStudent.firstName[0]}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedStudent.lastName}, {selectedStudent.firstName}</h2>
                                <p className="text-red-200 font-bold text-xs uppercase mt-1">DNI: {selectedStudent.dni || '-'} • {calculateAge(selectedStudent.birthDate)} AÑOS</p>
                            </div>
                            <button onClick={() => imprimirHistoriaClinica(selectedStudent)} className="hidden md:flex flex-col items-center justify-center bg-white text-red-700 p-2 rounded-xl shadow-md hover:bg-red-50 transition" title="Imprimir Historia Clínica">
                                <Printer size={20}/>
                                <span className="text-[9px] font-black uppercase mt-1">Imprimir</span>
                            </button>
                        </div>
                    </div>

                    <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                        {!isEditing ? (
                            <div className="space-y-5">
                                {/* RESUMEN DE ALERTAS */}
                                {(selectedStudent.allergies || checkCudStatus(selectedStudent.cudExpiration).status === 'expired') && (
                                    <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-inner">
                                        <h4 className="text-red-800 font-black text-xs uppercase flex items-center gap-1 mb-2"><AlertTriangle size={14}/> Alertas Médicas</h4>
                                        {selectedStudent.allergies && <p className="text-sm font-bold text-red-700 mb-1">Alergias: <span className="font-medium text-red-600">{selectedStudent.allergies}</span></p>}
                                        {checkCudStatus(selectedStudent.cudExpiration).status === 'expired' && <p className="text-sm font-bold text-red-700">CUD: <span className="font-medium text-red-600">Vencido ({getSafeDate(selectedStudent.cudExpiration)})</span></p>}
                                    </div>
                                )}

                                {/* DATOS CLÍNICOS ESTATICOS */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Obra Social</p>
                                        <p className="font-bold text-slate-800 text-sm">{selectedStudent.healthInsurance || 'No declara'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento CUD</p>
                                        <p className={`font-bold text-sm ${checkCudStatus(selectedStudent.cudExpiration).status === 'expired' ? 'text-red-600' : 'text-slate-800'}`}>
                                            {getSafeDate(selectedStudent.cudExpiration)}
                                        </p>
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Diagnóstico CUD / Médico</p>
                                        <p className="font-bold text-slate-800 text-sm">{selectedStudent.cudDiagnosis || 'Sin datos cargados'}</p>
                                    </div>
                                    <div className="border-t border-gray-100 pt-3">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Medicación Habitual</p>
                                        <p className="font-bold text-slate-800 text-sm">{selectedStudent.medication || 'No refiere'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Peso (Aprox)</p>
                                        <p className="font-bold text-slate-800 text-sm">{selectedStudent.weight ? `${selectedStudent.weight} kg` : 'S/D'}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vacunación</p>
                                        <p className="font-bold text-slate-800 text-sm">{selectedStudent.vaccines || 'S/D'}</p>
                                    </div>
                                </div>

                                {/* SECCIÓN EVOLUCIONES */}
                                <div className="mt-8 pt-6 border-t-2 border-dashed border-gray-200">
                                    <div className="flex justify-between items-center mb-4">
                                        <h4 className="font-black text-red-800 uppercase flex items-center gap-2"><FileText size={18}/> Evoluciones</h4>
                                        <button onClick={() => imprimirHistoriaClinica(selectedStudent)} className="md:hidden bg-white text-red-600 px-3 py-1.5 rounded-lg border border-red-200 shadow-sm text-[10px] font-black uppercase flex items-center gap-1"><Printer size={12}/> Imprimir</button>
                                    </div>
                                    
                                    <div className="flex gap-2 mb-6">
                                        <textarea value={newEvoText} onChange={e => setNewEvoText(e.target.value)} placeholder="Escribir nueva evolución o nota médica..." className="w-full p-3 bg-white rounded-xl border border-red-200 outline-none text-xs font-medium resize-none h-14 shadow-inner focus:border-red-400"/>
                                        <button onClick={handleAddEvolution} className="bg-red-600 text-white px-4 rounded-xl font-black text-[10px] uppercase shadow-md hover:bg-red-700 transition">Guardar<br/>Nota</button>
                                    </div>

                                    <div className="space-y-3">
                                        {(!selectedStudent.medicalEvolutions || selectedStudent.medicalEvolutions.length === 0) && (
                                            <p className="text-xs text-gray-400 italic text-center py-4 bg-white rounded-xl border border-gray-100">No hay evoluciones registradas aún.</p>
                                        )}
                                        {(selectedStudent.medicalEvolutions || []).slice().reverse().map(e => (
                                            <div key={e.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm relative group">
                                                <button onClick={() => handleDeleteEvolution(e.id)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition" title="Borrar evolución"><Trash2 size={14}/></button>
                                                <div className="flex gap-2 items-center mb-2">
                                                    <span className="text-[10px] font-black text-red-700 bg-red-50 border border-red-100 px-2 py-0.5 rounded">{new Date(e.date).toLocaleDateString('es-AR')}</span>
                                                    <span className="text-[10px] font-bold text-gray-400">{e.author}</span>
                                                </div>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap font-medium leading-relaxed">{e.text}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>
                        ) : (
                            /* MODO EDICIÓN */
                            <form id="medicalForm" onSubmit={handleSaveMedicalData} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Obra Social</label>
                                        <input name="healthInsurance" defaultValue={selectedStudent.healthInsurance} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 focus:border-red-300"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vencimiento CUD</label>
                                        <input type="date" name="cudExpiration" defaultValue={selectedStudent.cudExpiration} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 text-gray-600 focus:border-red-300"/>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Diagnóstico (Detalle Clínico / CUD)</label>
                                    <textarea name="cudDiagnosis" defaultValue={selectedStudent.cudDiagnosis} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 h-20 resize-none focus:border-red-300"/>
                                </div>

                                <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
                                    <label className="text-[10px] font-black text-red-800 uppercase ml-1">Alergias (Alimentarias / Medicamentosas)</label>
                                    <input name="allergies" defaultValue={selectedStudent.allergies} placeholder="Ej: Penicilina, Maní..." className="w-full p-3 mt-1 bg-white rounded-xl outline-none font-bold text-xs border border-red-200 text-red-700"/>
                                </div>

                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Medicación Habitual / Dosis</label>
                                    <textarea name="medication" defaultValue={selectedStudent.medication} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 h-20 resize-none focus:border-red-300"/>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Peso (kg)</label>
                                        <input name="weight" type="number" step="0.1" defaultValue={selectedStudent.weight} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 focus:border-red-300"/>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Plan de Vacunación</label>
                                        <select name="vaccines" defaultValue={selectedStudent.vaccines} className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs border border-gray-200 text-gray-700 focus:border-red-300">
                                            <option value="">Seleccionar...</option>
                                            <option value="Completas">Completas</option>
                                            <option value="Incompletas">Incompletas</option>
                                            <option value="No presenta libreta">No presenta libreta</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        )}
                    </div>
                    
                    <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
                        {isEditing ? (
                            <>
                                <button onClick={() => setIsEditing(false)} className="px-5 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                                <button type="submit" form="medicalForm" disabled={saving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-red-700 transition flex items-center gap-2">
                                    {saving ? <RefreshCw size={16} className="animate-spin"/> : 'Guardar Ficha Clínica'}
                                </button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditing(true)} className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase shadow-lg hover:bg-gray-800 transition flex items-center justify-center gap-2">
                                <Edit3 size={16}/> Editar Datos Fijos
                            </button>
                        )}
                    </div>
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



































































































































































