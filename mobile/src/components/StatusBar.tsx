import { View, Text, StyleSheet } from 'react-native';

interface StatusBarProps {
    puzzleId: string;
    puzzleRating: number;
    userRating: number;
    status: { message: string; color: string };
}

export default function StatusBar({
    puzzleId,
    puzzleRating,
    userRating,
    status,
}: StatusBarProps) {
    return (
        <View style={styles.container}>
            <Text style={styles.puzzleId}>Puzzle: {puzzleId}</Text>
            <View style={styles.ratings}>
                <Text style={styles.ratingText}>
                    You: <Text style={styles.ratingValue}>{userRating}</Text>
                </Text>
                <Text style={styles.separator}>|</Text>
                <Text style={styles.ratingText}>
                    Puzzle: <Text style={styles.ratingValue}>{puzzleRating}</Text>
                </Text>
            </View>
            <Text style={[styles.status, { color: status.color }]}>{status.message}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 10,
    },
    puzzleId: {
        color: '#3498db',
        fontSize: 16,
        fontWeight: '600',
    },
    ratings: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
    },
    ratingText: {
        color: '#888',
        fontSize: 14,
    },
    ratingValue: {
        color: '#fff',
        fontWeight: 'bold',
    },
    separator: {
        color: '#555',
    },
    status: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
});
