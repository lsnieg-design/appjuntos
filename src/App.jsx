import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3
} from 'lucide-react';
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
const VAPID_KEY = "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw";

// --- UTILIDADES DE NOTIFICACIÓN ---
const requestPermission = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && messaging) {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if (currentToken) console.log('Token final generado:', currentToken);
    }
  } catch (error) { console.error('Error notificaciones:', error); }
};

const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => resolve(payload));
    }
  });

const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  if (navigator.serviceWorker && navigator.serviceWorker.ready) {
    navigator.serviceWorker.ready.then((reg) => {
      reg.showNotification(title, { body, icon: '/icon-192.png', vibrate: [200, 100, 200] });
    });
  } else {
    try { new Notification(title, { body, icon: '/icon-192.png' }); } catch (e) {}
  }
};

// --- CONSTANTES ---
const ROLES = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS'];

// --- UTILS ---
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

// --- COMPONENTE PRINCIPAL APP ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    requestPermission();
    onMessageListener().then((payload) => {
      if (payload?.notification) triggerMobileNotification(payload.notification.title, payload.notification.body);
    });
  }, []);

  useEffect(() => {
    if (!auth) { setConfigError(true); setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      const savedProfile = localStorage.getItem('schoolApp_profile');
      if (savedProfile) setCurrentUserProfile(JSON.parse(savedProfile));
      setLoading(false);
    });
    signInAnonymously(auth).catch(console.error);
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
    const handleBeforeInstallPrompt = (e) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (iosCheck && !isStandalone) { const timer = setTimeout(() => setShowInstall(true), 3000); return () => clearTimeout(timer); }
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
                 <div className="mx-auto bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-bounce">
                    <Smartphone className="text-violet-600" size={40} />
                 </div>
                 <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Instala la App! 📲</h3>
                 <button onClick={handleInstalarClick} className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg">INSTALAR AHORA</button>
                 <button onClick={() => setShowInstall(false)} className="text-gray-400 text-sm mt-4">Quizás más tarde</button>
             </div>
         </div>
      )}
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-24 w-auto object-contain" /></div>
            <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">PORTAL INSTITUCIONAL<br/><span className="text-orange-500">JUNTOS A LA PAR</span></h1>
        </div>
        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <input type="text" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} />
            <input type="password" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
            <div className="flex justify-end"><button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600">¿Olvidaste tu contraseña?</button></div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl">{error}</div>}
            <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold uppercase tracking-widest">{checking ? <RefreshCw className="animate-spin mx-auto" /> : 'INGRESAR'}</button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-right">
              <div className="bg-violet-50 p-6 rounded-2xl text-center mb-6">
                <Key className="mx-auto text-violet-500 mb-2" size={40} />
                <h3 className="font-bold text-violet-900 text-lg mb-2">Solicitar Blanqueo</h3>
                {recoverStatus === 'sent' ? (
                    <div className="bg-green-100 text-green-700 p-3 rounded-xl font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
                ) : (
                    <form onSubmit={handleRequestReset}>
                        <input className="w-full p-3 bg-white border border-violet-200 rounded-xl mb-3 text-center outline-none" placeholder="Tu Usuario" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
                        <button type="submit" className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600">Enviar Solicitud</button>
                    </form>
                )}
              </div>
              <button onClick={() => setShowRecover(false)} className="w-full text-gray-500 font-bold py-3">Volver al inicio</button>
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

  const isAssignedToUser = (item) => {
    if (canManageContent) return true;
    if (!item.targetType || item.targetType === 'all') return true;
    if (item.targetType === 'roles' && Array.isArray(item.targetRoles)) return item.targetRoles.includes(user.role);
    if (item.targetType === 'users' && Array.isArray(item.targetUsers)) return item.targetUsers.includes(user.fullName);
    return false;
  };

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(allTasks.filter(isAssignedToUser));
    });
    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    if (canManageUsers) {
        const qReq = query(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), orderBy('createdAt', 'desc'));
        onSnapshot(qReq, (snap) => setAdminRequests(snap.docs.map(d => ({ id: d.id, ...d.data(), isRequest: true }))));
    }
    return () => { unsubTasks(); unsubEvents(); unsubResources(); };
  }, [user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView user={user} tasks={tasks} events={events} />;
      case 'calendar': return <CalendarView events={events} canEdit={canManageContent} user={user} />;
      case 'tasks': return <TasksView tasks={tasks} user={user} canEdit={canManageContent} />;
      case 'matricula': return <MatriculaView user={user} />;
      case 'resources': return <ResourcesView resources={resources} canEdit={canManageContent} />;
      case 'notifications': return <NotificationsView notifications={notifications} canEdit={canManageUsers} />;
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
          <div><h1 className="font-bold text-base leading-tight">Juntos a la par</h1><p className="text-[10px] text-orange-200 uppercase">{user.role}</p></div>
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
      <div className="relative">{icon}{badge > 0 && <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[8px] rounded-full w-4 h-4 flex items-center justify-center">{badge}</span>}</div>
      <span className="text-[10px] font-bold">{label}</span>
    </button>
  );
}

// --- VISTA MATRÍCULA (VUELVE TODO TU CÓDIGO) ---
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
  const [uploading, setUploading] = useState(false);

  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const birthDate = new Date(dateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filteredStudents = students.filter(s => {
    const textMatch = (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText);
    const levelMatch = filters.level === 'all' || s.level === filters.level;
    const dxMatch = filters.dx === 'all' || s.dx === filters.dx;
    const genderMatch = filters.gender === 'all' || s.gender === filters.gender;
    return textMatch && levelMatch && dxMatch && genderMatch;
  });

  const statsResults = students.filter(s => {
    const levelMatch = statFilters.level === 'all' || s.level === statFilters.level;
    const dxMatch = statFilters.dx === 'all' || s.dx === statFilters.dx;
    const genderMatch = statFilters.gender === 'all' || s.gender === statFilters.gender;
    return levelMatch && dxMatch && genderMatch;
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
    <div className="animate-in fade-in">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center">
          <div><h2 className="text-2xl font-bold">Matrícula 2026</h2><p className="opacity-90">{filteredStudents.length} alumnos</p></div>
          <div className="flex gap-2">
            {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
            <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><PieChart size={20}/></button>
            {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl"><Plus/></button>}
          </div>
        </div>
      </div>

      <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar por nombre o DNI..." className="w-full p-4 bg-white rounded-2xl shadow-sm mb-4 outline-none" />

      <div className="space-y-3">
        {filteredStudents.map(s => (
          <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-4 cursor-pointer hover:shadow-md transition">
            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
                {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
            </div>
            <div className="flex-1"><h4 className="font-bold">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">{s.level}</span>
          </div>
        ))}
      </div>

      {/* MODAL ESTADÍSTICAS (TU CALCULADORA) */}
      {showStats && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-6 h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">Calculadora de Matrícula</h3><button onClick={() => setShowStats(false)}><X/></button></div>
            <div className="grid grid-cols-2 gap-4 mb-6">
               <select value={statFilters.level} onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="p-2 border rounded-xl outline-none"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
               <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-2 border rounded-xl outline-none"><option value="all">Género: Todos</option><option value="F">Mujeres</option><option value="M">Varones</option></select>
            </div>
            <div className="bg-violet-600 text-white p-8 rounded-3xl text-center mb-6">
                <p className="text-lg opacity-80">Total Coincidencias</p>
                <h4 className="text-6xl font-black">{statsResults.length}</h4>
            </div>
            <div className="flex-1 overflow-y-auto"><div className="grid gap-2">{statsResults.map(s => <p key={s.id} className="text-sm p-2 bg-gray-50 rounded-lg">{s.lastName}, {s.firstName}</p>)}</div></div>
          </div>
        </div>
      )}

      {/* MODAL VER LEGAJO */}
      {viewingStudent && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
              <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="bg-blue-600 p-6 text-white text-center">
                    <div className="w-24 h-24 rounded-2xl bg-white/20 mx-auto mb-4 overflow-hidden">{viewingStudent.photoUrl && <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" />}</div>
                    <h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
                  </div>
                  <div className="p-6 space-y-4 text-sm bg-white">
                      <div className="grid grid-cols-2 gap-4">
                          <p><strong>DNI:</strong> {viewingStudent.dni}</p>
                          <p><strong>DX:</strong> {viewingStudent.dx}</p>
                          <p><strong>Jornada:</strong> {viewingStudent.journey}</p>
                          <p><strong>Obra Social:</strong> {viewingStudent.healthInsurance}</p>
                      </div>
                      <div className="border-t pt-4">
                          <p><strong>Padre:</strong> {viewingStudent.fatherName} ({viewingStudent.fatherContact})</p>
                          <p><strong>Madre:</strong> {viewingStudent.motherName} ({viewingStudent.motherContact})</p>
                      </div>
                      {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-bold">Editar Ficha</button>}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL FORMULARIO (ALTA/EDICIÓN) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-xl p-6 max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-6">{editingStudent ? 'Editar Ficha' : 'Nueva Ficha'}</h3>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 border rounded-xl outline-none" />
                        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 border rounded-xl outline-none" />
                    </div>
                    <input name="dni" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-3 border rounded-xl outline-none" />
                    <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-3 border rounded-xl outline-none" />
                    <div className="flex gap-2"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl font-bold">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Guardar</button></div>
                </form>
            </div>
        </div>
      )}

      {/* MODAL GESTIÓN BD */}
      {showDataManagement && (
          <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
              <div className="bg-white rounded-3xl w-full max-w-lg p-6">
                  <h3 className="text-xl font-bold mb-4">Importar Alumnos (JSON)</h3>
                  <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[{"lastName": "Perez", "firstName": "Juan"}]' className="w-full h-40 p-3 border rounded-xl font-mono text-xs mb-4" />
                  <div className="flex gap-2"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-3 font-bold">Cerrar</button><button onClick={handleBulkImport} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">Importar</button></div>
              </div>
          </div>
      )}
    </div>
  );
}

// --- VISTAS RESTANTES (TAREAS, CALENDARIO, USUARIOS) ---
function TasksView({ tasks, canEdit }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-violet-900">Tareas Pendientes</h2>
            <div className="grid gap-3">
                {tasks.map(t => (
                    <div key={t.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-violet-500 flex justify-between items-center">
                        <div><h3 className="font-bold">{t.title}</h3><p className="text-xs text-gray-400">Vence: {formatDate(t.dueDate)}</p></div>
                        <span className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${t.priority === 'high' ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-400'}`}>{t.priority}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function CalendarView({ events, canEdit }) {
    const [view, setView] = useState('list');
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-violet-900">Agenda</h2><button onClick={() => setView(view === 'list' ? 'grid' : 'list')} className="p-2 bg-white rounded-xl shadow-sm border">{view === 'list' ? <Grid size={20}/> : <List size={20}/>}</button></div>
            <div className="grid gap-3">
                {events.map(e => (
                    <div key={e.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-xl flex flex-col items-center justify-center font-bold"><span className="text-[8px] uppercase">{e.date ? new Date(e.date + 'T00:00:00').toLocaleDateString('es-ES', {month: 'short'}) : ''}</span><span>{e.date ? new Date(e.date + 'T00:00:00').getDate() : ''}</span></div>
                        <div><h3 className="font-bold text-sm">{e.title}</h3><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded font-bold uppercase">{e.type}</span></div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DashboardView({ user, tasks, events }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventsToday = events.filter(e => e.date === todayStr);
    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border shadow-sm">
                <h2 className="text-2xl font-bold text-violet-900">¡Hola, {user.firstName}! 👋</h2>
                <p className="text-gray-500 text-sm">Bienvenido al portal institucional.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-orange-500 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden"><h3 className="text-3xl font-bold">{tasks.length}</h3><p className="text-xs uppercase font-bold opacity-80">Tareas</p><CheckSquare className="absolute -right-4 -bottom-4 opacity-20" size={80}/></div>
                <div className="bg-violet-600 text-white p-5 rounded-3xl shadow-lg relative overflow-hidden"><h3 className="text-3xl font-bold">{eventsToday.length}</h3><p className="text-xs uppercase font-bold opacity-80">Hoy</p><CalendarIcon className="absolute -right-4 -bottom-4 opacity-20" size={80}/></div>
            </div>
        </div>
    );
}

function ResourcesView({ resources }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-violet-900">Recursos</h2>
            <div className="grid gap-3">
                {resources.map(r => (
                    <a key={r.id} href={r.url} target="_blank" className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 group">
                        <FileText className="text-blue-600 group-hover:scale-110 transition" />
                        <div><h3 className="font-bold text-sm">{r.title}</h3><p className="text-[10px] text-gray-400 uppercase font-bold">{r.category}</p></div>
                    </a>
                ))}
            </div>
        </div>
    );
}

function NotificationsView({ notifications }) {
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-violet-900">Avisos</h2>
            <div className="text-center py-20 opacity-30"><Bell size={64} className="mx-auto"/><p>No tienes avisos nuevos</p></div>
        </div>
    );
}

function UsersView({ user }) {
    const [users, setUsers] = useState([]);
    useEffect(() => { const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users')); return onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()})))); }, []);
    return (
        <div className="space-y-4">
            <h2 className="text-2xl font-bold text-violet-900">Personal</h2>
            <div className="grid gap-3">{users.map(u => (<div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4"><div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold">{u.firstName?.[0]}</div><div><h4 className="font-bold text-sm">{u.fullName}</h4><p className="text-[10px] text-orange-600 font-bold uppercase">{u.role}</p></div></div>))}</div>
        </div>
    );
}

function ProfileView({ user, onLogout }) {
    return (
        <div className="space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm text-center border">
                <div className="w-24 h-24 rounded-full bg-violet-100 mx-auto mb-4 border-4 border-white shadow-md overflow-hidden flex items-center justify-center">{user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <span className="text-3xl font-bold text-violet-600">{user.firstName?.[0]}</span>}</div>
                <h2 className="text-2xl font-bold">{user.fullName}</h2><p className="text-orange-600 font-bold uppercase text-xs">{user.role}</p>
            </div>
            <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition"><LogOut size={20}/> Cerrar Sesión</button>
        </div>
    );
}
