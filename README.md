# Smart Student Mental Fatigue & Adaptive Workload Tracker

This project is a comprehensive tracking system for student mental fatigue, featuring an Oracle XE database and a FastAPI backend.

## 1. Database Setup (Oracle XE)

The SQL scripts for database initialization are located in the `backend/sql/` directory.

### A. Create Application User
Before running the DDL, you must create a dedicated user for the Fatigue Tracker. 

1. Open your terminal (Command Prompt or PowerShell).
2. Navigate to the root folder: `cd c:\Users\hibar\Documents\FatigueTracker`.
3. Log in as system administrator using **SQL*Plus**:
   ```cmd
   sqlplus sys as sysdba
   ```
4. Run the user creation script:
   ```sql
   @backend/sql/create_user.sql
   ```
   *Note: Ensure you include the correct path to the script.*

### B. Run the DDL
Once the user is created, connect to the database using the `fatigue_tracker` credentials and run:
1. `backend/sql/fatigue_tracker_ddl.sql` (to create tables, sequences, indices, and seed data).
2. In **SQL*Plus**, you can run: `@backend/sql/fatigue_tracker_ddl.sql`.

## 2. Backend Setup (FastAPI)

The backend is located in the `backend/` directory.

### Installation
1. Activate the virtual environment:
   ```cmd
   cd backend
   .\venv\Scripts\activate
   ```
2. Install pip dependencies:
   ```cmd
   pip install -r requirements.txt
   ```
3. Install Oracle packages:
   ```cmd
   pip install oracledb
   ```
   *(Note: The thin driver is the default. If you need thick mode, you must download the Oracle Instant Client and configure your system PATH. For most operations, the thin driver is sufficient.)*

### Configuration
1. Navigate to the `backend/` directory.
2. Initialize your configuration by copying the example environment file:
   ```cmd
   copy .env.example .env
   ```
3. Update your `.env` with the following credentials to set up your DSN properly:
   ```env
   DB_USER=fatigue_tracker
   DB_PASS=your_password
   DB_HOST=localhost
   DB_PORT=1521
   DB_SERVICE=XEPDB1
   ```
   *(The database path is typically formulated as DSN = `DB_HOST:DB_PORT/DB_SERVICE`)*

### Check DB Connection
Verify that the backend is communicating with Oracle XE:
```cmd
python -m app.db.database
```
**Expected Output:** `Connected successfully to Oracle XE!`

### Run Server
Run the FastAPI application via `uvicorn`:
```cmd
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000) and interactive docs at [http://localhost:8000/docs](http://localhost:8000/docs).

## 3. VS Code Developer Extension
To manage the database within VS Code:
1. Open the **Oracle Explorer** tab.
2. Click **+** to add a new connection.
3. Use the following:
   - **Username**: `fatigue_tracker`
   - **Password**: `fatigue123`
   - **Service Name**: `XEPDB1`
   - **Host**: `localhost`
   - **Port**: `1521`
4. This allows you to explore tables and execute SQL directly.
