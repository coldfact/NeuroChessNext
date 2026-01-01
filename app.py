from flask import Flask, render_template, jsonify, request
import sqlite3
import os
import rating
import time
import random
import string

from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# --- ARCHITECTURAL CONFIGURATION ---
# Absolute path to your filtered SQLite database
DB_PATH = r"A:\applications\torok\lichess_short_puzzles.sqlite"
USER_DB_PATH = r"A:\applications\torok\user_data.sqlite"

def init_user_db():
    # Now creates tables in the Main DB
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executescript('''
                CREATE TABLE IF NOT EXISTS user_progress (
                    puzzle_id TEXT PRIMARY KEY,
                    status TEXT, -- 'win' or 'loss'
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
                
                CREATE TABLE IF NOT EXISTS user_favorites (
                    puzzle_id TEXT PRIMARY KEY,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );

                CREATE TABLE IF NOT EXISTS player_stats (
                    mode TEXT PRIMARY KEY, -- 'standard', 'blindfold'
                    rating REAL DEFAULT 1200,
                    rd REAL DEFAULT 350,
                    vol REAL DEFAULT 0.06,
                    last_active DATETIME DEFAULT CURRENT_TIMESTAMP
                );''')
    conn.commit()
    conn.close()

def get_db_connection():
    """
    Establishes a connection to the SQLite database.
    Uses row_factory to allow dictionary-like access to columns.
    """
    if not os.path.exists(DB_PATH):
        print(f"CRITICAL ERROR: Database not found at {DB_PATH}")
        return None
        
    try:
        conn = sqlite3.connect(DB_PATH)
        conn.row_factory = sqlite3.Row
        return conn
    except sqlite3.Error as e:
        print(f"DATABASE CONNECTION ERROR: {e}")
        return None

# --- ROUTES ---

@app.route('/')
def index():
    """Serves the main chessboard interface."""
    return render_template('index.html')

@app.route('/get_puzzle/<puzzle_id>')
def get_puzzle_by_id(puzzle_id):
    """Fetches a specific puzzle by its ID."""
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed."}), 500
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM puzzles WHERE PuzzleId = ?", (puzzle_id,))
        row = cursor.fetchone()
        
        if not row:
            return jsonify({"error": f"Puzzle '{puzzle_id}' not found."}), 404
        
        data = dict(row)
        puzzle = {
            "PuzzleId": data.get('PuzzleId'),
            "FEN": data.get('FEN'),
            "Moves": data.get('Moves', "").split(),
            "Rating": data.get('Rating', 0),
            "Band": data.get('rating_band', 'Uncategorized'),
            "Themes": data.get('Themes', '')
        }
        return jsonify(puzzle)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/get_puzzles')
def get_puzzles():
    start_time = time.time()
    """
    Fetches a batch of random puzzles, optionally filtered by rating band.
    Returns a list of puzzles for client-side caching.
    """
    # 1. Parse Request Parameters
    count = request.args.get('count', default=10, type=int)
    band = request.args.get('band', default=None, type=str)
    theme = request.args.get('theme', default=None, type=str)
    # ACCEPT CLIENT RATING: If provided, use this instead of looking up in DB
    client_rating = request.args.get('rating', default=None, type=int)
    
    conn = get_db_connection()
    if conn is None:
        return jsonify({"error": "Database connection failed."}), 500


    try:
        with conn:
            cursor = conn.cursor()
            
            # --- RATING LOGIC ---
            mode = request.args.get('mode', default='standard', type=str)
            
            # Fetch user stats IF client_rating not provided
            user_rating = rating.START_RATING
            
            if client_rating is not None:
                user_rating = client_rating
                print(f"Using client provided rating: {user_rating}", flush=True)
            else:
                cursor.execute("SELECT rating FROM player_stats WHERE mode = ?", (mode,))
                row = cursor.fetchone()
                if row:
                    user_rating = row[0]
                print(f"Using DB rating: {user_rating}", flush=True)

            # Optimized Query using LEFT JOIN on Single DB + Random Seek
            # 1. Generate a random ID (Lichess IDs are 5 chars)
            rand_id = ''.join(random.choices(string.ascii_letters + string.digits, k=5))
            
            puzzle_query = '''
                SELECT p.* 
                FROM puzzles p INDEXED BY idx_puzzles_id
                LEFT JOIN user_progress up 
                ON p.PuzzleId = up.puzzle_id AND up.status = 'win'
                WHERE up.puzzle_id IS NULL
            '''
            params = []

            # Filter by rating range (User +/- 150)
            # Use band only if specified explicitly, otherwise adaptive
            if band == 'Favorites':
                 # Override query for Favorites - bypass random seek logic
                 puzzle_query = '''
                    SELECT p.* 
                    FROM puzzles p
                    JOIN user_favorites uf ON p.PuzzleId = uf.puzzle_id
                    ORDER BY RANDOM() LIMIT ?
                 '''
                 params = [count]
            else:
                 if band and band != "All":
                      puzzle_query += ' AND p.rating_band = ?'
                      params.append(band)
                 else:
                      # Adaptive Logic
                      min_r = user_rating - 150
                      max_r = user_rating + 150
                      puzzle_query += ' AND p.Rating BETWEEN ? AND ?'
                      params.extend([min_r, max_r])
                 
                 # Theme Logic
                 if theme and theme != "all":
                     # Validate theme to prevent SQL injection (whitelist approach)
                     valid_themes = {
                         "opening", "middlegame", "endgame", 
                         "attraction", "defensiveMove", "deflection", 
                         "discoveredAttack", "hangingPiece", "intermezzo", 
                         "quietMove", "sacrifice", "skewer"
                     }
                     if theme in valid_themes:
                         puzzle_query += f' AND p.has_{theme} = 1'
                 
                 # Random Seek Logic (Only for non-favorites)
                 puzzle_query += ' AND p.PuzzleId >= ? ORDER BY p.PuzzleId LIMIT ?'
                 params.append(rand_id)
                 params.append(count)

            print(f"[PERF] Params: {params}", flush=True)
            query_start = time.time()
            rows = cursor.execute(puzzle_query, params).fetchall()
            print(f"[PERF] Query took: {time.time() - query_start:.4f}s", flush=True)
            
            # Fallback: If "seek" hits end of table or constraints too tight
            if not rows:
                 # Try wrapping around (>= '' is basically start of table)
                 # Or widen search. Let's try widen + random seek from start.
                 print("Seek failed (end of table?), retrying with fallback...", flush=True)
                 
                 fallback_query = '''
                    SELECT p.* 
                    FROM puzzles p INDEXED BY idx_puzzles_id
                    LEFT JOIN user_progress up 
                    ON p.PuzzleId = up.puzzle_id AND up.status = 'solved'
                    WHERE up.puzzle_id IS NULL
                 '''
                 
                 fallback_params = []
                 if band and band != "All":
                     fallback_query += ' AND p.rating_band = ?'
                     fallback_params.append(band)
                 else:
                     fallback_query += ' AND p.Rating BETWEEN ? AND ?'
                     fallback_params.extend([min_r, max_r])
                 
                 fallback_query += ' ORDER BY RANDOM() LIMIT ?'
                 fallback_params.append(count)

                 # Note: Keeping ORDER BY RANDOM() only for fallback as it's safer for "finding anything"
                 # if the seek resulted in 0 rows. But ideally we'd seek from '00000'.
                 
                 rows = cursor.execute(fallback_query, fallback_params).fetchall()

            if not rows:
                return jsonify({"error": "No puzzles found matching the selection."}), 404

            # 3. Transform Row Objects to Serialized JSON
            puzzles = []
            for row in rows:
                data = dict(row)
                puzzles.append({
                    "PuzzleId": data.get('PuzzleId', 'Unknown'),
                    "FEN": data.get('FEN'),
                    "Moves": data.get('Moves', "").split(), # Convert 'e2e4 e7e5' to list
                    "Rating": data.get('Rating', 0),
                    "Band": data.get('rating_band', 'Uncategorized'),
                    "Themes": data.get('Themes', '')
                })

            return jsonify({"user_rating": round(user_rating), "puzzles": puzzles})
    except Exception as e:
        print(f"APPLICATION ERROR: {e}", flush=True)
        return jsonify({"error": "Internal Server Error", "details": str(e)}), 500
    finally:
        if conn: conn.close()
        print(f"[PERF] Total Request time: {time.time() - start_time:.4f}s", flush=True)

@app.route('/record_attempt', methods=['POST'])
def record_attempt():
    data = request.json
    puzzle_id = data.get('PuzzleId')
    success = data.get('success')
    puzzle_rating_val = data.get('puzzleRating', 1500) # Ensure frontend sends this
    mode = data.get('mode', 'standard')
    
    if not puzzle_id:
        return jsonify({"error": "Missing PuzzleId"}), 400
        
    status = 'solved' if success else 'failed'
    score = 1.0 if success else 0.0
    
    status = 'solved' if success else 'failed'
    score = 1.0 if success else 0.0
    
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        # 1. Update Progress
        cursor.execute('''
            INSERT INTO user_progress (puzzle_id, status) VALUES (?, ?)
            ON CONFLICT(puzzle_id) DO UPDATE SET 
            status = CASE WHEN status = 'solved' THEN 'solved' ELSE excluded.status END,
            timestamp = CURRENT_TIMESTAMP
        ''', (puzzle_id, status))
        
        # 2. Update Rating
        # a. Get current stats
        cursor.execute("SELECT rating, rd, vol FROM player_stats WHERE mode = ?", (mode,))
        row = cursor.fetchone()
        
        if row:
            curr_rating, curr_rd, curr_vol = row
        else:
            curr_rating = rating.START_RATING
            curr_rd = rating.START_RD
            curr_vol = rating.START_VOL
            
        # b. Calculate new stats
        # Puzzle RD is effectively 0 (static), but Glicko prefers a small non-zero usually.
        # User suggested 30.
        new_rating, new_rd, new_vol = rating.update_rating(
            curr_rating, curr_rd, curr_vol, 
            float(puzzle_rating_val), 30.0, score
        )
        
        # c. Save new stats
        cursor.execute('''
            INSERT INTO player_stats (mode, rating, rd, vol, last_active) 
            VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(mode) DO UPDATE SET
            rating = excluded.rating,
            rd = excluded.rd,
            vol = excluded.vol,
            last_active = excluded.last_active
        ''', (mode, new_rating, new_rd, new_vol))

        conn.commit()
    except Exception as e:
        print(f"DB WRITE ERROR: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        
    return jsonify({"message": "Recorded", "new_rating": round(new_rating)})

@app.route('/reset_progress', methods=['POST'])
def reset_progress():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM user_progress")
        cursor.execute("DELETE FROM player_stats")
        cursor.execute("DELETE FROM user_favorites")
        conn.commit()
    except Exception as e:
        print(f"DB RESET ERROR: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
    return jsonify({"message": "Reset Successful"})

@app.route('/record_result', methods=['POST'])
def record_result():
    """Records a puzzle result from the client."""
    try:
        data = request.json
        puzzle_id = data.get('puzzle_id')
        status = data.get('status') # 'win' or 'loss'
        
        if not puzzle_id or not status:
            return jsonify({"error": "Missing puzzle_id or status"}), 400

        conn = get_db_connection()
        if conn:
            with conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO user_progress (puzzle_id, status) VALUES (?, ?)",
                    (puzzle_id, status)
                )
            conn.close()
            return jsonify({"success": True})
        else:
             return jsonify({"error": "DB Connection failed"}), 500

    except Exception as e:
        print(f"Error recording result: {e}")
        return jsonify({"error": str(e)}), 500


@app.route('/toggle_favorite', methods=['POST'])
def toggle_favorite():
    try:
        data = request.json
        puzzle_id = data.get('puzzle_id')
        if not puzzle_id:
             return jsonify({"error": "Missing puzzle_id"}), 400
             
        conn = get_db_connection()
        is_fav = False
        if conn:
            with conn:
                cursor = conn.cursor()
                # Check if exists
                cursor.execute("SELECT 1 FROM user_favorites WHERE puzzle_id = ?", (puzzle_id,))
                exists = cursor.fetchone()
                
                if exists:
                    cursor.execute("DELETE FROM user_favorites WHERE puzzle_id = ?", (puzzle_id,))
                    is_fav = False
                else:
                    cursor.execute("INSERT INTO user_favorites (puzzle_id) VALUES (?)", (puzzle_id,))
                    is_fav = True
            conn.close()
            return jsonify({"is_favorite": is_fav})
        return jsonify({"error": "DB failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/check_favorite', methods=['GET'])
def check_favorite():
    try:
        puzzle_id = request.args.get('puzzle_id')
        if not puzzle_id:
             return jsonify({"error": "Missing puzzle_id"}), 400
             
        conn = get_db_connection()
        is_fav = False
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM user_favorites WHERE puzzle_id = ?", (puzzle_id,))
            if cursor.fetchone():
                is_fav = True
            conn.close()
            return jsonify({"is_favorite": is_fav})
        return jsonify({"error": "DB failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_stats', methods=['GET'])
def get_stats():
    try:
        mode = request.args.get('mode', 'standard')
        conn = get_db_connection()
        if conn:
            cursor = conn.cursor()
            cursor.execute("SELECT rating, rd, vol FROM player_stats WHERE mode = ?", (mode,))
            row = cursor.fetchone()
            conn.close()
            if row:
                return jsonify(dict(row))
    except Exception as e:
        print(f"Error fetching stats: {e}")
    
    # Default if not found or error
    return jsonify({"rating": 1200, "rd": 350, "vol": 0.06})

@app.route('/update_stats', methods=['POST'])
def update_stats():
    try:
        data = request.json
        mode = data.get('mode', 'standard')
        rating = data.get('rating')
        rd = data.get('rd')
        vol = data.get('vol')
        
        conn = get_db_connection()
        if conn:
            with conn:
                cursor = conn.cursor()
                cursor.execute('''
                    INSERT INTO player_stats (mode, rating, rd, vol, last_active) 
                    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                    ON CONFLICT(mode) DO UPDATE SET
                    rating = excluded.rating,
                    rd = excluded.rd,
                    vol = excluded.vol,
                    last_active = excluded.last_active
                ''', (mode, rating, rd, vol))
            conn.close()
            return jsonify({"success": True})
        return jsonify({"error": "DB failed"}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- ENTRY POINT ---

if __name__ == '__main__':
    # Initial verification of environment
    # Initial verification of environment
    init_user_db() # Ensure user DB exists
    if not os.path.exists(DB_PATH):
        print("!" * 50)
        print(f"WARNING: DB not found at {DB_PATH}")
        print("Run the preprocessing script to generate the subset DB first.")
        print("!" * 50)
    
    # Run server on localhost:5000 with debug enabled for development
    app.run(debug=True, port=5000)