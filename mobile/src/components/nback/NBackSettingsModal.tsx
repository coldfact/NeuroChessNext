import React, { useState } from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView, TextInput, Alert } from 'react-native';
import { X, RefreshCcw, CheckSquare, Square } from 'lucide-react-native';
import { PieceSet, PIECE_SETS, BoardTheme, BOARD_THEMES } from '../../constants';
import Piece from '../Piece';

interface NBackSettingsModalProps {
    visible: boolean;
    onClose: () => void;
    // Configs
    matchBias: number; // 0-100
    onSetMatchBias: (val: number) => void;
    memorizeTime: number; // seconds (default 3)
    onSetMemorizeTime: (val: number) => void;
    pieceSet: PieceSet;
    onSetPieceSet: (set: PieceSet) => void;
    boardTheme: BoardTheme;
    onSetBoardTheme: (theme: BoardTheme) => void;
    onResetData: (hardReset?: boolean) => void;
}

export default function NBackSettingsModal({
    visible, onClose,
    matchBias, onSetMatchBias,
    memorizeTime, onSetMemorizeTime,
    pieceSet, onSetPieceSet,
    boardTheme, onSetBoardTheme,
    onResetData
}: NBackSettingsModalProps) {

    const handleReset = () => {
        Alert.alert(
            "Reset N-Back Data",
            "Are you sure? This will delete all high scores and history for N-Back only.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Reset",
                    style: "destructive",
                    onPress: () => {
                        onResetData();
                        onClose();
                    }
                }
            ]
        );
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
                        <Text style={styles.title}>N-Back Settings</Text>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <ScrollView>
                        <Text style={styles.sectionTitle}>Game Mechanics</Text>

                        {/* Memorize Time */}
                        <View style={styles.optionRow}>
                            <View style={styles.optionLabel}>
                                <Text style={styles.optionText}>One new piece every...</Text>
                                <Text style={styles.optionSubText}>Seconds before next piece shown</Text>
                            </View>
                            <View style={styles.segmentedContainer}>
                                {[1, 2, 3, 4, 5].map((time) => (
                                    <Pressable
                                        key={time}
                                        style={[
                                            styles.segmentBtn,
                                            memorizeTime === time && styles.segmentBtnActive
                                        ]}
                                        onPress={() => onSetMemorizeTime(time)}
                                    >
                                        <Text style={[
                                            styles.segmentText,
                                            memorizeTime === time && styles.segmentTextActive
                                        ]}>
                                            {time}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Match Bias */}
                        <View style={styles.optionRow}>
                            <View style={styles.optionLabel}>
                                <Text style={styles.optionText}>Match Bias (%)</Text>
                                <Text style={styles.optionSubText}>Likelihood of a match (0-100)</Text>
                            </View>
                            <TextInput
                                style={styles.numberInput}
                                value={String(matchBias)}
                                onChangeText={(t) => {
                                    const val = parseInt(t) || 50;
                                    onSetMatchBias(Math.max(0, Math.min(100, val)));
                                }}
                                keyboardType="number-pad"
                                maxLength={3}
                            />
                        </View>
                        {(matchBias < 40 || matchBias > 60) && (
                            <Text style={{ color: '#e74c3c', fontSize: 12, marginTop: -5, marginBottom: 10, marginLeft: 5 }}>
                                Warning: Rank test disabled (Bias must be 40-60%)
                            </Text>
                        )}

                        <Text style={styles.sectionTitle}>Appearance</Text>

                        {/* Piece Set */}
                        <Text style={styles.subTitle}>Piece Set</Text>
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

                        {/* Board Theme */}
                        <Text style={styles.subTitle}>Board Theme</Text>
                        <View style={styles.pieceGrid}>
                            {BOARD_THEMES.map((theme) => {
                                const selected = boardTheme.option_name === theme.option_name;
                                return (
                                    <Pressable
                                        key={theme.option_name}
                                        style={[
                                            styles.pieceOption,
                                            { borderColor: selected ? theme.highlight_color : '#444' },
                                            selected && { backgroundColor: theme.highlight_color + '20' }
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


                        <Text style={styles.sectionTitle}>Data</Text>
                        <Pressable style={styles.resetButton} onPress={handleReset}>
                            <RefreshCcw color="#fff" size={18} />
                            <Text style={styles.resetText}>Reset N-Back Data</Text>
                        </Pressable>
                        <Text style={styles.resetNote}>Clears high scores and history only for this game mode.</Text>

                        {/* Hard Reset for Dev/Testing */}
                        <Pressable style={[styles.resetButton, { backgroundColor: '#7f8c8d', marginTop: 20 }]} onPress={() => {
                            Alert.alert(
                                "Hard Reset (Dev)",
                                "Wipe EVERYTHING? Includes Purchases, Rank, and Settings.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "NUKE IT ☢️", style: "destructive", onPress: () => { onResetData(true); onClose(); } }
                                ]
                            );
                        }}>
                            <RefreshCcw color="#fff" size={18} />
                            <Text style={styles.resetText}>Hard Reset (Clear Purchases)</Text>
                        </Pressable>
                        <View style={{ height: 40 }} />
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
        maxHeight: '85%',
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
        fontWeight: 'bold',
        marginBottom: 10,
        marginTop: 15,
        textTransform: 'uppercase',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingBottom: 5,
    },
    subTitle: {
        color: '#aaa',
        fontSize: 14,
        marginBottom: 10,
        marginTop: 10,
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
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 8,
        padding: 2,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444'
    },
    segmentBtn: {
        width: 32,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    segmentBtnActive: {
        backgroundColor: '#3498db',
    },
    segmentText: {
        color: '#888',
        fontSize: 16,
        fontWeight: 'bold'
    },
    segmentTextActive: {
        color: '#fff',
    },
    numberInput: {
        backgroundColor: '#444',
        color: '#fff',
        width: 60,
        height: 40,
        borderRadius: 8,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#555',
    },
    pieceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 10,
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
        fontSize: 12,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#c0392b',
        padding: 15,
        borderRadius: 8,
        justifyContent: 'center',
        marginTop: 10,
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
});
