import oracledb
import os
import subprocess
import sys
import time
import io
from dotenv import load_dotenv

# Fix for windows charmap encode errors when printing emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

# Load environment variables
load_dotenv()

USER = os.getenv("DB_USER", "fatigue_tracker")
PASSWORD = os.getenv("DB_PASSWORD", "fatigue123")
DSN = os.getenv("DB_DSN", "localhost:1521/XEPDB1")

SQL_FILES = [
    "sql/fatigue_tracker_ddl.sql",
    "sql/fatigue_tracker_procedures.sql",
    "sql/fatigue_tracker_triggers.sql",
    "sql/fatigue_tracker_jobs.sql"
]

def execute_sql_file(cursor, file_path):
    print(f"📖 Reading {file_path}...")
    if not os.path.exists(file_path):
        print(f"⚠️ Warning: {file_path} not found.")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Split by '/' at the beginning of a line (standard for PL/SQL scripts)
    # We also split by ';' for simple DDL if they aren't inside blocks.
    # But for this repo, we'll focus on the '/' delimiter which separates major blocks.
    
    # Simple strategy: split by '/' that is on its own line
    blocks = content.split('\n/\n')
    
    for block in blocks:
        block = block.strip()
        if not block:
            continue
            
        # If the block doesn't start with BEGIN or CREATE PROCEDURE/TRIGGER, 
        # it might be a set of simple SQL statements ending in ';'
        if not any(keyword in block.upper() for keyword in ["BEGIN", "DECLARE", "CREATE OR REPLACE"]):
            statements = block.split(';')
            for stmt in statements:
                stmt = stmt.strip()
                if stmt:
                    try:
                        cursor.execute(stmt)
                    except oracledb.Error as e:
                        print(f"❌ Error in statement: {stmt[:50]}... \n{e}")
        else:
            # It's a PL/SQL block or a CREATE statement
            try:
                cursor.execute(block)
            except oracledb.Error as e:
                print(f"❌ Error in block: {block[:50]}... \n{e}")

def main():
    print("🌟 Fatigue Tracker System Setup 🌟")
    
    # 1. Initialize Database
    try:
        conn = oracledb.connect(user=USER, password=PASSWORD, dsn=DSN)
        cursor = conn.cursor()
        
        print("\n--- 🏗️ Initializing Database Schema ---")
        for sql_file in SQL_FILES:
            execute_sql_file(cursor, sql_file)
        
        conn.commit()
        print("✅ Database schema and logic initialized successfully.")
        
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        return
    finally:
        if 'conn' in locals():
            conn.close()

    # 2. Run Seed Script
    print("\n--- 🌱 Seeding Initial Data ---")
    try:
        from app.seed.master_seed import seed_database
        seed_database()
        print("✅ Seeding complete.")
    except ImportError:
        print("⚠️ Could not import seed_database. Trying as subprocess...")
        subprocess.run([sys.executable, "app/seed/master_seed.py"])
    except Exception as e:
        print(f"❌ Seeding failed: {e}")

    # 3. Start Backend Server
    print("\n--- 🚀 Starting FastAPI Server ---")
    try:
        # We run uvicorn as a subprocess so the user can see logs and stop it with Ctrl+C
        subprocess.run(["uvicorn", "app.main:app", "--reload", "--host", "127.0.0.1", "--port", "8000"])
    except KeyboardInterrupt:
        print("\n👋 Server stopped.")
    except Exception as e:
        print(f"❌ Failed to start server: {e}")

if __name__ == "__main__":
    main()
