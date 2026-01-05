import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, Text, Pressable, Linking } from 'react-native';
import { ExternalLink, Heart, Home } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter, useFocusEffect } from 'expo-router';
import Board from '../../src/components/Board';
import Controls from '../../src/components/Controls';
import DeepBottomToolbar from '../../src/components/deep/DeepBottomToolbar';
import DeepSettingsModal from '../../src/components/deep/DeepSettingsModal';
import DepthSelectorModal from '../../src/components/deep/DepthSelectorModal';
import BandSelectorModal from '../../src/components/BandSelectorModal';
import { useDeepGame } from '../../src/hooks/useDeepGame';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../../src/constants';
import { AdService } from '../../src/services/AdService';
import AdPlaceholderModal from '../../src/components/shared/AdPlaceholderModal';

export default function DeepGameScreen() {
    const router = useRouter();
    const [band, setBand] = useState('All');
    const [depth, setDepth] = useState(1);
    const [autoAdvance, setAutoAdvance] = useState(false);
    const [isPremium, setIsPremium] = useState(false);

    // Load config before game init
    const [configLoaded, setConfigLoaded] = useState(false);

    useEffect(() => {
        (async () => {
            const savedDepth = await AsyncStorage.getItem('deep_current_depth');
            if (savedDepth) setDepth(parseInt(savedDepth));

            const savedBand = await AsyncStorage.getItem('deep_band');
            if (savedBand) setBand(savedBand);

            const savedAuto = await AsyncStorage.getItem('deep_auto_advance');
            if (savedAuto === 'true') setAutoAdvance(true);

            setConfigLoaded(true);
        })();
    }, []);

    // Check Premium Status on Focus (in case they just bought it)
    useFocusEffect(
        useCallback(() => {
            // Check N-Back Premium or Suite as proxy for now? 
            // Or use a specific 'deep_unlocked' key?
            // User said: "Unlock begins at 4...". In Sequences it was 'sequences_unlocked'.
            // Let's use 'deep_unlocked' for now.
            // AND also check 'suite_owned'
            const checkPremium = async () => {
                const suite = await AsyncStorage.getItem('suite_owned');
                const deep = await AsyncStorage.getItem('deep_unlocked');
                setIsPremium(suite === 'true' || deep === 'true');
            };
            checkPremium();
        }, [])
    );

    const game = useDeepGame(depth, band, autoAdvance);

    // Visual Settings
    const [pieceSet, setPieceSet] = useState<PieceSet>('cburnett');
    const [boardTheme, setBoardTheme] = useState<BoardTheme>(BOARD_THEMES[0]);



    // UI Modals
    const [settingsVisible, setSettingsVisible] = useState(false);
    const [depthSelectorVisible, setDepthSelectorVisible] = useState(false);
    const [bandSelectorVisible, setBandSelectorVisible] = useState(false);

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
            if (savedMoveTime) game.setMoveTime(parseFloat(savedMoveTime));
        })();
    }, []);

    // Save Handlers
    const handleSetDepth = (d: number) => {
        setDepth(d);
        AsyncStorage.setItem('deep_current_depth', String(d));
        setDepthSelectorVisible(false);
        // Reload puzzle
        game.nextPuzzle();
    };

    const handleSetBand = (newBand: string) => {
        setBand(newBand);
        AsyncStorage.setItem('deep_band', newBand);
        setBandSelectorVisible(false);
        game.nextPuzzle();
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
            if (!adShownForCurrentPuzzle && !isPremium) {
                setAdShownForCurrentPuzzle(true);
                (async () => {
                    const shouldShow = await AdService.incrementGameCount();
                    if (shouldShow) setShowAd(true);
                })();
            }
        }
    }, [game.status.message, adShownForCurrentPuzzle, isPremium]);


    if (!configLoaded) return null;

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar style="light" />

            {/* Header - EXACT Copy from Puzzles */}
            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <Pressable
                        onPress={() => router.back()}
                        style={{ padding: 10, marginRight: 5 }}
                        hitSlop={10}
                    >
                        <Home color="#888" size={24} />
                    </Pressable>

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
                    blindfold={!game.showMoves} // Use blindfold prop to hide/show pieces if that's what "Moves" toggle means? 
                    // Wait, "Moves" icon is ListOrdered. 
                    // Does "Visible -> Moves" mean Show/Hide MOVES LIST or PIECES?
                    // User said: "Footer change 2: replace the Visible toggle with Moves toggle... use this icon list-ordered".
                    // "Visible" toggle in Puzzles toggles BLINDFOLD (hiding pieces).
                    // If we replace it with "Moves toggle", it implies showing/hiding the Move List (SAN).
                    // But usually Deep training involves NOT moving pieces on the board...
                    // However, "Deep" description: "Follow moves in head, make final move."
                    // Puzzles are static.
                    // `useDeepGame` has `showMoves` state.
                    // If showMoves is TRUE, maybe we show arrows? Or helper?
                    // Or maybe we show the Move List text?
                    // But there is no Move List UI component in Puzzles.
                    // The Puzzles "Visible" toggle hides PIECES.
                    // If I replace "Visible" with "Moves", maybe it toggles Piece Visibility?
                    // But the icon is "ListOrdered". That strongly suggests a Move List (1. e4 e5).
                    // If so, where do we display the moves?
                    // Or maybe "Moves" toggle means "Show/Hide the MOVES performed so far"?
                    // Let's assume it controls `blindfold` prop on Board to hide pieces for now as a fallback if not specified, 
                    // BUT "Visible => Moves" suggests a change in function.
                    // "Follow moves in head" -> This prevents seeing pieces moves?
                    // Wait, `useDeepGame` attempts to animate opponent moves. `game.move(...)`.
                    // If we want to follow in head, maybe the pieces DON'T move on board?
                    // That would be `showMoves = false`?
                    // Let's look at `useDeepGame`:
                    // It does `game.move()` which updates FEN.
                    // If we want to hide that, we'd need to keep FEN static?
                    // Or maybe `showMoves` toggles Piece Visibility (Blindfold) so you have to track in head?
                    // The icon `ListOrdered` is confusing if it means Blindfold. `Eye/EyeOff` is for Blindfold.
                    // Maybe the USER wants a Move List to appear on screen?
                    // "Wire up Show/Hide Moves Toggle" was in the todo.
                    // I will leave `blindfold={!game.showMoves}` for now, effectively using it as a Blindfold toggle but named Moves, 
                    // UNLESS `ListOrdered` implies seeing the textual history.
                    // Given "Follow moves in head", seeing the text list is a common helper.
                    // But if I don't implement a text list, then it does nothing.
                    // I'll assume it toggles Piece Visibility (Blindfold) for now, as that's what it replaced.
                    // Wait, User said "replace the Visible toggle with Moves toggle". Visible toggle had Eye/EyeOff.
                    // If I change icon to ListOrdered, it makes no sense for Blindfold.
                    // I will unimplemented "Moves" function (no op) or show a placeholder Move List if possible.
                    // But for now, I'll link it to `blindfold` on Board just to give it SOME effect (Hide Pieces).
                    // Actually, if "Deep" training is about calculation, maybe you shouldn't see the pieces APART from the start position?
                    // Let's rely on `useDeepGame` logic.
                    // I'll pass `blindfold={false}` to Board for now and let `showMoves` do nothing until clarified, OR render a simple move list.
                    // I'll render a simple Move List overlay if `showMoves` is true? 
                    // No, standard Deep training usually hides the pieces after start.
                    // I'll make it toggle Blindfold for now, as that's the safest 'core' mechanic mapped to the previous button.
                    blindfold={!game.showMoves}
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

            {/* ... */}
            <DeepBottomToolbar
                band={band}
                onOpenBandSelector={() => setBandSelectorVisible(true)}
                depth={depth}
                onOpenDepthSelector={() => setDepthSelectorVisible(true)}
                showMoves={game.showMoves}
                onToggleShowMoves={() => game.setShowMoves(!game.showMoves)}
                onOpenSettings={() => setSettingsVisible(true)}
            />

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
                isPremium={isPremium}
                onPurchase={() => router.push('/store')}
            />

            <BandSelectorModal
                visible={bandSelectorVisible}
                onClose={() => setBandSelectorVisible(false)}
                currentBand={band}
                onSelectBand={handleSetBand}
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
    headerWrapper: {
        alignItems: 'center',
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        padding: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
        width: '100%',
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
        marginLeft: 15,
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
    boardContainer: {
        marginTop: 20,
        alignItems: 'center',
        zIndex: 1
    },
});
