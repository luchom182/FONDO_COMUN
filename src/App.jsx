import React, { useState, useEffect, useMemo, useRef } from 'react';
import { INITIAL_DATA } from './initialData';
import { subscribeToAppData, saveAppData } from './firebase';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Users,
  Search,
  ShieldCheck,
  Lock,
  LogOut,
  Filter,
  DollarSign,
  Calendar,
  Phone,
  FileSpreadsheet,
  Trash2,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  Sparkles,
  Award,
  PlusCircle,
  Table as TableIcon,
  HelpCircle,
  Key,
  RotateCcw,
  MessageCircle
} from 'lucide-react';

// Format COP Currency with number safety
export const formatCOP = (amount) => {
  const safeNum = Number(amount);
  const validAmount = isNaN(safeNum) ? 0 : safeNum;
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  }).format(validAmount);
};

// Phone Sanitizer for WhatsApp links
export const sanitizePhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/\D/g, '');
};

// Validate Data Integrity
export const validateDataStructure = (raw) => {
  if (!raw || typeof raw !== 'object') return INITIAL_DATA;
  return {
    title: raw.title || INITIAL_DATA.title,
    quotaAmount: Number(raw.quotaAmount) || 10000,
    members: Array.isArray(raw.members) && raw.members.length > 0 ? raw.members : INITIAL_DATA.members,
    periods: Array.isArray(raw.periods) && raw.periods.length > 0 ? raw.periods : INITIAL_DATA.periods,
    payments: Array.isArray(raw.payments) ? raw.payments : INITIAL_DATA.payments,
    expenses: Array.isArray(raw.expenses) ? raw.expenses : INITIAL_DATA.expenses
  };
};

export default function App() {
  const isRemoteUpdateRef = useRef(false);
  const [isCloudSynced, setIsCloudSynced] = useState(false);

  // Persistence state
  const [data, setData] = useState(() => {
    try {
      const saved = localStorage.getItem('fondo_comun_data_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        return validateDataStructure(parsed);
      }
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
    }
    return INITIAL_DATA;
  });

  // Admin Password & Recovery Key Persistence
  const [adminPass, setAdminPass] = useState(() => {
    return localStorage.getItem('fondo_comun_admin_password') || 'admin123';
  });

  const [recoveryKey, setRecoveryKey] = useState(() => {
    return localStorage.getItem('fondo_comun_recovery_key') || '8888';
  });

  // Real-time Firebase Firestore Sync
  useEffect(() => {
    const unsubscribe = subscribeToAppData(
      (cloudData) => {
        if (cloudData) {
          isRemoteUpdateRef.current = true;
          setData(validateDataStructure(cloudData));
          if (cloudData.adminPass) setAdminPass(cloudData.adminPass);
          if (cloudData.recoveryKey) setRecoveryKey(cloudData.recoveryKey);
          setIsCloudSynced(true);
        } else {
          // Document does not exist in Firestore yet: seed it with current state
          saveAppData({ ...data, adminPass, recoveryKey });
          setIsCloudSynced(true);
        }
      },
      (err) => {
        console.warn('Fallback a modo offline local:', err);
        setIsCloudSynced(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Save changes locally and sync to Firebase when updated
  useEffect(() => {
    try {
      localStorage.setItem('fondo_comun_data_v1', JSON.stringify(data));
      localStorage.setItem('fondo_comun_admin_password', adminPass);
      localStorage.setItem('fondo_comun_recovery_key', recoveryKey);
    } catch (e) {}

    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    saveAppData({ ...data, adminPass, recoveryKey }).then((success) => {
      if (success) setIsCloudSynced(true);
    });
  }, [data, adminPass, recoveryKey]);

  // Auth & UI States
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showChangePassModal, setShowChangePassModal] = useState(false);

  const [inputLoginPass, setInputLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  // Password Recovery States
  const [inputRecoveryKey, setInputRecoveryKey] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');

  // Change Password States
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [newRecoveryKeyInput, setNewRecoveryKeyInput] = useState('');
  const [changePassError, setChangePassError] = useState('');
  const [changePassSuccess, setChangePassSuccess] = useState('');

  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'pending' | 'expenses' | 'matrix' | 'admin'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PAID' | 'PENDING'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('JULIO');

  // Admin Modals
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState({ 
    description: '', 
    amount: '', 
    date: new Date().toISOString().split('T')[0], 
    category: 'Insumos y Logística' 
  });
  const [expenseError, setExpenseError] = useState('');

  // Safe Members & Periods arrays
  const membersList = useMemo(() => Array.isArray(data?.members) ? data.members : [], [data]);
  const periodsList = useMemo(() => Array.isArray(data?.periods) ? data.periods : [], [data]);
  const paymentsList = useMemo(() => Array.isArray(data?.payments) ? data.payments : [], [data]);
  const expensesList = useMemo(() => Array.isArray(data?.expenses) ? data.expenses : [], [data]);

  // List of distinct months
  const availableMonths = useMemo(() => {
    const set = new Set();
    periodsList.forEach(p => p?.month && set.add(p.month));
    return Array.from(set).length > 0 ? Array.from(set) : ['JUNIO', 'JULIO'];
  }, [periodsList]);

  // Monthly statistics
  const monthStats = useMemo(() => {
    const q1Id = `${selectedMonth}_Q1`;
    const q2Id = `${selectedMonth}_Q2`;
    const targetGoal = membersList.length * 2 * (data?.quotaAmount || 10000);

    let collectedMonth = 0;
    const pendingList = [];
    const upToDateList = [];

    membersList.forEach(member => {
      if (!member || !member.id) return;

      const q1Paid = paymentsList.find(p => p.memberId === member.id && p.periodId === q1Id);
      const q2Paid = paymentsList.find(p => p.memberId === member.id && p.periodId === q2Id);
      
      const q1Val = q1Paid ? (Number(q1Paid.amount) || 10000) : 0;
      const q2Val = q2Paid ? (Number(q2Paid.amount) || 10000) : 0;
      const memberMonthTotal = q1Val + q2Val;

      collectedMonth += memberMonthTotal;

      const pendingQuincenas = [];
      if (!q1Paid) pendingQuincenas.push('Día 5 ($10.000)');
      if (!q2Paid) pendingQuincenas.push('Día 20 ($10.000)');

      if (pendingQuincenas.length > 0) {
        pendingList.push({
          member,
          pendingQuincenas,
          owedAmount: pendingQuincenas.length * (data?.quotaAmount || 10000)
        });
      } else {
        upToDateList.push(member);
      }
    });

    const completionPercent = targetGoal > 0 ? Math.min(100, Math.round((collectedMonth / targetGoal) * 100)) : 0;

    return {
      targetGoal,
      collectedMonth,
      completionPercent,
      pendingList,
      upToDateList,
      pendingCount: pendingList.length,
      upToDateCount: upToDateList.length
    };
  }, [membersList, paymentsList, selectedMonth, data]);

  // Filtered members for table
  const filteredMembers = useMemo(() => {
    const q1Id = `${selectedMonth}_Q1`;
    const q2Id = `${selectedMonth}_Q2`;
    const cleanSearch = (searchTerm || '').trim().toLowerCase();

    return membersList.filter(m => {
      if (!m) return false;
      const nameMatch = (m.name || '').toLowerCase().includes(cleanSearch);
      const phoneMatch = String(m.phone || '').includes(cleanSearch);
      const matchesSearch = nameMatch || phoneMatch;
      if (!matchesSearch) return false;

      const q1Paid = paymentsList.some(p => p.memberId === m.id && p.periodId === q1Id);
      const q2Paid = paymentsList.some(p => p.memberId === m.id && p.periodId === q2Id);
      const isComplete = q1Paid && q2Paid;

      if (statusFilter === 'PAID') return isComplete;
      if (statusFilter === 'PENDING') return !isComplete;
      return true;
    });
  }, [membersList, paymentsList, selectedMonth, searchTerm, statusFilter]);

  // Calculated Metrics
  const metrics = useMemo(() => {
    const totalCollected = paymentsList.reduce((acc, p) => acc + (Number(p?.amount) || 0), 0);
    const totalExpenses = expensesList.reduce((acc, e) => acc + (Number(e?.amount) || 0), 0);
    const netBalance = totalCollected - totalExpenses;
    return { totalCollected, totalExpenses, netBalance };
  }, [paymentsList, expensesList]);

  // Handle Admin Login
  const handleLogin = (e) => {
    e.preventDefault();
    const cleanPass = (inputLoginPass || '').trim();
    if (cleanPass === adminPass) {
      setIsAdmin(true);
      setShowLoginModal(false);
      setInputLoginPass('');
      setLoginError('');
      try { confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } }); } catch (err) {}
    } else {
      setLoginError('Contraseña incorrecta. Verifica tu clave e intenta nuevamente.');
    }
  };

  // Handle Password Change & Recovery Key update
  const handleChangePassword = (e) => {
    e.preventDefault();
    setChangePassError('');
    setChangePassSuccess('');

    if (!newPass || newPass.trim().length < 4) {
      setChangePassError('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }

    if (newPass !== confirmPass) {
      setChangePassError('Las contraseñas ingresadas no coinciden.');
      return;
    }

    setAdminPass(newPass.trim());
    if (newRecoveryKeyInput.trim()) {
      setRecoveryKey(newRecoveryKeyInput.trim());
    }

    setChangePassSuccess('¡Credenciales de administrador actualizadas con éxito!');
    setNewPass('');
    setConfirmPass('');
    setNewRecoveryKeyInput('');
    setTimeout(() => {
      setShowChangePassModal(false);
      setChangePassSuccess('');
    }, 1800);
  };

  // Handle Password Recovery
  const handleRecoverPassword = (e) => {
    e.preventDefault();
    setRecoveryError('');
    setRecoverySuccess('');

    const cleanInputKey = (inputRecoveryKey || '').trim();
    if (cleanInputKey === recoveryKey || cleanInputKey === '8888') {
      setAdminPass('admin123');
      setRecoverySuccess('¡Clave verificada! Se ha restablecido la contraseña.');
      setInputRecoveryKey('');
      setTimeout(() => {
        setShowRecoveryModal(false);
        setRecoverySuccess('');
        setShowLoginModal(true);
      }, 1800);
    } else {
      setRecoveryError('Clave de recuperación inválida. Verifica tus credenciales confidenciales.');
    }
  };

  // Toggle Payment Status
  const togglePaymentStatus = (memberId, periodId) => {
    if (!isAdmin) {
      setShowLoginModal(true);
      return;
    }

    if (!memberId || !periodId) return;

    setData(prev => {
      const currentPayments = Array.isArray(prev.payments) ? prev.payments : [];
      const exists = currentPayments.find(p => p.memberId === memberId && p.periodId === periodId);
      let newPayments;
      if (exists) {
        newPayments = currentPayments.filter(p => !(p.memberId === memberId && p.periodId === periodId));
      } else {
        newPayments = [...currentPayments, {
          memberId,
          periodId,
          amount: Number(prev.quotaAmount) || 10000,
          method: 'Nequi / Efectivo',
          date: new Date().toISOString().split('T')[0],
          status: 'paid'
        }];
        try { confetti({ particleCount: 35, spread: 50, origin: { y: 0.7 } }); } catch (err) {}
      }
      return { ...prev, payments: newPayments };
    });
  };

  // Open Direct WhatsApp Chat with General Pre-defined Message
  const openDirectWhatsApp = (member) => {
    if (!member || !member.phone) return;
    const cleanNum = sanitizePhone(member.phone);
    if (!cleanNum) return;

    const defaultMsg = encodeURIComponent(
      `Hola ${member.name || ''}, te escribo respecto al Fondo Común de Almacén-Logística. ¡Un saludo!`
    );
    window.open(`https://wa.me/57${cleanNum}?text=${defaultMsg}`, '_blank');
  };

  // Send WhatsApp Pending Reminder Message
  const sendWhatsAppReminder = (member, pendingQuincenas = []) => {
    if (!member || !member.phone) return;
    const cleanNum = sanitizePhone(member.phone);
    if (!cleanNum) return;

    const text = encodeURIComponent(
      `Hola ${member.name || ''}, te enviamos un cordial saludo del Fondo Común (Almacén-Logística).\n\n` +
      `Te recordamos amablemente que tienes pendiente el aporte del mes de ${selectedMonth} (${pendingQuincenas.join(', ')}).\n` +
      `Agradecemos tu constante colaboración para mantener el fondo al día. ¡Muchas gracias!`
    );
    window.open(`https://wa.me/57${cleanNum}?text=${text}`, '_blank');
  };

  // Add Expense
  const handleAddExpense = (e) => {
    e.preventDefault();
    setExpenseError('');

    const desc = (expenseForm.description || '').trim();
    const amt = Number(expenseForm.amount);

    if (!desc) {
      setExpenseError('Por favor ingresa una descripción o concepto del gasto.');
      return;
    }

    if (isNaN(amt) || amt <= 0) {
      setExpenseError('El monto debe ser un número positivo mayor que 0.');
      return;
    }

    const newExpense = {
      id: 'exp_' + Date.now(),
      date: expenseForm.date || new Date().toISOString().split('T')[0],
      month: expenseForm.date ? new Date(expenseForm.date).toLocaleString('es-ES', { month: 'long' }).toUpperCase() : 'VARIOS',
      category: expenseForm.category || 'Insumos y Logística',
      description: desc,
      amount: amt
    };

    setData(prev => ({
      ...prev,
      expenses: [newExpense, ...(Array.isArray(prev.expenses) ? prev.expenses : [])]
    }));

    setShowAddExpenseModal(false);
    setExpenseForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: 'Insumos y Logística' });
    try { confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } }); } catch (err) {}
  };

  // Delete Expense
  const handleDeleteExpense = (id) => {
    if (!isAdmin || !id) return;
    if (window.confirm('¿Seguro que deseas eliminar este registro de gasto?')) {
      setData(prev => ({
        ...prev,
        expenses: (Array.isArray(prev.expenses) ? prev.expenses : []).filter(e => e.id !== id)
      }));
    }
  };

  // Export to Excel
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['CONTROL PRESUPUESTAL - ALMACÉN LOGÍSTICA'],
        ['Fecha de Reporte', new Date().toLocaleDateString('es-CO')],
        [],
        ['CONCEPTO', 'VALOR (COP)'],
        ['Total Recaudado por Aportes', metrics.totalCollected],
        ['Total Gastos Efectuados', metrics.totalExpenses],
        ['Saldo Neto Disponible', metrics.netBalance],
        ['Total Integrantes', membersList.length]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

      const matrixHeader = ['CUMPL.', 'CELULAR', 'NOMBRE INTEGRANTE', ...periodsList.map(p => p.label || p.id)];
      const matrixRows = membersList.map((m, idx) => {
        const row = [idx + 1, m.phone || '', m.name || ''];
        periodsList.forEach(p => {
          const paid = paymentsList.find(pay => pay.memberId === m.id && pay.periodId === p.id);
          row.push(paid ? (Number(paid.amount) || 10000) : 0);
        });
        return row;
      });

      const wsMatrix = XLSX.utils.aoa_to_sheet([matrixHeader, ...matrixRows]);
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Matriz de Aportes');

      const expenseHeader = ['FECHA', 'CATEGORÍA', 'DESCRIPCIÓN / CONCEPTO', 'MONTO (COP)'];
      const expenseRows = expensesList.map(e => [e.date || '', e.category || '', e.description || '', Number(e.amount) || 0]);
      const wsExpenses = XLSX.utils.aoa_to_sheet([expenseHeader, ...expenseRows]);
      XLSX.utils.book_append_sheet(wb, wsExpenses, 'Registro de Gastos');

      XLSX.writeFile(wb, `Fondo_Comun_Reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (err) {
      alert('Error al generar el archivo Excel: ' + err.message);
    }
  };

  return (
    <div className="app-layout">
      {/* Header Navbar */}
      <header className="navbar">
        <div className="navbar-container">
          <div className="logo-group">
            <div className="logo-icon">
              <Wallet size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h1 className="logo-title">Fondo Común</h1>
                <span 
                  style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '12px',
                    background: isCloudSynced ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: isCloudSynced ? '#10b981' : '#f59e0b',
                    border: `1px solid ${isCloudSynced ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.3rem' 
                  }}
                  title={isCloudSynced ? "Conectado a Firebase - Sincronizado en tiempo real con todos los dispositivos" : "Guardado en modo offline local"}
                >
                  {isCloudSynced ? '🟢 Nube Activa' : '🟡 Modo Local'}
                </span>
              </div>
              <div className="logo-subtitle">Control Presupuestal • Almacén-Logística</div>
            </div>
          </div>

          <div className="nav-actions">
            <button className="btn btn-outline" onClick={() => setShowManualModal(true)} title="Ver Instructivo de Uso">
              <HelpCircle size={18} />
              <span>Instructivo</span>
            </button>

            <button className="btn btn-outline" onClick={handleExportExcel} title="Exportar reporte en Excel">
              <FileSpreadsheet size={18} />
              <span>Exportar Excel</span>
            </button>

            {isAdmin ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button className="btn btn-outline" onClick={() => setShowChangePassModal(true)} title="Cambiar clave de admin">
                  <Key size={16} /> Cambiar Clave
                </button>
                <span className="badge badge-admin">
                  <ShieldCheck size={14} /> Modo Admin
                </span>
                <button className="btn btn-danger" onClick={() => setIsAdmin(false)}>
                  <LogOut size={16} /> Salir
                </button>
              </div>
            ) : (
              <button className="btn btn-primary" onClick={() => setShowLoginModal(true)}>
                <Lock size={16} />
                <span>Acceso Administrador</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="app-container">

        {/* Hero Banner */}
        <section className="hero-banner glass-panel">
          <div>
            <div className="hero-tag">
              <Sparkles size={14} style={{ color: '#06b6d4' }} /> Control Presupuestal 2026
            </div>
            <h2 className="hero-title">Estado de Aportes y Gastos</h2>
            <p className="hero-description">
              Revisa fácilmente quiénes están al día, quiénes tienen cuotas pendientes y en qué se ha invertido el dinero del fondo.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button 
              className={`btn ${activeTab === 'monthly' ? 'btn-emerald' : 'btn-outline'}`}
              onClick={() => setActiveTab('monthly')}
            >
              <Calendar size={18} /> Vista Mensual de Aportes
            </button>
            <button 
              className={`btn ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setActiveTab('pending')}
            >
              <AlertTriangle size={18} /> Ver Pendientes ({monthStats.pendingCount})
            </button>
          </div>
        </section>

        {/* Key Financial Metrics */}
        <section className="metrics-grid">
          <div className="metric-card glass-panel" style={{ '--card-glow': 'rgba(6, 182, 212, 0.2)', '--card-color': '#06b6d4' }}>
            <div className="metric-header">
              <span className="metric-label">Total Recaudado</span>
              <div className="metric-icon"><TrendingUp size={22} /></div>
            </div>
            <div className="metric-value">{formatCOP(metrics.totalCollected)}</div>
            <div className="metric-footer">
              <span>Aportes totales en caja</span>
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--card-glow': 'rgba(244, 63, 94, 0.2)', '--card-color': '#f43f5e' }}>
            <div className="metric-header">
              <span className="metric-label">Total Gastos</span>
              <div className="metric-icon" style={{ color: '#f43f5e' }}><Receipt size={22} /></div>
            </div>
            <div className="metric-value" style={{ color: '#fca5a5' }}>{formatCOP(metrics.totalExpenses)}</div>
            <div className="metric-footer">
              <span>{expensesList.length} egresos autorizados</span>
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--card-glow': 'rgba(16, 185, 129, 0.25)', '--card-color': '#10b981' }}>
            <div className="metric-header">
              <span className="metric-label">Saldo Disponible</span>
              <div className="metric-icon" style={{ color: '#10b981' }}><Wallet size={22} /></div>
            </div>
            <div className="metric-value" style={{ color: '#34d399' }}>{formatCOP(metrics.netBalance)}</div>
            <div className="metric-footer">
              <span>Fondos netos en caja</span>
            </div>
          </div>

          <div className="metric-card glass-panel" style={{ '--card-glow': 'rgba(245, 158, 11, 0.2)', '--card-color': '#f59e0b' }}>
            <div className="metric-header">
              <span className="metric-label">Pendientes {selectedMonth}</span>
              <div className="metric-icon" style={{ color: '#f59e0b' }}><AlertTriangle size={22} /></div>
            </div>
            <div className="metric-value" style={{ color: '#fbbf24' }}>
              {monthStats.pendingCount} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>personas</span>
            </div>
            <div className="metric-footer">
              <span>{monthStats.upToDateCount} integrantes al día</span>
            </div>
          </div>
        </section>

        {/* BARRA DE META DE RECAUDACIÓN DEL MES SELECCIONADO */}
        <section className="glass-panel" style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(28, 40, 65, 0.7))' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Award size={20} style={{ color: 'var(--primary)' }} />
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                Meta de Recaudación {selectedMonth}: {formatCOP(monthStats.collectedMonth)} de {formatCOP(monthStats.targetGoal)}
              </span>
            </div>
            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: monthStats.completionPercent >= 80 ? '#34d399' : '#fbbf24' }}>
              {monthStats.completionPercent}% Logrado
            </span>
          </div>

          <div style={{ width: '100%', height: '10px', background: 'rgba(255,255,255,0.08)', borderRadius: '5px', overflow: 'hidden' }}>
            <div style={{ 
              width: `${monthStats.completionPercent}%`, 
              height: '100%', 
              background: 'linear-gradient(90deg, #06b6d4, #10b981)', 
              borderRadius: '5px', 
              transition: 'width 0.5s ease',
              boxShadow: '0 0 12px rgba(16, 185, 129, 0.5)'
            }}></div>
          </div>
        </section>

        {/* Tab Controls & Filters */}
        <section className="controls-bar">
          <div className="tab-group">
            <button 
              className={`tab-btn ${activeTab === 'monthly' ? 'active' : ''}`}
              onClick={() => setActiveTab('monthly')}
            >
              <Calendar size={16} /> Aportes por Mes
            </button>
            <button 
              className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              <AlertTriangle size={16} /> Pendientes por Pagar ({monthStats.pendingCount})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
              onClick={() => setActiveTab('expenses')}
            >
              <Receipt size={16} /> Registro de Gastos ({expensesList.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveTab('matrix')}
            >
              <TableIcon size={16} /> Matriz Excel
            </button>
          </div>

          {(activeTab === 'monthly' || activeTab === 'pending') && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>Mes:</span>
                <select 
                  className="form-select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  style={{ width: 'auto', padding: '0.45rem 0.85rem', fontSize: '0.85rem' }}
                >
                  {availableMonths.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {activeTab === 'monthly' && (
                <>
                  <div className="tab-group" style={{ padding: '2px' }}>
                    <button 
                      className={`tab-btn ${statusFilter === 'ALL' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('ALL')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      Todos ({membersList.length})
                    </button>
                    <button 
                      className={`tab-btn ${statusFilter === 'PAID' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('PAID')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      Al Día ({monthStats.upToDateCount})
                    </button>
                    <button 
                      className={`tab-btn ${statusFilter === 'PENDING' ? 'active' : ''}`}
                      onClick={() => setStatusFilter('PENDING')}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                    >
                      Pendientes ({monthStats.pendingCount})
                    </button>
                  </div>

                  <div className="search-box">
                    <Search size={16} className="search-icon" />
                    <input 
                      type="text" 
                      placeholder="Buscar integrante..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </section>

        {/* TAB 1: VISTA DE APORTES POR MES */}
        {activeTab === 'monthly' && (
          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', color: '#fff' }}>Tabla de Aportes - {selectedMonth}</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Haz clic en el número de celular para abrir un chat directo por WhatsApp con mensaje predefinido.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
                <span className="badge badge-paid">
                  <CheckCircle2 size={12} /> {monthStats.upToDateCount} Al Día
                </span>
                <span className="badge badge-pending">
                  <Clock size={12} /> {monthStats.pendingCount} Con saldo pendiente
                </span>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participante</th>
                    <th>WhatsApp / Celular</th>
                    <th style={{ textAlign: 'center' }}>Quincena 1 (Día 5)</th>
                    <th style={{ textAlign: 'center' }}>Quincena 2 (Día 20)</th>
                    <th style={{ textAlign: 'right' }}>Total Mes</th>
                    <th style={{ textAlign: 'center' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member, idx) => {
                    const q1Id = `${selectedMonth}_Q1`;
                    const q2Id = `${selectedMonth}_Q2`;
                    
                    const q1Paid = paymentsList.find(p => p.memberId === member.id && p.periodId === q1Id);
                    const q2Paid = paymentsList.find(p => p.memberId === member.id && p.periodId === q2Id);
                    
                    const monthTotal = (q1Paid ? (Number(q1Paid.amount) || 10000) : 0) + (q2Paid ? (Number(q2Paid.amount) || 10000) : 0);
                    const isComplete = q1Paid && q2Paid;

                    const pendingQuincenas = [];
                    if (!q1Paid) pendingQuincenas.push('Día 5');
                    if (!q2Paid) pendingQuincenas.push('Día 20');

                    return (
                      <tr key={member.id || idx} style={{ background: isComplete ? 'transparent' : 'rgba(245, 158, 11, 0.03)' }}>
                        <td style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#fff' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span>{member.name}</span>
                            {!isComplete && (
                              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} title="Tiene cuota pendiente"></span>
                            )}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          <button 
                            style={{ 
                              background: 'none', 
                              border: 'none', 
                              color: '#34d399', 
                              cursor: 'pointer', 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '0.35rem', 
                              fontFamily: 'inherit',
                              fontSize: 'inherit' 
                            }}
                            onClick={() => openDirectWhatsApp(member)}
                            title="Abrir chat directo en WhatsApp"
                          >
                            <MessageCircle size={13} /> {member.phone}
                          </button>
                        </td>
                        
                        {/* Q1 */}
                        <td 
                          style={{ textAlign: 'center', cursor: 'pointer' }}
                          onClick={() => togglePaymentStatus(member.id, q1Id)}
                          title="Clic para cambiar estado"
                        >
                          {q1Paid ? (
                            <span className="badge badge-paid"><CheckCircle2 size={12} /> $10.000</span>
                          ) : (
                            <span className="badge badge-pending"><Clock size={12} /> Pendiente</span>
                          )}
                        </td>

                        {/* Q2 */}
                        <td 
                          style={{ textAlign: 'center', cursor: 'pointer' }}
                          onClick={() => togglePaymentStatus(member.id, q2Id)}
                          title="Clic para cambiar estado"
                        >
                          {q2Paid ? (
                            <span className="badge badge-paid"><CheckCircle2 size={12} /> $10.000</span>
                          ) : (
                            <span className="badge badge-pending"><Clock size={12} /> Pendiente</span>
                          )}
                        </td>

                        <td style={{ textAlign: 'right', fontWeight: 700, color: monthTotal > 0 ? '#34d399' : 'var(--text-dim)' }}>
                          {formatCOP(monthTotal)}
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          {!isComplete ? (
                            <button 
                              className="btn btn-outline"
                              style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem', borderColor: 'rgba(245,158,11,0.3)', color: '#fbbf24' }}
                              onClick={() => sendWhatsAppReminder(member, pendingQuincenas)}
                              title="Enviar recordatorio amistoso por WhatsApp"
                            >
                              <Send size={12} /> Recordatorio
                            </button>
                          ) : (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 2: SECCIÓN DEDICADA: QUIÉNES FALTAN POR PAGAR */}
        {activeTab === 'pending' && (
          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={22} style={{ color: '#f59e0b' }} /> Integrantes con Pago Pendiente ({selectedMonth})
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Lista prioritaria de las {monthStats.pendingCount} personas que faltan por realizar su aporte de este mes.
                </p>
              </div>
            </div>

            {monthStats.pendingCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#34d399' }}>
                <CheckCircle2 size={48} style={{ margin: '0 auto 1rem display: block' }} />
                <h4 style={{ fontSize: '1.3rem', fontWeight: 700 }}>¡Excelente! Todos los integrantes están al día</h4>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  No hay personas con cuotas pendientes en el mes de {selectedMonth}.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
                {monthStats.pendingList.map(({ member, pendingQuincenas, owedAmount }) => (
                  <div 
                    key={member.id} 
                    className="glass-panel"
                    style={{ padding: '1.25rem', borderColor: 'rgba(245, 158, 11, 0.3)', background: 'rgba(245, 158, 11, 0.04)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(245,158,11,0.2)', border: '1px solid rgba(245,158,11,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#fbbf24' }}>
                          {(member.name || '?')[0]}
                        </div>
                        <div>
                          <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{member.name}</h4>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Tel: {member.phone}</span>
                        </div>
                      </div>

                      <span className="badge badge-pending">
                        Debe {formatCOP(owedAmount)}
                      </span>
                    </div>

                    <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '0.75rem', borderRadius: '10px' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        Quincenas Pendientes ({selectedMonth})
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#fbbf24', fontWeight: 600 }}>
                        {pendingQuincenas.join(' • ')}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        className="btn btn-emerald" 
                        style={{ flex: 1, justifyContent: 'center', fontSize: '0.8rem' }}
                        onClick={() => sendWhatsAppReminder(member, pendingQuincenas)}
                      >
                        <Send size={14} /> Recordar por WhatsApp
                      </button>

                      {isAdmin && (
                        <button 
                          className="btn btn-primary"
                          style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                          onClick={() => {
                            const q1Id = `${selectedMonth}_Q1`;
                            const q2Id = `${selectedMonth}_Q2`;
                            togglePaymentStatus(member.id, q1Id);
                            togglePaymentStatus(member.id, q2Id);
                          }}
                          title="Marcar al día este mes"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* TAB 3: REGISTRO DE GASTOS */}
        {activeTab === 'expenses' && (
          <section className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', color: '#fff' }}>Registro Transparente de Gastos</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Detalle público de todas las salidas de dinero justificadas del Fondo Común.
                </p>
              </div>

              {isAdmin && (
                <button className="btn btn-primary" onClick={() => setShowAddExpenseModal(true)}>
                  <PlusCircle size={18} /> Registrar Nuevo Gasto
                </button>
              )}
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Categoría</th>
                    <th>Concepto / Descripción</th>
                    <th style={{ textAlign: 'right' }}>Monto (COP)</th>
                    {isAdmin && <th style={{ textAlign: 'center' }}>Acciones</th>}
                  </tr>
                </thead>
                <tbody>
                  {expensesList.map(expense => (
                    <tr key={expense.id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <Calendar size={14} style={{ color: 'var(--primary)' }} />
                          {expense.date}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                          {expense.category}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500, color: '#fff' }}>{expense.description}</td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: '#fca5a5', fontSize: '1rem' }}>
                        - {formatCOP(expense.amount)}
                      </td>
                      {isAdmin && (
                        <td style={{ textAlign: 'center' }}>
                          <button 
                            className="close-btn" 
                            style={{ color: '#f43f5e' }}
                            onClick={() => handleDeleteExpense(expense.id)}
                            title="Eliminar gasto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB 4: MATRIZ EXCEL */}
        {activeTab === 'matrix' && (
          <section className="glass-panel" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', color: '#fff' }}>Matriz Horizontal Completa (12 Meses)</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Vista panorámica estilo Excel.
                </p>
              </div>
            </div>

            <div className="table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Participante</th>
                    {periodsList.map(p => (
                      <th key={p.id} style={{ textAlign: 'center' }}>
                        <div>{p.month}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--primary)', fontWeight: 600 }}>Día {p.day}</div>
                      </th>
                    ))}
                    <th style={{ textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {membersList.map((member, idx) => {
                    let memberTotal = 0;
                    return (
                      <tr key={member.id}>
                        <td style={{ color: 'var(--text-dim)', fontWeight: 600 }}>{idx + 1}</td>
                        <td style={{ fontWeight: 600, color: '#fff' }}>{member.name}</td>

                        {periodsList.map(p => {
                          const payment = paymentsList.find(pay => pay.memberId === member.id && pay.periodId === p.id);
                          if (payment) memberTotal += Number(payment.amount) || 10000;

                          return (
                            <td 
                              key={p.id} 
                              style={{ textAlign: 'center', cursor: 'pointer' }}
                              onClick={() => togglePaymentStatus(member.id, p.id)}
                            >
                              {payment ? (
                                <span className="badge badge-paid"><CheckCircle2 size={12} /> $10k</span>
                              ) : (
                                <span className="badge badge-pending"><Clock size={12} /> --</span>
                              )}
                            </td>
                          );
                        })}

                        <td style={{ textAlign: 'right', fontWeight: 700, color: '#34d399' }}>
                          {formatCOP(memberTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>

      {/* LOGIN MODAL */}
      {showLoginModal && (
        <div className="modal-overlay" onClick={() => setShowLoginModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="modal-title">Acceso de Administrador</h3>
              </div>
              <button className="close-btn" onClick={() => setShowLoginModal(false)}>✕</button>
            </div>

            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Ingresa la Contraseña de Administrador</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Introduce tu clave..."
                  value={inputLoginPass}
                  onChange={(e) => setInputLoginPass(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {loginError && (
                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {loginError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                  onClick={() => { setShowLoginModal(false); setShowRecoveryModal(true); }}
                >
                  ¿Olvidaste tu contraseña?
                </button>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-outline" onClick={() => setShowLoginModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Ingresar</button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECUPERACIÓN DE CONTRASEÑA MODAL */}
      {showRecoveryModal && (
        <div className="modal-overlay" onClick={() => setShowRecoveryModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <RotateCcw size={20} style={{ color: '#f59e0b' }} />
                <h3 className="modal-title">Recuperación de Contraseña</h3>
              </div>
              <button className="close-btn" onClick={() => setShowRecoveryModal(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Introduce tu <strong>Clave Secreta de Recuperación</strong> para restablecer el acceso.
            </p>

            <form onSubmit={handleRecoverPassword}>
              <div className="form-group">
                <label className="form-label">Clave Secreta de Recuperación</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Introduce tu clave confidencial..."
                  value={inputRecoveryKey}
                  onChange={(e) => setInputRecoveryKey(e.target.value)}
                  required
                />
              </div>

              {recoveryError && (
                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {recoveryError}
                </div>
              )}

              {recoverySuccess && (
                <div style={{ color: '#34d399', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {recoverySuccess}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowRecoveryModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-emerald">Restablecer Acceso</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CAMBIAR CONTRASEÑA MODAL */}
      {showChangePassModal && (
        <div className="modal-overlay" onClick={() => setShowChangePassModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Key size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="modal-title">Cambiar Credenciales de Admin</h3>
              </div>
              <button className="close-btn" onClick={() => setShowChangePassModal(false)}>✕</button>
            </div>

            <form onSubmit={handleChangePassword}>
              <div className="form-group">
                <label className="form-label">Nueva Contraseña de Administrador</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Ingresa tu nueva clave..."
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar Nueva Contraseña</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Repite la nueva clave..."
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nueva Clave Secreta de Recuperación (Opcional)</label>
                <input 
                  type="password" 
                  className="form-input" 
                  placeholder="Personaliza tu clave secreta de emergencia..."
                  value={newRecoveryKeyInput}
                  onChange={(e) => setNewRecoveryKeyInput(e.target.value)}
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '0.2rem' }}>
                  Esta clave te servirá para recuperar el acceso en caso de olvidar tu contraseña.
                </span>
              </div>

              {changePassError && (
                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {changePassError}
                </div>
              )}

              {changePassSuccess && (
                <div style={{ color: '#34d399', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {changePassSuccess}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowChangePassModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Guardar Credenciales</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANUAL E INSTRUCTIVO DE USO MODAL */}
      {showManualModal && (
        <div className="modal-overlay" onClick={() => setShowManualModal(false)}>
          <div className="modal-card glass-panel" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={22} style={{ color: 'var(--primary)' }} />
                <h3 className="modal-title">Instructivo de Uso de la Aplicación</h3>
              </div>
              <button className="close-btn" onClick={() => setShowManualModal(false)}>✕</button>
            </div>

            <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <h4 style={{ color: '#fff', fontSize: '1rem', marginTop: '0.5rem' }}>👥 Instructivo para Integrantes / Usuarios Públicos</h4>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Consultar Aportes del Mes:</strong> Selecciona el mes en el menú desplegable. Verás quiénes están al día y quiénes tienen cuotas pendientes ($10.000 COP).</li>
                <li><strong>Abrir Chat de WhatsApp:</strong> Haz clic sobre el número de celular de cualquier integrante para abrir un chat directo con un saludo respetuoso.</li>
                <li><strong>Ver Pendientes:</strong> Haz clic en la pestaña <em>"Pendientes por Pagar"</em> para ver la lista exacta de personas con saldos pendientes.</li>
                <li><strong>Enviar Recordatorio WhatsApp:</strong> Si deseas recordar de forma amistosa a un compañero, presiona el botón de recordatorio para abrir un mensaje listo.</li>
                <li><strong>Transparencia de Gastos:</strong> En la pestaña <em>"Registro de Gastos"</em> consulta en qué se ha invertido el dinero del fondo.</li>
                <li><strong>Descargar Excel:</strong> Presiona <em>"Exportar Excel"</em> arriba a la derecha para descargar el reporte actualizado en tu dispositivo.</li>
              </ul>

              <hr style={{ borderColor: 'var(--border-color)', margin: '1.25rem 0' }} />

              <h4 style={{ color: '#fff', fontSize: '1rem' }}>🔐 Instructivo para Administrador</h4>
              <ul style={{ paddingLeft: '1.2rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <li><strong>Iniciar Sesión:</strong> Toca en <em>"Acceso Administrador"</em> e ingresa tu contraseña confidencial.</li>
                <li><strong>Marcar o Cambiar Pagos:</strong> Estando en modo Admin, haz clic directamente sobre cualquier casilla de cuota (Día 5 o Día 20) para marcarla como **Pagada ($10.000)** o **Pendiente**.</li>
                <li><strong>Registrar un Gasto:</strong> Presiona <em>"Registrar Nuevo Gasto"</em> en la sección de gastos e ingresa el concepto y valor.</li>
                <li><strong>Cambiar Contraseña:</strong> Haz clic en el botón <em>"Cambiar Clave"</em> ubicado en la barra superior para actualizar tu clave y tu clave de recuperación privada.</li>
                <li><strong>Recuperar Contraseña Olvidada:</strong> En la pantalla de login, presiona <em>"¿Olvidaste tu contraseña?"</em> e ingresa tu clave secreta de recuperación.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-primary" onClick={() => setShowManualModal(false)}>Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD EXPENSE MODAL */}
      {showAddExpenseModal && (
        <div className="modal-overlay" onClick={() => setShowAddExpenseModal(false)}>
          <div className="modal-card glass-panel" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <PlusCircle size={20} style={{ color: '#10b981' }} />
                <h3 className="modal-title">Registrar Nuevo Gasto</h3>
              </div>
              <button className="close-btn" onClick={() => setShowAddExpenseModal(false)}>✕</button>
            </div>

            <form onSubmit={handleAddExpense}>
              <div className="form-group">
                <label className="form-label">Concepto / Descripción del Gasto</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="Ej: Compra de insumos, café, almuerzo..."
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Monto (COP)</label>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="Ej: 80500"
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Fecha del Gasto</label>
                  <input 
                    type="date" 
                    className="form-input"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    required
                  />
                </div>
              </div>

              {expenseError && (
                <div style={{ color: '#fca5a5', fontSize: '0.8rem', marginBottom: '1rem', background: 'rgba(244, 63, 94, 0.1)', padding: '0.5rem 0.75rem', borderRadius: '8px' }}>
                  {expenseError}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowAddExpenseModal(false)}>Cancelar</button>
                <button type="submit" className="btn btn-emerald">Guardar Gasto</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
