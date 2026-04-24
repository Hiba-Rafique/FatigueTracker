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

const IconUsers = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const IconTrendingUp = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconLogOut = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>;

const IconHeart = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.84-8.84 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;

const FriendlyAdvisorLiner = ({ stress, trend }) => {
  const { text, color } = getFriendlyLinerData(stress, trend);
  
  return (
    <div className={styles.friendlyLinerContainer}>
      <div 
        className={styles.friendlyLinerBox} 
        style={{ 
          borderLeftColor: color,
          animation: `${styles.fadeIn} 0.4s ease-in-out`
        }}
      >
        <span className={styles.eyebrowLabel}>This week's recommendation</span>
        <div className={styles.linerHeader}>
          <span className={styles.linerIcon} style={{ color: color }}><IconHeart /></span>
          <p className={styles.linerText} style={{ color: stress > 6.0 ? color : '#2D2159' }}>{text}</p>
        </div>
      </div>
    </div>
  );
};

const getFriendlyLinerData = (stress, trend) => {
  const isIncreasing = trend === 'INCREASING';
  
  if (stress > 7.0) {
    return {
      text: "The cohort is really struggling right now, even a small deadline extension could make a big difference.",
      color: "#E11D48"
    };
  }
  if (stress >= 6.0 && isIncreasing) {
    return {
      text: "Students are feeling the pressure this week, consider nudging a non-critical deadline forward by a day.",
      color: "#F43F5E"
    };
  }
  if (stress >= 5.0 && isIncreasing) {
    return {
      text: "Stress is slowly climbing, worth checking if multiple deadlines are piling up on the same day.",
      color: "#7C3AED" 
    };
  }
  if (stress >= 5.0) {
    return {
      text: "Stress is moderate but holding steady, maybe go easy on surprise assessments this week.",
      color: "#7C3AED" 
    };
  }
  return {
    text: "Your cohort is in great shape this week, a perfect time to push new material.",
    color: "#7C3AED" 
  };
};

export default function FacultyDashboard() {
  const [history, setHistory] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(null);
  const [dailyData, setDailyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  const handleLogout = async () => {
    try { await api('/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = '/login';
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const historyRes = await api('/api/faculty/stats/history');
        const historyData = await historyRes.json();
        const rawHistory = historyData.history || [];
        setHistory(rawHistory);
        if (rawHistory.length > 0) {
          const latest = rawHistory[0];
          setSelectedWeek(latest);
        }
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!selectedWeek) return;
    const fetchDaily = async () => {
      try {
        const res = await api(`/api/faculty/stats/week/${selectedWeek.week_start.split(' ')[0]}`);
        const data = await res.json();
        setDailyData(data.daily_breakdown || []);
      } catch (err) {
        console.error("Daily fetch failed", err);
      }
    };
    fetchDaily();
  }, [selectedWeek]);

  const getTrendColor = (trend) => {
    switch (trend?.toUpperCase()) {
      case 'INCREASING': return '#E11D48'; 
      case 'DECREASING': return '#059669'; 
      default: return '#7C3AED'; 
    }
  };

  const getRiskStyle = (stress) => {
    if (stress >= 7) return { label: 'CRITICAL RISK', color: '#9B1239', bg: '#FDE8EE', border: '#E11D48' };
    if (stress >= 5) return { label: 'ELEVATED LOAD', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D' };
    return { label: 'STABLE COHORT', color: '#065F46', bg: '#D1FAE5', border: '#6EE7B7' };
  };

  if (loading) return (
    <div className={styles.loadingScreen}>
      <div className={styles.loader} />
      <p className={styles.loadingText}>Syncing Anonymized Stream...</p>
    </div>
  );

  const chartData = dailyData.length > 0 ? dailyData : [];
  const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <div className={styles.logo} />
          <span className={styles.appName}>Fatigue Tracker <span className={styles.roleTag}>Faculty</span></span>
        </div>
        <div className={styles.topRight}>
          <div className={styles.anonymityStatus}>
            <div className={styles.shieldIcon}><IconShield /></div>
            SECURE AGGREGATION ENABLED
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Logout">
            <IconLogOut />
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.workspaceWrapper}>
          <div className={styles.workspace}>
            
            {/* 0. Friendly Advisor Liner (Sticky Note style) */}
            {selectedWeek && (
              <FriendlyAdvisorLiner 
                key={selectedWeek.stat_id} 
                stress={selectedWeek.avg_stress} 
                trend={selectedWeek.trend_label} 
              />
            )}

            {/* 1. History Timeline Carousel */}
            <div className={styles.timelineSection}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionHeading}>Historical Pulse Timeline</span>
                <span className={styles.metaLabel}>{history.length} weeks of data</span>
              </div>
              <div className={styles.weekScroll}>
                {history.map((w, i) => (
                  <div 
                    key={w.stat_id} 
                    className={`${styles.weekCard} ${selectedWeek?.stat_id === w.stat_id ? styles.weekCardActive : ''}`}
                    onClick={() => setSelectedWeek(w)}
                  >
                    <span className={styles.weekLabel}>
                      {i === 0 ? 'CURRENT WEEK' : `WEEK OF ${new Date(w.week_start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                    <div className={styles.weekMiniStat}>
                      <span className={styles.miniStress}>{w.avg_stress.toFixed(1)}</span>
                      <div className={styles.trendIndicator} style={{ background: getTrendColor(w.trend_label) }}>
                        {w.trend_label === 'INCREASING' ? 'HIGH LOAD' : w.trend_label === 'DECREASING' ? 'RECOVERY' : 'STABLE'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {selectedWeek ? (
              <>
                {/* 2. Main Pulse Card */}
                <section className={styles.card}>
                  <div className={styles.cardInternal}>
                    <div className={styles.pulseGauge}>
                      <div className={styles.gaugeRing} style={{ borderColor: getTrendColor(selectedWeek.trend_label) }}>
                        <span className={styles.gaugeVal}>{selectedWeek.avg_stress.toFixed(1)}</span>
                        <span className={styles.gaugeLabel}>AVG STRESS</span>
                      </div>
                    </div>
                    
                    <div className={styles.pulseMetrics}>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Trend Velocity</span>
                        <div className={styles.trendDescriptor} style={{ color: getTrendColor(selectedWeek.trend_label), borderLeftColor: getTrendColor(selectedWeek.trend_label) }}>
                          {selectedWeek.trend_label === 'INCREASING' ? 'Aggregating Tension' : selectedWeek.trend_label === 'DECREASING' ? 'Load Dissipating' : 'Stable'}
                        </div>
                      </div>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Active Cohort</span>
                        <div className={styles.metricValue}>{selectedWeek.student_count} Students</div>
                      </div>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Academic Overhead</span>
                        <div className={styles.metricValue}>{selectedWeek.avg_workload?.toFixed(1) || '0.0'} pts</div>
                      </div>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Critical Cases</span>
                        <div className={styles.metricValue} style={{ 
                          color: selectedWeek.critical_count > 0 ? '#E11D48' : 'inherit',
                          fontWeight: selectedWeek.critical_count > 0 ? '800' : 'inherit'
                        }}>
                          {selectedWeek.critical_count} Students
                        </div>
                      </div>
                      <div className={styles.metricRow}>
                        <span className={styles.metricLabel}>Health Score</span>
                        <div className={styles.statusChip} style={{ 
                          color: getRiskStyle(selectedWeek.avg_stress).color,
                          background: getRiskStyle(selectedWeek.avg_stress).bg,
                          borderColor: getRiskStyle(selectedWeek.avg_stress).border
                        }}>
                          {getRiskStyle(selectedWeek.avg_stress).label}
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className={styles.cardFooter}>
                    Cohort-level pulse reflects aggregate academic and kinetic signals from the 14C section.
                  </p>
                </section>

                {/* 3. Stress Wave Chart */}
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionHeading}>Weekly Stress Wave</span>
                    <span className={styles.metaLabel}>DAILY AVERAGE</span>
                  </div>
                  <div className={styles.chartArea}>
                    <svg viewBox="0 0 1000 240" className={styles.lineChart}>
                      <defs>
                        <linearGradient id="waveGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {chartData.length > 0 && (
                        <>
                          <path 
                            d={`M 0 240 ${chartData.map((h, i) => `L ${i * (1000/(chartData.length-1))} ${240 - (h.avg_stress * 24)}`).join(' ')} L 1000 240 Z`} 
                            fill="url(#waveGrad)" 
                          />
                          <path 
                            d={`M 0 ${240 - (chartData[0].avg_stress * 24)} ${chartData.map((h, i) => `L ${i * (1000/(chartData.length-1))} ${240 - (h.avg_stress * 24)}`).join(' ')}`} 
                            fill="none" 
                            stroke="#7C3AED" 
                            strokeWidth="4" 
                            strokeLinecap="round" 
                            className={styles.drawPath}
                          />
                          <line x1="0" y1={240 - (7.0 * 24)} x2="1000" y2={240 - (7.0 * 24)} 
                                stroke="#E11D48" strokeWidth="2" strokeDasharray="6,4" opacity="0.6" />
                          {chartData.map((h, i) => {
                            const x = i * (1000/(chartData.length-1));
                            const y = 240 - (h.avg_stress * 24);
                            return (
                              <circle 
                                key={`stress-${h.date}`}
                                cx={x} 
                                cy={y} 
                                r="6"
                                fill="#fff"
                                stroke="#7C3AED"
                                strokeWidth="3"
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={() => setHoveredPoint({
                                  x, y,
                                  type: 'stress',
                                  label: 'Cohort Stress',
                                  value: h.avg_stress.toFixed(1),
                                  date: h.date,
                                  color: '#7C3AED'
                                })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            );
                          })}
                        </>
                      )}
                    </svg>
                    {hoveredPoint && hoveredPoint.type === 'stress' && (
                      <div 
                        className={styles.chartTooltip}
                        style={{ 
                          left: `${hoveredPoint.x / 10}%`, 
                          top: `${hoveredPoint.y - 70}px`,
                          borderLeftColor: hoveredPoint.color
                        }}
                      >
                        <div className={styles.tooltipHeader}>
                          <span className={styles.tooltipDate}>{new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className={styles.tooltipLabel}>{hoveredPoint.label}</span>
                        </div>
                        <div className={styles.tooltipValue} style={{ color: hoveredPoint.color }}>
                          {hoveredPoint.value}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.chartLabels}>
                    {days.map(d => <span key={d}>{d}</span>)}
                  </div>
                </section>

                {/* 4. Workload Wave Chart */}
                <section className={styles.card}>
                  <div className={styles.sectionHeader}>
                    <span className={styles.sectionHeading}>Weekly Workload Wave</span>
                    <span className={styles.metaLabel}>ESTIMATED OVERHEAD</span>
                  </div>
                  <div className={styles.chartArea}>
                    <svg viewBox="0 0 1000 240" className={styles.lineChart}>
                      <defs>
                        <linearGradient id="workloadGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.2" />
                          <stop offset="100%" stopColor="#6366F1" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {chartData.length > 0 && (
                        <>
                          <path 
                            d={`M 0 240 ${chartData.map((h, i) => `L ${i * (1000/(chartData.length-1))} ${240 - ((h.avg_workload || 0) * 6)}`).join(' ')} L 1000 240 Z`} 
                            fill="url(#workloadGrad)" 
                          />
                          <path 
                            d={`M 0 ${240 - ((chartData[0].avg_workload || 0) * 6)} ${chartData.map((h, i) => `L ${i * (1000/(chartData.length-1))} ${240 - ((h.avg_workload || 0) * 6)}`).join(' ')}`} 
                            fill="none" 
                            stroke="#6366F1" 
                            strokeWidth="4" 
                            strokeLinecap="round" 
                            className={styles.drawPath}
                          />
                          <line x1="0" y1={240 - (30.0 * 6)} x2="1000" y2={240 - (30.0 * 6)} 
                                stroke="#6366F1" strokeWidth="2" strokeDasharray="6,4" opacity="0.6" />
                          {chartData.map((h, i) => {
                            const x = i * (1000/(chartData.length-1));
                            const y = 240 - ((h.avg_workload || 0) * 6);
                            return (
                              <circle 
                                key={`workload-${h.date}`}
                                cx={x} 
                                cy={y} 
                                r="6"
                                fill="#fff"
                                stroke="#6366F1"
                                strokeWidth="3"
                                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                                onMouseEnter={() => setHoveredPoint({
                                  x, y,
                                  type: 'workload',
                                  label: 'Academic Load',
                                  value: h.avg_workload.toFixed(1),
                                  date: h.date,
                                  color: '#6366F1'
                                })}
                                onMouseLeave={() => setHoveredPoint(null)}
                              />
                            );
                          })}
                        </>
                      )}
                    </svg>
                    {hoveredPoint && hoveredPoint.type === 'workload' && (
                      <div 
                        className={styles.chartTooltip}
                        style={{ 
                          left: `${hoveredPoint.x / 10}%`, 
                          top: `${hoveredPoint.y - 70}px`,
                          borderLeftColor: hoveredPoint.color
                        }}
                      >
                        <div className={styles.tooltipHeader}>
                          <span className={styles.tooltipDate}>{new Date(hoveredPoint.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                          <span className={styles.tooltipLabel}>{hoveredPoint.label}</span>
                        </div>
                        <div className={styles.tooltipValue} style={{ color: hoveredPoint.color }}>
                          {hoveredPoint.value}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className={styles.chartLabels}>
                    {days.map(d => <span key={d}>{d}</span>)}
                  </div>
                </section>
              </>
            ) : null}

            {/* 4. Clinical Framework */}
            <section className={styles.guidelinesSection}>
              <div className={styles.guideBox}>
                <div className={styles.guideIcon}><IconTrendingUp /></div>
                <div className={styles.guideContent}>
                  <h3>Load Modulation</h3>
                  <p>In Increasing trend phases, faculty are advised to consider 48h deadline extensions for non-critical cohort tasks.</p>
                </div>
              </div>
              <div className={styles.guideBox}>
                <div className={styles.guideIcon}><IconUsers /></div>
                <div className={styles.guideContent}>
                  <h3>Privacy Assurance</h3>
                  <p>All data is strictly anonymized at the cohort level. No individual student PII is accessible through this dashboard.</p>
                </div>
              </div>
            </section>

            <footer className={styles.anonymityFooter}>
              <p>SECURE AGGREGATED VIEW · MATHEMATICALLY GUARANTEED ANONYMITY · SECURE CLOUD STORAGE</p>
            </footer>
          </div>
        </div>
      </main>
    </div>
  );
}

const IconShield = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
