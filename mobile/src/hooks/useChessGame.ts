import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { DatabaseService, soundService } from '../services';
import { updateRating, Rating, INITIAL_RATING } from '../engine/glicko';

// Module-level flag to prevent double-loading across React remounts (StrictMode)
let isLoadingGlobal = false;

interface GameState {
    puzzleId: string;
    puzzleRating: number;
    userRating: number;
    stats: { standard?: Rating; blindfold?: Rating }; // Glicko stats per mode
    mode: 'standard' | 'blindfold';
    fen: string;
    orientation: 'white' | 'black';
    status: { message: string; color: string };
    highlights: { from?: string; to?: string };
    isLoading: boolean;
    statsLoaded: boolean; // True when player stats are loaded from DB
    ratingApplied?: boolean;
    isFavorite?: boolean;
}

// Note: We now control puzzle loading from the component via nextPuzzle, but we keep the logic here.
export function useChessGame(initialBand: string, initialTheme: string, autoAdvance: boolean) {
    const [game] = useState(() => new Chess());
    const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
    const [moveIndex, setMoveIndex] = useState(-1);
    const [state, setState] = useState<GameState>({
        puzzleId: 'Loading...',
        puzzleRating: 0,
        userRating: 1200,
        stats: {},
        mode: 'standard',
        fen: game.fen(),
        orientation: 'white',
        status: { message: 'Loading puzzle...', color: '#888' },
        highlights: {},

        isLoading: true,
        statsLoaded: false, // Will be set true after DB stats load
        ratingApplied: false,
        isFavorite: false
    });

    // Ref to hold current rating for loadPuzzle without adding dependency
    const userRatingRef = React.useRef(1200);
    const loadingRef = useRef(false);
    const puzzleFenRef = useRef(''); // Store initial puzzle FEN for reset
    const bandRef = useRef(initialBand); // Track current band to avoid stale closure
    const themeRef = useRef(initialTheme);
    const modeRef = useRef<'standard' | 'blindfold'>('standard');
    const isMounted = useRef(true); // To prevent state updates on unmounted component

    // Sync refs with props/state
    const statsRef = useRef(state.stats); // Add ref for stats to avoid stale closure
    useEffect(() => {
        // Sync ref with current mode's rating
        const currentStats = state.stats[state.mode];
        if (currentStats) {
            userRatingRef.current = Math.round(currentStats.rating);
        } else {
            userRatingRef.current = 1200;
        }
        modeRef.current = state.mode;
        statsRef.current = state.stats; // Keep stats ref updated
    }, [state.userRating, state.mode, state.stats]);

    // Sync refs immediately during render to avoid stale closures in callbacks
    // avoiding the need for setTimeout in parent components
    bandRef.current = initialBand;
    themeRef.current = initialTheme;

    // Set isMounted to false on unmount
    useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    // Load Stats on mount for both modes
    useEffect(() => {
        const loadStats = async () => {
            const stdStats = await DatabaseService.getPlayerStats('standard');
            const blStats = await DatabaseService.getPlayerStats('blindfold');

            if (!isMounted.current) return; // Prevent state update if unmounted

            setState(prev => {
                const newStats = {
                    standard: stdStats || undefined,
                    blindfold: blStats || undefined
                };
                // Use CURRENT mode's rating, not just standard
                const currentMode = prev.mode;
                const relevantStats = newStats[currentMode];
                const initialRating = relevantStats ? Math.round(relevantStats.rating) : 1200;

                // Update statsRef immediately so loadPuzzle can access it
                statsRef.current = newStats;
                userRatingRef.current = initialRating;

                return {
                    ...prev,
                    userRating: initialRating,
                    stats: newStats,
                    statsLoaded: true // Stats are now ready
                };
            });

            // Initialize defaults if missing
            if (!stdStats) await DatabaseService.updatePlayerStats('standard', 1200, 350, 0.06);
            if (!blStats) await DatabaseService.updatePlayerStats('blindfold', 1200, 350, 0.06);
        };
        loadStats();
    }, []);

    const loadPuzzle = useCallback(async () => {
        // Use module-level flag to prevent double-loading (survives React StrictMode remounts)
        console.log(`[loadPuzzle] Called. isLoadingGlobal=${isLoadingGlobal}`);
        if (isLoadingGlobal) {
            console.log('[loadPuzzle] BLOCKED by isLoadingGlobal');
            return;
        }
        isLoadingGlobal = true;
        console.log('[loadPuzzle] Starting fetch...');

        // Use ref to avoid re-creating function when rating changes
        const ratingToFetch = userRatingRef.current || 1500;

        setState(prev => ({
            ...prev,
            isLoading: true,
            status: { message: 'Loading...', color: '#888' }
        }));

        try {
            // Get Rating based on Mode - use statsRef to avoid stale closure
            const getRatingForMode = (mode: 'standard' | 'blindfold') => {
                const stats = statsRef.current[mode];
                if (stats) {
                    return Math.round(stats.rating);
                }
                return 1200; // Default if no stats
            };
            const userRating = getRatingForMode(modeRef.current);
            const currentTheme = themeRef.current;

            console.log(`[loadPuzzle] Mode=${modeRef.current}, Band=${bandRef.current}, Theme=${currentTheme}, Rating=${userRating}`);

            // Fetch new puzzle
            const puzzle = await DatabaseService.getRandomPuzzle(userRating, bandRef.current, currentTheme);

            if (!puzzle) {
                if (!isMounted.current) return;
                setState(prev => ({
                    ...prev,
                    puzzleId: '',
                    isLoading: false,
                    status: { message: 'No Puzzles Found', color: '#e74c3c' },
                    fen: '8/8/8/8/8/8/8/8 w - - 0 1'
                }));
                return;
            }

            const isFav = await DatabaseService.checkFavorite(puzzle.PuzzleId);

            if (isMounted.current) {
                game.load(puzzle.FEN);
                puzzleFenRef.current = puzzle.FEN; // Store for restart
                setSolutionMoves(puzzle.Moves);
                setMoveIndex(-1);
                setState(prev => ({
                    ...prev,
                    puzzleId: puzzle.PuzzleId,
                    fen: puzzle.FEN,
                    puzzleRating: puzzle.Rating,
                    orientation: game.turn() === 'w' ? 'black' : 'white',
                    status: { message: 'Your move...', color: '#fff' },
                    highlights: {},
                    isLoading: false,
                    ratingApplied: false,
                    isFavorite: isFav
                }));

                // Auto-play first move (opponent) after delay
                const firstMove = puzzle.Moves[0];
                if (firstMove) {
                    setTimeout(() => {
                        if (!isMounted.current) return;
                        try {
                            const from = firstMove.slice(0, 2);
                            const to = firstMove.slice(2, 4);
                            const promotion = firstMove.length > 4 ? firstMove[4] : undefined;
                            game.move({ from, to, promotion });

                            // Play sound for opponent's first move
                            const lastMove = game.history({ verbose: true }).slice(-1)[0];
                            soundService.playMoveSound(!!lastMove?.captured);

                            setMoveIndex(0);

                            setState(prev => ({
                                ...prev,
                                fen: game.fen(),
                                highlights: { from, to },
                                status: { message: 'Your move...', color: '#eee' },
                            }));
                        } catch (e) {
                            console.error("Auto-play move failed:", e);
                        }
                    }, 500); // 500ms delay for clearer animation
                } else {
                    setState(prev => ({
                        ...prev,
                        status: { message: 'Your move...', color: '#eee' }
                    }));
                }
            } else {
                setState(prev => ({
                    ...prev,
                    isLoading: false,
                    status: { message: 'Error loading puzzle', color: 'red' }
                }));
            }
        } catch (e) {
            console.error("Load Puzzle Error", e);
            setState(prev => ({
                ...prev,
                isLoading: false,
                status: { message: 'Error', color: 'red' }
            }));
        } finally {
            isLoadingGlobal = false;
        }
    }, [game]); // Removed band dependency to rely on ref

    // Load a specific puzzle by ID (for debugging)
    const loadPuzzleById = useCallback(async (puzzleId: string) => {
        console.log(`[loadPuzzleById] Loading puzzle: ${puzzleId}`);
        if (isLoadingGlobal) return;
        isLoadingGlobal = true;

        setState(prev => ({
            ...prev,
            isLoading: true,
            status: { message: 'Loading puzzle...', color: '#888' }
        }));

        try {
            const puzzle = await DatabaseService.getPuzzleById(puzzleId);

            if (!puzzle) {
                setState(prev => ({
                    ...prev,
                    puzzleId: '',
                    isLoading: false,
                    status: { message: `Puzzle ${puzzleId} not found`, color: '#e74c3c' },
                    fen: '8/8/8/8/8/8/8/8 w - - 0 1'
                }));
                return;
            }

            const isFav = await DatabaseService.checkFavorite(puzzle.PuzzleId);

            if (isMounted.current) {
                game.load(puzzle.FEN);
                puzzleFenRef.current = puzzle.FEN;
                setSolutionMoves(puzzle.Moves);
                setMoveIndex(-1);
                setState(prev => ({
                    ...prev,
                    puzzleId: puzzle.PuzzleId,
                    puzzleRating: puzzle.Rating,
                    fen: game.fen(),
                    orientation: game.turn() === 'w' ? 'black' : 'white',
                    status: { message: 'Your move...', color: '#eee' },
                    isLoading: false,
                    ratingApplied: false,
                    isFavorite: isFav
                }));

                // Auto play opponent's first move
                if (puzzle.Moves.length > 0) {
                    setTimeout(async () => {
                        try {
                            const move = puzzle.Moves[0];
                            game.move({ from: move.slice(0, 2), to: move.slice(2, 4), promotion: move.length > 4 ? move[4] : undefined });
                            setMoveIndex(0);
                            await soundService.playMove();
                            setState(prev => ({
                                ...prev,
                                fen: game.fen(),
                                highlights: { from: move.slice(0, 2), to: move.slice(2, 4) },
                                status: { message: 'Your move...', color: '#eee' }
                            }));
                        } catch (e) {
                            console.error("Auto-play move failed:", e);
                        }
                    }, 500);
                }
            }
        } catch (e) {
            console.error("Load Puzzle By ID Error", e);
            setState(prev => ({
                ...prev,
                isLoading: false,
                status: { message: 'Error', color: 'red' }
            }));
        } finally {
            isLoadingGlobal = false;
        }
    }, [game]);


    const restartPuzzle = useCallback(() => {
        if (!puzzleFenRef.current || solutionMoves.length === 0) return;

        // Load Initial FEN
        game.load(puzzleFenRef.current);

        // Reset State
        setMoveIndex(-1); // Before first move
        setState(prev => ({
            ...prev,
            fen: game.fen(),
            highlights: {},
            status: { message: 'Restarting...', color: '#888' }
        }));

        // Replay First Move (Opponent)
        const firstMove = solutionMoves[0];
        if (firstMove) {
            setTimeout(() => {
                if (!isMounted.current) return;
                try {
                    const from = firstMove.slice(0, 2);
                    const to = firstMove.slice(2, 4);
                    const promotion = firstMove.length > 4 ? firstMove[4] : undefined;
                    game.move({ from, to, promotion });

                    soundService.playMoveSound(false);

                    setMoveIndex(0);
                    setState(prev => ({
                        ...prev,
                        fen: game.fen(),
                        highlights: { from, to },
                        status: { message: 'Your move...', color: '#eee' }
                    }));
                } catch (e) {
                    console.error("Restart auto-play failed", e);
                }
            }, 300);
        }
    }, [game, solutionMoves]);

    const handleMove = useCallback((from: string, to: string, promotion?: string) => {
        const expectedIndex = moveIndex + 1;
        const expectedMove = solutionMoves[expectedIndex];
        const moveAttempt = from + to;

        // For promotions, include the promotion suffix
        const moveAttemptWithPromo = promotion ? moveAttempt + promotion : moveAttempt;

        // Check if expected move is a promotion (has 5th character)
        const expectedIsPromotion = expectedMove && expectedMove.length > 4;

        // Validate move correctness
        let isCorrect = false;
        if (expectedIsPromotion) {
            // For promotion moves, the FULL move including promotion piece must match
            isCorrect = moveAttemptWithPromo === expectedMove;
        } else {
            // For non-promotion moves, just match the from-to squares
            isCorrect = moveAttempt === expectedMove;
        }

        if (expectedMove && isCorrect) {
            // Correct!
            // Apply move safely
            try {
                // Use the promotion from user selection if provided, otherwise try without
                const moveResult = game.move({ from, to, promotion: promotion as any });
            } catch (e) {
                console.error("User move failed:", e);
                return;
            }

            // Play sound (check if capture by testing if the target square had a piece)
            const lastMove = game.history({ verbose: true }).slice(-1)[0];
            soundService.playMoveSound(!!lastMove?.captured);

            setMoveIndex(expectedIndex);

            const isSolved = expectedIndex + 1 >= solutionMoves.length;

            setState(prev => ({
                ...prev,
                fen: game.fen(),
                highlights: { from, to },
                status: {
                    message: isSolved ? 'Solved!' : 'Correct!',
                    color: isSolved ? '#f1c40f' : '#2ecc71'
                },
            }));

            if (!isSolved) {
                // Opponent response
                setTimeout(() => {
                    try {
                        const opponentMove = solutionMoves[expectedIndex + 1];
                        const opFrom = opponentMove.slice(0, 2);
                        const opTo = opponentMove.slice(2, 4);
                        const opProm = opponentMove.length > 4 ? opponentMove[4] : undefined;

                        game.move({ from: opFrom, to: opTo, promotion: opProm });

                        // Play sound for opponent move
                        const opLastMove = game.history({ verbose: true }).slice(-1)[0];
                        soundService.playMoveSound(!!opLastMove?.captured);

                        setMoveIndex(expectedIndex + 1);

                        setState(prev => ({
                            ...prev,
                            fen: game.fen(),
                            highlights: { from: opFrom, to: opTo },
                            status: { message: 'Your move...', color: '#eee' },
                        }));
                    } catch (e) {
                        console.error("Opponent move failed:", e);
                    }
                }, 500);
            } else {
                // Record win
                if (!state.ratingApplied) {
                    let currentMode = state.mode;
                    let currentStats = state.stats[currentMode];

                    // Fallback if stats missing (shouldn't happen with init)
                    // Fallback if stats missing (shouldn't happen with init)
                    if (!currentStats || isNaN(currentStats.rating)) currentStats = { ...INITIAL_RATING };

                    const newStats = updateRating(currentStats, state.puzzleRating, true);

                    DatabaseService.updatePlayerStats(currentMode, newStats.rating, newStats.rd, newStats.vol);
                    DatabaseService.recordResult(state.puzzleId, true, newStats.rating);

                    setState(prev => ({
                        ...prev,
                        userRating: Math.round(newStats.rating),
                        ratingApplied: true,
                        stats: {
                            ...prev.stats,
                            [currentMode]: newStats
                        }
                    }));

                    // Auto-advance if enabled
                    if (autoAdvance) {
                        setTimeout(() => nextPuzzle(), 1500);
                    }
                }
            }
        } else {
            // Wrong
            if (!state.ratingApplied) {
                let currentMode = state.mode;
                let currentStats = state.stats[currentMode];
                if (!currentStats || isNaN(currentStats.rating)) currentStats = { ...INITIAL_RATING };

                const newStats = updateRating(currentStats, state.puzzleRating, false); // false = loss

                DatabaseService.updatePlayerStats(currentMode, newStats.rating, newStats.rd, newStats.vol);
                DatabaseService.recordResult(state.puzzleId, false, newStats.rating);

                setState(prev => ({
                    ...prev,
                    userRating: Math.round(newStats.rating),
                    ratingApplied: true,
                    stats: {
                        ...prev.stats,
                        [currentMode]: newStats
                    },
                    status: { message: 'Wrong! Try again.', color: '#e74c3c' },
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    status: { message: 'Wrong! Try again.', color: '#e74c3c' },
                }));
            }
            // Play error sound
            soundService.playError();
        }
    }, [game, moveIndex, solutionMoves, state.puzzleId, state.userRating, state.stats, state.mode, state.puzzleRating]);

    const nextPuzzle = useCallback(() => {
        loadPuzzle();
    }, [loadPuzzle]);

    const giveUp = useCallback(async () => {
        if (state.isLoading && state.status.message === 'Solution Revealed') return;

        console.log("giveUp called");
        try {
            // 1. Mark as failed
            setState(prev => ({
                ...prev,
                status: { message: 'Solution Revealed', color: '#e74c3c' },
                isLoading: true // Block input
            }));

            // 2. Calculate Rating Loss
            let currentMode = state.mode;
            if (!state.ratingApplied) {
                let currentStats = state.stats[currentMode];
                if (!currentStats || isNaN(currentStats.rating)) currentStats = { ...INITIAL_RATING };

                const newStats = updateRating(currentStats, state.puzzleRating, false); // false = loss

                // Persist
                await DatabaseService.updatePlayerStats(currentMode, newStats.rating, newStats.rd, newStats.vol);
                await DatabaseService.recordResult(state.puzzleId, false, newStats.rating);

                setState(prev => ({
                    ...prev,
                    userRating: Math.round(newStats.rating),
                    ratingApplied: true,
                    stats: {
                        ...prev.stats,
                        [currentMode]: newStats
                    }
                }));
            }

            // 3. Just show the immediate next move to help the user start
            setTimeout(() => {
                const expectedIndex = moveIndex + 1;
                if (expectedIndex < solutionMoves.length) {
                    const moveStr = solutionMoves[expectedIndex];
                    const from = moveStr.slice(0, 2);
                    const to = moveStr.slice(2, 4);
                    const promotion = moveStr.length > 4 ? moveStr[4] : 'q';

                    try {
                        game.move({ from, to, promotion });
                    } catch (e) {
                        game.move({ from, to, promotion: 'q' });
                    }



                    // Play sound
                    const lastMove = game.history({ verbose: true }).slice(-1)[0];
                    soundService.playMoveSound(!!lastMove?.captured);

                    setMoveIndex(expectedIndex);
                    setState(prev => ({
                        ...prev,
                        fen: game.fen(),
                        highlights: { from, to },
                        isLoading: false // Enable controls immediately
                    }));
                } else {
                    setState(prev => ({ ...prev, isLoading: false }));
                }
            }, 300);

        } catch (e) {
            console.error("Give up error:", e);
            setState(prev => ({
                ...prev,
                status: { message: 'Solution Revealed', color: '#e74c3c' },
                isLoading: false
            }));
        }

    }, [game, moveIndex, solutionMoves, state.puzzleId, state.puzzleRating, state.stats, state.mode]);

    // Navigation logic
    const navigateHistory = useCallback((direction: 'back' | 'forward') => {
        if (state.isLoading) return;

        if (direction === 'back') {
            if (moveIndex >= -1) {
                if (moveIndex > -1) {
                    game.undo();
                    soundService.playMoveSound(false);
                    setMoveIndex(prev => prev - 1);
                    setState(prev => ({
                        ...prev,
                        fen: game.fen(),
                        highlights: {}
                    }));
                }
            }
        } else {
            // Forward
            if (moveIndex < solutionMoves.length - 1) {
                const nextIdx = moveIndex + 1;
                const moveStr = solutionMoves[nextIdx];
                const from = moveStr.slice(0, 2);
                const to = moveStr.slice(2, 4);
                game.move({ from, to, promotion: 'q' });

                const lastMove = game.history({ verbose: true }).slice(-1)[0];
                soundService.playMoveSound(!!lastMove?.captured);

                setMoveIndex(nextIdx);
                setState(prev => ({
                    ...prev,
                    fen: game.fen(),
                    highlights: { from, to }
                }));
            }
        }
    }, [game, moveIndex, solutionMoves, state.isLoading]);

    // Reset current puzzle from the beginning (for peek in blindfold mode)
    const resetPuzzle = useCallback(() => {
        if (!puzzleFenRef.current || !solutionMoves.length) return;

        // Reload the initial position
        game.load(puzzleFenRef.current);
        setMoveIndex(-1);

        const playerColor = game.turn() === 'w' ? 'black' : 'white';

        setState(prev => ({
            ...prev,
            fen: game.fen(),
            orientation: playerColor,
            status: { message: 'Opponent is moving...', color: '#888' },
            highlights: {},
        }));

        // Replay first move after delay
        const firstMove = solutionMoves[0];
        if (firstMove) {
            setTimeout(() => {
                try {
                    const from = firstMove.slice(0, 2);
                    const to = firstMove.slice(2, 4);
                    const promotion = firstMove.length > 4 ? firstMove[4] : undefined;
                    game.move({ from, to, promotion });

                    const lastMove = game.history({ verbose: true }).slice(-1)[0];
                    soundService.playMoveSound(!!lastMove?.captured);

                    setMoveIndex(0);

                    setState(prev => ({
                        ...prev,
                        fen: game.fen(),
                        highlights: { from, to },
                        status: { message: 'Your move...', color: '#eee' },
                    }));
                } catch (e) {
                    console.error("Reset puzzle first move failed:", e);
                }
            }, 500);
        }
    }, [game, solutionMoves]);

    // Switch Mode
    const setMode = useCallback((mode: 'standard' | 'blindfold') => {
        setState(prev => {
            const modeStats = prev.stats[mode];
            const newRating = modeStats ? Math.round(modeStats.rating) : 1200;
            return {
                ...prev,
                mode,
                userRating: newRating
            };
        });
    }, []);

    const resetGameData = useCallback(async () => {
        console.log("Reseting game data...");
        await DatabaseService.resetAllStats();

        const resetStats = { rating: 1200, rd: 350, vol: 0.06 };

        setState(prev => ({
            ...prev,
            userRating: 1200,
            stats: {
                standard: resetStats,
                blindfold: resetStats
            },
            status: { message: 'Data Reset', color: '#2ecc71' }
        }));

        userRatingRef.current = 1200;

        // Reload puzzle with new rating
        setTimeout(() => loadPuzzle(), 100);
    }, [loadPuzzle]);

    const toggleFavorite = useCallback(async () => {
        if (!state.puzzleId || state.puzzleId === 'Loading...' || state.puzzleId === '') return;
        const newStatus = await DatabaseService.toggleFavorite(state.puzzleId);
        setState(prev => ({ ...prev, isFavorite: newStatus }));
    }, [state.puzzleId]);

    const toggleBlindfold = useCallback(() => {
        setState(prev => {
            const newMode = prev.mode === 'standard' ? 'blindfold' : 'standard';
            const modeStats = prev.stats[newMode];
            const newRating = modeStats ? Math.round(modeStats.rating) : 1200;
            // Set isLoading to true immediately to prevent UI flicker (e.g. Peek button showing briefly)
            // The useEffect in the consumer will trigger the actual data load
            return {
                ...prev,
                mode: newMode,
                userRating: newRating, // Update displayed rating for new mode
                isLoading: true,
                status: { message: 'Switching mode...', color: '#888' }
            };
        });
    }, []);

    // Helper to properly set mode with side effects if needed
    const setGameMode = useCallback((mode: 'standard' | 'blindfold') => {
        setMode(mode);
    }, [setMode]);

    return {
        ...state,
        setMode,
        resetGameData,
        handleMove,
        nextPuzzle,
        loadPuzzleById, // For debugging specific puzzles
        giveUp,
        navigateHistory,
        restartPuzzle, // Expose new function
        toggleFavorite,
        toggleBlindfold, // Added back
        canGoBack: moveIndex > -1,
        canGoForward: moveIndex < solutionMoves.length - 1
    };
}
