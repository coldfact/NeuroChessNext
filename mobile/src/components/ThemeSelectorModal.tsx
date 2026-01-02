import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import {
    X,
    BookOpen,
    Swords,
    Shield,
    Target,
    Zap,
    BookDown,
    Binoculars,
    Siren,
    BetweenHorizontalEnd,
    EarOff,
    TriangleAlert,
    MoveDiagonal
} from 'lucide-react-native';

export type Theme =
    | 'all'
    | 'opening'
    | 'middlegame'
    | 'endgame'
    | 'attraction'
    | 'defensiveMove'
    | 'deflection'
    | 'discoveredAttack'
    | 'hangingPiece'
    | 'intermezzo'
    | 'quietMove'
    | 'sacrifice'
    | 'skewer';

interface ThemeSelectorModalProps {
    visible: boolean;
    onClose: () => void;
    currentTheme: string;
    onSelectTheme: (theme: string) => void;
}

const THEME_GROUPS = [
    {
        title: 'Game Phase',
        items: [
            { id: 'opening', label: 'Opening', icon: BookOpen },
            { id: 'middlegame', label: 'Middlegame', icon: Swords },
            { id: 'endgame', label: 'Endgame', icon: BookDown },
        ]
    },
    {
        title: 'Tactical Motifs',
        items: [
            { id: 'attraction', label: 'Attraction', icon: Target },
            { id: 'defensiveMove', label: 'Defensive Move', icon: Shield },
            { id: 'deflection', label: 'Deflection', icon: Zap },
            { id: 'discoveredAttack', label: 'Discovered Attack', icon: Binoculars },
            { id: 'hangingPiece', label: 'Hanging Piece', icon: Siren },
            { id: 'intermezzo', label: 'Intermezzo', icon: BetweenHorizontalEnd },
            { id: 'quietMove', label: 'Quiet Move', icon: EarOff },
            { id: 'sacrifice', label: 'Sacrifice', icon: TriangleAlert },
            { id: 'skewer', label: 'Skewer', icon: MoveDiagonal },
        ]
    }
];

export default function ThemeSelectorModal({ visible, onClose, currentTheme, onSelectTheme }: ThemeSelectorModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <BlurView intensity={20} style={styles.absolute} tint="dark" />

                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <Text style={styles.modalTitle}>Select Theme</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        {/* All Themes Option */}
                        <Pressable
                            style={[
                                styles.option,
                                currentTheme === 'all' && styles.selectedOption
                            ]}
                            onPress={() => {
                                onSelectTheme('all');
                                onClose();
                            }}
                        >
                            <View style={styles.optionContent}>
                                <View style={[styles.iconContainer, { backgroundColor: '#333' }]}>
                                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#fff' }} />
                                </View>
                                <Text style={[
                                    styles.optionText,
                                    currentTheme === 'all' && styles.selectedOptionText
                                ]}>
                                    All Themes
                                </Text>
                            </View>
                        </Pressable>

                        {THEME_GROUPS.map((group) => (
                            <View key={group.title} style={styles.groupContainer}>
                                <Text style={styles.groupTitle}>{group.title}</Text>
                                <View style={styles.grid}>
                                    {group.items.map((item) => {
                                        const isSelected = currentTheme === item.id;
                                        const Icon = item.icon;

                                        return (
                                            <Pressable
                                                key={item.id}
                                                style={[
                                                    styles.gridOption,
                                                    isSelected && styles.selectedGridOption
                                                ]}
                                                onPress={() => {
                                                    onSelectTheme(item.id);
                                                    onClose();
                                                }}
                                            >
                                                <Icon
                                                    size={24}
                                                    color={isSelected ? '#111' : '#ccc'}
                                                    style={{ marginBottom: 8 }}
                                                />
                                                <Text style={[
                                                    styles.gridText,
                                                    isSelected && styles.selectedGridText
                                                ]}>
                                                    {item.label}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        ))}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    absolute: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
    modalView: {
        width: '90%',
        maxHeight: '80%',
        backgroundColor: '#1a1a1a',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        width: '100%',
    },
    scrollContent: {
        padding: 16,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#252525',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedOption: {
        backgroundColor: '#4ECDC4',
        borderColor: '#4ECDC4',
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionText: {
        fontSize: 16,
        color: '#ccc',
        fontWeight: '500',
    },
    selectedOptionText: {
        color: '#111',
        fontWeight: '700',
    },
    groupContainer: {
        marginBottom: 20,
    },
    groupTitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        marginBottom: 12,
        marginLeft: 4,
        textTransform: 'uppercase',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'space-between', // Ensures even spacing
    },
    gridOption: {
        width: '30%', // Fits 3 in a row comfortably
        height: 75,   // Slightly shorter
        backgroundColor: '#252525',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 4,   // Reduced padding
        borderWidth: 1,
        borderColor: '#333',
    },
    selectedGridOption: {
        backgroundColor: '#4ECDC4',
        borderColor: '#4ECDC4',
    },
    gridText: {
        fontSize: 12,
        color: '#ccc',
        textAlign: 'center',
    },
    selectedGridText: {
        color: '#111',
        fontWeight: 'bold',
    },
});
