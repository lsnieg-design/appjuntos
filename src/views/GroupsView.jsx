import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp, Star
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, increment, where } from 'firebase/firestore';

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
  
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printColumns, setPrintColumns] = useState({
    dni: true,
    birthDate: true,
    healthInsurance: false,
    contacts: true,
    photo: false
  });

  const scrollRef = useRef(null); 
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const LOGO_URL = "/icon-192.png";

  useEffect(() => {
    if (!db || !appId) return;
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

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

  // --- LÓGICA DE GRUPOS ---
  const groupedData = students.reduce((acc, s) => {
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
      if (s.modality === 'Inclusión') {
          const dais = [...new Set([s.daiMorning, s.daiAfternoon].filter(Boolean))];
          dais.forEach(daiName => {
              const groupKey = `DAI: ${daiName}`;
              if (!acc[groupKey]) {
                  acc[groupKey] = { name: groupKey, students: [], teacher: daiName, teacherId: s.daiId, isInclusionGroup: true };
              }
              if (!acc[groupKey].students.find(x => x.id === s.id)) { acc[groupKey].students.push(s); }
          });
      } else {
          const groupName = s[`group${suf}`];
          if (!groupName) return acc;
          const groupKey = groupName.trim();
          if (!acc[groupKey]) { 
              acc[groupKey] = { 
                  name: groupKey, students: [], teacher: s[`teacher${suf}`], teacherId: s[`teacherId${suf}`], 
                  teacher2: s[`teacher2${suf}`], aux: s[`aux${suf}`], classroom: s.classroom, driveLink: s[`driveLink${suf}`], isInclusionGroup: false 
              }; 
          }
          acc[groupKey].students.push(s); 
      }
      return acc;
  }, {});

  let groups = Object.values(groupedData).sort((a, b) => a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name));

  if (!isManagement) {
      groups = groups.filter(g => {
          const uId = user.id;
          const staffIds = [g.teacherId, g.auxId, g.special1Id, g.special2Id, g.special3Id, g.sup1Id, g.sup2Id];
          return staffIds.includes(uId) || g.students.some(s => s.daiId === uId);
      });
  } else if (viewFilter !== 'all') {
      groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup);
  }

  // --- FUNCIONES DE IMPRESIÓN ---
  const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const docPrint = iframe.contentWindow.document;
    docPrint.write(`<html><head><style>body{font-family:sans-serif;} table{width:100%; border-collapse:collapse;} th,td{border:1px solid #ddd; padding:8px; text-align:left; font-size:12px;}</style></head><body><h1>Listado de Alumnos - Turno ${turn}</h1>`);
    groupsList.forEach(g => {
        docPrint.write(`<h3>Grupo: ${g.name}</h3><table><thead><tr><th>Nombre</th><th>DNI</th><th>Contacto</th></tr></thead><tbody>`);
        g.students.forEach(s => {
            docPrint.write(`<tr><td>${s.lastName}, ${s.firstName}</td><td>${s.dni || '-'}</td><td>${s.motherContact || '-'}</td></tr>`);
        });
        docPrint.write(`</tbody></table>`);
    });
    docPrint.write(`</body></html>`);
    docPrint.close();
    iframe.contentWindow.print();
    setTimeout(() => document.body.removeChild(iframe), 1000);
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    setUpdatingGroup(true);
    const fd = new FormData(e.target);
    const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
    const updates = { [`group${suf}`]: fd.get('groupName'), classroom: fd.get('classroom') };
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

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      {/* HEADER */}
      <div className="bg-white p-4 shadow-sm sticky top-0 z-10 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24}/> Mis Grupos</h2>
              {isManagement && <button onClick={() => { setGroupsToPrint(groups); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2 rounded-xl"><Printer size={24}/></button>}
          </div>
          <div className="flex gap-2">
              <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
                  <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black ${turn === 'morning' ? 'bg-white text-orange-50 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
                  <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
              </div>
          </div>
      </div>
      
      {/* LISTA DE GRUPOS */}
      <div className="relative flex-1 overflow-x-auto p-6 flex gap-6 items-start scroll-smooth" ref={scrollRef}>
          {groups.map((g) => (
              <div key={g.name} className="min-w-[300px] bg-white rounded-[30px] border border-gray-200 shadow-sm overflow-hidden flex flex-col">
                  <div className={`p-4 border-b-4 flex justify-between items-start ${turn==='morning'?'bg-orange-50 border-orange-400':'bg-indigo-50 border-indigo-400'}`}>
                      <div>
                        <h3 className="font-black text-gray-800">{g.name}</h3>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">{g.teacher || 'Vacante'}</p>
                      </div>
                      <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition"><Plus size={16}/></button>
                  </div>
                  <div className="p-4 space-y-2 bg-gray-50 overflow-y-auto max-h-[400px]">
                      {g.students.map(s => (
                          <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-2xl shadow-sm flex items-center justify-between cursor-pointer hover:bg-violet-50 transition">
                              <span className="font-bold text-sm text-gray-700">{s.lastName}, {s.firstName}</span>
                              <ChevronRight size={16} className="text-gray-300"/>
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>

      {/* MODAL DETALLE ESTUDIANTE (REEMPLAZA TODO EL BLOQUE VIEJO) */}
      {selectedStudent && (
        <StudentDetailView 
          student={selectedStudent} 
          user={user}
          db={db}
          appId={appId}
          onClose={() => setSelectedStudent(null)} 
          onEdit={() => setActiveTab('matricula')}
        />
      )}

      {/* PANEL ENFOQUE GRUPO (INFORMES Y CHAT) */}
      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-white z-[500] flex flex-col animate-in fade-in">
           <div className="p-4 border-b flex justify-between items-center bg-white z-20">
              <h2 className="text-xl font-black uppercase italic text-violet-900">{selectedGroupDetails.name}</h2>
              <button onClick={() => setSelectedGroupDetails(null)} className="p-2 bg-slate-100 rounded-full"><X size={24}/></button>
           </div>
           <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 p-6 overflow-y-auto space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-4 bg-emerald-50 text-emerald-700 rounded-2xl font-black text-[10px] uppercase border border-emerald-100 flex items-center gap-2"><Folder size={18}/> Fotos</button>
                      <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-4 bg-blue-50 text-blue-700 rounded-2xl font-black text-[10px] uppercase border border-blue-100 flex items-center gap-2"><FileText size={18}/> Documentos</button>
                  </div>
                  <div className="space-y-4">
                      {selectedGroupDetails.students.map(s => (
                          <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                              <span className="font-bold text-slate-700 uppercase">{s.lastName}, {s.firstName}</span>
                              <button onClick={() => handleToggleInformeGrupo(s, informeEpoca)} className="px-4 py-2 bg-violet-600 text-white rounded-xl text-[10px] font-black uppercase">
                                  {s[`informe${informeEpoca}`]?.status || 'Pendiente'}
                              </button>
                          </div>
                      ))}
                  </div>
              </div>
              {/* CHAT DEL GRUPO */}
              <div className="w-full lg:w-[400px] bg-slate-50 border-l border-slate-200 flex flex-col">
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse space-y-2">
                      {groupMessages[selectedGroupDetails.name]?.map(m => (
                          <div key={m.id} className={`p-3 rounded-2xl text-sm ${m.authorId === user.id ? 'bg-violet-600 text-white self-end' : 'bg-white border border-slate-200 self-start'}`}>
                              <p className="text-[9px] font-black uppercase opacity-60 mb-1">{m.author}</p>
                              <p className="font-medium">{m.text}</p>
                          </div>
                      ))}
                  </div>
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="p-4 bg-white border-t flex gap-2">
                      <input name="comment" placeholder="Escribir novedad..." className="flex-1 p-3 bg-slate-100 rounded-xl text-sm outline-none" />
                      <button type="submit" className="bg-orange-500 text-white p-3 rounded-xl"><Send size={18}/></button>
                  </form>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
