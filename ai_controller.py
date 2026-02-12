import speech_recognition as sr
import pyttsx3
import pyaudio
import tempfile
import time
import os
import fnmatch
from datetime import datetime
import json
import subprocess
from model import model
from logic import webmovement

# ===== IMPROVED GITIGNORE LIST =====
GITIGNORE_LIST = [
    # System / OS
    ".git/",
    ".git",
    ".DS_Store",
    "Thumbs.db",
    "desktop.ini",
    ".fseventsd",
    ".Spotlight-V100",
    ".Trashes",
    
    # Editor / IDE
    ".vscode/",
    ".vs/",
    ".idea/",
    "*.suo",
    "*.ntvs*",
    "*.njsproj",
    "*.sln",
    "*.swp",
    "*.swo",
    
    # Python
    "__pycache__/",
    "*.pyc",
    "*.pyo",
    "*.pyd",
    ".Python",
    "pip-log.txt",
    "pip-delete-this-directory.txt",
    "pyvenv.cfg",
    ".env",
    "venv/",
    ".venv/",
    "env/",
    "ENV/",
    "pip-wheel-metadata/",
    ".pytest_cache/",
    ".mypy_cache/",
    ".coverage",
    "htmlcov/",
    ".tox/",
    ".nox/",
    "coverage.xml",
    
    # Node.js / Frontend
    "node_modules/",
    "npm-debug.log*",
    "yarn-debug.log*",
    "yarn-error.log*",
    ".npm",
    ".yarn",
    ".yarnrc",
    "yarn.lock",
    "package-lock.json",
    "pnpm-debug.log*",
    "pnpm-lock.yaml",
    ".pnpm-store/",
    ".next/",
    ".nuxt/",
    "dist/",
    "out/",
    ".vuepress/dist",
    ".cache/",
    ".parcel-cache/",
    
    # Java
    "target/",
    "*.jar",
    "*.war",
    "*.ear",
    "*.class",
    ".gradle/",
    "gradle-app.setting",
    "!gradle-wrapper.jar",
    "build/",
    "out/",
    ".apt_generated/",
    
    # .NET / C#
    "bin/",
    "obj/",
    "*.user",
    "*.aps",
    "*.ncb",
    "*.opensdf",
    "*.sdf",
    "_ReSharper*/",
    "*.csproj.user",
    
    # Ruby
    "*.gem",
    ".bundle",
    "vendor/bundle/",
    
    # Go
    "vendor/",
    "go.sum",
    
    # Rust
    "target/",
    "Cargo.lock",
    
    # PHP
    "vendor/",
    "composer.lock",
    
    # Android
    "*.apk",
    "*.ap_",
    "*.dex",
    "*.class",
    "gen/",
    "bin/",
    
    # iOS / macOS
    "*.ipa",
    "*.dSYM.zip",
    "*.dSYM",
    "Pods/",
    "DerivedData/",
    
    # Build / Generated files
    "dist/",
    "build/",
    "out/",
    ".cache/",
    ".parcel-cache/",
    ".eslintcache",
    "*.tgz",
    "*.tar.gz",
    "*.zip",
    
    # Logs / Temp files
    "*.log",
    "*.tmp",
    "*.temp",
    "*.bak",
    "*.backup",
    "*.sublime-*",
    
    # Secrets / Configuration
    "*.key",
    "*.pem",
    "*.crt",
    ".env.local",
    ".env.production",
    ".env.development",
    "*.secret",
    "credentials.json",
    "firebase.json",
    "serviceAccountKey.json",
    
    # Database
    "*.db",
    "*.sqlite",
    "*.sqlite3",
    
    # Testing
    ".nyc_output/",
    "coverage/",
    "*.lcov",
    
    # Documentation
    "site/",
    ".docz/",
    
    # Project specific
    "monacco folde/node_modules/",
    "xterm folder/node_modules/",
    "storage/*.tmp",
    
    # Project files
    "*.project",
    "*.settings/",
    ".classpath",
    
    # OS generated
    ".directory",
    "*~",
    "*.lock",
    "*.pid",
    
    # Graphics/Media
    "*.png",
    "*.jpg",
    "*.jpeg",
    "*.gif",
    "*.ico",
    "*.svg",
    "*.mp4",
    "*.mov",
    "*.avi",
    
    # Documents
    "*.pdf",
    "*.doc",
    "*.docx",
    "*.xls",
    "*.xlsx",
    "*.ppt",
    "*.pptx",
    
    # Archives
    "*.7z",
    "*.dmg",
    "*.gz",
    "*.iso",
    "*.rar",
    "*.tar",
    "*.zip",
]

GITHUB_COMMANDS = {
    # Repository commands
    "init_repo": "git init",
    "clone_repo": "git clone <repo_url>",
    "add_remote": "git remote add origin <repo_url>",
    "show_remotes": "git remote -v",

    # File staging / committing
    "add_all": "git add .",
    "add_file": "git add <file_path>",
    "commit": 'git commit -m "<message>"',
    "status": "git status",
    "diff": "git diff",
    "log": "git log",

    # Branch commands
    "branch_list": "git branch",
    "branch_create": "git branch <branch_name>",
    "branch_switch": "git checkout <branch_name>",
    "branch_delete": "git branch -d <branch_name>",

    # Push / Pull
    "push": "git push origin <branch_name>",
    "pull": "git pull origin <branch_name>",
    "fetch": "git fetch",

    # Merge / Rebase
    "merge": "git merge <branch_name>",
    "rebase": "git rebase <branch_name>",

    # Tagging
    "tag_list": "git tag",
    "create_tag": "git tag <tag_name>",
    "push_tag": "git push origin <tag_name>",

    # Undo / Reset
    "reset_hard": "git reset --hard",
    "reset_soft": "git reset --soft HEAD~1",

    # Others
    "stash": "git stash",
    "stash_apply": "git stash apply",
    "clone_depth": "git clone --depth 1 <repo_url>",
}


# ===== HELPER FUNCTIONS =====

def should_ignore_file(file_path, project_root):
    """
    Check if file should be ignored based on GITIGNORE_LIST
    """
    rel_path = os.path.relpath(file_path, project_root)
    file_name = os.path.basename(file_path)
    
    for pattern in GITIGNORE_LIST:
        # Folder patterns (ending with /)
        if pattern.endswith('/'):
            folder_pattern = pattern.rstrip('/')
            if folder_pattern in rel_path.split(os.sep):
                return True
        # File patterns
        else:
            if fnmatch.fnmatch(file_name, pattern):
                return True
            if fnmatch.fnmatch(rel_path, pattern):
                return True
    
    return False


def should_ignore_directory(dir_name, dir_path, project_root):
    """
    Check if directory should be ignored
    """
    for pattern in GITIGNORE_LIST:
        if pattern.endswith('/'):
            folder_pattern = pattern.rstrip('/')
            if fnmatch.fnmatch(dir_name, folder_pattern):
                return True
    return False


def get_file_size_kb(file_path):
    """Get file size in KB"""
    try:
        return os.path.getsize(file_path) / 1024
    except:
        return 0


def is_text_file(file_path):
    """Check if file is likely a text file"""
    text_extensions = [
        '.py', '.js', '.jsx', '.ts', '.tsx', '.java', '.cpp', '.c', '.h', 
        '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', '.scala',
        '.html', '.css', '.scss', '.sass', '.less', '.xml', '.json',
        '.yaml', '.yml', '.toml', '.ini', '.cfg', '.conf',
        '.md', '.txt', '.rst', '.tex',
        '.sh', '.bash', '.zsh', '.ps1', '.bat', '.cmd',
        '.sql', '.r', '.m', '.f', '.f90', '.pl', '.lua'
    ]
    
    _, ext = os.path.splitext(file_path)
    return ext.lower() in text_extensions


def get_file_priority(file_path):
    """
    Files ko priority assign kare
    Priority order:
    1. Main code files (.py, .js, .html, .css) - HIGH priority
    2. Config files (.json, .yml, .toml) - MEDIUM priority  
    3. Other text files - LOW priority
    """
    _, ext = os.path.splitext(file_path)
    ext = ext.lower()
    filename = os.path.basename(file_path).lower()
    
    # HIGH PRIORITY (1) - Main source code
    high_priority_exts = ['.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss']
    if ext in high_priority_exts:
        return 1
    
    # MEDIUM PRIORITY (2) - Important config files
    if filename in ['package.json', 'requirements.txt', 'setup.py', 'main.py', 'app.py', 'index.html']:
        return 2
    
    # LOW PRIORITY (3) - Other configs and data files
    config_exts = ['.json', '.yml', '.yaml', '.toml', '.xml', '.ini', '.cfg']
    if ext in config_exts:
        return 3
    
    # LOWEST PRIORITY (4) - Everything else
    return 4


def estimate_tokens(text):
    """
    Estimate tokens from text (rough calculation)
    Average: 1 token ≈ 4 characters
    """
    return len(text) // 4


# ===== IMPROVED README GENERATOR WITH TPM LIMIT =====

def readme_smart():
    """
    ⭐ IMPROVED: Smart README generator with TPM limit handling
    - Groq limit: 12,000 TPM (tokens per minute)
    - Process files in batches to stay under limit
    - Add delays between batches
    """
    try:
        # Load project path
        with open("storage/recent.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        project_path = data[0]["path"]
        readme_path = os.path.join(project_path, "README.md")
        
        print("\n" + "="*70)
        print("📚 SMART README GENERATOR v3 - WITH TPM RATE LIMIT HANDLING")
        print("="*70)
        print(f"📂 Project: {project_path}")
        print(f"📄 Output: {readme_path}")
        print(f"⚡ API Limit: 12,000 TPM (Tokens Per Minute)")
        print("="*70 + "\n")
        
        # ⭐ STEP 1: Collect ALL valid files
        all_files = []
        ignored_files = []
        
        print("🔍 Phase 1: Scanning project files...\n")
        
        for root, dirs, files in os.walk(project_path):
            dirs[:] = [d for d in dirs if not should_ignore_directory(d, os.path.join(root, d), project_root=project_path)]
            
            if '.git' in dirs:
                dirs.remove('.git')
            
            for file in files:
                file_path = os.path.join(root, file)
                rel_path = os.path.relpath(file_path, project_path)
                
                if should_ignore_file(file_path, project_path):
                    ignored_files.append(rel_path)
                    continue
                
                if not is_text_file(file_path):
                    ignored_files.append(rel_path)
                    continue
                
                file_size = get_file_size_kb(file_path)
                if file_size > 500:
                    ignored_files.append(f"{rel_path} (too large: {file_size:.1f}KB)")
                    continue
                
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                    
                    priority = get_file_priority(file_path)
                    tokens = estimate_tokens(content)
                    
                    all_files.append({
                        'path': rel_path,
                        'full_path': file_path,
                        'content': content,
                        'size': file_size,
                        'priority': priority,
                        'tokens': tokens
                    })
                    
                except Exception as e:
                    ignored_files.append(f"{rel_path} (read error)")
                    continue
        
        print(f"✅ Found {len(all_files)} valid files")
        print(f"⏭️  Ignored {len(ignored_files)} files\n")
        
        if len(all_files) == 0:
            print("❌ No files found!")
            return False
        
        # ⭐ STEP 2: Sort by priority
        print("🎯 Phase 2: Prioritizing files...\n")
        all_files.sort(key=lambda x: (x['priority'], x['path']))
        
        for priority_level in [1, 2, 3, 4]:
            priority_files = [f for f in all_files if f['priority'] == priority_level]
            if priority_files:
                priority_name = {1: "HIGH", 2: "MEDIUM", 3: "LOW", 4: "OTHER"}[priority_level]
                total_tokens = sum(f['tokens'] for f in priority_files)
                print(f"  Priority {priority_level} ({priority_name}): {len(priority_files)} files (~{total_tokens:,} tokens)")
        
        # ⭐ STEP 3: Create batches within TPM limit
        print("\n📦 Phase 3: Creating batches (TPM limit: 12,000)...\n")
        
        TPM_LIMIT = 12000  # Groq's limit
        SAFETY_MARGIN = 2000  # Reserve for prompt + response
        MAX_TOKENS_PER_BATCH = TPM_LIMIT - SAFETY_MARGIN  # 10,000 tokens per batch
        
        batches = []
        current_batch = []
        current_tokens = 0
        
        # Estimate base prompt tokens
        base_prompt = """You are Nebula IDE AI. Analyze project code and create README.md.
        
📝 TASK:
Create a professional README.md with:
- Project title and description with emojis
- Key features and functionality
- Technology stack used
- File structure overview
- Installation/setup instructions
- Usage examples

Generate README content now:"""
        
        base_prompt_tokens = estimate_tokens(base_prompt)
        
        for file_info in all_files:
            file_tokens = file_info['tokens'] + 100  # +100 for formatting
            
            # Check if adding this file exceeds batch limit
            if current_tokens + file_tokens + base_prompt_tokens > MAX_TOKENS_PER_BATCH:
                if current_batch:
                    batches.append({
                        'files': current_batch,
                        'tokens': current_tokens
                    })
                    print(f"  ✅ Batch {len(batches)}: {len(current_batch)} files, ~{current_tokens:,} tokens")
                
                # Start new batch
                current_batch = [file_info]
                current_tokens = file_tokens
            else:
                current_batch.append(file_info)
                current_tokens += file_tokens
        
        # Add last batch
        if current_batch:
            batches.append({
                'files': current_batch,
                'tokens': current_tokens
            })
            print(f"  ✅ Batch {len(batches)}: {len(current_batch)} files, ~{current_tokens:,} tokens")
        
        print(f"\n📊 Total batches created: {len(batches)}")
        print("="*70 + "\n")
        
        # ⭐ STEP 4: Process batches with delays
        print("🤖 Phase 4: Processing batches with AI...\n")
        
        all_readme_parts = []
        
        for batch_num, batch in enumerate(batches, 1):
            print(f"🔄 Processing Batch {batch_num}/{len(batches)}...")
            print(f"   Files: {len(batch['files'])}")
            print(f"   Tokens: ~{batch['tokens']:,}")
            
            # Create code context for this batch
            code_context = "\n\n".join([
                f"### File: {f['path']}\n```\n{f['content']}\n```"
                for f in batch['files']
            ])
            
            # Create prompt
            if batch_num == 1:
                # First batch - full README structure
                prompt = f"""You are Nebula IDE AI. Analyze the following project code and create a comprehensive README.md file.

📋 PROJECT FILES (Batch {batch_num}/{len(batches)} - {len(batch['files'])} files):
{code_context}

📝 TASK:
Create a professional README.md with:
- Project title and description with emojis
- Key features and functionality
- Technology stack used
- File structure overview
- Installation/setup instructions (if applicable)
- Usage examples (if applicable)

Keep it clear, professional, and well-formatted in Markdown.
Use emojis to make it engaging.

Generate README content now:"""
            else:
                # Subsequent batches - additional analysis
                prompt = f"""Continue analyzing the project. Add to the README based on these additional files.

📋 ADDITIONAL FILES (Batch {batch_num}/{len(batches)} - {len(batch['files'])} files):
{code_context}

Add any new features, dependencies, or important information found in these files.
Keep the same format and style.

Additional README content:"""
            
            try:
                print(f"   ⏳ Calling AI API...")
                response = model(prompt)
                all_readme_parts.append(response)
                print(f"   ✅ Batch {batch_num} completed!")
                
                # Add delay between batches (60 seconds to reset TPM)
                if batch_num < len(batches):
                    wait_time = 65  # 65 seconds to be safe
                    print(f"   ⏸️  Waiting {wait_time}s for rate limit reset...\n")
                    time.sleep(wait_time)
                else:
                    print()
                
            except Exception as e:
                error_msg = str(e)
                print(f"   ❌ Batch {batch_num} failed: {error_msg[:100]}\n")
                
                # If rate limit error, wait longer
                if "rate" in error_msg.lower() or "limit" in error_msg.lower():
                    print("   ⚠️  Rate limit detected! Waiting 70 seconds...\n")
                    time.sleep(70)
                
                continue
        
        # ⭐ STEP 5: Combine all README parts
        print("🔗 Phase 5: Combining README sections...\n")
        
        if not all_readme_parts:
            print("❌ No README content generated!")
            return False
        
        # Combine parts (remove duplicate headers)
        final_readme = all_readme_parts[0]
        for part in all_readme_parts[1:]:
            # Skip duplicate project titles
            lines = part.split('\n')
            filtered_lines = [l for l in lines if not l.startswith('# ')]
            final_readme += "\n\n" + '\n'.join(filtered_lines)
        
        # Write README
        with open(readme_path, "w", encoding="utf-8") as f:
            f.write(final_readme)
        
        print("="*70)
        print("✅ README.md GENERATED SUCCESSFULLY!")
        print("="*70)
        print(f"📍 Location: {readme_path}")
        print(f"📦 Batches processed: {len(batches)}")
        print(f"📄 Total files analyzed: {sum(len(b['files']) for b in batches)}")
        print(f"💾 README size: {len(final_readme):,} characters")
        print("="*70 + "\n")
        
        # Save detailed report
        report_path = os.path.join(project_path, ".readme_generation_report.txt")
        with open(report_path, "w", encoding="utf-8") as f:
            f.write(f"README Generation Report\n")
            f.write(f"========================\n")
            f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"Batches processed: {len(batches)}\n")
            f.write(f"Total files analyzed: {sum(len(b['files']) for b in batches)}\n")
            f.write(f"Files ignored: {len(ignored_files)}\n\n")
            
            for batch_num, batch in enumerate(batches, 1):
                f.write(f"\nBatch {batch_num}:\n")
                f.write(f"  Tokens: ~{batch['tokens']:,}\n")
                f.write(f"  Files ({len(batch['files'])}):\n")
                for file in batch['files']:
                    priority_label = {1: "HIGH", 2: "MED", 3: "LOW", 4: "OTHER"}[file['priority']]
                    f.write(f"    - [{priority_label}] {file['path']} ({file['size']:.1f}KB, ~{file['tokens']:,} tokens)\n")
        
        return True
        
    except Exception as e:
        print(f"❌ FATAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


# Alias for backward compatibility
def readme():
    """Backward compatible wrapper"""
    return readme_smart()


# Keep all your other original functions below...
# (BatchFixer, code_updater functions, etc. - copy from original file)

# ===== GITHUB CLASS (keeping your original structure) =====

class GITHUB:
    def __init__(self, url=None, branch=None):
        with open("storage/recent.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        self.folder_path = data[0]["path"]
        self.files = GITIGNORE_LIST
        self.url = url
        self.branch = branch or "main"

    def repo_start(self, url, branch=None):
        self.url = url
        if branch:
            self.branch = branch
        self.validation()

    def validation(self):
        """Check if git repo exists, else initialize and add files."""
        git_folder = os.path.join(self.folder_path, ".git")
        if os.path.exists(git_folder):
            print("Git repo exists. Checking for updates...")
            self.git_add(commit_new=True)
        else:
            print("Git repo not found. Initializing new repo...")
            self.git_ignore()

    def git_ignore(self):
        """Create .gitignore and initialize repo."""
        gitignore = os.path.join(self.folder_path, ".gitignore")
        with open(gitignore, "w") as f:
            f.write("\n".join(self.files))
        self.init_repo()

    def init_repo(self):
        """Initialize git repo with branch."""
        result = subprocess.run(
            ["git", "init", f"--initial-branch={self.branch}"],
            capture_output=True, text=True, cwd=self.folder_path
        )
        if result.stdout:
            print("Output:\n", result.stdout)
        if result.stderr:
            print("Error:\n", result.stderr)
        self.git_add(commit_new=True)

    def git_add(self, commit_new=False):
        """Add all changes and optionally commit."""
        result = subprocess.run(
            ["git", "add", "."], capture_output=True, text=True, cwd=self.folder_path
        )
        if result.stdout:
            print("Success:", result.stdout)
        if result.stderr:
            print("Error:", result.stderr)

        if commit_new:
            self.commit()

    def commit(self):
        """Commit all changes with dynamic message."""
        # Check if there is anything to commit
        check = subprocess.run(
            ["git", "status", "--porcelain"], capture_output=True, text=True, cwd=self.folder_path
        )
        if not check.stdout.strip():
            print("Nothing to commit, working tree clean.")
            self.add_remote()
            return

        message = f"Auto commit: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        result = subprocess.run(
            ["git", "commit", "-m", message], capture_output=True, text=True, cwd=self.folder_path
        )
        if result.stdout:
            print("Commit Success:", result.stdout)
        if result.stderr:
            print("Commit Error:", result.stderr)
        self.add_remote()

    def add_remote(self):
        """Add remote if it doesn't exist and sync."""
        # Check existing remotes
        result = subprocess.run(
            ["git", "remote"], capture_output=True, text=True, cwd=self.folder_path
        )
        remotes = result.stdout.split()
        if "origin" not in remotes:
            result = subprocess.run(
                ["git", "remote", "add", "origin", self.url],
                capture_output=True, text=True, cwd=self.folder_path
            )
            if result.stdout:
                print("Remote added:", result.stdout)
            if result.stderr:
                print("Remote add Error:", result.stderr)
        else:
            print("Remote 'origin' already exists. Skipping add_remote.")

        # Pull latest changes safely first
        self.pull()
        # Push everything
        self.push()

    def pull(self):
        """Pull latest from remote safely."""
        result = subprocess.run(
            ["git", "pull", "--rebase", "origin", self.branch],
            capture_output=True, text=True, cwd=self.folder_path
        )
        if result.stdout:
            print("Pull Success:", result.stdout)
        if result.stderr:
            print("Pull Error:", result.stderr)

    def push(self):
        """Push changes to remote branch."""
        result = subprocess.run(
            ["git", "push", "-u", "origin", self.branch],
            capture_output=True, text=True, cwd=self.folder_path
        )
        if result.stdout:
            print("Push Success:", result.stdout)
        if result.stderr:
            print("Push Error:", result.stderr)
    def clone_repo(self, url, destination=None):
        cmd = ["git", "clone", url]
        if destination:
            cmd.append(destination)
    
        result = subprocess.run(cmd, capture_output=True, text=True)
    
    # Sirf return code check karo
        if result.returncode == 0:
            print("✅ Clone Successful!")
            if result.stderr:  # Git ki normal output
                print(result.stderr)
            return True
        else:
            print("❌ Clone Failed!")
            print("Error:", result.stderr)
            return False

# ========== hold my tea====
class HOLD_MY_TEA_MOMENT:
    def __init__(self):
        with open("storage/recent.json", "r", encoding="utf-8") as f:
            data = json.load(f)
        self.project_path = data[0]["path"]
        self.fixed_files = []
        self.failed_files = []
    
    def collect_all_files(self):
        """Sari files collect karo with their paths and content"""
        files_data = []
        
        for root, dirs, files in os.walk(self.project_path):
            # Ignore .git folder
            if ".git" in dirs:
                dirs.remove(".git")
            
            # Ignore gitignore folders
            dirs[:] = [
                d for d in dirs
                if not any(fnmatch.fnmatch(d, ig.rstrip("/")) for ig in GITIGNORE_LIST if ig.endswith("/"))
            ]
            
            for file in files:
                # Ignore gitignore files
                if any(fnmatch.fnmatch(file, ig) for ig in GITIGNORE_LIST if not ig.endswith("/")):
                    continue
                
                file_path = os.path.join(root, file)
                relative_path = os.path.relpath(file_path, self.project_path)
                
                try:
                    with open(file_path, 'r', encoding='utf-8', errors="ignore") as f:
                        content = f.read()
                    
                    files_data.append({
                        'path': relative_path,
                        'filename': file,
                        'content': content,
                        'full_path': file_path
                    })
                except Exception as e:
                    print(f"❌ Cannot read {relative_path}: {str(e)}")
        
        return files_data
    
    def whole_folder(self):
        """Sari files ek sath collect karo, AI ko bhejo, phir update karo"""
        
        print("📂 Collecting all files...")
        all_files = self.collect_all_files()
        
        if not all_files:
            print("❌ No files found!")
            return
        
        # Sab files ka data prepare karo
        files_summary = "\n".join([
            f"{i+1}. {file['path']} ({file['filename']}) - {len(file['content'])} chars"
            for i, file in enumerate(all_files)
        ])
        
        # Sab files ka content combine karo
        combined_content = ""
        for file in all_files:
            combined_content += f"\n{'='*50}\n"
            combined_content += f"FILE: {file['path']}\n"
            combined_content += f"FILENAME: {file['filename']}\n"
            combined_content += f"{'='*50}\n"
            combined_content += file['content'] + "\n"
        
        print(f"📤 Sending {len(all_files)} files to AI...")
        
        # Mega prompt banao
        prompt = f"""
        🔧 PROJECT FIX REQUEST
        ======================
        
        📁 PROJECT STRUCTURE:
        {files_summary}
        
        🎯 TASK:
        Fix ALL errors in ALL files. Pay special attention to:
        
        1. **FILE CONNECTIONS** (CRITICAL):
           - HTML files must link to CORRECT CSS/JS filenames
           - Check: href="index.css" not href="style.css"
           - Check: src="index.js" not src="script.js"
        
        2. **CROSS-FILE CONSISTENCY**:
           - HTML IDs/classes must match CSS selectors
           - JS event listeners must target existing HTML elements
           - CSS animations must match JS functionality
        
        3. **SYNTAX ERRORS**:
           - Missing semicolons, braces, quotes
           - Undefined functions/variables
           - Typos in function names
        
        4. **FUNCTIONALITY**:
           - All buttons/links should work
           - Animations should run smoothly
           - No console errors
        
        📄 FILES TO FIX (in exact order):
        {combined_content}
        
        📝 RETURN FORMAT:
        📝 **STRICT RETURN FORMAT:**
For EACH file, return in this EXACT format (NO markdown, NO code blocks):

=== BEGIN: [file_path] ===
[corrected code - PLAIN TEXT ONLY]
=== END: [file_path] ===

**CRITICAL RULES:**
1. NO ``` backticks
2. NO language tags like html, css, js
3. NO markdown formatting
4. ONLY plain text code
5. File paths must match exactly

Example (WRONG - DON'T DO THIS):
=== BEGIN: index.html ===
```html
<!DOCTYPE html>...
        
        IMPORTANT:
        - Keep original filenames and paths
        - Fix ALL connections between files
        - Return ONLY the corrected code blocks
        
        """
        
        try:
            # AI ko bhejo
            print("🔄 Processing with AI...")
            corrected_response = model(prompt)
            
            # AI ke response se files extract karo
            self.update_all_files(corrected_response, all_files)
            
        except Exception as e:
            print(f"❌ AI Processing failed: {str(e)}")
    
    def update_all_files(self, ai_response, original_files):
        """AI ke response se files update karo"""
        
        print("💾 Updating files from AI response...")
        
        # AI response parse karo
        lines = ai_response.split('\n')
        i = 0
        
        while i < len(lines):
            line = lines[i].strip()
            
            # Check for file start marker
            if line.startswith("=== BEGIN:"):
                # Extract file path
                file_path = line.replace("=== BEGIN:", "").replace("===", "").strip()
                
                # Find the end of this file
                file_content = []
                i += 1
                
                while i < len(lines) and not lines[i].strip().startswith(f"=== END: {file_path} ==="):
                    file_content.append(lines[i])
                    i += 1
                
                # Join content
                content = '\n'.join(file_content).strip()
                
                # Find original file
                original_file = None
                for f in original_files:
                    if f['path'] == file_path:
                        original_file = f
                        break
                
                if original_file and content:
                    try:
                        # Update file
                        with open(original_file['full_path'], 'w', encoding='utf-8') as f:
                            f.write(content)
                        
                        self.fixed_files.append(file_path)
                        print(f"✅ Updated: {file_path}")
                    except Exception as e:
                        self.failed_files.append(f"{file_path}: {str(e)}")
                        print(f"❌ Failed to update {file_path}: {str(e)}")
                
                i += 1  # Skip the END line
            else:
                i += 1
        
        # Report generate karo
        self.generate_report()
    
    def generate_report(self):
        """Fix ka report generate kare"""
        report = f"""
        📊 BATCH FIXING REPORT
        ======================
        Project: {self.project_path}
        Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        Total Files Processed: {len(self.fixed_files) + len(self.failed_files)}
        
        ✅ Successfully Fixed ({len(self.fixed_files)}):
        {chr(10).join(f'  - {f}' for f in self.fixed_files)}
        """
        
        if self.failed_files:
            report += f"""
        ❌ Failed ({len(self.failed_files)}):
        {chr(10).join(f'  - {f}' for f in self.failed_files)}
            """
        
        print(report)
        
        # Report file bhi save karo
        report_path = os.path.join(self.project_path, "BATCH_FIX_REPORT.txt")
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write(report)
        
        return report

# ===== CODE UPDATER FUNCTIONS =====
# (Keeping your original functions)

import random

def process_large_code_smart(original_code, change_request, max_lines=500, delay_between_chunks=8):
    """
    Process chunks one by one with 500 lines limit and delays
    """
    lines = original_code.split('\n')
    line_count = len(lines)
    
    print(f"📊 Total lines: {line_count}")
    print(f"📏 Lines per chunk: {max_lines}")
    
    if line_count <= max_lines:
        print("✅ Processing directly (within 500 lines limit)...")
        prompt = f"""Update this code based on instruction:
        
Instruction: {change_request}

Code:
{original_code}

Return updated code:"""
        return model(prompt)
    
    # Split into chunks of 500 lines each
    chunks = []
    for i in range(0, len(lines), max_lines):
        chunk = '\n'.join(lines[i:i + max_lines])
        chunks.append(chunk)
    
    print(f"📦 Split into {len(chunks)} chunks (500 lines each)")
    
    # Process each chunk ONE BY ONE with delays
    updated_chunks = []
    
    for idx, chunk in enumerate(chunks):
        print(f"\n🔄 Processing chunk {idx + 1}/{len(chunks)}...")
        print(f"   Chunk size: {len(chunk.split('\\n'))} lines")
        
        # Wait between chunks to avoid rate limit
        if idx > 0:
            wait_time = delay_between_chunks + random.uniform(2, 5)
            print(f"⏳ Waiting {wait_time:.1f} seconds...")
            time.sleep(wait_time)
        
        chunk_prompt = f"""You are updating PART {idx + 1} of {len(chunks)}.
Each chunk has maximum 500 lines.

CHUNK {idx + 1} (Lines approx {idx*500 + 1} to {min((idx+1)*500, line_count)}):
{chunk}

FULL FILE INSTRUCTION: {change_request}

Apply changes ONLY to this 500-line chunk.
Return ONLY the updated code for this chunk.
No explanations, only code.

Updated chunk {idx + 1}:"""
        
        try:
            updated_chunk = model(chunk_prompt)
            updated_chunks.append(updated_chunk)
            print(f"✅ Chunk {idx + 1} processed")
            
            # Save each chunk immediately
            with open(f"temp_chunk_{idx+1}.txt", "w", encoding="utf-8") as f:
                f.write(f"=== CHUNK {idx+1} ===\n")
                f.write(updated_chunk)
                
        except Exception as e:
            print(f"❌ Error in chunk {idx + 1}: {str(e)[:100]}")
            # Use original chunk as fallback
            updated_chunks.append(chunk)
    
    # Combine all chunks
    print(f"\n🔗 Combining {len(updated_chunks)} chunks...")
    final_code = '\n'.join(updated_chunks)
    
    # Try final cleanup if possible
    try:
        if len(updated_chunks) > 1:
            print("🧹 Doing final cleanup...")
            time.sleep(5)  # Wait before final request
            
            cleanup_prompt = f"""This code was split into {len(chunks)} parts of 500 lines each.
Now combine and ensure consistency:

{final_code}

Fix:
1. Remove duplicate imports
2. Ensure consistent indentation
3. Check function/variable references across chunks
4. Remove any chunk markers or separators

Final cleaned code:"""
            
            return model(cleanup_prompt)
        else:
            return final_code
            
    except Exception as e:
        print(f"⚠️ Skipping cleanup: {str(e)[:100]}")
        return final_code


def process_500_line_chunks(code, instruction):
    """
    Strict 500-line chunk processor
    """
    lines = code.split('\n')
    total_lines = len(lines)
    
    if total_lines <= 500:
        # Direct processing for small files
        prompt = f"Update code:\n{code}\n\nInstruction: {instruction}\nUpdated code:"
        return model(prompt)
    
    # Create 500-line chunks
    chunks = []
    for i in range(0, total_lines, 500):
        chunk_lines = lines[i:i + 500]
        chunk_text = '\n'.join(chunk_lines)
        chunks.append(chunk_text)
    
    print(f"Processing {len(chunks)} chunks (500 lines each)")
    
    results = []
    for chunk_num, chunk in enumerate(chunks, 1):
        print(f"\n📄 Chunk {chunk_num}/{len(chunks)}")
        
        # Add delay between chunks
        if chunk_num > 1:
            wait = 10
            print(f"Waiting {wait} seconds...")
            time.sleep(wait)
        
        prompt = f"""Update this 500-line code chunk ({chunk_num}/{len(chunks)}):

{chunk}

Overall instruction: {instruction}

Update only this 500-line part:"""
        
        try:
            updated = model(prompt)
            results.append(updated)
            print(f"✅ Chunk {chunk_num} done")
        except:
            print(f"⚠️ Chunk {chunk_num} failed, using original")
            results.append(chunk)
    
    # Combine
    combined = '\n'.join(results)
    
    # Return combined result
    return combined


def code_updater_500_limit(code, instruction):
    """
    Main function with strict 500-line chunking
    """
    lines = code.split('\n')
    
    print("=" * 50)
    print(f"📋 Input: {len(lines)} lines")
    print(f"🎯 Instruction: {instruction[:100]}...")
    print("=" * 50)
    
    if len(lines) <= 500:
        print("🟢 Direct processing (≤500 lines)")
        return process_large_code_smart(code, instruction)
    else:
        print(f"🔴 Needs chunking ({len(lines)} > 500 lines)")
        return process_500_line_chunks(code, instruction)


# ===== QUICK TEST =====
if __name__ == "__main__":
    print("Testing improved README generator...")
    s = GITHUB()
    s.clone_repo("https://github.com/life2-byte/testing.git",r"C:\Users\User\Desktop\clone_repo")