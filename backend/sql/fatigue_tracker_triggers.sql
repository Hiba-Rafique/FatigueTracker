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
