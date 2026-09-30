// app.js
document.addEventListener('DOMContentLoaded', () => {
    const editor = document.getElementById('markdown-editor');
    const preview = document.getElementById('markdown-preview');
    const toc = document.getElementById('toc');
    const wordCount = document.getElementById('stat-words');
    const readTime = document.getElementById('stat-read-time');
    const currentFilename = document.getElementById('current-filename');
    
    let openedFiles = [];
    let activeFileIndex = -1;
    let currentFilePath = null;

    // Marked.js config
    marked.setOptions({
        breaks: true,
        gfm: true,
        highlight: function(code, lang) {
            if (Prism.languages[lang]) {
                return Prism.highlight(code, Prism.languages[lang], lang);
            } else {
                return code;
            }
        }
    });

    // Custom marked renderer for GitHub Alerts
    const renderer = new marked.Renderer();
    const originalBlockquote = renderer.blockquote.bind(renderer);
    
    renderer.blockquote = (quote) => {
        const regex = /\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i;
        const match = quote.match(regex);
        if (match) {
            const type = match[1].toLowerCase();
            const content = quote.replace(regex, '').trim();
            return `<div class="markdown-alert markdown-alert-${type}">
                        <div class="markdown-alert-title">
                            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                            ${match[1].toUpperCase()}
                        </div>
                        <div>${content}</div>
                    </div>`;
        }
        return originalBlockquote(quote);
    };
    
    marked.use({ renderer });

    // Render markdown function
    const renderMarkdown = () => {
        const markdownText = editor.value;
        const html = marked.parse(markdownText);
        preview.innerHTML = html;
        
        // Render Math (KaTeX)
        if (window.renderMathInElement) {
            renderMathInElement(preview, {
              delimiters: [
                  {left: '$$', right: '$$', display: true},
                  {left: '$', right: '$', display: false}
              ],
              throwOnError : false
            });
        }

        // Initialize Mermaid diagrams
        if (window.mermaid) {
            try {
                mermaid.init(undefined, document.querySelectorAll('.language-mermaid'));
            } catch (e) {
                console.error("Mermaid error:", e);
            }
        }

        updateStats(markdownText);
        updateTOC();
    };

    const updateStats = (text) => {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
        wordCount.innerText = words;
        readTime.innerText = Math.ceil(words / 200) + ' min';
    };

    const updateTOC = () => {
        const headers = preview.querySelectorAll('h1, h2, h3');
        toc.innerHTML = '';
        headers.forEach((header, index) => {
            const id = 'heading-' + index;
            header.id = id;
            const a = document.createElement('a');
            a.href = '#' + id;
            a.innerText = header.innerText;
            a.className = 'toc-link toc-' + header.tagName.toLowerCase();
            toc.appendChild(a);
            
            a.addEventListener('click', (e) => {
                e.preventDefault();
                header.scrollIntoView({ behavior: 'smooth' });
            });
        });
    };

    editor.addEventListener('input', () => {
        renderMarkdown();
        if (activeFileIndex >= 0) {
            openedFiles[activeFileIndex].content = editor.value;
        }
    });

    // Sync scrolling
    editor.addEventListener('scroll', () => {
        const percentage = editor.scrollTop / (editor.scrollHeight - editor.clientHeight);
        const previewContainer = document.getElementById('preview-container');
        previewContainer.scrollTop = percentage * (previewContainer.scrollHeight - previewContainer.clientHeight);
    });

    // Theme selector
    const themeSelector = document.getElementById('theme-selector');
    themeSelector.addEventListener('change', (e) => {
        document.body.className = e.target.value + (document.body.classList.contains('mode-reader') ? ' mode-reader' : ' mode-split');
    });

    // Mode toggles
    const btnSplit = document.getElementById('btn-mode-split');
    const btnReader = document.getElementById('btn-mode-reader');
    
    btnSplit.addEventListener('click', () => {
        document.body.classList.remove('mode-reader');
        document.body.classList.add('mode-split');
        btnSplit.classList.add('active');
        btnReader.classList.remove('active');
    });
    
    btnReader.addEventListener('click', () => {
        document.body.classList.remove('mode-split');
        document.body.classList.add('mode-reader');
        btnReader.classList.add('active');
        btnSplit.classList.remove('active');
    });

    // File Operations via IPC
    const btnOpen = document.getElementById('btn-open');
    const btnSave = document.getElementById('btn-save');

    btnOpen.addEventListener('click', () => {
        if (window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(JSON.stringify({ type: 'open_file_dialog' }));
        } else if (window.Android) {
            window.Android.openFileDialog();
        } else {
            document.getElementById('hidden-file-input').click();
        }
    });

    document.getElementById('hidden-file-input').addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            let loaded = 0;
            let filesData = [];
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (e) => {
                    filesData.push({ name: file.name, path: file.name, content: e.target.result });
                    loaded++;
                    if (loaded === files.length) {
                        loadFiles(filesData);
                    }
                };
                reader.readAsText(file);
            });
        }
    });

    btnSave.addEventListener('click', () => {
        if (currentFilePath && window.chrome && window.chrome.webview) {
            window.chrome.webview.postMessage(JSON.stringify({ 
                type: 'save_file', 
                path: currentFilePath, 
                content: editor.value 
            }));
        } else {
            alert("Save is only supported for existing files in the Desktop App.");
        }
    });

    const btnExportPdf = document.getElementById('btn-export-pdf');
    if (btnExportPdf) {
        btnExportPdf.addEventListener('click', () => {
            window.print();
        });
    }

    // --- Tab Management ---
    const renderTabs = () => {
        const container = document.getElementById('tabs-container');
        if (!container) return;
        container.innerHTML = '';
        openedFiles.forEach((file, index) => {
            const tab = document.createElement('div');
            tab.className = 'tab' + (index === activeFileIndex ? ' active' : '');
            
            const nameSpan = document.createElement('span');
            nameSpan.innerText = file.name;
            tab.appendChild(nameSpan);
            
            const closeBtn = document.createElement('button');
            closeBtn.className = 'tab-close';
            closeBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                closeTab(index);
            });
            tab.appendChild(closeBtn);
            
            tab.addEventListener('click', () => switchTab(index));
            container.appendChild(tab);
        });
    };

    const switchTab = (index) => {
        if (activeFileIndex >= 0 && activeFileIndex < openedFiles.length) {
            openedFiles[activeFileIndex].content = editor.value; // Save current editor state
        }
        activeFileIndex = index;
        const file = openedFiles[index];
        if (file) {
            currentFilename.innerText = file.name;
            currentFilePath = file.path;
            editor.value = file.content;
            renderMarkdown();
        }
        renderTabs();
    };

    const closeTab = (index) => {
        openedFiles.splice(index, 1);
        if (openedFiles.length === 0) {
            activeFileIndex = -1;
            currentFilename.innerText = "No file opened";
            currentFilePath = null;
            editor.value = "";
            renderMarkdown();
            renderTabs();
            return;
        }
        if (activeFileIndex >= index) {
            activeFileIndex = Math.max(0, activeFileIndex - 1);
        }
        switchTab(activeFileIndex);
    };

    const loadFiles = (filesArray) => {
        filesArray.forEach(f => {
            const nameOnly = (f.name || f.path).split('\\').pop().split('/').pop();
            const existingIndex = openedFiles.findIndex(of => of.path && of.path === f.path);
            if (existingIndex >= 0) {
                openedFiles[existingIndex].content = f.content;
                activeFileIndex = existingIndex;
            } else {
                openedFiles.push({ name: nameOnly, path: f.path, content: f.content });
                activeFileIndex = openedFiles.length - 1;
            }
        });
        switchTab(activeFileIndex);
    };

    const loadFileContent = (filename, content) => {
        loadFiles([{ name: filename, path: filename, content: content }]);
    };

    // Global bindings for Android IPC
    window.loadFileContentAndroid = loadFileContent;
    window.loadFilesContentAndroid = (filesJsonString) => {
        try {
            const files = JSON.parse(filesJsonString);
            loadFiles(files);
        } catch(e) { console.error("Android IPC parse error", e); }
    };

    // Receive messages from C# host
    if (window.chrome && window.chrome.webview) {
        window.chrome.webview.addEventListener('message', event => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'open_file') {
                    loadFileContent(data.path, data.content);
                } else if (data.type === 'open_files') {
                    loadFiles(data.files);
                }
            } catch (e) {
                console.error("Failed to parse IPC message", e);
            }
        });
    }

    // Initial render for sample.md
    fetch('sample.md')
        .then(response => response.text())
        .then(text => {
            if (openedFiles.length === 0) {
                loadFiles([{ name: 'sample.md', path: 'sample.md', content: text }]);
            }
        }).catch(err => console.error("Could not load sample.md", err));
});
