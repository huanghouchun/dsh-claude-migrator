# dsh-claude-migrator

**Claude → DeepSeek Harness (DSH) 配置迁移插件（通用示范模板）**

把 Claude 项目的 `.claude/skills`、`.claude/rules`、`.mcp.json`、`CLAUDE.md` 拖入插件 `import/` 目录，即自动加载为 DSH 能力；内置完整看板（Skills / Rules / MCP 服务器 / 连接状态），支持浅色/深色主题自适应。

> 本仓库是一个**干净的可发布模板**：不携带任何具体项目的 skills/rules/MCP，你 fork 后放入自己的配置即可发布。

## 功能

| 能力 | 说明 |
|------|------|
| **Skills 自动加载** | `import/.claude/skills/`（或 `skills/`）下的 `SKILL.md` 直接进 DSH skill 目录，模型按 `whenToUse` 自动加载 |
| **Rules 自动转换** | `import/.claude/rules/*.md` 自动转为 skill（`whenToUse` 保留 `paths` 路径语义） |
| **MCP 动态读取** | `import/.mcp.json` 自动读取；也可在 `cordis.patch.yml` 静态配置，密钥走环境变量占位符 |
| **CLAUDE.md 原生支持** | 无需处理：DSH 的 `dsh-agent-instructions` 默认加载（候选 `AGENTS.md`/`CLAUDE.md`） |
| **完整看板** | 侧边栏「Claude 迁移」入口：Skills / Rules / MCP 列表 + 连接状态（🟢已连接绿色标签 / 🟡连接中 / ⚪禁用） |
| **主题自适应** | 颜色走 `--dsh-cm-*` CSS 变量，随 `body[data-ds-dark-theme]` 自动切换深/浅色 |

## 目录结构

```
dsh-claude-migrator/
├── package.json         # dsh.bundle.patch → cordis.patch.yml；exports "." / "./client"
├── cordis.patch.yml     # skill-filesystem 挂载 + 看板插件行 + MCP 配置模板
├── src/index.js         # host 端：扫描 skills/rules/mcp + /api/dsh-claude-dashboard
├── status/client.js     # browser 端：侧边栏「Claude 迁移」看板 UI
├── skills/              # 你的 skill 放这里（或 import/.claude/skills）
├── import/              # 拖入 Claude 配置的入口目录（含 README 说明）
├── README.md            # 本文件
├── USAGE.md             # 使用指南：用法 + 新增 skill + 配置 MCP
└── PUBLISH.md           # 发布到 npm 的完整步骤
```

## 安装

```sh
# 本地 link 安装（开发调试，改动实时生效）
dsh plugin --profile web add "link:<本插件绝对路径>"

# 发布到 npm 后
dsh plugin --profile web add dsh-claude-migrator
```

装完**重启 `dsh web`** 生效。验证：

```sh
dsh --profile web --dump-config | grep -i "claude-migrator"
# 应看到 skill-filesystem（providerName: claude-migrator）与 dsh-claude-migrator 插件行
```

## 使用

1. 把你的 `.claude/skills`、`.claude/rules`、`.mcp.json`、`CLAUDE.md` 拖入插件 `import/` 目录。
2. 重启 `dsh web`（或拖动后点看板「刷新」）。
3. 侧边栏「**Claude 迁移**」入口查看看板：Skills / Rules / MCP 列表与连接状态。

## 卸载

```sh
dsh plugin --profile web remove dsh-claude-migrator
```

## 文档

- **[USAGE.md](USAGE.md)** — 详细使用：如何新增 skill、如何配置 MCP
- **[PUBLISH.md](PUBLISH.md)** — 发布到 npm 插件库的完整步骤
