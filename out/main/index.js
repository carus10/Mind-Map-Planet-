"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const is = {
  dev: !electron.app.isPackaged
};
const platform = {
  isWindows: process.platform === "win32",
  isMacOS: process.platform === "darwin",
  isLinux: process.platform === "linux"
};
const electronApp = {
  setAppUserModelId(id) {
    if (platform.isWindows)
      electron.app.setAppUserModelId(is.dev ? process.execPath : id);
  },
  setAutoLaunch(auto) {
    if (platform.isLinux)
      return false;
    const isOpenAtLogin = () => {
      return electron.app.getLoginItemSettings().openAtLogin;
    };
    if (isOpenAtLogin() !== auto) {
      electron.app.setLoginItemSettings({
        openAtLogin: auto,
        path: process.execPath
      });
      return isOpenAtLogin() === auto;
    } else {
      return true;
    }
  },
  skipProxy() {
    return electron.session.defaultSession.setProxy({ mode: "direct" });
  }
};
const optimizer = {
  watchWindowShortcuts(window, shortcutOptions) {
    if (!window)
      return;
    const { webContents } = window;
    const { escToCloseWindow = false, zoom = false } = shortcutOptions || {};
    webContents.on("before-input-event", (event, input) => {
      if (input.type === "keyDown") {
        if (!is.dev) {
          if (input.code === "KeyR" && (input.control || input.meta))
            event.preventDefault();
        } else {
          if (input.code === "F12") {
            if (webContents.isDevToolsOpened()) {
              webContents.closeDevTools();
            } else {
              webContents.openDevTools({ mode: "undocked" });
              console.log("Open dev tool...");
            }
          }
        }
        if (escToCloseWindow) {
          if (input.code === "Escape" && input.key !== "Process") {
            window.close();
            event.preventDefault();
          }
        }
        if (!zoom) {
          if (input.code === "Minus" && (input.control || input.meta))
            event.preventDefault();
          if (input.code === "Equal" && input.shift && (input.control || input.meta))
            event.preventDefault();
        }
      }
    });
  },
  registerFramelessWindowIpc() {
    electron.ipcMain.on("win:invoke", (event, action) => {
      const win = electron.BrowserWindow.fromWebContents(event.sender);
      if (win) {
        if (action === "show") {
          win.show();
        } else if (action === "showInactive") {
          win.showInactive();
        } else if (action === "min") {
          win.minimize();
        } else if (action === "max") {
          const isMaximized = win.isMaximized();
          if (isMaximized) {
            win.unmaximize();
          } else {
            win.maximize();
          }
        } else if (action === "close") {
          win.close();
        }
      }
    });
  }
};
const HIDDEN_PATTERN = /^\./;
const TAG_COLORS = {
  "#red": "#f44336",
  "#blue": "#2196f3",
  "#green": "#4caf50",
  "#yellow": "#ffeb3b",
  "#purple": "#9c27b0",
  "#orange": "#ff9800",
  "#pink": "#e91e63",
  "#important": "#d32f2f",
  "#todo": "#ffb300"
};
function extractFirstLines(text, count) {
  const noFrontmatter = text.replace(/^---\n[\s\S]*?\n---\n/, "");
  const lines = noFrontmatter.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);
  return lines.slice(0, count).join(" ").slice(0, 150);
}
function parseMarkdownNode(fullPath, stat, relPath, entry) {
  let color = null;
  let preview = "";
  let links = [];
  const weight = Math.max(500, stat.size);
  try {
    const fd = fs.openSync(fullPath, "r");
    const buffer = Buffer.alloc(4096);
    const bytesRead = fs.readSync(fd, buffer, 0, 4096, 0);
    fs.closeSync(fd);
    if (bytesRead > 0) {
      const content = buffer.toString("utf8", 0, bytesRead);
      const colorMatch = content.match(/^color:\s*['"]?([^'"\n]+)['"]?/m);
      if (colorMatch) {
        color = colorMatch[1].trim();
      }
      if (!color) {
        const tagMatch = content.match(/#[a-zA-Z0-9_-]+/g);
        if (tagMatch) {
          for (const tag of tagMatch) {
            const lowerTag = tag.toLowerCase();
            if (TAG_COLORS[lowerTag]) {
              color = TAG_COLORS[lowerTag];
              break;
            }
          }
        }
      }
      preview = extractFirstLines(content, 3);
      const linkRegex = /\[\[(.*?)\]\]/g;
      let match;
      while ((match = linkRegex.exec(content)) !== null) {
        let linkTarget = match[1].split("|")[0].trim();
        if (linkTarget) {
          links.push(linkTarget);
        }
      }
    }
  } catch (err) {
    console.error("Failed to parse markdown node:", fullPath, err);
  }
  return {
    id: relPath,
    name: path.basename(entry, ".md"),
    absolutePath: fullPath,
    relativePath: relPath,
    type: "home",
    children: [],
    isEmpty: stat.size === 0,
    weight,
    color,
    preview,
    links
  };
}
function isHidden(name) {
  return HIDDEN_PATTERN.test(name);
}
function scanDirectory(dirPath, vaultPath, depth) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath);
  } catch {
    return [];
  }
  const nodes = [];
  for (const entry of entries) {
    if (isHidden(entry)) continue;
    const fullPath = path.join(dirPath, entry);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch {
      continue;
    }
    const relPath = path.relative(vaultPath, fullPath).replace(/\\/g, "/");
    if (stat.isDirectory()) {
      if (depth > 3) continue;
      const type = depth === 1 ? "country" : depth === 2 ? "city" : "town";
      const children = scanDirectory(fullPath, vaultPath, depth + 1);
      const dirWeight = children.reduce((sum, child) => sum + (child.weight || 0), 0);
      const dirLinks = [];
      for (const child of children) {
        if (child.links) {
          dirLinks.push(...child.links);
        }
      }
      const uniqueLinks = Array.from(new Set(dirLinks));
      nodes.push({
        id: relPath,
        name: entry,
        absolutePath: fullPath,
        relativePath: relPath,
        type,
        children,
        isEmpty: children.length === 0,
        weight: Math.max(1e3, dirWeight),
        // Folders have a minimum baseline weight
        links: uniqueLinks
      });
    } else if (path.extname(entry).toLowerCase() === ".md") {
      nodes.push(parseMarkdownNode(fullPath, stat, relPath, entry));
    }
  }
  return nodes;
}
function scanVault(vaultPath) {
  const countries = scanDirectory(vaultPath, vaultPath, 1);
  return {
    vaultPath,
    vaultName: path.basename(vaultPath),
    scannedAt: Date.now(),
    countries
  };
}
function renameNode(oldPath, newName) {
  try {
    const newPath = path.join(path.dirname(oldPath), newName);
    fs.renameSync(oldPath, newPath);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
function createNote(folderPath, noteName) {
  try {
    const filename = noteName.endsWith(".md") ? noteName : `${noteName}.md`;
    const newPath = path.join(folderPath, filename);
    fs.writeFileSync(newPath, "", "utf-8");
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
function moveNode(sourcePath, targetFolderPath) {
  try {
    const filename = path.basename(sourcePath);
    const newPath = path.join(targetFolderPath, filename);
    fs.renameSync(sourcePath, newPath);
    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
const defaults = {
  vaultPath: null,
  camera: { x: 0, y: 0, scale: 1 },
  navigation: { level: "world", selectedCountry: null, selectedCity: null, selectedTown: null },
  language: "en"
};
const store = new Store({ defaults });
function registerIpcHandlers() {
  electron.ipcMain.handle("vault:select", async () => {
    const result = await electron.dialog.showOpenDialog({ properties: ["openDirectory"] });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
  electron.ipcMain.handle("vault:scan", (_e, vaultPath) => {
    if (!fs.existsSync(vaultPath)) return null;
    return scanVault(vaultPath);
  });
  electron.ipcMain.handle("file:rename", (_e, oldPath, newName) => {
    return renameNode(oldPath, newName);
  });
  electron.ipcMain.handle("file:create", (_e, folderPath, noteName) => {
    return createNote(folderPath, noteName);
  });
  electron.ipcMain.handle("file:move", (_e, sourcePath, targetFolderPath) => {
    return moveNode(sourcePath, targetFolderPath);
  });
  electron.ipcMain.handle("obsidian:open", async (_e, url) => {
    try {
      await electron.shell.openExternal(url);
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  });
  electron.ipcMain.handle("geo:admin1", () => {
    try {
      let filePath = path.join(__dirname, "../renderer/ne_10m_admin_1.json");
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, "../../src/renderer/public/ne_10m_admin_1.json");
      }
      if (!fs.existsSync(filePath)) {
        filePath = path.join(__dirname, "../../src/renderer/src/assets/ne_10m_admin_1.json");
      }
      if (!fs.existsSync(filePath)) {
        console.error("[geo:admin1] File not found at any path");
        return null;
      }
      console.log("[geo:admin1] Loading from:", filePath);
      const raw = fs.readFileSync(filePath, "utf8");
      return JSON.parse(raw);
    } catch (err) {
      console.error("[geo:admin1] Error:", err);
      return null;
    }
  });
  electron.ipcMain.handle("store:get", (_e, key) => store.get(key));
  electron.ipcMain.handle("store:set", (_e, key, value) => {
    store.set(key, value);
  });
}
function createWindow() {
  const mainWindow = new electron.BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0f0f1a",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });
  mainWindow.on("ready-to-show", () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler((details) => {
    electron.shell.openExternal(details.url);
    return { action: "deny" };
  });
  if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}
electron.app.whenReady().then(() => {
  electronApp.setAppUserModelId("com.mindmapworld");
  electron.app.on("browser-window-created", (_, window) => optimizer.watchWindowShortcuts(window));
  registerIpcHandlers();
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
