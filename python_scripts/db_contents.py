import sqlite3
import os

def inspect_lichess_db(db_path):
    # Standard practice: Check if file exists before attempting connection
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    try:
        # Connect to the database
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # 1. Get list of tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print(f"Tables found: {tables}")

        if not tables:
            print("No tables found in the database.")
            return

        # Assuming the table name is 'puzzles' (standard for Lichess exports)
        # If your table name is different, replace 'puzzles' below
        table_name = tables[0][0]
        print(f"\n--- Inspecting table: {table_name} ---")

        # 2. Get Column Names (PRAGMA)
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        print(f"Columns: {column_names}")

        # 3. Fetch 10 rows
        cursor.execute(f"SELECT * FROM {table_name} LIMIT 10;")
        rows = cursor.fetchall()

        print("\n--- First 10 Rows ---")
        for row in rows:
            print(row)

    except sqlite3.Error as e:
        print(f"SQLite error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    DATABASE_PATH = r"A:\applications\torok\lichess_db_puzzles.sqlite"
    inspect_lichess_db(DATABASE_PATH)