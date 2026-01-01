import sqlite3
import json
import os
from collections import Counter

# Configuration
DB_PATH = os.path.join(os.path.dirname(__file__), '..', 'lichess_short_puzzles.sqlite')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'puzzle_themes.json')

def extract_themes():
    print(f"Connecting to database: {DB_PATH}")
    if not os.path.exists(DB_PATH):
        print("Error: Database file not found!")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()

        # Check column names first to be safe
        cursor.execute("PRAGMA table_info(puzzles)")
        columns = [row[1] for row in cursor.fetchall()]
        
        target_col = 'Themes'
        if 'Themes' not in columns:
            # Case insensitive check
            for col in columns:
                if col.lower() == 'themes':
                    target_col = col
                    break
        
        if target_col not in columns:
            print(f"Error: 'Themes' column not found. Available columns: {columns}")
            return

        print(f"Extracting themes from column: '{target_col}'...")
        cursor.execute(f"SELECT {target_col} FROM puzzles")
        
        theme_counter = Counter()
        row_count = 0
        
        for row in cursor:
            row_count += 1
            themes_str = row[0]
            if themes_str:
                themes = themes_str.split()
                theme_counter.update(themes)
                
        print(f"Processed {row_count:,} puzzles.")
        
        # Sort by frequency (most common first)
        sorted_themes = dict(theme_counter.most_common())
        
        print(f"Found {len(sorted_themes)} unique themes.")
        print(f"Top 5: {list(sorted_themes.items())[:5]}")

        # Write to JSON
        print(f"Writing results to: {OUTPUT_FILE}")
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(sorted_themes, f, indent=4)
            
        print("Done!")

    except sqlite3.Error as e:
        print(f"SQLite Error: {e}")
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    extract_themes()
