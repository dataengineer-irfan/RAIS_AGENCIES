import os
import sys

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCRIPT_PATH = os.path.join(BASE_DIR, "scripts", "generate_app_icons.py")

if __name__ == "__main__":
    if os.path.exists(SCRIPT_PATH):
        import importlib.util
        spec = importlib.util.spec_from_file_location("generate_app_icons", SCRIPT_PATH)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        module.generate_all_assets()
    else:
        print(f"Icon generator not found at {SCRIPT_PATH}")
