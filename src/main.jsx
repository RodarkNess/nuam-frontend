import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowLeft, ArrowRight, Bell, Check, ChevronDown, Clock3, CloudUpload, Copy,
  Download, FileCheck2, FileText, Filter, HelpCircle, LayoutDashboard,
  LockKeyhole, LogOut, Menu, MoreHorizontal, Plus, Search, ShieldCheck, UserPlus,
  SlidersHorizontal, UploadCloud, UsersRound, X, AlertTriangle
} from 'lucide-react';
import { api } from './api';
import './styles.css';

function isValidChileanRut(value) {
  if (typeof value !== 'string') return false;
  const match = value.trim().match(/^(\d{1,3}(?:\.?\d{3}){1,2}|\d{7,8})-?([\dkK])$/);
  if (!match) return false;
  const body = match[1].replace(/\./g, '');
  const dv = match[2].toUpperCase();
  const num = Number(body);
  if (!Number.isInteger(num) || num < 1000000 || num > 99999999) return false;
  const factors = [2, 3, 4, 5, 6, 7];
  let sum = 0;
  for (let i = body.length - 1, f = 0; i >= 0; i -= 1, f += 1) {
    sum += Number(body[i]) * factors[f % 6];
  }
  const rem = 11 - (sum % 11);
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : String(rem);
  return expected === dv;
}

function Logo({ light = false }) {
  return (
    <div className={`logo ${light ? 'logo-light' : ''}`}>
      <span className="logo-mark">n</span>
      <span>nuam</span>
    </div>
  );
}

function Login({ onLoginSuccess }) {
  const [step, setStep] = useState('credentials');
  const [deliveryMode, setDeliveryMode] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState(() => sessionStorage.getItem('nuam_session_expired') || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sessionStorage.removeItem('nuam_session_expired');
  }, []);

  const handleCredentialsSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      if (res.requires_2fa) {
        setDeliveryMode(res.delivery_mode || 'email');
        setStep('mfa');
      } else {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const code = twoFactorCode.join('');
    try {
      const res = await api.auth.login(email, password, code);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Código de segundo factor inválido');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, val) => {
    val = val.replace(/\D/g, '').slice(-1);
    const newArr = [...twoFactorCode];
    newArr[index] = val;
    setTwoFactorCode(newArr);
    if (val && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  return (
    <main className="login-page">
      <section className="login-art">
        <Logo light />
        <div className="art-copy">
          <span className="eyebrow">GESTIÓN TRIBUTARIA</span>
          <h1>Tu información,<br /><em>siempre segura.</em></h1>
          <p>Centraliza, gestiona y recupera tus respaldos tributarios con trazabilidad de extremo a extremo.</p>
          <div className="security-pills">
            <span><ShieldCheck size={15} /> Protección desde el origen</span>
            <span><LockKeyhole size={15} /> JWT & Cifrado AES-256</span>
          </div>
        </div>
        <div className="art-footer">© 2026 nuam · Plataforma segura</div>
      </section>

      <section className="login-card-wrap">
        <div className="login-card">
          <div className="mobile-logo"><Logo /></div>
          <div className="login-heading">
            <span className="step-label">{step === 'credentials' ? '01 / 02' : '02 / 02'}</span>
            <h2>{step === 'credentials' ? 'Inicio de sesión' : 'Verificación en dos pasos (2FA)'}</h2>
            <p>
              {step === 'credentials'
                ? 'Ingresa tus credenciales institucionales para acceder.'
                : deliveryMode === 'console'
                  ? 'Entorno local: revisa la consola del backend para obtener el código de prueba.'
                  : `Ingresa el código de 6 dígitos enviado a ${email}.`}
            </p>
          </div>

          {step === 'credentials' ? (
            <form onSubmit={handleCredentialsSubmit}>
              <label>
                Correo institucional
                <input
                  type="email"
                  placeholder="nombre@nuam.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label>
                Contraseña
                <input
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </label>
              {error && <div className="form-error">{error}</div>}
              <button className="primary full" type="submit" disabled={loading}>
                {loading ? 'Validando...' : 'Continuar'} <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={handleMfaSubmit}>
              <div className="otp-row">
                {twoFactorCode.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    maxLength="1"
                    inputMode="numeric"
                    pattern="[0-9]"
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    required
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    autoFocus={i === 0}
                    aria-label={`Dígito ${i + 1}`}
                  />
                ))}
              </div>
              <p className="muted center">El código vence en 5 minutos y solo puede utilizarse una vez.</p>
              {error && <div className="form-error">{error}</div>}
              <button className="primary full" type="submit" disabled={loading}>
                {loading ? 'Verificando...' : 'Ingresar'} <ShieldCheck size={17} />
              </button>
              <button
                className="text-button full"
                type="button"
                onClick={() => {
                  setTwoFactorCode(['', '', '', '', '', '']);
                  setStep('credentials');
                }}
              >
                <ArrowLeft size={15} /> Volver a credenciales
              </button>
            </form>
          )}

          <div className="login-note">
            <LockKeyhole size={14} /> El acceso y las operaciones quedan registrados para fines de auditoría.
          </div>
        </div>
        <p className="login-help">
          <HelpCircle size={14} /> ¿Necesitas ayuda? Contacta a la <a href="#">Mesa de ayuda institucional</a>
        </p>
      </section>
    </main>
  );
}

function ProfileSetup({ user, onComplete, onLogout }) {
  const [firstName, setFirstName] = useState(user.first_name || '');
  const [lastName, setLastName] = useState(user.last_name || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const updatedUser = await api.auth.updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
      });
      onComplete(updatedUser);
    } catch (err) {
      setError(err.message || 'No se pudo guardar tu nombre');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="profile-setup-page">
      <section className="login-card profile-setup-card">
        <Logo />
        <div className="login-heading">
          <span className="step-label">PRIMER INGRESO</span>
          <h2>¿Cómo te llamas?</h2>
          <p>Completa tu nombre antes de continuar. Aparecerá en tu cuenta y en los registros de actividad.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <label>Nombre
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              autoComplete="given-name"
              maxLength="150"
              required
              autoFocus
            />
          </label>
          <label>Apellido (opcional)
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              autoComplete="family-name"
              maxLength="150"
            />
          </label>
          {error && <div className="form-error" role="alert">{error}</div>}
          <button className="primary full" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar y continuar'}
          </button>
        </form>
        <button className="text-button profile-setup-logout" type="button" onClick={onLogout}>
          Cerrar sesión
        </button>
      </section>
    </main>
  );
}

function Sidebar({ screen, setScreen, onLogout, user, pendingApprovalsCount = 0 }) {
  const role = user?.profile?.role || 'operador';
  const items = [
    ['dashboard', 'Búsqueda de documentos', Search],
    ...(['supervisor', 'auditor', 'admin'].includes(role) ? [['approvals', 'Bandeja de aprobaciones', FileCheck2]] : []),
    ...(['supervisor', 'auditor', 'admin'].includes(role) ? [['audit', 'Auditoría y trazabilidad', ShieldCheck]] : []),
    ...(['operador', 'supervisor', 'admin'].includes(role) ? [['upload', 'Carga masiva', UploadCloud]] : []),
    ...(role === 'admin' ? [['admin-users', 'Usuarios', UsersRound]] : []),
  ];

  const roleLabels = {
    operador: 'Operador tributario',
    supervisor: 'Supervisor tributario',
    auditor: 'Auditor (Solo lectura)',
    admin: 'Administrador',
  };
  const roleDisplay = roleLabels[role] || 'Usuario';
  const userInitials = user?.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}` : 'NU';

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <Logo />
        <button className="icon-btn menu-btn" aria-label="Alternar menú lateral"><Menu size={19} /></button>
      </div>

      <div className="workspace">
        <div className="avatar">{userInitials}</div>
        <div>
          <strong>{user?.first_name ? `${user.first_name} ${user.last_name || ''}` : 'Usuario nuam'}</strong>
          <small>{roleDisplay}</small>
        </div>
        <ChevronDown size={16} />
      </div>

      <nav>
        <span className="nav-caption">MÓDULOS PRINCIPALES</span>
        {items.map(([id, label, Icon]) => (
          <button
            key={id}
            className={screen === id ? 'active' : ''}
            onClick={() => setScreen(id)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {id === 'approvals' && pendingApprovalsCount > 0 && <b>{pendingApprovalsCount}</b>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="security-status">
          <span className="status-dot" />
          <span>
            <strong>Integridad SHA-256 Activa</strong>
            <small>PostgreSQL · Supabase</small>
          </span>
        </div>
        <button className="logout" onClick={onLogout}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  );
}

function Header({ title, subtitle, onMenu, user, onLogout }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  const roleName = {
    operador: 'Operador',
    supervisor: 'Supervisor',
    auditor: 'Auditor',
    admin: 'Administrador',
  }[user?.profile?.role] || 'Usuario';
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')
    || user?.email || user?.username || 'Usuario NUAM';
  const initials = fullName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <header className="topbar">
      <button className="mobile-menu icon-btn" aria-label="Abrir menú de navegación" onClick={onMenu}><Menu size={20} /></button>
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="top-actions">
        <div className="popover-wrap">
          <button
            className="icon-btn"
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            aria-label="Mostrar alertas"
          >
            <Bell size={19} /><i />
          </button>
          {notificationsOpen && (
            <div className="popover notifications">
              <strong>Alertas institucionales</strong>
              <p><ShieldCheck size={14} /> Hash verificado en todos los expedientes</p>
              <p><Clock3 size={14} /> Solicitudes pendientes de decisión al SII</p>
              <button className="link-button" onClick={() => setNotificationsOpen(false)}>
                Marcar como leídas
              </button>
            </div>
          )}
        </div>

        <div className="popover-wrap">
          <button className="top-user" onClick={() => setUserOpen(!userOpen)}>
            <div className="avatar small">{initials}</div>
            <span>
              {fullName} <small>{roleName}</small>
            </span>
            <ChevronDown size={15} />
          </button>
          {userOpen && (
            <div className="popover user-menu">
              <strong>{fullName}</strong>
              <small>{user?.email || user?.username}</small>
              <button onClick={() => window.alert(`Perfil: ${roleName} - Operación Chile / SII`)}>
                Mi perfil
              </button>
              <button onClick={onLogout}>Cerrar sesión</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function Dashboard({ setScreen, setSelectedRecord, user, onLogout }) {
  const [records, setRecords] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [yearFilter, setYearFilter] = useState('Todos los ejercicios');
  const [emisorFilter, setEmisorFilter] = useState('Todos los emisores');
  const [typeFilter, setTypeFilter] = useState('Todos los documentos');
  const [statusTab, setStatusTab] = useState('Todos');

  const fetchRecords = async (targetPage = page) => {
    setLoading(true);
    try {
      const data = await api.taxRecords.getPaginated({
        search: query,
        year: yearFilter,
        emisor: emisorFilter,
        doc_type: typeFilter,
        status: statusTab,
        page: targetPage,
      });
      setRecords(data.results);
      setTotalCount(data.count);
      setPage(data.page);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords(page);
  }, [query, yearFilter, emisorFilter, typeFilter, statusTab, page]);

  const handleDownloadPdf = async (e, rec) => {
    e.stopPropagation();
    try {
      await api.taxRecords.downloadPdf(rec.id, `${rec.folio}.pdf`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSelect = (rec) => {
    setSelectedRecord(rec);
    setScreen('detail');
  };

  return (
    <>
      <Header
        title="Búsqueda de documentos"
        subtitle="Consulta certificados y respaldos tributarios desde un único lugar."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content">
        <div className="welcome-row">
          <div>
            <span className="eyebrow dark">CONSULTA INDEXADA</span>
            <h2>Búsqueda de documentos</h2>
          </div>
          {['operador', 'supervisor', 'admin'].includes(user?.profile?.role) && (
            <button className="primary" onClick={() => { setSelectedRecord(null); setScreen('record-form'); }}>
              <Plus size={17} /> Nuevo expediente
            </button>
          )}
        </div>

        {/* Barra de búsqueda principal */}
        <div style={{ marginTop: '20px', background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', gap: '10px' }}>
            <div className="searchbox" style={{ flex: 1, width: 'auto' }}>
              <Search size={18} />
              <input
                aria-label="Buscar expedientes tributarios"
                placeholder="Buscar por RUT, nombre, folio o contenido..."
                value={query}
                onChange={(e) => { setPage(1); setQuery(e.target.value); }}
              />
            </div>
            <button className="primary" onClick={() => fetchRecords(1)}>Buscar</button>
          </div>
          <small style={{ color: '#4f6078', marginTop: '8px', display: 'block', fontSize: '11px' }}>
            Búsqueda inteligente · Puedes combinar RUT, nombre, folio o contenido del documento.
          </small>

          {/* Filtros Dropdown */}
          <div className="filter-dropdowns">
            <select aria-label="Filtrar por ejercicio" className="filter-select" value={yearFilter} onChange={(e) => { setPage(1); setYearFilter(e.target.value); }}>
              <option value="Todos los ejercicios">Todos los ejercicios</option>
              <option value="2025">2025</option>
              <option value="2024">2024</option>
              <option value="2023">2023</option>
            </select>

            <select aria-label="Filtrar por emisor" className="filter-select" value={emisorFilter} onChange={(e) => { setPage(1); setEmisorFilter(e.target.value); }}>
              <option value="Todos los emisores">Todos los emisores</option>
              <option value="Inversiones Andinas">Inversiones Andinas S.A.</option>
              <option value="Servicios del Pacífico">Servicios del Pacífico SpA</option>
              <option value="Comercial Los Alerces">Comercial Los Alerces Ltda.</option>
              <option value="Inversiones Cordillera">Inversiones Cordillera S.A.</option>
            </select>

            <select aria-label="Filtrar por tipo de documento" className="filter-select" value={typeFilter} onChange={(e) => { setPage(1); setTypeFilter(e.target.value); }}>
              <option value="Todos los documentos">Todos los documentos</option>
              <option value="Certificado tributario">Certificado tributario</option>
              <option value="Declaración jurada">Declaración jurada</option>
            </select>

            <button
              className="text-button"
              style={{ fontSize: '11px' }}
              onClick={() => {
                setPage(1);
                setQuery('');
                setYearFilter('Todos los ejercicios');
                setEmisorFilter('Todos los emisores');
                setTypeFilter('Todos los documentos');
                setStatusTab('Todos');
              }}
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {/* Tabla de Resultados */}
        <div className="table-card" style={{ marginTop: '24px' }}>
          <div className="table-toolbar">
            <strong>Resultados encontrados · {totalCount}</strong>
            <div className="filter-tabs">
              {['Todos', 'Pendiente de aprobación', 'Validado', 'Observado'].map((tab) => (
                <button
                  key={tab}
                  className={statusTab === tab ? 'selected' : ''}
                  onClick={() => { setPage(1); setStatusTab(tab); }}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>RUT / Folio</th>
                  <th>Nombre / Emisor</th>
                  <th>Año</th>
                  <th>Estado</th>
                  <th>Monto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="empty">Cargando expedientes desde backend...</td></tr>
                ) : records.length === 0 ? (
                  <tr><td colSpan="6" className="empty">No se encontraron expedientes con esos filtros.</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} onClick={() => handleSelect(r)}>
                      <td>
                        <strong>{r.rut}</strong>
                        <small>{r.folio}</small>
                      </td>
                      <td>{r.company_name}</td>
                      <td>{r.year}</td>
                      <td>
                        <span className={`badge ${
                          r.status === 'Validado' ? 'success' :
                          r.status.includes('Pendiente') ? 'warning' : 'neutral'
                        }`}>
                          <i /> {r.status}
                        </span>
                      </td>
                      <td><strong>{r.formatted_amount}</strong></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="secondary"
                            style={{ padding: '5px 9px', fontSize: '11px' }}
                            onClick={(e) => { e.stopPropagation(); handleSelect(r); }}
                          >
                            <FileText size={13} /> Ver detalle
                          </button>
                          <button
                            className="primary"
                            style={{ padding: '5px 9px', fontSize: '11px' }}
                            onClick={(e) => handleDownloadPdf(e, r)}
                          >
                            <Download size={13} /> Descargar PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 17px', borderTop: '1px solid var(--line)', fontSize: '11px' }}>
              <span>Página {page} de {totalPages}</span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  <ArrowLeft size={13} /> Anterior
                </button>
                <button className="secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Siguiente <ArrowRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Detail({ record, setScreen, setSelectedRecord, user, onLogout }) {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (record?.id) {
      api.taxRecords.getById(record.id)
        .then((data) => setDetailData(data))
        .catch((err) => console.error(err))
        .finally(() => setLoading(false));
    }
  }, [record]);

  const rec = detailData || record;

  const handleDownload = async () => {
    try {
      await api.taxRecords.downloadPdf(rec.id, `${rec.folio}.pdf`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`¿Eliminar lógicamente el expediente ${rec.folio}?`)) return;
    try {
      await api.taxRecords.delete(rec.id);
      setScreen('dashboard');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Header
        title="Expediente tributario"
        subtitle={`${rec?.company_name || 'Inversiones Andinas S.A.'} · RUT ${rec?.rut || '76.543.210-3'} · ${rec?.folio || 'CERT-2025-0148'}`}
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content detail-page">
        <button className="back-link" onClick={() => setScreen('dashboard')}>
          <ArrowLeft size={15} /> Volver a búsqueda
        </button>

        <div className="detail-title">
          <div>
            <div className="title-line">
              <h2>{rec?.company_name}</h2>
              <span className={`badge ${rec?.status === 'Validado' ? 'success' : 'warning'}`}>
                <i /> {rec?.status}
              </span>
            </div>
            <p>Folio: {rec?.folio} · Ejercicio: {rec?.year} · Origen: {rec?.origin}</p>
          </div>
          <div className="detail-actions">
            {['operador', 'supervisor', 'admin'].includes(user?.profile?.role) && (
              <button
                className="secondary"
                onClick={() => { setSelectedRecord(rec); setScreen('record-form'); }}
              >
                Editar
              </button>
            )}
            {['supervisor', 'admin'].includes(user?.profile?.role) && (
              <button className="reject" onClick={handleDelete}>Eliminar</button>
            )}
            <button className="primary" onClick={handleDownload}>
              <Download size={16} /> Descargar PDF
            </button>
            {['supervisor', 'admin'].includes(user?.profile?.role) && (
              <button className="secondary" onClick={() => setScreen('approvals')}>
                Continuar a aprobación <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="detail-grid">
          <div className="main-detail">
            <div className="content-card">
              <div className="card-title">
                <div>
                  <h3>Información del expediente</h3>
                  <p>Datos validados ante el SII y el emisor</p>
                </div>
              </div>
              <div className="field-grid">
                <div className="detail-field"><span>RUT contribuyente</span><strong>{rec?.rut}</strong></div>
                <div className="detail-field"><span>Titular / Emisor</span><strong>{rec?.company_name}</strong></div>
                <div className="detail-field"><span>Ejercicio</span><strong>{rec?.year}</strong></div>
                <div className="detail-field"><span>Tipo de documento</span><strong>{rec?.doc_type}</strong></div>
                <div className="detail-field"><span>Monto calificado</span><strong>{rec?.formatted_amount || `${rec?.currency} ${rec?.amount}`}</strong></div>
              </div>
            </div>

            {/* Factores tributarios */}
            <div className="content-card">
              <div className="card-title">
                <div>
                  <h3>Factores tributarios asociados</h3>
                  <p>Valores normativos correspondientes al ejercicio {rec?.year}</p>
                </div>
                <span className="muted">{rec?.currency || 'CLP'}</span>
              </div>
              <div className="factor-list">
                {rec?.factors?.length ? (
                  rec.factors.map((f) => (
                    <div key={f.id || f.name}>
                      <span>{f.name}</span>
                      <strong>{f.value}</strong>
                    </div>
                  ))
                ) : (
                  <div><span>Factor de actualización</span><strong>1,045</strong></div>
                )}
              </div>
            </div>
          </div>

          <div className="detail-side">
            <div className="document-card">
              <div className="doc-preview">
                <FileText size={40} />
                <span>PDF INMUTABLE</span>
              </div>
              <h3>{rec?.document_name || `${rec?.folio}.pdf`}</h3>
              <p>Documento oficial respaldado</p>
              
              <div className="hash-badge" style={{ marginBottom: '14px', display: 'flex' }}>
                <ShieldCheck size={16} />
                <span>{rec?.is_hash_verified ? 'Hash SHA-256 Verificado' : 'Hash SHA-256 no verificado'}</span>
              </div>
              <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '6px', fontSize: '10px', color: '#64748b', marginBottom: '14px' }}>
                <strong style={{ display: 'block', color: '#334155' }}>Huella digital SHA-256:</strong>
                <span className="mono">{rec?.sha256_hash || 'Sin documento original almacenado'}</span>
              </div>

              <button className="secondary full" onClick={handleDownload}>
                <Download size={15} /> Descargar documento íntegro
              </button>
            </div>

            {/* Historial de Cambios / Trazabilidad */}
            <div className="content-card timeline-card">
              <div className="card-title">
                <div>
                  <h3>Historial de cambios</h3>
                  <p>Trazabilidad inmutable (Zona horaria Chile)</p>
                </div>
              </div>
              <div className="timeline">
                {rec?.audit_logs?.length ? (
                  rec.audit_logs.map((log, i) => (
                    <div className="timeline-item" key={log.id || i}>
                      <span className={i === 0 ? 'timeline-dot current' : 'timeline-dot'}>
                        {i === 0 && <Check size={10} />}
                      </span>
                      <div>
                        <strong>{log.action}</strong>
                        <small>{log.user_name} · {log.formatted_date || log.result}</small>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="timeline-item">
                    <span className="timeline-dot current"><Check size={10} /></span>
                    <div>
                      <strong>Carga inicial del certificado</strong>
                      <small>Camila Vargas · Operador</small>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function RecordForm({ record, setScreen, setSelectedRecord, user, onLogout }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    const formData = new FormData(event.currentTarget);
    const rutValue = String(formData.get('rut') || '').trim();
    if (!isValidChileanRut(rutValue)) {
      setError('El RUT ingresado no es válido según el algoritmo Módulo 11 (verifica el dígito verificador).');
      setSaving(false);
      return;
    }
    if (formData.get('amount') === '') formData.delete('amount');
    else if (Number(formData.get('amount')) < 0) {
      setError('El monto financiero no puede ser negativo.');
      setSaving(false);
      return;
    }
    const file = formData.get('document_file');
    if (!file?.size) formData.delete('document_file');
    if (file?.size > 25 * 1024 * 1024) {
      setError('El documento no puede superar 25 MB.');
      setSaving(false);
      return;
    }
    if (file?.size) formData.set('document_name', file.name);
    try {
      const saved = record
        ? await api.taxRecords.update(record.id, formData)
        : await api.taxRecords.create(formData);
      setSelectedRecord(saved);
      setScreen(record ? 'detail' : 'dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Header
        title={record ? 'Editar expediente' : 'Nuevo expediente tributario'}
        subtitle="Registra metadatos estructurados y conserva el documento original con verificación SHA-256."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content narrow-page">
        <button className="back-link" onClick={() => setScreen(record ? 'detail' : 'dashboard')}>
          <ArrowLeft size={15} /> Volver
        </button>
        <div className="content-card">
          <h3>{record ? 'Actualizar datos del expediente' : 'Registrar expediente'}</h3>
          <form className="admin-user-form" onSubmit={handleSubmit}>
            <label>Folio<input name="folio" required maxLength="50" defaultValue={record?.folio || ''} /></label>
            <label>RUT<input name="rut" required maxLength="25" defaultValue={record?.rut || ''} /></label>
            <label>Contribuyente / emisor<input name="company_name" required maxLength="200" defaultValue={record?.company_name || ''} /></label>
            <label>Ejercicio<input name="year" type="number" min="2000" max="2100" required defaultValue={record?.year || new Date().getFullYear()} /></label>
            <label>Tipo de documento<input name="doc_type" required maxLength="100" defaultValue={record?.doc_type || 'Certificado tributario'} /></label>
            <label>Monto<input name="amount" type="number" step="0.01" min="0" defaultValue={record?.amount || ''} /></label>
            <label>Moneda<input name="currency" required maxLength="10" defaultValue={record?.currency || 'CLP'} /></label>
            <label>Origen<input name="origin" maxLength="100" defaultValue={record?.origin || ''} /></label>
            {record?.sha256_hash ? (
              <label>Documento original (PDF)
                <small>El documento original es inmutable (SHA-256 {record.sha256_hash.slice(0, 12)}…) y no puede reemplazarse.</small>
              </label>
            ) : (
              <label>Documento original (PDF)
                <input name="document_file" type="file" accept="application/pdf,.pdf" required={!record} />
              </label>
            )}
            <label>Notas<textarea name="notes" maxLength="5000" defaultValue={record?.notes || ''} /></label>
            {error && <div className="form-error" role="alert">{error}</div>}
            <div className="upload-actions">
              <button className="secondary" type="button" onClick={() => setScreen(record ? 'detail' : 'dashboard')}>Cancelar</button>
              <button className="primary" type="submit" disabled={saving}>
                {saving ? 'Guardando...' : record ? 'Guardar cambios' : 'Crear expediente'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function Upload({ setScreen, user, onLogout }) {
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [confirmedMessage, setConfirmedMessage] = useState('');

  const handleFileDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setValidationResult(null);
    }
  };

  const handleValidate = async () => {
    if (!file) return;
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'csv'].includes(extension)) {
      alert('Solo se permiten archivos .xlsx o .csv.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      alert('El archivo no puede superar 25 MB.');
      return;
    }
    setValidating(true);
    try {
      const res = await api.bulkUpload.validate(file);
      setValidationResult(res);
    } catch (err) {
      alert(err.message);
    } finally {
      setValidating(false);
    }
  };

  const handleConfirm = async () => {
    try {
      const res = await api.bulkUpload.confirm(validationResult?.batch_id);
      setConfirmedMessage(
        `Carga masiva confirmada: ${res.created} registro(s) creado(s) de ${res.valid_rows} fila(s) válida(s).`
      );
      setTimeout(() => setScreen('dashboard'), 1500);
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <>
      <Header
        title="Carga masiva de documentos"
        subtitle="Valida la información antes de incorporarla al repositorio tributario."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content narrow-page">
        <button className="back-link" onClick={() => setScreen('dashboard')}>
          <ArrowLeft size={15} /> Volver a búsqueda
        </button>

        <div className="screen-heading">
          <span className="eyebrow dark">IMPORTACIÓN POR LOTES</span>
          <h2>Carga masiva de certificados</h2>
          <p>Validaremos la consistencia de los datos y el dígito verificador antes de guardarlos.</p>
        </div>

        <div className="upload-layout">
          <div>
            <div
              className={`dropzone ${drag ? 'drag' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={handleFileDrop}
            >
              <input
                type="file"
                accept=".csv,.xlsx"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setFile(e.target.files[0]);
                    setValidationResult(null);
                  }
                }}
              />
              {file ? (
                <>
                  <div className="upload-icon success-bg"><Check size={24} /></div>
                  <h3>{file.name}</h3>
                  <p>{(file.size / 1024 / 1024).toFixed(2)} MB · Listo para validar</p>
                  <button className="text-button" onClick={() => { setFile(null); setValidationResult(null); }}>
                    <X size={14} /> Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <div className="upload-icon"><CloudUpload size={25} /></div>
                  <h3>Arrastra tu archivo aquí</h3>
                  <p>o <strong>selecciona desde tu equipo</strong></p>
                  <small>Formatos permitidos: .XLSX, .CSV · Máximo 25 MB</small>
                </>
              )}
            </div>

            <div className="upload-actions">
              <button className="secondary" onClick={() => setScreen('dashboard')}>Cancelar</button>
              <button
                className="primary"
                disabled={!file || validating}
                onClick={handleValidate}
              >
                {validating ? 'Validando...' : 'Validar archivo'} <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <div className="upload-info">
            <h3>Protocolo de carga</h3>
            <div className="info-step">
              <span>01</span>
              <div><strong>Formato normalizado</strong><p>Asegúrate de que los campos coincidan con la plantilla oficial.</p></div>
            </div>
            <div className="info-step">
              <span>02</span>
              <div><strong>Semáforo de calidad</strong><p>Se auditará la validez del RUT y montos numéricos antes de importar.</p></div>
            </div>
            <div className="info-step">
              <span>03</span>
              <div><strong>Hash SHA-256</strong><p>Cada documento se indexará con su huella criptográfica inmutable.</p></div>
            </div>
          </div>
        </div>

        {/* Semáforo de Calidad y Errores (Figma Page 4) */}
        {validationResult && (
          <div style={{ marginTop: '28px', background: '#fff', padding: '24px', borderRadius: '10px', border: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, font: '700 16px Manrope' }}>Semáforo de calidad de datos</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '12px' }}>
                  Filas leídas: {validationResult.total_rows} | Válidas: {validationResult.valid_rows} | Con error: {validationResult.error_rows}
                </p>
              </div>
              <span className={`badge ${validationResult.error_rows > 0 ? 'warning' : 'success'}`}>
                <i /> {validationResult.error_rows > 0 ? `${validationResult.error_rows} errores detectados` : 'Validado sin errores'}
              </span>
            </div>

            <div className="semaforo-grid">
              <div className="semaforo-card valid">
                <strong>{validationResult.valid_rows}</strong>
                <span>Filas Válidas</span>
              </div>
              <div className="semaforo-card warning">
                <strong>{validationResult.warning_rows ?? 0}</strong>
                <span>Advertencias</span>
              </div>
              <div className="semaforo-card error">
                <strong>{validationResult.error_rows}</strong>
                <span>Con Error</span>
              </div>
            </div>

            {validationResult.error_rows > 0 ? (
              <>
                <div style={{ background: '#fff4f4', padding: '12px', borderRadius: '6px', color: '#a83226', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} />
                  <span>{validationResult.message || `Se detectaron ${validationResult.error_rows} fila(s) con inconsistencias.`}</span>
                </div>

                <h4 style={{ margin: '18px 0 8px', fontSize: '12px' }}>Errores de validación detectados</h4>
                <table className="error-table">
                  <thead>
                    <tr>
                      <th>Fila</th>
                      <th>Columna</th>
                      <th>Error detectado</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {validationResult.errors?.map((err, idx) => (
                      <tr key={idx}>
                        <td><strong>{err.row}</strong></td>
                        <td>{Array.isArray(err.fields) ? err.fields.join(', ') : '—'}</td>
                        <td style={{ color: '#a83226' }}>
                          {Array.isArray(err.errors) ? err.errors.join('; ') : (err.error || 'Error de validación')}
                        </td>
                        <td><span className="badge neutral" style={{ color: '#a83226' }}>• Con error</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : (
              <div style={{ background: '#e8f7f1', padding: '12px', borderRadius: '6px', color: '#1b6e53', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={16} />
                <span>{validationResult.message || 'Todas las filas superaron la validación de estructura, montos y RUT (Módulo 11).'}</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="secondary" onClick={() => { setFile(null); setValidationResult(null); }}>
                Reemplazar archivo
              </button>
              <button
                className="primary"
                onClick={handleConfirm}
                disabled={!validationResult?.batch_id || validationResult.valid_rows === 0}
              >
                Confirmar carga de filas válidas
              </button>
            </div>
            {confirmedMessage && (
              <p style={{ color: '#27ae60', marginTop: '10px', textAlign: 'right', fontWeight: 'bold' }}>
                {confirmedMessage}
              </p>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function Approvals({ setScreen, setSelectedRecord, user, onLogout, onResolved }) {
  const [approvals, setApprovals] = useState([]);
  const [selectedApproval, setSelectedApproval] = useState(null);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const data = await api.approvals.getAll();
      setApprovals(data);
      if (data.length > 0 && !selectedApproval) {
        setSelectedApproval(data[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const handleResolve = async (action) => {
    if (!selectedApproval) return;
    if (!comment.trim()) {
      alert('Se requiere un comentario obligatorio para aprobar o rechazar la solicitud.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await api.approvals.resolve(selectedApproval.id, action, comment);
      alert(`${res.detail}`);
      setComment('');
      fetchApprovals();
      onResolved?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const currentRec = selectedApproval?.tax_record_detail;

  return (
    <>
      <Header
        title="Bandeja de aprobaciones"
        subtitle="Revisa y decide sobre las solicitudes de entrega de respaldos pendientes de enviar al SII."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content">
        <div className="welcome-row">
          <div>
            <span className="eyebrow dark">BANDEJA DE SUPERVISIÓN</span>
            <h2>Solicitudes de respaldo <span className="count-pill">{approvals.length}</span></h2>
          </div>
        </div>

        <div className="approvals-split">
          {/* Columna Izquierda: Lista de solicitudes */}
          <div className="approvals-sidebar">
            <h4 style={{ margin: '0 0 10px', fontSize: '11px', color: '#64748b' }}>PENDIENTES DE DECISIÓN</h4>
            {loading ? (
              <p className="empty">Cargando solicitudes...</p>
            ) : approvals.length === 0 ? (
              <div className="empty-page" style={{ padding: '20px' }}>
                <Check size={30} />
                <p>No hay solicitudes pendientes.</p>
              </div>
            ) : (
              approvals.map((app) => (
                <div
                  key={app.id}
                  className={`approval-item-card ${selectedApproval?.id === app.id ? 'active' : ''}`}
                  onClick={() => setSelectedApproval(app)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <strong>{app.code}</strong>
                    <span className={`badge ${app.status === 'Pendiente' ? 'warning' : app.status === 'Aprobada' ? 'success' : 'neutral'}`}>
                      • {app.status}
                    </span>
                  </div>
                  <h4>{app.tax_record_detail?.company_name}</h4>
                  <p>RUT {app.tax_record_detail?.rut} · Ejercicio {app.tax_record_detail?.year}</p>
                  <small style={{ color: '#94a3b8', marginTop: '6px', display: 'block' }}>
                    {app.formatted_date} · Prioridad {app.priority}
                  </small>
                </div>
              ))
            )}
          </div>

          {/* Columna Derecha: Detalle de la Solicitud Seleccionada (Figma Page 3) */}
          {selectedApproval ? (
            <div className="approval-detail-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <span className="eyebrow dark">DETALLE DE SOLICITUD</span>
                  <h3>Solicitud {selectedApproval.code}</h3>
                  <p style={{ color: 'var(--muted)', fontSize: '12px', margin: 0 }}>
                    Solicitada por {selectedApproval.applicant_name} · {selectedApproval.formatted_date}
                  </p>
                </div>
                <span className="badge warning">• {selectedApproval.status}</span>
              </div>

              <div className="field-grid" style={{ margin: '20px 0', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', padding: '16px 0' }}>
                <div className="detail-field"><span>Titular</span><strong>{currentRec?.company_name}</strong></div>
                <div className="detail-field"><span>Destinatario</span><strong>{selectedApproval.recipient}</strong></div>
                <div className="detail-field"><span>RUT</span><strong>{currentRec?.rut}</strong></div>
                <div className="detail-field"><span>Ejercicio</span><strong>{currentRec?.year}</strong></div>
                <div className="detail-field"><span>Monto calificado</span><strong>{currentRec?.formatted_amount}</strong></div>
                <div className="detail-field"><span>Origen</span><strong>{selectedApproval.origin}</strong></div>
              </div>

              {/* Documento adjunto con hash inmutable */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={24} color="#1268e5" />
                  <div>
                    <strong style={{ fontSize: '12px' }}>{currentRec?.document_name || 'CERT-2025-0148.pdf'}</strong>
                    <div className="hash-badge" style={{ marginTop: '3px' }}>
                      <ShieldCheck size={13} />
                      <span>Hash Verificado: Documento Inmutable</span>
                    </div>
                  </div>
                </div>
                <button
                  className="secondary"
                  style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => {
                    setSelectedRecord(currentRec);
                    setScreen('detail');
                  }}
                >
                  Ver expediente completo
                </button>
              </div>

              <p style={{ fontSize: '12px', color: '#475569', marginBottom: '18px' }}>
                <strong>Motivo:</strong> {selectedApproval.reason}
              </p>

              {/* Formulario de Decisión con Comentario Obligatorio */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Comentario obligatorio * ({comment.length}/500)
                </label>
                <textarea
                  className="approval-comment-box"
                  placeholder="Escribe el fundamento de tu decisión técnica ante el SII..."
                  maxLength={500}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <small style={{ color: 'var(--muted)', display: 'block', marginTop: '4px', fontSize: '10px' }}>
                  Se requiere un comentario justificado para registrar la aprobación o el rechazo en el log de auditoría.
                </small>

                {['supervisor', 'admin'].includes(user?.profile?.role) && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                    <button
                      className="reject"
                      disabled={actionLoading || !comment.trim()}
                      onClick={() => handleResolve('reject')}
                    >
                      Rechazar
                    </button>
                    <button
                      className="primary"
                      disabled={actionLoading || !comment.trim()}
                      onClick={() => handleResolve('approve')}
                    >
                      <Check size={16} /> Aprobar entrega al SII
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-page">
              <p>Selecciona una solicitud para revisar sus antecedentes.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Audit({ setScreen, user, onLogout }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.audit.getAll()
      .then((data) => setLogs(data))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const escapeCsv = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    const rows = [
      ['Fecha y hora', 'Acción realizada', 'Usuario responsable', 'Resultado', 'Dirección IP'],
      ...logs.map((log) => [
        log.formatted_date || log.timestamp,
        log.action,
        log.user_name,
        log.result,
        log.ip_address,
      ]),
    ];
    const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `auditoria-nuam-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Header
        title="Auditoría y trazabilidad"
        subtitle="Registro inmutable de accesos, descargas y cambios conforme a la Ley 21.719 y protocolos SII."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content">
        <div className="welcome-row">
          <div>
            <span className="eyebrow dark">LOG INMUTABLE</span>
            <h2>Bitácora de seguridad y auditoría</h2>
          </div>
          <button className="secondary" onClick={exportCsv} disabled={loading || logs.length === 0}>
            <Download size={15} /> Exportar bitácora
          </button>
        </div>

        <div className="table-card" style={{ marginTop: '20px' }}>
          <div className="table-toolbar">
            <strong>Eventos registrados · {logs.length}</strong>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Acción realizada</th>
                  <th>Usuario responsable</th>
                  <th>Resultado</th>
                  <th>Dirección IP</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="empty">Cargando bitácora de auditoría...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="empty">No hay registros de auditoría aún.</td></tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id}>
                      <td><strong>{log.formatted_date || log.timestamp}</strong></td>
                      <td>{log.action}</td>
                      <td>{log.user_name}</td>
                      <td>
                        <span className="badge success"><i /> {log.result}</span>
                      </td>
                      <td><code>{log.ip_address}</code></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

function AdminUsers({ user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [listError, setListError] = useState('');
  const [formError, setFormError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState(null);
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState('operador');
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState('');

  const fetchUsers = async () => {
    try {
      setUsers(await api.admin.getUsers());
      setListError('');
    } catch (err) {
      setListError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const roleLabels = {
    operador: 'Operador',
    supervisor: 'Supervisor',
    auditor: 'Auditor',
    admin: 'Administrador',
  };
  const roleDescriptions = {
    operador: 'Puede buscar documentos y registrar o editar expedientes.',
    supervisor: 'Puede gestionar expedientes, resolver aprobaciones y consultar auditoría.',
    auditor: 'Acceso exclusivo en modo lectura a expedientes, aprobaciones y bitácora de auditoría.',
    admin: 'Puede revisar documentos, resolver aprobaciones, consultar auditoría y administrar usuarios.',
  };
  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((account) => {
      const name = `${account.first_name} ${account.last_name}`.trim();
      return !query || [name, account.email, account.username]
        .some((value) => value?.toLocaleLowerCase().includes(query));
    });
  }, [users, search]);

  const handleCreate = async (event) => {
    event.preventDefault();
    setSaving(true);
    setFormError('');
    setCreatedCredentials(null);
    setCopied(false);
    setCopyError('');
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      const payload = Object.fromEntries(form.entries());
      payload.country = 'Chile';
      const result = await api.admin.createUser(payload);
      setUsers((current) => [result.user, ...current]);
      setCreatedCredentials({ email: result.user.email, password: result.temporary_password });
      formElement.reset();
      setSelectedRole('operador');
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(createdCredentials.password);
      setCopied(true);
      setCopyError('');
    } catch {
      setCopied(false);
      setCopyError('No se pudo copiar. Selecciona la contraseña para copiarla manualmente.');
    }
  };

  const handleUserUpdate = async (account, changes) => {
    try {
      const updated = await api.admin.updateUser(account.id, changes);
      setUsers((current) => current.map((item) => item.id === account.id ? updated : item));
    } catch (err) {
      setListError(err.message);
    }
  };

  return (
    <>
      <Header
        title="Usuarios"
        subtitle="Crea y consulta las cuentas de tu equipo."
        user={user}
        onLogout={onLogout}
      />
      <div className="page-content admin-page">
        <div className="admin-intro">
          <div>
            <h2>¿Para qué sirve esta sección?</h2>
            <p>Aquí creas cuentas y eliges qué puede hacer cada persona en la plataforma.</p>
          </div>
        </div>

        <div className="admin-layout">
          <section className="admin-create-panel">
            <div className="admin-panel-heading">
              <span className="admin-panel-icon"><UserPlus size={18} /></span>
              <div><h3>Crear usuario</h3><p>Completa sus datos y selecciona sus permisos.</p></div>
            </div>
            <div className="admin-security-note">
              <ShieldCheck size={16} />
              <span>Al terminar, copia la contraseña temporal y compártela por un canal seguro. El inicio de sesión usa verificación en dos pasos.</span>
            </div>
            <form className="admin-user-form" onSubmit={handleCreate}>
              <label>Nombre y apellido
                <input name="full_name" placeholder="Ej. Camila Vargas" required maxLength="150" autoComplete="name" />
              </label>
              <label>Correo electrónico
                <input name="email" type="email" placeholder="nombre@empresa.cl" required autoComplete="email" />
              </label>
              <label>Permisos
                <select name="role" required value={selectedRole} onChange={(event) => setSelectedRole(event.target.value)}>
                  <option value="operador">Operador</option>
                  <option value="supervisor">Supervisor</option>
                  <option value="auditor">Auditor (Solo lectura)</option>
                  <option value="admin">Administrador</option>
                </select>
                <small className="admin-field-hint">{roleDescriptions[selectedRole]}</small>
              </label>
              {formError && <div className="form-error" role="alert">{formError}</div>}
              <button className="primary admin-create-button" type="submit" disabled={saving}>
                {saving ? 'Creando usuario…' : 'Crear usuario'} <UserPlus size={16} />
              </button>
            </form>
            {createdCredentials && (
              <div className="temporary-password admin-created" role="status">
                <div className="admin-created-heading">
                  <div><strong>Cuenta creada</strong><span>{createdCredentials.email}</span></div>
                  <button type="button" className="admin-dismiss" aria-label="Ocultar contraseña temporal" onClick={() => { setCreatedCredentials(null); setCopyError(''); }}><X size={16} /></button>
                </div>
                <span>Compártela por un canal seguro. No volverá a mostrarse.</span>
                <div className="admin-password-row">
                  <code>{createdCredentials.password}</code>
                  <button type="button" className="secondary" onClick={handleCopyPassword}>
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copiada' : 'Copiar'}
                  </button>
                </div>
                {copyError ? <small className="admin-copy-error" role="alert">{copyError}</small> : !copied && <small className="admin-copy-hint">Puedes copiarla o seleccionar el texto para compartirla.</small>}
              </div>
            )}
          </section>

          <section className="admin-directory">
            <div className="admin-directory-heading">
              <div><h3>Usuarios creados</h3><p>Busca una cuenta para consultar sus permisos.</p></div>
              <span className="count-pill">{loading ? '…' : users.length}</span>
            </div>
            <div className="admin-directory-tools">
              <label className="admin-search">
                <Search size={16} aria-hidden="true" />
                <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" />
              </label>
            </div>
            {listError && (
              <div className="admin-list-error" role="alert">
                <span>{listError}</span>
                <button type="button" className="text-button" onClick={() => { setLoading(true); fetchUsers(); }}>Reintentar</button>
              </div>
            )}
            <div className="table-scroll">
              <table className="admin-users-table">
                <thead><tr><th>PERSONA</th><th>PERMISOS</th><th>ACCIONES</th></tr></thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan="3" className="empty">Cargando usuarios…</td></tr>
                  ) : filteredUsers.map((account) => {
                    const name = `${account.first_name} ${account.last_name}`.trim() || account.username;
                    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
                    const role = account.profile?.role;
                    return (
                      <tr key={account.id}>
                        <td>
                          <div className="admin-person">
                            <span className="admin-person-avatar">{initials}</span>
                            <span><strong>{name}</strong><small>{account.email}</small></span>
                          </div>
                        </td>
                        <td>
                          <select
                            className="admin-role-select"
                            value={role || 'operador'}
                            aria-label={`Cambiar rol de ${name}`}
                            onChange={(event) => handleUserUpdate(account, { role: event.target.value })}
                          >
                            <option value="operador">Operador</option>
                            <option value="supervisor">Supervisor</option>
                            <option value="auditor">Auditor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={account.is_active === false ? 'secondary' : 'reject'}
                            onClick={() => handleUserUpdate(account, { is_active: account.is_active === false })}
                          >
                            {account.is_active === false ? 'Activar cuenta' : 'Desactivar cuenta'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {!loading && filteredUsers.length === 0 && (
                    <tr><td colSpan="3" className="admin-empty">
                      {users.length ? 'No encontramos usuarios con ese nombre o correo.' : 'Aún no hay usuarios. Crea la primera cuenta con el formulario.'}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

const ROLE_SCREENS = {
  operador: ['dashboard', 'detail', 'record-form', 'upload'],
  supervisor: ['dashboard', 'detail', 'record-form', 'upload', 'approvals', 'audit'],
  auditor: ['dashboard', 'detail', 'approvals', 'audit'],
  admin: ['dashboard', 'detail', 'record-form', 'upload', 'approvals', 'audit', 'admin-users'],
};

function App() {
  const [user, setUser] = useState(() => api.auth.getCurrentUser());
  const [screen, setScreen] = useState('dashboard');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [mobileNav, setMobileNav] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState(0);
  const role = user?.profile?.role || 'operador';
  const allowedScreens = ROLE_SCREENS[role] || ['dashboard'];

  useEffect(() => {
    if (!allowedScreens.includes(screen)) setScreen('dashboard');
  }, [screen, allowedScreens]);

  const refreshDashboardStats = async () => {
    if (!user) return;
    try {
      const stats = await api.taxRecords.getStats();
      setPendingApprovals(stats.pending_approvals ?? 0);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    refreshDashboardStats();
  }, [user]);

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
    setScreen('dashboard');
  };

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }
  if (!user.first_name?.trim()) {
    return <ProfileSetup user={user} onComplete={setUser} onLogout={handleLogout} />;
  }

  const renderContent = () => {
    switch (screen) {
      case 'dashboard':
      case 'records':
        return (
          <Dashboard
            setScreen={setScreen}
            setSelectedRecord={setSelectedRecord}
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'detail':
        return (
          <Detail
            record={selectedRecord}
            setScreen={setScreen}
            setSelectedRecord={setSelectedRecord}
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'record-form':
        return (
          <RecordForm
            record={selectedRecord}
            setScreen={setScreen}
            setSelectedRecord={setSelectedRecord}
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'upload':
        return (
          <Upload
            setScreen={setScreen}
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'approvals':
        return (
          <Approvals
            setScreen={setScreen}
            setSelectedRecord={setSelectedRecord}
            user={user}
            onLogout={handleLogout}
            onResolved={refreshDashboardStats}
          />
        );
      case 'audit':
        return (
          <Audit
            setScreen={setScreen}
            user={user}
            onLogout={handleLogout}
          />
        );
      case 'admin-users':
        return (
          <AdminUsers
            user={user}
            onLogout={handleLogout}
          />
        );
      default:
        return (
          <Dashboard
            setScreen={setScreen}
            setSelectedRecord={setSelectedRecord}
            user={user}
            onLogout={handleLogout}
          />
        );
    }
  };

  return (
    <div className="app-shell">
      <div className={`sidebar-wrap ${mobileNav ? 'open' : ''}`}>
        <Sidebar
          screen={screen}
          setScreen={(id) => {
            setScreen(id);
            setMobileNav(false);
          }}
          onLogout={handleLogout}
          user={user}
          pendingApprovalsCount={pendingApprovals}
        />
      </div>
      {mobileNav && <button className="nav-overlay" aria-label="Cerrar menú lateral" onClick={() => setMobileNav(false)} />}
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
