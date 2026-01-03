import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Alert } from 'react-native';
import { X, BarChart2, Lock } from 'lucide-react-native';
import { NBACK_RANKS } from '../../constants';

interface LevelSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    currentLevel: number;
    onSelectLevel: (level: number) => void;
    isPremium: boolean;
    onPurchase: () => void;
}

export default function LevelSelectorModal({
    visible,
    onClose,
    currentLevel,
    onSelectLevel,
    isPremium,
    onPurchase
}: LevelSelectorModalProps) {

    const levels = Array.from({ length: 9 }, (_, i) => i + 1);

    const handleSelect = (level: number) => {
        if (level > 1 && !isPremium) {
            Alert.alert(
                "Unlock All Levels",
                "Upgrade to NeuroChess Premium to unlock N-Back levels 2-9 and more!",
                [
                    { text: "Cancel", style: "cancel" },
                    {
                        text: "Unlock",
                        onPress: () => {
                            onPurchase();
                            Alert.alert("Success!", "All N-Back levels are now unlocked.");
                        }
                    }
                ]
            );
            return;
        }
        onSelectLevel(level);
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
                            <BarChart2 color="#fff" size={20} />
                            <Text style={styles.title}>Select N-Back Level</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <View style={styles.grid}>
                        {levels.map(level => {
                            const isLocked = level > 1 && !isPremium;
                            const isActive = currentLevel === level;

                            // Static Rank Name (independent of player status)
                            const rankName = NBACK_RANKS[level] || `Level ${level}`;

                            // Label Styling: White if Active, Grey otherwise
                            const labelColor = isActive ? '#fff' : '#888';

                            return (
                                <Pressable
                                    key={level}
                                    style={[
                                        styles.option,
                                        isActive && styles.optionActive,
                                        isLocked && styles.optionLocked
                                    ]}
                                    onPress={() => handleSelect(level)}
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
                                        {level}
                                    </Text>
                                    <Text style={[
                                        styles.levelLabel,
                                        { color: labelColor }
                                    ]}>
                                        {rankName}
                                    </Text>
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
    },
    optionTextActive: {
        color: '#fff',
    },
    optionTextLocked: {
        color: '#555',
    },
    levelLabel: {
        fontSize: 12, // Larger
        fontWeight: 'bold', // Bold
        textTransform: 'uppercase',
        marginTop: 5,
        textAlign: 'center'
    },
    lockIcon: {
        position: 'absolute',
        top: 8,
        right: 8,
    }
});
