import sqlite3
import os

DB_PATH = r"A:\applications\torok\lichess_short_puzzles.sqlite"
USER_DB_PATH = r"A:\applications\torok\user_data.sqlite"

def test_fetch(user_rating=1200, count=3):
    print(f"Testing Fetch: Rating {user_rating}, Count {count}")
    
    if not os.path.exists(DB_PATH):
        print("Main DB missing")
        return
    if not os.path.exists(USER_DB_PATH):
        print("User DB missing")
        return
        
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ATTACH DATABASE ? AS user_db", (USER_DB_PATH,))
        
        min_r = user_rating - 150
        max_r = user_rating + 150
        
        query = '''
            SELECT p.* 
            FROM puzzles p
            LEFT JOIN user_db.user_progress up 
            ON p.PuzzleId = up.puzzle_id AND up.status = 'solved'
            WHERE up.puzzle_id IS NULL
            AND p.Rating BETWEEN ? AND ?
            ORDER BY RANDOM() LIMIT ?
        '''
        import time
        t0 = time.time()
        print(f"Executing Optimized Query: Rating {min_r}-{max_r}")
        
        # Check Plan
        print("Query Plan:")
        plan = cursor.execute("EXPLAIN QUERY PLAN " + query, (min_r, max_r, count)).fetchall()
        for p in plan:
            print(p)
            
        t0 = time.time()
        rows = cursor.execute(query, (min_r, max_r, count)).fetchall()
        print(f"Query took: {time.time()-t0:.4f}s")
        
        print(f"Found {len(rows)} puzzles")
        for row in rows:
            print(f"  - {row[0]}: {row[3]} (Rating)")
            
    except Exception as e:
        print(f"ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    test_fetch()
