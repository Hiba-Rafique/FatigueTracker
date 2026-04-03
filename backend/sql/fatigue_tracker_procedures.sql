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

    -- 5. Flip old ACTIVE -> INACTIVE first
    UPDATE COUNSELOR_STUDENT 
    SET status = 'INACTIVE' 
    WHERE student_id = p_student_id AND status = 'ACTIVE';

    -- 4. INSERT new ACTIVE row
    INSERT INTO COUNSELOR_STUDENT (student_id, counselor_id, status, assigned_by)
    VALUES (p_student_id, v_counselor_id, 'ACTIVE', 'SYSTEM');

    -- Insert notification log
    INSERT INTO NOTIFICATION_LOG (user_id, message, type)
    VALUES (p_student_id, 'A new counselor has been assigned to you.', 'ASSIGNMENT');
    
    INSERT INTO NOTIFICATION_LOG (user_id, message, type)
    VALUES (v_counselor_id, 'A new student has been assigned to you: ' || p_student_id, 'ASSIGNMENT');

END;
/
