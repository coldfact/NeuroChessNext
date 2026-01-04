import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { ExternalLink, Heart, Home, Layers, Lock, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Board from '../../src/components/Board';
import Controls from '../../src/components/Controls';
import BottomToolbar from '../../src/components/BottomToolbar';
import DeepSettingsModal from '../../src/components/deep/DeepSettingsModal';
import DepthSelectorModal from '../../src/components/deep/DepthSelectorModal';
import { useDeepGame } from '../../src/hooks/useDeepGame';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../../src/constants';
import { AdService } from '../../src/services/AdService';
import AdPlaceholderModal from '../../src/components/shared/AdPlaceholderModal';

export default function DeepGameScreen() {
    const router = useRouter();
    const [depth, setDepth] = useState(1);
    const [autoAdvance, setAutoAdvance] = useState(false);

    // Load config before game init
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const savedDepth = await AsyncStorage.getItem('deep_current_depth');
            if (savedDepth) setDepth(parseInt(savedDepth));

            const savedAuto = await AsyncStorage.getItem('deep_auto_advance');
            if (savedAuto === 'true') setAutoAdvance(true);

            setConfigLoaded(true);
        })();
    }, []);

    const game = useDeepGame(depth, autoAdvance);

    // Visual Settings
    const [pieceSet, setPieceSet] = useState<PieceSet>('cburnett');
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);

    // UI Modals
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [depthSelectorVisible, setDepthSelectorVisible] = useState(false);

    // Ad State
    const [showAd, setShowAd] = useState(false);
    const [adShownForCurrentPuzzle, setAdShownForCurrentPuzzle] = useState(false);

    // Load Visual Settings
    useEffect(() => {
        (async () => {
            const p = await AsyncStorage.getItem('pieceSet');
            if (p) setPieceSet(p as PieceSet);

            const t = await AsyncStorage.getItem('boardTheme');
            if (t) {
                const theme = BOARD_THEMES.find(x => x.option_name === t);
                if (theme) setBoardTheme(theme);
            }

            const savedMoveTime = await AsyncStorage.getItem('deep_move_time');
            if (savedMoveTime) game.setMoveTime(parseInt(savedMoveTime));
        })();
    }, []);

    // Save Handlers
    const handleSetDepth = (d: number) => {
        setDepth(d);
        AsyncStorage.setItem('deep_current_depth', String(d));
        setDepthSelectorVisible(false);
        // Maybe reload puzzle? 
        game.nextPuzzle(); // Reload with new depth settings if applicable
    };

    const handleSetMoveTime = (t: number) => {
        game.setMoveTime(t);
        AsyncStorage.setItem('deep_move_time', String(t));
    };

    const handleSetAutoAdvance = (enabled: boolean) => {
        setAutoAdvance(enabled);
        AsyncStorage.setItem('deep_auto_advance', String(enabled));
    };

    // Ad Logic
    useEffect(() => {
        if (game.puzzleId) {
            setAdShownForCurrentPuzzle(false);
        }
    }, [game.puzzleId]);

    useEffect(() => {
        if (game.status.message === 'Solved!' || game.status.message === 'Solution Revealed') {
            if (!adShownForCurrentPuzzle) {
                setAdShownForCurrentPuzzle(true);
                (async () => {
                    const shouldShow = await AdService.incrementGameCount();
                    if (shouldShow) setShowAd(true);
                })();
            }
        }
    }, [game.status.message, adShownForCurrentPuzzle]);


    if (!configLoaded) return null; // or spinner

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={{ padding: 10 }}>
                    <Home color="#888" size={24} />
                </Pressable>

                <View style={styles.ratingBadge}>
                    <Text style={styles.ratingText}>{game.userRating}</Text>
                </View>

                <View style={styles.infoContainer}>
                    <Text style={styles.infoLabel}>Calculation Depth</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Layers color="#f1c40f" size={14} />
                        <Text style={styles.infoValue}>Level {depth}</Text>
                    </View>
                </View>

                <Text style={[styles.statusText, { color: game.status.color }]}>
                    {game.status.message}
                </Text>
            </View>

            {/* Board */}
            <View style={styles.boardContainer}>
                <Board
                    fen={game.fen}
                    orientation={game.orientation}
                    onMove={game.handleMove}
                    highlights={game.highlights}
                    pieceSet={pieceSet}
                    theme={boardTheme}
                    disabled={game.isLoading}
                />
            </View>

            {/* Controls */}
            <Controls
                onNext={game.nextPuzzle}
                onGiveUp={game.giveUp}
                onBack={() => game.navigateHistory('back')}
                onForward={() => game.navigateHistory('forward')}
                canGoBack={game.canGoBack}
                canGoForward={game.canGoForward}
                isFinished={game.status.message === 'Solved!' || game.status.message === 'Solution Revealed'}
                isLoading={game.isLoading}
            />

            <View style={{ flex: 1 }} />

            {/* Custom Deep Toolbar replicating look and feel */}

            {/* Custom Deep Toolbar replicating look and feel */}
            <View style={styles.toolbar}>
                <Pressable style={styles.toolBtn} onPress={() => setDepthSelectorVisible(true)}>
                    <Layers color="#f1c40f" size={24} />
                    <Text style={[styles.toolText, { color: '#f1c40f' }]}>Depth {depth}</Text>
                </Pressable>

                <Pressable style={styles.toolBtn} onPress={() => { game.setShowMoves(!game.showMoves); }}>
                    {game.showMoves ? <Eye color="#2ecc71" size={24} /> : <EyeOff color="#888" size={24} />}
                    <Text style={[styles.toolText, { color: game.showMoves ? '#2ecc71' : '#888' }]}>
                        {game.showMoves ? 'Moves Shown' : 'Moves Hidden'}
                    </Text>
                </Pressable>

                <Pressable style={styles.toolBtn} onPress={() => setSettingsVisible(true)}>
                    <View style={styles.gearContainer}>
                        {/* Gear Icon from SettingsModal import or Lucide? */}
                        {/* We need Gear icon. Let's import Settings from lucide */}
                        <Text style={{ fontSize: 24 }}>⚙️</Text>
                    </View>
                    <Text style={styles.toolText}>Settings</Text>
                </Pressable>
            </View>


            {/* Modals */}
            <DeepSettingsModal
                visible={settingsVisible}
                onClose={() => setSettingsVisible(false)}
                pieceSet={pieceSet}
                onSetPieceSet={(s) => { setPieceSet(s); AsyncStorage.setItem('pieceSet', s); }}
                boardTheme={boardTheme}
                onSetBoardTheme={(t) => { setBoardTheme(t); AsyncStorage.setItem('boardTheme', t.option_name); }}
                onResetProgress={game.resetGameData}
                moveTime={game.moveTime}
                onSetMoveTime={handleSetMoveTime}
                autoAdvance={autoAdvance}
                onSetAutoAdvance={handleSetAutoAdvance}
            />

            <DepthSelectorModal
                visible={depthSelectorVisible}
                onClose={() => setDepthSelectorVisible(false)}
                currentDepth={depth}
                onSelectDepth={handleSetDepth}
            />

            <AdPlaceholderModal
                visible={showAd}
                onClose={() => setShowAd(false)}
                onRemoveAds={async () => {
                    await AdService.purchaseRemoveAds();
                    setShowAd(false);
                    alert("Ads removed.");
                }}
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
        justifyContent: 'space-between'
    },
    ratingBadge: {
        backgroundColor: '#222',
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333'
    },
    ratingText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    },
    infoContainer: {
        alignItems: 'flex-start'
    },
    infoLabel: {
        color: '#888',
        fontSize: 10,
        textTransform: 'uppercase'
    },
    infoValue: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: 'bold'
    },
    statusText: {
        fontSize: 14,
        fontWeight: 'bold',
        minWidth: 80,
        textAlign: 'right'
    },
    boardContainer: {
        marginTop: 20,
        alignItems: 'center',
        zIndex: 1
    },
    toolbar: {
        height: 80,
        backgroundColor: '#1a1a1a',
        borderTopWidth: 1,
        borderTopColor: '#333',
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    toolBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
    },
    toolText: {
        fontSize: 12,
        color: '#888'
    },
    gearContainer: {
        width: 24, height: 24, justifyContent: 'center', alignItems: 'center'
    }
});
