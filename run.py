# import subprocess
# import sys
# import os
# import webbrowser
# import shutil

# class RUN:
#     def __init__(self):
#         # Supported languages list
#         self.supported_languages = {
#             "python": sys.executable,
#             "javascript": shutil.which("node"),
#             "typescript": shutil.which("ts-node"),
#             "cpp": shutil.which("g++"),
#             "c": shutil.which("gcc"),
#             "java": shutil.which("java"),
#             # HTML handled separately
#         }

#     def run_code(self, code, language):
#         language = language.lower()  # normalize
#         if language not in self.supported_languages and language != "html":
#             return f"Language '{language}' not supported"

#         file_name = f"temp_script"
#         if language == "python":
#             file_name += ".py"
#         elif language == "javascript":
#             file_name += ".js"
#         elif language == "typescript":
#             file_name += ".ts"
#         elif language == "cpp":
#             file_name += ".cpp"
#         elif language == "c":
#             file_name += ".c"
#         elif language == "java":
#             file_name += ".java"
#         elif language == "html":
#             file_name += ".html"
#         else:
#             file_name += ".txt"  # fallback

#         try:
#             # Write temp file
#             with open(file_name, "w", encoding="utf-8") as f:
#                 f.write(code)

#             # HTML special case (commented for now)
#             # if language == "html":
#             #     webbrowser.open(os.path.abspath(file_name))
#             #     return "HTML opened in browser"

#             # Determine interpreter
#             interpreter = self.supported_languages.get(language)
#             if not interpreter:
#                 return f"{language} interpreter/compiler not found"

#             # Build command
#             cmd = [interpreter]
#             if language == "python":
#                 cmd.append("-X")
#                 cmd.append("utf8")
#             cmd.append(file_name)

#             # Run subprocess
#             process = subprocess.Popen(
#                 cmd,
#                 stdout=subprocess.PIPE,
#                 stderr=subprocess.PIPE,
#                 text=True,
#                 encoding="utf-8"
#             )

#             stdout, stderr = process.communicate()

#             # Cleanup
#             if os.path.exists(file_name):
#                 os.remove(file_name)

#             if stderr:
#                 return f"Error:\n{stderr}"
#             return stdout if stdout else "Code executed successfully"

#         except Exception as e:
#             if os.path.exists(file_name):
#                 os.remove(file_name)
#             return f"Exception: {e}"


# import subprocess

# process = subprocess.Popen(
#     [
#         "python",
#         "-X", "utf8",
#         r"c:\Users\User\Desktop\New folder (3)\heart.html"
#     ],
#     stdout=subprocess.PIPE,
#     stderr=subprocess.PIPE,
#     text=True,
#     encoding="utf-8"
# )

# for line in process.stdout:
#     print(line, end="")

# for err in process.stderr:
#     print("ERR:", err, end="")
# import webbrowser
# webbrowser.open(r"c:\Users\User\Desktop\New folder (3)\heart.html")
# import subprocess
# import sys

# # pip install requests
# subprocess.run([sys.executable, "-m", "pip", "install", "requests"], check=True)
import asyncio
import websockets
import os
import json
import tempfile
import webbrowser
import time
from winpty import PTY

# ================= PATH LOAD =================
try:
    with open("storage/recent.json", "r") as f:
        start_path = json.load(f)[0]["path"]
except:
    start_path = os.getcwd()

# ================= SERVER =================
class TerminalServer:
    def __init__(self):
        self.start_path = start_path
        self.pty = None
        self.is_active = False
        self.temp_files = []
        self.html_cleanup_delay = 5
        self.reading_output = False
        self.echo_mode = False  # Track if we should echo user input

        self.languages = {
            "python": ".py",
            "javascript": ".js",
            "typescript": ".ts",
            "cpp": ".cpp",
            "c": ".c",
            "java": ".java",
            "html": ".html",
            "css": ".css"
        }

    def create_pty(self):
        if self.pty:
            self.destroy_pty()

        # VERY WIDE WIDTH to prevent wrapping
        self.pty = PTY(800, 50)
        
        # Use CMD with proper settings - /K keeps window open, /Q disables echo
        self.pty.spawn('cmd.exe /Q /K @echo off', cwd=self.start_path)
        self.is_active = True
        
        time.sleep(0.5)
        
        # Clear initial output
        try:
            initial_data = self.pty.read()
            print(f"[DEBUG] Initial PTY output cleared: {len(initial_data)} bytes")
        except:
            pass
        
        # Send initial commands to configure terminal
        self.pty.write('cls\r\n')
        time.sleep(0.1)
        try:
            self.pty.read()  # Clear cls output
        except:
            pass
        
        print("✅ PTY started with echo disabled")

    def destroy_pty(self):
        try:
            if self.pty:
                self.pty.close()
        except:
            pass

        self.pty = None
        self.is_active = False
        asyncio.create_task(self.delayed_cleanup())
        print("🗑️ PTY destroyed")

    async def delayed_cleanup(self):
        await asyncio.sleep(self.html_cleanup_delay)
        for f in self.temp_files:
            try:
                if os.path.exists(f):
                    os.remove(f)
            except:
                pass
        self.temp_files.clear()

    def clean_output(self, data):
        """Remove ANSI codes and cleanup markers"""
        # Remove ANSI escape sequences
        data = data.replace('\x1b[?2004h', '').replace('\x1b[?2004l', '')
        data = data.replace('\x1b[?25h', '').replace('\x1b[?25l', '')
        data = data.replace('\x1b[?1h', '').replace('\x1b[?1l', '')
        
        # Remove markers
        data = data.replace('__DONE__', '')
        data = data.replace('__CMD_START__', '')
        
        return data

    # ================= RUN FILE =================
    async def run_file(self, lang, filepath, ws):
        if not os.path.exists(filepath):
            await ws.send(f"\r\n❌ File not found: {filepath}\r\n")
            return

        if filepath.endswith(('.html', '.css')):
            file_url = f"file:///{filepath.replace(os.sep, '/')}"
            webbrowser.open(file_url)
            await ws.send(f"\r\n🌐 Opened: {os.path.basename(filepath)}\r\n")
            return

        # Convert paths with spaces to 8.3 format to avoid wrapping
        short_path = filepath
        try:
            # Get short path name (8.3 DOS format)
            import ctypes
            from ctypes import wintypes
            
            get_short_path_name = ctypes.windll.kernel32.GetShortPathNameW
            get_short_path_name.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
            get_short_path_name.restype = wintypes.DWORD
            
            buffer_size = 500
            buffer = ctypes.create_unicode_buffer(buffer_size)
            ret = get_short_path_name(filepath, buffer, buffer_size)
            
            if ret:
                short_path = buffer.value
                print(f"[DEBUG] Short path: {short_path}")
        except Exception as e:
            print(f"[DEBUG] Could not get short path: {e}")

        # Build command
        if lang == "python":
            cmd = f'python -u "{short_path}"'
        elif lang == "javascript":
            cmd = f'node "{short_path}"'
        elif lang == "typescript":
            cmd = f'npx ts-node "{short_path}"'
        elif lang in ["c", "cpp"]:
            exe = short_path.replace('.c' if lang == 'c' else '.cpp', '.exe')
            compiler = "gcc" if lang == "c" else "g++"
            cmd = f'{compiler} "{short_path}" -o "{exe}" && "{exe}"'
        elif lang == "java":
            cls = os.path.basename(short_path).replace(".java", "")
            cmd = f'javac "{short_path}" && java -cp "{os.path.dirname(short_path)}" {cls}'
        else:
            await ws.send(f"\r\n❌ Unsupported: {lang}\r\n")
            return

        # Execute
        if self.pty and self.is_active:
            self.reading_output = True
            
            print(f"[DEBUG] Executing: {cmd}")
            
            # Send command with completion marker
            self.pty.write(f'{cmd} && echo __DONE__\r\n')
            
            await asyncio.sleep(0.3)
            
            output_buffer = ""
            max_wait = 200
            wait_count = 0
            done_found = False
            last_output_time = time.time()
            
            while wait_count < max_wait and not done_found:
                await asyncio.sleep(0.05)
                try:
                    data = self.pty.read()
                    if data:
                        last_output_time = time.time()
                        output_buffer += data
                        
                        if "__DONE__" in data:
                            done_found = True
                            
                        clean_data = self.clean_output(data)
                        if clean_data.strip():
                            await ws.send(clean_data)
                    else:
                        # No data - check timeout
                        if time.time() - last_output_time > 2.0:
                            # No output for 2 seconds, might be done
                            break
                            
                except Exception as e:
                    print(f"[DEBUG] Read error: {e}")
                    pass
                    
                wait_count += 1
            
            self.reading_output = False
            
            if not done_found:
                print(f"[DEBUG] Timeout or completed without marker")

    # ================= RUN CODE =================
    async def run_code(self, lang, code, ws):
        ext = self.languages.get(lang)
        if not ext:
            await ws.send(f"\r\n❌ Unsupported language: {lang}\r\n")
            return

        fd, path = tempfile.mkstemp(suffix=ext, text=True)
        try:
            os.write(fd, code.encode('utf-8'))
        finally:
            os.close(fd)

        self.temp_files.append(path)

        if ext in [".html", ".css"]:
            file_url = f"file:///{path.replace(os.sep, '/')}"
            webbrowser.open(file_url)
            await ws.send(f"\r\n🌐 Browser opened\r\n")
            return

        # Run the file
        await self.run_file(lang, path, ws)

    # ================= WS HANDLER =================
    async def handler(self, ws):
        print("🔗 Client connected")

        if not self.is_active:
            self.create_pty()

        reader = asyncio.create_task(self.read_pty(ws))

        try:
            async for msg in ws:
                if msg == "__TERMINAL_RESET__":
                    self.destroy_pty()
                    await asyncio.sleep(0.3)
                    self.create_pty()
                    await ws.send("\x1b[2J\x1b[H")
                    continue

                if msg.startswith("__RUN_FILE__"):
                    _, lang, filepath = msg.split(":", 2)
                    await self.run_file(lang.lower(), filepath, ws)
                    continue

                if msg.startswith("__RUN__"):
                    header, code = msg[len("__RUN__"):].split(":", 1)
                    await self.run_code(header.lower(), code, ws)
                    continue

                # Terminal input - DON'T echo, PTY handles it
                if self.pty and self.is_active:
                    # Write to PTY without echoing back
                    self.pty.write(msg)
                    await asyncio.sleep(0.01)

        except websockets.exceptions.ConnectionClosed:
            print("❌ Client disconnected")
        finally:
            reader.cancel()
            self.destroy_pty()

    # ================= READ PTY =================
    async def read_pty(self, ws):
        """Background reader - reads PTY output and sends to client"""
        while True:
            try:
                if self.pty and self.is_active and not self.reading_output:
                    data = self.pty.read()
                    if data:
                        clean = self.clean_output(data)
                        if clean.strip():
                            await ws.send(clean)
                await asyncio.sleep(0.01)
            except Exception as e:
                print(f"[DEBUG] Read PTY error: {e}")
                break


# ================= START =================
server = TerminalServer()

async def main():
    async with websockets.serve(server.handler, "localhost", 8000):
        print("🚀 Terminal Server v5 - FIXED ECHO & CURSOR")
        print("🔌 ws://localhost:8000")
        print("✅ Fixed: Double echo, cursor position, 8.3 path support")
        await asyncio.Future()

if __name__ == "__main__":
    asyncio.run(main())