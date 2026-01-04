import { useState, useCallback, useRef, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DatabaseService } from '../services/database';
import { BOARD_THEMES, BoardTheme, PieceSet, NBACK_RANKS } from '../constants';
import { NBACK_PIECES, PieceType } from './useNBackGame';
import { Audio } from 'expo-av';
import { AdService } from '../services/AdService';

export type GamePhase = 'IDLE' | 'PREVIEW' | 'SETTLE' | 'WATCH' | 'INPUT' | 'FEEDBACK' | 'GAME_OVER';

export interface SequenceItem {
    piece: PieceType;
    square: number;
    isTarget: boolean; // True if it's the piece we are tracking
}

export interface SequencesConfig {
    startLength: number;
    speed: number; // ms per item
    pieceSet: PieceSet;
    boardTheme: BoardTheme;
    gameTime: number; // minutes
    confounders: boolean;
    confounderBias: number; // % chance
}

const DEFAULT_CONFIG: SequencesConfig = {
    startLength: 2,
    speed: 800,
    pieceSet: 'cburnett',
    boardTheme: BOARD_THEMES[0],
    gameTime: 3, // Default 3 mins
    confounders: false, // Default Off
    confounderBias: 25
};

export function useSequencesGame() {
    const [config, setConfig] = useState(DEFAULT_CONFIG);

    // Game State
    const [phase, setPhase] = useState<GamePhase>('IDLE');
    const [level, setLevel] = useState(1);
    const [sequenceLength, setSequenceLength] = useState(DEFAULT_CONFIG.startLength);
    const [score, setScore] = useState(0);
    const [maxScore, setMaxScore] = useState(0); // "Possible Score"
    const [streak, setStreak] = useState(0);
    const [multiplier, setMultiplier] = useState(1);
    const [globalRank, setGlobalRank] = useState(0);
    const [isVerified, setIsVerified] = useState(false);
    const [rankAchieved, setRankAchieved] = useState<string | null>(null);
    const [showAd, setShowAd] = useState(false);

    // Ref to track phase for async interruptions
    const phaseRef = useRef(phase);
    useEffect(() => { phaseRef.current = phase; }, [phase]);

    // Stats Tracking
    const [maxStreak, setMaxStreak] = useState(0);
    const [maxMultiplier, setMaxMultiplier] = useState(1);
    const [roundsCompleted, setRoundsCompleted] = useState(0);

    // Playback State
    const [fullDisplaySequence, setFullDisplaySequence] = useState<SequenceItem[]>([]);
    const [correctInputSequence, setCorrectInputSequence] = useState<number[]>([]);
    const [initialBests, setInitialBests] = useState({ maxScore: 0, maxStreak: 0 });

    const [targetPiece, setTargetPiece] = useState<PieceType>('p');
    const [visibleItem, setVisibleItem] = useState<SequenceItem | null>(null);
    const [activeSquare, setActiveSquare] = useState<number | null>(null);

    // Input State
    const [inputIndex, setInputIndex] = useState(0);
    const [lastInputSquare, setLastInputSquare] = useState<number | null>(null);
    const [feedbackColor, setFeedbackColor] = useState<string | null>(null);
    const [roundFeedback, setRoundFeedback] = useState<'correct' | 'wrong' | null>(null);
    const [timeLeftForMove, setTimeLeftForMove] = useState(4000); // 4 seconds per move

    // Timer State
    const [activeGameStartTime, setActiveGameStartTime] = useState<number | null>(null);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const roundTimerRef = useRef<NodeJS.Timeout | null>(null);

    // Check verification on load and config change
    useEffect(() => {
        checkVerificationStatus();
    }, [config.startLength]);

    const checkVerificationStatus = async () => {
        const verified = await DatabaseService.checkSequencesRankVerified(config.startLength);
        setIsVerified(verified);
        const rank = await DatabaseService.getSequencesHighestRank();
        setGlobalRank(rank);
    };

    const generateRoundData = (length: number) => {
        const target: PieceType = NBACK_PIECES[Math.floor(Math.random() * NBACK_PIECES.length)];

        const seq: SequenceItem[] = [];
        const correctIndices: number[] = [];
        const confounderChance = config.confounders ? 0.3 : 0;

        let hasTarget = false;

        for (let i = 0; i < length; i++) {
            const square = Math.floor(Math.random() * 9);
            const forceTarget = (i === length - 1 && !hasTarget);
            const isConfounder = !forceTarget && Math.random() < confounderChance;

            if (isConfounder) {
                let confounderPiece = target;
                while (confounderPiece === target) {
                    confounderPiece = NBACK_PIECES[Math.floor(Math.random() * NBACK_PIECES.length)];
                }
                seq.push({ piece: confounderPiece, square, isTarget: false });
            } else {
                seq.push({ piece: target, square, isTarget: true });
                correctIndices.push(square);
                hasTarget = true;
            }
        }
        return { seq, correctIndices, target };
    };

    // Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const saved = await AsyncStorage.getItem('sequences_config');
                if (saved) {
                    const parsed = JSON.parse(saved);
                    setConfig(prev => ({
                        ...prev,
                        ...parsed,
                        // Ensure defaults if missing
                        startLength: parsed.startLength || DEFAULT_CONFIG.startLength,
                        gameTime: parsed.gameTime || DEFAULT_CONFIG.gameTime,
                        confounders: parsed.confounders ?? DEFAULT_CONFIG.confounders
                    }));
                }
            } catch (e) {
                console.error("Failed to load settings", e);
            }
        };
        loadSettings();
    }, []);

    // Save settings on change
    useEffect(() => {
        const saveSettings = async () => {
            try {
                const toSave = {
                    startLength: config.startLength,
                    gameTime: config.gameTime,
                    confounders: config.confounders,
                    // persist other fields if needed, like pieceSet/theme?
                    pieceSet: config.pieceSet,
                    boardTheme: config.boardTheme,
                    speed: config.speed
                };
                await AsyncStorage.setItem('sequences_config', JSON.stringify(toSave));
            } catch (e) {
                console.error("Failed to save settings", e);
            }
        };
        // Debounce or just save?
        saveSettings();
    }, [config.startLength, config.gameTime, config.confounders, config.pieceSet, config.boardTheme, config.speed]);

    const startGame = useCallback(() => {
        setPhase('IDLE');
        setLevel(1);
        setSequenceLength(config.startLength);
        setStreak(0);
        setMultiplier(1);
        setScore(0);
        setMaxScore(0);

        // Reset stats
        setMaxStreak(0);
        setMaxMultiplier(1);
        setRoundsCompleted(0);
        setRankAchieved(null);

        setActiveGameStartTime(Date.now());

        // Fetch bests for this config
        DatabaseService.getSequencesBests(config.startLength, config.gameTime, config.confounders)
            .then(bests => setInitialBests(bests));

        startRound(config.startLength);
    }, [config.startLength, config.confounders, config.gameTime]);

    // Timer Logic
    useEffect(() => {
        if (phase === 'IDLE' || phase === 'GAME_OVER') {
            return;
        }

        const interval = setInterval(() => {
            if (!activeGameStartTime) return;
            const elapsed = Date.now() - activeGameStartTime;
            const limit = config.gameTime * 60 * 1000;
            if (elapsed >= limit) {
                endGame();
            }
        }, 500);

        return () => clearInterval(interval);
    }, [phase, activeGameStartTime, config.gameTime]);

    const startRound = async (length: number) => {
        const { seq, correctIndices, target } = generateRoundData(length);

        setFullDisplaySequence(seq);
        setCorrectInputSequence(correctIndices);
        setTargetPiece(target);
        setRoundFeedback(null);
        setInputIndex(0);
        setFeedbackColor(null);
        setLastInputSquare(null);

        // PHASE 1: PREVIEW
        setPhase('PREVIEW');
        await wait(2000);
        if (phaseRef.current !== 'PREVIEW') return;

        // PHASE 2: SETTLE
        setPhase('SETTLE');
        await wait(1000);
        if ((phaseRef.current as GamePhase) !== 'SETTLE') return;

        // PHASE 3: PLAYBACK
        playSequence(seq);
    };

    const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

    const playSequence = async (seq: SequenceItem[]) => {
        setPhase('WATCH');
        setVisibleItem(null);
        setActiveSquare(null);

        await wait(500);

        for (const item of seq) {
            if (phaseRef.current !== 'WATCH') break;

            setVisibleItem(item);
            setActiveSquare(item.square);
            await wait(config.speed);

            if (phaseRef.current !== 'WATCH') break;

            setVisibleItem(null);
            setActiveSquare(null);
            await wait(200);
        }

        if (phaseRef.current === 'WATCH') {
            setPhase('INPUT');
            setTimeLeftForMove(4000);
        } else {
            // Interrupted
            setVisibleItem(null);
            setActiveSquare(null);
        }
    };

    // Move Timer Logic
    useEffect(() => {
        if (phase !== 'INPUT') return;

        const interval = setInterval(() => {
            setTimeLeftForMove(prev => {
                if (prev <= 0) {
                    clearInterval(interval);
                    // Timeout is a fail
                    return 0;
                }
                return prev - 100;
            });
        }, 100);
        return () => clearInterval(interval);
    }, [phase]);

    // Separate effect to handle timeout trigger to avoid dependency cycle in the interval
    useEffect(() => {
        if (phase === 'INPUT' && timeLeftForMove <= 0) {
            handleRoundEnd(false);
        }
    }, [timeLeftForMove, phase]);

    const handleInput = useCallback((squareIndex: number) => {
        if (phase !== 'INPUT') return;

        // Reset move timer on any input interaction
        setTimeLeftForMove(4000);

        const expectedSquare = correctInputSequence[inputIndex];
        const isCorrect = squareIndex === expectedSquare;

        setActiveSquare(squareIndex);

        if (isCorrect) {
            setFeedbackColor('#2ecc71');
            setLastInputSquare(squareIndex);

            const nextIndex = inputIndex + 1;
            setInputIndex(nextIndex);

            setTimeout(() => {
                setActiveSquare(null);
                setFeedbackColor(null);
            }, 200);

            if (nextIndex >= correctInputSequence.length) {
                handleRoundEnd(true);
            }

        } else {
            setFeedbackColor('#e74c3c');
            setLastInputSquare(squareIndex);
            handleRoundEnd(false);
        }
    }, [phase, correctInputSequence, inputIndex]);

    const handleRoundEnd = (success: boolean) => {
        setPhase('FEEDBACK');
        setRoundFeedback(success ? 'correct' : 'wrong');

        if (success) {
            // Update Streak & Multiplier
            const newStreak = streak + 1;
            setStreak(newStreak);
            if (newStreak > maxStreak) setMaxStreak(newStreak);

            let newMult = 1;
            if (newStreak >= 6) newMult = 3;
            else if (newStreak >= 3) newMult = 2;
            setMultiplier(newMult);
            if (newMult > maxMultiplier) setMaxMultiplier(newMult);

            // Score
            const points = 1 * newMult;
            setScore(s => s + points);
            setMaxScore(m => m + points); // You earned what was possible

            setRoundsCompleted(r => r + 1);

            // Level Up - BLOCKED per User Request
            // Just repeat checking strict length
            const sameLength = sequenceLength;

            roundTimerRef.current = setTimeout(() => {
                startRound(sameLength);
            }, 1000);

        } else {
            // Failure
            // Add skipped points to maxScore? 
            // "Possible Score": increases by multiplier EACH ROUND.
            // If you fail, you missed out on `1 * currentMultiplier` (or pre-fail multiplier?).
            // Let's add the potential points to maxScore even if failed, to show what you missed.
            const potential = 1 * multiplier;
            setMaxScore(m => m + potential);

            setStreak(0);
            setMultiplier(1);

            setMultiplier(1);

            roundTimerRef.current = setTimeout(() => {
                startRound(sequenceLength); // Retry / Continue
            }, 1000);
        }
    };

    const endGame = async () => {
        setPhase('GAME_OVER');
        setTimeLeftForMove(0);
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

        // Save Game Result logic moved here from stopGame
        if (score > 0 || roundsCompleted > 0) {
            const accuracy = roundsCompleted > 0 ? (score / Math.max(1, maxScore)) : 0;

            await DatabaseService.insertSequencesGame({
                score,
                max_score: maxScore,
                level: sequenceLength,
                game_time: config.gameTime,
                speed: config.speed,
                rounds_completed: roundsCompleted,
                max_streak: maxStreak,
                max_multiplier: maxMultiplier,
                accuracy: accuracy,
                confounders: config.confounders
            });

            // Check Rank
            await checkVerificationStatus();
            const currentLevelVerified = await DatabaseService.checkSequencesRankVerified(config.startLength);

            if (currentLevelVerified) {
                const currentHighest = await DatabaseService.getSequencesHighestRank();
                if (config.startLength > currentHighest) {
                    await DatabaseService.updateSequencesHighestRank(config.startLength);
                    setGlobalRank(config.startLength);
                    const rankTitle = NBACK_RANKS[config.startLength];
                    setRankAchieved(rankTitle ? rankTitle.toUpperCase() : `LEVEL ${config.startLength}`);
                }
            }
        }

        // Ad Logic
        const shouldShowAd = await AdService.incrementGameCount();
        if (shouldShowAd) {
            setShowAd(true);
        }
    };

    const stopGame = async () => {
        setPhase('IDLE');
        if (timerRef.current) clearInterval(timerRef.current);
        if (roundTimerRef.current) clearTimeout(roundTimerRef.current);

        // Clear State
        setVisibleItem(null);
        setActiveSquare(null);
        setFeedbackColor(null);
        setRoundFeedback(null);
        setTimeLeftForMove(0);
        setScore(0);
        setStreak(0);
        setMultiplier(1);
    };

    const setStartLength = (startLength: number) => setConfig(c => ({ ...c, startLength }));
    const setGameTime = (gameTime: number) => setConfig(c => ({ ...c, gameTime }));
    const setSpeed = (speed: number) => setConfig(c => ({ ...c, speed }));
    const setPieceSet = (pieceSet: PieceSet) => setConfig(c => ({ ...c, pieceSet }));
    const setBoardTheme = (boardTheme: BoardTheme) => setConfig(c => ({ ...c, boardTheme }));
    const toggleConfounders = () => setConfig(c => ({ ...c, confounders: !c.confounders }));
    // Confounder Bias not implemented in config yet? User asked for it previously. 
    // Checking DEFAULT_CONFIG: it's missing `confounderBias`. 
    // Adding it back as per previous context (set to 25 default).
    const setConfounderBias = (confounderBias: number) => setConfig(c => ({ ...c, confounderBias }));

    const resetData = async () => {
        await DatabaseService.clearSequencesData();
        setGlobalRank(0);
        setIsVerified(false);
        setRankAchieved(null);
        setInitialBests({ maxScore: 0, maxStreak: 0 });
    };

    const closeAd = () => setShowAd(false);

    return {
        state: {
            phase,
            level,
            score,
            maxScore,
            streak,
            multiplier,
            targetPiece,
            visibleItem,
            activeSquare,
            feedbackColor,
            lastInputSquare,
            roundFeedback,
            activeGameStartTime,
            globalRank,
            isVerified,
            rankAchieved,
            showAd,
            maxStreak,
            roundsCompleted,
            timeLeftForMove, // Expose timer state
            initialBests
        },
        config,
        actions: {
            startGame,
            stopGame,
            handleInput,
            setConfig,
            setStartLength,
            setGameTime,
            setSpeed,
            setPieceSet,
            setBoardTheme,
            toggleConfounders,
            setConfounderBias,
            resetData,
            closeAd
        }
    };
}
