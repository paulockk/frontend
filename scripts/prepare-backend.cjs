const fs = require("node:fs");
const path = require("node:path");

const backendRoot = path.resolve(__dirname, "../../invenza-backend");
const output = path.resolve(__dirname, "../electron/backend");
const server = path.join(backendRoot, "dist", "server.js");
const migrations = path.join(backendRoot, "src", "db", "migrations-sqlite");

if (!fs.existsSync(server) || !fs.existsSync(migrations)) {
  throw new Error("Compile o backend e gere as migrations SQLite antes de preparar o desktop.");
}

fs.mkdirSync(output, { recursive: true });
fs.copyFileSync(server, path.join(output, "server.js"));
fs.cpSync(migrations, path.join(output, "migrations-sqlite"), { recursive: true });
fs.writeFileSync(path.join(output, "package.json"), JSON.stringify({ type: "module" }, null, 2));
console.log("Backend local preparado para o Electron.");
