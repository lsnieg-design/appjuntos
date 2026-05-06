import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  Calendar as CalendarIcon, CheckSquare, User, FileText, 
  RefreshCw, Plus, Trash2, Users, Grid, ChevronRight, 
  ChevronLeft, Printer, MessageSquare, Send, Folder, 
  Edit3, Star, X, Search, LayoutDashboard, AlertTriangle
} from 'lucide-react';
import { 
  doc, updateDoc, collection, query, orderBy, 
  onSnapshot, addDoc, serverTimestamp, increment, where 
} from 'firebase/firestore';

export function GroupsView({ user, db, appId, setActiveTab }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [groupMessages, setGroupMessages] = useState({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [informeEpoca, setInformeEpoca] = useState(1);
  const [editingGroup, setEditingGroup] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printColumns, setPrintColumns] = useState({
    dni: true, birthDate: true, healthInsurance: false, contacts: true, photo: false
  });

  const scrollRef = useRef(null);
  const scroll = (direction) => { 
    if (scrollRef.current) { 
      const amount = 350; 
      scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); 
    } 
  };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
  const LOGO_URL = "/icon-192.png";

  useEffect(() => {
    if (!db || !appId) return;

    // 1. Carga de Estudiantes
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { 
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    // 2. Carga de Usuarios para asignación de Staff
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { 
      setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    // 3. Carga del Mural (Chat de Grupos)
    const qGM = query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc'));
    const unsubGM = onSnapshot(qGM, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const groupedMsgs = msgs.reduce((acc, m) => {
        if (!acc[m.groupName]) acc[m.groupName] = [];
        acc[m.groupName].push(m);
        return acc;
      }, {});
      setGroupMessages(groupedMsgs);
    });

    return () => { unsubS(); unsubU(); unsubGM(); };
  }, [db, appId]);

  // --- LÓGICA DE AGRUPAMIENTO ---
  const groupedData = students.reduce((acc, s) => {
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    if (s.modality === 'Inclusión') {
      const dais = [...new Set([s.daiMorning, s.daiAfternoon].filter(Boolean))];
      dais.forEach(daiName => {
        const groupKey = `DAI: ${daiName}`;
        if (!acc[groupKey]) {
          acc[groupKey] = { name: groupKey, students: [], teacher: daiName, teacherId: s.daiId, isInclusionGroup: true };
        }
        if (!acc[groupKey].students.find(x => x.id === s.id)) acc[groupKey].students.push(s);
      });
    } else {
      const groupName = s[`group${suf}`];
      if (!groupName) return acc;
      const groupKey = groupName.trim();
      if (!acc[groupKey]) {
        acc[groupKey] = { 
          name: groupKey, students: [], 
          teacher: s[`teacher${suf}`], teacherId: s[`teacherId${suf}`],
          teacher2: s[`teacher2${suf}`], teacherId2: s[`teacherId2${suf}`],
          aux: s[`aux${suf}`], auxId: s[`auxId${suf}`],
          special1: s[`special1${suf}`], special1Id: s[`special1Id${suf}`],
          special2: s[`special2${suf}`], special2Id: s[`special2Id${suf}`],
          special3: s[`special3${suf}`], special3Id: s[`special3Id${suf}`],
          sup1: s[`sup1${suf}`], sup1Id: s[`sup1Id${suf}`],
          sup2: s[`sup2${suf}`], sup2Id: s[`sup2Id${suf}`],
          classroom: s.classroom, driveLink: s[`driveLink${suf}`], 
          institucionalDrive: s.institucionalDrive, isInclusionGroup: false 
        };
      }
      acc[groupKey].students.push(s);
    }
    return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name));

  // Filtro de Visibilidad por Rol
  if (!isManagement) {
    groups = groups.filter(g => {
      const uId = user.id;
      const staffIds = [g.teacherId, g.teacherId2, g.auxId, g.special1Id, g.special2Id, g.special3Id, g.sup1Id, g.sup2Id];
      return staffIds.includes(uId) || g.students.some(s => s.daiId === uId);
    });
  } else if (viewFilter !== 'all') {
    groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup);
  }

  // --- FUNCIONES DE ACCIÓN ---
  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setUpdatingGroup(true);
    const fd = new FormData(e.target);
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const getName = (id) => usersList.find(u => u.id === id)?.fullName || "";

    const updates = {
      [`group${suf}`]: fd.get('groupName'),
      classroom: fd.get('classroom'),
      [`teacherId${suf}`]: fd.get('teacherId'),
      [`teacher${suf}`]: getName(fd.get('teacherId')),
      [`auxId${suf}`]: fd.get('auxId'),
      [`aux${suf}`]: getName(fd.get('auxId')),
      [`driveLink${suf}`]: fd.get('driveLink'),
      institucionalDrive: fd.get('institucionalDrive')
    };

    try {
      const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates));
      await Promise.all(promises);
      setEditingGroup(null);
    } catch (err) { alert(err.message); }
    finally { setUpdatingGroup(false); }
  };

  const handleAddGroupComment = async (e, groupName) => {
    e.preventDefault();
    const text = e.target.comment.value;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), {
        groupName, text, author: user.firstName, authorId: user.id, createdAt: serverTimestamp()
      });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };

  const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const nextStatus = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { [campo]: { status: nextStatus } });
      if (new Date() >= new Date('2026-05-01')) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(5) });
      }
    } catch (e) { console.error(e); }
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      {/* HEADER DE GRUPOS */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2">
              <Grid size={24} className="text-orange-500"/> Mi Aula
            </h2>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Gestión de Grupos y Seguimiento</p>
          </div>
          <div className="flex gap-2">
            {isManagement && (
              <button onClick={() => { setGroupsToPrint(groups); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2.5 rounded-xl hover:bg-violet-200 transition">
                <Printer size={20}/>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-2">
          <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
            <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
            <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
          </div>
          {isManagement && (
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button onClick={() => setViewFilter('sede')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button>
              <button onClick={() => setViewFilter('inclusion')} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button>
            </div>
          )}
        </div>
      </div>

      {/* CARRUSEL DE TARJETAS */}
      <div className="relative flex-1 overflow-hidden">
        <div ref={scrollRef} className="h-full overflow-x-auto p-6 flex gap-6 items-start no-scrollbar">
          {groups.map((g) => (
            <div key={g.name} className="min-w-[320px] bg-white rounded-[35px] border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-full transition hover:shadow-lg group">
              <div className={`p-5 border-b-4 relative ${turn==='morning'?'bg-orange-50 border-orange-400':'bg-indigo-50 border-indigo-400'}`}>
                <div className="absolute top-4 right-4 flex gap-1">
                   <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition active:scale-95"><Plus size={16}/></button>
                   {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-500 transition"><Edit3 size={14}/></button>}
                </div>
                <h3 className="font-black text-slate-800 text-lg uppercase leading-none mb-1">{g.name}</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">Doc: {g.teacher || 'Vacante'}</p>
                {g.classroom && <p className="text-[10px] font-black text-orange-600 uppercase mt-1">Aula {g.classroom}</p>}
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                {g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
                  <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between hover:bg-violet-50 transition-all cursor-pointer border border-transparent hover:border-violet-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-slate-400 border border-slate-200 uppercase text-sm">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}
                      </div>
                      <span className="font-bold text-xs text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300"/>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* VISTA DETALLE ESTUDIANTE */}
      {selectedStudent && (
        <StudentDetailView 
          student={selectedStudent} user={user} db={db} appId={appId}
          onClose={() => setSelectedStudent(null)} 
          onEdit={() => setActiveTab('matricula')}
        />
      )}

      {/* PANEL DE CONTROL DE GRUPO (CHAT + INFORMES) */}
      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in duration-300">
           <div className="p-4 border-b flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-violet-600 text-white p-2 rounded-xl"><Users size={20}/></div>
                <h2 className="text-xl font-black uppercase italic text-slate-800">{selectedGroupDetails.name}</h2>
              </div>
              <button onClick={() => setSelectedGroupDetails(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
           </div>
           
           <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              {/* IZQUIERDA: INFORMES */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase border border-emerald-100 flex items-center justify-center gap-2"><Folder size={18}/> Fotos</button>
                    <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-[10px] uppercase border border-blue-100 flex items-center justify-center gap-2"><FileText size={18}/> Documentación</button>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                    {[1, 2, 3].map(n => (
                      <button key={n} onClick={() => setInformeEpoca(n)} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${informeEpoca === n ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Informe {n}</button>
                    ))}
                </div>
                <div className="space-y-3">
                  {selectedGroupDetails.students.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-4 bg-white rounded-3xl border-2 border-slate-100">
                      <span className="font-black text-xs text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
                      <button onClick={() => handleToggleInformeGrupo(s, informeEpoca)} className={`px-5 py-3 rounded-xl text-[10px] font-black uppercase text-white shadow-md ${
                        (s[`informe${informeEpoca}`]?.status === 'Pendiente' || !s[`informe${informeEpoca}`]) ? 'bg-slate-300' : 
                        s[`informe${informeEpoca}`]?.status === 'Hecho' ? 'bg-blue-500' :
                        s[`informe${informeEpoca}`]?.status === 'Impreso' ? 'bg-violet-600' :
                        s[`informe${informeEpoca}`]?.status === 'Enviado' ? 'bg-orange-500' : 'bg-emerald-600'
                      }`}>
                        {s[`informe${informeEpoca}`]?.status || 'Pendiente'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* DERECHA: MURAL CHAT */}
              <div className="w-full lg:w-[450px] bg-slate-50 border-l border-slate-200 flex flex-col">
                  <div className="p-4 bg-white border-b flex items-center gap-2 shrink-0">
                    <MessageSquare size={18} className="text-orange-500"/>
                    <span className="font-black text-[10px] uppercase text-slate-800 italic">Muro de Intercambio</span>
                  </div>
                  <div className="flex-1 overflow-y-auto p-5 flex flex-col-reverse space-y-3 custom-scrollbar">
                      {groupMessages[selectedGroupDetails.name]?.map(m => (
                        <div key={m.id} className={`max-w-[85%] p-3 rounded-2xl text-xs shadow-sm ${m.authorId === user.id ? 'bg-violet-600 text-white self-end rounded-tr-none' : 'bg-white text-slate-700 self-start rounded-tl-none border border-slate-200'}`}>
                          <p className="text-[8px] font-black uppercase opacity-60 mb-1">{m.author}</p>
                          <p className="font-medium leading-tight">{m.text}</p>
                        </div>
                      ))}
                  </div>
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="p-4 bg-white border-t flex gap-2">
                    <input name="comment" autoComplete="off" placeholder="Escribir novedad..." className="flex-1 p-3 bg-slate-100 rounded-xl text-sm font-bold outline-none border-2 border-transparent focus:border-violet-200" />
                    <button type="submit" className="bg-orange-500 text-white p-3 rounded-xl shadow-lg hover:scale-105 transition"><Send size={20}/></button>
                  </form>
              </div>
           </div>
        </div>
      )}

      {/* DIALOGO DE EDICIÓN DE GRUPO (SOLO GESTIÓN) */}
      {editingGroup && (
         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
               <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3>
                  <button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button>
               </div>
               <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Nombre Grupo</label>
                    <input name="groupName" defaultValue={editingGroup.name} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm uppercase outline-none focus:ring-2 ring-violet-100" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Docente Titular</label>
                    <select name="teacherId" defaultValue={editingGroup.teacherId || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs uppercase outline-none">
                      <option value="">Seleccionar...</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Aula Física</label>
                    <input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-emerald-600 uppercase ml-1">Carpeta de Fotos (Drive)</label>
                    <input name="driveLink" defaultValue={editingGroup.driveLink || ""} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 outline-none" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Drive Documentación</label>
                    <input name="institucionalDrive" defaultValue={editingGroup.institucionalDrive || ""} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-800 outline-none" />
                  </div>
                  <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4 hover:bg-violet-700 transition">
                    {updatingGroup ? "Guardando..." : "Aplicar Cambios"}
                  </button>
               </div>
            </form>
         </div>
      )}
    </div>
  );
}
