import React from 'react';
import { StyleSheet, View, Text, Pressable, Image } from 'react-native';
import { MatchType } from '../../hooks/useNBackGame';

interface MatchControlsProps {
    onSubmit: (type: MatchType) => void;
    disabled: boolean;
}

const ICONS = {
    piece: require('../../../assets/nback_icons/piece.png'),
    square: require('../../../assets/nback_icons/square.png'),
    both: require('../../../assets/nback_icons/both.png'),
};

export default function MatchControls({ onSubmit, disabled, selectedOption }: MatchControlsProps & { selectedOption: MatchType | null }) {

    const getButtonStyle = (type: MatchType) => {
        // If visually disabled globally (caching), or if this specific option is selected
        const isSelected = selectedOption === type;

        if (disabled) return [styles.button, styles.buttonDisabled];
        if (isSelected) return [styles.button, styles.buttonDisabled, { borderColor: '#fff' }]; // Add white border to highlight selection? Or just grey. User said "greyed out mode".

        // If another option is selected, this button is effectively disabled but visually "colored"
        return [styles.button];
    };

    const isInteractionDisabled = disabled || selectedOption !== null;

    return (
        <View style={styles.container}>
            <Pressable
                style={({ pressed }) => [
                    ...getButtonStyle('piece'),
                    (pressed && !isInteractionDisabled) && styles.buttonPressed
                ]}
                onPress={() => onSubmit('piece')}
                disabled={isInteractionDisabled}
            >
                <Image source={ICONS.piece} style={styles.icon} resizeMode="contain" />
                <Text style={styles.label}>PIECE</Text>
            </Pressable>

            <Pressable
                style={({ pressed }) => [
                    ...getButtonStyle('both'),
                    (pressed && !isInteractionDisabled) && styles.buttonPressed
                ]}
                onPress={() => onSubmit('both')}
                disabled={isInteractionDisabled}
            >
                <Image source={ICONS.both} style={styles.iconLarge} resizeMode="contain" />
                <Text style={styles.label}>BOTH</Text>
            </Pressable>

            <Pressable
                style={({ pressed }) => [
                    ...getButtonStyle('square'),
                    (pressed && !isInteractionDisabled) && styles.buttonPressed
                ]}
                onPress={() => onSubmit('square')}
                disabled={isInteractionDisabled}
            >
                <Image source={ICONS.square} style={styles.iconLarge} resizeMode="contain" />
                <Text style={styles.label}>SQUARE</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 15,
        marginTop: 20,
        marginBottom: 40,
    },
    button: {
        width: 100,
        height: 100,
        backgroundColor: '#34495e',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#2c3e50',
        padding: 5,
    },

    buttonPressed: {
        transform: [{ translateY: 4 }],
        shadowOpacity: 0,
        backgroundColor: '#2c3e50',
    },
    buttonDisabled: {
        opacity: 0.5,
        backgroundColor: '#7f8c8d',
    },
    icon: {
        width: 48,
        height: 48,
        marginBottom: 4,
    },
    iconLarge: {
        width: 64,
        height: 64,
        marginBottom: 4,
    },
    label: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 2,
    }
});
