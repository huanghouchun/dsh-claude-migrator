# awesome-dsh-plugin PR 修改内容（基于原始 README 精确生成）

> 使用方法：打开你 fork 后的 `README.md`，点 ✏️ 编辑，按下面「位置」定位到对应行，粘贴「插入内容」，然后 Commit → Open Pull Request。

---

## 修改 1：场景选型表插入一行

**位置**：`## 🎯 我想让 DSH 做什么？` 表格中，在「把其他工具的历史会话搬进 DSH」（`dsh-chat-import` 那一行）之后、「换皮肤、自定义背景」之前插入。

**插入内容**：

```markdown
| 从 Claude 项目迁移配置到 DSH（skills/rules/MCP 拖入即用） | [dsh-claude-migrator](https://www.npmjs.com/package/dsh-claude-migrator) | 把 .claude/skills、.claude/rules、.mcp.json、CLAUDE.md 拖进插件 import/ 目录即自动加载为 DSH 能力，内置 skills/rules/MCP 连接状态看板（浅色/深色主题自适应），一条命令安装。 |
```

---

## 修改 2：作者自荐区追加一条

**位置**：`## 📣 作者自荐` 列表**末尾**（在 `dsh-vision-router` 那条之后）追加。

**插入内容**（⚠️ 把 `<你的GitHub用户名>` 替换为你的真实用户名；若尚未把插件推到 GitHub 仓库，链接先用 npm 包地址）：

```markdown
- **[dsh-claude-migrator](https://github.com/<你的GitHub用户名>/dsh-claude-migrator)**（[@<你的GitHub用户名>](https://github.com/<你的GitHub用户名>) · 2026-08-15）— Claude → DSH 配置迁移插件：把 .claude/skills、.claude/rules、.mcp.json、CLAUDE.md 拖进插件 import/ 目录即自动加载，rules 自动转 skill（whenToUse 保留 paths 路径语义），MCP 密钥走环境变量占位符；内置完整看板（Skills / Rules / MCP 服务器 / 连接状态，已连接绿色标签，主题自适应）。npm 安装：`dsh plugin --profile web add dsh-claude-migrator`。
```

---

## 备用：如果你更想放在「最近加入生态」表

**位置**：`## 🆕 最近加入生态` 表格末尾追加一行。

**插入内容**：

```markdown
| [dsh-claude-migrator](https://www.npmjs.com/package/dsh-claude-migrator) | Claude → DSH 配置迁移：拖入 .claude/skills、.claude/rules、.mcp.json、CLAUDE.md 即自动加载，内置 skills/rules/MCP 连接状态看板 | 2026-08-15 |
```

---

## PR 信息

- **标题**：`docs: 添加 dsh-claude-migrator（Claude → DSH 配置迁移插件）`
- **描述**：

```markdown
## 新增插件登记

**dsh-claude-migrator** — Claude → DeepSeek Harness (DSH) 配置迁移插件

- npm：https://www.npmjs.com/package/dsh-claude-migrator
- 功能：把 .claude/skills、.claude/rules、.mcp.json、CLAUDE.md 拖入插件 import/ 目录即自动加载为 DSH 能力
- 内置完整看板：Skills / Rules / MCP 服务器 / 连接状态（已连接绿色标签，浅色/深色主题自适应）
- 安装：`dsh plugin --profile web add dsh-claude-migrator`
- 许可证：MIT
```
