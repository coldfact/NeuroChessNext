import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, Grid3X3, Trophy, ShoppingBag } from 'lucide-react-native';

export default function Launcher() {
    const router = useRouter();

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.title}>NeuroChess</Text>
                <Text style={styles.subtitle}>Train Your Brain</Text>
            </View>

            <View style={styles.grid}>
                {/* Main Feature: Puzzles */}
                <Pressable
                    style={[styles.card, styles.cardLarge]}
                    onPress={() => router.push('/puzzles')}
                >
                    <View style={styles.iconContainer}>
                        <Brain color="#f1c40f" size={40} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.cardTitle}>Puzzles</Text>
                        <Text style={styles.cardDesc}>Pattern Recognition & Calculation</Text>
                    </View>
                </Pressable>

                {/* Future Feature: N-Back */}
                <View style={[styles.card, styles.cardDisabled]}>
                    <View style={styles.iconContainer}>
                        <Grid3X3 color="#555" size={32} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#555' }]}>N-Back</Text>
                        <Text style={styles.cardDesc}>Memory Mastery (Coming Soon)</Text>
                    </View>
                </View>

                {/* Future Feature: Deep */}
                <View style={[styles.card, styles.cardDisabled]}>
                    <View style={styles.iconContainer}>
                        <Trophy color="#555" size={32} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#555' }]}>Deep Calc</Text>
                        <Text style={styles.cardDesc}>Visualization Training (Coming Soon)</Text>
                    </View>
                </View>

                {/* DLC Store */}
                <Pressable
                    style={[styles.card, { marginTop: 20, borderColor: '#f39c12', borderWidth: 1 }]}
                    onPress={() => router.push('/store')}
                >
                    <View style={styles.iconContainer}>
                        <ShoppingBag color="#f39c12" size={32} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={[styles.cardTitle, { color: '#f39c12' }]}>Store</Text>
                        <Text style={styles.cardDesc}>Get Expansion Packs</Text>
                    </View>
                </Pressable>
            </View>

            <View style={styles.footer}>
                <Text style={styles.version}>v1.0.0 (Suite Edition)</Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    title: {
        fontSize: 42,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
        textTransform: 'uppercase',
        letterSpacing: 3,
    },
    grid: {
        padding: 20,
        gap: 15,
    },
    card: {
        backgroundColor: '#222',
        borderRadius: 16,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
    },
    cardLarge: {
        backgroundColor: '#2a2a2a',
        borderColor: '#444',
        paddingVertical: 30,
    },
    cardDisabled: {
        opacity: 0.6,
        borderColor: '#222',
        backgroundColor: '#1a1a1a',
    },
    iconContainer: {
        width: 60,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContent: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#eee',
        marginBottom: 4,
    },
    cardDesc: {
        fontSize: 14,
        color: '#888',
    },
    footer: {
        marginTop: 'auto',
        alignItems: 'center',
        padding: 20,
    },
    version: {
        color: '#444',
        fontSize: 12,
    }
});
