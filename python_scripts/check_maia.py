import torch
from maia2 import model, inference

def verify_install():
    print(f"--- Maia-2 Diagnostic ---")
    
    # Check GPU Support
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Device detected: {device.upper()}")
    
    # 1. Load the Model (will download weights if missing)
    print("Loading pre-trained rapid model...")
    maia2_model = model.from_pretrained(type="rapid", device=device)
    
    # 2. Prepare for Inference
    prepared = inference.prepare()
    print("Inference engine ready.")

    # 3. Test a classic position (Starting Position)
    test_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
    target_elo = 1500
    
    print(f"Running inference at Elo {target_elo}...")
    move_probs, win_prob = inference.inference_each(
        maia2_model, 
        prepared, 
        test_fen, 
        elo_self=target_elo, 
        elo_oppo=target_elo
    )

    # 4. Display Results
    # Get top 3 predicted moves
    sorted_moves = sorted(move_probs.items(), key=lambda x: x[1], reverse=True)[:3]
    
    print("\nTop Human Predictions:")
    for move, prob in sorted_moves:
        print(f"Move: {move} | Probability: {prob:.2%}")
    
    print(f"\nModel Estimated Win Probability: {win_prob:.2%}")
    print("--- SUCCESS: Maia-2 is fully operational ---")

if __name__ == "__main__":
    verify_install()