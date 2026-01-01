import sqlite3
import os
import argparse
import random

# Paths
# Script is in python_scripts/, DBs are in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DB = os.path.join(BASE_DIR, "lichess_short_puzzles.sqlite")
DEST_DB = os.path.join(BASE_DIR, "lichess_mobile_puzzles.sqlite")

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
    print(f"Source: {SOURCE_DB}")
    print(f"Dest:   {DEST_DB}")

    if not os.path.exists(SOURCE_DB):
        print(f"Source database not found at {SOURCE_DB}")
        return

    # Delete existing to start fresh
    if os.path.exists(DEST_DB):
        try:
            os.remove(DEST_DB)
        except OSError:
            print("Warning: Could not remove existing DB (might be in use).")

    src_conn = sqlite3.connect(SOURCE_DB)
    dest_conn = sqlite3.connect(DEST_DB)
    
    try:
        src_cursor = src_conn.cursor()
        dest_cursor = dest_conn.cursor()

        # 1. Inspect Source Schema to get exact column count for placeholders
        src_cursor.execute("SELECT * FROM puzzles LIMIT 1")
        col_names = [description[0] for description in src_cursor.description]
        col_count = len(col_names)
        
        print(f"Schema detected: {col_count} columns.")

        # 2. Copy Schema (Table Creation)
        print("Creating schema...")
        src_cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='puzzles';")
        create_sql = src_cursor.fetchone()[0]
        dest_cursor.execute(create_sql)
        
        # 3. Extract Puzzles (Preserving ALL columns including flags)
        # Use simple placeholders matching column count
        placeholders = ",".join(["?"] * col_count)
        select_query = f"SELECT * FROM puzzles WHERE rating_band = ? ORDER BY RANDOM() LIMIT ?"
        insert_query = f"INSERT INTO puzzles VALUES ({placeholders})"

        total_count = 0
        
        print(f"Extracting {PUZZLES_PER_BAND} puzzles per band...")
        
        for band_label, _, _ in BANDS:
            print(f"  Processing {band_label}...", end=' ')
            src_cursor.execute(select_query, (band_label, PUZZLES_PER_BAND))
            rows = src_cursor.fetchall()
            
            if rows:
                dest_cursor.executemany(insert_query, rows)
                dest_conn.commit()
                count = len(rows)
                total_count += count
                print(f"Added {count} puzzles")
            else:
                print(f"Found 0 puzzles!")

        # 4. Copy Indexes? 
        # The CREATE TABLE statement in sqlite_master doesn't include indexes usually.
        # We should create them.
        print("\nCreating indexes...")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_rating_band ON puzzles(rating_band);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(Rating);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId);")
        
        # Re-create Partial Indexes if usage intended
        # We can dynamically fetch them from source SQL or just hardcode common ones
        # For mobile size optimization, detailed theme indexes might be overkill 
        # BUT user wanted "first step towards thematic training".
        # Let's create indexes on the boolean columns for at least the main ones if columns exist
        if 'has_opening' in col_names:
             print("Creating Theme Indexes...")
             # Just iterate a known list or inspect columns starting with 'has_'
             for col in col_names:
                 if col.startswith('has_'):
                     idx_name = f"idx_{col}"
                     dest_cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON puzzles(Rating) WHERE {col} = 1;")

        # 5. Create User Tables
        print("Creating User Tables...")
        dest_cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_progress (
                puzzle_id TEXT PRIMARY KEY,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_status ON user_progress(status)")

        dest_cursor.execute('''
            CREATE TABLE IF NOT EXISTS user_favorites (
                puzzle_id TEXT PRIMARY KEY,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

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

        # Vacuum
        print("Vacuuming database...")
        dest_cursor.execute("VACUUM;")

        size_mb = os.path.getsize(DEST_DB) / 1024 / 1024
        print(f"\nSuccess! '{os.path.basename(DEST_DB)}' created with {total_count:,} puzzles.")
        print(f"File size: {size_mb:.2f} MB")

    finally:
        src_conn.close()
        dest_conn.close()

if __name__ == "__main__":
    create_mobile_db()
