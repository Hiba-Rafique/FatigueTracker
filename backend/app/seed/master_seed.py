import oracledb
import os
import datetime
import random
import bcrypt
from dotenv import load_dotenv

# Load DB credentials
load_dotenv()

USER = os.getenv("DB_USER", "fatigue_tracker")
PASSWORD = os.getenv("DB_PASSWORD", "fatigue123")
DSN = os.getenv("DB_DSN", "localhost:1521/XEPDB1")

def seed_database():
    try:
        conn = oracledb.connect(user=USER, password=PASSWORD, dsn=DSN)
        cursor = conn.cursor()
        
        print("🚀 Starting Master Seed Process (Direct Bcrypt Hashing)...")

        # ── 1. CLEAN EXISTING DATA ──────────────────────────────────
        # Order matters for foreign keys
        tables = [
            "NOTIFICATION_LOG", "AUDIT_LOG", "ALERT", "RECOMMENDATION", 
            "PATTERN_PROFILE", "COUNSELOR_STUDENT", "ACTIVITY_LOG", 
            "TASK_LOG", "STRESS_LOG", "STUDENT_METRICS", "STUDENT", 
            "USERS", "EMAIL_WHITELIST", "WEEKLY_SECTION_STATS", "SYSTEM_CONFIG"
        ]
        for table in tables:
            try:
                cursor.execute(f"DELETE FROM {table}")
            except:
                pass
        
        print("🧹 Cleaned existing data.")

        # ── 2. SYSTEM CONFIG ─────────────────────────────────────────
        cursor.execute("""
            INSERT INTO SYSTEM_CONFIG (config_id, bri_threshold_yellow, bri_threshold_red, pattern_window_days, academic_workload_limit)
            VALUES (1, 50, 75, 14, 30.0)
        """)
        
        whitelist_emails = [
            ('hiba.rafique@students.nust.edu.pk', '14C'),
            ('ahmed.raza@gmail.com', 'GENERAL'),
            ('zainab.ali@students.nust.edu.pk', '14C'),
            ('omar.farooq@gmail.com', '14C'),
            ('sara.khan@gmail.com', '14C'),
            ('bilal.nasir@gmail.com', '14C')
        ]
        for email, stype in whitelist_emails:
            cursor.execute("INSERT INTO EMAIL_WHITELIST (email, student_type) VALUES (:1, :2)", [email, stype])
        
        print("⚙️ System configuration and whitelist seeded.")

        # ── 3. USERS (Faculty, Counselor, Students) ──────────────────
        # IDs are managed by SEQ_USER_ID
        salt = bcrypt.gensalt()
        default_pwd = bcrypt.hashpw("fatigue123".encode('utf-8'), salt).decode('utf-8')
        
        users = [
            # ID 1: Counselor
            ('Dr. Sarah Jenkins', 'counselor@nust.edu.pk', default_pwd, 'COUNSELOR'),
            # ID 2: Faculty
            ('Prof. Michael Scott', 'faculty@nust.edu.pk', default_pwd, 'FACULTY'),
            # ID 3: Primary Student (14C)
            ('Hiba Rafique', 'hiba.rafique@students.nust.edu.pk', default_pwd, 'STUDENT'),
            # ID 4: Peer 1 (14C)
            ('Zainab Ali', 'zainab.ali@students.nust.edu.pk', default_pwd, 'STUDENT'),
            # ID 5: Peer 2 (14C)
            ('Omar Farooq', 'omar.farooq@gmail.com', default_pwd, 'STUDENT'),
            # ID 6: High Stress Case (14C)
            ('Sara Khan', 'sara.khan@gmail.com', default_pwd, 'STUDENT'),
            # ID 7: Stable Student (14C)
            ('Bilal Nasir', 'bilal.nasir@gmail.com', default_pwd, 'STUDENT'),
            # ID 8: General Student
            ('Ahmed Raza', 'ahmed.raza@gmail.com', default_pwd, 'STUDENT')
        ]
        
        user_id_map = {}
        for name, email, pwd, role in users:
            var_id = cursor.var(oracledb.NUMBER)
            cursor.execute("""
                INSERT INTO USERS (user_id, name, email, password_hash, role)
                VALUES (SEQ_USER_ID.NEXTVAL, :1, :2, :3, :4)
                RETURNING user_id INTO :5
            """, [name, email, pwd, role, var_id])
            uid = int(var_id.getvalue()[0])
            user_id_map[email] = uid
            
            if role == 'STUDENT':
                stype = next(x[1] for x in whitelist_emails if x[0] == email)
                cursor.execute("INSERT INTO STUDENT (student_id, student_type) VALUES (:1, :2)", [uid, stype])
                cursor.execute("INSERT INTO STUDENT_METRICS (metric_id, student_id) VALUES (SEQ_METRIC_ID.NEXTVAL, :1)", [uid])
                # Mark whitelist as used
                cursor.execute("UPDATE EMAIL_WHITELIST SET is_used = 1, student_id = :1 WHERE email = :2", [uid, email])

        counselor_id = user_id_map['counselor@nust.edu.pk']
        faculty_id = user_id_map['faculty@nust.edu.pk']
        
        print("👥 Users and roles established.")

        # ── 4. STUDENT LOGS (Stress, Tasks, Activities) ─────────────
        today = datetime.date.today()
        student_emails = [e for e, r in whitelist_emails]
        
        for email in student_emails:
            uid = user_id_map[email]
            is_14c = next(x[1] for x in whitelist_emails if x[0] == email) == '14C'
            
            # Generate 14 days of stress logs
            for i in range(14):
                log_date = today - datetime.timedelta(days=i)
                # Sara Khan is our "High Stress" case for testing Counselor view
                if email == 'sara.khan@gmail.com':
                    level = random.uniform(7.5, 9.8)
                elif email == 'bilal.nasir@gmail.com':
                    level = random.uniform(2.0, 4.5)
                else:
                    level = random.uniform(4.0, 7.5)
                
                cursor.execute("""
                    INSERT INTO STRESS_LOG (student_id, stress_level, log_date, is_primary)
                    VALUES (:1, :2, :3, 1)
                """, [uid, round(level, 1), log_date])

            # Tasks
            tasks = [
                ('Final Research Paper', 12, today + datetime.timedelta(days=2), 5),
                ('Lab Report #4', 4, today + datetime.timedelta(days=5), 3),
                ('Weekly Quiz', 2, today + datetime.timedelta(days=1), 4),
            ]
            for title, hrs, due, p in tasks:
                cursor.execute("""
                    INSERT INTO TASK_LOG (task_id, student_id, title, effort_hours, deadline, priority_weight, status)
                    VALUES (SEQ_TASK_ID.NEXTVAL, :1, :2, :3, :4, :5, 'PENDING')
                """, [uid, title, hrs, due, p])

            # Activity
            cursor.execute("""
                INSERT INTO ACTIVITY_LOG (activity_id, student_id, activity_name, category, duration_hours, energy_cost, log_date)
                VALUES (SEQ_ACTIVITY_ID.NEXTVAL, :1, 'Morning Workout', 'FITNESS', 1.5, 3, :2)
            """, [uid, today])

        print("📝 Student life logs (Stress/Tasks/Activities) seeded.")

        # ── 5. COUNSELOR INTERACTIONS (Assignments, Alerts) ──────────
        # Assign Hiba and Sara to the counselor
        for email in ['hiba.rafique@students.nust.edu.pk', 'sara.khan@gmail.com']:
            uid = user_id_map[email]
            cursor.execute("""
                INSERT INTO COUNSELOR_STUDENT (counselor_id, student_id, status)
                VALUES (:1, :2, 'ACTIVE')
            """, [counselor_id, uid])
            
            # Add an open alert for Sara
            if email == 'sara.khan@gmail.com':
                cursor.execute("""
                    INSERT INTO ALERT (alert_id, student_id, counselor_id, type, severity, message)
                    VALUES (SEQ_ALERT_ID.NEXTVAL, :1, :2, 'HIGH_STRESS', 'CRITICAL', 
                            'Sustained high stress detected (Avg 8.4) over last 5 days.')
                """, [uid, counselor_id])

        print("⚖️ Counselor assignments and alerts generated.")

        # ── 6. METRICS & BENCHMARKING (STUDENT_METRICS) ───────────────
        # We manually update metrics to ensure interesting distribution for benchmarking
        metrics_data = [
            ('hiba.rafique@students.nust.edu.pk', 45.5, 5.2, 18.0, 12, 'STABLE'),
            ('zainab.ali@students.nust.edu.pk', 52.0, 6.1, 22.5, 10, 'INCREASING'),
            ('omar.farooq@gmail.com', 30.2, 3.8, 12.0, 15, 'DECREASING'),
            ('sara.khan@gmail.com', 88.4, 8.9, 45.0, 5, 'INCREASING'), # CRITICAL Student
            ('bilal.nasir@gmail.com', 15.1, 2.8, 8.0, 20, 'STABLE'),
        ]
        for email, bri, stress, workload, activity, trend in metrics_data:
            uid = user_id_map[email]
            cursor.execute("""
                UPDATE STUDENT_METRICS 
                SET bri_score = :1, stress_avg = :2, workload_score = :3, 
                    activity_score = :4, trend_label = :5, recommendation_status = 'UNLOCKED',
                    last_log_date = SYSDATE, log_streak = 8
                WHERE student_id = :6
            """, [bri, stress, workload, activity, trend, uid])

        print("📊 Student metrics and benchmarking data calculated.")

        # ── 7. FACULTY DASHBOARD (WEEKLY_SECTION_STATS) ───────────────
        # Seed 5 weeks of history for 14C
        faculty_history = [
            (today - datetime.timedelta(weeks=4), 4.2, 15.0, 5, 0, 'STABLE'),
            (today - datetime.timedelta(weeks=3), 5.5, 22.0, 5, 0, 'INCREASING'),
            (today - datetime.timedelta(weeks=2), 6.8, 32.5, 5, 1, 'INCREASING'), # Trigger workload limit
            (today - datetime.timedelta(weeks=1), 5.9, 28.0, 5, 1, 'DECREASING'),
            (today, 7.4, 38.0, 5, 2, 'INCREASING') # Current week is HIGH STRESS
        ]
        for m_start, stress, workload, count, crit, trend in faculty_history:
            m_end = m_start + datetime.timedelta(days=6)
            cursor.execute("""
                INSERT INTO WEEKLY_SECTION_STATS (week_start, week_end, avg_stress, avg_workload, student_count, critical_count, trend_label)
                VALUES (:1, :2, :3, :4, :5, :6, :7)
            """, [m_start, m_end, stress, workload, count, crit, trend])

        print("📈 Faculty dashboard historical pulse generated.")

        conn.commit()
        print("\n✨ MASTER SEED COMPLETE! The database is now in a perfect 'Testing State'.")
        print(f"   - Counselor: counselor@nust.edu.pk")
        print(f"   - Faculty:   faculty@nust.edu.pk")
        print(f"   - Student:   hiba.rafique@students.nust.edu.pk")
        print(f"   - Password:  fatigue123 (use this for all if testing local login)")
        
    except Exception as e:
        print(f"❌ Seed failed: {e}")
    finally:
        if 'conn' in locals():
            conn.close()

if __name__ == "__main__":
    seed_database()
