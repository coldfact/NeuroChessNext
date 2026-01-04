import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Brain, Layers, ShoppingBag, RefreshCw, Check, DownloadCloud, Zap } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DatabaseService } from '../src/services/database';
import { AdService } from '../src/services/AdService';
import { DLC_ENDPOINT } from '../src/config';

export default function StoreScreen() {
    const router = useRouter();
    const [hasExpansion, setHasExpansion] = useState(false);
    const [hasNBackPremium, setHasNBackPremium] = useState(false);
    const [hasSequencesPremium, setHasSequencesPremium] = useState(false);
    const [hasRemoveAds, setHasRemoveAds] = useState(false);
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
            } else {
                const suite = await AsyncStorage.getItem('suite_owned');
                if (suite === 'true') setHasExpansion(true);
            }

            const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');
            if (ownedNBack === 'true') setHasNBackPremium(true);

            const ownedSequences = await AsyncStorage.getItem('sequences_unlocked');
            if (ownedSequences === 'true') setHasSequencesPremium(true);

            const ownedAds = await AsyncStorage.getItem('remove_ads_owned');
            if (ownedAds === 'true') setHasRemoveAds(true);

            // Also check implicit ownership (Bundle logic handled by AdService)
            // But here we want to show specific badges. 
            // If they bought the bundle, they own everything.
            // For now, let's keep it simple key-based.
        } catch (e) { console.error(e); }
    };

    const handlePurchase = async (item: string) => {
        if (Platform.OS === 'web') {
            Alert.alert("Native Feature", "Store requires a native device.");
            return;
        }

        if (item === 'puzzles_expansion') {
            await processExpansionPurchase();
        } else if (item === 'nback_mastery') {
            await processNBackPurchase();
        } else if (item === 'sequences_mastery') {
            await processSequencesPurchase();
        } else if (item === 'remove_ads') {
            await processRemoveAdsPurchase();
        } else if (item === 'bundle_all') {
            await processBundlePurchase();
        } else {
            Alert.alert("Coming Soon", "This item is not yet available.");
        }
    };

    const processRemoveAdsPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Remove All Ads for $2.99?\n(Note: Purchasing ANY other item also removes ads!)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        await AdService.purchaseRemoveAds();
                        setHasRemoveAds(true);
                        Alert.alert("Success", "Ads removed forever!");
                    }
                }
            ]
        );
    };

    const processBundlePurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Get Full Suite Upgrade for $3.99?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        // Unlock everything
                        await AsyncStorage.setItem('nback_premium_owned', 'true');
                        await AsyncStorage.setItem('sequences_unlocked', 'true');
                        await AsyncStorage.setItem('suite_owned', 'true');
                        await AdService.purchaseRemoveAds();
                        setHasNBackPremium(true);
                        setHasSequencesPremium(true);
                        setHasRemoveAds(true);

                        // Start download for puzzles
                        setIsDownloading(true);
                        await downloadAndInstallDLC();
                    }
                }
            ]
        );
    };

    const processNBackPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Unlock N-Back Mastery (Levels 2-9) for $1.99?\n(Also removes ads!)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        await AsyncStorage.setItem('nback_premium_owned', 'true');
                        setHasNBackPremium(true);
                        Alert.alert("Success", "N-Back Mastery unlocked! Ads removed.");
                    }
                }
            ]
        );
    };

    const processSequencesPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Unlock Sequences Mastery (Moves 4-9) for $1.99?\n(Also removes ads!)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        await AsyncStorage.setItem('sequences_unlocked', 'true');
                        await AsyncStorage.setItem('remove_ads_owned', 'true');
                        await AdService.purchaseRemoveAds();
                        setHasSequencesPremium(true);
                        setHasRemoveAds(true);
                        Alert.alert("Success", "Sequences Mastery unlocked! Ads removed.");
                    }
                }
            ]
        );
    };

    const processExpansionPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Get Expansion Pack for $2.99?\n(Also removes ads!)",
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

            // Check if already extensive (e.g. Nuke logic doesn't clear DB, but user wants idempotency)
            // But wait, if Nuke clears "dlc_puzzles_v1" key, we don't want to re-merge if the DB still has them.
            // Or maybe Nuke DOESN'T clear Puzzles DB table (it doesn't, only user_progress).
            // So we check count.
            const puzzleCount = await DatabaseService.getPuzzleCount();
            if (puzzleCount > 7000) {
                console.log(`Puzzle count is ${puzzleCount}. Expansion likely already installed.`);
                setDownloadProgress(1);
                await new Promise(r => setTimeout(r, 500));
                await AsyncStorage.setItem('dlc_puzzles_v1', 'true');
                setHasExpansion(true);
                // If called from bundle, we still want to proceed with other unlocks (which are synchronous before this)
                // But for this function, we can just return or show success.
                Alert.alert("Success", "Expansion already active. Restored access.");
                return;
            }

            console.log(`Downloading DLC from ${DLC_ENDPOINT}...`);
            const result = await FileSystem.downloadAsync(DLC_ENDPOINT, fileUri);

            if (result.status !== 200) throw new Error(`Download failed with status ${result.status}`);
            if (!result || !result.uri) throw new Error("Download failed");

            console.log('Download complete:', result.uri);
            setDownloadProgress(1); // 100%
            await new Promise(r => setTimeout(r, 500));

            console.log('Merging DLC...');
            await DatabaseService.mergeDLC(result.uri);

            await FileSystem.deleteAsync(result.uri, { idempotent: true });
            await AsyncStorage.setItem('dlc_puzzles_v1', 'true');
            setHasExpansion(true);

            Alert.alert("Success!", "Expansion Pack installed. Ads removed.");

        } catch (e: any) {
            console.error("DLC Install Error:", e);
            Alert.alert("Error", "Failed to download expansion pack.\n" + e.message);
        } finally {
            setIsDownloading(false);
            setDownloadProgress(0);
        }
    };

    const handleRestore = async () => {
        // Mock restore
        const owned = await AsyncStorage.getItem('dlc_puzzles_v1');
        const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');
        const ownedSequences = await AsyncStorage.getItem('sequences_unlocked');
        const ownedAds = await AsyncStorage.getItem('remove_ads_owned');

        let restored = false;

        if (owned === 'true') {
            setHasExpansion(true);
            restored = true;
        }
        if (ownedNBack === 'true') {
            setHasNBackPremium(true);
            restored = true;
        }
        if (ownedSequences === 'true') {
            setHasSequencesPremium(true);
            restored = true;
        }
        if (ownedAds === 'true') {
            setHasRemoveAds(true);
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
                <Text style={styles.sectionTitle}>Store</Text>

                {/* [NEW] Remove Ads - Top Item */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Zap color="#f1c40f" size={24} />
                        <Text style={styles.cardTitle}>Remove All Ads</Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Remove all advertisements from NeuroChess.
                        Note: Purchasing ANY premium item below will ALSO remove ads automatically!
                    </Text>

                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Ad-Free Experience</Text>
                            <Text style={styles.itemMeta}>Permanent Unlock</Text>
                        </View>

                        {hasRemoveAds || hasExpansion || hasNBackPremium ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={16} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('remove_ads')}>
                                <Text style={styles.buyBtnText}>$2.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Section: Logic / Puzzles */}
                <Text style={styles.sectionTitle}>Upgrades</Text>
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
                            <Text style={styles.itemSub}>Includes Ad Removal.</Text>
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
                            <Text style={styles.itemSub}>Includes Ad Removal.</Text>
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

                {/* Section: Sequences (Above N-Back Mastery per request? User said "above the Neurochess unlock box" - assuming "Unlock N-Back Mastery" is one. Or maybe "Upgrades" section. Putting it nearby N-Back) */}
                <View style={[styles.card, { borderColor: '#4ECDC4' }]}>
                    <View style={styles.cardHeader}>
                        <Brain color="#4ECDC4" size={24} />
                        <Text style={styles.cardTitle}>NeuroChess Sequences</Text>
                    </View>
                    <Text style={styles.cardDesc}>
                        Master the flow of pieces. Unlock extended sequence lengths.
                    </Text>

                    <View style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                            <Text style={styles.itemTitle}>Sequences Mastery</Text>
                            <Text style={styles.itemMeta}>Unlock Moves 4-9</Text>
                            <Text style={styles.itemSub}>Includes Ad Removal.</Text>
                        </View>

                        {hasSequencesPremium ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={16} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('sequences_mastery')}>
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
                            <Text style={styles.itemSub}>Puzzles Expansion + N-back Mastery + Ads Removed.</Text>
                        </View>
                        {hasExpansion && hasNBackPremium && hasSequencesPremium && hasRemoveAds ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={16} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('bundle_all')}>
                                <Text style={styles.buyBtnText}>$3.99</Text>
                            </Pressable>
                        )}
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
        backgroundColor: '#1e1e1e',
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
