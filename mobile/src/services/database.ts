import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'neurochess.db';

export const DatabaseService = {
    db: null as SQLite.SQLiteDatabase | null,

    async init() {
        // 1. Ensure database exists in writable directory
        const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
        const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}SQLite`);

        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`);
        }

        const fileInfo = await FileSystem.getInfoAsync(dbPath);
        if (!fileInfo.exists) {
            console.log("Initialize: Copying bundled database...");
            const asset = Asset.fromModule(require('../../assets/starter_puzzles.db'));
            await asset.downloadAsync();
            await FileSystem.copyAsync({
                from: asset.localUri || asset.uri,
                to: dbPath,
            });
        }

        // 2. Open Database
        this.db = await SQLite.openDatabaseAsync(DB_NAME);

        // 3. Ensure User Tables (if missing from bundle)
        await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS user_progress (
        puzzle_id TEXT PRIMARY KEY,
        status TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_user_status ON user_progress(status);
      
      CREATE TABLE IF NOT EXISTS user_favorites (
        puzzle_id TEXT PRIMARY KEY,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS player_stats (
        mode TEXT PRIMARY KEY,
        rating REAL,
        rd REAL,
        vol REAL,
        last_active DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log("Database initialized.");
    },

    async getCountsByBand() {
        if (!this.db) await this.init();
        const result = await this.db!.getAllAsync<{ rating_band: string; count: number }>(`
      SELECT rating_band, COUNT(*) as count 
      FROM puzzles 
      GROUP BY rating_band
    `);
        return result;
    },

    async getPuzzleById(puzzleId: string) {
        if (!this.db) await this.init();

        try {
            const result = await this.db!.getFirstAsync<any>(
                'SELECT * FROM puzzles WHERE PuzzleId = ?',
                [puzzleId]
            );

            if (!result) return null;

            return {
                PuzzleId: result.PuzzleId,
                FEN: result.FEN,
                Moves: result.Moves.split(' '),
                Rating: result.Rating,
                rating_band: result.rating_band || result.Band,
            };
        } catch (error) {
            console.error('Error getting puzzle by ID:', error);
            return null;
        }
    },

    async getRandomPuzzle(userRating: number, band: string = 'All', theme: string = 'all') {
        if (!this.db) await this.init();

        try {
            // Determine rating range
            let minRating = 0;
            let maxRating = 3500;

            if (band && band !== 'All') {
                if (band.includes('+')) {
                    minRating = parseInt(band.replace('+', ''));
                } else {
                    const parts = band.split('-');
                    if (parts.length === 2) {
                        minRating = parseInt(parts[0]);
                        maxRating = parseInt(parts[1]);
                    }
                }
            } else {
                // Adaptive default
                minRating = userRating - 300;
                maxRating = userRating + 300;
            }

            // Ensure bounds
            minRating = Math.max(0, minRating);
            maxRating = Math.min(3500, maxRating);

            // Base conditions: Rating Range AND Not Won
            let whereClause = `Rating BETWEEN ? AND ? AND PuzzleId NOT IN (SELECT puzzle_id FROM user_progress WHERE status = 'win')`;
            let params: any[] = [minRating, maxRating];

            // Theme Filter
            if (theme && theme !== 'all') {
                // IMPORTANT: Ensure 'theme' is safe/valid. 
                // Since this comes from UI enum, it matches column name 'has_{theme}'
                whereClause += ` AND has_${theme} = 1`;
            }

            let query = `SELECT * FROM puzzles WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1`;

            if (band === 'Favorites') {
                // Favorites logic ignores theme for now (or could support it?)
                // Returning raw favorites is safer for "Review" mode
                query = `SELECT * FROM puzzles JOIN user_favorites ON puzzles.PuzzleId = user_favorites.puzzle_id ORDER BY RANDOM() LIMIT 1`;
                params = [];
            }

            const result = await this.db?.getFirstAsync<any>(query, params);

            if (!result) return null;

            return {
                PuzzleId: result.PuzzleId,
                FEN: result.FEN,
                Moves: result.Moves.split(' '),
                Rating: result.Rating,
                rating_band: result.rating_band || result.Band,
            };
        } catch (error) {
            console.error('Error getting puzzle:', error);
            return null;
        }
    },

    async getPlayerStats(mode: string = 'standard') {
        if (!this.db) await this.init();
        const result = await this.db!.getFirstAsync<any>(
            `SELECT * FROM player_stats WHERE mode = ?`,
            [mode]
        );
        if (result) {
            return {
                rating: result.rating,
                rd: result.rd,
                vol: result.vol
            };
        }
        return null; // Return null to trigger default initialization
    },

    async updatePlayerStats(mode: string, rating: number, rd: number, vol: number) {
        if (!this.db) await this.init();
        await this.db!.runAsync(
            `INSERT OR REPLACE INTO player_stats (mode, rating, rd, vol, last_active) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [mode, rating, rd, vol]
        );
    },

    async recordResult(puzzleId: string, success: boolean, newRating?: number) {
        if (!this.db) await this.init();
        await this.db!.runAsync(
            `INSERT OR REPLACE INTO user_progress (puzzle_id, status) VALUES (?, ?)`,
            [puzzleId, success ? 'win' : 'loss']
        );
    },

    async toggleFavorite(puzzleId: string) {
        if (!this.db) await this.init();
        const exists = await this.db!.getFirstAsync<{ puzzle_id: string }>(
            `SELECT puzzle_id FROM user_favorites WHERE puzzle_id = ?`,
            [puzzleId]
        );

        if (exists) {
            await this.db!.runAsync(`DELETE FROM user_favorites WHERE puzzle_id = ?`, [puzzleId]);
            return false;
        } else {
            await this.db!.runAsync(`INSERT INTO user_favorites (puzzle_id) VALUES (?)`, [puzzleId]);
            return true;
        }
    },

    async checkFavorite(puzzleId: string) {
        if (!this.db) await this.init();
        const result = await this.db!.getFirstAsync<{ puzzle_id: string }>(
            `SELECT puzzle_id FROM user_favorites WHERE puzzle_id = ?`,
            [puzzleId]
        );
        return !!result;
    },

    async resetAllStats() {
        if (!this.db) await this.init();
        // Reset both modes to 1200
        await this.db!.runAsync(`INSERT OR REPLACE INTO player_stats (mode, rating, rd, vol, last_active) VALUES ('standard', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);
        await this.db!.runAsync(`INSERT OR REPLACE INTO player_stats (mode, rating, rd, vol, last_active) VALUES ('blindfold', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);
        // Clear history and favorites
        await this.db!.runAsync(`DELETE FROM user_progress`);
        await this.db!.runAsync(`DELETE FROM user_favorites`);
    },

    async mergeDLC(localUri: string) {
        if (!this.db) await this.init();

        console.log('[DatabaseService] Attaching DLC:', localUri);

        // 1. ATTACH
        // Note: runAsync allows multiple statements? No, safer to run sequentially.
        // Also simpler string interpolation for attached DB path
        await this.db!.runAsync(`ATTACH DATABASE '${localUri}' AS dlc`);

        // 2. MERGE
        // We use INSERT OR IGNORE to skip duplicates
        await this.db!.runAsync(`INSERT OR IGNORE INTO main.puzzles SELECT * FROM dlc.puzzles`);

        // 3. DETACH
        await this.db!.runAsync(`DETACH DATABASE dlc`);

        console.log('[DatabaseService] DLC Merge Complete');
    }
};
