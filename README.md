# NeuroChess (Project Torok)

**NeuroChess** is an advanced chess training application designed to enhance key cognitive skills for chess improvement: visualization, calculation, and pattern recognition.

Unlike standard puzzle trainers, NeuroChess emphasizes "Blindfold" training—forcing players to maintain the board state in memory—to build stronger visualization muscles.

## Key Features

### 🧩 Puzzle Training
- **Massive Database**: Access to a curated subset of over 600k+ high-quality puzzles from Lichess.
- **Thematic Filtering**: Train specific tactical motifs like Pins, Skewers, Forks, Mates, and Endgames.
- **Rating Bands**: Filter puzzles by difficulty (e.g., 1000-1200, 1800-2000).

### 🧠 Blindfold Mode
- **Visualization Focus**: Pieces disappear after a short countdown (or opponent's move), challenging you to solve the puzzle from memory.
- **"Peek" Functionality**: Temporarily reveal the board if you get stuck, with a penalty to score.
- **Dedicated Rating**: Separate Glicko-2 rating tracking for Blindfold performance vs. Standard solving.

### ⚙️ Engine & Mechanics
- **Dual Rating System**: Tracks your "Standard" and "Blindfold" ratings independently using the Glicko-2 algorithm.
- **Offline First**: The mobile/native version runs entirely offline using an optimized SQLite database.
- **Smart History**: Prevents repeating solved puzzles and tracks your solve history.
- **Pawn Promotion**: Custom promotion modal for handling underpromotions correctly.

## Technology Stack

### Mobile / Frontend
- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **State Management**: React Hooks (Custom `useChessGame` hook)
- **Database**: `expo-sqlite` (Direct native SQLite access)
- **Game Logic**: `chess.js` (Move validation and FEN handling)

### Backend / Web
- **Server**: Python (Flask)
- **Database**: SQLite
- **API**: REST endpoints for puzzle fetching and logic (Web version).

### Data Pipeline
- **Source**: Lichess Open Database (CSV)
- **Processing**: Python (Pandas) scripts to filter, clean, and convert CSV data into optimized SQLite databases (`puzzles` table with indices on Rating and Themes).

## Project Structure

- **`mobile/`**: The React Native application source code.
    - `src/components/`: UI components (Board, Piece, Modals).
    - `src/hooks/`: Game logic (`useChessGame`).
    - `src/services/`: Database and Sound services.
- **`app.py`**: Flask server for the web version and debugging API.
- **`python_scripts/`**: Utilities for generating and managing the SQLite databases.
    - `create_mobile_db.py`: tailored DB generation.
    - `neurochess_db_generator.py`: Main ETL script.

## Future Roadmap (NeuroChess Suite)

This app is the first text of a planned suite of cognitive training tools for chess:

1.  **NeuroChess Puzzles** (Current): Visualization & Calculation.
2.  **NeuroChess Deep**: Long calculation (4+ moves) and visualization.
3.  **NeuroChess N-back**: Memory training variant.
4.  **NeuroChess Combos**: Speed pattern recognition.

*A unified launcher will be added to select between these game modes.*
