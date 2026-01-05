import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { ArrowLeft, Home, Play, Settings, X, Medal, Flame, HelpCircle, Trophy } from 'lucide-react-native';

import Grid3x3 from '../../src/components/nback/Grid3x3';
import MatchControls from '../../src/components/nback/MatchControls';
import NBackBottomToolbar from '../../src/components/nback/NBackBottomToolbar';
import NBackSettingsModal from '../../src/components/nback/NBackSettingsModal';
import LevelSelectorModal from '../../src/components/nback/LevelSelectorModal';
import DurationSelectorModal from '../../src/components/nback/DurationSelectorModal';
import RankInfoModal from '../../src/components/nback/RankInfoModal';
import AdPlaceholderModal from '../../src/components/shared/AdPlaceholderModal';
import { AdService } from '../../src/services/AdService';

import { useNBackGame } from '../../src/hooks/useNBackGame';
import { NBACK_RANKS, RANK_COLORS } from '../../src/constants';

export default function NBackGameScreen() {
    const router = useRouter();
    const game = useNBackGame();

    // Modal State
    const [showSettings, setShowSettings] = useState(false);
    const [showLevelSelector, setShowLevelSelector] = useState(false);
    const [showDurationSelector, setShowDurationSelector] = useState(false);
    const [showRankInfo, setShowRankInfo] = useState(false);

    const isCaching = game.state.currentRound === -1 && game.state.isPlaying;
    const progress = (game.state.timeLeft / game.config.memorizeTime) * 100;

    // Header Logic
    // User Requirement: "call untested players Unranked in white before they do the actual test"
    // This applies to ALL levels, including Level 1 (Beginner).
    const showUnranked = !game.isVerified;

    const rankTitle = showUnranked ? 'UNRANKED' : (NBACK_RANKS[game.config.n] || `Level ${game.config.n}`);
    const rankColor = showUnranked ? '#fff' : (RANK_COLORS[game.config.n] || '#fff');

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
                        <Text style={[styles.title, { color: game.globalRank > 0 ? (RANK_COLORS[game.globalRank] || '#fff') : '#fff' }]}>
                            {game.globalRank > 0 ? NBACK_RANKS[game.globalRank] : 'Unranked'}
                        </Text>
                        <Pressable onPress={() => setShowRankInfo(true)} hitSlop={10}>
                            <HelpCircle color="#666" size={16} />
                        </Pressable>
                    </View>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {/* Score & Progress */}
            <View style={styles.statsContainer}>
                <Text style={styles.roundText}>
                    {isCaching
                        ? `Memorize... (${game.state.history.length}/${game.config.n})`
                        : `Level ${game.config.n} • ${game.config.duration}m Mode`
                    }
                </Text>
                <Text style={styles.scoreText}>
                    Score: {game.state.score} / {game.state.possibleScore}
                </Text>
            </View>

            {/* Timer Bar */}
            <View style={styles.timerContainer}>
                <View style={[
                    styles.timerBar,
                    { width: `${progress}%` },
                    isCaching && { backgroundColor: '#3498db' } // Blue for caching
                ]} />
            </View>

            {/* GAME BOARD */}
            {/* Board Container - Fixed Top Padding to prevent jumping */}
            <View style={{ alignItems: 'center', paddingTop: 60, zIndex: 1 }}>
                {/* Close Button - Only while playing */}
                {game.state.isPlaying && (
                    <Pressable
                        onPress={game.cancelGame}
                        style={{ position: 'absolute', top: 20, right: 20, zIndex: 20 }}
                        hitSlop={20}
                    >
                        <X color="#e74c3c" size={24} />
                    </Pressable>
                )}

                <Grid3x3
                    currentSign={game.state.currentSign}
                    feedback={game.state.feedback}
                    pieceSet={game.config.pieceSet}
                    theme={game.config.boardTheme}
                    ghostItem={game.ghostItem}
                />

                {/* NEW RECORD BANNERS OVERLAY */}
                {game.state.gameOver && !game.isGhostGame && (
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', pointerEvents: 'none', zIndex: 100 }}>

                        {game.rankAchieved && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: RANK_COLORS[game.globalRank] || '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                <Trophy color={RANK_COLORS[game.globalRank] || '#FFD700'} size={20} style={{ marginRight: 8 }} />
                                <Text style={{ color: RANK_COLORS[game.globalRank] || '#FFD700', fontSize: 14, fontWeight: 'bold' }}>You achieved the rank of {game.rankAchieved.toUpperCase()}!</Text>
                            </View>
                        )}
                        {(
                            (game.state.possibleScore > 0 ? Math.round((game.state.score / game.state.possibleScore) * 100) : 0) > (game.initialBests?.maxAccuracy ?? 0) &&
                            (game.state.possibleScore > 0 ? Math.round((game.state.score / game.state.possibleScore) * 100) : 0) > 0
                        ) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#332b00', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#FFD700', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                    <Medal color="#FFD700" size={20} style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: 'bold' }}>New Accuracy Record!</Text>
                                </View>
                            )}

                        {(
                            game.state.maxStreak > (game.initialBests?.maxStreak ?? 0) &&
                            game.state.maxStreak > 0
                        ) && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2c0b0e', padding: 8, borderRadius: 8, marginBottom: 5, borderWidth: 1, borderColor: '#e74c3c', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.8, shadowRadius: 4 }}>
                                    <Flame color="#e74c3c" size={20} style={{ marginRight: 8 }} />
                                    <Text style={{ color: '#e74c3c', fontSize: 14, fontWeight: 'bold' }}>New Streak Record!</Text>
                                </View>
                            )}
                    </View>
                )}
            </View>


            {/* Controls / Game Over Content */}
            <View style={{ flex: 1, justifyContent: 'flex-start', width: '100%', paddingTop: 5 }}>
                {game.state.isPlaying ? (
                    <View style={{ width: '100%', alignItems: 'center' }}>
                        {/* Loading Text - Fixed height container */}
                        <View style={{ height: 30, justifyContent: 'center' }}>
                            {isCaching ? (
                                <Text style={{ color: '#aaa', fontSize: 16 }}>
                                    Loading {Math.max(1, game.state.history.length)} move{Math.max(1, game.state.history.length) !== 1 ? 's' : ''} back...
                                </Text>
                            ) : (
                                game.state.activeGameStartTime && (() => {
                                    const elapsed = Date.now() - game.state.activeGameStartTime!;
                                    const totalMs = game.config.duration * 60 * 1000;
                                    const remaining = Math.max(0, totalMs - elapsed);

                                    const totalSeconds = Math.floor(remaining / 1000);
                                    const h = Math.floor(totalSeconds / 3600);
                                    const m = Math.floor((totalSeconds % 3600) / 60);
                                    const s = totalSeconds % 60;

                                    // Format: HH:MM:SS or MM:SS
                                    const timeStr = h > 0
                                        ? `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                                        : `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

                                    const isLowTime = remaining < 10000; // Last 10 seconds

                                    return (
                                        <Text style={{ color: isLowTime ? '#e67e22' : '#888', fontSize: 24, fontWeight: 'bold' }}>
                                            {timeStr}
                                        </Text>
                                    );
                                })()
                            )}
                        </View>

                        <MatchControls
                            onSubmit={(type) => game.submitAnswer(type)}
                            disabled={isCaching}
                            selectedOption={game.state.currentSelection}
                        />
                    </View>
                ) : (
                    <View style={{ alignItems: 'center', width: '100%' }}>
                        <Text style={styles.gameOverText}>
                            {game.state.gameOver ? 'Game Over' : 'Ready?'}
                        </Text>

                        {game.state.gameOver && (
                            <View style={{ flexDirection: 'row', gap: 40, marginBottom: 10, marginTop: 5 }}>
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: '#aaa', marginBottom: 0 }}>Accuracy</Text>
                                    <Text style={{ fontSize: 32, color: '#4ECDC4', fontWeight: 'bold', marginBottom: 0 }}>
                                        {game.state.possibleScore > 0 ? Math.round((game.state.score / game.state.possibleScore) * 100) : 0}%
                                    </Text>
                                </View>

                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: '#aaa', marginBottom: 0 }}>Max Streak</Text>
                                    <Text style={{ fontSize: 32, color: '#fff', fontWeight: 'bold', marginBottom: 0 }}>
                                        {game.state.maxStreak}
                                    </Text>
                                </View>
                            </View>
                        )}
                        <Pressable style={styles.startButton} onPress={game.startGame}>
                            <Play color="#fff" fill="#fff" size={32} />
                            <Text style={styles.startButtonText}>
                                {game.state.gameOver ? 'Play Again' : 'Start Game'}
                            </Text>
                        </Pressable>
                    </View>
                )
                }
            </View>

            <View style={{ height: 20 }} />

            {/* Bottom Toolbar */}
            <NBackBottomToolbar
                level={game.config.n}
                onOpenLevelSelector={() => setShowLevelSelector(true)}
                duration={game.config.duration}
                onOpenDurationSelector={() => setShowDurationSelector(true)}
                ghostMode={game.config.ghostMode}
                onToggleGhostMode={() => game.updateConfig({ ghostMode: !game.config.ghostMode })}
                onOpenSettings={() => setShowSettings(true)}
            />

            {/* Modals */}
            <LevelSelectorModal
                visible={showLevelSelector}
                onClose={() => setShowLevelSelector(false)}
                currentLevel={game.config.n}
                onSelectLevel={(n) => game.updateConfig({ n })}
                isPremium={game.config.isPremium}
                onPurchase={() => {
                    setShowLevelSelector(false);
                    router.push('/store');
                }}
            />

            <DurationSelectorModal
                visible={showDurationSelector}
                onClose={() => setShowDurationSelector(false)}
                currentDuration={game.config.duration}
                onSelectDuration={(mins) => game.updateConfig({ duration: mins })}
            />

            <NBackSettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                matchBias={game.config.matchBias}
                onSetMatchBias={(matchBias) => game.updateConfig({ matchBias })}
                memorizeTime={game.config.memorizeTime}
                onSetMemorizeTime={(memorizeTime) => game.updateConfig({ memorizeTime })}
                pieceSet={game.config.pieceSet}
                onSetPieceSet={(pieceSet) => game.updateConfig({ pieceSet })}
                boardTheme={game.config.boardTheme}
                onSetBoardTheme={(boardTheme) => game.updateConfig({ boardTheme })}
                onResetData={game.resetData}
            />

            <RankInfoModal
                visible={showRankInfo}
                onClose={() => setShowRankInfo(false)}
            />

            <AdPlaceholderModal
                visible={game.state.showAd}
                onClose={game.closeAd}
                onRemoveAds={async () => {
                    await AdService.purchaseRemoveAds();
                    game.closeAd();
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
    timerContainer: {
        height: 6,
        backgroundColor: '#333',
        width: '100%',
        marginTop: 10,
    },
    timerBar: {
        height: '100%',
        backgroundColor: '#2ecc71',
    },
    startContainer: {
        alignItems: 'center',
        marginBottom: 40,
        height: 120, // fixed height to prevent jump
        justifyContent: 'center'
    },
    startButton: {
        flexDirection: 'row',
        backgroundColor: '#27ae60',
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
    finalScore: {
        color: '#aaa',
        fontSize: 18,
        marginTop: 5,
    },
    feedbackOverlay: {
        position: 'absolute',
        top: '50%',
        alignSelf: 'center',
        zIndex: 10,
        transform: [{ translateY: -20 }] // adjust to center
    },
    feedbackText: {
        fontSize: 40,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
        textAlign: 'center'
    }
});
