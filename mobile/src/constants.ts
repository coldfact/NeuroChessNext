export type BoardTheme = {
    option_name: string;
    white_square_color: string;
    black_square_color: string;
    highlight_color: string;
};

export const BOARD_THEMES: BoardTheme[] = [
    {
        option_name: "Cyber Slate & Cloud",
        white_square_color: "#E0E4E8",
        black_square_color: "#2C3E50",
        highlight_color: "#00D4FF"
    },
    {
        option_name: "Carbon & Bone",
        white_square_color: "#E6E8EB",
        black_square_color: "#2B2F33",
        highlight_color: "#FFB703"
    },
    {
        option_name: "Ink & Parchment",
        white_square_color: "#EFE4D8",
        black_square_color: "#4B3F36",
        highlight_color: "#2F5D9F"
    },
    {
        option_name: "Midnight Slate & Mist",
        white_square_color: "#CBD5E1",
        black_square_color: "#1F2933",
        highlight_color: "#A855F7"
    }
];

export const PIECE_SETS = ['cburnett', 'merida', 'fresca'] as const;
export type PieceSet = typeof PIECE_SETS[number];
