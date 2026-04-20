'use client';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';

export default function Home() {
  const router = useRouter();

  return (
    <div className={styles.landingContainer}>
      <div className={styles.landingCard}>
        <div className={styles.landingLogo} />
        <h1 className={styles.landingTitle}>Fatigue Tracker</h1>
        <p className={styles.landingSubtitle}>Smart Student Mental Fatigue &amp; Adaptive Workload Tracker</p>
        <p className={styles.landingInstitution}>NUST SEECS · 14C Cohort</p>
        <div className={styles.landingActions}>
          <button className={styles.landingBtn} onClick={() => router.push('/counselor')}>
            Counselor Dashboard
          </button>
          <button className={styles.landingBtnSecondary} onClick={() => router.push('/faculty')}>
            Faculty Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
