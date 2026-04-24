'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

export default function LandingPage() {
  const [stress, setStress] = useState(6);
  const emojis = ['😌','😊','😐','😟','😣','😰','😫','😤','😵','🤯'];

  return (
    <div className={styles.root}>
      {/* ── Navbar ── */}
      <nav className={styles.nav}>
        <div className={styles.logo}>Fatigue Tracker</div>
        <div className={styles.navRight}>
          <a href="/login" className={styles.loginBtn}>Log In</a>
          <a href="/register" className={styles.getStartedBtn}>Get Started Free</a>
        </div>
      </nav>

      {/* ── Hero Content ── */}
      <main className={styles.hero}>
        
        <div className={styles.headlineWrap}>
          <h1 className={styles.headline}>Student Wellness Platform.</h1>
          <p className={styles.subtitle}>Because your mental health comes first.</p>
        </div>

        {/* Mockups centerpiece */}
        <div className={styles.mockupContainer}>
          
          {/* Left: Counselor Workspace */}
          <BrowserMockup title="Counselor Workspace" className={styles.leftCard}>
            <div className={styles.sectionHeading}>Clinical Status</div>
            <div className={styles.briRingWrap}>
              <svg viewBox="0 0 120 120" className={styles.briSvg}>
                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--track-violet)" strokeWidth="12" />
                <circle cx="60" cy="60" r="50" fill="none"
                  stroke="#7C3AED" strokeWidth="12"
                  strokeDasharray="210 314" strokeLinecap="round"
                />
              </svg>
              <div className={styles.briCenter}>
                <span className={styles.briBig}>67</span>
                <span className={styles.briSub}>BRI SCORE</span>
              </div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricTop}><span>Stress</span><span>6.2</span></div>
              <div className={styles.metricTrack}><div className={styles.metricFill} style={{ width: '62%' }} /></div>
            </div>
            <div className={styles.metricItem}>
              <div className={styles.metricTop}><span>Workload</span><span>78%</span></div>
              <div className={styles.metricTrack}><div className={styles.metricFill} style={{ width: '78%' }} /></div>
            </div>
          </BrowserMockup>

          {/* Center: Student Log (Interactive Emoji Slider) */}
          <BrowserMockup title="Student Log" className={styles.centerCard}>
            <div className={styles.sectionHeading}>Log Stress Level</div>
            <div style={{ margin: '20px 0' }}>
              <div className={styles.emojiRow}>
                {emojis.map((em, i) => (
                  <span key={i} className={styles.emojiItem} style={{
                    fontSize: (stress === i + 1) ? '32px' : '20px',
                    opacity: (stress === i + 1) ? 1 : 0.2,
                    transform: (stress === i + 1) ? 'translateY(-4px)' : 'none'
                  }}>{em}</span>
                ))}
              </div>
              <input 
                type="range" 
                className={styles.slider} 
                min="1" max="10" 
                value={stress} 
                onChange={(e) => setStress(Number(e.target.value))}
              />
              <p style={{ textAlign: 'center', fontSize: '12px', fontWeight: 600, color: '#5B21B6', marginTop: '10px' }}>
                LEVEL {stress} · {stress > 7 ? 'CRITICAL' : stress > 4 ? 'MODERATE' : 'STABLE'}
              </p>
            </div>
            <button className={styles.submitBtn}>Submit Stress Log</button>
            <div style={{ marginTop: '24px' }}>
              <div className={styles.sectionHeading}>Recent History</div>
              <div style={{ display: 'flex', gap: '4px', height: '40px', alignItems: 'flex-end' }}>
                {[4,6,8,5,7,9,6].map((v, i) => (
                  <div key={i} style={{ flex: 1, height: `${v*10}%`, background: v > 7 ? '#E11D48' : '#5B21B6', borderRadius: '2px' }} />
                ))}
              </div>
            </div>
          </BrowserMockup>

          {/* Right: Faculty Portal */}
          <BrowserMockup title="Faculty Portal" className={styles.rightCard}>
            <div className={styles.sectionHeading}>Cohort Pulse</div>
            <div className={styles.pulseMain}>
              <div className={styles.statCircle}>
                <span className={styles.statVal}>7.4</span>
                <span className={styles.statLabel}>AVG STRESS</span>
              </div>
              <div className={styles.trendBadge}>STABLE DIRECTION</div>
              <p className={styles.pulseDesc}>
                Aggregate cohort fatigue is holding steady. Monitor peaks for adaptive load adjustment.
              </p>
              <div style={{ width: '100%', marginTop: '16px' }}>
                <div className={styles.sectionHeading}>Wave Peak</div>
                <div style={{ height: '30px', background: 'var(--track-violet)', borderRadius: '6px', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: '0', top: '50%', width: '100%', height: '1px', background: '#E11D48', opacity: 0.2 }} />
                  <div style={{ position: 'absolute', left: '65%', top: '25%', width: '8px', height: '8px', background: '#E11D48', borderRadius: '50%', boxShadow: '0 0 10px #E11D48' }} />
                </div>
              </div>
            </div>
          </BrowserMockup>

        </div>

        <button className={styles.heroCTA} onClick={() => window.location.href = '/register'}>
          Get Started Free
        </button>

      </main>
    </div>
  );
}

function BrowserMockup({ children, title, className }) {
  return (
    <div className={`${styles.mockup} ${className}`}>
      <div className={styles.mockupHeader}>
        <div className={styles.dots}>
          <span /> <span /> <span />
        </div>
        <div className={styles.mockupTitle}>{title}</div>
      </div>
      <div className={styles.mockupBody}>
        {children}
      </div>
    </div>
  );
}