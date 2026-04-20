'use client';

import React, { useState, useEffect } from 'react';
import styles from './page.module.css';

const AUTH_TOKEN = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjo0LCJyb2xlIjoiRkFDVUxUWSIsImV4cCI6MTc3Njc4Njc1Nn0.5hxdd0U7FyJInfNAWmYEQPTHoCWYXvZn7LbLoVxXvJg";

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

const IconCalendar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);

export default function FacultyDashboard() {
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredWeek, setHoveredWeek] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch('/api/faculty/stats', { headers: { 'Authorization': AUTH_TOKEN } });
        const statsData = await statsRes.json();
        setStats(statsData.latest_stats);

        const historyRes = await fetch('/api/faculty/stats/history', { headers: { 'Authorization': AUTH_TOKEN } });
        const historyData = await historyRes.json();
        setHistory(historyData.history || []);
      } catch (err) {
        console.error("Fetch failed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getTrendColor = (trend) => {
    switch (trend?.toUpperCase()) {
      case 'INCREASING': return '#E11D48'; 
      case 'DECREASING': return '#059669'; 
      default: return '#7C3AED'; 
    }
  };

  if (loading) return <div className={styles.loading}>Initializing Anonymized Stream...</div>;

  const IconShield = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );

  return (
    <div className={styles.container}>
      <header className={styles.topBar}>
        <div className={styles.brand}>
          <span className={styles.appName}>Fatigue Tracker <span className={styles.roleTag}>Faculty</span></span>
        </div>
        <div className={styles.headerInfo}>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.workspace}>
            <section className={styles.card}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionHeading}>Cohort Pulse</div>
                <span className={styles.anonymizedBadge}>ANONYMIZED</span>
              </div>
              
              {stats ? (
                <div className={styles.pulseCentered}>
                  <div className={styles.pulseMain}>
                    <div className={styles.statCircle} style={{ borderColor: getTrendColor(stats.trend_label) }}>
                      <span className={styles.statVal}>{stats.avg_stress?.toFixed(1)}</span>
                      <span className={styles.statLabel}>Avg Stress</span>
                    </div>
                    <div className={styles.pulseContent}>
                      <div className={styles.trendBadge} style={{ backgroundColor: getTrendColor(stats.trend_label) }}>
                        {stats.trend_label} DIRECTION
                      </div>
                      <p className={styles.pulseDesc}>
                        Current aggregate cohort fatigue is <strong>{stats.trend_label.toLowerCase()}</strong>. This metric reflects the average physiological and academic signal from {stats.student_count} registered students.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={styles.empty}>No cohort data computed for this window.</div>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.sectionHeading}>Longitudinal Stress Wave</div>
              <div className={styles.chartWrapper}>
                {history.length > 0 ? (
                  <div className={styles.svgContainer}>
                    <svg viewBox="0 0 1000 240" className={styles.lineChart}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path 
                        d={`M 0 240 ${[...history].reverse().map((h, i) => `L ${(i * (1000/(history.length-1)))} ${240 - (h.avg_stress * 24)}`).join(' ')} L 1000 240 Z`} 
                        fill="url(#areaGradient)" 
                      />
                      <path 
                        d={`M 0 ${240 - (history[history.length-1]?.avg_stress * 24)} ${[...history].reverse().map((h, i) => `L ${(i * (1000/(history.length-1)))} ${240 - (h.avg_stress * 24)}`).join(' ')}`} 
                        fill="none" 
                        stroke="#7C3AED" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                        className={styles.drawPath}
                      />
                      {[...history].reverse().map((h, i) => (
                        <g key={h.stat_id} 
                           className={styles.dataGroup} 
                           onMouseEnter={() => setHoveredWeek(h)}
                           onMouseLeave={() => setHoveredWeek(null)}>
                          <circle 
                            cx={i * (1000/(history.length-1))} 
                            cy={240 - (h.avg_stress * 24)} 
                            r="6" 
                            fill={h.avg_stress > 7 ? "#E11D48" : "#fff"}
                            stroke="#7C3AED"
                            strokeWidth="3"
                            style={{ cursor: 'pointer' }}
                          />
                          {h.avg_stress > 7 && (
                            <circle 
                              cx={i * (1000/(history.length-1))} 
                              cy={240 - (h.avg_stress * 24)} 
                              r="12" 
                              fill="none"
                              stroke="#E11D48"
                              strokeWidth="2"
                              className={styles.peakGlow}
                            />
                          )}
                        </g>
                      ))}
                    </svg>

                    {hoveredWeek && (
                      <div className={styles.floatingTooltip} style={{ left: '50%', transform: 'translateX(-50%)' }}>
                        <div className={styles.tooltipDate}>{new Date(hoveredWeek.week_start).toLocaleDateString()}</div>
                        <div className={styles.tooltipVal}>Average Stress: <strong>{hoveredWeek.avg_stress}</strong></div>
                        <div className={styles.tooltipContext}>Trend: {hoveredWeek.trend_label}</div>
                      </div>
                    )}

                    <div className={styles.chartLegend}>
                      {[...history].reverse().map((h, i) => (
                        <div key={i} className={styles.legendItem}>Week {i+1}</div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={styles.empty}>Cohort baseline initializing...</div>
                )}
                <div className={styles.thresholdLine} style={{ bottom: '70%', '--fill': '#E11D48' }}>
                  <span className={styles.thresholdText}>Clinical Intervention Threshold (7.0)</span>
                </div>
              </div>
              <p className={styles.chartNote}>Wave peaks indicate periods of high aggregate cognitive load. Faculty should monitor red nodes as indicators for adaptive curriculum adjustment.</p>
            </section>

            <section className={`${styles.card} ${styles.guidelinesCard}`}>
              <div className={styles.sectionHeading}>Clinical Guidelines for Faculty</div>
              <div className={styles.guidelinesGrid}>
                <div className={styles.guideItem}>
                  <div className={styles.guideIcon}><IconCalendar /></div>
                  <div className={styles.guideContent}>
                    <h4>Syllabus Flexibility</h4>
                    <p>During "Increasing" trend phases, consider extending soft deadlines for non-critical assignments.</p>
                  </div>
                </div>
                <div className={styles.guideItem}>
                  <div className={styles.guideIcon}><IconTrendingUp /></div>
                  <div className={styles.guideContent}>
                    <h4>Peak Mitigation</h4>
                    <p>If the Wave crosses 7.0, a cohort-wide "Recovery Window" (24-48h reduced load) is recommended.</p>
                  </div>
                </div>
                <div className={styles.guideItem}>
                  <div className={styles.guideIcon}><IconShield /></div>
                  <div className={styles.guideContent}>
                    <h4>Privacy Assurance</h4>
                    <p>You cannot see individual student data. Focus on adjusting group-level academic overhead.</p>
                  </div>
                </div>
              </div>
            </section>

            <footer className={styles.disclaimer}>
              <p>PRIVACY NOTICE: Secure anonymized aggregation enabled. Data sourced from encrypted student kinetic and academic logs. Faculty access is limited to cohort-level trends only.</p>
            </footer>
        </div>
      </main>
    </div>
  );
}

