import sqlite3

DB_PATH = r"A:\applications\torok\lichess_short_puzzles.sqlite"

def check():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    print("Indexes on puzzles:")
    rows = cursor.execute("PRAGMA index_list(puzzles)").fetchall()
    for r in rows:
        print(r)
        
    print("\nIndexes on user_progress:")
    rows = cursor.execute("PRAGMA index_list(user_progress)").fetchall()
    for r in rows:
        print(r)
    conn.close()

if __name__ == "__main__":
    check()
