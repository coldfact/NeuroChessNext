import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert } from 'react-native';
import Piece from './Piece';
import { BoardTheme, PieceSet } from '../constants';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface BoardProps {
    fen: string;
    orientation: 'white' | 'black';
    onMove: (from: string, to: string) => void;
    highlights: { from?: string; to?: string };
    pieceSet: PieceSet;
    blindfold?: boolean;
    theme: BoardTheme;
    disabled?: boolean; // Block moves during blindfold countdown
}

export default function Board({
    fen, orientation, onMove, highlights, pieceSet, blindfold, theme, disabled
}: BoardProps) {
    const { width } = useWindowDimensions();
    const boardSize = Math.min(width - 32, 400); // Max width constraint
    const squareSize = boardSize / 8;
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

    // Parse FEN
    const position = useMemo(() => {
        const pos: Record<string, string> = {};
        const [placement] = fen.split(' ');
        const rows = placement.split('/');

        rows.forEach((row, rIdx) => {
            let fIdx = 0;
            for (const char of row) {
                if (/\d/.test(char)) {
                    fIdx += parseInt(char);
                } else {
                    const file = String.fromCharCode(97 + fIdx);
                    // Standard: rank 8 is top. row 0 -> rank 8
                    const rank = 8 - rIdx;
                    pos[`${file}${rank}`] = char;
                    fIdx++;
                }
            }
        });
        return pos;
    }, [fen]);

    const files = orientation === 'white' ? FILES : [...FILES].reverse();
    const ranks = orientation === 'white' ? RANKS : [...RANKS].reverse();

    const handleSquarePress = (square: string) => {
        // Block moves when disabled (during blindfold countdown)
        if (disabled) {
            Alert.alert('Wait!', 'Memorize the position first!', [{ text: 'OK' }]);
            return;
        }

        const piece = position[square];
        const isWhitePiece = piece && /^[A-Z]$/.test(piece);
        const isBlackPiece = piece && /^[a-z]$/.test(piece);
        const isMyTurn = orientation === 'white' ? isWhitePiece : isBlackPiece;

        if (selectedSquare) {
            // If tapping adjacent/same square logic
            if (square === selectedSquare) {
                // Deselect if tapping same square
                setSelectedSquare(null);
                return;
            }

            if (isMyTurn) {
                // If tapping another one of my pieces, switch selection
                setSelectedSquare(square);
                return;
            }

            // Attempt move to empty square or capture opponent
            onMove(selectedSquare, square);
            setSelectedSquare(null);
        } else if (isMyTurn) {
            // First tap - select piece (only if it's mine)
            setSelectedSquare(square);
        }
    };

    return (
        <View style={[styles.board, { width: boardSize, height: boardSize }]}>
            {ranks.map((rank, rIdx) => (
                <View key={rank} style={styles.rankRow}>
                    {files.map((file, fIdx) => {
                        const square = `${file}${rank}`;
                        const isLightSquare = (rIdx + fIdx) % 2 === 0;
                        const isSelected = selectedSquare === square;
                        const isHighlightFrom = highlights.from === square;
                        const isHighlightTo = highlights.to === square;

                        const backgroundColor = isSelected ? theme.highlight_color :
                            isHighlightFrom || isHighlightTo ? theme.highlight_color + '80' : // 50% opacity
                                isLightSquare ? theme.white_square_color : theme.black_square_color;

                        return (
                            <Pressable
                                key={square}
                                style={[
                                    styles.square,
                                    { width: squareSize, height: squareSize, backgroundColor },
                                ]}
                                onPress={() => handleSquarePress(square)}
                            >
                                {position[square] && !blindfold && (
                                    <Piece
                                        piece={position[square]}
                                        size={squareSize}
                                        set={pieceSet}
                                    />
                                )}
                                {/* Always show coordinates */}
                                {fIdx === 0 && <Text style={[styles.rankLabel, { color: isLightSquare ? theme.black_square_color : theme.white_square_color }]}>{rank}</Text>}
                                {rIdx === 7 && <Text style={[styles.fileLabel, { color: isLightSquare ? theme.black_square_color : theme.white_square_color }]}>{file}</Text>}
                            </Pressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    board: {
        flexDirection: 'column', // Stack rows vertically
        borderWidth: 2,
        borderColor: '#444',
    },
    rankRow: {
        flexDirection: 'row', // Stack squares horizontally
    },
    square: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    // Removed static square colors
    rankLabel: {
        position: 'absolute',
        top: 2,
        left: 2,
        fontSize: 10,
        opacity: 0.7,
    },
    fileLabel: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        fontSize: 10,
        opacity: 0.7,
    },
});
