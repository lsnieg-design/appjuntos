import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  User, 
  FileText, 
  CheckCircle,
  Download,
  Database,
  RefreshCw,
  Plus,
  Trash2,
  Users,
  Shield,
  AlertCircle,
  LogOut,
  Briefcase,
  Lock,
  List,
  Grid,
  ChevronLeft,
  ChevronRight,
  Bell,
  Check
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged,
  signInWithCustomToken
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  setDoc,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  where,
  getDocs
} from 'firebase/firestore';

// --- CONFIGURACIÓN DE FIREBASE (HÍBRIDA) ---
const getFirebaseConfig = () => {
  // 1. Intentar leer variables de entorno de Vercel (Vite)
  try {
    // Verificamos si existe import.meta.env (estándar de Vite)
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
    // Si falla (por ejemplo en entornos que no son Vite), seguimos al fallback
    console.log("No se detectaron variables de entorno Vite, buscando config global...");
  }
  
  // 2. Fallback: Configuración automática del entorno de chat (Preview)
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }

  // 3. Fallback final: Objeto vacío (evita que la app explote, pero no conectará)
  // console.error("Falta configuración de Firebase. Revise las variables de entorno en Vercel.");
  return {};
};

const firebaseConfig = getFirebaseConfig();
// Inicializamos solo si hay configuración válida
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'escuela-app-prod';

// --- Constantes ---
const ROLES = [
  'Docente',
  'Equipo Técnico',
  'Equipo Directivo',
  'Administración',
  'Auxiliar/Preceptor'
];

const EVENT_TYPES = [
  'SALIDA EDUCATIVA',
  'GENERAL',
  'ADMINISTRATIVO',
  'INFORMES',
  'EVENTOS',
  'ACTOS',
  'EFEMÉRIDES',
  'CUMPLEAÑOS'
];

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

// --- Componente Principal ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  // Inicialización de Auth
  useEffect(() => {
    if (!auth) {
      setConfigError(true);
      setLoading(false);
      return;
    }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // Importante: Asegúrate de tener habilitado "Anonymous" en Firebase Console
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      const savedProfile = localStorage.getItem('schoolApp_profile');
      if (savedProfile) {
        setCurrentUserProfile(JSON.parse(savedProfile));
      }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-violet-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div>
      </div>
    );
  }

  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center">
        <AlertCircle className="text-red-500 w-16 h-16 mb-4" />
        <h1 className="text-xl font-bold text-red-700">Error de Configuración</h1>
        <p className="text-red-600 mt-2">No se pudo conectar con la base de datos.</p>
        <p className="text-sm text-red-500 mt-4">Verifica que las Variables de Entorno en Vercel estén configuradas correctamente.</p>
      </div>
    );
  }

  if (!currentUserProfile) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- Pantalla Login ---
// --- Pantalla Login (MODIFICADA PARA LEER TU ROL DE ADMIN) ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    // Backdoor para super admin hardcodeado (opcional, puedes borrarlo si quieres)
    if (username === 'admin' && password === 'admin123') {
      onLogin({
        id: 'super-admin',
        firstName: 'Super',
        lastName: 'Admin',
        fullName: 'Super Admin',
        role: 'Equipo Directivo',
        rol: 'admin', // Forzamos el rol
        isAdmin: true,
        username: 'admin'
      });
      return;
    }

    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      // Buscamos usuario y contraseña coincidente
      const q = query(usersRef, where('username', '==', username), where('password', '==', password));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userData = userDoc.data();
        
        // --- AQUÍ ESTÁ LA MAGIA DE LA TAREA 1 ---
        // Verificamos si es admin por el rol antiguo O por el nuevo campo "rol" que agregaste en la base de datos
        const esAdmin = 
            userData.role === 'Equipo Directivo' || 
            userData.role === 'Administración' || 
            userData.rol === 'admin'; // <--- ESTO LEE TU CAMBIO EN FIREBASE

        onLogin({ 
            ...userData, 
            id: userDoc.id, 
            isAdmin: esAdmin 
        });
      } else {
        setError('Usuario o contraseña incorrectos.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión. Intente nuevamente.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500">
        <div className="text-center mb-8">
          <div className="bg-gradient-to-tr from-orange-400 to-pink-500 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg ring-4 ring-white">
           <div className="text-center mb-8">
          {/* LOGO DEL COLEGIO */}
          <div className="flex justify-center mb-4">
             <img 
               src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" 
               alt="Logo Juntos a la Par" 
               className="h-24 w-auto object-contain drop-shadow-md"
             />
          </div>
          <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">
            PORTAL INSTITUCIONAL<br/>
            <span className="text-orange-500">JUNTOS A LA PAR</span>
          </h1>
          <p className="text-gray-500 mt-2 text-sm font-medium">Sistema de Gestión Integral</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Usuario</label>
            <div className="relative group">
              <User className="absolute left-3 top-3.5 text-violet-300 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input
                type="text"
                required
                className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                placeholder="Nombre de usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Contraseña</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3.5 text-violet-300 group-focus-within:text-orange-500 transition-colors" size={18} />
              <input
                type="password"
                required
                className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl focus:ring-2 focus:ring-orange-400 focus:bg-white outline-none transition-all"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-pulse">
               <AlertCircle size={20} /> {error}
            </div>
          )}

          <button
            type="submit"
            disabled={checking}
            className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition duration-300 shadow-xl disabled:opacity-70 flex justify-center items-center transform hover:-translate-y-1"
          >
            {checking ? <RefreshCw className="animate-spin" /> : 'Ingresar al Portal'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- App Principal ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [notifications, setNotifications] = useState([]);
  
  // Modificamos canEdit para aceptar también si user.rol es 'admin' o si user.isAdmin es true
  const canEdit = user.isAdmin === true || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Administración';

  const isAssignedToUser = (item) => {
    if (!item.targetType || item.targetType === 'all') return true;
    if (item.targetType === 'roles' && Array.isArray(item.targetRoles)) {
      return item.targetRoles.includes(user.role);
    }
    if (item.targetType === 'users' && Array.isArray(item.targetUsers)) {
      return item.targetUsers.includes(user.fullName);
    }
    return false;
  };

  useEffect(() => {
    const qTasks = query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc'));
    const unsubTasks = onSnapshot(qTasks, (snapshot) => {
      const allTasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTasks(canEdit ? allTasks : allTasks.filter(isAssignedToUser));
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      const allEvents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEvents(allEvents);
    });

    return () => { unsubTasks(); unsubEvents(); };
  }, [user, canEdit]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];

    let newNotifs = [];

    // Permisos de notificación
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const triggerSystemNotification = (title, body) => {
      if ("Notification" in window && Notification.permission === "granted") {
        if(document.hidden) {
            new Notification(title, { body });
        }
      }
    };

    tasks.forEach(task => {
      if (!canEdit && !isAssignedToUser(task)) return;

      if (task.notificationDate && task.notificationDate <= todayStr && task.notificationMessage) {
        newNotifs.push({
          id: `task-auto-${task.id}`,
          type: 'scheduled',
          title: "Aviso Programado",
          message: task.notificationMessage,
          date: task.notificationDate,
          context: 'Tarea: ' + task.title
        });
      }
      if (task.lastReminder) {
        const reminderDate = new Date(task.lastReminder.seconds * 1000);
        const isToday = reminderDate.toISOString().split('T')[0] === todayStr;
        
        newNotifs.push({
          id: `task-remind-${task.id}-${task.lastReminder.seconds}`,
          type: 'reminder',
          title: "¡Recordatorio!",
          message: `Se recuerda completar: "${task.title}"`,
          date: reminderDate.toISOString().split('T')[0],
          context: 'Urgente'
        });

        if (isToday) {
            triggerSystemNotification("Recordatorio Escolar", `Pendiente: ${task.title}`);
        }
      }
    });

    events.forEach(event => {
       if (event.notificationDate && event.notificationDate <= todayStr && event.notificationMessage) {
         newNotifs.push({
          id: `event-auto-${event.id}`,
          type: 'event',
          title: "Evento Próximo",
          message: event.notificationMessage,
          date: event.notificationDate,
          context: 'Agenda: ' + event.title
        });
       }
    });

    newNotifs.sort((a, b) => new Date(b.date) - new Date(a.date));
    setNotifications(newNotifs);

  }, [tasks, events, canEdit, user]);

  const renderContent = () => {
    switch (activeTab) {
      case 'calendar': return <CalendarView events={events} canEdit={canEdit} user={user} />;
      case 'tasks': return <TasksView tasks={tasks} user={user} canEdit={canEdit} />;
      case 'notifications': return <NotificationsView notifications={notifications} />;
      case 'users': return <UsersView user={user} />;
      case 'profile': return <ProfileView user={user} tasks={tasks} onLogout={onLogout} canEdit={canEdit} />;
      default: return <TasksView tasks={tasks} user={user} canEdit={canEdit} />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans text-slate-800">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-20 sticky top-0">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-md transform rotate-3">
             <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight">Escuela Digital</h1>
            <p className="text-[10px] text-orange-200 font-medium tracking-wide uppercase">
              {canEdit ? 'Administración' : user.role}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-violet-900/50 py-1.5 px-4 rounded-full border border-violet-600">
          <div className="flex flex-col items-end">
             <span className="text-xs font-bold truncate max-w-[100px]">{user.firstName}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs border-2 border-orange-400">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
        {renderContent()}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 pb-safe shadow-[0_-10px_20px_rgba(109,40,217,0.05)] z-30">
        <div className="flex justify-around items-center h-20 max-w-4xl mx-auto px-2">
          <NavButton 
            active={activeTab === 'tasks'} 
            onClick={() => setActiveTab('tasks')} 
            icon={<CheckSquare size={24} />} 
            label="Tareas" 
            badge={tasks.filter(t => !t.completed).length}
          />
          <NavButton 
            active={activeTab === 'calendar'} 
            onClick={() => setActiveTab('calendar')} 
            icon={<CalendarIcon size={24} />} 
            label="Agenda" 
          />
          <NavButton 
            active={activeTab === 'notifications'} 
            onClick={() => setActiveTab('notifications')} 
            icon={<Bell size={24} />} 
            label="Avisos"
            badge={notifications.length}
          />
          {canEdit && (
            <NavButton 
              active={activeTab === 'users'} 
              onClick={() => setActiveTab('users')} 
              icon={<Users size={24} />} 
              label="Admin" 
            />
          )}
          <NavButton 
            active={activeTab === 'profile'} 
            onClick={() => setActiveTab('profile')} 
            icon={<User size={24} />} 
            label="Perfil"
          />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }) {
  return (
    <button 
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${
        active 
          ? 'text-orange-500 transform -translate-y-1' 
          : 'text-gray-400 hover:text-violet-600'
      }`}
    >
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
        {badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1">
            {badge > 9 ? '+9' : badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

// --- VISTAS ---
function NotificationsView({ notifications }) {
  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-violet-900">Avisos</h2>
          <p className="text-xs text-gray-500 font-medium">Alertas y novedades</p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
           <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
            <Bell size={48} className="mx-auto mb-4 text-violet-100" />
            <p className="text-gray-500">No tienes notificaciones nuevas.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div key={notif.id} className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white relative ${
              notif.type === 'reminder' ? 'border-red-500 bg-red-50/50' : 
              notif.type === 'scheduled' ? 'border-orange-500' : 'border-violet-500'
            }`}>
               <div className="flex justify-between items-start mb-1">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                     notif.type === 'reminder' ? 'bg-red-100 text-red-600' : 'bg-violet-100 text-violet-600'
                  }`}>
                    {notif.type === 'reminder' ? 'Urgente' : 'Aviso'}
                  </span>
                  <span className="text-xs text-gray-400">{formatDate(notif.date)}</span>
               </div>
               <h3 className="font-bold text-gray-800">{notif.title}</h3>
               <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
               {notif.context && (
                 <div className="mt-2 text-xs font-medium text-gray-400 border-t border-gray-100 pt-1">
                   Ref: {notif.context}
                 </div>
               )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [targetType, setTargetType] = useState('all'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [hasNotification, setHasNotification] = useState(false);
  const [notifDate, setNotifDate] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [usersList, setUsersList] = useState([]);

  useEffect(() => {
    if (canEdit && showModal) {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const unsub = onSnapshot(q, snap => {
        setUsersList(snap.docs.map(d => d.data()));
      });
      return () => unsub();
    }
  }, [canEdit, showModal]);

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter(i => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const addTask = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const dueDate = e.target.dueDate.value;
    
    let taskData = {
      title, dueDate, targetType, completed: false, createdBy: user.id, createdAt: serverTimestamp()
    };

    if (targetType === 'roles') taskData.targetRoles = selectedRoles;
    if (targetType === 'users') taskData.targetUsers = selectedUsers;

    if (hasNotification && notifDate && notifMsg) {
      taskData.notificationDate = notifDate;
      taskData.notificationMessage = notifMsg;
    }

    if (targetType === 'all') taskData.assignedTo = "Todos";
    else if (targetType === 'roles') taskData.assignedTo = selectedRoles.join(", ");
    else if (targetType === 'users') taskData.assignedTo = selectedUsers.length + " personas";

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), taskData);
    
    setShowModal(false);
    setTargetType('all');
    setSelectedRoles([]);
    setSelectedUsers([]);
    setHasNotification(false);
    setNotifMsg('');
    setNotifDate('');
  };

  const toggleTask = async (task) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    await updateDoc(ref, { completed: !task.completed });
  };

  const deleteTask = async (id) => {
    if(confirm('¿Eliminar tarea?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id));
    }
  };

  const sendReminder = async (task) => {
    if (!confirm(`¿Enviar notificación de recordatorio?`)) return;
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id);
    await updateDoc(ref, { lastReminder: serverTimestamp() });
    alert("Recordatorio enviado.");
  };

  const pendingCount = tasks.filter(t => !t.completed).length;

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-violet-700 to-violet-900 p-6 rounded-3xl shadow-lg text-white mb-8 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold">Tareas</h2>
            <p className="text-violet-200 mt-1">Tienes <span className="font-bold text-white text-lg">{pendingCount}</span> pendientes.</p>
          </div>
          {canEdit && (
            <button 
              onClick={() => setShowModal(true)}
              className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition active:scale-95"
            >
              <Plus size={24} />
            </button>
          )}
        </div>
        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
      </div>

      <div className="space-y-3">
        {tasks.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200">
            <CheckCircle size={48} className="mx-auto mb-2 text-violet-100" />
            <p>¡Todo al día! No hay tareas.</p>
          </div>
        ) : (
          tasks.map(task => {
            const daysLeft = calculateDaysLeft(task.dueDate);
            const isLate = daysLeft < 0 && !task.completed;
            
            return (
              <div key={task.id} className={`p-4 rounded-2xl border-l-[6px] shadow-sm transition-all relative group bg-white ${
                task.completed ? 'border-green-400 opacity-60' : 
                isLate ? 'border-red-500' : 'border-violet-500'
              }`}>
                <div className="flex items-start gap-4">
                  <div className="pt-1">
                    <button 
                      onClick={() => toggleTask(task)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-300'}`}
                    >
                      {task.completed && <CheckCircle size={14} className="text-white" />}
                    </button>
                  </div>
                  <div className="flex-1 pr-8">
                    <h3 className={`font-bold text-gray-800 text-base ${task.completed ? 'line-through text-gray-400' : ''}`}>
                      {task.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
                       {canEdit && (
                        <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                           {task.targetType === 'roles' ? <Users size={12} /> : <User size={12} />}
                           <span className="truncate max-w-[150px]">{task.assignedTo || "Todos"}</span>
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-lg font-medium border ${isLate ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                        {formatDate(task.dueDate)}
                      </span>
                    </div>
                  </div>
                  {canEdit && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button onClick={() => sendReminder(task)} className="text-gray-300 hover:text-orange-500 p-1.5 hover:bg-orange-50 rounded-full transition"><Bell size={16} /></button>
                      <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition"><Trash2 size={16} /></button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && canEdit && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6 text-violet-900">Nueva Tarea</h3>
            <form onSubmit={addTask} className="space-y-4">
              <input name="title" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Título" />
              <input type="date" name="dueDate" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
              
              <div className="bg-gray-50 p-1 rounded-xl flex">
                  <button type="button" onClick={() => setTargetType('all')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'all' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Todos</button>
                  <button type="button" onClick={() => setTargetType('roles')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button>
                  <button type="button" onClick={() => setTargetType('users')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'users' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Personas</button>
              </div>

              {targetType === 'roles' && (
                <div className="p-3 bg-violet-50 rounded-xl max-h-40 overflow-y-auto">
                  <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Selecciona Roles:</p>
                  <div className="space-y-2">
                    {ROLES.map(role => (
                      <label key={role} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedRoles.includes(role) ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'}`}>
                          {selectedRoles.includes(role) && <Check size={12} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedRoles.includes(role)} onChange={() => toggleSelection(role, selectedRoles, setSelectedRoles)} />
                        <span className="text-sm text-gray-700">{role}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {targetType === 'users' && (
                <div className="p-3 bg-violet-50 rounded-xl max-h-40 overflow-y-auto">
                   <p className="text-xs text-gray-500 mb-2 font-bold uppercase">Selecciona Personas:</p>
                   <div className="space-y-2">
                    {usersList.map(u => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedUsers.includes(u.fullName) ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'}`}>
                          {selectedUsers.includes(u.fullName) && <Check size={12} className="text-white" />}
                        </div>
                        <input type="checkbox" className="hidden" checked={selectedUsers.includes(u.fullName)} onChange={() => toggleSelection(u.fullName, selectedUsers, setSelectedUsers)} />
                        <span className="text-sm text-gray-700">{u.fullName} <span className="text-xs text-gray-400">({u.role})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2">
                  <input type="checkbox" checked={hasNotification} onChange={(e) => setHasNotification(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                  <Bell size={16} /> Programar Aviso
                </label>
                
                {hasNotification && (
                  <div className="space-y-3 bg-orange-50 p-3 rounded-xl animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-orange-600">Fecha del Aviso</label>
                      <input type="date" value={notifDate} onChange={(e) => setNotifDate(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-orange-600">Mensaje</label>
                      <input type="text" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} placeholder="Ej. Recuerden traer..." className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function UsersView({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsub = onSnapshot(q, snap => {
      setUsersList(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });
    return () => unsub();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    const firstName = e.target.firstName.value;
    const lastName = e.target.lastName.value;
    const username = e.target.username.value;
    const password = e.target.password.value;
    const role = e.target.role.value;
    const fullName = `${firstName} ${lastName}`;

    if (usersList.some(u => u.username === username)) {
      alert("El nombre de usuario ya existe.");
      return;
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
      firstName, lastName, fullName, username, password, role,
      createdAt: serverTimestamp()
    });
    setShowModal(false);
  };

  const deleteUser = async (id) => {
    if (confirm("¿Eliminar usuario?")) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id));
    }
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-violet-900">Personal</h2>
          <p className="text-sm text-gray-500">Gestión de equipo</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg shadow-orange-200 hover:bg-orange-600 transition active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="grid gap-3">
        {usersList.map(u => (
          <div key={u.id} className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex justify-between items-center group hover:shadow-md transition">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-bold text-lg">
                {u.firstName?.[0]}{u.lastName?.[0]}
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{u.fullName}</h4>
                <div className="flex flex-col text-xs text-gray-500">
                  <span className="text-orange-600 font-bold uppercase tracking-wider text-[10px]">{u.role}</span>
                  <span className="flex items-center gap-1 mt-0.5"><User size={10}/> {u.username}</span>
                </div>
              </div>
            </div>
            <button onClick={() => deleteUser(u.id)} className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-full hover:bg-red-50 transition">
              <Trash2 size={18} />
            </button>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-violet-900">Alta de Usuario</h3>
            <form onSubmit={createUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <input name="firstName" required className="w-full p-3 bg-violet-50 rounded-xl border-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre" />
                <input name="lastName" required className="w-full p-3 bg-violet-50 rounded-xl border-none focus:ring-2 focus:ring-orange-400" placeholder="Apellido" />
              </div>
              <select name="role" className="w-full p-3 bg-violet-50 rounded-xl border-none focus:ring-2 focus:ring-orange-400 text-gray-700">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <div className="p-4 bg-orange-50 rounded-xl space-y-3">
                <p className="text-xs text-orange-600 font-bold uppercase">Credenciales</p>
                <input name="username" required className="w-full p-2 bg-white rounded-lg border border-orange-200" placeholder="Usuario" />
                <input name="password" required className="w-full p-2 bg-white rounded-lg border border-orange-200" placeholder="Contraseña" />
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CalendarView({ events, canEdit, user }) {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());

  const [hasNotification, setHasNotification] = useState(false);
  const [notifDate, setNotifDate] = useState('');
  const [notifMsg, setNotifMsg] = useState('');

  const addEvent = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const date = e.target.date.value;
    const type = e.target.type.value;
    
    let eventData = {
      title, date, type, createdBy: user.id, createdAt: serverTimestamp()
    };

    if (hasNotification && notifDate && notifMsg) {
      eventData.notificationDate = notifDate;
      eventData.notificationMessage = notifMsg;
    }

    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), eventData);
    setShowModal(false);
    setHasNotification(false);
  };

  const deleteEvent = async (id) => {
    if(confirm('¿Eliminar evento?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
    }
  };

  const getTypeStyle = (type) => {
    const styles = {
      'SALIDA EDUCATIVA': 'bg-green-100 text-green-700 border-green-200',
      'GENERAL': 'bg-gray-100 text-gray-700 border-gray-200',
      'ADMINISTRATIVO': 'bg-blue-100 text-blue-700 border-blue-200',
      'INFORMES': 'bg-amber-100 text-amber-700 border-amber-200',
      'EVENTOS': 'bg-violet-100 text-violet-700 border-violet-200',
      'ACTOS': 'bg-red-100 text-red-700 border-red-200',
      'EFEMÉRIDES': 'bg-cyan-100 text-cyan-700 border-cyan-200',
      'CUMPLEAÑOS': 'bg-pink-100 text-pink-700 border-pink-200',
    };
    return styles[type] || styles['GENERAL'];
  };
  
  const getTypeDotColor = (type) => {
    const colors = {
      'SALIDA EDUCATIVA': 'bg-green-500',
      'GENERAL': 'bg-gray-500',
      'ADMINISTRATIVO': 'bg-blue-500',
      'INFORMES': 'bg-amber-500',
      'EVENTOS': 'bg-violet-500',
      'ACTOS': 'bg-red-500',
      'EFEMÉRIDES': 'bg-cyan-500',
      'CUMPLEAÑOS': 'bg-pink-500',
    };
    return colors[type] || 'bg-gray-400';
  }

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-20 bg-gray-50/50 border border-gray-100"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = events.filter(e => e.date === dateStr);
      
      days.push(
        <div key={d} className="h-20 border border-gray-100 p-1 relative bg-white hover:bg-violet-50 transition">
          <span className={`text-xs font-bold ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span>
          <div className="flex flex-wrap gap-1 mt-1 content-start">
            {dayEvents.map((ev, idx) => (
              <div key={idx} className={`w-2 h-2 rounded-full ${getTypeDotColor(ev.type)}`} title={ev.title}></div>
            ))}
          </div>
        </div>
      );
    }
    return days;
  };

  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset));
    setCurrentDate(new Date(newDate));
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-violet-900">Agenda</h2>
          <p className="text-xs text-gray-500 font-medium">Eventos institucionales</p>
        </div>
        
        <div className="flex gap-2">
           <div className="bg-white p-1 rounded-xl border border-gray-200 flex">
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-violet-100 text-violet-700' : 'text-gray-400'}`}><List size={20} /></button>
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-100 text-violet-700' : 'text-gray-400'}`}><Grid size={20} /></button>
           </div>
           
           {canEdit && (
            <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:bg-orange-600 transition"><Plus size={20} /></button>
           )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden">
           <div className="p-4 flex justify-between items-center bg-violet-50 border-b border-violet-100">
              <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition"><ChevronLeft size={20} className="text-violet-700"/></button>
              <span className="font-bold text-violet-900 capitalize">
                {currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition"><ChevronRight size={20} className="text-violet-700"/></button>
           </div>
           <div className="grid grid-cols-7 text-center py-2 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
             <div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
           </div>
           <div className="grid grid-cols-7 bg-gray-100 gap-px">
             {renderCalendarGrid()}
           </div>
           <div className="p-3 text-xs text-gray-400 text-center bg-gray-50">
             * Toca un día para ver detalles
           </div>
        </div>
      ) : (
        <div className="space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200">
              <CalendarIcon size={48} className="mx-auto mb-4 text-violet-100" />
              <p className="text-gray-500">No hay eventos próximos.</p>
            </div>
          ) : (
            events.map(event => (
              <div key={event.id} className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex items-center gap-4 relative group hover:shadow-md transition">
                 <div className="flex flex-col items-center justify-center w-14 h-14 bg-violet-50 rounded-2xl border border-violet-100 text-violet-600">
                    <span className="text-[10px] uppercase font-bold text-violet-400">
                      {event.date ? new Date(event.date).toLocaleDateString('es-ES', { month: 'short' }) : '-'}
                    </span>
                    <span className="text-xl font-bold leading-none">
                      {event.date ? new Date(event.date).getDate() + 1 : '-'}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-sm">{event.title}</h3>
                    <div className="mt-1 flex items-center gap-2">
                       <span className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wide border ${getTypeStyle(event.type)}`}>
                          {event.type}
                        </span>
                        {event.notificationDate && (
                          <span className="text-gray-400 flex items-center gap-1 text-[9px]">
                            <Bell size={10} /> {formatDate(event.notificationDate)}
                          </span>
                        )}
                    </div>
                  </div>
                  {canEdit && (
                    <button onClick={() => deleteEvent(event.id)} className="text-gray-300 hover:text-red-500 p-2 bg-gray-50 rounded-full hover:bg-red-50 transition">
                      <Trash2 size={16} />
                    </button>
                  )}
              </div>
            ))
          )}
        </div>
      )}

      {showModal && canEdit && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold mb-6 text-violet-900">Nuevo Evento</h3>
            <form onSubmit={addEvent} className="space-y-4">
              <input name="title" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Título" />
              <input type="date" name="date" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
              <select name="type" className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-gray-700">
                {EVENT_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>

               <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2">
                  <input type="checkbox" checked={hasNotification} onChange={(e) => setHasNotification(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" />
                  <Bell size={16} /> Programar Aviso
                </label>
                
                {hasNotification && (
                  <div className="space-y-3 bg-orange-50 p-3 rounded-xl animate-in fade-in">
                    <div>
                      <label className="text-xs font-bold text-orange-600">Fecha del Aviso</label>
                      <input type="date" value={notifDate} onChange={(e) => setNotifDate(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-orange-600">Mensaje</label>
                      <input type="text" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} placeholder="Ej. Mañana es el acto..." className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Vista de Perfil (MEJORADA: TAREA 2 - EDICIÓN) ---
function ProfileView({ user, tasks, onLogout, canEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    photoUrl: user.photoUrl || '' // Campo nuevo para foto
  });

  // Guardar cambios en Firebase
  const handleSave = async () => {
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      const newFullName = `${formData.firstName} ${formData.lastName}`;
      
      await updateDoc(userRef, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        fullName: newFullName,
        photoUrl: formData.photoUrl
      });
      
      alert("Perfil actualizado. Por favor vuelve a iniciar sesión para ver los cambios.");
      onLogout(); // Forzamos logout para recargar los datos limpios
    } catch (e) {
      console.error(e);
      alert("Error al guardar");
    }
  };

  const exportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Titulo,Vencimiento,Estado,Asignado A\n";
    tasks.forEach(t => {
      const row = [`"${t.title}"`, t.dueDate, t.completed ? "Completado" : "Pendiente", t.assignedTo].join(",");
      csvContent += row + "\r\n";
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_${user.lastName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 p-4">
      {/* Tarjeta de Perfil */}
      <div className="bg-white rounded-3xl shadow-sm border border-violet-50 overflow-hidden mb-6 relative">
        <div className="bg-gradient-to-r from-violet-600 to-orange-500 h-28 relative"></div>
        <div className="px-6 pb-6 pt-12 relative">
           <div className="absolute -top-10 left-6 w-24 h-24 bg-white p-1 rounded-2xl shadow-lg">
              {/* Lógica para mostrar FOTO o INICIALES */}
              {user.photoUrl ? (
                <img src={user.photoUrl} alt="Perfil" className="w-full h-full object-cover rounded-xl" />
              ) : (
                <div className="w-full h-full bg-violet-50 rounded-xl flex items-center justify-center text-violet-600 font-bold text-3xl border border-violet-100">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </div>
              )}
           </div>
           
           <div className="flex justify-between items-start">
             <div>
               <h2 className="text-2xl font-bold text-gray-800 mt-2">{user.fullName}</h2>
               <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">{user.role}</p>
               {user.rol === 'admin' && <span className="bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full ml-1">ADMIN</span>}
             </div>
             <button 
                onClick={() => setIsEditing(!isEditing)}
                className="text-violet-600 hover:bg-violet-50 p-2 rounded-xl transition text-sm font-bold flex items-center gap-1"
             >
               {isEditing ? 'Cancelar' : 'Editar'}
             </button>
           </div>
        </div>
        
        {/* Formulario de Edición (Solo aparece si das clic a Editar) */}
        {isEditing && (
          <div className="px-6 pb-6 animate-in slide-in-from-top-4">
            <div className="bg-gray-50 p-4 rounded-xl space-y-3 border border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="text-xs font-bold text-gray-500 ml-1">Nombre</label>
                   <input 
                      value={formData.firstName}
                      onChange={e => setFormData({...formData, firstName: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-200" 
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-gray-500 ml-1">Apellido</label>
                   <input 
                      value={formData.lastName}
                      onChange={e => setFormData({...formData, lastName: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-200" 
                   />
                </div>
              </div>
              <div>
                 <label className="text-xs font-bold text-gray-500 ml-1">URL de Foto (Pegar link de imagen)</label>
                 <input 
                    value={formData.photoUrl}
                    onChange={e => setFormData({...formData, photoUrl: e.target.value})}
                    placeholder="https://..."
                    className="w-full p-2 rounded-lg border border-gray-200" 
                 />
                 <p className="text-[10px] text-gray-400 mt-1">Truco: Puedes usar un link de Google Fotos o LinkedIn aquí.</p>
              </div>
              <button onClick={handleSave} className="w-full py-2 bg-violet-600 text-white font-bold rounded-lg shadow hover:bg-violet-700">
                Guardar Cambios
              </button>
            </div>
          </div>
        )}
      </div>

      <h3 className="text-lg font-bold text-violet-900 mb-4 px-2">Acciones</h3>
      
      <div className="grid gap-3">
        <button 
          onClick={exportData}
          className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]"
        >
          <div className="bg-green-100 text-green-700 p-3 rounded-xl">
            <Download size={24} />
          </div>
          <div className="text-left">
            <h4 className="font-bold text-gray-800">Exportar Reporte</h4>
            <p className="text-xs text-gray-500">Descargar mis tareas en Excel/CSV</p>
          </div>
        </button>

        <button 
          onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} 
          className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98] mt-4"
        >
           <div className="bg-white text-red-500 p-3 rounded-xl">
             <LogOut size={24} />
           </div>
           <div className="text-left">
             <h4 className="font-bold text-red-600">Cerrar Sesión</h4>
             <p className="text-xs text-red-400">Salir de la cuenta segura</p>
           </div>
        </button>
      </div>
    </div>
  );
}


