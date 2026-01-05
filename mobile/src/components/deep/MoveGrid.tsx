import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

interface MoveGridProps {
    sanMoves: string[];
    currentIndex: number;
    visible: boolean;
}

export default function MoveGrid({ sanMoves, currentIndex, visible }: MoveGridProps) {
    const scrollViewRef = useRef<ScrollView>(null);

    // Auto-scroll to bottom when moves update
    useEffect(() => {
        if (visible && currentIndex >= 0) {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }
    }, [currentIndex, visible]);

    if (!visible) return null;

    // We only show moves up to currentIndex
    // currentIndex is 0-based index of the LAST shown move.
    // If currentIndex is -1, show nothing.
    const movesToShow = sanMoves.slice(0, currentIndex + 1);

    const replacePieceWithSymbol = (san: string) => {
        return san
            .replace('K', '♔')
            .replace('Q', '♕')
            .replace('R', '♖')
            .replace('B', '♗')
            .replace('N', '♘');
    };

    // Group into pairs (White, Black)
    const rows = [];
    for (let i = 0; i < movesToShow.length; i += 2) {
        rows.push({
            num: Math.floor(i / 2) + 1,
            white: replacePieceWithSymbol(movesToShow[i]),
            black: movesToShow[i + 1] ? replacePieceWithSymbol(movesToShow[i + 1]) : ''
        });
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerText, styles.numCol]}>#</Text>
                <Text style={styles.headerText}>White</Text>
                <Text style={styles.headerText}>Black</Text>
            </View>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                {rows.map((row, index) => (
                    <View key={index} style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
                        <Text style={[styles.numText, styles.numCol]}>{row.num}.</Text>
                        <Text style={styles.moveText}>{row.white}</Text>
                        <Text style={styles.moveText}>{row.black}</Text>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 15,
        width: '75%', // 75% width
        height: 175,
        backgroundColor: '#222',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        alignSelf: 'center',
        overflow: 'hidden',
    },
    header: {
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    headerText: {
        flex: 1,
        color: '#fff', // White header
        fontSize: 14,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    numCol: {
        flex: 0,
        width: 40, // Narrow fixed width for number
        textAlign: 'center',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 10,
    },
    row: {
        flexDirection: 'row',
        paddingVertical: 4,
        paddingHorizontal: 10,
    },
    rowEven: {
        backgroundColor: 'transparent',
    },
    rowOdd: {
        backgroundColor: '#2a2a2a',
    },
    numText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        fontVariant: ['tabular-nums'],
    },
    moveText: {
        flex: 1,
        color: '#fff', // Back to white
        fontSize: 18, // Larger for readability
        textAlign: 'center',
        fontWeight: '500',
    }
});
