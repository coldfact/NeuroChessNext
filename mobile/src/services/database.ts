import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';

const DB_NAME = 'neurochess.db';

export const DatabaseService = {
    db: null as SQLite.SQLiteDatabase | null,
    _initPromise: null as Promise<void> | null,

    async init() {
        if (this._initPromise) return this._initPromise;

        this._initPromise = (async () => {
            // 1. Ensure database exists in writable directory
            const dbPath = `${FileSystem.documentDirectory}SQLite/${DB_NAME}`;
            const dirInfo = await FileSystem.getInfoAsync(`${FileSystem.documentDirectory}SQLite`);

            if (!dirInfo.exists) {
                await FileSystem.makeDirectoryAsync(`${FileSystem.documentDirectory}SQLite`);
            }

            const fileInfo = await FileSystem.getInfoAsync(dbPath);
            if (!fileInfo.exists) {
                console.log("Initialize: Copying bundled database...");
                const asset = Asset.fromModule(require('../../assets/neurochess.db'));
                await asset.downloadAsync();
                await FileSystem.copyAsync({
                    from: asset.localUri || asset.uri,
                    to: dbPath,
                });
            }

            // 2. Open Database
            this.db = await SQLite.openDatabaseAsync(DB_NAME);

            // 3. Ensure User Tables (if missing from bundle)
            try {
                // Migration: Rename user_progress to puzzles_games if exists
                await this.db.runAsync(`ALTER TABLE user_progress RENAME TO puzzles_games`).catch(() => { });

                await this.db.execAsync(`
              CREATE TABLE IF NOT EXISTS puzzles_games (
                puzzle_id TEXT PRIMARY KEY,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_puzzles_games_status ON puzzles_games(status);
              
              CREATE TABLE IF NOT EXISTS deep_games (
                puzzle_id TEXT PRIMARY KEY,
                status TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_deep_games_status ON deep_games(status);

              CREATE TABLE IF NOT EXISTS puzzles_long (
                 PuzzleId TEXT PRIMARY KEY,
                 FEN TEXT,
                 Moves TEXT,
                 Rating INTEGER,
                 RatingDeviation INTEGER,
                 Popularity INTEGER,
                 NbPlays INTEGER,
                 Themes TEXT,
                 GameUrl TEXT,
                 OpeningTags TEXT,
                 rating_band TEXT,
                 move_count INTEGER,
                 has_opening INTEGER DEFAULT 0,
                 has_middlegame INTEGER DEFAULT 0,
                 has_endgame INTEGER DEFAULT 0,
                 has_attraction INTEGER DEFAULT 0,
                 has_defensiveMove INTEGER DEFAULT 0,
                 has_deflection INTEGER DEFAULT 0,
                 has_discoveredAttack INTEGER DEFAULT 0,
                 has_hangingPiece INTEGER DEFAULT 0,
                 has_intermezzo INTEGER DEFAULT 0,
                 has_quietMove INTEGER DEFAULT 0,
                 has_sacrifice INTEGER DEFAULT 0,
                 has_skewer INTEGER DEFAULT 0
              );
              CREATE INDEX IF NOT EXISTS idx_puzzles_long_rating ON puzzles_long(Rating);
              
              CREATE TABLE IF NOT EXISTS user_favorites (
                puzzle_id TEXT PRIMARY KEY,
                mode TEXT DEFAULT 'standard', 
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
              );
              CREATE INDEX IF NOT EXISTS idx_favorites_mode ON user_favorites(mode);
              
              CREATE TABLE IF NOT EXISTS player_stats (
                mode TEXT PRIMARY KEY,
                rating REAL,
                rd REAL,
                vol REAL,
                last_active DATETIME DEFAULT CURRENT_TIMESTAMP
              );
        
              CREATE TABLE IF NOT EXISTS nback_games (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                level INTEGER,
                game_time INTEGER, -- minutes
                move_time INTEGER, -- seconds
                bias INTEGER,
                rounds INTEGER,
                MAX_STREAK INTEGER,
                score INTEGER,
                possible_score INTEGER,
                percentage REAL,
                ghost INTEGER DEFAULT 0
              );
              CREATE INDEX IF NOT EXISTS idx_nback_stats ON nback_games(level, game_time, ghost, percentage DESC);

              CREATE TABLE IF NOT EXISTS sequences_games (
                  id INTEGER PRIMARY KEY AUTOINCREMENT,
                  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                  score INTEGER,
                  max_score INTEGER,
                  level INTEGER,
                  game_time INTEGER,
                  speed INTEGER,
                  rounds_completed INTEGER,
                  max_streak INTEGER,
                  max_multiplier INTEGER,
                  accuracy REAL,
                  confounders INTEGER
              );
              CREATE INDEX IF NOT EXISTS idx_sequences_stats ON sequences_games(level, game_time, confounders, score DESC);
            `);

                // Migration for existing tables
                await this.db.runAsync('ALTER TABLE nback_games ADD COLUMN ghost INTEGER DEFAULT 0').catch(() => { });

                // N-Back Persistent Stats
                await this.db.execAsync(`
                    CREATE TABLE IF NOT EXISTS nback_stats (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        max_rank_level INTEGER DEFAULT 0
                    );
                    INSERT OR IGNORE INTO nback_stats (id, max_rank_level) VALUES (1, 0);

                    CREATE TABLE IF NOT EXISTS sequences_stats (
                        id INTEGER PRIMARY KEY CHECK (id = 1),
                        max_rank_level INTEGER DEFAULT 0
                    );
                    INSERT OR IGNORE INTO sequences_stats (id, max_rank_level) VALUES (1, 0);
                `);

                // Migration: Add mode column to user_favorites if missing
                await this.db.runAsync('ALTER TABLE user_favorites ADD COLUMN mode TEXT DEFAULT "standard"').catch(() => { });

                // Initialize Deep Stats if missing
                await this.db.runAsync(`INSERT OR IGNORE INTO player_stats(mode, rating, rd, vol, last_active) VALUES('deep', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);

            } catch (e) {
                console.error("Schema creation/check failed", e);
            }

            console.log("Database initialized.");
        })();

        return this._initPromise;
    },

    async checkRankVerified(level: number) {
        if (!this.db) await this.init();
        try {
            const result = await this.db!.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM nback_games WHERE level = ? AND game_time = 20 AND percentage >= ? AND ghost = 0 AND bias >= 40 AND bias <= 60`,
                [level, 80] // Set to 80 for production
            );
            return (result?.count ?? 0) > 0;
        } catch (e) {
            console.error("Failed to check rank verification:", e);
            return false;
        }
    },

    async getPuzzleCount() {
        if (!this.db) await this.init();
        try {
            const result = await this.db!.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM puzzles`
            );
            return result?.count ?? 0;
        } catch (e) {
            console.error("Failed to get puzzle count:", e);
            return 0;
        }
    },

    async getHighestRankVerified() {
        if (!this.db) await this.init();
        try {
            const result = await this.db!.getFirstAsync<{ max_rank_level: number }>(
                `SELECT max_rank_level FROM nback_stats WHERE id = 1`
            );
            return result?.max_rank_level || 0;
        } catch (e) {
            console.error("Failed to get highest rank:", e);
            return 0;
        }
    },

    async checkSequencesRankVerified(level: number) {
        if (!this.db) await this.init();
        try {
            // Criteria: Level = X, Time >= 20m, Accuracy >= 80% (0.8)
            const result = await this.db!.getFirstAsync<{ count: number }>(
                `SELECT COUNT(*) as count FROM sequences_games WHERE level = ? AND game_time >= 20 AND accuracy >= 0.8 AND confounders = 0`,
                [level]
            );
            return (result?.count ?? 0) > 0;
        } catch (e) {
            console.error("Failed to check sequences verification:", e);
            return false;
        }
    },

    async getSequencesHighestRank() {
        if (!this.db) await this.init();
        try {
            const result = await this.db!.getFirstAsync<{ max_rank_level: number }>(
                `SELECT max_rank_level FROM sequences_stats WHERE id = 1`
            );
            return result?.max_rank_level || 0;
        } catch (e) {
            // If table doesn't exist yet, return 0 (it is created in init but maybe not joined yet)
            console.error("Failed to get highest sequences rank:", e);
            return 0;
        }
    },

    async updateSequencesHighestRank(level: number) {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync(
                `INSERT OR REPLACE INTO sequences_stats(id, max_rank_level) VALUES(1, ?)`,
                [level]
            );
        } catch (e) {
            console.error("Failed to update highest sequences rank:", e);
        }
    },

    async updateHighestRank(level: number) {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync(
                `UPDATE nback_stats SET max_rank_level = ? WHERE id = 1`,
                [level]
            );
        } catch (e) {
            console.error("Failed to update highest rank:", e);
        }
    },

    async insertNBackGame(data: {
        level: number;
        game_time: number;
        move_time: number;
        bias: number;
        rounds: number;
        max_streak: number;
        score: number;
        possible_score: number;
        percentage: number;
        ghost: boolean;
    }) {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync(
                `INSERT INTO nback_games(level, game_time, move_time, bias, rounds, max_streak, score, possible_score, percentage, ghost)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.level,
                    data.game_time,
                    data.move_time,
                    data.bias,
                    data.rounds,
                    data.max_streak,
                    data.score,
                    data.possible_score,
                    data.percentage,
                    data.ghost ? 1 : 0
                ]
            );
            console.log("N-Back game saved.");
        } catch (e) {
            console.error("Failed to save N-Back game:", e);
        }
    },

    async insertSequencesGame(data: {
        score: number;
        max_score: number;
        level: number;
        game_time: number;
        speed: number;
        rounds_completed: number;
        max_streak: number;
        max_multiplier: number;
        accuracy: number;
        confounders: boolean;
    }) {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync(
                `INSERT INTO sequences_games(score, max_score, level, game_time, speed, rounds_completed, max_streak, max_multiplier, accuracy, confounders)
                VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    data.score,
                    data.max_score,
                    data.level,
                    data.game_time,
                    data.speed,
                    data.rounds_completed,
                    data.max_streak,
                    data.max_multiplier,
                    data.accuracy,
                    data.confounders ? 1 : 0
                ]
            );
            console.log("Sequences game saved.");
        } catch (e) {
            console.error("Failed to save Sequences game:", e);
        }
    },

    async clearNBackData() {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync('DELETE FROM nback_games');
            await this.db!.runAsync('UPDATE nback_stats SET max_rank_level = 0 WHERE id = 1');
            console.log("N-Back history and rank cleared.");
        } catch (e) {
            console.error("Failed to clear N-Back history:", e);
        }
    },

    async clearSequencesData() {
        if (!this.db) await this.init();
        try {
            await this.db!.runAsync('DELETE FROM sequences_games');
            await this.db!.runAsync('UPDATE sequences_stats SET max_rank_level = 0 WHERE id = 1');
            console.log("Sequences history and rank cleared.");
        } catch (e) {
            console.error("Failed to clear Sequences history:", e);
        }
    },

    async getNBackBests(level: number, game_time: number) {
        if (!this.db) await this.init();
        try {
            // Best Accuracy (Tie-break: possible_score desc (more rounds better), then max_streak)
            // ghost = 0 (Standard only)
            const accResult = await this.db!.getFirstAsync<{ percentage: number; possible_score: number }>(`
                SELECT percentage, possible_score FROM nback_games 
                WHERE level = ? AND game_time = ? AND ghost = 0
                ORDER BY percentage DESC, possible_score DESC 
                LIMIT 1
                    `, [level, game_time]);

            // Best Streak
            const streakResult = await this.db!.getFirstAsync<{ max_streak: number }>(`
                SELECT max_streak FROM nback_games 
                WHERE level = ? AND game_time = ? AND ghost = 0
                ORDER BY max_streak DESC, percentage DESC
                LIMIT 1
                    `, [level, game_time]);

            return {
                maxAccuracy: accResult?.percentage ?? 0,
                maxStreak: streakResult?.max_streak ?? 0
            };
        } catch (e) {
            console.error("Failed to fetch N-Back bests:", e);
            return { maxAccuracy: 0, maxStreak: 0 };
        }
    },

    async getSequencesBests(level: number, game_time: number, confounders: boolean) {
        if (!this.db) await this.init();
        try {
            const scoreResult = await this.db!.getFirstAsync<{ score: number }>(`
                SELECT score FROM sequences_games
                WHERE level = ? AND game_time = ? AND confounders = ? AND score > 0
                ORDER BY score DESC
                LIMIT 1
                    `, [level, game_time, confounders ? 1 : 0]);

            const streakResult = await this.db!.getFirstAsync<{ max_streak: number }>(`
                SELECT max_streak FROM sequences_games
                WHERE level = ? AND game_time = ? AND confounders = ? AND max_streak > 0
                ORDER BY max_streak DESC
                LIMIT 1
                    `, [level, game_time, confounders ? 1 : 0]);

            return {
                maxScore: scoreResult?.score ?? 0,
                maxStreak: streakResult?.max_streak ?? 0
            };
        } catch (e) {
            console.error("Failed to fetch Sequences bests:", e);
            return { maxScore: 0, maxStreak: 0 };
        }
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
                Moves: result.Moves.trim().split(/\s+/),
                Rating: result.Rating,
                rating_band: result.rating_band || result.Band,
            };
        } catch (error) {
            console.error('Error getting puzzle by ID:', error);
            return null;
        }
    },

    async getRandomPuzzle(userRating: number, band: string = 'All', theme: string = 'all', mode: 'standard' | 'blindfold' | 'deep' = 'standard') {
        if (!this.db) await this.init();

        try {
            // Determine rating range
            let minRating = 0;
            let maxRating = 3500;

            if (band && band !== 'All') {
                if (band.includes('+') || band.includes('PLUS')) {
                    const clean = band.replace('+', '').replace('PLUS', '').replace('-', '');
                    minRating = parseInt(clean);
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

            // Select Source Table and History Table
            const useLongDb = mode === 'deep';
            const puzzlesTable = useLongDb ? 'puzzles_long' : 'puzzles';
            const historyTable = useLongDb ? 'deep_games' : 'puzzles_games';

            // Base conditions: Rating Range AND Not Won
            let whereClause = `Rating BETWEEN ? AND ? AND PuzzleId NOT IN (SELECT puzzle_id FROM ${historyTable} WHERE status = 'win')`;
            let params: any[] = [minRating, maxRating];

            // Theme Filter
            if (theme && theme !== 'all') {
                whereClause += ` AND has_${theme} = 1`;
            }

            let query = `SELECT * FROM ${puzzlesTable} WHERE ${whereClause} ORDER BY RANDOM() LIMIT 1`;

            if (band === 'Favorites') {
                if (useLongDb) {
                    query = `SELECT * FROM puzzles_long
                              JOIN user_favorites ON puzzles_long.PuzzleId = user_favorites.puzzle_id 
                              WHERE user_favorites.mode = 'deep' 
                              ORDER BY RANDOM() LIMIT 1`;
                } else {
                    query = `SELECT * FROM puzzles 
                              JOIN user_favorites ON puzzles.PuzzleId = user_favorites.puzzle_id 
                              WHERE user_favorites.mode IN ('standard', 'blindfold') 
                              ORDER BY RANDOM() LIMIT 1`;
                }
                params = [];
            }

            const result = await this.db?.getFirstAsync<any>(query, params);

            if (!result) return null;

            return {
                PuzzleId: result.PuzzleId,
                FEN: result.FEN,
                Moves: result.Moves.trim().split(/\s+/),
                Rating: result.Rating,
                rating_band: result.rating_band || result.Band,
            };
        } catch (error) {
            console.error('Error getting puzzle:', error);
            return null;
        }
    },

    async getDeepPuzzle(userRating: number, band: string, depth: number, theme: string = 'all') {
        if (!this.db) await this.init();

        try {
            // 1. Determine Source Table & Logic
            // User Definition: Depth = Move Count (Full Moves).
            const useLongDb = depth >= 4;
            const table = useLongDb ? 'puzzles_long' : 'puzzles';
            const historyTable = 'deep_games';

            // 2. Rating Range (Standard Logic)
            let minRating = 0;
            let maxRating = 3500;
            if (band && band !== 'All' && band !== 'Favorites') {
                if (band.includes('+') || band.includes('PLUS')) {
                    minRating = parseInt(band.replace(/\D/g, ''));
                } else {
                    const parts = band.split('-');
                    if (parts.length === 2) {
                        minRating = parseInt(parts[0]);
                        maxRating = parseInt(parts[1]);
                    }
                }
            } else {
                minRating = userRating - 300;
                maxRating = userRating + 300;
            }
            minRating = Math.max(0, minRating);
            maxRating = Math.min(3500, maxRating);

            // 3. Construct Query
            let whereClauses: string[] = [];
            let params: any[] = [];

            // Rating
            if (band !== 'Favorites') {
                whereClauses.push(`Rating BETWEEN ? AND ?`);
                params.push(minRating, maxRating);
            }

            // Depth / Move Count Logic
            if (depth >= 9) {
                whereClauses.push(`move_count >= 9`);
            } else {
                whereClauses.push(`move_count = ?`);
                params.push(depth);
            }

            // Theme
            if (theme && theme !== 'all') {
                whereClauses.push(`has_${theme} = 1`);
            }

            // Exclude Won Games (History)
            whereClauses.push(`PuzzleId NOT IN (SELECT puzzle_id FROM ${historyTable} WHERE status = 'win')`);

            // Favorites Handling
            let query = '';
            if (band === 'Favorites') {
                // Join with favorites
                query = `SELECT ${table}.* FROM ${table}
                         JOIN user_favorites ON ${table}.PuzzleId = user_favorites.puzzle_id
                         WHERE user_favorites.mode = 'deep'
                         AND ${whereClauses.join(' AND ')}
                         ORDER BY RANDOM() LIMIT 1`;
            } else {
                query = `SELECT * FROM ${table}
                         WHERE ${whereClauses.join(' AND ')}
                         ORDER BY RANDOM() LIMIT 1`;
            }

            const result = await this.db!.getFirstAsync<any>(query, params);

            if (!result) return null;

            return {
                PuzzleId: result.PuzzleId,
                FEN: result.FEN,
                Moves: result.Moves.trim().split(/\s+/),
                Rating: result.Rating,
                rating_band: result.rating_band || result.Band,
            };

        } catch (e) {
            console.error('[getDeepPuzzle] Error:', e);
            return null;
        }
    },

    async getPlayerStats(mode: string = 'standard') {
        if (!this.db) await this.init();
        const result = await this.db!.getFirstAsync<any>(
            `SELECT * FROM player_stats WHERE mode = ? `,
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
            `INSERT OR REPLACE INTO player_stats(mode, rating, rd, vol, last_active) VALUES(?, ?, ?, ?, CURRENT_TIMESTAMP)`,
            [mode, rating, rd, vol]
        );
    },

    async recordResult(puzzleId: string, success: boolean, newRating?: number, mode: 'standard' | 'blindfold' | 'deep' = 'standard') {
        if (!this.db) await this.init();

        // Decide table based on mode? 
        // User said: "puzzles_games" (rename of user_progress) is for standard/blindfold presumably?
        // And "deep_games" for deep.

        const table = mode === 'deep' ? 'deep_games' : 'puzzles_games';

        await this.db!.runAsync(
            `INSERT OR REPLACE INTO ${table} (puzzle_id, status) VALUES(?, ?)`,
            [puzzleId, success ? 'win' : 'loss']
        );
    },

    async toggleFavorite(puzzleId: string, mode: 'standard' | 'blindfold' | 'deep' = 'standard') {
        if (!this.db) await this.init();
        const exists = await this.db!.getFirstAsync<{ puzzle_id: string }>(
            `SELECT puzzle_id FROM user_favorites WHERE puzzle_id = ? `,
            [puzzleId]
        );

        if (exists) {
            await this.db!.runAsync(`DELETE FROM user_favorites WHERE puzzle_id = ? `, [puzzleId]);
            return false;
        } else {
            await this.db!.runAsync(`INSERT INTO user_favorites(puzzle_id, mode) VALUES(?, ?)`, [puzzleId, mode]);
            return true;
        }
    },

    async checkFavorite(puzzleId: string) {
        if (!this.db) await this.init();
        const result = await this.db!.getFirstAsync<{ puzzle_id: string }>(
            `SELECT puzzle_id FROM user_favorites WHERE puzzle_id = ? `,
            [puzzleId]
        );
        return !!result;
    },

    async resetAllStats(mode: 'puzzles' | 'deep' = 'puzzles') {
        if (!this.db) await this.init();

        if (mode === 'puzzles') {
            // Reset both standard and blindfold modes to 1200
            await this.db!.runAsync(`INSERT OR REPLACE INTO player_stats(mode, rating, rd, vol, last_active) VALUES('standard', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);
            await this.db!.runAsync(`INSERT OR REPLACE INTO player_stats(mode, rating, rd, vol, last_active) VALUES('blindfold', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);
            // Clear history (puzzles_games)
            await this.db!.runAsync(`DELETE FROM puzzles_games`);
            // Clear favorites (standard/blindfold)
            await this.db!.runAsync(`DELETE FROM user_favorites WHERE mode IN('standard', 'blindfold')`);
            console.log("Puzzles stats reset.");
        } else if (mode === 'deep') {
            // Reset Deep mode
            await this.db!.runAsync(`INSERT OR REPLACE INTO player_stats(mode, rating, rd, vol, last_active) VALUES('deep', 1200, 350, 0.06, CURRENT_TIMESTAMP)`);
            // Clear deep games
            await this.db!.runAsync(`DELETE FROM deep_games`);
            // Clear deep favorites
            await this.db!.runAsync(`DELETE FROM user_favorites WHERE mode = 'deep'`);
            console.log("Deep stats reset.");
        }
    },

    /**
     * Helper to get count of puzzles available in the source DB (short vs long)
     */
    async getAvailablePuzzleCount(mode: 'standard' | 'deep') {
        if (!this.db) await this.init();
        try {
            const table = mode === 'deep' ? 'puzzles_long' : 'puzzles';
            const res = await this.db!.getFirstAsync<{ count: number }>(`SELECT COUNT(*) as count FROM ${table} `);
            return res?.count || 0;
        } catch (e) {
            console.error("Count failed", e);
            return 0;
        }
    },

    async mergeDLC(localUri: string) {
        if (!this.db) await this.init();

        console.log('[DatabaseService] Attaching DLC:', localUri);

        // SQLite native expects path without file:// on Android
        const dbPath = localUri.replace('file://', '');

        // 1. ATTACH
        // Note: runAsync allows multiple statements? No, safer to run sequentially.
        // Also simpler string interpolation for attached DB path
        await this.db!.runAsync(`ATTACH DATABASE '${dbPath}' AS dlc`);

        // 2. MERGE
        // We use INSERT OR IGNORE to skip duplicates
        await this.db!.runAsync(`INSERT OR IGNORE INTO main.puzzles SELECT * FROM dlc.puzzles`);

        // 3. DETACH
        await this.db!.runAsync(`DETACH DATABASE dlc`);

        console.log('[DatabaseService] DLC Merge Complete');
    },

    async installDeepDLC(localUri: string) {
        if (!this.db) await this.init();

        console.log('[DatabaseService] Attaching Deep DLC:', localUri);

        // SQLite native expects path without file:// on Android
        const dbPath = localUri.replace('file://', '');

        try {
            // 1. ATTACH
            await this.db!.runAsync(`ATTACH DATABASE '${dbPath}' AS deep_dlc`);

            // 2. MERGE (puzzles_long -> puzzles_long)
            // We use INSERT OR IGNORE to skip duplicates
            // Ensure target table matches source. We created puzzles_long in init() matching the structure.
            await this.db!.runAsync(`INSERT OR IGNORE INTO main.puzzles_long SELECT * FROM deep_dlc.puzzles_long`);

            // 3. DETACH
            await this.db!.runAsync(`DETACH DATABASE deep_dlc`);

            console.log('[DatabaseService] Deep DLC Install Complete');
        } catch (e) {
            console.error('[DatabaseService] Deep DLC Install Failed:', e);
            // Try to detach just in case it failed mid-way
            try { await this.db!.runAsync(`DETACH DATABASE deep_dlc`); } catch (_) { }
            throw e;
        }
    }
};
