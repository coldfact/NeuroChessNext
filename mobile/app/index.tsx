import { View, Text, StyleSheet, Pressable, ScrollView, Image, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

// Assets (New Diagrammatic White Icons)
const PuzzlesIcon = require('../assets/icon_puzzles.png');
const NBackIcon = require('../assets/icon_nback.png');
const DeepIcon = require('../assets/icon_deep.png');
const CombosIcon = require('../assets/icon_combos.png');
const SequencesIcon = require('../assets/icon_sequences.png');
const TutorialsIcon = require('../assets/icon_tutorials.png');
const StoreIcon = require('../assets/icon_store.png');

export default function Launcher() {
    const router = useRouter();

    const handleCombos = () => {
        Alert.alert("Coming Soon", "NeuroChess Combos is currently in development. Stay tuned!");
    };

    const handleTutorials = () => {
        Alert.alert("Coming Soon", "Interactive tutorials and support guides will be available here.");
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Header - Centered */}
                <View style={styles.header}>
                    <Text style={styles.title}>NeuroChess</Text>
                    <Text style={styles.subtitle}>TRAIN YOUR CHESS BRAIN</Text>
                </View>

                {/* 1. PUZZLES */}
                <Pressable
                    style={[styles.card, { borderColor: '#4ECDC4' }]}
                    onPress={() => router.push('/puzzles')}
                >
                    <View style={styles.iconContainer}>
                        <Image source={PuzzlesIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#4ECDC4' }]}>Puzzles</Text>
                        <Text style={styles.cardDesc}>Short, blindfold-ready puzzles. Train focus, recall, and board vision.</Text>
                    </View>
                </Pressable>

                {/* 2. DEEP */}
                <Pressable
                    style={[styles.card, { borderColor: '#f1c40f' }]}
                    onPress={() => router.push('/deep')}
                >
                    <View style={styles.iconContainer}>
                        <Image source={DeepIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#f1c40f' }]}>Deep</Text>
                        <Text style={styles.cardDesc}>Long calculation puzzles. Follow variations using arrows only.</Text>
                    </View>
                </Pressable>

                {/* 3. SEQUENCES (NEW) */}
                <Pressable
                    style={[styles.card, { borderColor: '#00A8E8' }]}
                    onPress={() => router.push('/sequences')}
                >
                    <View style={styles.iconContainer}>
                        <Image source={SequencesIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#00A8E8' }]}>Sequences</Text>
                        <Text style={styles.cardDesc}>Follow growing move sequences. Train serial spatial memory.</Text>
                    </View>
                </Pressable>

                {/* 4. N-BACK */}
                <Pressable
                    style={[styles.card, { borderColor: '#9b59b6' }]}
                    onPress={() => router.push('/nback')}
                >
                    <View style={styles.iconContainer}>
                        <Image source={NBackIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#9b59b6' }]}>N-Back</Text>
                        <Text style={styles.cardDesc}>The classic N-Back working memory game, rebuilt with chess pieces.</Text>
                    </View>
                </Pressable>

                {/* 5. COMBOS (Coming Soon) */}
                <Pressable
                    style={[styles.card, { borderColor: '#e67e22', opacity: 0.8 }]}
                    onPress={handleCombos}
                >
                    <View style={styles.iconContainer}>
                        <Image source={CombosIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#e67e22' }]}>Combos</Text>
                        <Text style={styles.cardDesc}>Decoder-style concentration training. (Coming Soon)</Text>
                    </View>
                </Pressable>

                {/* Spacer */}
                <View style={{ height: 5 }} />

                {/* SECONDARY ITEMS (Tutorials & Store) - Side-by-Side Compact */}
                <View style={styles.secondaryRow}>

                    {/* TUTORIALS & SUPPORT */}
                    <Pressable
                        style={[styles.miniCard, { borderColor: '#95a5a6' }]}
                        onPress={handleTutorials}
                    >
                        <Image source={TutorialsIcon} style={styles.miniIcon} />
                        <View style={styles.miniCardContent}>
                            <Text style={[styles.miniCardTitle, { color: '#95a5a6' }]}>Tutorials</Text>
                            <Text style={styles.miniCardDesc}>Guides & Help</Text>
                        </View>
                    </Pressable>

                    {/* STORE */}
                    <Pressable
                        style={[styles.miniCard, { borderColor: '#2ecc71' }]}
                        onPress={() => router.push('/store')}
                    >
                        <Image source={StoreIcon} style={styles.miniIcon} />
                        <View style={styles.miniCardContent}>
                            <Text style={[styles.miniCardTitle, { color: '#2ecc71' }]}>Store</Text>
                            <Text style={styles.miniCardDesc}>Expansions</Text>
                        </View>
                    </Pressable>

                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    scrollContent: {
        padding: 16, // Reduced from 20
        gap: 10, // Reduced from 12
        paddingBottom: 20,
    },
    header: {
        marginBottom: 10, // Reduced from 15
        marginTop: 5,
        alignItems: 'center',
    },
    title: {
        color: '#fff',
        fontSize: 32, // Slightly smaller header to save space (was 36)
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    subtitle: {
        color: '#888',
        fontSize: 12, // Reduced from 14
        letterSpacing: 2,
        marginTop: 2,
        textTransform: 'uppercase'
    },

    // Main Game Cards
    card: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 16, // Reduced from 20
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        minHeight: 85, // Reduced from 100
    },
    iconContainer: {
        width: 60, // Slightly smaller (was 65)
        height: 60,
        borderRadius: 12,
        marginRight: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    gameIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 20, // Reduced from 22
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4, // Reduced from 6
    },
    cardDesc: {
        color: '#bbb',
        fontSize: 13, // Reduced from 14
        lineHeight: 18,
    },

    // Secondary Items (Tutorials / Store)
    secondaryRow: {
        flexDirection: 'row',
        gap: 10,
    },
    miniCard: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#151515',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        height: 60, // Reduced from 70
    },
    miniIcon: {
        width: 28, // Reduced from 32
        height: 28,
        resizeMode: 'cover',
        borderRadius: 6,
        marginRight: 8,
    },
    miniCardContent: {
        flex: 1,
    },
    miniCardTitle: {
        fontSize: 14, // Reduced from 16
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 0,
    },
    miniCardDesc: {
        color: '#888',
        fontSize: 11, // Reduced from 12
        lineHeight: 12,
    }
});
