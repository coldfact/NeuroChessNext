import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Brain, Layers, ShoppingBag, RefreshCw, Check, DownloadCloud } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DatabaseService } from '../src/services/database';
import { DLC_ENDPOINT } from '../src/config';

export default function StoreScreen() {
    const router = useRouter();
    const [hasExpansion, setHasExpansion] = useState(false);
    const [hasNBackPremium, setHasNBackPremium] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        checkOwnership();
    }, []);

    const checkOwnership = async () => {
        try {
            const ownedExpansion = await AsyncStorage.getItem('dlc_puzzles_v1');
            if (ownedExpansion === 'true') {
                setHasExpansion(true);
            }

            const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');
            if (ownedNBack === 'true') {
                setHasNBackPremium(true);
            }
        } catch (e) { console.error(e); }
    };

    const handlePurchase = async (item: string) => {
        if (Platform.OS === 'web') {
            Alert.alert("Native Feature", "DLC Expansion requires a native device (iOS/Android) for database merging. It does not work in the browser.");
            return;
        }

        if (item === 'puzzles_expansion') {
            await processExpansionPurchase();
        } else if (item === 'nback_mastery') {
            await processNBackPurchase();
        } else {
            Alert.alert("Coming Soon", "This item is not yet available.");
        }
    };

    const processNBackPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Unlock N-Back Mastery (Levels 2-9) for $1.99?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        // Simulate API call
                        await new Promise(r => setTimeout(r, 1000));
                        await AsyncStorage.setItem('nback_premium_owned', 'true');
                        setHasNBackPremium(true);
                        Alert.alert("Success", "N-Back Mastery unlocked! You can now access all depth levels.");
                    }
                }
            ]
        );
    };

    const processExpansionPurchase = async () => {
        // 1. Simulate Payment
        Alert.alert(
            "Confirm Purchase",
            "Get Expansion Pack for $2.99?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        setIsDownloading(true);
                        await downloadAndInstallDLC();
                    }
                }
            ]
        );
    };

    const downloadAndInstallDLC = async () => {
        try {
            const fileUri = FileSystem.cacheDirectory + 'puzzles_expansion.sqlite';

            // 2. Download
            // Switch to downloadAsync for stability on Emulator
            console.log(`Downloading DLC from ${DLC_ENDPOINT}...`);

            // downloadAsync is simpler and often more robust for local dev servers
            const result = await FileSystem.downloadAsync(DLC_ENDPOINT, fileUri);

            if (result.status !== 200) {
                throw new Error(`Download failed with status ${result.status}`);
            }

            if (!result || !result.uri) {
                throw new Error("Download failed");
            }

            console.log('Download complete:', result.uri);
            setDownloadProgress(1); // 100%

            // 3. Install / Merge
            // Give UI a moment to show 100%
            await new Promise(r => setTimeout(r, 500));

            console.log('Merging DLC...');
            // Need to expose a text state for "Importing..." if we want, currently just stuck at 100%

            // Call Database Service
            await DatabaseService.mergeDLC(result.uri);

            // 4. Cleanup & Persist
            await FileSystem.deleteAsync(result.uri, { idempotent: true });
            await AsyncStorage.setItem('dlc_puzzles_v1', 'true');
            setHasExpansion(true);

            Alert.alert("Success!", "Expansion Pack installed. +63,000 puzzles added to your library.");

        } catch (e: any) {
            console.error("DLC Install Error:", e);
            Alert.alert("Error", "Failed to download or install expansion pack.\n" + e.message);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const handleRestore = async () => {
        // Mock restore
        const owned = await AsyncStorage.getItem('dlc_puzzles_v1');
        const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');

        let restored = false;

        if (owned === 'true') {
            setHasExpansion(true);
            restored = true;
        }
        if (ownedNBack === 'true') {
            setHasNBackPremium(true);
            restored = true;
        }

        if (restored) {
            Alert.alert("Restore", "Purchases restored.");
        } else {
            Alert.alert("Restore", "No previous purchases found.");
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.iconBtn}>
                    <ChevronLeft color="#fff" size={28} />
                </Pressable>
                <Text style={styles.headerTitle}>NeuroChess Suite</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Intro */}
                <Text style={styles.sectionTitle}>Upgrades & Extensions</Text>
                <Text style={styles.subtitle}>Enhance your training with the full suite of NeuroChess tools.</Text>

                {/* Section: Logic / Puzzles */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Brain color="#3498db" size={24} />
                        <Text style={styles.cardTitle}>NeuroChess Puzzles</Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Running out of challenges? Expand your offline database significantly.
                    </Text>

                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Expansion Pack</Text>
                            <Text style={styles.itemMeta}>+9,000 puzzles / band</Text>
                            <Text style={styles.itemSub}>Total 10,000 puzzles per rating band.</Text>
                        </View>

                        {hasExpansion ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={16} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : isDownloading ? (
                            <View style={styles.downloadingContainer}>
                                <ActivityIndicator size="small" color="#3498db" />
                                <Text style={styles.progressText}>
                                    {Math.round(downloadProgress * 100)}%
                                </Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('puzzles_expansion')}>
                                <Text style={styles.buyBtnText}>$2.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Section: Memory / N-Back */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Layers color="#9b59b6" size={24} />
                        <Text style={styles.cardTitle}>NeuroChess N-back</Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Push your working memory to the limit.
                    </Text>

                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Unlock Mastery</Text>
                            <Text style={styles.itemMeta}>Up to Depth 9</Text>
                            <Text style={styles.itemSub}>Current limit: 1 deep.</Text>
                        </View>

                        {hasNBackPremium ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={16} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('nback_mastery')}>
                                <Text style={styles.buyBtnText}>$1.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Section: Bundle */}
                <View style={[styles.card, styles.bundleCard]}>
                    <View style={styles.cardHeader}>
                        <ShoppingBag color="#f1c40f" size={24} />
                        <Text style={styles.cardTitle}>Suite Upgrade</Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Get everything at once and save.
                    </Text>

                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Upgrade All</Text>
                            <Text style={styles.itemMeta}>Includes all features</Text>
                            <Text style={styles.itemSub}>Puzzles Expansion + N-back Mastery + Future unlocks.</Text>
                        </View>
                        <Pressable style={styles.buyBtn} onPress={() => handlePurchase('bundle_all')}>
                            <Text style={styles.buyBtnText}>$3.99</Text>
                        </Pressable>
                    </View>
                </View>

                {/* Restore */}
                <Pressable style={styles.restoreBtn} onPress={handleRestore}>
                    <RefreshCw color="#888" size={16} />
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </Pressable>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#121212',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    iconBtn: {
        padding: 8,
    },
    content: {
        padding: 20,
        gap: 20,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    subtitle: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#1e1e1e',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#333',
        gap: 12,
    },
    bundleCard: {
        borderColor: '#f1c40f',
        backgroundColor: '#1e1e1e', // Maybe slight tint? keeping consistent for now
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 4,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    cardDesc: {
        color: '#ccc',
        fontSize: 14,
        lineHeight: 20,
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        backgroundColor: '#252525',
        padding: 12,
        borderRadius: 8,
    },
    itemInfo: {
        flex: 1,
        marginRight: 12,
    },
    itemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    itemMeta: {
        color: '#3498db',
        fontSize: 13,
        fontWeight: 'bold',
        marginTop: 2,
    },
    itemSub: {
        color: '#888',
        fontSize: 12,
        marginTop: 2,
    },
    buyBtn: {
        backgroundColor: '#27ae60',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        minWidth: 80,
        alignItems: 'center',
    },
    buyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    ownedBadge: {
        backgroundColor: '#2ecc71',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 6,
        minWidth: 80,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4
    },
    ownedText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    downloadingContainer: {
        minWidth: 80,
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        color: '#3498db',
        fontSize: 10,
        marginTop: 2,
        fontWeight: 'bold',
    },
    restoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 20,
        padding: 15,
    },
    restoreText: {
        color: '#888',
        fontSize: 14,
    }
});
