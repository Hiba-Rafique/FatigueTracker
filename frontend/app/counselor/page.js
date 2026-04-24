"use client";
import React, { useState, useEffect, useRef } from 'react';
import styles from './page.module.css';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE = `http://${API_HOST}:8000`;
const api = (path, opts = {}) =>
  fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts.headers },
  });

// Violet Icons
const IconHome = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
const IconUsers = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>;
const IconLogOut = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;
const IconBell = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconTask = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/></svg>;

export default function CounselorDashboard() {
  const [students, setStudents] = useState([]);
  const [activeStudent, setActiveStudent] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const [recMsg, setRecMsg] = useState("");
  const [recType, setRecType] = useState("REST");
  const [toast, setToast] = useState(null);
  const prevAlertCount = useRef(0);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleLogout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  const fetchDetails = async (sid) => {
    try {
      const response = await api(`/api/counselor/students/${sid}`);
      const data = await response.json();
      setDetails(data);
      if (data.open_alerts?.length > prevAlertCount.current) {
        new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3").play().catch(() => {});
      }
      prevAlertCount.current = data.open_alerts?.length || 0;
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api('/api/counselor/students');
        const data = await response.json();
        setStudents(data.students || []);
        const preferred = (data.students || []).find(s => s.student_id === 5 || s.student_id === "5") || data.students?.[0];
        setActiveStudent(preferred);
        if (preferred) fetchDetails(preferred.student_id);
      } catch (err) { setLoading(false); }
    };
    fetchStudents();
  }, []);

  useEffect(() => {
    if (!activeStudent) return;
    fetchDetails(activeStudent.student_id);
    const interval = setInterval(() => fetchDetails(activeStudent.student_id), 30000);
    return () => clearInterval(interval);
  }, [activeStudent]);

  const handleResolve = async (alertId) => {
    await api(`/api/counselor/alerts/${alertId}/resolve`, { method: 'PUT' });
    setDetails(prev => ({ ...prev, open_alerts: prev.open_alerts.filter(a => a.alert_id !== alertId) }));
  };

  const handleRecommend = async () => {
    if (!recMsg) return showToast("Clinical notes required.", "error");
    try {
      const res = await api('/api/counselor/recommend', {
        method: 'POST',
        body: JSON.stringify({ student_id: activeStudent.student_id, recommend_type: recType, message: recMsg })
      });
      if (!res.ok) throw new Error("Failed");
      
      setShowModal(false);
      setRecMsg("");
      showToast("Intervention strategy deployed.");
    } catch (err) {
      showToast("Deployment failed.", "error");
    }
  };

  const getRingColor = (score) => {
    if (score > 70) return '#E11D48';
    return '#7C3AED';
  };

  const getBadgeStyle = (label) => {
    switch (label?.toUpperCase()) {
      case 'DETERIORATING': return { bg: '#FDE8EE', text: '#9B1239', border: '#FDA4AF' };
      case 'CRITICAL': return { bg: '#FFF0F3', text: '#9B1239', border: '#FDA4AF' };
      case 'STABLE': return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' };
      default: return { bg: '#EDE4FA', text: '#6D28D9', border: '#B09EE0' };
    }
  };

  const formatId = (id) => `Student-${id}`;

  return (
    <div className={styles.container} onClick={() => setShowNotifications(false)}>
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.msg}
        </div>
      )}
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.appName}>Fatigue Tracker</span>
        </div>
        <nav className={styles.topNav}>
          
          <div className={styles.bellContainer} onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); }}>
            <div className={styles.navIcon} style={{ color: 'var(--text-secondary)' }}><IconBell /></div>
            {details?.open_alerts?.length > 0 && <div className={styles.bellPing} />}
            {showNotifications && (
              <div className={styles.popover} onClick={(e) => e.stopPropagation()}>
                <div className={styles.popoverHeader}>System alerts ({details.open_alerts.length})</div>
                <div className={styles.popoverList}>
                  {details.open_alerts.map(a => {
                    const color = a.alert_level === 'CRITICAL' ? '#E11D48' : '#D97706';
                    return (
                      <div key={a.alert_id} className={styles.alertCard} style={{ 
                        '--tier-color': color,
                        borderLeftColor: color,
                        borderColor: a.alert_level === 'CRITICAL' ? '#FECDD3' : '#FDE68A',
                        background: a.alert_level === 'CRITICAL' ? '#FFF1F3' : '#FFFBEB',
                        color: color
                      }}>
                        <div className={styles.alertContent}>
                          <div className={styles.alertLevel}>{a.alert_level}</div>
                          <div className={styles.alertSubject}>{formatId(activeStudent.student_id)}</div>
                        </div>
                        <button className={styles.resolveBtnAction} onClick={(e) => { e.stopPropagation(); handleResolve(a.alert_id); }}>Resolve</button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <div style={{ width: 2, height: 16, background: 'var(--border-nav)' }} />
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <IconLogOut />
          </button>
        </nav>
      </header>

      <div className={styles.bodyLayout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarHeader}><span className={styles.sidebarLabel}>Assigned Students</span></div>
          <div className={styles.roster}>
            {students.map(s => {
              const isCrit = s.bri_score > 60;
              return (
                <div key={s.student_id} className={`${styles.studentRow} ${activeStudent?.student_id === s.student_id ? styles.studentRowActive : ''}`} onClick={() => setActiveStudent(s)}>
                  <span className={styles.studentId}>{formatId(s.student_id)}</span>
                  <span className={styles.scoreBadge} style={{ 
                    background: isCrit ? '#FDE8EE' : '#D1FAE5', 
                    color: isCrit ? '#9B1239' : '#065F46'
                  }}>{s.bri_score}</span>
                </div>
              )
            })}
          </div>
        </aside>

        <main className={styles.main}>
          {activeStudent && details ? (
          <div className={styles.workspaceWrapper} key={activeStudent.student_id}>
            <div className={styles.workspace}>
            <header className={styles.header}>
              <div className={styles.titleGroup}>
                <h1 className={styles.pageTitle}>{formatId(activeStudent.student_id)}</h1>
                {(() => {
                  const b = getBadgeStyle(details.metrics?.trend_label);
                  return <span className={styles.statusChip} style={{ background: b.bg, color: b.text, borderColor: b.border }}>{details.metrics?.trend_label || 'STABLE'}</span>;
                })()}
              </div>
              <div className={styles.headerActions}>
                <button className={styles.compactActionBtn} onClick={() => setShowModal(true)}>
                   Add Recommendation
                </button>
              </div>
            </header>

            <div key={activeStudent?.student_id} className={styles.sections}>
              <section className={styles.card}>
                <div className={styles.sectionHeading}>Clinical Status</div>
                <div className={styles.clinicalMain}>
                  <div className={styles.metricsGroup}>
                    <div className={styles.metricItem} style={{ '--fill-width': `${(details.metrics?.stress_avg || 0) * 10}%` }}>
                      <p className={styles.metricLabel}>Stress</p>
                      <p className={styles.metricVal}>{details.metrics?.stress_avg || 0}</p>
                      <div className={styles.meterTrack}><div className={styles.meterFill} /></div>
                    </div>
                  </div>

                  <div className={styles.briCenter}>
                    <div className={styles.briRingLarge} style={{ borderColor: getRingColor(details.metrics?.bri_score || 0) }}>
                      <span className={styles.briLabelHeader}>BRI</span>
                      <span className={styles.briValueLarge}>{details.metrics?.bri_score || 0}</span>
                    </div>
                    <div className={`${styles.metricItem} ${styles.workloadUnderBRI}`} style={{ '--fill-width': `${details.metrics?.workload_score || 0}%` }}>
                      <p className={styles.metricLabel}>Workload</p>
                      <p className={styles.metricVal}>{details.metrics?.workload_score || 0}%</p>
                      <div className={styles.meterTrack}><div className={styles.meterFill} /></div>
                    </div>
                  </div>

                  <div className={styles.metricsGroup}>
                    <div className={styles.metricItem} style={{ '--fill-width': `${details.metrics?.activity_score || 0}%` }}>
                      <p className={styles.metricLabel}>Activity</p>
                      <p className={styles.metricVal}>{details.metrics?.activity_score || 0}%</p>
                      <div className={styles.meterTrack}><div className={styles.meterFill} /></div>
                    </div>
                  </div>
                </div>
                <p className={styles.clinicalNoteFooter}>
                  {details.metrics?.bri_score > 70 ? "Critical threshold violation. Deploy mandatory intervention script." : "Clinical markers within longitudinal norm. Monitoring continuous."}
                </p>
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeading}>Interactive stress history</div>
                <div className={styles.chartContainer}>
                  {[...(details.stress_history || [])].reverse().map((h, i) => (
                    <div key={i} className={styles.barWrapper}>
                      <div className={styles.tooltip}>{h.date.split(' ')[0]}: <strong>{h.level}</strong></div>
                      <div className={styles.bar} style={{ 
                        height: `${h.level * 10}%`, 
                        backgroundColor: h.level > 7 ? '#E11D48' : '#5B21B6',
                        opacity: 0.85
                      }} />
                      <span className={styles.barLabel}>
                        {h.date.split('-')[2]?.split(' ')[0] || i+1}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeading}>Academic overhead</div>
                <div className={styles.taskList}>
                  {details.pending_tasks?.map(t => (
                    <div key={t.task_id} className={styles.taskItem}>
                      <div className={styles.taskInfo}>
                        <div className={styles.taskIcon}><IconTask /></div>
                        <span className={styles.taskTitle}>{t.title}</span>
                      </div>
                      <div className={styles.taskMeta}>
                        <span className={styles.taskDeadline}>Due: {t.deadline}</span>
                        <span className={styles.taskEffort}>{t.effort_hours}h overhead</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className={styles.card}>
                <div className={styles.sectionHeading}>Behavioral patterns</div>
                <div className={styles.patternGrid}>
                  {details.patterns && details.patterns.length > 0 ? (
                    details.patterns.map((p, idx) => (
                      <div key={idx} className={styles.patternBox} style={{ marginBottom: idx === details.patterns.length - 1 ? 0 : 16 }}>
                        <div className={styles.patternContent}>
                          <p className={styles.patternTitle}>{p.category.replace(/_/g, ' ')}</p>
                          <p className={styles.patternStatus}>
                            Frequency: {p.frequency} incidents · Avg Severity: {p.severity?.toFixed(1) || 'N/A'}
                          </p>
                          <p className={styles.patternSummaryText}>{p.summary}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className={styles.patternBox}>
                         <div className={styles.patternContent}>
                           <p className={styles.patternTitle}>Longitudinal Pattern Detection</p>
                           <p className={styles.patternStatus}>
                             {details.days_logged >= 30 
                               ? "Analyzing: Processing 30+ Day Baseline..." 
                               : `Initializing: Insufficient Baseline Data (${details.days_logged}/30 Days)`}
                           </p>
                           <div className={styles.patternProgress}>
                             <div className={styles.patternFill} style={{ width: `${Math.min((details.days_logged / 30) * 100, 100)}%` }} />
                           </div>
                         </div>
                      </div>
                      <div className={styles.patternMessage}>
                        {details.days_logged >= 30 
                          ? "The system has gathered sufficient baseline data and is currently running the weekly pattern recognition job. Results will appear here shortly."
                          : "Clinical pattern recognition is currently calibrating. Behavioral subject insights require a minimum 30-day continuous data baseline to adjust for individual variance and detect statistically significant anomalies."}
                      </div>
                    </>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
        ) : null}
        </main>
      </div>

      {showModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>Deploy Intervention</h2>
            <p className={styles.modalDesc}>Select a clinical strategy to push to {formatId(activeStudent.student_id)}'s dashboard.</p>
            
            <select className={styles.input} value={recType} onChange={e => setRecType(e.target.value)}>
              <option value="REST">Mandatory Clinical Rest</option>
              <option value="DEFER_TASK">Academic Workload Deferral</option>
              <option value="CONTACT_COUNSELOR">One-on-One Clinical Session</option>
              <option value="RESOURCE">Wellness Resource Assignment</option>
            </select>
            
            <textarea className={styles.input} style={{ height: 100, resize: 'none' }} placeholder="Clinical reasoning..." value={recMsg} onChange={e => setRecMsg(e.target.value)} />
            
            <div className={styles.modalActions}>
              <button className={styles.deployBtn} onClick={handleRecommend}>Deploy to Subject</button>
              <button className={styles.cancelBtn} onClick={() => setShowModal(false)}>Discard</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
