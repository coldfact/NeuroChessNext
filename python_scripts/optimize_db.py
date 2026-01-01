import sqlite3
import os

MAIN_DB = r"A:\applications\torok\lichess_short_puzzles.sqlite"
USER_DB = r"A:\applications\torok\user_data.sqlite"

def add_indexes(db_path, statements):
    if not os.path.exists(db_path):
        print(f"Skipping {db_path} (Not Found)")
        return
        
    print(f"Optimizing {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        for sql in statements:
            print(f"  Executing: {sql}")
            cursor.execute(sql)
        conn.commit()
        conn.close()
        print("Done.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    # 1. Main DB Indexes
    main_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(Rating)",
        "CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId)",
        "CREATE INDEX IF NOT EXISTS idx_rating_band ON puzzles(rating_band)"
    ]
    add_indexes(MAIN_DB, main_indexes)
    
    # 2. User DB Indexes
    user_indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_status ON user_progress(status)"
    ]
    add_indexes(USER_DB, user_indexes)
