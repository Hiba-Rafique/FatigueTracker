'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

const API_HOST = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
const BASE = `http://${API_HOST}:8000`;

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Invalid email or password.');
        return;
      }
      const role = data.role_id?.toUpperCase();
      if      (role === 'STUDENT')   window.location.href = '/student';
      else if (role === 'COUNSELOR') window.location.href = '/counselor';
      else if (role === 'FACULTY')   window.location.href = '/faculty';
      else if (role === 'ADMIN')     window.location.href = '/admin';
      else                           window.location.href = '/';
    } catch {
      setError('Could not connect to the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.root}>

      <div className={styles.formSide}>
        <div className={styles.wordmark}>
          <div className={styles.wordmarkDot} />
          <span>Fatigue Tracker</span>
        </div>

        <div className={styles.formBody}>
          <h1 className={styles.heading}>Sign in</h1>
          <p className={styles.sub}>NUST SEECS · Student Wellness Platform</p>

          <form onSubmit={handleLogin} className={styles.form} noValidate>
            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                className={styles.input}
                type="email"
                placeholder="you@students.nust.edu.pk"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <div className={styles.passWrap}>
                <input
                  className={styles.input}
                  type={showPass ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button type="button" className={styles.eyeBtn} onClick={() => setShowPass(p => !p)} tabIndex={-1}>
                  <EyeIcon open={showPass} />
                </button>
              </div>
            </div>

            {error && (
              <div className={styles.errorBox}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <button type="submit" className={styles.submitBtn} disabled={loading}>
              {loading ? <><span className={styles.spinner} /> Signing in…</> : 'Sign in →'}
            </button>
          </form>

          <div className={styles.registerRow}>
            New here? <a href="/register" className={styles.registerLink}>Create an account</a>
          </div>
        </div>

        <p className={styles.formFooter}>Spring 2026 · All data encrypted at rest</p>
      </div>

      <div className={styles.infoSide}>
        <h2 className={styles.infoHeading}>
          Student<br />Wellness<br />Platform.
        </h2>
      </div>

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