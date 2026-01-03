import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { NBackHistoryItem, PieceType } from '../../hooks/useNBackGame';
import Piece from '../Piece';
import { BoardTheme, PieceSet } from '../../constants';

interface Grid3x3Props {
    currentSign: NBackHistoryItem | null;
    feedback: 'correct' | 'wrong' | 'missed' | null;
    pieceSet: PieceSet;
    theme: BoardTheme;
    ghostItem?: NBackHistoryItem | null;
}

const GHOST_PIECES: Record<PieceType, string> = {
    'k': '♔',
    'q': '♕',
    'r': '♖',
    'b': '♗',
    'n': '♘',
    'p': '♙'
};

export default function Grid3x3({ currentSign, feedback, pieceSet, theme, ghostItem }: Grid3x3Props) {
    // 0-8 indices
    const squares = Array.from({ length: 9 }, (_, i) => i);

    const getPiece = (index: number) => {
        if (currentSign && currentSign.square === index) {
            return currentSign.piece;
        }
        return null;
    };

    return (
        <View style={styles.container}>
            <View style={[
                styles.board,
                { borderColor: theme.highlight_color },
                feedback === 'correct' && { borderColor: '#2ecc71', borderWidth: 3 },
                feedback === 'wrong' && { borderColor: '#e74c3c', borderWidth: 3 },
                feedback === 'missed' && { borderColor: '#e67e22', borderWidth: 3 }
            ]}>
                {squares.map(i => {
                    const piece = getPiece(i);
                    // Checkerboard pattern
                    const row = Math.floor(i / 3);
                    const col = i % 3;
                    const isDark = (row + col) % 2 === 1;
                    const backgroundColor = isDark ? theme.black_square_color : theme.white_square_color;
                    const isGhost = ghostItem?.square === i;

                    return (
                        <View key={i} style={[styles.square, { backgroundColor }]}>
                            {isGhost && ghostItem && (
                                <Text style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    left: 0,
                                    fontSize: 36,
                                    fontWeight: 'bold',
                                    color: '#4ECDC4',
                                    opacity: 0.8,
                                    zIndex: 5
                                }}>
                                    {GHOST_PIECES[ghostItem.piece]}
                                </Text>
                            )}
                            {piece && (
                                <Piece piece={piece} size={80} set={pieceSet} />
                            )}
                        </View>
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
        boxSizing: 'content-box',
    },
    square: {
        width: '33.33%', // Ensure 3 items fit
        height: '33.33%',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lightSquare: {
        backgroundColor: '#f0d9b5',
    },
    darkSquare: {
        backgroundColor: '#b58863',
    }
});
