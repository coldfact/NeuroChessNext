import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Settings, BarChart2, Clock, Ghost } from 'lucide-react-native';

interface NBackBottomToolbarProps {
    level: number;
    onOpenLevelSelector: () => void;
    duration: number; // minutes
    onOpenDurationSelector: () => void;
    ghostMode: boolean;
    onToggleGhostMode: () => void;
    onOpenSettings: () => void;
}

export default function NBackBottomToolbar({
    level, onOpenLevelSelector,
    duration, onOpenDurationSelector,
    ghostMode, onToggleGhostMode,
    onOpenSettings
}: NBackBottomToolbarProps) {
    return (
        <View style={styles.container}>
            {/* Level Selector */}
            <Pressable style={styles.toolItem} onPress={onOpenLevelSelector}>
                <BarChart2 color={level === 1 ? '#888' : '#4ECDC4'} size={20} />
                <Text style={[styles.toolText, level !== 1 && styles.activeTextTheme]}>
                    Level {level}
                </Text>
            </Pressable>

            {/* Duration Selector */}
            <Pressable style={styles.toolItem} onPress={onOpenDurationSelector}>
                <Clock color={duration === 3 ? '#888' : '#4ECDC4'} size={20} />
                <Text style={[
                    styles.toolText,
                    duration !== 3 && styles.activeTextTheme,
                    duration === 20 && { color: '#FF6B6B' } // Test Mode Red
                ]}>
                    {duration}m
                </Text>
            </Pressable>

            {/* Ghost Mode Toggle */}
            <Pressable
                style={styles.toolItem}
                onPress={onToggleGhostMode}
            >
                <Ghost color={ghostMode ? '#4ECDC4' : '#888'} size={20} />
                <Text style={[styles.toolText, ghostMode && styles.activeText]}>
                    {ghostMode ? 'Ghost: On' : 'Ghost: Off'}
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
    },
    toolItem: {
        alignItems: 'center',
        gap: 4,
        padding: 5,
    },
    toolText: {
        color: '#888',
        fontSize: 12,
    },
    activeText: {
        color: '#4ECDC4',
        fontWeight: 'bold',
    },
    activeTextTheme: {
        color: '#4ECDC4',
        fontWeight: 'bold',
    }
});
