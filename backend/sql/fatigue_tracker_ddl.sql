-- ============================================================
--  Smart Student Mental Fatigue & Adaptive Workload Tracker
--  CS 236: Advanced Database Management Systems | NUST SEECS
--  Spring 2026 | Zaina Zia (501113) • Hiba Rafique (501846)
-- ============================================================
--  HOW TO RUN:
--  1. Open this file in VS Code with Oracle Extension
--  2. Connect to localhost:1521/XEPDB1
--  3. Select All (Ctrl+A) then Run Statement
--  4. Check verification output at the bottom
-- ============================================================


-- ============================================================
-- STEP 0: CLEAN SLATE
-- Drops all tables (CASCADE handles FK order) and sequences.
-- Safe to re-run at any time.
-- ============================================================

BEGIN
    FOR t IN (
        SELECT table_name FROM user_tables
        WHERE table_name IN (
            'AUDIT_LOG','NOTIFICATION_LOG','WEEKLY_SECTION_STATS',
            'COUNSELOR_STUDENT','PATTERN_PROFILE','RECOMMENDATION',
            'ALERT','STUDENT_METRICS','ACTIVITY_LOG','TASK_LOG',
            'STRESS_LOG','EMAIL_WHITELIST','ADMIN','FACULTY',
            'COUNSELOR','STUDENT','USERS','SYSTEM_CONFIG'
        )
    ) LOOP
        EXECUTE IMMEDIATE 'DROP TABLE ' || t.table_name || ' CASCADE CONSTRAINTS PURGE';
    END LOOP;
END;
/

BEGIN
    FOR s IN (
        SELECT sequence_name FROM user_sequences
        WHERE sequence_name IN (
            'SEQ_USER_ID','SEQ_STRESS_ID','SEQ_TASK_ID',
            'SEQ_ACTIVITY_ID','SEQ_METRIC_ID','SEQ_ALERT_ID',
            'SEQ_RECOMMENDATION_ID','SEQ_PROFILE_ID','SEQ_ASSIGNMENT_ID',
            'SEQ_NOTIFICATION_ID','SEQ_AUDIT_ID','SEQ_STAT_ID',
            'SEQ_CONFIG_ID'
        )
    ) LOOP
        EXECUTE IMMEDIATE 'DROP SEQUENCE ' || s.sequence_name;
    END LOOP;
END;
/


-- ============================================================
-- STEP 1: SEQUENCES (one per table with surrogate PK)
-- ============================================================

CREATE SEQUENCE SEQ_USER_ID           START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_STRESS_ID         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_TASK_ID           START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_ACTIVITY_ID       START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_METRIC_ID         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_ALERT_ID          START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_RECOMMENDATION_ID START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_PROFILE_ID        START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_ASSIGNMENT_ID     START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_NOTIFICATION_ID   START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_AUDIT_ID          START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_STAT_ID           START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE SEQ_CONFIG_ID         START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;


-- ============================================================
-- STEP 2: GROUP 1 — USERS & ROLES
-- All roles share the USERS table.
-- Role-specific data lives in sub-tables (STUDENT, COUNSELOR, etc.)
-- student_id / counselor_id / faculty_id / admin_id all FK to USERS.user_id
-- ============================================================

-- ── USERS ────────────────────────────────────────────────────
-- Central identity table. One row per person regardless of role.
CREATE TABLE USERS (
    user_id       NUMBER        DEFAULT SEQ_USER_ID.NEXTVAL,
    name          VARCHAR2(100) NOT NULL,
    email         VARCHAR2(100) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role          VARCHAR2(20)  NOT NULL,
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    is_active     NUMBER(1)     DEFAULT 1,

    CONSTRAINT pk_users        PRIMARY KEY (user_id),
    CONSTRAINT uq_users_email  UNIQUE      (email),
    CONSTRAINT ck_users_role   CHECK       (role      IN ('STUDENT','COUNSELOR','FACULTY','ADMIN')),
    CONSTRAINT ck_users_active CHECK       (is_active IN (0,1))
);

-- ── STUDENT ──────────────────────────────────────────────────
-- Extends USERS. student_id = USERS.user_id (no duplication).
-- student_type is auto-set at registration:
--   if email in EMAIL_WHITELIST -> '14C', else -> 'GENERAL'
CREATE TABLE STUDENT (
    student_id          NUMBER,
    student_type        VARCHAR2(20) DEFAULT 'GENERAL' NOT NULL,
    counselor_requested NUMBER(1)    DEFAULT 0,
    request_date        DATE,

    CONSTRAINT pk_student       PRIMARY KEY (student_id),
    CONSTRAINT fk_student_user  FOREIGN KEY (student_id)        REFERENCES USERS(user_id),
    CONSTRAINT ck_student_type  CHECK       (student_type        IN ('GENERAL','14C')),
    CONSTRAINT ck_student_req   CHECK       (counselor_requested IN (0,1))
);

-- ── COUNSELOR ────────────────────────────────────────────────
-- Extends USERS for counselor-specific fields.
CREATE TABLE COUNSELOR (
    counselor_id   NUMBER,
    specialization VARCHAR2(100),
    max_caseload   NUMBER DEFAULT 10,

    CONSTRAINT pk_counselor      PRIMARY KEY (counselor_id),
    CONSTRAINT fk_counselor_user FOREIGN KEY (counselor_id) REFERENCES USERS(user_id),
    CONSTRAINT ck_counselor_load CHECK       (max_caseload > 0)
);

-- ── FACULTY ──────────────────────────────────────────────────
-- Extends USERS. Faculty can ONLY see aggregated 14C cohort stats.
-- No access to any individual student data.
CREATE TABLE FACULTY (
    faculty_id NUMBER,
    department VARCHAR2(50),

    CONSTRAINT pk_faculty      PRIMARY KEY (faculty_id),
    CONSTRAINT fk_faculty_user FOREIGN KEY (faculty_id) REFERENCES USERS(user_id)
);

-- ── ADMIN ────────────────────────────────────────────────────
-- Extends USERS. Full system control.
CREATE TABLE ADMIN (
    admin_id    NUMBER,
    permissions VARCHAR2(200),

    CONSTRAINT pk_admin      PRIMARY KEY (admin_id),
    CONSTRAINT fk_admin_user FOREIGN KEY (admin_id) REFERENCES USERS(user_id)
);

-- ── EMAIL_WHITELIST ──────────────────────────────────────────
-- Pre-approved NUST 14C student emails, uploaded by Admin via CSV.
-- At registration: email match -> student_type = '14C', is_used -> 1,
-- student_id back-reference saved for audit trail.
CREATE TABLE EMAIL_WHITELIST (
    email      VARCHAR2(100),
    is_used    NUMBER(1) DEFAULT 0,
    student_id NUMBER,

    CONSTRAINT pk_whitelist         PRIMARY KEY (email),
    CONSTRAINT fk_whitelist_student FOREIGN KEY (student_id) REFERENCES STUDENT(student_id),
    CONSTRAINT ck_whitelist_used    CHECK       (is_used IN (0,1))
);


-- ============================================================
-- STEP 3: SYSTEM_CONFIG
-- Single-row admin-controlled global settings table.
-- Must exist before data tables because triggers read BRI
-- thresholds from here.
-- ============================================================

CREATE TABLE SYSTEM_CONFIG (
    config_id           NUMBER DEFAULT SEQ_CONFIG_ID.NEXTVAL,
    max_caseload        NUMBER DEFAULT 10,   -- default max students per counselor
    bri_watch           NUMBER DEFAULT 40,   -- BRI threshold -> WATCH alert
    bri_warning         NUMBER DEFAULT 60,   -- BRI threshold -> WARNING alert
    bri_critical        NUMBER DEFAULT 80,   -- BRI threshold -> CRITICAL alert
    unlock_days         NUMBER DEFAULT 7,    -- consecutive log days to unlock recommendations
    allowed_misses      NUMBER DEFAULT 1,    -- missed days forgiven before re-lock
    pattern_window_days NUMBER DEFAULT 30,   -- days of history before pattern detection activates

    CONSTRAINT pk_system_config PRIMARY KEY (config_id),
    CONSTRAINT ck_cfg_watch     CHECK (bri_watch    BETWEEN 0 AND 100),
    CONSTRAINT ck_cfg_warning   CHECK (bri_warning  BETWEEN 0 AND 100),
    CONSTRAINT ck_cfg_critical  CHECK (bri_critical BETWEEN 0 AND 100),
    CONSTRAINT ck_cfg_order     CHECK (bri_watch < bri_warning AND bri_warning < bri_critical)
);

-- Default configuration row
INSERT INTO SYSTEM_CONFIG VALUES (SEQ_CONFIG_ID.NEXTVAL, 10, 40, 60, 80, 7, 1, 30);
COMMIT;


-- ============================================================
-- STEP 4: GROUP 2 — CORE ACTIVITY DATA
-- Primary inputs to all scoring, trend analysis, recommendations.
-- Students write to these tables. Triggers read from them.
-- ============================================================

-- ── STRESS_LOG ───────────────────────────────────────────────
-- Daily stress entries. Multiple logs per day allowed.
-- is_primary = 1 -> main daily log (used in BRI + trend calculations)
-- is_primary = 0 -> secondary check-ins (stored but excluded from scoring)
CREATE TABLE STRESS_LOG (
    stress_id    NUMBER        DEFAULT SEQ_STRESS_ID.NEXTVAL,
    student_id   NUMBER        NOT NULL,
    stress_level NUMBER        NOT NULL,
    note         VARCHAR2(300),
    emotion_tag  VARCHAR2(30),
    is_primary   NUMBER(1)     DEFAULT 1,
    log_date     DATE          DEFAULT SYSDATE,
    log_time     TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_stress_log     PRIMARY KEY (stress_id),
    CONSTRAINT fk_stress_student FOREIGN KEY (student_id)  REFERENCES STUDENT(student_id),
    CONSTRAINT ck_stress_level   CHECK       (stress_level BETWEEN 1 AND 10),
    CONSTRAINT ck_stress_emotion CHECK       (emotion_tag  IN ('ANXIOUS','TIRED','MOTIVATED','OVERWHELMED','CALM')
                                              OR emotion_tag IS NULL),
    CONSTRAINT ck_stress_primary CHECK       (is_primary   IN (0,1))
);

-- ── TASK_LOG ─────────────────────────────────────────────────
-- Academic tasks. Only PENDING tasks feed workload_score in BRI.
-- course_name is plain text - no COURSE table or FK (per design doc).
CREATE TABLE TASK_LOG (
    task_id         NUMBER        DEFAULT SEQ_TASK_ID.NEXTVAL,
    student_id      NUMBER        NOT NULL,
    title           VARCHAR2(150) NOT NULL,
    course_name     VARCHAR2(100),
    deadline        DATE,
    effort_hours    NUMBER,
    task_type       VARCHAR2(30),
    status          VARCHAR2(20)  DEFAULT 'PENDING',
    priority_weight NUMBER        DEFAULT 1,
    created_at      DATE          DEFAULT SYSDATE,

    CONSTRAINT pk_task_log     PRIMARY KEY (task_id),
    CONSTRAINT fk_task_student FOREIGN KEY (student_id)    REFERENCES STUDENT(student_id),
    CONSTRAINT ck_task_type    CHECK       (task_type       IN ('ASSIGNMENT','QUIZ','PROJECT','EXAM','OTHER')
                                            OR task_type IS NULL),
    CONSTRAINT ck_task_status  CHECK       (status          IN ('PENDING','COMPLETED','DEFERRED')),
    CONSTRAINT ck_task_effort  CHECK       (effort_hours    >= 0 OR effort_hours IS NULL),
    CONSTRAINT ck_task_weight  CHECK       (priority_weight > 0)
);

-- ── ACTIVITY_LOG ─────────────────────────────────────────────
-- Extracurricular activities logged by students.
-- energy_cost (1-5) feeds activity_score component of BRI.
CREATE TABLE ACTIVITY_LOG (
    activity_id    NUMBER        DEFAULT SEQ_ACTIVITY_ID.NEXTVAL,
    student_id     NUMBER        NOT NULL,
    activity_name  VARCHAR2(100) NOT NULL,
    category       VARCHAR2(30),
    duration_hours NUMBER,
    energy_cost    NUMBER        NOT NULL,
    log_date       DATE          DEFAULT SYSDATE,

    CONSTRAINT pk_activity_log     PRIMARY KEY (activity_id),
    CONSTRAINT fk_activity_student FOREIGN KEY (student_id)   REFERENCES STUDENT(student_id),
    CONSTRAINT ck_activity_cat     CHECK       (category       IN ('SPORTS','FITNESS','ENTERTAINMENT','SOCIAL','OTHER')
                                                OR category IS NULL),
    CONSTRAINT ck_activity_energy  CHECK       (energy_cost    BETWEEN 1 AND 5),
    CONSTRAINT ck_activity_dur     CHECK       (duration_hours >= 0 OR duration_hours IS NULL)
);


-- ============================================================
-- STEP 5: GROUP 3 — INTELLIGENCE & ALERTS
-- All fields written by triggers or scheduled jobs only.
-- Never directly updated by users or the application layer.
-- ============================================================

-- ── STUDENT_METRICS ──────────────────────────────────────────
-- One row per student. The live computed state.
-- Recomputed after every STRESS_LOG, TASK_LOG, ACTIVITY_LOG insert.
--
-- BRI Formula components:
--   stress_avg            = AVG of last 7 primary stress_level values
--   workload_score        = SUM(effort_hours * priority_weight / days_until_deadline) for PENDING tasks
--   activity_score        = SUM(energy_cost) from ACTIVITY_LOG last 7 days
--   consecutive_high_days = COUNT of consecutive days where stress_level >= 7
--   bri_score             = weighted combination of above, normalized to 0-100
CREATE TABLE STUDENT_METRICS (
    metric_id             NUMBER        DEFAULT SEQ_METRIC_ID.NEXTVAL,
    student_id            NUMBER        NOT NULL,
    bri_score             NUMBER        DEFAULT 0,
    stress_avg            NUMBER        DEFAULT 0,
    workload_score        NUMBER        DEFAULT 0,
    activity_score        NUMBER        DEFAULT 0,
    consecutive_high_days NUMBER        DEFAULT 0,
    log_streak            NUMBER        DEFAULT 0,
    last_log_date         DATE,
    trend_label           VARCHAR2(20)  DEFAULT 'STABLE',
    recommendation_status VARCHAR2(10)  DEFAULT 'LOCKED',
    calculated_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_student_metrics    PRIMARY KEY (metric_id),
    CONSTRAINT uq_metrics_student    UNIQUE      (student_id),
    CONSTRAINT fk_metrics_student    FOREIGN KEY (student_id)           REFERENCES STUDENT(student_id),
    CONSTRAINT ck_metrics_bri        CHECK       (bri_score             BETWEEN 0 AND 100),
    CONSTRAINT ck_metrics_trend      CHECK       (trend_label           IN ('IMPROVING','STABLE','DETERIORATING','VOLATILE')),
    CONSTRAINT ck_metrics_rec_status CHECK       (recommendation_status IN ('LOCKED','UNLOCKED')),
    CONSTRAINT ck_metrics_streak     CHECK       (log_streak            >= 0),
    CONSTRAINT ck_metrics_high_days  CHECK       (consecutive_high_days >= 0)
);

-- ── ALERT ────────────────────────────────────────────────────
-- Full alert history. Past RESOLVED alerts are preserved forever.
-- Deduplication enforced in trigger:
--   new alert only inserted if no OPEN alert exists for that student.
-- Alert levels map to SYSTEM_CONFIG thresholds:
--   WATCH    -> bri_score >= bri_watch
--   WARNING  -> bri_score >= bri_warning
--   CRITICAL -> bri_score >= bri_critical (also auto-triggers counselor assignment)
CREATE TABLE ALERT (
    alert_id     NUMBER        DEFAULT SEQ_ALERT_ID.NEXTVAL,
    student_id   NUMBER        NOT NULL,
    counselor_id NUMBER,
    alert_level  VARCHAR2(10)  NOT NULL,
    bri_value    NUMBER,
    status       VARCHAR2(10)  DEFAULT 'OPEN',
    created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    resolved_at  TIMESTAMP,
    resolved_by  NUMBER,

    CONSTRAINT pk_alert          PRIMARY KEY (alert_id),
    CONSTRAINT fk_alert_student  FOREIGN KEY (student_id)   REFERENCES STUDENT(student_id),
    CONSTRAINT fk_alert_counsel  FOREIGN KEY (counselor_id) REFERENCES COUNSELOR(counselor_id),
    CONSTRAINT fk_alert_resolver FOREIGN KEY (resolved_by)  REFERENCES COUNSELOR(counselor_id),
    CONSTRAINT ck_alert_level    CHECK       (alert_level   IN ('WATCH','WARNING','CRITICAL')),
    CONSTRAINT ck_alert_status   CHECK       (status        IN ('OPEN','RESOLVED')),
    CONSTRAINT ck_alert_bri      CHECK       (bri_value     BETWEEN 0 AND 100 OR bri_value IS NULL)
);

-- ── RECOMMENDATION ───────────────────────────────────────────
-- System-generated (rule-based) or counselor-added recommendations.
-- Student sees these ONLY when recommendation_status = 'UNLOCKED'.
-- Unlock rule: 7 consecutive log days (1 missed day forgiven).
-- Re-locks on 2+ consecutive missed days -> is_active flipped to 0.
CREATE TABLE RECOMMENDATION (
    recommendation_id NUMBER        DEFAULT SEQ_RECOMMENDATION_ID.NEXTVAL,
    student_id        NUMBER        NOT NULL,
    type              VARCHAR2(30)  NOT NULL,
    message           VARCHAR2(300),
    generated_by      VARCHAR2(20)  NOT NULL,
    created_at        TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
    unlocked_at       TIMESTAMP,
    expires_at        TIMESTAMP,
    is_active         NUMBER(1)     DEFAULT 1,

    CONSTRAINT pk_recommendation     PRIMARY KEY (recommendation_id),
    CONSTRAINT fk_recom_student      FOREIGN KEY (student_id)  REFERENCES STUDENT(student_id),
    CONSTRAINT ck_recom_type         CHECK       (type         IN ('REST','DEFER_TASK','CONTACT_COUNSELOR','RESOURCE')),
    CONSTRAINT ck_recom_generated_by CHECK       (generated_by IN ('SYSTEM','COUNSELOR')),
    CONSTRAINT ck_recom_active       CHECK       (is_active    IN (0,1))
);

-- ── PATTERN_PROFILE ──────────────────────────────────────────
-- Behavioral pattern rows per student.
-- Populated ONLY after 30+ days of data by weekly scheduled job.
-- Multiple rows per student (one per trigger_category detected).
-- Categories e.g.: EXAM_WEEK, SOCIAL_OVERLOAD, DEADLINE_CLUSTER
CREATE TABLE PATTERN_PROFILE (
    profile_id       NUMBER        DEFAULT SEQ_PROFILE_ID.NEXTVAL,
    student_id       NUMBER        NOT NULL,
    trigger_category VARCHAR2(50)  NOT NULL,
    frequency_count  NUMBER        DEFAULT 0,
    avg_severity     NUMBER,
    pattern_summary  VARCHAR2(500),
    last_updated     DATE          DEFAULT SYSDATE,

    CONSTRAINT pk_pattern_profile PRIMARY KEY (profile_id),
    CONSTRAINT fk_pattern_student FOREIGN KEY (student_id)     REFERENCES STUDENT(student_id),
    CONSTRAINT uq_pattern_cat     UNIQUE      (student_id, trigger_category),
    CONSTRAINT ck_pattern_freq    CHECK       (frequency_count >= 0),
    CONSTRAINT ck_pattern_sev     CHECK       (avg_severity    BETWEEN 1 AND 10 OR avg_severity IS NULL)
);


-- ============================================================
-- STEP 6: GROUP 4 — SUPPORTING & SYSTEM TABLES
-- ============================================================

-- ── COUNSELOR_STUDENT ────────────────────────────────────────
-- Full assignment history. One ACTIVE row per student at a time.
-- Reassignment logic (enforced in trigger):
--   1. Flip existing ACTIVE row to INACTIVE
--   2. Insert new ACTIVE row
-- Previous counselor check: WHERE student_id = x AND status = 'INACTIVE'
-- Caseload count: COUNT(*) WHERE counselor_id = x AND status = 'ACTIVE'
CREATE TABLE COUNSELOR_STUDENT (
    assignment_id NUMBER       DEFAULT SEQ_ASSIGNMENT_ID.NEXTVAL,
    counselor_id  NUMBER       NOT NULL,
    student_id    NUMBER       NOT NULL,
    assigned_date DATE         DEFAULT SYSDATE,
    status        VARCHAR2(10) DEFAULT 'ACTIVE',
    assigned_by   VARCHAR2(20) DEFAULT 'SYSTEM',

    CONSTRAINT pk_counselor_student PRIMARY KEY (assignment_id),
    CONSTRAINT fk_cs_counselor      FOREIGN KEY (counselor_id) REFERENCES COUNSELOR(counselor_id),
    CONSTRAINT fk_cs_student        FOREIGN KEY (student_id)   REFERENCES STUDENT(student_id),
    CONSTRAINT ck_cs_status         CHECK       (status        IN ('ACTIVE','INACTIVE')),
    CONSTRAINT ck_cs_assigned_by    CHECK       (assigned_by   IN ('SYSTEM','ADMIN'))
);

-- ── NOTIFICATION_LOG ─────────────────────────────────────────
-- Record of all emails and in-app notifications sent.
-- is_read used for in-app notification badge (0 = unread).
-- Triggered by: alert raised, counselor assigned, recommendation unlocked, weekly summary.
CREATE TABLE NOTIFICATION_LOG (
    notification_id NUMBER        DEFAULT SEQ_NOTIFICATION_ID.NEXTVAL,
    user_id         NUMBER        NOT NULL,
    message         VARCHAR2(300) NOT NULL,
    type            VARCHAR2(30)  NOT NULL,
    is_read         NUMBER(1)     DEFAULT 0,
    sent_at         TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_notification_log PRIMARY KEY (notification_id),
    CONSTRAINT fk_notif_user       FOREIGN KEY (user_id)  REFERENCES USERS(user_id),
    CONSTRAINT ck_notif_type       CHECK       (type      IN ('ALERT','RECOMMENDATION','ASSIGNMENT','SUMMARY')),
    CONSTRAINT ck_notif_read       CHECK       (is_read   IN (0,1))
);

-- ── AUDIT_LOG ────────────────────────────────────────────────
-- Immutable log of all significant system actions.
-- Visible to Admin only. Rows are never updated or deleted.
-- NOTE: column named action_time not "timestamp" (reserved word in Oracle).
CREATE TABLE AUDIT_LOG (
    audit_id     NUMBER        DEFAULT SEQ_AUDIT_ID.NEXTVAL,
    user_id      NUMBER,
    action       VARCHAR2(200) NOT NULL,
    target_table VARCHAR2(50),
    target_id    NUMBER,
    action_time  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_audit_log  PRIMARY KEY (audit_id),
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES USERS(user_id)
);

-- ── WEEKLY_SECTION_STATS ─────────────────────────────────────
-- Pre-aggregated 14C cohort stress data for Faculty dashboard.
-- Populated every Monday by DBMS_SCHEDULER job.
-- Faculty can ONLY query this table - no other student data accessible.
CREATE TABLE WEEKLY_SECTION_STATS (
    stat_id       NUMBER        DEFAULT SEQ_STAT_ID.NEXTVAL,
    week_start    DATE          NOT NULL,
    week_end      DATE          NOT NULL,
    avg_stress    NUMBER,
    student_count NUMBER,
    trend_label   VARCHAR2(20)  DEFAULT 'STABLE',
    computed_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_weekly_stats PRIMARY KEY (stat_id),
    CONSTRAINT uq_week_start   UNIQUE      (week_start),
    CONSTRAINT ck_stats_trend  CHECK       (trend_label   IN ('INCREASING','STABLE','DECREASING')),
    CONSTRAINT ck_stats_dates  CHECK       (week_end      > week_start),
    CONSTRAINT ck_stats_stress CHECK       (avg_stress    BETWEEN 1 AND 10 OR avg_stress IS NULL),
    CONSTRAINT ck_stats_count  CHECK       (student_count >= 0 OR student_count IS NULL)
);


-- ============================================================
-- STEP 7: INDEXES
-- Covers every column used in trigger WHERE clauses,
-- BRI computation subqueries, and dashboard data fetches.
-- ============================================================

-- STRESS_LOG: BRI trigger pulls last 7 primary logs per student
CREATE INDEX idx_stress_student_date ON STRESS_LOG        (student_id, log_date DESC);
CREATE INDEX idx_stress_primary      ON STRESS_LOG        (student_id, is_primary, log_date DESC);

-- TASK_LOG: workload_score filters PENDING tasks by deadline proximity
CREATE INDEX idx_task_student_status ON TASK_LOG          (student_id, status);
CREATE INDEX idx_task_deadline       ON TASK_LOG          (student_id, deadline);

-- ACTIVITY_LOG: activity_score sums energy_cost over last 7 days
CREATE INDEX idx_activity_student_dt ON ACTIVITY_LOG      (student_id, log_date DESC);

-- STUDENT_METRICS: single-row fast lookup per student
CREATE INDEX idx_metrics_student     ON STUDENT_METRICS   (student_id);

-- ALERT: deduplication check needs fast open-alert lookup per student
CREATE INDEX idx_alert_student_open  ON ALERT             (student_id, status);

-- COUNSELOR_STUDENT: active assignment + caseload count queries
CREATE INDEX idx_cs_student_active   ON COUNSELOR_STUDENT (student_id,   status);
CREATE INDEX idx_cs_counselor_active ON COUNSELOR_STUDENT (counselor_id, status);

-- NOTIFICATION_LOG: unread notification badge count per user
CREATE INDEX idx_notif_user_unread   ON NOTIFICATION_LOG  (user_id, is_read);

-- AUDIT_LOG: admin filters by table name and target row
CREATE INDEX idx_audit_user          ON AUDIT_LOG         (user_id);
CREATE INDEX idx_audit_table         ON AUDIT_LOG         (target_table, target_id);

-- PATTERN_PROFILE: counselor views patterns by student
CREATE INDEX idx_pattern_student     ON PATTERN_PROFILE   (student_id);


-- ============================================================
-- STEP 8: SEED DATA
-- Enough rows to test all 5 roles and trigger logic.
-- Passwords are placeholder hashes - replace with real bcrypt
-- hashes generated by your FastAPI /auth/register endpoint.
-- ============================================================

-- ── Admin ────────────────────────────────────────────────────
INSERT INTO USERS  (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'System Admin', 'admin@nust.edu.pk',
        '$2b$12$placeholder_admin', 'ADMIN');
INSERT INTO ADMIN  (admin_id, permissions)
VALUES (SEQ_USER_ID.CURRVAL, 'FULL');

-- ── Counselors (2 needed to test assignment + caseload logic) ─
INSERT INTO USERS     (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Dr. Sara Khan', 'sara.khan@nust.edu.pk',
        '$2b$12$placeholder_c1', 'COUNSELOR');
INSERT INTO COUNSELOR (counselor_id, specialization, max_caseload)
VALUES (SEQ_USER_ID.CURRVAL, 'Academic Stress', 10);

INSERT INTO USERS     (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Dr. Usman Tariq', 'usman.tariq@nust.edu.pk',
        '$2b$12$placeholder_c2', 'COUNSELOR');
INSERT INTO COUNSELOR (counselor_id, specialization, max_caseload)
VALUES (SEQ_USER_ID.CURRVAL, 'Anxiety and Burnout', 8);

-- ── Faculty ──────────────────────────────────────────────────
INSERT INTO USERS   (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Prof. Ali Ahmed', 'ali.ahmed@nust.edu.pk',
        '$2b$12$placeholder_f1', 'FACULTY');
INSERT INTO FACULTY (faculty_id, department)
VALUES (SEQ_USER_ID.CURRVAL, 'Computing');

-- ── 14C Whitelist ─────────────────────────────────────────────
INSERT INTO EMAIL_WHITELIST (email, is_used, student_id) VALUES ('zaina.zia@students.nust.edu.pk',    0, NULL);
INSERT INTO EMAIL_WHITELIST (email, is_used, student_id) VALUES ('hiba.rafique@students.nust.edu.pk', 0, NULL);
INSERT INTO EMAIL_WHITELIST (email, is_used, student_id) VALUES ('test.14c@students.nust.edu.pk',     0, NULL);

-- ── 14C Student 1 ─────────────────────────────────────────────
INSERT INTO USERS           (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Zaina Zia', 'zaina.zia@students.nust.edu.pk',
        '$2b$12$placeholder_s1', 'STUDENT');
INSERT INTO STUDENT         (student_id, student_type)
VALUES (SEQ_USER_ID.CURRVAL, '14C');
INSERT INTO STUDENT_METRICS (metric_id, student_id)
VALUES (SEQ_METRIC_ID.NEXTVAL, SEQ_USER_ID.CURRVAL);
UPDATE EMAIL_WHITELIST SET is_used = 1, student_id = SEQ_USER_ID.CURRVAL
WHERE email = 'zaina.zia@students.nust.edu.pk';

-- ── 14C Student 2 ─────────────────────────────────────────────
INSERT INTO USERS           (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Hiba Rafique', 'hiba.rafique@students.nust.edu.pk',
        '$2b$12$placeholder_s2', 'STUDENT');
INSERT INTO STUDENT         (student_id, student_type)
VALUES (SEQ_USER_ID.CURRVAL, '14C');
INSERT INTO STUDENT_METRICS (metric_id, student_id)
VALUES (SEQ_METRIC_ID.NEXTVAL, SEQ_USER_ID.CURRVAL);
UPDATE EMAIL_WHITELIST SET is_used = 1, student_id = SEQ_USER_ID.CURRVAL
WHERE email = 'hiba.rafique@students.nust.edu.pk';

-- ── General Student ───────────────────────────────────────────
INSERT INTO USERS           (user_id, name, email, password_hash, role)
VALUES (SEQ_USER_ID.NEXTVAL, 'Ahmed Raza', 'ahmed.raza@gmail.com',
        '$2b$12$placeholder_s3', 'STUDENT');
INSERT INTO STUDENT         (student_id, student_type)
VALUES (SEQ_USER_ID.CURRVAL, 'GENERAL');
INSERT INTO STUDENT_METRICS (metric_id, student_id)
VALUES (SEQ_METRIC_ID.NEXTVAL, SEQ_USER_ID.CURRVAL);

COMMIT;


-- ============================================================
-- STEP 9: SAMPLE WEEKLY STATS (for Faculty dashboard demo)
-- ============================================================

INSERT INTO WEEKLY_SECTION_STATS
    (stat_id, week_start, week_end, avg_stress, student_count, trend_label)
VALUES (SEQ_STAT_ID.NEXTVAL, DATE '2026-03-16', DATE '2026-03-22', 5.8, 2, 'STABLE');

INSERT INTO WEEKLY_SECTION_STATS
    (stat_id, week_start, week_end, avg_stress, student_count, trend_label)
VALUES (SEQ_STAT_ID.NEXTVAL, DATE '2026-03-23', DATE '2026-03-29', 6.4, 2, 'INCREASING');

INSERT INTO WEEKLY_SECTION_STATS
    (stat_id, week_start, week_end, avg_stress, student_count, trend_label)
VALUES (SEQ_STAT_ID.NEXTVAL, DATE '2026-03-30', DATE '2026-04-05', 6.1, 2, 'STABLE');

COMMIT;


-- ============================================================
-- STEP 10: VERIFICATION
-- Expected results:
--   USERS = 6 | STUDENT = 3 | COUNSELOR = 2 | FACULTY = 1 | ADMIN = 1
--   EMAIL_WHITELIST = 3 | STUDENT_METRICS = 3 | SYSTEM_CONFIG = 1
--   WEEKLY_SECTION_STATS = 3 | all others = 0
-- ============================================================

SELECT 'USERS'               AS tbl, COUNT(*) AS cnt FROM USERS
UNION ALL SELECT 'STUDENT',                 COUNT(*) FROM STUDENT
UNION ALL SELECT 'COUNSELOR',               COUNT(*) FROM COUNSELOR
UNION ALL SELECT 'FACULTY',                 COUNT(*) FROM FACULTY
UNION ALL SELECT 'ADMIN',                   COUNT(*) FROM ADMIN
UNION ALL SELECT 'EMAIL_WHITELIST',         COUNT(*) FROM EMAIL_WHITELIST
UNION ALL SELECT 'STUDENT_METRICS',         COUNT(*) FROM STUDENT_METRICS
UNION ALL SELECT 'SYSTEM_CONFIG',           COUNT(*) FROM SYSTEM_CONFIG
UNION ALL SELECT 'WEEKLY_SECTION_STATS',    COUNT(*) FROM WEEKLY_SECTION_STATS
UNION ALL SELECT 'STRESS_LOG',              COUNT(*) FROM STRESS_LOG
UNION ALL SELECT 'TASK_LOG',                COUNT(*) FROM TASK_LOG
UNION ALL SELECT 'ACTIVITY_LOG',            COUNT(*) FROM ACTIVITY_LOG
UNION ALL SELECT 'ALERT',                   COUNT(*) FROM ALERT
UNION ALL SELECT 'RECOMMENDATION',          COUNT(*) FROM RECOMMENDATION
UNION ALL SELECT 'PATTERN_PROFILE',         COUNT(*) FROM PATTERN_PROFILE
UNION ALL SELECT 'COUNSELOR_STUDENT',       COUNT(*) FROM COUNSELOR_STUDENT
UNION ALL SELECT 'NOTIFICATION_LOG',        COUNT(*) FROM NOTIFICATION_LOG
UNION ALL SELECT 'AUDIT_LOG',               COUNT(*) FROM AUDIT_LOG
ORDER BY 1;

-- ============================================================
-- DDL COMPLETE
-- Next file to run: fatigue_tracker_triggers.sql
-- ============================================================


SELECT s.student_id, u.name, u.email,
       sm.bri_score, sm.trend_label,
       (SELECT COUNT(*) FROM ALERT a 
        WHERE a.student_id = s.student_id AND a.status = 'OPEN') as open_alerts
FROM COUNSELOR_STUDENT cs
JOIN STUDENT s ON cs.student_id = s.student_id
JOIN USERS u ON s.student_id = u.user_id
LEFT JOIN STUDENT_METRICS sm ON s.student_id = sm.student_id
WHERE cs.counselor_id = 3        -- replace 3 with your actual counselor's user_id
AND cs.status = 'ACTIVE';