
-- SCHEDULED JOBS 

-- ── Job 1: calculate_weekly_stats ───────────────────────────
CREATE OR REPLACE PROCEDURE job_calculate_weekly_stats AS
    v_avg_stress NUMBER;
    v_student_count NUMBER;
    v_prev_avg NUMBER;
    v_trend VARCHAR2(20);
    v_week_start DATE := TRUNC(SYSDATE, 'IW'); -- Monday of current week
    v_week_end DATE := TRUNC(SYSDATE, 'IW') + 6;
BEGIN
    -- step 1: grab the average stress for everyone in the 14C cohort
    SELECT ROUND(AVG(sm.stress_avg), 1), COUNT(sm.student_id)
    INTO v_avg_stress, v_student_count
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
    INSERT INTO WEEKLY_SECTION_STATS (week_start, week_end, avg_stress, student_count, trend_label)
    VALUES (v_week_start, v_week_end, v_avg_stress, v_student_count, v_trend);
EXCEPTION
    WHEN OTHERS THEN NULL;
END;
/

-- ── Job 2: generate_pattern_profile ──────────────────────────
CREATE OR REPLACE PROCEDURE job_upsert_pattern_profile AS
BEGIN
    -- look at everyone who has logged data in our minimum pattern window (like 30 days)
    FOR rec IN (
        SELECT sm.student_id 
        FROM STUDENT_METRICS sm
        JOIN SYSTEM_CONFIG sc ON 1=1
        WHERE sm.last_log_date >= TRUNC(SYSDATE) - sc.pattern_window_days
    ) LOOP
        DECLARE
            v_count NUMBER;
        BEGIN
            -- check if they already have a "high stress pattern" profile made
            SELECT COUNT(*) INTO v_count 
            FROM PATTERN_PROFILE 
            WHERE student_id = rec.student_id AND trigger_category = 'HIGH_STRESS_PATTERN';
            
            IF v_count = 0 THEN
                -- no profile yet, so create one! (first time hitting a bad pattern)
                INSERT INTO PATTERN_PROFILE (student_id, trigger_category, frequency_count, avg_severity)
                VALUES (rec.student_id, 'HIGH_STRESS_PATTERN', 1, 8);
            ELSE
                -- already exists, just bump up the frequency count (they did it again)
                UPDATE PATTERN_PROFILE 
                SET frequency_count = frequency_count + 1 
                WHERE student_id = rec.student_id AND trigger_category = 'HIGH_STRESS_PATTERN';
            END IF;
        END;
    END LOOP;
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
