
-- SCHEDULED JOBS 

-- ── Job 1: calculate_weekly_stats ───────────────────────────

-- Update the weekly stats procedure
CREATE OR REPLACE PROCEDURE job_calculate_weekly_stats AS
    v_avg_stress NUMBER;
    v_avg_workload NUMBER;
    v_student_count NUMBER;
    v_critical_count NUMBER;
    v_prev_avg NUMBER;
    v_trend VARCHAR2(20);
    v_week_start DATE := TRUNC(SYSDATE, 'IW'); -- Monday of current week
    v_week_end DATE := TRUNC(SYSDATE, 'IW') + 6;
BEGIN
    -- step 1: grab the average stress, workload, and critical case count for everyone in the 14C cohort
    SELECT 
        ROUND(AVG(sm.stress_avg), 1), 
        ROUND(AVG(sm.workload_score), 1), 
        COUNT(sm.student_id),
        COUNT(CASE WHEN sm.stress_avg >= 7.0 THEN 1 END)
    INTO v_avg_stress, v_avg_workload, v_student_count, v_critical_count
    FROM STUDENT_METRICS sm
    JOIN STUDENT s ON sm.student_id = s.student_id
    WHERE s.student_type = '14C';

    -- step 2: look at last week's stats to see if things are getting worse
    BEGIN
        SELECT avg_stress INTO v_prev_avg
        FROM WEEKLY_SECTION_STATS
        WHERE week_start = v_week_start - 7;

        -- if stress jumped by more than 0.5, we label it INCREASING
        IF v_avg_stress > v_prev_avg + 0.5 THEN
            v_trend := 'INCREASING';
        -- if it dropped by more than 0.5, it's DECREASING
        ELSIF v_avg_stress < v_prev_avg - 0.5 THEN
            v_trend := 'DECREASING';
        ELSE
            v_trend := 'STABLE';
        END IF;
    EXCEPTION
        -- if there's no data for last week (like week 1), just call it STABLE
        WHEN NO_DATA_FOUND THEN
            v_trend := 'STABLE';
    END;

    -- step 3: formally save this week's stats into the DB
    -- UPSERT logic: if stats for this week already exist, update them
    MERGE INTO WEEKLY_SECTION_STATS w
    USING (
        SELECT 
            v_week_start as ws, v_week_end as we, v_avg_stress as ast, 
            v_avg_workload as awl, v_student_count as sc, v_critical_count as cc, 
            v_trend as tr 
        FROM dual
    ) s
    ON (w.week_start = s.ws)
    WHEN MATCHED THEN
        UPDATE SET 
            avg_stress = s.ast, 
            avg_workload = s.awl, 
            student_count = s.sc, 
            critical_count = s.cc, 
            trend_label = s.tr, 
            computed_at = CURRENT_TIMESTAMP
    WHEN NOT MATCHED THEN
        INSERT (week_start, week_end, avg_stress, avg_workload, student_count, critical_count, trend_label)
        VALUES (s.ws, s.we, s.ast, s.awl, s.sc, s.cc, s.tr);

    COMMIT;
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/


-- ── Job 2: generate_pattern_profile ──────────────────────────
CREATE OR REPLACE PROCEDURE job_upsert_pattern_profile AS
BEGIN
    FOR rec IN (
        SELECT sm.student_id, sm.stress_avg, sm.bri_score, 
               sm.consecutive_high_days, sm.trend_label, sm.activity_score
        FROM STUDENT_METRICS sm
        JOIN SYSTEM_CONFIG sc ON 1=1
        WHERE sm.last_log_date >= TRUNC(SYSDATE) - sc.pattern_window_days
    ) LOOP
        DECLARE
            v_sid        NUMBER       := rec.student_id;
            v_stress     NUMBER       := rec.stress_avg;
            v_bri        NUMBER       := rec.bri_score;
            v_high_days  NUMBER       := rec.consecutive_high_days;
            v_trend      VARCHAR2(20) := rec.trend_label;
            v_activity   NUMBER       := rec.activity_score;
            v_task_count NUMBER;
        BEGIN
            -- Pattern 1: High Stress Cluster
            IF v_stress >= 7.5 THEN
                MERGE INTO PATTERN_PROFILE p
                USING (SELECT v_sid as sid, 'EXAM_WEEK_CLUSTER' as cat FROM dual) s
                ON (p.student_id = s.sid AND p.trigger_category = s.cat)
                WHEN MATCHED THEN
                    UPDATE SET frequency_count = frequency_count + 1, last_updated = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (student_id, trigger_category, frequency_count, avg_severity, pattern_summary)
                    VALUES (v_sid, 'EXAM_WEEK_CLUSTER', 1, v_stress, 
                            'High-density stress cluster detected. Average levels (' || v_stress || ') suggest a sustained period of academic or personal pressure.');
            END IF;

            -- Pattern 2: Burnout Risk
            IF v_high_days >= 5 THEN
                MERGE INTO PATTERN_PROFILE p
                USING (SELECT v_sid as sid, 'BURNOUT_RISK' as cat FROM dual) s
                ON (p.student_id = s.sid AND p.trigger_category = s.cat)
                WHEN MATCHED THEN
                    UPDATE SET frequency_count = frequency_count + 1, last_updated = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (student_id, trigger_category, frequency_count, avg_severity, pattern_summary)
                    VALUES (v_sid, 'BURNOUT_RISK', 1, 9.0, 
                            'Acute burnout risk identified. Subject has maintained a stress level of 7+ for ' || v_high_days || ' consecutive days.');
            END IF;

            -- Pattern 3: Deadline Pressure
            SELECT COUNT(*) INTO v_task_count FROM TASK_LOG 
            WHERE student_id = v_sid AND status = 'PENDING';
            
            IF v_bri > 65 AND v_task_count >= 3 THEN
                MERGE INTO PATTERN_PROFILE p
                USING (SELECT v_sid as sid, 'DEADLINE_PRESSURE' as cat FROM dual) s
                ON (p.student_id = s.sid AND p.trigger_category = s.cat)
                WHEN MATCHED THEN
                    UPDATE SET frequency_count = frequency_count + 1, last_updated = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (student_id, trigger_category, frequency_count, avg_severity, pattern_summary)
                    VALUES (v_sid, 'DEADLINE_PRESSURE', 1, 8.0, 
                            'Critical academic overhead detected. ' || v_task_count || ' pending tasks and elevated BRI (' || v_bri || ') indicate significant clustering.');
            END IF;

            -- Pattern 4: Volatile Trend
            IF v_trend = 'VOLATILE' THEN
                MERGE INTO PATTERN_PROFILE p
                USING (SELECT v_sid as sid, 'VOLATILE_FLUCTUATION' as cat FROM dual) s
                ON (p.student_id = s.sid AND p.trigger_category = s.cat)
                WHEN MATCHED THEN
                    UPDATE SET frequency_count = frequency_count + 1, last_updated = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (student_id, trigger_category, frequency_count, avg_severity, pattern_summary)
                    VALUES (v_sid, 'VOLATILE_FLUCTUATION', 1, 6.5, 
                            'High emotional/cognitive volatility detected. Frequent swings in stress levels suggest unstable coping mechanisms.');
            END IF;

            -- Pattern 5: Recovery Phase
            IF v_stress < 4.0 AND v_activity > 12 THEN
                MERGE INTO PATTERN_PROFILE p
                USING (SELECT v_sid as sid, 'RECOVERY_PHASE' as cat FROM dual) s
                ON (p.student_id = s.sid AND p.trigger_category = s.cat)
                WHEN MATCHED THEN
                    UPDATE SET frequency_count = frequency_count + 1, last_updated = SYSDATE
                WHEN NOT MATCHED THEN
                    INSERT (student_id, trigger_category, frequency_count, avg_severity, pattern_summary)
                    VALUES (v_sid, 'RECOVERY_PHASE', 1, 3.0, 
                            'Strong recovery signal identified. Low stress and increased activity indicate successful decompression.');
            END IF;
        END;
    END LOOP;
    COMMIT;
END;
/

-- ── Job 3: generate_weekly_digest ────────────────────────────
CREATE OR REPLACE PROCEDURE job_generate_weekly_digest AS
BEGIN
    -- literally just go through every active student and send them a notification about their weekly digest
    FOR rec IN (SELECT user_id FROM USERS WHERE role = 'STUDENT' AND is_active = 1) LOOP
        INSERT INTO NOTIFICATION_LOG (user_id, message, type)
        VALUES (rec.user_id, 'Your weekly fatigue summary is ready to view.', 'SUMMARY');
    END LOOP;
END;
/
