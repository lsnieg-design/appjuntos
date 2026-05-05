import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, Search, X, Plus, UploadCloud, PieChart, 
  FileText, Download, Eye, User, Folder, Activity, 
  AlertTriangle, Trash2, Edit3, CheckCircle, AlertCircle 
} from 'lucide-react';

import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, serverTimestamp, 
  arrayUnion, arrayRemove, getDocs, increment 
} from 'firebase/firestore';

export function MatriculaView({ user, db, appId }) {
  // ==========================================
  // 1. ESTADOS Y CONFIGURACIÓN
  // ==========================================
  const [students, setStudents] = useState([]);
  const [savingIncident, setSavingIncident] = useState(false);
  const [usersList, setUsersList] = useState([]); 
  const [showQuickFix, setShowQuickFix] = useState(false);
  const [fixingField, setFixingField] = useState('gender'); // 'gender' o 'dx'
  const [socialCases, setSocialCases] = useState([])
  
  // Estados de visualización y edición
  const [viewingStudent, setViewingStudent] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [duplicates, setDuplicates] = useState(null);
  const [activeModalTab, setActiveModalTab] = useState('info'); // 'info' o 'history'
  
  // Filtros
  const [filterText, setFilterText] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [formModalidad, setFormModalidad] = useState('Sede');
  const [filters, setFilters] = useState({ 
      modality: 'all', 
      level: 'all', 
      group: 'all', 
      turn: 'all', 
      teacher: 'all', 
      dx: 'all', 
      gender: 'all', 
      journey: 'all', 
      os: 'all' 
  });
  const handleQuickUpdate = async (id, field, value) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id), { [field]: value });
      // Opcional: alert sutil o feedback visual
    } catch (e) { console.error("Error actualizando:", e); }
  };
 const [statFilters, setStatFilters] = useState({ 
      modality: [], 
      level: [], 
      gender: 'all', 
      dx: 'all',
      turn: 'all',
      journey: 'all'
  });
const [statOnlyPreTaller, setStatOnlyPreTaller] = useState(false);
  // Estados de Bitácora
  const [newNote, setNewNote] = useState("");
  const [isWriting, setIsWriting] = useState(false);

  // Estados de Modales
  const [showStats, setShowStats] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showDataManagement, setShowDataManagement] = useState(false);
  const [showUnassigned, setShowUnassigned] = useState(false);
  const [unassignedList, setUnassignedList] = useState([]);
  
  // Estados de Procesos (Carga, Fotos, Importación)
  const [photoPreview, setPhotoPreview] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Constantes y Roles
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin' || user.role === 'Equipo Directivo' || user.role === 'Dirección Inclusión';
  const canSearchDrive = isSuperAdmin || user.role === 'Administración'; 
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
  const checkCudStatus = (cudDate) => {
    if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
    
    const today = new Date();
    const exp = new Date(cudDate + 'T00:00:00');
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
    if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` }; // Alerta 3 meses
    
    return { status: 'ok', text: 'Vigente' };
  };

  // ==========================================
  // 2. CARGA DE DATOS (FIREBASE)
  // ==========================================
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const uS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qU = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('lastName', 'asc'));
    const uU = onSnapshot(qU, (snap) => setUsersList(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const qSocial = query(collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'));
    const uSocial = onSnapshot(qSocial, (snap) => {
        // Guardamos los casos en un estado temporal o lo usamos directamente. 
        // Para no romper nada, lo ideal es crear un estado [socialCases, setSocialCases] arriba.
        setSocialCases(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
   return () => { 
        uS(); 
        uU(); 
        if (typeof uSocial === 'function') uSocial(); 
    };
  }, [appId]);

  // Listas auxiliares para selects
  const staffSede = (usersList||[]).filter(u => ['Docente', 'Auxiliar/Preceptor', 'Equipo Técnico'].includes(u.role));
  const staffInclusion = (usersList||[]).filter(u => ['DAI', 'Equipo Técnico Inclusión', 'Inclusión'].includes(u.role));
  const uniqueGroups = [...new Set([...students.map(s => s.groupMorning), ...students.map(s => s.groupAfternoon)].filter(Boolean))].sort();
  const staffAll = usersList || [];

  // ==========================================
  // 3. LÓGICA DE FILTRADO
  // ==========================================
const filteredStudents = students.filter(s => {
      // 1. Filtro de Estado (Activos vs Bajas)
      // Si showArchived es true, mostramos solo los s.isActive === false
      // Si showArchived es false, mostramos solo los s.isActive !== false
      const isStudentActive = s.isActive !== false;
      if (showArchived && isStudentActive) return false;
      if (!showArchived && !isStudentActive) return false;

      // 2. BUSCADOR UNIVERSAL (Nombre, Apellido, DNI)
      const textToSearch = `${s.lastName || ''} ${s.firstName || ''} ${s.dni || ''}`.toLowerCase();
      const searchTxt = (filterText || '').toLowerCase();
      if (searchTxt && !textToSearch.includes(searchTxt)) return false;

      // 3. FILTROS DE SELECTORES (Solo si no estamos viendo bajas, para no romper la vista)
      if (!showArchived && filters) {
          if (filters.modality && filters.modality !== 'all') {
              const mod = s.modality || 'Sede';
              if (mod !== filters.modality) return false;
          }
          if (filters.level && filters.level !== 'all' && s.level !== filters.level) return false;
          if (filters.dx && filters.dx !== 'all' && s.dx !== filters.dx) return false;
          if (filters.gender && filters.gender !== 'all' && s.gender !== filters.gender) return false;
          if (filters.journey && filters.journey !== 'all' && s.journey !== filters.journey) return false;
      }

      return true;
  });
  const toggleStatFilter = (category, value) => { setStatFilters(prev => { const currentList = prev[category]; if (currentList.includes(value)) return { ...prev, [category]: currentList.filter(item => item !== value) }; else return { ...prev, [category]: [...currentList, value] }; }); };

  // ==========================================
  // 4. HELPERS Y UTILIDADES
  // ==========================================
  const getSeverityColor = (severity) => { 
      if(severity === 'positive') return 'bg-emerald-50 border-emerald-200'; 
      if(severity === 'high') return 'bg-red-50 border-red-200'; 
      if(severity === 'medium') return 'bg-orange-50 border-orange-200'; 
      return 'bg-gray-50 border-gray-100'; 
  };
  const getSafeDate = (d) => { if(!d) return ''; try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
  const getAlertStatus = (inc) => { if(!inc || !inc.length) return {status:'ok', count:0}; const d = new Date(); d.setDate(d.getDate()-15); const r = inc.filter(x => (x.severity==='high'||x.severity==='medium') && new Date(x.date)>=d); return { status: r.length>=5?'danger':r.length>=3?'warning':'ok', count: r.length }; };

// ==========================================
  // 5. ACCIONES Y MANEJADORES
  // ==========================================
  const openNew = () => { setEditingStudent(null); setPhotoPreview(null); setFormModalidad('Sede'); setShowForm(true); };
  const openEdit = (s) => { setEditingStudent(s); setPhotoPreview(s.photoUrl); setFormModalidad(s.modality || 'Sede'); setShowForm(true); };
  
  const handlePhotoChange = async (e) => { 
      const f = e.target.files[0]; if(!f) return; 
      setUploading(true); 
      try { 
          const reader = new FileReader(); 
          reader.onload=(ev)=>{
              const img=new Image(); 
              img.onload=()=>{
                  const c=document.createElement('canvas'); 
                  const s=300/img.width; c.width=300; c.height=img.height*s; 
                  const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height); 
                  setPhotoPreview(c.toDataURL('image/jpeg',0.7)); 
                  setUploading(false);
              }; 
              img.src=ev.target.result;
          }; 
          reader.readAsDataURL(f); 
      } catch(e){ setUploading(false); } 
  };

  const handleSave = async (e) => { 
      e.preventDefault(); 
      const fd = new FormData(e.target); 
      const d = Object.fromEntries(fd.entries()); 
      d.isActive = d.isActive === 'true'; 
      d.photoUrl = photoPreview || editingStudent?.photoUrl || ''; 
      d.modality = formModalidad; 
      
      try { 
          if (editingStudent) { 
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', editingStudent.id), d);
              // Actualiza la ficha abierta para que veas los cambios al instante
              if (viewingStudent?.id === editingStudent.id) {
                  setViewingStudent({ ...editingStudent, ...d });
              }
          } else { 
              await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), { ...d, isActive: true, createdAt: serverTimestamp(), incidents: [] }); 
          } 
          setShowForm(false); 
          setEditingStudent(null); 
          setPhotoPreview(null); 
      } catch (err) { alert("Error: " + err.message); } 
  }; // <--- ESTA ERA LA LLAVE QUE FALTABA

  const handleDelete = async (id) => { 
      if(confirm("⚠️ ¿Eliminar definitivamente?")) { 
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', id)); 
          setShowForm(false); 
          setEditingStudent(null); 
      } 
  };
  
  // --- FIX BITÁCORA (BOTONES Y TEXTO) ---
  const addIncident = async (type, text = "") => { 
    if (!showBitacoraModal) return; 
    const newInc = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: type, 
        text: text || type, 
        author: user.firstName 
    }; 
    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', showBitacoraModal.id); 
        await updateDoc(studentRef, { incidents: arrayUnion(newInc) }); 

        // --- PARCHE PUNTOS MAYO ---
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(10) });
        }
        // --------------------------

        setStudents(prev => prev.map(s => s.id === showBitacoraModal.id ? {...s, incidents: [...(s.incidents||[]), newInc]} : s)); 
        setNewNote(""); setIsWriting(false); setShowBitacoraModal(null); 
        alert("✅ Registro guardado (+10 pts)"); 
    } catch (e) { alert(e.message); } 
  };
  
// Asegúrate de que diga "async" justo antes de los paréntesis
  const handleSaveIncident = async (type, text = "", severity = "medium") => {
    // Identificar al alumno activo
    const student = (typeof showBitacoraModal !== 'undefined' && showBitacoraModal) || 
                    (typeof viewingStudent !== 'undefined' && viewingStudent) || 
                    selectedStudent;
    
    if (!student || !student.id) {
        alert("❌ Error: No se pudo identificar al alumno.");
        return;
    }

    setSavingIncident(true);

    const incidentData = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity: severity, 
        text: text || type, 
        author: user.fullName || user.firstName,
        authorId: user.id 
    }; 

    try { 
        const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id); 
        
        // El error de Vercel estaba aquí (línea 5095) porque faltaba el async arriba
        await updateDoc(studentRef, { 
            incidents: arrayUnion(incidentData) 
        }); 

        // Puntos Challenge (Mayo 2026)
        if (new Date() >= new Date('2026-05-01')) {
            const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id);
            await updateDoc(userRef, { score: increment(10) });
        }

        // Actualización de estados locales
        setStudents(prev => prev.map(s => s.id === student.id ? {...s, incidents: [...(s.incidents||[]), incidentData]} : s)); 
        
        if (typeof setViewingStudent === 'function' && viewingStudent?.id === student.id) {
            setViewingStudent(prev => ({...prev, incidents: [...(prev.incidents||[]), incidentData]}));
        }

        // Limpieza y cierre
        setNewNote(""); 
        setIsWriting(false); 
        if (typeof setShowBitacoraModal === 'function') setShowBitacoraModal(null);
        
        alert("✅ Bitácora guardada correctamente."); 
    } catch (e) { 
        console.error("Error al guardar:", e);
        alert("❌ Error de conexión."); 
   } finally {
        setSavingIncident(false);
    }
  };
  
  const deleteIncident = async (sid, inc) => { 
      if(confirm("¿Borrar evento?")) await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', sid), { incidents: arrayRemove(inc) }); 
  }; 
  
  const markAsInactive = async (s) => { 
      if(!confirm(`¿Dar de baja a ${s.firstName}?`)) return; 
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { isActive: false }); 
      setUnassignedList(p=>p.filter(x=>x.id!==s.id)); 
  };
  
  const abrirLegajoDigital = (student) => { 
      const clean = (str) => (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9 ]/g, ""); 
      const query = `name contains '${clean(student.lastName).split(' ')[0]}' and name contains '${clean(student.firstName).split(' ')[0]}' and trashed = false`; 
      window.open(`https://drive.google.com/drive/search?q=${encodeURIComponent(query)}`, '_blank'); 
  };

  // ==========================================
  // 6. FUNCIONES DE GESTIÓN Y NUBE (RECUPERADAS)
  // ==========================================
const checkUnassigned = () => {
    const found = students.filter(s => {
      if (s.isActive === false) return false; // Ignorar inactivos
      
      if (s.modality === 'Inclusión') {
        // En Inclusión, es "huérfano" si no tiene DAI
        return !s.daiMorning && !s.daiAfternoon;
      } else {
        // En Sede, es "huérfano" si no tiene Grupo
        return !s.groupMorning && !s.groupAfternoon;
      }
    });
    setUnassignedList(found);
    setShowDataManagement(false);
    setShowUnassigned(true);
  };
  
  
  
  const descargarBackup = () => { 
      if(!confirm("¿Descargar Backup?")) return; 
      const blob = new Blob([JSON.stringify(students, null, 2)], { type: "application/json" }); 
      const link = document.createElement('a'); 
      link.href = URL.createObjectURL(blob); 
      link.download = "BACKUP_MATRICULA.json"; 
      document.body.appendChild(link); link.click(); document.body.removeChild(link); 
  };
  
  const handleBulkImport = async () => {
    const rawJson = prompt("Pega aquí el contenido JSON del backup de estudiantes:");
    if (!rawJson) return;

    setProcessing(true);
    try {
      const data = JSON.parse(rawJson);
      if (!Array.isArray(data)) throw new Error("El formato no es un array válido.");

      // 1. Traer todos los alumnos actuales de la base de datos para comparar
      const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
      const alumnosActuales = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

      let agregados = 0;
      let actualizados = 0;

      // 2. Procesar cada alumno del JSON
      const promises = data.map(async (item) => {
        const { id, ...cleanData } = item;
        
        // 3. Buscar si el alumno ya existe (por DNI o por Nombre+Apellido exacto)
        const existe = alumnosActuales.find(s => 
           (cleanData.dni && s.dni === cleanData.dni) || 
           (s.firstName === cleanData.firstName && s.lastName === cleanData.lastName)
        );

        if (existe) {
          // Si existe, lo ACTUALIZAMOS (pisamos los datos viejos con los nuevos)
          actualizados++;
          return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', existe.id), {
            ...cleanData,
            updatedAt: serverTimestamp()
          });
        } else {
          // Si no existe, lo CREAMOS como nuevo
          agregados++;
          return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'students'), {
            ...cleanData,
            isActive: true,
            createdAt: serverTimestamp(),
            incidents: cleanData.incidents || []
          });
        }
      });

      await Promise.all(promises);
      alert(`✅ ¡Importación lista!\n\nSe agregaron: ${agregados} alumnos nuevos.\nSe actualizaron: ${actualizados} alumnos existentes.`);
      setShowDataManagement(false);
    } catch (e) {
      alert("❌ Error al procesar: " + e.message);
    } finally {
      setProcessing(false);
    }
  };
  const handleDeleteAll = () => alert("Función protegida.");
  const handleResetCycle = () => alert("Protegido.");

  const handleAutoAssignGenders = async () => {
    if(!confirm("🤖 ¿Asignar género automáticamente basado en el nombre?\n(Nombres terminados en 'a' serán F, resto M)")) return;
    setProcessing(true);
    try {
        const updates = students.map(s => {
            if(s.gender) return null; 
            const name = (s.firstName || "").toLowerCase().trim();
            const gender = name.endsWith('a') ? 'F' : 'M';
            return updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', s.id), { gender });
        }).filter(p => p !== null);
        await Promise.all(updates);
        alert(`✅ Géneros asignados a ${updates.length} alumnos.`);
    } catch(e) { alert(e.message); }
    setProcessing(false);
  };

  // ==========================================
  // 7. IMPRESIÓN CON MÉTODO IFRAME
  // ==========================================
  const imprimirListado = (list) => { 
      let h = `<html><head><title>Fichas de Estudiantes</title>
      <style>@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');body{font-family:'Roboto',sans-serif;padding:20px;}.page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #7c3aed;}.header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}.header-text h1{color:#4c1d95;font-size:24px;margin:0;text-transform:uppercase;}.header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}.photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #7c3aed;}.photo-box img{width:100%;height:100%;object-fit:cover;}.section-title{background:#f3f4f6;color:#4c1d95;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #7c3aed;}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}.field{margin-bottom:5px;}.label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}.value{font-size:12px;font-weight:bold;color:#333;}.footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}</style></head><body>`;
      
      list.forEach(s => { 
          h += `<div class="page"><div class="header"><div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Edad: ${calculateAge(s.birthDate)} años</p></div><div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : ''}</div></div><div class="section-title">Datos Personales y Salud</div><div class="grid"><div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${getSafeDate(s.birthDate)}</span></div><div class="field"><span class="label">Diagnóstico</span><span class="value">${s.dx || '-'}</span></div><div class="field"><span class="label">Obra Social</span><span class="value">${s.healthInsurance || 'NO DECLARA'}</span></div><div class="field"><span class="label">Vencimiento CUD</span><span class="value">${getSafeDate(s.cudExpiration)}</span></div></div><div class="section-title">Escolaridad (${s.modality || 'Sede'})</div><div class="grid"><div class="field"><span class="label">Nivel</span><span class="value">${s.level || '-'}</span></div>${s.modality === 'Inclusión' ? `<div class="field"><span class="label">Escuela Origen</span><span class="value">${s.originSchool} (${s.originGrade})</span></div><div class="field"><span class="label">DAI Asignada</span><span class="value">${s.daiMorning || s.daiAfternoon || '-'}</span></div>` : `<div class="field"><span class="label">Turno Mañana</span><span class="value">Grupo: ${s.groupMorning || '-'} (Doc: ${s.teacherMorning || '-'})</span></div><div class="field"><span class="label">Turno Tarde</span><span class="value">Grupo: ${s.groupAfternoon || '-'} (Doc: ${s.teacherAfternoon || '-'})</span></div>`}</div><div class="section-title">Familia y Contacto</div><div class="field" style="margin-bottom:10px;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div><div class="grid"><div class="field"><span class="label">Madre / Tutor 1</span><span class="value">${s.motherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.motherContact || '-'}</span></div><div class="field"><span class="label">Padre / Tutor 2</span><span class="value">${s.fatherName || '-'}</span><br><span style="font-size:11px;color:#666">${s.fatherContact || '-'}</span></div></div><div class="field" style="margin-top:10px;background:#f9fafb;padding:10px;border-radius:5px;"><span class="label">PERSONAS AUTORIZADAS A RETIRAR</span><span class="value">${s.pickupInfo || 'Sin datos cargados.'}</span></div><div class="footer">Juntos a la Par - Legajo Digital generado el ${new Date().toLocaleDateString()}</div></div>`; 
      }); 
      h += '</body></html>'; 

      const iframe = document.createElement('iframe'); iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; document.body.appendChild(iframe); const doc = iframe.contentWindow.document; doc.open(); doc.write(h); doc.close(); setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

  const exportFiltered = () => { if (filteredStudents.length === 0) return alert("Sin datos"); const headers = ["Apellido", "Nombre", "DNI", "Nivel", "Modalidad"]; const csv = [headers.join(';'), ...filteredStudents.map(s => [`"${s.lastName}"`, `"${s.firstName}"`, `"${s.dni}"`, `"${s.level}"`, `"${s.modality||'Sede'}"`].join(';'))].join('\n'); const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = "Matricula.csv"; document.body.appendChild(link); link.click(); document.body.removeChild(link); };
const findDuplicates = () => {
    const dniMap = {};
    const nameMap = {};
    const dupes = [];

    students.forEach(s => {
      // Buscar por DNI (si tiene más de 4 números)
      if (s.dni && s.dni.trim().length > 4) {
        if (dniMap[s.dni]) dupes.push({ type: 'DNI', s1: dniMap[s.dni], s2: s });
        else dniMap[s.dni] = s;
      }
      // Buscar por Nombre y Apellido exacto
      const fullName = `${s.firstName} ${s.lastName}`.toLowerCase().trim();
      if (fullName.length > 3) {
        if (nameMap[fullName]) {
          // Evitamos anotarlo dos veces si ya saltó por DNI
          if (!dupes.find(d => d.s2.id === s.id)) {
            dupes.push({ type: 'Nombre', s1: nameMap[fullName], s2: s });
          }
        } else nameMap[fullName] = s;
      }
    });

    if (dupes.length === 0) {
      alert("✅ ¡Excelente! La base está limpia. No hay alumnos duplicados.");
    } else {
      setDuplicates(dupes);
      setShowDataManagement(false); // Cierra el modal de la Nube para mostrar los duplicados
    }
  };

// --- CÁLCULO DE ESTADÍSTICAS (FILTRADO ESTRICTO) ---
  const statsResults = students.filter(s => {
      if (s.isActive === false) return false;
      if (statFilters.level.length > 0 && !statFilters.level.includes(s.level)) return false;
      if (statFilters.modality.length > 0 && !statFilters.modality.includes(s.modality || 'Sede')) return false;
      if (statFilters.dx !== 'all' && s.dx !== statFilters.dx) return false;

      // Filtro estricto de Género (Ignora X o vacíos si se elige M o F)
      if (statFilters.gender !== 'all') {
          if (s.gender !== statFilters.gender) return false;
      }

      // Filtro Especial: SOLO PRE TALLER (Busca en TM y TT)
      if (statOnlyPreTaller) {
          const nombreTM = (s.groupMorning || "").toUpperCase();
          const nombreTT = (s.groupAfternoon || "").toUpperCase();
          if (!nombreTM.includes("PRE TALLER") && !nombreTT.includes("PRE TALLER")) return false;
      }
      
      if (statFilters.journey !== 'all' && s.journey !== statFilters.journey) return false;
      if (statFilters.turn !== 'all') {
          if (statFilters.turn === 'Mañana' && !s.groupMorning && !s.daiMorning && s.turn !== 'Mañana') return false;
          if (statFilters.turn === 'Tarde' && !s.groupAfternoon && !s.daiAfternoon && s.turn !== 'Tarde') return false;
      }
      
      return true;
  });
  const getGroupLabel = (s) => {
      if (s.modality === 'Inclusión') {
          return s.daiMorning || s.daiAfternoon 
            ? `DAI: ${s.daiMorning || s.daiAfternoon}` 
            : <><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin DAI</>;
      }
      return s.groupMorning || s.groupAfternoon 
        ? `Grupo: ${s.groupMorning || s.groupAfternoon}` 
        : <><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin grupo</>;
  };
  // ==========================================
  // 8. RENDERIZADO (JSX)
  // ==========================================
  return (
    <div className="animate-in fade-in pb-20">
      {/* HEADER DE FILTROS */}
      <div className={`p-6 rounded-3xl shadow-lg text-white mb-6 transition-colors ${showArchived?'bg-gray-600':'bg-gradient-to-r from-blue-600 to-cyan-500'}`}>
         <div className="flex justify-between items-center gap-4 mb-4">
             <div><h2 className="text-3xl font-bold flex gap-2 items-center"><GraduationCap/> {showArchived?'Archivo':'Legajos 2026'}</h2><p className="opacity-80 text-sm mt-1">{filteredStudents.length} alumnos encontrados</p></div>
             <div className="flex gap-2">
                 <button onClick={()=>setShowArchived(!showArchived)} className="px-3 py-2 border border-white/30 rounded-xl text-xs font-bold uppercase hover:bg-white/10 flex items-center gap-1">{showArchived? 'Ver Activos' : 'Ver Bajas'}</button>
                 {isSuperAdmin && <button onClick={()=>setShowDataManagement(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Gestión (Nube)"><UploadCloud size={18}/></button>}
                 {isSuperAdmin && <button onClick={()=>setShowStats(true)} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Estadísticas"><PieChart size={18}/></button>}
                 <button onClick={() => imprimirListado(filteredStudents)} className="px-3 py-2 bg-white text-blue-600 rounded-xl text-xs font-black uppercase shadow hover:bg-blue-50 flex gap-2 items-center"><FileText size={14}/> Imprimir</button>
                 <button onClick={exportFiltered} className="p-2 border border-white/30 rounded-xl hover:bg-white/10" title="Excel"><Download size={18}/></button>
                 {!showArchived && <button onClick={openNew} className="px-4 py-2 bg-white text-blue-600 rounded-xl shadow hover:bg-blue-50 font-bold"><Plus size={20}/></button>}
             </div>
         </div>
         {!showArchived && (
            <div className="mt-4 space-y-2">
                <div className="bg-white/20 p-2 rounded-xl flex items-center"><Search className="ml-2 opacity-70"/><input value={filterText} onChange={e=>setFilterText(e.target.value)} placeholder="Buscar alumno..." className="bg-transparent border-none outline-none text-white w-full font-bold placeholder-white/60 ml-2"/>{filterText && <button onClick={()=>setFilterText('')}><X/></button>}</div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    <select value={filters.modality} onChange={e=>setFilters({...filters, modality:e.target.value})} className="bg-orange-100 text-orange-800 text-xs p-2 rounded-lg font-bold min-w-[100px] border border-orange-200"><option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option></select>
                    <select value={filters.group} onChange={e=>setFilters({...filters, group:e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Grupo: Todos</option>{uniqueGroups.map(g=><option key={g} value={g}>{g}</option>)}</select>
                    <select value={filters.level} onChange={e => setFilters({...filters, level: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option></select>
                    <select value={filters.teacher} onChange={e => setFilters({...filters, teacher: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Docente: Todos</option>{staffAll.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}</select>
                    <select value={filters.turn} onChange={e => setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                    <select value={filters.dx} onChange={e => setFilters({...filters, dx: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                    <select value={filters.gender} onChange={e => setFilters({...filters, gender: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Género: Todos</option><option value="M">Varón</option><option value="F">Mujer</option></select>
                    <select value={filters.journey} onChange={e => setFilters({...filters, journey: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[100px]"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                </div>
            </div>
         )}
      </div>
      
     {/* LISTA DE TARJETAS DE ALUMNOS */}
      <div className="space-y-3">
        {filteredStudents.map(s => { 
          const cudInfo = checkCudStatus(s.cudExpiration); // Nueva lógica de CUD
          const incidentAlert = getAlertStatus(s.incidents); 
          
          // Se activa la alerta si: el CUD venció/está por vencer O si hay incidentes graves
          const hasCriticalAlert = cudInfo.status === 'expired' || cudInfo.status === 'warning' || incidentAlert.status === 'danger';

          return ( 
            <div key={s.id} onClick={()=>{setViewingStudent(s); setActiveModalTab('info'); setIsWriting(false);}} 
                 className={`bg-white p-4 rounded-2xl shadow-sm border flex justify-between items-center cursor-pointer active:scale-[0.99] transition 
                 ${!s.isActive ? 'border-red-400 opacity-60' : hasCriticalAlert ? 'border-red-500 border-l-8' : 'border-gray-100'}`}>
                <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden relative border border-gray-100">
                        {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}
                        {/* Puntito rojo sobre la foto si hay alerta */}
                        {hasCriticalAlert && <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border border-white animate-pulse"></div>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2">{s.lastName}, {s.firstName}</h4>
                            {s.modality === 'Inclusión' && <span className="bg-indigo-100 text-indigo-700 text-[8px] font-black px-1.5 py-0.5 rounded border border-indigo-200 uppercase">INCLUSIÓN</span>}
                        </div>
                        <div className="flex gap-2 mt-1">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200 font-bold">{calculateAge(s.birthDate)} años</span>
                            <span className={`text-[10px] px-2 py-1 rounded-lg font-bold uppercase truncate max-w-[120px] ${
                              (s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon)
                              ? 'bg-red-100 text-red-700 border border-red-200' 
                              : 'bg-gray-100 text-gray-500'
                            }`}>
                                {s.modality === 'Inclusión' 
                                    ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : <span>⚠️ Sin DAI</span>) 
                                    : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : <span>⚠️ Sin grupo</span>)}
                            </span>
                            {/* Pequeño aviso de CUD si está por vencer */}
                            {cudInfo.status === 'warning' && (
                                <span className="text-[8px] bg-amber-100 text-amber-700 px-1.5 py-1 rounded font-black animate-pulse border border-amber-200">
                                    CUD PRÓX. VENCER
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <Eye className={hasCriticalAlert ? "text-red-500" : "text-gray-300"}/>
            </div> 
          ); 
        })}
      </div>
      {/* ================= MODALES ================= */}

     {/* 1. MODAL FICHA COMPLETA (DETALLE) - REPARADO SIN BORRAR NADA */}
      {viewingStudent && !showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* CABECERA */}
                <div className="bg-slate-700 p-6 text-white relative shrink-0">
                    <button onClick={()=>setViewingStudent(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                    <div className="flex gap-5 items-center">
                        <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden shadow-lg flex items-center justify-center">
                            {viewingStudent.photoUrl ? <img src={viewingStudent.photoUrl} className="w-full h-full object-cover"/> : <User size={40} className="text-white/50"/>}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStudent.lastName}, {viewingStudent.firstName}</h2>
                            <div className="flex flex-wrap gap-2 mt-2">
                                <div className="bg-orange-500 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase shadow-sm">
                                    Edad: {calculateAge(viewingStudent.birthDate)} años
                                </div>
                                <div className="bg-white/10 text-white px-3 py-1 rounded-xl text-[10px] font-bold">
                                    Nac: {getSafeDate(viewingStudent.birthDate)}
                                </div>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-bold">{viewingStudent.dni}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BOTONERA DE PESTAÑAS (RESTAURADA) */}
                <div className="flex gap-2 p-2 bg-slate-800/50 shrink-0">
                    <button onClick={()=>setActiveModalTab('info')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='info'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Ficha Técnica</button>
                    <button onClick={()=>setActiveModalTab('history')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeModalTab==='history'?'bg-white text-slate-800 shadow-md':'text-white/40 hover:text-white'}`}>Bitácora Unificada</button>
                </div>
      
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1 relative custom-scrollbar">
                    {/* CONTENIDO PESTAÑA 1: TODA LA INFO PERSONAL (LO QUE TENÍAS ANTES) */}
                    {activeModalTab === 'info' && (
                      <div className="space-y-4 text-sm animate-in fade-in">
                        {canSearchDrive && (
                            <button onClick={() => abrirLegajoDigital(viewingStudent)} className="w-full bg-green-100 text-green-800 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-green-200 transition border border-green-300 mb-4 shadow-sm"><Folder size={18}/> {viewingStudent.modality === 'Inclusión' ? 'IR A CARPETA DRIVE' : 'BUSCAR EN DRIVE'}</button>
                        )}
                        <div className="grid grid-cols-4 gap-3">
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nivel</p><p className="font-black text-slate-800 text-xs">{viewingStudent.level || '-'}</p></div>
                             <div className="bg-purple-50 p-3 rounded-2xl border border-purple-200 text-center shadow-sm"><p className="text-[9px] text-purple-400 font-bold uppercase mb-1">DX</p><p className="font-black text-purple-800 text-xs">{viewingStudent.dx || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Género</p><p className="font-black text-slate-800 text-xs">{viewingStudent.gender || '-'}</p></div>
                             <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Jornada</p><p className="font-black text-slate-800 text-xs">{viewingStudent.journey || '-'}</p></div>
                        </div>
                        <div className="space-y-2">
                             <div className="bg-gray-200 p-2 rounded-lg text-[10px] font-bold text-gray-600 uppercase text-center tracking-widest">Modalidad {viewingStudent.modality || 'Sede'}</div>
                             {viewingStudent.modality === 'Inclusión' ? (
                                <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-200 space-y-3"><div className="flex justify-between items-center border-b border-indigo-200 pb-2"><span className="text-[10px] text-indigo-400 font-bold uppercase">Escuela de Origen</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.originSchool || '-'} ({viewingStudent.originGrade || '-'})</span></div><div className="flex justify-between items-center"><span className="text-[10px] text-indigo-400 font-bold uppercase">DAI Asignada</span><span className="font-bold text-indigo-900 text-xs">{viewingStudent.daiMorning || viewingStudent.daiAfternoon || 'Sin asignar'}</span></div></div>
                             ) : (
                                <div className="grid grid-cols-2 gap-3"><div className="bg-yellow-50 p-3 rounded-2xl border border-yellow-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-yellow-200 text-yellow-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">MAÑANA</div><p className="text-[9px] text-yellow-600 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupMorning || '-'}</p><p className="text-[9px] text-yellow-600 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherMorning || '-'}</p></div><div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-200 shadow-sm relative overflow-hidden"><div className="absolute top-0 right-0 bg-indigo-200 text-indigo-800 text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">TARDE</div><p className="text-[9px] text-indigo-500 font-bold uppercase mt-2">Grupo</p><p className="font-bold text-slate-800 text-xs mb-2">{viewingStudent.groupAfternoon || '-'}</p><p className="text-[9px] text-indigo-500 font-bold uppercase">Docente</p><p className="font-bold text-slate-800 text-xs truncate">{viewingStudent.teacherAfternoon || '-'}</p></div></div>
                             )}
                        </div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-green-600 text-xs uppercase flex items-center gap-1 mb-3"><Activity size={14}/> Salud y Obra Social</h4><div className="flex justify-between items-center text-xs"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Obra Social</span><span className="font-bold text-slate-800">{viewingStudent.healthInsurance || 'NO DECLARA'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Vencimiento CUD</span><span className="font-bold text-red-500">{getSafeDate(viewingStudent.cudExpiration) || '-'}</span></div></div></div>
                        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm"><h4 className="font-bold text-orange-600 text-xs uppercase flex items-center gap-1 mb-3"><User size={14}/> Familia</h4><div className="space-y-3"><div className="flex justify-between items-start border-b border-gray-50 pb-2"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Madre</span><span className="font-bold text-xs">{viewingStudent.motherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.motherContact || '-'}</span></div></div><div className="flex justify-between items-start"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Padre</span><span className="font-bold text-xs">{viewingStudent.fatherName || '-'}</span></div><div className="text-right"><span className="text-[9px] text-gray-400 font-bold block uppercase">Contacto</span><span className="font-bold text-blue-600 text-xs">{viewingStudent.fatherContact || '-'}</span></div></div></div><div className="mt-3 pt-2 border-t border-gray-100"><div><span className="text-[9px] text-gray-400 font-bold block uppercase">Dirección</span><p className="font-bold text-xs text-gray-700">{viewingStudent.address || 'No registrada'}</p></div></div></div>
                      </div>
                    )}

                    {/* CONTENIDO PESTAÑA 2: BITÁCORA UNIFICADA */}
                    {activeModalTab === 'history' && (
                      <div className="space-y-4 pb-20 animate-in fade-in">
                        {!isWriting && (
                        <div className="grid grid-cols-3 gap-2 mb-4">
  {INCIDENT_TYPES.map((type) => (
    <button 
      key={type.label} 
      onClick={() => handleSaveIncident(type.label, "", type.severity)} // <-- Cambio aquí
      className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color}`}
    >
      <span className="text-2xl">{type.emoji}</span>
      <span className="text-[10px] font-black uppercase text-center leading-tight">{type.label}</span>
    </button>
  ))}
</div>
                        )}
                        <div className="space-y-3">
                          {(() => {
                            const normales = (viewingStudent.incidents || []).map(inc => ({ ...inc, source: 'aula' }));
                            const sociales = (socialCases || [])
                              .filter(c => (c.studentId === viewingStudent.id) || (c.studentName === `${viewingStudent.lastName}, ${viewingStudent.firstName}`))
                              .map(c => ({
                                date: c.createdAt?.seconds ? new Date(c.createdAt.seconds * 1000).toISOString() : new Date().toISOString(),
                                text: `⚠️ INTERVENCIÓN SOCIAL: ${c.reason}`,
                                author: c.reportedBy || 'Gabinete',
                                severity: 'high',
                                source: 'social',
                                isClosed: c.status === 'Reincorporado'
                              }));
                            const combined = [...normales, ...sociales].sort((a, b) => new Date(b.date) - new Date(a.date));
                            if (combined.length === 0) return <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-gray-200"><p className="text-gray-400 text-xs font-bold uppercase italic">Sin registros</p></div>;
                            return combined.map((inc, i) => (
                              <div key={i} className={`p-4 rounded-2xl border shadow-sm transition-all ${inc.source === 'social' ? (inc.isClosed ? 'bg-slate-50 border-slate-200' : 'bg-red-50 border-red-200 ring-2 ring-red-50') : getSeverityColor(inc.severity)}`}>
                                <div className="flex justify-between items-center mb-2 border-b border-gray-100/50 pb-1">
                                  <span className="text-[10px] font-black text-gray-400 uppercase">{new Date(inc.date).toLocaleDateString('es-AR')}</span>
                                  {inc.source === 'aula' && <button onClick={() => deleteIncident(viewingStudent.id, inc)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={12}/></button>}
                                </div>
                                <p className={`text-xs font-bold leading-relaxed ${inc.isClosed ? 'text-slate-500 line-through' : 'text-slate-700'}`}>{inc.text || inc.type}</p>
                                <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mt-2">Origen: {inc.source === 'social' ? 'Gabinete' : 'Aula'} • Por: {inc.author}</p>
                              </div>
                            ));
                          })()}
                        </div>
                        <div className="sticky bottom-0 bg-white pt-4 border-t border-gray-100">
                          {isWriting ? (
                            <div className="animate-in slide-in-from-bottom">
                              <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles..." className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl text-sm mb-2 h-24 outline-none"/>
                              {/* Reemplazo para el botón de guardar nota redactada */}
<div className="flex gap-2">
  <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
  <button 
    onClick={() => handleSaveIncident("Nota", newNote, "medium")} // <-- Cambio aquí de addIncident a handleSaveIncident
    disabled={!newNote.trim()} 
    className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-[10px]"
  >
    Guardar
  </button>
</div>
                            </div>
                          ) : (
                            <button onClick={() => setIsWriting(true)} className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition hover:scale-[1.02]"><Edit3 size={18}/> Redactar Nota</button>
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {/* BOTONERA INFERIOR */}
                <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-2 shrink-0">
                    <button onClick={()=>imprimirListado([viewingStudent])} className="px-4 py-3 bg-white border border-gray-200 rounded-xl text-slate-600 font-bold text-[10px] uppercase hover:bg-gray-50 flex gap-2 items-center shadow-sm"><FileText size={16}/> Imprimir Ficha</button>
                    <button onClick={()=>openEdit(viewingStudent)} className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase hover:bg-blue-700 flex gap-2 items-center shadow-lg"><Edit3 size={16}/> Editar Ficha</button>
                </div>
            </div>
        </div>
      )}

      {/* 2. MODAL FORMULARIO DE EDICIÓN (COMPLETO Y REVISADO) */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-xl font-bold mb-4">{editingStudent ? 'Editar' : 'Nuevo'} Legajo</h3>
                
                {/* FOTO PERFIL */}
                <div className="flex justify-center mb-6">
                    <div className="relative group w-24 h-24">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-violet-100 bg-gray-100 shadow-inner">
                            {photoPreview || editingStudent?.photoUrl ? (
                                <img src={photoPreview || editingStudent?.photoUrl} className="w-full h-full object-cover" alt="Perfil" />
                            ) : (
                                <User size={40} className="text-gray-300 m-auto mt-6" />
                            )}
                        </div>
                        <label className="absolute bottom-0 right-0 bg-violet-600 text-white p-2 rounded-full cursor-pointer hover:bg-violet-700 shadow-md">
                            <input type="file" className="hidden" accept="image/*" onChange={handlePhotoChange} />
                            {uploading ? <RefreshCw className="animate-spin" size={14} /> : <Edit3 size={14} />}
                        </label>
                    </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                    {/* SELECTOR MODALIDAD */}
                    <div className="flex gap-2 mb-4 bg-gray-100 p-1 rounded-xl">
                        <button type="button" onClick={() => setFormModalidad('Sede')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Sede' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>SEDE</button>
                        <button type="button" onClick={() => setFormModalidad('Inclusión')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${formModalidad === 'Inclusión' ? 'bg-white shadow text-indigo-700' : 'text-gray-400'}`}>INCLUSIÓN</button>
                    </div>

                    {/* ESTADO ACTIVO/INACTIVO */}
                    <div className={`p-3 rounded-xl border mb-2 flex justify-between items-center ${editingStudent?.isActive === false ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                        <div>
                            <label className="text-xs font-bold text-gray-700 uppercase">Estado Actual</label>
                            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-1">
                                {editingStudent?.isActive === false ? (
                                    <><AlertCircle size={12} className="text-red-500" /> BAJA / INACTIVO</>
                                ) : (
                                    <><CheckCircle size={12} className="text-green-500" /> ACTIVO (CURSANDO)</>
                                )}
                            </p>
                        </div>
                        <select name="isActive" defaultValue={editingStudent?.isActive === false ? 'false' : 'true'} className="p-2 rounded-lg border text-xs font-bold bg-white outline-none">
                            <option value="true">Activo</option>
                            <option value="false">Inactivo (Baja)</option>
                        </select>
                    </div>

                    {/* NOMBRE Y APELLIDO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="firstName" defaultValue={editingStudent?.firstName} placeholder="Nombre" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="lastName" defaultValue={editingStudent?.lastName} placeholder="Apellido" required className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                    </div>

                    {/* DNI Y NACIMIENTO */}
                    <div className="grid grid-cols-2 gap-3">
                        <input name="dni" type="number" defaultValue={editingStudent?.dni} placeholder="DNI" className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm" />
                        <input name="birthDate" type="date" defaultValue={getSafeDate(editingStudent?.birthDate)} className="p-3 bg-gray-50 rounded-xl w-full border outline-none font-bold text-sm text-gray-500" />
                    </div>

                    {/* DATOS ESCOLARES Y GÉNERO */}
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-bold text-blue-700 text-xs uppercase">Datos Escolares y Personales</h4>
                        <div className="grid grid-cols-3 gap-2">
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Nivel</label>
                                <select name="level" defaultValue={editingStudent?.level} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">Nivel...</option>
                                    <option value="INICIAL">INICIAL</option>
                                    <option value="1° Ciclo">1° Ciclo</option>
                                    <option value="2° Ciclo">2° Ciclo</option>
                                    <option value="CFI">CFI</option>
                                    <option value="SECUNDARIA">SECUNDARIA</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">DX</label>
                                <select name="dx" defaultValue={editingStudent?.dx} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">DX...</option>
                                    <option value="DI">DI</option>
                                    <option value="TES">TES</option>
                                    <option value="Otro">Otro</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[9px] font-bold text-blue-400 uppercase ml-1">Género</label>
                                <select name="gender" defaultValue={editingStudent?.gender || ""} className="p-2 rounded-lg border text-xs font-bold w-full bg-white">
                                    <option value="">...</option>
                                    <option value="M">Varón</option>
                                    <option value="F">Mujer</option>
                                    <option value="X">Otro</option>
                                </select>
                            </div>
                        </div>

                        {/* SUB-SECCIÓN POR MODALIDAD */}
                        {formModalidad === 'Sede' ? (
                            <>
                                <div className="grid grid-cols-2 gap-2">
                                    <input name="groupMorning" defaultValue={editingStudent?.groupMorning} placeholder="Grupo TM" className="p-2 rounded-lg border text-xs w-full bg-white" />
                                    <input name="groupAfternoon" defaultValue={editingStudent?.groupAfternoon} placeholder="Grupo TT" className="p-2 rounded-lg border text-xs w-full bg-white" />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="teacherMorning" defaultValue={editingStudent?.teacherMorning} className="p-2 rounded-lg border text-xs w-full bg-white">
                                        <option value="">Docente TM...</option>
                                        {staffSede.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                    <select name="teacherAfternoon" defaultValue={editingStudent?.teacherAfternoon} className="p-2 rounded-lg border text-xs w-full bg-white">
                                        <option value="">Docente TT...</option>
                                        {staffSede.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                </div>
                            </>
                        ) : (
                            <>
                                <input name="originSchool" defaultValue={editingStudent?.originSchool} placeholder="Escuela de Origen" className="w-full p-2 rounded-lg border text-xs font-bold bg-white" />
                                <input name="originGrade" defaultValue={editingStudent?.originGrade} placeholder="Grado/Año" className="w-full p-2 rounded-lg border text-xs bg-white" />
                                <div className="grid grid-cols-2 gap-2">
                                    <select name="daiMorning" defaultValue={editingStudent?.daiMorning} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Mañana...</option>
                                        {editingStudent?.daiMorning && !staffInclusion.find(u => u.fullName === editingStudent?.daiMorning) && <option value={editingStudent.daiMorning}>{editingStudent.daiMorning} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                    <select name="daiAfternoon" defaultValue={editingStudent?.daiAfternoon} className="p-2 rounded-lg border text-xs bg-white">
                                        <option value="">DAI T. Tarde...</option>
                                        {editingStudent?.daiAfternoon && !staffInclusion.find(u => u.fullName === editingStudent?.daiAfternoon) && <option value={editingStudent.daiAfternoon}>{editingStudent.daiAfternoon} (Antiguo)</option>}
                                        {staffInclusion.map(u => <option key={u.id} value={u.fullName}>{u.fullName}</option>)}
                                    </select>
                                </div>
                                <div className="bg-green-50 p-2 rounded-lg border border-green-100 mt-2">
                                    <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">📂 Carpeta Drive Personal</label>
                                    <input name="driveLink" defaultValue={editingStudent?.driveLink} placeholder="https://drive.google.com/..." className="w-full p-2 rounded-lg border text-xs text-green-800 bg-white" />
                                </div>
                            </>
                        )}
                    </div>

                    {/* SALUD Y FAMILIA */}
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100 space-y-3">
                        <h4 className="font-bold text-green-800 text-xs uppercase">Salud y Familia</h4>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="healthInsurance" defaultValue={editingStudent?.healthInsurance} placeholder="Obra Social" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="cudExpiration" type="date" defaultValue={getSafeDate(editingStudent?.cudExpiration)} className="w-full p-2 rounded-lg border text-xs text-gray-500 bg-white" />
                        </div>
                        <input name="address" defaultValue={editingStudent?.address} className="w-full p-2 rounded-lg border text-xs bg-white" placeholder="Dirección" />
                        <div className="grid grid-cols-2 gap-2">
                            <input name="motherName" defaultValue={editingStudent?.motherName} placeholder="Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="motherContact" defaultValue={editingStudent?.motherContact} placeholder="Contacto Madre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <input name="fatherName" defaultValue={editingStudent?.fatherName} placeholder="Padre" className="w-full p-2 rounded-lg border text-xs bg-white" />
                            <input name="fatherContact" defaultValue={editingStudent?.fatherContact} placeholder="Contacto Padre" className="p-2 rounded-lg border text-xs bg-white" />
                        </div>
                        <div className="border-t border-green-200 pt-2">
                            <label className="text-[10px] font-bold text-green-700 uppercase block mb-1">Personas autorizadas a retirar</label>
                            <textarea name="pickupInfo" defaultValue={editingStudent?.pickupInfo} className="w-full p-2 rounded-lg border text-xs h-16 resize-none bg-white" placeholder="Abuela Marta, Tía Juana..." />
                        </div>
                    </div>

                    {/* BOTONES DE ACCIÓN */}
                    <div className="flex gap-2 pt-4 border-t sticky bottom-0 bg-white">
                        <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-3 text-gray-500 font-bold uppercase text-xs">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold uppercase text-xs shadow-lg">Guardar</button>
                        {editingStudent && <button type="button" onClick={() => handleDelete(editingStudent.id)} className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition border border-red-100"><Trash2 size={20} /></button>}
                    </div>
                </form>
            </div>
        </div>
      )}
      
      {/* 3. MODAL GESTIÓN (NUBE) */}
      {showDataManagement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2"><UploadCloud className="text-blue-500"/> Gestión de Datos</h3>
                    <button onClick={()=>setShowDataManagement(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={findDuplicates} className="p-3 bg-yellow-50 text-yellow-700 rounded-xl font-bold text-xs hover:bg-yellow-100 border border-yellow-200 flex flex-col items-center gap-1">
                            <Search size={16}/> Buscar Duplicados
                        </button>
                      <button onClick={() => { setShowQuickFix(true); setShowDataManagement(false); }} className="p-3 bg-purple-50 text-purple-700 rounded-xl font-bold text-xs hover:bg-purple-100 border border-purple-200 flex flex-col items-center gap-1">
    <Edit3 size={16}/> Saneamiento Rápido
</button>
                        <button onClick={checkUnassigned} className="p-3 bg-red-50 text-red-700 rounded-xl font-bold text-xs hover:bg-red-100 border border-red-200 flex flex-col items-center gap-1">
                            <AlertTriangle size={16}/> Ver Sin Grupo
                        </button>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <h4 className="font-bold text-gray-600 text-xs mb-2 uppercase">Copia de Seguridad</h4>
                        <div className="flex gap-2">
                            <button onClick={descargarBackup} className="flex-1 py-3 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-sm flex items-center justify-center gap-2"><Download size={14}/> Descargar JSON</button>
                            <button onClick={handleBulkImport} disabled={processing} className="flex-1 py-3 bg-blue-50 border border-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 shadow-sm flex items-center justify-center gap-2">
                                {processing ? <RefreshCw className="animate-spin" size={14}/> : <><UploadCloud size={14}/> Importar JSON</>}
                            </button>
                        </div>
                    </div>
                    <button onClick={handleAutoAssignGenders} disabled={processing} className="w-full py-3 bg-indigo-600 text-white font-bold rounded-xl text-xs shadow-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
                        {processing ? <RefreshCw className="animate-spin" size={16}/> : <><User size={16}/> Asignar Género Automático</>}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* --- MODAL DE DUPLICADOS --- */}
      {duplicates && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[9999] backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
              <h3 className="font-black text-red-600 uppercase flex items-center gap-2 text-xl italic">
                <AlertTriangle size={24}/> Duplicados ({duplicates.length})
              </h3>
              <button onClick={() => setDuplicates(null)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
            </div>
            
            <div className="overflow-y-auto space-y-4 pr-2">
              {duplicates.map((d, i) => (
                <div key={i} className="p-4 bg-red-50 border-2 border-red-100 rounded-2xl">
                  <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-3 bg-white inline-block px-3 py-1 rounded-full shadow-sm">
                    Coincidencia por {d.type}: {d.type === 'DNI' ? d.s2.dni : `${d.s2.lastName}, ${d.s2.firstName}`}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registro 1 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s1.lastName}, {d.s1.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s1.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s1.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s1.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-100 text-red-600 rounded-lg text-xs font-black uppercase hover:bg-red-200 transition">
                        Eliminar este
                      </button>
                    </div>

                    {/* Registro 2 */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border-2 border-red-200 flex flex-col justify-between">
                      <div>
                        <p className="font-bold text-gray-800 text-sm uppercase">{d.s2.lastName}, {d.s2.firstName}</p>
                        <p className="text-[10px] text-gray-500 font-bold mt-1">DNI: <span className="text-gray-800">{d.s2.dni || 'Sin DNI'}</span></p>
                        <p className="text-[10px] text-gray-500 font-bold">Nivel: <span className="text-gray-800">{d.s2.level || 'Sin nivel'}</span></p>
                      </div>
                      <button onClick={async () => { if(confirm("¿Eliminar este registro?")) { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', d.s2.id)); setDuplicates(duplicates.filter(x => x !== d)); } }} className="mt-4 w-full py-2 bg-red-500 text-white rounded-lg text-xs font-black uppercase shadow-md hover:bg-red-600 transition">
                        Eliminar clon
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

  {/* 4. MODAL ESTADÍSTICAS (CON FILTRO PRE-TALLER Y CONTADORES) */}
      {showStats && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-violet-600">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-black text-violet-900 uppercase italic">Estadísticas</h3>
                        <p className="text-xs text-gray-500">Filtrado Acumulativo Preciso</p>
                    </div>
                    <button onClick={() => setShowStats(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                {/* RESULTADO GRANDE Y CONTADORES DIVIDIDOS */}
                <div className="bg-violet-50 p-6 rounded-3xl text-center mb-6 border border-violet-100 shadow-inner">
                    <span className="text-5xl font-black text-violet-600 block mb-1">{statsResults.length}</span>
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-[4px] mb-4 block">Coincidencias</span>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="bg-white/60 p-2 rounded-2xl border border-blue-100">
                            <span className="block text-xl font-black text-blue-600">{statsResults.filter(x => x.gender === 'M').length}</span>
                            <span className="text-[8px] font-bold text-blue-400 uppercase">Varones</span>
                        </div>
                        <div className="bg-white/60 p-2 rounded-2xl border border-pink-100">
                            <span className="block text-xl font-black text-pink-600">{statsResults.filter(x => x.gender === 'F').length}</span>
                            <span className="text-[8px] font-bold text-pink-400 uppercase">Mujeres</span>
                        </div>
                    </div>
                </div>

                <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                    {/* BOTÓN FILTRO PRE-TALLER */}
                    <div className="p-1 bg-gray-100 rounded-2xl">
                        <button 
                            onClick={() => setStatOnlyPreTaller(!statOnlyPreTaller)}
                            className={`w-full py-3 rounded-xl font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${
                                statOnlyPreTaller 
                                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' 
                                : 'bg-white text-gray-400 hover:text-emerald-500'
                            }`}
                        >
                            {statOnlyPreTaller ? '✅ Solo viendo Pre Taller' : '🔍 Filtrar por Pre Taller'}
                        </button>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Niveles</p>
                        <div className="flex flex-wrap gap-2">
                            {['INICIAL', '1° Ciclo', '2° Ciclo', 'CFI', 'SECUNDARIA'].map(lvl => (
                                <button key={lvl} onClick={() => toggleStatFilter('level', lvl)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.level.includes(lvl) ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-500 border-gray-200'}`}>{lvl}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 ml-1">Modalidad</p>
                        <div className="flex flex-wrap gap-2">
                            {['Sede', 'Inclusión'].map(mod => (
                                <button key={mod} onClick={() => toggleStatFilter('modality', mod)} className={`px-3 py-2 rounded-lg text-xs font-bold border transition ${statFilters.modality.includes(mod) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-gray-500 border-gray-200'}`}>{mod}</button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.dx} onChange={e => setStatFilters({...statFilters, dx: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">DX: Todos</option><option value="DI">DI</option><option value="TES">TES</option><option value="Otro">Otro</option></select>
                        <select value={statFilters.gender} onChange={e => setStatFilters({...statFilters, gender: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Género: Todos</option><option value="M">Varones (M)</option><option value="F">Mujeres (F)</option></select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <select value={statFilters.turn} onChange={e => setStatFilters({...statFilters, turn: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Turno: Todos</option><option value="Mañana">Mañana</option><option value="Tarde">Tarde</option></select>
                        <select value={statFilters.journey} onChange={e => setStatFilters({...statFilters, journey: e.target.value})} className="p-3 bg-gray-50 rounded-xl text-xs font-bold border border-gray-200"><option value="all">Jornada: Todas</option><option value="Simple Mañana">Simple Mañana</option><option value="Simple Tarde">Simple Tarde</option><option value="Doble">Doble</option></select>
                    </div>
                </div>

                <button 
                    onClick={() => {
                        setStatFilters({ modality: [], level: [], dx: 'all', gender: 'all', turn: 'all', journey: 'all' });
                        setStatOnlyPreTaller(false);
                    }} 
                    className="w-full py-3 text-red-400 font-bold text-[10px] uppercase tracking-widest hover:bg-red-50 rounded-xl transition mt-6 border border-dashed border-red-100"
                >
                    Limpiar Filtros
                </button>
            </div>
        </div>
      )}
  {/* 6. MODAL SANEAMIENTO RÁPIDO (LÓGICA ESTRICTA M/F) */}
      {showQuickFix && (
        <div className="fixed inset-0 bg-black/70 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-2xl p-8 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-slate-800 uppercase italic">Saneamiento de Datos</h3>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Garantizando precisión en la matrícula</p>
              </div>
              <button onClick={() => setShowQuickFix(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
            </div>

            <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl">
              <button onClick={() => setFixingField('gender')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'gender' ? 'bg-white shadow text-blue-600' : 'text-gray-400'}`}>Falta Género (Estricto)</button>
              <button onClick={() => setFixingField('dx')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase transition ${fixingField === 'dx' ? 'bg-white shadow text-purple-600' : 'text-gray-400'}`}>Falta Diagnóstico</button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {students.filter(s => {
                  if (s.isActive === false) return false;
                  const value = s[fixingField];
                  
                  // LÓGICA ESTRICTA: 
                  // Si estamos en género, solo dejamos pasar si es exactamente 'M' o 'F'.
                  // Cualquier otra cosa (X, null, "", undefined) se considera dato a sanear.
                  if (fixingField === 'gender') {
                      return value !== 'M' && value !== 'F';
                  }
                  
                  return !value || (typeof value === 'string' && value.trim() === "");
              }).length === 0 ? (
                <div className="text-center py-20 text-gray-400 font-bold uppercase italic">✨ ¡Matrícula 100% precisa y saneada!</div>
              ) : (
                students.filter(s => {
                    if (s.isActive === false) return false;
                    const val = s[fixingField];
                    if (fixingField === 'gender') return val !== 'M' && val !== 'F';
                    return !val || (typeof val === 'string' && val.trim() === "");
                }).map(s => (
                  <div key={s.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100 group hover:bg-white hover:shadow-md transition">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-700 uppercase text-sm">{s.lastName}, {s.firstName}</span>
                        {s.gender === 'X' && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black">TIENE X</span>}
                      </div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase">{s.modality || 'Sede'} - {s.level || 'Sin Nivel'}</span>
                    </div>
                    
                    {fixingField === 'gender' ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'M')} className="px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition shadow-sm">VARÓN</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'gender', 'F')} className="px-4 py-2 bg-pink-100 text-pink-700 rounded-xl text-xs font-black hover:bg-pink-600 hover:text-white transition shadow-sm">MUJER</button>
                    </div>
                    ) : (
                      <div className="flex gap-1">
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'TES')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">TES</button>
                        <button onClick={() => handleQuickUpdate(s.id, 'dx', 'DI')} className="px-3 py-2 bg-purple-100 text-purple-700 rounded-xl text-[10px] font-black hover:bg-purple-600 hover:text-white transition">DI</button>
                        <input 
                          onBlur={(e) => e.target.value && handleQuickUpdate(s.id, 'dx', e.target.value)}
                          placeholder="Otro..." 
                          className="w-20 p-2 bg-white border border-gray-200 rounded-xl text-[10px] font-bold outline-none focus:border-purple-400 shadow-sm"
                        />
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-center text-[10px] text-gray-400 mt-6 font-bold uppercase tracking-widest">Los cambios se guardan automáticamente en la nube</p>
          </div>
        </div>
      )}
      {/* 5. MODAL SIN GRUPO */}
      {showUnassigned && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[90]">
            <div className="bg-white rounded-3xl p-6 w-full max-w-2xl h-[80vh] flex flex-col">
                <div className="flex justify-between mb-4">
                    <h3 className="font-bold text-red-600">Alumnos Sin Grupo / Sin DAI ({unassignedList.length})</h3>
                    <button onClick={()=>setShowUnassigned(false)}><X/></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-2">
                    {unassignedList.map(s=>(
                        <div key={s.id} className="flex justify-between items-center bg-red-50 p-3 rounded-xl">
                            <span className="font-bold">{s.lastName}, {s.firstName} <span className="text-red-500 text-xs ml-2">({s.modality || 'Sede'})</span></span>
                            <div className="flex gap-2">
                                <button onClick={()=>{openEdit(s); setShowUnassigned(false)}} className="text-xs bg-white px-2 py-1 rounded border">Editar</button>
                                <button onClick={()=>markAsInactive(s)} className="text-xs bg-red-600 text-white px-2 py-1 rounded">Baja</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
}
