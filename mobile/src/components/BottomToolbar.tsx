import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Settings, Eye, EyeOff, BarChart2, Clock, Layers } from 'lucide-react-native';

interface BottomToolbarProps {
    band: string;
    onOpenBandSelector: () => void;
    theme: string;
    onOpenThemeSelector: () => void;
    blindfold: boolean;
    onToggleBlindfold: () => void;
    onOpenSettings: () => void;
}

export default function BottomToolbar({
    band, onOpenBandSelector,
    theme, onOpenThemeSelector,
    blindfold, onToggleBlindfold,
    onOpenSettings
}: BottomToolbarProps) {
    return (
        <View style={styles.container}>
            {/* Band Selector */}
            <Pressable style={styles.toolItem} onPress={onOpenBandSelector}>
                <BarChart2 color="#888" size={20} />
                <Text style={styles.toolText}>{band === 'All' ? 'Rating' : band}</Text>
            </Pressable>

            {/* Theme Selector */}
            <Pressable style={styles.toolItem} onPress={onOpenThemeSelector}>
                <Layers color={theme === 'all' ? '#888' : '#4ECDC4'} size={20} />
                <Text style={[styles.toolText, theme !== 'all' && styles.activeTextTheme]}>
                    {theme === 'all' ? 'Themes' : theme.charAt(0).toUpperCase() + theme.slice(1)}
                </Text>
            </Pressable>

            {/* Blindfold Toggle */}
            <Pressable
                style={[styles.toolItem, blindfold && styles.activeItem]}
                onPress={onToggleBlindfold}
            >
                {blindfold ? (
                    <EyeOff color="#e74c3c" size={20} />
                ) : (
                    <Eye color="#888" size={20} />
                )}
                <Text style={[styles.toolText, blindfold && styles.activeText]}>
                    {blindfold ? 'Hidden' : 'Visible'}
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
        // Highlight active state
    },
    toolText: {
        color: '#888',
        fontSize: 12,
    },
    activeText: {
        color: '#e74c3c',
        fontWeight: 'bold',
    },
    activeTextTheme: {
        color: '#4ECDC4',
        fontWeight: 'bold',
    }
});
