SET SERVEROUTPUT ON;

-- 1. Unit Tests for BRI Procedure
DECLARE
    v_bri NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('--- Unit Tests for BRI Procedure ---');
    -- Zeros
    compute_bri(0, 0, 0, 0, v_bri);
    DBMS_OUTPUT.PUT_LINE('Zeros: ' || v_bri);
    -- Max values
    compute_bri(10, 50, 0, 7, v_bri);
    DBMS_OUTPUT.PUT_LINE('Max values: ' || v_bri);
    -- Partial data
    compute_bri(5, 20, 10, 2, v_bri);
    DBMS_OUTPUT.PUT_LINE('Partial data: ' || v_bri);
    -- High stress only
    compute_bri(9, 0, 10, 5, v_bri);
    DBMS_OUTPUT.PUT_LINE('High stress only: ' || v_bri);
END;
/

-- 2. Seed SYSTEM_CONFIG
UPDATE SYSTEM_CONFIG 
SET bri_watch=40, bri_warning=65, bri_critical=85, unlock_days=7, allowed_misses=1, max_caseload=10;
COMMIT;

-- 3. Insert Test Data
-- Add 1 more counselor to have 3 total
INSERT INTO USERS (name, email, password_hash, role)
VALUES ('Dr. Zoya Farooq', 'zoya.farooq@nust.edu.pk', 'hash', 'COUNSELOR');
INSERT INTO COUNSELOR (counselor_id, specialization, max_caseload)
VALUES (SEQ_USER_ID.CURRVAL, 'General Counseling', 10);

-- Add 3 more 14C students to have 5 total
DECLARE
   base_email VARCHAR2(100) := 'student14c_X@students.nust.edu.pk';
BEGIN
   FOR i IN 3..5 LOOP
       INSERT INTO EMAIL_WHITELIST (email, is_used) VALUES (REPLACE(base_email, 'X', i), 0);
       INSERT INTO USERS (name, email, password_hash, role) VALUES ('14C Student ' || i, REPLACE(base_email, 'X', i), 'hash', 'STUDENT');
       INSERT INTO STUDENT (student_id, student_type) VALUES (SEQ_USER_ID.CURRVAL, '14C');
       INSERT INTO STUDENT_METRICS (student_id) VALUES (SEQ_USER_ID.CURRVAL);
       UPDATE EMAIL_WHITELIST SET is_used = 1, student_id = SEQ_USER_ID.CURRVAL WHERE email = REPLACE(base_email, 'X', i);
   END LOOP;
END;
/

-- Add 4 more General students to have 5 total
DECLARE
   base_email VARCHAR2(100) := 'studentgen_X@gmail.com';
BEGIN
   FOR i IN 2..5 LOOP
       INSERT INTO USERS (name, email, password_hash, role) VALUES ('Gen Student ' || i, REPLACE(base_email, 'X', i), 'hash', 'STUDENT');
       INSERT INTO STUDENT (student_id, student_type) VALUES (SEQ_USER_ID.CURRVAL, 'GENERAL');
       INSERT INTO STUDENT_METRICS (student_id) VALUES (SEQ_USER_ID.CURRVAL);
   END LOOP;
END;
/

COMMIT;

-- 4. Test T5 and T6 + Assignment Procedure
DECLARE
    v_test_student_id NUMBER;
    v_counselor_assigned NUMBER;
    v_alert_count NUMBER;
BEGIN
    DBMS_OUTPUT.PUT_LINE('--- Testing T5, T6 and Assignment Procedure ---');
    
    -- Pick first student
    SELECT MIN(student_id) INTO v_test_student_id FROM STUDENT;
    
    DBMS_OUTPUT.PUT_LINE('Test Student ID: ' || v_test_student_id);

    -- Simulate an UPDATE on STUDENT_METRICS that crosses the WATCH threshold (e.g. 50)
    UPDATE STUDENT_METRICS SET bri_score = 50 WHERE student_id = v_test_student_id;
    COMMIT;
    
    -- Check if ALERT was inserted (Deduplication check)
    SELECT COUNT(*) INTO v_alert_count FROM ALERT WHERE student_id = v_test_student_id AND status = 'OPEN';
    DBMS_OUTPUT.PUT_LINE('Open Alerts after setting BRI to 50: ' || v_alert_count);

    -- Simulate UPDATE on STUDENT_METRICS that crosses CRITICAL threshold (e.g. 90)
    UPDATE STUDENT_METRICS SET bri_score = 90 WHERE student_id = v_test_student_id;
    COMMIT;
        
    -- Check deduplication (should still be 1 open alert, because we had an OPEN alert already for WATCH, Wait, the prompt says "no OPEN alert exists" so NO new alert should be inserted if one is OPEN)
    SELECT COUNT(*) INTO v_alert_count FROM ALERT WHERE student_id = v_test_student_id AND status = 'OPEN';
    DBMS_OUTPUT.PUT_LINE('Open Alerts after setting BRI to 90 (deduplication check): ' || v_alert_count);
    
    -- Now resolve the old alert to allow a new one
    UPDATE ALERT SET status = 'RESOLVED' WHERE student_id = v_test_student_id;
    COMMIT;
    
    -- Set BRI score to normal to allow another update to cross
    UPDATE STUDENT_METRICS SET bri_score = 0 WHERE student_id = v_test_student_id;
    COMMIT;

    -- Set it to 95 to trigger CRITICAL and T6
    UPDATE STUDENT_METRICS SET bri_score = 95 WHERE student_id = v_test_student_id;
    COMMIT;

    -- Check if counselor got assigned
    BEGIN
        SELECT counselor_id INTO v_counselor_assigned
        FROM COUNSELOR_STUDENT
        WHERE student_id = v_test_student_id AND status = 'ACTIVE';
        DBMS_OUTPUT.PUT_LINE('Assigned Counselor ID for Critical Alert: ' || v_counselor_assigned);
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            DBMS_OUTPUT.PUT_LINE('NO COUNSELOR ASSIGNED for Critical Alert (FAILED)');
    END;

END;
/
