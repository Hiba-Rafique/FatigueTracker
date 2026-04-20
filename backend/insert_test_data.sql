-- Test Data Script for Students 5 and 6 (CORRECTED)
-- Purpose: Populate evaluation data for Counselor ID 3
-- Fix ORA-02290: trend_label must be IMPROVING, STABLE, DETERIORATING, or VOLATILE

BEGIN
  -- 1. Ensure User 5 and 6 are Students
  -- This assumes they already exist in USERS and STUDENT tables.
  
  -- 2. Assign Students to Counselor 3
  -- Note: We delete previous assignments to ensure 'ACTIVE' status consistency.
  DELETE FROM COUNSELOR_STUDENT WHERE student_id IN (5, 6);
  INSERT INTO COUNSELOR_STUDENT (counselor_id, student_id, status) VALUES (3, 5, 'ACTIVE');
  INSERT INTO COUNSELOR_STUDENT (counselor_id, student_id, status) VALUES (3, 6, 'ACTIVE');

  -- 3. Populate Metrics
  -- Correct values for trend_label: 'IMPROVING', 'STABLE', 'DETERIORATING', 'VOLATILE'
  DELETE FROM STUDENT_METRICS WHERE student_id IN (5, 6);
  INSERT INTO STUDENT_METRICS (student_id, bri_score, stress_avg, workload_score, activity_score, trend_label) 
  VALUES (5, 78, 8.2, 45, 12, 'DETERIORATING');
  
  INSERT INTO STUDENT_METRICS (student_id, bri_score, stress_avg, workload_score, activity_score, trend_label) 
  VALUES (6, 42, 4.1, 22, 65, 'STABLE');

  -- 4. Stress History (10 entries each)
  DELETE FROM STRESS_LOG WHERE student_id IN (5, 6);
  -- Student 5: High stress trend
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 4, SYSDATE - 9);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 5, SYSDATE - 8);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 7, SYSDATE - 7);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 8, SYSDATE - 6);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 6, SYSDATE - 5);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 9, SYSDATE - 4);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 9, SYSDATE - 3);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 8, SYSDATE - 2);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 10, SYSDATE - 1);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (5, 9.5, SYSDATE);

  -- Student 6: Stable trend
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 3, SYSDATE - 9);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4, SYSDATE - 8);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4, SYSDATE - 7);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 3, SYSDATE - 6);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 5, SYSDATE - 5);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4, SYSDATE - 4);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4, SYSDATE - 3);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 5, SYSDATE - 2);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4, SYSDATE - 1);
  INSERT INTO STRESS_LOG (student_id, stress_level, log_date) VALUES (6, 4.2, SYSDATE);

  -- 5. Pending Tasks
  DELETE FROM TASK_LOG WHERE student_id IN (5, 6);
  INSERT INTO TASK_LOG (student_id, title, deadline, effort_hours, status)
  VALUES (5, 'Advanced Neuro-Computing Exam', SYSDATE + 2, 12, 'PENDING');
  INSERT INTO TASK_LOG (student_id, title, deadline, effort_hours, status)
  VALUES (5, 'Biometric Analysis Lab Report', SYSDATE + 5, 8, 'PENDING');
  
  INSERT INTO TASK_LOG (student_id, title, deadline, effort_hours, status)
  VALUES (6, 'Intro to Psychology Quiz', SYSDATE + 1, 2, 'PENDING');

  -- 6. Open Alerts
  DELETE FROM ALERT WHERE student_id IN (5, 6) AND status = 'OPEN';
  INSERT INTO ALERT (student_id, alert_level, bri_value, status, created_at)
  VALUES (5, 'CRITICAL', 85, 'OPEN', SYSDATE - 1/24);
  
  INSERT INTO ALERT (student_id, alert_level, bri_value, status, created_at)
  VALUES (5, 'WATCH', 72, 'OPEN', SYSDATE - 3/24);

  COMMIT;
END;
/
