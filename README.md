# dsh-claude-migrator

> **中文** · [English](./README_EN.md)

**Claude → DeepSeek Harness (DSH) 配置迁移插件（通用示范模板）**

把 Claude 的配置（`.claude/skills`、`.claude/rules`、`.mcp.json`、`CLAUDE.md`）从**用户主目录**与**项目根**自动加载为 DSH 能力，零拖动、零配置；内置完整看板（Skills / Rules / MCP 服务器 / 连接状态），支持浅色/深色主题自适应。

> 本仓库是一个**干净的可发布模板**：不携带任何具体项目的 skills/rules/MCP，你 fork 后放入自己的配置即可发布。

---

## ✨ 功能

| 能力 | 说明 |
|------|------|
| **Skills 自动加载** | 用户 `~/.agents/skills`、`~/.claude/skills` + 项目根 `.claude/skills` + `.dsh/dsh-claude-migrator/skills/` 的 `SKILL.md` 直接进 DSH skill 注册表，模型按 `whenToUse` 自动加载 |
| **Rules 自动转换** | `.claude/rules/*.md` 自动转为 skill（`whenToUse` 保留 `paths` 路径语义） |
| **MCP 真实连接** | 用户/项目/插件三级的 `.mcp.json` 在启动时**动态注册为 dsh-mcp-client 实例**（真实连接 + 自动重连），密钥 `${VAR}` 占位符自动展开环境变量 |
| **CLAUDE.md 原生支持** | 无需处理：DSH 的 `dsh-agent-instructions` 默认加载（候选 `AGENTS.md`/`CLAUDE.md`） |
| **工作区隔离** | skill 唤醒走 provider 机制：按当前会话工作区隔离，项目级 `.claude/skills` 可正常使用且**不跨项目串扰** |
| **完整看板** | 侧边栏「CLAUDE 配置中心」入口 + 工作区「⋯」菜单：Skills / Rules / MCP 列表 + 连接状态（🟢已连接 / 🟡连接中 / ⚪禁用） |
| **来源标识** | 每个 skill/rule/MCP 卡片带「全局 / 项目 / 插件」徽标，一眼看清配置来自哪一层 |
| **点击工作区切换** | 面板跟随当前工作区自动切换，切换项目后看板实时刷新 |
| **可折叠区块** | Skills / Rules / MCP 三个区块独立折叠（默认收起，刷新后保留手动状态） |
| **主题自适应** | 颜色走 `--dsh-cm-*` CSS 变量，随 `body[data-ds-dark-theme]` 自动切换深/浅色 |

---

## 📦 安装

```sh
# 本地 link 安装（开发调试，改动实时生效）
dsh plugin --profile web add "link:<本插件绝对路径>"

# 发布到 npm 后
dsh plugin --profile web add dsh-claude-migrator
```

装完**重启 `dsh web`** 生效。验证：

```sh
dsh --profile web --dump-config | grep -i "claude-migrator"
# 应看到 dsh-claude-migrator 插件行
```

---

## 🚀 快速开始

1. **项目根原有配置直接生效**：`.claude/`、`.mcp.json`、`CLAUDE.md` 无需移动任何文件。
2. **全局配置自动合并**：用户主目录的 `~/.agents/skills`、`~/.claude/skills`、`~/.dsh/dsh-claude-migrator/` 自动进入看板与注册表。
3. **查看效果**：侧边栏「**CLAUDE 配置中心**」入口打开看板，查看 Skills / Rules / MCP 列表与连接状态（区块可折叠、来源徽标可辨层级）。

### 配置层级一览

| 层级 | 位置 | 说明 |
|------|------|------|
| **用户全局级** | `~/.agents/skills`、`~/.claude/skills`、`~/.dsh/dsh-claude-migrator/` | 本机所有项目共享 |
| **workspace 项目级** | 项目根 `.claude/`、`.mcp.json`、`.dsh/dsh-claude-migrator/` | 每个项目各自的配置，按工作区隔离 |
| **插件级** | 插件目录 `skills/`、`import/` | 随插件分发 / 发布自带 |

---

## 🧩 配置一个 MCP

`.mcp.json` 放在项目根（或 `~/.dsh/dsh-claude-migrator/.mcp.json` 全局），服务器在启动时自动注册为真实连接：

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

- `${VAR}` 占位符自动展开为**系统环境变量**（如 `${ZHIPU_KEY}`）。
- 未设置密钥的服务器自动跳过注册，不阻塞 DSH 启动。
- 连接状态看板里实时展示（🟢 已连接 / 🟡 连接中 / ⚪ 禁用）。

---

## 📁 目录结构

```
dsh-claude-migrator/
├── package.json         # dsh.bundle.patch → cordis.patch.yml；exports "." / "./client"
├── cordis.patch.yml     # 插件行 + MCP 配置模板（注释）
├── src/index.js         # host 端：扫描 skills/rules/mcp + 动态注册 MCP + /api/dsh-claude-dashboard
├── status/client.js     # browser 端：侧边栏「CLAUDE 配置中心」看板 UI
├── skills/              # 随插件分发的 skill 放这里
├── import/              # 拖入 Claude 配置的入口目录（含 README 说明）
├── README.md            # 本文件（中文）
├── README_EN.md         # 英文版
└── USAGE.md             # 使用指南：三级配置区、新增 skill、配置 MCP
```

---

## ❓ 常见问题

| 问题 | 说明 |
|------|------|
| 新增 skill 后模型看不到？ | ① 目录名用 kebab-case、SKILL.md 含 `name`/`description`；② 只扫一层目录；③ 改完重启 `dsh web` |
| MCP 一直「连接中」？ | ① 检查对应环境变量是否设置；② 密钥/地址是否正确；③ 看日志确认重连状态 |
| 不同项目配置互相串扰？ | 不会：skill 按工作区隔离唤醒，看板按当前工作区显示 |
| 插件改了源码不生效？ | `link:` 方式改动实时可见；`file:` 方式会复制一份，需重新 `dsh plugin add` |

---

## 🗑️ 卸载

```sh
dsh plugin --profile web remove dsh-claude-migrator
```

---

## 📚 文档

- **[USAGE.md](USAGE.md)** — 详细使用：三级配置区、如何新增 skill、如何配置 MCP

## 📄 许可

[MIT](./LICENSE)
