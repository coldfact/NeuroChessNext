import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Chess, Move } from 'chess.js';
import { DatabaseService, soundService } from '../services';
import { updateRating, Rating, INITIAL_RATING } from '../engine/glicko';

let isLoadingGlobal = false;

interface GameState {
    puzzleId: string;
    puzzleRating: number;
    userRating: number;
    stats: { deep?: Rating };
    fen: string;
    orientation: 'white' | 'black';
    status: { message: string; color: string };
    highlights: { from?: string; to?: string };
    isLoading: boolean;
    statsLoaded: boolean;
    ratingApplied?: boolean;
    isFavorite?: boolean;
    phase: 'visualizing' | 'input' | 'feedback';
    arrows: Array<{ from: string, to: string, color?: string }>;
    deepInput: boolean;
    sanMoves: string[];
    visualizationIndex: number;
}

export function useDeepGame(initialDepth: number, band: string, autoAdvance: boolean) {
    const [game] = useState(() => new Chess());
    const [logicGame] = useState(() => new Chess()); // Used for visualization logic

    const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
    const [moveIndex, setMoveIndex] = useState(-1); // -1 = Start Position.
    // In Deep Mode, moveIndex tracks the VISUAL BOARD state after the puzzle is solved.
    // Before solve, board is static at StartFEN.

    const [state, setState] = useState<GameState>({
        puzzleId: 'Loading...',
        puzzleRating: 0,
        userRating: 1200,
        stats: {},
        fen: game.fen(),
        orientation: 'white',
        status: { message: 'Loading puzzle...', color: '#888' },
        highlights: {},
        isLoading: true,
        statsLoaded: false,
        ratingApplied: false,
        isFavorite: false,
        phase: 'visualizing',
        arrows: [],
        deepInput: false,
        sanMoves: [],
        visualizationIndex: -1
    });

    const userRatingRef = useRef(1200);
    const depthRef = useRef(initialDepth);
    const isMounted = useRef(true);
    const visualizationTimeout = useRef<NodeJS.Timeout | null>(null);
    const arrowColorRef = useRef('#ff0000'); // Default Red

    // Deep Specific State
    const [moveTime, setMoveTime] = useState(3);
    const [showMoves, setShowMoves] = useState(true);

    // Sync ref
    useEffect(() => {
        depthRef.current = initialDepth;
    }, [initialDepth]);

    useEffect(() => {
        return () => {
            isMounted.current = false;
            if (visualizationTimeout.current) clearTimeout(visualizationTimeout.current);
        };
    }, []);

    // Load Stats
    useEffect(() => {
        const loadStats = async () => {
            const deepStats = await DatabaseService.getPlayerStats('deep');

            if (!isMounted.current) return;

            setState(prev => {
                const initialRating = deepStats ? Math.round(deepStats.rating) : 1200;
                userRatingRef.current = initialRating;
                return {
                    ...prev,
                    userRating: initialRating,
                    stats: { deep: deepStats || undefined },
                    statsLoaded: true
                };
            });

            if (!deepStats) await DatabaseService.updatePlayerStats('deep', 1200, 350, 0.06);
        };
        loadStats();
    }, []);

    // Auto-Start
    useEffect(() => {
        if (state.statsLoaded) {
            loadPuzzle();
        }
    }, [state.statsLoaded, initialDepth, band]);

    const setArrowColor = useCallback((color: string) => {
        arrowColorRef.current = color;
    }, []);

    const startVisualization = useCallback((moves: string[], startFen: string, currentMoveTime: number) => {
        try {
            logicGame.load(startFen);
        } catch (e) { console.error("Invalid FEN", e); return; }

        if (visualizationTimeout.current) clearTimeout(visualizationTimeout.current);

        let moveIdx = 0;
        const lastVisualizedIndex = moves.length - 2;

        if (moves.length === 0) {
            setState(prev => ({
                ...prev,
                phase: 'input',
                deepInput: true,
                status: { message: 'What is the move?', color: '#fff' },
                arrows: []
            }));
            return;
        }

        const step = () => {
            if (!isMounted.current) return;

            // CAPTURE VALUE to avoid closure trap with setState
            const currentIdx = moveIdx;

            if (currentIdx > lastVisualizedIndex) {
                // Done visualizing
                setState(prev => ({
                    ...prev,
                    phase: 'input',
                    deepInput: true,
                    status: { message: 'What is the NEXT move?', color: '#fff' },
                    arrows: []
                }));
                return;
            }

            const moveStr = moves[currentIdx];
            const from = moveStr.slice(0, 2);
            const to = moveStr.slice(2, 4);

            // Show Arrow with User Preference
            setState(prev => ({
                ...prev,
                phase: 'visualizing',
                deepInput: false,
                status: { message: `Watch move ${currentIdx + 1}/${moves.length}`, color: '#aaa' },
                arrows: [{ from, to, color: arrowColorRef.current }], // Dynamic Color
                visualizationIndex: currentIdx // Update Grid
            }));

            soundService.playMoveSound(false);

            moveIdx++;
            visualizationTimeout.current = setTimeout(step, currentMoveTime * 1000);
        };

        step();

    }, [logicGame]);

    const loadPuzzle = useCallback(async () => {
        if (isLoadingGlobal) return;
        isLoadingGlobal = true;

        if (visualizationTimeout.current) clearTimeout(visualizationTimeout.current);

        setMoveIndex(-1); // Reset Move Index

        setState(prev => ({
            ...prev,
            isLoading: true,
            status: { message: 'Loading...', color: '#888' },
            arrows: [],
            deepInput: false,
            phase: 'visualizing',
            sanMoves: [],
            visualizationIndex: -1
        }));

        try {
            const userRating = userRatingRef.current || 1200;
            const currentDepth = depthRef.current;

            const puzzle = await DatabaseService.getDeepPuzzle(userRating, band, currentDepth);

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

                // Determine Orientation based on who plays the LAST move (User's move)
                // If moves.length is Odd, User plays same side as Start FEN.
                // If moves.length is Even, User plays opposite side.
                // puzzle.FEN is Start Position. 
                // game.turn() gives FEN turn.
                const startTurn = game.turn(); // 'w' or 'b'
                const moves = puzzle.Moves;
                const totalPly = moves.length;
                const isStartSideMove = (totalPly % 2 !== 0);
                const userSide = isStartSideMove ? startTurn : (startTurn === 'w' ? 'b' : 'w');
                const newOrientation = userSide === 'w' ? 'white' : 'black';

                // Calculate SAN Moves
                const calculatedSanMoves: string[] = [];
                const tempGame = new Chess(puzzle.FEN);
                try {
                    for (const m of moves) {
                        const from = m.slice(0, 2);
                        const to = m.slice(2, 4);
                        const promotion = m.length > 4 ? m[4] : undefined;
                        const result = tempGame.move({ from, to, promotion: promotion as any || 'q' });
                        if (result) calculatedSanMoves.push(result.san);
                        else calculatedSanMoves.push(m); // Fallback
                    }
                } catch (e) { console.warn("SAN Calc Error", e); }

                setSolutionMoves(moves);

                setState(prev => ({
                    ...prev,
                    puzzleId: puzzle.PuzzleId,
                    fen: puzzle.FEN,
                    puzzleRating: puzzle.Rating,
                    orientation: newOrientation,
                    status: { message: 'Memorize...', color: '#fff' },
                    highlights: {},
                    isLoading: false,
                    ratingApplied: false,
                    isFavorite: isFav,
                    arrows: [],
                    phase: 'visualizing',
                    deepInput: false,
                    sanMoves: calculatedSanMoves,
                    visualizationIndex: -1
                }));

                setTimeout(() => {
                    startVisualization(moves, puzzle.FEN, moveTime);
                }, 1000);
            }
        } catch (e) {
            console.error("Load Puzzle Error", e);
            setState(prev => ({ ...prev, isLoading: false, status: { message: 'Error', color: 'red' } }));
        } finally {
            isLoadingGlobal = false;
        }
    }, [game, band, moveTime, startVisualization]);

    const nextPuzzle = useCallback(() => loadPuzzle(), [loadPuzzle]);

    const applyFinalState = useCallback((moves: string[], solved: boolean) => {
        // Replay all moves on GAME instance to show final state
        try {
            // Reset game to start FEN (already loaded but safe to ensure)
            // game.load(state.fen?? No, state.fen matches game.fen so just use current game)
            // Actually, game is currently at StartFEN.

            // Loop through ALL solution moves
            for (const moveStr of moves) {
                const form = moveStr.slice(0, 2);
                const to = moveStr.slice(2, 4);
                const promotion = moveStr.length > 4 ? moveStr[4] : undefined;
                game.move({ from: form, to, promotion: promotion as any || 'q' });
            }

            const finalFen = game.fen();
            const finalIndex = moves.length - 1;
            setMoveIndex(finalIndex); // Moves tracks 0-indexed moves. length-1 is the last index.

            setState(prev => ({
                ...prev,
                fen: finalFen,
                phase: 'feedback', // Keep feedback phase
                deepInput: false,
                visualizationIndex: finalIndex // Show all moves on solve
                // Status/Arrows handled by caller
            }));

        } catch (e) { console.error("Apply Final State Error", e); }
    }, [game]);

    const handleMove = useCallback((from: string, to: string) => {
        if (state.phase !== 'input') return;

        const targetMoveStr = solutionMoves[solutionMoves.length - 1];
        if (!targetMoveStr) return;

        const targetFrom = targetMoveStr.slice(0, 2);
        const targetTo = targetMoveStr.slice(2, 4);

        const isCorrect = (from === targetFrom && to === targetTo);

        if (isCorrect) {
            // Apply History & State Update
            applyFinalState(solutionMoves, true);

            setState(prev => ({
                ...prev,
                arrows: [{ from, to, color: '#2ecc71' }], // Green
                status: { message: 'Solved!', color: '#2ecc71' }
            }));
            soundService.playMoveSound(true);

            if (!state.ratingApplied) {
                let currentStats = state.stats.deep || { ...INITIAL_RATING };
                const newStats = updateRating(currentStats, state.puzzleRating, true);
                DatabaseService.updatePlayerStats('deep', newStats.rating, newStats.rd, newStats.vol);
                DatabaseService.recordResult(state.puzzleId, true, newStats.rating, 'deep');

                setState(prev => ({
                    ...prev,
                    userRating: Math.round(newStats.rating),
                    ratingApplied: true,
                    stats: { deep: newStats }
                }));

                if (autoAdvance) setTimeout(() => nextPuzzle(), 3000); // 3s delay to view
            }
        } else {
            // Wrong -> Orange
            setState(prev => ({
                ...prev,
                arrows: [{ from, to, color: '#f39c12' }], // Orange
                status: { message: 'Wrong!', color: '#f39c12' }
            }));
            soundService.playError();

            if (!state.ratingApplied) {
                let currentStats = state.stats.deep || { ...INITIAL_RATING };
                const newStats = updateRating(currentStats, state.puzzleRating, false);
                DatabaseService.updatePlayerStats('deep', newStats.rating, newStats.rd, newStats.vol);
                DatabaseService.recordResult(state.puzzleId, false, newStats.rating, 'deep');

                setState(prev => ({
                    ...prev,
                    userRating: Math.round(newStats.rating),
                    ratingApplied: true,
                    stats: { deep: newStats }
                }));
            }

            setTimeout(() => {
                if (!isMounted.current) return;
                setState(prev => ({ ...prev, arrows: [] }));
            }, 1000);
        }

    }, [state.phase, state.ratingApplied, state.stats, state.puzzleRating, state.puzzleId, solutionMoves, autoAdvance, nextPuzzle, applyFinalState]);

    const giveUp = useCallback(async () => {
        if (solutionMoves.length === 0) return;

        applyFinalState(solutionMoves, false);

        const targetMoveStr = solutionMoves[solutionMoves.length - 1];
        const targetFrom = targetMoveStr.slice(0, 2);
        const targetTo = targetMoveStr.slice(2, 4);

        setState(prev => ({
            ...prev,
            arrows: [{ from: targetFrom, to: targetTo, color: '#f39c12' }], // Orange for Give Up
            status: { message: 'Solution Revealed', color: '#f39c12' }
        }));
        soundService.playMoveSound(false);
    }, [solutionMoves, applyFinalState]);

    const navigateHistory = useCallback((direction: 'back' | 'forward') => {
        // Only active if phase is 'feedback' (Solved/GiveUp)
        if (state.phase !== 'feedback') return;

        if (direction === 'back') {
            if (moveIndex >= -1) {
                // To go back, we undo the move at moveIndex
                // Wait, moveIndex points to the LAST played move.
                // -1 = Start.
                // 0 = Move 0 played.
                if (moveIndex === -1) return; // Can't go back further

                game.undo();
                setMoveIndex(prev => prev - 1);
                setState(prev => ({ ...prev, fen: game.fen(), arrows: [] })); // Clear arrows on nav
                soundService.playMoveSound(false);
            }
        } else {
            // Forward
            const nextIdx = moveIndex + 1;
            if (nextIdx < solutionMoves.length) {
                const moveStr = solutionMoves[nextIdx];
                const from = moveStr.slice(0, 2);
                const to = moveStr.slice(2, 4);
                const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

                game.move({ from, to, promotion: promotion as any || 'q' });
                setMoveIndex(nextIdx);
                setState(prev => ({ ...prev, fen: game.fen(), arrows: [] }));
                soundService.playMoveSound(false);
            }
        }
    }, [game, moveIndex, solutionMoves, state.phase]);

    const resetGameData = useCallback(async () => {
        await DatabaseService.resetAllStats('deep');
        setState(prev => ({
            ...prev,
            userRating: 1200,
            stats: { deep: { rating: 1200, rd: 350, vol: 0.06 } },
            status: { message: 'Data Reset', color: '#2ecc71' }
        }));
        setTimeout(() => loadPuzzle(), 100);
    }, [loadPuzzle]);

    const toggleFavorite = useCallback(async () => {
        if (!state.puzzleId) return;
        const newStatus = await DatabaseService.toggleFavorite(state.puzzleId, 'deep');
        setState(prev => ({ ...prev, isFavorite: newStatus }));
    }, [state.puzzleId]);

    return {
        ...state,
        moveTime, setMoveTime,
        showMoves, setShowMoves,
        handleMove,
        nextPuzzle,
        giveUp,
        navigateHistory,
        resetGameData,
        toggleFavorite,
        canGoBack: moveIndex > -1, // -1 is Start
        canGoForward: moveIndex < solutionMoves.length - 1,
        setArrowColor,
    };
}
