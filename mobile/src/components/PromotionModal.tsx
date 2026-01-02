import React from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';

const PROMOTION_PIECES = ['q', 'r', 'b', 'n'] as const;
type PromotionPiece = typeof PROMOTION_PIECES[number];

interface PromotionModalProps {
    visible: boolean;
    color: 'white' | 'black';
    onSelect: (piece: PromotionPiece) => void;
}

// Unicode chess piece symbols
const PIECE_SYMBOLS_WHITE: Record<PromotionPiece, string> = {
    q: '♕',
    r: '♖',
    b: '♗',
    n: '♘'
};

const PIECE_SYMBOLS_BLACK: Record<PromotionPiece, string> = {
    q: '♛',
    r: '♜',
    b: '♝',
    n: '♞'
};

export default function PromotionModal({ visible, color, onSelect }: PromotionModalProps) {
    if (!visible) return null;

    const symbols = color === 'white' ? PIECE_SYMBOLS_WHITE : PIECE_SYMBOLS_BLACK;

    return (
        <View style={styles.overlay}>
            <View style={styles.container}>
                {PROMOTION_PIECES.map((piece) => (
                    <Pressable
                        key={piece}
                        style={styles.pieceButton}
                        onPress={() => onSelect(piece)}
                    >
                        <Text style={styles.pieceSymbol}>{symbols[piece]}</Text>
                    </Pressable>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 60, // Position near top of board (adjusted since it's relative to board now)
    },
    container: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        padding: 6,
        gap: 4,
        borderWidth: 1,
        borderColor: '#444',
    },
    pieceButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#2a2a2a',
        borderRadius: 6,
    },
    pieceSymbol: {
        fontSize: 28,
        color: '#fff',
    },
});
