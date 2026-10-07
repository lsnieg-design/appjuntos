import React, { useEffect, useMemo, useState } from 'react';
import {
  doc,
  updateDoc,
  deleteDoc,
  collection, 
  query,
  orderBy,
  onSnapshot,
  addDoc,
  setDoc,
  serverTimestamp,
  where,
  getDocs
} from 'firebase/firestore';
import {
  User,
  FileText,
  Plus,
  Users,
  Grid,
  ChevronLeft,
  ChevronRight,
  Printer,
  MessageSquare,
  Send,
  Edit3,
  X,
  GraduationCap,
  Activity,
  Shield,
  MapPin,
  Phone,
  Mail,
  Settings2,
  UserPlus,
  UsersRound,
  Save,
  CalendarDays,
  Clock3,
  BookOpen,
  ExternalLink,
  Zap,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Heart,
  Home,
  UserRound
} from 'lucide-react';
import { createGroup, updateGroup } from '../data/groups';
import {
  createStaffGroupAssignment,
  closeStaffGroupAssignment,
  getStaffGroupAssignmentsForGroup
} from '../data/assignments';
import { COLLECTIONS } from '../data/collections';

const BASE = (db, appId, collectionName) =>
  collection(db, 'artifacts', appId, 'public', 'data', collectionName);

const DOC = (db, appId, collectionName, id) =>
  doc(db, 'artifacts', appId, 'public', 'data', collectionName, id);

const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const calculateAge = birthDate => {
  if (!birthDate) return null;
  try {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return null;
  }
};

const formatDate = value => {
  if (!value) return '-';
  try {
    if (value?.toDate) return value.toDate().toLocaleDateString('es-AR');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-AR');
  } catch {
    return '-';
  }
};

const formatDateTime = value => {
  if (!value) return '-';
  try {
    const date = value?.toDate ? value.toDate() : new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return `${date.toLocaleDateString('es-AR')} · ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return '-';
  }
};

const getPlacements = assignment => {
  if (!assignment) return [];

  if (Array.isArray(assignment.placements) && assignment.placements.length) {
    return assignment.placements;
  }

  const groupId = assignment.groupId || '';
  const turnIds = Array.isArray(assignment.turnIds) ? assignment.turnIds : [];

  if (!groupId) return [];

  return turnIds.map(turnId => ({ groupId, turnId }));
};

const getTurnIdsFromGroup = group =>
  Array.isArray(group?.turnIds)
    ? group.turnIds
    : group?.turnId
      ? [group.turnId]
      : [];

const safeName = person =>
  person?.fullName ||
  `${person?.firstName || ''} ${person?.lastName || ''}`.trim() ||
  'Sin nombre';

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getSeverityClasses = severity => {
  if (severity === 'positive') {
    return 'bg-emerald-50 border-emerald-200 text-emerald-800';
  }
  if (severity === 'high') {
    return 'bg-red-50 border-red-200 text-red-800';
  }
  if (severity === 'medium') {
    return 'bg-orange-50 border-orange-200 text-orange-800';
  }
  return 'bg-slate-50 border-slate-200 text-slate-700';
};

const DEFAULT_ACTIONS = [
  { label: 'Trabajó muy bien', emoji: '🌟', severity: 'positive' },
  { label: 'Logro / aprendizaje', emoji: '🏆', severity: 'positive' },
  { label: 'Buena participación', emoji: '🙌', severity: 'positive' },
  { label: 'Buena conducta', emoji: '😊', severity: 'positive' },
  { label: 'Crisis / desregulación', emoji: '😭', severity: 'medium' },
  { label: 'Ausentismo', emoji: '🏠', severity: 'medium' },
  { label: 'Agresión / violencia', emoji: '✋', severity: 'high' },
  { label: 'Fuga / intento', emoji: '🏃', severity: 'high' }
];

export function GroupsView({ user, db, appId, setActiveTab, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [institutionConfig, setInstitutionConfig] = useState({ turns: [], staffRoles: [], scheduleTypes: [] });
  const [selectedTurnId, setSelectedTurnId] = useState('all');

  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null);
  const [bitacoraEntries, setBitacoraEntries] = useState([]);
  const [loadingBitacora, setLoadingBitacora] = useState(false);
  const [editingBitacora, setEditingBitacora] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);

  const [groupMessages, setGroupMessages] = useState({});
  const [editingGroup, setEditingGroup] = useState(null);
  const [staffSelections, setStaffSelections] = useState({});
  const [updatingGroup, setUpdatingGroup] = useState(false);

  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printMode, setPrintMode] = useState('students');

  const institutionMode = institutionConfig?.institutionMode || 'school';

  const personLabel =
    institutionMode === 'day_center'
      ? 'concurrente'
      : institutionMode === 'clinic'
        ? 'paciente'
        : 'estudiante';

  const personLabelPlural =
    institutionMode === 'day_center'
      ? 'concurrentes'
      : institutionMode === 'clinic'
        ? 'pacientes'
        : 'estudiantes';

  const groupLabel =
    institutionMode === 'day_center'
      ? 'taller'
      : institutionMode === 'clinic'
        ? 'espacio / equipo'
        : 'grupo';

  const isManagement =
    user?.rol === 'admin' ||
    user?.rol === 'super-admin' ||
    user?.accessRoleId === 'admin' ||
    ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración'].includes(user?.role);

  const scheduleTypeOptions = useMemo(() => {
    const source = Array.isArray(institutionConfig?.scheduleTypes)
      ? institutionConfig.scheduleTypes
      : [];

    return source.map((item, index) => {
      if (typeof item === 'string') {
        return {
          id: item.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          name: item
        };
      }

      return {
        id: item?.id || `jornada_${index + 1}`,
        name: item?.name || item?.label || `Jornada ${index + 1}`
      };
    });
  }, [institutionConfig?.scheduleTypes]);

  const turnOptions = useMemo(() => {
    const source = Array.isArray(institutionConfig?.turns)
      ? institutionConfig.turns
      : [];

    return source.map((turn, index) => {
      if (typeof turn === 'string') {
        return { id: `turno_${index + 1}`, name: turn };
      }

      return {
        id: turn?.id || `turno_${index + 1}`,
        name: turn?.name || turn?.label || `Turno ${index + 1}`
      };
    });
  }, [institutionConfig?.turns]);

  const roleOptions = useMemo(() => {
    const source = Array.isArray(institutionConfig?.staffRoles)
      ? institutionConfig.staffRoles
      : [];

    return source.map((role, index) => {
      if (typeof role === 'string') {
        return {
          id: role.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
          name: role,
          requiredForGroup: role.toLowerCase() === 'docente'
        };
      }

      return {
        id: role?.id || `rol_${index + 1}`,
        name: role?.name || role?.label || `Rol ${index + 1}`,
        requiredForGroup: Boolean(role?.requiredForGroup)
      };
    });
  }, [institutionConfig?.staffRoles]);

  const docenteRole = useMemo(
    () => roleOptions.find(role => role.id === 'docente' || normalizeText(role.name) === 'docente') || {
      id: 'docente',
      name: 'Docente',
      requiredForGroup: true
    },
    [roleOptions]
  );

  const normalizeRoles = roles => {
    const result = Array.isArray(roles) ? [...roles] : [];
    if (!result.includes(docenteRole.id) && institutionMode === 'school') {
      result.unshift(docenteRole.id);
    }
    return [...new Set(result)];
  };

  const getTurnLabel = turnId =>
    turnOptions.find(turn => turn.id === turnId)?.name || turnId || '';

  const getRoleLabel = roleId =>
    roleOptions.find(role => role.id === roleId)?.name || roleId || 'Rol';

  const getScheduleTypeLabel = scheduleType =>
    scheduleTypeOptions.find(item => item.id === scheduleType)?.name ||
    scheduleType ||
    'Sin jornada';

  useEffect(() => {
    if (!db || !appId) return undefined;

    let studentPeople = [];
    let studentProfiles = [];
    let studentAssignments = [];

    const rebuildStudents = () => {
      const peopleById = new Map(studentPeople.map(person => [person.id, person]));

      const result = studentProfiles.map(profile => {
        const person = peopleById.get(profile.personId) || {};
        const assignments = studentAssignments.filter(item =>
          item.studentId === (profile.personId || person.id) &&
          item.status !== 'closed' &&
          !item.validTo
        );

        return {
          ...person,
          ...profile,
          id: profile.personId || person.id,
          personId: profile.personId || person.id,
          firstName: profile.firstName || person.firstName || '',
          lastName: profile.lastName || person.lastName || '',
          fullName: profile.fullName || person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
          groupAssignments: assignments
        };
      });

      setStudents(result);
    };

    const unsubConfig = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution'),
      snap => setInstitutionConfig(
        snap.exists()
          ? snap.data()
          : { turns: [], staffRoles: [], scheduleTypes: [] }
      )
    );

    const unsubGroups = onSnapshot(
      BASE(db, appId, COLLECTIONS.GROUPS),
      snap => setGroups(
        snap.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .filter(group => group.active !== false)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      )
    );

    const unsubStaff = onSnapshot(
      query(
        BASE(db, appId, COLLECTIONS.PEOPLE),
        where('type', '==', 'staff')
      ),
      snap => setStaffList(
        snap.docs.map(item => ({ id: item.id, ...item.data() }))
      )
    );

    const unsubPeople = onSnapshot(
      query(
        BASE(db, appId, COLLECTIONS.PEOPLE),
        where('type', '==', 'student')
      ),
      snap => {
        studentPeople = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
      }
    );

    const unsubProfiles = onSnapshot(
      BASE(db, appId, COLLECTIONS.STUDENT_PROFILES),
      snap => {
        studentProfiles = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
      }
    );

    const unsubStudentAssignments = onSnapshot(
      BASE(db, appId, COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS),
      snap => {
        studentAssignments = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
      }
    );

    const unsubStaffAssignments = onSnapshot(
      BASE(db, appId, COLLECTIONS.STAFF_GROUP_ASSIGNMENTS),
      snap => setStaffAssignments(
        snap.docs.map(item => ({ id: item.id, ...item.data() }))
      )
    );

    const unsubMural = onSnapshot(
      query(
        BASE(db, appId, 'group_mural'),
        orderBy('createdAt', 'desc')
      ),
      snap => {
        const messages = snap.docs.map(item => ({ id: item.id, ...item.data() }));
        setGroupMessages(
          messages.reduce((acc, message) => {
            const key = message.groupId || message.groupName || 'sin-grupo';
            if (!acc[key]) acc[key] = [];
            acc[key].push(message);
            return acc;
          }, {})
        );
      }
    );

    return () => {
      unsubConfig();
      unsubGroups();
      unsubStaff();
      unsubPeople();
      unsubProfiles();
      unsubStudentAssignments();
      unsubStaffAssignments();
      unsubMural();
    };
  }, [db, appId]);

  useEffect(() => {
    if (!db || !appId || !showBitacoraModal) return undefined;

    setLoadingBitacora(true);

    const unsubscribe = onSnapshot(
      BASE(db, appId, COLLECTIONS.STUDENT_BITACORA),
      snapshot => {
        const studentId = showBitacoraModal.personId || showBitacoraModal.id;

        const entries = snapshot.docs
          .map(item => ({ id: item.id, ...item.data() }))
          .filter(entry => entry.studentId === studentId)
          .sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return dateB - dateA;
          });

        setBitacoraEntries(entries);
        setLoadingBitacora(false);
      },
      error => {
        console.error('Error leyendo bitácora:', error);
        setBitacoraEntries([]);
        setLoadingBitacora(false);
      }
    );

    return unsubscribe;
  }, [db, appId, showBitacoraModal]);

  const gruposFinales = useMemo(() => {
    return groups
      .filter(group => {
        if (selectedTurnId === 'all') return true;
        return getTurnIdsFromGroup(group).includes(selectedTurnId);
      })
      .map(group => {
        const turnIds = getTurnIdsFromGroup(group);

        const peopleInGroup = students.filter(person => {
          return (person.groupAssignments || []).some(assignment => {
            const placements = getPlacements(assignment);

            return placements.some(placement =>
              placement.groupId === group.id &&
              (
                selectedTurnId === 'all' ||
                placement.turnId === selectedTurnId
              )
            );
          });
        });

        const staffByRole = staffAssignments
          .filter(item =>
            item.groupId === group.id &&
            item.status !== 'closed' &&
            !item.validTo
          )
          .map(assignment => {
            const person = staffList.find(item => item.id === assignment.staffId);

            return {
              ...assignment,
              person,
              roleName: getRoleLabel(assignment.roleId),
              name: safeName(person) === 'Sin nombre' ? 'Sin asignar' : safeName(person)
            };
          });

        return {
          ...group,
          turnIds,
          turnLabels: turnIds.map(getTurnLabel).filter(Boolean),
          enabledRoles: normalizeRoles(group.enabledRoles),
          students: peopleInGroup,
          staffByRole
        };
      });
  }, [groups, students, staffList, staffAssignments, selectedTurnId, roleOptions, docenteRole.id, institutionMode]);

  const selectedGroup = selectedGroupDetails
    ? gruposFinales.find(group => group.id === selectedGroupDetails.id) || selectedGroupDetails
    : null;

  const openCreateGroup = () => {
    setStaffSelections({});

    setEditingGroup({
      isNew: true,
      name: '',
      siteId: '',
      levelId: '',
      sectionId: '',
      turnIds: turnOptions[0] ? [turnOptions[0].id] : [],
      scheduleType: scheduleTypeOptions[0]?.id || '',
      enabledRoles: normalizeRoles(institutionMode === 'school' ? [docenteRole.id] : []),
      classroom: '',
      institucionalDrive: ''
    });
  };

  const openEditGroup = async group => {
    setUpdatingGroup(true);

    try {
      const assignments = await getStaffGroupAssignmentsForGroup(db, appId, group.id);
      const selections = {};

      assignments
        .filter(item => item.status !== 'closed' && !item.validTo)
        .forEach(item => {
          selections[item.roleId] = item.staffId;
        });

      setStaffSelections(selections);
      setEditingGroup({
        ...group,
        enabledRoles: normalizeRoles(group.enabledRoles),
        turnIds: getTurnIdsFromGroup(group)
      });
    } catch (error) {
      console.error(error);
      alert(`No se pudo abrir el ${groupLabel}: ${error.message}`);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleUpdateGroup = async event => {
    event.preventDefault();
    if (!editingGroup) return;

    setUpdatingGroup(true);

    try {
      const form = new FormData(event.currentTarget);
      const name = String(form.get('groupName') || '').trim();

      if (!name) {
        throw new Error(`El ${groupLabel} necesita un nombre.`);
      }

      const turnIds = form.getAll('turnId');
      const enabledRoles = normalizeRoles(form.getAll('roleId'));

      const groupData = {
        name,
        siteId: String(form.get('siteId') || '').trim() || null,
        levelId: institutionMode === 'school'
          ? String(form.get('levelId') || '').trim() || null
          : null,
        sectionId: institutionMode === 'school'
          ? String(form.get('sectionId') || '').trim() || null
          : null,
        turnIds,
        scheduleType: institutionMode === 'school'
          ? (form.get('scheduleType') || '')
          : null,
        enabledRoles,
        classroom: String(form.get('classroom') || '').trim(),
        institucionalDrive: String(form.get('institucionalDrive') || '').trim(),
        active: true
      };

      const groupId = editingGroup.isNew
        ? await createGroup(db, appId, groupData)
        : editingGroup.id;

      if (!editingGroup.isNew) {
        await updateGroup(db, appId, groupId, groupData);
      }

      const previous = editingGroup.isNew
        ? []
        : await getStaffGroupAssignmentsForGroup(db, appId, groupId);

      const activeByRole = previous.filter(item => item.status !== 'closed' && !item.validTo);

      for (const role of roleOptions) {
        const oldAssignment = activeByRole.find(item => item.roleId === role.id);
        const selectedStaffId = enabledRoles.includes(role.id)
          ? (staffSelections[role.id] || '')
          : '';

        if (oldAssignment?.staffId === selectedStaffId) continue;

        if (oldAssignment) {
          await closeStaffGroupAssignment(db, appId, oldAssignment.id);
        }

        if (selectedStaffId) {
          await createStaffGroupAssignment(db, appId, {
            staffId: selectedStaffId,
            groupId,
            roleId: role.id,
            turnIds
          });
        }
      }

      setEditingGroup(null);
      setStaffSelections({});
    } catch (error) {
      console.error(error);
      alert(`No se pudo guardar el ${groupLabel}: ${error.message}`);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const openStudentSummary = student => {
    setSelectedStudent(student);
  };

  const openFullLegajo = student => {
    const studentId = student.personId || student.id;
    if (typeof onSelectStudent === 'function' && studentId) {
      onSelectStudent(studentId);
    }

    if (typeof setActiveTab === 'function') {
      setActiveTab('matricula');
    }

    setSelectedStudent(null);
    setSelectedGroupDetails(null);
    setShowBitacoraModal(null);
  };

  const openBitacora = student => {
    setSelectedStudent(null);
    setShowBitacoraModal(student);
    setEditingBitacora(null);
    setIsWriting(false);
    setNewNote('');
  };

  const saveBitacoraEntry = async ({ type, severity, text }) => {
    const activeStudent = showBitacoraModal;
    if (!activeStudent) return;

    const cleanText = String(text || '').trim();
    if (!cleanText) return;

    setSavingIncident(true);

    try {
      const studentId = activeStudent.personId || activeStudent.id;
      const entryData = {
        studentId,
        date: editingBitacora?.date || new Date().toISOString(),
        type: editingBitacora?.type || type || 'Nota',
        severity: editingBitacora?.severity || severity || 'medium',
        text: cleanText,
        author: editingBitacora?.author || user?.fullName || user?.firstName || 'Usuario',
        authorId: editingBitacora?.authorId || user?.id || null,
        updatedAt: serverTimestamp(),
        ...(editingBitacora ? {} : { createdAt: serverTimestamp() })
      };

      if (editingBitacora?.id) {
        await updateDoc(
          DOC(db, appId, COLLECTIONS.STUDENT_BITACORA, editingBitacora.id),
          entryData
        );
      } else {
        await setDoc(
          DOC(db, appId, COLLECTIONS.STUDENT_BITACORA, crypto.randomUUID()),
          entryData
        );
      }

      if (!editingBitacora && normalizeText(type).includes('ausentismo')) {
        try {
          await addDoc(
            BASE(db, appId, 'social_cases'),
            {
              studentId,
              dni: activeStudent.dni || '',
              studentName: `${activeStudent.lastName || ''}, ${activeStudent.firstName || ''}`.trim(),
              level: activeStudent.level || 'SEDE',
              reason: 'REPORTE DESDE GRUPO: Ausentismo detectado.',
              status: 'Pendiente',
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              steps: {
                llamada: { done: false },
                continuidad: { sent: false }
              },
              history: [
                {
                  date: new Date().toISOString(),
                  text: 'REGISTRO AUTOMÁTICO: Caso abierto por reporte de ausentismo desde el grupo.',
                  author: user?.fullName || user?.firstName || 'Sistema'
                }
              ]
            }
          );
        } catch (socialError) {
          console.error('No se pudo abrir caso social:', socialError);
        }
      }

      setEditingBitacora(null);
      setIsWriting(false);
      setNewNote('');
    } catch (error) {
      console.error(error);
      alert(`No se pudo guardar la bitácora: ${error.message}`);
    } finally {
      setSavingIncident(false);
    }
  };

  const editBitacoraEntry = entry => {
    setEditingBitacora(entry);
    setNewNote(entry.text || '');
    setIsWriting(true);
  };

  const deleteBitacoraEntry = async entry => {
    if (!entry?.id) return;

    const confirmed = window.confirm(
      `¿Querés eliminar este registro de la bitácora?\n\n${entry.text || entry.type || 'Registro'}`
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        DOC(db, appId, COLLECTIONS.STUDENT_BITACORA, entry.id)
      );
    } catch (error) {
      console.error(error);
      alert(`No se pudo eliminar el registro: ${error.message}`);
    }
  };

  const printBitacora = (student, entries) => {
    const institutionName = institutionConfig?.institutionName || 'Mi Institución';
    const logoUrl = institutionConfig?.logoUrl || '';
    const age = calculateAge(student.birthDate);

    const rows = entries
      .slice()
      .sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0))
      .map(entry => `
        <div class="entry ${escapeHtml(entry.severity || '')}">
          <div class="entry-head">
            <span>${escapeHtml(entry.type || 'Registro')}</span>
            <span>${escapeHtml(formatDateTime(entry.date))}</span>
          </div>
          <div class="entry-text">${escapeHtml(entry.text || '')}</div>
          <div class="entry-foot">Registrado por: ${escapeHtml(entry.author || 'Usuario')}</div>
        </div>
      `)
      .join('');

    const printWindow = window.open('', '_blank', 'width=1000,height=900');

    if (!printWindow) {
      alert('El navegador bloqueó la ventana de impresión.');
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Bitácora Express - ${escapeHtml(student.lastName)}, ${escapeHtml(student.firstName)}</title>
          <style>
            @page { size: A4 portrait; margin: 11mm; }
            * { box-sizing: border-box; }
            body { margin: 0; font-family: Arial, Helvetica, sans-serif; color: #1e293b; font-size: 10px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .top { display:flex; justify-content:space-between; align-items:center; border-bottom: 4px solid #7c3aed; padding-bottom: 12px; margin-bottom: 14px; }
            .brand { display:flex; align-items:center; gap:12px; }
            .logo { width:58px; height:58px; object-fit:contain; border-radius:14px; border:1px solid #e2e8f0; }
            h1 { margin:0; font-size:20px; color:#4c1d95; text-transform:uppercase; }
            .meta { margin-top:5px; color:#64748b; font-size:10px; font-weight:700; }
            .entry { border:1px solid #e2e8f0; border-left:5px solid #cbd5e1; background:#f8fafc; border-radius:0 10px 10px 0; padding:10px 12px; margin-bottom:10px; page-break-inside:avoid; }
            .entry.positive { border-left-color:#10b981; background:#ecfdf5; }
            .entry.medium { border-left-color:#f97316; background:#fff7ed; }
            .entry.high { border-left-color:#ef4444; background:#fef2f2; }
            .entry-head { display:flex; justify-content:space-between; gap:15px; color:#64748b; text-transform:uppercase; font-weight:900; font-size:8px; margin-bottom:6px; }
            .entry-text { font-size:12px; font-weight:700; line-height:1.4; }
            .entry-foot { margin-top:7px; padding-top:6px; border-top:1px solid rgba(148,163,184,.25); color:#94a3b8; font-size:8px; font-weight:700; text-transform:uppercase; }
            .empty { text-align:center; padding:30px; color:#94a3b8; font-style:italic; }
            .footer { margin-top:20px; padding-top:10px; border-top:1px dashed #cbd5e1; text-align:center; color:#94a3b8; font-size:8px; }
          </style>
        </head>
        <body>
          <div class="top">
            <div class="brand">
              ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" />` : ''}
              <div>
                <h1>Bitácora Express</h1>
                <div class="meta">${escapeHtml(institutionName)} · ${escapeHtml(student.lastName)}, ${escapeHtml(student.firstName)}</div>
                <div class="meta">DNI: ${escapeHtml(student.dni || '-')} · Nacimiento: ${escapeHtml(formatDate(student.birthDate))} · Edad: ${escapeHtml(age ?? '-')} años</div>
              </div>
            </div>
          </div>
          ${rows || '<div class="empty">No hay registros en la bitácora.</div>'}
          <div class="footer">Documento generado el ${escapeHtml(formatDate(new Date().toISOString()))}</div>
          <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const printGroups = groupsList => {
    const peopleTitle = institutionMode === 'day_center'
      ? 'Concurrentes'
      : institutionMode === 'clinic'
        ? 'Pacientes'
        : 'Estudiantes';

    const institutionName = institutionConfig?.institutionName || 'Mi Institución';

    const printWindow = window.open('', '_blank', 'width=1100,height=900');
    if (!printWindow) {
      alert('El navegador bloqueó la ventana de impresión.');
      return;
    }

    const pages = groupsList.map(group => {
      const rows = [...(group.students || [])]
        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
        .map((student, index) => `
          <tr>
            <td class="center">${index + 1}</td>
            <td>${escapeHtml(`${student.lastName || ''}, ${student.firstName || ''}`)}</td>
            <td>${escapeHtml(student.dni || '-')}</td>
            <td>${escapeHtml(calculateAge(student.birthDate) ?? '-')} años</td>
            <td>${escapeHtml(formatDate(student.birthDate))}</td>
            <td>${escapeHtml(student.phone || '-')}</td>
          </tr>
        `)
        .join('');

      const staff = (group.staffByRole || [])
        .map(item => `${item.roleName}: ${item.name}`)
        .join(' · ') || 'Sin personal asignado';

      return `
        <section class="page">
          <div class="head">
            <div>
              <p class="eyebrow">${escapeHtml(institutionName)}</p>
              <h1>${escapeHtml(group.name)}</h1>
              <p>${escapeHtml(group.turnLabels?.join(' · ') || 'Sin turno')} · ${escapeHtml(group.classroom || 'Sin espacio')}</p>
              <p>${escapeHtml(staff)}</p>
            </div>
            <div class="count">${group.students.length}<span>${peopleTitle}</span></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Nombre y apellido</th>
                <th>DNI</th>
                <th>Edad</th>
                <th>Fecha de nacimiento</th>
                <th>Teléfono</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="6" class="empty">Sin ${peopleTitle.toLowerCase()} asignados.</td></tr>`}
            </tbody>
          </table>
        </section>
      `;
    }).join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Organización institucional</title>
          <style>
            @page { size:A4 landscape; margin:10mm; }
            *{box-sizing:border-box}
            body{margin:0;font-family:Arial,Helvetica,sans-serif;color:#1e293b;font-size:9px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
            .page{page-break-after:always}.page:last-child{page-break-after:auto}
            .head{display:flex;justify-content:space-between;align-items:center;background:#f8fafc;border:1px solid #e2e8f0;border-left:5px solid #7c3aed;padding:12px 14px;border-radius:0 14px 14px 0;margin-bottom:10px}
            .eyebrow{margin:0 0 2px;color:#7c3aed;text-transform:uppercase;font-size:8px;font-weight:900;letter-spacing:1.2px}
            h1{margin:0;color:#0f172a;text-transform:uppercase;font-size:18px}
            .head p{margin:3px 0 0;color:#64748b;font-weight:700}
            .count{width:70px;height:70px;border-radius:18px;background:#f3e8ff;color:#7c3aed;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:22px;font-weight:900}
            .count span{font-size:7px;text-transform:uppercase;letter-spacing:.8px;color:#8b5cf6;margin-top:2px}
            table{width:100%;border-collapse:collapse}
            th{background:#7c3aed;color:#fff;text-align:left;padding:7px;text-transform:uppercase;font-size:8px}
            td{padding:6px;border:1px solid #e2e8f0;vertical-align:middle}
            .center{text-align:center}.empty{text-align:center;color:#94a3b8;padding:20px;font-style:italic}
          </style>
        </head>
        <body>${pages}<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300));</script></body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleAddGroupComment = async event => {
    event.preventDefault();
    if (!selectedGroup) return;

    const form = new FormData(event.currentTarget);
    const text = String(form.get('comment') || '').trim();
    if (!text) return;

    try {
      await addDoc(BASE(db, appId, 'group_mural'), {
        groupId: selectedGroup.id,
        groupName: selectedGroup.name,
        text,
        author: user?.fullName || user?.firstName || 'Usuario',
        authorId: user?.id || null,
        createdAt: serverTimestamp()
      });

      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      alert(`No se pudo publicar el mensaje: ${error.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative overflow-hidden">

      {/* =========================================
          ENCABEZADO
      ========================================== */}

      <div className="bg-white p-4 shadow-sm z-20 sticky top-0 flex flex-col gap-3 shrink-0">
        <div className="flex justify-between items-center px-2 gap-3">
          <div>
            <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2">
              <Grid size={24} className="text-orange-500" />
              {institutionMode === 'day_center'
                ? 'Talleres y grupos'
                : institutionMode === 'clinic'
                  ? 'Organización'
                  : 'Mis grupos'}
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-8">
              {institutionMode === 'day_center'
                ? 'Organización institucional'
                : institutionMode === 'clinic'
                  ? 'Espacios y equipos de atención'
                  : 'Vista institucional'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isManagement && (
              <button
                type="button"
                onClick={openCreateGroup}
                className="bg-violet-600 text-white px-4 py-2.5 rounded-xl hover:bg-violet-700 transition shadow-sm flex items-center gap-2 font-black text-xs"
              >
                <Plus size={16} />
                {institutionMode === 'day_center'
                  ? 'Nuevo taller'
                  : institutionMode === 'clinic'
                    ? 'Nuevo espacio'
                    : 'Nuevo grupo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGroupsToPrint(gruposFinales);
                setShowPrintOptions(true);
              }}
              className="bg-slate-100 text-slate-700 p-2.5 rounded-xl hover:bg-slate-200 transition shadow-sm"
              title="Imprimir"
            >
              <Printer size={21} />
            </button>
          </div>
        </div>

        {turnOptions.length > 0 && (
          <div className="flex items-center gap-2 mx-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
              <button
                type="button"
                onClick={() => setSelectedTurnId('all')}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${selectedTurnId === 'all' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400'}`}
              >
                Todos
              </button>

              {turnOptions.map(turnOption => (
                <button
                  type="button"
                  key={turnOption.id}
                  onClick={() => setSelectedTurnId(turnOption.id)}
                  className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${selectedTurnId === turnOption.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400'}`}
                >
                  {turnOption.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* =========================================
          LISTADO DE GRUPOS
      ========================================== */}

      <div className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8">

          {gruposFinales.length === 0 ? (
            <div className="min-h-[420px] flex items-center justify-center">
              <div className="w-full max-w-xl bg-white border border-slate-200 rounded-[32px] p-10 md:p-14 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-[24px] bg-violet-50 text-violet-600 flex items-center justify-center mb-6">
                  <UsersRound size={34} />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
                  Organización institucional
                </p>

                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  Todavía no hay {groupLabel}s
                </h3>

                <p className="text-sm leading-relaxed text-slate-500 mt-3 max-w-md mx-auto">
                  Creá la estructura de la institución y después asigná a las personas desde sus legajos.
                </p>

                {isManagement && (
                  <button
                    type="button"
                    onClick={openCreateGroup}
                    className="mt-7 inline-flex items-center gap-2 px-5 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-violet-200 transition"
                  >
                    <Plus size={17} />
                    Crear primero
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {gruposFinales.map(group => {
                const staffCount = group.staffByRole?.length || 0;
                const peopleTitle = institutionMode === 'day_center'
                  ? 'Concurrentes'
                  : institutionMode === 'clinic'
                    ? 'Pacientes'
                    : 'Estudiantes';

                return (
                  <article
                    key={group.id}
                    className="group bg-white rounded-[30px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {group.turnLabels?.map(label => (
                              <span
                                key={label}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[9px] font-black uppercase tracking-wide"
                              >
                                {label}
                              </span>
                            ))}

                            {institutionMode === 'school' && group.scheduleType && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wide">
                                {getScheduleTypeLabel(group.scheduleType)}
                              </span>
                            )}
                          </div>

                          <h3 className="text-xl md:text-2xl font-black text-slate-900 truncate">
                            {group.name}
                          </h3>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                            {institutionMode === 'school' && group.levelId && <span>{group.levelId}</span>}
                            {institutionMode === 'school' && group.sectionId && <span>• {group.sectionId}</span>}
                            {group.classroom && <span>• {group.classroom}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setGroupsToPrint([group]);
                              setShowPrintOptions(true);
                            }}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
                            title="Imprimir grupo"
                          >
                            <Printer size={15} />
                          </button>

                          {isManagement && (
                            <button
                              type="button"
                              onClick={() => openEditGroup(group)}
                              className="p-2.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                              title={`Editar ${groupLabel}`}
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {peopleTitle}
                          </p>
                          <p className="text-2xl font-black text-slate-800 mt-1">
                            {group.students.length}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                            Equipo
                          </p>
                          <p className="text-2xl font-black text-violet-700 mt-1">
                            {staffCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              Personal asignado
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {staffCount === 0 ? 'Sin asignaciones' : `${staffCount} rol${staffCount === 1 ? '' : 'es'}`}
                            </p>
                          </div>

                          {group.institucionalDrive && (
                            <button
                              type="button"
                              onClick={() => window.open(group.institucionalDrive, '_blank', 'noopener,noreferrer')}
                              className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                            >
                              <ExternalLink size={13} />
                              Drive
                            </button>
                          )}
                        </div>

                        {group.staffByRole?.length > 0 ? (
                          <div className="space-y-2">
                            {group.staffByRole.slice(0, 3).map(assignment => (
                              <div
                                key={assignment.id || `${group.id}-${assignment.roleId}`}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${assignment.name && assignment.name !== 'Sin asignar' ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                  <span className="text-[10px] font-black uppercase text-slate-400 truncate">
                                    {assignment.roleName}
                                  </span>
                                </div>

                                <span className="text-[10px] font-black text-slate-700 text-right truncate">
                                  {assignment.name}
                                </span>
                              </div>
                            ))}

                            {group.staffByRole.length > 3 && (
                              <p className="text-[9px] text-slate-400 font-bold uppercase">
                                +{group.staffByRole.length - 3} asignaciones más
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
                            Todavía no hay personal asignado.
                          </div>
                        )}
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetails(group)}
                          className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-slate-800 transition"
                        >
                          Ver {groupLabel}
                        </button>

                        <button
                          type="button"
                          onClick={() => setSelectedGroupDetails(group)}
                          className="px-4 py-3 rounded-2xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
                          title={`Ver ${peopleTitle.toLowerCase()}`}
                        >
                          <Users size={17} />
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                      {group.students.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Sin {peopleTitle.toLowerCase()} asignados
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            La asignación se gestiona desde los legajos.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex -space-x-2 overflow-hidden pl-1">
                            {[...group.students]
                              .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                              .slice(0, 6)
                              .map(person => (
                                <button
                                  type="button"
                                  key={person.id}
                                  onClick={() => openStudentSummary(person)}
                                  className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-400 hover:scale-105 transition"
                                  title={`${person.lastName || ''}, ${person.firstName || ''}`}
                                >
                                  {person.photoUrl ? (
                                    <img
                                      src={person.photoUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (person.firstName?.[0] || '?').toUpperCase()
                                  )}
                                </button>
                              ))}

                            {group.students.length > 6 && (
                              <button
                                type="button"
                                onClick={() => setSelectedGroupDetails(group)}
                                className="w-9 h-9 rounded-full border-2 border-white bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-black hover:scale-105 transition"
                              >
                                +{group.students.length - 6}
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setSelectedGroupDetails(group)}
                            className="text-[10px] font-black text-slate-400 uppercase hover:text-violet-600 transition"
                          >
                            Ver listado →
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* =========================================
          MODAL GRUPO
      ========================================== */}

      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-100 z-[500] flex flex-col animate-in fade-in">
          <div className="p-4 md:p-5 border-b border-violet-100 flex justify-between items-center bg-white shrink-0 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="bg-violet-600 text-white p-2.5 rounded-xl shadow-lg shrink-0">
                <Users size={20} />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none truncate">
                    {selectedGroup.name}
                  </h2>

                  {selectedGroup.turnLabels?.map(label => (
                    <span
                      key={label}
                      className="text-[8px] font-black uppercase bg-violet-50 text-violet-700 border border-violet-100 px-2 py-1 rounded-full"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">
                  {institutionMode === 'day_center'
                    ? 'Taller · organización y acompañamiento'
                    : institutionMode === 'clinic'
                      ? 'Espacio · equipo de atención'
                      : 'Grupo · organización institucional'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedGroup.institucionalDrive && (
                <button
                  type="button"
                  onClick={() => window.open(selectedGroup.institucionalDrive, '_blank', 'noopener,noreferrer')}
                  className="hidden md:flex px-3 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase items-center gap-2 hover:bg-emerald-100 transition"
                >
                  <ExternalLink size={15} />
                  Drive
                </button>
              )}

              {isManagement && (
                <button
                  type="button"
                  onClick={() => openEditGroup(selectedGroup)}
                  className="p-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
                  title={`Editar ${groupLabel}`}
                >
                  <Edit3 size={18} />
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedGroupDetails(null)}
                className="p-2.5 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"
                title="Cerrar"
              >
                <X size={21} />
              </button>
            </div>
          </div>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

            {/* =========================================
                IZQUIERDA — INTEGRANTES
            ========================================== */}

            <div className="w-full lg:w-[470px] bg-white border-r flex flex-col overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      {personLabelPlural}
                    </p>
                    <p className="text-xl font-black text-slate-800 mt-1">
                      {selectedGroup.students.length}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white border border-slate-200 p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                      Equipo
                    </p>
                    <p className="text-xl font-black text-slate-800 mt-1">
                      {selectedGroup.staffByRole?.length || 0}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
                    <p className="text-[8px] font-black uppercase tracking-widest text-violet-500">
                      Espacio
                    </p>
                    <p className="text-xs font-black text-violet-800 mt-1 truncate">
                      {selectedGroup.classroom || 'Sin definir'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">
                        Integrantes
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Tocá una persona para ver un resumen de su legajo.
                      </p>
                    </div>

                    {selectedGroup.institutionalDrive && null}
                  </div>

                  {selectedGroup.students.length === 0 ? (
                    <div className="p-5 rounded-2xl border border-dashed border-slate-200 text-center">
                      <UsersRound size={24} className="mx-auto text-slate-300 mb-2" />
                      <p className="text-xs font-bold text-slate-400">
                        No hay {personLabelPlural} asignados a este {groupLabel}.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...selectedGroup.students]
                        .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                        .map(person => {
                          const age = calculateAge(person.birthDate);

                          return (
                            <div
                              key={person.id}
                              className="group/person flex items-center gap-3 p-3 rounded-2xl border border-slate-100 bg-white hover:border-violet-200 hover:shadow-sm transition"
                            >
                              <button
                                type="button"
                                onClick={() => openStudentSummary(person)}
                                className="w-11 h-11 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center font-black text-slate-400 shrink-0 hover:ring-2 hover:ring-violet-200 transition"
                                title="Ver resumen del legajo"
                              >
                                {person.photoUrl ? (
                                  <img src={person.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  (person.firstName?.[0] || '?').toUpperCase()
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => openStudentSummary(person)}
                                className="flex-1 min-w-0 text-left"
                              >
                                <p className="text-xs font-black uppercase text-slate-700 truncate">
                                  {person.lastName}, {person.firstName}
                                </p>
                                <p className="text-[9px] font-bold text-violet-500 uppercase mt-0.5">
                                  {age !== null ? `${age} años` : 'Edad s/d'}
                                  {person.phone ? ` · ${person.phone}` : ''}
                                </p>
                              </button>

                              <button
                                type="button"
                                onClick={() => openBitacora(person)}
                                className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 flex items-center justify-center transition shrink-0"
                                title="Bitácora Express"
                              >
                                <Zap size={20} />
                              </button>

                              <button
                                type="button"
                                onClick={() => openStudentSummary(person)}
                                className="w-9 h-9 rounded-xl bg-slate-50 text-slate-400 hover:bg-violet-50 hover:text-violet-600 flex items-center justify-center transition shrink-0"
                                title="Ver resumen"
                              >
                                <ChevronRight size={17} />
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>

                {selectedGroup.staffByRole?.length > 0 && (
                  <div className="p-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 mb-3">
                      <UserPlus size={16} className="text-violet-500" />
                      <h3 className="font-black uppercase italic text-xs text-slate-800">
                        Equipo
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {selectedGroup.staffByRole.map(assignment => (
                        <div
                          key={assignment.id || `${selectedGroup.id}-${assignment.roleId}`}
                          className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100"
                        >
                          <div>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
                              {assignment.roleName}
                            </p>
                            <p className="text-xs font-black text-slate-700 mt-1">
                              {assignment.name}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* =========================================
                DERECHA — MURO
            ========================================== */}

            <div className="flex-1 flex flex-col bg-slate-50 relative min-h-0">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#7c3aed_1px,transparent_1px)] [background-size:18px_18px]" />

              <div className="p-4 bg-white border-b flex items-center justify-between shrink-0 z-10 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-500 text-white rounded-lg">
                    <MessageSquare size={16} />
                  </div>
                  <div>
                    <h3 className="font-black text-slate-800 uppercase italic text-sm">
                      Muro del {groupLabel}
                    </h3>
                    <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">
                      Novedades del equipo
                    </p>
                  </div>
                </div>

                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">
                  {selectedGroupMessagesLength(selectedGroup, groupMessages)} novedades
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4 lg:p-8 z-10 custom-scrollbar">
                {(() => {
                  const messages = groupMessages[selectedGroup.id] || groupMessages[selectedGroup.name] || [];

                  if (!messages.length) {
                    return (
                      <div className="min-h-full flex flex-col items-center justify-center text-center p-10">
                        <div className="w-20 h-20 bg-white rounded-full border border-slate-200 flex items-center justify-center mb-4 shadow-sm">
                          <MessageSquare size={30} className="text-slate-300" />
                        </div>
                        <h4 className="text-slate-500 font-black uppercase text-xs italic">
                          El muro está vacío
                        </h4>
                        <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase max-w-sm">
                          Usalo para dejar novedades, acuerdos y recordatorios para el equipo.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="max-w-4xl mx-auto space-y-3">
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.authorId === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-[90%] lg:max-w-[75%] p-4 rounded-[24px] shadow-sm ${
                              message.authorId === user?.id
                                ? 'bg-violet-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                            }`}
                          >
                            <p className={`text-[8px] font-black uppercase mb-1 tracking-wide ${message.authorId === user?.id ? 'text-violet-200' : 'text-violet-500'}`}>
                              {message.author || 'Usuario'} · {message.createdAt?.seconds
                                ? new Date(message.createdAt.seconds * 1000).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                                : 'Ahora'}
                            </p>
                            <p className="text-sm font-bold leading-relaxed whitespace-pre-wrap">
                              {message.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

              <div className="p-4 lg:p-6 bg-white border-t-2 border-slate-100 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <form onSubmit={handleAddGroupComment} className="max-w-4xl mx-auto flex gap-2">
                  <input
                    name="comment"
                    autoComplete="off"
                    placeholder="Escribí una novedad para el equipo..."
                    className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-[30px] text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:bg-white transition-all"
                  />
                  <button
                    type="submit"
                    className="bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-200 active:scale-95 transition-all hover:bg-orange-600"
                    title="Publicar"
                  >
                    <Send size={22} />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          RESUMEN DE LEGAJO
      ========================================== */}

      {selectedStudent && (
        <StudentSummaryModal
          student={selectedStudent}
          institutionMode={institutionMode}
          personLabel={personLabel}
          groups={groups}
          turns={turnOptions}
          onClose={() => setSelectedStudent(null)}
          onOpenFullFile={() => openFullLegajo(selectedStudent)}
          onOpenBitacora={() => openBitacora(selectedStudent)}
        />
      )}

      {/* =========================================
          BITÁCORA EXPRESS
      ========================================== */}

      {showBitacoraModal && (
        <BitacoraExpressModal
          student={showBitacoraModal}
          entries={bitacoraEntries}
          loading={loadingBitacora}
          actions={DEFAULT_ACTIONS}
          user={user}
          newNote={newNote}
          setNewNote={setNewNote}
          isWriting={isWriting}
          setIsWriting={setIsWriting}
          saving={savingIncident}
          editingEntry={editingBitacora}
          onClose={() => {
            setShowBitacoraModal(null);
            setEditingBitacora(null);
            setIsWriting(false);
            setNewNote('');
          }}
          onAction={action => saveBitacoraEntry(action)}
          onSaveNote={() => saveBitacoraEntry({ type: 'Nota', severity: 'medium', text: newNote })}
          onEdit={editBitacoraEntry}
          onDelete={deleteBitacoraEntry}
          onPrint={() => printBitacora(showBitacoraModal, bitacoraEntries)}
        />
      )}

      {/* =========================================
          CREAR / EDITAR GRUPO
      ========================================== */}

      {editingGroup && (
        <GroupFormModal
          editingGroup={editingGroup}
          institutionMode={institutionMode}
          groupLabel={groupLabel}
          turnOptions={turnOptions}
          scheduleTypeOptions={scheduleTypeOptions}
          roleOptions={roleOptions}
          docenteRole={docenteRole}
          staffList={staffList}
          staffSelections={staffSelections}
          setStaffSelections={setStaffSelections}
          normalizeRoles={normalizeRoles}
          updatingGroup={updatingGroup}
          onClose={() => {
            setEditingGroup(null);
            setStaffSelections({});
          }}
          onSubmit={handleUpdateGroup}
          getRoleLabel={getRoleLabel}
        />
      )}

      {/* =========================================
          IMPRESIÓN
      ========================================== */}

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] w-full max-w-md p-7 shadow-2xl border-t-8 border-violet-600">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.18em] text-violet-500">
                  Organización institucional
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  ¿Qué querés imprimir?
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setShowPrintOptions(false)}
                className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-red-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <button
                type="button"
                onClick={() => setPrintMode('students')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition ${printMode === 'students' ? 'border-violet-600 bg-violet-50' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <UsersRound size={19} className="text-violet-600" />
                  <div>
                    <p className="font-black text-xs uppercase text-slate-800">
                      Listado de {personLabelPlural}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Datos básicos de cada {personLabel}.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPrintMode('staff')}
                className={`w-full p-4 rounded-2xl border-2 text-left transition ${printMode === 'staff' ? 'border-violet-600 bg-violet-50' : 'border-slate-100 bg-white'}`}
              >
                <div className="flex items-center gap-3">
                  <UserPlus size={19} className="text-violet-600" />
                  <div>
                    <p className="font-black text-xs uppercase text-slate-800">
                      Organización del personal
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Roles y personal asignado a cada grupo.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                printGroups(groupsToPrint);
                setShowPrintOptions(false);
              }}
              className="w-full py-3.5 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg"
            >
              Confirmar e imprimir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function selectedGroupMessagesLength(group, messages) {
  if (!group) return 0;
  return (messages[group.id] || messages[group.name] || []).length;
}

function StudentSummaryModal({
  student,
  institutionMode,
  personLabel,
  groups,
  turns,
  onClose,
  onOpenFullFile,
  onOpenBitacora
}) {
  const age = calculateAge(student.birthDate);

  const assignment = (student.groupAssignments || []).find(
    item => item.status === 'active' && !item.validTo
  ) || null;

  const placements = getPlacements(assignment);

  const placementDetails = placements.map(placement => {
    const group = groups.find(item => item.id === placement.groupId);
    const turn = turns.find(item => item.id === placement.turnId);
    return {
      groupName: group?.name,
      turnName: turn?.name
    };
  }).filter(item => item.groupName);

  return (
    <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 overflow-hidden flex items-center justify-center text-violet-600 font-black text-xl shrink-0">
              {student.photoUrl ? (
                <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (student.firstName?.[0] || '?').toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">
                Resumen de legajo
              </p>
              <h3 className="text-xl font-black text-slate-900 truncate mt-1">
                {student.lastName}, {student.firstName}
              </h3>
              <p className="text-xs font-bold text-slate-400 mt-1">
                {age !== null ? `${age} años` : 'Edad s/d'} · {student.dni || 'DNI s/d'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:text-red-500 shrink-0"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="grid md:grid-cols-3 gap-3">
            <MiniInfo icon={<CalendarDays size={15} />} label="Nacimiento" value={formatDate(student.birthDate)} />
            <MiniInfo icon={<Phone size={15} />} label="Teléfono" value={student.phone || 'Sin datos'} />
            <MiniInfo icon={<Mail size={15} />} label="Email" value={student.email || 'Sin datos'} />
          </div>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Users size={16} className="text-violet-500" />
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                Contacto familiar
              </h4>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <ContactCard label="Responsable 1" name={student.motherName} phone={student.motherContact} />
              <ContactCard label="Responsable 2" name={student.fatherName} phone={student.fatherContact} />
            </div>

            {(student.address || student.city || student.emergencyContact) && (
              <div className="mt-3 grid md:grid-cols-2 gap-3">
                <MiniInfo icon={<MapPin size={15} />} label="Domicilio" value={[student.address, student.city].filter(Boolean).join(' · ') || 'Sin datos'} />
                <MiniInfo icon={<Phone size={15} />} label="Emergencia" value={student.emergencyContact || 'Sin datos'} />
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              {institutionMode === 'day_center'
                ? <Activity size={16} className="text-orange-500" />
                : institutionMode === 'clinic'
                  ? <Heart size={16} className="text-rose-500" />
                  : <GraduationCap size={16} className="text-violet-500" />}
              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                {institutionMode === 'day_center'
                  ? 'Participación'
                  : institutionMode === 'clinic'
                    ? 'Atención'
                    : 'Escolaridad'}
              </h4>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {institutionMode === 'school' && (
                <>
                  <MiniInfo label="Nivel" value={student.level || 'Sin datos'} />
                  <MiniInfo label="Obra social / prepaga" value={student.healthInsurance || 'Sin datos'} />
                </>
              )}

              {institutionMode === 'day_center' && (
                <>
                  <MiniInfo label="Obra social / prepaga" value={student.healthInsurance || 'Sin datos'} />
                  <MiniInfo label="Jornada" value={assignment?.scheduleType || 'Sin datos'} />
                </>
              )}

              {institutionMode === 'clinic' && (
                <MiniInfo label="Obra social / prepaga" value={student.healthInsurance || 'Sin datos'} />
              )}
            </div>

            {placementDetails.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {placementDetails.map((item, index) => (
                  <div key={`${item.groupName}-${item.turnName}-${index}`} className="px-3 py-2 rounded-xl bg-violet-50 border border-violet-100">
                    <p className="text-xs font-black text-violet-800">{item.groupName}</p>
                    {item.turnName && <p className="text-[9px] text-violet-500 font-bold uppercase mt-0.5">{item.turnName}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Notas</p>
            <p className="text-xs text-slate-600 font-medium leading-relaxed mt-2">
              {student.notes || 'No hay observaciones cargadas.'}
            </p>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col md:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenBitacora}
            className="flex-1 py-3.5 rounded-2xl bg-violet-50 text-violet-700 font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-violet-100 transition"
          >
            <Zap size={16} />
            Bitácora Express
          </button>

          <button
            type="button"
            onClick={onOpenFullFile}
            className="flex-[1.4] py-3.5 rounded-2xl bg-violet-600 text-white font-black uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-violet-700 transition shadow-lg"
          >
            <FileText size={16} />
            Ver legajo completo
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({ icon, label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <div className="flex items-center gap-2 text-violet-500 mb-1">
        {icon || <span className="w-3.5" />}
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-xs font-black text-slate-700 break-words">
        {value}
      </p>
    </div>
  );
}

function ContactCard({ label, name, phone }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>
      <p className="text-xs font-black text-slate-700 mt-1">
        {name || 'No cargado'}
      </p>
      <p className="text-[10px] font-bold text-violet-600 mt-1 flex items-center gap-1">
        <Phone size={11} />
        {phone || 'Sin contacto'}
      </p>
    </div>
  );
}

function BitacoraExpressModal({
  student,
  entries,
  loading,
  actions,
  user,
  newNote,
  setNewNote,
  isWriting,
  setIsWriting,
  saving,
  editingEntry,
  onClose,
  onAction,
  onSaveNote,
  onEdit,
  onDelete,
  onPrint
}) {
  return (
    <div className="fixed inset-0 z-[800] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[36px] w-full max-w-md max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border-t-8 border-emerald-500">

        <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-emerald-500">
              Bitácora Express
            </p> 
            <h3 className="text-lg font-black text-slate-800 uppercase italic truncate mt-1">
              {student.lastName}, {student.firstName}
            </h3>
            <p className="text-[9px] font-bold text-slate-400 mt-0.5">
              {calculateAge(student.birthDate) ?? 'Edad s/d'} años · {student.dni || 'DNI s/d'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onPrint}
              className="p-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
              title="Imprimir bitácora"
            >
              <Printer size={17} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-full bg-slate-100 text-slate-500 hover:text-red-500"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-50 border-b border-slate-100 shrink-0">
          {!isWriting ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                {actions.map(action => (
                  <button
                    type="button"
                    key={action.label}
                    onClick={() => onAction({ ...action, text: action.label })}
                    disabled={saving}
                    className={`p-3 rounded-2xl border-2 flex items-center gap-2 transition active:scale-[.98] ${
                      action.severity === 'positive'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                        : action.severity === 'high'
                          ? 'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
                          : 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
                    } ${saving ? 'opacity-50' : ''}`}
                  >
                    <span className="text-xl shrink-0">{action.emoji}</span>
                    <span className="text-[8px] font-black uppercase text-left leading-tight">
                      {action.label}
                    </span>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => {
                    setIsWriting(true);
                    setNewNote('');
                  }}
                  className="col-span-2 py-3 rounded-2xl bg-slate-900 text-white font-black text-[9px] uppercase tracking-wide flex items-center justify-center gap-2 hover:bg-slate-800 transition"
                >
                  <Edit3 size={14} />
                  Redactar nota
                </button>
              </div>
            </>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                  {editingEntry ? 'Editar registro' : 'Nueva nota'}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setIsWriting(false);
                    setNewNote('');
                  }}
                  className="text-[9px] font-black uppercase text-slate-400 hover:text-slate-600"
                >
                  Cancelar
                </button>
              </div>

              <textarea
                autoFocus
                value={newNote}
                onChange={event => setNewNote(event.target.value)}
                placeholder="¿Qué pasó? ¿Qué observamos?"
                className="w-full p-3 bg-white border border-slate-200 rounded-2xl text-xs h-24 outline-none resize-none font-medium focus:border-violet-400"
              />

              <button
                type="button"
                onClick={onSaveNote}
                disabled={!newNote.trim() || saving}
                className="w-full mt-2 py-3 rounded-2xl bg-violet-600 text-white font-black uppercase text-[9px] disabled:opacity-50"
              >
                {saving ? 'Guardando...' : editingEntry ? 'Guardar cambios' : 'Guardar nota'}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Registros recientes
            </p>
            <span className="text-[9px] font-black text-slate-300">
              {entries.length} registro{entries.length === 1 ? '' : 's'}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex items-center justify-center text-slate-400 text-xs font-bold">
              Cargando bitácora...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <BookOpen size={26} className="mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-400">
                Todavía no hay registros.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className={`p-3 rounded-2xl border ${getSeverityClasses(entry.severity)}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-wider opacity-60">
                          {entry.type || 'Registro'}
                        </span>
                        <span className="text-[8px] font-bold opacity-50">
                          {formatDateTime(entry.date)}
                        </span>
                      </div>

                      <p className="text-xs font-black leading-relaxed mt-1 break-words">
                        {entry.text || entry.type}
                      </p>

                      <p className="text-[8px] font-bold opacity-50 mt-1 uppercase">
                        Por: {entry.author || user?.fullName || 'Usuario'}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="p-1.5 rounded-lg bg-white/60 hover:bg-white transition"
                        title="Editar"
                      >
                        <Edit3 size={13} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(entry)}
                        className="p-1.5 rounded-lg bg-white/60 hover:bg-red-100 transition"
                        title="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GroupFormModal({
  editingGroup,
  institutionMode,
  groupLabel,
  turnOptions,
  scheduleTypeOptions,
  roleOptions,
  docenteRole,
  staffList,
  staffSelections,
  setStaffSelections,
  normalizeRoles,
  updatingGroup,
  onClose,
  onSubmit,
  getRoleLabel
}) {
  const isSchool = institutionMode === 'school';
  const isDayCenter = institutionMode === 'day_center';
  const [enabledRoleIds, setEnabledRoleIds] = useState(() => normalizeRoles(editingGroup.enabledRoles || []));

  useEffect(() => {
    setEnabledRoleIds(normalizeRoles(editingGroup.enabledRoles || []));
  }, [editingGroup, normalizeRoles]);

  const toggleRole = roleId => {
    setEnabledRoleIds(current => {
      if (isSchool && roleId === docenteRole.id) return current;
      return current.includes(roleId)
        ? current.filter(id => id !== roleId)
        : [...current, roleId];
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-[32px] w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[9px] font-black text-violet-500 uppercase tracking-[0.18em]">
              Organización institucional
            </p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {editingGroup.isNew
                ? `Crear ${groupLabel}`
                : `Editar ${groupLabel}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              La estructura se configura aquí y las personas se asignan desde sus legajos.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 text-slate-400 hover:text-red-500"
          >
            <X size={19} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          <section className="rounded-2xl border border-slate-200 p-5">
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block md:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Nombre
                </span>
                <input
                  name="groupName"
                  defaultValue={editingGroup.name || ''}
                  required
                  className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-black text-sm outline-none border border-slate-200 focus:border-violet-400"
                  placeholder={isSchool ? 'Ej.: 3° A' : isDayCenter ? 'Ej.: Taller de Cerámica' : 'Ej.: Consultorio 1'}
                />
              </label>

              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Sede / establecimiento
                </span>
                <input
                  name="siteId"
                  defaultValue={editingGroup.siteId || ''}
                  className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200"
                  placeholder="Sede"
                />
              </label>

              <label className="block">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  {isSchool ? 'Aula' : 'Espacio'}
                </span>
                <input
                  name="classroom"
                  defaultValue={editingGroup.classroom || ''}
                  className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200"
                  placeholder={isSchool ? 'Aula 5' : 'SUM / Taller / Consultorio'}
                />
              </label>

              {isSchool && (
                <>
                  <label className="block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Nivel
                    </span>
                    <input
                      name="levelId"
                      defaultValue={editingGroup.levelId || ''}
                      className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200"
                      placeholder="Nivel"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      Sección
                    </span>
                    <input
                      name="sectionId"
                      defaultValue={editingGroup.sectionId || ''}
                      className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200"
                      placeholder="Sección"
                    />
                  </label>
                </>
              )}

              <div className="md:col-span-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Turnos / franjas
                </span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {turnOptions.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      No hay turnos configurados en la institución.
                    </p>
                  ) : (
                    turnOptions.map(turnOption => (
                      <label
                        key={turnOption.id}
                        className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          name="turnId"
                          value={turnOption.id}
                          defaultChecked={(editingGroup.turnIds || []).includes(turnOption.id)}
                          className="accent-violet-600"
                        />
                        <span className="text-xs font-bold text-slate-600">
                          {turnOption.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {isSchool && scheduleTypeOptions.length > 0 && (
                <label className="block">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    Tipo de jornada
                  </span>
                  <select
                    name="scheduleType"
                    defaultValue={editingGroup.scheduleType || scheduleTypeOptions[0]?.id || ''}
                    className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200 focus:border-violet-400"
                  >
                    <option value="">Seleccionar</option>
                    {scheduleTypeOptions.map(option => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={16} className="text-violet-500" />
              <h4 className="text-sm font-black text-slate-800">
                Roles habilitados
              </h4>
            </div>

            <p className="text-xs text-slate-400 mb-4">
              Definí qué roles forman parte de este {groupLabel}.
            </p>

            <div className="grid md:grid-cols-2 gap-2">
              {isSchool && enabledRoleIds.includes(docenteRole.id) && (
                <input type="hidden" name="roleId" value={docenteRole.id} />
              )}
              {roleOptions.map(role => {
                const checked = enabledRoleIds.includes(role.id);
                const required = isSchool && (role.id === docenteRole.id || role.requiredForGroup);

                return (
                  <label
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${checked ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="roleId"
                        value={role.id}
                        checked={checked}
                        onChange={() => toggleRole(role.id)}
                        disabled={required}
                        className="accent-violet-600"
                      />
                      <span className="text-xs font-black text-slate-700">
                        {role.name}
                      </span>
                    </span>

                    {required && (
                      <span className="text-[8px] font-black uppercase text-violet-500">
                        Obligatorio
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <UserPlus size={16} className="text-violet-500" />
              <h4 className="text-sm font-black text-slate-800">
                Personal asignado
              </h4>
            </div>

            <div className="space-y-2">
              {enabledRoleIds.map(roleId => (
                <div
                  key={roleId}
                  className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="text-[9px] font-black uppercase text-slate-500">
                    {getRoleLabel(roleId)}
                  </span>

                  <select
                    value={staffSelections[roleId] || ''}
                    onChange={event => setStaffSelections(prev => ({ ...prev, [roleId]: event.target.value }))}
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="">Sin asignar</option>
                    {staffList
                      .slice()
                      .sort((a, b) => safeName(a).localeCompare(safeName(b)))
                      .map(person => (
                        <option key={person.id} value={person.id}>
                          {safeName(person)}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>

            {staffList.length === 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                Todavía no hay personal cargado. El {groupLabel} puede crearse igual.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <ExternalLink size={16} className="text-emerald-600" />
              <h4 className="text-sm font-black text-slate-800">
                Documentación
              </h4>
            </div>

            <label className="block">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                Link a Drive institucional
              </span>
              <input
                name="institucionalDrive"
                defaultValue={editingGroup.institucionalDrive || ''}
                className="mt-1 w-full p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-sm font-bold outline-none focus:border-emerald-300"
                placeholder="https://drive.google.com/..."
              />
            </label>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={updatingGroup}
            className="flex-[2] py-3.5 bg-violet-600 text-white rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {updatingGroup ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}
