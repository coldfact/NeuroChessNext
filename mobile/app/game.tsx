import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Pressable, Linking } from 'react-native';
import { ExternalLink, Heart, ShoppingBag } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Board from '../src/components/Board';
import Controls from '../src/components/Controls';
import BottomToolbar from '../src/components/BottomToolbar';
import SettingsModal from '../src/components/SettingsModal';
import BandSelectorModal from '../src/components/BandSelectorModal';
import { useChessGame } from '../src/hooks/useChessGame';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../src/constants';
import ThemeSelectorModal, { Theme } from '../src/components/ThemeSelectorModal';
import { Target } from 'lucide-react-native';

export default function GameScreen() {
    const router = useRouter();
    const [band, setBand] = useState('All');
    const [theme, setTheme] = useState('all');
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [settingsLoaded, setSettingsLoaded] = useState(false); // Defer puzzle load until settings ready
    const game = useChessGame(band, theme, autoAdvance);

    const [pieceSet, setPieceSet] = useState<PieceSet>('cburnett');
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);
    // const [blindfold, setBlindfold] = useState(false); // Managed by hook now represents mode
    const [blindfoldTime, setBlindfoldTime] = useState(5); // seconds to memorize
    const [blindfoldCountdown, setBlindfoldCountdown] = useState(0); // current countdown
    const [piecesHidden, setPiecesHidden] = useState(false); // actual piece visibility
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [bandSelectorVisible, setBandSelectorVisible] = useState(false);
    const [themeSelectorVisible, setThemeSelectorVisible] = useState(false);
    const [debugPuzzleId, setDebugPuzzleId] = useState<string | null>(null); // For debugging specific puzzles via URL

    // Load Settings
    useEffect(() => {
        (async () => {
            try {
                const storedSet = await AsyncStorage.getItem('pieceSet');
                if (storedSet && PIECE_SETS.includes(storedSet as any)) {
                    setPieceSet(storedSet as PieceSet);
                }

                const storedThemeName = await AsyncStorage.getItem('boardTheme');
                if (storedThemeName) {
                    const theme = BOARD_THEMES.find(t => t.option_name === storedThemeName);
                    if (theme) setBoardTheme(theme);
                }

                const storedBlinfoldTime = await AsyncStorage.getItem('blindfoldTime');
                if (storedBlinfoldTime) setBlindfoldTime(parseInt(storedBlinfoldTime) || 5);

                const storedBand = await AsyncStorage.getItem('band');
                if (storedBand) setBand(storedBand);

                const storedTheme = await AsyncStorage.getItem('theme');
                if (storedTheme) setTheme(storedTheme);

                const storedAutoAdvance = await AsyncStorage.getItem('autoAdvance');
                if (storedAutoAdvance === 'true') setAutoAdvance(true);

                const storedMode = await AsyncStorage.getItem('blindfoldMode');
                if (storedMode === 'blindfold') game.setMode('blindfold');

                // Check for debug puzzle ID in URL (web only)
                if (typeof window !== 'undefined' && window.location) {
                    const params = new URLSearchParams(window.location.search);
                    const debugId = params.get('id');
                    if (debugId) {
                        console.log(`[Debug] Loading specific puzzle: ${debugId}`);
                        setDebugPuzzleId(debugId);
                    }
                }

                // Mark settings as loaded - this triggers the first puzzle fetch
                setSettingsLoaded(true);
            } catch (e) {
                console.log("Failed to load settings", e);
                setSettingsLoaded(true); // Still allow puzzle load on error
            }
        })();
    }, []);

    // Save Settings
    const handleSetPieceSet = (set: PieceSet) => {
        setPieceSet(set);
        AsyncStorage.setItem('pieceSet', set);
    };

    const handleSetBoardTheme = (theme: BoardTheme) => {
        setBoardTheme(theme);
        AsyncStorage.setItem('boardTheme', theme.option_name);
    }

    const handleSetBlindfoldTime = (seconds: number) => {
        setBlindfoldTime(seconds);
        AsyncStorage.setItem('blindfoldTime', String(seconds));
    };

    const handleSetAutoAdvance = (enabled: boolean) => {
        setAutoAdvance(enabled);
        AsyncStorage.setItem('autoAdvance', String(enabled));
    };


    // Reset pieces visibility on new puzzle
    useEffect(() => {
        if (game.puzzleId) {
            setPiecesHidden(false);
            // Verify if we should start blindfold immediately
            // This prevents the "0" state flicker for the Peek button
            if (game.mode === 'blindfold') {
                setBlindfoldCountdown(blindfoldTime);
            } else {
                setBlindfoldCountdown(0);
            }
        }
    }, [game.puzzleId, game.mode, blindfoldTime]);

    // Blindfold Countdown Logic
    useEffect(() => {
        if (blindfoldCountdown > 0) {
            const timer = setTimeout(() => {
                const newCount = blindfoldCountdown - 1;
                setBlindfoldCountdown(newCount);
                // When countdown reaches 0, hide pieces
                if (newCount === 0) {
                    setPiecesHidden(true);
                }
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [blindfoldCountdown]);

    // Start countdown when blindfold mode and puzzle ready (Your move...) 
    // AND NOT LOADING (Fixes flicker when switching puzzles)
    // This is now primarily for RETRY or if the first effect missed it (redundancy)
    useEffect(() => {
        if (!game.isLoading && game.mode === 'blindfold' && game.status.message === 'Your move...' && !piecesHidden && blindfoldCountdown === 0) {
            // Only trigger if we are "resting" at 0. 
            // If the puzzle just loaded, the previous effect sets it to 5, so this won't run.
            // This allows for "Restart" logic if we manually set countdown to 0.
            setBlindfoldCountdown(blindfoldTime);
        }
    }, [game.mode, game.status.message, piecesHidden, blindfoldTime, game.isLoading]);


    // Reveal pieces when puzzle is solved or given up
    useEffect(() => {
        if (game.status.message === 'Solved!' || game.status.message === 'Solution Revealed') {
            setPiecesHidden(false);
            setBlindfoldCountdown(0);
        }
    }, [game.status.message]);

    // Band change handler (now from modal)
    const handleBandChange = (newBand: string) => {
        setBand(newBand);
        AsyncStorage.setItem('band', newBand);
        setBandSelectorVisible(false);
    };

    const handleThemeChange = (newTheme: string) => {
        setTheme(newTheme);
        AsyncStorage.setItem('theme', newTheme);
        setThemeSelectorVisible(false);
    };

    // Reactively load puzzle when Band OR Theme OR Mode changes
    // This removes the need for explicit nextPuzzle calls in handlers
    // ONLY runs after BOTH settings AND stats are loaded
    useEffect(() => {
        if (!settingsLoaded) {
            console.log('[Effect: Config Change] Skipping - settings not loaded yet');
            return;
        }
        if (!game.statsLoaded) {
            console.log('[Effect: Config Change] Skipping - stats not loaded yet');
            return;
        }

        // Reset local UI state immediately to stop timers/anims
        setBlindfoldCountdown(0);
        setPiecesHidden(false);

        // If debug puzzle ID is set, load that specific puzzle instead
        if (debugPuzzleId) {
            console.log(`[Effect: Config Change] Loading DEBUG puzzle: ${debugPuzzleId}`);
            game.loadPuzzleById(debugPuzzleId);
            setDebugPuzzleId(null); // Clear so future changes load random puzzles
        } else {
            console.log(`[Effect: Config Change] Band=${band}, Theme=${theme}, Mode=${game.mode} -> Loading Puzzle`);
            game.nextPuzzle();
        }
    }, [band, theme, game.mode, settingsLoaded, game.statsLoaded, debugPuzzleId]);

    const isFinished = game.status.message === 'Solved!' || game.status.message === 'Solution Revealed';

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>
                            {game.userRating}
                        </Text>
                    </View>
                    <View style={styles.puzzleInfo}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.puzzleText}>
                                Puzzle Rating: {game.puzzleRating}
                            </Text>
                            {game.puzzleId && game.puzzleId !== 'Loading...' && game.puzzleId !== '' && (
                                <>
                                    <Pressable
                                        hitSlop={10}
                                        onPress={() => Linking.openURL(`https://lichess.org/training/${game.puzzleId}`)}
                                        style={{ marginLeft: 8 }}
                                    >
                                        <ExternalLink color="#888" size={16} />
                                    </Pressable>
                                    <Pressable
                                        hitSlop={10}
                                        onPress={game.toggleFavorite}
                                        style={{ marginLeft: 15 }}
                                    >
                                        <Heart
                                            color={game.isFavorite ? "#e74c3c" : "#666"}
                                            fill={game.isFavorite ? "#e74c3c" : "transparent"}
                                            size={20}
                                        />
                                    </Pressable>
                                </>
                            )}
                        </View>
                        <Text style={[styles.statusText, { color: game.status.color }]}>
                            {game.status.message}
                        </Text>
                    </View>

                    {/* Store Button */}
                    <Pressable
                        onPress={() => router.push('/store')}
                        style={{ padding: 10 }}
                        hitSlop={10}
                    >
                        <ShoppingBag color="#f39c12" size={24} />
                    </Pressable>
                </View>
            </View>



            <View style={styles.boardContainer}>
                {game.puzzleId === '' ? (
                    <View style={[styles.container, styles.emptyState]}>
                        <Text style={styles.emptyStateText}>
                            No Puzzles Found
                        </Text>

                        <Pressable style={styles.emptyAction} onPress={() => setBandSelectorVisible(true)}>
                            <Text style={styles.emptyActionText}>Change Band</Text>
                        </Pressable>
                    </View>
                ) : game.puzzleRating > 0 ? (
                    <Board
                        fen={game.fen}
                        orientation={game.orientation}
                        onMove={game.handleMove}
                        highlights={game.highlights}
                        pieceSet={pieceSet}
                        blindfold={piecesHidden}
                        theme={boardTheme}
                        disabled={game.mode === 'blindfold' && !piecesHidden}
                    />
                ) : (
                    <Board
                        fen="8/8/8/8/8/8/8/8 w - - 0 1"
                        orientation="white"
                        onMove={() => { }}
                        highlights={{}}
                        pieceSet={pieceSet}
                        blindfold={false}
                        theme={boardTheme}
                    />
                )}
            </View>

            <Controls
                onNext={game.nextPuzzle}
                onGiveUp={game.giveUp}
                onBack={() => game.navigateHistory('back')}
                onForward={() => game.navigateHistory('forward')}
                canGoBack={game.canGoBack}
                canGoForward={game.canGoForward}
                isFinished={isFinished}
                isLoading={game.isLoading}
                showPeek={game.mode === 'blindfold' && blindfoldCountdown === 0 && !game.isLoading}
                onPeek={() => {
                    // Peek acts as a Retry/Reset in ALL cases to prevent cheating
                    // This restarts the visualization from the beginning
                    setPiecesHidden(false);
                    setBlindfoldCountdown(0);
                    game.restartPuzzle();
                }}
            />

            {/* Blindfold Countdown Bar - below Controls */}
            {
                blindfoldCountdown > 0 && (
                    <View style={styles.countdownContainer}>
                        <Text style={styles.countdownText}>Memorize Position! ({blindfoldCountdown})</Text>
                        <View style={styles.timerContainer}>
                            <View style={[
                                styles.timerBar,
                                {
                                    width: `${(blindfoldCountdown / blindfoldTime) * 100}%`,
                                    backgroundColor: '#f39c12'
                                }
                            ]} />
                        </View>
                    </View>
                )
            }

            <View style={{ flex: 1 }} />

            <BottomToolbar
                band={band}
                onOpenBandSelector={() => setBandSelectorVisible(true)}
                theme={theme}
                onOpenThemeSelector={() => setThemeSelectorVisible(true)}
                blindfold={game.mode === 'blindfold'}
                onToggleBlindfold={() => {
                    game.toggleBlindfold();
                    // Determine next mode logic - simple toggle
                    const nextMode = game.mode === 'standard' ? 'blindfold' : 'standard';
                    AsyncStorage.setItem('blindfoldMode', nextMode);

                    // Reset UI state for blindfold toggle
                    if (nextMode === 'standard') {
                        setPiecesHidden(false);
                        setBlindfoldCountdown(0);
                    } else {
                        // If checking switch TO blindfold, restart timer logic?
                        // Usually applies on next puzzle. 
                        // But if current puzzle is active, maybe trigger countdown?
                        // For now, let it apply on next puzzle naturally or if user forces restart.
                    }
                }}
                onOpenSettings={() => setSettingsVisible(true)}
            />

            <SettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
                pieceSet={pieceSet}
                onSetPieceSet={handleSetPieceSet}
                boardTheme={boardTheme}
                onSetBoardTheme={handleSetBoardTheme}
                onResetProgress={() => {
                    game.resetGameData();
                }}
                blindfoldTime={blindfoldTime}
                onSetBlindfoldTime={handleSetBlindfoldTime}
                autoAdvance={autoAdvance}
                onSetAutoAdvance={handleSetAutoAdvance}
            />

            <BandSelectorModal
                visible={bandSelectorVisible}
                onClose={() => setBandSelectorVisible(false)}
                currentBand={band}
                onSelectBand={handleBandChange}
            />

            <ThemeSelectorModal
                visible={themeSelectorVisible}
                onClose={() => setThemeSelectorVisible(false)}
                currentTheme={theme}
                onSelectTheme={handleThemeChange}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    headerWrapper: {
        alignItems: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'space-between', // Push items to edges
        width: 350, // Match board width
    },
    ratingBadge: {
        backgroundColor: '#222',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
    },
    ratingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    puzzleInfo: {
        flex: 1,
        marginLeft: 15, // Add spacing between badge and text
    },
    puzzleText: {
        color: '#888',
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    timerContainer: {
        height: 4,
        backgroundColor: '#333',
        width: '100%',
    },
    timerBar: {
        height: '100%',
    },
    boardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
        marginTop: 20,
    },
    countdownContainer: {
        alignItems: 'center',
        paddingVertical: 10,
        backgroundColor: '#1a1a1a',
    },
    countdownText: {
        color: '#f39c12',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 350,
        width: 350,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
    },
    emptyStateText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    emptyStateSub: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 20,
    },
    emptyAction: {
        backgroundColor: '#2980b9',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 5,
    },
    emptyActionText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
