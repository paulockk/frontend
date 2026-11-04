const { app, BrowserWindow, dialog, ipcMain, net, protocol, shell } = require("electron");
const { fork } = require("node:child_process");
const { randomBytes } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const Database = require("better-sqlite3");

protocol.registerSchemesAsPrivileged([{ scheme: "stockflow", privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
let backendProcess;
let backendExited = false;
let quitting = false;
let mainWindow;
let currentApiPort;
let localApiPort;
app.setName("Stockflow");

function registerAppProtocol() {
  const root = path.resolve(app.getAppPath(), "dist");
  protocol.handle("stockflow", async (request) => {
    const url = new URL(request.url);
    const relative = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
    if (url.pathname.startsWith("/api/")) {
      if (!localApiPort) return new Response("API unavailable", { status: 503 });
      const method = request.method.toUpperCase();
      const options = { method, headers: request.headers };
      if (method !== "GET" && method !== "HEAD") options.body = await request.arrayBuffer();
      return net.fetch(`http://127.0.0.1:${localApiPort}${url.pathname}${url.search}`, options);
    }
    const target = path.resolve(root, relative);
    if (target !== root && !target.startsWith(`${root}${path.sep}`)) return new Response("Not found", { status: 404 });
    return net.fetch(pathToFileURL(target).toString());
  });
}

function startBackend() {
  const serverPath = path.join(app.getAppPath(), "electron", "backend", "server.js");
  const migrationsPath = path.join(app.getAppPath(), "electron", "backend", "migrations-sqlite");
  backendProcess = fork(serverPath, [], {
    execPath: process.execPath,
    env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", NODE_ENV: "production", HOST: "127.0.0.1", PORT: "0",
      JWT_SECRET: randomBytes(32).toString("hex"), CORS_ORIGINS: app.isPackaged ? "stockflow://app" : "http://127.0.0.1:5174",
      STOCKFLOW_DB_PATH: path.join(app.getPath("userData"), "stockflow.db"), STOCKFLOW_MIGRATIONS_PATH: migrationsPath },
    silent: true,
  });
  backendExited = false;
  return new Promise((resolve, reject) => {
    let output = "";
    let errorOutput = "";
    let backendReady = false;
    const startupError = (message) => {
      const details = errorOutput.trim().slice(-3000);
      return new Error(details ? `${message}\n\nDetalhes técnicos:\n${details}` : message);
    };
    const timeout = setTimeout(() => reject(startupError("A API local demorou para iniciar.")), 30000);
    const finish = (error, port) => {
      clearTimeout(timeout);
      if (error) backendProcess.stdout.removeListener("data", onOutput);
      else backendReady = true;
      error ? reject(error) : resolve(port);
    };
    const onOutput = (chunk) => {
      if (backendReady) {
        console.log("[Stockflow API]", chunk.toString("utf8").trim());
        return;
      }
      output += chunk.toString("utf8");
      const match = output.match(/STOCKFLOW_READY:(\d+)/);
      if (match) finish(null, Number(match[1]));
      if (output.length > 8192) output = output.slice(-4096);
    };
    backendProcess.stdout.on("data", onOutput);
    backendProcess.stderr.on("data", (chunk) => {
      const message = chunk.toString("utf8");
      errorOutput = `${errorOutput}${message}`.slice(-6000);
      console.error("[Stockflow API]", message.trim());
    });
    backendProcess.once("error", (error) => finish(error));
    backendProcess.once("exit", (code) => {
      backendExited = true;
      if (!quitting) finish(startupError(`A API local encerrou ao iniciar (código ${code ?? "sem código"}).`));
    });
  });
}

function stopBackend() {
  if (!backendProcess || backendExited) return Promise.resolve();
  return new Promise((resolve) => {
    backendProcess.once("exit", resolve);
    backendProcess.kill();
  });
}

function createWindow(apiPort) {
  const window = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 680, show: false, backgroundColor: "#f8fafc",
    webPreferences: { preload: path.join(__dirname, "preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow = window;
  currentApiPort = apiPort;
  window.once("ready-to-show", () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("https://") || url.startsWith("http://")) void shell.openExternal(url);
    return { action: "deny" };
  });
  const apiUrl = app.isPackaged ? "stockflow://app/api/v1" : `http://127.0.0.1:${apiPort}/api/v1`;
  const query = `?api=${encodeURIComponent(apiUrl)}`;
  if (app.isPackaged) void window.loadURL(`stockflow://app/index.html${query}`);
  else void window.loadURL(`http://127.0.0.1:5174${query}`);
}

function isTrustedSender(event) {
  const frame = event.senderFrame;
  if (!frame || frame.parent) return false;
  try {
    const url = new URL(frame.url);
    return (url.protocol === "stockflow:" && url.hostname === "app")
      || (url.protocol === "http:" && url.hostname === "127.0.0.1" && url.port === "5174");
  } catch { return false; }
}

ipcMain.handle("app:get-version", () => app.getVersion());
ipcMain.handle("backup:export", async (event) => {
  if (!isTrustedSender(event)) throw new Error("Origem não autorizada.");
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: "Exportar backup do Stockflow", defaultPath: "stockflow-backup.db",
    filters: [{ name: "Banco SQLite", extensions: ["db"] }],
  });
  if (canceled || !filePath) return { success: false, canceled: true };
  const source = new Database(path.join(app.getPath("userData"), "stockflow.db"), { readonly: true, fileMustExist: true });
  try { await source.backup(filePath); } finally { source.close(); }
  return { success: true, canceled: false };
});

ipcMain.handle("backup:restore", async (event) => {
  if (!isTrustedSender(event)) throw new Error("Origem não autorizada.");
  const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
    title: "Restaurar backup do Stockflow", properties: ["openFile"],
    filters: [{ name: "Banco SQLite", extensions: ["db", "sqlite", "sqlite3"] }],
  });
  if (canceled || !filePaths[0]) return { success: false, canceled: true };
  const selected = filePaths[0];
  const prepared = path.join(app.getPath("userData"), `restore-${randomBytes(6).toString("hex")}.db`);
  const userData = app.getPath("userData");
  const databasePath = path.join(userData, "stockflow.db");
  let source;
  try {
    source = new Database(selected, { readonly: true, fileMustExist: true });
    const check = source.pragma("quick_check", { simple: true });
    const names = source.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
    if (check !== "ok" || !["users", "products", "stock", "settings", "__drizzle_migrations"].every((name) => names.includes(name))) {
      throw new Error("O arquivo selecionado não é um backup válido do Stockflow.");
    }
    await source.backup(prepared);
  } finally { source?.close(); }

  const answer = await dialog.showMessageBox(mainWindow, {
    type: "warning", buttons: ["Cancelar", "Restaurar"], defaultId: 0, cancelId: 0,
    title: "Substituir os dados locais?",
    message: "A restauração substituirá os dados atuais deste computador.",
    detail: "Uma cópia de segurança dos dados atuais será mantida na pasta de dados do Stockflow.",
  });
  if (answer.response !== 1) { fs.rmSync(prepared, { force: true }); return { success: false, canceled: true }; }

  const backupDir = path.join(userData, "backups");
  fs.mkdirSync(backupDir, { recursive: true });
  const safetyCopy = path.join(backupDir, `before-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.db`);
  await stopBackend();
  let movedOriginal = false;
  const previous = `${databasePath}.previous-${randomBytes(6).toString("hex")}`;
  try {
    const live = new Database(databasePath);
    live.pragma("wal_checkpoint(TRUNCATE)");
    await live.backup(safetyCopy);
    live.close();
    fs.renameSync(databasePath, previous);
    movedOriginal = true;
    fs.renameSync(prepared, databasePath);
    const port = await startBackend();
    currentApiPort = port;
    localApiPort = port;
    if (mainWindow) void mainWindow.loadURL(app.isPackaged
      ? `stockflow://app/index.html?api=${encodeURIComponent("stockflow://app/api/v1")}`
      : `http://127.0.0.1:5174?api=${encodeURIComponent(`http://127.0.0.1:${port}/api/v1`)}`);
    return { success: true, canceled: false };
  } catch (error) {
    if (movedOriginal && fs.existsSync(previous)) {
      if (fs.existsSync(databasePath)) fs.renameSync(databasePath, `${databasePath}.failed-${randomBytes(4).toString("hex")}`);
      fs.renameSync(previous, databasePath);
    }
    const port = await startBackend().catch(() => null);
    if (port) { currentApiPort = port; localApiPort = port; }
    throw error;
  } finally { fs.rmSync(prepared, { force: true }); }
});
app.whenReady().then(async () => {
  registerAppProtocol();
  const apiPort = await startBackend();
  localApiPort = apiPort;
  createWindow(apiPort);
  app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(currentApiPort); });
}).catch((error) => {
  dialog.showErrorBox("Stockflow", error instanceof Error ? error.message : "Não foi possível iniciar o Stockflow.");
  app.quit();
});
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", (event) => {
  if (!backendProcess || backendExited || quitting) return;
  event.preventDefault();
  quitting = true;
  backendProcess.once("exit", () => app.quit());
  backendProcess.kill();
});
