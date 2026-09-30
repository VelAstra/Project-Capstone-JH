/* Application Orchestrator - OmniPDF Studio */
// Global state
let activeTab = 'dashboard';
let uploadedFiles = [];
let currentFileToProcess = null;
let processedFileBytes = null;
let processedFileName = '';
let processedFileType = 'application/pdf';
let pagesState = []; // For Organize PDF [{ originalIndex, rotation }]
let activeSignatureDataUrl = null;
let signaturePlacement = null; // For Sign PDF coordinates

// UI Elements mapping
const views = {
  dashboard: document.getElementById('view-dashboard'),
  workspace: document.getElementById('view-workspace')
};

const elements = {
  sidebarNav: document.querySelector('.sidebar-nav'),
  searchTools: document.getElementById('search-tools'),
  themeToggle: document.getElementById('theme-toggle'),
  btnSettings: document.getElementById('btn-settings'),
  settingsModal: document.getElementById('settings-modal'),
  btnCloseSettings: document.getElementById('btn-close-settings'),
  btnSaveSettings: document.getElementById('btn-save-settings'),
  btnClearSettings: document.getElementById('btn-clear-settings'),
  
  // Workspace UI
  btnBackDashboard: document.getElementById('btn-back-dashboard'),
  workspaceIcon: document.getElementById('workspace-icon'),
  workspaceTitle: document.getElementById('workspace-title'),
  workspaceDesc: document.getElementById('workspace-desc'),
  dropzone: document.getElementById('file-dropzone'),
  dropzoneLimits: document.getElementById('dropzone-limits'),
  fileInput: document.getElementById('file-input'),
  filesListContainer: document.getElementById('files-list-container'),
  filesList: document.getElementById('files-list'),
  filesCount: document.getElementById('files-count'),
  btnClearFiles: document.getElementById('btn-clear-files'),
  interactiveWorkspace: document.getElementById('interactive-workspace'),
  pagesGrid: document.getElementById('pages-grid'),
  visualActions: document.getElementById('visual-actions'),
  
  // Configurations & Triggers
  toolConfigs: document.getElementById('tool-configs'),
  btnProcess: document.getElementById('btn-process-pdf'),
  processProgress: document.getElementById('process-progress'),
  progressFill: document.getElementById('progress-fill'),
  progressText: document.getElementById('progress-text'),
  
  // Results panel
  resultPanel: document.getElementById('result-panel'),
  resultFilename: document.getElementById('result-filename'),
  resultFilesize: document.getElementById('result-filesize'),
  resultSavingsRow: document.getElementById('result-savings-row'),
  resultSavings: document.getElementById('result-savings'),
  btnDownload: document.getElementById('btn-download-result'),
  
  // Sign modal
  signModal: document.getElementById('sign-canvas-modal'),
  btnCloseSignModal: document.getElementById('btn-close-sign-modal'),
  btnCancelSignature: document.getElementById('btn-cancel-signature'),
  btnUseSignature: document.getElementById('btn-use-signature'),
  
  // Global stats
  statFilesProcessed: document.getElementById('stat-files-processed')
};

// Tool definitions
const tools = {
  // 1. Manipulate PDF
  merge: { title: "Merge PDF", icon: "fa-code-merge", class: "gradient-purple", desc: "Combine multiple PDF files into one easily.", limits: "Supports multiple .pdf files" },
  split: { title: "Split PDF", icon: "fa-scissors", class: "gradient-blue", desc: "Extract specific ranges or pages into separate PDFs.", limits: "Supports multiple .pdf files" },
  organize: { title: "Organize PDF", icon: "fa-folder-open", class: "gradient-teal", desc: "Reorder or delete pages visually.", limits: "Supports multiple .pdf files" },
  rotate: { title: "Rotate PDF", icon: "fa-rotate-right", class: "gradient-cyan", desc: "Rotate all or specific pages in a PDF.", limits: "Supports multiple .pdf files" },
  remove: { title: "Remove Pages", icon: "fa-file-circle-minus", class: "gradient-red", desc: "Remove specific pages from a PDF.", limits: "Supports multiple .pdf files" },
  extract: { title: "Extract Pages", icon: "fa-file-export", class: "gradient-orange", desc: "Extract selected pages into a new PDF.", limits: "Supports multiple .pdf files" },
  
  // 2. Edit & Add
  edit: { title: "Edit PDF", icon: "fa-pen-to-square", class: "gradient-orange", desc: "Visually add text, images, and drawings to pages.", limits: "Supports multiple .pdf files" },
  sign: { title: "Sign PDF", icon: "fa-signature", class: "gradient-rose", desc: "Draw and place signatures visually on documents.", limits: "Supports multiple .pdf files" },
  watermark: { title: "Watermark", icon: "fa-stamp", class: "gradient-violet", desc: "Add text overlay with custom font, angle & transparency.", limits: "Supports multiple .pdf files" },
  'page-numbers': { title: "Page Numbers", icon: "fa-hashtag", class: "gradient-cyan", desc: "Add page numbers with custom layout & formatting.", limits: "Supports multiple .pdf files" },
  'flatten-pdf': { title: "Flatten PDF", icon: "fa-layer-group", class: "gradient-teal", desc: "Convert interactive forms to static visual graphics.", limits: "Supports multiple .pdf files" },
  
  // 3. Convert from PDF
  'pdf-to-jpg': { title: "PDF to JPG", icon: "fa-images", class: "gradient-orange", desc: "Export pages as JPG images.", limits: "Supports multiple .pdf files" },
  'pdf-to-text': { title: "PDF to Text", icon: "fa-file-lines", class: "gradient-red", desc: "Extract all text content from a PDF file.", limits: "Supports multiple .pdf files" },
  'extract-images': { title: "Extract Images", icon: "fa-image", class: "gradient-pink", desc: "Extract all embedded images from a PDF.", limits: "Supports multiple .pdf files" },
  ocr: { title: "OCR PDF", icon: "fa-eye", class: "gradient-yellow", desc: "Convert scanned PDF pages to searchable text.", limits: "Supports multiple .pdf files" },

  // 4. Convert to PDF
  'ppt-to-pdf': { title: "PPT to PDF", icon: "fa-file-powerpoint", class: "gradient-crimson", desc: "Convert PowerPoint presentations (.pptx) to PDF.", limits: "Supports multiple .ppt, .pptx files" },
  'jpg-to-pdf': { title: "JPG to PDF", icon: "fa-regular fa-image", class: "gradient-pink", desc: "Convert images to high quality PDFs.", limits: "Supports multiple .jpg, .jpeg, .png files" },
  'html-to-pdf': { title: "HTML to PDF", icon: "fa-code", class: "gradient-indigo", desc: "Generate a PDF directly from HTML code or custom text.", limits: "No upload required. Write custom text." },
  
  // 5. Security & Optimization
  compress: { title: "Compress PDF", icon: "fa-minimize", class: "gradient-green", desc: "Reduce file size while keeping visual quality.", limits: "Supports multiple .pdf files" },
  protect: { title: "Protect PDF", icon: "fa-lock", class: "gradient-crimson", desc: "Encrypt PDF files with a secure password.", limits: "Supports multiple .pdf files" },
  unlock: { title: "Unlock PDF", icon: "fa-lock-open", class: "gradient-amber", desc: "Remove passwords and restrictions from PDFs.", limits: "Supports multiple .pdf files" },
  'edit-metadata': { title: "PDF Metadata", icon: "fa-tags", class: "gradient-slate", desc: "Edit or remove Author, Title, and other hidden metadata.", limits: "Supports multiple .pdf files" },
  
  // 6. Layout & Print
  'pages-per-sheet': { title: "Pages Per Sheet", icon: "fa-table-cells", class: "gradient-slate", desc: "Fit multiple pages onto a single sheet for compact printing.", limits: "Supports multiple .pdf files" },
  'crop-pdf': { title: "Crop PDF", icon: "fa-crop", class: "gradient-purple", desc: "Crop the margins or visible area of your PDF pages.", limits: "Supports multiple .pdf files" },
  'change-page-size': { title: "Change Page Size", icon: "fa-expand", class: "gradient-rose", desc: "Resize all pages to a standard size like A4 or Letter.", limits: "Supports multiple .pdf files" },
  
  // 7. Intelligence
  'ai-summarizer': { title: "AI Summarizer", icon: "fa-robot", class: "gradient-azure", desc: "Summarize lengthy PDF contents using local or API-driven AI.", limits: "Supports multiple .pdf files" },
  translate: { title: "Translate PDF", icon: "fa-language", class: "gradient-emerald", desc: "Translate document text to another language dynamically.", limits: "Supports multiple .pdf files" }
};

// Init application
document.addEventListener('DOMContentLoaded', () => {
  initRouting();
  initDragAndDrop();
  initSettings();
  initTheme();
  initStats();
  sigPad.initSignaturePad();
});

/* Routing & Tabs */
function initRouting() {
  // Navigation links in sidebar
  elements.sidebarNav.addEventListener('click', (e) => {
    const navLink = e.target.closest('.nav-item');
    if (!navLink) return;
    
    e.preventDefault();
    const tabName = navLink.getAttribute('data-tab');
    switchTab(tabName);
  });

  // Tool cards in dashboard
  document.querySelectorAll('.tool-card').forEach(card => {
    card.addEventListener('click', () => {
      const target = card.getAttribute('data-target');
      switchTab(target);
    });
  });

  // Back button
  elements.btnBackDashboard.addEventListener('click', () => {
    switchTab('dashboard');
  });

  // Search filter
  elements.searchTools.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    if (activeTab !== 'dashboard') {
      switchTab('dashboard');
    }
    
    document.querySelectorAll('.tool-card').forEach(card => {
      const title = card.querySelector('h4').textContent.toLowerCase();
      const desc = card.querySelector('p').textContent.toLowerCase();
      if (title.includes(val) || desc.includes(val)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

function switchTab(tabName) {
  // Remove active sidebar state
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-tab') === tabName) {
      item.classList.add('active');
    }
  });

  activeTab = tabName;

  // Clear workspace items
  clearFiles();
  hideResultPanel();
  resetProgress();

  if (tabName === 'dashboard') {
    views.dashboard.classList.add('active');
    views.workspace.classList.remove('active');
    window.location.hash = '';
  } else {
    views.dashboard.classList.remove('active');
    views.workspace.classList.add('active');
    window.location.hash = tabName;
    
    // Setup specific tool header details
    const tool = tools[tabName];
    if (tool) {
      elements.workspaceTitle.textContent = tool.title;
      elements.workspaceDesc.textContent = tool.desc;
      elements.workspaceIcon.className = `workspace-tool-icon ${tool.class}`;
      elements.workspaceIcon.innerHTML = `<i class="fa-solid ${tool.icon}"></i>`;
      elements.dropzoneLimits.textContent = tool.limits;
      
      // Inject configuration options template
      const template = document.getElementById(`tpl-${tabName}`);
      if (template) {
        elements.toolConfigs.innerHTML = template.innerHTML;
      } else {
        elements.toolConfigs.innerHTML = '<p class="info-block">No configuration options required for this tool.</p>';
      }

      // Hide or show dropzone based on HTML to PDF
      if (tabName === 'html-to-pdf') {
        elements.dropzone.style.display = 'none';
        elements.btnProcess.removeAttribute('disabled');
      } else {
        elements.dropzone.style.display = 'block';
        validateProcessButton();
      }
      
      // Wire contextual handlers immediately after template injection
      setupConfigHandlers();
    }
  }
}

function setupConfigHandlers() {
  if (activeTab === 'sign') {
    const openPadBtn = document.getElementById('btn-open-sign-pad');
    if (openPadBtn) {
      openPadBtn.addEventListener('click', () => {
        elements.signModal.style.display = 'flex';
      });
    }
  } else if (activeTab === 'rotate') {
    const rotateRightBtn = document.getElementById('btn-rotate-all-right');
    const rotateLeftBtn = document.getElementById('btn-rotate-all-left');
    
    if (rotateRightBtn) {
      rotateRightBtn.addEventListener('click', () => {
        pagesState.forEach(p => {
          p.rotation = (p.rotation + 90) % 360;
          const canvas = document.getElementById(`page-canvas-${p.originalIndex}`);
          if (canvas) canvas.style.transform = `rotate(${p.rotation}deg)`;
        });
      });
    }
    if (rotateLeftBtn) {
      rotateLeftBtn.addEventListener('click', () => {
        pagesState.forEach(p => {
          p.rotation = (p.rotation - 90 + 360) % 360;
          const canvas = document.getElementById(`page-canvas-${p.originalIndex}`);
          if (canvas) canvas.style.transform = `rotate(${p.rotation}deg)`;
        });
      });
    }
  } else if (activeTab === 'remove') {
    const removeBtn = document.getElementById('btn-remove-selected');
    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        // Find all cards with 'selected' class and trigger their delete buttons
        document.querySelectorAll('.page-card.selected').forEach(card => {
          const originalIndex = parseInt(card.getAttribute('data-original-index'), 10);
          card.remove();
          pagesState = pagesState.filter(p => p.originalIndex !== originalIndex);
        });
        if (pagesState.length === 0) elements.btnProcess.setAttribute('disabled', 'true');
      });
    }
  } else if (activeTab === 'extract') {
    const extractBtn = document.getElementById('btn-extract-selected');
    if (extractBtn) {
      extractBtn.addEventListener('click', () => {
        // For extraction, we only WANT the selected pages.
        // So we delete all the UNSELECTED cards from the UI so only selected ones remain for processing.
        let hasSelection = false;
        document.querySelectorAll('.page-card').forEach(card => {
          if (card.classList.contains('selected')) {
             hasSelection = true;
          }
        });
        
        if (!hasSelection) {
           alert("Please click on the pages you want to extract to select them first.");
           return;
        }

        document.querySelectorAll('.page-card:not(.selected)').forEach(card => {
          const originalIndex = parseInt(card.getAttribute('data-original-index'), 10);
          card.remove();
          pagesState = pagesState.filter(p => p.originalIndex !== originalIndex);
        });
      });
    }
  }
}

/* Theme Management */
function initTheme() {
  const currentTheme = localStorage.getItem('app-theme') || 'dark';
  if (currentTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    elements.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }

  elements.themeToggle.addEventListener('click', () => {
    if (document.body.classList.contains('dark-theme')) {
      document.body.classList.remove('dark-theme');
      document.body.classList.add('light-theme');
      elements.themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      localStorage.setItem('app-theme', 'light');
    } else {
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      elements.themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
      localStorage.setItem('app-theme', 'dark');
    }
  });
}

/* Stats Management */
function initStats() {
  let count = parseInt(localStorage.getItem('stats-processed') || '0', 10);
  elements.statFilesProcessed.textContent = count;
}
function incrementStats() {
  let count = parseInt(localStorage.getItem('stats-processed') || '0', 10) + 1;
  localStorage.setItem('stats-processed', count);
  elements.statFilesProcessed.textContent = count;
}

/* Drag & Drop File Uploads */
function initDragAndDrop() {
  elements.dropzone.addEventListener('click', () => {
    // Only set fileInput accepts according to tab
    if (activeTab === 'jpg-to-pdf') {
      elements.fileInput.accept = 'image/png, image/jpeg, image/jpg';
    } else {
      elements.fileInput.accept = '.pdf';
    }
    elements.fileInput.click();
  });

  elements.fileInput.addEventListener('change', (e) => {
    handleSelectedFiles(e.target.files);
  });

  // Dropzone drag over styles
  elements.dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropzone.classList.add('dragover');
  });

  elements.dropzone.addEventListener('dragleave', () => {
    elements.dropzone.classList.remove('dragover');
  });

  elements.dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropzone.classList.remove('dragover');
    handleSelectedFiles(e.dataTransfer.files);
  });

  // Clear files button
  elements.btnClearFiles.addEventListener('click', clearFiles);

  // Bind Process action
  elements.btnProcess.addEventListener('click', processActiveTool);

  // Bind Download action
  elements.btnDownload.addEventListener('click', downloadResult);
}

function handleSelectedFiles(filesList) {
  if (filesList.length === 0) return;

  const validFiles = Array.from(filesList).filter(file => {
    if (activeTab === 'jpg-to-pdf') {
      return file.type.startsWith('image/');
    } else {
      if (activeTab === 'ppt-to-pdf') { return file.name.toLowerCase().endsWith('.ppt') || file.name.toLowerCase().endsWith('.pptx') || file.type.includes('presentation'); } return file.name.endsWith('.pdf') || file.type === 'application/pdf';
    }
  });

  if (validFiles.length === 0) {
    alert(activeTab === 'jpg-to-pdf' ? "Please select valid image files." : (activeTab === 'ppt-to-pdf' ? "Please select valid PowerPoint presentations." : "Please select valid PDF documents."));
    return;
  }

  // Handle constraints (merge and jpg-to-pdf allow multiple files; others require exactly 1)
  const isMultiple = activeTab === 'merge' || activeTab === 'jpg-to-pdf';
  if (isMultiple) {
    uploadedFiles = [...uploadedFiles, ...validFiles];
  } else {
    uploadedFiles = [validFiles[0]];
  }

  updateFilesListUI();
  validateProcessButton();
  hideResultPanel();

  const visualTools = ['organize', 'rotate', 'remove', 'extract', 'sign', 'edit'];
  if (visualTools.includes(activeTab)) {
    elements.btnProcess.disabled = true;
  } else {
    elements.btnProcess.disabled = false;
  }
  
  // Auto-trigger visual layouts if file exists
  if (['organize', 'rotate', 'remove', 'extract'].includes(activeTab) && uploadedFiles.length > 0) {
    renderOrganizeWorkspace(uploadedFiles[0]);
  } else if (activeTab === 'sign' && uploadedFiles.length > 0) {
    renderSignWorkspace(uploadedFiles[0]);
  } else if (activeTab === 'edit' && uploadedFiles.length > 0) {
    renderEditWorkspace(uploadedFiles[0]);
  }
}

function updateFilesListUI() {
  elements.filesList.innerHTML = '';
  
  if (uploadedFiles.length === 0) {
    elements.filesListContainer.style.display = 'none';
    return;
  }

  elements.filesListContainer.style.display = 'block';
  elements.filesCount.textContent = uploadedFiles.length;

  uploadedFiles.forEach((file, index) => {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    
    const sizeStr = formatBytes(file.size);
    const iconClass = file.type.startsWith('image/') ? 'fa-regular fa-image' : 'fa-solid fa-file-pdf';
    const iconColor = file.type.startsWith('image/') ? '#ec4899' : '#ef4444';

    fileItem.innerHTML = `
      <div class="file-item-left">
        <div class="file-item-icon" style="color: ${iconColor}"><i class="${iconClass}"></i></div>
        <div class="file-item-info">
          <span class="file-name" title="${file.name}">${file.name}</span>
          <span class="file-size">${sizeStr}</span>
        </div>
      </div>
      <button class="btn-remove-file" data-index="${index}"><i class="fa-regular fa-trash-can"></i></button>
    `;
    
    // Remove individual file trigger
    fileItem.querySelector('.btn-remove-file').addEventListener('click', (e) => {
      const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
      uploadedFiles.splice(idx, 1);
      updateFilesListUI();
      validateProcessButton();
      hideResultPanel();
      
      if (activeTab === 'organize' || activeTab === 'sign') {
        if (uploadedFiles.length > 0) {
          if (activeTab === 'organize') renderOrganizeWorkspace(uploadedFiles[0]);
          if (activeTab === 'sign') renderSignWorkspace(uploadedFiles[0]);
        } else {
          elements.interactiveWorkspace.style.display = 'none';
        }
      }
    });

    elements.filesList.appendChild(fileItem);
  });
}

function clearFiles() {
  uploadedFiles = [];
  elements.fileInput.value = '';
  updateFilesListUI();
  validateProcessButton();
  hideResultPanel();
  elements.interactiveWorkspace.style.display = 'none';
  elements.pagesGrid.innerHTML = '';
  pagesState = [];
  activeSignatureDataUrl = null;
  signaturePlacement = null;
}

function validateProcessButton() {
  if (activeTab === 'html-to-pdf') {
    elements.btnProcess.removeAttribute('disabled');
    return;
  }

  const fileCount = uploadedFiles.length;
  let isValid = false;

  if (activeTab === 'merge') {
    isValid = fileCount >= 2;
  } else if (activeTab === 'jpg-to-pdf') {
    isValid = fileCount >= 1;
  } else {
    isValid = fileCount >= 1;
  }

  if (isValid) {
    elements.btnProcess.removeAttribute('disabled');
  } else {
    elements.btnProcess.setAttribute('disabled', 'true');
  }
}

/* Stats utility formatter */
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/* Visual Editor - Organize PDF */
async function renderOrganizeWorkspace(file) {
  elements.interactiveWorkspace.style.display = 'block';
  elements.pagesGrid.innerHTML = '<div class="info-block italic text-center w-100">Rendering pages...</div>';
  elements.visualActions.innerHTML = '';

  try {
    
  let pdfData;
  if (uploadedFiles.length > 1) {
    updateProgress(10, 'Merging selected files for visual editing...');
    showProgress("Merging Files");
    const mergedBytes = await pdfTools.mergePdfs(uploadedFiles);
    pdfData = new Uint8Array(mergedBytes);
    resetProgress();
  } else {
    const arrayBuffer = await file.arrayBuffer();
    pdfData = new Uint8Array(arrayBuffer);
  }

    
    const pdfjsLib = window.pdfjsLib;
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    elements.pagesGrid.innerHTML = '';
    pagesState = [];

    // Inject quick visual actions
    elements.visualActions.innerHTML = `
      <button id="btn-visual-rotate-all" class="btn-secondary btn-sm"><i class="fa-solid fa-rotate-right"></i> Rotate All</button>
      <button id="btn-visual-reset" class="btn-secondary btn-sm"><i class="fa-solid fa-arrow-rotate-left"></i> Reset Layout</button>
    `;

    document.getElementById('btn-visual-rotate-all').addEventListener('click', () => {
      pagesState.forEach(p => {
        p.rotation = (p.rotation + 90) % 360;
        const canvas = document.getElementById(`page-canvas-${p.originalIndex}`);
        if (canvas) canvas.style.transform = `rotate(${p.rotation}deg)`;
      });
    });

    document.getElementById('btn-visual-reset').addEventListener('click', () => {
      renderOrganizeWorkspace(file);
    });

    for (let i = 1; i <= numPages; i++) {
      const originalIndex = i - 1;
      pagesState.push({ originalIndex, rotation: 0 });

      const page = await pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 0.3 }); // Small thumbnails

      const card = document.createElement('div');
      card.className = 'page-card';
      card.setAttribute('data-original-index', originalIndex);
      
      const canvasContainer = document.createElement('div');
      canvasContainer.className = 'page-card-canvas-container';
      
      const canvas = document.createElement('canvas');
      canvas.id = `page-canvas-${originalIndex}`;
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      canvasContainer.appendChild(canvas);
      card.appendChild(canvasContainer);

      const pageLabel = document.createElement('span');
      pageLabel.className = 'page-card-num';
      pageLabel.textContent = `Page ${i}`;
      card.appendChild(pageLabel);

      // Card selection logic
      card.addEventListener('click', () => {
        card.classList.toggle('selected');
        const info = pagesState.find(p => p.originalIndex === originalIndex);
        if (info) info.selected = !info.selected;
      });

      // Actions overlay
      const actions = document.createElement('div');
      actions.className = 'page-card-actions';

      const rotateBtn = document.createElement('button');
      rotateBtn.className = 'btn-page-action';
      rotateBtn.innerHTML = '<i class="fa-solid fa-rotate-right"></i>';
      rotateBtn.title = "Rotate 90° Clockwise";
      rotateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const info = pagesState.find(p => p.originalIndex === originalIndex);
        info.rotation = (info.rotation + 90) % 360;
        canvas.style.transform = `rotate(${info.rotation}deg)`;
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-page-action delete';
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash-can"></i>';
      deleteBtn.title = "Delete Page";
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        card.remove();
        pagesState = pagesState.filter(p => p.originalIndex !== originalIndex);
        if (pagesState.length === 0) {
          elements.btnProcess.setAttribute('disabled', 'true');
        }
      });

      // Simple navigation buttons to move pages left/right in vanilla JS
      const leftBtn = document.createElement('button');
      leftBtn.className = 'btn-page-action';
      leftBtn.innerHTML = '<i class="fa-solid fa-arrow-left"></i>';
      leftBtn.title = "Move Page Left";
      leftBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const prev = card.previousElementSibling;
        if (prev) {
          card.parentNode.insertBefore(card, prev);
          reorderPageState();
        }
      });

      const rightBtn = document.createElement('button');
      rightBtn.className = 'btn-page-action';
      rightBtn.innerHTML = '<i class="fa-solid fa-arrow-right"></i>';
      rightBtn.title = "Move Page Right";
      rightBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const next = card.nextElementSibling;
        if (next) {
          card.parentNode.insertBefore(next, card);
          reorderPageState();
        }
      });

      actions.appendChild(leftBtn);
      actions.appendChild(rightBtn);
      actions.appendChild(rotateBtn);
      actions.appendChild(deleteBtn);
      card.appendChild(actions);

      elements.pagesGrid.appendChild(card);
      await page.render({ canvasContext: context, viewport: viewport }).promise;
    }
    
    // Enable the process button once rendering is complete
    elements.btnProcess.removeAttribute('disabled');
  } catch (error) {
    console.error("Rendering pages failed", error);
    elements.pagesGrid.innerHTML = `<div class="info-block text-center w-100" style="color:var(--danger)">Failed to render PDF pages: ${error.message}</div>`;
  }
}

function reorderPageState() {
  const newOrder = [];
  elements.pagesGrid.querySelectorAll('.page-card').forEach(card => {
    const originalIndex = parseInt(card.getAttribute('data-original-index'), 10);
    const existing = pagesState.find(p => p.originalIndex === originalIndex);
    if (existing) newOrder.push(existing);
  });
  pagesState = newOrder;
}

/* Visual Editor - Sign PDF */
async function renderSignWorkspace(file) {
  elements.interactiveWorkspace.style.display = 'block';
  elements.pagesGrid.innerHTML = '';
  elements.visualActions.innerHTML = '';

  try {
    
  let pdfData;
  if (uploadedFiles.length > 1) {
    updateProgress(10, 'Merging selected files for visual editing...');
    showProgress("Merging Files");
    const mergedBytes = await pdfTools.mergePdfs(uploadedFiles);
    pdfData = new Uint8Array(mergedBytes);
    resetProgress();
  } else {
    const arrayBuffer = await file.arrayBuffer();
    pdfData = new Uint8Array(arrayBuffer);
  }

    
    const pdfjsLib = window.pdfjsLib;
    const loadingTask = pdfjsLib.getDocument({ data: pdfData });
    const pdfDoc = await loadingTask.promise;
    const numPages = pdfDoc.numPages;

    // We will display a page selector and a single high-resolution placement canvas
    elements.visualActions.innerHTML = `
      <label for="sign-page-select" style="font-size:12px; font-weight:600;">Select Page to Sign:</label>
      <select id="sign-page-select" class="form-select" style="width:120px; padding: 4px 8px; font-size:12px;"></select>
    `;

    const selector = document.getElementById('sign-page-select');
    for (let i = 1; i <= numPages; i++) {
      const opt = document.createElement('option');
      opt.value = i - 1;
      opt.textContent = `Page ${i}`;
      selector.appendChild(opt);
    }

    const viewer = document.createElement('div');
    viewer.className = 'pdf-placement-viewer';
    viewer.innerHTML = `
      <p class="config-desc">Design your signature in the Configuration panel first, then drag it to your desired spot below.</p>
      <div class="placement-canvas-container" id="placement-container">
        <canvas id="pdf-sign-canvas"></canvas>
      </div>
    `;
    elements.pagesGrid.appendChild(viewer);

    const loadActivePageToSign = async (pageIdx) => {
      const page = await pdfDoc.getPage(pageIdx + 1);
      const viewport = page.getViewport({ scale: 1.0 }); // Fit sizes
      
      const canvas = document.getElementById('pdf-sign-canvas');
      const context = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Update signature placement metadata dimensions
      signaturePlacement = {
        pdfWidth: page.getViewport({ scale: 1.0 }).width,
        pdfHeight: page.getViewport({ scale: 1.0 }).height,
        canvasWidth: viewport.width,
        canvasHeight: viewport.height,
        pageIndex: pageIdx
      };

      // If a signature is already designed, bind it to draggable overlay
      if (activeSignatureDataUrl) {
        bindDraggableSignature();
      }
    };

    selector.addEventListener('change', (e) => {
      loadActivePageToSign(parseInt(e.target.value, 10));
    });

    // Load page 1 initially
    await loadActivePageToSign(0);

    // Setup signature modal events
    elements.btnCloseSignModal.addEventListener('click', closeSignatureModal);
    elements.btnCancelSignature.addEventListener('click', closeSignatureModal);
    elements.btnUseSignature.addEventListener('click', confirmSignatureStamp);

    // Enable process button
    elements.btnProcess.removeAttribute('disabled');
  } catch (error) {
    console.error("Rendering sign page failed", error);
  }
}

function closeSignatureModal() {
  elements.signModal.style.display = 'none';
}

function confirmSignatureStamp() {
  const dataUrl = sigPad.getSignatureImage();
  if (!dataUrl) {
    alert("Please type or draw a signature first.");
    return;
  }

  activeSignatureDataUrl = dataUrl;
  closeSignatureModal();

  // Draw status indicator
  const stampStatus = document.getElementById('signature-stamp-status');
  if (stampStatus) {
    stampStatus.innerHTML = `<img src="${dataUrl}" style="max-height: 45px; vertical-align: middle; border: 1px solid var(--border-color); border-radius:4px; background:#fff; margin-right:8px;"/> Signature created. Place it on the document.`;
  }

  bindDraggableSignature();
}

function bindDraggableSignature() {
  const container = document.getElementById('placement-container');
  if (!container || !activeSignatureDataUrl || !signaturePlacement) return;

  sigPad.setupDraggableSignature(
    container,
    activeSignatureDataUrl,
    signaturePlacement.canvasWidth,
    signaturePlacement.canvasHeight,
    (res) => {
      if (res === null) {
        // Signature deleted
        activeSignatureDataUrl = null;
        const stampStatus = document.getElementById('signature-stamp-status');
        if (stampStatus) stampStatus.innerHTML = "No signatures created yet.";
      }
    }
  );
}

/* Settings and API Keys */
function initSettings() {
  elements.btnSettings.addEventListener('click', () => {
    // Fill values
    document.getElementById('gemini-api-key').value = localStorage.getItem('gemini-key') || '';
    document.getElementById('openai-api-key').value = localStorage.getItem('openai-key') || '';
    document.getElementById('prefer-gemini').checked = localStorage.getItem('prefer-gemini') !== 'false';
    elements.settingsModal.style.display = 'flex';
  });

  elements.btnCloseSettings.addEventListener('click', () => {
    elements.settingsModal.style.display = 'none';
  });

  elements.btnSaveSettings.addEventListener('click', () => {
    const geminiKey = document.getElementById('gemini-api-key').value.trim();
    const openaiKey = document.getElementById('openai-api-key').value.trim();
    const preferGemini = document.getElementById('prefer-gemini').checked;

    localStorage.setItem('gemini-key', geminiKey);
    localStorage.setItem('openai-key', openaiKey);
    localStorage.setItem('prefer-gemini', preferGemini ? 'true' : 'false');

    elements.settingsModal.style.display = 'none';
    alert("Settings saved successfully.");
  });

  elements.btnClearSettings.addEventListener('click', () => {
    document.getElementById('gemini-api-key').value = '';
    document.getElementById('openai-api-key').value = '';
    document.getElementById('prefer-gemini').checked = true;
  });
}

/* Progress indicator handlers */
function showProgress(text) {
  elements.processProgress.style.display = 'block';
  elements.progressFill.style.width = '0%';
  elements.progressText.textContent = `${text}... 0%`;
  elements.btnProcess.setAttribute('disabled', 'true');
}

function updateProgress(percent, text) {
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = `${text}... ${percent}%`;
}

function resetProgress() {
  elements.processProgress.style.display = 'none';
  elements.progressFill.style.width = '0%';
  elements.btnProcess.removeAttribute('disabled');
}

/* Result panel handlers */

function showResultPanel(filename, bytesCount, savingsPercent = null) {
  if (uploadedFiles.length > 1 && !['merge', 'jpg-to-pdf'].includes(activeTab) && !['organize', 'rotate', 'remove', 'extract', 'edit', 'sign'].includes(activeTab) && filename !== `Batch_Processed_${uploadedFiles.length}_Files.zip`) {
    // In batch mode, skip showing individual results
    return;
  }

  elements.resultPanel.style.display = 'block';
  elements.resultFilename.textContent = filename;
  elements.resultFilesize.textContent = formatBytes(bytesCount);

  if (savingsPercent !== null && savingsPercent > 0) {
    elements.resultSavingsRow.style.display = 'flex';
    elements.resultSavings.textContent = `${savingsPercent.toFixed(1)}%`;
  } else {
    elements.resultSavingsRow.style.display = 'none';
  }
  
  // Scroll to results panel
  elements.resultPanel.scrollIntoView({ behavior: 'smooth' });
}

function hideResultPanel() {
  elements.resultPanel.style.display = 'none';
  processedFileBytes = null;
  processedFileName = '';
}

/* Download handler */
function downloadResult() {
  if (!processedFileBytes) return;

  const blob = new Blob([processedFileBytes], { type: processedFileType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = processedFileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}


/* Core execution logic */
async function processActiveTool() {
  hideResultPanel();
  
  if (uploadedFiles.length === 0 && activeTab !== 'html-to-pdf') {
    alert("Please select files first.");
    return;
  }

  showProgress("Processing");

  try {
    const isVisualTool = ['organize', 'rotate', 'remove', 'extract', 'edit', 'sign'].includes(activeTab);
    const isBatchSupport = uploadedFiles.length > 1 && !isVisualTool && activeTab !== 'html-to-pdf' && activeTab !== 'merge' && activeTab !== 'jpg-to-pdf';

    if (isBatchSupport) {
      updateProgress(5, "Initializing Batch Process");
      const zip = new window.JSZip();
      let allSuccess = true;
      let total = uploadedFiles.length;

      for (let i = 0; i < total; i++) {
        currentFileToProcess = uploadedFiles[i];
        updateProgress(10 + Math.floor((i / total) * 80), `Processing file ${i+1} of ${total} (${currentFileToProcess.name})`);
        
        try {
          await executeToolAction();
          // After execution, processedFileBytes and processedFileName are set
          if (processedFileBytes && processedFileName) {
            zip.file(processedFileName, processedFileBytes);
          }
        } catch (e) {
          console.error(`Failed on ${currentFileToProcess.name}:`, e);
          allSuccess = false;
        }
      }

      if (!allSuccess) alert("Some files failed to process. Check console for details.");
      
      updateProgress(95, "Zipping all results...");
      const zipBytes = await zip.generateAsync({ type: 'uint8array' });
      processedFileBytes = zipBytes;
      processedFileName = `Batch_Processed_${total}_Files.zip`;
      processedFileType = 'application/zip';
      
      updateProgress(100, "Finished Batch Processing");
      showResultPanel(processedFileName, zipBytes.length);

    } else {
      // Single file or tools that inherently handle multiple files (merge, jpg-to-pdf, etc.)
      currentFileToProcess = uploadedFiles[0];
      await executeToolAction();
    }
    
    incrementStats();
  } catch (error) {
    console.error("Processing failed", error);
    alert(`An error occurred: ${error.message}`);
  } finally {
    resetProgress();
    validateProcessButton();
    currentFileToProcess = null;
  }
}

async function executeToolAction() {
  switch (activeTab) {
    case 'merge': await runMerge(); break;
    case 'split': await runSplit(); break;
    case 'organize': await runOrganize(); break;
    case 'rotate': await runRotate(); break;
    case 'remove': await runRemove(); break;
    case 'extract': await runExtract(); break;
    case 'extract-images': await runExtractImages(); break;
    case 'compress': await runCompress(); break;
    case 'ocr': await runOcr(); break;
    case 'jpg-to-pdf': await runJpgToPdf(); break;
    case 'ppt-to-pdf': await runPptToPdf(); break;
    case 'pdf-to-jpg': await runPdfToJpg(); break;
    case 'pdf-to-text': await runPdfToText(); break;
    case 'html-to-pdf': await runHtmlToPdf(); break;
    case 'watermark': await runWatermark(); break;
    case 'page-numbers': await runPageNumbers(); break;
    case 'sign': await runSign(); break;
    case 'protect': await runProtect(); break;
    case 'unlock': await runUnlock(); break;
    case 'ai-summarizer': await runAiSummarizer(); break;
    case 'translate': await runTranslate(); break;
    case 'pages-per-sheet': await runPagesPerSheet(); break;
    case 'edit': await runEdit(); break;
    case 'flatten-pdf': await runFlattenPdf(); break;
    case 'edit-metadata': await runEditMetadata(); break;
    case 'crop-pdf': await runCropPdf(); break;
    case 'change-page-size': await runChangePageSize(); break;
    default: throw new Error("Unknown tool action triggered.");
  }
}


/* Action: Merge */
async function runMerge() {
  updateProgress(20, "Reading files");
  const bytes = await pdfTools.mergePdfs(uploadedFiles);
  updateProgress(80, "Optimizing");
  
  processedFileBytes = bytes;
  processedFileName = `${uploadedFiles[0].name.replace(/\.[^/.]+$/, "")}_merged.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Split */
async function runSplit() {
  updateProgress(20, "Analyzing page indexes");
  const file = currentFileToProcess || uploadedFiles[0];
  const mode = document.getElementById('split-mode').value;
  const rangesText = document.getElementById('split-ranges') ? document.getElementById('split-ranges').value : '';
  
  const results = await pdfTools.splitPdf(file, mode, rangesText);
  
  if (results.length === 1) {
    processedFileBytes = results[0].bytes;
    processedFileName = results[0].filename;
    processedFileType = 'application/pdf';
    showResultPanel(processedFileName, processedFileBytes.length);
  } else if (results.length > 1) {
    // Generate ZIP file using JSZip
    updateProgress(60, "Generating ZIP package");
    const zip = new window.JSZip();
    results.forEach(res => {
      zip.file(res.filename, res.bytes);
    });
    
    const zipBytes = await zip.generateAsync({ type: 'uint8array' });
    processedFileBytes = zipBytes;
    processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_split_pages.zip`;
    processedFileType = 'application/zip';
    showResultPanel(processedFileName, zipBytes.length);
  }
  
  updateProgress(100, "Finished");
}

/* Action: Organize */
async function runOrganize() {
  if (pagesState.length === 0) {
    throw new Error("Please upload a file and retain at least one page.");
  }
  updateProgress(30, "Compiling pages layout");
  const file = currentFileToProcess || uploadedFiles[0];
  const bytes = await pdfTools.organizePdf(file, pagesState);
  updateProgress(80, "Writing PDF headers");
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_organized.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Compress */
async function runCompress() {
  updateProgress(10, "Evaluating PDF structure");
  const file = currentFileToProcess || uploadedFiles[0];
  const level = document.querySelector('input[name="compress-level"]:checked').value;
  
  const bytes = await pdfTools.compressPdf(file, level, (current, total) => {
    const percent = Math.floor((current / total) * 70) + 15;
    updateProgress(percent, `Rendering page ${current} of ${total}`);
  });
  
  updateProgress(90, "Re-encoding document objects");
  
  // Calculate savings
  const originalSize = file.size;
  const newSize = bytes.length;
  const savings = Math.max(0, ((originalSize - newSize) / originalSize) * 100);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_compressed.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length, savings);
}

/* Action: OCR */
async function runOcr() {
  const file = currentFileToProcess || uploadedFiles[0];
  const lang = document.getElementById('ocr-lang').value;
  
  const ocrText = await pdfTools.ocrPdf(file, lang, (current, total, phase) => {
    const base = phase === 'extracting' ? 0 : 45;
    const factor = phase === 'extracting' ? 40 : 45;
    const percent = Math.floor((current / total) * factor) + base + 5;
    const desc = phase === 'extracting' ? `Extracting page ${current}/${total}` : `Performing OCR on page ${current}/${total}`;
    updateProgress(percent, desc);
  });
  
  updateProgress(95, "Compiling text summary file");
  
  // Convert text string to bytes for download
  const enc = new TextEncoder();
  processedFileBytes = enc.encode(ocrText);
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_ocr.txt`;
  processedFileType = 'text/plain';
  
  updateProgress(100, "OCR Done");
  showResultPanel(processedFileName, processedFileBytes.length);
  
  // Display text preview inside Workspace
  const preview = document.getElementById('ai-text-preview');
  const previewBox = document.getElementById('ai-summary-result-box');
  if (preview) {
    preview.value = ocrText;
  }
}

/* Action: JPG to PDF */
async function runJpgToPdf() {
  updateProgress(20, "Analyzing images data");
  const orientation = document.getElementById('jpg-page-orientation').value;
  const margin = document.getElementById('jpg-page-margin').value;
  
  const bytes = await pdfTools.jpgToPdf(uploadedFiles, orientation, margin);
  
  processedFileBytes = bytes;
  processedFileName = `images_converted.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}


/* Action: PPT to PDF */
async function runPptToPdf() {
  const file = currentFileToProcess || uploadedFiles[0];
  const bytes = await pdfTools.pptxToPdf(file, (curr, total, phase) => {
    updateProgress((curr / total) * 100, `Converting PPT to PDF...`);
  });
  processedFileBytes = bytes;
  processedFileName = file.name.replace(/\.[^/.]+$/, "") + '_converted.pdf';
  processedFileType = 'application/pdf';
  updateProgress(100, "Finished");
  if (uploadedFiles.length <= 1) showResultPanel(processedFileName, bytes.length);
}

/* Action: PDF to JPG */
async function runPdfToJpg() {
  const file = currentFileToProcess || uploadedFiles[0];
  const scale = document.getElementById('jpg-quality').value;
  
  const images = await pdfTools.pdfToJpg(file, scale, (current, total) => {
    const percent = Math.floor((current / total) * 70) + 15;
    updateProgress(percent, `Rendering page ${current} of ${total}`);
  });
  
  updateProgress(85, "Creating ZIP archive");
  const zip = new window.JSZip();
  
  for (const img of images) {
    const response = await fetch(img.dataUrl);
    const imgBytes = await response.arrayBuffer();
    zip.file(img.name, imgBytes);
  }
  
  const zipBytes = await zip.generateAsync({ type: 'uint8array' });
  
  processedFileBytes = zipBytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_images.zip`;
  processedFileType = 'application/zip';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, zipBytes.length);
}

/* Action: PDF to Text */
async function runPdfToText() {
  const file = currentFileToProcess || uploadedFiles[0];
  const includePageNum = document.getElementById('txt-include-pagenums').checked;
  
  const text = await pdfTools.pdfToText(file, includePageNum, (current, total) => {
    const percent = Math.floor((current / total) * 80) + 10;
    updateProgress(percent, `Parsing page ${current} of ${total}`);
  });
  
  const enc = new TextEncoder();
  processedFileBytes = enc.encode(text);
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_extracted.txt`;
  processedFileType = 'text/plain';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, processedFileBytes.length);
}

/* Action: HTML to PDF */
async function runHtmlToPdf() {
  updateProgress(30, "Parsing HTML tags");
  const text = document.getElementById('html-source-input').value.trim();
  if (!text) {
    throw new Error("Please enter text or HTML source code first.");
  }
  const pageSize = document.getElementById('html-page-size').value;
  
  const bytes = await pdfTools.htmlToPdf(text, pageSize);
  
  processedFileBytes = bytes;
  processedFileName = `custom_document.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Watermark */
async function runWatermark() {
  updateProgress(20, "Applying fonts");
  const file = currentFileToProcess || uploadedFiles[0];
  const text = document.getElementById('wm-text').value.trim();
  if (!text) throw new Error("Watermark text cannot be empty.");
  const color = document.getElementById('wm-color').value;
  const opacity = document.getElementById('wm-opacity').value;
  const rotation = document.getElementById('wm-rotation').value;
  const layout = document.getElementById('wm-layout').value;
  
  const bytes = await pdfTools.addWatermark(file, text, color, opacity, rotation, layout);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_watermarked.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Page Numbers */
async function runPageNumbers() {
  updateProgress(20, "Creating formatting layout");
  const file = currentFileToProcess || uploadedFiles[0];
  const format = document.getElementById('pn-format').value;
  const position = document.getElementById('pn-position').value;
  const startPage = document.getElementById('pn-start').value;
  const fontSize = document.getElementById('pn-font-size').value;
  
  const bytes = await pdfTools.addPageNumbers(file, format, position, startPage, fontSize);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_numbered.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Sign */
async function runSign() {
  if (!activeSignatureDataUrl || !signaturePlacement) {
    throw new Error("Please design a signature and place it on the document first.");
  }
  
  updateProgress(30, "Resolving position vectors");
  const file = currentFileToProcess || uploadedFiles[0];
  const arrayBuffer = await file.arrayBuffer();
  
  const { PDFDocument } = window.PDFLib;
  const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
  
  // Translate signature location
  const page = pdfDoc.getPages()[signaturePlacement.pageIndex];
  const { width: pdfPageWidth, height: pdfPageHeight } = page.getSize();
  
  const coords = sigPad.getPdfCoordinates(
    pdfPageWidth,
    pdfPageHeight,
    signaturePlacement.canvasWidth,
    signaturePlacement.canvasHeight
  );

  updateProgress(65, "Embedding signature stamp");
  // Fetch stamp bytes
  const response = await fetch(activeSignatureDataUrl);
  const signatureBytes = await response.arrayBuffer();
  
  const embeddedImage = await pdfDoc.embedPng(signatureBytes);
  
  page.drawImage(embeddedImage, {
    x: coords.x,
    y: coords.y,
    width: coords.width,
    height: coords.height
  });

  const bytes = await pdfDoc.save({ useObjectStreams: true });
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_signed.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Protect */
async function runProtect() {
  const file = currentFileToProcess || uploadedFiles[0];
  const password = document.getElementById('protect-password').value;
  const confirm = document.getElementById('protect-confirm').value;
  
  if (!password) throw new Error("Please enter a password.");
  if (password !== confirm) throw new Error("Passwords do not match.");
  
  updateProgress(30, "Encrypting byte streams");
  const bytes = await pdfTools.protectPdf(file, password);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_protected.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Unlock */
async function runUnlock() {
  const file = currentFileToProcess || uploadedFiles[0];
  const password = document.getElementById('unlock-password').value;
  
  updateProgress(30, "Validating decryption table");
  const bytes = await pdfTools.unlockPdf(file, password);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_unlocked.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: AI Summarizer */
async function runAiSummarizer() {
  const file = currentFileToProcess || uploadedFiles[0];
  const length = document.getElementById('ai-summary-length').value;
  
  updateProgress(25, "Extracting PDF text content");
  const extractedText = await pdfTools.pdfToText(file, false, (current, total) => {
    const percent = Math.floor((current / total) * 30) + 15;
    updateProgress(percent, `Extracting text page ${current} of ${total}`);
  });
  
  document.getElementById('ai-text-preview').value = extractedText;
  
  updateProgress(55, "Generating summarization");
  
  const summary = await callAiAPI(extractedText, `Summarize the following document. Length setting is: ${length}. Extracted Document content:\n\n${extractedText}`);
  
  // Display result
  const resultDiv = document.getElementById('ai-summary-result');
  const resultBox = document.getElementById('ai-summary-result-box');
  
  if (resultDiv && resultBox) {
    resultDiv.textContent = summary;
    resultBox.style.display = 'block';
  }
  
  const enc = new TextEncoder();
  processedFileBytes = enc.encode(summary);
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_summary.txt`;
  processedFileType = 'text/plain';
  
  updateProgress(100, "Summarized");
  showResultPanel(processedFileName, processedFileBytes.length);
}

/* Action: Translate */
async function runTranslate() {
  const file = currentFileToProcess || uploadedFiles[0];
  const targetLang = document.getElementById('translate-lang').value;
  
  updateProgress(25, "Extracting text");
  const extractedText = await pdfTools.pdfToText(file, false, (current, total) => {
    const percent = Math.floor((current / total) * 30) + 15;
    updateProgress(percent, `Extracting text page ${current} of ${total}`);
  });
  
  updateProgress(55, "Translating");
  const prompt = `Translate the following document text into ${targetLang}. Preserve the paragraphs. Text to translate:\n\n${extractedText}`;
  const translated = await callAiAPI(extractedText, prompt);
  
  const resultDiv = document.getElementById('ai-translate-result');
  const resultBox = document.getElementById('ai-translate-result-box');
  
  if (resultDiv && resultBox) {
    resultDiv.textContent = translated;
    resultBox.style.display = 'block';
  }
  
  const enc = new TextEncoder();
  processedFileBytes = enc.encode(translated);
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_translated_${targetLang.toLowerCase()}.txt`;
  processedFileType = 'text/plain';
  
  updateProgress(100, "Translated");
  showResultPanel(processedFileName, processedFileBytes.length);
}

/* Action: Pages Per Sheet */
async function runPagesPerSheet() {
  const file = currentFileToProcess || uploadedFiles[0];
  const count = parseInt(document.getElementById('pps-count').value, 10);
  const pageSize = document.getElementById('pps-page-size').value;
  
  const orientationElem = document.getElementById('pps-orientation');
  const orientation = orientationElem ? orientationElem.value : 'auto';
  
  const marginElem = document.getElementById('pps-margin');
  const marginVal = marginElem ? parseFloat(marginElem.value) : 0;
  const marginPercent = isNaN(marginVal) ? 0 : marginVal;
  
  const directionElem = document.getElementById('pps-direction');
  const direction = directionElem ? directionElem.value : 'ltr';
  
  const bordersElem = document.getElementById('pps-borders');
  const addBorders = bordersElem ? bordersElem.checked : false;

  updateProgress(15, "Analyzing source PDF pages");

  const bytes = await pdfTools.pagesPerSheet(file, {
    count,
    pageSize,
    orientation,
    marginPercent,
    direction,
    addBorders
  }, (current, total) => {
    const percent = Math.floor((current / total) * 70) + 20;
    updateProgress(percent, `Composing sheet ${current} of ${total}`);
  });

  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_${count}up.pdf`;
  processedFileType = 'application/pdf';

  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* Stubs for new batch 1 tools */
async function processVisualToolBase(suffix) {
  if (pagesState.length === 0) {
    alert("No pages selected to process.");
    return;
  }
  updateProgress(30, "Processing PDF structure");
  const bytes = await pdfTools.organizePdf(uploadedFiles[0], pagesState);
  
  processedFileBytes = bytes;
  processedFileName = `${uploadedFiles[0].name.replace(/\.[^/.]+$/, "")}_${suffix}.pdf`;
  processedFileType = 'application/pdf';

  updateProgress(100, "Done");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Flatten PDF */
async function runFlattenPdf() {
  updateProgress(30, "Flattening form fields");
  const file = currentFileToProcess || uploadedFiles[0];
  const bytes = await pdfTools.flattenPdf(file);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_flattened.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Done");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Edit Metadata */
async function runEditMetadata() {
  updateProgress(30, "Updating metadata");
  const file = currentFileToProcess || uploadedFiles[0];
  const title = document.getElementById('meta-title').value;
  const author = document.getElementById('meta-author').value;
  const subject = document.getElementById('meta-subject').value;
  const clearAll = document.getElementById('meta-clear-all').checked;
  
  const bytes = await pdfTools.editMetadata(file, title, author, subject, clearAll);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_meta.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Done");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Crop PDF */
async function runCropPdf() {
  updateProgress(30, "Cropping pages");
  const file = currentFileToProcess || uploadedFiles[0];
  const marginSize = document.getElementById('crop-amount').value;
  
  const bytes = await pdfTools.cropPdf(file, marginSize);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_cropped.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Done");
  showResultPanel(processedFileName, bytes.length);
}

/* Action: Change Page Size */
async function runChangePageSize() {
  updateProgress(30, "Resizing pages");
  const file = currentFileToProcess || uploadedFiles[0];
  const targetSize = document.getElementById('cps-size').value;
  const scaleMode = document.querySelector('input[name="cps-scale"]:checked').value;
  
  const bytes = await pdfTools.changePageSize(file, targetSize, scaleMode);
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_resized.pdf`;
  processedFileType = 'application/pdf';
  
  updateProgress(100, "Done");
  showResultPanel(processedFileName, bytes.length);
}

async function runRotate() {
  await processVisualToolBase('rotated');
}
async function runRemove() {
  await processVisualToolBase('removed');
}
async function runExtract() {
  await processVisualToolBase('extracted');
}
async function runExtractImages() {
  const file = currentFileToProcess || uploadedFiles[0];
  const hq = document.getElementById('extract-img-hq')?.checked ?? true;
  updateProgress(20, "Scanning PDF for embedded images");
  
  const bytes = await pdfTools.extractImages(file, { hq }, (current, total) => {
    updateProgress(20 + Math.floor((current/total)*70), `Scanning page ${current} of ${total}`);
  });
  
  processedFileBytes = bytes;
  processedFileName = `${file.name.replace(/\.[^/.]+$/, "")}_images.zip`;
  processedFileType = 'application/zip';
  
  updateProgress(100, "Finished");
  showResultPanel(processedFileName, bytes.length);
}

/* External API callers */
async function callAiAPI(text, prompt) {
  const preferGemini = localStorage.getItem('prefer-gemini') !== 'false';
  const geminiKey = localStorage.getItem('gemini-key');
  const openaiKey = localStorage.getItem('openai-key');
  
  if (preferGemini && geminiKey) {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      const data = await response.json();
      if (data.candidates && data.candidates[0].content.parts[0].text) {
        return data.candidates[0].content.parts[0].text;
      }
      throw new Error(data.error?.message || "Invalid API response schema.");
    } catch (error) {
      console.warn("Gemini API request failed, falling back to local summarize", error);
    }
  } else if (!preferGemini && openaiKey) {
    try {
      const response = await fetch(`https://api.openai.com/v1/chat/completions`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }]
        })
      });
      const data = await response.json();
      if (data.choices && data.choices[0].message.content) {
        return data.choices[0].message.content;
      }
      throw new Error(data.error?.message || "Invalid API response schema.");
    } catch (error) {
      console.warn("OpenAI API request failed, falling back to local summarize", error);
    }
  }
  
  // Fallback if no keys or API failed
  const length = activeTab === 'ai-summarizer' ? document.getElementById('ai-summary-length').value : 'standard';
  if (activeTab === 'translate') {
    const targetLang = document.getElementById('translate-lang').value;
    return `[Offline Client-Side Translation Mock]\n\n(Note: Configure your Gemini or OpenAI API Key in settings to get real-time translations)\n\nDocument Translated to ${targetLang}:\n\n${text}`;
  }
  return pdfTools.mockSummarize(text, length) + `\n\n(Note: Configure your Gemini or OpenAI API Key in settings to get high-accuracy summaries)`;
}

/* =========================================================
   EDIT PDF LOGIC
   ========================================================= */

async function renderEditWorkspace() {
  const container = document.getElementById('interactive-workspace');
  if (!container) return;

  const file = currentFileToProcess || uploadedFiles[0];
  if (!file || file.type !== 'application/pdf') {
    container.innerHTML = '<div class="info-block italic text-center">Please upload a valid PDF file to edit.</div>';
    return;
  }

  container.innerHTML = `
    <div class="workspace-bar">
      <h3><i class="fa-solid fa-pen-to-square"></i> PDF Editor</h3>
      <div class="workspace-bar-actions">
        <button id="btn-edit-prev" class="btn-secondary btn-sm"><i class="fa-solid fa-chevron-left"></i></button>
        <span id="edit-page-indicator" style="font-size: 13px; font-weight: 600;">Page 1</span>
        <button id="btn-edit-next" class="btn-secondary btn-sm"><i class="fa-solid fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="workspace-bar" style="justify-content: flex-start; gap: 10px; margin-top:-10px; border-bottom: none;">
      <button id="btn-edit-add-text" class="btn-secondary"><i class="fa-solid fa-font"></i> Add Text</button>
      <button id="btn-edit-add-image" class="btn-secondary"><i class="fa-solid fa-image"></i> Add Image</button>
      <input type="file" id="edit-image-upload" accept="image/*" style="display:none;">
    </div>
    <div class="pdf-placement-viewer" style="background-color: var(--bg-sidebar);">
      <div class="placement-canvas-container" id="edit-canvas-container" style="position: relative;">
        <canvas id="edit-preview-canvas"></canvas>
        <div id="edit-overlay" class="pdf-editor-overlay"></div>
      </div>
    </div>
  `;

  elements.btnProcess.disabled = true;

  try {
    const pagesInfo = await pdfTools.getPdfPageInfo(file);
    let currentPage = 0;

    const renderPage = async (index) => {
      currentPage = index;
      document.getElementById('edit-page-indicator').textContent = `Page ${index + 1} of ${pagesInfo.length}`;
      
      const canvas = document.getElementById('edit-preview-canvas');
      const containerDiv = document.getElementById('edit-canvas-container');
      const overlay = document.getElementById('edit-overlay');
      
      // Clear overlay when switching pages temporarily to avoid jank
      overlay.innerHTML = '';
      
      const { width, height } = await pdfTools.renderPdfPageToCanvas(file, index, canvas, 1.2);
      
      containerDiv.style.width = `${width}px`;
      containerDiv.style.height = `${height}px`;

      // Init editor module for this page
      pdfEditor.initEditor(overlay, index, width, height);

      // Store canvas dims for saving later
      if (!window.editPagesInfo) window.editPagesInfo = {};
      window.editPagesInfo[index] = {
        canvasWidth: width,
        canvasHeight: height,
        pdfWidth: pagesInfo[index].width,
        pdfHeight: pagesInfo[index].height
      };

      elements.btnProcess.disabled = false;
    };

    await renderPage(0);

    // Pagination
    document.getElementById('btn-edit-prev').addEventListener('click', () => {
      if (currentPage > 0) renderPage(currentPage - 1);
    });
    document.getElementById('btn-edit-next').addEventListener('click', () => {
      if (currentPage < pagesInfo.length - 1) renderPage(currentPage + 1);
    });

    // Toolbar buttons
    document.getElementById('btn-edit-add-text').addEventListener('click', () => {
      pdfEditor.addTextElement();
    });

    const imgUpload = document.getElementById('edit-image-upload');
    document.getElementById('btn-edit-add-image').addEventListener('click', () => {
      imgUpload.click();
    });
    imgUpload.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        const reader = new FileReader();
        reader.onload = (event) => {
          pdfEditor.addImageElement(event.target.result);
        };
        reader.readAsDataURL(e.target.files[0]);
      }
    });

    // Property Panel Events
    const colorInput = document.getElementById('edit-text-color');
    const sizeInput = document.getElementById('edit-text-size');
    const delBtn = document.getElementById('btn-edit-delete');

    if (colorInput && sizeInput) {
      colorInput.addEventListener('input', (e) => {
        pdfEditor.updateSelectedTextProps(e.target.value, parseInt(sizeInput.value));
      });
      sizeInput.addEventListener('input', (e) => {
        pdfEditor.updateSelectedTextProps(colorInput.value, parseInt(e.target.value));
      });
    }

    if (delBtn) {
      delBtn.addEventListener('click', () => {
        pdfEditor.deleteSelectedElement();
      });
    }

  } catch (err) {
    console.error("Error rendering edit workspace:", err);
    container.innerHTML = '<div class="info-block italic text-center" style="color:var(--danger);">Failed to render PDF page. Make sure the file is not corrupted or password protected.</div>';
  }
}

async function runEdit() {
  const file = currentFileToProcess || uploadedFiles[0];
  const editsList = pdfEditor.getAllEdits();
  
  if (!editsList || editsList.length === 0) {
    throw new Error("Please add at least one text or image element before processing.");
  }

  const pagesInfo = window.editPagesInfo;
  if (!pagesInfo) throw new Error("Missing canvas dimensions. Please reload the page.");

  const outputBytes = await pdfTools.applyEditsToPdf(file, editsList, pagesInfo);
  
  processedFileBytes = outputBytes;
  processedFileName = file.name.replace('.pdf', '_edited.pdf');
  
  // Clean up
  pdfEditor.teardownEditor();
  pdfEditor.clearAllEdits();
}
