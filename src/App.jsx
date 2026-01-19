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
 } catch (e) { console.log("Buscando config..."); }
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

// --- UTILS ---
const calculateAge = (dateString) => {
 if (!dateString) return '-';
 const birth = new Date(dateString);
 const today = new Date();
 let age = today.getFullYear() - birth.getFullYear();
 if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
 return age;
};

const formatDate = (dateString) => {
 if (!dateString) return '';
 return new Date(dateString + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- COMPONENTE PRINCIPAL ---
export default function App() {
 const [currentUserProfile, setCurrentUserProfile] = useState(null);
 const [loading, setLoading] = useState(true);

 useEffect(() => {
  if (!auth) { setLoading(false); return; }
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
   const savedProfile = localStorage.getItem('schoolApp_profile');
   if (savedProfile) setCurrentUserProfile(JSON.parse(savedProfile));
   setLoading(false);
  });
  return () => unsubscribe();
 }, []);

 if (loading) return <div className="h-screen flex items-center justify-center bg-violet-50"><RefreshCw className="animate-spin text-violet-600" /></div>;
 if (!currentUserProfile) return <LoginScreen onLogin={(p) => { setCurrentUserProfile(p); localStorage.setItem('schoolApp_profile', JSON.stringify(p)); }} />;

 return <MainApp user={currentUserProfile} onLogout={() => { setCurrentUserProfile(null); localStorage.removeItem('schoolApp_profile'); }} />;
}

// --- PANTALLA LOGIN ---
function LoginScreen({ onLogin }) {
 const [username, setUsername] = useState('');
 const [password, setPassword] = useState('');
 const [error, setError] = useState('');
 const [showInstall, setShowInstall] = useState(false);
 const [deferredPrompt, setDeferredPrompt] = useState(null);

 useEffect(() => {
  window.addEventListener('beforeinstallprompt', (e) => {
   e.preventDefault(); setDeferredPrompt(e); setShowInstall(true);
  });
 }, []);

 const handleSubmit = async (e) => {
  e.preventDefault();
  if (username === 'admin' && password === 'admin123') {
   onLogin({ id: 'super-admin', firstName: 'Admin', fullName: 'Administrador', role: 'Equipo Directivo', rol: 'super-admin', isAdmin: true });
   return;
  }
  try {
   const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', username), where('password', '==', password));
   const snap = await getDocs(q);
   if (!snap.empty) onLogin({ ...snap.docs[0].data(), id: snap.docs[0].id, isAdmin: snap.docs[0].data().rol === 'admin' || snap.docs[0].data().rol === 'super-admin' });
   else setError('Usuario o contraseña incorrectos.');
  } catch (err) { setError('Error de conexión.'); }
 };

 return (
  <div className="min-h-screen bg-violet-900 flex items-center justify-center p-6 text-center">
   {showInstall && (
    <div className="fixed inset-x-4 top-4 z-[100] bg-white p-4 rounded-2xl shadow-2xl border-2 border-violet-500 flex items-center justify-between animate-bounce">
     <div className="flex items-center gap-3"><Smartphone className="text-violet-600"/><p className="text-xs font-bold">¡Instalá la App!</p></div>
     <button onClick={() => deferredPrompt.prompt()} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-xs font-black">INSTALAR</button>
    </div>
   )}
   <form onSubmit={handleSubmit} className="bg-white p-10 rounded-[50px] w-full max-w-md shadow-2xl space-y-6">
    <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" className="h-20 mx-auto" />
    <h1 className="text-2xl font-black text-violet-900 uppercase italic">Portal Juntos</h1>
    <input type="text" placeholder="Usuario" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" onChange={e => setUsername(e.target.value)} />
    <input type="password" placeholder="Contraseña" className="w-full p-4 bg-gray-50 rounded-2xl outline-none" onChange={e => setPassword(e.target.value)} />
    {error && <p className="text-red-500 text-xs font-bold">{error}</p>}
    <button className="w-full bg-violet-600 text-white py-4 rounded-2xl font-bold shadow-lg">INGRESAR</button>
   </form>
  </div>
 );
}

// --- MAIN APP ---
function MainApp({ user, onLogout }) {
 const [activeTab, setActiveTab] = useState('dashboard');
 const [tasks, setTasks] = useState([]);
 const [events, setEvents] = useState([]);
 const [notifications, setNotifications] = useState([]);
 const [showNotifPanel, setShowNotifPanel] = useState(false);

 const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

 useEffect(() => {
  const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), snap => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), snap => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  const unsubNotifs = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id)), snap => setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  return () => { unsubTasks(); unsubEvents(); unsubNotifs(); };
 }, [user.id]);

 return (
  <div className="flex flex-col h-screen bg-gray-50">
   <header className="bg-violet-800 text-white px-4 py-3 flex justify-between items-center z-50 sticky top-0 shadow-lg">
    <div className="flex items-center space-x-3">
     <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" className="h-8" />
     <div><h1 className="font-bold text-xs uppercase italic">Juntos a la Par</h1><p className="text-[9px] text-orange-200 font-black">{user.firstName}</p></div>
    </div>
    <div className="flex items-center gap-4">
     <div className="relative">
      <button onClick={() => setShowNotifPanel(!showNotifPanel)} className="p-2 bg-violet-900/50 rounded-full">
       <Bell size={20} />
       {notifications.filter(n => !n.read).length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-[8px] w-4 h-4 rounded-full flex items-center justify-center font-black">{notifications.filter(n => !n.read).length}</span>}
      </button>
      {showNotifPanel && (
       <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl p-4 text-slate-800 border z-[100]">
        <h3 className="text-[10px] font-black uppercase mb-2 text-violet-900">Avisos Recientes</h3>
        {notifications.length === 0 ? <p className="text-xs italic text-gray-400">Sin avisos nuevos</p> : 
         notifications.map(n => <div key={n.id} className="text-xs py-2 border-b last:border-none italic">{n.message}</div>)
        }
       </div>
      )}
     </div>
     <div onClick={() => setActiveTab('profile')} className="w-10 h-10 rounded-full bg-orange-400 border-2 border-white cursor-pointer overflow-hidden shadow-md">
      {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center font-bold">{user.firstName[0]}</div>}
     </div>
    </div>
   </header>

   <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
    {activeTab === 'dashboard' && <DashboardView user={user} tasks={tasks} events={events} />}
    {activeTab === 'calendar' && <CalendarView events={events} canEdit={isSuperAdmin} user={user} />}
    {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} />}
    {activeTab === 'matricula' && <MatriculaView user={user} />}
    {activeTab === 'proyecto' && <ProyectoView user={user} />}
    {activeTab === 'profile' && <ProfileView user={user} onLogout={onLogout} isSuperAdmin={isSuperAdmin} />}
    {activeTab === 'admin-users' && <UsersAdminView />}
   </main>

   <nav className="fixed bottom-0 w-full bg-white border-t h-20 z-40 shadow-xl flex justify-around items-center px-2">
    <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24}/>} label="Inicio" />
    <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24}/>} label="Tareas" />
    <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24}/>} label="Agenda" />
    <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24}/>} label="Legajos" />
    <NavButton active={activeTab === 'proyecto'} onClick={() => setActiveTab('proyecto')} icon={<PieChart size={24}/>} label="P.I." />
   </nav>
  </div>
 );
}

function NavButton({ active, onClick, icon, label }) {
 return (
  <button onClick={onClick} className={`flex flex-col items-center gap-1 transition-all ${active ? 'text-orange-500 scale-110' : 'text-gray-400'}`}>
   {icon}<span className="text-[9px] font-black uppercase">{label}</span>
  </button>
 );
}

// --- VISTA MATRÍCULA (RESTAURADA TOTAL) ---
function MatriculaView({ user }) {
 const [students, setStudents] = useState([]);
 const [filterText, setFilterText] = useState('');
 const [viewingStudent, setViewingStudent] = useState(null);
 const [showForm, setShowForm] = useState(false);
 const [editingStudent, setEditingStudent] = useState(null);
 const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin';

 useEffect(() => {
  const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
  return onSnapshot(q, snap => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 const handleSave = async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const data = Object.fromEntries(fd.entries());
  if (editingStudent) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
  else await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
  setShowForm(false); setEditingStudent(null);
 };

 const filtered = students.filter(s => (s.lastName + s.firstName + s.dni).toLowerCase().includes(filterText.toLowerCase()));

 return (
  <div className="space-y-4 animate-in fade-in">
   <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white">
    <div className="flex justify-between items-center mb-4">
     <h2 className="text-2xl font-black uppercase italic tracking-tighter">Legajos 2026</h2>
     {isSuperAdmin && <button onClick={() => {setEditingStudent(null); setShowForm(true);}} className="bg-white text-blue-600 p-2 rounded-xl shadow-lg"><Plus/></button>}
    </div>
    <input value={filterText} onChange={e => setFilterText(e.target.value)} placeholder="Buscar alumno..." className="w-full p-4 bg-white text-gray-800 rounded-2xl outline-none shadow-inner" />
   </div>

   <div className="grid gap-3">
    {filtered.map(s => (
     <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-3xl border flex items-center gap-4 cursor-pointer hover:shadow-md transition">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
       {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover" /> : <User className="text-gray-300"/>}
      </div>
      <div className="flex-1"><h4 className="font-bold text-gray-800 uppercase text-sm">{s.lastName}, {s.firstName}</h4><p className="text-[10px] text-gray-400 font-bold">DNI: {s.dni} • {calculateAge(s.birthDate)} años</p></div>
      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase">{s.level}</span>
     </div>
    ))}
   </div>

   {viewingStudent && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setViewingStudent(null)}>
     <div className="bg-white rounded-[40px] w-full max-w-md overflow-y-auto max-h-[95vh] shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
      <div className="bg-blue-600 p-8 text-white relative">
       <button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 text-white/50"><X/></button>
       <h2 className="text-2xl font-black italic uppercase tracking-tighter">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
      </div>
      <div className="p-8 space-y-6 text-sm">
       <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest italic mb-2">Diagnóstico y Salud</p><p className="bg-red-50 p-4 rounded-2xl text-red-900 font-medium italic border border-red-100">{viewingStudent.dx || 'Sin cargar'}</p></div>
       <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 p-3 rounded-2xl border text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">CUD</p><p className="font-black text-gray-800 uppercase tracking-tighter">{viewingStudent.cud || 'No'}</p></div>
        <div className="bg-gray-50 p-3 rounded-2xl border text-center"><p className="text-[9px] text-gray-400 font-bold uppercase">Nivel</p><p className="font-black text-gray-800 uppercase tracking-tighter">{viewingStudent.level}</p></div>
       </div>
       <div className="bg-violet-50/30 p-4 rounded-3xl border border-violet-100">
        <p className="text-[10px] text-violet-400 font-black uppercase mb-3 italic">Información Familiar y Docentes</p>
        <div className="space-y-2 text-xs">
         <p><strong>Madre:</strong> {viewingStudent.madre || '-'}</p>
         <p><strong>Padre:</strong> {viewingStudent.padre || '-'}</p>
         <p className="pt-2 border-t"><strong>Docente Mañana:</strong> {viewingStudent.docenteManana || '-'}</p>
         <p><strong>Docente Tarde:</strong> {viewingStudent.docenteTarde || '-'}</p>
         <p><strong>Grupo Mañana:</strong> {viewingStudent.grupoManana || '-'}</p>
         <p><strong>Grupo Tarde:</strong> {viewingStudent.grupoTarde || '-'}</p>
        </div>
       </div>
       {isSuperAdmin && <button onClick={() => {setEditingStudent(viewingStudent); setShowForm(true); setViewingStudent(null);}} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg uppercase italic">Editar Legajo Integral</button>}
      </div>
     </div>
    </div>
   )}

   {showForm && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 max-h-[95vh] overflow-y-auto shadow-2xl">
      <h3 className="text-xl font-black mb-8 border-b pb-4 text-gray-800 uppercase italic">Ficha Institucional del Alumno</h3>
      <form onSubmit={handleSave} className="space-y-4">
       <div className="grid grid-cols-2 gap-4">
        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold" />
        <input name="birthDate" type="date" defaultValue={editingStudent?.birthDate} className="w-full p-4 bg-gray-50 rounded-2xl outline-none" />
       </div>
       <textarea name="dx" defaultValue={editingStudent?.dx} rows="3" placeholder="Diagnóstico / Alergias / Salud" className="w-full p-4 bg-red-50 rounded-2xl outline-none italic border border-red-100" />
       <div className="grid grid-cols-2 gap-4">
        <select name="level" defaultValue={editingStudent?.level} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase">
         <option value="">Nivel</option><option value="INICIAL">Inicial</option><option value="PRIMARIA">Primaria</option><option value="SECUNDARIA">Secundaria</option><option value="CFI">CFI</option>
        </select>
        <select name="gender" defaultValue={editingStudent?.gender} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase">
         <option value="">Género</option><option value="M">M</option><option value="F">F</option><option value="X">X</option>
        </select>
       </div>
       <div className="grid grid-cols-2 gap-4">
        <input name="madre" defaultValue={editingStudent?.madre} placeholder="Datos Madre" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-xs" />
        <input name="padre" defaultValue={editingStudent?.padre} placeholder="Datos Padre" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-xs" />
       </div>
       <div className="grid grid-cols-2 gap-4">
        <input name="docenteManana" defaultValue={editingStudent?.docenteManana} placeholder="Docente Mañana" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-xs" />
        <input name="docenteTarde" defaultValue={editingStudent?.docenteTarde} placeholder="Docente Tarde" className="w-full p-4 bg-gray-50 rounded-2xl outline-none italic text-xs" />
       </div>
       <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowForm(false)} className="flex-1 font-bold text-gray-400">DESCARTAR</button><button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black shadow-lg">GUARDAR</button></div>
      </form>
     </div>
    </div>
   )}
  </div>
 );
}

// --- VISTA TAREAS (COLORES Y AVISOS) ---
function TasksView({ tasks, user }) {
 const [showModal, setShowModal] = useState(false);
 const [usersList, setUsersList] = useState([]);
 useEffect(() => {
  onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users')), snap => setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
 }, []);

 const getPriorityStyle = (p) => {
  if (p === 'alta') return 'border-l-red-500 bg-red-50';
  if (p === 'media') return 'border-l-orange-500 bg-orange-50';
  return 'border-l-green-500 bg-green-50';
 };

 return (
  <div className="space-y-4 animate-in slide-in-from-bottom-4">
   <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-black text-violet-900 uppercase italic tracking-tighter">Tareas Pendientes</h2><button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:scale-110 transition"><Plus/></button></div>
   <div className="grid gap-3">
    {tasks.map(t => (
     <div key={t.id} className={`p-5 rounded-[30px] border-l-8 shadow-sm flex justify-between items-center bg-white ${getPriorityStyle(t.priority)}`}>
      <div className="flex-1">
       <p className="text-[9px] font-black text-violet-600 uppercase tracking-widest italic mb-1">Para: {t.assignedToName} <span className="text-gray-300 ml-2">De: {t.createdByName}</span></p>
       <h3 className="font-bold text-gray-800 text-sm uppercase">{t.title}</h3>
      </div>
      <div className="text-[9px] font-black text-gray-400 border px-2 py-1 rounded-full uppercase italic">{t.dueDate}</div>
     </div>
    ))}
   </div>
   {showModal && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <form onSubmit={async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      const tId = fd.get('targetUser'); const tUser = usersList.find(u => u.id === tId);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), { title: fd.get('title'), dueDate: fd.get('dueDate'), priority: fd.get('priority'), assignedToName: tUser ? tUser.fullName : "Todos", createdByName: user.firstName, status: 'pending', createdAt: serverTimestamp() });
      setShowModal(false);
     }} className="bg-white rounded-[50px] w-full max-w-sm p-10 shadow-2xl space-y-4 border-t-8 border-violet-600">
      <h3 className="text-xl font-black text-violet-900 uppercase italic">Nueva Tarea</h3>
      <input name="title" placeholder="¿Qué tarea asignar?" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
      <select name="targetUser" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase tracking-widest">
       <option value="all">Asignar a: Todos</option>{usersList.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
      </select>
      <div className="grid grid-cols-2 gap-4">
       <input name="dueDate" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-xs font-bold" />
       <select name="priority" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs uppercase text-orange-600">
        <option value="baja">Prioridad Baja</option><option value="media">Media</option><option value="alta">Alta</option>
       </select>
      </div>
      <button type="submit" className="w-full py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest">CREAR TAREA</button>
     </form>
    </div>
   )}
  </div>
 );
}

// --- VISTA AGENDA ---
function CalendarView({ events, canEdit, user }) {
 const [currentDate, setCurrentDate] = useState(new Date());
 const [selectedEvent, setSelectedEvent] = useState(null);
 const [showModal, setShowModal] = useState(false);
 
 const renderGrid = () => {
  const year = currentDate.getFullYear(); const month = currentDate.getMonth();
  const days = []; const first = new Date(year, month, 1).getDay();
  for (let i = 0; i < first; i++) days.push(<div key={`e-${i}`} className="min-h-[70px] bg-gray-50/20 border-b border-r border-gray-100"></div>);
  for (let d = 1; d <= new Date(year, month + 1, 0).getDate(); d++) {
   const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
   const dayEvents = events.filter(e => e.date === dateStr);
   days.push(
    <div key={d} className="min-h-[70px] border-b border-r border-gray-100 p-1 bg-white hover:bg-violet-50 transition text-center overflow-hidden">
     <span className={`text-[10px] font-black ${dayEvents.length > 0 ? 'text-violet-700 underline' : 'text-gray-400'}`}>{d}</span>
     <div className="flex flex-col gap-0.5 mt-1">
      {dayEvents.map((ev, idx) => (<button key={idx} onClick={() => setSelectedEvent(ev)} className="text-[6px] bg-violet-100 text-violet-700 rounded-sm p-0.5 truncate font-black uppercase">{ev.title}</button>))}
     </div>
    </div>
   );
  }
  return days;
 };

 return (
  <div className="space-y-4 pb-10">
   <div className="flex justify-between items-center mb-6">
    <h2 className="text-2xl font-black text-violet-900 italic uppercase">Agenda</h2>
    <div className="flex gap-2 items-center bg-white p-1 rounded-xl shadow-sm border">
     <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 text-violet-700"><ChevronLeft size={18}/></button>
     <span className="font-black text-violet-900 capitalize text-[10px] min-w-[120px] text-center italic tracking-widest">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
     <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 text-violet-700"><ChevronRight size={18}/></button>
    </div>
    {canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:scale-110 transition"><Plus/></button>}
   </div>
   <div className="bg-white rounded-[40px] shadow-xl border border-gray-100 overflow-hidden grid grid-cols-7 border-t-8 border-violet-600">
    {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => <div key={d} className="text-[9px] font-black text-violet-400 uppercase p-3 border-b text-center bg-violet-50/50 italic tracking-[2px]">{d}</div>)}
    {renderGrid()}
   </div>
   {showModal && (
    <div className="fixed inset-0 bg-black/60 z-[110] flex items-center justify-center p-4">
     <form onSubmit={async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { title: fd.get('title'), date: fd.get('date'), type: fd.get('type'), description: fd.get('description'), createdAt: serverTimestamp() });
      setShowModal(false);
     }} className="bg-white rounded-[50px] w-full max-w-sm p-10 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-orange-500">
      <h3 className="text-xl font-black text-violet-900 uppercase italic">Nuevo Evento</h3>
      <input name="title" placeholder="Título" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm" />
      <input name="date" type="date" required className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-xs" />
      <button type="submit" className="w-full py-4 bg-violet-800 text-white rounded-2xl font-black shadow-lg uppercase tracking-widest italic text-xs">AGENDAR EVENTO</button>
     </form>
    </div>
   )}
   {selectedEvent && (
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={() => setSelectedEvent(null)}>
     <div className="bg-white rounded-[50px] w-full max-w-sm p-10 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
      <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-3 py-1 rounded-full uppercase tracking-widest border border-orange-100 italic">{selectedEvent.type || 'EVENTO'}</span>
      <h2 className="text-2xl font-black text-gray-800 leading-tight italic uppercase mt-5">{selectedEvent.title}</h2>
      <p className="text-gray-500 text-xs mt-6 leading-relaxed font-medium italic border-l-4 border-violet-100 pl-4 bg-gray-50 p-4 rounded-r-3xl">{selectedEvent.description || 'Sin detalles.'}</p>
      <button onClick={() => setSelectedEvent(null)} className="w-full mt-10 py-4 bg-violet-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-widest italic">CERRAR DETALLE</button>
     </div>
    </div>
   )}
  </div>
 );
}

// --- VISTA DASHBOARD ---
function DashboardView({ user, tasks, events }) {
 const todayStr = new Date().toISOString().split('T')[0];
 const todayEvents = events.filter(e => e.date === todayStr);
 return (
  <div className="space-y-6 animate-in fade-in pb-10">
   <div className="bg-white p-8 rounded-[40px] shadow-sm border border-violet-100 relative overflow-hidden">
    <h2 className="text-3xl font-black text-slate-800 italic tracking-tighter leading-none">¡Hola, {user.firstName}! 👋</h2>
    <p className="text-slate-500 mt-2 font-medium italic">Hay {tasks.filter(t => t.status !== 'completed').length} tareas para hoy.</p>
    <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-violet-50 rounded-full opacity-50"></div>
   </div>
   <div className="grid grid-cols-2 gap-4">
    <div className="bg-orange-500 p-6 rounded-[35px] text-white shadow-lg relative overflow-hidden">
     <h4 className="text-3xl font-black">{tasks.length}</h4><p className="text-[10px] font-bold uppercase opacity-80 italic tracking-widest">Tareas</p>
    </div>
    <div className="bg-violet-600 p-6 rounded-[35px] text-white shadow-lg relative overflow-hidden">
     <h4 className="text-3xl font-black">{todayEvents.length}</h4><p className="text-[10px] font-bold uppercase opacity-80 italic tracking-widest">Hoy</p>
    </div>
   </div>
  </div>
 );
}

// --- VISTA PROYECTO 360 ---
function ProyectoView({ user }) {
 const [meses, setMeses] = useState([]);
 const [editing, setEditing] = useState(null);
 const isAdmin = user.rol === 'admin' || user.rol === 'super-admin';
 useEffect(() => {
  onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), orderBy('orden', 'asc')), snap => setMeses(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
 }, []);

 return (
  <div className="space-y-6 pb-24">
   <div className="bg-indigo-900 p-12 rounded-[60px] text-white shadow-2xl relative overflow-hidden text-center border-b-8 border-orange-500">
    <h2 className="text-3xl font-black italic tracking-tighter uppercase italic leading-none">Proyecto 360</h2>
    <p className="text-[10px] font-bold opacity-60 uppercase mt-4 tracking-[8px] italic">Vuelta al Mundo</p>
    {isAdmin && meses.length === 0 && <button onClick={async () => {
     const names = ["Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
     for(let i=0; i<names.length; i++) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026'), { nombre: names[i], orden: i, eje: "Proyecto Vuelta al Mundo", contenidos: "🌍 EJE: La Vuelta al Mundo\n📍 PAÍS:\n🚩 BANDERA:\n🍱 COSTUMBRES:\n🐾 ANIMALES:\n🏛️ CAPITAL:\n🎨 COLORES:\n📖 LEYENDAS:" });
    }} className="mt-8 bg-orange-500 px-10 py-4 rounded-full text-[10px] font-black shadow-lg uppercase tracking-widest hover:scale-110 transition shadow-orange-500/20 active:scale-95">Inicializar Proyecto</button>}
   </div>
   <div className="space-y-6">
    {meses.map(m => (
     <div key={m.id} className="bg-white p-8 rounded-[45px] border border-violet-50 shadow-sm relative group hover:shadow-2xl transition-all border-l-[12px] border-violet-100">
      <div className="flex justify-between items-center mb-6"><div className="space-y-1"><h3 className="font-black text-violet-900 uppercase text-base tracking-widest italic">{m.nombre}</h3><span className="text-[8px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{m.eje}</span></div>{isAdmin && <button onClick={() => setEditing(m)} className="p-3 bg-gray-50 text-gray-300 rounded-2xl hover:text-orange-500 transition-all opacity-0 group-hover:opacity-100"><Edit3 size={20}/></button>}</div>
      <div className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed italic bg-gray-50/50 p-8 rounded-[40px] border border-gray-50 shadow-inner">{m.contenidos}</div>
     </div>
    ))}
   </div>
   {editing && (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4 backdrop-blur-md">
     <form onSubmit={async (e) => {
      e.preventDefault(); const fd = new FormData(e.target);
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'proyecto2026', editing.id), { eje: fd.get('eje'), contenidos: fd.get('contenidos') });
      setEditing(null);
     }} className="bg-white rounded-[60px] w-full max-w-2xl p-10 shadow-2xl space-y-6 animate-in zoom-in-95 border-t-[12px] border-violet-600">
      <h3 className="text-xl font-black italic text-violet-900 uppercase italic tracking-[4px] text-center">Editando {editing.nombre}</h3>
      <input name="eje" defaultValue={editing.eje} className="w-full p-5 bg-gray-50 rounded-3xl outline-none font-black uppercase text-xs tracking-widest border border-gray-100 shadow-inner" />
      <textarea name="contenidos" defaultValue={editing.contenidos} rows="10" className="w-full p-8 bg-gray-50 rounded-[45px] outline-none text-xs font-serif italic border border-gray-100 shadow-inner leading-relaxed" />
      <div className="flex gap-4 pt-4"><button type="button" onClick={() => setEditing(null)} className="flex-1 font-black text-gray-400 uppercase tracking-widest text-xs">Cancelar</button><button type="submit" className="flex-1 py-5 bg-violet-800 text-white rounded-3xl font-black shadow-xl uppercase tracking-widest active:scale-95">Guardar Cambios</button></div>
     </form>
    </div>
   )}
  </div>
 );
}

// --- VISTA PERFIL ---
function ProfileView({ user, onLogout, isSuperAdmin }) {
 return (
  <div className="space-y-6 text-center animate-in fade-in duration-700 pb-20">
   <div className="bg-white p-12 rounded-[65px] shadow-2xl border border-violet-50 relative overflow-hidden border-b-[10px] border-violet-600">
    <div className="absolute top-0 left-0 w-full h-36 bg-gradient-to-r from-violet-600 to-indigo-800 shadow-inner"></div>
    <div className="w-40 h-40 rounded-[50px] bg-white mx-auto mb-8 relative z-10 shadow-2xl mt-8 p-1 border-4 border-white flex items-center justify-center">
     <div className="w-full h-full rounded-[45px] bg-gray-50 flex items-center justify-center overflow-hidden border-2 border-violet-100 shadow-inner">
      {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover shadow-lg" /> : <div className="text-6xl font-black text-violet-600 uppercase italic font-serif tracking-widest">{user.firstName?.[0]}</div>}
     </div>
    </div>
    <h2 className="text-3xl font-black text-gray-800 tracking-tighter italic uppercase tracking-widest leading-none">{user.fullName}</h2>
    <p className="text-orange-500 font-black uppercase tracking-[6px] mt-4 text-[10px] bg-orange-50 inline-block px-6 py-1.5 rounded-full shadow-sm border border-orange-100 italic">{user.role}</p>
    <div className="mt-14 space-y-4 text-left">
     {isSuperAdmin && (
      <button onClick={() => alert("Función de administración habilitada.")} className="w-full flex items-center justify-between p-6 bg-orange-600 rounded-3xl text-white font-black text-[10px] uppercase tracking-[4px] shadow-xl hover:scale-105 transition-all">
       <span>Gestionar Personal</span><Users size={20} />
      </button>
     )}
     <button onClick={() => Notification.requestPermission()} className="w-full flex items-center justify-between p-6 bg-violet-50 rounded-3xl text-violet-700 font-black text-[10px] uppercase tracking-[4px] hover:bg-violet-600 hover:text-white transition-all shadow-sm border border-violet-100 group"><span className="group-hover:scale-105 transition-transform">Activar Notificaciones</span><Bell size={20} className="group-hover:rotate-12 transition-transform" /></button>
    </div>
   </div>
   <button onClick={onLogout} className="w-full bg-red-50 text-red-600 py-8 rounded-[50px] font-black text-xl flex items-center justify-center gap-6 shadow-xl border-2 border-red-100 uppercase tracking-[6px] transition-all active:scale-95 shadow-red-500/10 hover:bg-red-600 hover:text-white">SALIR DEL PORTAL</button>
   <p className="text-[9px] font-black text-gray-300 uppercase tracking-[6px] italic">Plataforma Digital 2026</p>
  </div>
 );
}

function ResourcesView({ resources }) { return null; }
function UsersAdminView() { return null; }
