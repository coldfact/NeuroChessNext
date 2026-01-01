import requests
import json

def test_server():
    try:
        url = "http://localhost:5000/get_puzzles?count=3&mode=standard"
        print(f"Requesting {url}...")
        resp = requests.get(url)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print("Response Key 'user_rating':", data.get('user_rating'))
            print("Puzzles Count:", len(data.get('puzzles', [])))
            print("Sample Puzzle:", data.get('puzzles')[0]['PuzzleId'] if data.get('puzzles') else "None")
        else:
            print("Error Text:", resp.text)
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == "__main__":
    test_server()
