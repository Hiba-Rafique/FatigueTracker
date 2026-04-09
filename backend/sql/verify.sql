SELECT 'USERS'             AS tbl, COUNT(*) AS cnt FROM USERS
UNION ALL SELECT 'STUDENT',                 COUNT(*) FROM STUDENT
UNION ALL SELECT 'COUNSELOR',               COUNT(*) FROM COUNSELOR
UNION ALL SELECT 'FACULTY',                 COUNT(*) FROM FACULTY
UNION ALL SELECT 'ADMIN',                   COUNT(*) FROM ADMIN
UNION ALL SELECT 'EMAIL_WHITELIST',         COUNT(*) FROM EMAIL_WHITELIST
UNION ALL SELECT 'STUDENT_METRICS',         COUNT(*) FROM STUDENT_METRICS
UNION ALL SELECT 'SYSTEM_CONFIG',           COUNT(*) FROM SYSTEM_CONFIG
UNION ALL SELECT 'WEEKLY_SECTION_STATS',    COUNT(*) FROM WEEKLY_SECTION_STATS
UNION ALL SELECT 'STRESS_LOG',              COUNT(*) FROM STRESS_LOG
UNION ALL SELECT 'TASK_LOG',               COUNT(*) FROM TASK_LOG
UNION ALL SELECT 'ACTIVITY_LOG',            COUNT(*) FROM ACTIVITY_LOG
UNION ALL SELECT 'ALERT',                   COUNT(*) FROM ALERT
UNION ALL SELECT 'RECOMMENDATION',          COUNT(*) FROM RECOMMENDATION
UNION ALL SELECT 'PATTERN_PROFILE',         COUNT(*) FROM PATTERN_PROFILE
UNION ALL SELECT 'COUNSELOR_STUDENT',       COUNT(*) FROM COUNSELOR_STUDENT
UNION ALL SELECT 'NOTIFICATION_LOG',        COUNT(*) FROM NOTIFICATION_LOG
UNION ALL SELECT 'AUDIT_LOG',               COUNT(*) FROM AUDIT_LOG;

-- Insert a stress log for Zaina (student_id = 5)
INSERT INTO STRESS_LOG (stress_id, student_id, stress_level, note, emotion_tag, is_primary, log_date)
VALUES (SEQ_STRESS_ID.NEXTVAL, 5, 8, 'Lots of assignments due', 'ANXIOUS', 1, SYSDATE);

COMMIT;

-- Check if STUDENT_METRICS updated correctly
SELECT student_id, stress_avg, log_streak, consecutive_high_days,
       trend_label, recommendation_status, bri_score
FROM   STUDENT_METRICS
WHERE  student_id = 5;

SELECT COUNT(*) FROM STRESS_LOG WHERE student_id = 5;

SELECT stress_id, student_id, stress_level, is_primary, log_date
FROM STRESS_LOG
WHERE student_id = 5;


SET SERVEROUTPUT ON;

DECLARE
    v_student_id     NUMBER := 5;
    v_today          DATE   := TRUNC(SYSDATE);
    v_last_log       DATE;
    v_streak         NUMBER;
    v_rec_status     VARCHAR2(10);
    v_stress_avg     NUMBER;
    v_unlock_days    NUMBER;
    v_allowed_misses NUMBER;
    v_workload       NUMBER;
    v_activity       NUMBER;
    v_bri_out        NUMBER;
BEGIN
    -- Step 1
    SELECT last_log_date, log_streak, recommendation_status
    INTO   v_last_log, v_streak, v_rec_status
    FROM   STUDENT_METRICS
    WHERE  student_id = v_student_id;
    DBMS_OUTPUT.PUT_LINE('Step 1 OK - streak: ' || v_streak);

    -- Step 2
    SELECT unlock_days, allowed_misses
    INTO   v_unlock_days, v_allowed_misses
    FROM   SYSTEM_CONFIG WHERE ROWNUM = 1;
    DBMS_OUTPUT.PUT_LINE('Step 2 OK - unlock_days: ' || v_unlock_days);

    -- Step 5: stress avg
    SELECT AVG(stress_level)
    INTO   v_stress_avg
    FROM   (
        SELECT stress_level
        FROM   STRESS_LOG
        WHERE  student_id = v_student_id
        AND    is_primary  = 1
        ORDER  BY log_date DESC
        FETCH  FIRST 7 ROWS ONLY
    );
    DBMS_OUTPUT.PUT_LINE('Step 5 OK - stress_avg: ' || v_stress_avg);

    -- Step 9: workload and activity
    SELECT workload_score, activity_score
    INTO   v_workload, v_activity
    FROM   STUDENT_METRICS
    WHERE  student_id = v_student_id;
    DBMS_OUTPUT.PUT_LINE('Step 9 OK - workload: ' || v_workload || ' activity: ' || v_activity);

    -- Step 10: BRI
    compute_bri(
        p_stress_avg       => NVL(v_stress_avg, 0),
        p_workload_score   => NVL(v_workload, 0),
        p_activity_score   => NVL(v_activity, 0),
        p_consec_high_days => 0,
        p_bri_score        => v_bri_out
    );
    DBMS_OUTPUT.PUT_LINE('Step 10 OK - bri_out: ' || v_bri_out);

EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('ERROR at: ' || SQLERRM);
END;
/

-- Manually update what T1 should have done
UPDATE STUDENT_METRICS
SET    stress_avg            = 8,
       log_streak            = 1,
       last_log_date         = TRUNC(SYSDATE),
       consecutive_high_days = 1,
       trend_label           = 'STABLE',
       recommendation_status = 'LOCKED',
       bri_score             = 42,
       calculated_at         = CURRENT_TIMESTAMP
WHERE  student_id = 5;

COMMIT;

-- Verify
SELECT student_id, stress_avg, log_streak, consecutive_high_days,
       trend_label, recommendation_status, bri_score
FROM   STUDENT_METRICS
WHERE  student_id = 5;

DELETE FROM STRESS_LOG WHERE student_id = 5;

UPDATE STUDENT_METRICS
SET stress_avg = 0, log_streak = 0, last_log_date = NULL,
    consecutive_high_days = 0, trend_label = 'STABLE',
    recommendation_status = 'LOCKED', bri_score = 0
WHERE student_id = 5;

COMMIT;

INSERT INTO STRESS_LOG (stress_id, student_id, stress_level, note, emotion_tag, is_primary, log_date)
VALUES (SEQ_STRESS_ID.NEXTVAL, 5, 8, 'Lots of assignments due', 'ANXIOUS', 1, SYSDATE);

COMMIT;

SELECT student_id, stress_avg, log_streak, consecutive_high_days,
       trend_label, recommendation_status, bri_score
FROM   STUDENT_METRICS
WHERE  student_id = 5;

INSERT INTO STRESS_LOG (stress_id, student_id, stress_level, note, emotion_tag, is_primary, log_date)
VALUES (SEQ_STRESS_ID.NEXTVAL, 5, 7, 'Test', 'CALM', 1, SYSDATE);

SELECT student_id, stress_avg, log_streak, consecutive_high_days,
       trend_label, recommendation_status, bri_score
FROM   STUDENT_METRICS
WHERE  student_id = 5;

INSERT INTO TASK_LOG (task_id, student_id, title, course_name, deadline, effort_hours, task_type, status, priority_weight)
VALUES (SEQ_TASK_ID.NEXTVAL, 5, 'ADBMS Assignment', 'CS236', SYSDATE + 3, 5, 'ASSIGNMENT', 'PENDING', 2);

COMMIT;

SELECT student_id, workload_score, bri_score
FROM   STUDENT_METRICS
WHERE  student_id = 5;


SELECT effort_hours, priority_weight, deadline,
       effort_hours * priority_weight /
       GREATEST(deadline - TRUNC(SYSDATE), 1) AS contribution
FROM TASK_LOG
WHERE student_id = 5
AND status = 'PENDING';

SELECT * 
FROM STUDENT_METRICS
WHERE student_id = 5;

INSERT INTO ACTIVITY_LOG (
    log_id,
    student_id,
    activity_type,
    energy_cost,
    log_date
)
VALUES (
    SEQ_LOG_ID.NEXTVAL,
    5,
    'RUNNING',
    6,
    SYSDATE
);

COMMIT;

SELECT * 
FROM ACTIVITY_LOG
WHERE student_id = 5;

INSERT INTO ACTIVITY_LOG (activity_id, student_id, activity_name, category, duration_hours, energy_cost, log_date)
VALUES (SEQ_ACTIVITY_ID.NEXTVAL, 5, 'Football Practice', 'SPORTS', 2, 4, SYSDATE);

commit;

SELECT student_id, activity_score, bri_score
FROM STUDENT_METRICS
WHERE student_id = 5;

SELECT activity_id, student_id, energy_cost, log_date
FROM ACTIVITY_LOG
WHERE student_id = 5;

UPDATE TASK_LOG SET status = 'COMPLETED' WHERE student_id = 5;
COMMIT;

SELECT student_id, workload_score, bri_score
FROM STUDENT_METRICS WHERE student_id = 5;

DECLARE
    v_id NUMBER;
BEGIN
    register_student('Test Student', 'test.14c@students.nust.edu.pk', 'hashedpass123', v_id);
    DBMS_OUTPUT.PUT_LINE('New user_id: ' || v_id);
END;
/

SET SERVEROUTPUT ON;
DECLARE
    v_id NUMBER;
BEGIN
    register_student('Test 14C Student', 'fresh.14c@students.nust.edu.pk', 'hashedpass123', v_id);
    DBMS_OUTPUT.PUT_LINE('New user_id: ' || v_id);
END;
/

SELECT u.user_id, u.name, u.email, u.role, s.student_type
FROM USERS u JOIN STUDENT s ON u.user_id = s.student_id
WHERE u.email = 'fresh.14c@students.nust.edu.pk';

-- Check which whitelist emails are still unused
SELECT email, is_used FROM EMAIL_WHITELIST;

SELECT u.email, s.student_type
FROM USERS u JOIN STUDENT s ON u.user_id = s.student_id
ORDER BY u.user_id DESC
FETCH FIRST 3 ROWS ONLY;

-- First insert a fresh pending task
INSERT INTO TASK_LOG (task_id, student_id, title, course_name, deadline, 
                      effort_hours, task_type, status, priority_weight)
VALUES (SEQ_TASK_ID.NEXTVAL, 5, 'New Assignment', 'CS101', 
        SYSDATE + 5, 4, 'ASSIGNMENT', 'PENDING', 2);
COMMIT;

-- Check workload updated
SELECT student_id, workload_score, bri_score
FROM STUDENT_METRICS WHERE student_id = 5;

UPDATE TASK_LOG SET status = 'COMPLETED' 
WHERE student_id = 5 AND title = 'New Assignment';
COMMIT;

-- Workload should drop back down
SELECT student_id, workload_score, bri_score
FROM STUDENT_METRICS WHERE student_id = 5;

SELECT title, status 
FROM TASK_LOG 
WHERE student_id = 5;

SET SERVEROUTPUT ON;

UPDATE TASK_LOG 
SET status = 'COMPLETED'
WHERE student_id = 5;

SELECT workload_score 
FROM STUDENT_METRICS 
WHERE student_id = 5;
