-- 1. BRI Procedure
CREATE OR REPLACE PROCEDURE compute_bri(
    p_stress_avg IN NUMBER,
    p_workload_score IN NUMBER,
    p_activity_score IN NUMBER,
    p_consec_high_days IN NUMBER,
    p_bri_score OUT NUMBER
) AS
    v_base NUMBER := 0;
BEGIN
    -- stress_avg (0-10): weight 40
    v_base := v_base + (NVL(p_stress_avg, 0) * 4);
    
    -- consecutive_high_days: weight 30 (caps at 7 days -> 30 pts)
    v_base := v_base + (LEAST(NVL(p_consec_high_days, 0), 7) * (30/7));
    
    -- workload_score: weight 20 (cap at 50 points -> 20 pts)
    v_base := v_base + (LEAST(NVL(p_workload_score, 0), 50) * (20/50));
    
    -- activity_score: subtracts from fatigue, up to 10 points. If 0 activity, add 10 fatigue.
    v_base := v_base + 10 - (LEAST(NVL(p_activity_score, 0), 20) * (10/20));
    
    -- Cap between 0 and 100
    p_bri_score := GREATEST(0, LEAST(100, ROUND(v_base)));
END;
/

-- 2. Counselor Assignment Procedure
CREATE OR REPLACE PROCEDURE assign_counselor(p_student_id IN NUMBER) AS
    v_counselor_id NUMBER;
    v_max_caseload NUMBER;
    v_current_load NUMBER;
BEGIN
    -- Check max caseload config
    SELECT max_caseload INTO v_max_caseload FROM SYSTEM_CONFIG WHERE ROWNUM = 1;

    -- 1. Look for previous INACTIVE counselor
    BEGIN
        SELECT counselor_id INTO v_counselor_id
        FROM COUNSELOR_STUDENT
        WHERE student_id = p_student_id AND status = 'INACTIVE'
        FETCH FIRST 1 ROWS ONLY;

        -- Check capacity of this previous counselor
        SELECT COUNT(*) INTO v_current_load
        FROM COUNSELOR_STUDENT
        WHERE counselor_id = v_counselor_id AND status = 'ACTIVE';

        IF v_current_load >= v_max_caseload THEN
            v_counselor_id := NULL;
        END IF;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            v_counselor_id := NULL;
    END;

    -- 3. If under max_caseload -> reassign, else find counselor with lowest active caseload under max_caseload
    IF v_counselor_id IS NULL THEN
        BEGIN
            SELECT c.counselor_id INTO v_counselor_id
            FROM COUNSELOR c
            LEFT JOIN COUNSELOR_STUDENT cs ON c.counselor_id = cs.counselor_id AND cs.status = 'ACTIVE'
            GROUP BY c.counselor_id, c.max_caseload
            HAVING COUNT(cs.student_id) < c.max_caseload
            ORDER BY COUNT(cs.student_id) ASC
            FETCH FIRST 1 ROWS ONLY;
        EXCEPTION
            WHEN NO_DATA_FOUND THEN
                -- No counselor available
                RETURN;
        END;
    END IF;

    -- 5. Flip old ACTIVE -> INACTIVE is now handled by T7 trigger
    -- Insert NOTIFICATION_LOG is now handled by T7 trigger

    -- 4. INSERT new ACTIVE row
    INSERT INTO COUNSELOR_STUDENT (student_id, counselor_id, status, assigned_by)
    VALUES (p_student_id, v_counselor_id, 'ACTIVE', 'SYSTEM');

END;
/
-- ============================================================
-- ZAINA'S PROCEDURES
-- ============================================================

-- ── Registration Procedure ───────────────────────────────────
-- Checks EMAIL_WHITELIST to determine student type (14C/GENERAL)
-- Inserts into USERS, STUDENT, STUDENT_METRICS atomically
-- Called by FastAPI /auth/register endpoint
-- ============================================================
CREATE OR REPLACE PROCEDURE register_student(
    p_name          IN VARCHAR2,
    p_email         IN VARCHAR2,
    p_password_hash IN VARCHAR2,
    p_user_id       OUT NUMBER
) AS
    v_user_id      NUMBER;
    v_student_type VARCHAR2(20) := 'GENERAL';
    v_whitelist    NUMBER := 0;
BEGIN
    SELECT COUNT(*) INTO v_whitelist
    FROM EMAIL_WHITELIST
    WHERE LOWER(email) = LOWER(p_email) AND is_used = 0;

    IF v_whitelist > 0 THEN
        v_student_type := '14C';
    END IF;

    INSERT INTO USERS (user_id, name, email, password_hash, role)
    VALUES (SEQ_USER_ID.NEXTVAL, p_name, LOWER(p_email), p_password_hash, 'STUDENT')
    RETURNING user_id INTO v_user_id;

    INSERT INTO STUDENT (student_id, student_type, counselor_requested)
    VALUES (v_user_id, v_student_type, 0);

    INSERT INTO STUDENT_METRICS (
        metric_id, student_id, bri_score, stress_avg,
        workload_score, activity_score, consecutive_high_days,
        log_streak, last_log_date, trend_label, recommendation_status
    )
    VALUES (
        SEQ_METRIC_ID.NEXTVAL, v_user_id, 0, 0,
        0, 0, 0, 0, NULL, 'STABLE', 'LOCKED'
    );

    IF v_student_type = '14C' THEN
        UPDATE EMAIL_WHITELIST
        SET is_used = 1, student_id = v_user_id
        WHERE LOWER(email) = LOWER(p_email);
    END IF;

    p_user_id := v_user_id;
    COMMIT;

EXCEPTION
    WHEN DUP_VAL_ON_INDEX THEN
        ROLLBACK;
        RAISE_APPLICATION_ERROR(-20001, 'Email already registered.');
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/
