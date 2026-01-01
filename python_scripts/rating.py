import math

# System Constants
START_RATING = 1200
START_RD = 350
START_VOL = 0.06
TAU = 0.5
MIN_RD = 30 # "Floor" to prevent getting stuck

def _g(phi):
    return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi * math.pi))

def _E(mu, mu_j, phi_j):
    return 1.0 / (1.0 + math.exp(-_g(phi_j) * (mu - mu_j)))

def update_rating(rating, rd, vol, puzzle_rating, puzzle_rd, score):
    """
    Updates a player's rating based on a single match (puzzle attempt).
    Using Glicko-2 algorithm.
    params:
        rating: Player's current rating (Glicko-2 scale is internal, but we take and return Glicko-1/Elo scale)
        rd: Player's Rating Deviation
        vol: Player's Volatility
        puzzle_rating: Puzzle's rating
        puzzle_rd: Puzzle's RD (usually low, e.g. 30, since it's "static")
        score: 1.0 for Win, 0.0 for Loss
    returns:
        (new_rating, new_rd, new_vol)
    """
    
    # 1. Convert to Glicko-2 scale
    # Rating: (r - 1500) / 173.7178
    # RD: rd / 173.7178
    scale = 173.7178
    
    mu = (rating - 1500) / scale
    phi = rd / scale
    sigma = vol
    
    mu_j = (puzzle_rating - 1500) / scale
    phi_j = puzzle_rd / scale
    
    # 2. Compute v (Estimated Variance)
    g_phi_j = _g(phi_j)
    E_mu_mu_j_phi_j = _E(mu, mu_j, phi_j)
    
    v = 1.0 / (g_phi_j * g_phi_j * E_mu_mu_j_phi_j * (1.0 - E_mu_mu_j_phi_j))
    
    # 3. Compute Delta
    delta = v * g_phi_j * (score - E_mu_mu_j_phi_j)
    
    # 4. Compute New Volatility (sigma')
    a = math.log(sigma * sigma)
    
    def f(x):
        ex = math.exp(x)
        A = ex * (delta * delta - phi * phi - v - ex)
        B = 2.0 * ((phi * phi + v + ex) ** 2)
        return (A / B) - ((x - a) / (TAU * TAU))
        
    # Iterative algorithm to find new sigma
    A = a
    if (delta * delta) > (phi * phi + v):
        B = math.log(delta * delta - phi * phi - v)
    else:
        k = 1
        while f(a - k * TAU) < 0:
            k += 1
        B = a - k * TAU
        
    fA = f(A)
    fB = f(B)
    
    epsilon = 0.000001
    while abs(B - A) > epsilon:
        C = A + (A - B) * fA / (fB - fA)
        fC = f(C)
        if fC * fB < 0:
            A = B
            fA = fB
        else:
            fA = fA / 2.0
        B = C
        fB = fC
        
    sigma_prime = math.exp(A / 2.0)
    
    # 5. Compute New RD (phi')
    phi_star = math.sqrt(phi * phi + sigma_prime * sigma_prime)
    new_phi = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + 1.0 / v)
    
    # 6. Compute New Rating (mu')
    new_mu = mu + (new_phi * new_phi) * g_phi_j * (score - E_mu_mu_j_phi_j)
    
    # 7. Convert back to scale
    new_rating = 1500 + scale * new_mu
    new_rd = scale * new_phi
    
    # Apply Floor
    if new_rd < MIN_RD:
        new_rd = MIN_RD
        
    return (new_rating, new_rd, sigma_prime)
