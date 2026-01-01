import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Play } from 'lucide-react-native';

export default function HomeScreen() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <Text style={styles.title}>NeuroChess</Text>
            <Text style={styles.subtitle}>Chess Puzzle Trainer</Text>

            <Pressable
                style={styles.startButton}
                onPress={() => router.push('/game')}
            >
                <Play color="#fff" size={24} />
                <Text style={styles.buttonText}>Start Training</Text>
            </Pressable>

            <View style={styles.statsContainer}>
                <Text style={styles.statLabel}>Your Rating</Text>
                <Text style={styles.statValue}>1200</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    title: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 18,
        color: '#888',
        marginBottom: 60,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#2980b9',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        marginBottom: 40,
    },
    buttonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
    },
    statsContainer: {
        alignItems: 'center',
    },
    statLabel: {
        color: '#666',
        fontSize: 14,
    },
    statValue: {
        color: '#f1c40f',
        fontSize: 32,
        fontWeight: 'bold',
    },
});
