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
  GraduationCap,
  Search,
  X,
  UploadCloud,
  PieChart,
  Eye,
  Edit3
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
  serverTimestamp,
  arrayUnion 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";

// --- CONFIGURACIÓN DE FIREBASE (INTEGRADA) ---
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

// --- CONFIGURACIÓN MESSAGING (NOTIFICACIONES) ---
const messaging = app ? getMessaging(app) : null;

// Clave pública VAPID (Extraída de tu código original)
const VAPID_KEY = "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw";

const requestPermission = async () => {
  try {
    // 1. ESPERAR a que el Service Worker esté listo
    const registration = await navigator.serviceWorker.ready; //
    console.log('Service Worker detectado y activo:', registration);

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // 2. Pedir el Token pasando el registro explícitamente
      const currentToken = await getToken(messaging, {
        vapidKey: "BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw",
        serviceWorkerRegistration: registration // Esto evita el AbortError
      });
      
      if (currentToken) {
        console.log('Token final generado:', currentToken);
        // Aquí podrías guardar el token en Firestore si es necesario
      }
    }
  } catch (error) {
    console.error('Error en el proceso de suscripción:', error);
  }
const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });

// --- FUNCIÓN SEGURA PARA NOTIFICACIONES MÓVILES ---
const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "granted") {
    // Si estamos en celular (Service Worker activo)
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, {
          body: body,
          icon: '/icon-192.png',
          vibrate: [200, 100, 200]
        });
      });
    } else {
      // Si estamos en PC
      try {
        new Notification(title, { body, icon: '/icon-192.png' });
      } catch (e) {
        console.log("Notificación bloqueada o no soportada en este modo.");
      }
    }
  }
};

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
const onMessageListener = () =>
  new Promise((resolve) => {
    if (messaging) {
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });

// --- Componente Principal Wrapper (FUSIONADO) ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

 

 // Efecto para Notificaciones (Línea 196 aprox)
  useEffect(() => {
    requestPermission();
    
    // Llamamos a la función que ahora sí existe afuera
    onMessageListener().then((payload) => {
      console.log('Notificación recibida:', payload);
      if (payload.notification) {
          triggerMobileNotification(payload.notification.title, payload.notification.body);
      }
    });
  }, []);
 
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

// --- APP PRINCIPAL (CON TODAS LAS MEJORAS INTEGRADAS) ---
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
    const unsubEvents = onSnapshot(qEvents, (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qResources = query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc'));
    const unsubResources = onSnapshot(qResources, (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

    let unsubRequests = () => {};
    if (canManageUsers) {
        const qReq = query(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), orderBy('createdAt', 'desc'));
        unsubRequests = onSnapshot(qReq, (snap) => setAdminRequests(snap.docs.map(d => ({ id: d.id, ...d.data(), isRequest: true }))));
    }
    return () => { unsubTasks(); unsubEvents(); unsubRequests(); unsubResources(); };
  }, [user, canManageContent, canManageUsers]);

  useEffect(() => {
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayStr = today.toISOString().split('T')[0];
    let newNotifs = [];

    if (canManageUsers) {
        adminRequests.forEach(req => newNotifs.push({ id: req.id, type: 'admin_alert', title: "Solicitud", message: `Usuario: ${req.username}`, date: todayStr }));
    }

    tasks.forEach(task => {
      if (task.status === 'completed') return;
      if (task.lastReminder) newNotifs.push({ id: `remind-${task.id}`, type: 'reminder', title: "Recordatorio", message: task.title, date: todayStr });
    });

    setNotifications(newNotifs);
  }, [tasks, adminRequests]);

  // --- ACTIVAR NOTIFICACIONES MULTI-DISPOSITIVO ---
  useEffect(() => {
    const activarMensajes = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          // CLAVE VAPID REAL (Usando la constante)
          const currentToken = await getToken(messaging, {
            vapidKey: VAPID_KEY
          });

          if (currentToken && user && user.id) {
            console.log("Token:", currentToken);
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            // USAMOS ARRAY UNION PARA AGREGAR SIN BORRAR LO ANTERIOR
            await updateDoc(userRef, { 
                fcmTokens: arrayUnion(currentToken),
                lastTokenUpdate: serverTimestamp() 
            });
          }
        }
      } catch (error) {
        console.error("Error notificaciones:", error);
      }
    };

    if(user && user.id) activarMensajes();

    // Listener dentro de MainApp también, por si acaso
    onMessage(messaging, (payload) => {
      if (payload.notification) {
          triggerMobileNotification(payload.notification.title, payload.notification.body);
      }
    });
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
          <div>
            <h1 className="font-bold text-base leading-tight text-white">Juntos a la par digital</h1>
            <p className="text-[10px] text-orange-200 font-medium tracking-wide uppercase flex items-center gap-1">
                {isSuperAdmin && <Crown size={10} className="text-yellow-400" />}
                {isSuperAdmin ? 'Super Admin' : canManageContent ? 'Administrador' : user.role}
            </p>
          </div>
        </div>
        
        {/* PERFIL ARRIBA (CLICKABLE) */}
        <div 
          onClick={() => setActiveTab('profile')} 
          className="flex items-center space-x-3 bg-violet-900/50 py-1.5 px-4 rounded-full border border-violet-600 cursor-pointer hover:bg-violet-800 transition select-none"
        >
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
          <NavButton active={activeTab === 'matricula'} onClick={() => setActiveTab('matricula')} icon={<GraduationCap size={24} />} label="Matrícula" />
          <NavButton active={activeTab === 'resources'} onClick={() => setActiveTab('resources')} icon={<LinkIcon size={24} />} label="Recursos" />
          <NavButton active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} icon={<Bell size={24} />} label="Avisos" badge={notifications.length} />
          {canManageUsers && <NavButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={<Users size={24} />} label="Admin" />}
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

// --- VISTA DASHBOARD (CARTELERA MULTIPLE) ---
function DashboardView({ user, tasks, events }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const eventsToday = events.filter(e => e.date === todayStr);
    const myPending = tasks.filter(t => t.status !== 'completed');
    const [announcements, setAnnouncements] = useState([]); 
    const [showAnnounceModal, setShowAnnounceModal] = useState(false);
    const canPost = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';

    useEffect(() => {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const now = new Date();
            const validMessages = [];
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                const msgDate = data.createdAt ? new Date(data.createdAt.seconds * 1000) : new Date();
                const diffHours = (now - msgDate) / (1000 * 60 * 60);
                if (diffHours < 48) {
                    validMessages.push({ id: doc.id, ...data, timeAgo: Math.floor(diffHours) });
                }
            });
            setAnnouncements(validMessages);
        });
        return () => unsub();
    }, []);

    const handlePostAnnouncement = async (e) => {
        e.preventDefault();
        const text = e.target.message.value;
        if(!text.trim()) return;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
            message: text, author: user.fullName, role: user.role, createdAt: serverTimestamp()
        });
        setShowAnnounceModal(false);
        alert("✅ Comunicado publicado.");
    };

    const deleteAnnouncement = async (id) => {
        if(confirm("¿Borrar este comunicado?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
        }
    };

    return (
        <div className="animate-in fade-in duration-500 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-violet-50 flex justify-between items-center">
                <div><h2 className="text-2xl font-bold text-violet-900">Hola, {user.firstName}! 👋</h2><p className="text-gray-500 text-sm">Bienvenido a tu portal digital.</p></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10"><h3 className="text-3xl font-bold">{myPending.length}</h3><p className="text-xs font-bold opacity-90 uppercase tracking-wide">Pendientes</p></div>
                    <CheckSquare className="absolute -bottom-4 -right-4 opacity-20 w-24 h-24" />
                </div>
                <div className="bg-gradient-to-br from-violet-600 to-violet-800 p-5 rounded-3xl text-white shadow-lg relative overflow-hidden">
                    <div className="relative z-10"><h3 className="text-3xl font-bold">{eventsToday.length}</h3><p className="text-xs font-bold opacity-90 uppercase tracking-wide">Eventos Hoy</p></div>
                    <CalendarIcon className="absolute -bottom-4 -right-4 opacity-20 w-24 h-24" />
                </div>
            </div>
            {/* CARTELERA */}
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 p-1 rounded-3xl shadow-lg relative">
                <div className="bg-white/10 backdrop-blur-sm p-5 rounded-[20px] text-white min-h-[140px] relative overflow-hidden">
                    <div className="flex justify-between items-center z-10 relative mb-4">
                        <div><h3 className="text-lg font-bold flex items-center gap-2"><Bell size={20}/> Cartelera</h3><p className="text-[10px] opacity-80 uppercase tracking-wider">Novedades</p></div>
                        {canPost && (<button onClick={() => setShowAnnounceModal(true)} className="bg-white/20 hover:bg-white/40 p-2 rounded-full transition shadow-sm"><Edit3 size={18} /></button>)}
                    </div>
                    <div className="relative z-10 space-y-3 max-h-[300px] overflow-y-auto pr-2 scrollbar-hide">
                        {announcements.length > 0 ? (
                            announcements.map((anuncio) => (
                                <div key={anuncio.id} className="bg-black/20 p-3 rounded-xl border border-white/10 relative group">
                                    <p className="text-md font-medium leading-snug">"{anuncio.message}"</p>
                                    <div className="mt-2 flex items-center justify-between text-[10px] opacity-75"><span className="font-bold uppercase tracking-wide">{anuncio.author}</span><span>hace {anuncio.timeAgo}h</span></div>
                                    {canPost && (<button onClick={() => deleteAnnouncement(anuncio.id)} className="absolute top-2 right-2 text-white/40 hover:text-white bg-black/20 hover:bg-red-500/80 p-1 rounded transition opacity-0 group-hover:opacity-100"><X size={12} /></button>)}
                                </div>
                            ))
                        ) : (<div className="text-center py-4 text-white/60 italic text-sm border-t border-white/10"><p>No hay comunicados activos.</p></div>)}
                    </div>
                    <Bell className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 text-white rotate-12" />
                </div>
            </div>
            {/* MODAL CARTELERA */}
            {showAnnounceModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <h3 className="text-xl font-bold mb-2 text-rose-600">Nuevo Comunicado</h3>
                        <form onSubmit={handlePostAnnouncement}>
                            <textarea name="message" required className="w-full p-3 bg-rose-50 rounded-xl outline-none focus:ring-2 focus:ring-rose-400 text-sm min-h-[100px] resize-none border border-rose-100" placeholder="Escribe el mensaje aquí..."></textarea>
                            <div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowAnnounceModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition">Cancelar</button><button type="submit" className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition">Publicar</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- VISTA RECURSOS (LINKS CORREGIDOS) ---
function ResourcesView({ resources, canEdit }) {
    const [showModal, setShowModal] = useState(false);
    const formatUrl = (url) => { if (!url) return '#'; if (url.startsWith('http://') || url.startsWith('https://')) return url; return `https://${url}`; };
    const addResource = async (e) => { e.preventDefault(); const title = e.target.title.value; const url = e.target.url.value; const category = e.target.category.value; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), { title, url, category, createdAt: serverTimestamp() }); setShowModal(false); };
    const deleteResource = async (id) => { if(confirm('¿Borrar recurso?')) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', id)); };
    return (
        <div className="animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-6"><div><h2 className="text-2xl font-bold text-violet-900">Recursos</h2><p className="text-xs text-gray-500">Documentos y Enlaces</p></div>{canEdit && <button onClick={() => setShowModal(true)} className="bg-orange-500 text-white p-3 rounded-2xl shadow-lg hover:bg-orange-600 transition"><Plus size={24} /></button>}</div>
            <div className="grid gap-3">
                {resources.length === 0 ? <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-gray-200"><LinkIcon size={48} className="mx-auto mb-4 text-violet-100" /><p className="text-gray-500">No hay recursos compartidos.</p></div> : 
                resources.map(res => (
                    <a key={res.id} href={formatUrl(res.url)} target="_blank" rel="noopener noreferrer" className="bg-white p-4 rounded-2xl shadow-sm border border-violet-50 flex items-center gap-4 hover:shadow-md transition group relative">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0"><FileText size={24} /></div>
                        <div className="flex-1 min-w-0"><h3 className="font-bold text-gray-800 text-sm truncate pr-6">{res.title}</h3><span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded uppercase font-bold tracking-wide">{res.category || 'General'}</span></div>
                        <ExternalLink size={16} className="text-gray-300 group-hover:text-blue-500" />
                        {canEdit && (<button onClick={(e) => {e.preventDefault(); deleteResource(res.id)}} className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 z-10 bg-white/80 rounded-full"><Trash2 size={14} /></button>)}
                    </a>
                ))}
            </div>
            {showModal && (<div className="fixed inset-0 bg-violet-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 duration-200"><h3 className="text-xl font-bold mb-6 text-violet-900">Nuevo Recurso</h3><form onSubmit={addResource} className="space-y-4"><input name="title" required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Título" /><input name="url" required className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Enlace" /><select name="category" className="w-full p-3 bg-violet-50 rounded-xl outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"><option>Documentos</option><option>Planillas</option><option>Normativa</option><option>Utilidades</option></select><div className="flex gap-3 mt-6"><button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-violet-800 text-white font-bold rounded-xl shadow-lg">Guardar</button></div></form></div></div>)}
        </div>
    );
}

// --- VISTA TAREAS (SIN CAMBIOS) ---
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

  const toggleSelection = (item, list, setList) => { if (list.includes(item)) setList(list.filter(i => i !== item)); else setList([...list, item]); };
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

  const filteredTasks = tasks.filter(t => { if (filterRole === 'all') return true; if (t.targetType === 'all') return true; if (t.targetType === 'roles' && t.targetRoles?.includes(filterRole)) return true; return false; });

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

// --- VISTA NOTIFICACIONES ---
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

// --- VISTA CALENDARIO (SIN CAMBIOS) ---
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

// --- VISTA PERFIL (COMPLETA Y RESTAURADA) ---
function ProfileView({ user, tasks, onLogout }) {
  const [formData, setFormData] = useState({ firstName: user.firstName || '', lastName: user.lastName || '', photoUrl: user.photoUrl || '' });
  const [uploading, setUploading] = useState(false);

  // 1. Lógica para Activar Notificaciones (Multidispositivo)
  const activarNotificaciones = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const messaging = getMessaging(app);
        // TU CLAVE VAPID
        const currentToken = await getToken(messaging, { 
            vapidKey: VAPID_KEY // <--- Usando la constante corregida
        });
        
        if (currentToken) {
           // Guardamos el token en la lista sin borrar los anteriores
           const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
           await updateDoc(userRef, { 
               fcmTokens: arrayUnion(currentToken),
               lastTokenUpdate: serverTimestamp()
           });
           alert("✅ Notificaciones activadas para este dispositivo.");
           
           // Prueba visual
           triggerMobileNotification("Dispositivo Conectado", "Ahora recibirás los comunicados aquí.");
        }
      } else {
        alert("Necesitamos tu permiso para enviarte avisos.");
      }
    } catch (e) {
      console.error(e);
      alert("Error al activar: " + e.message);
    }
  };

  // 2. Lógica para subir foto
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
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploading(true);
      try {
        const resized = await resizeImage(file);
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        await updateDoc(userRef, { photoUrl: resized });
        setFormData({ ...formData, photoUrl: resized });
        alert("Foto actualizada.");
      } catch (error) { alert("Error al subir."); } finally { setUploading(false); }
    }
  };

  // 3. Lógica simple para exportar mis tareas
  const exportData = () => {
      if(!tasks || tasks.length === 0) return alert("No hay tareas para exportar.");
      const csvContent = "Titulo,Fecha Limite,Estado\n" + tasks.map(t => `${t.title},${t.dueDate},${t.status}`).join("\n");
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a'); link.href = url; link.download = "Mis_Tareas.csv"; link.click();
  };

  return (
    <div className="animate-in fade-in duration-500 p-4">
      {/* TARJETA DE PERFIL */}
      <div className="bg-white rounded-3xl shadow-sm border border-violet-50 overflow-hidden mb-6 relative">
         <div className="bg-gradient-to-r from-violet-600 to-orange-500 h-28 relative"></div>
         <div className="px-6 pb-6 pt-12 relative">
            <div className="absolute -top-10 left-6 w-24 h-24 bg-white p-1 rounded-2xl shadow-lg group">
               <div className="w-full h-full rounded-xl overflow-hidden relative border border-violet-100 bg-violet-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                  {formData.photoUrl ? <img src={formData.photoUrl} className="w-full h-full object-cover" alt="Perfil" /> : <div className="text-violet-600 font-bold text-3xl">{user.firstName?.[0]}{user.lastName?.[0]}</div>}
                  {/* INPUT INVISIBLE PARA SUBIR FOTO */}
                  <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange} accept="image/*" />
                  {uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}
               </div>
            </div>
            <div className="flex justify-between items-start">
                <div className="pl-2">
                    <h2 className="text-2xl font-bold text-gray-800 mt-2">{user.fullName}</h2>
                    <p className="text-orange-600 font-bold text-xs uppercase tracking-wider">{user.role}</p>
                    <p className="text-gray-400 text-[10px] mt-1">Toca la foto para cambiarla</p>
                </div>
            </div>
         </div>
      </div>

      <h3 className="text-lg font-bold text-violet-900 mb-4 px-2">Acciones</h3>
      
      {/* BOTONES DE ACCIÓN */}
      <div className="grid gap-3">
        <button onClick={exportData} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]">
            <div className="bg-green-100 text-green-700 p-3 rounded-xl"><Download size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-gray-800">Exportar Reporte</h4><p className="text-xs text-gray-500">Descargar mis tareas en Excel</p></div>
        </button>

        <button onClick={activarNotificaciones} className="bg-white p-4 rounded-2xl border border-violet-50 shadow-sm flex items-center gap-4 hover:shadow-md transition active:scale-[0.98]">
            <div className="bg-yellow-100 text-yellow-700 p-3 rounded-xl"><Bell size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-gray-800">Activar Notificaciones</h4><p className="text-xs text-gray-500">Habilitar avisos en este dispositivo</p></div>
        </button>

        <button onClick={() => { if(confirm("¿Cerrar sesión?")) onLogout(); }} className="bg-red-50 p-4 rounded-2xl border border-red-100 shadow-sm flex items-center gap-4 hover:bg-red-100 transition active:scale-[0.98]">
            <div className="bg-white text-red-500 p-3 rounded-xl"><LogOut size={24} /></div>
            <div className="text-left"><h4 className="font-bold text-red-600">Cerrar Sesión</h4><p className="text-xs text-red-400">Salir de la cuenta segura</p></div>
        </button>
      </div>
    </div>
  );
}
// --- VISTA MATRÍCULA (EXCEL COMPLETO) ---
function MatriculaView({ user }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [viewingStudent, setViewingStudent] = useState(null);
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const isSuperAdmin = user.rol === 'super-admin';
  const [statFilters, setStatFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', turn: 'all' });
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [filters, setFilters] = useState({ level: 'all', dx: 'all', gender: 'all', journey: 'all', group: 'all', teacher: 'all' });

  const calculateAge = (dateString) => {
    if (!dateString) return '-';
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

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
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const resized = await resizeImage(file);
      setPhotoPreview(resized);
    } catch (error) { alert("Error imagen"); } finally { setUploading(false); }
  };

  const predictGender = (fullName) => {
      if (!fullName) return '';
      const name = fullName.trim().split(' ')[0].toUpperCase();
      const maleExceptions = ['LUCA', 'LUKA', 'NICOLA', 'ANDREA', 'BAUTISTA', 'SANTINO', 'MATIAS', 'TOMAS', 'LUCAS', 'NICOLAS', 'JOAQUIN', 'AGUSTIN', 'FELIPE', 'ELIAS', 'JONAS', 'TOBIAS', 'ISAIAS', 'NOAH', 'VALENTIN'];
      const femaleExceptions = ['SOL', 'BELEN', 'ABRIL', 'AZUL', 'LUZ', 'PILAR', 'ROCIO', 'TRINIDAD', 'NAHIR', 'RUTH', 'ESTER', 'JAZMIN', 'ZOE', 'MIA', 'UMA'];
      if (maleExceptions.includes(name)) return 'M';
      if (femaleExceptions.includes(name)) return 'F';
      if (name.endsWith('A')) return 'F';
      return 'M';
  };

  const handleNameChange = (e) => {
      const name = e.target.value;
      const guess = predictGender(name);
      const genderSelect = document.getElementById('genderSelect');
      if (genderSelect && guess) {
          genderSelect.value = guess;
      }
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const filteredStudents = students.filter(s => {
    const textMatch = s.firstName?.toLowerCase().includes(filterText.toLowerCase()) || s.lastName?.toLowerCase().includes(filterText.toLowerCase()) || s.dni?.toString().includes(filterText);
    const levelMatch = filters.level === 'all' || s.level === filters.level;
    const dxMatch = filters.dx === 'all' || s.dx === filters.dx;
    const genderMatch = filters.gender === 'all' || s.gender === filters.gender;
    const journeyMatch = filters.journey === 'all' || s.journey === filters.journey;
    const groupMatch = filters.group === 'all' || (s.groupMorning === filters.group) || (s.groupAfternoon === filters.group);
    const teacherMatch = filters.teacher === 'all' || s.teacherMorning?.includes(filters.teacher) || s.teacherAfternoon?.includes(filters.teacher);
    return textMatch && levelMatch && dxMatch && genderMatch && journeyMatch && groupMatch && teacherMatch;
  });

  const statsResults = students.filter(s => {
      const levelMatch = statFilters.level === 'all' || s.level === statFilters.level;
      const dxMatch = statFilters.dx === 'all' || s.dx === statFilters.dx;
      const genderMatch = statFilters.gender === 'all' || s.gender === statFilters.gender;
      const journeyMatch = statFilters.journey === 'all' || s.journey === statFilters.journey;
      let turnMatch = true;
      if (statFilters.turn === 'Mañana') turnMatch = !!s.groupMorning;
      if (statFilters.turn === 'Tarde') turnMatch = !!s.groupAfternoon;
      return levelMatch && dxMatch && genderMatch && journeyMatch && turnMatch;
  });

  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const uniqueTeachers = [...new Set([...students.map(s => s.teacherMorning), ...students.map(s => s.teacherAfternoon)].filter(Boolean))].sort();

  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setShowForm(true); };
  const openEdit = (student) => { setEditingStudent(student); setPhotoPreview(student.photoUrl); setViewingStudent(null); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      firstName: formData.get('firstName'), lastName: formData.get('lastName'), dni: formData.get('dni'),
      birthDate: formData.get('birthDate'), gender: formData.get('gender'), dx: formData.get('dx'),
      journey: formData.get('journey'), level: formData.get('level'), healthInsurance: formData.get('healthInsurance'),
      cudExpiration: formData.get('cudExpiration'), groupMorning: formData.get('groupMorning'),
      teacherMorning: formData.get('teacherMorning'), auxMorning: formData.get('auxMorning'),
      groupAfternoon: formData.get('groupAfternoon'), teacherAfternoon: formData.get('teacherAfternoon'),
      auxAfternoon: formData.get('auxAfternoon'), address: formData.get('address'), motherName: formData.get('motherName'),
      motherContact: formData.get('motherContact'), fatherName: formData.get('fatherName'), fatherContact: formData.get('fatherContact'),
      photoUrl: photoPreview || editingStudent?.photoUrl || '', updatedAt: serverTimestamp()
    };
    try {
      if (editingStudent) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...data, createdAt: serverTimestamp() });
      }
      setShowForm(false); setEditingStudent(null); setPhotoPreview(null);
    } catch (err) { alert("Error: " + err.message); }
  };

  const handleDeleteAll = async () => {
      if(!confirm("⚠️ ¡PELIGRO CRÍTICO! ⚠️\n\nEstás a punto de ELIMINAR TODOS los alumnos.\n¿Seguro?")) return;
      if(!confirm("CONFIRMACIÓN FINAL:\n\nEsta acción NO se puede deshacer.")) return;
      setProcessing(true);
      try {
          const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
          if (snapshot.empty) { alert("Base vacía."); setProcessing(false); return; }
          const deletePromises = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', docSnap.id)));
          await Promise.all(deletePromises);
          alert("✅ Base vaciada.");
      } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const handleBulkImport = async () => {
    try {
      setProcessing(true);
      const data = JSON.parse(importJson);
      if (!Array.isArray(data)) throw new Error("Formato inválido");
      const promises = data.map(s => {
          if (s.lastName && s.firstName) {
            return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...s, createdAt: serverTimestamp() });
          }
          return Promise.resolve();
      });
      await Promise.all(promises);
      alert(`¡Éxito! Importados.`);
      setShowDataManagement(false); setImportJson('');
    } catch (e) { alert("Error JSON: " + e.message); } finally { setProcessing(false); }
  };

  const handleAutoAssignGenders = async () => {
      if(!confirm("¿Detectar y completar géneros faltantes automáticamente?")) return;
      setProcessing(true);
      let count = 0;
      const updates = [];
      for (const s of students) {
          if (!s.gender) {
              const prediction = predictGender(s.firstName);
              if (prediction) {
                  updates.push(updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender: prediction }));
                  count++;
              }
          }
      }
      try { await Promise.all(updates); alert(`✅ ¡Listo! Se completaron ${count} legajos.`); setShowDataManagement(false); } catch (e) { alert("Error: " + e.message); } finally { setProcessing(false); }
  };

  const handleDelete = async (id) => { if(confirm("¿Borrar legajo permanentemente?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); setViewingStudent(null); setEditingStudent(null); setShowForm(false); } };

  // --- EXPORTACIÓN EXCEL COMPLETA (TODOS LOS DATOS) ---
  const exportFiltered = () => {
    if (filteredStudents.length === 0) { alert("No hay datos para exportar."); return; }
    const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Edad", "Fecha Nacimiento", "Género", "DX", "Obra Social", "Vencimiento CUD", "Jornada", "Grupo T. Mañana", "Docente TM", "Auxiliar TM", "Grupo T. Tarde", "Docente TT", "Auxiliar TT", "Dirección", "Madre", "Contacto Madre", "Padre", "Contacto Padre"];
    const csvContent = [
      headers.join(';'), 
      ...filteredStudents.map(s => {
        const age = calculateAge(s.birthDate);
        const fechaNac = s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-';
        const vencCUD = s.cudExpiration ? new Date(s.cudExpiration + 'T00:00:00').toLocaleDateString('es-AR') : '-';
        return [`"${s.lastName || ''}"`,`"${s.firstName || ''}"`,`"${s.dni || ''}"`,`"${s.level || ''}"`,`"${age}"`,`"${fechaNac}"`,`"${s.gender || ''}"`,`"${s.dx || ''}"`,`"${s.healthInsurance || ''}"`,`"${vencCUD}"`,`"${s.journey || ''}"`,`"${s.groupMorning || ''}"`,`"${s.teacherMorning || ''}"`,`"${s.auxMorning || ''}"`,`"${s.groupAfternoon || ''}"`,`"${s.teacherAfternoon || ''}"`,`"${s.auxAfternoon || ''}"`,`"${s.address || ''}"`,`"${s.motherName || ''}"`,`"${s.motherContact || ''}"`,`"${s.fatherName || ''}"`,`"${s.fatherContact || ''}"`].join(';');
      })
    ].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url;
    const fechaHoy = new Date().toLocaleDateString('es-AR').replace(/\//g, '-');
    link.setAttribute('download', `Matrícula_Completa_${fechaHoy}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 rounded-3xl shadow-lg text-white mb-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div><h2 className="text-3xl font-bold flex items-center gap-2"><GraduationCap /> Legajos 2026</h2><p className="text-blue-100 opacity-90">{filteredStudents.length} estudiantes</p></div>
          <div className="flex gap-2">
             {isSuperAdmin && (<><button onClick={() => setShowDataManagement(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><UploadCloud size={20}/> Gestión BD</button><button onClick={() => setShowStats(true)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold border border-white/20"><PieChart size={20}/> Estadísticas</button></>)}
            <button onClick={exportFiltered} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition flex items-center gap-2 text-sm font-bold"><Download size={20}/></button>
            {isSuperAdmin && (<button onClick={openNew} className="bg-white text-blue-600 p-3 rounded-xl shadow-lg hover:bg-blue-50 transition font-bold"><Plus size={24} /></button>)}
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl flex items-center gap-2 border border-white/20">
            <Search className="text-white ml-2 opacity-70" size={20} />
            <input value={filterText} onChange={(e) => setFilterText(e.target.value)} placeholder="Buscar..." className="bg-transparent border-none outline-none text-white placeholder-blue-200 w-full" />
            {filterText && <button onClick={() => setFilterText('')}><X className="text-white opacity-70" size={16}/></button>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
            <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">DX: Todos</option><option value="DI" className="text-gray-800">DI</option><option value="TES" className="text-gray-800">TES</option><option value="Otro" className="text-gray-800">Otro</option></select>
            <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Género: Todos</option><option value="F" className="text-gray-800">Mujer</option><option value="M" className="text-gray-800">Varón</option></select>
            <select value={filters.journey} onChange={e => setFilters({...filters, journey: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Jornada: Todas</option><option value="Simple Mañana" className="text-gray-800">Mañana</option><option value="Simple Tarde" className="text-gray-800">Tarde</option><option value="Doble" className="text-gray-800">Doble</option></select>
            <select value={filters.group} onChange={e => setFilters({...filters, group: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Grupo: Todos</option>{uniqueGroups.map(g => <option key={g} value={g} className="text-gray-800">{g}</option>)}</select>
            <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white/20 text-white border-none rounded-lg text-xs px-2 py-2 outline-none font-bold cursor-pointer hover:bg-white/30"><option value="all" className="text-gray-800">Docente: Todos</option>{uniqueTeachers.map(t => <option key={t} value={t} className="text-gray-800">{t}</option>)}</select>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {filteredStudents.length === 0 ? <div className="text-center py-10 text-gray-400 bg-white rounded-3xl border border-dashed border-gray-200"><Filter size={40} className="mx-auto mb-2 text-gray-200"/><p>No hay coincidencias.</p></div> : filteredStudents.map(s => {
            const age = calculateAge(s.birthDate);
            return (
            <div key={s.id} onClick={() => setViewingStudent(s)} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between group hover:shadow-md transition cursor-pointer active:scale-[0.99]">
              <div className="flex items-center gap-4 w-full">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0 flex items-center justify-center relative">{s.photoUrl ? ( <img src={s.photoUrl} className="w-full h-full object-cover" alt="Foto" /> ) : ( <User className="text-gray-300" size={24} /> )}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between items-start"><h4 className="font-bold text-gray-800 text-lg truncate pr-2">{s.lastName}, {s.firstName}</h4>{s.dx && <span className="bg-purple-100 text-purple-700 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-purple-200 shrink-0">{s.dx}</span>}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-500 mt-1"><span className="bg-gray-100 px-2 py-0.5 rounded font-medium border border-gray-200">{age !== '-' ? `${age} años` : '-'}</span><span className="bg-gray-100 px-2 py-0.5 rounded font-medium border border-gray-200 text-gray-600">{s.level || 'Sin Nivel'}</span>{(s.groupMorning || s.groupAfternoon) && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-bold border border-blue-100">{s.groupMorning || s.groupAfternoon}</span>}</div>
                </div>
              </div>
              <Eye className="text-gray-300 group-hover:text-blue-500 transition ml-3" size={20} />
            </div>
          )})}
      </div>
      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 overflow-y-auto max-h-[90vh]"><div className="flex justify-between items-center mb-4"><h3 className="text-xl font-bold text-gray-800">Gestión de Base de Datos</h3><button onClick={() => setShowDataManagement(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button></div><div className="bg-orange-50 p-4 rounded-xl border border-orange-100 mb-6"><h4 className="font-bold text-orange-800 text-sm mb-2 flex items-center gap-2"><AlertTriangle size={16}/> Zona de Riesgo</h4><button onClick={handleDeleteAll} disabled={processing} className="w-full bg-white border border-red-200 text-red-600 font-bold py-2 rounded-lg text-sm hover:bg-red-50 transition flex items-center justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={16}/> : <Trash2 size={16}/>} ELIMINAR TODOS LOS ALUMNOS</button></div><h4 className="font-bold text-gray-800 text-sm mb-2">Herramientas</h4><div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mb-6"><p className="text-xs text-blue-800 mb-3">Si importaste datos sin género, usa esto para detectarlo automáticamente.</p><button onClick={handleAutoAssignGenders} disabled={processing} className="w-full bg-white border border-blue-200 text-blue-700 font-bold py-2 rounded-lg text-sm hover:bg-blue-100 transition flex items-center justify-center gap-2">{processing ? <RefreshCw className="animate-spin" size={16}/> : <><Users size={16}/> ✨ Auto-completar Géneros</>}</button></div><h4 className="font-bold text-gray-800 text-sm mb-2">Importar Nuevos Datos (JSON)</h4><textarea value={importJson} onChange={e => setImportJson(e.target.value)} placeholder='[ { "firstName": "Juan"... } ]' className="w-full h-40 p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-400"></textarea><div className="flex gap-3 mt-4"><button onClick={() => setShowDataManagement(false)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button onClick={handleBulkImport} disabled={processing || !importJson} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg flex justify-center items-center gap-2">{processing ? <RefreshCw className="animate-spin" /> : <><UploadCloud size={20} /> Procesar Datos</>}</button></div></div></div>
      )}
      {showStats && (
        <div className="fixed inset-0 bg-violet-900/80 backdrop-blur-md z-[60] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 overflow-hidden"><div className="p-6 border-b bg-gray-50 flex justify-between items-center"><div><h2 className="text-2xl font-bold text-violet-900 flex items-center gap-2"><PieChart/> Calculadora de Matrícula</h2><p className="text-gray-500 text-xs">Cruza datos para obtener cifras exactas</p></div><button onClick={() => setShowStats(false)} className="bg-white p-2 rounded-full hover:bg-gray-100 shadow-sm"><X size={24}/></button></div><div className="p-6 bg-white border-b border-gray-100"><div className="grid grid-cols-2 md:grid-cols-5 gap-3"><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Nivel</label><select value={statFilters.level} onChange={e => setStatFilters({...statFilters, level: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Diagnóstico</label><select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Género</label><select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todos</option><option value="M">Varones</option><option value="F">Mujeres</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Jornada</label><select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select></div><div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">Turno Asist.</label><select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg text-sm font-bold text-gray-700 outline-none border focus:border-violet-500"><option value="all">Indistinto</option><option value="Mañana">Va a la Mañana</option><option value="Tarde">Va a la Tarde</option></select></div></div></div><div className="flex-1 overflow-y-auto bg-gray-50 p-6"><div className="bg-gradient-to-br from-violet-600 to-indigo-600 rounded-3xl p-8 text-white shadow-lg flex items-center justify-between mb-8"><div><p className="text-violet-200 font-medium text-lg mb-1">Coincidencias encontradas</p><h3 className="text-6xl font-extrabold tracking-tight">{statsResults.length}</h3><p className="text-sm opacity-60 mt-2">Estudiantes que cumplen con <b>todos</b> los criterios.</p></div><div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm"><PieChart size={64} className="text-white opacity-80" /></div></div><h3 className="font-bold text-gray-800 mb-4 ml-1 flex items-center gap-2"><List size={18}/> Detalle del Grupo Seleccionado</h3>{statsResults.length === 0 ? (<div className="text-center py-12 text-gray-400 bg-white rounded-2xl border border-dashed"><p>No hay alumnos con esa combinación exacta.</p></div>) : (<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">{statsResults.map(s => (<div key={s.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}</div><div className="min-w-0"><p className="font-bold text-gray-800 text-sm truncate">{s.lastName}, {s.firstName}</p><p className="text-xs text-gray-500 flex gap-1"><span>{s.level}</span> • <span className="font-bold text-violet-600">{s.dx}</span></p></div></div>))}</div>)}</div></div></div>
      )}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[90vh]"><div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0"><button onClick={() => setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-1 rounded-full transition"><X size={20}/></button><div className="flex items-center gap-4"><div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center">{viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}</div><div><h2 className="text-2xl font-bold">{viewingStudent.lastName}, {viewingStudent.firstName}</h2><p className="opacity-90 flex gap-2 text-sm mt-1"><span className="bg-white/20 px-2 py-0.5 rounded">{calculateAge(viewingStudent.birthDate)} años</span><span className="bg-white/20 px-2 py-0.5 rounded">{viewingStudent.dni}</span></p></div></div></div><div className="p-6 overflow-y-auto space-y-6"><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Nivel</p><p className="font-bold text-gray-800">{viewingStudent.level || '-'}</p></div><div className="bg-purple-50 p-3 rounded-xl border border-purple-100"><p className="text-xs text-purple-400 font-bold uppercase">DX</p><p className="font-bold text-purple-800">{viewingStudent.dx || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Género</p><p className="font-bold text-gray-800">{viewingStudent.gender || '-'}</p></div><div className="bg-gray-50 p-3 rounded-xl border border-gray-100"><p className="text-xs text-gray-400 font-bold uppercase">Jornada</p><p className="font-bold text-gray-800">{viewingStudent.journey || '-'}</p></div></div><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Briefcase size={18} className="text-blue-500"/> Escolaridad 2026</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupMorning || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherMorning || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxMorning || '-'}</p></div></div><div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><div className="space-y-2 text-sm"><p><span className="text-gray-500 font-bold">Grupo:</span> {viewingStudent.groupAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Docente:</span> {viewingStudent.teacherAfternoon || '-'}</p><p><span className="text-gray-500 font-bold">Auxiliar:</span> {viewingStudent.auxAfternoon || '-'}</p></div></div></div></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-6"><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><Activity size={18} className="text-green-500"/> Salud</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Obra Social</span> {viewingStudent.healthInsurance || 'No declara'}</p><p><span className="text-gray-500 font-bold block text-xs uppercase">Vencimiento CUD</span> {viewingStudent.cudExpiration ? formatDate(viewingStudent.cudExpiration) : '-'}</p></div></div><div className="space-y-3"><h3 className="font-bold text-gray-900 flex items-center gap-2"><User size={18} className="text-orange-500"/> Familia</h3><div className="bg-white p-4 rounded-xl border border-gray-100 text-sm space-y-2 shadow-sm"><p><span className="text-gray-500 font-bold block text-xs uppercase">Madre</span> {viewingStudent.motherName} <span className="text-gray-400">({viewingStudent.motherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Padre</span> {viewingStudent.fatherName} <span className="text-gray-400">({viewingStudent.fatherContact})</span></p><p><span className="text-gray-500 font-bold block text-xs uppercase">Dirección</span> {viewingStudent.address}</p></div></div></div></div><div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">{isSuperAdmin && (<button onClick={() => openEdit(viewingStudent)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition shadow-lg"><Edit3 size={18}/> Editar Ficha</button>)}</div></div></div>
      )}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-2xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto"><h3 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{editingStudent ? 'Editar Ficha' : 'Nueva Ficha'}</h3><form onSubmit={handleSave} className="space-y-6"><div className="flex gap-4 flex-col sm:flex-row"><div className="flex flex-col items-center gap-2"><div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden relative group cursor-pointer">{photoPreview ? <img src={photoPreview} className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400 text-center px-2">Subir Foto</span>}<input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 opacity-0 cursor-pointer" />{uploading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><RefreshCw className="text-white animate-spin" /></div>}</div></div><div className="flex-1 space-y-3"><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Apellido *</label><input name="lastName" defaultValue={editingStudent?.lastName || ''} required className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nombre *</label><input name="firstName" defaultValue={editingStudent?.firstName || ''} required onChange={handleNameChange} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div></div><div className="grid grid-cols-3 gap-3"><div><label className="text-xs font-bold text-gray-500">DNI</label><input name="dni" type="number" defaultValue={editingStudent?.dni || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Nacimiento</label><input name="birthDate" type="date" defaultValue={editingStudent?.birthDate || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none" /></div><div><label className="text-xs font-bold text-gray-500">Género</label><select id="genderSelect" name="gender" defaultValue={editingStudent?.gender || ''} className="w-full p-2 bg-gray-50 rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="M">Varón</option><option value="F">Mujer</option></select></div></div></div></div><div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 space-y-3"><p className="text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1"><Activity size={12}/> Datos Institucionales</p><div className="grid grid-cols-2 gap-3"><div><label className="text-xs font-bold text-gray-500">Nivel</label><select name="level" defaultValue={editingStudent?.level || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option><option value="TALLER">Taller</option><option value="Pre-Taller">Pre-Taller</option><option value="FINES">Fines</option></select></div><div><label className="text-xs font-bold text-gray-500">Jornada</label><select name="journey" defaultValue={editingStudent?.journey || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Seleccionar</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble Jornada</option></select></div><div><label className="text-xs font-bold text-gray-500">Diagnóstico</label><select name="dx" defaultValue={editingStudent?.dx || ''} className="w-full p-2 bg-white rounded-lg border focus:ring-2 focus:ring-blue-400 outline-none"><option value="">Ninguno</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select></div></div></div><div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100 space-y-3"><p className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1"><GraduationCap size={12}/> Ubicación 2026</p><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO MAÑANA</p><div className="grid grid-cols-3 gap-2"><input name="groupMorning" defaultValue={editingStudent?.groupMorning || ''} placeholder="Grupo TM" className="p-2 bg-white rounded border text-xs outline-none" /><input name="teacherMorning" defaultValue={editingStudent?.teacherMorning || ''} placeholder="Docente TM" className="p-2 bg-white rounded border text-xs outline-none" /><input name="auxMorning" defaultValue={editingStudent?.auxMorning || ''} placeholder="Auxiliar TM" className="p-2 bg-white rounded border text-xs outline-none" /></div></div><div className="bg-white/50 p-2 rounded-lg border border-indigo-100"><p className="text-[10px] font-bold text-indigo-400 mb-2">TURNO TARDE</p><div className="grid grid-cols-3 gap-2"><input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon || ''} placeholder="Grupo TT" className="p-2 bg-white rounded border text-xs outline-none" /><input name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon || ''} placeholder="Docente TT" className="p-2 bg-white rounded border text-xs outline-none" /><input name="auxAfternoon" defaultValue={editingStudent?.auxAfternoon || ''} placeholder="Auxiliar TT" className="p-2 bg-white rounded border text-xs outline-none" /></div></div></div><div className="space-y-3 pt-2 border-t border-gray-100"><p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Salud y Familia</p><div className="grid grid-cols-2 gap-3"><input name="healthInsurance" defaultValue={editingStudent?.healthInsurance || ''} placeholder="Obra Social" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="cudExpiration" type="date" defaultValue={editingStudent?.cudExpiration || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><input name="address" defaultValue={editingStudent?.address || ''} className="w-full p-2 bg-gray-50 rounded-lg border outline-none" placeholder="Dirección" /><div className="grid grid-cols-2 gap-3"><input name="motherName" defaultValue={editingStudent?.motherName || ''} placeholder="Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="motherContact" defaultValue={editingStudent?.motherContact || ''} placeholder="Contacto Madre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div><div className="grid grid-cols-2 gap-3"><input name="fatherName" defaultValue={editingStudent?.fatherName || ''} placeholder="Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /><input name="fatherContact" defaultValue={editingStudent?.fatherContact || ''} placeholder="Contacto Padre" className="w-full p-2 bg-gray-50 rounded-lg border outline-none" /></div></div><div className="flex gap-3 mt-6 pt-4 border-t border-gray-100"><button type="button" onClick={() => {setShowForm(false); setEditingStudent(null); setPhotoPreview(null);}} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl">Cancelar</button><button type="submit" className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg">Guardar</button>{editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition"><Trash2 size={20}/></button>}</div></form></div></div>
      )}
    </div>
  );
}













