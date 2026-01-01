import sqlite3
import os
import argparse

# Paths
SOURCE_DB = r"A:\applications\torok\lichess_db_puzzles.sqlite"
DEST_DB = r"A:\applications\torok\lichess_short_puzzles.sqlite"
MAX_PLY = 4
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

def get_band_label(rating):
    """Determines the band label for a given rating."""
    for label, low, high in BANDS:
        if low <= rating < high:
            return label
    return "Unknown"

def get_stats():
    """Calculates stats using the pre-computed rating_band column."""
    if not os.path.exists(DEST_DB):
        print(f"Error: Subset database not found.")
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

def create_short_puzzles_db():
    if not os.path.exists(SOURCE_DB):
        print(f"Source database not found at {SOURCE_DB}")
        return

    src_conn = sqlite3.connect(SOURCE_DB)
    dest_conn = sqlite3.connect(DEST_DB)
    
    try:
        src_cursor = src_conn.cursor()
        dest_cursor = dest_conn.cursor()

        # 1. Modify Schema: Add the new column to the CREATE statement
        src_cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='puzzles';")
        original_sql = src_cursor.fetchone()[0]
        
        # Best Practice: Inject the new column before the closing parenthesis
        new_sql = original_sql.strip().rstrip(')') + ", rating_band TEXT)"
        
        dest_cursor.execute("DROP TABLE IF EXISTS puzzles;")
        dest_cursor.execute(new_sql)
        
        # 2. Prepare Insertion
        src_cursor.execute("SELECT * FROM puzzles")
        cols = [d[0] for d in src_cursor.description]
        moves_idx = cols.index('Moves')
        rating_idx = cols.index('Rating')
        
        # One extra placeholder for the rating_band
        placeholders = ",".join(["?"] * (len(cols) + 1))
        insert_query = f"INSERT INTO puzzles VALUES ({placeholders})"

        batch = []
        count = 0
        print(f"Migrating and Enriching data (Max Ply: {MAX_PLY})...")
        
        for row in src_cursor:
            if len(row[moves_idx].split()) <= MAX_PLY:
                # Add the band to the row tuple
                band = get_band_label(row[rating_idx])
                enriched_row = row + (band,)
                
                batch.append(enriched_row)
                
                if len(batch) >= BATCH_SIZE:
                    dest_cursor.executemany(insert_query, batch)
                    dest_conn.commit()
                    count += len(batch)
                    batch = []
        
        if batch:
            dest_cursor.executemany(insert_query, batch)
            dest_conn.commit()
            count += len(batch)

        # 3. Industry Standard: Add an Index on the new column for performance
        print("Creating indexes...")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_rating_band ON puzzles(rating_band);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_rating ON puzzles(Rating);")
        dest_cursor.execute("CREATE INDEX IF NOT EXISTS idx_puzzles_id ON puzzles(PuzzleId);")
        
        # 4. Create User Tables (Merged Architecture)
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
            CREATE TABLE IF NOT EXISTS player_stats (
                mode TEXT PRIMARY KEY,
                rating REAL,
                rd REAL,
                vol REAL,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        dest_conn.commit()

        print(f"\nSuccess! '{DEST_DB}' created with {count:,} puzzles, user tables, and all indexes.")

    finally:
        src_conn.close()
        dest_conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Lichess Puzzle Manager")
    parser.add_argument("--stats", action="store_true", help="Show stats for the subset DB")
    args = parser.parse_args()

    if args.stats:
        get_stats()
    else:
        create_short_puzzles_db()