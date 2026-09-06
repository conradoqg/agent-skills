#!/usr/bin/env node

import { spawn } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../..");
// Harness-only options are removed before forwarding evaluator arguments.
const evaluationArgs = [];
let fixture = resolve(import.meta.dirname, "fixtures/browser-product/server.mjs");
let app = "http://127.0.0.1:4173";
for (let index = 2; index < process.argv.length; index += 1) {
  const option = process.argv[index];
  if (option === "--fixture" || option === "--app") {
    const value = process.argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${option}`);
    if (option === "--fixture") fixture = resolve(root, value);
    else app = value;
  } else evaluationArgs.push(option);
}
if (new URL(app).protocol !== 'http:' || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(app).hostname)) {
  throw new Error('Browser fixtures must use a loopback HTTP URL.');
}
const launcher = resolve(root, "skills/chrome-devtools-wsl2/scripts/launch-chrome-debug.sh");
const endpoint = "http://127.0.0.1:9333";
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

let occupied = false;
try {
  await fetch(`${app}/health`, { signal: AbortSignal.timeout(1000) });
  occupied = true;
} catch {}
if (occupied) throw new Error(`Fixture address already in use: ${app}. Finish its owning run first.`);

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
    // Without negotiated MCP roots, file writes are limited to os.tmpdir().
    // Keep that guard and narrow its root to this candidate's evidence directory.
    ...["TEMP", "TMP", "TMPDIR"].flatMap(name => [
      "--codex-config", `mcp_servers.chrome-devtools.env.${name}="\${output_dir}"`
    ]),
    "--timeout-ms", "1200000",
    "--concurrency", "1",
    ...evaluationArgs
  ]);
  exitCode = evaluation.code ?? 1;
} finally {
  server.kill("SIGTERM");
  if (!nativeWindows) await closeDedicatedChrome();
}

process.exitCode = exitCode;
