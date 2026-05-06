import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  User, FileText, Plus, Users, Grid, ChevronRight, ChevronLeft, Printer, MessageSquare, Send, Folder, Edit3, X, Search, GraduationCap, Activity 
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, increment, where } from 'firebase/firestore';

export function GroupsView({ user, db, appId, setActiveTab, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]); 
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fullFileStudent, setFullFileStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [groupMessages, setGroupMessages] = useState({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [informeEpoca, setInformeEpoca] = useState(1);
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printColumns, setPrintColumns] = useState({
    dni: true, birthDate: true, healthInsurance: false, contacts: true, photo: false
  });
  

  const scrollRef = useRef(null);
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';

  const INCIDENT_TYPES = [
    { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
    { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
  ];

 useEffect(() => {
    if (!db || !appId) return;
    const unsubS = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true)), (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubU = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc')), (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubGM = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc')), (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setGroupMessages(msgs.reduce((acc, m) => { if (!acc[m.groupName]) acc[m.groupName] = []; acc[m.groupName].push(m); return acc; }, {}));
    });
    return () => { unsubS(); unsubU(); unsubGM(); };
  }, [db, appId]);

  // --- LÓGICA DE AGRUPAMIENTO OPTIMIZADA ---
  const gruposFinales = React.useMemo(() => {
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const grouped = students.reduce((acc, s) => {
      const gName = s[`group${suf}`];
      if (!gName) return acc;
      if (!acc[gName]) {
        acc[gName] = { 
          name: gName, 
          students: [], 
          teacher: s[`teacher${suf}`], 
          teacherId: s[`teacherId${suf}`],
          aux: s[`aux${suf}`] || 'S/D',
          classroom: s.classroom, 
          driveLink: s[`driveLink${suf}`], 
          institucionalDrive: s.institucionalDrive 
        };
      }
      acc[gName].students.push(s);
      return acc;
    }, {});
    return Object.values(grouped).sort((a, b) => 
      a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name)
    );
  }, [students, turn]);

  // --- FUNCIONES DE ACCIÓN ---

  const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    let h = `<html><head><style>
      body{font-family:sans-serif; padding:20px;}
      .header{background:#f3f4f6; padding:15px; border-left:5px solid #7c3aed; margin-bottom:10px; border-radius: 0 15px 15px 0;}
      .header h2 { margin: 0; color: #7c3aed; text-transform: uppercase; font-size: 18px; }
      .staff-info { margin-top: 5px; font-size: 11px; font-weight: bold; color: #444; text-transform: uppercase; }
      table{width:100%; border-collapse:collapse; font-size:10px; margin-top: 10px;}
      th{background:#7c3aed; color:white; padding:5px; text-align:left; text-transform:uppercase;}
      td{border:1px solid #ddd; padding:5px;}
      .photo-img{width:30px; height:30px; object-fit:cover; border-radius:4px;}
    </style></head><body>`;

    groupsList.forEach(g => {
        const staff = g.students[0] || {};
        const turnoTexto = turn === 'morning' ? 'TURNO MAÑANA' : 'TURNO TARDE';
        const auxNombre = turn === 'morning' ? (staff.auxMorning || 'S/D') : (staff.auxAfternoon || 'S/D');
        h += `<div class="header"><h2>${g.name}</h2><div class="staff-info">DOCENTE: ${g.teacher || 'S/D'} | AUX/PRECEP: ${auxNombre} | JORNADA: ${turnoTexto}</div></div>
        <table><thead><tr><th>#</th>${printColumns.photo ? '<th>Foto</th>' : ''}<th>Nombre y Apellido</th>${printColumns.dni ? '<th>DNI</th>' : ''}${printColumns.birthDate ? '<th>Nacimiento</th>' : ''}${printColumns.healthInsurance ? '<th>OS</th>' : ''}${printColumns.contacts ? '<th>Familia</th>' : ''}</tr></thead><tbody>`;
        g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).forEach((s, i) => {
            h += `<tr><td>${i+1}</td>${printColumns.photo ? `<td>${s.photoUrl ? `<img src="${s.photoUrl}" class="photo-img"/>` : '-'}</td>` : ''}<td><b>${s.lastName}, ${s.firstName}</b></td>${printColumns.dni ? `<td>${s.dni || '-'}</td>` : ''}${printColumns.birthDate ? `<td>${s.birthDate || '-'}</td>` : ''}${printColumns.healthInsurance ? `<td>${s.healthInsurance || '-'}</td>` : ''}${printColumns.contacts ? `<td>M: ${s.motherContact || '-'} / P: ${s.fatherContact || '-'}</td>` : ''}</tr>`;
        });
        h += `</tbody></table><br/>`;
    });
    h += `</body></html>`;
    const docIframe = iframe.contentWindow.document; docIframe.open(); docIframe.write(h); docIframe.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };

  const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const proximo = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { 
        [campo]: { status: proximo, updatedAt: new Date().toISOString() } 
      });
      const nuevosEstudiantes = selectedGroupDetails.students.map(s => s.id === estudiante.id ? { ...s, [campo]: { status: proximo } } : s);
      setSelectedGroupDetails({ ...selectedGroupDetails, students: nuevosEstudiantes });
    } catch (e) { console.error(e); }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault(); 
    if (!editingGroup) return; 
    setUpdatingGroup(true);
    const fd = new FormData(e.target);
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const getName = (id) => usersList.find(u => u.id === id)?.fullName || "";
    const updates = { 
      [`group${suf}`]: fd.get('groupName'), 
      classroom: fd.get('classroom'),
      [`teacherId${suf}`]: fd.get('teacher'),
      [`teacher${suf}`]: getName(fd.get('teacher')),
      [`teacherId2${suf}`]: fd.get('teacher2Id'),
      [`teacher2${suf}`]: getName(fd.get('teacher2Id')),
      [`auxId${suf}`]: fd.get('auxId'),
      [`aux${suf}`]: getName(fd.get('auxId')),
      [`driveLink${suf}`]: fd.get('driveLink'),
      institucionalDrive: fd.get('institucionalDrive')
    };
    try {
      const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates));
      await Promise.all(promises);
      setEditingGroup(null);
      alert("✅ Datos del grupo actualizados.");
    } catch (err) { alert("Error: " + err.message); } finally { setUpdatingGroup(false); }
  };

  const handleSaveIncident = async (type, severity = "medium", text = "") => {
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;
    setSavingIncident(true);
    try {
      const entry = { date: new Date().toISOString(), type: text ? "Nota" : type, severity, text: text || type, author: user.fullName || user.firstName, authorId: user.id };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id), { incidents: arrayUnion(entry) });
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(10) });
      setShowBitacoraModal(null); setIsWriting(false); setNewNote("");
      alert("✅ Registro guardado.");
    } catch (e) { alert(e.message); } finally { setSavingIncident(false); }
  };

  const handleAddGroupComment = async (e, groupName) => {
    e.preventDefault();
    const text = e.target.comment.value;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), { groupName, text, author: user.firstName, authorId: user.id, createdAt: serverTimestamp() });
      e.target.reset();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div><h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2></div>
          <button onClick={() => { setGroupsToPrint(gruposFinales); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2.5 rounded-xl hover:bg-violet-200 transition shadow-sm"><Printer size={24}/></button>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-xl mx-2">
          <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'morning' ? 'bg-white text-orange-50 shadow-sm' : 'text-gray-400'}`}>☀️ MAÑANA</button>
          <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 TARDE</button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
  <div ref={scrollRef} className="h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start no-scrollbar">
    {gruposFinales.map((g) => (
      <div key={g.name} className="flex flex-col min-w-[320px] bg-white rounded-[35px] border border-gray-200 shadow-sm overflow-hidden h-[calc(100vh-250px)]">
        {/* CABECERA DE TARJETA */}
        <div className={`p-5 border-b-4 relative ${turn === 'morning' ? 'border-orange-400 bg-orange-50' : 'border-indigo-400 bg-indigo-50'}`}>
          <div className="absolute top-4 right-4 flex gap-1">
            <button onClick={() => { setGroupsToPrint([g]); setShowPrintOptions(true); }} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
            <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition active:scale-95"><Plus size={16}/></button>
            {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
          </div>
          
          <h3 className="font-black text-slate-800 text-lg leading-tight pr-16 uppercase">{g.name}</h3>
          
          {/* ETIQUETAS */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="bg-white/80 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase shadow-sm border border-violet-100">
              {g.students.length} Estudiantes
            </span>
            {g.classroom && (
              <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md text-[9px] font-black border border-orange-200 uppercase">
                Aula {g.classroom}
              </span>
            )}
          </div>

          {/* STAFF RESPONSABLE */}
          <div className="mt-3 space-y-1">
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <User size={10} className="text-violet-500"/> Doc: <span className="text-slate-800 font-black">{g.teacher || 'Sin asignar'}</span>
            </p>
            <p className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Users size={10} className="text-orange-500"/> Aux: <span className="text-slate-800 font-black">{g.aux || 'S/D'}</span>
            </p>
          </div>
        </div>

        {/* LISTADO DE ALUMNOS */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 space-y-2 content-start">
          {g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
            <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer border border-transparent hover:border-violet-100 transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 text-sm overflow-hidden">
                  {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover transition-transform group-hover:scale-110"/> : s.firstName[0]}
                </div>
                <span className="font-bold text-xs text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
              </div>
              <button 
                onClick={(e) => {
                  e.stopPropagation(); 
                  setShowBitacoraModal(s); 
                  setIsWriting(false);
                }} 
                className="w-8 h-8 bg-violet-50 text-violet-400 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition-colors"
              >
                ⚡
              </button>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
</div>

      {selectedStudent && (
        <StudentDetailView student={selectedStudent} user={user} db={db} appId={appId} onClose={() => setSelectedStudent(null)} onEdit={(s) => { setSelectedStudent(null); setFullFileStudent(s); }} />
      )}

      {fullFileStudent && (
        <div className="fixed inset-0 bg-black/80 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-4xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95">
            <div className="p-5 bg-slate-900 text-white flex justify-between items-center shrink-0">
               <div className="flex items-center gap-3"><div className="bg-orange-500 p-2 rounded-xl"><GraduationCap size={20}/></div><h3 className="font-black uppercase italic tracking-tighter">Legajo Digital: {fullFileStudent.lastName}, {fullFileStudent.firstName}</h3></div>
               <button onClick={() => setFullFileStudent(null)} className="p-2 bg-white/10 rounded-full hover:bg-red-500"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-y-auto bg-gray-100 p-6 no-scrollbar">
               <div className="bg-white rounded-[35px] p-8 shadow-sm border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <h4 className="text-orange-600 font-black text-[10px] uppercase border-b-2 border-orange-100 pb-1 flex items-center gap-2"><User size={14}/> Identidad</h4>
                      <p className="text-sm"><b>DNI:</b> <span>{fullFileStudent.dni || '-'}</span></p>
                      <p className="text-sm"><b>DX:</b> <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-black uppercase">{fullFileStudent.dx || 'S/D'}</span></p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-blue-600 font-black text-[10px] uppercase border-b-2 border-blue-100 pb-1 flex items-center gap-2"><Users size={14}/> Familia</h4>
                      <p className="text-sm"><b>Madre:</b> <span>{fullFileStudent.motherName || '-'}</span></p>
                    </div>
                  </div>
               </div>
            </div>
            <div className="p-5 bg-white border-t flex justify-center"><button onClick={() => setFullFileStudent(null)} className="px-10 py-4 bg-slate-800 text-white rounded-2xl font-black uppercase text-xs">Cerrar Legajo</button></div>
          </div>
        </div>
      )}

      {showBitacoraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl border-t-8 border-emerald-500 animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-4">
              <div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">{showBitacoraModal.firstName}</p></div>
              <button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            {!isWriting ? (
              <div className="grid grid-cols-2 gap-3">
                {INCIDENT_TYPES.map((type) => (
                  <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}>
                    <span className="text-2xl">{type.emoji}</span>
                    <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="¿Qué pasó?..." className="w-full p-4 bg-gray-50 border rounded-2xl text-sm mb-3 h-32 outline-none" />
                <div className="flex gap-2">
                  <button onClick={() => setIsWriting(false)} className="flex-1 py-4 text-gray-400 font-black uppercase text-[10px]">Cancelar</button>
                  <button onClick={() => handleSaveIncident("Nota", "medium", newNote)} disabled={!newNote.trim() || savingIncident} className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg">Guardar</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

     {/* 4. PANEL ENFOQUE GRUPO (CHAT + INFORMES RE-DISEÑADO) */}
      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-slate-100 z-[500] flex flex-col animate-in fade-in">
          {/* CABECERA FIJA */}
          <div className="p-4 border-b-4 border-violet-100 flex justify-between items-center bg-white shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-violet-600 text-white p-2 rounded-xl shadow-lg"><Users size={20}/></div>
              <div>
                <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">{selectedGroupDetails.name}</h2>
                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">Gestión de Grupo y Mural</p>
              </div>
            </div>
            <button onClick={() => setSelectedGroupDetails(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
          </div>
          
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            
            {/* COLUMNA IZQUIERDA: INFORMES Y LINKS (Ahora colapsable en móvil) */}
            <div className="w-full lg:w-[400px] bg-white border-r flex flex-col overflow-y-auto custom-scrollbar border-slate-200">
              
              {/* SECCIÓN LINKS (Fotos/Drive) */}
              <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-50 bg-slate-50/50">
                <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-200 transition-all"><Folder size={16}/> Drive</button>
                <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-3 bg-blue-100 text-blue-700 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-blue-200 transition-all"><FileText size={16}/> Fotos</button>
              </div>

              {/* SECCIÓN INFORMES (Tipo Acordeón) */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 text-violet-900">
                  <GraduationCap size={18}/>
                  <h3 className="font-black uppercase italic text-sm">Seguimiento de Informes</h3>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setInformeEpoca(n)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${informeEpoca === n ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Etapa {n}</button>
                  ))}
                </div>

                <div className="space-y-2">
                  {selectedGroupDetails.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => {
                    const status = s[`informe${informeEpoca}`]?.status || 'Pendiente';
                    const colorMap = {
                      'Pendiente': 'bg-slate-100 text-slate-400 border-slate-200',
                      'Hecho': 'bg-blue-500 text-white border-blue-600 shadow-blue-100',
                      'Impreso': 'bg-orange-500 text-white border-orange-600 shadow-orange-100',
                      'Enviado': 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-100',
                      'Archivado': 'bg-slate-800 text-white border-slate-900 shadow-slate-200'
                    };

                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-slate-50 hover:border-violet-100 transition-all">
                        <span className="font-bold text-xs text-slate-700 uppercase truncate pr-2">{s.lastName}, {s.firstName}</span>
                        <button 
                          onClick={() => handleToggleInformeGrupo(s, informeEpoca)} 
                          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase border-b-4 shadow-sm active:scale-95 transition-all ${colorMap[status] || colorMap['Pendiente']}`}
                        >
                          {status}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: EL MURO / CHAT (Más grande en PC, principal en móvil) */}
            <div className="flex-1 flex flex-col bg-slate-50 relative">
                {/* FONDO DECORATIVO PARA EL CHAT */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")` }}></div>

                <div className="p-4 bg-white border-b flex items-center justify-between shrink-0 z-10 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 text-white rounded-lg"><MessageSquare size={16}/></div>
                    <h3 className="font-black text-slate-800 uppercase italic text-sm">Muro de Intercambio</h3>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">Novedades del día</span>
                </div>

                {/* AREA DE MENSAJES */}
                <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col-reverse space-y-4 custom-scrollbar z-10">
                    {(!groupMessages[selectedGroupDetails.name] || groupMessages[selectedGroupDetails.name].length === 0) ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-pulse">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                          <Send size={30} className="text-slate-400" />
                        </div>
                        <h4 className="text-slate-500 font-black uppercase text-xs italic">El muro está vacío</h4>
                        <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase">¡Escribí la primera novedad del grupo!</p>
                      </div>
                    ) : (
                      groupMessages[selectedGroupDetails.name].map(m => (
                        <div key={m.id} className={`flex flex-col ${m.authorId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[90%] lg:max-w-[70%] p-4 rounded-[28px] shadow-sm relative group ${
                            m.authorId === user.id 
                            ? 'bg-violet-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                          }`}>
                            <p className={`text-[8px] font-black uppercase mb-1 tracking-tighter ${m.authorId === user.id ? 'text-violet-200' : 'text-violet-500'}`}>
                              {m.author} • {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ahora'}
                            </p>
                            <p className="text-sm font-bold leading-tight">{m.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                </div>

                {/* INPUT DE MENSAJE */}
                <div className="p-4 lg:p-6 bg-white border-t-2 border-slate-100 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="max-w-4xl mx-auto flex gap-2">
                    <input 
                      name="comment" 
                      autoComplete="off" 
                      placeholder="Escribí algo importante para el equipo..." 
                      className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-[30px] text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:bg-white transition-all shadow-inner" 
                    />
                    <button type="submit" className="bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-200 active:scale-95 transition-all hover:bg-orange-600">
                      <Send size={24}/>
                    </button>
                  </form>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. DIÁLOGO DE EDICIÓN DE GRUPO */}
     {/* 5. DIÁLOGO DE EDICIÓN DE GRUPO (COMPLETO) */}
      {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3>
              <button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button>
            </div>
            
            <div className="space-y-4">
              {/* NOMBRE Y AULA */}
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Nombre Grupo</label>
                <input name="groupName" defaultValue={editingGroup.name} className="w-full p-3 bg-slate-50 rounded-xl font-black text-sm uppercase outline-none border-b-2 border-violet-200" />
              </div>
              
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Aula Física</label>
                <input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-sm outline-none" />
              </div>

              {/* SELECTOR DOCENTE 1 */}
              <div>
                <label className="text-[10px] font-black text-violet-600 uppercase ml-1 tracking-widest">Docente Titular</label>
                <select name="teacher" defaultValue={editingGroup.teacherId || ""} className="w-full p-3 bg-violet-50 rounded-xl font-bold text-xs uppercase outline-none border border-violet-100">
                  <option value="">Seleccionar...</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>
                  ))}
                </select>
              </div>

              {/* SELECTOR DOCENTE 2 (PAREJA) */}
              <div>
                <label className="text-[10px] font-black text-violet-400 uppercase ml-1 tracking-widest">Docente Pareja (Opcional)</label>
                <select name="teacher2Id" defaultValue={editingGroup.teacherId2 || ""} className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs uppercase outline-none">
                  <option value="">Ninguno / Vacante</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>
                  ))}
                </select>
              </div>

              {/* SELECTOR AUXILIAR */}
              <div>
                <label className="text-[10px] font-black text-orange-600 uppercase ml-1 tracking-widest">Auxiliar / Preceptor</label>
                <select name="auxId" defaultValue={editingGroup.auxId || ""} className="w-full p-3 bg-orange-50 rounded-xl font-bold text-xs uppercase outline-none border border-orange-100">
                  <option value="">Sin asignar</option>
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>
                  ))}
                </select>
              </div>

              {/* LINKS DRIVE */}
              <div>
                <label className="text-[10px] font-black text-emerald-600 uppercase ml-1 tracking-widest">Link Carpeta Fotos</label>
                <input name="driveLink" defaultValue={editingGroup.driveLink || ""} className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs font-bold text-emerald-800 outline-none" />
              </div>

              <div>
                <label className="text-[10px] font-black text-blue-600 uppercase ml-1 tracking-widest">Drive Institucional</label>
                <input name="institucionalDrive" defaultValue={editingGroup.institucionalDrive || ""} className="w-full p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs font-bold text-blue-800 outline-none" />
              </div>

              <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4 hover:scale-[1.02] transition-all">
                {updatingGroup ? "Guardando..." : "Aplicar Cambios en todo el Grupo"}
              </button>
            </div>
          </form>
        </div>
      )}
      {/* 6. MODAL DE OPCIONES DE IMPRESIÓN */}
      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-violet-600">
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4">Opciones de Impresión</h3>
            <div className="space-y-2 mb-6">
              {Object.keys(printColumns).map(col => (
                <label key={col} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer">
                  <span className="text-xs font-bold uppercase text-gray-600">
                    {col === 'healthInsurance' ? 'Obra Social' : col === 'birthDate' ? 'Nacimiento' : col === 'contacts' ? 'Familia' : col === 'photo' ? 'Foto' : col}
                  </span>
                  <input type="checkbox" checked={printColumns[col]} onChange={() => setPrintColumns({...printColumns, [col]: !printColumns[col]})} className="w-5 h-5 accent-violet-600" />
                </label>
              ))}
            </div>
            <button onClick={() => { printGroups(groupsToPrint); setShowPrintOptions(false); }} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg mb-2">Imprimir</button>
            <button onClick={() => setShowPrintOptions(false)} className="w-full py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
          </div>
        </div>
      )}
    </div> // Fin del div principal
  );
} // Fin de la función

