import React, { useState, useEffect } from 'react';
import { 
 Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3
} from 'lucide-center'; // Nota: Si usas lucide-react asegúrate que el import diga lucide-react
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, where, getDocs, serverTimestamp, arrayUnion } from 'firebase/firestore';
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
  } catch (e) { console.log("Buscando config global..."); }
  if (typeof __firebase_config !== 'undefined') return JSON.parse(__firebase_config);
  return {};
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'escuela-app-prod';
const messaging = app ? getMessaging(app) : null;

// --- FUNCIONES GLOBALES ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body, icon: '/icon-192.png', vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: '/icon-192.png' }); } catch (e) {}
    }
  }
};

const calculateDaysLeft = (dateString) => {
  if (!dateString) return 0;
  const eventDate = new Date(dateString);
  const today = new Date();
  today.setHours(0,0,0,0); eventDate.setHours(0,0,0,0);
  return Math.ceil((eventDate - today) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const ROLES = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS'];

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    if (!auth) { setConfigError(true); setLoading(false); return; }
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else { await signInAnonymously(auth); }
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
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isStandalone]);

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
                 <Smartphone className="text-violet-600 mx-auto mb-4" size={48} />
                 <h3 className="text-xl font-bold mb-2">¡Instala la App! 📲</h3>
                 <button onClick={() => { if(deferredPrompt) deferredPrompt.prompt(); }} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl mb-2">INSTALAR</button>
                 <button onClick={() => setShowInstall(false)} className="text-gray-400 text-sm">Más tarde</button>
             </div>
         </div>
      )}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
        <div className="text-center mb-8">
            <h1 className="text-2xl font-extrabold text-violet-900 uppercase">Portal Institucional<br/><span className="text-orange-500">Juntos a la Par</span></h1>
        </div>
        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} />
            <input type="password" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="flex justify-end"><button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600">¿Olvidaste tu contraseña?</button></div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl">{error}</div>}
            <button type="submit" disabled={checking} className="w-full bg-violet-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest">{checking ? <RefreshCw className="animate-spin mx-auto" /> : 'INGRESAR'}</button>
          </form>
        ) : (
          <div className="text-center">
            <Key className="mx-auto text-violet-500 mb-2" size={40} />
            <h3 className="font-bold text-violet-900 mb-4 text-lg">Recuperar Acceso</h3>
            <form onSubmit={handleRequestReset}>
              <input className="w-full p-3 bg-violet-50 rounded-xl mb-4 text-center" placeholder="Tu Usuario" value={recoverUser} onChange={e => setRecoverUser(e.target.value)} required />
              <button className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg">Enviar Solicitud</button>
            </form>
            <button onClick={() => setShowRecover(false)} className="mt-6 text-sm text-gray-500 font-bold uppercase underline">Volver</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- APP PRINCIPAL ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
   
  const isSuperAdmin = user.rol === 'super-admin';
  const canManageContent = user.rol === 'admin' || isSuperAdmin;
  const canManageUsers = isSuperAdmin;

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      setTasks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => { unsubTasks(); unsubEvents(); unsubResources(); };
  }, []);

  useEffect(() => {
    const activarMensajes = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted' && messaging) {
          const currentToken = await getToken(messaging, { vapidKey: "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw" });
          if (currentToken && user?.id) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { fcmTokens: arrayUnion(currentToken), lastTokenUpdate: serverTimestamp() });
          }
        }
      } catch (error) { console.error("Error notificaciones:", error); }
    };
    if(user?.id) activarMensajes();
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView user={user} tasks={tasks} events={events} />;
      case 'calendar': return <CalendarView events={events} canEdit={canManageContent} user={user} />;
      case 'tasks': return <TasksView tasks={tasks} user={user} canEdit={canManageContent} />;
      case 'matricula': return <MatriculaView user={user} />;
      case 'resources': return <ResourcesView resources={resources} canEdit={canManageContent} />;
      case 'notifications': return <NotificationsView notifications={notifications} />;
      case 'users': return <UsersView user={user} />;
      case 'profile': return <ProfileView user={user} tasks={tasks} onLogout={onLogout} />;
      default: return <DashboardView user={user} tasks={tasks} events={events} />;
    }
  };
   
  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-20 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-1 rounded-lg shadow-sm">
             <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          </div>
          <div><h1 className="font-bold text-base leading-tight">Juntos a la Par</h1><p className="text-[10px] text-orange-200 uppercase font-bold">{user.role}</p></div>
        </div>
        <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer">
          {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">{renderContent()}</main>
      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg">
        <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" badge={tasks.filter(t => t.status !== 'completed').length} />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Matrícula" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={24} />} label="Avisos" />
          {canManageUsers && <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={24} />} label="Admin" />}
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full space-y-1 ${active ? 'text-orange-500' : 'text-gray-400'}`}>
      <div className="relative">{icon}{badge > 0 && <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{badge}</span>}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

// --- VISTA MATRÍCULA (LOGICA ORIGINAL RESTAURADA) ---
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
    <div className="animate-in fade-in pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center">
          <div><h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap /> Legajos 2026</h2><p className="opacity-90">{filteredStudents.length} alumnos</p></div>
          <div className="flex gap-2">
            {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl border border-white/20"><UploadCloud size={20}/></button>}
            <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl border border-white/20"><PieChart size={20}/></button>
            {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl shadow-lg"><Plus/></button>}
          </div>
        </div>
      </div>

      <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar alumno..." className="w-full p-4 bg-white rounded-2xl shadow-sm mb-4 outline-none border border-gray-100" />

      <div className="space-y-3">
        {filteredStudents.map(s => (
          <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition">
            <div className="w-14 h-14 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300" size={24}/>}
            </div>
            <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400">DNI: {s.dni}</p></div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">{s.level}</span>
          </div>
        ))}
      </div>

      {/* MODAL CALCULADORA */}
      {showStats && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 h-[85vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold flex items-center gap-2"><PieChart/> Estadísticas Matrícula</h3><button onClick={() => setShowStats(false)} className="p-2 bg-gray-100 rounded-full"><X/></button></div>
            <div className="grid grid-cols-2 gap-3 mb-6">
               <select value={statFilters.level} onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="p-3 border rounded-xl outline-none font-bold bg-gray-50"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
               <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 border rounded-xl outline-none font-bold bg-gray-50"><option value="all">Género: Todos</option><option value="F">Mujeres</option><option value="M">Varones</option></select>
            </div>
            <div className="bg-violet-600 text-white p-10 rounded-3xl text-center mb-6 shadow-xl">
                <p className="text-lg opacity-80 font-medium">Resultados encontrados</p>
                <h4 className="text-7xl font-black">{statsResults.length}</h4>
            </div>
            <div className="flex-1 overflow-y-auto"><div className="grid grid-cols-1 gap-2">{statsResults.map(s => <div key={s.id} className="p-3 bg-gray-50 rounded-xl text-sm border flex justify-between font-medium"><span>{s.lastName}, {s.firstName}</span><span className="font-bold text-violet-600 uppercase">{s.level}</span></div>)}</div></div>
          </div>
        </div>
      )}

      {/* MODAL VER FICHA */}
      {viewingStudent && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
              <div className="bg-white rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="bg-blue-600 p-8 text-white relative">
                    <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X/></button>
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-3xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">
                            {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" /> : <User size={40}/>}
                        </div>
                        <div><h2 className="text-3xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-80 font-medium tracking-widest">DNI: {viewingStudent.dni}</p></div>
                    </div>
                  </div>
                  <div className="p-8 space-y-6 bg-white overflow-y-auto max-h-[60vh]">
                      <div className="grid grid-cols-2 gap-4 text-center">
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Nivel</p><p className="font-bold text-gray-800">{viewingStudent.level}</p></div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">DX</p><p className="font-bold text-gray-800">{viewingStudent.dx || '-'}</p></div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Género</p><p className="font-bold text-gray-800">{viewingStudent.gender}</p></div>
                          <div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Jornada</p><p className="font-bold text-gray-800">{viewingStudent.journey}</p></div>
                      </div>
                      {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold shadow-lg flex justify-center items-center gap-2 hover:bg-blue-700 transition">EDITAR FICHA</button>}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL FORMULARIO ALTA */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
                <h3 className="text-2xl font-bold mb-8 border-b pb-4 text-gray-800">{editingStudent ? 'Editar Legajo' : 'Nueva Ficha de Alumno'}</h3>
                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 ml-1">APELLIDO</label><input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Ej: Perez" required className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-400" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 ml-1">NOMBRE</label><input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Ej: Juan" required className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-400" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 ml-1">DNI</label><input name="dni" type="number" defaultValue={editingStudent?.dni} className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-400" /></div>
                        <div className="space-y-1"><label className="text-xs font-bold text-gray-400 ml-1">GÉNERO</label><select name="gender" defaultValue={editingStudent?.gender} className="w-full p-3 bg-gray-50 border-none rounded-xl outline-none focus:ring-2 focus:ring-blue-400"><option value="M">Varón</option><option value="F">Mujer</option></select></div>
                    </div>
                    <div className="space-y-1"><label className="text-xs font-bold text-gray-400 ml-1">NIVEL</label><select name="level" defaultValue={editingStudent?.level || '1° Ciclo'} className="w-full p-3 bg-blue-50 rounded-xl outline-none"><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select></div>
                    <div className="flex gap-4 pt-4 border-t"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase">Cancelar</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg uppercase">Guardar Cambios</button></div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL GESTIÓN BD */}
      {showDataManagement && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
                  <h3 className="text-2xl font-bold mb-4 text-blue-600 flex items-center gap-2"><UploadCloud/> Carga Masiva</h3>
                  <p className="text-sm text-gray-500 mb-6 font-medium">Pega el JSON de alumnos para actualizar la matrícula 2026.</p>
                  <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "lastName": "Gomez", "firstName": "Ana"... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-xs mb-6 outline-none focus:ring-2 focus:ring-blue-400" />
                  <div className="flex gap-3"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-bold uppercase tracking-widest">Cerrar</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg flex justify-center items-center gap-2 uppercase tracking-widest">{processing ? <RefreshCw className="animate-spin" /> : 'Importar Datos'}</button></div>
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
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[40px] border border-violet-50 shadow-sm">
                <h2 className="text-3xl font-black text-violet-900 tracking-tight">¡Hola, {user.firstName}! 👋</h2>
                <p className="text-gray-400 font-bold uppercase tracking-[3px] text-[10px] mt-1">Portal Institucional Digital</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-500 text-white p-6 rounded-[35px] shadow-lg relative overflow-hidden"><h3 className="text-4xl font-black">{tasks.length}</h3><p className="text-xs uppercase font-bold opacity-80 tracking-widest mt-1">Tareas</p><CheckSquare className="absolute -right-4 -bottom-4 opacity-20" size={90}/></div>
                <div className="bg-violet-600 text-white p-6 rounded-[35px] shadow-lg relative overflow-hidden"><h3 className="text-4xl font-black">{eventsToday.length}</h3><p className="text-xs uppercase font-bold opacity-80 tracking-widest mt-1">Eventos Hoy</p><CalendarIcon className="absolute -right-4 -bottom-4 opacity-20" size={90}/></div>
            </div>
        </div>
    );
}

function CalendarView({ events }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-black text-violet-900 mb-6">Agenda Escolar</h2>
            <div className="grid gap-3">
                {events.map(e => (
                    <div key={e.id} className="bg-white p-4 rounded-3xl shadow-sm border border-violet-50 flex items-center gap-6">
                        <div className="w-16 h-16 bg-violet-800 text-white rounded-2xl flex flex-col items-center justify-center shadow-lg font-black"><span className="text-[10px] uppercase opacity-70">{e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', {month: 'short'}) : ''}</span><span className="text-2xl">{e.date ? new Date(e.date + 'T00:00:00').getDate() : ''}</span></div>
                        <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 leading-tight mb-1 truncate">{e.title}</h3><span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-lg font-black uppercase tracking-widest">{e.type}</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TasksView({ tasks }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-black text-violet-900 mb-6">Seguimiento de Tareas</h2>
            <div className="grid gap-4">
                {tasks.map(t => (
                    <div key={t.id} className="bg-white p-6 rounded-[35px] shadow-sm border-l-[12px] border-violet-500 flex justify-between items-center group hover:bg-violet-50 transition">
                        <div><h3 className="font-bold text-gray-800 text-lg leading-tight mb-2">{t.title}</h3><div className="flex gap-2 items-center"><span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-lg font-bold">{formatDate(t.dueDate)}</span>{t.priority === 'high' && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-lg font-black uppercase">Urgente</span>}</div></div>
                        <span className="bg-violet-100 text-violet-600 p-3 rounded-2xl group-hover:rotate-12 transition"><CheckCircle size={20}/></span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ResourcesView({ resources }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-black text-violet-900 mb-6 tracking-tight">Recursos Institucionales</h2>
            <div className="grid gap-3">
                {resources.map(r => (
                    <a key={r.id} href={r.url} target="_blank" className="bg-white p-5 rounded-[30px] border border-violet-50 shadow-sm flex items-center gap-5 hover:bg-blue-50 transition">
                        <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-inner"><FileText size={28} /></div>
                        <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 text-sm truncate">{r.title}</h3><p className="text-[9px] text-gray-400 uppercase font-black tracking-widest mt-1">{r.category}</p></div>
                        <ExternalLink size={18} className="text-gray-300" />
                    </a>
                ))}
            </div>
        </div>
    );
}

function NotificationsView() {
    return (
        <div className="space-y-4 pb-20 text-center">
            <h2 className="text-2xl font-black text-violet-900 mb-6 text-left tracking-tight">Avisos del Sistema</h2>
            <div className="py-24 bg-white rounded-[40px] border-4 border-dashed border-violet-50 opacity-50 shadow-inner">
                <Bell size={64} className="mx-auto text-violet-200 mb-6 animate-bounce"/>
                <p className="font-black text-gray-300 uppercase tracking-widest">Sin notificaciones nuevas</p>
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
            <h2 className="text-2xl font-black text-violet-900 mb-6 tracking-tight">Equipo Institucional</h2>
            <div className="grid gap-3">{users.map(u => (
                <div key={u.id} className="bg-white p-5 rounded-[30px] border border-violet-50 shadow-sm flex items-center gap-5">
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
