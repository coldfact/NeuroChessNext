// Web implementation: Fetch from local Flask API
const API_URL = 'http://localhost:5000';

export const DatabaseService = {
    async init() {
        console.log("Web: Using API at " + API_URL);
    },

    async getCountsByBand() {
        // Not implemented in API yet, return empty
        return [];
    },

    async getPuzzleById(puzzleId: string) {
        try {
            console.log(`[Web API] Fetching puzzle by ID: ${puzzleId}`);
            const response = await fetch(`${API_URL}/get_puzzle/${puzzleId}`);
            if (!response.ok) {
                console.error(`[Web API] Puzzle not found: ${puzzleId}`);
                return null;
            }
            const puzzle = await response.json();
            console.log('[Web API] Got puzzle:', puzzle.PuzzleId);
            return {
                PuzzleId: puzzle.PuzzleId,
                FEN: puzzle.FEN,
                Moves: puzzle.Moves,
                Rating: puzzle.Rating,
                Band: puzzle.rating_band || puzzle.Band
            };
        } catch (e) {
            console.error("[Web API] getPuzzleById failed", e);
            return null;
        }
    },

    async getRandomPuzzle(rating: number, band?: string, theme: string = 'all') {
        try {
            console.log(`Web: Fetching puzzle for rating ${rating} band ${band} theme ${theme}`);
            let url = `${API_URL}/get_puzzles?count=1&mode=standard&rating=${Math.round(rating)}`;

            if (band && band !== 'All') {
                url += `&band=${band}`;
            }
            if (theme && theme !== 'all') {
                url += `&theme=${theme}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            console.log('[Web API] Raw response:', JSON.stringify(data));

            // API returns { puzzles: [...], user_rating: ... } 
            // or sometimes just [...] depending on version? 
            // Let's handle both for safety.
            const puzzleList = Array.isArray(data) ? data : data.puzzles;
            console.log('[Web API] puzzleList length:', puzzleList?.length);

            if (puzzleList && puzzleList.length > 0) {
                const puzzle = puzzleList[0];
                console.log('[Web API] Returning puzzle:', puzzle.PuzzleId, puzzle.FEN?.substring(0, 30));
                return {
                    PuzzleId: puzzle.PuzzleId,
                    FEN: puzzle.FEN,
                    Moves: puzzle.Moves,
                    Rating: puzzle.Rating,
                    Band: puzzle.rating_band || puzzle.Band
                };
            }
            return null;
        } catch (e) {
            console.error("Web: API fetch failed", e);
            // Fallback to demo only on network error
            return {
                PuzzleId: 'web-network-error',
                FEN: '4k3/8/4K3/8/8/8/8/5R2 w - - 0 1',
                Moves: ['f1f8'],
                Rating: 0,
                Band: 'error'
            };
        }
    },

    async recordResult(puzzleId: string, success: boolean, newRating: number) {
        console.log(`[Web API] Result locally recorded: ${puzzleId} = ${success}`);
        try {
            await fetch(`${API_URL}/record_result`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzle_id: puzzleId, status: success ? 'win' : 'loss' })
            });
        } catch (e) {
            console.error('[Web API] Failed to sync result', e);
        }
    },

    async toggleFavorite(puzzleId: string) {
        console.log(`[Web API] Toggling favorite for: ${puzzleId}`);
        try {
            const response = await fetch(`${API_URL}/toggle_favorite`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ puzzle_id: puzzleId })
            });
            const data = await response.json();
            return data.is_favorite;
        } catch (e) {
            console.error('[Web API] Failed to toggle favorite', e);
            return false;
        }
    },

    async checkFavorite(puzzleId: string) {
        try {
            console.log(`[Web API] Checking favorite for: ${puzzleId}`);
            const response = await fetch(`${API_URL}/check_favorite?puzzle_id=${puzzleId}`);
            const data = await response.json();
            return data.is_favorite;
        } catch (e) {
            return false;
        }
    },

    async getPlayerStats(mode: string = 'standard') {
        try {
            const response = await fetch(`${API_URL}/get_stats?mode=${mode}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (e) {
            console.error("Web: Failed to fetch stats", e);
        }
        return null;
    },

    async updatePlayerStats(mode: string, rating: number, rd: number, vol: number) {
        try {
            await fetch(`${API_URL}/update_stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode, rating, rd, vol })
            });
            console.log(`[Web API] Stats synced: ${rating} (${Math.round(rd)})`);
        } catch (e) {
            console.error("Web: Failed to sync stats", e);
        }
        // Fallback: update local storage for redundancy if needed, but API is authoritative
        const stats = { rating, rd, vol, last_active: new Date().toISOString() };
        localStorage.setItem(`player_stats_${mode}`, JSON.stringify(stats));
    },

    async resetAllStats() {
        console.log("[Web] Resetting all stats and history");
        try {
            await fetch(`${API_URL}/reset_progress`, { method: 'POST' });
        } catch (e) {
            console.error("Web: Failed to reset server stats", e);
        }
        // Clear local storage too to ensure sync
        localStorage.removeItem('player_stats_standard');
        localStorage.removeItem('player_stats_blindfold');
    }
};
