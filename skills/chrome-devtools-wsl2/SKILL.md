---
name: chrome-devtools-wsl2
description: Set up and use the chrome-devtools MCP browser tools from inside WSL2, where Chrome must run as the Windows executable with remote debugging. Use this whenever you need to drive a browser under WSL2 — navigating pages, taking screenshots or snapshots, filling forms, running Lighthouse or performance traces, or any chrome-devtools tool — even if the user does not mention WSL2. Also use it when the user asks to test a site while logged in / authenticated, or to choose between a clean throwaway browser profile and their real Chrome profile. Do NOT use on native Linux (launch google-chrome directly there), and do NOT use for non-browser tasks.
metadata:
---

# chrome-devtools on WSL2

The chrome-devtools MCP tools (`navigate_page`, `new_page`, `take_screenshot`,
`take_snapshot`, `click`, `fill`, `performance_start_trace`, `lighthouse_audit`,
etc.) need a browser to attach to. Under WSL2 there is no usable Linux Chrome by
default, so drive the **Windows** Chrome and expose its remote-debugging endpoint
on `localhost:9222`. This skill makes that setup reliable and lets the user pick
which browser profile to use.

## Decide the profile mode first

Ask the user (or infer from the task) which profile to launch. This is the key
choice, because it changes what the browser can see:

| Mode     | Use when                                             | Profile / user-data-dir                                            | Trade-offs |
|----------|------------------------------------------------------|--------------------------------------------------------------------|-----------|
| `temp`   | Default. Anonymous testing, clean-state repro, CI.   | Isolated throwaway dir (`C:\Temp\chrome-debug-profile`)            | No logins, no extensions, no history. Safe and reproducible. |
| `active` | Accessing **authenticated** sites, existing sessions, saved passwords, extensions. | The user's real profile (`...\Google\Chrome\User Data`) | Requires **all** normal Chrome windows to be closed first; exposes real cookies/sessions to automation. |

Prefer `temp`. Choose `active` only when authenticated/session access is the
actual goal — and tell the user that their live Chrome must be closed and that
their real session becomes visible to the automation.

## Quick start

Run the bundled launcher, then use the chrome-devtools tools normally.

```bash
# Clean throwaway profile (default)
scripts/launch-chrome-debug.sh temp https://example.com

# Real profile — for logged-in / authenticated sites
scripts/launch-chrome-debug.sh active https://example.com
```

The script is idempotent: if a debuggable Chrome is already listening on the
port it reuses it instead of launching another. It exits `0` only once
`http://localhost:9222/json/version` responds, so it is safe to call right before
the first chrome-devtools tool.

## What the launcher does (and why)

1. Confirms it is running on WSL2 (`/proc/version` contains `microsoft`, or
   `WSL_DISTRO_NAME` is set). On native Linux it stops and tells you to use
   `google-chrome` directly — the Windows-executable dance is unnecessary there.
2. Reuses an existing endpoint if one already answers (avoids duplicate Chromes
   fighting over the same profile).
3. Finds `chrome.exe` in the standard install locations (override with
   `CHROME_EXE`).
4. Resolves the user-data-dir for the chosen mode. For `active` it looks up the
   Windows username and, because Chrome will not enable debugging on a profile
   another Chrome already owns, refuses to continue while Chrome is running
   (unless `CHROME_FORCE_CLOSE=1`).
5. Launches Chrome detached with `--remote-debugging-port`, `--no-first-run`,
   and `--no-default-browser-check`, then polls until the endpoint is live.

## Manual equivalent

If you need to run it by hand, this is the underlying command (temp profile):

```bash
"/mnt/c/Program Files/Google/Chrome/Application/chrome.exe" \
  --remote-debugging-port=9222 \
  --user-data-dir="C:\\Temp\\chrome-debug-profile" \
  --no-first-run --no-default-browser-check https://example.com &
```

Always check readiness with a timeout so you never hang:

```bash
curl -s --connect-timeout 3 http://localhost:9222/json/version
```

## After the browser is up

- Point the chrome-devtools MCP at the running browser (browser URL
  `http://localhost:9222`) rather than letting it spawn its own Chrome — a
  Linux-side MCP has no local Chrome to launch. See
  `references/troubleshooting.md` if the tools still open their own instance.
- Then use the tools directly: `new_page`, `navigate_page`, `take_snapshot`
  (prefer snapshots over screenshots for structure), `click`, `fill_form`, etc.

## Cleanup

- `temp` mode leaves a throwaway profile at `C:\Temp\chrome-debug-profile`;
  delete it with `rm -rf /mnt/c/Temp/chrome-debug-profile` to reset state.
- `active` mode changes nothing you need to undo, but remember the user's real
  Chrome was closed to start it — let them know they can reopen it normally.

## When things go wrong

Read `references/troubleshooting.md` for:
- port `9222` unreachable from WSL2 (mirrored vs. NAT networking, host-IP fallback),
- `active` mode "already running" errors,
- `chrome.exe` not found / non-standard installs,
- the MCP launching its own browser,
- stale/locked profiles, and
- security notes on the unauthenticated debugging port and live-profile exposure.
