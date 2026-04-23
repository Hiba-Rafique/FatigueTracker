'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';

// ── All requests use credentials:'include' so the httpOnly cookie is sent automatically
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
const IconOverview = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
  </svg>
);
const IconLogs = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
  </svg>
);
const IconStar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconBell = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/>
  </svg>
);
const IconUser = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
const IconLock = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconLogout = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconList = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
    <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
  </svg>
);

// ── Helpers ──────────────────────────────────────────────────
const getBriColor = (score) => {
  if (score >= 85) return '#E11D48';
  if (score >= 65) return '#D97706';
  if (score >= 40) return '#5B21B6';
  return '#059669';
};
const getBriLabel = (score) => {
  if (score >= 85) return 'CRITICAL';
  if (score >= 65) return 'WARNING';
  if (score >= 40) return 'WATCH';
  return 'HEALTHY';
};
const getBriBg = (score) => {
  if (score >= 85) return '#FDE8EE';
  if (score >= 65) return '#FFFBEB';
  if (score >= 40) return '#EDE9FE';
  return '#D1FAE5';
};
const getTrendColor = (trend) => {
  switch (trend?.toUpperCase()) {
    case 'DETERIORATING': return '#E11D48';
    case 'VOLATILE':      return '#D97706';
    case 'IMPROVING':     return '#059669';
    default:              return '#5B21B6';
  }
};
const recTypeConfig = {
  CONTACT_COUNSELOR: { label: 'Contact Counselor', color: '#E11D48', bg: '#FDE8EE' },
  DEFER_TASK:        { label: 'Defer Task',         color: '#D97706', bg: '#FFFBEB' },
  REST:              { label: 'Rest',               color: '#5B21B6', bg: '#EDE9FE' },
  RESOURCE:          { label: 'Resource',           color: '#059669', bg: '#D1FAE5' },
};
const priorityLabel = { 1: 'Low', 2: 'Medium', 3: 'High' };
const priorityColor = { 1: '#059669', 2: '#D97706', 3: '#E11D48' };

// ── Component ────────────────────────────────────────────────
export default function StudentDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  // 'form' | 'history' toggle inside the logs tab
  const [logMode,   setLogMode]   = useState('form');
  const [logType,   setLogType]   = useState('stress');

  const [dashboard,       setDashboard]       = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [notifications,   setNotifications]   = useState([]);
  const [benchmarking,    setBenchmarking]    = useState(null);
  const [counselorStatus, setCounselorStatus] = useState(null);

  // History data — fetched from dashboard endpoint (tasks) and stress_history from counselor detail
  // For stress & activity we use the dashboard metrics + show a mini history via re-fetch
  const [stressHistory,   setStressHistory]   = useState([]);  // filled from counselor student detail if available, else empty
  const [allTasks,        setAllTasks]        = useState([]);  // full task history from backend
  const [activityHistory, setActivityHistory] = useState([]);  // recent activity logs from backend

  const [loading,         setLoading]         = useState(true);
  const [submitting,      setSubmitting]       = useState(false);
  const [updatingTask,    setUpdatingTask]     = useState(null); // task_id being updated
  const [toast,           setToast]           = useState(null);

  // Forms
  const [stressForm,   setStressForm]   = useState({ stress_level: 5, note: '' });
  const [taskForm,     setTaskForm]     = useState({ title: '', effort_hours: '', deadline: '', priority_weight: 2 });
  const [activityForm, setActivityForm] = useState({ activity_name: '', category: 'FITNESS', duration_hours: '', energy_cost: '' });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // ── Fetch dashboard ───────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    try {
      const res  = await api('/api/student/dashboard');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await parseJsonSafe(res);
      setDashboard(data);
    } catch (e) { console.error('dashboard fetch failed', e); }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await api('/api/student/tasks');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) {
        // Backward-compatible fallback if /student/tasks is unavailable on server.
        const dashRes = await api('/api/student/dashboard');
        if (!dashRes.ok) throw new Error('Failed to load task history');
        const dashData = await parseJsonSafe(dashRes);
        setAllTasks(dashData?.upcoming_tasks || []);
        return;
      }
      const data = await parseJsonSafe(res);
      setAllTasks(data?.tasks || []);
    } catch (e) { console.error('task fetch failed', e); }
  }, []);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await api('/api/student/activities?limit=30');
      if (res.status === 401) { window.location.href = '/login'; return; }
      if (!res.ok) throw new Error('Failed to load activity history');
      const data = await parseJsonSafe(res);
      setActivityHistory(data?.activities || []);
    } catch (e) { console.error('activity fetch failed', e); }
  }, []);

  const fetchCounselorStatus = useCallback(async () => {
    try {
      const res = await api('/api/student/counselor-status');
      if (res.status === 401) { window.location.href = '/login'; return; }
      const data = await parseJsonSafe(res);
      setCounselorStatus(data);
    } catch (e) { console.error('counselor-status fetch failed', e); }
  }, []);

  // ── Initial load ──────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const [dashRes, recsRes, notifRes, tasksRes, actsRes, csRes] = await Promise.all([
          api('/api/student/dashboard'),
          api('/api/student/recommendations'),
          api('/api/student/notifications'),
          api('/api/student/tasks'),
          api('/api/student/activities?limit=30'),
          api('/api/student/counselor-status'),
        ]);

        // 401 means cookie missing → go to login
        if (dashRes.status === 401) { window.location.href = '/login'; return; }

        const [dashData, recsData, notifData, tasksData, actsData, csData] = await Promise.all([
          parseJsonSafe(dashRes),
          parseJsonSafe(recsRes),
          parseJsonSafe(notifRes),
          parseJsonSafe(tasksRes),
          parseJsonSafe(actsRes),
          parseJsonSafe(csRes),
        ]);

        setDashboard(dashData);
        setAllTasks(tasksRes.ok ? (tasksData?.tasks || []) : (dashData?.upcoming_tasks || []));
        setRecommendations(recsData);
        setNotifications(notifData?.notifications || []);
        setActivityHistory(actsRes.ok ? (actsData?.activities || []) : []);
        setCounselorStatus(csData);

        // Benchmarking — 403 if not 14C
        const bRes = await api('/api/student/benchmarking');
        if (bRes.ok) setBenchmarking(await bRes.json());
      } catch (e) {
        console.error('Init fetch failed', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // ── Submit stress ─────────────────────────────────────────
  const submitStress = async () => {
    setSubmitting(true);
    try {
      const res = await api('/api/student/logs/stress', {
        method: 'POST',
        body: JSON.stringify(stressForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast('Stress log submitted! BRI will update shortly.');
      setStressForm({ stress_level: 5, note: '' });
      // Re-fetch dashboard so BRI + metrics refresh
      await Promise.all([fetchDashboard(), fetchTasks(), fetchActivities()]);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Submit task ───────────────────────────────────────────
  const submitTask = async () => {
    setSubmitting(true);
    try {
      const res = await api('/api/student/logs/task', {
        method: 'POST',
        body: JSON.stringify({
          ...taskForm,
          effort_hours:    taskForm.effort_hours ? Number(taskForm.effort_hours) : null,
          priority_weight: Number(taskForm.priority_weight),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast('Task added!');
      setTaskForm({ title: '', effort_hours: '', deadline: '', priority_weight: 2 });
      await Promise.all([fetchDashboard(), fetchTasks(), fetchActivities()]);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Update task status ────────────────────────────────────
  const updateTaskStatus = async (taskId, status) => {
    setUpdatingTask(taskId);
    try {
      const res = await api(`/api/student/logs/task/${taskId}`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast(`Task marked as ${status.toLowerCase()}`);
      await Promise.all([fetchDashboard(), fetchTasks(), fetchActivities()]);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setUpdatingTask(null); }
  };

  // ── Submit activity ───────────────────────────────────────
  const submitActivity = async () => {
    setSubmitting(true);
    try {
      const res = await api('/api/student/logs/activity', {
        method: 'POST',
        body: JSON.stringify({
          ...activityForm,
          duration_hours: Number(activityForm.duration_hours),
          energy_cost:    Number(activityForm.energy_cost),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed');
      showToast('Activity logged! This will lower your BRI.');
      setActivityForm({ activity_name: '', category: 'FITNESS', duration_hours: '', energy_cost: '' });
      await Promise.all([fetchDashboard(), fetchTasks(), fetchActivities()]);
    } catch (e) { showToast(e.message, 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Request counselor ─────────────────────────────────────
  const requestCounselor = async () => {
    setSubmitting(true);
    try {
      const res  = await api('/api/student/request-counselor', { method: 'POST' });
      const data = await parseJsonSafe(res);
      if (!res.ok) throw new Error(data?.detail || 'Request failed');
      showToast(data?.message || 'Request submitted!');
      await fetchCounselorStatus();
    } catch { showToast('Request failed', 'error'); }
    finally { setSubmitting(false); }
  };

  // ── Logout ────────────────────────────────────────────────
  const handleLogout = async () => {
    // Ask backend to clear the cookie
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  // ── Loading ───────────────────────────────────────────────
  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loadingSpinner} />
      <span>Loading your dashboard...</span>
    </div>
  );

  const metrics     = dashboard?.metrics;
  const unreadCount = notifications.filter(n => !n.is_read).length;
  const unlockDays  = 7;
  const streakPct   = Math.min(((metrics?.log_streak || 0) / unlockDays) * 100, 100);
  const pendingTasks = allTasks.filter(t => {
    if ((t.status || '').toUpperCase() !== 'PENDING') return false;
    if (!t.deadline) return true;
    const due = new Date(t.deadline);
    if (Number.isNaN(due.getTime())) return true;
    due.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return due >= today;
  });

  const tabs = [
    { id: 'overview',        label: 'Overview',        icon: <IconOverview /> },
    { id: 'logs',            label: 'Log Activity',    icon: <IconLogs /> },
    { id: 'recommendations', label: 'Recommendations', icon: <IconStar /> },
    { id: 'notifications',   label: 'Notifications',   icon: <IconBell />, badge: unreadCount },
    ...(benchmarking ? [{ id: 'benchmarking', label: 'Benchmarking', icon: <IconChart /> }] : []),
  ];

  // ── Render ────────────────────────────────────────────────
  return (
    <div className={styles.container}>

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
            Fatigue Tracker <span className={styles.roleTag}>Student</span>
          </span>
        </div>
        <div className={styles.topRight}>
          {metrics && (
            <div className={styles.briPill} style={{
              background:  getBriBg(metrics.bri_score),
              color:       getBriColor(metrics.bri_score),
              borderColor: `${getBriColor(metrics.bri_score)}50`,
            }}>
              <span className={styles.briDot} style={{ background: getBriColor(metrics.bri_score) }} />
              BRI {metrics.bri_score} · {getBriLabel(metrics.bri_score)}
            </div>
          )}
          <button className={styles.logoutBtn} title="Logout" onClick={handleLogout}>
            <IconLogout />
          </button>
        </div>
      </header>

      {/* Tab Nav */}
      <nav className={styles.tabNav}>
        {tabs.map(tab => (
          <button key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}>
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge > 0 && <span className={styles.tabBadge}>{tab.badge}</span>}
          </button>
        ))}
      </nav>

      <main className={styles.main}>
        <div className={styles.workspaceWrapper}>
          <div className={styles.workspace}>

            {/* ══ OVERVIEW ══════════════════════════════════ */}
            {activeTab === 'overview' && (
              <>
                <div className={styles.overviewTop}>
                  {/* BRI Ring */}
                  <div className={styles.briCard}>
                    <p className={styles.sectionHeading}>Burnout Risk Index</p>
                    <div className={styles.briRingWrap}>
                      <svg viewBox="0 0 120 120" className={styles.briSvg}>
                        <circle cx="60" cy="60" r="50" fill="none" stroke="var(--track-violet)" strokeWidth="11" />
                        <circle cx="60" cy="60" r="50" fill="none"
                          stroke={getBriColor(metrics?.bri_score || 0)}
                          strokeWidth="11"
                          strokeDasharray={`${((metrics?.bri_score || 0) / 100) * 314} 314`}
                          strokeLinecap="round"
                          transform="rotate(-90 60 60)"
                          style={{ transition: 'stroke-dasharray 1s ease' }}
                        />
                      </svg>
                      <div className={styles.briCenter}>
                        <span className={styles.briBig}>{metrics?.bri_score ?? 0}</span>
                        <span className={styles.briSub}>/ 100</span>
                      </div>
                    </div>
                    <div className={styles.briStatusChip} style={{
                      background:  getBriBg(metrics?.bri_score || 0),
                      color:       getBriColor(metrics?.bri_score || 0),
                      borderColor: `${getBriColor(metrics?.bri_score || 0)}40`,
                    }}>
                      {getBriLabel(metrics?.bri_score || 0)}
                    </div>
                    <div className={styles.trendChip} style={{
                      background: `${getTrendColor(metrics?.trend_label)}15`,
                      color:       getTrendColor(metrics?.trend_label),
                    }}>
                      {metrics?.trend_label || 'STABLE'} TREND
                    </div>
                  </div>

                  {/* Metric bars */}
                  <div className={styles.metricsCol}>
                    <p className={styles.sectionHeading}>Current Metrics</p>
                    {[
                      { label: 'Avg Stress',       val: metrics?.stress_avg           || 0, max: 10, decimals: 1 },
                      { label: 'Workload Score',    val: metrics?.workload_score        || 0, max: 50 },
                      { label: 'Activity Score',    val: metrics?.activity_score        || 0, max: 20 },
                      { label: 'Consec. High Days', val: metrics?.consecutive_high_days || 0, max: 7  },
                    ].map(({ label, val, max, decimals }) => (
                      <div key={label} className={styles.metricItem}>
                        <div className={styles.metricTop}>
                          <span className={styles.metricLabel}>{label}</span>
                          <span className={styles.metricVal}>
                            {decimals ? Number(val).toFixed(decimals) : val}
                            <span className={styles.metricMax}> / {max}</span>
                          </span>
                        </div>
                        <div className={styles.metricTrack}>
                          <div className={styles.metricFill} style={{ width: `${Math.min((val / max) * 100, 100)}%` }} />
                        </div>
                      </div>
                    ))}
                    <div className={styles.streakRow}>
                      <div className={styles.streakTile}>
                        <span className={styles.streakNum}>{metrics?.log_streak ?? 0}</span>
                        <span className={styles.streakLabel}>Day Streak</span>
                      </div>
                      <div className={styles.streakTile}>
                        <span className={styles.streakNum} style={{ fontSize: '14px' }}>
                          {metrics?.last_log_date
                            ? new Date(metrics.last_log_date).toLocaleDateString('en-PK', { month: 'short', day: 'numeric' })
                            : 'None'}
                        </span>
                        <span className={styles.streakLabel}>Last Log</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recommendation engine unlock progress */}
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.sectionHeading}>Recommendation Engine</span>
                    <span className={styles.statusChip} style={
                      metrics?.recommendation_status === 'UNLOCKED'
                        ? { background: '#D1FAE5', color: '#065F46', borderColor: '#6EE7B7' }
                        : { background: 'var(--track-violet)', color: 'var(--text-muted)', borderColor: 'var(--border-nav)' }
                    }>
                      {metrics?.recommendation_status || 'LOCKED'}
                    </span>
                  </div>
                  {metrics?.recommendation_status === 'UNLOCKED' ? (
                    <p className={styles.cardDesc}>
                      Recommendations unlocked! Head to the <strong>Recommendations</strong> tab.
                    </p>
                  ) : (
                    <div className={styles.unlockWrap}>
                      <p className={styles.cardDesc}>
                        Log consistently for <strong>{unlockDays} days</strong> to unlock personalized recommendations. Current streak: <strong>{metrics?.log_streak ?? 0} days</strong>
                      </p>
                      <div className={styles.progressTrack}>
                        <div className={styles.progressFill} style={{ width: `${streakPct}%` }} />
                      </div>
                      <span className={styles.progressLabel}>{metrics?.log_streak ?? 0} / {unlockDays} days</span>
                    </div>
                  )}
                </section>

                {/* Upcoming tasks */}
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.sectionHeading}>Upcoming Tasks</span>
                    <span className={styles.countBadge}>{pendingTasks.length} pending</span>
                  </div>
                  {pendingTasks.length === 0 ? (
                    <p className={styles.empty}>No pending tasks. Add one in Log Activity.</p>
                  ) : (
                    <div className={styles.taskList}>
                      {pendingTasks.map(t => (
                        <div key={t.task_id} className={styles.taskRow}>
                          <div className={styles.taskDot} style={{ background: priorityColor[t.priority_weight] || '#5B21B6' }} />
                          <div className={styles.taskInfo}>
                            <span className={styles.taskTitle}>{t.title}</span>
                            {t.deadline && (
                              <span className={styles.taskDeadline}>
                                Due {new Date(t.deadline).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                          {t.effort_hours && <span className={styles.taskEffort}>{t.effort_hours}h</span>}
                          <div className={styles.taskActions}>
                            <button className={styles.taskActionBtn} style={{ color: '#059669' }}
                              disabled={updatingTask === t.task_id}
                              onClick={() => updateTaskStatus(t.task_id, 'COMPLETED')}>
                              ✓ Done
                            </button>
                            <button className={styles.taskActionBtn} style={{ color: '#D97706' }}
                              disabled={updatingTask === t.task_id}
                              onClick={() => updateTaskStatus(t.task_id, 'DEFERRED')}>
                              → Defer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Counselor request */}
                <section className={`${styles.card} ${styles.counselorCard}`}>
                  <div className={styles.counselorRow}>
                    <div>
                      <p className={styles.sectionHeading}>Need Support?</p>
                      <p className={styles.cardDesc}>
                        {counselorStatus?.status === 'ASSIGNED'
                          ? `Assigned counselor: ${counselorStatus?.counselor?.name || '—'}`
                          : counselorStatus?.status === 'REQUESTED'
                            ? `Request submitted${counselorStatus?.request_date ? ` on ${new Date(counselorStatus.request_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}. You’ll be assigned automatically.`
                            : 'Request a counselor — the system assigns whoever has the lowest current caseload automatically.'}
                      </p>
                    </div>
                    <button
                      className={styles.requestBtn}
                      onClick={requestCounselor}
                      disabled={submitting || counselorStatus?.status === 'REQUESTED' || counselorStatus?.status === 'ASSIGNED'}
                      title={counselorStatus?.status === 'ASSIGNED'
                        ? 'Counselor already assigned'
                        : counselorStatus?.status === 'REQUESTED'
                          ? 'Request already submitted'
                          : 'Request counselor'}
                    >
                      <IconUser /> {counselorStatus?.status === 'ASSIGNED'
                        ? 'Assigned'
                        : counselorStatus?.status === 'REQUESTED'
                          ? 'Requested'
                          : 'Request Counselor'}
                    </button>
                  </div>
                </section>
              </>
            )}

            {/* ══ LOG ACTIVITY ══════════════════════════════ */}
            {activeTab === 'logs' && (
              <>
                {/* Log type switcher */}
                <div className={styles.logSwitcher}>
                  {['stress', 'task', 'activity'].map(type => (
                    <button key={type}
                      className={`${styles.logSwitchBtn} ${logType === type ? styles.logSwitchActive : ''}`}
                      onClick={() => { setLogType(type); setLogMode('form'); }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Form / History toggle */}
                <div className={styles.modeToggle}>
                  <button className={`${styles.modeBtn} ${logMode === 'form'    ? styles.modeBtnActive : ''}`} onClick={() => setLogMode('form')}>
                    <IconPlus /> Add New
                  </button>
                  <button className={`${styles.modeBtn} ${logMode === 'history' ? styles.modeBtnActive : ''}`} onClick={() => setLogMode('history')}>
                    <IconList /> View History
                  </button>
                </div>

                {/* ── STRESS ── */}
                {logType === 'stress' && logMode === 'form' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Log Stress Level</span>
                      <span className={styles.countBadge}>Today's entry</span>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>
                        Stress Level — <strong style={{ color: getBriColor(stressForm.stress_level * 10) }}>{stressForm.stress_level}</strong> / 10
                      </label>
                      <input type="range" min="1" max="10" value={stressForm.stress_level}
                        onChange={e => setStressForm(p => ({ ...p, stress_level: Number(e.target.value) }))}
                        className={styles.slider} />
                      <div className={styles.sliderTicks}>
                        {[1,2,3,4,5,6,7,8,9,10].map(n => (
                          <span key={n} style={{ opacity: stressForm.stress_level === n ? 1 : 0.3,
                            fontWeight: stressForm.stress_level === n ? 700 : 400 }}>{n}</span>
                        ))}
                      </div>
                      <div className={styles.emojiRow}>
                        {['😌','😊','😐','😟','😣','😰','😫','😤','😵','🤯'].map((em, i) => (
                          <span key={i} style={{
                            fontSize:   stressForm.stress_level === i + 1 ? '26px' : '18px',
                            opacity:    stressForm.stress_level === i + 1 ? 1 : 0.2,
                            transition: 'all 0.2s',
                          }}>{em}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.formLabel}>Note (optional)</label>
                      <textarea className={styles.textarea} rows={3}
                        placeholder="What's on your mind? Exam stress, deadlines, personal issues..."
                        value={stressForm.note}
                        onChange={e => setStressForm(p => ({ ...p, note: e.target.value }))} />
                    </div>
                    <button className={styles.primaryBtn} onClick={submitStress} disabled={submitting}>
                      {submitting ? 'Submitting...' : 'Submit Stress Log'}
                    </button>
                  </section>
                )}

                {logType === 'stress' && logMode === 'history' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Stress Summary</span>
                    </div>
                    <div className={styles.historyInfo}>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal}>{metrics?.stress_avg?.toFixed(1) ?? '—'}</span>
                        <span className={styles.historyStatLabel}>Current Avg Stress</span>
                      </div>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal}>{metrics?.consecutive_high_days ?? 0}</span>
                        <span className={styles.historyStatLabel}>Consecutive High Days</span>
                      </div>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal}>{metrics?.log_streak ?? 0}</span>
                        <span className={styles.historyStatLabel}>Current Streak</span>
                      </div>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal} style={{ fontSize: '16px' }}>
                          {metrics?.last_log_date
                            ? new Date(metrics.last_log_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })
                            : 'None'}
                        </span>
                        <span className={styles.historyStatLabel}>Last Logged</span>
                      </div>
                    </div>
                    <p className={styles.formHint}>
                      Detailed stress log history is visible to your assigned counselor. Your current aggregate metrics are shown above.
                    </p>
                  </section>
                )}

                {/* ── TASK ── */}
                {logType === 'task' && logMode === 'form' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Add Task</span>
                      <span className={styles.countBadge}>Updates workload score</span>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup} style={{ flex: 2 }}>
                        <label className={styles.formLabel}>Task Title *</label>
                        <input className={styles.input} type="text" placeholder="e.g. Submit DB Assignment"
                          value={taskForm.title}
                          onChange={e => setTaskForm(p => ({ ...p, title: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Effort (hours)</label>
                        <input className={styles.input} type="number" min="0" placeholder="3"
                          value={taskForm.effort_hours}
                          onChange={e => setTaskForm(p => ({ ...p, effort_hours: e.target.value }))} />
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Deadline</label>
                        <input className={styles.input} type="date"
                          value={taskForm.deadline}
                          onChange={e => setTaskForm(p => ({ ...p, deadline: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Priority</label>
                        <select className={styles.select}
                          value={taskForm.priority_weight}
                          onChange={e => setTaskForm(p => ({ ...p, priority_weight: Number(e.target.value) }))}>
                          <option value={1}>Low</option>
                          <option value={2}>Medium</option>
                          <option value={3}>High</option>
                        </select>
                      </div>
                    </div>
                    <button className={styles.primaryBtn} onClick={submitTask}
                      disabled={submitting || !taskForm.title}>
                      {submitting ? 'Adding...' : 'Add Task'}
                    </button>
                  </section>
                )}

                {logType === 'task' && logMode === 'history' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Task History</span>
                      <span className={styles.countBadge}>{allTasks.length} tasks</span>
                    </div>
                    {allTasks.length === 0 ? (
                      <p className={styles.empty}>No tasks yet. Add one from the form tab.</p>
                    ) : (
                      <div className={styles.taskList}>
                        {allTasks.map(t => (
                          <div key={t.task_id} className={styles.taskRow}>
                            <div className={styles.taskDot} style={{ background: priorityColor[t.priority_weight] || '#5B21B6' }} />
                            <div className={styles.taskInfo}>
                              <span className={styles.taskTitle}>{t.title}</span>
                              <span className={styles.taskDeadline}>
                                {priorityLabel[t.priority_weight] || 'Medium'} priority
                                {t.status ? ` · ${t.status}` : ''}
                                {t.deadline ? ` · Due ${new Date(t.deadline).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}
                                {t.effort_hours ? ` · ${t.effort_hours}h effort` : ''}
                              </span>
                            </div>
                            <div className={styles.taskActions}>
                              <button className={styles.taskActionBtn} style={{ color: '#059669' }}
                                disabled={updatingTask === t.task_id}
                                onClick={() => updateTaskStatus(t.task_id, 'COMPLETED')}>
                                ✓ Done
                              </button>
                              <button className={styles.taskActionBtn} style={{ color: '#D97706' }}
                                disabled={updatingTask === t.task_id}
                                onClick={() => updateTaskStatus(t.task_id, 'DEFERRED')}>
                                → Defer
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                )}

                {/* ── ACTIVITY ── */}
                {logType === 'activity' && logMode === 'form' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Log Activity</span>
                      <span className={styles.countBadge}>Lowers your BRI</span>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup} style={{ flex: 2 }}>
                        <label className={styles.formLabel}>Activity Name *</label>
                        <input className={styles.input} type="text" placeholder="e.g. Morning Run"
                          value={activityForm.activity_name}
                          onChange={e => setActivityForm(p => ({ ...p, activity_name: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Category</label>
                        <select className={styles.select}
                          value={activityForm.category}
                          onChange={e => setActivityForm(p => ({ ...p, category: e.target.value }))}>
                          {['FITNESS','SPORTS','SOCIAL','ENTERTAINMENT','OTHER'].map(c => (
                            <option key={c}>{c}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className={styles.formRow}>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Duration (hours) *</label>
                        <input className={styles.input} type="number" min="0" max="24" placeholder="1"
                          value={activityForm.duration_hours}
                          onChange={e => setActivityForm(p => ({ ...p, duration_hours: e.target.value }))} />
                      </div>
                      <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Energy Cost (1–5) *</label>
                        <input className={styles.input} type="number" min="1" max="5" placeholder="3"
                          value={activityForm.energy_cost}
                          onChange={e => setActivityForm(p => ({ ...p, energy_cost: e.target.value }))} />
                      </div>
                    </div>
                    <p className={styles.formHint}>Higher activity score = lower BRI. Log physical activity daily to keep burnout risk down.</p>
                    <button className={styles.primaryBtn} onClick={submitActivity}
                      disabled={submitting || !activityForm.activity_name || !activityForm.duration_hours || !activityForm.energy_cost}>
                      {submitting ? 'Logging...' : 'Log Activity'}
                    </button>
                  </section>
                )}

                {logType === 'activity' && logMode === 'history' && (
                  <section className={styles.card}>
                    <div className={styles.cardHeader}>
                      <span className={styles.sectionHeading}>Activity Summary</span>
                      <span className={styles.countBadge}>{activityHistory.length} logs</span>
                    </div>
                    <div className={styles.historyInfo}>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal}>{metrics?.activity_score ?? 0}</span>
                        <span className={styles.historyStatLabel}>Current Activity Score</span>
                      </div>
                      <div className={styles.historyStatTile}>
                        <span className={styles.historyStatVal}>{metrics?.activity_score >= 10 ? '✓' : '✗'}</span>
                        <span className={styles.historyStatLabel}>Above Baseline (10)</span>
                      </div>
                    </div>
                    {activityHistory.length === 0 ? (
                      <p className={styles.empty}>No activity logs yet. Add one from the form tab.</p>
                    ) : (
                      <div className={styles.taskList}>
                        {activityHistory.map(a => (
                          <div key={a.activity_id} className={styles.taskRow}>
                            <div className={styles.taskInfo}>
                              <span className={styles.taskTitle}>{a.activity_name}</span>
                              <span className={styles.taskDeadline}>
                                {a.category ? `${a.category}` : 'OTHER'}
                                {a.duration_hours != null ? ` · ${a.duration_hours}h` : ''}
                                {a.energy_cost != null ? ` · energy ${a.energy_cost}` : ''}
                                {a.log_date ? ` · ${new Date(a.log_date).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' })}` : ''}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className={styles.metricItem}>
                      <div className={styles.metricTop}>
                        <span className={styles.metricLabel}>Activity Score</span>
                        <span className={styles.metricVal}>{metrics?.activity_score ?? 0}<span className={styles.metricMax}> / 20</span></span>
                      </div>
                      <div className={styles.metricTrack}>
                        <div className={styles.metricFill} style={{ width: `${Math.min(((metrics?.activity_score || 0) / 20) * 100, 100)}%`, background: 'linear-gradient(90deg, #059669, #34D399)' }} />
                      </div>
                    </div>
                    <p className={styles.formHint}>Activity score is computed from your recent logs. Keep it above 10 to significantly reduce your BRI.</p>
                  </section>
                )}
              </>
            )}

            {/* ══ RECOMMENDATIONS ═══════════════════════════ */}
            {activeTab === 'recommendations' && (
              <>
                {recommendations?.status === 'LOCKED' ? (
                  <div className={styles.lockedState}>
                    <div className={styles.lockIconWrap}><IconLock /></div>
                    <h2 className={styles.lockedTitle}>Recommendations Locked</h2>
                    <p className={styles.lockedDesc}>
                      {recommendations.message || `Log consistently for ${unlockDays} days to unlock personalized recommendations.`}
                    </p>
                    <div className={styles.progressTrack} style={{ maxWidth: '300px', margin: '0 auto' }}>
                      <div className={styles.progressFill} style={{ width: `${streakPct}%` }} />
                    </div>
                    <span className={styles.progressLabel}>{metrics?.log_streak ?? 0} / {unlockDays} days logged</span>
                  </div>
                ) : (
                  <>
                    <div className={styles.tabPageTitle}>Your Recommendations</div>
                    {(recommendations?.recommendations || []).length === 0 ? (
                      <section className={styles.card}>
                        <p className={styles.empty}>No active recommendations right now. Keep logging!</p>
                      </section>
                    ) : (
                      (recommendations?.recommendations || []).map(rec => {
                        const cfg = recTypeConfig[rec.type] || { label: rec.type, color: '#5B21B6', bg: '#EDE9FE' };
                        return (
                          <div key={rec.recommendation_id} className={styles.recCard}
                            style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}>
                            <div className={styles.recHeader}>
                              <span className={styles.recTypeChip} style={{ color: cfg.color, background: `${cfg.color}20` }}>
                                {cfg.label}
                              </span>
                              <span className={styles.recDate}>
                                {rec.created_at ? new Date(rec.created_at).toLocaleDateString('en-PK', { day: 'numeric', month: 'short' }) : ''}
                              </span>
                            </div>
                            <p className={styles.recMessage}>{rec.message}</p>
                            <div className={styles.recFooter}>
                              <span className={styles.recBy}>Generated by {rec.generated_by}</span>
                              <span className={styles.recCheckIcon}><IconCheck /></span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </>
                )}
              </>
            )}

            {/* ══ NOTIFICATIONS ═════════════════════════════ */}
            {activeTab === 'notifications' && (
              <>
                <div className={styles.tabPageTitle}>Notifications</div>
                {notifications.length === 0 ? (
                  <section className={styles.card}>
                    <p className={styles.empty}>No notifications yet.</p>
                  </section>
                ) : (
                  notifications.map(n => (
                    <div key={n.notification_id}
                      className={`${styles.notifCard} ${!n.is_read ? styles.notifUnread : ''}`}>
                      <div className={styles.notifHeader}>
                        <span className={styles.notifType}>{n.type}</span>
                        <span className={styles.notifDate}>
                          {n.sent_at ? new Date(n.sent_at).toLocaleString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <p className={styles.notifMsg}>{n.message}</p>
                      {!n.is_read && <div className={styles.unreadDot} />}
                    </div>
                  ))
                )}
              </>
            )}

            {/* ══ BENCHMARKING ══════════════════════════════ */}
            {activeTab === 'benchmarking' && benchmarking && (
              <>
                <div className={styles.tabPageTitle}>14C Peer Benchmarking</div>
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.sectionHeading}>Your Standing in the 14C Cohort</span>
                    <span className={styles.cohortBadge}>14C EXCLUSIVE</span>
                  </div>
                  <p className={styles.cardDesc}>Lower percentile = less fatigued than your peers. That's a good thing!</p>
                  <div className={styles.benchGrid}>
                    {[
                      { label: 'Your BRI Score',  val: benchmarking.bri_score,             pct: benchmarking.bri_percentile,    color: getBriColor(benchmarking.bri_score) },
                      { label: 'Your Avg Stress', val: benchmarking.stress_avg?.toFixed(1), pct: benchmarking.stress_percentile, color: '#E11D48' },
                    ].map(({ label, val, pct, color }) => (
                      <div key={label} className={styles.benchTile}>
                        <div className={styles.benchVal} style={{ color }}>{val}</div>
                        <div className={styles.benchLabel}>{label}</div>
                        <div className={styles.benchTrack}>
                          <div className={styles.benchFill} style={{ width: `${pct}%`, background: color }} />
                        </div>
                        <span className={styles.benchPct}>{pct}th percentile</span>
                      </div>
                    ))}
                  </div>
                  <p className={styles.formHint}>{benchmarking.note}</p>
                </section>
              </>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}