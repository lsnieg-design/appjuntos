import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  CheckSquare, 
  User, 
  FileText, 
  CheckCircle, 
  Download, 
  RefreshCw, 
  Plus, 
  Trash2, 
  Users, 
  AlertCircle, 
  LogOut, 
  Briefcase, 
  Lock, 
  List, 
  Grid, 
  ChevronLeft, 
  ChevronRight, 
  Bell, 
  Check,
  HelpCircle,
  Mail,
  Send,
  Key,
  Filter,
  LayoutDashboard,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle,
  Clock,
  Shield,
  Crown,
  Activity,
  Share,
  PlusSquare,
  Smartphone,
  GraduationCap, // <--- NUEVO
  Search,        // <--- NUEVO
  X,             // <--- NUEVO
  UploadCloud,   // <--- NUEVO
  ChevronRight   // <--- NUEVO
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
  updateDoc, 
  deleteDoc, 
  where, 
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
// --- UTILIDAD PARA NOTIFICACIONES DEL SISTEMA ---
const sendSystemNotification = (title, body) => {
  // 1. Verificar si el navegador soporta notificaciones
  if (!("Notification" in window)) return;

  // 2. Si ya dio permiso, lanzar la notificación
  if (Notification.permission === "granted") {
    // En móviles, a veces se requiere usar el Service Worker para que sea persistente,
    // pero intentamos primero la forma directa que funciona en la mayoría de Androids modernos con PWA instalada.
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        icon: '/icon-192.png', // Asegúrate de que esta ruta exista en public
        vibrate: [200, 100, 200],
        badge: '/icon-192.png'
      });
    });
  } 
  // 3. Si no ha dicho nada, no hacemos nada (se debe pedir permiso con un botón primero)
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    alert("Tu dispositivo no soporta notificaciones.");
    return;
  }
  
  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    sendSystemNotification("¡Permiso concedido!", "Ahora recibirás avisos aquí.");
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
const ROLES = ['Docente', 'Profes Especiales', 'Equipo Técnico', 'Equipo Directivo', 'Administración', 'Auxiliar/Preceptor'];
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

// --- Componente Principal ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

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

  if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div></div>;
  if (configError) return <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center"><AlertCircle className="text-red-500 w-16 h-16 mb-4" /><h1 className="text-xl font-bold text-red-700">Error de Configuración</h1></div>;
  if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;

  return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

// --- Componente Modal de Instalación (MEJORADO) ---
function InstallTutorial({ onClose, isIos, onInstall }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 transition-opacity duration-300">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm text-center transform scale-100 transition-transform duration-300 animate-in zoom-in-95">
        
        {/* Icono animado */}
        <div className="mx-auto bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mb-5 animate-bounce">
          <Smartphone className="text-violet-600" size={40} />
        </div>

        <h3 className="text-2xl font-extrabold text-gray-800 mb-2">¡Instala la App! 📲</h3>
        <p className="text-gray-600 mb-6 text-sm">
          Para mejor experiencia y acceso rápido, descarga la aplicación ahora.
        </p>

        <div className="flex flex-col gap-3">
          
          {/* Lógica: Si es Android/PC muestra botón, si es iOS muestra instrucciones */}
          {!isIos ? (
            <button 
              onClick={onInstall}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-2"
            >
              <Download size={20} /> INSTALAR AHORA
            </button>
          ) : (
            <div className="text-left bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm text-gray-700 shadow-inner">
              <p className="mb-3 font-bold text-violet-900 text-center">Pasos para iPhone:</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">1</div>
                    <p>Toca el botón <strong>Compartir</strong> <span className="inline-block align-middle"><Share size={14}/></span></p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center font-bold shrink-0">2</div>
                    <p>Selecciona <strong>"Agregar a Inicio"</strong> <span className="inline-block align-middle"><PlusSquare size={14}/></span></p>
                </div>
              </div>
            </div>
          )}

          {/* Botón Cerrar */}
          <button 
            onClick={onClose}
            className="text-gray-400 text-sm font-medium hover:text-gray-600 underline mt-2"
          >
            Quizás más tarde
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Pantalla Login (Con lógica de instalación integrada) ---
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverUser, setRecoverUser] = useState('');
  const [recoverStatus, setRecoverStatus] = useState('idle');
  
  // --- LÓGICA DE INSTALACIÓN ---
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [esIos, setEsIos] = useState(false);
  
  // Detectar modo standalone (ya instalada)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    // 1. Detectar si es iPhone
    const iosCheck = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsIos(iosCheck);

    // 2. Escuchar evento de instalación (Android/PC)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostrar el modal automáticamente si no está instalada
      if (!isStandalone) setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. Si es iPhone y no está instalada, mostrar modal tras 3 segs
    if (iosCheck && !isStandalone) {
       const timer = setTimeout(() => setShowInstall(true), 3000);
       return () => clearTimeout(timer);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isStandalone]);

  // Función para disparar el prompt nativo de Android
  const handleInstalarClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstall(false);
      }
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
      
      {/* RENDERIZADO DEL MODAL DE INSTALACIÓN */}
      {!isStandalone && showInstall && (
         <InstallTutorial 
            onClose={() => setShowInstall(false)} 
            isIos={esIos} 
            onInstall={handleInstalarClick} 
         />
      )}

      {/* Botón flotante manual (por si cerraron el modal) */}
      {!isStandalone && !showInstall && (
          <div className="absolute top-4 w-full px-6 flex justify-center animate-bounce z-10">
              <button 
                onClick={() => setShowInstall(true)}
                className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg hover:bg-white/20 transition"
              >
                  <Download size={16} /> Instalar App
              </button>
          </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500 relative z-0">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
             <img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-24 w-auto object-contain drop-shadow-md" />
          </div>
          <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">
            PORTAL INSTITUCIONAL<br/><span className="text-orange-500">JUNTOS A LA PAR</span>
          </h1>
        </div>

        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Usuario</label>
              <div className="relative group">
                <User className="absolute left-3 top-3.5 text-violet-300" size={18} />
                <input type="text" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 text-violet-300" size={18} />
                <input type="password" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
            </div>
            <div className="flex justify-end">
                <button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 transition">¿Olvidaste tu contraseña?</button>
            </div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100 animate-pulse"><AlertCircle size={20} /> {error}</div>}
            <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition duration-300 shadow-xl disabled:opacity-70 flex justify-center items-center">
              {checking ? <RefreshCw className="animate-spin" /> : 'Ingresar al Portal'}
            </button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-right">
             <div className="bg-violet-50 p-6 rounded-2xl text-center mb-6 border border-violet-100">
                <Key className="mx-auto text-violet-500 mb-2" size={40} />
                <h3 className="font-bold text-violet-900 text-lg mb-2">Solicitar Blanqueo</h3>
                <p className="text-sm text-gray-600 mb-4">Ingresa tu nombre de usuario. La administración recibirá una notificación para restablecer tu clave.</p>
                {recoverStatus === 'sent' ? (
                    <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
                ) : (
                    <form onSubmit={handleRequestReset} className="mb-4">
                        <input className="w-full p-3 bg-white border border-violet-200 rounded-xl mb-3 text-center focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Tu Usuario (Ej: jlopez)" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
                        <button type="submit" disabled={recoverStatus === 'sending'} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2">
                            {recoverStatus === 'sending' ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> Enviar Solicitud</>}
                        </button>
                        {recoverStatus === 'error' && <p className="text-xs text-red-500 mt-2 font-bold">Usuario no encontrado o error de red.</p>}
                    </form>
                )}
             </div>
             <button onClick={() => {setShowRecover(false); setRecoverStatus('idle'); setRecoverUser('');}} className="w-full text-gray-500 font-bold py-3 hover:text-gray-700 transition">Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  );
}

// --- App Principal ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  
  // --- JERARQUÍA ---
  const isSuperAdmin = user.rol === 'super-admin';
  const canManageContent = user.rol === 'admin' || isSuperAdmin;
  const canManageUsers = isSuperAdmin;

  const isAssignedToUser = (item) => {
    if (canManageContent) return true;
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
      setTasks(allTasks.filter(isAssignedToUser));
    });

    const qEvents = query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc'));
    const unsubEvents = onSnapshot(qEvents, (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    let unsubRequests = () => {};
    if (canManageUsers) {
        const qReq = query(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), orderBy('createdAt', 'desc'));
        unsubRequests = onSnapshot(qReq, (snap) => {
            setAdminRequests(snap.docs.map(d => ({ id: d.id, ...d.data(), isRequest: true })));
        });
    }

    return () => { unsubTasks(); unsubEvents(); unsubRequests(); unsubResources(); };
  }, [user, canManageContent, canManageUsers]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    let newNotifs = [];

    if (canManageUsers) {
        adminRequests.forEach(req => {
            newNotifs.push({ id: req.id, type: 'admin_alert', title: "Solicitud de Contraseña", message: `El usuario "${req.username}" solicita blanqueo.`, date: req.createdAt ? new Date(req.createdAt.seconds * 1000).toISOString() : todayStr, context: 'Acción Requerida', isRequest: true });
        });
    }

    tasks.forEach(task => {
      if (task.status === 'completed') return;
      if (task.notificationDate && task.notificationDate <= todayStr && task.notificationMessage) {
        newNotifs.push({ id: `task-auto-${task.id}`, type: 'scheduled', title: "Aviso Programado", message: task.notificationMessage, date: task.notificationDate, context: 'Tarea: ' + task.title });
      }
      if (task.lastReminder) {
        const reminderDate = new Date(task.lastReminder.seconds * 1000);
        newNotifs.push({ id: `task-remind-${task.id}-${task.lastReminder.seconds}`, type: 'reminder', title: "¡Recordatorio!", message: `Se recuerda completar: "${task.title}"`, date: reminderDate.toISOString().split('T')[0], context: 'Urgente' });
      }
    });

    events.forEach(event => {
       if (event.notificationDate && event.notificationDate <= todayStr && event.notificationMessage) {
         newNotifs.push({ id: `event-auto-${event.id}`, type: 'event', title: "Evento Próximo", message: event.notificationMessage, date: event.notificationDate, context: 'Agenda: ' + event.title });
       }
    });

    newNotifs.sort((a, b) => new Date(b.date) - new Date(a.date));
    setNotifications(newNotifs);
  }, [tasks, events, canManageUsers, user, adminRequests]);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardView user={user} tasks={tasks} events={events} />;
      case 'calendar': return <CalendarView events={events} canEdit={canManageContent} user={user} />;
      case 'tasks': return <TasksView tasks={tasks} user={user} canEdit={canManageContent} />;
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
          <div>
            <h1 className="font-bold text-base leading-tight text-white">Juntos a la par digital</h1>
            <p className="text-[10px] text-orange-200 font-medium tracking-wide uppercase flex items-center gap-1">
                {isSuperAdmin && <Crown size={10} className="text-yellow-400" />}
                {isSuperAdmin ? 'Super Admin' : canManageContent ? 'Administrador' : user.role}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3 bg-violet-900/50 py-1.5 px-4 rounded-full border border-violet-600">
          <div className="flex flex-col items-end">
              <span className="text-xs font-bold truncate max-w-[100px]">{user.firstName}</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xs border-2 border-orange-400 overflow-hidden">
            {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : `${user.firstName?.[0]}${user.lastName?.[0]}`}
          </div>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-6 max-w-4xl mx-auto w-full">
        {renderContent()}
      </main>
      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 pb-safe shadow-[0_-10px_20px_rgba(109,40,217,0.05)] z-30">
        <div className="flex justify-around items-center h-20 max-w-4xl mx-auto px-2">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={24} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={24} />} label="Tareas" badge={tasks.filter(t => t.status !== 'completed').length} />
          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={24} />} label="Agenda" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={24} />} label="Avisos" badge={notifications.length} />
          {canManageUsers && <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={24} />} label="Admin" />}
          <NavButton active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} icon={<User size={24} />} label="Perfil" />
        </div>
      </nav>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, badge }) {
  return (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'text-orange-500 transform -translate-y-1' : 'text-gray-400 hover:text-violet-600'}`}>
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
        {badge > 0 && <span className="absolute -top-1 -right-1 bg-violet-600 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1">{badge > 9 ? '+9' : badge}</span>}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

// --- VISTA DASHBOARD ---
function DashboardView({ user, tasks, events }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventsToday = events.filter(e => e.date === todayStr);
    const myPending = tasks.filter(t => t.status !== 'completed');
    const highPriority = myPending.filter(t => t.priority === 'high');

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-violet-50">
                <h2 className="text-2xl font-bold text-violet-900">Hola, {user.firstName}! 👋</h2>
                <p className="text-gray-500 text-sm">Bienvenido a tu portal digital.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10"><h3 className="text-3xl font-bold">{myPending.length}</h3><p className="text-xs font-bold opacity-90 uppercase tracking-wide">Tareas Pendientes</p></div><CheckSquare className="absolute -bottom-4 -right-4 opacity-20 w-24 h-24" />
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-violet-800 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                     <div className="relative z-10"><h3 className="text-3xl font-bold">{eventsToday.length}</h3><p className="text-xs font-bold opacity-90 uppercase tracking-wide">Eventos Hoy</p></div><CalendarIcon className="absolute -bottom-4 -right-4 opacity-20 w-24 h-24" />
                </div>
            </div>
            {highPriority.length > 0 && (
                <div className="bg-red-50 rounded-3xl p-5 border border-red-100">
                    <div className="flex items-center gap-2 mb-3 text-red-600 font-bold"><AlertTriangle size={20} /><h3>Requieren Atención</h3></div>
                    <div className="space-y-2">{highPriority.slice(0, 3).map(t => (<div key={t.id} className="bg-white p-3 rounded-xl border border-red-100 shadow-sm flex justify-between items-center"><span className="text-sm font-bold text-gray-700 truncate">{t.title}</span><span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold">URGENTE</span></div>))}</div>
                </div>
            )}
             {eventsToday.length > 0 && (
                <div className="bg-white rounded-3xl p-5 border border-violet-50 shadow-sm">
                    <div className="flex items-center gap-2 mb-3 text-violet-800 font-bold"><Clock size={20} /><h3>Agenda de Hoy</h3></div>
                     <div className="space-y-2">{eventsToday.map(e => (<div key={e.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition"><div className="w-10 h-10 rounded-full bg-violet-100 text-violet-600 flex items-center justify-center font-bold text-xs shrink-0">{new Date(e.date + 'T00:00:00').getDate()}</div><div><p className="text-sm font-bold text-gray-800">{e.title}</p><p className="text-xs text-gray-500 font-medium uppercase">{e.type}</p></div></div>))}</div>
                </div>
            )}
        </div>
    );
}

// --- VISTA RECURSOS ---
function ResourcesView({ resources, canEdit }) {
    const [showModal, setShowModal] = useState(false);
    const addResource = async (e) => { e.preventDefault(); const title = e.target.title.value; const url = e.target.url.value; const category = e.target.category.value; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), { title, url, category, createdAt: serverTimestamp() }); setShowModal(false); };
    const deleteResource = async (id) => { if(confirm('¿Borrar recurso?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', id)); };
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-violet-900">Recursos</h2><p className="text-xs text-gray-500">Documentos y Enlaces</p></div>{canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition"><Plus size={24} /></button>}</div>
            <div className="grid gap-3">
                {resources.length === 0 ? <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200"><LinkIcon size={48} className="mx-auto mb-4 text-violet-100" /><p className="text-gray-500">No hay recursos compartidos.</p></div> : resources.map(res => (<a key={res.id} href={res.url} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex items-center gap-4 hover:shadow-md transition group relative"><div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><FileText size={24} /></div><div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 text-sm truncate pr-6">{res.title}</h3><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold tracking-wide">{res.category || 'General'}</span></div><ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500" />{canEdit && (<button onClick={(e) => {e.preventDefault(); deleteResource(res.id)}} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 z-10 bg-white/80 rounded-full"><Trash2 size={14} /></button>)}</a>))}
            </div>
            {showModal && (<div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"><h3 className="text-xl font-bold mb-6 text-violet-900">Nuevo Recurso</h3><form onSubmit={addResource} className="space-y-4"><input name="title" required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Título (Ej: Licencias)" /><input name="url" required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Enlace (https://...)" /><select name="category" className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"><option>Documentos</option><option>Planillas</option><option>Normativa</option><option>Utilidades</option></select><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Guardar</button></div></form></div></div>)}
        </div>
    );
}

// --- VISTA TAREAS ---
function TasksView({ tasks, user, canEdit }) {
  const [showModal, setShowModal] = useState(false);
  const [targetType, setTargetType] = useState('all'); 
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [hasNotification, setHasNotification] = useState(false);
  const [notifDate, setNotifDate] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [usersList, setUsersList] = useState([]);
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    if (canEdit && showModal) {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
      const unsub = onSnapshot(q, snap => setUsersList(snap.docs.map(d => d.data())));
      return () => unsub();
    }
  }, [canEdit, showModal]);

  const toggleSelection = (item, list, setList) => {
    if (list.includes(item)) setList(list.filter(i => i !== item));
    else setList([...list, item]);
  };

  const addTask = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const dueDate = e.target.dueDate.value;
    const priority = e.target.priority.value;
    let taskData = { title, dueDate, priority, targetType, status: 'pending', createdBy: user.id, createdAt: serverTimestamp() };
    if (targetType === 'roles') taskData.targetRoles = selectedRoles;
    if (targetType === 'users') taskData.targetUsers = selectedUsers;
    if (hasNotification && notifDate && notifMsg) { taskData.notificationDate = notifDate; taskData.notificationMessage = notifMsg; }
    if (targetType === 'all') taskData.assignedTo = "Todos";
    else if (targetType === 'roles') taskData.assignedTo = selectedRoles.join(", ");
    else if (targetType === 'users') taskData.assignedTo = selectedUsers.length + " personas";
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), taskData);
    setShowModal(false); setTargetType('all'); setSelectedRoles([]); setSelectedUsers([]); setHasNotification(false);
  };

  const updateStatus = async (task, newStatus) => { const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id); await updateDoc(ref, { status: newStatus }); };
  const deleteTask = async (id) => { if(confirm('¿Eliminar tarea?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id)); };
  const sendReminder = async (task) => { if (!confirm(`¿Enviar notificación?`)) return; const ref = doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id); await updateDoc(ref, { lastReminder: serverTimestamp() }); alert("Recordatorio enviado."); };
  const getStatusColor = (s) => { if(s === 'completed') return 'bg-green-100 text-green-700 border-green-200'; if(s === 'in_progress') return 'bg-blue-100 text-blue-700 border-blue-200'; return 'bg-gray-100 text-gray-500 border-gray-200'; };

  const filteredTasks = tasks.filter(t => {
      if (filterRole === 'all') return true;
      if (t.targetType === 'all') return true; 
      if (t.targetType === 'roles' && t.targetRoles?.includes(filterRole)) return true;
      return false;
  });

  return (
    <div className="animate-in fade-in duration-500">
      <div className="bg-gradient-to-r from-violet-700 to-violet-900 p-6 rounded-3xl shadow-lg text-white mb-8 relative overflow-hidden">
        <div className="relative z-10 flex justify-between items-center">
          <div><h2 className="text-3xl font-bold">Tareas</h2><p className="text-violet-200 mt-1">Gestión y seguimiento</p></div>
          {canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition active:scale-95"><Plus size={24} /></button>}
        </div>
      </div>
      {canEdit && (<div className="mb-4 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide"><span className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase"><Filter size={12}/> Filtrar:</span><button onClick={() => setFilterRole('all')} className={`text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${filterRole === 'all' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Todos</button>{ROLES.map(role => (<button key={role} onClick={() => setFilterRole(role)} className={`text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${filterRole === role ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{role}</button>))}</div>)}
      <div className="space-y-3">
        {filteredTasks.length === 0 ? <div className="text-center py-12 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><CheckCircle size={48} className="mx-auto mb-2 text-violet-100" /><p>No hay tareas visibles.</p></div> : 
          filteredTasks.map(task => {
            const daysLeft = calculateDaysLeft(task.dueDate);
            const isLate = daysLeft < 0 && task.status !== 'completed';
            const status = task.status || (task.completed ? 'completed' : 'pending');
            return (
              <div key={task.id} className={`p-4 rounded-2xl border-l-[6px] shadow-sm transition-all relative group bg-white ${status === 'completed' ? 'border-green-400 opacity-70' : isLate ? 'border-red-500' : 'border-violet-500'}`}>
                <div className="flex items-start gap-4">
                  <div className="pt-1"><select value={status} onChange={(e) => updateStatus(task, e.target.value)} className={`text-[10px] font-bold uppercase rounded-lg p-1 border outline-none cursor-pointer ${getStatusColor(status)} appearance-none text-center min-w-[80px]`}><option value="pending">Pendiente</option><option value="in_progress">En Proceso</option><option value="completed">Finalizado</option></select></div>
                  <div className="flex-1 pr-8"><div className="flex items-center gap-2 mb-1"><span className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-400' : 'bg-green-400'}`}></span><h3 className={`font-bold text-gray-800 text-base ${status === 'completed' ? 'line-through text-gray-400' : ''}`}>{task.title}</h3></div><div className="flex flex-wrap items-center gap-2 mt-2 text-xs">{canEdit && <span className="bg-violet-50 text-violet-700 px-2 py-1 rounded-lg font-bold flex items-center gap-1">{task.targetType === 'roles' ? <Users size={12} /> : <User size={12} />}<span className="truncate max-w-[150px]">{task.assignedTo || "Todos"}</span></span>}<span className={`px-2 py-1 rounded-lg font-medium border ${isLate ? 'bg-red-50 text-red-600 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>{formatDate(task.dueDate)}</span></div></div>
                  {canEdit && (<div className="absolute top-4 right-4 flex gap-2"><button onClick={() => sendReminder(task)} className="text-gray-300 hover:text-orange-500 p-1.5 hover:bg-orange-50 rounded-full transition"><Bell size={16} /></button><button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-full transition"><Trash2 size={16} /></button></div>)}
                </div>
              </div>
            );
          })
        }
      </div>
      {showModal && canEdit && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold mb-6 text-violet-900">Nueva Tarea</h3><form onSubmit={addTask} className="space-y-4"><input name="title" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Título" /><div className="grid grid-cols-2 gap-3"><input type="date" name="dueDate" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" /><select name="priority" className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-gray-700"><option value="low">Prioridad Baja 🟢</option><option value="medium">Prioridad Media 🟡</option><option value="high">Prioridad Alta 🔴</option></select></div><div className="bg-gray-50 p-1 rounded-xl flex"><button type="button" onClick={() => setTargetType('all')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'all' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Todos</button><button type="button" onClick={() => setTargetType('roles')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'roles' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Roles</button><button type="button" onClick={() => setTargetType('users')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${targetType === 'users' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>Personas</button></div>{targetType === 'roles' && (<div className="p-3 bg-violet-50 rounded-xl max-h-40 overflow-y-auto"><p className="text-xs text-gray-500 mb-2 font-bold uppercase">Roles:</p><div className="space-y-2">{ROLES.map(role => (<label key={role} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedRoles.includes(role) ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'}`}>{selectedRoles.includes(role) && <Check size={12} className="text-white" />}</div><input type="checkbox" className="hidden" checked={selectedRoles.includes(role)} onChange={() => toggleSelection(role, selectedRoles, setSelectedRoles)} /><span className="text-sm text-gray-700">{role}</span></label>))}</div></div>)}{targetType === 'users' && (<div className="p-3 bg-violet-50 rounded-xl max-h-40 overflow-y-auto"><p className="text-xs text-gray-500 mb-2 font-bold uppercase">Personas:</p><div className="space-y-2">{usersList.map(u => (<label key={u.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded"><div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedUsers.includes(u.fullName) ? 'bg-violet-600 border-violet-600' : 'border-gray-300 bg-white'}`}>{selectedUsers.includes(u.fullName) && <Check size={12} className="text-white" />}</div><input type="checkbox" className="hidden" checked={selectedUsers.includes(u.fullName)} onChange={() => toggleSelection(u.fullName, selectedUsers, setSelectedUsers)} /><span className="text-sm text-gray-700">{u.fullName}</span></label>))}</div></div>)}<div className="pt-2 border-t border-gray-100"><label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2"><input type="checkbox" checked={hasNotification} onChange={(e) => setHasNotification(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" /> <Bell size={16} /> Programar Aviso</label>{hasNotification && (<div className="space-y-3 bg-orange-50 p-3 rounded-xl animate-in fade-in"><div><label className="text-xs font-bold text-orange-600">Fecha</label><input type="date" value={notifDate} onChange={(e) => setNotifDate(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" /></div><div><label className="text-xs font-bold text-orange-600">Mensaje</label><input type="text" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" /></div></div>)}</div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Guardar</button></div></form></div></div>
      )}
    </div>
  );
}

// --- VISTAS RESTANTES ---
function NotificationsView({ notifications, canEdit }) {
  const deleteRequest = async (id) => { if(confirm('¿Has resuelto esta solicitud?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'requests', id)); };
  return (
    <div className="animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold text-violet-900 mb-6">Avisos</h2>
      <div className="space-y-3">
        {notifications.length === 0 ? <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200"><Bell size={48} className="mx-auto mb-4 text-violet-100" /><p className="text-gray-500">Sin novedades.</p></div> : 
          notifications.map(notif => (
            <div key={notif.id} className={`p-4 rounded-2xl border-l-4 shadow-sm bg-white relative ${notif.type === 'admin_alert' ? 'border-red-600 bg-red-50' : notif.type === 'reminder' ? 'border-orange-500 bg-orange-50/50' : 'border-violet-500'}`}>
               <div className="flex justify-between items-start mb-1">
                 <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${notif.type === 'admin_alert' ? 'bg-red-600 text-white animate-pulse' : notif.type === 'reminder' ? 'bg-orange-100 text-orange-600' : 'bg-violet-100 text-violet-600'}`}>{notif.type === 'admin_alert' ? 'SOLICITUD' : notif.type === 'reminder' ? 'Urgente' : 'Aviso'}</span>
                 <span className="text-xs text-gray-400">{formatDate(notif.date)}</span>
               </div>
               <h3 className="font-bold text-gray-800">{notif.title}</h3>
               <p className="text-sm text-gray-600 mt-1">{notif.message}</p>
               {notif.isRequest && canEdit && <div className="mt-3 flex justify-end"><button onClick={() => deleteRequest(notif.id)} className="flex items-center gap-1 text-xs font-bold text-red-500 bg-white border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition shadow-sm"><Check size={14} /> Resuelto</button></div>}
            </div>
          ))
        }
      </div>
    </div>
  );
}

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

function CalendarView({ events, canEdit, user }) {
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hasNotification, setHasNotification] = useState(false);
  const [notifDate, setNotifDate] = useState('');
  const [notifMsg, setNotifMsg] = useState('');
  const [filterType, setFilterType] = useState('all');

  const addEvent = async (e) => {
    e.preventDefault();
    const title = e.target.title.value;
    const date = e.target.date.value;
    const type = e.target.type.value;
    const description = e.target.description?.value || '';
    let eventData = { title, date, type, description, createdBy: user.id, createdAt: serverTimestamp() };
    if (hasNotification && notifDate && notifMsg) {
      eventData.notificationDate = notifDate;
      eventData.notificationMessage = notifMsg;
    }
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), eventData);
    setShowModal(false); setHasNotification(false); setNotifMsg(''); setNotifDate('');
  };

  const deleteEvent = async (id) => { if(confirm('¿Eliminar evento?')) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id)); setSelectedEvent(null); } };
  const getTypeStyle = (type) => {
    const styles = { 'SALIDA EDUCATIVA': 'bg-green-100 text-green-800 border-green-200', 'GENERAL': 'bg-gray-100 text-gray-800 border-gray-200', 'ADMINISTRATIVO': 'bg-blue-100 text-blue-800 border-blue-200', 'INFORMES': 'bg-amber-100 text-amber-800 border-amber-200', 'EVENTOS': 'bg-violet-100 text-violet-800 border-violet-200', 'ACTOS': 'bg-red-100 text-red-800 border-red-200', 'EFEMÉRIDES': 'bg-cyan-100 text-cyan-800 border-cyan-200', 'CUMPLEAÑOS': 'bg-pink-100 text-pink-800 border-pink-200' };
    return styles[type] || styles['GENERAL'];
  };
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
  const changeMonth = (offset) => { const newDate = new Date(currentDate.setMonth(currentDate.getMonth() + offset)); setCurrentDate(new Date(newDate)); };
  const filteredEvents = events.filter(e => filterType === 'all' || e.type === filterType);
  const renderCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/30 border border-gray-100"></div>);
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayEvents = filteredEvents.filter(e => e.date === dateStr);
      days.push(<div key={d} className="min-h-[80px] border border-gray-100 p-1 relative bg-white hover:bg-violet-50 transition group overflow-hidden"><span className={`text-xs font-bold block mb-1 ${dayEvents.length > 0 ? 'text-violet-700' : 'text-gray-400'}`}>{d}</span><div className="flex flex-col gap-1">{dayEvents.map((ev, idx) => (<button key={idx} onClick={() => setSelectedEvent(ev)} className={`text-[9px] text-left truncate px-1.5 py-0.5 rounded font-medium w-full shadow-sm hover:opacity-80 transition ${getTypeStyle(ev.type)}`}>{ev.title}</button>))}</div></div>);
    }
    return days;
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 mb-6">
          <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-violet-900">Agenda</h2><div className="flex gap-2"><div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm"><button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition ${viewMode === 'list' ? 'bg-violet-100 text-violet-700 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}><List size={20} /></button><button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition ${viewMode === 'grid' ? 'bg-violet-100 text-violet-700 shadow-inner' : 'text-gray-400 hover:text-gray-600'}`}><Grid size={20} /></button></div>{canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:bg-orange-600 transition active:scale-95"><Plus size={20} /></button>}</div></div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide"><span className="text-xs font-bold text-gray-400 flex items-center gap-1 uppercase"><Filter size={12}/> Categorías:</span><button onClick={() => setFilterType('all')} className={`text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${filterType === 'all' ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>Todas</button>{EVENT_TYPES.map(type => (<button key={type} onClick={() => setFilterType(type)} className={`text-xs px-3 py-1.5 rounded-full font-bold whitespace-nowrap transition ${filterType === type ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200'}`}>{type}</button>))}</div>
      </div>
      {viewMode === 'grid' ? (
        <div className="bg-white rounded-3xl shadow-lg border border-gray-200 overflow-hidden"><div className="p-4 flex justify-between items-center bg-violet-50 border-b border-violet-100"><button onClick={() => changeMonth(-1)} className="p-2 hover:bg-white rounded-full transition shadow-sm text-violet-700"><ChevronLeft size={24} /></button><span className="font-bold text-violet-900 capitalize text-lg">{currentDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span><button onClick={() => changeMonth(1)} className="p-2 hover:bg-white rounded-full transition shadow-sm text-violet-700"><ChevronRight size={24} /></button></div><div className="grid grid-cols-7 text-center py-3 bg-white text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100"><div>Dom</div><div>Lun</div><div>Mar</div><div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div></div><div className="grid grid-cols-7 bg-gray-100 gap-px border-b border-gray-200">{renderCalendarGrid()}</div></div>
      ) : (
        <div className="space-y-4">{filteredEvents.length === 0 ? <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200"><CalendarIcon size={48} className="mx-auto mb-4 text-violet-100" /><p className="text-gray-500">No hay eventos.</p></div> : filteredEvents.map(event => (<div key={event.id} onClick={() => setSelectedEvent(event)} className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex items-center gap-4 relative group hover:shadow-md transition cursor-pointer active:scale-[0.99]"><div className="flex flex-col items-center justify-center w-14 h-14 bg-violet-50 rounded-2xl border border-violet-100 text-violet-600 shrink-0"><span className="text-[10px] uppercase font-bold text-violet-400">{event.date ? new Date(event.date + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short' }) : '-'}</span><span className="text-xl font-bold leading-none">{event.date ? new Date(event.date + 'T00:00:00').getDate() : '-'}</span></div><div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 text-sm truncate">{event.title}</h3><div className="mt-1 flex items-center gap-2 flex-wrap"><span className={`text-[9px] px-2 py-1 rounded-md font-bold uppercase tracking-wide border whitespace-nowrap ${getTypeStyle(event.type)}`}>{event.type}</span></div></div></div>))}</div>
      )}
      {showModal && canEdit && (
        <div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"><h3 className="text-xl font-bold mb-6 text-violet-900">Nuevo Evento</h3><form onSubmit={addEvent} className="space-y-4"><input name="title" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none placeholder:text-gray-400" placeholder="Título" /><input type="date" name="date" required className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" /><select name="type" className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-gray-700">{EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}</select><textarea name="description" className="w-full p-3 bg-violet-50 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none resize-none h-20 placeholder:text-gray-400 text-sm" placeholder="Descripción opcional..." ></textarea><div className="pt-2 border-t border-gray-100"><label className="flex items-center gap-2 text-sm font-bold text-gray-700 cursor-pointer mb-2 select-none"><input type="checkbox" checked={hasNotification} onChange={(e) => setHasNotification(e.target.checked)} className="rounded text-violet-600 focus:ring-violet-500" /> <Bell size={16} /> Programar Aviso</label>{hasNotification && (<div className="space-y-3 bg-orange-50 p-3 rounded-xl animate-in fade-in"><div><label className="text-xs font-bold text-orange-600">Fecha</label><input type="date" value={notifDate} onChange={(e) => setNotifDate(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" /></div><div><label className="text-xs font-bold text-orange-600">Mensaje</label><input type="text" value={notifMsg} onChange={(e) => setNotifMsg(e.target.value)} className="w-full mt-1 p-2 bg-white border border-orange-200 rounded-lg text-sm" /></div></div>)}</div><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg hover:bg-violet-900 transition">Guardar</button></div></form></div></div>
      )}
      {selectedEvent && (
        <div className="fixed inset-0 bg-violet-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedEvent(null)}><div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}><div className={`h-24 ${getTypeStyle(selectedEvent.type).split(' ')[0]} relative`}><button onClick={() => setSelectedEvent(null)} className="absolute top-4 right-4 bg-white/50 hover:bg-white rounded-full p-1 text-gray-700 transition"><ChevronRight className="rotate-90" size={24} /></button></div><div className="px-6 pb-6 -mt-10 relative"><div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4"><span className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide border mb-2 inline-block ${getTypeStyle(selectedEvent.type)}`}>{selectedEvent.type}</span><h2 className="text-xl font-bold text-gray-800 leading-tight">{selectedEvent.title}</h2></div><div className="space-y-4"><div className="flex items-center gap-3 text-gray-600"><div className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center text-violet-600"><CalendarIcon size={20} /></div><div><p className="text-xs text-gray-400 font-bold uppercase">Fecha</p><p className="font-medium text-gray-800">{new Date(selectedEvent.date + 'T00:00:00').toLocaleDateString('es-ES', {weekday: 'long', day: 'numeric', month: 'long'})}</p></div></div>{selectedEvent.description && (<div className="flex items-start gap-3 text-gray-600"><div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-orange-500 shrink-0"><FileText size={20} /></div><div><p className="text-xs text-gray-400 font-bold uppercase">Descripción</p><p className="text-sm text-gray-700 leading-relaxed">{selectedEvent.description}</p></div></div>)}</div>{canEdit && (<div className="mt-8 pt-4 border-t border-gray-100 flex justify-end"><button onClick={() => deleteEvent(selectedEvent.id)} className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-4 py-2 rounded-xl transition font-bold text-sm"><Trash2 size={18} /> Eliminar Evento</button></div>)}</div></div></div>
      )}
    </div>
  );
}

function ProfileView({ user, tasks, onLogout, canEdit }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);

  const resizeImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const resizedImage = await resizeImage(file);
      setFormData(prev => ({ ...prev, photoUrl: resizedImage }));
    } catch (err) { alert("Error al procesar la imagen"); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    try {
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      await updateDoc(userRef, { firstName: formData.firstName, lastName: formData.lastName, fullName: `${formData.firstName} ${formData.lastName}`, photoUrl: formData.photoUrl });
      const updatedProfile = { ...user, ...formData, fullName: `${formData.firstName} ${formData.lastName}` };
      localStorage.setItem('schoolApp_profile', JSON.stringify(updatedProfile));
      alert("¡Perfil actualizado! 📸"); window.location.reload();
    } catch (e) { alert("Error al guardar"); }
  };
  const exportData = () => {
    let csvContent = "data:text/csv;charset=utf-8,Titulo,Vencimiento,Estado,Asignado A\n" + tasks.map(t => [`"${t.title}"`, t.dueDate, t.completed ? "Completado" : "Pendiente", t.assignedTo].join(",")).join("\r\n");
    const link = document.createElement("a"); link.href = encodeURI(csvContent); link.download = `reporte_${user.lastName}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 p-4">
      <div className="bg-white rounded-3xl shadow-sm border border-violet-50 overflow-hidden mb-6 relative">
        <div className="bg-gradient-to-r from-violet-600 to-orange-500 h-28 relative"></div>
        <div className="px-6 pb-6 pt-12 relative">
           <div className="absolute -top-10 left-6 w-24 h-24 bg-white p-1 rounded-2xl shadow-lg group">
              <div className="w-full h-full rounded-xl overflow-hidden relative border border-violet-100 bg-violet-50 flex items-center justify-center">
                  {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" alt="Perfil" /> : <div className="text-violet-600 font-bold text-3xl">{user.firstName?.[0]}{user.lastName?.[0]}</div>}
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}
              </div>
           </div>
           <div className="flex justify-between items-start"><div className="pl-2"><h2 className="text-2xl font-bold text-gray-800 mt-2">{user.fullName}</h2><p className="text-orange-600 font-bold text-xs uppercase tracking-wider">{user.role}</p>{user.rol === 'admin' && <span className="bg-violet-600 text-white text-[10px] px-2 py-0.5 rounded-full mt-1 inline-block">ADMIN</span>}</div><button onClick={() => setIsEditing(!isEditing)} className="text-violet-600 hover:bg-violet-50 p-2 rounded-xl transition text-sm font-bold flex items-center gap-1">{isEditing ? 'Cancelar' : 'Editar'}</button></div>
        </div>
        {isEditing && (
          <div className="px-6 pb-6 animate-in slide-in-from-top-4">
            <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
              <div className="bg-white p-3 rounded-lg border border-dashed border-violet-300 text-center"><p className="text-xs font-bold text-gray-500 mb-2">Cambiar Foto de Perfil</p><label className="cursor-pointer bg-violet-100 text-violet-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-violet-200 transition inline-flex items-center gap-2"><User size={14}/> Elegir archivo...<input type="file" accept="image/*" onChange={handleFileChange} className="hidden" /></label></div>
              <div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500 ml-1">Nombre</label><input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500 ml-1">Apellido</label><input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full p-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-400 outline-none" /></div></div>
              <button onClick={handleSave} disabled={uploading} className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl shadow hover:bg-violet-700 transition disabled:opacity-50">{uploading ? 'Procesando imagen...' : 'Guardar Cambios'}</button>
            </div>
          </div>
        )}
      </div>
      <h3 className="text-lg font-bold text-violet-900 mb-4 px-2">Acciones</h3>
      <div className="grid gap-3"><button onClick={exportData} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]"><div className="bg-green-100 text-green-700 p-3 rounded-xl"><Download size={24} /></div><div className="text-left"><h4 className="font-bold text-gray-800">Exportar Reporte</h4><p className="text-xs text-gray-500">Descargar mis tareas en Excel/CSV</p></div></button><button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98] mt-4"><div className="bg-white text-red-500 p-3 rounded-xl"><LogOut size={24} /></div><div className="text-left"><h4 className="font-bold text-red-600">Cerrar Sesión</h4><p className="text-xs text-red-400">Salir de la cuenta segura</p></div></button></div>
    <h3 className="text-lg font-bold text-violet-900 mb-4 px-2">Acciones</h3>
      
        
        {/* Botón 1: Exportar (Ya lo tenías) */}
        <button onClick={exportData} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]">
            <div className="bg-green-100 text-green-700 p-3 rounded-xl"><Download size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-gray-800">Exportar Reporte</h4><p className="text-xs text-gray-500">Descargar mis tareas en Excel/CSV</p></div>
        </button>

        {/* --- PEGAR ESTO AQUÍ (Paso 2) --- */}
        <button onClick={requestNotificationPermission} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]">
            <div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl"><Bell size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-gray-800">Activar Notificaciones</h4><p className="text-xs text-gray-500">Recibir alertas en el celular</p></div>
        </button>
        {/* -------------------------------- */}

        {/* Botón 3: Cerrar Sesión (Ya lo tenías) */}
        <button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98] mt-4">
            <div className="bg-white text-red-500 p-3 rounded-xl"><LogOut size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-red-600">Cerrar Sesión</h4><p className="text-xs text-red-400">Salir de la cuenta segura</p></div>
        </button>
      </div>
    </div>
  );
}




