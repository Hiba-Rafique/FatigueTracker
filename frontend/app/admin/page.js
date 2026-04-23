'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE = `http://${API_HOST}:8000`;
const api = (path, opts = {}) =>
  fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });

const parseJsonSafe = async (res) => {
  try { return await res.json(); } catch { return null; }
};

// ── Icons ────────────────────────────────────────────────────
const IconUsers = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconMail = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);
const IconConfig = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3"/>
    <path d="M19.07 4.93l-1.41 1.41M4.93 4.93l1.41 1.41M12 2v2M12 20v2M4.93 19.07l1.41-1.41M19.07 19.07l-1.41-1.41M2 12h2M20 12h2"/>
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconAudit = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconSave = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
    <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
  </svg>
);
const IconChevron = ({ dir = 'right' }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
    style={{ transform: dir === 'left' ? 'rotate(180deg)' : 'none', display: 'block' }}>
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

// ── Role chip config ─────────────────────────────────────────
const roleStyle = {
  STUDENT:   { bg: '#EDE9FE', color: '#5B21B6' },
  COUNSELOR: { bg: '#DBEAFE', color: '#1D4ED8' },
  FACULTY:   { bg: '#D1FAE5', color: '#059669' },
  ADMIN:     { bg: '#FEF3C7', color: '#D97706' },
};

// ── Main Component ───────────────────────────────────────────
export default function AdminDashboard() {
  const [toast, setToast] = useState(null);
  const [activeSection, setActiveSection] = useState('analytics');

  const [users,       setUsers]       = useState([]);
  const [analytics,   setAnalytics]   = useState(null);
  const [auditLog,    setAuditLog]    = useState([]);
  const [auditPage,   setAuditPage]   = useState(1);
  const [config,      setConfig]      = useState(null);
  const [configForm,  setConfigForm]  = useState(null);

  const [loadingUsers,     setLoadingUsers]     = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);
  const [loadingAudit,     setLoadingAudit]     = useState(true);
  const [loadingConfig,    setLoadingConfig]    = useState(true);

  const [whitelist, setWhitelist] = useState([]);
  const [whitelistText,   setWhitelistText]   = useState('');
  const [whitelistResult, setWhitelistResult] = useState(null);
  const [submittingWL,    setSubmittingWL]    = useState(false);
  const [savingConfig,    setSavingConfig]    = useState(false);
  const [creatingStaff,   setCreatingStaff]   = useState(false);
  const [drill, setDrill] = useState({ open: false, title: '', loading: false, rows: [], kind: null });
  const [staffForm, setStaffForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'COUNSELOR',
    specialization: '',
    department: '',
    max_caseload: 10,
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    fetchUsers();
    fetchAnalytics();
    fetchAudit(1);
    fetchConfig();
    fetchWhitelist(); 
  }, []);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res  = await api('/api/admin/users');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      setUsers(data?.users || []);
    } catch (e) { console.error(e); }
    finally { setLoadingUsers(false); }
  };

  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const res  = await api('/api/admin/analytics');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      setAnalytics(data);
    } catch (e) { console.error(e); }
    finally { setLoadingAnalytics(false); }
  };

  const openRiskDrill = async (band, label) => {
    setDrill({ open: true, title: `${label} Students`, loading: true, rows: [], kind: 'students' });
    try {
      const res = await api(`/api/admin/analytics/students?band=${band}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed');
      setDrill(p => ({ ...p, loading: false, rows: data?.students || [] }));
    } catch (e) {
      showToast(e.message, 'error');
      setDrill(p => ({ ...p, loading: false }));
    }
  };

  const openCounselorDrill = async (c) => {
    setDrill({ open: true, title: `Caseload · ${c.counselor}`, loading: true, rows: [], kind: 'students' });
    try {
      const res = await api(`/api/admin/counselors/${c.counselor_id}/students`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed');
      const raw = data?.students || [];
      const unique = Array.from(new Map(raw.map(s => [s.student_id ?? s.email, s])).values());
      setDrill(p => ({ ...p, loading: false, rows: unique }));
    } catch (e) {
      showToast(e.message, 'error');
      setDrill(p => ({ ...p, loading: false }));
    }
  };

  const fetchAudit = async (page) => {
    setLoadingAudit(true);
    try {
      const res  = await api(`/api/admin/audit-log?page=${page}`);
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      setAuditLog(data?.audit_log || []);
      setAuditPage(page);
    } catch (e) { console.error(e); }
    finally { setLoadingAudit(false); }
  };

  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      const res  = await api('/api/admin/config');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      setConfig(data);
      setConfigForm({ ...data });
    } catch (e) { console.error(e); }
    finally { setLoadingConfig(false); }
  };

  const toggleUser = async (userId) => {
    try {
      const res = await api(`/api/admin/users/${userId}/toggle`, {
        method: 'PUT',
      });
      if (!res.ok) throw new Error('Failed');
      showToast('User status updated');
      setUsers(prev => prev.map(u =>
        u.user_id === userId ? { ...u, is_active: u.is_active === 1 ? 0 : 1 } : u
      ));
    } catch {
      showToast('Could not toggle user', 'error');
    }
  };

  const submitWhitelist = async () => {
    const emails = whitelistText
      .split(/[\n,]+/)
      .map(e => e.trim())
      .filter(e => e.includes('@'));
    if (emails.length === 0) { showToast('No valid emails found', 'error'); return; }
    setSubmittingWL(true);
    try {
      const res = await api('/api/admin/whitelist/upload', {
        method: 'POST',
        body: JSON.stringify(emails.map(email => ({ email }))),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed');
      setWhitelistResult(data);
      setWhitelistText('');
      showToast(`${data.inserted} email(s) added to whitelist`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSubmittingWL(false);
    }
  };

  const saveConfig = async () => {
    setSavingConfig(true);
    try {
      const res = await api('/api/admin/config', {
        method: 'PUT',
        body: JSON.stringify(configForm),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast('System config saved successfully');
      setConfig({ ...configForm });
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchWhitelist = async () => {
    const res = await api('/api/admin/whitelist');
    if (res.status === 401) { window.location.href = '/login'; return; }
    const data = await parseJsonSafe(res);
    setWhitelist(data?.whitelist || []);
  };

  const deleteEmail = async (email) => {
    await api(`/api/admin/whitelist/${email}`, { method: 'DELETE' });
    fetchWhitelist();
  }; 

  const handleLogout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const createStaff = async () => {
    if (!staffForm.name || !staffForm.email || !staffForm.password) {
      showToast('Name, email, and password are required', 'error');
      return;
    }
    setCreatingStaff(true);
    try {
      const payload = {
        name: staffForm.name.trim(),
        email: staffForm.email.trim(),
        password: staffForm.password,
        role: staffForm.role,
        specialization: staffForm.role === 'COUNSELOR' ? (staffForm.specialization || null) : null,
        department: staffForm.role === 'FACULTY' ? (staffForm.department || null) : null,
        max_caseload: staffForm.role === 'COUNSELOR' ? Number(staffForm.max_caseload || 10) : null,
      };
      const res = await api('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Failed to create account');
      showToast(`${data.role} account created (User ID: ${data.user_id})`);
      setStaffForm({
        name: '',
        email: '',
        password: '',
        role: 'COUNSELOR',
        specialization: '',
        department: '',
        max_caseload: 10,
      });
      fetchUsers();
      fetchAnalytics();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setCreatingStaff(false);
    }
  };


 const bri = analytics?.bri_distribution;

 const briTotal = bri
  ? (bri.low + bri.watch + bri.warning + bri.critical) || 1
  : 1;

  const configChanged = config && configForm && JSON.stringify(config) !== JSON.stringify(configForm);

  const sections = [
    { id: 'analytics', label: 'Analytics', icon: <IconChart /> },
    { id: 'users',     label: 'Users',     icon: <IconUsers /> },
    { id: 'staff',     label: 'Staff',     icon: <IconUsers /> },
    { id: 'whitelist', label: 'Whitelist', icon: <IconMail /> },
    { id: 'config',    label: 'Config',    icon: <IconConfig /> },
    { id: 'audit',     label: 'Audit',     icon: <IconAudit /> },
  ];

  return (
    <div className={styles.container}>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      )}

      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.logo} />
          <span className={styles.appName}>
            Fatigue Tracker <span className={styles.roleTag}>Admin</span>
          </span>
        </div>
        <div className={styles.topRight}>
          <div className={styles.liveIndicator}>
            <span className={styles.ping} />
            LIVE
          </div>
          <button className={styles.logoutBtn} title="Logout" onClick={handleLogout}>
            <IconLogout />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.workspaceWrapper}>
          <div className={styles.workspace}>

            <div className={styles.sectionTabs}>
              {sections.map(s => (
                <button
                  key={s.id}
                  className={`${styles.sectionTabBtn} ${activeSection === s.id ? styles.sectionTabActive : ''}`}
                  onClick={() => setActiveSection(s.id)}
                >
                  {s.icon} {s.label}
                </button>
              ))}
            </div>

            {/* ── 1. ANALYTICS ──────────────────────────────── */}
            {activeSection === 'analytics' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconChart /> System Analytics</span>
              </div>

              {loadingAnalytics ? (
                <div className={styles.skeletonRow}>
                  {[1,2,3,4].map(i => <div key={i} className={styles.skeleton} style={{ height: 96 }} />)}
                </div>
              ) : analytics ? (
                <>
                  <p className={styles.subLabel}>BRI Distribution — {briTotal} students</p>
                  <div className={styles.briGrid}>
                    {[
                      { key: 'low',      label: 'Healthy',  color: '#059669', bg: '#D1FAE5', range: '0–39' },
                      { key: 'watch',    label: 'Watch',    color: '#5B21B6', bg: '#EDE9FE', range: '40–64' },
                      { key: 'warning',  label: 'Warning',  color: '#D97706', bg: '#FFFBEB', range: '65–84' },
                      { key: 'critical', label: 'Critical', color: '#E11D48', bg: '#FDE8EE', range: '85–100' },
                    ].map(({ key, label, color, bg, range }) => (
                      <div
                        key={key}
                        className={styles.briTile}
                        style={{ background: bg, borderColor: `${color}30` }}
                        onClick={() => openRiskDrill(key, label)}
                        title={`View ${label} students`}
                      >
                        <div className={styles.briTileVal} style={{ color }}> {analytics?.bri_distribution?.[key] || 0}</div>                                                                        
                        <div className={styles.briTileLabel}>{label}</div>
                        <div className={styles.briTileRange} style={{ color }}>{range}</div>
                        <div className={styles.briTileBar}>
                          <div className={styles.briTileBarFill}
                            style={{ width: `${((analytics?.bri_distribution?.[key] || 0) / briTotal) * 100}%`, background: color }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className={styles.analyticsBottom}>
                    <div className={styles.alertBox} onClick={() => openRiskDrill('alerts', 'Open Alert')} title="View students with open alerts">
                      <span className={styles.alertCount}>{analytics.open_alerts}</span>
                      <span className={styles.alertLabel}>Open Alerts</span>
                    </div>
                    <div className={styles.caseloadWrap}>
                      <p className={styles.subLabel}>Counselor Caseload</p>
                      {(analytics.counselor_caseload || []).map((c, i) => (
                        <div key={c.counselor_id ?? i} className={styles.caseloadRow} onClick={() => openCounselorDrill(c)} title="View assigned students">
                          <span className={styles.caseloadName}>{c.counselor}</span>
                          <div className={styles.caseloadBar}>
                            <div className={styles.caseloadFill}
                              style={{ width: `${Math.min((c.active_students / (config?.max_caseload || 10)) * 100, 100)}%` }} />
                          </div>
                          <span className={styles.caseloadCount}>{c.active_students}</span>
                        </div>
                      ))}
                      {(analytics.counselor_caseload || []).length === 0 && (
                        <p className={styles.empty}>No counselors found.</p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className={styles.empty}>Could not load analytics.</p>
              )}
            </section>}

            {drill.open && (
              <div className={styles.modalOverlay} onClick={() => setDrill(p => ({ ...p, open: false }))}>
                <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                  <div className={styles.modalHeader}>
                    <div className={styles.modalTitle}><IconAudit /> {drill.title}</div>
                    <button className={styles.closeBtn} onClick={() => setDrill(p => ({ ...p, open: false }))}>Close</button>
                  </div>
                  <div className={styles.modalBody}>
                    {drill.loading ? (
                      <div className={styles.skeletonCol}>
                        {[1,2,3,4,5].map(i => <div key={i} className={styles.skeleton} style={{ height: 46 }} />)}
                      </div>
                    ) : (drill.rows?.length || 0) === 0 ? (
                      <p className={styles.empty}>No records found.</p>
                    ) : (
                      <div className={styles.tableWrap}>
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th>Student</th>
                              <th>Email</th>
                              <th>BRI</th>
                              <th>Trend</th>
                              <th>Open Alerts</th>
                            </tr>
                          </thead>
                          <tbody>
                            {drill.rows.map((r, i) => (
                              <tr key={r.student_id ?? r.email ?? i}>
                                <td className={styles.tdName}>{r.name ?? '—'} <span className={styles.tdMeta}>({r.student_id ?? 'N/A'})</span></td>
                                <td className={styles.tdEmail}>{r.email ?? '—'}</td>
                                <td className={styles.tdMeta}>{r.bri_score ?? '—'}</td>
                                <td className={styles.tdMeta}>{r.trend_label ?? '—'}</td>
                                <td className={styles.tdMeta}>{r.open_alerts ?? 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── 2. USER MANAGEMENT ────────────────────────── */}
            {activeSection === 'users' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconUsers /> User Management</span>
                <span className={styles.countBadge}>{users.length} users</span>
              </div>

              {loadingUsers ? (
                <div className={styles.skeletonCol}>
                  {[1,2,3,4,5].map(i => <div key={i} className={styles.skeleton} style={{ height: 52 }} />)}
                </div>
              ) : users.length === 0 ? (
                <p className={styles.empty}>No users found.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Joined</th>
                        <th>Status</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(u => (
                        <tr key={u.user_id} className={!u.is_active ? styles.rowInactive : ''}>
                          <td className={styles.tdName}>{u.name}</td>
                          <td className={styles.tdEmail}>{u.email}</td>
                          <td>
                            <span className={styles.roleChip}
                              style={{
                                background: roleStyle[u.role]?.bg  || '#F3F4F6',
                                color:      roleStyle[u.role]?.color || '#374151',
                              }}>
                              {u.role}
                            </span>
                          </td>
                          <td className={styles.tdMeta}>
                            {u.created_at
                              ? new Date(u.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td>
                            <span className={styles.statusChip} style={
                              u.is_active
                                ? { background: '#D1FAE5', color: '#065F46', borderColor: '#6EE7B7' }
                                : { background: '#FDE8EE', color: '#9B1239', borderColor: '#FDA4AF' }
                            }>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td>
                            <button
                              className={styles.toggleBtn}
                              style={u.is_active
                                ? { background: '#FDE8EE', color: '#E11D48' }
                                : { background: '#D1FAE5', color: '#059669' }}
                              onClick={() => toggleUser(u.user_id)}>
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>}

            {/* ── 3. STAFF ACCOUNT CREATION ─────────────────── */}
            {activeSection === 'staff' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconUsers /> Create Counselor / Faculty Account</span>
              </div>
              <p className={styles.cardDesc}>
                Create credentials for staff members. They can later log in using this email and password.
              </p>
              <div className={styles.configGrid}>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Full Name</label>
                  <input
                    className={styles.configInput}
                    value={staffForm.name}
                    onChange={e => setStaffForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Dr. Sara Khan"
                  />
                </div>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Email</label>
                  <input
                    className={styles.configInput}
                    type="email"
                    value={staffForm.email}
                    onChange={e => setStaffForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="staff@nust.edu.pk"
                  />
                </div>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Temporary Password</label>
                  <input
                    className={styles.configInput}
                    type="text"
                    value={staffForm.password}
                    onChange={e => setStaffForm(p => ({ ...p, password: e.target.value }))}
                    placeholder="Set initial password"
                  />
                </div>
                <div className={styles.configField}>
                  <label className={styles.configLabel}>Role</label>
                  <select
                    className={styles.configInput}
                    value={staffForm.role}
                    onChange={e => setStaffForm(p => ({ ...p, role: e.target.value }))}
                  >
                    <option value="COUNSELOR">COUNSELOR</option>
                    <option value="FACULTY">FACULTY</option>
                  </select>
                </div>
                {staffForm.role === 'COUNSELOR' ? (
                  <>
                    <div className={styles.configField}>
                      <label className={styles.configLabel}>Specialization</label>
                      <input
                        className={styles.configInput}
                        value={staffForm.specialization}
                        onChange={e => setStaffForm(p => ({ ...p, specialization: e.target.value }))}
                        placeholder="Academic Stress"
                      />
                    </div>
                    <div className={styles.configField}>
                      <label className={styles.configLabel}>Max Caseload</label>
                      <input
                        className={styles.configInput}
                        type="number"
                        min="1"
                        value={staffForm.max_caseload}
                        onChange={e => setStaffForm(p => ({ ...p, max_caseload: Number(e.target.value) }))}
                      />
                    </div>
                  </>
                ) : (
                  <div className={styles.configField}>
                    <label className={styles.configLabel}>Department</label>
                    <input
                      className={styles.configInput}
                      value={staffForm.department}
                      onChange={e => setStaffForm(p => ({ ...p, department: e.target.value }))}
                      placeholder="Computing"
                    />
                  </div>
                )}
              </div>
              <div>
                <button className={styles.primaryBtn} onClick={createStaff} disabled={creatingStaff}>
                  <IconPlus /> {creatingStaff ? 'Creating...' : 'Create Staff Account'}
                </button>
              </div>
            </section>}

            {/* ── 4. WHITELIST UPLOAD ───────────────────────── */}
            {activeSection === 'whitelist' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconMail /> 14C Whitelist Upload</span>
                <span className={styles.cohortBadge}>14C COHORT</span>
              </div>

              <p className={styles.cardDesc}>
                Paste student emails below — one per line or comma-separated. Students registering with a whitelisted email are automatically placed in the 14C cohort.
              </p>

              <textarea
                className={styles.textarea}
                rows={6}
                placeholder={"student1@students.nust.edu.pk\nstudent2@students.nust.edu.pk\nstudent3@students.nust.edu.pk"}
                value={whitelistText}
                onChange={e => { setWhitelistText(e.target.value); setWhitelistResult(null); }}
              />

              <div className={styles.whitelistActions}>
                <span className={styles.whitelistCount}>
                  {whitelistText.split(/[\n,]+/).filter(e => e.trim().includes('@')).length} email(s) detected
                </span>
                <button className={styles.primaryBtn} onClick={submitWhitelist} disabled={submittingWL}>
                  <IconPlus /> {submittingWL ? 'Uploading...' : 'Upload Whitelist'}
                </button>
              </div>

              {whitelistResult && (
                <div className={styles.whitelistResult}>
                  <span className={styles.resultGreen}>✓ {whitelistResult.inserted} added</span>
                  {whitelistResult.skipped_duplicates > 0 && (
                    <span className={styles.resultMuted}> · {whitelistResult.skipped_duplicates} duplicate(s) skipped</span>
                  )}
                </div>
              )}

              {/* Whitelist List */}
              <div style={{ marginTop: "20px" }}>
                <p className={styles.subLabel}>Whitelisted Emails</p>

                   {whitelist.length === 0 ? (
                   <p className={styles.empty}>No emails in whitelist.</p>
                    ) : (
                 whitelist.map((w, i) => (
                <div key={i} style={{
                 display: "flex",
                 justifyContent: "space-between",
                 padding: "8px 0",
                 borderBottom: "1px solid #eee"
                }}>
                <span>
                  {w.email} — {w.is_used ? "Used" : "Unused"}
                </span>

                <button
                onClick={() => deleteEmail(w.email)}
                style={{
                background: "#FDE8EE",
                color: "#E11D48",
                border: "none",
                padding: "4px 10px",
                borderRadius: "6px",
                cursor: "pointer"
               }}
              >
                 Delete
              </button>
               </div>
               ))
               )}
             </div>
            </section>}

            {/* ── 5. SYSTEM CONFIG ──────────────────────────── */}
            {activeSection === 'config' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconConfig /> System Configuration</span>
                {configChanged && <span className={styles.unsavedBadge}>Unsaved changes</span>}
              </div>

              {loadingConfig ? (
                <div className={styles.skeletonCol}>
                  {[1,2,3].map(i => <div key={i} className={styles.skeleton} style={{ height: 64 }} />)}
                </div>
              ) : configForm ? (
                <>
                  <div className={styles.configGrid}>
                    {[
                      { key: 'max_caseload',        label: 'Max Counselor Caseload',  hint: 'Max students per counselor' },
                      { key: 'bri_watch',           label: 'BRI Watch Threshold',      hint: 'BRI score triggering Watch status' },
                      { key: 'bri_warning',         label: 'BRI Warning Threshold',    hint: 'Must be greater than Watch' },
                      { key: 'bri_critical',        label: 'BRI Critical Threshold',   hint: 'Must be greater than Warning' },
                      { key: 'unlock_days',         label: 'Unlock Days (streak)',      hint: 'Consecutive days to unlock recommendations' },
                      { key: 'allowed_misses',      label: 'Allowed Misses',           hint: 'Days missed before re-locking' },
                      { key: 'pattern_window_days', label: 'Pattern Window (days)',     hint: 'Window size for pattern detection job' },
                    ].map(({ key, label, hint }) => (
                      <div key={key} className={styles.configField}>
                        <label className={styles.configLabel}>{label}</label>
                        <input
                          type="number"
                          className={styles.configInput}
                          value={configForm[key] ?? ''}
                          onChange={e => setConfigForm(p => ({ ...p, [key]: Number(e.target.value) }))}
                        />
                        <span className={styles.configHint}>{hint}</span>
                      </div>
                    ))}
                  </div>

                  {/* BRI threshold visual */}
                  <div className={styles.thresholdViz}>
                    <p className={styles.subLabel}>BRI Threshold Preview</p>
                    <div className={styles.thresholdBar}>
                      <div className={styles.thresholdSeg} style={{ width: `${configForm.bri_watch}%`,                               background: '#059669' }} />
                      <div className={styles.thresholdSeg} style={{ width: `${configForm.bri_warning  - configForm.bri_watch}%`,   background: '#5B21B6' }} />
                      <div className={styles.thresholdSeg} style={{ width: `${configForm.bri_critical - configForm.bri_warning}%`, background: '#D97706' }} />
                      <div className={styles.thresholdSeg} style={{ width: `${100 - configForm.bri_critical}%`,                    background: '#E11D48' }} />
                    </div>
                    <div className={styles.thresholdLegend}>
                      <span style={{ color: '#059669' }}>Healthy 0–{configForm.bri_watch}</span>
                      <span style={{ color: '#5B21B6' }}>Watch {configForm.bri_watch}–{configForm.bri_warning}</span>
                      <span style={{ color: '#D97706' }}>Warning {configForm.bri_warning}–{configForm.bri_critical}</span>
                      <span style={{ color: '#E11D48' }}>Critical {configForm.bri_critical}–100</span>
                    </div>
                  </div>

                  <div>
                    <button className={styles.primaryBtn} onClick={saveConfig} disabled={savingConfig}>
                      <IconSave /> {savingConfig ? 'Saving...' : 'Save Configuration'}
                    </button>
                  </div>
                </>
              ) : (
                <p className={styles.empty}>Could not load configuration.</p>
              )}
            </section>}

            {/* ── 6. AUDIT LOG ──────────────────────────────── */}
            {activeSection === 'audit' && <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}><IconAudit /> Audit Log</span>
                <span className={styles.countBadge}>Page {auditPage}</span>
              </div>

              {loadingAudit ? (
                <div className={styles.skeletonCol}>
                  {[1,2,3,4,5].map(i => <div key={i} className={styles.skeleton} style={{ height: 48 }} />)}
                </div>
              ) : auditLog.length === 0 ? (
                <p className={styles.empty}>No audit records on this page.</p>
              ) : (
                <>
                  <div className={styles.tableWrap}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Time</th>
                          <th>User ID</th>
                          <th>Action</th>
                          <th>Table</th>
                          <th>Target ID</th>
                        </tr>
                      </thead>
                      <tbody>
                        {auditLog.map(log => (
                          <tr key={log.audit_id}>
                            <td className={styles.tdMeta}>
                              {log.action_time
                                ? new Date(log.action_time).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                : '—'}
                            </td>
                            <td className={styles.tdMeta}>{log.user_id ?? '—'}</td>
                            <td><span className={styles.actionChip}>{log.action}</span></td>
                            <td className={styles.tdMeta}>{log.target_table ?? '—'}</td>
                            <td className={styles.tdMeta}>{log.target_id ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.pagination}>
                    <button className={styles.pageBtn}
                      onClick={() => fetchAudit(auditPage - 1)}
                      disabled={auditPage === 1 || loadingAudit}>
                      <IconChevron dir="left" /> Prev
                    </button>
                    <span className={styles.pageNum}>Page {auditPage}</span>
                    <button className={styles.pageBtn}
                      onClick={() => fetchAudit(auditPage + 1)}
                      disabled={auditLog.length < 20 || loadingAudit}>
                      Next <IconChevron dir="right" />
                    </button>
                  </div>
                </>
              )}
            </section>}

          </div>
        </div>
      </main>
    </div>
  );
}