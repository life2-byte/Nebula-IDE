import webview
import os
import asyncio
import json
import threading
import win32gui
import win32api
import win32con

# Apni modules import karein
from logic import webmovement
from ai_controller import GITHUB,readme,HOLD_MY_TEA_MOMENT
from run import TerminalServer, main as start_ws_server # main ko alias de diya

file_path = os.path.join(os.getcwd(), 'home.html')

class Api(webmovement, TerminalServer):
    def __init__(self):
        # Dono parent classes ko sahi se initialize karein
        webmovement.__init__(self)
        TerminalServer.__init__(self)
        self.github = GITHUB(None)
        self.updation = HOLD_MY_TEA_MOMENT()
    
    def hold_my_tea(self):
        try:
            self.updation.whole_folder()
        except Exception as e:
            print("error",e)
    def calling_function(self):
        try:
            readme()
        except Exception as e:
            print("error",e)
    def clone_repo1(self, url, destination):
    # Use the GITHUB class from ai_controller.py
        github = GITHUB()
        result = github.clone_repo(url, destination)
        if result == True:
            name = os.path.basename(destination)
            path = os.path.join(destination)
            description = f"Cloned repository from {url}"
            call = webmovement()
            call.recentprojectsave(name,path,description)
            return {"success": True, "path": path, "description": description}
    def github_Repo(self,url,branch):
        self.github.repo_start(url,branch)
        self.github.validation()
    
    def open_recent_project(self, project_path):
        """Open a recent project by setting its path"""
        try:
            # Set the project path using webmovement method
            # Assuming webmovement has a method to set current project path
            self.set_project_path(project_path)
            return {"success": True, "path": project_path}
        except Exception as e:
            print(f"Error opening recent project: {e}")
            return {"success": False, "error": str(e)}
    
    def minimize(self):
        if webview.windows:
            webview.windows[0].minimize()

    def maximize(self):
        if not webview.windows:
            return
            
        window = webview.windows[0]
        monitor_info = win32api.GetMonitorInfo(win32api.MonitorFromPoint((0,0), win32con.MONITOR_DEFAULTTONEAREST))
        work_area = monitor_info['Work']
        
        x, y, width, height = work_area[0], work_area[1], work_area[2] - work_area[0], work_area[3] - work_area[1]

        if window.width >= width and window.height >= height:
            window.resize(1200, 800) # Default size
        else:
            window.move(x, y)
            window.resize(width, height)

    def close(self):
        if webview.windows:
            webview.windows[0].destroy()

def start():
    api = Api()
    
    # 1. WebSocket Server ko background mein chalane ka sahi tareeqa
    # Humne import mein 'main' ko 'start_ws_server' ka naam diya hai
    def run_async_logic():
        asyncio.run(start_ws_server())

    threading.Thread(target=run_async_logic, daemon=True).start()

    # 2. Window Create karein
    webview.create_window(
        'Nebula IDE', 
        file_path, 
        js_api=api, 
        frameless=True, 
        easy_drag=False,
    )
    
    webview.start()

if __name__ == "__main__":
    # a = Api()
    # a.github_Repo("https://github.com/life2-byte/testing.git")
    start()