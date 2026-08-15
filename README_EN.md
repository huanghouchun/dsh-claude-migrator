# dsh-claude-migrator

> **English** · [中文](./README.md)

**Claude → DeepSeek Harness (DSH) config migration plugin (clean publishable template)**

Auto-loads Claude configuration (`.claude/skills`, `.claude/rules`, `.mcp.json`, `CLAUDE.md`) from your **user home directory** and **project root** into DSH — zero dragging, zero setup. Ships a full dashboard (Skills / Rules / MCP servers / connection status) with light/dark theme support.

> This repo is a **clean, publishable template**: it carries no project-specific skills/rules/MCP. Fork it, drop in your own configs, and publish.

---

## ✨ Features

| Capability | Description |
|------|------|
| **Skills auto-loading** | `SKILL.md` files from user `~/.agents/skills` / `~/.claude/skills`, project root `.claude/skills`, and `.dsh/dsh-claude-migrator/skills/` register into DSH; the model auto-loads them by `whenToUse` |
| **Rules auto-conversion** | `.claude/rules/*.md` auto-convert to skills (`paths` semantics preserved in `whenToUse`) |
| **Real MCP connections** | `.mcp.json` at user / project / plugin level is **dynamically registered as `dsh-mcp-client` instances** at startup (real connections + auto-reconnect); `${VAR}` placeholders expand to environment variables |
| **CLAUDE.md native support** | Nothing to do: DSH's `dsh-agent-instructions` loads it by default (`AGENTS.md`/`CLAUDE.md`) |
| **Workspace isolation** | Skills wake per-workspace via a provider mechanism — project `.claude/skills` work without cross-project leakage |
| **Full dashboard** | Sidebar "CLAUDE Config Center" entry + workspace "⋯" menu: Skills / Rules / MCP lists + connection status (🟢 connected / 🟡 connecting / ⚪ disabled) |
| **Source badges** | Every skill/rule/MCP card shows a "global / project / plugin" badge so you can see at a glance which layer a config comes from |
| **Auto-switch on workspace click** | The dashboard follows the active workspace and refreshes when you switch projects |
| **Collapsible sections** | Skills / Rules / MCP sections collapse independently (collapsed by default; manual state survives refreshes) |
| **Theme-aware** | Colors ride `--dsh-cm-*` CSS variables and switch with `body[data-ds-dark-theme]` |

---

## 📦 Install

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

---

## 🚀 Quick start

1. **Existing project-root configs work as-is**: `.claude/`, `.mcp.json`, `CLAUDE.md` — no moving files.
2. **Global configs merge automatically**: `~/.agents/skills`, `~/.claude/skills`, `~/.dsh/dsh-claude-migrator/` in your home directory join the registry and dashboard.
3. **See it in action**: open the sidebar **"CLAUDE Config Center"** to browse Skills / Rules / MCP lists and connection status (collapsible sections, source badges).

### Config levels

| Level | Location | Notes |
|------|------|------|
| **User global** | `~/.agents/skills`, `~/.claude/skills`, `~/.dsh/dsh-claude-migrator/` | Shared by every project on this machine |
| **Workspace project** | project root `.claude/`, `.mcp.json`, `.dsh/dsh-claude-migrator/` | Per-project configs, isolated per workspace |
| **Plugin** | plugin dir `skills/`, `import/` | Shipped with the plugin / distributed |

---

## 🧩 Configure an MCP

Put a `.mcp.json` at the project root (or `~/.dsh/dsh-claude-migrator/.mcp.json` for global). Servers auto-register as real connections at startup:

```json
{
  "mcpServers": {
    "my-server": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "my-mcp-package"],
      "env": { "MY_API_KEY": "${MY_API_KEY}" }
    }
  }
}
```

- `${VAR}` placeholders expand to **system environment variables** (e.g. `${ZHIPU_KEY}`).
- Servers without a key are skipped automatically and never block DSH startup.
- Live connection status is shown in the dashboard (🟢 connected / 🟡 connecting / ⚪ disabled).

---

## 📁 Directory layout

```
dsh-claude-migrator/
├── package.json         # dsh.bundle.patch → cordis.patch.yml; exports "." / "./client"
├── cordis.patch.yml     # plugin row + commented MCP config templates
├── src/index.js         # host: scan skills/rules/mcp + dynamic MCP registration + /api/dsh-claude-dashboard
├── status/client.js     # browser: sidebar "CLAUDE Config Center" dashboard UI
├── skills/              # skills shipped with the plugin go here
├── import/              # drop-in directory for Claude configs (see its README)
├── README.md            # Chinese
├── README_EN.md         # this file (English)
└── USAGE.md             # detailed usage guide (Chinese)
```

---

## ❓ FAQ

| Question | Answer |
|------|------|
| New skill not visible to the model? | ① Use kebab-case dir names with `name`/`description` in SKILL.md; ② only one level of nesting is scanned; ③ restart `dsh web` after changes |
| MCP stuck on "connecting"? | ① Check the corresponding environment variable; ② verify key/address; ③ check logs for reconnect state |
| Configs leaking across projects? | They don't: skills wake per-workspace and the dashboard shows the active workspace only |
| Plugin source changes not applied? | `link:` installs apply live; `file:` installs copy — re-run `dsh plugin add` |

---

## 🗑️ Uninstall

```sh
dsh plugin --profile web remove dsh-claude-migrator
```

---

## 📚 Docs

- **[USAGE.md](USAGE.md)** — detailed usage (Chinese): three config levels, adding skills, configuring MCP

## 📄 License

[MIT](./LICENSE)
