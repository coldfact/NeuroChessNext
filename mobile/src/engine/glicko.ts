import Constants from 'expo-constants';

const TAU = 0.5;

export interface Rating {
    rating: number;
    rd: number;
    vol: number;
}

export const INITIAL_RATING: Rating = {
    rating: 1200.0,
    rd: 350.0,
    vol: 0.06
};

// Glicko-2 Constants/Math
const Q = Math.log(10) / 400;

function g(phi: number): number {
    return 1 / Math.sqrt(1 + 3 * phi ** 2 / Math.PI ** 2);
}

function E(mu: number, mu_j: number, phi_j: number): number {
    return 1 / (1 + Math.exp(-g(phi_j) * (mu - mu_j)));
}

export function updateRating(player: Rating, puzzleRating: number, success: boolean): Rating {
    // 1. Convert to Glicko-2 scale
    const mu = (player.rating - 1500) / 173.7178;
    const phi = player.rd / 173.7178;

    // Puzzle is treated as a stable opponent (RD=0, RD*=0 -> Phi*=0)
    // Actually typically puzzles have high confidence, so RD=0 is close.
    // Let's assume standard RD=0 for puzzle.
    const mu_j = (puzzleRating - 1500) / 173.7178;
    const phi_j = 0; // Puzzle deviation is 0 (assumed known difficulty)

    const score = success ? 1.0 : 0.0;

    // 2. Compute v (estimated variance)
    const g_phi_j = g(phi_j);
    const E_val = E(mu, mu_j, phi_j);
    const v = 1 / (g_phi_j ** 2 * E_val * (1 - E_val));

    // 3. Compute Delta
    const delta = v * g_phi_j * (score - E_val);

    // 4. Update Volatility (sigma) - Iterative Algorithm (Illinois algorithm)
    const a = Math.log(player.vol ** 2);
    const phi_sq = phi ** 2;
    const delta_sq = delta ** 2;

    // Function f(x)
    const f = (x: number) => {
        const ex = Math.exp(x);
        const numerator = ex * (delta_sq - phi_sq - v - ex);
        const denominator = 2 * ((phi_sq + v + ex) ** 2);
        return (numerator / denominator) - ((x - a) / (TAU ** 2));
    };

    let A: number = a;
    let B: number;

    if (delta_sq > phi_sq + v) {
        B = Math.log(delta_sq - phi_sq - v);
    } else {
        let k = 1;
        while (f(a - k * TAU) < 0) {
            k++;
        }
        B = a - k * TAU;
    }

    let fA = f(A);
    let fB = f(B);

    const epsilon = 0.000001;
    while (Math.abs(B - A) > epsilon) {
        const C = A + (A - B) * fA / (fB - fA);
        const fC = f(C);

        if (fC * fB < 0) {
            A = B;
            fA = fB;
        } else {
            fA = fA / 2.0;
        }

        B = C;
        fB = fC;
    }

    const sigma_prime = Math.exp(A / 2.0);

    // 5. Update RD (PhiStar -> NewPhi)
    const phi_star = Math.sqrt(phi_sq + sigma_prime ** 2);
    const new_phi = 1 / Math.sqrt(1 / (phi_star ** 2) + 1 / v);

    // 6. Update Rating (Mu)
    const new_mu = mu + (new_phi ** 2) * g_phi_j * (score - E_val);

    // 7. Convert Back
    const new_rating = 1500 + 173.7178 * new_mu;
    let new_rd = 173.7178 * new_phi;

    // Floor RD
    if (new_rd < 30) new_rd = 30;

    return {
        rating: new_rating,
        rd: new_rd,
        vol: sigma_prime
    };
}
