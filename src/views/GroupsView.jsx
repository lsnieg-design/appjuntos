import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  User, FileText, Plus, Users, Grid, CheckCircle, ChevronRight, RefreshCw, ChevronLeft, Printer, MessageSquare, Send, Folder, Edit3, X, Search, GraduationCap, Activity 
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove, increment, where } from 'firebase/firestore';
// -------------------------------------------------------------
// FUNCIONES AUXILIARES DE FECHAS Y EDAD (SANEAMIENTO)
// -------------------------------------------------------------
const calculateAge = (d) => { 
  if (!d) return '-'; 
  const t = new Date(); 
  const b = new Date(d); 
  let a = t.getFullYear() - b.getFullYear(); 
  const m = t.getMonth() - b.getMonth(); 
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; 
  return a; 
};

const getSafeDate = (d) => { 
  if (!d) return ''; 
  try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } 
};

const checkCudStatus = (cudDate) => {
  if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
  const today = new Date();
  const exp = new Date(cudDate + 'T00:00:00');
  const diffTime = exp - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
  if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` };
  return { status: 'ok', text: 'Vigente' };
};
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
  const [printMode, setPrintMode] = useState('students'); // 'students' o 'staff'
  

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
// Nueva variable de estado para alternar vista (agregala arriba con los otros useState)
  const [viewMode, setViewMode] = useState('Sede'); 

const gruposFinales = React.useMemo(() => {
  const suf = turn === 'morning' ? 'Morning' : 'Afternoon';
  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';

  const grouped = students.reduce((acc, s) => {
    const studentModality = s.modality || 'Sede';
    if (studentModality !== viewMode) return acc;

    const gName = viewMode === 'Sede' ? s[`group${suf}`] : (s[`dai${suf}`] || 'SIN DAI ASIGNADA');
    const teacherName = s[`teacher${suf}`];
    const daiName = s[`dai${suf}`];

    if (!isManagement) {
      const userMatchesTeacher = teacherName === user.fullName;
      const userMatchesDai = daiName === user.fullName;
      if (!userMatchesTeacher && !userMatchesDai) return acc;
    }

    if (!gName) return acc;
    
    if (!acc[gName]) {
      acc[gName] = { 
        name: gName, 
        students: [], 
        teacher: viewMode === 'Sede' ? (s[`teacher${suf}`] || 'Sin asignar') : gName, 
        aux: viewMode === 'Sede' ? (s[`aux${suf}`] || 'S/D') : (s.originSchool || 'Escuela común'),
        classroom: viewMode === 'Sede' ? s.classroom : s.originGrade, 
        driveLink: s[`driveLink${suf}`], 
        institucionalDrive: s.institucionalDrive,
        // Dejamos las variables internas idénticas para no romper el JSX de abajo
        stats: { varones: 0, mujeres: 0, conDI: 0, conTEA: 0 }
      };
    }

    acc[gName].students.push(s);

    // Contabilizar estadísticas al vuelo (Saneado definitivo)
    const gender = s.gender?.toLowerCase() || '';
    
    // Convertimos a mayúsculas, quitamos puntos, acentos y CUALQUIER espacio extra
    const dx = (s.dx || '')
      .toUpperCase()
      .trim()
      .replace(/\./g, '')
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (gender === 'masculino' || gender === 'v' || gender === 'm') acc[gName].stats.varones++;
    if (gender === 'femenino' || gender === 'f') acc[gName].stats.mujeres++;
    
    if (dx.includes('DI') || dx.includes('INTELECTUAL')) acc[gName].stats.conDI++;
    
    // Captura exacta de TES, incluso si forma parte de otra palabra o frase
    if (dx.includes('TES') || dx.includes('EMOCIONAL') || dx.includes('CONDUCTA')) acc[gName].stats.conTEA++;

    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) => 
    a.name.includes("INICIAL") ? -1 : a.name.localeCompare(b.name)
  );
}, [students, turn, viewMode, user]);

  
  const imprimirBitacora = (student) => {
      // Función auxiliar por si no está globalmente disponible en este archivo
      const getEdad = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

      const incidents = (student.incidents || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

      let h = `<html><head><title>Bitácora - ${student.lastName}</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body { font-family: 'Roboto', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
          .header-info { display: flex; flex-direction: column; }
          .header-info h1 { margin: 0; color: #4c1d95; font-size: 20px; text-transform: uppercase; }
          .header-info p { margin: 4px 0 0; font-size: 12px; color: #666; font-weight: bold; }
          .photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #7c3aed; }
          .incident { border-left: 5px solid #ccc; padding: 12px 15px; margin-bottom: 15px; background: #f9fafb; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
          .incident.high { border-left-color: #ef4444; background: #fef2f2; }
          .incident.medium { border-left-color: #f97316; background: #fff7ed; }
          .incident.positive { border-left-color: #10b981; background: #ecfdf5; }
          .inc-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 8px; }
          .inc-body { font-size: 13px; font-weight: 700; color: #333; line-height: 1.4; }
          .inc-footer { font-size: 9px; font-weight: bold; color: #999; margin-top: 8px; text-transform: uppercase; border-top: 1px solid #eee; padding-top: 5px; }
          .print-footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>`;

      h += `
      <div class="header">
          <div class="header-info">
              <h1>BITÁCORA EXPRÉS: ${student.lastName}, ${student.firstName}</h1>
              <p>DNI: ${student.dni || '-'} | Edad: ${getEdad(student.birthDate)} años | Modalidad: ${student.modality || 'Sede'}</p>
              <p>Grupo/Asignación: ${student.groupMorning || student.groupAfternoon || student.daiMorning || student.daiAfternoon || 'Sin asignar'}</p>
          </div>
          ${student.photoUrl ? `<img class="photo" src="${student.photoUrl}" />` : ''}
      </div>`;

      if (!incidents || incidents.length === 0) {
          h += `<p style="text-align:center; color:#999; font-style:italic;">No hay registros cargados en la bitácora de este alumno.</p>`;
      } else {
          incidents.forEach(inc => {
              const dateObj = new Date(inc.date);
              const dateStr = dateObj.toLocaleDateString('es-AR') + ' ' + dateObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
              h += `
              <div class="incident ${inc.severity || ''}">
                  <div class="inc-header">
                      <span>${dateStr}</span>
                      <span>ORIGEN: AULA</span>
                  </div>
                  <div class="inc-body">
                      ${inc.text || inc.type}
                  </div>
                  <div class="inc-footer">
                      Registrado por: ${inc.author || 'Anónimo'}
                  </div>
              </div>`;
          });
      }

      h += `<div class="print-footer">Documento generado el ${new Date().toLocaleDateString('es-AR')} - Sistema Juntos a la Par</div>`;
      h += `</body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(h);
      doc.close();
      
      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 5000);
      }, 500);
  };
  
  // --- FUNCIONES DE ACCIÓN ---

  const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    let h = `<html><head><style>
      body{font-family:sans-serif; padding:20px;}
      .header{background:#f3f4f6; padding:15px; border-left:5px solid #7c3aed; margin-bottom:10px; border-radius: 0 15px 15px 0;}
      .header h2 { margin: 0; color: #7c3aed; text-transform: uppercase; font-size: 16px; }
      table{width:100%; border-collapse:collapse; font-size:10px; margin-top: 10px;}
      th{background:#7c3aed; color:white; padding:8px; text-align:left; text-transform:uppercase;}
      td{border:1px solid #ddd; padding:8px;}
    </style></head><body>`;

    if (printMode === 'staff') {
      h += `<h1>Listado de Organización de Staff - 2026</h1>
            <table><thead><tr>
              <th>Grupo / DAI</th>
              <th>Docente Titular</th>
              <th>Docente Pareja / Escuela</th>
              <th>Auxiliar / Preceptor</th>
              <th>Aula / Grado</th>
            </tr></thead><tbody>`;
      groupsList.forEach(g => {
        h += `<tr>
          <td><b>${g.name}</b></td>
          <td>${g.teacher || '-'}</td>
          <td>${g.teacher2 || g.aux || '-'}</td>
          <td>${g.aux || '-'}</td>
          <td>${g.classroom || '-'}</td>
        </tr>`;
      });
      h += `</tbody></table>`;
    } else {
      groupsList.forEach(g => {
          h += `<div class="header"><h2>${g.name}</h2></div>
          <table><thead><tr><th>#</th><th>Nombre y Apellido</th><th>DNI</th><th>Nacimiento</th><th>Familia</th></tr></thead><tbody>`;
          g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).forEach((s, i) => {
              h += `<tr><td>${i+1}</td><td><b>${s.lastName}, ${s.firstName}</b></td><td>${s.dni || '-'}</td><td>${s.birthDate || '-'}</td><td>${s.motherContact || '-'}</td></tr>`;
          });
          h += `</tbody></table><br/>`;
      });
    }
    h += `</body></html>`;
    const docIframe = iframe.contentWindow.document; docIframe.open(); docIframe.write(h); docIframe.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };

 const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const proximo = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    
    try {
      // El await ahora sí está dentro de una función async
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { 
        [campo]: { status: proximo, updatedAt: new Date().toISOString() } 
      });

      // --- REGISTRO AUDITORÍA ---
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user.firstName || user.fullName,
        userId: user.id,
        action: "Estado de Informe",
        details: `Informe ${numeroInforme} de ${estudiante.lastName} pasó a: ${proximo}`,
        timestamp: serverTimestamp()
      });

      if (proximo === 'Hecho' || proximo === 'Archivado') {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        await updateDoc(userRef, { score: increment(20) });
      }

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
      profePlastica: fd.get('profePlastica'),
  profeMusica: fd.get('profeMusica'),
  profeEF: fd.get('profeEF'),
  profePsico: fd.get('profePsico'),
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

const deleteIncident = async (studentId, inc) => {
    if (!confirm("⚠️ ¿Seguro que querés borrar este registro de la bitácora?")) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        incidents: arrayRemove(inc)
      });
    } catch (e) {
      console.error("Error al eliminar:", e);
      alert("❌ No se pudo eliminar el registro.");
    }
  };
  const handleSaveIncident = async (type, severity = "medium", text = "") => {
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;
    setSavingIncident(true);
    
    try {
      // 1. Registro en la Bitácora Express (Legajo del alumno)
      const entry = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity, 
        text: text || type, 
        author: user?.fullName || user?.firstName || "Docente", 
        authorId: user?.id || "unknown" 
      };
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id), { 
        incidents: arrayUnion(entry) 
      });
      
      // 2. Registro en Auditoría Global
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user?.firstName || user?.fullName || "Docente",
        userId: user?.id || "unknown",
        action: "Bitácora",
        details: `Cargó incidencia "${text || type}" para ${activeStudent.lastName}`,
        timestamp: serverTimestamp()
      });

      // 3. ENLACE CON SOCIAL (Filtro a prueba de balas)
      // Buscamos la palabra clave en lugar de usar coincidencia exacta
      const esAusentismo = type && type.toLowerCase().includes("ausentismo");

      if (esAusentismo) {
        const socialRef = collection(db, 'artifacts', appId, 'public', 'data', 'social_cases');
        
        await addDoc(socialRef, {
          studentId: activeStudent.id,
          studentName: `${activeStudent.lastName}, ${activeStudent.firstName}`,
          level: activeStudent.level || "SEDE", 
          reason: "REPORTE DESDE AULA: Ausentismo detectado.",
          status: "Pendiente",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          steps: { llamada: { done: false }, continuidad: { sent: false } },
          history: [{ 
            date: new Date().toISOString(), 
            text: `Caso abierto automáticamente por reporte de aula.`, 
            author: "SISTEMA" 
          }]
        });
      }

      // 4. Sumar Puntos
      if (user?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { score: increment(10) });
      }

      setShowBitacoraModal(null); 
      setIsWriting(false); 
      setNewNote("");
      
      // EL CARTEL TE AVISARÁ SI LOGRÓ ENVIARLO A TRABAJO SOCIAL
      alert(`✅ Registro guardado en Bitácora${esAusentismo ? " y derivado a Trabajo Social." : "."}`);

    } catch (e) { 
      alert("Error al guardar: " + e.message); 
    } finally { 
      setSavingIncident(false); 
    }
  };
  const handleAttendance = async (student, status) => {
    try {
      const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
      await updateDoc(studentRef, { 
        lastAttendance: status,
        lastAttendanceDate: serverTimestamp() 
      });

      // --- REGISTRO AUDITORÍA ---
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user.firstName || user.fullName,
        userId: user.id,
        action: "Asistencia",
        details: `${status === 'present' ? 'PRESENTE' : 'AUSENTE'} - ${student.lastName} ${student.firstName}`,
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error(e); }
  };

const handleAddGroupComment = async (e, groupName) => {
    e.preventDefault();
    const text = e.target.comment.value;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), { 
        groupName, 
        text, 
        author: user.firstName, 
        authorId: user.id, 
        createdAt: serverTimestamp() 
      });

      // --- SUMAR PUNTOS POR COMUNICACIÓN ---
      const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
      await updateDoc(userRef, { score: increment(3) }); // 3 puntos por cada aviso al equipo
      // -------------------------------------

      e.target.reset();
    } catch (err) { alert(err.message); }
  };

return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative overflow-hidden">
  {/* 1. CABECERA FIJA */}
<div className="bg-white p-4 shadow-sm z-20 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2">
              <Grid size={24} className="text-orange-500"/> Mis Grupos
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-8">Vista Institucional</p>
          </div>
          <button 
            onClick={() => { setGroupsToPrint(gruposFinales); setShowPrintOptions(true); }} 
            className="bg-violet-100 text-violet-700 p-2.5 rounded-xl hover:bg-violet-200 transition shadow-sm"
          >
            <Printer size={24}/>
          </button>
        </div>

      <div className="flex flex-col md:flex-row gap-2 mx-2">
          {/* Selector de Turno */}
          <div className="flex bg-gray-100 p-1 rounded-2xl flex-1">
            <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ MAÑANA</button>
            <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 TARDE</button>
          </div>

      {/* Selector de Modalidad */}
          <div className="flex bg-gray-200 p-1 rounded-2xl">
            <button onClick={() => setViewMode('Sede')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'Sede' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}>Sede</button>
            <button onClick={() => setViewMode('Inclusión')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'Inclusión' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500'}`}>Inclusión</button>
          </div>
        </div>
      </div>
      
      
      <div className="flex-1 relative flex items-start overflow-hidden">
        
        {/* FLECHA IZQUIERDA */}
       {/* FLECHA IZQUIERDA */}
<button 
  onClick={() => scroll('left')}
  className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white text-violet-600 p-4 rounded-full shadow-2xl border border-slate-100 hover:scale-110 active:scale-95 transition-all hidden lg:flex"
>
          <ChevronLeft size={32} strokeWidth={3} />
        </button>

     {/* CONTENEDOR PRINCIPAL */}
        <div 
          ref={scrollRef} 
          className="h-full w-full overflow-x-auto flex gap-6 p-6 scroll-smooth no-scrollbar items-start"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {gruposFinales.map((g) => (
            <div key={g.name} className="flex flex-col min-w-[340px] bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden h-fit mb-10">
              
              {/* CABECERA TARJETA: AJUSTADA PARA INCLUSIÓN/SEDE */}
              <div className={`p-6 border-b-4 relative ${turn === 'morning' ? 'border-orange-400 bg-orange-50/50' : 'border-indigo-400 bg-indigo-50/50'}`}>
                <div className="absolute top-4 right-4 flex gap-1">
                  <button onClick={() => { setGroupsToPrint([g]); setShowPrintOptions(true); }} className="p-2 bg-white/80 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
                  <button onClick={() => setSelectedGroupDetails(g)} className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition"><Plus size={16}/></button>
                  {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/80 hover:bg-white rounded-full text-slate-400 shadow-sm transition"><Edit3 size={14}/></button>}
                </div>
                
                {/* Nombre del Grupo o Nombre de la DAI */}
                <h3 className="font-black text-slate-800 text-xl leading-tight pr-16 uppercase">{g.name}</h3>
                
                {/* ETIQUETAS DINÁMICAS Y ESTADÍSTICAS SANEADAS */}
                <div className="flex flex-col gap-2 mt-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white text-violet-700 px-2 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm border border-violet-100">
                      {g.students.length} {viewMode === 'Sede' ? 'Alumnxs' : 'Integradxs'}
                    </span>
                    {g.classroom && (
                      <span className="bg-white text-orange-700 px-2 py-1 rounded-lg text-[9px] font-black border border-orange-100 uppercase">
                        {viewMode === 'Sede' ? `Aula ${g.classroom}` : `Grado: ${g.classroom}`}
                      </span>
                    )}
                  </div>

                  {/* Renderizado directo desde las stats precalculadas */}
                  <div className="flex flex-wrap gap-1 bg-slate-100/60 p-1.5 rounded-xl border border-slate-200/40">
                    {g.stats?.varones > 0 && <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md">👦 {g.stats.varones}V</span>}
                    {g.stats?.mujeres > 0 && <span className="text-[9px] font-bold text-slate-500 bg-white px-1.5 py-0.5 rounded-md">👧 {g.stats.mujeres}M</span>}
                    {g.stats?.conDI > 0 && <span className="text-[9px] font-black text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md border border-amber-100">DI: {g.stats.conDI}</span>}
                    {g.stats?.conTEA > 0 && <span className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100">TES: {g.stats.conTEA}</span>}
                  </div>
                </div>

                {/* STAFF DINÁMICO */}
                <div className="mt-4 pt-3 border-t border-slate-200/50 space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    {viewMode === 'Sede' ? 'DOC:' : 'DAI:'} <span className="text-slate-700 font-black">{g.teacher || 'Sin asignar'}</span>
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                    {viewMode === 'Sede' ? 'AUX:' : 'ESCUELA:'} <span className="text-slate-700 font-black">{g.aux || 'S/D'}</span>
                  </p>
                </div>
              </div>

              {/* LISTADO ALUMNOS */}
              <div className="p-4 bg-slate-50/30 space-y-2 h-fit">
                {g.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => (
                  <div key={s.id} onClick={() => setSelectedStudent(s)} className="bg-white p-3 rounded-[24px] shadow-sm flex items-center justify-between cursor-pointer border-2 border-transparent hover:border-violet-200 transition-all group/item">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-400 border border-slate-200 text-sm overflow-hidden shadow-inner shrink-0">
                        {s.photoUrl ? (
                          <img src={s.photoUrl} className="w-full h-full object-cover group-hover/item:scale-110 transition-transform"/>
                        ) : (
                          <span>{s.firstName[0]}</span>
                        )}
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="font-bold text-xs text-slate-700 uppercase tracking-tight truncate">{s.lastName}, {s.firstName}</span>
                        {/* ETIQUETA DE EDAD SANEADA */}
                        {s.birthDate && (
                          <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider mt-0.5 bg-violet-50 px-1.5 py-0.5 rounded-md w-fit">
                            {calculateAge(s.birthDate)} años
                          </span>
                        )}
                      </div>
                    </div>
                    <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s); setIsWriting(false);}} className="w-9 h-9 bg-violet-50 text-violet-500 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition-all shadow-sm shrink-0 ml-2">⚡</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* FLECHA DERECHA */}
        <button 
          onClick={() => scroll('right')}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white text-violet-600 p-4 rounded-full shadow-2xl border border-slate-100 hover:scale-110 active:scale-95 transition-all hidden lg:flex"
        >
          <ChevronRight size={32} strokeWidth={3} />
        </button>
      </div>

      {selectedStudent && (
        <StudentDetailView student={selectedStudent} user={user} db={db} appId={appId} onClose={() => setSelectedStudent(null)} onEdit={(s) => { setSelectedStudent(null); setFullFileStudent(s); }} />
      )}

     {/* 3. MODAL LEGAJO DIGITAL (REDISEÑADO PARA PC) */}
      {fullFileStudent && (
        <div className="fixed inset-0 bg-slate-900/60 z-[1000] flex items-center justify-center p-4 lg:p-10 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
            
            {/* CABECERA ESTILO PREMIUM */}
            <div className="p-6 lg:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 p-1 shadow-lg">
                    {fullFileStudent.photoUrl ? 
                      <img src={fullFileStudent.photoUrl} className="w-full h-full object-cover rounded-[22px]"/> : 
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-[22px] font-black text-2xl">{fullFileStudent.firstName[0]}</div>
                    }
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-3xl font-black uppercase italic tracking-tighter leading-none">
                      {fullFileStudent.lastName}, {fullFileStudent.firstName}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-white/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">Legajo Digital</span>
                      <span className="bg-white/10 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5">DNI: {fullFileStudent.dni || '-'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setFullFileStudent(null)} className="p-3 bg-white/5 rounded-full hover:bg-red-500 transition-all hover:rotate-90"><X size={24}/></button>
            </div>

            {/* CUERPO RE-ORDENADO */}
            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                  
                  {/* COLUMNA 1: IDENTIDAD Y SALUD */}
                  <div className="space-y-6">
                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                      <h4 className="text-violet-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-violet-50 pb-2">
                        <User size={16}/> Información Base
                      </h4>
                    <div className="space-y-4">
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Diagnóstico (DX)</p><p className="font-black text-slate-700 bg-violet-50 p-2 rounded-xl text-sm mt-1 uppercase inline-block">{fullFileStudent.dx || 'S/D'}</p></div>
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Edad Actual</p><p className="font-black text-slate-700 text-base">{calculateAge(fullFileStudent.birthDate)} años</p></div>
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Fecha de Nacimiento</p><p className="font-bold text-slate-600 text-sm">{getSafeDate(fullFileStudent.birthDate)}</p></div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                      <h4 className="text-emerald-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-emerald-50 pb-2">
                        <Activity size={16}/> Cobertura Médica
                      </h4>
                      <div className="space-y-4">
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Obra Social</p><p className="font-black text-slate-700 text-sm mt-1">{fullFileStudent.healthInsurance || 'No declarada'}</p></div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Vencimiento CUD</p>
                          <p className={`font-black text-sm mt-1 ${checkCudStatus(fullFileStudent.cudExpiration).status === 'expired' ? 'text-red-500' : 'text-slate-700'}`}>
                            {getSafeDate(fullFileStudent.cudExpiration) || 'Sin fecha cargada'}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* COLUMNA 2: FAMILIA Y CONTACTO */}
                 <div className="space-y-6">
                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 h-full">
                      <h4 className="text-orange-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-orange-50 pb-2"><Users size={16}/> Grupo Familiar</h4>
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[9px] text-orange-500 font-black uppercase mb-1">Madre / Tutor 1</p>
                          <p className="font-black text-slate-700 text-sm">{fullFileStudent.motherName || 'No cargado'}</p>
                          <p className="text-blue-600 font-bold text-xs mt-1 flex items-center gap-1"><Phone size={10}/> {fullFileStudent.motherContact || '-'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[9px] text-orange-500 font-black uppercase mb-1">Padre / Tutor 2</p>
                          <p className="font-black text-slate-700 text-sm">{fullFileStudent.fatherName || 'No cargado'}</p>
                          <p className="text-blue-600 font-bold text-xs mt-1 flex items-center gap-1"><Phone size={10}/> {fullFileStudent.fatherContact || '-'}</p>
                        </div>
                        <div className="pt-2"><p className="text-[9px] text-slate-400 font-bold uppercase">Domicilio</p><div className="flex items-start gap-2 mt-1"><MapPin size={14} className="text-slate-300 shrink-0 mt-1"/><p className="font-bold text-slate-600 text-sm leading-tight">{fullFileStudent.address || 'Sin dirección registrada'}</p></div></div>
                      </div>
                    </section>
                  </div>

                  {/* COLUMNA 3: ESCOLARIDAD Y RETIRO */}
                  <div className="space-y-6">
                    <section className="bg-indigo-900 text-white p-6 rounded-[35px] shadow-xl">
                      <h4 className="text-indigo-300 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                        <GraduationCap size={16}/> Situación Escolar
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase">Modalidad</span>
                          <span className="font-black text-sm uppercase">{fullFileStudent.modality || 'Sede'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase">Nivel Actual</span>
                          <span className="font-black text-sm uppercase">{fullFileStudent.level || '-'}</span>
                        </div>
                        <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-black text-indigo-300 uppercase mb-2">Responsables de Aula</p>
                          <p className="text-[10px] font-bold mb-1">TM: <span className="text-white">{fullFileStudent.teacherMorning || '-'}</span></p>
                          <p className="text-[10px] font-bold">TT: <span className="text-white">{fullFileStudent.teacherAfternoon || '-'}</span></p>
                        </div>
                      </div>
                    </section>

                    {/* Mini Muro de Grupo en Legajo Individual */}
                    <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[9px] font-black text-orange-600 uppercase mb-2 flex items-center gap-1">
                        <MessageSquare size={12}/> Últimas novedades del grupo
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                        {groupMessages[viewMode === 'Sede' ? (fullFileStudent[`group${turn === 'morning' ? 'Morning' : 'Afternoon'}`]) : (fullFileStudent[`dai${turn === 'morning' ? 'Morning' : 'Afternoon'}`])]?.slice(0, 3).map(m => (
                          <div key={m.id} className="bg-white p-2 rounded-xl shadow-sm border border-orange-50">
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{m.author}</p>
                            <p className="text-[10px] text-slate-600 leading-tight">{m.text}</p>
                          </div>
                        )) || <p className="text-[10px] text-orange-300 italic">Sin novedades recientes.</p>}
                      </div>
                    </div>

                    <section className="bg-emerald-50 p-6 rounded-[35px] border border-emerald-100 h-fit">
                      <h4 className="text-emerald-700 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-emerald-200 pb-2">
                        <Shield size={16}/> Autorizaciones
                      </h4>
                      <div>
                        <p className="text-[9px] text-emerald-600 font-black uppercase mb-2">Retira de la Institución:</p>
                        <div className="bg-white/60 p-4 rounded-2xl text-xs font-bold text-slate-600 italic leading-relaxed">
                          "{fullFileStudent.pickupInfo || 'No hay información de retiro cargada.'}"
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
            </div>

            {/* BOTONERA INFERIOR */}
            <div className="p-6 bg-white border-t border-slate-100 flex justify-center gap-4 shrink-0">
                <button onClick={() => setFullFileStudent(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Cerrar</button>
                <button onClick={() => { printGroups([fullFileStudent]) }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-all"><Printer size={16}/> Imprimir Legajo</button>
            </div>
          </div>
        </div>
      )}

      {showBitacoraModal && (() => {
        // Buscamos los datos "vivos" del alumno para que el historial se actualice al instante
        const liveStudent = students.find(s => s.id === showBitacoraModal.id) || showBitacoraModal;
        const historialIncidentes = [...(liveStudent.incidents || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl border-t-8 border-emerald-500 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              
              {/* CABECERA */}
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3>
                  <p className="text-xs text-gray-500 font-bold">{liveStudent.firstName} {liveStudent.lastName}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => imprimirBitacora(liveStudent)} className="bg-violet-100 text-violet-700 p-2 rounded-full hover:bg-violet-200 transition" title="Imprimir Historial">
                    <Printer size={20}/>
                  </button>
                  <button onClick={() => { setShowBitacoraModal(null); setIsWriting(false); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              {/* CUERPO DEL MODAL (BOTONES O TEXTAREA) */}
              <div className="shrink-0 mb-4">
                {!isWriting ? (
                  <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map((type) => (
                      <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}>
                        <span className="text-xl">{type.emoji}</span>
                        <span className="text-[9px] font-black uppercase text-center leading-tight">{type.label}</span>
                      </button>
                    ))}
                    <button onClick={() => setIsWriting(true)} className="col-span-2 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-gray-800 transition">
                      <Edit3 size={12}/> Redactar Nota Escrita
                    </button>
                  </div>
                ) : (
                  <div className="animate-in slide-in-from-bottom">
                    <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="¿Qué pasó?..." className="w-full p-3 bg-gray-50 border rounded-xl text-xs mb-2 h-24 outline-none resize-none font-medium" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsWriting(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                      <button type="button" onClick={() => handleSaveIncident("Nota", "medium", newNote)} disabled={!newNote.trim() || savingIncident} className="flex-[2] py-2 bg-violet-600 text-white rounded-xl font-black uppercase text-[10px] shadow-md">Guardar Nota</button>
                    </div>
                  </div>
                )}
              </div>

              {/* HISTORIAL RECIENTE CON ELIMINAR */}
              <div className="flex-1 overflow-y-auto border-t pt-3 space-y-2 pr-1 select-none" style={{ scrollbarWidth: 'thin' }}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Registros recientes:</p>
                {historialIncidentes.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-4">Sin registros previos en esta etapa.</p>
                ) : (
                  historialIncidentes.map((inc, idx) => {
                    const colorSev = inc.severity === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : inc.severity === 'high' ? 'bg-red-50 border-red-200 text-red-800' : inc.severity === 'medium' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-600';
                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border flex justify-between items-start text-xs ${colorSev}`}>
                        <div className="flex-1 pr-2">
                          <p className="text-[8px] font-bold opacity-60 uppercase mb-0.5">
                            {inc.date ? new Date(inc.date).toLocaleDateString('es-AR') : 'Fecha s/d'} • Por: {inc.author || 'Docente'}
                          </p>
                          <p className="font-bold leading-tight">{inc.text || inc.type}</p>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => deleteIncident(liveStudent.id, inc)} 
                          className="text-gray-400 hover:text-red-600 p-0.5 rounded-lg transition"
                          title="Eliminar Registro"
                        >
                          <X size={14} strokeWidth={3}/>
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          </div>
        );
      })()}
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
              <div>
  <label className="text-[10px] font-black text-violet-600 uppercase">Profesores Especiales</label>
  <div className="grid grid-cols-2 gap-2 mt-2">
    
    <select name="profePlastica" defaultValue={editingGroup.profePlastica || ""} className="p-2 bg-gray-50 rounded-lg text-xs font-bold border">
      <option value="">Plástica...</option>
      {usersList.filter(u => u.role === 'Docente Especial').map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
    </select>

    <select name="profeMusica" defaultValue={editingGroup.profeMusica || ""} className="p-2 bg-gray-50 rounded-lg text-xs font-bold border">
      <option value="">Música...</option>
      {usersList.filter(u => u.role === 'Docente Especial').map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
    </select>

    <select name="profeEF" defaultValue={editingGroup.profeEF || ""} className="p-2 bg-gray-50 rounded-lg text-xs font-bold border">
      <option value="">Ed. Física...</option>
      {usersList.filter(u => u.role === 'Docente Especial').map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
    </select>

    <select name="profePsico" defaultValue={editingGroup.profePsico || ""} className="p-2 bg-gray-50 rounded-lg text-xs font-bold border">
      <option value="">Psicomotricidad...</option>
      {usersList.filter(u => u.role === 'Docente Especial').map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
    </select>
    
  </div>
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
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4">¿Qué imprimir?</h3>
            <div className="flex flex-col gap-3 mb-6">
              <button onClick={() => setPrintMode('students')} className={`p-4 rounded-2xl border-2 text-left transition-all ${printMode === 'students' ? 'border-violet-600 bg-violet-50' : 'border-slate-100'}`}><p className="font-black text-xs uppercase text-violet-900">Listado de Alumnos</p><p className="text-[10px] text-slate-500">DNI, Fecha de nacimiento y contactos.</p></button>
              <button onClick={() => setPrintMode('staff')} className={`p-4 rounded-2xl border-2 text-left transition-all ${printMode === 'staff' ? 'border-violet-600 bg-violet-50' : 'border-slate-100'}`}><p className="font-black text-xs uppercase text-violet-900">Listado de Staff</p><p className="text-[10px] text-slate-500">Grilla de Docentes, Auxiliares y Aulas.</p></button>
            </div>
            <button onClick={() => { printGroups(groupsToPrint); setShowPrintOptions(false); }} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg mb-2">Confirmar e Imprimir</button>
<button onClick={() => setShowPrintOptions(false)} className="w-full py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
