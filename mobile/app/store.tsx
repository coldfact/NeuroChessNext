import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, SafeAreaView, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ChevronLeft, Brain, Layers, ShoppingBag, RefreshCw, Check, DownloadCloud, Zap } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DatabaseService } from '../src/services/database';
import { AdService } from '../src/services/AdService';
import { DLC_ENDPOINT, DEEP_DLC_ENDPOINT } from '../src/config';

export default function StoreScreen() {
    const router = useRouter();
    const [hasExpansion, setHasExpansion] = useState(false);
    const [hasDeepExpansion, setHasDeepExpansion] = useState(false);
    const [hasNBackPremium, setHasNBackPremium] = useState(false);
    const [hasSequencesPremium, setHasSequencesPremium] = useState(false);
    const [hasRemoveAds, setHasRemoveAds] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeepDownloading, setIsDeepDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        checkOwnership();
    }, []);

    // Assets
    const PuzzlesIcon = require('../assets/icon_puzzles.png');
    const DeepIcon = require('../assets/icon_deep.png');
    const NBackIcon = require('../assets/icon_nback.png');
    const SequencesIcon = require('../assets/icon_sequences.png');
    const StoreIcon = require('../assets/icon_store.png');

    const checkOwnership = async () => {
        try {
            const ownedExpansion = await AsyncStorage.getItem('dlc_puzzles_v1');
            if (ownedExpansion === 'true') setHasExpansion(true);

            const ownedDeep = await AsyncStorage.getItem('dlc_deep_v1');
            if (ownedDeep === 'true') setHasDeepExpansion(true);

            // Suite Check
            const suite = await AsyncStorage.getItem('suite_owned');
            if (suite === 'true') {
                setHasExpansion(true);
                setHasDeepExpansion(true);
                setHasNBackPremium(true);
                setHasSequencesPremium(true);
                setHasRemoveAds(true);
            }

            const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');
            if (ownedNBack === 'true') setHasNBackPremium(true);

            const ownedSequences = await AsyncStorage.getItem('sequences_unlocked');
            if (ownedSequences === 'true') setHasSequencesPremium(true);

            const ownedAds = await AsyncStorage.getItem('remove_ads_owned');
            if (ownedAds === 'true') setHasRemoveAds(true);
        } catch (e) { console.error(e); }
    };

    const handlePurchase = async (item: string) => {
        if (Platform.OS === 'web') {
            Alert.alert("Native Feature", "Store requires a native device.");
            return;
        }

        if (item === 'puzzles_expansion') {
            await processExpansionPurchase();
        } else if (item === 'deep_expansion') { // Deep Logic
            await processDeepPurchase();
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
            "Remove All Ads for $0.99?\n(Note: Purchasing ANY other item also removes ads!)",
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
            "Get Full Suite Upgrade for $6.99?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        await new Promise(r => setTimeout(r, 1000));
                        // Unlock everything
                        await AsyncStorage.setItem('nback_premium_owned', 'true');
                        await AsyncStorage.setItem('sequences_unlocked', 'true');
                        await AsyncStorage.setItem('dlc_puzzles_v1', 'true');
                        await AsyncStorage.setItem('dlc_deep_v1', 'true');
                        await AsyncStorage.setItem('suite_owned', 'true');
                        await AdService.purchaseRemoveAds();

                        setHasNBackPremium(true);
                        setHasSequencesPremium(true);
                        setHasExpansion(true);
                        setHasDeepExpansion(true);
                        setHasRemoveAds(true);

                        // Start downloads
                        setIsDownloading(true);
                        await downloadAndInstallDLC();

                        setIsDeepDownloading(true);
                        await installDeepDLC();
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
                        await AdService.purchaseRemoveAds();
                        setHasNBackPremium(true);
                        setHasRemoveAds(true);
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
            "Get Expansion Pack for $1.99?\n(Also removes ads!)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        setIsDownloading(true);
                        await AdService.purchaseRemoveAds();
                        setHasRemoveAds(true);
                        await downloadAndInstallDLC();
                    }
                }
            ]
        );
    };

    const processDeepPurchase = async () => {
        Alert.alert(
            "Confirm Purchase",
            "Get Deep Expansion for $1.99?\n(Also removes ads!)",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Buy",
                    onPress: async () => {
                        setIsDeepDownloading(true);
                        await AdService.purchaseRemoveAds();
                        setHasRemoveAds(true);
                        await installDeepDLC();
                    }
                }
            ]
        );
    };

    const installDeepDLC = async () => {
        try {
            const fileUri = FileSystem.cacheDirectory + 'deep_expansion.sqlite';

            // Check if already installed (Default is 0)
            const available = await DatabaseService.getAvailablePuzzleCount('deep');
            if (available > 0) {
                console.log(`Deep Puzzle count is ${available}. Likely installed.`);
                setHasDeepExpansion(true);
                await AsyncStorage.setItem('dlc_deep_v1', 'true');
                setIsDeepDownloading(false); // Stop loading spinner if we return early
                Alert.alert("Success", "Deep Expansion already active. Restored access.");
                return;
            }

            console.log(`Downloading Deep DLC from ${DEEP_DLC_ENDPOINT}...`);
            const result = await FileSystem.downloadAsync(DEEP_DLC_ENDPOINT, fileUri);

            if (result.status !== 200) throw new Error(`Download failed with status ${result.status}`);
            if (!result || !result.uri) throw new Error("Download failed");

            console.log('Download complete:', result.uri);
            await new Promise(r => setTimeout(r, 500));

            console.log('Merging Deep DLC...');
            await DatabaseService.installDeepDLC(result.uri);

            await FileSystem.deleteAsync(result.uri, { idempotent: true });
            await AsyncStorage.setItem('dlc_deep_v1', 'true');
            setHasDeepExpansion(true);

            Alert.alert("Success!", "Deep Expansion installed. Ads removed.");
        } catch (e: any) {
            console.error("Deep DLC Install Error:", e);
            Alert.alert("Error", "Failed to download Deep expansion.\n" + e.message);
        } finally {
            setIsDeepDownloading(false);
        }
    };

    const downloadAndInstallDLC = async () => {
        try {
            const fileUri = FileSystem.cacheDirectory + 'puzzles_expansion.sqlite';

            // Check if already extensive
            const puzzleCount = await DatabaseService.getAvailablePuzzleCount('standard');
            if (puzzleCount > 3510) {
                console.log(`Puzzle count is ${puzzleCount}. Expansion likely already installed.`);
                setDownloadProgress(1);
                await new Promise(r => setTimeout(r, 500));
                await AsyncStorage.setItem('dlc_puzzles_v1', 'true');
                setHasExpansion(true);
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
        const owned = await AsyncStorage.getItem('dlc_puzzles_v1');
        const ownedDeep = await AsyncStorage.getItem('dlc_deep_v1');
        const ownedNBack = await AsyncStorage.getItem('nback_premium_owned');
        const ownedSequences = await AsyncStorage.getItem('sequences_unlocked');
        const ownedAds = await AsyncStorage.getItem('remove_ads_owned');

        let restored = false;

        if (owned === 'true') {
            setHasExpansion(true);
            restored = true;
        }
        if (ownedDeep === 'true') {
            setHasDeepExpansion(true);
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
                <Text style={styles.headerTitle}>NeuroChess Store</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* SUITE UPGRADE (TOP PRIORITY) */}
                <View style={[styles.compactCard, { borderColor: '#f1c40f', backgroundColor: '#2c2500' }]}>
                    <View style={styles.iconBox}>
                        <Image source={StoreIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#f1c40f' }]}>Suite Upgrade</Text>
                        <Text style={styles.compactDesc}>Unlock Everything: All Games & Remove Ads.</Text>
                    </View>

                    <View style={styles.actionBox}>
                        {hasExpansion && hasNBackPremium && hasSequencesPremium && hasRemoveAds ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={[styles.buyBtn, { backgroundColor: '#f1c40f' }]} onPress={() => handlePurchase('bundle_all')}>
                                <Text style={[styles.buyBtnText, { color: '#000' }]}>$6.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={styles.separator} />

                {/* INDIVIDUAL ITEMS */}

                {/* PUZZLES */}
                <View style={[styles.compactCard, { borderColor: '#4ECDC4' }]}>
                    <View style={styles.iconBox}>
                        <Image source={PuzzlesIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#4ECDC4' }]}>Puzzles Expansion</Text>
                        <Text style={styles.compactDesc}>70,000 puzzles (from 3,500) & Remove Ads.</Text>
                    </View>
                    <View style={styles.actionBox}>
                        {hasExpansion ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : isDownloading ? (
                            <ActivityIndicator size="small" color="#4ECDC4" />
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('puzzles_expansion')}>
                                <Text style={styles.buyBtnText}>$1.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* DEEP MODE */}
                <View style={[styles.compactCard, { borderColor: '#3498db' }]}>
                    <View style={styles.iconBox}>
                        <Image source={DeepIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#3498db' }]}>Deep Expansion</Text>
                        <Text style={styles.compactDesc}>60k Deep Puzzles (4+ moves) & Remove Ads.</Text>
                    </View>
                    <View style={styles.actionBox}>
                        {hasDeepExpansion ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : isDeepDownloading ? (
                            <ActivityIndicator size="small" color="#3498db" />
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('deep_expansion')}>
                                <Text style={styles.buyBtnText}>$1.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* SEQUENCES (Moved above N-Back) */}
                <View style={[styles.compactCard, { borderColor: '#00A8E8' }]}>
                    <View style={styles.iconBox}>
                        <Image source={SequencesIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#00A8E8' }]}>Sequences Mastery</Text>
                        <Text style={styles.compactDesc}>Unlock Long Sequences & Remove Ads.</Text>
                    </View>
                    <View style={styles.actionBox}>
                        {hasSequencesPremium ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('sequences_mastery')}>
                                <Text style={styles.buyBtnText}>$1.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* N-BACK */}
                <View style={[styles.compactCard, { borderColor: '#9b59b6' }]}>
                    <View style={styles.iconBox}>
                        <Image source={NBackIcon} style={styles.gameIcon} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#9b59b6' }]}>N-Back Mastery</Text>
                        <Text style={styles.compactDesc}>Unlock Levels 2-9 & Remove Ads.</Text>
                    </View>
                    <View style={styles.actionBox}>
                        {hasNBackPremium ? (
                            <View style={styles.ownedBadge}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={styles.buyBtn} onPress={() => handlePurchase('nback_mastery')}>
                                <Text style={styles.buyBtnText}>$1.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>

                <View style={styles.separator} />

                {/* REMOVE ADS (Minimal) */}
                <View style={[styles.compactCard, { borderColor: '#555', backgroundColor: '#222' }]}>
                    <View style={[styles.iconBox, { backgroundColor: '#333', borderWidth: 0 }]}>
                        <Zap color="#aaa" size={24} />
                    </View>
                    <View style={styles.compactInfo}>
                        <Text style={[styles.compactTitle, { color: '#aaa' }]}>Remove Ads Only</Text>
                        <Text style={styles.compactDesc}>Included with any purchase above.</Text>
                    </View>
                    <View style={styles.actionBox}>
                        {hasRemoveAds ? (
                            <View style={[styles.ownedBadge, { backgroundColor: '#555' }]}>
                                <Check color="#fff" size={14} />
                                <Text style={styles.ownedText}>Owned</Text>
                            </View>
                        ) : (
                            <Pressable style={[styles.buyBtn, { backgroundColor: '#555' }]} onPress={() => handlePurchase('remove_ads')}>
                                <Text style={styles.buyBtnText}>$0.99</Text>
                            </Pressable>
                        )}
                    </View>
                </View>


                {/* Restore */}
                <Pressable style={styles.restoreBtn} onPress={handleRestore}>
                    <RefreshCw color="#666" size={14} />
                    <Text style={styles.restoreText}>Restore Purchases</Text>
                </Pressable>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#222',
        backgroundColor: '#111'
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
        padding: 16,
        gap: 12, // Compact gap
    },
    separator: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 5,
    },

    // COMPACT CARD STYLE
    compactCard: {
        flexDirection: 'row',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        height: 70, // Fixed small height
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 8,
        overflow: 'hidden',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000'
    },
    gameIcon: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    compactInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    compactTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    compactDesc: {
        color: '#888',
        fontSize: 11,
        lineHeight: 14,
        marginRight: 4
    },
    actionBox: {
        minWidth: 70,
        alignItems: 'flex-end',
        justifyContent: 'center'
    },

    // BUTTONS
    buyBtn: {
        backgroundColor: '#27ae60',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        minWidth: 70,
        alignItems: 'center',
    },
    buyBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 13,
    },
    ownedBadge: {
        backgroundColor: '#27ae60',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        opacity: 0.8
    },
    ownedText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
    },

    restoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 20,
        padding: 10,
    },
    restoreText: {
        color: '#666',
        fontSize: 12,
    }
});
