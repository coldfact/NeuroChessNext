import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, ScrollView } from 'react-native';
import { X, Lock, Play } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface DepthSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    currentDepth: number;
    onSelectDepth: (depth: number) => void;
}

export default function DepthSelectorModal({ visible, onClose, currentDepth, onSelectDepth }: DepthSelectorModalProps) {
    const [maxDepth, setMaxDepth] = useState(2); // Default unlocked: 1 & 2

    useEffect(() => {
        if (visible) {
            checkUnlocks();
        }
    }, [visible]);

    const checkUnlocks = async () => {
        try {
            const storedMax = await AsyncStorage.getItem('deep_max_depth');
            if (storedMax) {
                setMaxDepth(parseInt(storedMax));
            } else {
                setMaxDepth(2);
            }
        } catch (e) { console.error(e); }
    };

    const depths = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Select Depth</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X color="#ccc" size={24} />
                        </Pressable>
                    </View>

                    <ScrollView contentContainerStyle={styles.grid}>
                        {depths.map(depth => {
                            const isLocked = depth > maxDepth;
                            const isSelected = currentDepth === depth;

                            return (
                                <Pressable
                                    key={depth}
                                    style={[
                                        styles.levelButton,
                                        isLocked && styles.levelButtonLocked,
                                        isSelected && styles.levelButtonActive
                                    ]}
                                    onPress={() => {
                                        if (!isLocked) {
                                            onSelectDepth(depth);
                                        }
                                    }}
                                >
                                    {isLocked ? (
                                        <Lock color="#555" size={24} />
                                    ) : (
                                        <Text style={[
                                            styles.levelText,
                                            isSelected && styles.levelTextActive
                                        ]}>{depth}</Text>
                                    )}
                                    {isSelected && !isLocked && (
                                        <View style={styles.activeIndicator} />
                                    )}
                                </Pressable>
                            );
                        })}
                    </ScrollView>

                    <Text style={styles.footerText}>
                        {maxDepth < 9 ? "Solve more puzzles to unlock deeper calculation levels." : "You have unlocked all levels!"}
                    </Text>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#1E1E1E',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10
    },
    header: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30
    },
    title: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        letterSpacing: 1
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#333'
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 15,
        marginBottom: 20
    },
    levelButton: {
        width: 80,
        height: 80,
        backgroundColor: '#2C3E50',
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#34495E',
    },
    levelButtonLocked: {
        backgroundColor: '#1a1a1a',
        borderColor: '#222',
    },
    levelButtonActive: {
        backgroundColor: '#2980b9',
        borderColor: '#3498db',
        shadowColor: "#3498db",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    levelText: {
        color: '#ecf0f1',
        fontSize: 32,
        fontWeight: 'bold',
    },
    levelTextActive: {
        color: '#fff',
        transform: [{ scale: 1.1 }]
    },
    activeIndicator: {
        position: 'absolute',
        bottom: -5,
        width: 20,
        height: 4,
        backgroundColor: '#fff',
        borderRadius: 2
    },
    footerText: {
        color: '#888',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 10
    }
});
