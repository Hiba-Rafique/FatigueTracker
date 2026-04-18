SELECT user_id, email, password_hash, is_active, role FROM USERS where role='STUDENT';


DESC STRESS_LOG;
DESC TASK_LOG;
DESC ACTIVITY_LOG;

SELECT user_id, name,  password_hash,email, role FROM USERS WHERE name = 'System Admin';


INSERT INTO USERS (
    user_id,
    email,
    password_hash,
    role,
    is_active
)
VALUES (
    SEQ_USER_ID.NEXTVAL,
    'admin@nust.edu.pk',
    'admin123',  -- plain or hashed depending on your system
    'admin',
    1
);

INSERT INTO USERS (
    user_id,
    name,
    email,
    password_hash,
    role,
    is_active
)
VALUES (
    SEQ_USER_ID.NEXTVAL,
    'Admin User',
    'admin1@nust.edu.pk',
    'admin123',
    'ADMIN',
     1
);

SELECT search_condition 
FROM user_constraints 
WHERE table_name = 'USERS' 
AND constraint_name = 'CK_USERS_ROLE';

INSERT INTO USERS (
    user_id,
    name,
    email,
    password_hash,
    role,
    is_active
)
VALUES (
    SEQ_USER_ID.NEXTVAL,
    'Admin User',
    'admin1@nust.edu.pk',
    'admin123',
    'ADMIN',
    1
);

SELECT user_id, name, email, role, is_active,password_hash 
FROM USERS 
where role='ADMIN';

SELECT user_id, is_active,email FROM USERS;

SELECT * FROM EMAIL_WHITELIST;

SELECT * FROM SYSTEM_CONFIG;

DESC AUDIT_LOG;

SELECT * FROM AUDIT_LOG;

CREATE OR REPLACE TRIGGER TRG_AUDIT_STRESS
AFTER INSERT ON STRESS_LOG
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (
        audit_id,
        user_id,
        action,
        target_table,
        target_id,
        action_time
    )
    VALUES (
        SEQ_AUDIT_ID.NEXTVAL,
        :NEW.student_id,
        'INSERT_STRESS',
        'STRESS_LOG',
        :NEW.stress_id,
        SYSTIMESTAMP
    );
END;
/

SELECT * FROM AUDIT_LOG;