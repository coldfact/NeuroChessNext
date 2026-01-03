import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { X, PlayCircle, ShoppingBag } from 'lucide-react-native';

interface AdPlaceholderModalProps {
    visible: boolean;
    onClose: () => void;
    onRemoveAds: () => void;
}

export default function AdPlaceholderModal({ visible, onClose, onRemoveAds }: AdPlaceholderModalProps) {
    const [timeLeft, setTimeLeft] = useState(5);
    const [canClose, setCanClose] = useState(false);

    useEffect(() => {
        if (visible) {
            setTimeLeft(5);
            setCanClose(false);
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        setCanClose(true);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [visible]);

    return (
        <Modal
            visible={visible}
            transparent={false}
            animationType="fade"
            statusBarTranslucent={true}
        >
            <View style={styles.container}>
                {/* Simulated Ad Content (Black Box) */}
                <View style={styles.adContent}>
                    <PlayCircle color="#444" size={80} />
                    <Text style={styles.adText}>Advertisement</Text>
                    <Text style={styles.adSubtext}>This is a placeholder for a 3rd party ad network.</Text>
                </View>

                {/* Top Right Timer / Close Button */}
                <View style={styles.topRight}>
                    {canClose ? (
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <X color="#fff" size={24} />
                        </Pressable>
                    ) : (
                        <View style={styles.timerBadge}>
                            <Text style={styles.timerText}>{timeLeft}</Text>
                        </View>
                    )}
                </View>

                {/* Bottom Call to Action */}
                <View style={styles.bottomBar}>
                    <Text style={styles.nagscreenText}>Tired of ads?</Text>
                    <Pressable style={styles.removeAdsButton} onPress={onRemoveAds}>
                        <ShoppingBag color="#fff" size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.removeAdsText}>Remove Ads</Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    adContent: {
        width: '90%',
        aspectRatio: 16 / 9,
        backgroundColor: '#222',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333'
    },
    adText: {
        color: '#666',
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 10
    },
    adSubtext: {
        color: '#444',
        fontSize: 14,
        marginTop: 5
    },
    topRight: {
        position: 'absolute',
        top: 50,
        right: 20,
    },
    timerBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#fff'
    },
    timerText: {
        color: '#fff',
        fontWeight: 'bold'
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 50,
        alignItems: 'center',
        width: '100%'
    },
    nagscreenText: {
        color: '#888',
        marginBottom: 10
    },
    removeAdsButton: {
        flexDirection: 'row',
        backgroundColor: '#e74c3c',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 25,
        alignItems: 'center'
    },
    removeAdsText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16
    }
});
