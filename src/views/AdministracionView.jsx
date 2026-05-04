import React, { useState, useEffect } from 'react';
import { 
  Search, CheckSquare, Printer, RefreshCw, 
  FileText, Download 
} from 'lucide-react';
import { 
  collection, query, orderBy, onSnapshot 
} from 'firebase/firestore';

export function AdministracionView({ user, db, appId }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filters, setFilters] = useState({ os: 'all', level: 'all', modality: 'all' });
  
  /// ESTADOS DOCUMENTOS
  const [template, setTemplate] = useState('constancia_regular'); 
  const [generating, setGenerating] = useState(false);
  const [customTarget, setCustomTarget] = useState(""); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [paseAction, setPaseAction] = useState('CONCEDE'); 
  
  const LOGO_URL = "/icon-192.png";
  const FIRMA_URL = "/firma.png"; 
  const SELLO_URL = "/sello.png";
  
  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsubStudents = onSnapshot(q, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    return () => unsubStudents();
  }, []);

  const filteredStudents = students.filter(s => {
      if (s.isActive === false) return false;
      const txt = filterText.toLowerCase();
      const matchesText = !txt || `${s.lastName} ${s.firstName} ${s.dni} ${s.healthInsurance || ''} ${s.level || ''}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      if (filters.os !== 'all') {
          const sOS = (s.healthInsurance || '').toLowerCase();
          if (filters.os === 'con_os' && sOS.length < 2) return false;
          if (filters.os === 'sin_os' && sOS.length >= 2) return false;
          if (filters.os !== 'con_os' && filters.os !== 'sin_os' && !sOS.includes(filters.os.toLowerCase())) return false;
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false;
      return true;
  });

  const toggleSelectAll = () => { if (selectedIds.length === filteredStudents.length) setSelectedIds([]); else setSelectedIds(filteredStudents.map(s => s.id)); };
  const toggleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); };

  const generateDocument = () => {
      if (selectedIds.length === 0) return alert("Selecciona al menos un estudiante.");
      setGenerating(true);
      
      const targets = students.filter(s => selectedIds.includes(s.id));
      const dateObj = new Date(customDate + 'T12:00:00'); 
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString('es-AR', { month: 'long' });
      const year = dateObj.getFullYear();
      const fullDate = `Villa Udaondo, ${day} de ${month} de ${year}`;
      
      let htmlContent = `<html><head><title>Documentos</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
          body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; color: #000; }
          .cert-wrapper { width: 100%; display: block; clear: both; margin-bottom: 20px; page-break-after: always; }
          .cert-container { border: 2px solid #65a30d; border-radius: 25px; padding: 25px 40px; margin: 0 auto; position: relative; height: 175mm; box-sizing: border-box; width: 190mm; display: flex; flex-direction: column; overflow: hidden; }
          .cert-header { display: flex; align-items: center; margin-bottom: 15px; }
          .cert-logo { width: 100px; height: auto; margin-right: 20px; }
          .cert-title { font-size: 16px; font-weight: bold; text-decoration: underline; text-transform: uppercase; padding-top: 15px; }
          .cert-subtitle { font-size: 12px; font-weight: bold; margin-top: 5px; }
          .cert-body { font-size: 13px; line-height: 1.6; flex-grow: 1; }
          .line-group { margin-bottom: 12px; }
          .data-field { text-align: center; font-weight: bold; font-size: 14px; border-bottom: 1px dotted #000; display: block; margin: 2px 0; padding-bottom: 2px; }
          .inline-field { font-weight: bold; border-bottom: 1px dotted #000; padding: 0 10px; }
          .date-section { margin: 15px 0; text-align: center; font-weight: bold; }
          .signatures-section { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; height: 130px; margin-top: auto; padding-bottom: 10px; }
          .sig-box { text-align: center; width: 220px; position: relative; }
          .sig-img { height: 95px; width: auto; display: block; margin: 0 auto -10px auto; position: relative; z-index: 10; }
          .sig-line { border-top: 1px solid #000; margin-top: 0; padding-top: 4px; font-size: 11px; font-weight: bold; }

          .planilla-page { width: 100%; max-width: 210mm; padding: 15px 30px; box-sizing: border-box; margin: 0 auto; height: 297mm; position: relative; }
          .planilla-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .planilla-title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; padding-top: 10px; }
          .planilla-grid { display: grid; grid-template-columns: 180px 1fr; gap: 5px; margin-bottom: 20px; font-size: 12px; }
          .p-label { font-weight: bold; text-transform: uppercase; padding: 4px 0; }
          .p-value { border-bottom: 1px dotted #000; padding: 4px 5px; font-weight: bold; text-transform: uppercase; }
          .asistencia-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          .asistencia-table th, .asistencia-table td { border: 1px solid #000; padding: 4px; text-align: center; height: 25px; }
          .asistencia-table th { background-color: #f0f0f0; font-weight: bold; }
          .mes-box { text-align: right; font-size: 14px; font-weight: bold; margin: 15px 0; text-transform: uppercase; padding-right: 10px; }
          .firmas-planilla { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
          .firma-col { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; font-weight: bold; }
          @media print { body { margin: 0; padding: 0; } .cert-container, .planilla-page { margin: 5mm auto; page-break-after: always; } }
      </style></head><body>`;

      targets.forEach(s => {
          const nivelRaw = (s.level || '').toUpperCase();
          const modRaw = (s.modality || 'Sede');
          let nivelDetallado = nivelRaw;
          
          if (nivelRaw.includes('INICIAL')) nivelDetallado = "escolaridad especial inicial";
          else if (nivelRaw.includes('CFI')) nivelDetallado = "escolaridad especial de formación laboral";
          else if (nivelRaw.includes('1°') || nivelRaw.includes('2°') || nivelRaw.includes('PRIMARIA') || nivelRaw.includes('CICLO')) {
              nivelDetallado = `escolaridad especial primaria, ${s.level || 'ciclo a definir'}`;
          }

          let jornadaInfo = "";
          if (s.journey && s.journey !== "A DEFINIR" && s.journey.trim() !== "") {
              jornadaInfo = ` con jornada ${s.journey.toLowerCase()}`;
          }

          let fraseAlumno = modRaw === 'Inclusión' 
              ? `Es alumno/a regular de modulo de apoyo a la integración escolar (con equipo)`
              : `Es alumno/a regular de ${nivelDetallado}${jornadaInfo}`;

          let presentadoAnte = customTarget.trim() !== "" ? customTarget : (s.healthInsurance && s.healthInsurance.trim().length > 2 ? s.healthInsurance : '................................................');

          htmlContent += `<div class="cert-wrapper">`;

          if (template === 'constancia_regular') {
              if (!customTarget && s.healthInsurance && s.healthInsurance.length > 2) presentadoAnte = s.healthInsurance;
              else if (!customTarget) presentadoAnte = 'quien corresponda';

              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header">
                      <img src="${LOGO_URL}" class="cert-logo"/>
                      <div class="cert-title">CONSTANCIA DE ALUMNO REGULAR</div>
                  </div>
                  <div class="cert-body">
                      Escuela Especial Juntos a la Par hace constar que
                      <div class="line-group" style="margin-top:15px;">
                          <span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span>
                      </div>
                      <div class="line-group" style="margin-top:20px;">
                          con DNI N.° <span class="inline-field">${s.dni}</span>.
                          <div style="margin-top:20px; font-size:15px; line-height: 1.5;">${fraseAlumno}.</div>
                      </div>
                      <div class="line-group" style="margin-top:10px;">en esta institución, con &nbsp;&nbsp; CUE 0623214-00.</div>
                      <div class="line-group" style="margin-top:30px;">
                          A pedido del interesado y al efecto de ser presentado ante... 
                          <span class="data-field" style="margin-top:5px;">${presentadoAnte.toUpperCase()}</span>
                      </div>
                      <div class="date-section" style="margin-top:40px;">
                          ${fullDate}
                          <div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div>
                          <div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div>
                      </div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box">
                          <img src="${FIRMA_URL}" class="sig-img"/>
                          <div class="sig-line">Firma director o vicedirector</div>
                      </div>
                      <div class="sig-box">
                          <img src="${SELLO_URL}" class="sig-img"/>
                          <div class="sig-line">Sello institución</div>
                      </div>
                  </div>
              </div>`;
          } else if (template === 'concesion_pase') {
              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header">
                      <img src="${LOGO_URL}" class="cert-logo"/>
                      <div>
                          <div class="cert-title">PASE - SOLICITUD CONCESIÓN</div>
                          <div class="cert-subtitle">Escuela Especial Juntos a la Par con CUE 0623214-00 y DIEGEP N°8298.</div>
                      </div>
                  </div>
                  <div class="cert-body">
                      <div class="line-group" style="margin-top:30px;">La dirección del establecimiento <span style="font-weight:bold; text-decoration:underline;">${paseAction}</span> el pase del alumno:</div>
                      <div class="line-group" style="margin-top:15px;"><span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span></div>
                      <div class="line-group" style="margin-top:20px;">que actualmente cursa <span class="inline-field">${s.level || '................'} (${s.modality || 'Sede'})</span></div>
                      <div class="line-group" style="margin-top:10px;">en la institución <b>Juntos a la Par</b>.</div>
                      <div class="line-group" style="margin-top:30px;">Para ser presentado ante las autoridades de la institución:<span class="data-field" style="margin-top:5px;">${presentadoAnte.toUpperCase()}</span></div>
                      <div class="date-section" style="margin-top: 60px;">${fullDate}<div style="border-bottom: 1px dotted #000; width: 60%; margin: 0 auto;"></div><div style="font-weight: normal; font-size: 11px;">Lugar y fecha</div></div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box"><br/><br/><div class="sig-line">Firma director o vicedirector</div></div>
                      <div class="sig-box"><br/><br/><div class="sig-line">Sello institución</div></div>
                  </div>
              </div>`;
    } else if (template === 'informe_jornada') {
              const presentadoAnteJornada = s.healthInsurance && s.healthInsurance.trim().length > 2 ? s.healthInsurance : 'quien corresponda';
              htmlContent += `
              <div class="cert-container" style="height: 260mm; border: none; padding: 15px 40px; font-family: Arial, sans-serif;">
                  <div class="cert-header" style="border-bottom: 1px solid #333; padding-bottom: 15px; margin-bottom: 25px;">
                      <img src="${LOGO_URL}" class="cert-logo" style="width: 110px; height: auto;"/>
                      <div>
                          <div class="cert-title" style="padding-top: 0; font-size: 18px;">INFORME DE FUNDAMENTACIÓN</div>
                          <div class="cert-subtitle" style="font-size: 15px;">Modalidad Jornada Doble</div>
                      </div>
                  </div>
                  <div class="cert-body" style="font-size: 16px; line-height: 1.6; padding: 0 10px;">
                      <div style="text-align: right; margin-bottom: 30px; font-weight: bold; text-transform: uppercase; font-size: 14px;">
                          Presentado ante: ${presentadoAnteJornada}
                      </div>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">El presente informe tiene como propósito fundamentar la incorporación del estudiante <b>${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</b> con DNI <b>${s.dni}</b> a la modalidad de jornada doble en el nivel primario de la Escuela de Educación Especial "Juntos a la Par". Esta propuesta organizativa resulta fundamental para garantizar una trayectoria educativa integral, brindando al estudiante un abordaje equilibrado que potencie todas sus áreas de desarrollo.</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">Durante uno de los turnos, el trabajo se centra exclusivamente en el abordaje pedagógico-curricular. En este espacio, se prioriza la adquisición y el fortalecimiento de las habilidades cognitivas, la alfabetización, el pensamiento lógico-matemático y la construcción de la autonomía, siempre diseñando las configuraciones de apoyo necesarias para acompañar el aprendizaje de los niños.</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">En el contra-turno, el/la estudiante participa del espacio de Pre-taller con Modalidad Artística. Esta instancia es de vital importancia, ya que el arte funciona como un vehículo privilegiado para la expresión emocional, la comunicación y la socialización. A través de la exploración de lenguajes como la plástica y la música, los estudiantes desarrollan la motricidad fina y gruesa, la creatividad y la percepción. Además, este espacio funciona como un primer acercamiento paulatino a las dinámicas de trabajo en taller, preparando el terreno de manera lúdica y expresiva para su futura trayectoria en el Centro de Formación Integral (CFI).</p>
                      
                      <p style="text-align: justify; margin-bottom: 20px; text-indent: 40px;">La articulación de ambos turnos conforma una propuesta superadora. La complementariedad entre el núcleo pedagógico y el espacio artístico-expresivo permite sostener una rutina estructurada y enriquecedora, resultando indispensable para favorecer el bienestar, la permanencia y el desarrollo integral del/la estudiante en la institución.</p>
                      
                      <div class="date-section" style="margin-top:50px; text-align: center;">
                          <span style="font-size: 15px;">${fullDate}</span>
                          <div style="border-bottom: 1px dotted #000; width: 50%; margin: 5px auto 2px auto;"></div>
                          <div style="font-weight: normal; font-size: 12px;">Lugar y fecha</div>
                      </div>
                  </div>
                  
                  {/* SECCIÓN DE FIRMAS Y SELLOS AÑADIDA NUEVAMENTE */}
                  <div class="signatures-section" style="padding-top: 15px; margin-top: auto; height: 130px; display: flex; justify-content: space-between; align-items: flex-end;">
                      <div class="sig-box" style="text-align: center; width: 220px;">
                          <img src="${FIRMA_URL}" class="sig-img" style="height: 90px; width: auto; display: block; margin: 0 auto -10px auto;"/>
                          <div class="sig-line" style="font-size: 11px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">Firma director o vicedirector</div>
                      </div>
                      <div class="sig-box" style="text-align: center; width: 220px;">
                          <img src="${SELLO_URL}" class="sig-img" style="height: 90px; width: auto; display: block; margin: 0 auto -10px auto;"/>
                          <div class="sig-line" style="font-size: 11px; border-top: 1px solid #000; padding-top: 4px; font-weight: bold;">Sello institución</div>
                      </div>
                  </div>
              </div>`;
          } else if (template === 'planilla_asistencia') {
              const months = ['MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
              let horario = ""; let prestacion = "";
              if (s.journey === 'Simple Mañana') { horario = "08:30 a 12:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Simple Tarde') { horario = "12:30 a 16:30"; prestacion = "Jornada Simple"; }
              else if (s.journey === 'Doble') { horario = "08:30 a 16:30"; prestacion = "Jornada Doble"; }
              else { horario = "A DEFINIR"; prestacion = s.journey || "-"; }

              months.forEach(mes => {
                  htmlContent += `
                  <div class="planilla-page">
                      <div class="planilla-header"><img src="${LOGO_URL}" style="height: 40px; float: left;" /><h1 class="planilla-title">PLANILLA DE ASISTENCIA MENSUAL</h1><div style="clear:both;"></div></div>
                      <div class="planilla-grid">
                          <div class="p-label">OBRA SOCIAL:</div><div class="p-value">${s.healthInsurance || 'NO DECLARA'}</div>
                          <div class="p-label">APELLIDO Y NOMBRE:</div><div class="p-value">${s.lastName}, ${s.firstName}</div>
                          <div class="p-label">DNI:</div><div class="p-value">${s.dni || '-'}</div>
                          <div class="p-label">PRESTACIÓN:</div><div class="p-value">${prestacion.toUpperCase()}</div>
                          <div class="p-label">HORARIO:</div><div class="p-value">${horario}</div>
                          <div class="p-label">LUGAR DE PRESTACIÓN:</div><div class="p-value">Escuela Especial Juntos a la Par - De las Boleadoras 2974, Ituzaingó</div>
                      </div>
                      <div class="mes-box">MES Y AÑO: <span style="border-bottom: 1px solid #000; padding: 0 10px;">${mes} ${year}</span></div>
                      <p style="font-size: 11px; font-weight: bold; margin-bottom: 5px;">ACUERDO AL SIGUIENTE DETALLE (*):</p>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+11}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+21}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                      <table class="asistencia-table" style="width: 10%;"><tr><th>31</th></tr><tr><td></td></tr></table>
                      <div class="firmas-planilla">
                          <div class="firma-col"><br/><br/><br/><br/>FIRMA FAMILIAR / RESPONSABLE<br/>ACLARACIÓN Y DNI</div>
                          <div class="firma-col"><br/><br/><br/><br/>FIRMA Y SELLO DIRECTIVO</div>
                      </div>
                  </div>`;
              });
          }
          htmlContent += `</div>`; 
      });
    
      htmlContent += '</body></html>';

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; 
      iframe.style.bottom = '0'; 
      iframe.style.width = '0'; 
      iframe.style.height = '0'; 
      iframe.style.border = '0';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document; 
      doc.open(); 
      doc.write(htmlContent); 
      doc.close();

      setTimeout(() => { 
        iframe.contentWindow.focus(); 
        iframe.contentWindow.print(); 
        setTimeout(() => { document.body.removeChild(iframe); setGenerating(false); }, 5000); 
      }, 1000);
  }; 

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  return (
    <div className="animate-in fade-in pb-20 px-2 pt-4">
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-violet-600"></div>
            <div className="p-6 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <img src={LOGO_URL} className="w-16 h-auto object-contain" />
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase italic">Docs Alumnos</h2>
                        <p className="text-sm text-blue-600 font-bold uppercase">Centro de Documentación</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <select value={filters.os} onChange={e => setFilters({...filters, os: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none border-none text-blue-800">
                        <option value="all">🔍 TODAS LAS O.S.</option>
                        <option value="con_os">✅ CON COBERTURA</option>
                        <option value="sin_os">❌ SIN COBERTURA</option>
                    </select>
                    <select onChange={e=>setFilters({...filters, level: e.target.value})} className="bg-gray-100 p-2 rounded-lg text-xs font-bold outline-none border-none">
                        <option value="all">Nivel: Todos</option><option value="INICIAL">INICIAL</option><option value="1° Ciclo">1° Ciclo</option><option value="2° Ciclo">2° Ciclo</option><option value="CFI">CFI</option>
                    </select>
                    <div className="flex bg-gray-100 rounded-lg items-center px-2 border-none">
                        <Search size={14} className="text-gray-400"/>
                        <input placeholder="Buscar..." onChange={e=>setFilterText(e.target.value)} className="bg-transparent p-2 text-xs font-bold outline-none w-full"/>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-blue-50/80 p-4 backdrop-blur-sm border-b border-x border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4 shadow-sm">
            <button onClick={toggleSelectAll} className="text-xs font-black uppercase tracking-widest text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full">{selectedIds.length === filteredStudents.length ? 'Deseleccionar' : 'Seleccionar'} Visibles ({selectedIds.length})</button>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
                <input placeholder={template === 'concesion_pase' ? "Institución Destino..." : "Presentar ante..."} value={customTarget} onChange={e => setCustomTarget(e.target.value)} className="w-full md:w-48 p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full md:w-auto p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
              <select value={template} onChange={e=>setTemplate(e.target.value)} className="bg-white text-gray-700 pl-4 pr-8 py-2 rounded-xl text-xs font-bold w-full md:w-auto outline-none border border-blue-200 shadow-sm">
                    <option value="constancia_regular">📄 Constancia Regular</option>
                    <option value="planilla_asistencia">🗓️ Planilla Asistencia (Mar-Dic)</option>
                    <option value="concesion_pase">✈️ Concesión de Pase</option>
                    <option value="informe_jornada">📄 Informe Jornada Doble</option>
                </select>
                {template === 'concesion_pase' && (
                    <div className="flex bg-white rounded-lg border border-blue-200 overflow-hidden shadow-sm">
                        <button onClick={() => setPaseAction('SOLICITA')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'SOLICITA' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>SOLICITA</button>
                        <button onClick={() => setPaseAction('CONCEDE')} className={`px-3 py-2 text-[10px] font-bold transition ${paseAction === 'CONCEDE' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>CONCEDE</button>
                    </div>
                )}
                <button onClick={generateDocument} disabled={generating || selectedIds.length === 0} className={`bg-gradient-to-r from-blue-600 to-blue-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-2 ${generating || selectedIds.length === 0 ? 'opacity-50' : 'hover:scale-105'}`}>{generating ? <RefreshCw className="animate-spin"/> : <><Printer size={16}/> Imprimir</>}</button>
            </div>
        </div>

        <div className="bg-white shadow-sm border-x border-b border-gray-200 overflow-hidden rounded-b-[30px]">
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto">
                {filteredStudents.map(s => (
                    <div key={s.id} onClick={() => toggleSelect(s.id)} className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50/80' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 text-blue-600">
                                {selectedIds.includes(s.id) ? <CheckSquare size={20} /> : <div className="w-5 h-5 border-2 border-gray-300 rounded text-transparent"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start">
                                    <p className="font-black text-slate-800 uppercase text-sm truncate">{s.lastName}, {s.firstName}</p>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[9px] px-2 py-0.5 rounded-lg font-bold uppercase truncate max-w-[120px] ${(s.modality === 'Inclusión' && !s.daiMorning && !s.daiAfternoon) || (s.modality !== 'Inclusión' && !s.groupMorning && !s.groupAfternoon) ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-gray-100 text-gray-500'}`}>
                                            {s.modality === 'Inclusión' ? (s.daiMorning || s.daiAfternoon ? `DAI: ${s.daiMorning || s.daiAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin DAI</>') : (s.groupMorning || s.groupAfternoon ? `Grupo: ${s.groupMorning || s.groupAfternoon}` : '<><AlertTriangle size={10} className="inline mr-1 mb-0.5"/> Sin grupo</>')}
                                        </span>
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full uppercase shrink-0">{s.level}</span>
                                    </div>
                                </div>
                                <div className="flex gap-3 mt-1">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">DNI: <span className="text-gray-600">{s.dni || '-'}</span></p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate">OS: <span className="text-gray-600">{s.healthInsurance || 'NO DECLARA'}</span></p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
