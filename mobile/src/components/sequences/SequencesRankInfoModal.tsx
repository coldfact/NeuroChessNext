import React from 'react';
import { StyleSheet, View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { X, Trophy } from 'lucide-react-native';
import { NBACK_RANKS, RANK_COLORS } from '../../constants';

interface SequencesRankInfoModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function SequencesRankInfoModal({ visible, onClose }: SequencesRankInfoModalProps) {
    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <View style={styles.headerTitle}>
                            <Trophy color="#FFB703" size={20} />
                            <Text style={styles.title}>Sequences Proficiency Ranks</Text>
                        </View>
                        <Pressable onPress={onClose} hitSlop={10}>
                            <X color="#aaa" size={24} />
                        </Pressable>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.description}>
                            You can advance your rank by playing a <Text style={styles.highlight}>20 minute game</Text> for different Move lengths and scoring at least <Text style={styles.highlight}>80% accuracy</Text>.
                        </Text>

                        <View style={styles.tableContainer}>
                            <View style={styles.tableHeader}>
                                <Text style={styles.colHeaderLevel}>Moves</Text>
                                <Text style={styles.colHeaderRank}>Rank</Text>
                            </View>

                            {Object.entries(NBACK_RANKS).map(([levelStr, rank]) => {
                                const level = parseInt(levelStr);
                                const rankColor = RANK_COLORS[level];
                                return (
                                    <View key={level} style={styles.tableRow}>
                                        <View style={styles.levelBadge}>
                                            <Text style={styles.levelText}>{level}</Text>
                                        </View>
                                        <Text style={[
                                            styles.rankText,
                                            { color: rankColor || '#fff', fontWeight: 'bold' }
                                        ]}>{rank}</Text>
                                    </View>
                                );
                            })}
                        </View>

                        <View style={{ height: 20 }} />
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: '#1a1a1a',
        borderRadius: 16,
        padding: 20,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: '#333',
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
        fontSize: 18,
        fontWeight: 'bold',
    },
    description: {
        color: '#ccc',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 20,
    },
    highlight: {
        color: '#4ECDC4',
        fontWeight: 'bold',
    },
    tableContainer: {
        backgroundColor: '#222',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#333',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#333',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    colHeaderLevel: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        width: 100,
    },
    colHeaderRank: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        flex: 1,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    levelBadge: {
        width: 24,
        height: 24,
        backgroundColor: '#444',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 76,
    },
    levelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    rankText: {
        fontSize: 16,
    }
});
