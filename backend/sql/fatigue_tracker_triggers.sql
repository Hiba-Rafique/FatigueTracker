-- 1. T5 Trigger
CREATE OR REPLACE TRIGGER trg_student_metrics_bri
AFTER UPDATE OF bri_score ON STUDENT_METRICS
FOR EACH ROW
WHEN (NEW.bri_score <> OLD.bri_score)
DECLARE
    v_watch NUMBER;
    v_warning NUMBER;
    v_critical NUMBER;
    v_open_count NUMBER;
    v_alert_level VARCHAR2(10) := NULL;
BEGIN
    SELECT bri_watch, bri_warning, bri_critical 
    INTO v_watch, v_warning, v_critical
    FROM SYSTEM_CONFIG WHERE ROWNUM = 1;

    IF :NEW.bri_score >= v_critical THEN
        v_alert_level := 'CRITICAL';
    ELSIF :NEW.bri_score >= v_warning THEN
        v_alert_level := 'WARNING';
    ELSIF :NEW.bri_score >= v_watch THEN
        v_alert_level := 'WATCH';
    END IF;

    IF v_alert_level IS NOT NULL THEN
        SELECT COUNT(*) INTO v_open_count
        FROM ALERT
        WHERE student_id = :NEW.student_id AND status = 'OPEN';

        IF v_open_count = 0 THEN
            INSERT INTO ALERT (student_id, alert_level, bri_value, status)
            VALUES (:NEW.student_id, v_alert_level, :NEW.bri_score, 'OPEN');
        END IF;
    END IF;
END;
/

-- 2. T6 Trigger
CREATE OR REPLACE TRIGGER trg_alert_insert
AFTER INSERT ON ALERT
FOR EACH ROW
DECLARE
    v_active_counselor_count NUMBER;
BEGIN
    IF :NEW.alert_level = 'CRITICAL' THEN
        SELECT COUNT(*) INTO v_active_counselor_count
        FROM COUNSELOR_STUDENT
        WHERE student_id = :NEW.student_id AND status = 'ACTIVE';

        IF v_active_counselor_count = 0 THEN
            assign_counselor(:NEW.student_id);
        END IF;
    END IF;
END;
/

-- ============================================================
-- ZAINA'S TRIGGERS: T1, T2, T3, T4
-- ============================================================

-- ── T1: trg_stress_log_insert ────────────────────────────────
-- Fires: AFTER INSERT on STRESS_LOG (primary logs only)
-- Does: stress_avg, log_streak, last_log_date,
--       consecutive_high_days, trend_label,
--       recommendation_status, then calls compute_bri
-- ============================================================
CREATE OR REPLACE TRIGGER trg_stress_log_insert
FOR INSERT ON STRESS_LOG
COMPOUND TRIGGER

    v_student_id NUMBER;
    v_today      DATE;

    AFTER EACH ROW IS
    BEGIN
        IF :NEW.is_primary = 1 THEN
            v_student_id := :NEW.student_id;
            v_today      := TRUNC(:NEW.log_date);
        END IF;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        v_last_log       DATE;
        v_streak         NUMBER;
        v_stress_avg     NUMBER;
        v_high_days      NUMBER;
        v_trend          VARCHAR2(20);
        v_rec_status     VARCHAR2(10);
        v_unlock_days    NUMBER;
        v_allowed_misses NUMBER;
        v_gap            NUMBER := 0;
        v_workload       NUMBER;
        v_activity       NUMBER;
        v_bri_out        NUMBER;
        v_log_count      NUMBER;

        v_s1 NUMBER; v_s2 NUMBER; v_s3 NUMBER;
        v_s4 NUMBER; v_s5 NUMBER; v_s6 NUMBER; v_s7 NUMBER;
        v_first3_avg NUMBER;
        v_last3_avg  NUMBER;
        v_slope      NUMBER;
        v_variance   NUMBER;

    BEGIN
        IF v_student_id IS NOT NULL THEN

            -- Step 1: Read current metrics
            SELECT last_log_date, log_streak, recommendation_status
            INTO   v_last_log, v_streak, v_rec_status
            FROM   STUDENT_METRICS
            WHERE  student_id = v_student_id;

            -- Step 2: Read config
            SELECT unlock_days, allowed_misses
            INTO   v_unlock_days, v_allowed_misses
            FROM   SYSTEM_CONFIG WHERE ROWNUM = 1;

            -- Step 3: Compute streak
            IF v_last_log IS NULL THEN
                v_streak := 1;
                v_gap    := 0;
            ELSE
                v_gap := v_today - TRUNC(v_last_log);
                IF v_gap = 0 THEN
                    NULL;
                ELSIF v_gap = 1 THEN
                    v_streak := v_streak + 1;
                ELSIF v_gap <= (1 + v_allowed_misses) THEN
                    v_streak := v_streak + 1;
                ELSE
                    v_streak := 1;
                END IF;
            END IF;

            -- Step 4: Recommendation lock/unlock
            IF v_streak >= v_unlock_days THEN
                v_rec_status := 'UNLOCKED';
            ELSIF v_gap > (1 + v_allowed_misses) THEN
                v_rec_status := 'LOCKED';
            END IF;

            -- Step 5: Stress average
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

            -- Step 6: Consecutive high stress days
            SELECT COUNT(*)
            INTO   v_high_days
            FROM   (
                SELECT log_date,
                       stress_level,
                       log_date - LAG(log_date)
                           OVER (ORDER BY log_date) AS day_gap
                FROM   (
                    SELECT TRUNC(log_date)   AS log_date,
                           MAX(stress_level) AS stress_level
                    FROM   STRESS_LOG
                    WHERE  student_id = v_student_id
                    AND    is_primary  = 1
                    GROUP  BY TRUNC(log_date)
                    ORDER  BY log_date DESC
                    FETCH  FIRST 7 ROWS ONLY
                )
            )
            WHERE stress_level >= 7
            AND  (day_gap = 1 OR day_gap IS NULL);

            -- Step 7: Trend label
            SELECT COUNT(*) INTO v_log_count
            FROM   STRESS_LOG
            WHERE  student_id = v_student_id
            AND    is_primary  = 1;

            IF v_log_count >= 7 THEN
                BEGIN
                    SELECT s1, s2, s3, s4, s5, s6, s7
                    INTO   v_s1, v_s2, v_s3, v_s4, v_s5, v_s6, v_s7
                    FROM   (
                        SELECT
                            stress_level AS s1,
                            LEAD(stress_level,1) OVER (ORDER BY log_date) AS s2,
                            LEAD(stress_level,2) OVER (ORDER BY log_date) AS s3,
                            LEAD(stress_level,3) OVER (ORDER BY log_date) AS s4,
                            LEAD(stress_level,4) OVER (ORDER BY log_date) AS s5,
                            LEAD(stress_level,5) OVER (ORDER BY log_date) AS s6,
                            LEAD(stress_level,6) OVER (ORDER BY log_date) AS s7
                        FROM (
                            SELECT stress_level, log_date
                            FROM   STRESS_LOG
                            WHERE  student_id = v_student_id
                            AND    is_primary  = 1
                            ORDER  BY log_date ASC
                            FETCH  FIRST 7 ROWS ONLY
                        )
                    )
                    WHERE ROWNUM = 1;

                    v_first3_avg := (v_s1 + v_s2 + v_s3) / 3;
                    v_last3_avg  := (v_s5 + v_s6 + v_s7) / 3;
                    v_slope      := v_last3_avg - v_first3_avg;
                    v_variance   := (  ABS(v_s1 - v_stress_avg)
                                     + ABS(v_s2 - v_stress_avg)
                                     + ABS(v_s3 - v_stress_avg)
                                     + ABS(v_s4 - v_stress_avg)
                                     + ABS(v_s5 - v_stress_avg)
                                     + ABS(v_s6 - v_stress_avg)
                                     + ABS(v_s7 - v_stress_avg) ) / 7;

                    IF v_variance > 2 THEN
                        v_trend := 'VOLATILE';
                    ELSIF v_slope > 0.5 THEN
                        v_trend := 'DETERIORATING';
                    ELSIF v_slope < -0.5 THEN
                        v_trend := 'IMPROVING';
                    ELSE
                        v_trend := 'STABLE';
                    END IF;
                EXCEPTION
                    WHEN NO_DATA_FOUND THEN
                        v_trend := 'STABLE';
                END;
            ELSE
                SELECT trend_label INTO v_trend
                FROM   STUDENT_METRICS
                WHERE  student_id = v_student_id;
            END IF;

            -- Step 8: Write all metrics
            UPDATE STUDENT_METRICS
            SET    stress_avg            = ROUND(NVL(v_stress_avg, 0), 2),
                   log_streak            = v_streak,
                   last_log_date         = v_today,
                   consecutive_high_days = v_high_days,
                   trend_label           = v_trend,
                   recommendation_status = v_rec_status,
                   calculated_at         = CURRENT_TIMESTAMP
            WHERE  student_id = v_student_id;

            -- Step 9: Read workload and activity
            SELECT workload_score, activity_score
            INTO   v_workload, v_activity
            FROM   STUDENT_METRICS
            WHERE  student_id = v_student_id;

            -- Step 10: Call BRI procedure
            compute_bri(
                p_stress_avg       => ROUND(NVL(v_stress_avg, 0), 2),
                p_workload_score   => NVL(v_workload, 0),
                p_activity_score   => NVL(v_activity, 0),
                p_consec_high_days => v_high_days,
                p_bri_score        => v_bri_out
            );

            -- Step 11: Write BRI score
            UPDATE STUDENT_METRICS
            SET    bri_score     = v_bri_out,
                   calculated_at = CURRENT_TIMESTAMP
            WHERE  student_id    = v_student_id;

        END IF; -- end IF v_student_id IS NOT NULL

    EXCEPTION
        WHEN OTHERS THEN
            NULL;
    END AFTER STATEMENT;

END trg_stress_log_insert;
/

-- ── T2: trg_task_log_insert ──────────────────────────────────
-- Fires: AFTER INSERT on TASK_LOG
-- Does: recomputes workload_score then calls compute_bri
-- Workload formula: SUM(effort_hours * priority_weight /
--                  GREATEST(days_until_deadline, 1))
--                  for all PENDING tasks, capped at 50
-- ============================================================
CREATE OR REPLACE TRIGGER trg_task_log_update
FOR INSERT OR UPDATE OF status, effort_hours, priority_weight, deadline
ON TASK_LOG
COMPOUND TRIGGER

    v_student_id NUMBER;

    -- Capture student_id safely
    AFTER EACH ROW IS
    BEGIN
        v_student_id := COALESCE(:NEW.student_id, :OLD.student_id);
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        v_workload   NUMBER;
        v_stress_avg NUMBER;
        v_activity   NUMBER;
        v_high_days  NUMBER;
        v_bri_out    NUMBER;
    BEGIN
        IF v_student_id IS NOT NULL THEN

            -- Recalculate workload (ONLY PENDING tasks)
            SELECT LEAST(
                NVL(SUM(
                    effort_hours * priority_weight /
                    GREATEST(deadline - TRUNC(SYSDATE), 1)
                ), 0),
                50
            )
            INTO v_workload
            FROM TASK_LOG
            WHERE student_id   = v_student_id
            AND   status       = 'PENDING'
            AND   deadline     IS NOT NULL
            AND   effort_hours IS NOT NULL;

            -- Update workload
            UPDATE STUDENT_METRICS
            SET workload_score = ROUND(v_workload, 2),
                calculated_at  = CURRENT_TIMESTAMP
            WHERE student_id   = v_student_id;

            -- Fetch other metrics
            SELECT stress_avg, activity_score, consecutive_high_days
            INTO v_stress_avg, v_activity, v_high_days
            FROM STUDENT_METRICS
            WHERE student_id = v_student_id;

            -- Compute BRI
            compute_bri(
                p_stress_avg       => NVL(v_stress_avg, 0),
                p_workload_score   => ROUND(v_workload, 2),
                p_activity_score   => NVL(v_activity, 0),
                p_consec_high_days => NVL(v_high_days, 0),
                p_bri_score        => v_bri_out
            );

            -- Update BRI
            UPDATE STUDENT_METRICS
            SET bri_score     = v_bri_out,
                calculated_at = CURRENT_TIMESTAMP
            WHERE student_id  = v_student_id;

        END IF;

    EXCEPTION
        WHEN OTHERS THEN
            DBMS_OUTPUT.PUT_LINE('Trigger Error: ' || SQLERRM);
    END AFTER STATEMENT;

END trg_task_log_update;
/

-- ── T4: trg_activity_log_insert ──────────────────────────────
-- Fires: AFTER INSERT on ACTIVITY_LOG
-- Does: recomputes activity_score (sum of energy_cost last 7
--       days, capped at 20) then calls compute_bri
-- ============================================================
CREATE OR REPLACE TRIGGER trg_activity_log_insert
FOR INSERT ON ACTIVITY_LOG
COMPOUND TRIGGER

    v_student_id NUMBER;

    AFTER EACH ROW IS
    BEGIN
        v_student_id := :NEW.student_id;
    END AFTER EACH ROW;

    AFTER STATEMENT IS
        v_activity   NUMBER;
        v_stress_avg NUMBER;
        v_workload   NUMBER;
        v_high_days  NUMBER;
        v_bri_out    NUMBER;
    BEGIN
        IF v_student_id IS NOT NULL THEN

            SELECT LEAST(NVL(SUM(energy_cost), 0), 20)
            INTO   v_activity
            FROM   ACTIVITY_LOG
            WHERE  student_id = v_student_id
            AND    log_date   >= TRUNC(SYSDATE) - 7;

            UPDATE STUDENT_METRICS
            SET    activity_score = v_activity,
                   calculated_at  = CURRENT_TIMESTAMP
            WHERE  student_id     = v_student_id;

            SELECT stress_avg, workload_score, consecutive_high_days
            INTO   v_stress_avg, v_workload, v_high_days
            FROM   STUDENT_METRICS
            WHERE  student_id = v_student_id;

            compute_bri(
                p_stress_avg       => NVL(v_stress_avg, 0),
                p_workload_score   => NVL(v_workload, 0),
                p_activity_score   => v_activity,
                p_consec_high_days => NVL(v_high_days, 0),
                p_bri_score        => v_bri_out
            );

            UPDATE STUDENT_METRICS
            SET    bri_score     = v_bri_out,
                   calculated_at = CURRENT_TIMESTAMP
            WHERE  student_id    = v_student_id;

        END IF;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END AFTER STATEMENT;

END trg_activity_log_insert;
/

-- ============================================================
-- ZAINA: Recommendation Unlock Trigger
-- Fires: AFTER UPDATE OF recommendation_status ON STUDENT_METRICS
-- Only when status flips to UNLOCKED
-- Calls generate_recommendations and stamps unlocked_at
-- on all pending recommendations for this student
-- ============================================================
CREATE OR REPLACE TRIGGER trg_recommendation_unlock
AFTER UPDATE OF recommendation_status ON STUDENT_METRICS
DECLARE
    v_student_id NUMBER;
BEGIN
    -- Get the student whose status changed
    SELECT student_id
    INTO v_student_id
    FROM STUDENT_METRICS
    WHERE recommendation_status = 'UNLOCKED'
    AND ROWNUM = 1;

    -- Call your procedure (safe now)
    generate_recommendations(v_student_id);

    -- Stamp unlocked_at
    UPDATE RECOMMENDATION
    SET unlocked_at = CURRENT_TIMESTAMP
    WHERE student_id = v_student_id
    AND unlocked_at IS NULL;

END;
/

-- ── T7: trg_counselor_student_insert ──────────────────────────
-- Fires: AFTER INSERT on COUNSELOR_STUDENT
-- Does: flips previous ACTIVE row to INACTIVE; INSERT NOTIFICATION_LOG confirmations
-- ============================================================
CREATE OR REPLACE TRIGGER trg_counselor_student_insert
FOR INSERT ON COUNSELOR_STUDENT
COMPOUND TRIGGER
    -- using a COMPOUND TRIGGER here so Oracle doesn't throw that annoying "mutating table" error!
    -- basically we can't UPDATE the same table we are INSERTING into at the exact same time.
    
    -- structure to save the details of the new row we just inserted
    TYPE t_assignment IS RECORD (
        student_id NUMBER,
        counselor_id NUMBER,
        assignment_id NUMBER
    );
    -- list to hold multiple assignment records just in case
    TYPE t_assignments_tab IS TABLE OF t_assignment INDEX BY PLS_INTEGER;
    v_new_assignments t_assignments_tab;
    v_index PLS_INTEGER := 0;

    -- Phase 1: Catch everything right when the INSERT happens
    AFTER EACH ROW IS
    BEGIN
        v_index := v_index + 1;
        -- save the exact data into memory for later
        v_new_assignments(v_index).student_id := :NEW.student_id;
        v_new_assignments(v_index).counselor_id := :NEW.counselor_id;
        v_new_assignments(v_index).assignment_id := :NEW.assignment_id;
    END AFTER EACH ROW;

    -- Phase 2: Do the actual updating when the database gives the green light
    AFTER STATEMENT IS
    BEGIN
        -- loop through whoever we caught earlier
        FOR i IN 1 .. v_new_assignments.COUNT LOOP
            
            -- since the insert is totally finished, it's finally safe to update the table
            -- deactivate the old counselor so they don't have overlapping actives
            UPDATE COUNSELOR_STUDENT
            SET status = 'INACTIVE'
            WHERE student_id = v_new_assignments(i).student_id
            AND status = 'ACTIVE'
            -- make super sure we don't accidentally deactivate the one we just made!
            AND assignment_id != v_new_assignments(i).assignment_id;

            -- send a nice welcome notification to the student
            INSERT INTO NOTIFICATION_LOG (user_id, message, type)
            VALUES (v_new_assignments(i).student_id, 'A new counselor has been assigned to you.', 'ASSIGNMENT');

            -- tell the counselor they got someone new
            INSERT INTO NOTIFICATION_LOG (user_id, message, type)
            VALUES (v_new_assignments(i).counselor_id, 'A new student has been assigned to you: ' || v_new_assignments(i).student_id, 'ASSIGNMENT');
        END LOOP;
    EXCEPTION 
        -- just catch any weird crashes so it doesn't break the whole insert
        WHEN OTHERS THEN NULL;
    END AFTER STATEMENT;
END trg_counselor_student_insert;
/

-- ── T8: trg_student_counselor_req ────────────────────────────
-- Fires: AFTER UPDATE OF counselor_requested ON STUDENT
-- Does: call Counselor Assignment Procedure
-- ============================================================
CREATE OR REPLACE TRIGGER trg_student_counselor_req
AFTER UPDATE OF counselor_requested ON STUDENT
FOR EACH ROW
-- only jump into action if they explicitly hit "Request Counselor" (0 going to 1)
WHEN (NEW.counselor_requested = 1 AND OLD.counselor_requested = 0)
BEGIN
    -- just passing the hard work (checking if someone's full) over to the main procedure
    assign_counselor(:NEW.student_id);
END;
/
