import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions, Pressable, Alert } from 'react-native';
import Svg, { Line, Polygon } from 'react-native-svg';
import Piece from './Piece';
import PromotionModal from './PromotionModal';
import { BoardTheme, PieceSet } from '../constants';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

interface Arrow {
    from: string;
    to: string;
    color?: string;
}

interface BoardProps {
    fen: string;
    orientation: 'white' | 'black';
    onMove: (from: string, to: string, promotion?: string) => void;
    highlights: { from?: string; to?: string };
    pieceSet: PieceSet;
    blindfold?: boolean;
    theme: BoardTheme;
    disabled?: boolean;
    arrows?: Arrow[];
    deepInput?: boolean;
}

export default function Board({
    fen, orientation, onMove, highlights, pieceSet, blindfold, theme, disabled, arrows = [], deepInput = false
}: BoardProps) {
    const { width } = useWindowDimensions();
    const boardSize = Math.min(width - 32, 400); // Max width constraint
    const squareSize = boardSize / 8;
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: string, to: string } | null>(null);

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

    const getSquareCenter = (square: string) => {
        const file = square[0];
        const rank = square[1];
        const col = files.indexOf(file);
        const row = ranks.indexOf(rank);
        return {
            x: (col + 0.5) * squareSize,
            y: (row + 0.5) * squareSize
        };
    };

    const handleSquarePress = (square: string) => {
        // Block moves when disabled (during blindfold countdown)
        if (disabled) {
            Alert.alert('Wait!', 'Memorize the position first!', [{ text: 'OK' }]);
            return;
        }

        // Deep Input Mode: Allow clicking ANY square
        if (deepInput) {
            if (selectedSquare) {
                if (square === selectedSquare) {
                    setSelectedSquare(null);
                } else {
                    // Check promotion for Deep Mode?
                    // Usually Deep Mode is about calculation.
                    // If a pawn moves to last rank, we might need promotion.
                    // But for simplicity in V1, let's assume auto-queen or ask.
                    onMove(selectedSquare, square);
                    setSelectedSquare(null);
                }
            } else {
                setSelectedSquare(square);
            }
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
            // Check if this is a promotion move
            const fromPiece = position[selectedSquare];
            const isPawn = fromPiece?.toLowerCase() === 'p';
            const targetRank = square[1];
            const isPromotionRank = (orientation === 'white' && targetRank === '8') ||
                (orientation === 'black' && targetRank === '1');

            if (isPawn && isPromotionRank) {
                // Show promotion modal instead of making move immediately
                setPendingPromotion({ from: selectedSquare, to: square });
                setSelectedSquare(null);
            } else {
                onMove(selectedSquare, square);
                setSelectedSquare(null);
            }
        } else if (isMyTurn) {
            // First tap - select piece (only if it's mine)
            setSelectedSquare(square);
        }
    };

    const handlePromotionSelect = (piece: 'q' | 'r' | 'b' | 'n') => {
        if (pendingPromotion) {
            onMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
        }
    };

    const handlePromotionCancel = () => {
        setPendingPromotion(null);
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

            {/* Arrow Overlay */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg height={boardSize} width={boardSize}>
                    {arrows.map((arrow, i) => {
                        const start = getSquareCenter(arrow.from);
                        const end = getSquareCenter(arrow.to);
                        const color = arrow.color || '#e74c3c'; // Default Red
                        // Calculate angle for arrowhead
                        const angle = Math.atan2(end.y - start.y, end.x - start.x);
                        // Arrowhead points
                        const headLen = squareSize * 0.4;
                        const x1 = end.x - headLen * Math.cos(angle - Math.PI / 6);
                        const y1 = end.y - headLen * Math.sin(angle - Math.PI / 6);
                        const x2 = end.x - headLen * Math.cos(angle + Math.PI / 6);
                        const y2 = end.y - headLen * Math.sin(angle + Math.PI / 6);

                        // Shorten line so it doesn't stick out of arrowhead
                        const shortenLen = headLen * 0.7;
                        const lineEndX = end.x - shortenLen * Math.cos(angle);
                        const lineEndY = end.y - shortenLen * Math.sin(angle);

                        return (
                            <React.Fragment key={i}>
                                <Line
                                    x1={start.x}
                                    y1={start.y}
                                    x2={lineEndX}
                                    y2={lineEndY}
                                    stroke={color}
                                    strokeWidth={squareSize * 0.15}
                                    opacity={0.8}
                                />
                                <Polygon
                                    points={`${end.x},${end.y} ${x1},${y1} ${x2},${y2}`}
                                    fill={color}
                                    opacity={0.8}
                                />
                            </React.Fragment>
                        );
                    })}
                </Svg>
            </View>

            {/* Promotion Modal */}
            <PromotionModal
                visible={pendingPromotion !== null}
                color={orientation}
                onSelect={handlePromotionSelect}
            />
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
