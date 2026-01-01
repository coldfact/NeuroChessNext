import chess
import chess.pgn
import chess.engine
import json
import os

# ==============================================================================
# CONFIGURATION
# ==============================================================================
DEBUG = "verbose"
GAME_ID = None         
PGN_PATH = r"A:\applications\torok\games\lichess_db_standard_rated_2013-01.pgn"
STOCKFISH_PATH = r"V:\Life\Applications\torok\engines\stockfish\stockfish-windows-x86-64-avx2.exe"

PUZZLE_COUNT = 10      # Stop exactly when this many total sacrifices are found
SKIP_OPENING_PLY = 12  
SF_DEPTH = 14          
MULTI_PV = 3           

# NEW: Constraint to avoid desperate sacs in lost positions or overkill
# Only evaluate moves if the evaluation before the move is between -300 and +300
STRICT_POSITIONAL_LIMIT = 300 

PIECE_VALUES = {
    chess.PAWN: 100, chess.KNIGHT: 300, chess.BISHOP: 300,
    chess.ROOK: 500, chess.QUEEN: 900, chess.KING: 0
}

# ==============================================================================
# CORE LOGIC
# ==============================================================================

def get_rel_balance(board):
    w = sum(PIECE_VALUES[p.piece_type] for p in board.piece_map().values() if p.color == chess.WHITE)
    b = sum(PIECE_VALUES[p.piece_type] for p in board.piece_map().values() if p.color == chess.BLACK)
    return w - b

def is_expensive_capture(board, move):
    """
    Criterion 1 & 2: ONLY consider captures where attacker > victim.
    This ignores equal trades (QxQ) and winning material (PxQ).
    """
    if not board.is_capture(move):
        return False
    
    attacker = board.piece_at(move.from_square)
    victim = board.piece_at(move.to_square)
    
    # Victim value (handling en passant)
    if board.is_en_passant(move):
        victim_val = 100
    elif victim:
        victim_val = PIECE_VALUES[victim.piece_type]
    else:
        return False

    return PIECE_VALUES[attacker.piece_type] > victim_val

def get_exchange_cleared_state(moves, start_ply):
    temp_board = chess.Board()
    for m in moves[:start_ply]: temp_board.push(m)
    temp_board.push(moves[start_ply])
    
    current_ply = start_ply + 1
    while current_ply < len(moves):
        if temp_board.is_capture(moves[current_ply]):
            temp_board.push(moves[current_ply])
            current_ply += 1
        else:
            break
    return get_rel_balance(temp_board), current_ply

def analyze_game(game, engine, total_found, limit):
    results = []
    moves = list(game.mainline_moves())
    game_url = game.headers.get("Site", "Unknown")
    
    # Pass 1: Pre-eval baseline to enforce the +/- 300 cp constraint
    temp_board = game.board()
    evals = []
    evals.append(0)
    for i, move in enumerate(moves):
        temp_board.push(move)
        info = engine.analyse(temp_board, chess.engine.Limit(depth=SF_DEPTH))
        score = info["score"].white().score(mate_score=10000)
        evals.append(score)

    # Pass 2: Evaluate targeted captures in close positions
    for i in range(SKIP_OPENING_PLY, len(moves) - 1):
        if total_found + len(results) >= limit:
            break

        board_before = game.board()
        for m in moves[:i]: board_before.push(m)
        
        # Criterion: Only evaluate if move is a capture where Attacker > Victim
        if not is_expensive_capture(board_before, moves[i]):
            continue

        # Criterion: Only evaluate if the game is relatively close (+/- 300)
        # This filters out 'forced' desperation sacs in winning/losing positions
        pre_move_eval = evals[i]
        if abs(pre_move_eval) > STRICT_POSITIONAL_LIMIT:
            continue

        side_moving = "white" if i % 2 == 0 else "black"
        rel_pre = get_rel_balance(board_before)

        # Multi-PV Rank Analysis
        analysis = engine.analyse(board_before, chess.engine.Limit(depth=SF_DEPTH), multipv=MULTI_PV)
        actual_move = moves[i]
        move_rank = -1
        for rank, entry in enumerate(analysis):
            if entry["pv"][0] == actual_move:
                move_rank = rank + 1
                break
        
        # Verify material settlement
        rel_settled, settled_ply = get_exchange_cleared_state(moves, i)
        rel_delta = rel_settled - rel_pre
        actual_sac_value = -rel_delta if side_moving == "white" else rel_delta

        if actual_sac_value > 0:
            eval_before = analysis[0]["score"].white().score(mate_score=10000)
            eval_after = evals[settled_ply]
            eval_delta = eval_after - eval_before
            if side_moving == "black": eval_delta = -eval_delta

            # Nuance Logic
            is_stable = (eval_delta > -70)
            if move_rank == 1 and is_stable:
                verdict = "GOOD"
            elif move_rank > 1 and is_stable:
                verdict = "SPECULATIVE"
            else:
                verdict = "BAD"

            if DEBUG == "verbose":
                print(f"\n>>> [!] TARGETED SAC: {game_url} | Move {(i//2)+1}{side_moving[0].upper()}")
                print(f"    Capture: {actual_move} | Rank: {move_rank} | Deficit: {actual_sac_value}")
                print(f"    Position Eval: {pre_move_eval} | Delta: {eval_delta} | Verdict: {verdict}")

            results.append({
                "game_url": game_url,
                "move": actual_move.uci(),
                "verdict": verdict,
                "details": {"rank": move_rank, "sac": actual_sac_value, "delta": eval_delta, "baseline": pre_move_eval}
            })

    return results

def main():
    engine = chess.engine.SimpleEngine.popen_uci(STOCKFISH_PATH)
    all_output = []
    total_found = 0

    try:
        with open(PGN_PATH) as pgn:
            while total_found < PUZZLE_COUNT:
                game = chess.pgn.read_game(pgn)
                if not game: break
                
                url = game.headers.get("Site", "")
                if GAME_ID and GAME_ID not in url: continue

                game_sacs = analyze_game(game, engine, total_found, PUZZLE_COUNT)
                if game_sacs:
                    all_output.extend(game_sacs)
                    total_found += len(game_sacs)
                    print(f"Progress: {total_found}/{PUZZLE_COUNT} individual sacrifices found.")
                
                if GAME_ID and GAME_ID in url: break
    finally:
        engine.quit()
    
    with open("sac_analysis.json", "w") as f:
        json.dump(all_output[:PUZZLE_COUNT], f, indent=4)
    print(f"\nSaved {len(all_output[:PUZZLE_COUNT])} sacrifices to JSON.")

if __name__ == "__main__":
    main()