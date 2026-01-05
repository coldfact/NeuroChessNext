import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, Alert } from 'react-native';
import { X, BarChart2, Lock } from 'lucide-react-native';
import { NBACK_RANKS } from '../../constants';

interface SequencesLevelModalProps {
    visible: boolean;
    onClose: () => void;
    currentLevel: number;
    onSelectLevel: (level: number) => void;
    isPremium: boolean;
    onPurchase: () => void;
}

export default function SequencesLevelModal({
    visible,
    onClose,
    currentLevel,
    onSelectLevel,
    isPremium,
    onPurchase
}: SequencesLevelModalProps) {

    const levels = Array.from({ length: 9 }, (_, i) => i + 1);

    const handleSelect = (level: number) => {
        // Lock levels 4-9 if not premium
        if (level >= 4 && !isPremium) {
            Alert.alert(
                "Unlock Sequences Mastery",
                "Upgrade to unlock Sequences lengths 4-9 and remove ads!",
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
                            <Text style={styles.title}>Select Sequence Length</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <View style={styles.grid}>
                        {levels.map(level => {
                            const isActive = currentLevel === level;

                            // Lock levels 4-9
                            const isLocked = level >= 4 && !isPremium;

                            // Re-use NBACK_RANKS for titles to ensure consistency ("Beginner", "Amateur", etc.)
                            const rankName = NBACK_RANKS[level] || `Level ${level}`;
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
        fontSize: 12,
        fontWeight: 'bold',
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
