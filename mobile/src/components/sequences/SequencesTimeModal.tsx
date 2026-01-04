import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable } from 'react-native';
import { X, Clock, ClipboardCheck } from 'lucide-react-native';

// Identical to N-Back options
const DURATIONS = [1, 3, 5, 10, 20, 30, 45, 60];

interface SequencesTimeModalProps {
    visible: boolean;
    onClose: () => void;
    currentDuration: number;
    onSelectDuration: (mins: number) => void;
}

export default function SequencesTimeModal({
    visible,
    onClose,
    currentDuration,
    onSelectDuration
}: SequencesTimeModalProps) {

    const handleSelect = (mins: number) => {
        onSelectDuration(mins);
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
                            <Clock color="#fff" size={20} />
                            <Text style={styles.title}>Game Duration</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <View style={styles.list}>
                        {DURATIONS.map(mins => {
                            const isTestMode = mins === 20;
                            const isActive = currentDuration === mins;

                            return (
                                <Pressable
                                    key={mins}
                                    style={[
                                        styles.option,
                                        isActive && styles.optionActive,
                                        isTestMode && isActive && styles.optionActiveTest
                                    ]}
                                    onPress={() => handleSelect(mins)}
                                >
                                    {isTestMode && (
                                        <View style={{ marginBottom: 5 }}>
                                            <ClipboardCheck color={isActive ? '#fff' : '#FF6B6B'} size={20} />
                                        </View>
                                    )}
                                    <Text style={[
                                        styles.optionText,
                                        isActive && styles.optionTextActive,
                                        isTestMode && !isActive && { color: '#FF6B6B', fontWeight: 'bold' }
                                    ]}>
                                        {mins} {mins === 1 ? 'Minute' : 'Minutes'}
                                    </Text>
                                    {isTestMode && <Text style={[styles.testLabel, isActive && { color: '#fff' }]}>(Test Mode)</Text>}
                                </Pressable>
                            );
                        })}
                    </View>

                    <Text style={styles.note}>Game ends when time expires.</Text>
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
    list: {
        gap: 10,
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    option: {
        width: '48%',
        paddingVertical: 15,
        backgroundColor: '#333',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#444',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80
    },
    optionActive: {
        backgroundColor: '#2980b9',
        borderColor: '#3498db',
    },
    optionActiveTest: {
        backgroundColor: '#FF6B6B',
        borderColor: '#FF4757',
    },
    optionText: {
        color: '#ccc',
        fontSize: 16,
    },
    optionTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    testLabel: {
        fontSize: 10,
        color: '#FF6B6B',
        marginTop: 4,
        fontWeight: 'bold'
    },
    note: {
        color: '#666',
        fontSize: 12,
        marginTop: 20,
        textAlign: 'center',
    }
});
