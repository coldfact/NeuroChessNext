import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../services/database';
import { AdService } from '../services/AdService';
import { PieceSet, BoardTheme, BOARD_THEMES, NBACK_RANKS } from '../constants';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const NBACK_PIECES: PieceType[] = ['p', 'n', 'b', 'r', 'q', 'k'];

export interface NBackHistoryItem {
    piece: PieceType;
    square: number; // 0-8
}

export type MatchType = 'piece' | 'square' | 'both' | 'none';

export interface NBackConfig {
    n: number;
    duration: number; // minutes
    memorizeTime: number; // seconds
    matchBias: number; // percentage
    pieceSet: PieceSet;
    boardTheme: BoardTheme;
    ghostMode: boolean;
    isPremium: boolean;
}

const DEFAULT_CONFIG: NBackConfig = {
    n: 1,
    duration: 3,
    memorizeTime: 3,
    matchBias: 50,
    pieceSet: 'cburnett',
    boardTheme: BOARD_THEMES[0],
    ghostMode: false,
    isPremium: false
};

export interface NBackState {
    history: NBackHistoryItem[];
    currentRound: number;
    score: number;
    possibleScore: number;
    maxStreak: number;
    currentStreak: number;
    isPlaying: boolean;
    isPaused: boolean;
    gameOver: boolean;
    currentSign: NBackHistoryItem | null;
    timeLeft: number;
    feedback: 'correct' | 'wrong' | 'missed' | null;
    lastResult: {
        userSelection: MatchType | null;
        correctAnswer: MatchType | 'none';
        points: number;
    } | null;
    gameStartTime: number | null;
    hasSubmitted: boolean;
    currentSelection: MatchType | null;
    initialBests: { maxAccuracy: number; maxStreak: number } | null;
    activeGameStartTime: number | null;
    rankAchieved: string | null;
    showAd: boolean;
}

const DEFAULT_STATE: NBackState = {
    history: [],
    currentRound: -1,
    score: 0,
    possibleScore: 0,
    maxStreak: 0,
    currentStreak: 0,
    isPlaying: false,
    isPaused: false,
    gameOver: false,
    currentSign: null,
    timeLeft: 3,
    feedback: null,
    lastResult: null,
    gameStartTime: null,
    hasSubmitted: false,
    currentSelection: null,
    initialBests: null,
    activeGameStartTime: null,
    rankAchieved: null,
    showAd: false
};

export interface NBackGame {
    state: NBackState;
    config: NBackConfig;
    startGame: () => void;
    updateConfig: (newConfig: Partial<NBackConfig>) => void;
    resetData: (hardReset?: boolean) => void;
    upgradeToPremium: () => void;
    cancelGame: () => void;
    submitAnswer: (matchType: MatchType) => void;
    isVerified: boolean;
    ghostItem: NBackHistoryItem | null;
    initialBests: { maxAccuracy: number; maxStreak: number } | null;
    isGhostGame: boolean;
    rankAchieved: string | null;
    globalRank: number;
    closeAd: () => void;
}

const STORAGE_KEY = 'nback_settings';

export function useNBackGame(): NBackGame {
    const [state, setState] = useState<NBackState>(DEFAULT_STATE);
    const [config, setConfig] = useState<NBackConfig>(DEFAULT_CONFIG);
    const [isVerified, setIsVerified] = useState(false);
    const [globalRank, setGlobalRank] = useState(0);

    // Ghost Mode State
    const [ghostItem, setGhostItem] = useState<NBackHistoryItem | null>(null);
    const [hasUsedGhostMode, setHasUsedGhostMode] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const roundTimerRef = useRef<NodeJS.Timeout | null>(null);
    const stateRef = useRef(state);
    const configRef = useRef(config);
    const ghostTimerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => { stateRef.current = state; }, [state]);
    useEffect(() => { configRef.current = config; }, [config]);

    // Initial Load
    useEffect(() => {
        loadConfig();
    }, []);

    // Check verification whenever n changes or on load
    useEffect(() => {
        checkVerificationStatus();
    }, [config.n]);

    // Track Ghost Mode Usage
    useEffect(() => {
        if (config.ghostMode) {
            setHasUsedGhostMode(true);
        }
    }, [config.ghostMode]);

    // Auto-Start on Config Change (Level/Time)
    // We use a ref to track if this is the initial mount to prevent auto-start on load
    const isFirstMount = useRef(true);
    useEffect(() => {
        if (isFirstMount.current) {
            isFirstMount.current = false;
            return;
        }
        // If config changes (n or duration), we restart.
        // But we only want to auto-start if we were already on the screen? 
        // User said: "will BOTH take them back to the homescreen AND start the game"
        // If we are currently playing or even if stopped, this suggests immediate action.
        // However, 'loadConfig' sets config initially. 
        // We will trigger startGame() if the change comes from user interaction (updateConfig).
        // Since updateConfig updates state, we can handle it there, but here is reactive.
        // Let's handle it in updateConfig to be explicit about the source of change.
    }, [config.n, config.duration]);

    const checkVerificationStatus = async () => {
        const verified = await DatabaseService.checkRankVerified(config.n);
        setIsVerified(verified);
        const rank = await DatabaseService.getHighestRankVerified();
        setGlobalRank(rank);
    };

    const loadConfig = async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEY);
            const ownedDlc = await AsyncStorage.getItem('nback_premium_owned');

            let parsed = { ...DEFAULT_CONFIG };

            if (stored) {
                parsed = { ...parsed, ...JSON.parse(stored) };
            }

            // Force premium if owned key exists (Source of Truth)
            if (ownedDlc === 'true') {
                parsed.isPremium = true;
            }

            setConfig(parsed);

            // If starting with ghost mode, mark usage
            if (parsed.ghostMode) setHasUsedGhostMode(true);

        } catch (e) {
            console.error("Failed to load n-back config", e);
        }
    };


    // Defined early to be used in updateConfig
    const startGame = useCallback(async () => {
        // We'll rely on configRef for the latest config at start time
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
        if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);

        setGhostItem(null);
        setHasUsedGhostMode(configRef.current.ghostMode);

        const cfg = configRef.current;
        let bests = { maxAccuracy: 0, maxStreak: 0 };
        try {
            bests = await DatabaseService.getNBackBests(cfg.n, cfg.duration);
        } catch (e) {
            console.error("Error fetching bests:", e);
        }

        setState({
            ...DEFAULT_STATE,
            isPlaying: true,
            gameStartTime: Date.now(),
            timeLeft: configRef.current.memorizeTime,
            initialBests: bests,
            activeGameStartTime: null,
            rankAchieved: null,
            showAd: false
        });

        setTimeout(() => {
            nextRoundRef.current();
        }, 500);

    }, []);

    const saveConfig = async (newConfig: NBackConfig) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newConfig));
        } catch (e) {
            console.error("Failed to save n-back config", e);
        }
    };

    const updateConfig = useCallback((newConfig: Partial<NBackConfig>) => {
        setConfig(prev => {
            const merged = { ...prev, ...newConfig };
            saveConfig(merged);

            // Auto-Restart logic
            if (newConfig.n !== undefined || newConfig.duration !== undefined) {
                setTimeout(() => startGame(), 100);
            }

            return merged;
        });
    }, [startGame]);

    const upgradeToPremium = useCallback(async () => {
        // Source of Truth
        await AsyncStorage.setItem('nback_premium_owned', 'true');
        updateConfig({ isPremium: true });
    }, [updateConfig]);

    const resetData = useCallback(async (hardReset = false) => {
        try {
            const isPremium = await AsyncStorage.getItem('nback_premium_owned') === 'true';
            await AsyncStorage.removeItem(STORAGE_KEY);
            await AsyncStorage.removeItem('nback_high_scores');
            await DatabaseService.clearNBackData(); // Clear DB History

            if (hardReset) {
                await AsyncStorage.removeItem('nback_premium_owned');
                await AsyncStorage.removeItem('remove_ads_owned');
                await AsyncStorage.removeItem('ad_game_count');
                await AsyncStorage.removeItem('sequences_unlocked');
                await AsyncStorage.removeItem('dlc_puzzles_v1');
                await AsyncStorage.removeItem('suite_owned');
                await AsyncStorage.removeItem('sequences_config');
                await AsyncStorage.removeItem('dlc_deep_v1');
                await AsyncStorage.removeItem('deep_unlocked');
                await AsyncStorage.removeItem('deep_current_depth');
                await AsyncStorage.removeItem('deep_band');
                await AsyncStorage.removeItem('deep_move_time');
                await AsyncStorage.removeItem('deep_auto_advance');
                setConfig({ ...DEFAULT_CONFIG, isPremium: false });
                console.log('HARD RESET: All data and purchases cleared.');
            } else {
                // Preserve nback_premium_owned
                setConfig({ ...DEFAULT_CONFIG, isPremium });
                console.log('N-Back Data Reset (Premium Preserved)');
            }

            setIsVerified(false); // Reset Verification
            setGlobalRank(0);
        } catch (e) { console.error('Error resetting data', e); }
    }, []);

    // Game Logic - Generate Next Item
    const generateNextItem = useCallback((history: NBackHistoryItem[], n: number, bias: number): NBackHistoryItem => {
        if (history.length >= n && Math.random() * 100 < bias) {
            const comparison = history[history.length - n];
            const matchTypeRand = Math.random();
            if (matchTypeRand < 0.33) {
                let newSquare = Math.floor(Math.random() * 9);
                while (newSquare === comparison.square) newSquare = Math.floor(Math.random() * 9);
                return { piece: comparison.piece, square: newSquare };
            } else if (matchTypeRand < 0.66) {
                let newPieceIdx = Math.floor(Math.random() * NBACK_PIECES.length);
                while (NBACK_PIECES[newPieceIdx] === comparison.piece) newPieceIdx = Math.floor(Math.random() * NBACK_PIECES.length);
                return { piece: NBACK_PIECES[newPieceIdx], square: comparison.square };
            } else {
                return { piece: comparison.piece, square: comparison.square };
            }
        } else {
            return {
                piece: NBACK_PIECES[Math.floor(Math.random() * NBACK_PIECES.length)],
                square: Math.floor(Math.random() * 9)
            };
        }
    }, []);

    const nextRoundRef = useRef<() => void>(() => { });
    const evaluateRoundRef = useRef<() => void>(() => { });

    // Next Round
    nextRoundRef.current = () => {
        const s = stateRef.current;
        const cfg = configRef.current;

        if (!s.isPlaying && !s.gameOver) return;

        // Check Game Over Condition
        if (s.activeGameStartTime) {
            const elapsed = Date.now() - s.activeGameStartTime;
            const limit = cfg.duration * 60 * 1000;
            if (elapsed >= limit) {
                endGame();
                return;
            }
        }

        const nextItem = generateNextItem(s.history, cfg.n, cfg.matchBias);
        const newHistory = [...s.history, nextItem];
        const isCaching = newHistory.length <= cfg.n;
        const currentRound = isCaching ? -1 : (newHistory.length === cfg.n ? 0 : s.currentRound + 1);

        // Start Active Timer if caching just finished
        let newActiveStartTime = s.activeGameStartTime;
        if (!isCaching && !s.activeGameStartTime) {
            newActiveStartTime = Date.now();
        }

        // Ghost Mode Logic
        if (cfg.ghostMode && !isCaching) {
            // Calculate where the piece was N steps ago
            const comparisonIndex = newHistory.length - 1 - cfg.n;
            if (comparisonIndex >= 0) {
                const comparisonItem = newHistory[comparisonIndex];
                setGhostItem(comparisonItem);

                // Flicker for 750ms
                if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
                ghostTimerRef.current = setTimeout(() => {
                    setGhostItem(null);
                }, 750);
            }
        }

        setState(prev => ({
            ...prev,
            history: newHistory,
            currentRound: currentRound,
            currentSign: nextItem,
            timeLeft: cfg.memorizeTime,
            feedback: null,
            lastResult: null,
            hasSubmitted: false, // Unlock buttons
            currentSelection: null,
            activeGameStartTime: newActiveStartTime
        }));

        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

        timerRef.current = setInterval(() => {
            // Check Global Time Limit
            if (s.activeGameStartTime) {
                const elapsed = Date.now() - s.activeGameStartTime;
                const limit = cfg.duration * 60 * 1000;
                if (elapsed >= limit) {
                    endGame();
                    return;
                }
            }

            setState(prev => {
                if (prev.timeLeft <= 0.1) return prev;
                return { ...prev, timeLeft: Math.max(0, prev.timeLeft - 0.1) };
            });
        }, 100);

        roundTimerRef.current = setTimeout(() => {
            evaluateRoundRef.current();
        }, cfg.memorizeTime * 1000);
    };

    // Evaluate Round
    evaluateRoundRef.current = () => {
        const s = stateRef.current;
        const cfg = configRef.current;

        // Timer cleared in nextRoundRef or here if we were manually calling (which we aren't now)
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

        const currentIndex = s.history.length - 1;
        const compareIndex = currentIndex - cfg.n;

        if (compareIndex < 0) {
            nextRoundRef.current();
            return;
        }

        const currentItem = s.history[currentIndex];
        const compareItem = s.history[compareIndex];
        const pieceMatch = currentItem.piece === compareItem.piece;
        const squareMatch = currentItem.square === compareItem.square;

        let correctAnswer: MatchType | 'none' = 'none';
        if (pieceMatch && squareMatch) correctAnswer = 'both';
        else if (pieceMatch) correctAnswer = 'piece';
        else if (squareMatch) correctAnswer = 'square';
        else correctAnswer = 'none';

        const userSelection = s.currentSelection; // Read from state

        let isCorrect = false;
        let points = 0;
        let maxPoints = (correctAnswer === 'both') ? 2 : 1;

        if (userSelection === correctAnswer) {
            isCorrect = true;
            points = maxPoints;
        } else if (correctAnswer === 'none' && userSelection === null) {
            isCorrect = true;
            points = 1;
        } else if (correctAnswer === 'both' && (userSelection === 'piece' || userSelection === 'square')) {
            isCorrect = true; // Partial credit
            points = 1;
        }

        // Feedback Logic
        // Green: Max points achieved
        // Orange: Partial points OR 1 point available but missed
        // Red: 2 points available and 0 earned

        let feedback: 'correct' | 'wrong' | 'missed' = 'wrong';
        if (points === maxPoints) {
            feedback = 'correct';
        } else if (maxPoints === 2 && points === 0) {
            feedback = 'wrong'; // Red
        } else {
            feedback = 'missed'; // Orange (1/2 pts OR 0/1 pts)
            // Note: User said "1 point available and they do not get it - orange"
            // Also "2 points available and they get only 1 - orange"
            // This covers both non-max, non-double-miss scenarios.
            // Wait, "Missed" usually implies inaction, "Wrong" implies incorrect action.
            // User mapped "Orange" to both cases. 
            // My 'missed' type maps to Orange in UI. My 'wrong' maps to Red.
            // So this logic holds.
        }

        const newCurrentStreak = isCorrect ? s.currentStreak + 1 : 0;
        const newMaxStreak = Math.max(s.maxStreak, newCurrentStreak);

        setState(prev => ({
            ...prev,
            score: prev.score + points,
            possibleScore: prev.possibleScore + maxPoints,
            currentStreak: newCurrentStreak,
            maxStreak: newMaxStreak,
            feedback: feedback,
            timeLeft: 0, // Force clear bar
            lastResult: {
                userSelection,
                correctAnswer,
                points
            },
            hasSubmitted: true // Lock if not already
        }));

        setTimeout(() => {
            nextRoundRef.current();
        }, 500);
    };

    const endGame = useCallback(async () => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
        if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
        setGhostItem(null);

        const s = stateRef.current;
        const c = configRef.current;
        const usedGhost = hasUsedGhostMode || c.ghostMode; // Ensure current config is captured

        setState(prev => ({ ...prev, isPlaying: false, gameOver: true, timeLeft: 0 }));

        // Save to Database
        const percentage = s.possibleScore > 0 ? (s.score / s.possibleScore) * 100 : 0;
        const rounds = s.currentRound;

        await DatabaseService.insertNBackGame({
            level: c.n,
            game_time: c.duration,
            move_time: c.memorizeTime,
            bias: c.matchBias,
            rounds: rounds,
            max_streak: s.maxStreak,
            score: s.score,
            possible_score: s.possibleScore,
            percentage: parseFloat(percentage.toFixed(2)),
            ghost: usedGhost
        });

        // Re-check verification
        const prevVerified = isVerified;
        await checkVerificationStatus();

        // Check if we passed the verification criteria for THIS level
        const currentLevelVerified = await DatabaseService.checkRankVerified(c.n);

        // If verified, check if it improves our global rank
        if (currentLevelVerified) {
            const currentHighest = await DatabaseService.getHighestRankVerified();

            // If we beat a level higher than our current highest rank
            if (c.n > currentHighest) {
                await DatabaseService.updateHighestRank(c.n);
                setGlobalRank(c.n);
                setState(prev => ({ ...prev, rankAchieved: NBACK_RANKS[c.n] }));
            }
        }

        // Ad Logic
        const shouldShowAd = await AdService.incrementGameCount();
        if (shouldShowAd) {
            setState(prev => ({ ...prev, showAd: true }));
        }

    }, [hasUsedGhostMode, isVerified, globalRank]); // Add dependency for cleanup logic safety if used

    const exitGame = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);
        if (ghostTimerRef.current) clearTimeout(ghostTimerRef.current);
        setGhostItem(null);

        // Reset to initial state
        setState(DEFAULT_STATE);
        console.log("Game Exited/Cancelled");
    }, []);

    const submitAnswer = useCallback((selection: MatchType) => {
        if (!stateRef.current.isPlaying || stateRef.current.isPaused) return;
        if (stateRef.current.hasSubmitted) return; // Locked

        // Just record selection and lock UI. Wait for timer.
        setState(prev => ({
            ...prev,
            hasSubmitted: true,
            currentSelection: selection
        }));
    }, []);

    const closeAd = useCallback(() => setState(prev => ({ ...prev, showAd: false })), []);

    return {
        state,
        config,
        updateConfig,
        resetData,
        upgradeToPremium,
        startGame,
        cancelGame: exitGame, // New Cancel = Exit (No Save)
        submitAnswer,
        isVerified,
        ghostItem, // Expose ghostItem instead of ghostSquare
        initialBests: state.initialBests,
        isGhostGame: hasUsedGhostMode || config.ghostMode,
        rankAchieved: state.rankAchieved,
        globalRank,
        closeAd
    };
}
