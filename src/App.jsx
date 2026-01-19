import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, CheckCircle, Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Folder 
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

// --- FUNCIONES DE NOTIFICACIÓN ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body, icon: '/icon-192.png', vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: '/icon-192.png' }); } catch (e) { console.log("Notificación bloqueada."); }
    }
  }
};

const requestPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted' && messaging) {
      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });
      if (currentToken) return currentToken;
    }
  } catch (error) { console.error('Error al pedir permiso:', error); }
};

const onMessageListener = () => new Promise((resolve) => {
  if (messaging) { onMessage(messaging, (payload) => { resolve(payload); }); }
});

// --- UTILS ---
const calculateAge = (dateString) => {
  if (!dateString) return '-';
  const birthDate = new Date(dateString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requestPermission();
    onMessageListener().then((payload) => {
      if (payload?.notification) triggerMobileNotification(payload.notification.title, payload.notification.body);
    });
  }, []);

  useEffect(() => {
    if (!auth) { setLoading(false); return; }
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

  if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><RefreshCw className="animate-spin text-violet-600" /></div>;
  if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;
  return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- PANTALLA LOGIN ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setChecking(true);
    if (username === 'admin' && password === 'admin123') {
      onLogin({ id: 'super-admin', firstName: 'Admin', role: 'Equipo Directivo', rol: 'super-admin' });
      return;
    }
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        onLogin({ ...userData, id: querySnapshot.docs[0].id });
      } else { setError('Usuario o contraseña incorrectos.'); }
    } catch (err) { setError('Error de conexión.'); } finally { setChecking(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
        <div className="text-center mb-8">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-20 mx-auto mb-4" />
          <h1 className="text-xl font-black text-violet-900 uppercase">Portal Institucional</h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Usuario" value={username} onChange={e => setUsername(e.target.value)} />
          <input type="password" required className="w-full p-4 bg-violet-50 rounded-xl outline-none" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
          <button type="submit" disabled={checking} className="w-full bg-violet-600 text-white py-4 rounded-xl font-bold">
            {checking ? 'INGRESANDO...' : 'INGRESAR'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- MAIN APP ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);

  const isSuperAdmin = user.rol === 'super-admin';
  const canManageContent = user.rol === 'admin' || isSuperAdmin;

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, snap => setTasks(snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    
    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const qRes = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubRes = onSnapshot(qRes, snap => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    return () => { unsubTasks(); unsubNotifs(); unsubEvents(); unsubRes(); };
  }, [user.id]);

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0">
        <div className="flex items-center space-x-3">
          <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="w-10 h-8 object-contain" />
          <div>
            <h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1>
            <p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{notifications.filter(n => !n.read).length}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border p-4 z-[100] animate-in fade-in zoom-in-95">
                <h3 className="font-bold text-violet-900 text-sm mb-2">Avisos Recientes</h3>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? <p className="text-xs text-gray-400 italic">No tienes avisos nuevos</p> : 
                  notifications.map(n => <div key={n.id} className="p-3 border-b text-xs text-gray-700">{n.message}</div>)}
                </div>
              </div>
            )}
          </div>
          <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 cursor-pointer overflow-hidden">{user.photoUrl ? <img src={user.photoUrl} className="object-cover w-full h-full" /> : user.firstName?.[0]}</div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
        {activeTab === 'dashboard' && <DashboardView user={user} tasks={tasks} events={events} />}
        {activeTab === 'calendar' && <CalendarView events={events} canEdit={canManageContent} user={user} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} canEdit={canManageContent} />}
        {activeTab === 'matricula' && <MatriculaView user={user} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} />}
        {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} />}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-20 z-30 shadow-lg">
        <div className="flex justify-around items-center h-full max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Matrícula" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<Folder size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24} />} label="P.I." />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center gap-1 ${active ? 'text-orange-500' : 'text-gray-400'}`}>
      {icon}
      <span className="text-[10px] font-bold uppercase">{label}</span>
    </button>
  );
}

// --- VISTA MATRÍCULA ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    return onSnapshot(q, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  const filteredStudents = students.filter(s => (s.lastName + s.firstName).toLowerCase().includes(filterText.toLowerCase()));

  const handleSave = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    if (editingStudent) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
    else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
    setShowForm(false); setEditingStudent(null);
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
        <div className="flex justify-between items-center mb-4">
          <div><h2 className="text-2xl font-bold flex items-center gap-2"><GraduationCap /> Legajos 2026</h2><p className="opacity-90">{filteredStudents.length} alumnos</p></div>
          <div className="flex gap-2">
            {isSuperAdmin && <button onClick={() => setShowDataManagement(true)} className="bg-white/20 p-2 rounded-xl"><UploadCloud size={20}/></button>}
            <button onClick={() => setShowStats(true)} className="bg-white/20 p-2 rounded-xl"><Activity size={20}/></button>
            {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl"><Plus size={20}/></button>}
          </div>
        </div>
        <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar alumno..." className="w-full p-4 bg-white text-gray-800 rounded-2xl shadow-sm outline-none" />
      </div>

      <div className="space-y-3">
        {filteredStudents.map(s => (
          <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl border flex items-center gap-4 cursor-pointer hover:shadow-md transition">
            <div className="w-12 h-12 bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
              {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
            </div>
            <div className="flex-1"><h4 className="font-bold text-gray-800">{s.lastName}, {s.firstName}</h4><p className="text-xs text-gray-400">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
            <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded uppercase">{s.level}</span>
          </div>
        ))}
      </div>

      {showStats && (
        <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl flex flex-col max-h-[80vh]">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900">Estadísticas</h3>
              <button onClick={() => setShowStats(false)}><X size={24} className="text-gray-400" /></button>
            </div>
            <div className="bg-violet-600 text-white p-6 rounded-3xl text-center mb-6 shadow-xl">
              <h4 className="text-4xl font-black">{students.length}</h4>
              <p className="text-sm opacity-80 uppercase font-bold tracking-widest">Alumnos Registrados</p>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 gap-2">
                {students.map(s => (
                  <div key={s.id} className="p-4 bg-gray-50 rounded-2xl text-xs border border-gray-100 flex justify-between items-center">
                    <span className="font-bold text-gray-700">{(s.lastName || '').toUpperCase()}, {s.firstName}</span>
                    <span className="font-black text-violet-600 bg-violet-50 px-2 py-1 rounded-lg uppercase">{s.level}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {viewingStudent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-blue-600 p-8 text-white relative">
              <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50 hover:text-white"><X/></button>
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">
                  {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover" /> : <User size={40}/>}
                </div>
                <div><h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-80">DNI: {viewingStudent.dni}</p></div>
              </div>
            </div>
            <div className="p-8 space-y-4 bg-white">
              <p><strong>Nivel:</strong> {viewingStudent.level}</p>
              <p><strong>Género:</strong> {viewingStudent.gender}</p>
              <p><strong>Jornada:</strong> {viewingStudent.journey}</p>
              {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold">EDITAR FICHA</button>}
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h3 className="text-2xl font-bold mb-8 border-b pb-4 text-gray-800">{editingStudent ? 'Editar Legajo' : 'Nueva Ficha'}</h3>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="w-full p-3 bg-gray-50 border rounded-xl" />
                <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="w-full p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-3 bg-gray-50 border rounded-xl" />
                <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-3 bg-gray-50 border rounded-xl" />
              </div>
              <div className="flex gap-4 pt-4 border-t"><button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">CANCELAR</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">GUARDAR</button></div>
            </form>
          </div>
        </div>
      )}

      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl">
            <h3 className="text-2xl font-bold mb-4 text-blue-600 flex items-center gap-2"><UploadCloud/> Carga Masiva</h3>
            <textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "lastName": "Gomez", "firstName": "Ana"... } ]' className="w-full h-48 p-4 bg-gray-50 border rounded-2xl font-mono text-xs mb-6 outline-none" />
            <div className="flex gap-3"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-4 bg-gray-100 rounded-2xl font-bold">CERRAR</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg">{processing ? <RefreshCw className="animate-spin" /> : 'IMPORTAR'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- VISTAS RESTANTES ---
function DashboardView({ user, tasks, events }) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEvents = (events || []).filter(e => e.date === todayStr);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-violet-100 relative overflow-hidden">
        <div className="relative z-10">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">¡Hola, {user.firstName}! 👋</h2>
          <p className="text-slate-500 font-medium mt-1">Tu agenda para hoy en Juntos a la Par.</p>
        </div>
        <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-violet-50 rounded-full opacity-50"></div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-orange-500 p-6 rounded-[35px] text-white shadow-lg shadow-orange-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-2 rounded-xl"><CheckSquare size={20}/></div>
            <span className="text-2xl font-black">{(tasks || []).filter(t => t.status !== 'completed').length}</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tareas Pendientes</p>
        </div>
        <div className="bg-violet-600 p-6 rounded-[35px] text-white shadow-lg shadow-violet-200">
          <div className="flex justify-between items-start mb-4">
            <div className="bg-white/20 p-2 rounded-xl"><CalendarIcon size={20}/></div>
            <span className="text-2xl font-black">{todayEvents.length}</span>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">Eventos Hoy</p>
        </div>
      </div>
    </div>
  );
}

function CalendarView({ events, canEdit, user }) {
  const [viewMode, setViewMode] = useState('grid'); 
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="min-h-[70px] bg-gray-50/30 border border-gray-100"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = (events || []).filter(e => e.date === dateStr);
      days.push(
        <div key={d} className="min-h-[70px] border border-gray-100 p-1 bg-white hover:bg-violet-50 transition overflow-hidden text-center">
          <span className={`text-[10px] font-bold ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-col gap-0.5 mt-1">
            {dayEvents.map((ev, idx) => (<button key={idx} onClick={() => setSelectedEvent(ev)} className="text-[7px] bg-violet-100 text-violet-700 rounded p-0.5 truncate">{ev.title}</button>))}
          </div>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900">Agenda</h2>
        <div className="flex gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 bg-white rounded-xl border"><ChevronLeft/></button>
          <span className="font-bold text-violet-900 capitalize px-2">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 bg-white rounded-xl border"><ChevronRight/></button>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden grid grid-cols-7">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="text-[9px] font-black text-violet-400 uppercase p-2 border-b text-center">{d}</div>)}
        {renderCalendarGrid()}
      </div>
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black text-gray-800">{selectedEvent.title}</h2>
            <p className="text-gray-500 text-sm mt-4">{selectedEvent.description || 'Sin descripción.'}</p>
            <button onClick={() => setSelectedEvent(null)} className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold mt-6">CERRAR</button>
          </div>
        </div>
      )}
    </div>
  );
}

function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    return onSnapshot(q, snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
  }, []);

  const addTask = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const targetUserId = fd.get('targetUser');
    const targetUser = usersList.find(u => u.id === targetUserId);
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
      title: fd.get('title'),
      dueDate: fd.get('dueDate'),
      assignedToName: targetUser ? (targetUser.fullName || targetUser.firstName) : "Todos",
      status: 'pending',
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900">Tareas</h2>
        <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg"><Plus/></button>
      </div>
      <div className="grid gap-3">
        {(tasks || []).map(t => (
          <div key={t.id} className="bg-white p-5 rounded-[30px] border shadow-sm flex justify-between items-center">
            <div><p className="text-[10px] font-bold text-orange-500 uppercase">{t.assignedToName}</p><h3 className="font-bold text-gray-800">{t.title}</h3></div>
            <div className="text-[10px] font-black bg-gray-50 px-3 py-1 rounded-full text-gray-400">{t.dueDate}</div>
          </div>
        ))}
      </div>
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
          <form onSubmit={addTask} className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl space-y-4">
            <h3 className="text-xl font-black mb-6">Nueva Tarea</h3>
            <input name="title" placeholder="¿Qué hay que hacer?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
            <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none">
              <option value="all">Asignar a: Todos</option>
              {usersList.map(u => <option key={u.id} value={u.id}>{u.fullName || u.firstName}</option>)}
            </select>
            <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
            <button type="submit" className="w-full py-4 bg-violet-800 text-white rounded-2xl font-bold shadow-lg">GUARDAR</button>
          </form>
        </div>
      )}
    </div>
  );
}

function ResourcesView({ resources, canEdit }) {
  const [currentFolder, setCurrentFolder] = useState(null);
  const folders = (resources || []).reduce((acc, res) => {
    const cat = res.category || 'VARIOS';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(res);
    return acc;
  }, {});
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900">Recursos</h2>
        {currentFolder && <button onClick={() => setCurrentFolder(null)} className="bg-gray-100 p-2 rounded-xl text-xs font-bold">VOLVER</button>}
      </div>
      {!currentFolder ? (
        <div className="grid grid-cols-2 gap-4">
          {Object.keys(folders).map(name => (
            <div key={name} onClick={() => setCurrentFolder(name)} className="bg-white p-6 rounded-[35px] border text-center cursor-pointer shadow-sm">
              <Folder size={32} className="mx-auto text-violet-300 mb-2"/>
              <h3 className="font-bold text-[10px] uppercase tracking-widest">{name}</h3>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-3">
          {folders[currentFolder].map(res => (<a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-2xl border font-bold text-sm text-gray-700 block">{res.title}</a>))}
        </div>
      )}
    </div>
  );
}

function ProyectoView({ user }) {
  const [meses, setMeses] = useState([]);
  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), orderBy('orden', 'asc'));
    return onSnapshot(q, snap => setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, []);
  const inicializar = async () => {
    const names = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    for(let i=0; i<names.length; i++) {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), { 
        nombre: names[i], orden: i, eje: "La Vuelta al Mundo en 360 días", 
        contenidos: "🌍 EJE: La Vuelta al Mundo en 360 días\n\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:" 
      });
    }
  };
  return (
    <div className="space-y-4">
      <div className="bg-indigo-900 p-8 rounded-[40px] text-white">
        <h2 className="text-2xl font-black italic">Proyecto 360</h2>
        {isAdmin && meses.length === 0 && <button onClick={inicializar} className="mt-4 bg-orange-500 p-3 rounded-xl text-xs font-black">CARGAR PROYECTO</button>}
      </div>
      {meses.map(m => (
        <div key={m.id} className="bg-white p-6 rounded-[30px] border shadow-sm">
          <div className="flex justify-between items-center mb-2"><h3 className="font-black text-gray-800 uppercase text-sm">{m.nombre}</h3><span className="text-[9px] bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-bold">{m.eje}</span></div>
          <div className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed">{m.contenidos}</div>
        </div>
      ))}
    </div>
  );
}

function ProfileView({ user, onLogout }) {
  return (
    <div className="space-y-6 text-center animate-in fade-in">
      <div className="bg-white p-12 rounded-[50px] shadow-xl border relative overflow-hidden">
        <div className="w-24 h-24 bg-violet-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-black text-violet-600">{user.firstName?.[0]}</div>
        <h2 className="text-3xl font-black text-gray-800">{user.fullName || user.firstName}</h2>
        <p className="text-orange-600 font-black uppercase tracking-widest mt-1">{user.role}</p>
      </div>
      <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-6 rounded-[40px] font-black text-lg shadow-lg border-2 border-red-100 uppercase tracking-widest">Salir del Portal</button>
    </div>
  );
}
