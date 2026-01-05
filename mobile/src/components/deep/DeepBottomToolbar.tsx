import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Settings, Eye, EyeOff, BarChart2, Layers, ListOrdered } from 'lucide-react-native';

interface DeepBottomToolbarProps {
    band: string;
    onOpenBandSelector: () => void;
    depth: number;
    onOpenDepthSelector: () => void;
    showMoves: boolean;
    onToggleShowMoves: () => void;
    onOpenSettings: () => void;
}

export default function DeepBottomToolbar({
    band, onOpenBandSelector,
    depth, onOpenDepthSelector,
    showMoves, onToggleShowMoves,
    onOpenSettings
}: DeepBottomToolbarProps) {
    return (
        <View style={styles.container}>
            {/* Rating/Band Button */}
            <Pressable style={styles.toolItem} onPress={onOpenBandSelector}>
                <BarChart2 color={band === 'All' ? '#888' : '#4ECDC4'} size={20} />
                <Text style={[styles.toolText, band !== 'All' && styles.activeTextTheme]}>
                    {band === 'All' ? 'Rating' : band}
                </Text>
            </Pressable>

            {/* Depth Selector (Replaces Themes) */}
            <Pressable style={styles.toolItem} onPress={onOpenDepthSelector}>
                <Layers color={depth > 1 ? '#4ECDC4' : '#888'} size={20} />
                <Text style={[styles.toolText, depth > 1 && styles.activeTextTheme]}>
                    {/* User requirement: "Display in bottom toolbar: 'Depth: {depth level}'" */}
                    Depth: {depth}
                </Text>
            </Pressable>

            {/* Moves Toggle (Replaces Visible) */}
            <Pressable
                style={[styles.toolItem, showMoves && styles.activeItem]}
                onPress={onToggleShowMoves}
            >
                {/* User said: "Visible to Moves ... list-ordered icon" */}
                <ListOrdered color={showMoves ? '#4ECDC4' : '#888'} size={20} />
                <Text style={[styles.toolText, showMoves && styles.activeText]}>
                    {showMoves ? 'Moves' : 'Hidden'}
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
    },
    activeItem: {
        // Highlight active state if needed
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
