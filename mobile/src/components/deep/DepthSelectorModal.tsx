import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Alert } from 'react-native';
import { X, Layers, Lock } from 'lucide-react-native';

interface DepthSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    currentDepth: number;
    onSelectDepth: (depth: number) => void;
    isPremium: boolean;
    onPurchase: () => void;
}

export default function DepthSelectorModal({
    visible,
    onClose,
    currentDepth,
    onSelectDepth,
    isPremium,
    onPurchase
}: DepthSelectorModalProps) {

    const depths = Array.from({ length: 9 }, (_, i) => i + 1);

    const handleSelect = (depth: number) => {
        // Lock levels 3-9 if not premium (Only 1 and 2 are unlocked)
        if (depth >= 3 && !isPremium) {
            Alert.alert(
                "Unlock Deep Mode",
                "Upgrade to Deep Expansion to unlock Depth levels 3-9 and remove ads!",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Go to Store",
                        onPress: () => {
                            onPurchase();
                        }
                    }
                ]
            );
            return;
        }
        onSelectDepth(depth);
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerTitle}>
                            <Layers color="#fff" size={20} />
                            <Text style={styles.title}>Select Depth</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <View style={styles.grid}>
                        {depths.map(depth => {
                            const isActive = currentDepth === depth;

                            // Lock levels 3-9
                            const isLocked = depth >= 3 && !isPremium;
                            const labelColor = isActive ? '#fff' : '#888';

                            return (
                                <Pressable
                                    key={depth}
                                    style={[
                                        styles.option,
                                        isActive && styles.optionActive,
                                        isLocked && styles.optionLocked
                                    ]}
                                    onPress={() => handleSelect(depth)}
                                >
                                    {isLocked && (
                                        <View style={styles.lockIcon}>
                                            <Lock color="#666" size={16} />
                                        </View>
                                    )}
                                    <Text style={[
                                        styles.optionText,
                                        isActive && styles.optionTextActive,
                                        isLocked && styles.optionTextLocked
                                    ]}>
                                        {depth === 9 ? '9+' : depth}
                                    </Text>
                                    {/* Removed Rank Labels as requested */}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    // ... (unchanged part of modalOverlay, modalContent, header...)
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        minHeight: 400
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    headerTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center'
    },
    option: {
        width: '30%',
        aspectRatio: 1,
        backgroundColor: '#333',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#444',
    },
    optionActive: {
        backgroundColor: '#2980b9',
        borderColor: '#3498db',
    },
    optionLocked: {
        opacity: 0.7,
        backgroundColor: '#222',
        borderColor: '#333',
    },
    optionText: {
        color: '#ccc',
        fontSize: 32,
        fontWeight: 'bold',
        includeFontPadding: false,
        paddingBottom: 20, // Visual adjustment to center text (User requested 16px)
    },
    optionTextActive: {
        color: '#fff',
    },
    optionTextLocked: {
        color: '#555',
    },
    lockIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    }
});
