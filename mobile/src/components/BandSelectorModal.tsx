import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable } from 'react-native';
import { X, BarChart2 } from 'lucide-react-native';

const BANDS = [
    { value: 'All', label: 'All Ratings' },
    { value: '0000-0800', label: '0 - 800 (Beginner)' },
    { value: '0800-1000', label: '800 - 1000 (Novice)' },
    { value: '1000-1200', label: '1000 - 1200 (Improving)' },
    { value: '1200-1450', label: '1200 - 1450 (Intermediate)' },
    { value: '1450-1800', label: '1450 - 1800 (Advanced)' },
    { value: '1800-2200', label: '1800 - 2200 (Expert)' },
    { value: '2200-PLUS', label: '2200+ (Master)' },
    { value: 'Favorites', label: 'Favorites' },
];

interface BandSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    currentBand: string;
    onSelectBand: (band: string) => void;
}

export default function BandSelectorModal({
    visible,
    onClose,
    currentBand,
    onSelectBand
}: BandSelectorModalProps) {
    const handleSelect = (band: string) => {
        onSelectBand(band);
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
                            <Text style={styles.title}>Rating Band</Text>
                        </View>
                        <Pressable onPress={onClose}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <View style={styles.bandList}>
                        {BANDS.map(band => (
                            <Pressable
                                key={band.value}
                                style={[
                                    styles.bandOption,
                                    currentBand === band.value && styles.bandOptionActive
                                ]}
                                onPress={() => handleSelect(band.value)}
                            >
                                <Text style={[
                                    styles.bandText,
                                    currentBand === band.value && styles.bandTextActive
                                ]}>
                                    {band.label}
                                </Text>
                            </Pressable>
                        ))}
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
    bandList: {
        gap: 10,
    },
    bandOption: {
        paddingVertical: 15,
        paddingHorizontal: 20,
        backgroundColor: '#333',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#444',
    },
    bandOptionActive: {
        backgroundColor: '#2980b9',
        borderColor: '#3498db',
    },
    bandText: {
        color: '#ccc',
        fontSize: 16,
    },
    bandTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
