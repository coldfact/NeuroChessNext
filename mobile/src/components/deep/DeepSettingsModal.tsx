import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView, TextInput } from 'react-native';
import { X, RefreshCcw, CheckSquare, Square, Clock } from 'lucide-react-native';
import { DatabaseService } from '../../services';
import { BoardTheme, BOARD_THEMES, PieceSet, PIECE_SETS } from '../../constants';
import Piece from '../Piece';

interface DeepSettingsModalProps {
    visible: boolean;
    onClose: () => void;

    pieceSet: PieceSet;
    onSetPieceSet: (set: PieceSet) => void;
    boardTheme: BoardTheme;
    onSetBoardTheme: (theme: BoardTheme) => void;

    moveTime: number;
    onSetMoveTime: (seconds: number) => void;

    onResetProgress: () => void;
    autoAdvance: boolean;
    onSetAutoAdvance: (enabled: boolean) => void;

    arrowColor: string;
    onSetArrowColor: (color: string) => void;
}

const ARROW_COLORS = [
    { name: 'Red', hex: '#ff0000' },
    { name: 'Violet', hex: '#8A2BE2' },
    { name: 'Cyan', hex: '#00FFFF' },
    { name: 'Magenta', hex: '#FF00FF' },
    { name: 'Yellow', hex: '#FFFF00' },
];

export default function DeepSettingsModal({
    visible, onClose,
    pieceSet, onSetPieceSet,
    boardTheme, onSetBoardTheme,
    moveTime, onSetMoveTime,
    onResetProgress,
    autoAdvance, onSetAutoAdvance,
    arrowColor, onSetArrowColor
}: DeepSettingsModalProps) {

    const handleReset = async () => {
        // Reset Logic Specific to Deep
        await DatabaseService.updatePlayerStats('deep', 1200, 350, 0.06);
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
                        <Text style={styles.title}>Deep Settings</Text>
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

                        <Text style={styles.sectionTitle}>Game Mechanics</Text>

                        {/* Move Time */}
                        <View style={styles.optionRow}>
                            <View style={styles.optionLabel}>
                                <Text style={styles.optionText}>Move Time</Text>
                                <Text style={styles.optionSubText}>Seconds per move</Text>
                            </View>
                            <View style={styles.segmentedContainer}>
                                {[0.5, 1, 1.5, 2, 2.5, 3].map((time) => (
                                    <Pressable
                                        key={time}
                                        style={[
                                            styles.segmentBtn,
                                            moveTime === time && styles.segmentBtnActive
                                        ]}
                                        onPress={() => onSetMoveTime(time)}
                                    >
                                        <Text style={[
                                            styles.segmentText,
                                            moveTime === time && styles.segmentTextActive
                                        ]}>
                                            {time}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        {/* Arrow Color */}
                        <View style={styles.optionBlock}>
                            <Text style={styles.optionText}>Arrow Color</Text>
                            <View style={styles.colorGrid}>
                                {ARROW_COLORS.map((c) => (
                                    <Pressable
                                        key={c.hex}
                                        style={[
                                            styles.colorBox,
                                            { backgroundColor: c.hex },
                                            arrowColor === c.hex && styles.colorBoxActive
                                        ]}
                                        onPress={() => onSetArrowColor(c.hex)}
                                    >
                                        {arrowColor === c.hex && <CheckSquare color={c.name === 'Yellow' || c.name === 'Cyan' ? '#000' : '#fff'} size={20} />}
                                    </Pressable>
                                ))}
                            </View>
                        </View>

                        <Text style={styles.sectionTitle}>Visuals</Text>
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
                                        <Piece piece="wK" size={32} set={set} />
                                    </View>
                                </Pressable>
                            ))}
                        </View>
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
                            <Text style={styles.resetText}>Reset Deep Data</Text>
                        </Pressable>
                        <Text style={styles.resetNote}>Resets rating to 1200, removes favorites, and clears all game history.</Text>
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
        marginBottom: 10,
        marginTop: 10,
        textTransform: 'uppercase',
    },
    card: {
        backgroundColor: '#252525',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10
    },
    segmentedContainer: {
        flexDirection: 'row',
        backgroundColor: '#111',
        borderRadius: 8,
        padding: 2,
        height: 40,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#444',
        minWidth: 200 // Ensure enough width for 6 items
    },
    segmentBtn: {
        flex: 1,
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
        fontSize: 12,
        fontWeight: 'bold'
    },
    segmentTextActive: {
        color: '#fff',
    },
    pieceGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 20,
    },
    pieceOption: {
        paddingVertical: 8,
        paddingHorizontal: 12,
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
        fontSize: 12
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
    optionBlock: {
        marginBottom: 15,
        backgroundColor: '#333',
        borderRadius: 8,
        padding: 15,
        borderWidth: 1,
        borderColor: '#444',
    },
    colorGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
        justifyContent: 'center', // Centered
    },
    colorBox: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#444',
    },
    colorBoxActive: {
        borderColor: '#fff',
        borderWidth: 2,
    },
});
