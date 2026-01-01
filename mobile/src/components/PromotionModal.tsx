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
    const symbols = color === 'white' ? PIECE_SYMBOLS_WHITE : PIECE_SYMBOLS_BLACK;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
        >
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
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-start',
        alignItems: 'center',
        paddingTop: 120, // Position near top of board
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
