import subprocess
import os
import shutil
import sys
import time

# Configuration
# Assuming this script resides in A:\applications\torok\python_scripts
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(SCRIPT_DIR) # Parent of python_scripts (A:\applications\torok)

# Script Paths
SHORT_DB_SCRIPT = os.path.join(SCRIPT_DIR, "create_short_db.py")
MOBILE_DB_SCRIPT = os.path.join(SCRIPT_DIR, "create_mobile_db.py")

# File Paths
MOBILE_DB_SOURCE = os.path.join(ROOT_DIR, "lichess_mobile_puzzles.sqlite")
MOBILE_ASSET_DEST = os.path.join(ROOT_DIR, "mobile", "assets", "starter_puzzles.db")

def run_step(description, command):
    print(f"\n[STEP] {description}")
    start_time = time.time()
    try:
        # Run python script with current interpreter
        subprocess.check_call([sys.executable, command])
        elapsed = time.time() - start_time
        print(f"✅ Completed in {elapsed:.2f}s")
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed! Error code: {e.returncode}")
        # Build should fail fast
        sys.exit(1)

def main():
    print("="*60)
    print(" 🧠 NeuroChess Data Pipeline Generator 🧠")
    print("="*60)
    print(f"Root Directory: {ROOT_DIR}")
    
    # Step 1: Create Short DB (Enriched with Themes)
    # This reads the massive lichess_db and creates enriched intermediate DB
    run_step("1. Generating Enriched Short DB (Schema & Themes)...", SHORT_DB_SCRIPT)

    # Step 2: Create Mobile DB (Subset)
    # This reads the enriched DB and creates the lightweight mobile asset
    run_step("2. Generating Mobile Subset DB (1k/band)...", MOBILE_DB_SCRIPT)

    # Step 3: Deployment
    print(f"\n[STEP] 3. Deploying to Mobile Assets...")
    if not os.path.exists(MOBILE_DB_SOURCE):
         print(f"❌ Error: Source file {MOBILE_DB_SOURCE} missing!")
         sys.exit(1)
         
    try:
        os.makedirs(os.path.dirname(MOBILE_ASSET_DEST), exist_ok=True)
        # Force copy
        shutil.copy2(MOBILE_DB_SOURCE, MOBILE_ASSET_DEST)
        
        # Verify
        if os.path.exists(MOBILE_ASSET_DEST):
            size_mb = os.path.getsize(MOBILE_ASSET_DEST) / 1024 / 1024
            print(f"✅ Deployed to: {MOBILE_ASSET_DEST}")
            print(f"   Final Size: {size_mb:.2f} MB")
        else:
            raise FileNotFoundError("Copy seemed to work but file is missing.")
            
    except Exception as e:
        print(f"❌ Deployment Failed: {e}")
        sys.exit(1)

    print("\n" + "="*60)
    print("🎉 PIPELINE COMPLETION SUCCESSFUL 🎉")
    print("="*60)

if __name__ == "__main__":
    main()
