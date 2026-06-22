import React, { useState, useEffect } from 'react';
import { Search, Printer, Save, X, FileText, User } from 'lucide-react';
import { doc, setDoc, onSnapshot, collection, query, serverTimestamp } from 'firebase/firestore';

// Función auxiliar para generar el HTML de impresión
const generarHTMLImpresionExterno = (student, informeData) => {
  return `
  <div class="pagina w-full bg-white text-black font-sans pb-4">
      <div class="flex flex-col items-center justify-center border-b-2 border-violet-800 pb-4 mb-5 bg-violet-50 p-6 rounded-t-xl">
          <img src="/logosinfondo.png" alt="Logo Institucional" class="h-16 object-contain mb-3" />
          <h1 class="text-2xl font-black uppercase tracking-widest text-violet-900 mb-1">INFORME PROFESIONAL EXTERNO</h1>
          <p class="inline-block text-xs font-bold uppercase tracking-widest text-violet-600 bg-white px-3 py-0.5 rounded-full border border-violet-200 shadow-sm">
              Fecha: ${new Date().toLocaleDateString('es-AR')}
          </p>
      </div>
      
      <div class="border border-violet-200 rounded-xl p-5 mb-4 bg-white shadow-sm" style="break-inside: avoid;">
          <h2 class="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Datos del Estudiante</h2>
          <div class="grid grid-cols-2 gap-y-3 gap-x-6 text-xs">
              <p><strong class="font-black text-gray-900">Alumno/a:</strong> <span class="text-gray-700">${student.lastName}, ${student.firstName}</span></p>
              <p><strong class="font-black text-gray-900">DNI:</strong> <span class="text-gray-700">${student.dni || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Fecha de Nac.:</strong> <span class="text-gray-700">${student.birthDate || student.fechaNac || '....................................'}</span></p>
              <p><strong class="font-black text-gray-900">Grupo / Nivel:</strong> <span class="text-gray-700 font-bold">${student.groupMorning || student.groupAfternoon || student.laboralGroup || student.level || '....................................'}</span></p>
          </div>
      </div>

      <div class="border border-violet-200 rounded-xl p-5 mb-6 bg-white shadow-sm" style="break-inside: avoid;">
          <h2 class="text-sm font-black text-violet-900 uppercase border-b border-violet-100 pb-1 mb-3">Destinatario del Informe</h2>
          <p class="text-sm text-gray-800 font-medium">Dirigido a: <strong class="font-black text-violet-900 uppercase">${informeData.paraQuien}</strong></p>
      </div>

      <div class="mb-6 min-h-[350px]">
          <h3 class="font-black uppercase text-violet-900 text-xs tracking-widest mb-2 border-b border-violet-100 pb-1">Desarrollo del Informe</h3>
          <p class="text-gray-800 leading-relaxed font-medium text-xs mt-4 whitespace-pre-wrap">${informeData.cuerpoInforme}</p>
      </div>

      <div class="mt-12 pt-4 flex flex-col items-center justify-center border-t border-dashed border-gray-200" style="break-inside: avoid;">
          <img src="/firmasylogo.png" alt="Sello Institucional Juntos a la Par" class="max-w-[260px] w-full object-contain mb-6 text-center" />
          
          <div class="w-full flex justify-between px-12 mt-12 relative">
              <div class="flex flex-col items-center w-64 relative">
                  <div class="w-full border-t-2 border-black mb-2"></div>
                  <span class="text-[10px] font-black uppercase text-gray-900 text-center">Firma y Aclaración<br/>Dirección / Equipo Técnico</span>
              </div>
          </div>
      </div>
  </div>`;
};

export function InformesExternosView({ user, db, appId }) {
  const [stage, setStage] = useState('main'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Estados del formulario
  const [paraQuien, setParaQuien] = useState('');
  const [cuerpoInforme, setCuerpoInforme] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Efecto estricto para impresión limpia (igual que en tu InformesView)
  useEffect(() => {
    const originalDisplays = new Map();

    const handleBeforePrint = () => {
      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.id !== 'impresion-externa') {
          originalDisplays.set(child, child.style.display);
          child.style.display = 'none';
        }
      });
    };

    const handleAfterPrint = () => {
      const masiva = document.getElementById('impresion-externa');
      if (masiva) masiva.remove();

      const bodyChildren = Array.from(document.body.children);
      bodyChildren.forEach(child => {
        if (originalDisplays.has(child)) {
          child.style.display = originalDisplays.get(child);
        }
      });
      originalDisplays.clear();
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Traer los alumnos de la base
  useEffect(() => {
    if (!db || !appId) return;
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'));
    const unsubS = onSnapshot(qS, (snap) => setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    return () => unsubS();
  }, [db, appId]);

  const filteredStudents = students.filter(s => {
    const matchSearch = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setParaQuien('');
    setCuerpoInforme('');
    setStage('form');
  };

  const handlePrint = () => {
    if (!paraQuien || !cuerpoInforme) {
      alert("Por favor, completá para quién es el informe y el cuerpo del mismo antes de imprimir.");
      return;
    }

    let contenedor = document.getElementById('impresion-externa');
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'impresion-externa';
      document.body.appendChild(contenedor);
    }
    
    contenedor.className = 'print:block con-aire';
    contenedor.innerHTML = generarHTMLImpresionExterno(selectedStudent, { paraQuien, cuerpoInforme });
    
    setTimeout(() => {
      window.print();
    }, 500);
  };

  const handleSave = async () => {
    if (!paraQuien || !cuerpoInforme) {
      alert("Completá todos los campos antes de guardar.");
      return;
    }

    setIsSaving(true);
    const informeId = `${selectedStudent.id}_ext_${Date.now()}`;
    
    try {
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'external_reports', informeId), {
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
        paraQuien,
        cuerpoInforme,
        fechaCreacion: serverTimestamp()
      }, { merge: true });
      
      alert("Informe guardado correctamente en la base de datos.");
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Hubo un error al guardar.");
    }
    setIsSaving(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-20 animate-in fade-in relative">
      
      {/* MAGIA CSS PARA IMPRESIÓN */}
      <style dangerouslySetInnerHTML={{ __html: `
       @media screen {
         #impresion-externa { display: none !important; }
       }
       @media print {
         body > *:not(#impresion-externa):not(script):not(style) {
           display: none !important;
         }
         #impresion-externa {
           display: block !important;
           visibility: visible !important;
           position: relative; 
           width: 100%;
         }
         .pagina { 
           page-break-after: always; 
           page-break-inside: avoid;
           padding-bottom: 0 !important;
         }
         body { background: white; margin: 0; padding: 0; }
         .con-aire @page { margin: 1.2cm 1.4cm !important; }
         .con-aire .pagina { padding-left: 0.5cm !important; padding-right: 0.5cm !important; }
       }
      `}} />

      {/* VISTA PRINCIPAL (Buscador) */}
      <div className={`${stage === 'main' ? 'block' : 'hidden'} print:hidden`}>
        <div className="bg-gradient-to-r from-violet-600 to-indigo-700 p-6 md:p-8 rounded-[30px] md:rounded-[40px] shadow-xl text-white mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="w-full md:w-auto text-center md:text-left">
            <h2 className="text-xl md:text-2xl font-black mb-2 flex items-center justify-center md:justify-start gap-3">
              <FileText size={24} className="md:w-[28px] md:h-[28px]" /> Informes Externos
            </h2>
            <p className="text-violet-100 text-xs md:text-sm">Generador de documentos formales para profesionales externos.</p>
          </div>
        </div>

        <div className="mb-6 relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="text-gray-400" size={20} />
          </div>
          <input 
            className="w-full p-4 pl-12 rounded-2xl border-2 border-violet-100 bg-white text-sm font-medium focus:border-violet-400 focus:outline-none transition-colors shadow-sm" 
            placeholder="Buscar estudiante por nombre o apellido..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)} 
          />
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-200 divide-y overflow-hidden">
          {searchTerm.length === 0 ? (
            <div className="p-12 text-center text-gray-400 font-medium">
              Empezá a escribir el nombre del estudiante para buscarlo en la base.
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-8 text-center text-gray-400 font-medium">No se encontraron estudiantes con ese nombre.</div>
          ) : (
            filteredStudents.map(s => (
              <div key={s.id} className="p-5 flex justify-between items-center hover:bg-violet-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="bg-violet-100 text-violet-600 p-3 rounded-full">
                    <User size={20} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">{s.lastName}, {s.firstName}</p>
                    <p className="text-[10px] font-bold uppercase text-gray-400">{s.level || 'Nivel no asignado'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleSelectStudent(s)} 
                  className="bg-violet-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-violet-700 transition"
                >
                  Redactar Informe
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* VISTA DE EDICIÓN DEL INFORME */}
      {stage === 'form' && selectedStudent && (
        <div className="bg-white p-8 rounded-[40px] shadow-lg border border-gray-200 space-y-6 print:hidden animate-in fade-in">
          
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setStage('main')} className="bg-gray-100 p-3 rounded-full hover:bg-gray-200 text-gray-600 transition-colors">
              <X size={20}/>
            </button>
            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Nuevo Informe Externo
            </div>
          </div>
          
          {/* Cabecera del Estudiante */}
          <div className="bg-violet-50 p-6 rounded-3xl border border-violet-100 flex items-center gap-4">
            <div className="bg-white p-4 rounded-full shadow-sm text-violet-600">
              <FileText size={24} />
            </div>
            <div>
              <h3 className="font-black text-2xl text-violet-900">{selectedStudent.lastName}, {selectedStudent.firstName}</h3>
              <p className="text-sm font-bold text-violet-600 uppercase">
                DNI: {selectedStudent.dni || 'Sin cargar'} | Fecha Nac: {selectedStudent.birthDate || selectedStudent.fechaNac || 'Sin cargar'}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Campo: Para quién es */}
            <div className="p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
              <label className="text-xs font-black uppercase text-indigo-800 block mb-2">
                ¿A quién va dirigido el informe?
              </label>
              <input 
                type="text" 
                className="w-full p-4 rounded-xl bg-white border border-indigo-200 text-sm font-bold text-gray-800 focus:border-indigo-400 outline-none" 
                placeholder="Ej. Dr. Pérez, Neurólogo / Obra Social OSDE / Equipo Tratante..." 
                value={paraQuien} 
                onChange={e => setParaQuien(e.target.value)} 
              />
            </div>

            {/* Campo: Cuerpo del Informe */}
            <div className="p-5 bg-violet-50 rounded-2xl border border-violet-100">
              <label className="text-xs font-black uppercase text-violet-800 block mb-2">
                Cuerpo del Informe
              </label>
              <textarea 
                className="w-full p-4 rounded-xl bg-white border border-violet-200 text-sm font-medium text-gray-800 focus:border-violet-400 outline-none leading-relaxed" 
                placeholder="Redacte aquí el contenido del informe..." 
                value={cuerpoInforme} 
                onChange={e => setCuerpoInforme(e.target.value)} 
                rows={12} 
              />
            </div>
          </div>

          {/* Botonera de Acción */}
          <div className="flex flex-col md:flex-row gap-4 mt-8 pt-4 border-t border-gray-100">
            <button 
              onClick={handleSave} 
              disabled={isSaving} 
              className="flex-1 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black rounded-2xl flex items-center justify-center gap-2 transition"
            >
              <Save size={20} /> {isSaving ? 'Guardando...' : 'Guardar en Base de Datos'}
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 py-4 bg-violet-800 hover:bg-violet-900 text-white font-black rounded-2xl flex items-center justify-center gap-2 transition shadow-md"
            >
              <Printer size={20} /> Generar Documento e Imprimir
            </button>
          </div>

        </div>
      )}
    </div>
  );
}
