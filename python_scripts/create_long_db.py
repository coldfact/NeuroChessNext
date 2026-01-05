import sqlite3
import os
import argparse

# Paths
# Note: Assuming script is run from python_scripts/, so DB is in parent root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE_DB = os.path.join(BASE_DIR, "lichess_db_puzzles.sqlite")
DEST_DB = os.path.join(BASE_DIR, "neurochess_long.db")

MIN_PLY = 8
BATCH_SIZE = 10000

# Define your custom bands here for easy adjustment
BANDS = [
    ("0000-0800", 0, 800),
    ("0800-1000", 800, 1000),
    ("1000-1200", 1000, 1200),
    ("1200-1450", 1200, 1450),
    ("1450-1800", 1450, 1800),
    ("1800-2200", 1800, 2200),
    ("2200-PLUS", 2200, 10000), # 10k as safe upper bound
]

# Themes to extract into Boolean columns (Order matters for UI, but here just list them)
THEMES_TO_INDEX = [
    "opening",
    "middlegame",
    "endgame",
    "attraction",
    "defensiveMove",
    "deflection",
    "discoveredAttack",
    "hangingPiece",
    "intermezzo",
    "quietMove",
    "sacrifice",
    "skewer"
]

def get_band_label(rating):
    """Determines the band label for a given rating."""
    for label, low, high in BANDS:
        if low <= rating < high:
            return label
    return "Unknown"

def get_stats():
    """Calculates stats using the pre-computed rating_band column."""
    if not os.path.exists(DEST_DB):
        print(f"Error: Subset database not found at {DEST_DB}")
        return

    query = """
    SELECT rating_band, COUNT(*) 
    FROM puzzles 
    GROUP BY rating_band 
    ORDER BY MIN(Rating) ASC;
    """
    
    with sqlite3.connect(DEST_DB) as conn:
        cursor = conn.cursor()
        print(f"Generating stats from pre-computed column in: {DEST_DB}\n")
        cursor.execute(query)
        results = cursor.fetchall()
    
    print(f"{'Rating Band':<15} | {'Count':<10}")
    print("-" * 30)
    for band, count in results:
        print(f"{str(band):<15} | {count:<10,}")

    print("\nTheme Stats (True Count):")
    print("-" * 30)
    for theme in THEMES_TO_INDEX:
        col_name = f"has_{theme}"
        cursor.execute(f"SELECT COUNT(*) FROM puzzles WHERE {col_name} = 1")
        count = cursor.fetchone()[0]
        print(f"{theme:<20} | {count:<10,}")

def create_long_puzzles_db():
    print(f"Source DB: {SOURCE_DB}")
    print(f"Dest DB:   {DEST_DB}")

    if not os.path.exists(SOURCE_DB):
        print(f"Error: Source database not found at {SOURCE_DB}")
        return

    src_conn = sqlite3.connect(SOURCE_DB)
    dest_conn = sqlite3.connect(DEST_DB)
    
    try:
        src_cursor = src_conn.cursor()
        dest_cursor = dest_conn.cursor()

        # 1. Inspect Source Schema
        src_cursor.execute("SELECT * FROM puzzles LIMIT 1")
        cols = [d[0] for d in src_cursor.description]
        
        # Find indices
        try:
            moves_idx = cols.index('Moves')
            rating_idx = cols.index('Rating')
            # Theme column might be 'Themes' or 'themes'
            themes_col_name = next((c for c in cols if c.lower() == 'themes'), None)
            if not themes_col_name:
                raise ValueError("Could not find 'Themes' column in source.")
            themes_idx = cols.index(themes_col_name)

        except ValueError as e:
            print(f"Schema Error: {e}")
            print(f"Available columns: {cols}")
            return

        # 2. Prepare Destination Schema
        src_cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='puzzles';")
        original_sql = src_cursor.fetchone()[0]
        
        # Add rating_band, move_count AND boolean theme columns
        # has_opening INTEGER, has_middlegame INTEGER, ...
        extra_cols_def = ", rating_band TEXT, move_count INTEGER"
        for theme in THEMES_TO_INDEX:
            extra_cols_def += f", has_{theme} INTEGER DEFAULT 0"
        
        # Remove trailing parenthesis and append
        new_sql = original_sql.strip().rstrip(')') + extra_cols_def + ")"
        
        print("Creating table with new schema...")
        dest_cursor.execute("DROP TABLE IF EXISTS puzzles;")
        dest_cursor.execute(new_sql)
        
        # 3. Prepare Insertion
        # Original columns + rating_band + move_count + len(THEMES_TO_INDEX)
        total_cols = len(cols) + 2 + len(THEMES_TO_INDEX)
        placeholders = ",".join(["?"] * total_cols)
        insert_query = f"INSERT INTO puzzles VALUES ({placeholders})"

        batch = []
        count = 0
        print(f"Migrating and Enriching data (Min Ply: {MIN_PLY})...")
        
        # Re-query source for efficient iteration
        src_cursor.execute("SELECT * FROM puzzles")
        
        for row in src_cursor:
            moves_list = row[moves_idx].split()
            ply_count = len(moves_list)
            
            # Long puzzle check
            if ply_count >= MIN_PLY:
                
                # 1. Band
                band = get_band_label(row[rating_idx])
                
                # 2. Move Count (2 ply = 1 move, 3 ply = 2 moves, etc.)
                # Using (ply + 1) // 2 to round up (e.g. 1 ply = 1 move, 2 ply = 1 move, 3 ply = 2 moves)
                move_count = (ply_count + 1) // 2

                # 3. Themes
                themes_str = row[themes_idx] or ""
                # Use set for faster lookups (splitting by space)
                row_themes = set(themes_str.split())
                
                theme_flags = []
                for theme in THEMES_TO_INDEX:
                    # Check if theme is present
                    theme_flags.append(1 if theme in row_themes else 0)
                
                # Construct enriched row
                # Original Tuple + Band + MoveCount + Theme Flags...
                enriched_row = row + (band, move_count) + tuple(theme_flags)
                
                batch.append(enriched_row)
                
                if len(batch) >= BATCH_SIZE:
                    dest_cursor.executemany(insert_query, batch)
                    dest_conn.commit()
                    count += len(batch)
                    batch = []
                    print(f"Processed {count:,} records...", end='\r')
        
        if batch:
            dest_cursor.executemany(insert_query, batch)
            dest_conn.commit()
            count += len(batch)
        
        print(f"\nMigration complete. Total records: {count:,}")

        # 4. Create Indexes
        print("Creating Base Indexes...")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_rating_band ON puzzles(rating_band);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_move_count ON puzzles(move_count);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(Rating);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId);")
        
        print("Creating Partial Theme Indexes (Super Fast!)...")
        for theme in THEMES_TO_INDEX:
            col_name = f"has_{theme}"
            idx_name = f"idx_theme_{theme}"
            # Partial Index: Only index rows where this theme is true
            # We include Rating in the index for faster range queries: "Give me endgame puzzles rated 1200-1400"
            dest_cursor.execute(f"CREATE INDEX IF NOT EXISTS {idx_name} ON puzzles(Rating) WHERE {col_name} = 1;")

        # 5. Create User Tables
        print("Creating User Tables (Favorites & Progress)...")
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

        print(f"\nSuccess! '{DEST_DB}' updated.")
        print("Schema now includes Boolean Theme Columns and Partial Indexes.")

    finally:
        src_conn.close()
        dest_conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lichess Long Puzzle Manager")
    parser.add_argument("--stats", action="store_true", help="Show stats for the subset DB")
    args = parser.parse_args()

    if args.stats:
        get_stats()
    else:
        create_long_puzzles_db()
