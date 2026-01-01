import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SkipForward, Flag, ChevronLeft, ChevronRight, ScanEye } from 'lucide-react-native';

interface ControlsProps {
    onNext: () => void;
    onGiveUp: () => void;
    onBack: () => void;
    onForward: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    isFinished: boolean; // Solved or Failed
    isLoading: boolean;
    showPeek?: boolean; // Show peek button in blindfold mode when pieces hidden
    onPeek?: () => void;
}

export default function Controls({
    onNext, onGiveUp,
    onBack, onForward, canGoBack, canGoForward,
    isFinished, isLoading, showPeek, onPeek
}: ControlsProps) {
    return (
        <View style={styles.container}>
            {isFinished ? (
                // Review Mode
                <>
                    <View style={styles.navGroup}>
                        <Pressable
                            style={[styles.iconBtn, !canGoBack && styles.disabledBtn]}
                            onPress={onBack}
                            disabled={!canGoBack}
                        >
                            <ChevronLeft color={canGoBack ? "#fff" : "#555"} size={28} />
                        </Pressable>
                        <Pressable
                            style={[styles.iconBtn, !canGoForward && styles.disabledBtn]}
                            onPress={onForward}
                            disabled={!canGoForward}
                        >
                            <ChevronRight color={canGoForward ? "#fff" : "#555"} size={28} />
                        </Pressable>
                    </View>

                    <Pressable
                        style={[styles.button, styles.nextButton]}
                        onPress={onNext}
                        disabled={isLoading}
                    >
                        <SkipForward color="#fff" size={20} />
                        <Text style={styles.buttonText}>Next</Text>
                    </Pressable>
                </>
            ) : (
                // Playing Mode
                <>
                    <Pressable
                        style={[styles.button, styles.giveUpButton]}
                        onPress={onGiveUp}
                        disabled={isLoading}
                    >
                        <Flag color="#e74c3c" size={24} />
                    </Pressable>
                    {showPeek && onPeek && (
                        <Pressable
                            style={[styles.button, styles.peekButton]}
                            onPress={onPeek}
                        >
                            <ScanEye color="#f39c12" size={24} />
                        </Pressable>
                    )}
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: 15,
        marginTop: 20,
        justifyContent: 'center', // Center everything
        width: '100%',
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    nextButton: {
        backgroundColor: '#2980b9',
        // flex: 1, // Removed to allow auto-sizing
        justifyContent: 'center',
    },
    giveUpButton: {
        backgroundColor: 'transparent', // Remove red background
        borderWidth: 1,
        borderColor: '#444',
        padding: 15,
    },
    peekButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#f39c12',
        padding: 15,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    navGroup: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    iconBtn: {
        padding: 10,
        backgroundColor: '#444',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#555',
    },
    disabledBtn: {
        opacity: 0.3,
        backgroundColor: '#222',
    },
});
