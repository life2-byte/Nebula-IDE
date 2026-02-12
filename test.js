// ========== IMPROVED INITIALIZATION SYSTEM ==========
let initializationComplete = false;
let initializationErrors = [];

// ========== SETTINGS MANAGER ==========
class SettingsManager {
    constructor() {
        this.defaultSettings = {
            // Appearance
            theme: 'dark',
            fontSize: 14,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
            
            // Editor
            autoSave: true,
            autoSaveDelay: 1000,
            tabSize: 4,
            insertSpaces: true,
            wordWrap: 'off',
            lineNumbers: 'on',
            minimap: true,
            renderWhitespace: 'selection',
            renderIndentGuides: true,
            lineHeight: 1.8,
            cursorBlinking: 'smooth',
            cursorStyle: 'line',
            smoothScrolling: true,
            mouseWheelZoom: true,
            formatOnPaste: true,
            formatOnType: true,
            
            // Code Intelligence
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            quickSuggestions: true,
            suggestOnTriggerCharacters: true,
            parameterHints: true,
            bracketPairColorization: true,
            
            // Terminal
            shell: 'powershell',
            terminalFontSize: 12,
            terminalFontFamily: "'Cascadia Mono', 'Courier New', monospace",
            
            // AI Assistant
            aiSuggestions: true,
            aiChat: true,
            aiAutoComplete: true
        };
        
        this.settings = this.loadSettings();
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('ideSettings');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { ...this.defaultSettings, ...parsed };
            }
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
        return { ...this.defaultSettings };
    }
    
    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        try {
            localStorage.setItem('ideSettings', JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Failed to save settings:', error);
            return false;
        }
    }
    
    get(key) {
        return this.settings[key];
    }
    
    set(key, value) {
        this.settings[key] = value;
        this.saveSettings(this.settings);
    }
    
    getAll() {
        return { ...this.settings };
    }
    
    reset() {
        this.settings = { ...this.defaultSettings };
        this.saveSettings(this.settings);
    }
    
    getMonacoEditorOptions() {
        return {
            theme: this.settings.theme === 'dark' ? 'nebula-dark-enhanced' : 'vs-light',
            fontSize: parseInt(this.settings.fontSize) || 14,
            fontFamily: this.settings.fontFamily,
            lineNumbers: this.settings.lineNumbers,
            minimap: { 
                enabled: this.settings.minimap,
                side: 'right',
                size: 'proportional',
                showSlider: 'always',
                renderCharacters: true,
                maxColumn: 100,
                scale: 2,
            },
            wordWrap: this.settings.wordWrap,
            wordWrapColumn: 100,
            wrappingIndent: 'same',
            tabSize: parseInt(this.settings.tabSize) || 4,
            insertSpaces: this.settings.insertSpaces,
            lineHeight: parseFloat(this.settings.lineHeight) || 1.8,
            cursorBlinking: this.settings.cursorBlinking,
            smoothScrolling: this.settings.smoothScrolling,
            mouseWheelZoom: this.settings.mouseWheelZoom,
            formatOnPaste: this.settings.formatOnPaste,
            formatOnType: this.settings.formatOnType,
            autoClosingBrackets: this.settings.autoClosingBrackets,
            autoClosingQuotes: this.settings.autoClosingQuotes,
            quickSuggestions: this.settings.quickSuggestions,
            suggestOnTriggerCharacters: this.settings.suggestOnTriggerCharacters,
            parameterHints: { enabled: this.settings.parameterHints },
            bracketPairColorization: { enabled: this.settings.bracketPairColorization },
            renderWhitespace: this.settings.renderWhitespace,
            guides: { indentation: this.settings.renderIndentGuides }
        };
    }
}

// Initialize settings manager globally
const settingsManager = new SettingsManager();

// ========== IMPROVED INITIALIZATION SYSTEM ==========

// Track initialization state
const initState = {
    monaco: false,
    xterm: false,
    websocket: false,
    pywebview: false,
    ui: false
};

// ========== FIXED COPY/PASTE LOGIC ==========
let activeCopyPasteContext = 'editor'; // 'editor', 'terminal', 'chat', 'explorer'
let lastFocusedElement = null;

// Track focus for copy/paste context
document.addEventListener('focusin', (e) => {
    const target = e.target;
    lastFocusedElement = target;
    
    if (target.closest('.monaco-container') || target.closest('.monaco-editor')) {
        activeCopyPasteContext = 'editor';
    } else if (target.closest('.xterm-container') || target.closest('.xterm')) {
        activeCopyPasteContext = 'terminal';
    } else if (target.closest('.ai-input-field') || target.closest('.chat-container')) {
        activeCopyPasteContext = 'chat';
    } else if (target.closest('.file-tree') || target.closest('.tree-item')) {
        activeCopyPasteContext = 'explorer';
    }
});

// ========== FIXED TAB MANAGEMENT ==========
class TabManager {
    constructor() {
        this.tabs = new Map();
        this.activeTabId = null;
        this.nextTabId = 1;
        this.editorInstances = new Map();
    }
    
    isFileOpen(filePath) {
        for (const [path, tab] of this.tabs) {
            if (path === filePath) {
                return tab.id;
            }
        }
        return null;
    }
    
    addTab(fileName, filePath, initialContent = '') {
        const existingTabId = this.isFileOpen(filePath);
        if (existingTabId) {
            return existingTabId;
        }
        
        const tabId = `tab-${this.nextTabId++}`;
        this.tabs.set(filePath, {
            id: tabId,
            name: fileName,
            path: filePath,
            editorContent: initialContent,
            savedContent: initialContent,
            unsaved: false,
            editorInstance: null
        });
        
        return tabId;
    }
    
    removeTab(tabId) {
        for (const [path, tab] of this.tabs) {
            if (tab.id === tabId) {
                if (tab.editorInstance) {
                    tab.editorInstance.dispose();
                    this.editorInstances.delete(tabId);
                }
                
                const container = document.getElementById(`editor-container-${tabId}`);
                if (container) {
                    container.remove();
                }
                
                this.tabs.delete(path);
                
                if (this.activeTabId === tabId) {
                    this.activeTabId = null;
                }
                return true;
            }
        }
        return false;
    }
    
    getTab(tabId) {
        for (const [path, tab] of this.tabs) {
            if (tab.id === tabId) {
                return tab;
            }
        }
        return null;
    }
    
    getTabByPath(filePath) {
        return this.tabs.get(filePath) || null;
    }
    
    setActiveTab(tabId) {
        this.activeTabId = tabId;
    }
    
    getActiveTab() {
        if (!this.activeTabId) return null;
        return this.getTab(this.activeTabId);
    }
    
    updateTabContent(filePath, content, isSaved = false) {
        const tab = this.tabs.get(filePath);
        if (tab) {
            tab.editorContent = content;
            if (isSaved) {
                tab.savedContent = content;
                tab.unsaved = false;
            } else {
                tab.unsaved = content !== tab.savedContent;
            }
            return true;
        }
        return false;
    }
    
    markAsSaved(filePath) {
        const tab = this.tabs.get(filePath);
        if (tab) {
            tab.savedContent = tab.editorContent;
            tab.unsaved = false;
            return true;
        }
        return false;
    }
    
    getAllTabs() {
        return Array.from(this.tabs.values());
    }
    
    hasUnsavedChanges() {
        for (const [path, tab] of this.tabs) {
            if (tab.unsaved) {
                return true;
            }
        }
        return false;
    }
    
    getUnsavedTabs() {
        const unsaved = [];
        for (const [path, tab] of this.tabs) {
            if (tab.unsaved) {
                unsaved.push(tab);
            }
        }
        return unsaved;
    }
    
    setEditorInstance(tabId, editorInstance) {
        const tab = this.getTab(tabId);
        if (tab) {
            tab.editorInstance = editorInstance;
            this.editorInstances.set(tabId, editorInstance);
        }
    }
    
    getEditorInstance(tabId) {
        return this.editorInstances.get(tabId) || null;
    }
}

// ========== LAYOUT STATE MANAGEMENT ==========
const layoutState = {
    sidebarVisible: true,
    terminalVisible: true,
    chatVisible: true,
    terminalFullscreen: false,
    splitView: false,
    activeTerminalTab: 'terminal'
};

// ========== CLIPBOARD STATE ==========
let clipboardState = {
    type: null,
    items: [],
    sourcePath: null
};

let currentPasteTarget = null;

// ========== SEARCH STATE ==========
let searchState = {
    active: false,
    currentSearch: '',
    searchResults: [],
    currentResultIndex: -1
};

// ========== DOM ELEMENTS ==========
const sidebar = document.getElementById('sidebar');
const terminal = document.getElementById('terminal-panel');
const aiPanel = document.getElementById('ai-panel');
const editorArea = document.getElementById('editor-area');
const toggleSidebarBtn = document.getElementById('toggle-sidebar');
const toggleTerminalBtn = document.getElementById('toggle-terminal');
const toggleChatBtn = document.getElementById('toggle-chat');
const toggleSplitBtn = document.getElementById('toggle-split');
const terminalFullscreenBtn = document.getElementById('terminal-fullscreen');
const clearTerminalBtn = document.getElementById('clear-terminal');
const closeTerminalBtn = document.getElementById('close-terminal');
const newFileBtn = document.getElementById('new-file');
const newFolderBtn = document.getElementById('new-folder');
const splitView = document.getElementById('split-view');
const splitHandle = document.getElementById('split-handle');
const pane1 = document.getElementById('pane-1');
const pane2 = document.getElementById('pane-2');
const terminalTabs = document.querySelectorAll('.terminal-tab');
const createInputContainer = document.getElementById('create-input-container');
const createInput = document.getElementById('create-input');
const createConfirmBtn = document.getElementById('create-confirm');
const createCancelBtn = document.getElementById('create-cancel');
const treeContainer = document.getElementById('tree-container');
const welcomeScreen = document.getElementById('welcome-screen');
const saveFileBtn = document.getElementById('save-file');
const saveFileAsBtn = document.getElementById('save-file-as');
const xtermContainer = document.getElementById('xterm-container');
const contextMenu = document.getElementById('context-menu');
const clipboardStatus = document.getElementById('clipboard-status');
const globalSearchInput = document.getElementById('global-search-input');
const activityExplorer = document.getElementById('activity-explorer');
const activitySearch = document.getElementById('activity-search');
const activityRun = document.getElementById('activity-run');

// NEW: Status bar elements for cursor position
const cursorLineElement = document.getElementById('cursor-line');
const cursorColumnElement = document.getElementById('cursor-column');
const terminalPathElement = document.getElementById('terminal-path');

let currentFileSystem = null;
let selectedTreeItem = null;
let createMode = null;
let createParentPath = null;

// ========== TAB MANAGEMENT ==========
const tabManager = new TabManager();
window.tabManager = tabManager;

// ========== IMPROVED TERMINAL STATE ==========
let terminalInstance = null;
let fitAddon = null;
let webLinksAddon = null;
let searchAddon = null;
let wsConnection = null;
let wsRetryCount = 0;
const MAX_WS_RETRIES = 5;
let terminalReady = false;
let terminalKilled = false;
let terminalRestarting = false;

// Improved terminal path state
let terminalPathState = {
    currentPath: null,
    savedPath: null,
    cursorPosition: 0
};

// ========== IMPROVED MONACO INITIALIZATION ==========
let monacoInitialized = false;
let monacoInitAttempts = 0;
const MAX_MONACO_ATTEMPTS = 10;

function initializeMonacoWithRetry() {
    console.log('🔄 Starting Monaco initialization...');
    
    if (window.monaco && window.monaco.editor) {
        console.log('✅ Monaco already loaded');
        monacoInitialized = true;
        initState.monaco = true;
        checkAllInitialized();
        return;
    }

    if (monacoInitAttempts >= MAX_MONACO_ATTEMPTS) {
        console.error('❌ Failed to load Monaco after max attempts');
        initializationErrors.push('Monaco Editor failed to load');
        initState.monaco = false;
        showClipboardStatus('Monaco Editor failed to load', 'error');
        return;
    }

    monacoInitAttempts++;
    console.log(`🔄 Initializing Monaco (attempt ${monacoInitAttempts})`);
    
    if (typeof require !== 'undefined') {
        require.config({ 
            paths: { 
                'vs': './monacco folde/node_modules/monaco-editor/min/vs' 
            } 
        });
        
        require(['vs/editor/editor.main'], function() {
            console.log('✅ Monaco loaded via require');
            
            defineEnhancedMonacoTheme();
            enableMonacoIntellisense();
            
            monacoInitialized = true;
            initState.monaco = true;
            checkAllInitialized();
        }, function(error) {
            console.error('❌ Monaco require error:', error);
            setTimeout(initializeMonacoWithRetry, 1000);
        });
    } else {
        console.error('❌ Require not available');
        initializationErrors.push('RequireJS not loaded');
        initState.monaco = false;
    }
}

// ========== ENHANCED MONACO THEME WITH ALL FEATURES ==========
function defineEnhancedMonacoTheme() {
    if (typeof monaco === 'undefined') return;

    monaco.editor.defineTheme('nebula-dark-enhanced', {
        base: 'vs-dark',
        inherit: true,
        rules: [
            { token: 'keyword', foreground: 'B496FF', fontStyle: 'bold' },
            { token: 'type', foreground: '64D9B4', fontStyle: 'bold' },
            { token: 'class', foreground: '64D9B4' },
            { token: 'interface', foreground: '64D9B4' },
            { token: 'function', foreground: 'FFC864' },
            { token: 'method', foreground: 'FFC864' },
            { token: 'number', foreground: 'FFC864' },
            { token: 'string', foreground: '64DCB4' },
            { token: 'comment', foreground: '858585', fontStyle: 'italic' },
            { token: 'operator', foreground: 'FFFFFF' },
            { token: 'variable', foreground: '64A5FF' },
            { token: 'parameter', foreground: '64A5FF' },
            { token: 'property', foreground: '64A5FF' },
            { token: 'tag', foreground: '64A5FF' },
            { token: 'attribute', foreground: '64D9B4' },
            { token: 'type.identifier', foreground: '64D9B4' },
            { token: 'variable.predefined', foreground: '64A5FF' },
            { token: 'variable.parameter', foreground: 'FFC864' },
            { token: 'constant', foreground: 'FF7878' },
            { token: 'annotation', foreground: '858585' },
            { token: 'modifier', foreground: 'B496FF' },
            { token: 'regexp', foreground: '64DCB4' },
        ],
        colors: {
            'editor.background': '#0a0a0b',
            'editor.foreground': '#ffffff',
            'editor.lineHighlightBackground': '#1a1a1c80',
            'editorCursor.foreground': '#64a5ff',
            'editor.selectionBackground': '#64a5ff40',
            'editor.lineNumber.foreground': '#858585',
            'editor.lineNumber.activeForeground': '#c6c6c6',
            'editor.selectionHighlightBackground': '#64a5ff20',
            'editor.wordHighlightBackground': '#64a5ff15',
            'editor.wordHighlightStrongBackground': '#64a5ff25',
            
            // Minimap styles
            'minimap.background': '#0a0a0b00',
            'minimapSlider.background': 'rgba(100, 165, 255, 0.15)',
            'minimapSlider.hoverBackground': 'rgba(100, 165, 255, 0.25)',
            'minimapSlider.activeBackground': 'rgba(100, 165, 255, 0.35)',
            
            // Find widget
            'editor.findMatchBackground': '#ffc86440',
            'editor.findMatchHighlightBackground': '#64a5ff40',
            'editor.findRangeHighlightBackground': '#64a5ff20',
            
            // Suggestions widget
            'editorSuggestWidget.background': '#1a1a1c',
            'editorSuggestWidget.foreground': '#ffffff',
            'editorSuggestWidget.selectedBackground': '#64a5ff40',
            'editorSuggestWidget.highlightForeground': '#64a5ff',
            
            // Hover widget
            'editorHoverWidget.background': '#1a1a1c',
            'editorHoverWidget.foreground': '#ffffff',
            'editorHoverWidget.border': 'rgba(255, 255, 255, 0.08)',
            
            // Parameter hints
            'editorParameterHint.background': '#1a1a1c',
            'editorParameterHint.foreground': '#ffffff',
            
            // Bracket matching
            'editorBracketMatch.background': '#64a5ff20',
            'editorBracketMatch.border': '#64a5ff',
            
            // Indent guide
            'editorIndentGuide.background': 'rgba(255, 255, 255, 0.08)',
            'editorIndentGuide.activeBackground': 'rgba(255, 255, 255, 0.12)',
            
            // Overview ruler
            'editorOverviewRuler.border': 'rgba(255, 255, 255, 0.08)',
            'editorOverviewRuler.findMatchForeground': '#ffc864',
            'editorOverviewRuler.errorForeground': '#ff7878',
            'editorOverviewRuler.warningForeground': '#ffc864',
            'editorOverviewRuler.infoForeground': '#64a5ff',
            
            // Scrollbar
            'editorScrollbar.verticalSliderBackground': 'rgba(100, 165, 255, 0.3)',
            'editorScrollbar.verticalSliderHoverBackground': 'rgba(100, 165, 255, 0.4)',
            'editorScrollbar.verticalScrollbarSliderBackground': 'rgba(255, 255, 255, 0.1)',
            
            // Line numbers
            'editorLineNumber.foreground': 'rgba(255, 255, 255, 0.3)',
            'editorLineNumber.activeForeground': 'rgba(255, 255, 255, 0.6)',
            
            // Git colors
            'editorGutter.addedBackground': 'rgba(100, 220, 180, 0.3)',
            'editorGutter.modifiedBackground': 'rgba(255, 200, 100, 0.3)',
            'editorGutter.deletedBackground': 'rgba(255, 120, 120, 0.3)',
        }
    });
}

// ========== ENABLE MONACO INTELLISENSE FEATURES ==========
function enableMonacoIntellisense() {
    if (typeof monaco === 'undefined') return;

    // Register language features for popular languages
    const languages = ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'markdown'];
    
    languages.forEach(lang => {
        // Enable word-based suggestions
        monaco.languages.setLanguageConfiguration(lang, {
            wordPattern: /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
            autoClosingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
                { open: '`', close: '`' }
            ],
            surroundingPairs: [
                { open: '{', close: '}' },
                { open: '[', close: ']' },
                { open: '(', close: ')' },
                { open: '"', close: '"' },
                { open: "'", close: "'" },
                { open: '`', close: '`' }
            ],
            brackets: [
                ['{', '}'],
                ['[', ']'],
                ['(', ')']
            ],
            folding: {
                markers: {
                    start: new RegExp("^\\s*#region\\b"),
                    end: new RegExp("^\\s*#endregion\\b")
                }
            }
        });

        // Register a completion item provider
        monaco.languages.registerCompletionItemProvider(lang, {
            provideCompletionItems: function(model, position) {
                const word = model.getWordUntilPosition(position);
                const range = {
                    startLineNumber: position.lineNumber,
                    endLineNumber: position.lineNumber,
                    startColumn: word.startColumn,
                    endColumn: word.endColumn
                };

                const suggestions = getLanguageSuggestions(lang);
                
                return {
                    suggestions: suggestions.map(suggestion => ({
                        label: suggestion.label,
                        kind: suggestion.kind,
                        documentation: suggestion.documentation,
                        insertText: suggestion.insertText,
                        range: range
                    }))
                };
            }
        });
    });

    console.log('✅ Monaco Intellisense enabled');
}

function getLanguageSuggestions(language) {
    const commonSuggestions = [
        { label: 'console', kind: monaco.languages.CompletionItemKind.Function, 
          documentation: 'Console object', insertText: 'console' },
        { label: 'log', kind: monaco.languages.CompletionItemKind.Method, 
          documentation: 'Log to console', insertText: 'log' },
        { label: 'error', kind: monaco.languages.CompletionItemKind.Method, 
          documentation: 'Error logging', insertText: 'error' },
    ];

    const languageSpecific = {
        javascript: [
            { label: 'function', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Function declaration', insertText: 'function ${1:name}(${2}) {\n\t${0}\n}' },
            { label: 'const', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Constant declaration', insertText: 'const ${1:name} = ${0}' },
            { label: 'let', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Variable declaration', insertText: 'let ${1:name} = ${0}' },
            { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'If statement', insertText: 'if (${1:condition}) {\n\t${0}\n}' },
        ],
        python: [
            { label: 'def', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Function definition', insertText: 'def ${1:name}(${2}):\n\t${0}' },
            { label: 'class', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Class definition', insertText: 'class ${1:name}:\n\t${0}' },
            { label: 'import', kind: monaco.languages.CompletionItemKind.Keyword, 
              documentation: 'Import module', insertText: 'import ${0}' },
            { label: 'print', kind: monaco.languages.CompletionItemKind.Function, 
              documentation: 'Print to console', insertText: 'print(${0})' },
        ]
    };

    return [...commonSuggestions, ...(languageSpecific[language] || [])];
}

// ========== IMPROVED TERMINAL FUNCTIONS ==========
function initializeXtermTerminal() {
    console.log('🔄 Starting xterm.js initialization...');
    
    try {
        if (typeof Terminal === 'undefined') {
            throw new Error('xterm.js not loaded');
        }
        
        terminalInstance = new Terminal({
            theme: {
                background: '#0a0a0b',
                foreground: '#ffffff',
                cursor: '#64a5ff',
                selection: '#64a5ff40',
                black: '#000000',
                red: '#ff7878',
                green: '#64dcb4',
                yellow: '#ffc864',
                blue: '#64a5ff',
                magenta: '#b496ff',
                cyan: '#64d9b4',
                white: '#ffffff',
                brightBlack: '#666666',
                brightRed: '#ff7878',
                brightGreen: '#64dcb4',
                brightYellow: '#ffc864',
                brightBlue: '#64a5ff',
                brightMagenta: '#b496ff',
                brightCyan: '#64d9b4',
                brightWhite: '#ffffff'
            },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 10000,
            convertEol: true,
            disableStdin: false,
            allowTransparency: true
        });

        if (typeof FitAddon !== 'undefined') {
            fitAddon = new FitAddon();
            terminalInstance.loadAddon(fitAddon);
        }
        
        if (typeof WebLinksAddon !== 'undefined') {
            webLinksAddon = new WebLinksAddon();
            terminalInstance.loadAddon(webLinksAddon);
        }
        
        if (typeof SearchAddon !== 'undefined') {
            searchAddon = new SearchAddon();
            terminalInstance.loadAddon(searchAddon);
        }

        terminalInstance.open(xtermContainer);
        
        setTimeout(() => {
            if (fitAddon) {
                fitAddon.fit();
            }
        }, 100);

        terminalInstance.onKey((e) => {
            if (!terminalReady || !wsConnection || wsConnection.readyState !== WebSocket.OPEN) {
                console.log('Terminal not ready for input');
                return;
            }
            
            // Save cursor position before sending
            if (terminalInstance._core.buffer) {
                terminalPathState.cursorPosition = terminalInstance._core.buffer.x;
            }
        });
        
        // Save terminal state on resize
        terminalInstance.onResize((size) => {
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                wsConnection.send(`__RESIZE__:${size.cols}:${size.rows}`);
            }
        });
        
        terminalReady = true;
        terminalKilled = false;
        console.log('✅ xterm.js terminal initialized');
        initState.xterm = true;
        
        connectToWebSocket();
        
    } catch (error) {
        console.error('❌ Error initializing xterm.js:', error);
        initializationErrors.push('xterm.js failed: ' + error.message);
        initState.xterm = false;
        terminalReady = false;
        
        xtermContainer.innerHTML = `
            <div style="color: var(--accent-red); padding: 20px;">
                <h4>❌ Terminal Error</h4>
                <p>Failed to initialize terminal: ${error.message}</p>
                <p>Please check browser console for details.</p>
            </div>
        `;
    }
}

function connectToWebSocket() {
    console.log('🔄 Connecting to WebSocket...');
    
    if (wsRetryCount >= MAX_WS_RETRIES) {
        console.error('❌ Max WebSocket retries reached');
        if (terminalInstance) {
            terminalInstance.writeln('\x1b[1;31m✗ Max connection retries reached\x1b[0m');
            terminalInstance.writeln('\x1b[33mMake sure backend server is running on ws://localhost:8000\x1b[0m');
        }
        initState.websocket = false;
        return;
    }
    
    wsRetryCount++;
    
    try {
        const wsUrl = 'ws://localhost:8000';
        wsConnection = new WebSocket(wsUrl);
        
        wsConnection.onopen = () => {
            console.log('✅ WebSocket connected to', wsUrl);
            wsRetryCount = 0;
            
            if (terminalInstance) {
                terminalInstance.clear();
            }
            
            initState.websocket = true;
            checkAllInitialized();
            
            // Update terminal path in status bar
            updateTerminalPath();
        };
        
        wsConnection.onmessage = (event) => {
            if (terminalInstance && terminalReady && !terminalKilled) {
                // WRITE DIRECTLY - NO FILTERING, NO ECHO
                terminalInstance.write(event.data);
                
                // Check if message contains path update
                const message = event.data.toString();
                if (message.includes('__PATH__:')) {
                    const pathMatch = message.match(/__PATH__:(.+)/);
                    if (pathMatch && pathMatch[1]) {
                        terminalPathState.currentPath = pathMatch[1];
                        updateTerminalPath();
                    }
                }
            }
        };
        
        wsConnection.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
            initState.websocket = false;
        };
        
        wsConnection.onclose = () => {
            console.log('🔌 WebSocket connection closed');
            initState.websocket = false;
            
            if (!terminalKilled) {
                setTimeout(connectToWebSocket, 3000);
            }
        };
        
        // IMPORTANT: Listen to terminal input ONCE
        if (terminalInstance && terminalReady && !terminalKilled) {
            terminalInstance.onData((data) => {
                if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                    // Send to backend - DON'T echo locally
                    wsConnection.send(data);
                }
            });
        }
        
    } catch (error) {
        console.error('❌ Error connecting to WebSocket:', error);
        initState.websocket = false;
        setTimeout(connectToWebSocket, 3000);
    }
}

function updateTerminalPath() {
    if (terminalPathElement) {
        if (terminalPathState.currentPath) {
            terminalPathElement.textContent = `📁 ${terminalPathState.currentPath}`;
        } else {
            terminalPathElement.textContent = '📁 Not connected';
        }
    }
}

function writeTerminalPrompt() {
    if (!terminalInstance || !terminalReady) return;
    
    terminalInstance.write('\r\x1b[K');
    
    if (terminalPathState.currentPath) {
        const formattedPath = terminalPathState.currentPath.replace(/\\/g, '\\');
        terminalInstance.write(`\x1b[1;32mPS ${formattedPath}>\x1b[0m `);
    } else {
        terminalInstance.write(`\x1b[1;32mPS C:\\>\x1b[0m `);
    }
    
    // Save cursor position after writing prompt
    setTimeout(() => {
        if (terminalInstance._core.buffer) {
            terminalPathState.cursorPosition = terminalInstance._core.buffer.x;
        }
    }, 50);
}

function handleBackendMessage(message) {
    if (!terminalInstance || !terminalReady || terminalKilled) {
        return;
    }
    
    // Handle path updates
    if (message.includes('__PATH__')) {
        const pathMatch = message.match(/__PATH__:(.+)/);
        if (pathMatch && pathMatch[1]) {
            terminalPathState.currentPath = pathMatch[1];
            terminalPathState.savedPath = pathMatch[1];
            updateTerminalPath();
        }
        return;
    }
    
    // Handle clear command
    if (message.includes('__CLEAR__')) {
        terminalInstance.clear();
        return;
    }
    
    // Write everything else directly to terminal
    terminalInstance.write(message);
}

// ========== IMPROVED TERMINAL CLEAR AND RESTART ==========
async function clearAndKillTerminal() {
    if (!terminalInstance) {
        console.log('Terminal not initialized');
        return;
    }
    
    try {
        showClipboardStatus('Terminal clearing...', 'info');
        
        // Save current path before clearing
        const savedPath = terminalPathState.currentPath;
        
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.send('__TERMINAL_RESET__');
        }
        
        // Clear UI
        terminalInstance.clear();
        terminalInstance.write('\x1b[1;33m🗑️ Terminal cleared...\x1b[0m\r\n');
        
        // Save state
        terminalPathState.savedPath = savedPath;
        terminalPathState.cursorPosition = 0;
        
        // Close connection
        if (wsConnection) {
            wsConnection.close();
            wsConnection = null;
        }
        
        // Dispose terminal
        if (terminalInstance) {
            terminalInstance.dispose();
            terminalInstance = null;
        }
        
        // Reset states
        terminalReady = false;
        terminalKilled = true;
        terminalRestarting = true;
        
        // Hide terminal
        layoutState.terminalVisible = false;
        terminal.classList.remove('visible');
        terminal.classList.add('hidden');
        editorArea.style.height = '100%';
        toggleTerminalBtn.classList.remove('active');
        editorArea.classList.remove('with-terminal');
        
        showClipboardStatus('Terminal cleared completely', 'info');
        
    } catch (error) {
        console.error('Error clearing terminal:', error);
        showClipboardStatus('Error clearing terminal', 'error');
    }
}

function toggleTerminal() {
    if (!layoutState.terminalVisible || terminalKilled) {
        layoutState.terminalVisible = true;
        terminal.classList.add('visible');
        terminal.classList.remove('hidden');
        editorArea.style.height = 'calc(100% - 300px)';
        terminal.style.height = '300px';
        toggleTerminalBtn.classList.add('active');
        editorArea.classList.add('with-terminal');
        
        setTimeout(() => {
            restartFreshTerminal();
        }, 100);
    } else {
        layoutState.terminalVisible = false;
        terminal.classList.remove('visible');
        terminal.classList.add('hidden');
        editorArea.style.height = '100%';
        toggleTerminalBtn.classList.remove('active');
        editorArea.classList.remove('with-terminal');
    }
}

function restartFreshTerminal() {
    console.log('🔄 Starting fresh terminal...');
    
    try {
        if (xtermContainer) {
            xtermContainer.innerHTML = '';
        }
        
        terminalKilled = false;
        terminalReady = false;
        terminalRestarting = false;
        wsRetryCount = 0;
        
        if (wsConnection) {
            wsConnection.close();
            wsConnection = null;
        }
        
        if (terminalInstance) {
            terminalInstance.dispose();
            terminalInstance = null;
        }
        
        setTimeout(() => {
            try {
                if (typeof Terminal === 'undefined') {
                    throw new Error('xterm.js not loaded');
                }
                
                terminalInstance = new Terminal({
                    theme: {
                        background: '#0a0a0b',
                        foreground: '#ffffff',
                        cursor: '#64a5ff',
                        selection: '#64a5ff40',
                        black: '#000000',
                        red: '#ff7878',
                        green: '#64dcb4',
                        yellow: '#ffc864',
                        blue: '#64a5ff',
                        magenta: '#b496ff',
                        cyan: '#64d9b4',
                        white: '#ffffff'
                    },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace",
                    cursorBlink: true,
                    cursorStyle: 'block',
                    scrollback: 10000,
                    convertEol: true,
                    disableStdin: false,
                    allowTransparency: true
                });
                
                if (typeof FitAddon !== 'undefined') {
                    fitAddon = new FitAddon();
                    terminalInstance.loadAddon(fitAddon);
                }
                
                if (typeof WebLinksAddon !== 'undefined') {
                    webLinksAddon = new WebLinksAddon();
                    terminalInstance.loadAddon(webLinksAddon);
                }
                
                if (typeof SearchAddon !== 'undefined') {
                    searchAddon = new SearchAddon();
                    terminalInstance.loadAddon(searchAddon);
                }
                
                terminalInstance.open(xtermContainer);
                
                setTimeout(() => {
                    if (fitAddon) {
                        fitAddon.fit();
                    }
                }, 100);
                
                // Restore saved path state
                if (terminalPathState.savedPath) {
                    terminalPathState.currentPath = terminalPathState.savedPath;
                    updateTerminalPath();
                }
                
                terminalReady = true;
                
                connectToWebSocket();
                
                setTimeout(() => {
                    if (terminalInstance) {
                        terminalInstance.focus();
                    }
                }, 500);
                
                showClipboardStatus('Fresh terminal started', 'info');
                
            } catch (error) {
                console.error('❌ Error starting fresh terminal:', error);
                showClipboardStatus('Error starting terminal', 'error');
            }
        }, 100);
        
    } catch (error) {
        console.error('Error in restartFreshTerminal:', error);
        showClipboardStatus('Error starting terminal', 'error');
    }
}

// ========== RUN CODE FROM EDITOR ==========
async function runCodeFromEditor() {
    if (!monacoInitialized) {
        showClipboardStatus('Editor not ready yet', 'error');
        return;
    }
    
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) {
        showClipboardStatus('No active file to run', 'error');
        return;
    }

    const editorInstance = tabManager.getEditorInstance(activeTab.id);
    if (!editorInstance) {
        showClipboardStatus('Editor instance not found', 'error');
        return;
    }
    
    const code = editorInstance ? editorInstance.getValue() : '';
    const language = editorInstance ? editorInstance.getModel().getLanguageId() : 'python';
    
    const runMessage = `__RUN_FILE__:${language}:${activeTab.path}`;
    
    if (!layoutState.terminalVisible || terminalKilled) {
        toggleTerminal();
        setTimeout(() => {
            if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                wsConnection.send(runMessage);
                showClipboardStatus(`Running ${language} code...`, 'info');
            }
        }, 1000);
    } else if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
        wsConnection.send(runMessage);
        showClipboardStatus(`Running ${language} code...`, 'info');
    } else {
        showClipboardStatus('Terminal server not connected', 'error');
    }
}

// ========== FIXED COPY/PASTE HANDLING ==========
function handleCopyPaste(e) {
    const isCtrl = e.ctrlKey || e.metaKey;
    const isShift = e.shiftKey;
    
    if (!isCtrl) return;
    
    // Handle different contexts
    switch (activeCopyPasteContext) {
        case 'editor':
            handleEditorCopyPaste(e);
            break;
        case 'terminal':
            handleTerminalCopyPaste(e);
            break;
        case 'chat':
            handleChatCopyPaste(e);
            break;
        case 'explorer':
            handleExplorerCopyPaste(e);
            break;
    }
}

function handleEditorCopyPaste(e) {
    const activeTab = tabManager.getActiveTab();
    const editorInstance = activeTab ? tabManager.getEditorInstance(activeTab.id) : null;
    
    if (!editorInstance) return;
    
    switch (e.key.toLowerCase()) {
        case 'c':
            if (!e.shiftKey) { // Ctrl+C - Copy
                e.preventDefault();
                const selection = editorInstance.getSelection();
                if (!selection.isEmpty()) {
                    const text = editorInstance.getModel().getValueInRange(selection);
                    navigator.clipboard.writeText(text).then(() => {
                        showClipboardStatus('Copied text from editor', 'copy');
                    }).catch(err => {
                        console.error('Copy failed:', err);
                        showClipboardStatus('Copy failed', 'error');
                    });
                }
            }
            break;
            
        case 'x':
            if (!e.shiftKey) { // Ctrl+X - Cut
                e.preventDefault();
                const selection = editorInstance.getSelection();
                if (!selection.isEmpty()) {
                    const text = editorInstance.getModel().getValueInRange(selection);
                    navigator.clipboard.writeText(text).then(() => {
                        editorInstance.executeEdits('cut', [{
                            range: selection,
                            text: ''
                        }]);
                        showClipboardStatus('Cut text from editor', 'cut');
                    }).catch(err => {
                        console.error('Cut failed:', err);
                        showClipboardStatus('Cut failed', 'error');
                    });
                }
            }
            break;
            
        case 'v':
            if (!e.shiftKey) { // Ctrl+V - Paste
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    const selection = editorInstance.getSelection();
                    editorInstance.executeEdits('paste', [{
                        range: selection,
                        text: text
                    }]);
                    showClipboardStatus('Pasted text to editor', 'info');
                }).catch(err => {
                    console.error('Paste failed:', err);
                    showClipboardStatus('Paste failed', 'error');
                });
            }
            break;
            
        case 'a':
            if (!e.shiftKey) { // Ctrl+A - Select All
                e.preventDefault();
                editorInstance.setSelection(editorInstance.getModel().getFullModelRange());
            }
            break;
    }
}

function handleTerminalCopyPaste(e) {
    if (!terminalInstance || !terminalReady) return;
    
    switch (e.key.toLowerCase()) {
        case 'c':
            if (e.shiftKey) { // Ctrl+Shift+C - Copy from terminal
                e.preventDefault();
                const selection = terminalInstance.getSelection();
                if (selection) {
                    navigator.clipboard.writeText(selection).then(() => {
                        showClipboardStatus('Copied text from terminal', 'copy');
                    }).catch(err => {
                        console.error('Terminal copy failed:', err);
                        showClipboardStatus('Copy failed', 'error');
                    });
                }
            }
            break;
            
        case 'v':
            if (e.shiftKey) { // Ctrl+Shift+V - Paste to terminal
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
                        wsConnection.send(text);
                        showClipboardStatus('Pasted text to terminal', 'info');
                    } else {
                        showClipboardStatus('Terminal not connected', 'error');
                    }
                }).catch(err => {
                    console.error('Terminal paste failed:', err);
                    showClipboardStatus('Paste failed', 'error');
                });
            }
            break;
    }
}

function handleChatCopyPaste(e) {
    const aiInput = document.querySelector('.ai-input-field');
    if (!aiInput) return;
    
    switch (e.key.toLowerCase()) {
        case 'c':
            if (!e.shiftKey) { // Ctrl+C - Copy
                e.preventDefault();
                const start = aiInput.selectionStart;
                const end = aiInput.selectionEnd;
                if (start !== end) {
                    const selectedText = aiInput.value.substring(start, end);
                    navigator.clipboard.writeText(selectedText).then(() => {
                        showClipboardStatus('Copied text from chat', 'copy');
                    }).catch(err => {
                        console.error('Chat copy failed:', err);
                        showClipboardStatus('Copy failed', 'error');
                    });
                }
            }
            break;
            
        case 'v':
            if (!e.shiftKey) { // Ctrl+V - Paste
                e.preventDefault();
                navigator.clipboard.readText().then(text => {
                    const start = aiInput.selectionStart;
                    const end = aiInput.selectionEnd;
                    aiInput.value = aiInput.value.substring(0, start) + text + aiInput.value.substring(end);
                    aiInput.selectionStart = aiInput.selectionEnd = start + text.length;
                    showClipboardStatus('Pasted text to chat', 'info');
                    
                    // Trigger input event for any listeners
                    aiInput.dispatchEvent(new Event('input', { bubbles: true }));
                }).catch(err => {
                    console.error('Chat paste failed:', err);
                    showClipboardStatus('Paste failed', 'error');
                });
            }
            break;
            
        case 'a':
            if (!e.shiftKey) { // Ctrl+A - Select All
                e.preventDefault();
                aiInput.select();
            }
            break;
    }
}

function handleExplorerCopyPaste(e) {
    const item = selectedTreeItem;
    
    switch (e.key.toLowerCase()) {
        case 'c':
            if (!e.shiftKey) { // Ctrl+C - Copy
                e.preventDefault();
                if (item) {
                    copyItems([item.path]);
                }
            }
            break;
            
        case 'x':
            if (!e.shiftKey) { // Ctrl+X - Cut
                e.preventDefault();
                if (item) {
                    cutItems([item.path]);
                }
            }
            break;
            
        case 'v':
            if (!e.shiftKey) { // Ctrl+V - Paste
                e.preventDefault();
                const targetPath = currentPasteTarget || (currentFileSystem ? currentFileSystem.path : null);
                if (targetPath) {
                    pasteItems(targetPath);
                } else {
                    showClipboardStatus('Select a folder to paste into', 'error');
                }
            }
            break;
    }
}

// ========== CLIPBOARD FUNCTIONS ==========
function showClipboardStatus(message, type = 'info') {
    clipboardStatus.textContent = message;
    clipboardStatus.className = 'clipboard-status';
    clipboardStatus.classList.add('show');
    
    if (type === 'cut') {
        clipboardStatus.style.borderColor = 'var(--accent-yellow)';
        clipboardStatus.style.color = 'var(--accent-yellow)';
    } else if (type === 'copy') {
        clipboardStatus.style.borderColor = 'var(--accent-blue)';
        clipboardStatus.style.color = 'var(--accent-blue)';
    } else if (type === 'error') {
        clipboardStatus.style.borderColor = 'var(--accent-red)';
        clipboardStatus.style.color = 'var(--accent-red)';
    } else {
        clipboardStatus.style.borderColor = 'var(--accent-green)';
        clipboardStatus.style.color = 'var(--accent-green)';
    }
    
    setTimeout(() => {
        clipboardStatus.classList.remove('show');
    }, 3000);
}

function updatePasteMenuItem() {
    const pasteItem = document.getElementById('context-paste');
    if (clipboardState.type && clipboardState.items.length > 0) {
        pasteItem.classList.remove('disabled');
        const itemCount = clipboardState.items.length;
        const itemNames = clipboardState.items.map(item => item.name).slice(0, 2);
        let label = 'Paste';
        if (itemCount === 1) {
            label = `Paste "${itemNames[0]}"`;
        } else if (itemCount === 2) {
            label = `Paste "${itemNames[0]}" and "${itemNames[1]}"`;
        } else if (itemCount > 2) {
            label = `Paste "${itemNames[0]}", "${itemNames[1]}" and ${itemCount - 2} more`;
        }
        pasteItem.innerHTML = `${label} <span class="context-shortcut">Ctrl+V</span>`;
    } else {
        pasteItem.classList.add('disabled');
        pasteItem.innerHTML = `Paste <span class="context-shortcut">Ctrl+V</span>`;
    }
}

async function cutItems(paths) {
    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }
        
        const result = await window.pywebview.api.cmd_cut(paths);
        if (result && result.status === 'ok') {
            clipboardState = {
                type: 'cut',
                items: paths.map(path => ({
                    path: path,
                    name: path.split(/[\\/]/).pop()
                })),
                sourcePath: null
            };
            showClipboardStatus(`Cut ${paths.length} item(s)`, 'cut');
            updatePasteMenuItem();
            return true;
        } else {
            showClipboardStatus(result?.message || 'Error cutting items', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error cutting items:', error);
        showClipboardStatus('Error cutting items', 'error');
        return false;
    }
}

async function copyItems(paths) {
    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }
        
        const result = await window.pywebview.api.cmd_copy(paths);
        if (result && result.status === 'ok') {
            clipboardState = {
                type: 'copy',
                items: paths.map(path => ({
                    path: path,
                    name: path.split(/[\\/]/).pop()
                })),
                sourcePath: null
            };
            showClipboardStatus(`Copied ${paths.length} item(s)`, 'copy');
            updatePasteMenuItem();
            return true;
        } else {
            showClipboardStatus(result?.message || 'Error copying items', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error copying items:', error);
        showClipboardStatus('Error copying items', 'error');
        return false;
    }
}

async function pasteItems(destinationPath) {
    if (!clipboardState.type || clipboardState.items.length === 0) {
        showClipboardStatus('Nothing to paste', 'error');
        return false;
    }

    if (!destinationPath) {
        showClipboardStatus('Select a folder to paste into', 'error');
        return false;
    }

    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }

        let result;
        if (clipboardState.type === 'cut') {
            result = await window.pywebview.api.cmd_paste(destinationPath);
        } else if (clipboardState.type === 'copy') {
            result = await window.pywebview.api.cmd_paste_copy(destinationPath);
        }

        if (result && result.status === 'ok') {
            const action = clipboardState.type === 'cut' ? 'Moved' : 'Copied';
            showClipboardStatus(`${action} ${result.moved ? result.moved.length : result.copied.length} item(s)`, 'info');
            
            if (clipboardState.type === 'cut') {
                clipboardState = { type: null, items: [], sourcePath: null };
                updatePasteMenuItem();
            }
            
            await renderFileTree();
            return true;
        } else {
            showClipboardStatus(result?.message || 'Error pasting items', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error pasting items:', error);
        showClipboardStatus('Error pasting items', 'error');
        return false;
    }
}

async function deleteItems(paths) {
    if (!paths || paths.length === 0) {
        showClipboardStatus('No items selected for deletion', 'error');
        return false;
    }

    const itemNames = paths.map(path => path.split(/[\\/]/).pop()).join(', ');
    const confirmMessage = `Are you sure you want to delete ${paths.length > 1 ? 'these items' : 'this item'}?\n${itemNames}`;
    
    if (!confirm(confirmMessage)) {
        return false;
    }

    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }

        const result = await window.pywebview.api.delete_file(paths);
        if (result && result.status === 'ok') {
            showClipboardStatus(`Deleted ${result.deleted.length} item(s)`, 'info');
            await renderFileTree();
            return true;
        } else {
            showClipboardStatus(result?.message || 'Error deleting items', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error deleting items:', error);
        showClipboardStatus('Error deleting items', 'error');
        return false;
    }
}

async function renameItem(oldPath, newName) {
    if (!oldPath || !newName || newName.trim() === '') {
        return false;
    }

    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }

        const result = await window.pywebview.api.rename_file_folder([oldPath], [newName]);
        if (result && result.status === 'ok') {
            showClipboardStatus(`Renamed to "${newName}"`, 'info');
            await renderFileTree();
            return true;
        } else {
            showClipboardStatus(result?.message || 'Error renaming item', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error renaming item:', error);
        showClipboardStatus('Error renaming item', 'error');
        return false;
    }
}

// ========== GLOBAL SEARCH FUNCTIONALITY ==========
function setupGlobalSearch() {
    globalSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim();
        searchState.currentSearch = searchTerm;
        
        if (searchTerm.length >= 2) {
            performGlobalSearch(searchTerm);
        } else {
            clearSearchResults();
        }
    });
    
    globalSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (searchState.searchResults.length > 0) {
                openSearchResult(searchState.currentResultIndex >= 0 ? 
                    searchState.currentResultIndex : 0);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            navigateSearchResults(1);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            navigateSearchResults(-1);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            clearSearchResults();
            globalSearchInput.value = '';
            globalSearchInput.blur();
        }
    });
    
    // Close search when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            clearSearchResults();
        }
    });
}

async function performGlobalSearch(searchTerm) {
    try {
        // Search in current file system
        const results = [];
        
        function searchInTree(item, path = '') {
            const currentPath = path ? `${path}/${item.name}` : item.name;
            
            // Check if item name contains search term
            if (item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
                results.push({
                    type: item.type,
                    name: item.name,
                    path: currentPath,
                    fullPath: item.path
                });
            }
            
            // Search in file contents for files
            if (item.type === 'file' && 
                (item.name.endsWith('.js') || item.name.endsWith('.py') || 
                 item.name.endsWith('.html') || item.name.endsWith('.css') ||
                 item.name.endsWith('.json') || item.name.endsWith('.txt'))) {
                
                // In a real implementation, you would search file contents here
                // For now, we'll just search in open editor tabs
                const openTab = tabManager.getTabByPath(item.path);
                if (openTab) {
                    const editor = tabManager.getEditorInstance(openTab.id);
                    if (editor) {
                        const content = editor.getValue();
                        if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                            results.push({
                                type: 'content',
                                name: item.name,
                                path: currentPath,
                                fullPath: item.path,
                                matches: content.split('\n').filter(line => 
                                    line.toLowerCase().includes(searchTerm.toLowerCase())
                                ).length
                            });
                        }
                    }
                }
            }
            
            // Recursively search in children
            if (item.children) {
                item.children.forEach(child => {
                    searchInTree(child, currentPath);
                });
            }
        }
        
        if (currentFileSystem) {
            searchInTree(currentFileSystem);
        }
        
        // Also search in open tabs
        tabManager.getAllTabs().forEach(tab => {
            const editor = tabManager.getEditorInstance(tab.id);
            if (editor) {
                const content = editor.getValue();
                if (content.toLowerCase().includes(searchTerm.toLowerCase())) {
                    if (!results.some(r => r.fullPath === tab.path)) {
                        results.push({
                            type: 'content',
                            name: tab.name,
                            path: tab.path,
                            fullPath: tab.path,
                            matches: content.split('\n').filter(line => 
                                line.toLowerCase().includes(searchTerm.toLowerCase())
                            ).length
                        });
                    }
                }
            }
        });
        
        searchState.searchResults = results;
        searchState.currentResultIndex = results.length > 0 ? 0 : -1;
        
        displaySearchResults(results);
        
    } catch (error) {
        console.error('Search error:', error);
    }
}

function displaySearchResults(results) {
    // Clear previous results
    clearSearchResults();
    
    if (results.length === 0) {
        return;
    }
    
    // Create dropdown for results
    const dropdown = document.createElement('div');
    dropdown.className = 'dropdown search-results';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '40px';
    dropdown.style.left = '50%';
    dropdown.style.transform = 'translateX(-50%)';
    dropdown.style.width = '500px';
    dropdown.style.maxHeight = '400px';
    dropdown.style.overflowY = 'auto';
    dropdown.style.zIndex = '10000';
    
    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${index === searchState.currentResultIndex ? 'selected' : ''}`;
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                ${getFileIconSVG(result.type === 'folder' ? 'folder' : result.name.split('.').pop())}
                <div style="flex: 1;">
                    <div style="font-weight: 500;">${result.name}</div>
                    <div style="font-size: 10px; color: var(--text-muted);">${result.path}</div>
                    ${result.matches ? `<div style="font-size: 10px; color: var(--accent-blue);">${result.matches} matches</div>` : ''}
                </div>
            </div>
        `;
        
        item.addEventListener('click', () => {
            openSearchResult(index);
        });
        
        dropdown.appendChild(item);
    });
    
    const searchContainer = document.querySelector('.search-container');
    searchContainer.appendChild(dropdown);
}

function openSearchResult(index) {
    if (index < 0 || index >= searchState.searchResults.length) return;
    
    const result = searchState.searchResults[index];
    
    if (result.type === 'folder' || result.type === 'file') {
        // Navigate to file/folder in explorer
        openFileInExplorer(result.fullPath);
    } else if (result.type === 'content') {
        // Open file in editor and focus search
        openFileInEditor(result.name, result.fullPath).then(() => {
            // Trigger find in editor
            const activeTab = tabManager.getActiveTab();
            if (activeTab) {
                const editor = tabManager.getEditorInstance(activeTab.id);
                if (editor) {
                    editor.focus();
                    editor.getAction('actions.find').run();
                }
            }
        });
    }
    
    clearSearchResults();
    globalSearchInput.value = '';
}

function navigateSearchResults(direction) {
    if (searchState.searchResults.length === 0) return;
    
    const newIndex = searchState.currentResultIndex + direction;
    
    if (newIndex >= 0 && newIndex < searchState.searchResults.length) {
        searchState.currentResultIndex = newIndex;
        
        // Update UI
        const items = document.querySelectorAll('.search-results .dropdown-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === newIndex);
        });
        
        // Scroll into view
        const selectedItem = items[newIndex];
        if (selectedItem) {
            selectedItem.scrollIntoView({ block: 'nearest' });
        }
    }
}

function clearSearchResults() {
    const existingResults = document.querySelector('.search-results');
    if (existingResults) {
        existingResults.remove();
    }
    searchState.searchResults = [];
    searchState.currentResultIndex = -1;
}

function openFileInExplorer(fullPath) {
    // Find and expand the tree item
    function expandTreeItem(item, path) {
        const treeItem = document.querySelector(`.tree-item[data-path="${item.path}"]`);
        if (treeItem) {
            if (item.type === 'folder' && !item.open) {
                treeItem.click(); // Expand folder
            }
            
            if (item.path === path) {
                treeItem.click(); // Select item
                treeItem.scrollIntoView({ block: 'center' });
                return true;
            }
            
            // Search in children
            if (item.children) {
                for (const child of item.children) {
                    if (expandTreeItem(child, path)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    if (currentFileSystem) {
        expandTreeItem(currentFileSystem, fullPath);
    }
}

// ========== ACTIVITY BAR FUNCTIONALITY ==========
function setupActivityBar() {
    activityExplorer.addEventListener('click', () => {
        toggleSidebar();
        
        // Update active state
        document.querySelectorAll('.activity-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        activityExplorer.classList.add('active');
    });
    
    activitySearch.addEventListener('click', () => {
        // Toggle search in editor (Ctrl+H functionality)
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.startFindReplaceAction').run();
            }
        }
        
        // Update active state
        document.querySelectorAll('.activity-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        activitySearch.classList.add('active');
    });
    
    activityRun.addEventListener('click', () => {
        runCodeFromEditor();
        
        // Update active state
        document.querySelectorAll('.activity-icon').forEach(icon => {
            icon.classList.remove('active');
        });
        activityRun.classList.add('active');
    });
}

// ========== FILE ICON SVG GENERATION ==========
function getFileIconSVG(extension) {
    const icons = {
        // Programming Languages
        'py': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 5c0 1.38 2 2.5 3 2.5s3-1.12 3-2.5c0-1.38-2-2.5-3-2.5s-3 1.12-3 2.5z" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'js': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 10h6m-3 0v6" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'jsx': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 17l10 5 10-5" stroke="currentColor" stroke-width="1.5"/>
            <path d="M2 12l10 5 10-5" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'ts': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 8v8m-4-4h4" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 12h4" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'html': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 3h16l-1.5 14-6.5 3-6.5-3L4 3z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 7h10l-.5 4.5-4 1.5-4-1.5L7 7z" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'css': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 3h16l-1.5 14-6.5 3-6.5-3L4 3z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 7h10l-.5 4-4 1.5-4-1.5L7 7z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M7 13h10" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'json': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 10v8a2 2 0 0 0-2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M20 6H4a2 2 0 0 0-2 2v2h20V8a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="8" cy="14" r="1" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="16" cy="14" r="1" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'java': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 16l2-2 2 2 2-2 2 2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 8l-2 2-2-2-2 2-2-2" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'cpp': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M16 8v8M8 8v8M12 6v12" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'go': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 8h8v8H8z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 8l-8 8M8 8l8 8" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'rust': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 8h8v8H8z" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="2" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'php': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <ellipse cx="12" cy="12" rx="10" ry="10" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 8h8v8H8z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 10h4v4h-4z" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'rb': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="9" cy="9" r="2" stroke="currentColor" stroke-width="1.5"/>
            <circle cx="15" cy="9" r="2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M9 15c1.5-1 3-1 6 0" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'swift': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 12l4 4 4-4" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'kt': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 8h8v8H8z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 8v8" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'sql': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 10v8a2 2 0 0 0-2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M20 6H4a2 2 0 0 0-2 2v2h20V8a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 14l2-2 2 2 2-2" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'yaml': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M4 10v8a2 2 0 0 0-2 2h12a2 2 0 0 0 2-2v-8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M20 6H4a2 2 0 0 0-2 2v2h20V8a2 2 0 0 0-2-2z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M8 14l2-2 2 2 2-2" stroke="currentColor" stroke-width="1.5"/>
            <path d="M12 14l2 2" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'md': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 13H8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 17H8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 9H8" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'txt': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" stroke-width="1.5"/>
            <path d="M14 2v6h6" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 13H8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M16 17H8" stroke="currentColor" stroke-width="1.5"/>
            <path d="M10 9H8" stroke="currentColor" stroke-width="1.5"/>
        </svg>`,
        
        'folder': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>`,
        
        'default': `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
        </svg>`
    };
    
    return icons[extension] || icons['default'];
}

// ========== FILE SYSTEM FUNCTIONS ==========
async function renderFileTree() {
    try {
        if (!window.pywebview || !window.pywebview.api) {
            console.error('pywebview API not available');
            return;
        }
        
        const response = await window.pywebview.api.get_folder_structure();
        currentFileSystem = response;
        treeContainer.innerHTML = '';
        renderTreeItem(currentFileSystem, treeContainer, 0);
    } catch (error) {
        console.error('Error rendering file tree:', error);
        showClipboardStatus('Error loading file tree', 'error');
    }
}

function renderTreeItem(item, container, level) {
    const treeItem = document.createElement('div');
    treeItem.className = `tree-item ${item.type} ${item.open ? 'open' : ''}`;
    treeItem.dataset.name = item.name;
    treeItem.dataset.type = item.type;
    treeItem.dataset.path = item.path;
    treeItem.style.setProperty('--level', level);
    
    const itemContent = document.createElement('div');
    itemContent.className = 'item-content';
    
    if (item.type === 'folder') {
        const chevron = document.createElement('div');
        chevron.className = 'chevron';
        chevron.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
        `;
        chevron.classList.toggle('rotated', item.open);
        itemContent.appendChild(chevron);
    } else {
        const spacer = document.createElement('div');
        spacer.style.width = '12px';
        itemContent.appendChild(spacer);
    }
    
    const icon = document.createElement('div');
    icon.className = 'item-icon';
    const ext = item.name.split('.').pop().toLowerCase();
    icon.innerHTML = getFileIconSVG(item.type === 'folder' ? 'folder' : ext);
    itemContent.appendChild(icon);
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.textContent = item.name;
    itemContent.appendChild(nameSpan);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    if (item.type === 'folder') {
        actions.innerHTML = `
            <button class="item-action-btn" title="New File" data-action="new-file" data-path="${item.path}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
            </button>
            <button class="item-action-btn" title="New Folder" data-action="new-folder" data-path="${item.path}">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <line x1="9" y1="14" x2="15" y2="14"/>
                </svg>
            </button>
        `;
    }
    itemContent.appendChild(actions);
    
    treeItem.appendChild(itemContent);
    container.appendChild(treeItem);
    
    if (item.type === 'folder') {
        currentPasteTarget = item.path;
    }
    
    treeItem.addEventListener('click', (e) => {
        if (!e.target.closest('.item-action-btn')) {
            document.querySelectorAll('.tree-item').forEach(el => {
                el.classList.remove('selected');
            });
            treeItem.classList.add('selected');
            selectedTreeItem = item;
            createParentPath = item.type === 'folder' ? item.path : null;
            
            if (item.type === 'folder') {
                currentPasteTarget = item.path;
            } else {
                currentPasteTarget = item.path.split(/[\\/]/).slice(0, -1).join('/');
            }
            
            if (item.type === 'file') {
                openFileInEditor(item.name, item.path);
            }
            
            if (item.type === 'folder') {
                const chevron = treeItem.querySelector('.chevron');
                
                if (item.open) {
                    item.open = false;
                    chevron.classList.remove('rotated');
                    
                    const children = Array.from(treeItem.querySelectorAll('.tree-item'));
                    children.forEach(child => child.remove());
                    
                } else {
                    item.open = true;
                    chevron.classList.add('rotated');
                    
                    if (item.children && item.children.length > 0) {
                        item.children.forEach(child => {
                            renderTreeItem(child, treeItem, level + 1);
                        });
                    }
                }
            }
            e.stopPropagation();
        }
    });
    
    treeItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        document.querySelectorAll('.tree-item').forEach(el => {
            el.classList.remove('selected');
        });
        treeItem.classList.add('selected');
        selectedTreeItem = item;
        
        if (item.type === 'folder') {
            currentPasteTarget = item.path;
        } else {
            currentPasteTarget = item.path.split(/[\\/]/).slice(0, -1).join('/');
        }
        
        showContextMenu(e.clientX, e.clientY, item);
    });
    
    const actionBtns = actions.querySelectorAll('.item-action-btn');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = btn.dataset.action;
            const path = btn.dataset.path;
            
            if (action === 'new-file') {
                showCreateInput('file', path);
            } else if (action === 'new-folder') {
                showCreateInput('folder', path);
            }
        });
    });
    
    if (item.type === 'folder' && item.open && item.children) {
        item.children.forEach(child => {
            renderTreeItem(child, treeItem, level + 1);
        });
    }
}

// ========== CONTEXT MENU FUNCTIONS ==========
function showContextMenu(x, y, item) {
    updatePasteMenuItem();
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.add('show');
    
    window.currentContextItem = item;
    
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu, { once: true });
    }, 0);
}

function closeContextMenu() {
    contextMenu.classList.remove('show');
    window.currentContextItem = null;
}

function setupContextMenuActions() {
    document.getElementById('context-open').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item) {
            if (item.type === 'file') {
                openFileInEditor(item.name, item.path);
            } else if (item.type === 'folder') {
                const treeItem = document.querySelector(`.tree-item[data-path="${item.path}"]`);
                if (treeItem) {
                    treeItem.click();
                }
            }
        }
        closeContextMenu();
    });
    
    document.getElementById('context-open-in-new-tab').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item && item.type === 'file') {
            openFileInEditor(item.name, item.path);
        }
        closeContextMenu();
    });
    
    document.getElementById('context-cut').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item) {
            await cutItems([item.path]);
        }
        closeContextMenu();
    });
    
    document.getElementById('context-copy').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item) {
            await copyItems([item.path]);
        }
        closeContextMenu();
    });
    
    document.getElementById('context-paste').addEventListener('click', async () => {
        if (!currentPasteTarget) {
            showClipboardStatus('Select a folder to paste into', 'error');
            closeContextMenu();
            return;
        }
        
        await pasteItems(currentPasteTarget);
        closeContextMenu();
    });
    
    document.getElementById('context-rename').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item) {
            const newName = prompt('Enter new name:', item.name);
            if (newName && newName !== item.name) {
                await renameItem(item.path, newName);
            }
        }
        closeContextMenu();
    });
    
    document.getElementById('context-delete').addEventListener('click', async () => {
        const item = window.currentContextItem;
        if (item) {
            await deleteItems([item.path]);
        }
        closeContextMenu();
    });
    
    document.getElementById('context-new-file').addEventListener('click', () => {
        const item = window.currentContextItem;
        const targetPath = item ? (item.type === 'folder' ? item.path : currentPasteTarget) : currentPasteTarget;
        if (targetPath) {
            showCreateInput('file', targetPath);
        } else {
            showClipboardStatus('Select a folder first', 'error');
        }
        closeContextMenu();
    });
    
    document.getElementById('context-new-folder').addEventListener('click', () => {
        const item = window.currentContextItem;
        const targetPath = item ? (item.type === 'folder' ? item.path : currentPasteTarget) : currentPasteTarget;
        if (targetPath) {
            showCreateInput('folder', targetPath);
        } else {
            showClipboardStatus('Select a folder first', 'error');
        }
        closeContextMenu();
    });
}

// ========== FILE EDITOR FUNCTIONS ==========
async function openFileInEditor(fileName, filePath) {
    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return;
        }
        
        const existingTab = tabManager.getTabByPath(filePath);
        if (existingTab) {
            const existingTabElement = document.getElementById(existingTab.id);
            if (existingTabElement) {
                setActiveTab(existingTabElement);
                return;
            }
        }
        
        const content = await window.pywebview.api.open_files_editor(filePath);
        const tabId = tabManager.addTab(fileName, filePath, content);
        
        if (!tabId) {
            throw new Error('Failed to create tab');
        }
        
        await createUITab(fileName, filePath, tabId, content);
        welcomeScreen.style.display = 'none';
        splitView.style.display = 'flex';
        
    } catch (error) {
        console.error('Error opening file:', error);
        showClipboardStatus('Error opening file: ' + error, 'error');
    }
}

async function createUITab(fileName, filePath, tabId, content) {
    const tabBar = document.getElementById("tab-bar");
    
    const tab = document.createElement("div");
    tab.className = "tab";
    tab.dataset.path = filePath;
    tab.dataset.name = fileName;
    tab.id = tabId;
    
    const ext = fileName.split('.').pop().toLowerCase();
    const iconSVG = getFileIconSVG(ext);
    
    tab.innerHTML = `
        <div class="tab-unsaved"></div>
        ${iconSVG}
        ${fileName}
        <div class="tab-close">×</div>
    `;
    
    tabBar.appendChild(tab);
    
    const editorInstance = await createEditorForTab(tabId, content, getLanguageFromFileName(fileName));
    if (editorInstance) {
        tabManager.setEditorInstance(tabId, editorInstance);
    }
    
    setActiveTab(tab);
    
    tab.querySelector(".tab-close").addEventListener("click", (e) => {
        e.stopPropagation();
        closeTabWithConfirmation(tab);
    });
    
    tab.addEventListener("click", () => {
        setActiveTab(tab);
    });
}

// ========== UPDATE CURSOR POSITION DISPLAY ==========
function updateCursorPositionDisplay(line, column) {
    if (cursorLineElement) {
        cursorLineElement.textContent = line;
    }
    if (cursorColumnElement) {
        cursorColumnElement.textContent = column;
    }
}

async function createEditorForTab(tabId, content, language) {
    const containerId = `editor-container-${tabId}`;
    
    let container = document.getElementById(containerId);
    if (!container) {
        container = document.createElement('div');
        container.id = containerId;
        container.className = 'monaco-container hidden';
        pane1.appendChild(container);
    }
    
    if (typeof monaco === 'undefined') {
        console.error('Monaco Editor not loaded');
        return null;
    }
    
    // Get Monaco editor options from settings manager
    const editorOptions = settingsManager.getMonacoEditorOptions();
    
    const editor = monaco.editor.create(container, {
        value: content,
        language: language,
        ...editorOptions,
        scrollBeyondLastLine: false,
        scrollBeyondLastColumn: 10,
        lineNumbersMinChars: 4,
        automaticLayout: true,
        renderLineHighlight: 'all',
        padding: { top: 16, bottom: 16 },
        folding: true,
        wordBasedSuggestions: true,
        links: true,
        colorDecorators: true,
        lightbulb: { enabled: true },
        inlayHints: { enabled: true },
        fixedOverflowWidgets: true,
        hideCursorInOverviewRuler: true,
        stopRenderingLineAfter: 10000,
        maxTokenizationLineLength: 20000,
        mouseStyle: 'default',
        disableLayerHinting: false
    });
    
    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
        const lineNumber = e.position.lineNumber;
        const column = e.position.column;
        updateCursorPositionDisplay(lineNumber, column);
    });
    
    // Initialize cursor position
    const position = editor.getPosition();
    updateCursorPositionDisplay(position.lineNumber, position.column);
    
    editor.onDidChangeModelContent(() => {
        const currentContent = editor.getValue();
        const tabData = tabManager.getTab(tabId);
        if (tabData) {
            tabManager.updateTabContent(tabData.path, currentContent);
            updateTabUnsavedIndicator(tabId);
        }
    });
    
    const resizeObserver = new ResizeObserver(() => {
        editor.layout();
    });
    resizeObserver.observe(container);
    
    return editor;
}

function getLanguageFromFileName(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const languageMap = {
        'js': 'javascript',
        'jsx': 'javascript',
        'ts': 'typescript',
        'tsx': 'typescript',
        'py': 'python',
        'html': 'html',
        'css': 'css',
        'json': 'json',
        'xml': 'xml',
        'md': 'markdown',
        'txt': 'plaintext',
        'java': 'java',
        'c': 'c',
        'cpp': 'cpp',
        'cs': 'csharp',
        'php': 'php',
        'rb': 'ruby',
        'go': 'go',
        'rs': 'rust',
        'swift': 'swift',
        'kt': 'kotlin',
        'sql': 'sql',
        'yaml': 'yaml',
        'yml': 'yaml'
    };
    return languageMap[ext] || 'plaintext';
}

function setActiveTab(tab) {
    document.querySelectorAll('.monaco-container').forEach(container => {
        container.classList.add('hidden');
    });
    
    document.querySelectorAll(".tab").forEach(t => {
        t.classList.remove("active");
    });
    tab.classList.add("active");
    
    const tabId = tab.id;
    tabManager.setActiveTab(tabId);
    
    const containerId = `editor-container-${tabId}`;
    const container = document.getElementById(containerId);
    if (container) {
        container.classList.remove('hidden');
        
        const editorInstance = tabManager.getEditorInstance(tabId);
        if (editorInstance) {
            setTimeout(() => {
                editorInstance.layout();
                // Update cursor position for active tab
                const position = editorInstance.getPosition();
                updateCursorPositionDisplay(position.lineNumber, position.column);
            }, 50);
        }
    }
}

function closeTabWithConfirmation(tab) {
    const tabId = tab.id;
    const tabData = tabManager.getTab(tabId);
    
    if (tabData && tabData.unsaved) {
        if (!confirm(`Save changes to "${tabData.name}" before closing?`)) {
            closeTab(tab);
        } else {
            saveCurrentFile().then(saved => {
                if (saved) {
                    closeTab(tab);
                }
            });
        }
    } else {
        closeTab(tab);
    }
}

function closeTab(tab) {
    const tabId = tab.id;
    
    tabManager.removeTab(tabId);
    tab.remove();
    
    const allTabs = tabManager.getAllTabs();
    if (allTabs.length === 0) {
        welcomeScreen.style.display = 'flex';
        splitView.style.display = 'none';
        // Reset cursor display when no tabs
        updateCursorPositionDisplay(0, 0);
    } else {
        const lastTab = allTabs[allTabs.length - 1];
        const lastTabElement = document.getElementById(lastTab.id);
        if (lastTabElement) {
            setActiveTab(lastTabElement);
        }
    }
}

function updateTabUnsavedIndicator(tabId) {
    const tabElement = document.getElementById(tabId);
    if (!tabElement) return;
    
    const tabData = tabManager.getTab(tabId);
    if (tabData) {
        if (tabData.unsaved) {
            tabElement.classList.add('unsaved');
        } else {
            tabElement.classList.remove('unsaved');
        }
    }
}

async function saveCurrentFile() {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) {
        showClipboardStatus('No file to save', 'error');
        return false;
    }
    
    const editorInstance = tabManager.getEditorInstance(activeTab.id);
    const content = editorInstance ? editorInstance.getValue() : '';
    
    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }
        
        const result = await window.pywebview.api.save(activeTab.path, content);
        if (result && result.status === 'success') {
            tabManager.markAsSaved(activeTab.path);
            updateTabUnsavedIndicator(activeTab.id);
            showClipboardStatus('File saved successfully', 'info');
            return true;
        } else {
            showClipboardStatus(result?.message || 'Save failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error saving file:', error);
        showClipboardStatus('Error saving file', 'error');
        return false;
    }
}

async function saveFileAs() {
    const activeTab = tabManager.getActiveTab();
    if (!activeTab) {
        showClipboardStatus('No file to save', 'error');
        return false;
    }
    
    const editorInstance = tabManager.getEditorInstance(activeTab.id);
    const content = editorInstance ? editorInstance.getValue() : '';
    
    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return false;
        }
        
        const newPath = prompt('Enter new file path:', activeTab.path);
        if (!newPath) return false;
        
        const result = await window.pywebview.api.save_as(newPath, content);
        if (result && result.status === 'success') {
            const oldPath = activeTab.path;
            const newName = newPath.split(/[\\/]/).pop();
            
            tabManager.removeTab(activeTab.id);
            const tabId = tabManager.addTab(newName, newPath, content);
            tabManager.markAsSaved(newPath);
            
            const oldTabElement = document.getElementById(activeTab.id);
            if (oldTabElement) {
                oldTabElement.dataset.path = newPath;
                oldTabElement.dataset.name = newName;
                oldTabElement.id = tabId;
                const nameSpan = oldTabElement.querySelector('.tab .item-name, .tab > span');
                if (nameSpan) {
                    nameSpan.textContent = newName;
                }
                updateTabUnsavedIndicator(tabId);
            }
            
            showClipboardStatus('File saved as ' + newName, 'info');
            return true;
        } else {
            showClipboardStatus(result?.message || 'Save as failed', 'error');
            return false;
        }
    } catch (error) {
        console.error('Error saving file as:', error);
        showClipboardStatus('Error saving file', 'error');
        return false;
    }
}

function showCreateInput(type, parentPath) {
    createMode = type;
    createParentPath = parentPath || null; 
    createInputContainer.classList.add('show');
    createInput.placeholder = `New ${type} name`;
    createInput.value = '';
    createInput.focus();
    
    const selectedItem = document.querySelector('.tree-item.selected');
    if (selectedItem) {
        createInputContainer.style.marginTop = '4px';
    }
}

function hideCreateInput() {
    createInputContainer.classList.remove('show');
    createMode = null;
    createParentPath = null;
}

async function createNewItem(name) {
    if (!name.trim()) {
        hideCreateInput();
        return;
    }

    try {
        if (!window.pywebview || !window.pywebview.api) {
            showClipboardStatus('Backend not connected', 'error');
            return;
        }
        
        if (createMode === 'file') {
            const result = await window.pywebview.api.create_newFile(createParentPath, name.trim());
            if (result && result.status === 'ok') {
                await renderFileTree();
                openFileInEditor(name.trim(), result.path);
            }
        } else if (createMode === 'folder') {
            const result = await window.pywebview.api.create_folder(createParentPath, name.trim());
            
            if (result && result.status === 'ok') {
                showClipboardStatus(`Folder "${name.trim()}" created`, 'info');
                await renderFileTree();
                
                setTimeout(async () => {
                    const newFolderPath = result.path;
                    const newFolderElement = document.querySelector(`.tree-item[data-path="${newFolderPath}"]`);
                    if (newFolderElement) {
                        newFolderElement.click();
                    }
                }, 300);
            } else {
                showClipboardStatus(result?.message || 'Error creating folder', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating item:', error);
        showClipboardStatus('Error creating ' + createMode + ': ' + error, 'error');
    }
    
    hideCreateInput();
}

// ========== COMPLETE MENU BAR FUNCTIONALITY ==========
function setupMenuBar() {
    // Setup dropdowns
    const menus = ['file', 'edit', 'view', 'selection', 'go', 'run'];
    
    menus.forEach(menu => {
        const menuBtn = document.getElementById(`${menu}-menu`);
        const dropdown = document.getElementById(`${menu}-dropdown`);
        
        if (!menuBtn || !dropdown) {
            console.warn(`Menu or dropdown not found for: ${menu}`);
            return;
        }
        
        menuBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            document.querySelectorAll('.dropdown.show').forEach(d => {
                if (d !== dropdown) {
                    d.classList.remove('show');
                }
            });
            
            const isShowing = dropdown.classList.toggle('show');
            
            if (isShowing) {
                const rect = menuBtn.getBoundingClientRect();
                dropdown.style.position = 'fixed';
                dropdown.style.left = `${Math.min(rect.left, window.innerWidth - dropdown.offsetWidth - 10)}px`;
                dropdown.style.top = `${rect.bottom + 2}px`;
                dropdown.style.zIndex = '10000';
            }
        });
        
        dropdown.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.show').forEach(d => {
            d.classList.remove('show');
        });
    });
    
    // Handle escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.dropdown.show').forEach(d => {
                d.classList.remove('show');
            });
        }
    });
    
    // FILE MENU
    document.getElementById('menu-new-file')?.addEventListener('click', () => {
        showCreateInput('file', createParentPath || null);
    });
    
    document.getElementById('menu-new-window')?.addEventListener('click', () => {
        showClipboardStatus('New window functionality coming soon', 'info');
    });
    
    // FIXED: Open File functionality
    document.getElementById('menu-open-file')?.addEventListener('click', async () => {
        try {
            if (!window.pywebview || !window.pywebview.api) {
                showClipboardStatus('Backend not connected', 'error');
                return;
            }
            
            const result = await window.pywebview.api.open_specific_file();
            if (result && result.file_name && result.full_path) {
                await openFileInEditor(result.file_name, result.full_path);
                showClipboardStatus(`Opened: ${result.file_name}`, 'info');
            }
        } catch (error) {
            console.error('Error opening file:', error);
            showClipboardStatus('Error opening file', 'error');
        }
    });
    
    // FIXED: Open Folder functionality
    document.getElementById('menu-open-folder')?.addEventListener('click', async () => {
        try {
            if (!window.pywebview || !window.pywebview.api) {
                showClipboardStatus('Backend not connected', 'error');
                return;
            }
            
            const folderPath = await window.pywebview.api.browse_folder();
            if (folderPath) {
                // Clear current tabs
                tabManager.getAllTabs().forEach(tab => {
                    const tabElement = document.getElementById(tab.id);
                    if (tabElement) {
                        tabElement.remove();
                    }
                });
                tabManager.tabs.clear();
                tabManager.editorInstances.clear();
                
                // Show welcome screen
                welcomeScreen.style.display = 'flex';
                splitView.style.display = 'none';
                
                // Refresh file tree
                await renderFileTree();
                showClipboardStatus(`Folder opened: ${folderPath}`, 'info');
            }
        } catch (error) {
            console.error('Error opening folder:', error);
            showClipboardStatus('Error opening folder', 'error');
        }
    });
    
    document.getElementById('menu-preferences')?.addEventListener('click', () => {
        showClipboardStatus('Preferences panel coming soon', 'info');
    });
    
    document.getElementById('menu-exit')?.addEventListener('click', () => {
        closeApp();
    });
    
    // EDIT MENU
    document.getElementById('edit-undo')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.undo').run();
            }
        }
    });
    
    document.getElementById('edit-redo')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.redo').run();
            }
        }
    });
    
    document.getElementById('edit-cut')?.addEventListener('click', () => {
        handleEditorCopyPaste({ key: 'x', ctrlKey: true, shiftKey: false, preventDefault: () => {} });
    });
    
    document.getElementById('edit-copy')?.addEventListener('click', () => {
        handleEditorCopyPaste({ key: 'c', ctrlKey: true, shiftKey: false, preventDefault: () => {} });
    });
    
    document.getElementById('edit-paste')?.addEventListener('click', () => {
        handleEditorCopyPaste({ key: 'v', ctrlKey: true, shiftKey: false, preventDefault: () => {} });
    });
    
    document.getElementById('edit-select-all')?.addEventListener('click', () => {
        handleEditorCopyPaste({ key: 'a', ctrlKey: true, shiftKey: false, preventDefault: () => {} });
    });
    
    document.getElementById('edit-find')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('actions.find').run();
            }
        }
    });
    
    document.getElementById('edit-replace')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.startFindReplaceAction').run();
            }
        }
    });
    
    document.getElementById('edit-toggle-line-comment')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.commentLine').run();
            }
        }
    });
    
    document.getElementById('edit-toggle-block-comment')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.blockComment').run();
            }
        }
    });
    
    // VIEW MENU
    document.getElementById('view-command-palette')?.addEventListener('click', () => {
        globalSearchInput.focus();
        showClipboardStatus('Command palette activated', 'info');
    });
    
    document.getElementById('view-explorer')?.addEventListener('click', () => {
        toggleSidebar();
    });
    
    document.getElementById('view-search')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('actions.find').run();
            }
        }
    });
    
    document.getElementById('view-source-control')?.addEventListener('click', () => {
        showClipboardStatus('Source control panel coming soon', 'info');
    });
    
    document.getElementById('view-run-debug')?.addEventListener('click', () => {
        showClipboardStatus('Run and debug panel coming soon', 'info');
    });
    
    document.getElementById('view-extensions')?.addEventListener('click', () => {
        showClipboardStatus('Extensions panel coming soon', 'info');
    });
    
    document.getElementById('view-toggle-terminal')?.addEventListener('click', () => {
        toggleTerminal();
    });
    
    document.getElementById('view-toggle-sidebar')?.addEventListener('click', () => {
        toggleSidebar();
    });
    
    document.getElementById('view-toggle-fullscreen')?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    });
    
    document.getElementById('view-zoom-in')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.fontZoomIn').run();
            }
        }
    });
    
    document.getElementById('view-zoom-out')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.fontZoomOut').run();
            }
        }
    });
    
    document.getElementById('view-zoom-reset')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.fontZoomReset').run();
            }
        }
    });
    
    // SELECTION MENU
    document.getElementById('selection-select-all')?.addEventListener('click', () => {
        handleEditorCopyPaste({ key: 'a', ctrlKey: true, shiftKey: false, preventDefault: () => {} });
    });
    
    document.getElementById('selection-select-line')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('expandLineSelection').run();
            }
        }
    });
    
    document.getElementById('selection-select-word')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.addSelectionToNextFindMatch').run();
            }
        }
    });
    
    document.getElementById('selection-cursor-above')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.insertCursorAbove').run();
            }
        }
    });
    
    document.getElementById('selection-cursor-below')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.insertCursorBelow').run();
            }
        }
    });
    
    document.getElementById('selection-cursor-line-ends')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.insertCursorAtEndOfEachLineSelected').run();
            }
        }
    });
    
    document.getElementById('selection-move-line-up')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.moveLinesUpAction').run();
            }
        }
    });
    
    document.getElementById('selection-move-line-down')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.moveLinesDownAction').run();
            }
        }
    });
    
    document.getElementById('selection-copy-line-up')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.copyLinesUpAction').run();
            }
        }
    });
    
    document.getElementById('selection-copy-line-down')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.copyLinesDownAction').run();
            }
        }
    });
    
    document.getElementById('selection-expand')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.smartSelect.expand').run();
            }
        }
    });
    
    document.getElementById('selection-shrink')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.smartSelect.shrink').run();
            }
        }
    });
    
    // GO MENU
    document.getElementById('go-file')?.addEventListener('click', () => {
        globalSearchInput.focus();
        showClipboardStatus('Type to search files...', 'info');
    });
    
    document.getElementById('go-symbol')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.quickOutline').run();
            }
        }
    });
    
    document.getElementById('go-line')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.gotoLine').run();
            }
        }
    });
    
    document.getElementById('go-bracket')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.jumpToBracket').run();
            }
        }
    });
    
    document.getElementById('go-back')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.navigateBack').run();
            }
        }
    });
    
    document.getElementById('go-forward')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.navigateForward').run();
            }
        }
    });
    
    document.getElementById('go-definition')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.revealDefinition').run();
            }
        }
    });
    
    document.getElementById('go-peek-definition')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.peekDefinition').run();
            }
        }
    });
    
    document.getElementById('go-references')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.findReferences').run();
            }
        }
    });
    
    document.getElementById('go-next-problem')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.marker.next').run();
            }
        }
    });
    
    document.getElementById('go-previous-problem')?.addEventListener('click', () => {
        const activeTab = tabManager.getActiveTab();
        if (activeTab) {
            const editor = tabManager.getEditorInstance(activeTab.id);
            if (editor) {
                editor.focus();
                editor.getAction('editor.action.marker.prev').run();
            }
        }
    });
    
    // RUN MENU
    document.getElementById('run-start-debugging')?.addEventListener('click', () => {
        showClipboardStatus('Starting debugging...', 'info');
    });
    
    document.getElementById('run-without-debugging')?.addEventListener('click', () => {
        runCodeFromEditor();
    });
    
    document.getElementById('run-stop-debugging')?.addEventListener('click', () => {
        showClipboardStatus('Stopping debugging...', 'info');
    });
    
    document.getElementById('run-restart-debugging')?.addEventListener('click', () => {
        showClipboardStatus('Restarting debugging...', 'info');
    });
    
    document.getElementById('run-step-over')?.addEventListener('click', () => {
        showClipboardStatus('Step over functionality coming soon', 'info');
    });
    
    document.getElementById('run-step-into')?.addEventListener('click', () => {
        showClipboardStatus('Step into functionality coming soon', 'info');
    });
    
    document.getElementById('run-step-out')?.addEventListener('click', () => {
        showClipboardStatus('Step out functionality coming soon', 'info');
    });
    
    document.getElementById('run-task')?.addEventListener('click', () => {
        showClipboardStatus('Run task functionality coming soon', 'info');
    });
    
    document.getElementById('run-build-task')?.addEventListener('click', () => {
        showClipboardStatus('Build task functionality coming soon', 'info');
    });
    
    document.getElementById('runcodeee')?.addEventListener('click', runCodeFromEditor);
    
    document.getElementById('run-open-terminal')?.addEventListener('click', () => {
        toggleTerminal();
    });
    
    document.getElementById('run-toggle-problems')?.addEventListener('click', () => {
        switchTerminalTab('problems');
        if (!layoutState.terminalVisible) {
            toggleTerminal();
        }
    });
    
    // Add keyboard shortcuts
    saveFileBtn?.addEventListener('click', async () => {
        await saveCurrentFile();
    });
    
    saveFileAsBtn?.addEventListener('click', async () => {
        await saveFileAs();
    });
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        handleCopyPaste(e);
        
        // Prevent default behavior only for our shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key.toLowerCase()) {
                case 's':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        saveCurrentFile();
                    }
                    break;
                    
                case 's':
                    if (e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        saveFileAs();
                    }
                    break;
                    
                case 'n':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        showCreateInput('file', createParentPath || null);
                    }
                    break;
                    
                case 'o':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        document.getElementById('menu-open-file')?.click();
                    }
                    break;
                    
                case 'p':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        globalSearchInput.focus();
                    }
                    break;
                    
                case 'f':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        document.getElementById('edit-find')?.click();
                    }
                    break;
                    
                case 'h':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        document.getElementById('edit-replace')?.click();
                    }
                    break;
                    
                case 'b':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        toggleSidebar();
                    }
                    break;
                    
                case '`':
                    if (!e.shiftKey && !e.altKey) {
                        e.preventDefault();
                        toggleTerminal();
                    }
                    break;
            }
        }
        
        // Function keys
        if (!e.ctrlKey && !e.shiftKey && !e.altKey) {
            switch (e.key) {
                case 'F5':
                    e.preventDefault();
                    document.getElementById('run-start-debugging')?.click();
                    break;
                    
                case 'F8':
                    e.preventDefault();
                    runCodeFromEditor();
                    break;
                    
                case 'F11':
                    e.preventDefault();
                    document.getElementById('view-toggle-fullscreen')?.click();
                    break;
                    
                case 'F12':
                    e.preventDefault();
                    document.getElementById('go-definition')?.click();
                    break;
            }
        }
    });
}

// ========== TOGGLE FUNCTIONS ==========
function toggleSidebar() {
    layoutState.sidebarVisible = !layoutState.sidebarVisible;
    sidebar.classList.toggle('hidden', !layoutState.sidebarVisible);
    toggleSidebarBtn.classList.toggle('active', layoutState.sidebarVisible);
    
    tabManager.getAllTabs().forEach(tab => {
        const editor = tabManager.getEditorInstance(tab.id);
        if (editor) {
            setTimeout(() => {
                editor.layout();
            }, 300);
        }
    });
    
    if (fitAddon) {
        setTimeout(() => {
            fitAddon.fit();
        }, 300);
    }
}

function toggleChat() {
    layoutState.chatVisible = !layoutState.chatVisible;
    aiPanel.classList.toggle('hidden', !layoutState.chatVisible);
    toggleChatBtn.classList.toggle('active', layoutState.chatVisible);
    
    tabManager.getAllTabs().forEach(tab => {
        const editor = tabManager.getEditorInstance(tab.id);
        if (editor) {
            setTimeout(() => {
                editor.layout();
            }, 300);
        }
    });
}

function toggleSplitView() {
    layoutState.splitView = !layoutState.splitView;
    if (layoutState.splitView) {
        pane2.style.display = 'flex';
        splitHandle.style.display = 'block';
        toggleSplitBtn.classList.add('active');
    } else {
        pane2.style.display = 'none';
        splitHandle.style.display = 'none';
        toggleSplitBtn.classList.remove('active');
    }
    
    tabManager.getAllTabs().forEach(tab => {
        const editor = tabManager.getEditorInstance(tab.id);
        if (editor) {
            setTimeout(() => {
                editor.layout();
            }, 100);
        }
    });
}

function toggleTerminalFullscreen() {
    layoutState.terminalFullscreen = !layoutState.terminalFullscreen;
    terminal.classList.toggle('full-screen', layoutState.terminalFullscreen);
    
    if (layoutState.terminalFullscreen) {
        editorArea.style.display = 'none';
    } else {
        editorArea.style.display = 'flex';
    }
    
    if (fitAddon) {
        setTimeout(() => {
            fitAddon.fit();
        }, 100);
    }
}

// ========== UTILITY FUNCTIONS ==========
function closeTerminal() {
    if (confirm('Are you sure you want to close the terminal?')) {
        toggleTerminal();
    }
}

// ========== OTHER PANELS INITIALIZATION ==========
function initProblemsPanel() {
    const problemsPanel = document.getElementById('problems-panel-content');
    problemsPanel.innerHTML = '';
    
    const problems = [
        { severity: 'error', message: 'Cannot find module \'react\'', location: 'src/App.jsx:1' },
        { severity: 'warning', message: 'Variable \'unusedVar\' is assigned a value but never used', location: 'src/utils.js:5' },
        { severity: 'info', message: 'Missing return type on function', location: 'src/index.js:12' },
        { severity: 'error', message: 'Unexpected token \';\'', location: 'src/components/Header.jsx:8' },
        { severity: 'warning', message: 'Component should be written as a pure function', location: 'src/components/Sidebar.jsx:3' }
    ];
    
    problems.forEach(problem => {
        const problemItem = document.createElement('div');
        problemItem.className = 'problem-item';
        problemItem.innerHTML = `
            <div class="problem-severity ${problem.severity}"></div>
            <div class="problem-message">${problem.message}</div>
            <div class="problem-location">${problem.location}</div>
        `;
        problemsPanel.appendChild(problemItem);
    });
}

function initOutputPanel() {
    const outputPanel = document.getElementById('output-panel-content');
    outputPanel.innerHTML = '';
    
    const outputLines = [
        { time: '10:30:12', message: 'Starting compilation...' },
        { time: '10:30:13', message: 'Compiled successfully!' },
        { time: '10:30:14', message: 'Found 0 errors. Watching for file changes.' },
        { time: '10:31:22', message: 'File change detected. Starting incremental compilation...' },
        { time: '10:31:23', message: 'Compiled successfully!' },
        { time: '10:32:45', message: 'Server running on http://localhost:3000' }
    ];
    
    outputLines.forEach(line => {
        const outputLine = document.createElement('div');
        outputLine.className = 'terminal-output';
        outputLine.innerHTML = `
            <span style="color: var(--accent-blue);">[${line.time}]</span> ${line.message}
        `;
        outputPanel.appendChild(outputLine);
    });
}

function initDebugPanel() {
    const debugPanel = document.getElementById('debug-panel-content');
    debugPanel.innerHTML = '';
    
    const debugLines = [
        { type: 'input', text: 'console.log("Debugging started")' },
        { type: 'result', text: 'Debugging started' },
        { type: 'input', text: 'let x = 10' },
        { type: 'result', text: 'undefined' },
        { type: 'input', text: 'x * 2' },
        { type: 'result', text: '20' },
        { type: 'input', text: 'function test() { return "Hello" }' },
        { type: 'result', text: 'undefined' },
        { type: 'input', text: 'test()' },
        { type: 'result', text: '"Hello"' }
    ];
    
    debugLines.forEach(line => {
        const debugLine = document.createElement('div');
        debugLine.className = 'debug-output';
        if (line.type === 'input') {
            debugLine.innerHTML = `<span class="debug-input">> ${line.text}</span>`;
        } else {
            debugLine.innerHTML = `<span class="debug-result">${line.text}</span>`;
        }
        debugPanel.appendChild(debugLine);
    });
}

function initPortsPanel() {
    const portsPanel = document.getElementById('ports-panel-content');
    portsPanel.innerHTML = '';
    
    const ports = [
        { number: 3000, process: 'React Development Server', status: 'running' },
        { number: 5000, process: 'API Server', status: 'running' },
        { number: 5432, process: 'PostgreSQL', status: 'stopped' },
        { number: 27017, process: 'MongoDB', status: 'running' },
        { number: 6379, process: 'Redis', status: 'stopped' }
    ];
    
    ports.forEach(port => {
        const portItem = document.createElement('div');
        portItem.className = 'problem-item';
        portItem.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; flex: 1;">
                <span style="color: var(--accent-blue); font-weight: 500; min-width: 60px;">${port.number}</span>
                <span style="color: var(--text-secondary);">${port.process}</span>
            </div>
            <div class="problem-location" style="background: ${port.status === 'running' ? 'rgba(100, 220, 180, 0.1)' : 'rgba(255, 120, 120, 0.1)'}; 
                color: ${port.status === 'running' ? 'var(--accent-green)' : 'var(--accent-red)'}; 
                padding: 2px 6px; border-radius: 3px; border: 1px solid ${port.status === 'running' ? 'rgba(100, 220, 180, 0.2)' : 'rgba(255, 120, 120, 0.2)'}">
                ${port.status}
            </div>
        `;
        portsPanel.appendChild(portItem);
    });
}

// ========== TERMINAL TAB SWITCHING ==========
function switchTerminalTab(tabName) {
    terminalTabs.forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    const panelContents = document.querySelectorAll('.panel-content');
    panelContents.forEach(content => {
        if (content.dataset.tab === tabName) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
    
    layoutState.activeTerminalTab = tabName;
    
    if (tabName === 'terminal' && terminalInstance && terminalReady && !terminalKilled) {
        setTimeout(() => {
            terminalInstance.focus();
        }, 100);
    }
}

// ========== INITIALIZATION CHECK ==========
function checkAllInitialized() {
    const allInitialized = Object.values(initState).every(value => value === true);
    
    if (allInitialized && !initializationComplete) {
        console.log('✅ All systems initialized successfully!');
        initializationComplete = true;
        
        setTimeout(() => {
            if (fitAddon) {
                fitAddon.fit();
            }
            
            tabManager.getAllTabs().forEach(tab => {
                const editor = tabManager.getEditorInstance(tab.id);
                if (editor) {
                    editor.layout();
                }
            });
        }, 500);
        
    } else if (!initializationComplete) {
        console.log('🔄 Waiting for initialization:', initState);
    }
}

// ========== PYWEBVIEW READY CHECK ==========
function checkPyWebViewReady() {
    if (window.pywebview && window.pywebview.api) {
        console.log('✅ pywebview API available');
        initState.pywebview = true;
        checkAllInitialized();
        return true;
    }
    return false;
}

// ========== EVENT LISTENERS SETUP ==========
let eventListenersAttached = false;

function setupEventListeners() {
    if (eventListenersAttached) {
        console.log('Event listeners already attached, skipping');
        return;
    }
    
    eventListenersAttached = true;
    
    toggleSidebarBtn.addEventListener('click', toggleSidebar);
    toggleTerminalBtn.addEventListener('click', toggleTerminal);
    toggleChatBtn.addEventListener('click', toggleChat);
    toggleSplitBtn.addEventListener('click', toggleSplitView);
    terminalFullscreenBtn.addEventListener('click', toggleTerminalFullscreen);
    clearTerminalBtn.addEventListener('click', clearAndKillTerminal);
    closeTerminalBtn.addEventListener('click', closeTerminal);
    
    newFileBtn.addEventListener('click', () => {
        showCreateInput('file', createParentPath || (currentFileSystem ? currentFileSystem.path : null));
    });
    
    newFolderBtn.addEventListener('click', () => {
        showCreateInput('folder', createParentPath || (currentFileSystem ? currentFileSystem.path : null));
    });
    
    createInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            createNewItem(createInput.value);
        }
    });
    
    createConfirmBtn.addEventListener('click', () => {
        createNewItem(createInput.value);
    });
    
    createCancelBtn.addEventListener('click', hideCreateInput);
    
    document.addEventListener('click', (e) => {
        if (createInputContainer.classList.contains('show') && 
            !createInputContainer.contains(e.target) && 
            !e.target.closest('.explorer-btn')) {
            hideCreateInput();
        }
    });
    
    terminalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            switchTerminalTab(tab.dataset.tab);
        });
    });
    
    let isDragging = false;
    splitHandle.addEventListener('mousedown', () => {
        isDragging = true;
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const containerWidth = splitView.clientWidth;
        const mouseX = e.clientX - splitView.getBoundingClientRect().left;
        const percentage = Math.max(30, Math.min(70, (mouseX / containerWidth) * 100));
        
        pane1.style.flex = `0 0 ${percentage}%`;
        pane2.style.flex = `0 0 ${100 - percentage}%`;
        
        tabManager.getAllTabs().forEach(tab => {
            const editor = tabManager.getEditorInstance(tab.id);
            if (editor) {
                editor.layout();
            }
        });
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            document.body.style.cursor = '';
        }
    });
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.context-menu') && !e.target.closest('.tree-item')) {
            closeContextMenu();
        }
    });
    
    window.addEventListener('resize', () => {
        if (fitAddon) {
            fitAddon.fit();
        }
        
        tabManager.getAllTabs().forEach(tab => {
            const editor = tabManager.getEditorInstance(tab.id);
            if (editor) {
                setTimeout(() => {
                    editor.layout();
                }, 100);
            }
        });
    });
    
    window.addEventListener('beforeunload', (e) => {
        if (tabManager.hasUnsavedChanges()) {
            e.preventDefault();
            e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            return e.returnValue;
        }
        
        eventListenersAttached = false;
        if (wsConnection && wsConnection.readyState === WebSocket.OPEN) {
            wsConnection.close();
        }
    });
}

// ========== MAIN INITIALIZATION ==========
async function initializeApplication() {
    console.log('🚀 Starting NebulaIDE initialization...');
    
    // Initialize xterm.js immediately
    initializeXtermTerminal();
    
    // Check pywebview
    const pywebviewCheck = setInterval(() => {
        if (checkPyWebViewReady()) {
            clearInterval(pywebviewCheck);
            
            // Initialize UI components
            initState.ui = true;
            setupMenuBar();
            setupContextMenuActions();
            setupGlobalSearch();
            setupActivityBar();
            initProblemsPanel();
            initOutputPanel();
            initDebugPanel();
            initPortsPanel();
            
            // Set initial UI states
            toggleSidebarBtn.classList.add('active');
            toggleTerminalBtn.classList.add('active');
            toggleChatBtn.classList.add('active');
            editorArea.classList.add('with-terminal');
            editorArea.style.height = 'calc(100% - 300px)';
            terminal.classList.add('visible');
            welcomeScreen.style.display = 'flex';
            splitView.style.display = 'none';
            
            // Initialize cursor position display
            updateCursorPositionDisplay(0, 0);
            
            // Initialize terminal path display
            updateTerminalPath();
            
            // Initialize Monaco
            initializeMonacoWithRetry();
            
            // Load file tree
            setTimeout(async () => {
                try {
                    await renderFileTree();
                    console.log('📂 File tree loaded');
                } catch (error) {
                    console.error('❌ Error loading file tree:', error);
                }
            }, 1000);
            
            // Setup event listeners
            setupEventListeners();
        }
    }, 100);
}

// ========== WINDOW CONTROL FUNCTIONS ==========
window.minimize = function() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.minimize();
    }
};

window.maximize = function() {
    if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.maximize();
    }
};

window.closeApp = function() {
    if (window.pywebview && window.pywebview.api) {
        if (tabManager.hasUnsavedChanges()) {
            if (!confirm('You have unsaved changes. Are you sure you want to exit?')) {
                return;
            }
        }
        window.pywebview.api.close();
    }
};

// ========== AI FUNCTIONALITY ==========
const sendBtn = document.querySelector('.send-btn');
const aiInput = document.querySelector('.ai-input-field');
const chatContainer = document.querySelector('.chat-container');

let githubState = {
    active: false,
    waitingFor: null,
    repoUrl: "",
    branch: ""
};

async function hold_my_tea() {
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai';
    aiMessageDiv.innerHTML = `
        <div class="bubble">☕ Hold my tea… fixing the whole project now.</div>
        <div class="timestamp">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
    `;
    chatContainer.appendChild(aiMessageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
        const result = await window.pywebview.api.hold_my_tea();

        const doneDiv = document.createElement('div');
        doneDiv.className = 'message ai';
        doneDiv.innerHTML = `
            <div class="bubble">✅ Tea done. Project updated successfully.<br><pre>${result}</pre></div>
            <div class="timestamp">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        chatContainer.appendChild(doneDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

    } catch (err) {
        const errDiv = document.createElement('div');
        errDiv.className = 'message ai';
        errDiv.innerHTML = `
            <div class="bubble">❌ Tea spilled: ${err}</div>
            <div class="timestamp">${new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
        `;
        chatContainer.appendChild(errDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }
}

async function model_response(userInputText) {
    const userMessageDiv = document.createElement('div');
    userMessageDiv.className = 'message user';
    userMessageDiv.innerHTML = `
        <div class="bubble">${userInputText}</div>
        <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    chatContainer.appendChild(userMessageDiv);
    
    const welcomeDiv = chatContainer.querySelector('.ai-welcome');
    if (welcomeDiv) welcomeDiv.remove();
    
    chatContainer.scrollTop = chatContainer.scrollHeight;

    // GitHub conversation handling
    if (githubState.active) {
        if (githubState.waitingFor === "url") {
            githubState.repoUrl = userInputText.trim();
            githubState.waitingFor = "branch";

            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message ai';
            aiMessageDiv.innerHTML = `<div class="bubble">Got it! Which branch should I use?</div>
                                      <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
            chatContainer.appendChild(aiMessageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            return;
        }
        if (githubState.waitingFor === "branch") {
            githubState.branch = userInputText.trim();
            githubState.active = false;
            githubState.waitingFor = null;

            const aiMessageDiv = document.createElement('div');
            aiMessageDiv.className = 'message ai';
            aiMessageDiv.innerHTML = `<div class="bubble">Perfect! Uploading to GitHub...</div>
                                      <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
            chatContainer.appendChild(aiMessageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;

            try {
                await window.pywebview.api.github_Repo(githubState.repoUrl, githubState.branch);
                const doneDiv = document.createElement('div');
                doneDiv.className = 'message ai';
                doneDiv.innerHTML = `<div class="bubble">Upload complete! ✅ Your repo is up-to-date.</div>
                                     <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
                chatContainer.appendChild(doneDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (err) {
                const errDiv = document.createElement('div');
                errDiv.className = 'message ai';
                errDiv.innerHTML = `<div class="bubble">Oops! Something went wrong: ${err}</div>
                                    <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
                chatContainer.appendChild(errDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            }

            return;
        }
    }

    // Detect casual GitHub upload command
    const trigger = userInputText.toLowerCase();
    if (trigger.includes("upload project") || trigger.includes("github") || trigger.includes("push repo")) {
        githubState.active = true;
        githubState.waitingFor = "url";

        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai';
        aiMessageDiv.innerHTML = `<div class="bubble">Sure! What's the GitHub repo URL?</div>
                                  <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
        chatContainer.appendChild(aiMessageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        return;
    }

    // HOLD MY TEA / PROJECT UPDATE
    if (
    trigger.includes("hold my tea") ||
    trigger.includes("update folder") ||
    trigger.includes("update project") ||
    trigger.includes("update my project") ||
    trigger.includes("update whole project") ||
    trigger.includes("update kr") ||
    trigger.includes("update kar") ||
    trigger.includes("update kr de") ||
    trigger.includes("update kar de") ||
    trigger.includes("folder update") ||
    trigger.includes("project update")
    ) {
        hold_my_tea();
        return;
    }

    // Detect casual README command
    if (trigger.includes("add readme") || trigger.includes("generate readme") || trigger.includes("create readme")) {
        const aiMessageDiv = document.createElement('div');
        aiMessageDiv.className = 'message ai';
        aiMessageDiv.innerHTML = `<div class="bubble">Got it! Generating README file in your project...</div>
                                  <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
        chatContainer.appendChild(aiMessageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            await window.pywebview.api.calling_function();
            const doneDiv = document.createElement('div');
            doneDiv.className = 'message ai';
            doneDiv.innerHTML = `<div class="bubble">README.md created successfully! ✅</div>
                                 <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
            chatContainer.appendChild(doneDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        } catch (err) {
            const errDiv = document.createElement('div');
            errDiv.className = 'message ai';
            errDiv.innerHTML = `<div class="bubble">Oops! Something went wrong while generating README: ${err}</div>
                                <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>`;
            chatContainer.appendChild(errDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
        return;
    }

    // Default AI response
    const response = await window.pywebview.api.send_model_response(userInputText);
    const aiMessageDiv = document.createElement('div');
    aiMessageDiv.className = 'message ai';
    aiMessageDiv.innerHTML = `
        <div class="bubble">${response}</div>
        <div class="timestamp">${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
    `;
    chatContainer.appendChild(aiMessageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

// AI Event listeners
sendBtn.addEventListener('click', () => {
    const text = aiInput.value.trim();
    if (text) {
        model_response(text);
        aiInput.value = '';
    }
});

aiInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) sendBtn.click();
});

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM Content Loaded');
    initializeApplication();
});

// Fallback initialization
setTimeout(() => {
    if (!initializationComplete) {
        console.log('🔄 Fallback initialization');
        initializeApplication();
    }
}, 3000);

// ========== APPLY SETTINGS TO ALL EDITORS ==========
function applySettingsToAllEditors() {
    const editorOptions = settingsManager.getMonacoEditorOptions();
    
    // Update all open editor instances
    if (tabManager && tabManager.editorInstances) {
        tabManager.editorInstances.forEach((editor, tabId) => {
            if (editor && !editor.isDisposed) {
                editor.updateOptions(editorOptions);
            }
        });
    }
    
    console.log('Settings applied to all editors');
}

// Function to reload settings from localStorage and apply
function reloadAndApplySettings() {
    settingsManager.settings = settingsManager.loadSettings();
    applySettingsToAllEditors();
    
    // Apply theme to body
    const theme = settingsManager.get('theme');
    if (theme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
    
    console.log('Settings reloaded and applied');
}

// Listen for storage changes from other windows (like home.html)
window.addEventListener('storage', (e) => {
    if (e.key === 'ideSettings') {
        console.log('Settings changed in another window, reloading...');
        reloadAndApplySettings();
    }
});

// Apply settings on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(reloadAndApplySettings, 500);
    });
} else {
    setTimeout(reloadAndApplySettings, 500);
}