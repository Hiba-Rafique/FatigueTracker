SELECT user_id, email, password_hash, role , name
FROM USERS;

SET SERVEROUTPUT ON;

DECLARE
    v_id NUMBER;
    v_role VARCHAR2(20);
    v_name VARCHAR2(100);
BEGIN
    login_user(
        'test.14c@students.nust.edu.pk',
        'hashedpass123',
        v_id,
        v_role,
        v_name
    );

    DBMS_OUTPUT.PUT_LINE('UserID: ' || v_id);
    DBMS_OUTPUT.PUT_LINE('Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_name);
END;
/

DESC login_user;

SET SERVEROUTPUT ON;

DECLARE
    v_id NUMBER;
    v_role VARCHAR2(20);
    v_name VARCHAR2(100);
BEGIN
    login_user(
        p_email    => 'test.14c@students.nust.edu.pk',
        p_password => 'hashedpass123',
        p_user_id  => v_id,
        p_role     => v_role,
        p_name     => v_name
    );

    DBMS_OUTPUT.PUT_LINE('UserID: ' || v_id);
    DBMS_OUTPUT.PUT_LINE('Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_name);
END;
/

SELECT argument_name, position, in_out, data_type
FROM user_arguments
WHERE object_name = 'LOGIN_USER'
ORDER BY position;

SET SERVEROUTPUT ON;

DECLARE
    v_id NUMBER;
    v_role VARCHAR2(20);
    v_name VARCHAR2(100);
BEGIN
    login_user(
        p_email    => 'test.14c@students.nust.edu.pk',
        p_password => 'hashedpass123',
        p_user_id  => v_id,
        p_role     => v_role,
        p_name     => v_name
    );

    DBMS_OUTPUT.PUT_LINE('UserID: ' || v_id);
    DBMS_OUTPUT.PUT_LINE('Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_name);
END;
/

SELECT object_name, status
FROM user_objects
WHERE object_name = 'LOGIN_USER';

SELECT 
    position,
    argument_name,
    in_out,
    data_type
FROM user_arguments
WHERE object_name = 'LOGIN_USER'
ORDER BY position;

SELECT object_name, object_type
FROM user_objects
WHERE object_name = 'LOGIN_USER';

SET SERVEROUTPUT ON

DECLARE
    v_id NUMBER;
    v_role VARCHAR2(20);
    v_name VARCHAR2(100);
BEGIN
    login_user(
        p_email    => 'test.14c@students.nust.edu.pk',
        p_password => 'hashedpass123',
        p_user_id  => v_id,
        p_role     => v_role,
        p_name     => v_name
    );

    DBMS_OUTPUT.PUT_LINE('UserID: ' || v_id);
    DBMS_OUTPUT.PUT_LINE('Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_name);
END;
/

SELECT owner, object_name, object_type
FROM all_objects
WHERE object_name = 'LOGIN_USER';

SET SERVEROUTPUT ON

DECLARE
    v_id NUMBER;
    v_role VARCHAR2(20);
    v_name VARCHAR2(100);
BEGIN
    fatigue_tracker.login_user(
        p_email    => 'test.14c@students.nust.edu.pk',
        p_password => 'hashedpass123',
        p_user_id  => v_id,
        p_role     => v_role,
        p_name     => v_name
    );

    DBMS_OUTPUT.PUT_LINE('UserID: ' || v_id);
    DBMS_OUTPUT.PUT_LINE('Role: ' || v_role);
    DBMS_OUTPUT.PUT_LINE('Name: ' || v_name);
END;
/

ALTER SESSION SET CURRENT_SCHEMA = FATIGUE_TRACKER;

SELECT max_caseload, bri_watch, bri_warning, bri_critical
FROM SYSTEM_CONFIG;

BEGIN
    update_system_config(
        p_max_caseload        => 15,
        p_bri_watch           => 30,
        p_bri_warning         => 60,
        p_bri_critical        => 90,
        p_unlock_days         => 7,
        p_allowed_misses      => 1,
        p_pattern_window_days => 30
    );
END;
/

SELECT max_caseload, bri_watch, bri_warning, bri_critical
FROM SYSTEM_CONFIG;

BEGIN
    update_system_config(
        p_max_caseload        => 10,
        p_bri_watch           => 70,
        p_bri_warning         => 60,
        p_bri_critical        => 80,
        p_unlock_days         => 7,
        p_allowed_misses      => 1,
        p_pattern_window_days => 30
    );
END;
/

UPDATE STUDENT_METRICS
SET 
    stress_avg = 8,
    bri_score = 75,
    trend_label = 'DETERIORATING',
    recommendation_status = 'UNLOCKED'
WHERE student_id = 8;

COMMIT;

INSERT INTO TASK_LOG (student_id, title, deadline, effort_hours, status)
VALUES (8, 'Test Task 1', SYSDATE + 1, 5, 'PENDING');

INSERT INTO TASK_LOG (student_id, title, deadline, effort_hours, status)
VALUES (8, 'Test Task 2', SYSDATE + 1, 4, 'PENDING');

COMMIT;

BEGIN
    generate_recommendations(8);
END;
/

SELECT type, message 
FROM RECOMMENDATION 
WHERE student_id = 8;

BEGIN
    generate_recommendations(8);
END;
/

SELECT type, COUNT(*) 
FROM RECOMMENDATION 
WHERE student_id = 8
GROUP BY type;

DELETE FROM RECOMMENDATION WHERE student_id = 8;
COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'LOCKED'
WHERE student_id = 8;

COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'UNLOCKED'
WHERE student_id = 8;

COMMIT;

SELECT type FROM RECOMMENDATION WHERE student_id = 8;

SELECT trigger_name, status
FROM user_triggers
WHERE trigger_name LIKE '%RECOMMEND%';

DELETE FROM RECOMMENDATION WHERE student_id = 8;
COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'LOCKED'
WHERE student_id = 8;

COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'UNLOCKED'
WHERE student_id = 8;

COMMIT;

SELECT type FROM RECOMMENDATION WHERE student_id = 8;

DELETE FROM RECOMMENDATION WHERE student_id = 8;
COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'LOCKED'
WHERE student_id = 8;

COMMIT;

UPDATE STUDENT_METRICS
SET recommendation_status = 'UNLOCKED'
WHERE student_id = 8;

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

