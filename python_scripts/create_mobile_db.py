import sqlite3
import os
import argparse
import random

# Paths
SOURCE_DB = r"A:\applications\torok\lichess_short_puzzles.sqlite"
DEST_DB = r"A:\applications\torok\mobile\assets\starter_puzzles.db"
PUZZLES_PER_BAND = 1000

# Define your custom bands here for easy adjustment
BANDS = [
    ("0000-0800", 0, 800),
    ("0800-1000", 800, 1000),
    ("1000-1200", 1000, 1200),
    ("1200-1450", 1200, 1450),
    ("1450-1800", 1450, 1800),
    ("1800-2200", 1800, 2200),
    ("2200-PLUS", 2200, 10000),
]

def create_mobile_db():
    if not os.path.exists(SOURCE_DB):
        print(f"Source database not found at {SOURCE_DB}")
        return

    # Ensure dest dir exists
    os.makedirs(os.path.dirname(DEST_DB), exist_ok=True)

    src_conn = sqlite3.connect(SOURCE_DB)
    # Use row_factory to get dict-like access if needed, but here we just need raw values
    dest_conn = sqlite3.connect(DEST_DB)
    
    try:
        src_cursor = src_conn.cursor()
        dest_cursor = dest_conn.cursor()

        # 1. Create Schema (Same as main DB mainly)
        print("Creating schema...")
        dest_cursor.execute("DROP TABLE IF EXISTS puzzles;")
        # We can just copy the schema from source or define minimal
        # Let's verify source schema first
        src_cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='puzzles';")
        create_sql = src_cursor.fetchone()[0]
        dest_cursor.execute(create_sql)
        
        # 2. Extract Puzzles
        cols = ["PuzzleId", "FEN", "Moves", "Rating", "RatingDeviation", "Popularity", "NbPlays", "Themes", "GameUrl", "OpeningTags", "rating_band"]
        # We might not need all columns for mobile to save space, but let's keep it simple for now or strictly select what we need
        # To save space, let's only take essential columns? 
        # Actually user wants "self-contained", so keeping standard schema is safer for future syncing.
        
        placeholders = ",".join(["?"] * len(cols))
        select_query = f"SELECT {','.join(cols)} FROM puzzles WHERE rating_band = ? ORDER BY RANDOM() LIMIT ?"
        insert_query = f"INSERT INTO puzzles ({','.join(cols)}) VALUES ({placeholders})"

        total_count = 0
        
        print(f"Extracting {PUZZLES_PER_BAND} puzzles per band...")
        
        for band_label, _, _ in BANDS:
            print(f"  Processing {band_label}...")
            src_cursor.execute(select_query, (band_label, PUZZLES_PER_BAND))
            rows = src_cursor.fetchall()
            
            if rows:
                dest_cursor.executemany(insert_query, rows)
                dest_conn.commit()
                count = len(rows)
                total_count += count
                print(f"    - Added {count} puzzles")
            else:
                print(f"    - Found 0 puzzles!")

        # 3. Create Indexes
        print("\nCreating indexes...")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_rating_band ON puzzles(rating_band);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(Rating);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId);")
        
        # 4. Create User Tables (Empty)
        print("Creating User Tables...")
        dest_cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                puzzle_id TEXT PRIMARY KEY,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_status ON user_progress(status)")

        # Player stats
        dest_cursor.execute('''
            CREATE TABLE IF NOT EXISTS player_stats (
                mode TEXT PRIMARY KEY,
                rating REAL,
                rd REAL,
                vol REAL,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        dest_conn.commit()

        # Vacuum to minimize size
        print("Vacuuming database...")
        dest_cursor.execute("VACUUM;")

        print(f"\nSuccess! '{DEST_DB}' created with {total_count:,} puzzles.")
        print(f"File size: {os.path.getsize(DEST_DB) / 1024 / 1024:.2f} MB")

    finally:
        src_conn.close()
        dest_conn.close()

if __name__ == "__main__":
    create_mobile_db()
