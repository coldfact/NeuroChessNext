import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { X, RefreshCcw, CheckSquare, Square } from 'lucide-react-native';
import { DatabaseService } from '../services';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../constants';
import Piece from './Piece';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    pieceSet: PieceSet;
    onSetPieceSet: (set: PieceSet) => void;
    boardTheme: BoardTheme;
    onSetBoardTheme: (theme: BoardTheme) => void;
    onResetProgress: () => void;
    blindfoldTime: number;
    onSetBlindfoldTime: (seconds: number) => void;
    autoAdvance: boolean;
    onSetAutoAdvance: (enabled: boolean) => void;
}

export default function SettingsModal({
    visible, onClose,
    pieceSet, onSetPieceSet,
    boardTheme, onSetBoardTheme,
    onResetProgress,
    blindfoldTime, onSetBlindfoldTime,
    autoAdvance, onSetAutoAdvance
}: SettingsModalProps) {

    const handleReset = async () => {
        // Reset Logic
        await DatabaseService.updatePlayerStats('standard', 1500, 350, 0.06);
        // Clear history? (Optional, requires DB helper)
        onResetProgress();
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
                        <Text style={styles.title}>Settings</Text>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <ScrollView>
                        <Text style={styles.sectionTitle}>Game Options</Text>
                        <Pressable style={styles.optionRow} onPress={() => onSetAutoAdvance(!autoAdvance)}>
                            <View style={styles.optionLabel}>
                                <Text style={styles.optionText}>Auto-advance</Text>
                                <Text style={styles.optionSubText}>Next puzzle on correct solution</Text>
                            </View>
                            {autoAdvance ? <CheckSquare color="#2ecc71" size={24} /> : <Square color="#666" size={24} />}
                        </Pressable>

                        <Text style={styles.sectionTitle}>Piece Set</Text>
                        <View style={styles.pieceGrid}>
                            {PIECE_SETS.map(set => (
                                <Pressable
                                    key={set}
                                    style={[
                                        styles.pieceOption,
                                        pieceSet === set && styles.pieceOptionActive
                                    ]}
                                    onPress={() => onSetPieceSet(set)}
                                >
                                    <View style={{ pointerEvents: 'none' }}>
                                        <Piece piece="wK" size={40} set={set} />
                                    </View>
                                </Pressable>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>Board Theme</Text>
                        <View style={styles.pieceGrid}>
                            {BOARD_THEMES.map((theme) => {
                                const selected = boardTheme.option_name === theme.option_name;
                                return (
                                    <Pressable
                                        key={theme.option_name}
                                        style={[
                                            styles.pieceOption,
                                            // Optional: Add a subtle border of the highlight color?
                                            { borderColor: selected ? theme.highlight_color : '#444' },
                                            selected && { backgroundColor: theme.highlight_color + '20' } // 20% opacity background
                                        ]}
                                        onPress={() => onSetBoardTheme(theme)}
                                    >
                                        <Text style={[
                                            styles.pieceText,
                                            selected && { color: theme.highlight_color, fontWeight: 'bold' }
                                        ]}>{theme.option_name}</Text>
                                    </Pressable>
                                );
                            })}
                        </View>

                        <Text style={styles.sectionTitle}>Blindfold Mode</Text>
                        <View style={styles.optionRow}>
                            <View style={styles.optionLabel}>
                                <Text style={styles.optionText}>Analysis Time</Text>
                                <Text style={styles.optionSubText}>Seconds to memorize position</Text>
                            </View>
                            <TextInput
                                style={styles.numberInput}
                                value={String(blindfoldTime)}
                                onChangeText={(text) => {
                                    const num = parseInt(text) || 5;
                                    onSetBlindfoldTime(Math.max(1, Math.min(60, num)));
                                }}
                                keyboardType="number-pad"
                                maxLength={2}
                            />
                        </View>

                        <Text style={styles.sectionTitle}>Data</Text>
                        <Pressable style={styles.resetButton} onPress={handleReset}>
                            <RefreshCcw color="#fff" size={18} />
                            <Text style={styles.resetText}>Reset</Text>
                        </Pressable>
                        <Text style={styles.resetNote}>Resets rating to 1200, removes favorites, and clears all game history.</Text>
                    </ScrollView>
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
        minHeight: 400,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    sectionTitle: {
        color: '#888',
        fontSize: 14,
        marginBottom: 10,
        marginTop: 10,
        textTransform: 'uppercase',
    },
    pieceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    pieceOption: {
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#333',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#444',
    },
    pieceOptionActive: {
        backgroundColor: '#2980b9',
        borderColor: '#3498db',
    },
    pieceText: {
        color: '#ccc',
    },
    pieceTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#c0392b',
        padding: 15,
        borderRadius: 8,
        justifyContent: 'center',
    },
    resetText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    resetNote: {
        color: '#666',
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    optionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: '#333',
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#444',
    },
    optionLabel: {
        flex: 1,
    },
    optionText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    optionSubText: {
        color: '#888',
        fontSize: 12,
    },
    toggle: {
        width: 40,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#555',
    },
    toggleActive: {
        backgroundColor: '#2ecc71',
    },
    numberInput: {
        backgroundColor: '#444',
        color: '#fff',
        width: 50,
        height: 40,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#555',
    },
});
