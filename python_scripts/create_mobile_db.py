import sqlite3
import os
import argparse
import random

# Paths
# Script is in python_scripts/, DBs are in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# Paths
# Script is in python_scripts/, DBs are in root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DB_SHORT = os.path.join(BASE_DIR, "neurochess_short.db")
SOURCE_DB_LONG = os.path.join(BASE_DIR, "neurochess_long.db")

# Outputs
DEST_DB_BASE = os.path.join(BASE_DIR, "mobile", "assets", "neurochess.db")
DEST_DB_EXTRA = os.path.join(BASE_DIR, "mobile_puzzles_extra.sqlite")
DEST_DB_DEEP = os.path.join(BASE_DIR, "mobile_deep_extra.sqlite")

BASE_PER_BAND = 500
EXTRA_PER_BAND = 9500

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

def create_deep_dlc():
    """Generates the Deep Mode DLC database (mobile_deep_extra.sqlite)"""
    print(f"\n--- Generating Deep DLC ---")
    print(f"Source: {SOURCE_DB_LONG}")
    print(f"Dest:   {DEST_DB_DEEP}")

    if not os.path.exists(SOURCE_DB_LONG):
        print(f"Error: Long Source DB not found at {SOURCE_DB_LONG}")
        return

    # Delete existing
    if os.path.exists(DEST_DB_DEEP):
        try:
            os.remove(DEST_DB_DEEP)
        except OSError:
            print(f"Warning: Could not remove existing DB {DEST_DB_DEEP}")

    # Connect to Source (Long DB)
    conn = sqlite3.connect(SOURCE_DB_LONG)
    cursor = conn.cursor()

    try:
        # Attach Destination
        conn.execute(f"ATTACH DATABASE '{DEST_DB_DEEP}' AS deep_dlc")

        # 1. Create puzzles_long Table in Destination
        print("Creating table in Deep DLC...")
        conn.execute('''
            CREATE TABLE deep_dlc.puzzles_long (
              PuzzleId          TEXT PRIMARY KEY,
              FEN               TEXT,
              Moves             TEXT,
              Rating            INTEGER,
              RatingDeviation   INTEGER,
              Popularity        INTEGER,
              NbPlays           INTEGER,
              Themes            TEXT,
              GameUrl           TEXT,
              OpeningTags       TEXT,
              rating_band       TEXT,
              move_count        INTEGER
            );
        ''')

        # 2. Run Phase A: Best-First per Bucket
        print("Running Phase A: Top 500 per Move Bucket...")
        # Note: We query 'puzzles' (main) and insert into 'deep_dlc.puzzles_long'
        phase_a_sql = '''
        WITH ranked AS (
          SELECT
            p.*,
            CASE
              WHEN p.move_count >= 9 THEN '9+'
              ELSE CAST(p.move_count AS TEXT)
            END AS move_bucket,
            ROW_NUMBER() OVER (
              PARTITION BY
                p.rating_band,
                CASE
                  WHEN p.move_count >= 9 THEN '9+'
                  ELSE CAST(p.move_count AS TEXT)
                END
              ORDER BY
                p.NbPlays DESC,
                p.Popularity DESC,
                p.PuzzleId ASC
            ) AS rn
          FROM main.puzzles p
          WHERE p.move_count >= 4
            AND p.move_count IS NOT NULL
        )
        INSERT OR IGNORE INTO deep_dlc.puzzles_long (
          PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
          Themes, GameUrl, OpeningTags, rating_band, move_count
        )
        SELECT
          PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
          Themes, GameUrl, OpeningTags, rating_band, move_count
        FROM ranked
        WHERE rn <= 500
          AND move_bucket IN ('9+','8','7','6','5','4');
        '''
        conn.execute(phase_a_sql)
        conn.commit()

        # 3. Phase B: Top Up to 3000 per Band
        print("Running Phase B: Top Up to 3000 per Band...")
        phase_b_sql = '''
        WITH band_need AS (
          SELECT
            rb.rating_band,
            3000 - COALESCE(pl.cnt, 0) AS need
          FROM (SELECT DISTINCT rating_band FROM main.puzzles) rb
          LEFT JOIN (
            SELECT rating_band, COUNT(*) AS cnt
            FROM deep_dlc.puzzles_long
            GROUP BY rating_band
          ) pl
          ON pl.rating_band = rb.rating_band
          WHERE (3000 - COALESCE(pl.cnt, 0)) > 0
        ),
        candidates AS (
          SELECT
            p.*,
            ROW_NUMBER() OVER (
              PARTITION BY p.rating_band
              ORDER BY RANDOM()
            ) AS rn
          FROM main.puzzles p
          WHERE p.move_count >= 4
            AND p.move_count IS NOT NULL
            AND NOT EXISTS (
              SELECT 1
              FROM deep_dlc.puzzles_long pl
              WHERE pl.PuzzleId = p.PuzzleId
            )
        ),
        picked AS (
          SELECT c.*
          FROM candidates c
          JOIN band_need bn
            ON bn.rating_band = c.rating_band
          WHERE c.rn <= bn.need
        )
        INSERT OR IGNORE INTO deep_dlc.puzzles_long (
          PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
          Themes, GameUrl, OpeningTags, rating_band, move_count
        )
        SELECT
          PuzzleId, FEN, Moves, Rating, RatingDeviation, Popularity, NbPlays,
          Themes, GameUrl, OpeningTags, rating_band, move_count
        FROM picked;
        '''
        conn.execute(phase_b_sql)
        conn.commit()
        
        # Verify Count
        count = conn.execute("SELECT COUNT(*) FROM deep_dlc.puzzles_long").fetchone()[0]
        print(f"Deep DLC Generated: {count} puzzles.")

    except Exception as e:
        print(f"Error generating Deep DLC: {e}")
    finally:
        conn.close()


def create_mobile_db():
    print(f"--- Generating Base & Extra DBs ---")
    print(f"Source: {SOURCE_DB_SHORT}")
    print(f"Dest Base:  {DEST_DB_BASE}")
    print(f"Dest Extra: {DEST_DB_EXTRA}")

    if not os.path.exists(SOURCE_DB_SHORT):
        print(f"Source database not found at {SOURCE_DB_SHORT}")
        return

    # Delete existing to start fresh
    for db_path in [DEST_DB_BASE, DEST_DB_EXTRA]:
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except OSError:
                print(f"Warning: Could not remove existing DB {db_path} (might be in use).")

    src_conn = sqlite3.connect(SOURCE_DB_SHORT)
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
            move_count INTEGER,
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

        # 1.5 Create Empty puzzles_long in Base DB (Pre-requisite for Deep DLC merging)
        print("Creating empty puzzles_long in Base DB...")
        dest_cursor_base.execute('''
            CREATE TABLE IF NOT EXISTS puzzles_long (
              PuzzleId          TEXT PRIMARY KEY,
              FEN               TEXT,
              Moves             TEXT,
              Rating            INTEGER,
              RatingDeviation   INTEGER,
              Popularity        INTEGER,
              NbPlays           INTEGER,
              Themes            TEXT,
              GameUrl           TEXT,
              OpeningTags       TEXT,
              rating_band       TEXT,
              move_count        INTEGER
            );
        ''')

        # 2. Iterate Bands and Fill Both
        total_base = 0
        total_extra = 0

        for label, low, high in BANDS:
            print(f"Processing {label}...")
            
            # Fetch ENOUGH for both (Base + Extra)
            limit = BASE_PER_BAND + EXTRA_PER_BAND
            
            # Explicitly select columns to match the target schema (19 columns)
            cols = "PuzzleId, FEN, Moves, Rating, Themes, rating_band, move_count, has_opening, has_middlegame, has_endgame, has_attraction, has_defensiveMove, has_deflection, has_discoveredAttack, has_hangingPiece, has_intermezzo, has_quietMove, has_sacrifice, has_skewer"
            
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
        print(f"Generated {DEST_DB_BASE} with {total_base} puzzles.")
        print(f"Generated {DEST_DB_EXTRA} with {total_extra} puzzles.")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        src_conn.close()
        dest_conn_base.close()
        dest_conn_extra.close()

if __name__ == "__main__":
    create_mobile_db()
    create_deep_dlc()
