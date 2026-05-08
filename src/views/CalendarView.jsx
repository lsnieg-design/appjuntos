import React, { useState } from 'react';
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
  collection, addDoc, doc, updateDoc, 
  deleteDoc, serverTimestamp 
} from 'firebase/firestore';


export function CalendarView({ events, canEdit, user, db, appId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filterType, setFilterType] = useState('TODOS'); 
  
  // MODO DE CALENDARIO
  const [calendarMode, setCalendarMode] = useState('general'); // 'general' | 'technical'

  // ESTADOS PARA CARGA RÁPIDA Y FOTOS
  const [showQuickLoad, setShowQuickLoad] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // PERMISOS
  const isTechTeam = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Equipo Técnico Inclusión', 'Dirección Inclusión'].includes(user.role);
  // PERMISO DE EDICIÓN GENERAL: Ahora es TRUE para todos en modo general
  const canAddGeneral = true; 

  const EVENT_TYPES = {
      'FERIADO': { color: 'bg-red-200 text-red-900 border-red-400', label: 'Feriado' },
      'ACTO': { color: 'bg-orange-100 text-orange-900 border-orange-400', label: 'Actos' },
      'CUMPLEAÑOS': { color: 'bg-yellow-100 text-yellow-900 border-yellow-400', label: 'Cumples' },
      'SALIDAS EDUCATIVAS': { color: 'bg-lime-100 text-lime-900 border-lime-400', label: 'Salidas' },
      'ENCUENTROS CON FAMILIAS': { color: 'bg-fuchsia-100 text-fuchsia-900 border-fuchsia-300', label: 'Familias' },
      'REUNIONES': { color: 'bg-violet-100 text-violet-900 border-violet-400', label: 'Reuniones' },
      'CALENDARIO ACADÉMICO': { color: 'bg-blue-100 text-blue-900 border-blue-400', label: 'Académico' },
      'EFEMÉRIDES': { color: 'bg-cyan-100 text-cyan-900 border-cyan-400', label: 'Efemérides' },
      'TAREAS ADMINISTRATIVAS': { color: 'bg-zinc-200 text-zinc-800 border-zinc-400', label: 'Admin' },
      'TECNICO': { color: 'bg-teal-100 text-teal-900 border-teal-400', label: '🔒 Técnico' }, 
      'GENERAL': { color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'General' },
  };

  // --- SWIPE ---
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50; 

  const onTouchStart = (e) => { setTouchEnd(null); setTouchStart(e.targetTouches[0].clientX); };
  const onTouchMove = (e) => { setTouchEnd(e.targetTouches[0].clientX); };
  const onTouchEnd = () => {
      if (!touchStart || !touchEnd) return;
      const distance = touchStart - touchEnd;
      if (distance > minSwipeDistance) changeMonth(1);
      if (distance < -minSwipeDistance) changeMonth(-1);
  };
  
  const changeMonth = (offset) => { const d = new Date(currentDate); d.setMonth(d.getMonth() + offset); setCurrentDate(new Date(d)); };
  
  const handleDayClick = (dateStr) => {
      const eventsOnDay = events.filter(e => {
          if (e.date !== dateStr) return false;
          if (e.type === 'TECNICO') return isTechTeam && calendarMode === 'technical';
          return calendarMode === 'general';
      });
      // Abrimos el modal si hay eventos o si el usuario puede agregar (que ahora son todos en general)
      if (eventsOnDay.length > 0 || (calendarMode === 'general' || isTechTeam)) {
          setSelectedDayEvents({ date: dateStr, events: eventsOnDay });
      }
  };

  const handlePhotoChange = (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload=(ev)=>{
          const img=new Image();
          img.onload=()=>{
              const c=document.createElement('canvas');
              const MAX_WIDTH = 800; // Un poco más grande para que se vea bien la invitación
              const s = img.width > MAX_WIDTH ? MAX_WIDTH/img.width : 1;
              c.width=img.width * s; c.height=img.height*s;
              const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
              setPhotoPreview(c.toDataURL('image/jpeg',0.8));
              setUploading(false);
          };
          img.src=ev.target.result;
      };
      reader.readAsDataURL(f);
  };

  const deleteEvent = async (id) => {
      // Solo permitimos borrar si es el autor, o si es admin/directivo
      if(confirm("¿Eliminar este evento?")) {
          await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', id));
          if(selectedDayEvents) {
              const updated = selectedDayEvents.events.filter(e => e.id !== id);
              if (updated.length === 0 && !(calendarMode === 'general' || isTechTeam)) setSelectedDayEvents(null);
              else setSelectedDayEvents({ ...selectedDayEvents, events: updated });
          }
      }
  };

const handleSaveEvent = async (e) => {
      e.preventDefault(); 
      const fd = new FormData(e.target);
      const formType = fd.get('type');
      const finalType = (calendarMode === 'technical') ? 'TECNICO' : formType;

      // ASEGURAMOS QUE imageUrl SEA SIEMPRE UN STRING
      const imgUrl = photoPreview || editingEvent?.imageUrl || '';

      const data = { 
          title: fd.get('title') || 'Sin título', 
          date: fd.get('date'), 
          type: finalType || 'GENERAL', 
          description: fd.get('description') || '', 
          author: user.firstName || 'Usuario',
          imageUrl: String(imgUrl) 
      };
      
      try {
          setProcessing(true); // Bloqueamos para evitar doble clic
          if (editingEvent?.id) {
              await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'events', editingEvent.id), data);
              if (selectedDayEvents) {
                  const updatedEvents = selectedDayEvents.events.map(ev => ev.id === editingEvent.id ? { ...ev, ...data } : ev);
                  setSelectedDayEvents({ ...selectedDayEvents, events: updatedEvents });
              }
          } else {
              const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { 
                ...data, 
                createdAt: serverTimestamp() 
              });
              
              if (selectedDayEvents) {
                 const newEventLocal = { id: docRef.id, ...data };
                 setSelectedDayEvents({ ...selectedDayEvents, events: [...selectedDayEvents.events, newEventLocal] });
              }
          }
          setShowModal(false); 
          setEditingEvent(null);
          setPhotoPreview(null);
      } catch (err) {
          console.error("Error detallado:", err);
          alert("Error al guardar: " + err.message);
      } finally {
          setProcessing(false);
      }
  };

const handleQuickSave = async () => {
      if (!quickText.trim()) return;
      setProcessing(true);
      try {
          const lines = quickText.split('\n').filter(line => line.trim() !== '');
          const validTypes = Object.keys(EVENT_TYPES); 

          // Filtramos primero las líneas válidas para que el array de promesas no tenga NULLs
          const validLines = lines.map(line => {
              const match = line.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s+(.+)$/);
              if (!match) return null;
              return { match, line };
          }).filter(Boolean);

          const promises = validLines.map(item => {
              let [_, day, month, year, rawText] = item.match;
              if (year.length === 2) year = "20" + year;
              const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
              
              let finalType = 'GENERAL';
              let finalTitle = rawText.trim();

              for (const type of validTypes) {
                  // Verificamos que finalTitle exista antes de usar includes/indexOf
                  if (finalTitle && finalTitle.toUpperCase().includes(type)) {
                      finalType = type;
                      finalTitle = finalTitle.replace(new RegExp(`\\(?\\b${type}\\b\\)?`, 'i'), '').trim();
                      finalTitle = finalTitle.replace(/^[:\-\s]+|[:\-\s]+$/g, '');
                      break; 
                  }
              }
              
              if (!finalTitle) finalTitle = finalType;

              return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { 
                title: String(finalTitle), 
                date: isoDate, 
                type: finalType, 
                description: 'Carga masiva', 
                author: String(user.firstName), 
                imageUrl: '', 
                createdAt: serverTimestamp() 
              });
          });

          await Promise.all(promises);
          alert(`✅ Se agregaron ${promises.length} eventos.`);
          setShowQuickLoad(false); 
          setQuickText("");
      } catch (e) { 
          alert("Error en carga masiva: " + e.message); 
      } finally { 
          setProcessing(false); 
      }
  };
  
  const openNew = () => { setEditingEvent(null); setPhotoPreview(null); setShowModal(true); };
  const openEdit = (ev) => { setEditingEvent(ev); setPhotoPreview(ev.imageUrl || null); setShowModal(true); };

 const renderGrid = () => {
    const year = currentDate.getFullYear(); 
    const month = currentDate.getMonth();
    const days = []; 
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Huecos días mes anterior
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="bg-gray-50/30 border-b border-r border-gray-100 min-h-[80px] md:min-h-[120px]"></div>);
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      
      const dayEvents = (events || []).filter(e => {
          if (e.date !== dateStr) return false;
          if (e.type === 'TECNICO') return isTechTeam && calendarMode === 'technical';
          if (calendarMode === 'technical') return false; 
          if (filterType !== 'TODOS' && e.type !== filterType) return false;
          return true;
      });

      const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();

      days.push(
        <div 
          key={d} 
          onClick={() => handleDayClick(dateStr)} 
          className={`relative border-b border-r border-gray-100 p-1 transition flex flex-col group cursor-pointer min-h-[80px] md:min-h-[120px] ${isToday ? 'bg-violet-50/50' : 'bg-white hover:bg-gray-50'}`}
        >
          <div className="flex justify-center mb-1">
            <span className={`text-[10px] md:text-sm w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-full font-bold ${isToday ? 'bg-violet-600 text-white shadow-md' : 'text-gray-500'}`}>
              {d}
            </span>
          </div>
          <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar flex-1">
            {dayEvents.map((ev, idx) => { 
              const style = EVENT_TYPES[ev.type]?.color || EVENT_TYPES['GENERAL'].color; 
              return (
                <div key={idx} className={`text-[8px] md:text-[10px] rounded-md px-1.5 py-0.5 truncate font-bold uppercase border-l-4 shadow-sm ${style}`}>
                  {ev.title}
                </div>
              ); 
            })}
          </div>
        </div>
      );
    }
    return days;
  };
     

return (
    <div className="flex flex-col h-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in fade-in select-none relative">
      {/* Cabecera */}
      <div className="flex justify-between items-center p-3 bg-white border-b border-gray-100 shrink-0">
        <div className="flex flex-col md:flex-row gap-2 md:items-center">
          <h2 className="text-xl md:text-2xl font-black text-violet-900 uppercase italic tracking-tighter">
            {currentDate.toLocaleDateString('es-ES', { month: 'long' })} 
            <span className="text-gray-400 text-sm md:text-lg not-italic font-medium ml-2">{currentDate.getFullYear()}</span>
          </h2>
          {isTechTeam && (
            <div className="flex bg-gray-100 p-1 rounded-lg">
              <button onClick={() => setCalendarMode('general')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${calendarMode === 'general' ? 'bg-white shadow text-violet-700' : 'text-gray-400'}`}>General</button>
              <button onClick={() => setCalendarMode('technical')} className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition ${calendarMode === 'technical' ? 'bg-white shadow text-teal-600' : 'text-gray-400'}`}>Técnico</button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => changeMonth(-1)} className="p-2 text-gray-600 hover:bg-white rounded-md transition"><ChevronLeft size={16}/></button>
            <button onClick={() => setCurrentDate(new Date())} className="px-3 text-xs md:text-sm font-bold text-gray-600 hover:bg-white rounded-md transition">HOY</button>
            <button onClick={() => changeMonth(1)} className="p-2 text-gray-600 hover:bg-white rounded-md transition"><ChevronRight size={16}/></button>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setShowQuickLoad(!showQuickLoad)} className={`p-2 rounded-lg shadow transition ${showQuickLoad ? 'bg-yellow-400 text-white' : 'bg-yellow-100 text-yellow-600'}`} title="Carga Rápida">
              <span className="font-bold text-lg leading-none">⚡</span>
            </button>
            <button onClick={openNew} className="bg-orange-500 text-white p-2 rounded-lg shadow hover:bg-orange-600 transition"><Plus size={20}/></button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      {calendarMode === 'general' ? (
        <div className="flex gap-2 overflow-x-auto p-2 bg-gray-50 border-b border-gray-200 no-scrollbar">
          <button onClick={() => setFilterType('TODOS')} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === 'TODOS' ? 'bg-violet-600 text-white border-violet-600 shadow-md' : 'bg-white text-gray-500 border-gray-200'}`}>Todos</button>
          {Object.keys(EVENT_TYPES).filter(t => t !== 'TECNICO' && t !== 'GENERAL').map(type => (
            <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase whitespace-nowrap transition border ${filterType === type ? `${EVENT_TYPES[type].color} ring-1 ring-offset-1` : 'bg-white text-gray-400 border-gray-200'}`}>{EVENT_TYPES[type].label}</button>
          ))}
        </div>
      ) : (
        <div className="bg-teal-50 border-b border-teal-100 p-2 text-center text-teal-800 text-xs font-bold uppercase tracking-widest flex justify-center items-center gap-2">
          <Lock size={12}/> Agenda Privada Equipo Técnico
        </div>
      )}

      {/* Carga Rápida */}
      {showQuickLoad && (
        <div className="bg-yellow-50 p-4 border-b border-yellow-200 animate-in slide-in-from-top-5">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold text-yellow-800 text-xs uppercase flex items-center gap-2">⚡ Carga Masiva Inteligente</h3>
            <button onClick={() => setShowQuickLoad(false)}><X size={16} className="text-yellow-600"/></button>
          </div>
          <textarea value={quickText} onChange={(e) => setQuickText(e.target.value)} className="w-full h-32 p-3 rounded-xl border border-yellow-300 text-xs font-medium outline-none bg-white" placeholder="Ej: 10/05/2026 Reunión (REUNIONES)"/>
          <button onClick={handleQuickSave} disabled={processing} className="mt-2 w-full bg-yellow-500 text-white font-bold py-2 rounded-xl text-xs uppercase shadow transition flex justify-center gap-2">
            {processing ? <RefreshCw className="animate-spin" size={14}/> : 'Procesar y Guardar'}
          </button>
        </div>
      )}

      {/* Días de la semana */}
      <div className="grid grid-cols-7 bg-white border-b border-gray-200 shrink-0">
        {['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map(d => (
          <div key={d} className="py-2 text-center text-[9px] md:text-xs font-black text-gray-300 uppercase tracking-widest">{d}</div>
        ))}
      </div>

     {/* Grilla del Calendario */}
      <div 
        onTouchStart={onTouchStart} 
        onTouchMove={onTouchMove} 
        onTouchEnd={onTouchEnd} 
        className="flex-1 grid grid-cols-7 overflow-y-auto bg-gray-100/50 no-scrollbar min-h-[500px]"
      >
        {renderGrid()}
      </div>

      {/* Modales */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveEvent} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl space-y-4 animate-in zoom-in-95 border-t-8 border-violet-600">
            <h3 className="text-lg font-black text-violet-900 uppercase italic">{editingEvent?.id ? 'Editar Evento' : 'Nuevo Evento'}</h3>
            <input name="title" defaultValue={editingEvent?.title} placeholder="Título" required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border" />
            <div className="grid grid-cols-2 gap-3">
              <input name="date" type="date" defaultValue={editingEvent?.date || selectedDayEvents?.date} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border" />
              <select name="type" defaultValue={editingEvent?.type || 'GENERAL'} className="w-full p-3 bg-gray-50 rounded-xl outline-none text-[10px] font-bold border uppercase">
                {Object.keys(EVENT_TYPES).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <textarea name="description" defaultValue={editingEvent?.description} placeholder="Detalles..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-20 resize-none" />
            
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 relative overflow-hidden flex flex-col items-center justify-center min-h-[60px]">
              {photoPreview ? (
                <div className="relative w-full h-32">
                  <img src={photoPreview} className="w-full h-full object-cover rounded-lg" />
                  <button type="button" onClick={() => setPhotoPreview(null)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md"><X size={12}/></button>
                </div>
              ) : (
                <span className="text-[10px] font-bold text-gray-400 uppercase">Subir Flyer</span>
              )}
              <input type="file" accept="image/*" onChange={handlePhotoChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs uppercase">Cancelar</button>
              <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold shadow-lg text-xs uppercase">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {selectedDayEvents && (
        <div className="fixed inset-0 bg-black/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setSelectedDayEvents(null)}>
          <div className="bg-white rounded-[40px] w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 border-b pb-2 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-black text-violet-900 uppercase italic">
                {new Date(selectedDayEvents.date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h2>
              <button onClick={() => setSelectedDayEvents(null)} className="p-1 bg-gray-100 rounded-full"><X size={18}/></button>
            </div>
            
            <button onClick={()=>{ setEditingEvent({ date: selectedDayEvents.date }); setShowModal(true); }} className="w-full py-3 mb-4 border-2 border-dashed border-gray-200 text-gray-400 rounded-2xl font-bold text-xs flex items-center justify-center gap-2"><Plus size={14}/> Agregar Evento</button>
            
            <div className="space-y-4">
              {selectedDayEvents.events.length === 0 ? (
                <p className="text-center text-gray-400 text-xs py-4">No hay eventos.</p>
              ) : (
                selectedDayEvents.events.map(ev => (
                  <div key={ev.id} className={`p-4 rounded-3xl border relative ${EVENT_TYPES[ev.type]?.color || 'bg-gray-50'}`}>
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full uppercase bg-white/50 mb-2 inline-block">{ev.type}</span>
                    <h3 className="font-bold text-base">{ev.title}</h3>
                    {ev.imageUrl && <img src={ev.imageUrl} className="mt-2 rounded-xl w-full h-32 object-cover" />}
                    {ev.description && <p className="text-xs mt-2 opacity-90">{ev.description}</p>}
                    <div className="absolute top-3 right-3 flex gap-1">
                      <button onClick={() => openEdit(ev)} className="p-2 bg-white/50 rounded-lg"><Edit3 size={14}/></button>
                      <button onClick={() => deleteEvent(ev.id)} className="p-2 bg-white/50 text-red-600 rounded-lg"><Trash2 size={14}/></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
  }
