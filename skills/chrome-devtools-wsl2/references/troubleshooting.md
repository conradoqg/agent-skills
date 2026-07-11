# chrome-devtools on WSL2 — Troubleshooting

## Table of Contents
- [Connection times out on port 9222](#connection-times-out-on-port-9222)
- [Active profile: "already running" or nothing debuggable](#active-profile-already-running)
- [chrome.exe not found](#chromeexe-not-found)
- [MCP still tries to launch its own browser](#mcp-launches-its-own-browser)
- [Stale temp profile / locked profile](#stale-or-locked-profile)
- [Security notes](#security-notes)

## Connection times out on port 9222

The endpoint reports up on Windows but WSL2 cannot reach `localhost:9222`.

Root cause: WSL2 networking mode. Chrome binds the debugging port to
`127.0.0.1` on the Windows side.

- **Mirrored networking** (Windows 11 22H2+, `.wslconfig` `networkingMode=mirrored`):
  `localhost` is shared, so `http://localhost:9222` works directly. Preferred.
- **NAT mode** (default on older setups): WSL2 `localhost` is not the Windows
  `localhost`. Confirm the mode and, if you cannot switch to mirrored:
  1. Verify from WSL what the endpoint answers:
     ```bash
     curl -s --connect-timeout 3 http://localhost:9222/json/version
     ```
  2. If empty, reach the Windows host IP instead:
     ```bash
     WIN_IP=$(ip route show default | awk '{print $3}')
     curl -s --connect-timeout 3 "http://${WIN_IP}:9222/json/version"
     ```
     For the host IP to answer, Chrome must listen on all interfaces:
     add `--remote-debugging-address=0.0.0.0` to the launch flags and allow
     the port through Windows Defender Firewall. See [Security notes](#security-notes)
     before doing this.

Prefer enabling mirrored networking over exposing the debugging port.

## Active profile: already running

In `active` mode Chrome refuses to enable remote debugging when another Chrome
process already owns the live profile — the second invocation just opens a tab
in the existing (non-debuggable) process.

Fix: close every Chrome window first (check the tray too), then relaunch. To let
the script do it:
```bash
CHROME_FORCE_CLOSE=1 .kiro/skills/chrome-devtools-wsl2/scripts/launch-chrome-debug.sh active
```
`CHROME_FORCE_CLOSE=1` runs `taskkill.exe /IM chrome.exe /F`, which discards
unsaved tabs in the user's live session. Confirm with the user before forcing.

## chrome.exe not found

The default install paths were not present. Point the script at the real binary:
```bash
CHROME_EXE="/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
  .kiro/skills/chrome-devtools-wsl2/scripts/launch-chrome-debug.sh temp
```
Chrome Beta/Dev/Canary or a per-user install under
`/mnt/c/Users/<user>/AppData/Local/Google/Chrome/Application/chrome.exe`
also work.

## MCP launches its own browser

The chrome-devtools MCP, when run inside the Linux side, may try to spawn a
Linux Chrome that does not exist. Configure it to attach to the already-running
Windows Chrome instead of launching one, e.g. a browser URL of
`http://localhost:9222`. Consult the MCP's own configuration for the exact
`browserUrl` / `--browser-url` option. The launcher script only guarantees a
debuggable Chrome is listening; the MCP must be told to connect to it.

## Stale or locked profile

If launch fails with a profile-lock error:
- `temp` mode: delete the throwaway profile and retry:
  ```bash
  rm -rf "/mnt/c/Temp/chrome-debug-profile"
  ```
- `active` mode: a `SingletonLock` left by a crashed Chrome blocks reuse. Ensure
  no `chrome.exe` is running (`tasklist.exe | grep -i chrome`) before relaunch.

## Security notes

- The remote debugging protocol grants full control of the browser to anything
  that can reach the port, with no authentication. Keep it bound to
  `127.0.0.1`. Only use `--remote-debugging-address=0.0.0.0` on a trusted local
  network and remove the firewall exception afterwards.
- `active` mode exposes the user's real cookies, saved sessions, and history to
  the automation. Use it only when authenticated access is the goal, and prefer
  `temp` mode for everything else.
