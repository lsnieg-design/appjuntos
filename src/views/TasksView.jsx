import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, serverTimestamp, increment 
} from 'firebase/firestore';


export function TasksView({ tasks = [], user, db, appId }) {
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

 // BUSCÁ ESTA LÍNEA (alrededor de la 1320):
const handleSaveTask = async (e) => {  // <--- ASEGURATE QUE DIGA "async" AQUÍ
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

        // --- LÓGICA DE PUNTOS DE MAYO (La que causaba el error) ---
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(5) });
        }
      }
      setShowModal(false); setEditingTask(null); setSelectedUsersObj([]); setSelectedRoles([]);
      alert("✅ Tarea guardada");
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

      // --- PARCHE PUNTOS MAYO ---
      if (new Date() >= new Date('2026-05-01')) {
          const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
          await updateDoc(userRef, { score: increment(5) });
      }
      // --------------------------

      setNewComment("");
      alert("💬 Respuesta enviada (+5 pts)");
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
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus });
      
      // --- SUMAR PUNTOS POR TERMINAR LA TAREA ---
      if (newStatus === 'completed') {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        await updateDoc(userRef, { score: increment(10) });
        alert("🎉 ¡Tarea completada! Sumaste 10 puntos.");
      }
    } catch (err) { alert(err.message); }
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
