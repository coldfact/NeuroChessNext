import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home, Play, Settings, X, RotateCcw, HelpCircle, Trophy, Medal, Flame, Zap } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import SequencesGrid, { SequenceItem } from '../../src/components/sequences/SequencesGrid';
import SequencesBottomToolbar from '../../src/components/sequences/SequencesBottomToolbar';
import SequencesSettingsModal from '../../src/components/sequences/SequencesSettingsModal';
import SequencesLevelModal from '../../src/components/sequences/SequencesLevelModal';
import SequencesTimeModal from '../../src/components/sequences/SequencesTimeModal';
import SequencesRankInfoModal from '../../src/components/sequences/SequencesRankInfoModal';
import AdPlaceholderModal from '../../src/components/shared/AdPlaceholderModal';
import { AdService } from '../../src/services/AdService';

import { useSequencesGame } from '../../src/hooks/useSequencesGame';
import Piece from '../../src/components/Piece';
import { DatabaseService } from '../../src/services/database';
import { NBACK_RANKS, RANK_COLORS } from '../../src/constants';

export default function SequencesGameScreen() {
    const router = useRouter();
    const game = useSequencesGame();
    const { phase, level, score, streak, multiplier, targetPiece, visibleItem, activeSquare, feedbackColor, maxStreak, maxScore, roundsCompleted, initialBests } = game.state;
    const { config } = game;

    // Check for records
    const isNewScore = maxScore > 0 && maxScore > initialBests.maxScore;
    const isNewStreak = maxStreak > 0 && maxStreak > initialBests.maxStreak;

    // Force re-render for timer
    const [_, setTick] = useState(0);

    useEffect(() => {
        if (game.state.activeGameStartTime && phase !== 'GAME_OVER' && phase !== 'IDLE') {
            const interval = setInterval(() => {
                setTick(t => t + 1);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [game.state.activeGameStartTime, phase]);

    // Modals
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [levelModalVisible, setLevelModalVisible] = useState(false);
    const [timeModalVisible, setTimeModalVisible] = useState(false);
    const [rankInfoVisible, setRankInfoVisible] = useState(false);

    const [isPremium, setIsPremium] = useState(false);

    const isPlaying = game.state.phase !== 'IDLE' && game.state.phase !== 'GAME_OVER';

    // Header Logic
    // const showUnranked = !game.state.isVerified;
    // const rankTitle = showUnranked ? 'UNRANKED' : (NBACK_RANKS[game.config.startLength] || `Moves ${game.config.startLength}`);
    // If verified, show "Moves X" or Rank Name? N-Back shows "Beginner" etc.
    // We can use NBACK_RANKS mapping for Move counts if we want consistent naming.
    // Moves 1 = Beginner? (N-Back 1 = Beginner)

    // Timer Logic
    // Reusing styles from N-Back for consistency
    const getTimerText = () => {
        if (!game.state.activeGameStartTime) {
            const m = game.config.gameTime;
            return `${m}:00`;
        }
        const elapsed = Date.now() - game.state.activeGameStartTime;
        const totalMs = game.config.gameTime * 60 * 1000;
        const remaining = Math.max(0, totalMs - elapsed);

        const totalSeconds = Math.floor(remaining / 1000);
        const m = Math.floor(totalSeconds / 60);
        const s = totalSeconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const isLowTime = () => {
        if (!game.state.activeGameStartTime) return false;
        const elapsed = Date.now() - game.state.activeGameStartTime;
        const totalMs = game.config.gameTime * 60 * 1000;
        return (totalMs - elapsed) < 10000;
    };

    // Check Premium Status on Focus
    useFocusEffect(
        useCallback(() => {
            AsyncStorage.getItem('sequences_unlocked').then(val => {
                setIsPremium(val === 'true');
            });
        }, [])
    );

    // Convert visibleItem to array for Grid
    // const gridItems: SequenceItem[] = visibleItem ? [visibleItem] : [];

    const getPhaseText = () => {
        switch (phase) {
            case 'PREVIEW': return 'MEMORIZE TARGET';
            case 'SETTLE': return 'Get Ready...';
            case 'WATCH': return 'WATCH SEQUENCE';
            case 'INPUT': return 'REPLAY SEQUENCE';
            case 'FEEDBACK': return '...';
            case 'GAME_OVER': return 'Time Up';
            default: return 'Ready?';
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Pressable style={{ padding: 10 }} onPress={() => router.back()} hitSlop={10}>
                    <Home color="#888" size={24} />
                </Pressable>

                <View style={styles.headerTitleContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={[styles.title, { color: game.state.globalRank > 0 ? (RANK_COLORS[game.state.globalRank] || '#fff') : '#fff' }]}>
                            {game.state.globalRank > 0 ? NBACK_RANKS[game.state.globalRank] : 'Unranked'}
                        </Text>
                        <Pressable onPress={() => setRankInfoVisible(true)} hitSlop={10}>
                            <HelpCircle color="#666" size={16} />
                        </Pressable>
                    </View>
                </View>

                <View style={{ width: 44 }} />
            </View>

            {/* Score & Progress */}
            <View style={styles.statsContainer}>
                <Text style={styles.roundText}>
                    Moves {game.config.startLength} • {game.config.gameTime}m Mode
                </Text>
                <Text style={styles.scoreText}>
                    Score: {game.state.score} / {game.state.maxScore}
                </Text>
                {/* Streak Calculation */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 5 }}>
                    <Flame
                        size={16}
                        color={streak > 0 ? (multiplier >= 3 ? '#f1c40f' : multiplier >= 2 ? '#3498db' : '#e74c3c') : '#555'}
                        fill={streak > 0 ? (multiplier >= 3 ? '#f1c40f' : multiplier >= 2 ? '#3498db' : '#e74c3c') : 'transparent'}
                    />
                    <Text style={{ color: '#888', fontSize: 14 }}>
                        Streak: <Text style={{ color: multiplier >= 3 ? '#f1c40f' : multiplier >= 2 ? '#3498db' : '#e74c3c', fontWeight: 'bold' }}>{streak} (x{multiplier})</Text>
                    </Text>
                </View>
            </View>

            {/* Move Timer Bar - Replaces Spacer */}
            <View style={{ height: 6, width: '100%', marginTop: 10, backgroundColor: '#333' }}>
                <View style={{
                    height: '100%',
                    width: `${Math.min(100, Math.max(0, (game.state.timeLeftForMove / 4000) * 100))}%`,
                    backgroundColor: (game.state.timeLeftForMove / 4000) < 0.25 ? '#e74c3c' : '#3498db'
                }} />
            </View>

            {/* GAME BOARD AREA */}
            {/* Matches N-Back absolute positioning context */}
            <View style={{ alignItems: 'center', paddingTop: 60, zIndex: 1 }}>

                {/* Close Button - Matches N-Back Position */}
                {isPlaying && (
                    <Pressable
                        onPress={game.actions.stopGame}
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}
                        hitSlop={20}
                    >
                        <X color="#e74c3c" size={24} />
                    </Pressable>
                )}

                <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                    {/* Negative margin wrapper to counteract Grid's internal margin for perfect centering context */}
                    <View style={{ marginVertical: -20 }}>
                        <SequencesGrid
                            items={game.state.phase === 'WATCH' ? (game.state.visibleItem ? [game.state.visibleItem] : []) : []}
                            activeSquare={game.state.activeSquare}
                            onSquarePress={game.actions.handleInput}
                            interactive={game.state.phase === 'INPUT'}
                            feedbackColor={game.state.feedbackColor}
                            activeFeedbackSquare={game.state.lastInputSquare}
                            pieceSet={game.config.pieceSet}
                            theme={game.config.boardTheme}
                        />
                    </View>

                    {/* PREVIEW OVERLAY - Now absolutely positioned relative to this tight wrapper */}
                    {phase === 'PREVIEW' && (
                        <View style={styles.previewContainer}>
                            <View style={styles.previewCircle}>
                                <Piece piece={targetPiece} size={150} set={game.config.pieceSet} />
                            </View>
                        </View>
                    )}
                </View>

                {/* GAME OVER BANNERS */}
                {game.state.phase === 'GAME_OVER' && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 100 }}>
                        {game.state.rankAchieved && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: RANK_COLORS[game.state.globalRank] || '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                <Trophy color={RANK_COLORS[game.state.globalRank] || '#FFD700'} size={20} style={{ marginRight: 8 }} />
                                <Text style={{ color: RANK_COLORS[game.state.globalRank] || '#FFD700', fontSize: 14, fontWeight: 'bold' }}>You achieved {game.state.rankAchieved}!</Text>
                            </View>
                        )}

                        {isNewScore && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                <Trophy color="#FFD700" size={20} style={{ marginRight: 8 }} />
                                <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold' }}>New High Score!</Text>
                            </View>
                        )}

                        {isNewStreak && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#002a3a', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#00A8E8', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                <Flame color="#00A8E8" size={20} style={{ marginRight: 8 }} />
                                <Text style={{ color: '#00A8E8', fontSize: 14, fontWeight: 'bold' }}>New Max Streak!</Text>
                            </View>
                        )}
                    </View>
                )}

            </View>

            {/* Controls / Messaging Area */}
            <View style={{ flex: 1, justifyContent: 'flex-start', width: '100%', paddingTop: 5, alignItems: 'center' }}>
                {isPlaying ? (
                    <View style={{ alignItems: 'center', width: '100%' }}>
                        {/* Timer Text - Same Place as NBack Timer (visually) */}
                        <Text style={{
                            color: isLowTime() ? '#e67e22' : '#888',
                            fontSize: 24,
                            fontWeight: 'bold',
                            marginTop: 10,
                            marginBottom: 10
                        }}>
                            {getTimerText()}
                        </Text>

                        {/* Game Messaging - BELOW Timer */}
                        <Text style={[
                            styles.phaseText,
                            phase === 'INPUT' && { color: '#2ecc71' },
                            phase === 'PREVIEW' && { color: '#00A8E8' }
                        ]}>{getPhaseText()}</Text>
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', width: '100%' }}>
                        <Text style={styles.gameOverText}>
                            {game.state.phase === 'GAME_OVER' ? 'Game Over' : 'Ready?'}
                        </Text>

                        {game.state.phase === 'GAME_OVER' && (
                            <View style={{ flexDirection: 'row', gap: 40, marginBottom: 10, marginTop: 5 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: '#aaa', marginBottom: 2 }}>Accuracy</Text>
                                    <Text style={{ fontSize: 24, color: '#4ECDC4', fontWeight: 'bold' }}>
                                        {maxScore > 0 ? Math.round((score / maxScore) * 100) : 0}%
                                    </Text>
                                </View>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 14, color: '#aaa', marginBottom: 2 }}>Max Streak</Text>
                                    <Text style={{ fontSize: 24, color: '#fff', fontWeight: 'bold' }}>
                                        {maxStreak}
                                    </Text>
                                </View>
                            </View>
                        )}

                        <Pressable style={styles.startButton} onPress={game.actions.startGame}>
                            <Play color="#fff" fill="#fff" size={32} />
                            <Text style={styles.startButtonText}>
                                {game.state.phase === 'GAME_OVER' ? 'Play Again' : 'Start Game'}
                            </Text>
                        </Pressable>
                    </View>
                )}
            </View>

            {/* Bottom Toolbar */}
            <SequencesBottomToolbar
                level={config.startLength}
                onOpenLevelSelector={() => setLevelModalVisible(true)}
                time={config.gameTime}
                onOpenTimeSelector={() => setTimeModalVisible(true)}
                confounders={config.confounders}
                onToggleConfounders={game.actions.toggleConfounders}
                onOpenSettings={() => setSettingsVisible(true)}
                isPlaying={isPlaying}
            />

            {/* Modals */}
            <SequencesSettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
                speed={config.speed}
                onSetSpeed={game.actions.setSpeed}
                confounderBias={config.confounderBias}
                onSetConfounderBias={game.actions.setConfounderBias}
                pieceSet={config.pieceSet}
                onSetPieceSet={game.actions.setPieceSet}
                boardTheme={config.boardTheme}
                onSetBoardTheme={game.actions.setBoardTheme}
                onResetData={game.actions.resetData}
            />

            <SequencesLevelModal
                visible={levelModalVisible}
                onClose={() => setLevelModalVisible(false)}
                currentLevel={config.startLength}
                onSelectLevel={game.actions.setStartLength}
                isPremium={isPremium}
                onPurchase={() => {
                    setLevelModalVisible(false);
                    router.push('/store');
                }}
            />

            <SequencesTimeModal
                visible={timeModalVisible}
                onClose={() => setTimeModalVisible(false)}
                currentDuration={config.gameTime}
                onSelectDuration={game.actions.setGameTime}
            />

            <SequencesRankInfoModal
                visible={rankInfoVisible}
                onClose={() => setRankInfoVisible(false)}
            />

            <AdPlaceholderModal
                visible={game.state.showAd}
                onClose={game.actions.closeAd}
                onRemoveAds={async () => {
                    await AdService.purchaseRemoveAds();
                    game.actions.closeAd();
                    alert("Thank you! Ads have been removed.");
                }}
            />

        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    headerTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    statsContainer: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    roundText: {
        color: '#888',
        fontSize: 16,
        marginBottom: 5,
    },
    scoreText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    statBox: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#888',
        fontSize: 12,
        textTransform: 'uppercase',
    },
    statValue: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    gameArea: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
    },
    streakActive: {
        backgroundColor: 'rgba(52, 152, 219, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(52, 152, 219, 0.3)'
    },
    streakText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 14
    },
    phaseText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        letterSpacing: 2,
        marginBottom: 20,
        textTransform: 'uppercase'
    },
    gridContainer: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center'
    },
    previewContainer: {
        ...StyleSheet.absoluteFillObject, // Fills the relative wrapper perfectly
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    previewCircle: {
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(230, 230, 230, 0.9)', // Light background
        borderWidth: 3,
        borderColor: '#00A8E8',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6
    },
    previewText: {
        color: '#00A8E8',
        fontWeight: 'bold',
        fontSize: 16,
        letterSpacing: 1
    },
    actionContainer: {
        marginTop: 40,
        height: 60,
        justifyContent: 'center'
    },
    startButton: {
        backgroundColor: '#27ae60',
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 5,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    gameOverText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
    },
    controls: {
        flex: 1,
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 20,
    },
    stopButton: { // Deprecated visually but kept for ref if needed
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#c0392b',
        borderRadius: 8,
        marginTop: 20,
    },
    stopButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1
    }
});
