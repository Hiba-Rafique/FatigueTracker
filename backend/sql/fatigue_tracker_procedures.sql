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

-- ============================================================
-- ZAINA: Login Authentication Procedure
-- Called by POST /auth/login
-- Returns user_id, role, name for JWT generation
-- Returns -1 if credentials invalid
-- ============================================================
CREATE OR REPLACE PROCEDURE auth_login(
    p_email      IN  VARCHAR2,
    p_password   IN  VARCHAR2,
    p_user_id    OUT NUMBER,
    p_role       OUT VARCHAR2,
    p_name       OUT VARCHAR2
) AS
BEGIN
    SELECT user_id, role, name
    INTO   p_user_id, p_role, p_name
    FROM   USERS
    WHERE  LOWER(email)   = LOWER(p_email)
    AND    password_hash  = p_password
    AND    is_active      = 1;
 
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        p_user_id := -1;
        p_role    := NULL;
        p_name    := NULL;
END;
/

-- ============================================================
-- ZAINA: Admin SYSTEM_CONFIG Update Procedure
-- Called by PUT /admin/config
-- Updates all threshold and config values in one go
-- ============================================================
CREATE OR REPLACE PROCEDURE update_system_config(
    p_max_caseload        IN NUMBER,
    p_bri_watch           IN NUMBER,
    p_bri_warning         IN NUMBER,
    p_bri_critical        IN NUMBER,
    p_unlock_days         IN NUMBER,
    p_allowed_misses      IN NUMBER,
    p_pattern_window_days IN NUMBER
) AS
BEGIN
    -- Validate order before updating
    IF p_bri_watch >= p_bri_warning OR p_bri_warning >= p_bri_critical THEN
        RAISE_APPLICATION_ERROR(-20002,
            'Invalid thresholds: watch < warning < critical required.');
    END IF;

    UPDATE SYSTEM_CONFIG
    SET    max_caseload        = p_max_caseload,
           bri_watch           = p_bri_watch,
           bri_warning         = p_bri_warning,
           bri_critical        = p_bri_critical,
           unlock_days         = p_unlock_days,
           allowed_misses      = p_allowed_misses,
           pattern_window_days = p_pattern_window_days
    WHERE  ROWNUM = 1;

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


-- ============================================================
-- ZAINA: Adaptive Recommendation Engine Procedure
-- Called by unlock trigger when recommendation_status = UNLOCKED
-- Rule-based: evaluates current STUDENT_METRICS state
-- Inserts recommendations only if no active duplicate exists
-- ============================================================
CREATE OR REPLACE PROCEDURE generate_recommendations(
    p_student_id IN NUMBER
) AS
    v_bri_score   NUMBER;
    v_stress_avg  NUMBER;
    v_workload    NUMBER;
    v_activity    NUMBER;
    v_trend       VARCHAR2(20);
    v_rec_status  VARCHAR2(10);
    v_dup_count   NUMBER;
    v_urgent_tasks NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('→ generate_recommendations called with student_id=' || p_student_id);
    
    -- Read current student state
    SELECT bri_score, stress_avg, workload_score,
           activity_score, trend_label, recommendation_status
    INTO   v_bri_score, v_stress_avg, v_workload,
           v_activity, v_trend, v_rec_status
    FROM   STUDENT_METRICS
    WHERE  student_id = p_student_id;
    
    DBMS_OUTPUT.PUT_LINE('  BRI=' || v_bri_score || ', stress_avg=' || v_stress_avg || ', trend=' || v_trend || ', rec_status=' || v_rec_status);

    -- Only generate if unlocked
    IF v_rec_status != 'UNLOCKED' THEN
        DBMS_OUTPUT.PUT_LINE('  ✗ Status is ' || v_rec_status || ', not UNLOCKED. Returning.');
        RETURN;
    END IF;
    
    DBMS_OUTPUT.PUT_LINE('  ✓ Status is UNLOCKED. Checking rules...');

    -- Count tasks due within 48 hours
    SELECT COUNT(*) INTO v_urgent_tasks
    FROM   TASK_LOG
    WHERE  student_id   = p_student_id
    AND    status       = 'PENDING'
    AND    deadline     <= TRUNC(SYSDATE) + 2
    AND    deadline     IS NOT NULL;
    
    DBMS_OUTPUT.PUT_LINE('  Urgent tasks: ' || v_urgent_tasks);

    -- Rule 1: CONTACT_COUNSELOR
    IF v_stress_avg > 7 OR v_trend = 'DETERIORATING' THEN
        DBMS_OUTPUT.PUT_LINE('  Rule 1 (CONTACT_COUNSELOR): PASS');
        SELECT COUNT(*) INTO v_dup_count
        FROM   RECOMMENDATION
        WHERE  student_id = p_student_id
        AND    type       = 'CONTACT_COUNSELOR'
        AND    is_active  = 1;
        
        IF v_dup_count = 0 THEN
            INSERT INTO RECOMMENDATION
                (recommendation_id, student_id, type, message,
                 generated_by, is_active)
            VALUES
                (SEQ_RECOMMENDATION_ID.NEXTVAL, p_student_id,
                 'CONTACT_COUNSELOR',
                 'Your stress levels have been consistently high. Consider reaching out to your assigned counselor for support.',
                 'SYSTEM', 1);
            DBMS_OUTPUT.PUT_LINE('    → Inserted CONTACT_COUNSELOR');
        ELSE
            DBMS_OUTPUT.PUT_LINE('    → Duplicate CONTACT_COUNSELOR exists, skipped');
        END IF;
    ELSE
        DBMS_OUTPUT.PUT_LINE('  Rule 1 (CONTACT_COUNSELOR): FAIL (stress_avg=' || v_stress_avg || ', trend=' || v_trend || ')');
    END IF;

    -- Rule 2: DEFER_TASK
    IF v_urgent_tasks >= 2 AND v_stress_avg > 6 THEN
        DBMS_OUTPUT.PUT_LINE('  Rule 2 (DEFER_TASK): PASS');
        SELECT COUNT(*) INTO v_dup_count
        FROM   RECOMMENDATION
        WHERE  student_id = p_student_id
        AND    type       = 'DEFER_TASK'
        AND    is_active  = 1;

        IF v_dup_count = 0 THEN
            INSERT INTO RECOMMENDATION
                (recommendation_id, student_id, type, message,
                 generated_by, is_active)
            VALUES
                (SEQ_RECOMMENDATION_ID.NEXTVAL, p_student_id,
                 'DEFER_TASK',
                 'You have multiple urgent deadlines while under high stress. Consider deferring any non-critical tasks to reduce immediate workload.',
                 'SYSTEM', 1);
            DBMS_OUTPUT.PUT_LINE('    → Inserted DEFER_TASK');
        ELSE
            DBMS_OUTPUT.PUT_LINE('    → Duplicate DEFER_TASK exists, skipped');
        END IF;
    ELSE
        DBMS_OUTPUT.PUT_LINE('  Rule 2 (DEFER_TASK): FAIL (urgent_tasks=' || v_urgent_tasks || ', stress_avg=' || v_stress_avg || ')');
    END IF;

    -- Rule 3: REST
    IF v_bri_score > 60 OR v_trend = 'VOLATILE' THEN
        DBMS_OUTPUT.PUT_LINE('  Rule 3 (REST): PASS');
        SELECT COUNT(*) INTO v_dup_count
        FROM   RECOMMENDATION
        WHERE  student_id = p_student_id
        AND    type       = 'REST'
        AND    is_active  = 1;

        IF v_dup_count = 0 THEN
            INSERT INTO RECOMMENDATION
                (recommendation_id, student_id, type, message,
                 generated_by, is_active)
            VALUES
                (SEQ_RECOMMENDATION_ID.NEXTVAL, p_student_id,
                 'REST',
                 'Your fatigue index is elevated. Schedule at least one full rest period this week — no academic work, no extracurriculars.',
                 'SYSTEM', 1);
            DBMS_OUTPUT.PUT_LINE('    → Inserted REST');
        ELSE
            DBMS_OUTPUT.PUT_LINE('    → Duplicate REST exists, skipped');
        END IF;
    ELSE
        DBMS_OUTPUT.PUT_LINE('  Rule 3 (REST): FAIL (bri_score=' || v_bri_score || ', trend=' || v_trend || ')');
    END IF;

    -- Rule 4: RESOURCE (always insert once when unlocked)
    DBMS_OUTPUT.PUT_LINE('  Rule 4 (RESOURCE): Always checking...');
    SELECT COUNT(*) INTO v_dup_count
    FROM   RECOMMENDATION
    WHERE  student_id = p_student_id
    AND    type       = 'RESOURCE'
    AND    is_active  = 1;

    IF v_dup_count = 0 THEN
        INSERT INTO RECOMMENDATION
            (recommendation_id, student_id, type, message,
             generated_by, is_active)
        VALUES
            (SEQ_RECOMMENDATION_ID.NEXTVAL, p_student_id,
             'RESOURCE',
             'Access NUST student wellness resources at wellness.nust.edu.pk — includes guided relaxation, academic counseling, and peer support groups.',
             'SYSTEM', 1);
        DBMS_OUTPUT.PUT_LINE('    → Inserted RESOURCE');
    ELSE
        DBMS_OUTPUT.PUT_LINE('    → Duplicate RESOURCE exists, skipped');
    END IF;

    
    DBMS_OUTPUT.PUT_LINE('✓ generate_recommendations completed');

EXCEPTION
    WHEN OTHERS THEN
        DBMS_OUTPUT.PUT_LINE('✗ ERROR: ' || SQLCODE || ' ' || SQLERRM);
        
        NULL;
END;
/


