<div align="center">

# 🪐 Mind Map Planet

**Turn your Obsidian vault into an interactive solar system.**

Your folders become planets. Your notes become territories on those planets.  
Navigate your knowledge like exploring space.

[![Electron](https://img.shields.io/badge/Electron-31-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

</div>

---

## 📖 What Is This?

**Mind Map Planet** is an Electron desktop application that reads your [Obsidian](https://obsidian.md/) vault and visualizes its entire folder/note structure as a **solar system**.

In most note-taking apps your files are buried in an endless tree. Mind Map Planet replaces that with a spatial, planet-based metaphor:

| Vault Structure | Visual Representation |
|---|---|
| **Top-level folders** | Planets orbiting in a solar system |
| **Sub-folders & notes inside a folder** | Territories on the planet's surface (Voronoi cells) |
| **Deeper nesting** | Drill-down into any territory to reveal its own subdivisions |

Click a planet → land on its surface → explore its Voronoi regions → click any note to open it directly in Obsidian.

---

## 🖼️ Screenshots

### Solar System View — Your Vault at a Glance
![Home](assets/screenshots/Home.png)
*Each planet represents a top-level folder. Planet size reflects the number of notes inside. Twinkling stars fill the background.*

### Quick Add Note
![Quick Add Note](assets/screenshots/Quick%20Add%20Note.png)
*Create a new note and choose which planet (folder) it belongs to — all without leaving the app.*

### Folder Management
![Folders](assets/screenshots/folders.png)
*Browse and manage your folder hierarchy. Rename folders and notes with right-click context menus.*

### Built-in User Guide
![User Guide](assets/screenshots/User%20Gu%C4%B1de.png)
*An in-app guide walks you through every feature on first launch.*

---

## ✨ Features

- 🪐 **Solar System Overview** — Top-level folders rendered as glowing, animated planets in space
- 🌍 **Planet Surface View** — Drill into any planet to see its contents as Voronoi-subdivided territories
- ⚡ **Instant Vault Scanning** — Point to any Obsidian vault; the app recursively scans all `.md` files and folders
- 🔗 **One-click Obsidian Integration** — Click any note to open it directly in Obsidian via `obsidian://` URI
- ✏️ **Quick Note Creation** — Create new notes from inside the app; they appear on the planet immediately after rescan
- 📝 **Rename Notes & Folders** — Right-click context menu for renaming without leaving the visualization
- 🗺️ **Breadcrumb Navigation** — Always know where you are with a full path breadcrumb (Vault → Planet → Region → …)
- 🌐 **i18n Support** — Internationalization infrastructure already in place (`src/renderer/src/i18n/`)
- 💾 **Persistent Settings** — Vault path and preferences saved via `electron-store`
- 🧪 **Test Suite** — Unit and property-based tests with Vitest, React Testing Library, and fast-check
- 🌌 **Animated Starfield** — CSS-animated twinkling stars in the solar system background for an immersive feel
- 📦 **Windows Installer** — One-command build to a Windows `.exe` installer via electron-builder + NSIS

---

## 🔄 How It Works

```
1. Launch the app → Electron creates a BrowserWindow
                        │
2. You select your Obsidian vault folder
                        │
3. vaultScanner.ts recursively scans the vault
   ├─ Reads all .md files
   ├─ Maps folder hierarchy (countries → cities → towns → homes)
   └─ Sends the result to the renderer via IPC
                        │
4. Renderer receives the hierarchy → writes it to the Zustand store
                        │
5. VoronoiMap.tsx renders the visualization:
   ├─ depth 0 → SOLAR SYSTEM MODE
   │   Each top-level folder = a planet with glow, name, and note count
   │   Planets are placed in a circular orbit with animated stars
   │
   └─ depth > 0 → PLANET SURFACE MODE
       Voronoi tessellation subdivides the planet's area
       Each cell = a sub-folder or note
       Click a cell to drill deeper or open the note in Obsidian
                        │
6. Navigate with breadcrumbs, back button, or click to drill down/up
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                  MAIN PROCESS (Electron)              │
│                                                       │
│  index.ts ─────── Creates BrowserWindow, app lifecycle│
│  vaultScanner.ts ─ Recursively scans Obsidian vault   │
│  fileSystem.ts ─── File read/write operations         │
│  ipcHandlers.ts ── IPC channel definitions            │
│  store.ts ──────── electron-store (persistent config) │
├──────────────────────────────────────────────────────┤
│                  PRELOAD (Bridge Layer)                │
│           Secure IPC channels via contextBridge       │
├──────────────────────────────────────────────────────┤
│                RENDERER PROCESS (React)               │
│                                                       │
│  Components:                                          │
│   ├─ VoronoiMap.tsx ── Solar system + planet surface  │
│   ├─ WorldMap.tsx ──── D3-geo world map (alt view)    │
│   ├─ MapCanvas.tsx ─── Canvas-based grid view         │
│   ├─ NavBar.tsx ────── Breadcrumb navigation          │
│   ├─ WelcomeScreen ── Vault selection on first launch │
│   ├─ CreateNoteDialog  Quick note creation            │
│   └─ RenameDialog ─── Rename notes/folders            │
│                                                       │
│  State: Zustand (mapStore)                            │
│  Geo:   D3-geo, D3-delaunay, D3-polygon, Turf.js     │
│  i18n:  Custom translation layer                      │
│  Utils: obsidianUrl.ts (Obsidian URI builder)         │
└──────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Electron 31 | Cross-platform desktop shell |
| **Bundler** | electron-vite 2 | Electron + Vite integration with HMR |
| **UI** | React 18 | Component-based user interface |
| **Language** | TypeScript 5.5 | Type-safe development |
| **State** | Zustand 4 | Lightweight global state management |
| **Geo Rendering** | D3-geo, D3-delaunay, D3-polygon | Geographic projections, Voronoi tessellation |
| **Geo Computation** | Turf.js (bbox, voronoi, intersect, helpers) | Spatial algorithms for planet subdivision |
| **Map Data** | TopoJSON, world-atlas, world-geojson | Real-world geographic data for the world map view |
| **Storage** | electron-store | Persistent app settings (vault path, preferences) |
| **Testing** | Vitest + React Testing Library + fast-check | Unit, integration, and property-based tests |
| **Packaging** | electron-builder (NSIS) | Windows installer generation |

---

## 📂 Project Structure

```text
Mind-Map-Planet-/
├── assets/
│   └── screenshots/             # App screenshots for README
├── scripts/                     # Helper scripts
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # App entry point, BrowserWindow setup
│   │   ├── vaultScanner.ts      # Obsidian vault recursive scanner
│   │   ├── fileSystem.ts        # File I/O operations
│   │   ├── ipcHandlers.ts       # IPC channel handlers (main ↔ renderer)
│   │   └── store.ts             # electron-store configuration
│   ├── preload/                 # Secure IPC bridge (contextBridge)
│   ├── renderer/
│   │   └── src/
│   │       ├── App.tsx          # Root component & routing logic
│   │       ├── main.tsx         # React entry point
│   │       ├── index.css        # Global styles
│   │       ├── components/      # UI components
│   │       │   ├── VoronoiMap.tsx/css    # 🪐 Solar system + planet view
│   │       │   ├── WorldMap.tsx          # 🌍 D3 world map (alt view)
│   │       │   ├── MapCanvas.tsx         # Canvas-based grid view
│   │       │   ├── NavBar.tsx/css        # Breadcrumb navigation
│   │       │   ├── WelcomeScreen.tsx/css # First-launch vault picker
│   │       │   ├── CreateNoteDialog.tsx/css
│   │       │   └── RenameDialog.tsx/css
│   │       ├── hooks/           # Custom React hooks
│   │       ├── store/           # Zustand stores
│   │       ├── types/           # TypeScript type definitions
│   │       ├── utils/           # Utility functions
│   │       │   └── obsidianUrl.ts  # Obsidian URI builder
│   │       ├── i18n/            # Internationalization / translations
│   │       └── assets/          # Static assets
│   └── tests/                   # Vitest test suites
├── electron.vite.config.ts      # electron-vite config
├── vite.config.ts               # Vite config
├── tsconfig.json                # Root TypeScript config
├── tsconfig.node.json           # Main process TS config
├── tsconfig.web.json            # Renderer TS config
└── package.json
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** v18+ (LTS recommended)
- **npm** v9+ (or yarn / pnpm)

```bash
node -v   # Should be v18.0.0 or higher
npm -v    # Should be v9.0.0 or higher
```

### Installation

```bash
# Clone the repository
git clone https://github.com/carus10/Mind-Map-Planet-.git
cd Mind-Map-Planet-

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

This launches the Electron app in development mode with hot-reload. Any code changes will reflect immediately.

### Production Build

```bash
# Build only
npm run build

# Build + generate Windows installer (.exe)
npm run dist:win
```

The installer will be generated in the `release/` directory.

### Testing

```bash
# Run all tests
npm test

# Run tests in watch mode (during development)
npm run test:watch
```

---

## 🗺️ Roadmap

- [ ] 🔍 Search & filtering across all notes
- [ ] 📂 Advanced folder management (drag-and-drop reorder, favorites)
- [ ] 📤 Export / backup (JSON, file-based)
- [ ] 🎨 Theme support (dark / light mode toggle)
- [ ] 🏷️ Tag-based visualization
- [ ] 📌 Pin frequently accessed notes
- [ ] 📝 Edit history tracking
- [ ] 🔗 Visualize links between notes as orbital paths
- [ ] 🌐 Multi-language UI support

---

## 🤝 Contributing

Contributions are welcome! Here's how:

1. **Fork** this repository
2. Create a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. Commit your changes:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
4. Push the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. Open a **Pull Request**

### Commit Convention

| Prefix | Usage |
|--------|-------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation change |
| `style:` | Code formatting (no functional change) |
| `refactor:` | Code restructuring |
| `test:` | Adding or updating tests |

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Mind Map Planet** — Explore your knowledge like a universe. 🪐

Built by [@carus10](https://github.com/carus10)

⭐ Star this repo if you find it useful!

</div>