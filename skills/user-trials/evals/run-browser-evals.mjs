#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
const fixture = resolve(import.meta.dirname, "fixtures/browser-product/server.mjs");
const launcher = resolve(root, "skills/chrome-devtools-wsl2/scripts/launch-chrome-debug.sh");
const endpoint = "http://127.0.0.1:9333";
const app = "http://127.0.0.1:4173";
const nativeWindows = process.platform === "win32";

function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd: root, windowsHide: true, stdio: options.stdio ?? "inherit", env: { ...process.env, ...(options.env ?? {}) } });
    child.on("error", reject);
    child.on("close", (code, signal) => resolveRun({ code, signal }));
  });
}

async function waitFor(url, attempts = 30) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolveWait) => setTimeout(resolveWait, 250));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function closeDedicatedChrome() {
  try {
    const version = await (await fetch(`${endpoint}/json/version`)).json();
    const socket = new WebSocket(version.webSocketDebuggerUrl);
    await new Promise((resolveSocket, reject) => {
      socket.addEventListener("open", () => socket.send(JSON.stringify({ id: 1, method: "Browser.close" })));
      socket.addEventListener("close", resolveSocket, { once: true });
      socket.addEventListener("error", reject, { once: true });
      setTimeout(resolveSocket, 2000);
    });
  } catch {}
}

const server = spawn(process.execPath, [fixture], { cwd: root, windowsHide: true, stdio: ["ignore", "pipe", "inherit"] });
server.stdout.pipe(process.stdout);

let exitCode = 1;
try {
  await waitFor(`${app}/health`);
  if (!nativeWindows) {
    const chrome = await run("bash", [launcher, "temp", app], {
      env: {
        CHROME_DEBUG_PORT: "9333",
        CHROME_TEMP_PROFILE: "C:\\Temp\\user-trials-eval-profile"
      }
    });
    if (chrome.code !== 0) throw new Error(`Chrome launcher exited with ${chrome.code ?? chrome.signal}`);
  }

  // Native Windows needs no WSL launcher. Each candidate's MCP owns a temporary
  // headless browser so parallel evaluations cannot share a persona's tab.
  const mcpArgs = nativeWindows
    ? ["/c", "npx", "--yes", "chrome-devtools-mcp@1.7.0", "--headless", "--isolated", "--viewport=1280x900"]
    : ["--yes", "chrome-devtools-mcp@1.7.0", `--browser-url=${endpoint}`];

  const evaluation = await run(process.execPath, [
    "scripts/evaluate-skills.ts",
    "--skill", "user-trials",
    "--evals", "skills/user-trials/evals/browser-evals.json",
    "--workspace", ".skill-evals/user-trials-browser",
    "--codex-config", `mcp_servers.chrome-devtools.command=${JSON.stringify(nativeWindows ? "cmd" : "npx")}`,
    "--codex-config", `mcp_servers.chrome-devtools.args=${JSON.stringify(mcpArgs)}`,
    "--timeout-ms", "1200000",
    "--concurrency", "1",
    ...process.argv.slice(2)
  ]);
  exitCode = evaluation.code ?? 1;
} finally {
  server.kill("SIGTERM");
  if (!nativeWindows) await closeDedicatedChrome();
}

process.exitCode = exitCode;
