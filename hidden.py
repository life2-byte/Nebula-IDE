import os
import ctypes
import json

def create_project_structure(project_path):
    # 1. Hidden folder ka rasta (path)
    hidden_folder = os.path.join(project_path, ".codeflow")
    
    # 2. Folder create karo agar nahi bana hua
    if not os.path.exists(hidden_folder):
        os.makedirs(hidden_folder)
        
        # 3. Windows ka JUGAD: Isay hidden attribute set karo
        # 0x02 ka matlab hota hai 'Hidden'
        ctypes.windll.kernel32.SetFileAttributesW(hidden_folder, 0x02)
        
    # 4. Settings file banao uske andar
    settings = {"theme": "dark", "last_opened": "main.py"}
    with open(os.path.join(hidden_folder, "settings.json"), "w") as f:
        json.dump(settings, f)

    print("Hidden folder and settings created!")

import os

# Jab terminal load ho ya naya command chale, ye path bhejo
def get_terminal_path():
    return os.getcwd() + "> "

if __name__ == "__main__":
    r = get_terminal_path()
    print(r)