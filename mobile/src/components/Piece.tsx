import React, { useMemo } from 'react';
import { View } from 'react-native';
import { SvgProps } from 'react-native-svg';

// Dynamically import all pieces from all sets
type PieceSet = 'cburnett' | 'merida' | 'fresca' | 'horsey';

// With react-native-svg-transformer, require() returns the SVG component.
// It might be wrapped in .default if adhering to strict ESM interop.
const PIECE_IMPORTS: Record<PieceSet, Record<string, any>> = {
    cburnett: {
        wP: require('../../assets/pieces/cburnett/wP.svg'),
        wN: require('../../assets/pieces/cburnett/wN.svg'),
        wB: require('../../assets/pieces/cburnett/wB.svg'),
        wR: require('../../assets/pieces/cburnett/wR.svg'),
        wQ: require('../../assets/pieces/cburnett/wQ.svg'),
        wK: require('../../assets/pieces/cburnett/wK.svg'),
        bP: require('../../assets/pieces/cburnett/bP.svg'),
        bN: require('../../assets/pieces/cburnett/bN.svg'),
        bB: require('../../assets/pieces/cburnett/bB.svg'),
        bR: require('../../assets/pieces/cburnett/bR.svg'),
        bQ: require('../../assets/pieces/cburnett/bQ.svg'),
        bK: require('../../assets/pieces/cburnett/bK.svg'),
    },
    merida: {
        wP: require('../../assets/pieces/merida/wP.svg'),
        wN: require('../../assets/pieces/merida/wN.svg'),
        wB: require('../../assets/pieces/merida/wB.svg'),
        wR: require('../../assets/pieces/merida/wR.svg'),
        wQ: require('../../assets/pieces/merida/wQ.svg'),
        wK: require('../../assets/pieces/merida/wK.svg'),
        bP: require('../../assets/pieces/merida/bP.svg'),
        bN: require('../../assets/pieces/merida/bN.svg'),
        bB: require('../../assets/pieces/merida/bB.svg'),
        bR: require('../../assets/pieces/merida/bR.svg'),
        bQ: require('../../assets/pieces/merida/bQ.svg'),
        bK: require('../../assets/pieces/merida/bK.svg'),
    },
    fresca: {
        wP: require('../../assets/pieces/fresca/wP.svg'),
        wN: require('../../assets/pieces/fresca/wN.svg'),
        wB: require('../../assets/pieces/fresca/wB.svg'),
        wR: require('../../assets/pieces/fresca/wR.svg'),
        wQ: require('../../assets/pieces/fresca/wQ.svg'),
        wK: require('../../assets/pieces/fresca/wK.svg'),
        bP: require('../../assets/pieces/fresca/bP.svg'),
        bN: require('../../assets/pieces/fresca/bN.svg'),
        bB: require('../../assets/pieces/fresca/bB.svg'),
        bR: require('../../assets/pieces/fresca/bR.svg'),
        bQ: require('../../assets/pieces/fresca/bQ.svg'),
        bK: require('../../assets/pieces/fresca/bK.svg'),
    },
    horsey: {
        wP: require('../../assets/pieces/horsey/wP.svg'),
        wN: require('../../assets/pieces/horsey/wN.svg'),
        wB: require('../../assets/pieces/horsey/wB.svg'),
        wR: require('../../assets/pieces/horsey/wR.svg'),
        wQ: require('../../assets/pieces/horsey/wQ.svg'),
        wK: require('../../assets/pieces/horsey/wK.svg'),
        bP: require('../../assets/pieces/horsey/bP.svg'),
        bN: require('../../assets/pieces/horsey/bN.svg'),
        bB: require('../../assets/pieces/horsey/bB.svg'),
        bR: require('../../assets/pieces/horsey/bR.svg'),
        bQ: require('../../assets/pieces/horsey/bQ.svg'),
        bK: require('../../assets/pieces/horsey/bK.svg'),
    },
};

interface PieceProps {
    piece: string; // e.g., 'wK', 'bQ' OR 'K', 'q' (FEN)
    size: number;
    set?: PieceSet;
}

export default function Piece({ piece, size, set = 'cburnett' }: PieceProps) {
    const SvgComponent = useMemo(() => {
        // Handle FEN single-char codes (e.g. 'P' -> 'wP', 'n' -> 'bN')
        let key = piece;
        if (piece.length === 1) {
            const color = piece === piece.toUpperCase() ? 'w' : 'b';
            const type = piece.toUpperCase();
            key = `${color}${type}`;
        }

        const module = PIECE_IMPORTS[set]?.[key];
        return module?.default || module;
    }, [piece, set]);

    if (!SvgComponent) return null;

    // Scale correction for specific sets
    const scale = set === 'merida' ? 0.85 : 1.0;
    const scaledSize = size * scale;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <SvgComponent width={scaledSize} height={scaledSize} />
        </View>
    );
}
