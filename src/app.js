/**
 * OmniPDF Studio - Main Application Logic
 */
import { PDFEngine } from './pdf-engine.js';

// Tool Registry Definition
const TOOLS = [
  {
    id: 'merge',
    name: 'Gabung PDF',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '🔗',
    desc: 'Gabungkan berapapun banyaknya file PDF menjadi satu dokumen utuh secara berurutan.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  },
  {
    id: 'split',
    name: 'Pisah PDF',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '✂️',
    desc: 'Pisahkan halaman PDF menjadi berkas-berkas terpisah atau arsip ZIP.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'extract',
    name: 'Ekstrak Halaman',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '📑',
    desc: 'Ambil beberapa halaman tertentu (contoh: 1, 3, 5-8) menjadi berkas PDF baru.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'delete',
    name: 'Hapus Halaman',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '🗑️',
    desc: 'Buang halaman yang tidak diperlukan dari dokumen PDF Anda.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'rotate',
    name: 'Putar PDF',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '🔄',
    desc: 'Putar orientasi halaman PDF 90°, 180°, atau 270° searah jarum jam.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  },
  {
    id: 'reorder',
    name: 'Balik & Urutkan Halaman',
    category: 'organize',
    categoryName: 'Pengorganisasian',
    icon: '🔀',
    desc: 'Balikkan urutan halaman (terakhir ke pertama) atau sesuaikan urutan kustom.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'images_to_pdf',
    name: 'Gambar ke PDF',
    category: 'convert',
    categoryName: 'Konversi',
    icon: '🖼️',
    desc: 'Konversi berapapun banyaknya foto/gambar (JPG, PNG, WebP) menjadi dokumen PDF.',
    accept: 'image/png,image/jpeg,image/webp,image/*',
    multiple: true
  },
  {
    id: 'watermark',
    name: 'Tambah Watermark',
    category: 'security',
    categoryName: 'Keamanan & Hak Cipta',
    icon: '💧',
    desc: 'Beri tanda air teks transparan di seluruh halaman untuk melindungi hak cipta.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  },
  {
    id: 'pagenumbers',
    name: 'Nomor Halaman',
    category: 'optimize',
    categoryName: 'Optimasi & Tampilan',
    icon: '🔢',
    desc: 'Tambahkan penomoran halaman otomatis dengan format dan posisi yang dapat diatur.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  },
  {
    id: 'compress',
    name: 'Kompres & Optimasi',
    category: 'optimize',
    categoryName: 'Optimasi & Tampilan',
    icon: '🗜️',
    desc: 'Optimasi aliran objek berkas PDF untuk merampingkan ukuran dokumen secara lokal.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  },
  {
    id: 'signature',
    name: 'Tanda Tangan Digital',
    category: 'security',
    categoryName: 'Keamanan & Hak Cipta',
    icon: '✍️',
    desc: 'Goreskan tanda tangan langsung pada layar canvas dan tempelkan ke dokumen PDF.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'metadata',
    name: 'Edit Metadata Dokumen',
    category: 'optimize',
    categoryName: 'Optimasi & Tampilan',
    icon: '🏷️',
    desc: 'Lihat dan perbarui informasi Judul, Penulis, Subjek, dan Kata Kunci file PDF.',
    accept: '.pdf,application/pdf',
    multiple: false
  },
  {
    id: 'flatten',
    name: 'Ratakan Formulir (Flatten)',
    category: 'security',
    categoryName: 'Keamanan & Hak Cipta',
    icon: '📄',
    desc: 'Kunci seluruh isian form dan anotasi menjadi teks permanen yang tidak dapat diedit.',
    accept: '.pdf,application/pdf',
    multiple: true,
    batchSupport: true
  }
];

class App {
  constructor() {
    this.currentView = 'home';
    this.activeTool = null;
    this.selectedFiles = [];
    this.currentCategory = 'all';
    this.searchQuery = '';
    this.theme = localStorage.getItem('omnipdf_theme') || 'light';

    // Signature state
    this.isDrawing = false;
    this.sigCanvas = null;
    this.sigCtx = null;

    this.init();
  }

  init() {
    this.applyTheme(this.theme);
    this.setupThemeToggle();
    this.setupMobileMenu();
    this.renderSidebar();
    this.renderHome();
  }

  // THEME MANAGEMENT
  applyTheme(theme) {
    this.theme = theme;
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('omnipdf_theme', theme);

    const isDark = theme === 'dark';
    const label = isDark ? 'Mode Terang' : 'Mode Gelap';
    const icon = isDark ? '☀️' : '🌙';

    const homeBtn = document.getElementById('home-theme-btn');
    if (homeBtn) {
      homeBtn.querySelector('.theme-icon').textContent = icon;
      homeBtn.querySelector('.theme-label').textContent = label;
    }

    const sideBtn = document.getElementById('sidebar-theme-btn');
    if (sideBtn) {
      sideBtn.querySelector('.theme-icon').textContent = icon;
      sideBtn.querySelector('.theme-label').textContent = label;
    }
  }

  setupThemeToggle() {
    const toggle = () => {
      const nextTheme = this.theme === 'light' ? 'dark' : 'light';
      this.applyTheme(nextTheme);
    };

    document.getElementById('home-theme-btn')?.addEventListener('click', toggle);
    document.getElementById('sidebar-theme-btn')?.addEventListener('click', toggle);
  }

  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobile-toggle');
    const sidebar = document.getElementById('sidebar');
    toggleBtn?.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // NAVIGATION & SIDEBAR
  renderSidebar() {
    const nav = document.getElementById('sidebar-nav');
    if (!nav) return;

    let html = `
      <button class="nav-item ${this.currentView === 'home' ? 'active' : ''}" data-nav="home">
        <span class="nav-icon">🏠</span>
        <span>Beranda (Semua Fitur)</span>
      </button>
      <div class="nav-section-title">Semua Alat Manipulasi</div>
    `;

    TOOLS.forEach((tool) => {
      const isActive = this.currentView === 'tool' && this.activeTool?.id === tool.id;
      html += `
        <button class="nav-item ${isActive ? 'active' : ''}" data-tool="${tool.id}">
          <span class="nav-icon">${tool.icon}</span>
          <span>${tool.name}</span>
        </button>
      `;
    });

    nav.innerHTML = html;

    // Attach click events
    nav.querySelectorAll('[data-nav="home"]').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.navigateTo('home');
        document.getElementById('sidebar')?.classList.remove('open');
      });
    });

    nav.querySelectorAll('[data-tool]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const toolId = btn.getAttribute('data-tool');
        const tool = TOOLS.find((t) => t.id === toolId);
        if (tool) {
          this.navigateToTool(tool);
          document.getElementById('sidebar')?.classList.remove('open');
        }
      });
    });
  }

  navigateTo(view) {
    this.currentView = view;
    this.selectedFiles = [];
    document.getElementById('page-title').textContent = 'Beranda';
    this.renderSidebar();
    this.renderHome();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  navigateToTool(tool) {
    this.currentView = 'tool';
    this.activeTool = tool;
    this.selectedFiles = [];
    document.getElementById('page-title').textContent = tool.name;
    this.renderSidebar();
    this.renderToolView(tool);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // HOME SCREEN
  renderHome() {
    const container = document.getElementById('main-content');
    if (!container) return;

    const filteredTools = TOOLS.filter((tool) => {
      const matchCat = this.currentCategory === 'all' || tool.category === this.currentCategory;
      const matchSearch =
        tool.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        tool.desc.toLowerCase().includes(this.searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });

    container.innerHTML = `
      <!-- HERO BANNER -->
      <section class="hero-banner">
        <div class="hero-header">
          <div class="hero-title-group">
            <h1>Studio Manipulasi PDF Offline</h1>
            <p>Aplikasi lokal lengkap untuk mengedit, menggabung, mengonversi, dan mengamankan file PDF tanpa batasan jumlah file.</p>
          </div>
          <div class="hero-pills">
            <span class="pill-badge">⚡ 100% Offline</span>
            <span class="pill-badge">🔒 Tanpa Upload Server</span>
            <span class="pill-badge">📁 Batch File Tak Terbatas</span>
            <span class="pill-badge">🖥️ Multiplatform: Win, Linux, Mac, Android</span>
          </div>
        </div>
      </section>

      <!-- TOOLBAR FILTER -->
      <div class="toolbar-filter">
        <div class="category-tabs">
          <button class="tab-btn ${this.currentCategory === 'all' ? 'active' : ''}" data-cat="all">Semua (${TOOLS.length})</button>
          <button class="tab-btn ${this.currentCategory === 'organize' ? 'active' : ''}" data-cat="organize">Pengorganisasian</button>
          <button class="tab-btn ${this.currentCategory === 'convert' ? 'active' : ''}" data-cat="convert">Konversi</button>
          <button class="tab-btn ${this.currentCategory === 'security' ? 'active' : ''}" data-cat="security">Keamanan</button>
          <button class="tab-btn ${this.currentCategory === 'optimize' ? 'active' : ''}" data-cat="optimize">Optimasi</button>
        </div>

        <div class="search-input-box">
          <span class="search-icon">🔍</span>
          <input type="text" id="tool-search" placeholder="Cari fitur manipulasi..." value="${this.searchQuery}">
        </div>
      </div>

      <!-- TOOLS GRID -->
      <div class="tools-grid">
        ${
          filteredTools.length > 0
            ? filteredTools
                .map(
                  (tool) => `
          <div class="tool-card" data-card-tool="${tool.id}">
            <div class="tool-card-top">
              <div class="tool-icon-wrapper">${tool.icon}</div>
              <div class="tool-meta">
                <span class="tool-category-badge">${tool.categoryName}</span>
                <h3>${tool.name}</h3>
              </div>
            </div>
            <p class="tool-description">${tool.desc}</p>
            <div class="tool-card-footer">
              <span class="pill-badge">${tool.multiple ? 'Banyak File' : '1 Dokumen'}</span>
              <span class="btn-card-action">Buka Alat →</span>
            </div>
          </div>
        `
                )
                .join('')
            : `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">Tidak ada fitur yang cocok dengan pencarian.</div>`
        }
      </div>
    `;

    // Filter events
    container.querySelectorAll('[data-cat]').forEach((tab) => {
      tab.addEventListener('click', () => {
        this.currentCategory = tab.getAttribute('data-cat');
        this.renderHome();
      });
    });

    const searchInput = document.getElementById('tool-search');
    searchInput?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value;
      this.renderHome();
      const newSearch = document.getElementById('tool-search');
      if (newSearch) {
        newSearch.focus();
        newSearch.setSelectionRange(this.searchQuery.length, this.searchQuery.length);
      }
    });

    // Tool card clicks
    container.querySelectorAll('[data-card-tool]').forEach((card) => {
      card.addEventListener('click', () => {
        const toolId = card.getAttribute('data-card-tool');
        const tool = TOOLS.find((t) => t.id === toolId);
        if (tool) this.navigateToTool(tool);
      });
    });
  }

  // ACTIVE TOOL VIEW
  renderToolView(tool) {
    const container = document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = `
      <div class="tool-view-container">
        <!-- HEADER -->
        <div class="tool-view-header">
          <div class="tool-view-title">
            <button class="btn-back" id="btn-back-home">← Kembali ke Beranda</button>
            <h2 style="margin-top: 12px;">${tool.icon} ${tool.name}</h2>
            <p>${tool.desc}</p>
          </div>
          <div>
            <span class="pill-badge">${tool.multiple ? 'Mendukung Berapapun Banyaknya File' : '1 File Input'}</span>
          </div>
        </div>

        <!-- DROPZONE -->
        <div class="dropzone" id="dropzone">
          <div class="dropzone-icon">${tool.id === 'images_to_pdf' ? '🖼️' : '📂'}</div>
          <div class="dropzone-title">Tarik & Lepaskan File ke Sini atau Klik untuk Memilih</div>
          <div class="dropzone-sub">
            Format yang didukung: ${tool.accept} ${tool.multiple ? '(Bisa pilih berapapun banyaknya file)' : ''}
          </div>
          <input type="file" id="file-input" class="file-input-hidden" accept="${tool.accept}" ${tool.multiple ? 'multiple' : ''}>
        </div>

        <!-- FILE LIST -->
        <div id="file-list-section" style="display: none;"></div>

        <!-- TOOL SPECIFIC OPTIONS -->
        <div id="tool-options-section"></div>

        <!-- PROGRESS & ACTIONS -->
        <div id="action-section">
          <button class="btn-primary-action" id="btn-execute" disabled style="width: 100%;">
            <span>Jalankan ${tool.name}</span>
          </button>
        </div>

        <!-- PROGRESS BAR -->
        <div id="progress-container" style="display: none;">
          <div class="progress-panel">
            <div class="progress-bar-outer">
              <div class="progress-bar-inner" id="progress-bar"></div>
            </div>
            <div class="progress-text" id="progress-status">Memproses...</div>
          </div>
        </div>

        <!-- RESULT AREA -->
        <div id="result-section" style="display: none;"></div>
      </div>
    `;

    document.getElementById('btn-back-home')?.addEventListener('click', () => this.navigateTo('home'));

    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');

    dropzone?.addEventListener('click', () => fileInput?.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files?.length) {
        this.handleFilesSelected(Array.from(e.dataTransfer.files), tool);
      }
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files?.length) {
        this.handleFilesSelected(Array.from(e.target.files), tool);
      }
    });

    this.renderToolOptions(tool);
  }

  handleFilesSelected(newFiles, tool) {
    if (tool.multiple) {
      this.selectedFiles.push(...newFiles);
    } else {
      this.selectedFiles = [newFiles[0]];
    }
    this.updateFileList(tool);
  }

  updateFileList(tool) {
    const listSection = document.getElementById('file-list-section');
    const execBtn = document.getElementById('btn-execute');
    if (!listSection) return;

    if (this.selectedFiles.length === 0) {
      listSection.style.display = 'none';
      if (execBtn) execBtn.disabled = true;
      return;
    }

    listSection.style.display = 'block';
    if (execBtn) execBtn.disabled = false;

    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    listSection.innerHTML = `
      <div class="file-list-card">
        <div class="file-list-header">
          <div class="file-list-title">Berkas Terpilih (${this.selectedFiles.length} file)</div>
          <button class="btn-icon-action" id="btn-clear-all" style="color: var(--danger-color);">Hapus Semua</button>
        </div>
        <div class="file-items">
          ${this.selectedFiles
            .map(
              (file, idx) => `
            <div class="file-item-row">
              <div class="file-item-info">
                <span>📄</span>
                <span class="file-name" title="${file.name}">${file.name}</span>
                <span class="file-size-badge">(${formatBytes(file.size)})</span>
              </div>
              <div class="file-item-actions">
                ${
                  tool.multiple && idx > 0
                    ? `<button class="btn-icon-action" data-move-up="${idx}" title="Pindah ke Atas">↑</button>`
                    : ''
                }
                ${
                  tool.multiple && idx < this.selectedFiles.length - 1
                    ? `<button class="btn-icon-action" data-move-down="${idx}" title="Pindah ke Bawah">↓</button>`
                    : ''
                }
                <button class="btn-icon-action" data-remove-idx="${idx}" title="Hapus">✕</button>
              </div>
            </div>
          `
            )
            .join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-clear-all')?.addEventListener('click', () => {
      this.selectedFiles = [];
      this.updateFileList(tool);
    });

    listSection.querySelectorAll('[data-remove-idx]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-remove-idx'), 10);
        this.selectedFiles.splice(idx, 1);
        this.updateFileList(tool);
      });
    });

    listSection.querySelectorAll('[data-move-up]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-move-up'), 10);
        const temp = this.selectedFiles[idx];
        this.selectedFiles[idx] = this.selectedFiles[idx - 1];
        this.selectedFiles[idx - 1] = temp;
        this.updateFileList(tool);
      });
    });

    listSection.querySelectorAll('[data-move-down]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-move-down'), 10);
        const temp = this.selectedFiles[idx];
        this.selectedFiles[idx] = this.selectedFiles[idx + 1];
        this.selectedFiles[idx + 1] = temp;
        this.updateFileList(tool);
      });
    });

    // Auto load metadata if tool is metadata
    if (tool.id === 'metadata' && this.selectedFiles.length > 0) {
      PDFEngine.readMetadata(this.selectedFiles[0]).then((meta) => {
        const titleEl = document.getElementById('meta-title');
        const authorEl = document.getElementById('meta-author');
        const subjectEl = document.getElementById('meta-subject');
        const keywordsEl = document.getElementById('meta-keywords');
        if (titleEl) titleEl.value = meta.title || '';
        if (authorEl) authorEl.value = meta.author || '';
        if (subjectEl) subjectEl.value = meta.subject || '';
        if (keywordsEl) keywordsEl.value = meta.keywords || '';
      });
    }
  }

  // RENDER DYNAMIC TOOL OPTIONS
  renderToolOptions(tool) {
    const optContainer = document.getElementById('tool-options-section');
    if (!optContainer) return;

    let html = '';

    if (tool.id === 'split') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Pemisahan Dokumen</div>
          <div class="form-row">
            <div class="form-group">
              <label>Metode Pemisahan</label>
              <select class="form-control" id="split-mode">
                <option value="all_pages">Pisahkan Semua Halaman (Masing-masing 1 Halaman -> ZIP)</option>
                <option value="custom">Berdasarkan Rentang Halaman Spesifik</option>
              </select>
            </div>
            <div class="form-group" id="split-range-group" style="display: none;">
              <label>Rentang Halaman (Contoh: 1-3, 5)</label>
              <input type="text" class="form-control" id="split-range" placeholder="Misal: 1-3">
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'extract') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Ekstraksi Halaman</div>
          <div class="form-group">
            <label>Halaman yang Ingin Diekstrak</label>
            <input type="text" class="form-control" id="extract-range" placeholder="Contoh: 1, 3, 5-8">
            <small style="color: var(--text-muted); font-size: 0.8rem; margin-top: 4px;">Gunakan koma dan strip untuk menentukan halaman.</small>
          </div>
        </div>
      `;
    } else if (tool.id === 'delete') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Penghapusan Halaman</div>
          <div class="form-group">
            <label>Halaman yang Ingin Dihapus</label>
            <input type="text" class="form-control" id="delete-range" placeholder="Contoh: 2, 4, 6-8">
          </div>
        </div>
      `;
    } else if (tool.id === 'rotate') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Rotasi</div>
          <div class="form-row">
            <div class="form-group">
              <label>Derajat Rotasi</label>
              <select class="form-control" id="rotate-degrees">
                <option value="90">90° Searah Jarum Jam</option>
                <option value="180">180° Terbalik</option>
                <option value="270">270° Berlawanan Jarum Jam</option>
              </select>
            </div>
            <div class="form-group">
              <label>Pilihan Halaman (Kosongkan untuk Semua Halaman)</label>
              <input type="text" class="form-control" id="rotate-range" placeholder="Semua atau contoh: 1, 3">
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'images_to_pdf') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Halaman PDF</div>
          <div class="form-row">
            <div class="form-group">
              <label>Ukuran Kertas</label>
              <select class="form-control" id="img-page-size">
                <option value="A4">A4 (Standar)</option>
                <option value="Letter">Letter</option>
              </select>
            </div>
            <div class="form-group">
              <label>Orientasi</label>
              <select class="form-control" id="img-orientation">
                <option value="portrait">Tegak (Portrait)</option>
                <option value="landscape">Mendatar (Landscape)</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'watermark') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Watermark</div>
          <div class="form-group">
            <label>Teks Tanda Air (Watermark)</label>
            <input type="text" class="form-control" id="wm-text" placeholder="Contoh: RAHASIA / DRAFT / SALINAN" value="RAHASIA">
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Ukuran Font</label>
              <input type="number" class="form-control" id="wm-fontsize" value="50" min="10" max="150">
            </div>
            <div class="form-group">
              <label>Tingkat Opasitas (Transparansi)</label>
              <select class="form-control" id="wm-opacity">
                <option value="0.15">Sangat Samar (15%)</option>
                <option value="0.25" selected>Sedang (25%)</option>
                <option value="0.5">Tegas (50%)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Sudut Kemiringan</label>
              <select class="form-control" id="wm-angle">
                <option value="45" selected>Diagonal (45°)</option>
                <option value="0">Horizontal (0°)</option>
                <option value="-45">Diagonal Terbalik (-45°)</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'pagenumbers') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Pengaturan Nomor Halaman</div>
          <div class="form-row">
            <div class="form-group">
              <label>Format Penomoran</label>
              <select class="form-control" id="pn-format">
                <option value="{n} / {total}">Halaman {n} / {total}</option>
                <option value="Halaman {n}">Halaman {n}</option>
                <option value="{n}">Angka Saja ({n})</option>
              </select>
            </div>
            <div class="form-group">
              <label>Posisi Peletakan</label>
              <select class="form-control" id="pn-position">
                <option value="bottom-center" selected>Bawah Tengah</option>
                <option value="bottom-right">Bawah Kanan</option>
                <option value="bottom-left">Bawah Kiri</option>
                <option value="top-right">Atas Kanan</option>
                <option value="top-center">Atas Tengah</option>
              </select>
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'signature') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Goreskan Tanda Tangan Anda</div>
          <p style="font-size: 0.85rem; color: var(--text-muted);">Gunakan mouse, stylus, atau jari pada layar untuk membuat tanda tangan digital.</p>
          <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
            <canvas id="signature-pad" class="signature-box"></canvas>
            <button class="btn-icon-action" id="btn-clear-sig">Bersihkan Canvas</button>
          </div>
          <div class="form-row" style="margin-top: 10px;">
            <div class="form-group">
              <label>Ditempelkan pada Halaman ke-</label>
              <input type="number" class="form-control" id="sig-page" value="1" min="1">
            </div>
            <div class="form-group">
              <label>Lebar Tanda Tangan (px)</label>
              <input type="number" class="form-control" id="sig-width" value="150" min="50" max="400">
            </div>
          </div>
        </div>
      `;
    } else if (tool.id === 'metadata') {
      html = `
        <div class="tool-options-card">
          <div class="options-title">Informasi Metadata Dokumen</div>
          <div class="form-row">
            <div class="form-group">
              <label>Judul Dokumen (Title)</label>
              <input type="text" class="form-control" id="meta-title" placeholder="Judul Dokumen">
            </div>
            <div class="form-group">
              <label>Penulis (Author)</label>
              <input type="text" class="form-control" id="meta-author" placeholder="Nama Penulis">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>Subjek (Subject)</label>
              <input type="text" class="form-control" id="meta-subject" placeholder="Subjek Dokumen">
            </div>
            <div class="form-group">
              <label>Kata Kunci (Keywords, pisahkan dengan koma)</label>
              <input type="text" class="form-control" id="meta-keywords" placeholder="dokumen, capstone, pdf">
            </div>
          </div>
        </div>
      `;
    }

    optContainer.innerHTML = html;

    // Split mode dynamic toggle
    if (tool.id === 'split') {
      const modeSelect = document.getElementById('split-mode');
      const rangeGroup = document.getElementById('split-range-group');
      modeSelect?.addEventListener('change', () => {
        if (rangeGroup) {
          rangeGroup.style.display = modeSelect.value === 'custom' ? 'block' : 'none';
        }
      });
    }

    // Signature pad setup
    if (tool.id === 'signature') {
      this.setupSignaturePad();
    }

    // Attach execution event
    document.getElementById('btn-execute')?.addEventListener('click', () => {
      this.executeTool(tool);
    });
  }

  // SIGNATURE CANVAS INTERACTION
  setupSignaturePad() {
    const canvas = document.getElementById('signature-pad');
    if (!canvas) return;
    this.sigCanvas = canvas;
    this.sigCtx = canvas.getContext('2d');

    // Scale canvas for crispness
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    this.sigCtx.strokeStyle = '#12544F';
    this.sigCtx.lineWidth = 3;
    this.sigCtx.lineCap = 'round';
    this.sigCtx.lineJoin = 'round';

    const getPos = (e) => {
      const r = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - r.left, y: clientY - r.top };
    };

    const startDraw = (e) => {
      e.preventDefault();
      this.isDrawing = true;
      const { x, y } = getPos(e);
      this.sigCtx.beginPath();
      this.sigCtx.moveTo(x, y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      e.preventDefault();
      const { x, y } = getPos(e);
      this.sigCtx.lineTo(x, y);
      this.sigCtx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    canvas.addEventListener('touchstart', startDraw, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    window.addEventListener('touchend', stopDraw);

    document.getElementById('btn-clear-sig')?.addEventListener('click', () => {
      this.sigCtx.clearRect(0, 0, canvas.width, canvas.height);
    });
  }

  // EXECUTE OPERATION
  async executeTool(tool) {
    if (this.selectedFiles.length === 0) return;

    const execBtn = document.getElementById('btn-execute');
    const progContainer = document.getElementById('progress-container');
    const progBar = document.getElementById('progress-bar');
    const progStatus = document.getElementById('progress-status');
    const resultSection = document.getElementById('result-section');

    if (execBtn) execBtn.disabled = true;
    if (progContainer) progContainer.style.display = 'block';
    if (resultSection) resultSection.style.display = 'none';

    const onProgress = (curr, total, msg) => {
      const pct = Math.round((curr / Math.max(1, total)) * 100);
      if (progBar) progBar.style.width = `${pct}%`;
      if (progStatus) progStatus.textContent = `${msg || 'Memproses...'} (${pct}%)`;
    };

    try {
      let output = null;

      switch (tool.id) {
        case 'merge':
          output = await PDFEngine.mergePDFs(this.selectedFiles, onProgress);
          break;

        case 'split': {
          const splitMode = document.getElementById('split-mode')?.value || 'all_pages';
          const range = document.getElementById('split-range')?.value || '';
          output = await PDFEngine.splitPDF(this.selectedFiles[0], splitMode, range, onProgress);
          break;
        }

        case 'extract': {
          const range = document.getElementById('extract-range')?.value || '';
          output = await PDFEngine.extractPages(this.selectedFiles[0], range, onProgress);
          break;
        }

        case 'delete': {
          const range = document.getElementById('delete-range')?.value || '';
          output = await PDFEngine.deletePages(this.selectedFiles[0], range, onProgress);
          break;
        }

        case 'rotate': {
          const deg = parseInt(document.getElementById('rotate-degrees')?.value || '90', 10);
          const range = document.getElementById('rotate-range')?.value || '';
          output = await PDFEngine.runBatch(
            this.selectedFiles,
            (file, opts, prog) => PDFEngine.rotatePDF(file, deg, range, prog),
            {},
            onProgress
          );
          break;
        }

        case 'reorder':
          output = await PDFEngine.reorderPDF(this.selectedFiles[0], 'reverse', '', onProgress);
          break;

        case 'images_to_pdf': {
          const size = document.getElementById('img-page-size')?.value || 'A4';
          const orient = document.getElementById('img-orientation')?.value || 'portrait';
          output = await PDFEngine.imagesToPDF(this.selectedFiles, size, orient, onProgress);
          break;
        }

        case 'watermark': {
          const text = document.getElementById('wm-text')?.value || 'RAHASIA';
          const fontSize = parseInt(document.getElementById('wm-fontsize')?.value || '50', 10);
          const opacity = parseFloat(document.getElementById('wm-opacity')?.value || '0.25');
          const angle = parseInt(document.getElementById('wm-angle')?.value || '45', 10);
          output = await PDFEngine.runBatch(
            this.selectedFiles,
            (file, opts, prog) => PDFEngine.addWatermark(file, text, { fontSize, opacity, angle }, prog),
            {},
            onProgress
          );
          break;
        }

        case 'pagenumbers': {
          const format = document.getElementById('pn-format')?.value || '{n} / {total}';
          const pos = document.getElementById('pn-position')?.value || 'bottom-center';
          output = await PDFEngine.runBatch(
            this.selectedFiles,
            (file, opts, prog) => PDFEngine.addPageNumbers(file, format, pos, prog),
            {},
            onProgress
          );
          break;
        }

        case 'compress':
          output = await PDFEngine.runBatch(
            this.selectedFiles,
            (file, opts, prog) => PDFEngine.compressPDF(file, prog),
            {},
            onProgress
          );
          break;

        case 'signature': {
          if (!this.sigCanvas) throw new Error('Canvas tanda tangan belum siap.');
          const dataUrl = this.sigCanvas.toDataURL('image/png');
          const pageNum = parseInt(document.getElementById('sig-page')?.value || '1', 10);
          const width = parseInt(document.getElementById('sig-width')?.value || '150', 10);
          output = await PDFEngine.addSignature(this.selectedFiles[0], dataUrl, pageNum, 80, 80, width, onProgress);
          break;
        }

        case 'metadata': {
          const metadata = {
            title: document.getElementById('meta-title')?.value || '',
            author: document.getElementById('meta-author')?.value || '',
            subject: document.getElementById('meta-subject')?.value || '',
            keywords: document.getElementById('meta-keywords')?.value || ''
          };
          output = await PDFEngine.updateMetadata(this.selectedFiles[0], metadata, onProgress);
          break;
        }

        case 'flatten':
          output = await PDFEngine.runBatch(
            this.selectedFiles,
            (file, opts, prog) => PDFEngine.flattenPDF(file, prog),
            {},
            onProgress
          );
          break;

        default:
          throw new Error('Fitur belum didukung.');
      }

      this.displayResult(output);
    } catch (err) {
      alert(`Terjadi kesalahan saat memproses: ${err.message}`);
    } finally {
      if (execBtn) execBtn.disabled = false;
      if (progContainer) progContainer.style.display = 'none';
    }
  }

  // DISPLAY RESULT & DOWNLOAD
  displayResult(output) {
    const resultSection = document.getElementById('result-section');
    if (!resultSection || !output) return;

    const blob = new Blob([output.bytes], { type: output.mimeType });
    const downloadUrl = URL.createObjectURL(blob);

    const sizeFormatted = (blob.size / 1024 / 1024).toFixed(2) + ' MB';

    resultSection.style.display = 'block';
    resultSection.innerHTML = `
      <div class="result-card">
        <div class="result-icon">🎉</div>
        <div class="result-title">Operasi Berhasil Selesai!</div>
        <div class="result-desc">
          Berkas hasil telah siap: <strong>${output.fileName}</strong> (${sizeFormatted})
          ${output.pageCount ? `• Total ${output.pageCount} halaman` : ''}
          ${output.reductionPercent !== undefined ? `• Reduksi ukuran: ${output.reductionPercent}%` : ''}
        </div>
        <a href="${downloadUrl}" download="${output.fileName}" class="btn-primary-action" style="text-decoration: none; margin-top: 10px;">
          <span>💾 Unduh Berkas Sekarang</span>
        </a>
      </div>
    `;

    resultSection.scrollIntoView({ behavior: 'smooth' });
  }
}

// Start application when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
