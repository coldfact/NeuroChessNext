import sqlite3
import os
import shutil

MAIN_DB = r"A:\applications\torok\lichess_short_puzzles.sqlite"
USER_DB = r"A:\applications\torok\user_data.sqlite"
BACKUP_DB = r"A:\applications\torok\lichess_short_puzzles.sqlite.bak"

def merge_databases():
    if not os.path.exists(MAIN_DB):
        print("Main DB not found!")
        return

    # Backup mostly for safety
    if not os.path.exists(BACKUP_DB):
        print("Backing up main DB...")
        shutil.copy2(MAIN_DB, BACKUP_DB)

    print("Connecting to databases...")
    dest_conn = sqlite3.connect(MAIN_DB)
    dest_cursor = dest_conn.cursor()

    # Create tables in Dest if not exist
    print("Creating tables in Main DB...")
    dest_cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_progress (
            puzzle_id TEXT PRIMARY KEY,
            status TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_status ON user_progress(status)")

    dest_cursor.execute('''
        CREATE TABLE IF NOT EXISTS player_stats (
            mode TEXT PRIMARY KEY,
            rating REAL,
            rd REAL,
            vol REAL,
            last_active DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # Migrate Data
    if os.path.exists(USER_DB):
        print("Migrating data from User DB...")
        src_conn = sqlite3.connect(USER_DB)
        src_conn.row_factory = sqlite3.Row
        src_cursor = src_conn.cursor()
        
        # User Progress
        rows = src_cursor.execute("SELECT * FROM user_progress").fetchall()
        print(f"  Migrating {len(rows)} progress records...")
        dest_cursor.executemany(
            "INSERT OR IGNORE INTO user_progress (puzzle_id, status, timestamp) VALUES (?, ?, ?)",
            [tuple(r) for r in rows]
        )
        
        # Player Stats
        rows = src_cursor.execute("SELECT * FROM player_stats").fetchall()
        print(f"  Migrating {len(rows)} stats records...")
        dest_cursor.executemany(
            "INSERT OR REPLACE INTO player_stats (mode, rating, rd, vol, last_active) VALUES (?, ?, ?, ?, ?)",
            [tuple(r) for r in rows]
        )
        
        src_conn.close()
    else:
        print("User DB not found, skipping data migration (tables created though).")

    dest_conn.commit()
    dest_conn.close()
    print("Merge Complete.")

if __name__ == "__main__":
    merge_databases()
