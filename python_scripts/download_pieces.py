import os
import requests
import time

PIECE_SETS = {
    "cburnett": "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/cburnett/{piece}.svg",
    "merida": "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/merida/{piece}.svg",
    "fresca": "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/fresca/{piece}.svg",
    "horsey": "https://raw.githubusercontent.com/lichess-org/lila/master/public/piece/horsey/{piece}.svg",
}

PIECES = ["wP", "wN", "wB", "wR", "wQ", "wK", "bP", "bN", "bB", "bR", "bQ", "bK"]
BASE_DIR = r"A:\applications\torok\mobile\assets\pieces"

def download_pieces():
    for set_name, url_template in PIECE_SETS.items():
        print(f"Downloading set: {set_name}...")
        set_dir = os.path.join(BASE_DIR, set_name)
        os.makedirs(set_dir, exist_ok=True)
        
        for piece in PIECES:
            url = url_template.format(piece=piece)
            save_path = os.path.join(set_dir, f"{piece}.svg")
            
            try:
                resp = requests.get(url, timeout=10)
                if resp.status_code == 200:
                    with open(save_path, "wb") as f:
                        f.write(resp.content)
                    print(f"  - Downloaded {piece}.svg")
                else:
                    print(f"  ! Failed {piece}.svg ({resp.status_code})")
            except Exception as e:
                print(f"  ! Error {piece}.svg: {e}")
            
            # Be nice to GitHub
            time.sleep(0.1)

if __name__ == "__main__":
    download_pieces()
