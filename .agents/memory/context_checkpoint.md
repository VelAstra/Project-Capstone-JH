# Session Memory & Context Checkpoint
- **Timestamp**: 2026-09-30T19:11:00+07:00
- **Primary Objective**: Lightweight, 100% offline, privacy-first multiplatform PDF suite with native webviews across Windows, Linux, macOS, and Android.

## 1. Key Architectural Decisions & User Preferences
- **Architecture**: Discarded bloated Electron runtime (~115 MB) in favor of platform-native WebView hosts:
  - Windows: .NET 10 Single-File Form with Edge WebView2 runtime (~3.12 MB).
  - Linux: Tauri v2 with WebKitGTK 4.1 shared libraries packaging native `.deb` (~2.90 MB) instead of 79 MB AppImage.
  - macOS: Tauri v2 with Apple WKWebView packaging `.dmg` (~4.46 MB).
  - Android: Capacitor Android shell with Android System WebView packaging `.apk` (~5.67 MB).
- **Compilation Optimizations**: Configured `src-tauri/Cargo.toml` with `opt-level = "z"`, `lto = true`, `codegen-units = 1`, `panic = "abort"`, and `strip = true`.
- **Release Constraints**:
  - EXACTLY 5 files on GitHub Release (Windows exe, macOS dmg, Android apk, Linux deb, LaTeX report pdf). Never include `.yml` or `.blockmap`.
  - Empty release body on GitHub Release (`body: ""`).
- **UI/UX Guidelines**:
  - Flat design palette with Light (`#FBFFE4`, `#3D8D7A`, `#B3D8A8`, `#A3D1C6`, `#092328`) and Dark (`#092328`, `#12544F`, `#2A835F`, `#8BBB92`, `#FBFFE4`) themes.
  - Clean interface: Hero banner, privacy sandbox notifications, and mock statistics counters removed.
  - Emerald/obsidian squircle vector brand icon deployed across all platforms.

## 2. Completed Work & File Inventory
- [`SESSION_SUMMARY.md`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/SESSION_SUMMARY.md): Complete session documentation markdown.
- [`.github/workflows/release.yml`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/.github/workflows/release.yml): Multi-platform matrix CI/CD workflow publishing strictly 5 artifacts.
- [`src-tauri/Cargo.toml`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/src-tauri/Cargo.toml): Release profile optimizations added.
- [`README.md`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/README.md): Updated with v1.2.6 release links and verified size table.
- [`report/main.tex`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/report/main.tex): Comprehensive technical report updated with Linux deb case study, Rust LTO profile, and exact benchmark figures.
- [`report/OmniPDF-Studio-Technical-Report.pdf`](file:///C:/Users/Rayhan/Documents/GitHub/Project-Capstone-JH/report/OmniPDF-Studio-Technical-Report.pdf): Recompiled IEEE-style report PDF.

## 3. Discovered Gotchas & Fixed Bugs
- **Linux AppImage Bloat**: AppImage bundles entire WebKit2GTK and ICU unicode data (>30 MB), causing 79 MB size. Fixed by prioritizing native `.deb` package (2.90 MB) using host system WebKitGTK.
- **Tauri Packaging Script**: `compgen -G "*.AppImage"` was previously checked before `.deb`. Reversed precedence so `.deb` is selected.
- **GitHub Release Bloat**: `softprops/action-gh-release` was previously attaching update manifests and blockmaps. Fixed with explicit artifact path whitelist and empty release body.

## 4. Pending Tasks & Immediate Next Steps
- [x] Create `SESSION_SUMMARY.md` documenting entire session.
- [ ] Update `report/main.tex` with all new findings and sections from `SESSION_SUMMARY.md`.
- [ ] Recompile `report/OmniPDF-Studio-Technical-Report.pdf` with `pdflatex` and `bibtex`.
- [ ] Bump versions across `package.json`, `tauri.conf.json`, `README.md`, `release.yml`, and `main.tex` to `v1.2.6`.
- [ ] Commit, push to `main`, push tag `v1.2.6`.
- [ ] Monitor GitHub Actions workflow run until completion and verify GitHub Release `v1.2.6` has EXACTLY 5 assets and empty body.
