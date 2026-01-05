
import sqlite3
import os

DB_PATH = r"a:\applications\torok\lichess_short_puzzles.sqlite"

if not os.path.exists(DB_PATH):
    print(f"Error: DB not found at {DB_PATH}")
    exit(1)

try:
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM puzzles LIMIT 1")
    cols = [d[0] for d in cursor.description]
    print(f"Columns: {cols}")
    
    if 'move_count' in cols:
        print("\nmove_count column FOUND.")
    else:
        print("\nmove_count column MISSING!")
        
    print("\nSample Data (Moves -> MoveCount):")
    cursor.execute("SELECT Moves, move_count FROM puzzles LIMIT 10")
    for row in cursor.fetchall():
        moves = row[0].split()
        ply = len(moves)
        print(f"Ply: {ply} | Moves: {row[0][:30]}... -> Count: {row[1]}")
        
    conn.close()
except Exception as e:
    print(f"Error: {e}")
