# dsh-claude-migrator

**Claude → DeepSeek Harness (DSH) config migration plugin (clean publishable template)**

Auto-loads Claude configuration (`.claude/skills`, `.claude/rules`, `.mcp.json`, `CLAUDE.md`) from your **user home directory** and **project root** into DSH — zero dragging, zero setup. Ships a full dashboard (Skills / Rules / MCP servers / connection status) with light/dark theme support.

> This repo is a **clean, publishable template**: it carries no project-specific skills/rules/MCP. Fork it, drop in your own configs, and publish.

## Features

| Capability | Description |
|------|------|
| **Skills auto-loading** | `SKILL.md` files from user `~/.agents/skills` / `~/.claude/skills`, project root `.claude/skills`, and `.dsh/dsh-claude-migrator/skills/` register into DSH; the model auto-loads them by `whenToUse` |
| **Rules auto-conversion** | `.claude/rules/*.md` auto-convert to skills (`paths` semantics preserved in `whenToUse`) |
| **Real MCP connections** | `.mcp.json` at user / project / plugin level is **dynamically registered as `dsh-mcp-client` instances** at startup (real connections + auto-reconnect); `${VAR}` placeholders expand to environment variables |
| **CLAUDE.md native support** | Nothing to do: DSH's `dsh-agent-instructions` loads it by default (`AGENTS.md`/`CLAUDE.md`) |
| **Full dashboard** | Sidebar "CLAUDE Config Center" entry + workspace "⋯" menu: Skills / Rules / MCP lists + connection status (🟢 connected / 🟡 connecting / ⚪ disabled) |
| **Collapsible sections** | Skills / Rules / MCP sections collapse independently (collapsed by default; manual state survives refreshes) |
| **Theme-aware** | Colors ride `--dsh-cm-*` CSS variables and switch with `body[data-ds-dark-theme]` |
| **Workspace isolation** | Skills wake per-workspace via a provider mechanism — project `.claude/skills` work without cross-project leakage; the dashboard follows the active workspace |

## Directory layout

```
dsh-claude-migrator/
├── package.json         # dsh.bundle.patch → cordis.patch.yml; exports "." / "./client"
├── cordis.patch.yml     # plugin row + commented MCP config templates
├── src/index.js         # host: scan skills/rules/mcp + dynamic MCP registration + /api/dsh-claude-dashboard
├── status/client.js     # browser: sidebar "CLAUDE Config Center" dashboard UI
├── skills/              # skills shipped with the plugin go here
├── import/              # drop-in directory for Claude configs (see its README)
├── README.md            # this file (Chinese)
├── README_EN.md         # this file (English)
├── USAGE.md             # detailed usage guide (Chinese)
└── PUBLISH.md           # npm publishing steps (Chinese)
```

## Install

```sh
# Local link install (dev, changes apply live)
dsh plugin --profile web add "link:<absolute path to this plugin>"

# After publishing to npm
dsh plugin --profile web add dsh-claude-migrator
```

**Restart `dsh web`** afterwards. Verify:

```sh
dsh --profile web --dump-config | grep -i "claude-migrator"
# expect the dsh-claude-migrator plugin row
```

## Usage

1. Existing project-root Claude configs (`.claude/`, `.mcp.json`, `CLAUDE.md`) **work as-is** — no moving files.
2. Global configs in your home directory (`~/.agents/skills`, `~/.claude/skills`, etc.) are **merged automatically**.
3. Open the sidebar **"CLAUDE Config Center"** to browse Skills / Rules / MCP lists and connection status (sections are collapsible).

## Uninstall

```sh
dsh plugin --profile web remove dsh-claude-migrator
```

## Docs

- **[USAGE.md](USAGE.md)** — detailed usage (Chinese): three config levels, adding skills, configuring MCP
- **[PUBLISH.md](PUBLISH.md)** — npm publishing steps (Chinese)
