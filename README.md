# 🧠 Smart Student Mental Fatigue & Adaptive Workload Tracker

A high-resolution clinical oversight and student wellness platform built with **Next.js**, **FastAPI**, and **Oracle XE**.

---

## 🚀 Quick Start (Automated Setup)

The system now includes a unified orchestration script that handles database initialization, logic deployment, and data seeding in one command.

### 1. Prerequisites
- **Oracle XE 21c** installed and running.
- **Python 3.10+** installed.
- **Node.js** (for the frontend).

### 2. Environment Configuration
1. Navigate to the `backend/` directory.
2. Create a `.env` file (copy from `.env.example` if available) and ensure your Oracle credentials are correct:
   ```env
   DB_USER=fatigue_tracker
   DB_PASSWORD=fatigue123
   DB_DSN=localhost:1521/XEPDB1
   SECRET_KEY=your_secret_key_here
   ```

### 3. Initialize & Launch Backend
Run the following command in the `backend/` directory:
```powershell
pip install -r requirements.txt
python setup_and_run.py
```
**This script will automatically:**
- Create all tables, sequences, and indices.
- Deploy stored procedures, triggers, and scheduled jobs.
- Seed the database with high-resolution test personas and historical data.
- Start the FastAPI server on `http://127.0.0.1:8000`.

### 4. Launch Frontend
Open a new terminal in the `frontend/` directory:
```powershell
npm install
npm run dev
```
Access the application at `http://localhost:3000`.

---

## 🧪 Testing Personas (Seeded Data)

The following accounts are pre-seeded with 5 weeks of historical analytics and active clinical states:

| Role | Email | Password | Features to Test |
| :--- | :--- | :--- | :--- |
| **Faculty** | `faculty@nust.edu.pk` | `fatigue123` | Interactive cohort charts, daily drill-downs, critical census tracking. |
| **Counselor** | `counselor@nust.edu.pk` | `fatigue123` | Student roster, active alerts, stress trend evaluation, interventions. |
| **Student** | `hiba.rafique@students.nust.edu.pk` | `fatigue123` | Stress/Task logging, peer benchmarking (14C), personalized recommendations. |

---

## 🛡️ Security Features
- **Bcrypt Hashing**: All passwords are cryptographically hashed using direct `bcrypt` integration (industry standard).
- **JWT Authentication**: Secure, cookie-based sessions with HttpOnly flags to prevent XSS.
- **Role-Based Access Control (RBAC)**: Strict separation between Student, Counselor, and Faculty dashboards.

## 📊 Database Architecture
The system utilizes **Oracle XE** for high-integrity clinical data management:
- **PL/SQL Engine**: Automated Weekly Pulse generation and Adaptive Recommendation logic.
- **Triggers**: Real-time alerting for Behavioral Risk Index (BRI) spikes.
- **Jobs**: Scheduled cohort-wide trend calculations.

---
*Developed by the Fatigue Tracker Team.*
