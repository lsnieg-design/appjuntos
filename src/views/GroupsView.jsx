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
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove, increment, where } from 'firebase/firestore';


// Solo esta cabecera, con todos los parámetros que necesita el resto del código
export function GroupsView({ user, db, appId, setActiveTab }) {
  const [students, setStudents] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [turn, setTurn] = useState('morning'); 
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null); 
  const [activeTabModal, setActiveTabModal] = useState('info');
  const [groupMessages, setGroupMessages] = useState({}); // Mensajes por grupo
const [showGroupChat, setShowGroupChat] = useState(null); // Qué chat de grupo está abierto
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null); // Para abrir la ventana grande del grupo
  const [showMobileChat, setShowMobileChat] = useState(false);
const [informeEpoca, setInformeEpoca] = useState(1); // Para filtrar 1°, 2° o 3°
  
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  
  const userRoleStr = (user?.role || '').toLowerCase();
  const isDAIRole = userRoleStr.includes('inclusión') || userRoleStr.includes('inclusion') || userRoleStr.includes('dai');
  const [viewFilter, setViewFilter] = useState(isDAIRole ? 'inclusion' : 'sede');
  const [groupStats, setGroupStats] = useState(null);
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]); // Para saber si imprimimos uno o todos
  const [printColumns, setPrintColumns] = useState({
    dni: true,
    birthDate: true,
    healthInsurance: false,
    contacts: true,
    photo: false
  });
  const SOCIAL_TARGETS = ['mchancalay', 'Myrian Chancalay'];
  const scrollRef = useRef(null); 
  const scroll = (direction) => { if (scrollRef.current) { const amount = 350; scrollRef.current.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' }); } };

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role) || user.rol === 'admin';
  const isStrategic = ['super-admin', 'admin', 'Equipo Directivo', 'Equipo Técnico', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
  const LOGO_URL = "/icon-192.png";

  const INCIDENT_TYPES = [
      { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Ayudó a un amigo", emoji: "🤝", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Logro de Aprendizaje", emoji: "🚀", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
      { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
      { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-blue-100 border-blue-300 text-blue-800" }, 
      { label: "No trabajó", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
      { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-blue-50 border-blue-200 text-blue-700" }, 
      { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
      { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-indigo-100 border-indigo-300 text-indigo-800" }, 
  ];

  useEffect(() => {
    if (!db || !appId) return;
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const unsubU = onSnapshot(qU, (snap) => { setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
   return () => { unsubS(); unsubU(); unsubGM(); };
  }, []);
     const qGM = query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc'));
const unsubGM = onSnapshot(qGM, (snap) => {
    const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Los agrupamos por nombre de grupo para fácil acceso
    const groupedMsgs = msgs.reduce((acc, m) => {
        if (!acc[m.groupName]) acc[m.groupName] = [];
        acc[m.groupName].push(m);
        return acc;
    }, {});
    setGroupMessages(groupedMsgs);
});
  const getNormRole = (r) => {
    if (!r) return '';
    return r.trim();
  };

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
                  teacher2: s[`teacher2${suf}`], aux: s[`aux${suf}`], special1: s[`special1${suf}`], 
                  special2: s[`special2${suf}`], special3: s[`special3${suf}`], sup1: s[`sup1${suf}`], 
                  sup2: s[`sup2${suf}`], classroom: s.classroom, driveLink: s[`driveLink${suf}`], isInclusionGroup: false 
              }; 
          }
          acc[groupKey].students.push(s); 
      }
      return acc;
  }, {});
// Ordenamos los grupos: INICIAL siempre primero, el resto por nombre alfabético
  let groups = Object.values(groupedData).sort((a, b) => {
      const nameA = a.name.toUpperCase();
      const nameB = b.name.toUpperCase();
      
      // Si el grupo A es inicial y el B no, A va primero
      if (nameA.includes("INICIAL") && !nameB.includes("INICIAL")) return -1;
      // Si el grupo B es inicial y el A no, B va primero
      if (!nameA.includes("INICIAL") && nameB.includes("INICIAL")) return 1;
      
      // Si ambos son iniciales o ninguno lo es, ordenamos alfabéticamente normal
      return nameA.localeCompare(nameB);
  });

 // --- LÓGICA DE FILTRADO DEFINITIVA (SÓLO POR ID - UNIFICADA) ---
  if (!isManagement) {
      groups = groups.filter(g => {
          const uId = user.id;
          const legajoId = user.legajoId;
          const suf = turn === 'morning' ? 'Morning' : 'Afternoon';

          // 1. Chequeo de Equipo del Grupo (Titular, Auxiliar, Especiales)
          // Buscamos tu ID en cualquiera de estos campos del grupo
          const groupStaffIds = [
            g.teacherId, 
            g.auxId, 
            g.special1Id, 
            g.special2Id, 
            g.special3Id,
            g.sup1Id,
            g.sup2Id
          ];
          
          if (groupStaffIds.includes(uId) || (legajoId && groupStaffIds.includes(legajoId))) return true;

          // 2. Chequeo por Alumno (DAI o Docentes específicos en ficha)
          const vinculadoAAlumnx = g.students.some(s => 
              s.daiId === uId || (legajoId && s.daiId === legajoId) ||
              s[`teacherId${suf}`] === uId || (legajoId && s[`teacherId${suf}`] === legajoId) ||
              s[`teacherId2${suf}`] === uId || (legajoId && s[`teacherId2${suf}`] === legajoId) ||
              s[`auxId${suf}`] === uId || (legajoId && s[`auxId${suf}`] === legajoId)
          );
          
          if (vinculadoAAlumnx) return true;

          return false;
      });
  } else {
      // Si es directivo, filtramos por la pestaña Sede/Inclusión
      if (viewFilter !== 'all') { 
          groups = groups.filter(g => viewFilter === 'inclusion' ? g.isInclusionGroup : !g.isInclusionGroup); 
      }
  }

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };

const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe'); 
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
    document.body.appendChild(iframe);
    
    let fullHtml = `<html><head><title>Listado Institucional</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap'); 
      body{font-family:'Roboto', sans-serif; padding:20px; color:#333;} 
      .main-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 5px solid #7c3aed; padding-bottom: 10px; margin-bottom: 20px; } 
      .main-title { font-size: 24px; font-weight: 900; color: #4c1d95; text-transform: uppercase; margin: 0; } 
      .group-section { margin-bottom: 30px; page-break-inside: avoid; } 
      .group-header { background-color: #f3f4f6; border-left: 6px solid #7c3aed; padding: 10px 15px; margin-bottom: 10px; border-radius: 0 8px 8px 0; } 
      .group-name { font-size: 18px; font-weight: 900; color: #5b21b6; margin: 0; } 
      .group-staff { font-size: 10px; font-weight: bold; color: #555; margin-top: 4px; text-transform: uppercase; } 
      table { width: 100%; border-collapse: collapse; font-size: 10px; } 
      thead tr { background-color: #7c3aed !important; color: white !important; } 
      th { padding: 5px; text-align: left; text-transform: uppercase; font-weight: bold; border: 1px solid #ddd; } 
      td { border: 1px solid #e5e7eb; padding: 5px; color: #374151; vertical-align: middle; } 
      .photo-img { width: 30px; height: 30px; border-radius: 5px; object-fit: cover; border: 1px solid #ddd; }
      .footer { margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; text-align: right; font-size: 9px; color: #9ca3af; font-style: italic; }
    </style></head><body>
    <div class="main-header"><div><h1 class="main-title">Listado Institucional</h1><p class="main-subtitle">Ciclo 2026 - Turno ${turn === 'morning' ? 'Mañana' : 'Tarde'}</p></div><img src="${LOGO_URL}" style="height: 50px;" /></div>`;

    groupsList.forEach(g => {
        const sorted = [...g.students].sort((a,b) => a.lastName.localeCompare(b.lastName));
        let supText = g.sup1 || '-'; if (g.sup2) supText += ` / ${g.sup2}`;
        const aulaText = g.classroom ? ` | 🏫 AULA: ${g.classroom}` : '';
        
        fullHtml += `<div class="group-section"><div class="group-header"><h2 class="group-name">${g.name}</h2><div class="group-staff">DOC: ${g.teacher || 'VACANTE'} | AUX: ${g.aux || '-'} | SUP: ${supText} ${aulaText}</div></div>
        <table><thead><tr>
          <th width="3%">#</th>
          ${printColumns.photo ? '<th width="5%">Foto</th>' : ''}
          <th width="30%">Apellido y Nombre</th>
          ${printColumns.dni ? '<th width="12%">DNI</th>' : ''}
          ${printColumns.birthDate ? '<th width="12%">Nacimiento</th>' : ''}
          ${printColumns.healthInsurance ? '<th width="15%">Obra Social</th>' : ''}
          ${printColumns.contacts ? '<th>Familia / Contacto</th>' : ''}
        </tr></thead><tbody>`;

        sorted.forEach((s, i) => {
            fullHtml += `<tr>
                <td style="text-align:center;">${i+1}</td>
                ${printColumns.photo ? `<td>${s.photoUrl ? `<img src="${s.photoUrl}" class="photo-img"/>` : '-'}</td>` : ''}
                <td style="font-weight:bold;text-transform:uppercase;">${s.lastName}, ${s.firstName}</td>
                ${printColumns.dni ? `<td>${s.dni||'-'}</td>` : ''}
                ${printColumns.birthDate ? `<td>${getSafeDate(s.birthDate)}</td>` : ''}
                ${printColumns.healthInsurance ? `<td>${s.healthInsurance||'S/D'}</td>` : ''}
                ${printColumns.contacts ? `<td>${g.isInclusionGroup ? `Esc: ${s.originSchool}` : `M: ${s.motherName||'-'} (${s.motherContact||'-'}) / P: ${s.fatherName||'-'}`}</td>` : ''}
            </tr>`;
        });
        fullHtml += `</tbody></table></div>`;
    });
    fullHtml += `<div class="footer">Generado el ${new Date().toLocaleDateString()}</div></body></html>`;
    const doc = iframe.contentWindow.document; doc.open(); doc.write(fullHtml); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };
const printStaffOrganization = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);

    let html = `<html><head><title>Planilla de Organización</title><style>
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
      body{font-family:'Roboto', sans-serif; padding:20px; color:#333;}
      h1 { text-align: center; color: #4c1d95; text-transform: uppercase; font-size: 20px; margin-bottom: 20px; border-bottom: 3px solid #7c3aed; padding-bottom: 10px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th { background-color: #7c3aed; color: white; text-transform: uppercase; font-size: 10px; padding: 10px; border: 1px solid #ddd; }
      td { padding: 10px; border: 1px solid #ddd; font-size: 11px; font-weight: bold; text-align: center; text-transform: uppercase; }
      tr:nth-child(even) { background-color: #f3f4f6; }
      .footer { margin-top: 20px; text-align: right; font-size: 9px; color: #aaa; font-style: italic; }
    </style></head><body>
    <h1>Planilla de Organización de Personal - Turno ${turn === 'morning' ? 'Mañana' : 'Tarde'}</h1>
    <table>
      <thead>
        <tr>
          <th>Nivel</th>
          <th>Grupo</th>
          <th>Docente / DAI</th>
          <th>Auxiliar</th>
          <th>Aula Física</th>
        </tr>
      </thead>
      <tbody>`;

    groupsList.forEach(g => {
        html += `<tr>
          <td>${g.students[0]?.level || '-'}</td>
          <td style="color: #7c3aed;">${g.name}</td>
          <td>${g.teacher || 'VACANTE'} ${g.teacher2 ? `/ ${g.teacher2}` : ''}</td>
          <td>${g.aux || '-'}</td>
          <td>${g.classroom || '-'}</td>
        </tr>`;
    });

    html += `</tbody></table><p class="footer">Generado el ${new Date().toLocaleDateString()}</p></body></html>`;
    
    const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };
  const handlePrintAll = () => { printGroups(groups); };
  const handlePrintSingleGroup = (g) => { printGroups([g]); };

const handleReportAbsenteeism = async () => {
      if(!selectedStudent) return;
      const details = prompt(`¿Motivo del ausentismo o conflicto de ${selectedStudent.firstName}?`);
      if(!details) return;

      try {
          const caseData = {
              studentId: selectedStudent.id,
              studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
              level: selectedStudent.level || 'Sin Nivel',
              group: turn === 'morning' ? selectedStudent.groupMorning : selectedStudent.groupAfternoon,
              reason: details,
              reportedBy: user.firstName,
              status: 'Pendiente',
              steps: {
                  llamada: { done: false, date: null, obs: '' },
                  continuidad: { sent: false, date: null },
                  entrevista: { done: false, date: null }
              },
              history: [{ date: new Date().toISOString(), text: `Reporte inicial: ${details}`, author: user.firstName }],
              createdAt: serverTimestamp(),
              cycle: '2026'
          };
          
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'), caseData);

          if (new Date() >= new Date('2026-05-01')) {
              const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
              await updateDoc(userRef, { score: increment(15) });
          }

          alert("✅ Caso derivado a Trabajo Social (+15 pts).");
          setActiveTab('social'); 
      } catch (e) { alert("Error: " + e.message); }
  };

// --- FUNCIÓN UNIFICADA DE BITÁCORA ---
  const handleSaveIncident = async (type, severity = "medium", text = "") => {
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;

    setSavingIncident(true);

    const newInc = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: severity, 
        text: text || type, 
        author: user.fullName || user.firstName,
        authorId: user.id
    }; 

    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id); 
        
        // 1. Guardamos el incidente en el alumno
        await updateDoc(studentRef, { 
            incidents: arrayUnion(newInc) 
        }); 

        // 2. --- PUNTOS CHALLENGE / MAYO ---
        // Se activa si es >= 1 de Mayo
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(10) });
        }

        // 3. Actualización de interfaz local
        if (viewingStudent && viewingStudent.id === activeStudent.id) {
            setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents || []), newInc]}));
        }

        // 4. Limpieza y cierre
        setNewNote("");
        setIsWriting(false);
        if (typeof setShowBitacoraModal === 'function') setShowBitacoraModal(null);
        
        alert("✅ Registro guardado correctamente.");
    } catch (e) {
        console.error("Error al guardar:", e);
        alert("❌ Error: " + e.message);
    } finally {
        setSavingIncident(false);
    }
  };
 const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

const handleUpdateGroup = async (e) => { 
      e.preventDefault(); 
      if (!editingGroup) return; 
      setUpdatingGroup(true); 
      const fd = new FormData(e.target); 
      const updates = {}; 
      const suf = turn === 'morning' ? 'Morning' : 'Afternoon'; 

      const getName = (id) => {
        if (!id) return "";
        const found = usersList.find(u => u.id === id);
        return found ? found.fullName : "";
      };

      try {
          if (!editingGroup.isInclusionGroup) { 
              // Docente 1
              const tId = fd.get('teacher');
              updates[`teacherId${suf}`] = tId; 
              updates[`teacher${suf}`] = getName(tId);

              // Docente 2 (Pareja)
              const t2Id = fd.get('teacher2Id');
              updates[`teacherId2${suf}`] = t2Id;
              updates[`teacher2${suf}`] = getName(t2Id);

              // Auxiliar
              const aId = fd.get('auxId');
              updates[`auxId${suf}`] = aId;
              updates[`aux${suf}`] = getName(aId);

              // Especiales (1, 2 y 3)
              [1, 2, 3].forEach(num => {
                const specId = fd.get(`special${num}Id`);
                updates[`special${num}Id${suf}`] = specId || "";
                updates[`special${num}${suf}`] = getName(specId);
              });

              updates[`group${suf}`] = fd.get('groupName'); 
              updates.classroom = fd.get('classroom'); 
              updates[`driveLink${suf}`] = fd.get('driveLink');
          } else { 
              const dId = fd.get('teacher');
              updates['daiId'] = dId; 
              updates['daiMorning'] = getName(dId); 
              updates['daiAfternoon'] = getName(dId);
              updates[`driveLink${suf}`] = fd.get('driveLink');
          } 
      
          const promises = editingGroup.students.map(s => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), updates)); 
          await Promise.all(promises); 
          setEditingGroup(null); 
      } catch (err) { 
          alert("Error: " + err.message); 
      } finally { 
          setUpdatingGroup(false); 
      } 
  };

  const staffOptions = usersList.filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico', 'Profes Especiales', 'DAI', 'Inclusión'].includes(u.role));
  const techOptions = usersList.filter(u => u.role === 'Equipo Técnico' || u.role === 'Equipo Técnico Inclusión' || u.role === 'Trabajadora Social');
  const specialOptions = usersList.filter(u => u.role === 'Profes Especiales' || u.role === 'Docente');
  const handleToggleInforme = async (estudiante, numeroInforme) => {
  const campo = `informe${numeroInforme}`;
  const estadoActual = estudiante[campo] || { enviado: false };
  let nuevoEstado = {};

  if (!estadoActual.enviado) {
    // Pasa a ENVIADO (Naranja)
    nuevoEstado = { enviado: true, fechaEnvio: new Date().toISOString(), devuelto: false, archivado: false };
  } else if (!estadoActual.devuelto) {
    // Pasa a DEVUELTO (Azul)
    nuevoEstado = { ...estadoActual, devuelto: true, fechaDevuelto: new Date().toISOString() };
  } else if (!estadoActual.archivado) {
    // Pasa a ARCHIVADO (Verde)
    nuevoEstado = { ...estadoActual, archivado: true };
  } else {
    // RESET (Vuelve a Gris)
    nuevoEstado = { enviado: false };
  }

  try {
    const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id);
    await updateDoc(docRef, { [campo]: nuevoEstado });
    // Aquí podrías agregar un mensaje de éxito si quisieras
  } catch (error) {
    console.error("Error al actualizar informe:", error);
  }
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
        e.target.reset();
    } catch (err) { alert(err.message); }
};
const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const estadoActual = estudiante[campo] || { status: 'Pendiente' };
    let nuevoEstado = {};

    // Ciclo de estados con texto
    switch (estadoActual.status) {
      case 'Pendiente': nuevoEstado = { status: 'Hecho' }; break;
      case 'Hecho': nuevoEstado = { status: 'Impreso' }; break;
      case 'Impreso': nuevoEstado = { status: 'Enviado', fechaEnvio: new Date().toISOString() }; break;
      case 'Enviado': nuevoEstado = { status: 'Archivado' }; break;
      default: nuevoEstado = { status: 'Pendiente' }; // Reinicia el ciclo
    }

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id);
      await updateDoc(docRef, { [campo]: nuevoEstado });
      
      const nuevosEstudiantes = selectedGroupDetails.students.map(s => 
        s.id === estudiante.id ? { ...s, [campo]: nuevoEstado } : s
      );
      setSelectedGroupDetails({ ...selectedGroupDetails, students: nuevosEstudiantes });
      
      if (new Date() >= new Date('2026-05-01')) {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
        await updateDoc(userRef, { score: increment(5) });
      }
    } catch (error) { console.error("Error:", error); }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative">
      {!isManagement && (
        <div className="bg-white px-6 py-4 border-b flex items-center gap-4 shrink-0">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600 shadow-inner"> <User size={24} /> </div>
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Docente Identificada</p>
            <h2 className="text-lg font-black text-violet-900 uppercase italic leading-none">{user.fullName || `${user.firstName} ${user.lastName}`}</h2>
            <p className="text-[9px] font-bold text-orange-500 mt-1 uppercase">ID: {user.id.substring(0,8)}...</p>
          </div>
        </div>
      )}
      <div className="bg-white p-4 shadow-sm z-10 sticky top-0 flex flex-col gap-3">
          <div className="flex justify-between items-center">
              <div>
                  <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2"><Grid size={24} className="text-orange-500"/> Mis Grupos</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase">{isManagement ? "Vista Institucional" : `Espacio Docente`}</p>
              </div>
              {isManagement && <button onClick={() => { setGroupsToPrint(groups); setShowPrintOptions(true); }} className="bg-violet-100 text-violet-700 p-2 rounded-xl shadow-sm hover:bg-violet-200 transition" title="Imprimir Todo"><FileText size={24}/></button>}
          </div>
          <div className={`flex gap-2 ${viewFilter === 'inclusion' ? 'justify-end' : ''}`}>
              {viewFilter !== 'inclusion' && (
                  <div className="flex bg-gray-100 p-1 rounded-xl flex-1">
                      <button onClick={() => setTurn('morning')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${turn === 'morning' ? 'bg-white text-orange-500 shadow-sm' : 'text-gray-400'}`}>☀️ Mañana</button>
                      <button onClick={() => setTurn('afternoon')} className={`flex-1 py-2 rounded-lg text-xs font-black uppercase ${turn === 'afternoon' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>🌙 Tarde</button>
                  </div>
              )}
              {isManagement && (
                  <div className="flex bg-gray-100 p-1 rounded-xl">
                      <button onClick={() => setViewFilter('sede')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Sede</button>
                      <button onClick={() => setViewFilter('inclusion')} className={`px-4 py-2 rounded-lg text-xs font-bold transition ${viewFilter === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400'}`}>Inclusión</button>
                  </div>
              )}
          </div>
      </div>
      
      <div className="relative flex-1 overflow-hidden">
          <button onClick={() => scroll('left')} className="hidden md:flex absolute left-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronLeft size={24}/></button>
          <button onClick={() => scroll('right')} className="hidden md:flex absolute right-2 top-1/2 z-20 bg-white/90 text-violet-600 p-3 rounded-full shadow-xl border border-gray-100 hover:scale-110 transition -translate-y-1/2"><ChevronRight size={24}/></button>
          <div ref={scrollRef} className={`h-full overflow-x-auto p-6 scroll-smooth flex gap-6 items-start ${groups.length <= 2 ? 'justify-center' : ''}`}>
                {groups.length === 0 && (<div className="m-auto text-center opacity-50"><p className="font-bold text-gray-400">No hay grupos visibles.</p></div>)} 
                {groups.map((g) => (
                   <div key={g.name} className={`flex flex-col h-[calc(100vh-220px)] md:h-fit bg-white rounded-[30px] border shadow-sm relative overflow-hidden group-hover:shadow-md transition shrink-0 ${groups.length <= 2 ? 'w-full max-w-[900px]' : 'min-w-[280px] w-[300px]'} ${g.isInclusionGroup ? 'border-indigo-200' : 'border-gray-200'}`}>
                      <div className={`p-4 border-b-4 relative ${g.isInclusionGroup ? 'bg-indigo-50 border-indigo-400' : (turn==='morning'?'border-orange-400 bg-orange-50':'border-indigo-400 bg-indigo-50')}`}>
  <div className="absolute top-2 right-2 flex gap-1">
      {/* NUEVO BOTÓN + (MODO ENFOQUE) */}
      <button 
        onClick={() => setSelectedGroupDetails(g)} 
        className="p-2 bg-violet-600 text-white rounded-full shadow-lg hover:scale-110 transition active:scale-95" 
        title="Ver Grupo Completo"
      >
        <Plus size={16}/>
      </button>
      <button onClick={() => { setGroupsToPrint([g]); setShowPrintOptions(true); }} className="p-2 bg-white/50 hover:bg-white rounded-full text-violet-600 shadow-sm transition"><Printer size={14}/></button>
      {isManagement && <button onClick={()=>setEditingGroup(g)} className="p-2 bg-white/50 hover:bg-white rounded-full text-gray-600 shadow-sm transition"><Edit3 size={14}/></button>}
  </div>
  
  <div className="flex items-center gap-2 pr-12 flex-wrap">
    <h3 className="font-black text-gray-800 text-lg leading-tight">{g.name}</h3>
    <span className="bg-white/80 text-violet-700 px-2 py-0.5 rounded-md text-[9px] font-black shadow-sm border border-violet-100 shrink-0">{g.students.length} ALUMNXS</span>
  </div>

  <div className="mt-2 text-[11px] text-gray-500 font-medium space-y-0.5">
      <p>DOC: <span className="font-bold text-violet-700 uppercase">{g.teacher || 'Sin asignar'}</span></p>
      {g.aux && <p>AUX: <span className="font-bold text-slate-600 uppercase">{g.aux}</span></p>}
    {g.classroom && (<p className="text-orange-600 font-black">🏫 Aula {g.classroom}</p>)}
  </div>
</div>
                   
                     <div className="flex-1 overflow-y-auto p-4 bg-gray-50 grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-3 content-start">
                        {g.students.map(s => (
                            <div key={s.id} onClick={() => {setSelectedStudent(s); setActiveTab('info');}} className="bg-white p-3 rounded-2xl shadow-sm flex items-center gap-3 cursor-pointer hover:scale-[1.02] transition">
                                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0 border border-gray-100">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center w-full h-full font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                                <div><h4 className="font-bold text-gray-700 text-sm">{s.firstName} {s.lastName}</h4>{g.isInclusionGroup && <p className="text-[10px] text-indigo-500 font-bold">Esc. {s.originSchool}</p>}</div>
                                <button onClick={(e) => {e.stopPropagation(); setShowBitacoraModal(s); setIsWriting(false); setNewNote("");}} className="ml-auto w-8 h-8 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center hover:bg-violet-600 hover:text-white transition">⚡</button>
                            </div>
                        ))}
                      </div>
                    </div>
                ))}
          </div>
      </div>

      {showBitacoraModal && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4"><div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500">
        <div className="flex justify-between items-center mb-4"><div><h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3><p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p></div><button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20}/></button></div>
        {!isWriting ? (
            <>
                <div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">{INCIDENT_TYPES.map((type) => (<button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? 'opacity-50' : 'hover:brightness-95'}`}><span className="text-2xl">{type.emoji}</span><span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span></button>))}</div>
                <button onClick={() => setIsWriting(true)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2"><Edit3 size={16}/> Escribir Nota</button>
            </>
        ) : (
            <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Escribí los detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500"/>
                <div className="flex gap-2"><button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Volver</button><button onClick={() => addIncident('medium', newNote)} disabled={!newNote.trim()} className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button></div>
            </div>
        )}
      </div></div>)}

     {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateGroup} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Editar Grupo</h3>
              <button type="button" onClick={() => setEditingGroup(null)}><X size={20}/></button>
            </div>

            <div className="space-y-4">
              <div className="bg-violet-50 p-3 rounded-xl border border-violet-100 text-center">
                <p className="text-xs text-violet-500 font-bold uppercase mb-1">
                  {editingGroup.isInclusionGroup ? "Editando Inclusión" : "Editando Sede"}
                </p>
                {!editingGroup.isInclusionGroup && (
                  <input name="groupName" defaultValue={editingGroup.name} className="font-black text-2xl text-violet-900 bg-transparent text-center w-full outline-none border-b border-violet-200" placeholder="Nombre Grupo" />
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 ml-1">Docente Titular (1)</label>
                <select name="teacher" defaultValue={editingGroup.teacherId || ""} className="w-full p-3 bg-white border-2 border-violet-100 rounded-xl outline-none font-bold text-xs">
                  <option value="">Seleccionar...</option>
                  {usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                </select>
              </div>

              {!editingGroup.isInclusionGroup && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Docente Pareja (2)</label>
                    <select name="teacher2Id" defaultValue={editingGroup.teacherId2 || ""} className="w-full p-3 bg-white border-2 border-violet-100 rounded-xl outline-none font-bold text-xs">
                      <option value="">Ninguno / Vacante</option>
                      {usersList.map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                  </div>

                 <div>
  <label className="text-xs font-bold text-gray-500 ml-1">Auxiliar / Preceptora</label>
  <select 
    name="auxId" 
    defaultValue={editingGroup.auxId || ""} 
    className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-transparent focus:border-violet-200"
  >
    <option value="">Sin asignar</option>
    {/* Filtro ampliado: Aparecen Docentes, Auxiliares, Preceptores e Inclusión */}
    {usersList
      .filter(u => ['Docente', 'Auxiliar/Preceptor', 'Preceptora', 'Auxiliar', 'Inclusión'].includes(u.role))
      .map(u => (
        <option key={u.id} value={u.id}>
          {u.lastName}, {u.firstName} ({u.role})
        </option>
      ))
    }
  </select>
</div>

                  <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 space-y-3">
                    <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest ml-1">Profesores Especiales</p>
                    <select name="special1Id" defaultValue={editingGroup.special1Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 1...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                    <select name="special2Id" defaultValue={editingGroup.special2Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 2...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                    <select name="special3Id" defaultValue={editingGroup.special3Id || ""} className="w-full p-2 bg-white rounded-lg border border-violet-100 text-xs font-bold">
                      <option value="">Especial 3...</option>
                      {usersList.filter(u => u.role === "Profes Especiales").map(u => <option key={u.id} value={u.id}>{u.lastName}, {u.firstName}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-500 ml-1">Aula Física</label>
                    <input name="classroom" defaultValue={editingGroup.classroom || ""} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs" placeholder="Ej: 4"/>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-green-600 ml-1">Drive del Grupo</label>
                <input name="driveLink" defaultValue={editingGroup.driveLink || ""} className="w-full p-3 bg-green-50 border border-green-100 rounded-xl outline-none font-bold text-xs text-green-700" placeholder="https://..." />
              </div>
              {/* Campo para el link de fotos en la edición del grupo */}
<div className="space-y-4 mt-4">
  {/* CAMPO 1: CARPETA DE FOTOS (VERDE) */}
  <div>
    <label className="text-[10px] font-black text-emerald-600 uppercase ml-1">Link Carpeta de Fotos (Drive)</label>
    <input 
      type="text"
      placeholder="Pegá el link de la carpeta de FOTOS acá"
      defaultValue={editingGroup.driveLink || ""}
      onChange={(e) => setEditingGroup({...editingGroup, driveLink: e.target.value})}
      className="w-full p-3 bg-emerald-50 border border-emerald-100 rounded-2xl text-xs font-bold text-emerald-800 outline-none focus:ring-2 ring-emerald-200"
    />
  </div>

  {/* CAMPO 2: CARPETA INSTITUCIONAL (AZUL) */}
  <div>
    <label className="text-[10px] font-black text-blue-600 uppercase ml-1">Link Carpeta Drive (Documentación)</label>
    <input 
      type="text"
      placeholder="Pegá el link del DRIVE INSTITUCIONAL acá"
      defaultValue={editingGroup.institucionalDrive || ""}
      onChange={(e) => setEditingGroup({...editingGroup, institucionalDrive: e.target.value})}
      className="w-full p-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-800 outline-none focus:ring-2 ring-blue-200"
    />
  </div>
</div>
              <button type="submit" disabled={updatingGroup} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black shadow-lg uppercase text-xs mt-4">
                {updatingGroup ? <span>Cargando...</span> : <span>Aplicar Cambios</span>}
              </button>
            </div>
          </form>
        </div>
      )}

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4 text-center">Info a Imprimir</h3>
            <p className="text-[10px] text-gray-400 font-bold uppercase text-center mb-4 tracking-widest">Listado de Estudiantes</p>
            <div className="grid grid-cols-1 gap-2 mb-6">
              {[
                {id: "photo", label: "📸 Foto del Alumno"},
                {id: "dni", label: "🪪 DNI"},
                {id: "birthDate", label: "📅 Fecha Nacimiento"},
                {id: "healthInsurance", label: "🏥 Obra Social"},
                {id: "contacts", label: "📞 Contactos Familia"},
              ].map(col => (
                <label key={col.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-violet-50 transition border border-transparent hover:border-violet-200">
                  <span className="text-xs font-bold text-gray-600 uppercase">{col.label}</span>
                  <input 
                    type="checkbox" 
                    checked={printColumns[col.id]} 
                    onChange={() => setPrintColumns({...printColumns, [col.id]: !printColumns[col.id]})}
                    className="w-5 h-5 accent-violet-600"
                  />
                </label>
              ))}
            </div>

            <div className="relative h-px bg-gray-100 my-6">
              <span className="absolute left-1/2 -translate-x-1/2 -top-2 bg-white px-3 text-[8px] font-black text-gray-300 uppercase tracking-widest">Otras Plantillas</span>
            </div>

            <button 
              onClick={() => { printStaffOrganization(groupsToPrint); setShowPrintOptions(false); }}
              className="w-full py-4 bg-teal-50 text-teal-700 border-2 border-teal-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-teal-100 transition active:scale-95 flex items-center justify-center gap-2 mb-6"
            >
              <Users size={16}/> Solo Organización (Cargos)
            </button>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowPrintOptions(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
              <button 
                onClick={() => { printGroups(groupsToPrint); setShowPrintOptions(false); }} 
                className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-violet-700 transition"
              >
                Imprimir Alumnos
              </button>
            </div>
          </div>
        </div>
      )}

      {groupStats && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[250] flex items-center justify-center p-4" onClick={() => setGroupStats(null)}><div className="bg-white rounded-[40px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}><div className="flex justify-between items-center mb-6"><div><h3 className="text-xl font-black text-violet-900 uppercase italic">Análisis del Grupo</h3><p className="text-xs text-gray-500 font-bold">{groupStats.name}</p></div><button onClick={() => setGroupStats(null)}><X size={20}/></button></div></div></div>)}
{selectedStudent && (
  <StudentDetailView 
    student={selectedStudent} 
    user={user}
    db={db}
    appId={appId}
    onClose={() => setSelectedStudent(null)} 
    onEdit={(s) => {
       setActiveTab('matricula'); 
       // Opcional: podrías guardar el ID para que MatriculaView lo abra automáticamente
    }}
  />
)}
{selectedGroupDetails && (
  <div className="fixed inset-0 bg-slate-900 z-[500] flex flex-col animate-in fade-in duration-300 overflow-hidden">
    {/* HEADER DINÁMICO */}
    <div className="bg-white p-4 flex justify-between items-center border-b-4 border-violet-100 shrink-0 z-[600]">
      <div className="flex items-center gap-3">
        <div className="bg-violet-600 text-white p-2 rounded-xl shadow-lg">
           <Users size={20}/>
        </div>
        <div>
          <h2 className="text-lg md:text-2xl font-black text-slate-800 uppercase italic leading-none">{selectedGroupDetails.name}</h2>
          <p className="text-[9px] font-bold text-violet-400 uppercase tracking-[2px]">Control de Gestión</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        {/* ICONO DE CHAT PARA CELU */}
        <button 
          onClick={() => {
            setShowMobileChat(true);
            const total = groupMessages[selectedGroupDetails.name]?.length || 0;
            localStorage.setItem(`read_${selectedGroupDetails.name}_${user.id}`, total);
          }}
          className="lg:hidden relative p-3 bg-orange-100 text-orange-600 rounded-full active:scale-90 transition-all"
        >
          <MessageSquare size={24} />
          {(() => {
            const total = groupMessages[selectedGroupDetails.name]?.length || 0;
            const read = parseInt(localStorage.getItem(`read_${selectedGroupDetails.name}_${user.id}`) || "0");
            if (total > read) return <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-[10px] font-black flex items-center justify-center rounded-full border-2 border-white animate-bounce">{total - read}</span>;
          })()}
        </button>

        <button onClick={() => setSelectedGroupDetails(null)} className="bg-slate-100 p-3 rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X size={24}/></button>
      </div>
    </div>

    <div className="flex-1 flex flex-row overflow-hidden bg-white">
      
      {/* PANEL IZQUIERDO: INFORMES, STAFF Y DRIVE */}
      <div className={`flex-1 flex flex-col h-full border-r border-slate-100 bg-white overflow-y-auto custom-scrollbar ${showMobileChat ? 'hidden lg:flex' : 'flex'}`}>
        <div className="p-6 space-y-6">
            
            {/* BOTONES DRIVE CORREGIDOS (Invertidos según tu pedido) */}
            <div className="grid grid-cols-2 gap-3">
                <button onClick={() => selectedGroupDetails.institucionalDrive ? window.open(selectedGroupDetails.institucionalDrive, '_blank') : alert('Falta link')}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-blue-50 text-blue-700 border border-blue-100 hover:bg-blue-100 transition-all active:scale-95 shadow-sm">
                    <FileText size={20}/> <span className="font-black text-[10px] uppercase tracking-tighter">Drive Institucional</span>
                </button>
                <button onClick={() => selectedGroupDetails.driveLink ? window.open(selectedGroupDetails.driveLink, '_blank') : alert('Falta link')}
                    className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95 shadow-sm">
                    <Folder size={20}/> <span className="font-black text-[10px] uppercase tracking-tighter">Carpeta Fotos</span>
                </button>
            </div>

            {/* SELECTOR DE ÉPOCA CON NUEVOS TÍTULOS */}
            <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar período de informes:</p>
                <div className="flex bg-slate-100 p-1 rounded-2xl">
                {[
                    {id: 1, label: 'Inicial'},
                    {id: 2, label: 'Medio'},
                    {id: 3, label: 'Final'}
                ].map(epoca => (
                    <button key={epoca.id} onClick={() => setInformeEpoca(epoca.id)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${informeEpoca === epoca.id ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>
                    Informe {epoca.label}
                    </button>
                ))}
                </div>
            </div>

            {/* STAFF RESPONSABLE COMPLETO */}
            <div className="bg-slate-50 p-5 rounded-[30px] border border-slate-100 space-y-4 shadow-inner">
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 text-center">
                        <p className="text-[7px] font-black text-violet-400 uppercase">Titular</p>
                        <p className="text-[10px] font-black text-slate-700 truncate uppercase">{selectedGroupDetails.teacher}</p>
                    </div>
                    {selectedGroupDetails.aux && (
                      <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-100 text-center">
                          <p className="text-[7px] font-black text-orange-400 uppercase">Auxiliar</p>
                          <p className="text-[10px] font-black text-slate-700 truncate uppercase">{selectedGroupDetails.aux}</p>
                      </div>
                    )}
                </div>
                <div className="px-2 space-y-1 border-t border-slate-200 pt-3">
                    <p className="text-[9px] font-bold text-slate-500 italic flex items-center gap-1">✨ Especiales: <span className="text-slate-700 not-italic font-black uppercase">{[selectedGroupDetails.special1, selectedGroupDetails.special2, selectedGroupDetails.special3].filter(Boolean).join(' • ') || '-'}</span></p>
                    <p className="text-[9px] font-bold text-indigo-400 flex items-center gap-1">🔍 Supervisión: <span className="text-indigo-600 font-black uppercase">{[selectedGroupDetails.sup1, selectedGroupDetails.sup2].filter(Boolean).join(' & ') || '-'}</span></p>
                </div>
            </div>

            {/* LISTADO DE INFORMES */}
            <div className="space-y-3 pb-20">
                <h3 className="font-black text-sm uppercase text-slate-800 tracking-[2px] border-l-4 border-violet-500 pl-3">
                    {informeEpoca === 1 ? 'INFORME INICIAL' : informeEpoca === 2 ? 'INFORME MEDIO' : 'INFORME FINAL'}
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {selectedGroupDetails.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => {
                        const info = s[`informe${informeEpoca}`] || { status: 'Pendiente' };
                        const statusColors = {
                          'Hecho': 'bg-blue-600 text-white',
                          'Impreso': 'bg-violet-600 text-white',
                          'Enviado': 'bg-orange-500 text-white',
                          'Archivado': 'bg-emerald-600 text-white',
                          'Pendiente': 'bg-slate-50 text-slate-400 border-slate-200'
                        };
                        return (
                          <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-3xl border-2 border-slate-100 shadow-sm hover:border-violet-200 transition-all gap-4">
                              <span className="font-black text-lg text-slate-700 uppercase tracking-tighter">{s.lastName}, {s.firstName}</span>
                              <button 
                                onClick={() => handleToggleInformeGrupo(s, informeEpoca)}
                                className={`py-4 px-6 rounded-2xl text-[10px] font-black uppercase shadow-md transition-all active:scale-95 min-w-[140px] ${statusColors[info.status] || statusColors['Pendiente']}`}
                              >
                                {info.status}
                              </button>
                          </div>
                        );
                    })}
                </div>
            </div>
        </div>
      </div>

      {/* PANEL DERECHO: MURAL */}
      <div 
        className={`lg:flex lg:flex-1 flex-col bg-slate-50 relative border-l-4 border-violet-50 ${showMobileChat ? 'fixed inset-0 z-[700] flex' : 'hidden'}`}
        onMouseEnter={() => {
            const total = groupMessages[selectedGroupDetails.name]?.length || 0;
            localStorage.setItem(`read_${selectedGroupDetails.name}_${user.id}`, total);
        }}
      >
        <button onClick={() => setShowMobileChat(false)} className="lg:hidden absolute top-4 right-4 z-[800] bg-white p-2 rounded-full shadow-xl text-slate-800"><X size={24}/></button>
        <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#4c1d95 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
        
        <div className="p-5 bg-white/80 backdrop-blur-md border-b flex items-center gap-3 shrink-0 z-10">
            <div className="p-2 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-100"><MessageSquare size={18}/></div>
            <div>
                <h3 className="font-black text-slate-800 uppercase italic text-sm">Muro de Intercambio</h3>
                <p className="text-[8px] font-bold text-orange-500 uppercase tracking-widest">Cualquier miembro del equipo puede escribir aquí ✍️</p>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 flex flex-col-reverse custom-scrollbar z-10 overscroll-contain">
          {groupMessages[selectedGroupDetails.name]?.map(m => (
            <div key={m.id} className={`flex flex-col ${m.authorId === user.id ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[85%] md:max-w-[80%] p-4 rounded-[25px] shadow-sm ${
                m.authorId === user.id ? 'bg-violet-600 text-white rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
              }`}>
                <div className="flex justify-between items-center mb-1 gap-6">
                  <span className={`text-[9px] font-black uppercase tracking-tighter ${m.authorId === user.id ? 'text-violet-200' : 'text-violet-600'}`}>{m.author}</span>
                  <span className="text-[8px] font-bold opacity-40">{m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '...'}</span>
                </div>
                <p className="text-sm font-medium leading-tight">{m.text}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="p-6 bg-white border-t-2 border-slate-100 z-10">
          <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails.name)} className="flex items-center gap-3 bg-slate-50 p-2 rounded-[30px] border-2 border-slate-200 focus-within:border-orange-300 focus-within:bg-white transition-all shadow-inner">
            <input name="comment" autoComplete="off" placeholder="Escribir novedad..." className="flex-1 bg-transparent border-none px-5 py-3 text-sm font-bold text-slate-700 outline-none" />
            <button type="submit" className="bg-orange-500 text-white p-4 rounded-full shadow-lg active:scale-90 transition-transform"><Send size={20} /></button>
          </form>
        </div>
      </div>
    </div>
  </div>
)}

      {/* MODAL BITÁCORA EXPRESS (EXTERNO) */}
      {showBitacoraModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95 border-t-8 border-emerald-500">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3>
                <p className="text-xs text-gray-500 font-bold">Alumno: {showBitacoraModal.firstName}</p>
              </div>
              <button onClick={() => setShowBitacoraModal(null)} className="bg-gray-100 p-2 rounded-full"><X size={20} /></button>
            </div>
            {!isWriting ? (
              <>
                <div className="grid grid-cols-2 gap-3 mb-4 max-h-[50vh] overflow-y-auto">
                  {INCIDENT_TYPES.map((type) => (
                    <button
                      key={type.label}
                      onClick={() => handleSaveIncident(type.label, type.severity)}
                      disabled={savingIncident}
                      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}
                    >
                      <span className="text-2xl">{type.emoji}</span>
                      <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setIsWriting(true)} className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold uppercase text-xs flex items-center justify-center gap-2"><Edit3 size={16} /> Escribir Nota</button>
              </>
            ) : (
              <div className="animate-in slide-in-from-bottom">
                <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm mb-2 h-24 outline-none focus:border-violet-500" />
                <div className="flex gap-2">
                  <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs hover:bg-gray-100 rounded-xl">Volver</button>
                  <button
                    onClick={() => handleSaveIncident("Nota", "medium", newNote)}
                    disabled={!newNote.trim() || savingIncident}
                    className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg"
                  >
                    {savingIncident ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
