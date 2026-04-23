'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    password: '', confirm: '',
  });
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState(false);

  const set = (key) => (e) => {
    setError('');
    setForm(p => ({ ...p, [key]: e.target.value }));
  };

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8)           s++;
    if (/[A-Z]/.test(p))         s++;
    if (/[0-9]/.test(p))         s++;
    if (/[^A-Za-z0-9]/.test(p))  s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', '#E11D48', '#D97706', '#5B21B6', '#059669'][strength];

  const validateStep1 = () => {
    if (!form.first_name.trim()) { setError('First name is required.'); return false; }
    if (!form.last_name.trim())  { setError('Last name is required.');  return false; }
    if (!form.email.includes('@')) { setError('Enter a valid email address.'); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return false; }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return false; }
    return true;
  };

  const handleNext = (e) => {
    e.preventDefault();
    if (validateStep1()) { setError(''); setStep(2); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep2()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username:     form.email.split('@')[0],
          first_name:   form.first_name.trim(),
          last_name:    form.last_name.trim(),
          email:        form.email.trim().toLowerCase(),
          password:     form.password,
          role_id:      3,
          phone_number: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Registration failed.');
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.root}>
        <div className={styles.formSide}>
          <div className={styles.wordmark}>
            <div className={styles.wordmarkDot} />
            <span>Fatigue Tracker</span>
          </div>
          <div className={styles.formBody}>
            <div className={styles.successIcon}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h1 className={styles.heading}>You're in.</h1>
            <p className={styles.sub}>
              {form.email.endsWith('nust.edu.pk')
                ? 'Your account is ready. If your email is on the 14C whitelist, you\'ve been placed in that cohort.'
                : 'Your account is ready. You\'ve been registered as a General student.'}
            </p>
            <a href="/login" className={styles.submitBtn} style={{ textDecoration: 'none' }}>
              Go to Sign In →
            </a>
          </div>
          <p className={styles.formFooter}>Spring 2026 · All data encrypted at rest</p>
        </div>
        <div className={styles.infoSide}>
          <h2 className={styles.infoHeading}>Student<br />Wellness<br />Platform.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.root}>

      <div className={styles.formSide}>
        <div className={styles.wordmark}>
          <div className={styles.wordmarkDot} />
          <span>Fatigue Tracker</span>
        </div>

        <div className={styles.formBody}>
          <h1 className={styles.heading}>Create account</h1>
          <p className={styles.sub}>Takes under a minute.</p>

          {/* Step indicator */}
          <div className={styles.stepRow}>
            <div className={`${styles.stepItem} ${step >= 1 ? styles.stepActive : ''}`}>
              <div className={styles.stepCircle}>{step > 1 ? '✓' : '1'}</div>
              <span>Your info</span>
            </div>
            <div className={styles.stepLine} />
            <div className={`${styles.stepItem} ${step >= 2 ? styles.stepActive : ''}`}>
              <div className={styles.stepCircle}>2</div>
              <span>Password</span>
            </div>
          </div>

          {/* ── Step 1 ── */}
          {step === 1 && (
            <form onSubmit={handleNext} className={styles.form} noValidate>
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label className={styles.label}>First Name</label>
                  <input className={styles.input} type="text"
                    placeholder="Sara" value={form.first_name}
                    onChange={set('first_name')} required />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Last Name</label>
                  <input className={styles.input} type="text"
                    placeholder="Ahmed" value={form.last_name}
                    onChange={set('last_name')} required />
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <input className={styles.input} type="email"
                  placeholder="you@students.nust.edu.pk"
                  value={form.email} onChange={set('email')} required />
                <span className={styles.hint}>Use your NUST email if you're in the 14C cohort</span>
              </div>

              {error && <ErrorBox msg={error} />}

              <button type="submit" className={styles.submitBtn}>
                Continue →
              </button>
            </form>
          )}

          {/* ── Step 2 ── */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              <div className={styles.field}>
                <label className={styles.label}>Password</label>
                <div className={styles.passWrap}>
                  <input className={styles.input}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Minimum 6 characters"
                    value={form.password} onChange={set('password')} required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                    <EyeIcon open={showPass} />
                  </button>
                </div>
                {form.password && (
                  <div className={styles.strengthRow}>
                    <div className={styles.strengthTrack}>
                      {[1,2,3,4].map(i => (
                        <div key={i} className={styles.strengthSeg}
                          style={{ background: i <= strength ? strengthColor : '#e5e1ee' }} />
                      ))}
                    </div>
                    <span className={styles.strengthLabel} style={{ color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Confirm Password</label>
                <div className={styles.passWrap}>
                  <input className={styles.input}
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={form.confirm} onChange={set('confirm')} required />
                  <button type="button" className={styles.eyeBtn} onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                    <EyeIcon open={showConfirm} />
                  </button>
                </div>
                {form.confirm && form.password !== form.confirm && (
                  <span className={styles.mismatchHint}>Passwords don't match</span>
                )}
                {form.confirm && form.password === form.confirm && form.confirm.length > 0 && (
                  <span className={styles.matchHint}>✓ Passwords match</span>
                )}
              </div>

              {error && <ErrorBox msg={error} />}

              <button type="submit" className={styles.submitBtn} disabled={loading}>
                {loading ? <><span className={styles.spinner} /> Creating account…</> : 'Create Account →'}
              </button>

              <button type="button" className={styles.backBtn} onClick={() => { setStep(1); setError(''); }}>
                ← Back
              </button>
            </form>
          )}

          <div className={styles.registerRow}>
            Already have an account? <a href="/login" className={styles.registerLink}>Sign in</a>
          </div>
        </div>

        <p className={styles.formFooter}>Spring 2026 · All data encrypted at rest</p>
      </div>

      <div className={styles.infoSide}>
        <h2 className={styles.infoHeading}>Student<br />Wellness<br />Platform.</h2>
      </div>

    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className={styles.errorBox}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {msg}
    </div>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}