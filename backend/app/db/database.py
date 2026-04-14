import os
import oracledb
from dotenv import load_dotenv

load_dotenv()

# Oracle Connection details
DB_USER = os.getenv("DB_USER", "system")
DB_PASSWORD = os.getenv("DB_PASS", "your_password")
DB_SERVICE_NAME = os.getenv("DB_SERVICE", "XEPDB1")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "1521")

# Use 'thick' mode if needed, but 'thin' mode (the default) is usually fine for Oracle XE
def get_connection():
    try:
        connection = oracledb.connect(
            user=DB_USER,
            password=DB_PASSWORD,
            dsn=f"{DB_HOST}:{DB_PORT}/{DB_SERVICE_NAME}"
        )
        return connection
    except oracledb.Error as e:
        print(f"Error connecting to Oracle: {e}")
        return None

def test_connection():
    conn = get_connection()
    if conn:
        print("Connected successfully to Oracle XE!")
        conn.close()
        return True
    return False

if __name__ == "__main__":
    test_connection()
