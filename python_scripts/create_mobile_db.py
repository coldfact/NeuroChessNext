import sqlite3
import os
import argparse
import random

# Paths
# Script is in python_scripts/, DBs are in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DB = os.path.join(BASE_DIR, "lichess_short_puzzles.sqlite")
DEST_DB_BASE = os.path.join(BASE_DIR, "lichess_mobile_puzzles.sqlite")
DEST_DB_EXTRA = os.path.join(BASE_DIR, "mobile_puzzles_extra.sqlite")

BASE_PER_BAND = 1000
EXTRA_PER_BAND = 9000

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
    print(f"Dest Base:  {DEST_DB_BASE}")
    print(f"Dest Extra: {DEST_DB_EXTRA}")

    if not os.path.exists(SOURCE_DB):
        print(f"Source database not found at {SOURCE_DB}")
        return

    # Delete existing to start fresh
    for db_path in [DEST_DB_BASE, DEST_DB_EXTRA]:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except OSError:
                print(f"Warning: Could not remove existing DB {db_path} (might be in use).")

    src_conn = sqlite3.connect(SOURCE_DB)
    # Open connections to BOTH destinations
    dest_conn_base = sqlite3.connect(DEST_DB_BASE)
    dest_conn_extra = sqlite3.connect(DEST_DB_EXTRA)

    try:
        src_cursor = src_conn.cursor()
        dest_cursor_base = dest_conn_base.cursor()
        dest_cursor_extra = dest_conn_extra.cursor()

        # 1. Create Schema in BOTH (Identical)
        schema_query = '''
        CREATE TABLE IF NOT EXISTS puzzles (
            PuzzleId TEXT PRIMARY KEY,
            FEN TEXT,
            Moves TEXT,
            Rating INTEGER,
            Themes TEXT,
            rating_band TEXT,
            has_opening BOOLEAN DEFAULT 0,
            has_middlegame BOOLEAN DEFAULT 0,
            has_endgame BOOLEAN DEFAULT 0,
            has_attraction BOOLEAN DEFAULT 0,
            has_defensiveMove BOOLEAN DEFAULT 0,
            has_deflection BOOLEAN DEFAULT 0,
            has_discoveredAttack BOOLEAN DEFAULT 0,
            has_hangingPiece BOOLEAN DEFAULT 0,
            has_intermezzo BOOLEAN DEFAULT 0,
            has_quietMove BOOLEAN DEFAULT 0,
            has_sacrifice BOOLEAN DEFAULT 0,
            has_skewer BOOLEAN DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_band ON puzzles(rating_band);
        CREATE INDEX IF NOT EXISTS idx_rating ON puzzles(Rating);
        CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId);
        '''
        dest_cursor_base.executescript(schema_query)
        dest_cursor_extra.executescript(schema_query)

        # 2. Iterate Bands and Fill Both
        total_base = 0
        total_extra = 0

        for label, low, high in BANDS:
            print(f"Processing {label}...")
            
            # Fetch ENOUGH for both (Base + Extra)
            limit = BASE_PER_BAND + EXTRA_PER_BAND
            
            # Explicitly select columns to match the target schema (18 columns)
            cols = "PuzzleId, FEN, Moves, Rating, Themes, rating_band, has_opening, has_middlegame, has_endgame, has_attraction, has_defensiveMove, has_deflection, has_discoveredAttack, has_hangingPiece, has_intermezzo, has_quietMove, has_sacrifice, has_skewer"
            
            # Use ORDER BY RANDOM() to get shuffling
            query = f"""
                SELECT {cols} FROM puzzles 
                WHERE rating_band = ? 
                ORDER BY RANDOM()
                LIMIT {limit}
            """
            src_cursor.execute(query, (label,))
            rows = src_cursor.fetchall()
            
            # Split rows
            base_rows = rows[:BASE_PER_BAND]
            extra_rows = rows[BASE_PER_BAND:]
            
            print(f"  -> Found {len(rows)} puzzles. Base: {len(base_rows)}, Extra: {len(extra_rows)}")

            # Insert Base
            if base_rows:
                placeholders = ','.join(['?'] * len(base_rows[0]))
                dest_cursor_base.executemany(f"INSERT INTO puzzles VALUES ({placeholders})", base_rows)
                total_base += len(base_rows)

            # Insert Extra
            if extra_rows:
                placeholders = ','.join(['?'] * len(extra_rows[0]))
                dest_cursor_extra.executemany(f"INSERT INTO puzzles VALUES ({placeholders})", extra_rows)
                total_extra += len(extra_rows)

        # 3. Optimize (Vacuum)
        for conn in [dest_conn_base, dest_conn_extra]:
            conn.commit()
            conn.execute("VACUUM")

        print("\nComplete!")
        print(f"Base DB Puzzles:  {total_base}")
        print(f"Extra DB Puzzles: {total_extra}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        src_conn.close()
        dest_conn_base.close()
        dest_conn_extra.close()

if __name__ == "__main__":
    create_mobile_db()
