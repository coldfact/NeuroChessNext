import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Animated, Pressable, Linking } from 'react-native';
import { ExternalLink, Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Board from '../src/components/Board';
import Controls from '../src/components/Controls';
import BottomToolbar from '../src/components/BottomToolbar';
import SettingsModal from '../src/components/SettingsModal';
import BandSelectorModal from '../src/components/BandSelectorModal';
import { useChessGame } from '../src/hooks/useChessGame';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../src/constants';

export default function GameScreen() {
    const [band, setBand] = useState('All');
    const [autoAdvance, setAutoAdvance] = useState(false);
    const game = useChessGame(band, autoAdvance);

    const [pieceSet, setPieceSet] = useState<PieceSet>('cburnett');
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);
    // const [blindfold, setBlindfold] = useState(false); // Managed by hook now represents mode
    const [blindfoldTime, setBlindfoldTime] = useState(5); // seconds to memorize
    const [blindfoldCountdown, setBlindfoldCountdown] = useState(0); // current countdown
    const [piecesHidden, setPiecesHidden] = useState(false); // actual piece visibility
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [bandSelectorVisible, setBandSelectorVisible] = useState(false);

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

                const storedAutoAdvance = await AsyncStorage.getItem('autoAdvance');
                if (storedAutoAdvance === 'true') setAutoAdvance(true);

                const storedMode = await AsyncStorage.getItem('blindfoldMode');
                if (storedMode === 'blindfold') game.setMode('blindfold');
            } catch (e) {
                console.log("Failed to load settings", e);
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
            setBlindfoldCountdown(0);
        }
    }, [game.puzzleId]);

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
    useEffect(() => {
        if (game.mode === 'blindfold' && game.status.message === 'Your move...' && !piecesHidden && blindfoldCountdown === 0) {
            setBlindfoldCountdown(blindfoldTime);
        }
    }, [game.mode, game.status.message, piecesHidden, blindfoldTime]);

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
    };

    // Load puzzle when band changes or on mount
    useEffect(() => {
        console.log(`[Effect: Band Change] Band=${band} -> Loading Puzzle`);
        // Use timeout to allow ref updates to propagate if any
        setTimeout(() => game.nextPuzzle(), 0);
    }, [band]);

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
                    if (piecesHidden) {
                        // User wants to peek (Reveal pieces)
                        setPiecesHidden(false);
                    } else {
                        // User wants to retry/restart blindfold on CURRENT puzzle
                        setPiecesHidden(false);
                        setBlindfoldCountdown(0);
                        game.restartPuzzle();
                    }
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
                blindfold={game.mode === 'blindfold'}
                onToggleBlindfold={() => {
                    const newMode = game.mode === 'standard' ? 'blindfold' : 'standard';
                    game.setMode(newMode);
                    AsyncStorage.setItem('blindfoldMode', newMode);

                    // Reset UI State
                    setPiecesHidden(false);
                    setBlindfoldCountdown(0);

                    // Sync call to avoid stale state 'Start' logic
                    game.nextPuzzle();
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
        </SafeAreaView >
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
        paddingHorizontal: 0,
        alignItems: 'center',
        gap: 15,
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
    rdText: {
        fontSize: 12,
        color: '#888',
        fontWeight: 'normal',
    },
    puzzleInfo: {
        flex: 1,
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
