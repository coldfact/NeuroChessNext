import sqlite3
import random
import string
import time

DB_PATH = r"A:\applications\torok\lichess_short_puzzles.sqlite"

def verify():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    rand_id = ''.join(random.choices(string.ascii_letters + string.digits, k=5))
    min_r = 1300
    max_r = 1600
    
    query = '''
        SELECT p.* 
        FROM puzzles p INDEXED BY idx_puzzles_id
        LEFT JOIN user_progress up 
        ON p.PuzzleId = up.puzzle_id AND up.status = 'solved'
        WHERE up.puzzle_id IS NULL
        AND p.Rating BETWEEN ? AND ?
        AND p.PuzzleId >= ?
        ORDER BY p.PuzzleId
        LIMIT 3
    '''
    
    print(f"Testing Seek: {rand_id}")
    t0 = time.time()
    rows = cursor.execute(query, (min_r, max_r, rand_id)).fetchall()
    t1 = time.time()
    
    print(f"Time: {t1-t0:.4f}s")
    print(f"Rows: {len(rows)}")
    for r in rows:
        print(f" - {r[0]} ({r[3]})")
        
    conn.close()

if __name__ == "__main__":
    verify()
