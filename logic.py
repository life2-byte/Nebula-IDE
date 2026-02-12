import webview
import customtkinter as ctk
from tkinter import filedialog
import os,json
from datetime import datetime
from model import model
import tkinter as tk
import shutil
from send2trash import send2trash

import os
import sys
import threading
import platform

IS_WINDOWS = platform.system() == "Windows"

if IS_WINDOWS:
    import winpty
else:
    import pty
    import select


class webmovement():
    def __init__(self):
        self.temp_cut_path = None

    def move_nextpage(self):
        webview.create_window('My Desktop App', 'web/index.html', frameless=True,easy_drag=False)
    def get_data(self,data):
        
        load_list = []
        name1 = load_list.append(data[0])
        path1 = load_list.append(data[1])
        description1 = load_list.append(data[2])
        name = load_list[0]
        path = load_list[1]
        description = load_list[2]
        make = os.path.join(path,name)
        os.makedirs(make)
        self.recentprojectsave(name,make,description)
        

        
    def send_data(self):
        file = "storage/recent.json"
        if os.path.exists(file):
            with open(file,"r") as f:
                data = json.load(f)
                return data
    def browse_folder(self):
        root = ctk.CTk()
        root.withdraw()
        root.attributes("-topmost", True)
        folder_selected = filedialog.askdirectory()
        root.destroy()
        if folder_selected:
            path = folder_selected
            name = os.path.basename(path)
            description = "project to solve problems"
            self.recentprojectsave(name,path,description)
        return folder_selected
    def open_specific_file(self):
        root = ctk.CTk()
        root.withdraw()
        root.attributes("-topmost", True)

        # File picker kholna
        file_path = filedialog.askopenfilename(
            title="Select a File",
            filetypes=[
                ("All Files", "*.*"),
                ("Python Files", "*.py"),
                ("Web Files", "*.html;*.css;*.js")
            ]
        )
        root.destroy()

        if file_path:
            # File ka naam aur uska content nikalna
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            print(content)
            return {
                "file_name": os.path.basename(file_path),
                "full_path": file_path,
                "content": content
            }
        return None

    def recentprojectsave(self, name, path, description):
        file_path = "storage/recent.json"
    
        # 1. Naya data jo humne dalkna hai
        new_entry = {
            "name": name,
            "path": path,
            "description": description,
            "time": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # 2. Pehle purana data load karo (agar file hai)
        if os.path.exists(file_path):
            with open(file_path, "r") as f:
                try:
                    current_data = json.load(f) # Purani list utha li
                except:
                    current_data = [] # Agar file kharab ho toh khali list
        else:
            current_data = []

        current_data = [item for item in current_data if item['path'] != path]

        current_data.insert(0, new_entry)

        current_data = current_data[:10]

        os.makedirs(os.path.dirname(file_path), exist_ok=True)
    
        with open(file_path, "w") as f:
            json.dump(current_data, f, indent=4)
    
    def send_model_response(self,prompt):
        response = model(prompt)
        return response



    def get_folder_structure(self, folderpath=None):
        result = []
        if folderpath is None:
            with open("storage/recent.json","r") as f:
                folder = json.load(f)
            access = folder[0]
            folderpath = access["path"]

        for item in os.listdir(folderpath):
            item_path = os.path.join(folderpath, item)

            if os.path.isdir(item_path):
                sub_structure = self.get_folder_structure(item_path)
                result.append({
                    "name": item,
                    "path": item_path,
                    "type": "folder",
                    "children": sub_structure.get("children", [])
                })
            else:
                # File
                result.append({
                    "name": item,
                    "path": item_path,
                    "type": "file"
                })
        
        main_name = os.path.basename(folderpath)
        root = {
        "name": main_name,
        "path": folderpath,
        "type": "folder",
        "children": result
    }
        
        return root


    def open_files_editor(self, file_path):
        try:
            # EXTENSION_LANGUAGE_MAP = {
            #     # Programming Languages
            #     "js": "javascript",
            #     "ts": "typescript",
            #     "py": "python",
            #     "cpp": "cpp",
            #     "c": "c",
            #     "cs": "csharp",
            #     "java": "java",
            #     "kt": "kotlin",
            #     "swift": "swift",
            #     "go": "go",
            #     "rs": "rust",
            #     "php": "php",
            #     "rb": "ruby",
            #     "dart": "dart",
            #     "scala": "scala",
            #     "r": "r",
            #     "lua": "lua",
            #     "pl": "perl",

            #     # Web / Frontend
            #     "html": "html",
            #     "css": "css",
            #     "scss": "scss",
            #     "less": "less",
            #     "json": "json",
            #     "xml": "xml",
            #     "svg": "xml",
            #     "jsx": "javascript",
            #     "tsx": "typescript",

            #     # Config / Scripts / Other
            #     "md": "markdown",
            #     "yaml": "yaml",
            #     "yml": "yaml",
            #     "ini": "ini",
            #     "sh": "shell",
            #     "bat": "bat",
            #     "sql": "sql",
            #     "txt": "plaintext"
            # }

            # for key,value in EXTENSION_LANGUAGE_MAP.items():
            #     if key == langExtension:
            #         print(key,"->",value)
            #     else:
            #         pass

            with open(file_path, "r", encoding="utf-8") as f:
                r = f.read()
            return r
        except Exception as e:
            print("war giya program",e)
    

    def create_newFile(self,path,name):
        filePath = os.path.join(path,name)
        with open(filePath ,"w") as f:
            f.write("")
        return {"status": "ok", "path": filePath}
    
    # ------------------- DELETE -------------------
    def delete_file(self, paths):
        from send2trash import send2trash

        if isinstance(paths, str):
            paths = [paths]  # convert single path to list

        deleted = []
        for path in paths:
            path = os.path.normpath(path)
            if not os.path.exists(path):
                return {"status": "error", "message": f"Path not found: {path}"}
            try:
                send2trash(path)
                deleted.append(path)
            except Exception as e:
                return {"status": "error", "message": f"Cannot delete {path}: {str(e)}"}

        return {"status": "ok", "deleted": deleted}


    # ------------------- RENAME -------------------
    def rename_file_folder(self, paths, new_names):
        """
        paths: string or list of paths
        new_names: string or list of new names (must match number of paths if list)
        """
        if isinstance(paths, str):
            paths = [paths]
        if isinstance(new_names, str):
            new_names = [new_names]

        if len(paths) != len(new_names):
            return {"status": "error", "message": "Number of paths and new names must match"}

        renamed = []
        for path, new_name in zip(paths, new_names):
            if not os.path.exists(path):
                return {"status": "error", "message": f"Path not found: {path}"}
            try:
                folder_dir = os.path.dirname(path)
                new_path = os.path.join(folder_dir, new_name)
                os.rename(path, new_path)
                renamed.append({"old_path": path, "new_path": new_path})
            except Exception as e:
                return {"status": "error", "message": f"Cannot rename {path}: {str(e)}"}

        return {"status": "ok", "renamed": renamed}

        





    def cmd_cut(self, paths):
        if isinstance(paths, str):
            paths = [paths]  # convert single path to list

        valid_paths = []
        for path in paths:
            if os.path.exists(path):
                valid_paths.append(path)
            else:
                return {"status": "error", "message": f"Path not found: {path}"}

        self.temp_cut_path = valid_paths

        # Save to JSON clipboard
        os.makedirs("storage", exist_ok=True)
        with open("storage/cut-file.json", "w") as f:
            json.dump(valid_paths, f)

        return {"status": "ok", "message": f"{len(valid_paths)} path(s) saved to cut clipboard"}

    # ------------------- PASTE -------------------
    def cmd_paste(self, destination_folder):
        clipboard_file = "storage/cut-file.json"

        # Load from RAM or JSON
        if not getattr(self, "temp_cut_path", None):
            if os.path.exists(clipboard_file):
                with open(clipboard_file, "r") as f:
                    try:
                        self.temp_cut_path = json.load(f)
                    except:
                        return {"status": "error", "message": "Cut clipboard corrupted"}

        if not getattr(self, "temp_cut_path", None):
            return {"status": "error", "message": "Nothing to paste"}

        moved_paths = []
        for path in self.temp_cut_path:
            if not os.path.exists(path):
                continue
            filename = os.path.basename(path)
            final_path = os.path.join(destination_folder, filename)
            shutil.move(path, final_path)
            moved_paths.append({"from": path, "to": final_path})

        # Clean up
        self.temp_cut_path = None
        if os.path.exists(clipboard_file):
            os.remove(clipboard_file)

        return {"status": "ok", "moved": moved_paths}

    # ------------------- COPY -------------------
    def cmd_copy(self, paths):
        if isinstance(paths, str):
            paths = [paths]

        valid_paths = []
        for path in paths:
            if os.path.exists(path):
                valid_paths.append(path)
            else:
                return {"status": "error", "message": f"Path not found: {path}"}

        self.temp_copy_path = valid_paths

        # Save to JSON
        os.makedirs("storage", exist_ok=True)
        with open("storage/copy-file.json", "w") as f:
            json.dump(valid_paths, f)

        return {"status": "ok", "message": f"{len(valid_paths)} path(s) saved to copy clipboard"}

    # ------------------- PASTE COPY -------------------
    def cmd_paste_copy(self, destination_folder):
        clipboard_file = "storage/copy-file.json"

        # Load from RAM or JSON
        if not getattr(self, "temp_copy_path", None):
            if os.path.exists(clipboard_file):
                with open(clipboard_file, "r") as f:
                    try:
                        self.temp_copy_path = json.load(f)
                    except:
                        return {"status": "error", "message": "Copy clipboard corrupted"}

        if not getattr(self, "temp_copy_path", None):
            return {"status": "error", "message": "Nothing to paste"}

        copied_paths = []
        for path in self.temp_copy_path:
            if not os.path.exists(path):
                continue

            filename = os.path.basename(path)
            final_path = os.path.join(destination_folder, filename)

            # Handle name conflict
            if os.path.exists(final_path):
                base, ext = os.path.splitext(filename)
                i = 1
                while os.path.exists(os.path.join(destination_folder, f"{base}_copy{i}{ext}")):
                    i += 1
                final_path = os.path.join(destination_folder, f"{base}_copy{i}{ext}")

            # Copy file or folder
            if os.path.isfile(path):
                shutil.copy2(path, final_path)
            elif os.path.isdir(path):
                shutil.copytree(path, final_path)

            copied_paths.append({"from": path, "to": final_path})

        # Clean up
        self.temp_copy_path = None
        if os.path.exists(clipboard_file):
            os.remove(clipboard_file)

        return {"status": "ok", "copied": copied_paths}

    def create_folder(self, parent_path, name):
        try:
            # name clean
            name = name.strip()

            if not name:
                return {"status": "error", "message": "Folder name is empty"}

            # final path
            full_path = os.path.normpath(os.path.join(parent_path, name))

            if os.path.exists(full_path):
                return {"status": "error", "message": "Folder already exists"}

            os.makedirs(full_path)

            return {
                "status": "ok",
                "path": full_path
            }

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }


    def save_files(self, path, content):
        if not path:
            return {"status": "fail", "message": "path not found"}

        try:
            # ensure folder exists
            folder = os.path.dirname(path)
            if folder:
                os.makedirs(folder, exist_ok=True)

            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

            return {
                "status": "success",
                "message": "file saved",
                "path": path
            }

        except Exception as e:
            return {
                "status": "fail",
                "message": "cannot save file",
                "error": str(e)
            }

    # SAVE (Ctrl + S)
    # frontend MUST send current open file path
    def save(self, current_path, content):
        return self.save_files(current_path, content)

    # SAVE AS (Ctrl + Shift + S)
    # frontend browse kare → new path bheje
    def save_as(self, new_path, content):
        return self.save_files(new_path, content)

    # AUTO SAVE
    def auto_save(self, current_path, content):
        if not current_path:
            return {"status": "skip", "message": "no path to autosave"}

        return self.save_files(current_path, content)
    def sdd(self, ext):
        print(ext)
# if __name__ == "__main__":
#     a = webmovement()
#     b = a.send_data()
#     d = b[0]["path"]
#     print(d)