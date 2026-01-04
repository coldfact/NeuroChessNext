import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Settings, Shuffle, Clock, BarChart2 } from 'lucide-react-native';

interface SequencesBottomToolbarProps {
    level: number;
    onOpenLevelSelector: () => void;
    time: number;
    onOpenTimeSelector: () => void;
    confounders: boolean;
    onToggleConfounders: () => void;
    onOpenSettings: () => void;
    isPlaying: boolean;
}

export default function SequencesBottomToolbar({
    level, onOpenLevelSelector,
    time, onOpenTimeSelector,
    confounders, onToggleConfounders,
    onOpenSettings,
    isPlaying
}: SequencesBottomToolbarProps) {

    return (
        <View style={styles.container}>

            {/* Level (Moves) Selector */}
            <Pressable
                style={styles.toolItem}
                onPress={onOpenLevelSelector}
                disabled={isPlaying}
            >
                <BarChart2 color="#4ECDC4" size={20} />
                <Text style={styles.toolText}>Moves: {level}</Text>
            </Pressable>

            {/* Time Selector */}
            <Pressable
                style={styles.toolItem}
                onPress={onOpenTimeSelector}
                disabled={isPlaying}
            >
                <Clock color="#4ECDC4" size={20} />
                <Text style={styles.toolText}>{time} Min</Text>
            </Pressable>

            {/* Confounders Toggle */}
            <Pressable
                style={[styles.toolItem, confounders && styles.activeItem]}
                onPress={onToggleConfounders}
                disabled={isPlaying}
            >
                <Shuffle color={confounders ? "#e74c3c" : "#888"} size={20} />
                <Text style={[styles.toolText, confounders && styles.activeText]}>
                    Confound
                </Text>
            </Pressable>

            {/* Settings */}
            <Pressable style={styles.toolItem} onPress={onOpenSettings}>
                <Settings color="#888" size={20} />
                <Text style={styles.toolText}>Settings</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        borderTopWidth: 1,
        borderTopColor: '#222',
        backgroundColor: '#111',
        marginBottom: 0
    },
    toolItem: {
        alignItems: 'center',
        gap: 4,
        padding: 5,
        minWidth: 60
    },
    activeItem: {
        // Highlight active state if needed
    },
    toolText: {
        color: '#888',
        fontSize: 12,
        fontWeight: '500'
    },
    activeText: {
        color: '#e74c3c',
        fontWeight: 'bold',
    },
});
