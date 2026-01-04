import React from 'react';
import { StyleSheet, View, Pressable, ViewStyle } from 'react-native';
import Piece from '../Piece';
import { BoardTheme, PieceSet } from '../../constants';
import { PieceType } from '../../hooks/useNBackGame'; // Reusing type

export interface SequenceItem {
    piece: PieceType;
    square: number; // 0-8
}

interface SequencesGridProps {
    items: SequenceItem[]; // Items to show (usually just one during playback)
    activeSquare: number | null; // Which square is currently "lit up"
    onSquarePress: (index: number) => void;
    pieceSet: PieceSet;
    theme: BoardTheme;
    interactive: boolean;
    feedbackColor?: string | null; // For correct/wrong feedback on a specific square
    activeFeedbackSquare?: number | null;
}

export default function SequencesGrid({
    items,
    activeSquare,
    onSquarePress,
    pieceSet,
    theme,
    interactive,
    feedbackColor,
    activeFeedbackSquare
}: SequencesGridProps) {
    const squares = Array.from({ length: 9 }, (_, i) => i);

    return (
        <View style={styles.container}>
            <View style={[styles.board, { borderColor: theme.highlight_color }]}>
                {squares.map(i => {
                    const row = Math.floor(i / 3);
                    const col = i % 3;
                    const isDark = (row + col) % 2 === 1;
                    const baseColor = isDark ? theme.black_square_color : theme.white_square_color;

                    // Is there a piece to show on this square?
                    // In playback, we might show a piece transiently.
                    // In this game, usually pieces appear and disappear.
                    const item = items.find(it => it.square === i);

                    // Highlight logic
                    const isActive = activeSquare === i;
                    const isFeedbackTarget = activeFeedbackSquare === i;

                    let backgroundColor = baseColor;
                    if (isFeedbackTarget && feedbackColor) {
                        backgroundColor = feedbackColor;
                    } else if (isActive) {
                        backgroundColor = theme.highlight_color; // or a specific "lit" color
                    }

                    return (
                        <Pressable
                            key={i}
                            style={[styles.square, { backgroundColor }]}
                            onPress={() => interactive && onSquarePress(i)}
                            disabled={!interactive}
                        >
                            {item && (
                                <Piece piece={item.piece} size={80} set={pieceSet} />
                            )}

                            {/* Visual "Flash" overlay for playback if needed, 
                                but background color change is usually enough */}
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
    },
    board: {
        width: 300,
        height: 300,
        flexDirection: 'row',
        flexWrap: 'wrap',
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#444',
    },
    square: {
        width: '33.33%',
        height: '33.33%',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
