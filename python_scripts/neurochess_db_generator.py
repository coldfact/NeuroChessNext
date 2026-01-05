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
# Script Paths
SHORT_DB_SCRIPT = os.path.join(SCRIPT_DIR, "create_short_db.py")
LONG_DB_SCRIPT = os.path.join(SCRIPT_DIR, "create_long_db.py")
MOBILE_DB_SCRIPT = os.path.join(SCRIPT_DIR, "create_mobile_db.py")

# File Paths (For Verification)
MOBILE_ASSET_DEST = os.path.join(ROOT_DIR, "mobile", "assets", "neurochess.db")
MOBILE_EXTRA_DEST = os.path.join(ROOT_DIR, "mobile_puzzles_extra.sqlite")
DEEP_DLC_DEST = os.path.join(ROOT_DIR, "mobile_deep_extra.sqlite")

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

    # Step 2: Create Long DB (Enriched with Themes)
    run_step("2. Generating Enriched Long DB (Ply >= 8)...", LONG_DB_SCRIPT)

    # Step 3: Create Mobile DB (Subset)
    # This reads the enriched short DB and creates the lightweight mobile asset directly
    run_step("3. Generating Mobile Asset DB, Extra Puzzles & Deep DLC...", MOBILE_DB_SCRIPT)

    # Verification
    print(f"\n[VERIFICATION]")
    
    # 1. Base DB
    if os.path.exists(MOBILE_ASSET_DEST):
        size_mb = os.path.getsize(MOBILE_ASSET_DEST) / 1024 / 1024
        print(f"✅ Mobile Base DB verified at: {MOBILE_ASSET_DEST}")
        print(f"   Size: {size_mb:.2f} MB")
    else:
        print(f"❌ Error: Mobile DB not found at {MOBILE_ASSET_DEST}")
        sys.exit(1)

    # 2. Extra DB (DLC)
    if os.path.exists(MOBILE_EXTRA_DEST):
        size_mb = os.path.getsize(MOBILE_EXTRA_DEST) / 1024 / 1024
        print(f"✅ Standard Puzzles DLC verified at: {MOBILE_EXTRA_DEST}")
        print(f"   Size: {size_mb:.2f} MB")
    else:
        print(f"❌ Error: Extra Puzzles DB not found at {MOBILE_EXTRA_DEST}")
        sys.exit(1)

    # 3. Deep DLC
    if os.path.exists(DEEP_DLC_DEST):
        size_mb = os.path.getsize(DEEP_DLC_DEST) / 1024 / 1024
        print(f"✅ Deep Mode DLC verified at: {DEEP_DLC_DEST}")
        print(f"   Size: {size_mb:.2f} MB")
    else:
        print(f"❌ Error: Deep DLC not found at {DEEP_DLC_DEST}")
        sys.exit(1)

    print("\n" + "="*60)
    print("🎉 PIPELINE COMPLETION SUCCESSFUL 🎉")
    print("="*60)

if __name__ == "__main__":
    main()
