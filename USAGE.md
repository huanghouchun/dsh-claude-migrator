# dsh-claude-migrator 使用指南

本插件把 Claude 项目的配置（skills / rules / MCP / 指令 / hooks）迁移到 DeepSeek Harness (DSH)，支持**用户全局级**、**插件全局级**与**workspace 项目级**三种配置区。本文档说明：**插件如何使用**、**如何新增一个 skill**、**如何配置一个 MCP**、**如何配置 workspace 级**。

---

## 〇、三级配置区（先看这个）

dsh-claude-migrator 扫描 **三层** 配置来源，都自动合并加载（同名以先扫到的为准）：

| 层级 | 位置 | 适用 |
|------|------|------|
| **用户全局级** | 用户主目录 `~/.claude/`、`~/.agents/skills/`、`~/.dsh/dsh-claude-migrator/` | 本机所有项目共享的全局配置 |
| **插件全局级** | 插件目录 `skills/`、`import/` | 发布自带 / 随插件分发 |
| **workspace 项目级** | 项目根原有 Claude 配置 + `.dsh/dsh-claude-migrator/` | 每个项目各自的配置 |

### 用户全局级：读用户目录，而非插件目录

**全局配置中心读取用户主目录**（`C:\Users\<你>\` 下），把 `~/.claude/skills`、`~/.agents/skills`、`~/.claude/rules`、`~/.mcp.json`、`~/.dsh/dsh-claude-migrator/` 都自动合并进看板与注册表：

```
你的用户主目录/
├── .agents/
│   └── skills/              → 全局 skills（Claude 的全局 skill 安装目录）
├── .claude/
│   ├── skills/              → 全局 skills
│   └── rules/               → 全局 rules（自动转 skill）
├── .mcp.json                → 全局 MCP 服务器（可选）
└── .dsh/
    └── dsh-claude-migrator/ ← 可选扩展区（放不想进 .claude 的全局配置）
        ├── skills/  rules/  hooks/  .mcp.json  CLAUDE.md  .claude/
```

### workspace 级：直接兼容，零拖动

**在项目根原有 Claude 配置（`.claude/`、`.mcp.json`、`CLAUDE.md`）直接生效，无需移动任何文件**——Claude Code 用户切到 DSH 即用：

```
你的项目根/
├── .claude/                  ← 原有 Claude 配置（插件直接识别）
│   ├── skills/               → 自动进 DSH skill 注册表
│   └── rules/                → 自动转 skill（paths → whenToUse）
├── .mcp.json                 → 自动识别 MCP 服务器
├── CLAUDE.md                 → DSH 原生自动加载（dsh-agent-instructions）
└── .dsh/
    └── dsh-claude-migrator/  ← 可选扩展区（放不想进 .claude 的项目专属配置）
        ├── skills/           → 项目级 skills
        ├── rules/            → 项目级 rules（自动转 skill）
        ├── hooks/            → 项目级事件钩子（*.js / *.cjs）
        ├── .mcp.json         → 项目级 MCP
        └── .claude/          → 兼容的迁移来源
```

> 已验证：从项目根启动，`.claude/skills` 的 9 个 skill、`.claude/rules` 的 10 条规则、`.mcp.json` **全部自动识别并注册**，无需任何拖动或配置。

---

## 一、插件如何工作

插件通过 DSH 的 **bundle patch 层**向 web profile 注入能力：

| 部分 | 载体 | 生效方式 |
|------|------|----------|
| skills | 用户 `~/.agents/skills`、`~/.claude/skills` + 插件 `skills/`、`import/` + workspace `.dsh/dsh-claude-migrator/skills/` | 模型对话中按 `whenToUse`/`description` **自动加载** |
| rules | 用户 `~/.claude/rules` + workspace `.dsh/dsh-claude-migrator/rules/`（自动转 skill） | 按路径语义自动加载 |
| MCP 服务器 | `.mcp.json`（用户 / workspace / 插件三级）**动态注册为 dsh-mcp-client 实例** | 以 `mcp__<server>__<tool>` 工具形式供模型调用（真实连接 + 自动重连） |
| CLAUDE.md / AGENTS.md | 项目根 + `.dsh/dsh-claude-migrator/CLAUDE.md` | DSH 原生加载（`dsh-agent-instructions`） |
| hooks | workspace `.dsh/dsh-claude-migrator/hooks/*.js` | 启动时注册 DSH 事件钩子 |

**安装后无需手动操作**：模型在对话中根据任务自动引用对应 skill；MCP 工具按需被模型调用。

### 安装位置与状态检查

```sh
# 插件 bundle 是否在 profile 的 bundle 列表
dsh --profile web --dump-config | grep -i claude-migrator
# 应看到：skill-filesystem（providerName: claude-migrator）与 dsh-claude-migrator 插件行
```

### 生效前提

1. 插件已装入 web profile（见 `README.md` 安装一节）。
2. **重启 `dsh web`**：skills / MCP 配置只在进程启动时挂载。
3. MCP 需要密钥时，先设置对应环境变量（见下文「三、MCP」）。

---

## 二、如何新增一个 skill

**不需要改任何 patch 配置**。只需在 `skills/` 下新建「目录 + SKILL.md」，`skill-filesystem` 的 watcher 会自动发现（junction/link 安装时实时生效）。

### 目录结构

```
dsh-plugin/skills/
└── my-new-skill/          ← 目录名 = skill 名（必须 kebab-case，小写连字符）
    ├── SKILL.md           ← 必填，唯一入口（frontmatter + 正文）
    └── references/        ← 可选，二级资源目录
        └── detail.md
```

> ⚠️ 发现规则：`skill-filesystem` **只扫一层**，只识别 `skills/<name>/SKILL.md` 或 `skills/<name>.md`。深层嵌套（如 `skills/a/b/SKILL.md`）不会被发现。

### SKILL.md 模板

```markdown
---
name: my-new-skill
description: 触发描述 —— 写清什么场景、哪些关键词会让模型加载本 skill。例如：处理订单结算、生成周报、排查支付异常、修复 xxx 问题。
whenToUse: 可选，更明确的适用条件。例如：当用户要求「结算订单」或涉及 xxx 模块时。
metadata: 可选，附加信息（键值对）。
disable-model-invocation: false   # true 则模型不能自动调用，只能用户手动触发
user-invocable: true              # false 则用户不能手动触发
---

# My New Skill

具体指令正文……（模型加载后会看到并遵循）

需要更多细节时可引用 `references/detail.md`。
```

### frontmatter 字段说明

| 字段 | 必填 | 类型 | 说明 |
|------|------|------|------|
| `name` | ✅ | string | kebab-case，必须与目录名一致 |
| `description` | ✅ | string | 模型判断「何时加载」的唯一依据，务必写清触发场景 |
| `whenToUse` | ❌ | string | 附加触发条件（本项目 rules 转换用它承载原 `paths` 作用域） |
| `metadata` | ❌ | object | 任意附加键值 |
| `disable-model-invocation` | ❌ | bool | 默认 `false`；`true` 时模型目录中排除该 skill |
| `user-invocable` | ❌ | bool | 默认 `true`；`false` 时用户命令不可调用 |

### 实操步骤

```powershell
# 1. 新建目录（以 "my-skill" 为例）
mkdir "<插件目录>\skills\my-skill"

# 2. 创建 SKILL.md（见上方模板），填入 name/description 和正文

# 3. 生效验证
#    junction/link 安装：保存即生效（watcher 自动重扫）
#    file 安装：需重新执行 dsh plugin add
```

### 新增后如何验证

1. 确认文件可被 DSH 发现：重启 `dsh web`（或等 watcher 触发）后，在对话中提问「你有哪些 skill？」，看新 skill 是否出现在目录中。
2. 直接触发：让模型「用 my-new-skill 处理 xxx」，观察它是否加载该 skill 内容。

### 把新 skill 同步回 Claude 配置（可选）

如果希望 Claude Code 也用上同一个 skill，把目录复制到 `.claude/skills/` 即可（格式兼容）：

```powershell
Copy-Item -Recurse "dsh-plugin\skills\my-new-skill" ".claude\skills\"
```

---

## 三、如何配置一个 MCP

MCP 服务器通过 `cordis.patch.yml` 中的 `dsh-mcp-client` 行配置，每个 server 一个插件实例。

### 配置模板（两种传输方式）

**stdio 型**（本地命令，如 npx）：

```yaml
- id: mcp-my-server                # 唯一 id（建议前缀 mcp-）
  name: '@deepseek-ai/dsh-mcp-client'
  disabled: !!js "!process.env.MY_API_KEY"   # 可选：密钥未设置时自动禁用
  config:
    serverName: my-server          # 工具命名空间 → mcp__my-server__<tool>
    transport: stdio
    command: npx
    args: ['-y', 'my-mcp-package@1.0.0', '--flag']
    env:
      MY_API_KEY: !!js process.env.MY_API_KEY
    # cwd: /可选/工作目录
    # toolCallTimeoutMs: 60000
    # failOnStartupError: false
```

**streamable-http 型**（远程 API）：

```yaml
- id: mcp-my-http
  name: '@deepseek-ai/dsh-mcp-client'
  disabled: !!js "!process.env.MY_TOKEN"
  config:
    serverName: my-http
    transport: streamable-http
    url: https://example.com/mcp
    headers:
      Authorization: !!js '`Bearer ${process.env.MY_TOKEN}`'
      X-Custom: value
```

### 配置字段说明

| 字段 | 传输 | 必填 | 说明 |
|------|------|------|------|
| `transport` | 两者 | ✅ | `stdio` 或 `streamable-http` |
| `serverName` | 两者 | ✅ | 工具命名空间，`[A-Za-z0-9_-]{1,32}`，跨实例唯一 |
| `command` | stdio | ✅ | 可执行文件（如 `npx`） |
| `args` | stdio | ❌ | 参数数组 |
| `env` | stdio | ❌ | 附加环境变量（**推荐用 `!!js process.env.X` 引用，不写明文**） |
| `cwd` | stdio | ❌ | 子进程工作目录 |
| `url` | http | ✅ | MCP 服务器地址 |
| `headers` | http | ❌ | 请求头（认证信息用 `!!js` 表达式注入） |
| `toolCallTimeoutMs` | 两者 | ❌ | 单次工具调用超时（默认 60000） |
| `failOnStartupError` | 两者 | ❌ | 启动失败是否让插件激活失败（默认 false，仅记日志） |

### 实操步骤（以新增一个 MCP 为例）

```powershell
# 1. 打开 cordis.patch.yml
notepad "<插件目录>\cordis.patch.yml"

# 2. 在 `insert:` 段末尾追加一个新条目（注意 YAML 缩进，insert 段内条目 4 空格缩进）
#    stdio 示例见上文模板一，http 示例见模板二

# 3. 如需密钥：在系统环境变量中设置，或在启动 dsh 的 shell 中 export

# 4. 重启 dsh web 生效
```

### 密钥与环境变量的约定

- **插件内不存明文密钥**，统一用 `!!js process.env.X` 占位。
- 未设置密钥时，对应 server 通过 `disabled: !!js "!process.env.X"` **自动禁用**，不阻塞 dsh 启动。
- 密钥不存插件内，统一用 `!!js process.env.X` 占位符，按你的 MCP 服务器需要设置对应环境变量（如 `MY_API_KEY`、`MY_TOKEN` 等）。

### 验证 MCP 是否生效

```sh
# 1. 配置挂载检查（无需重启）
dsh --profile web --dump-config | grep -A 8 "id: mcp-"

# 2. 运行时工具检查：重启 dsh web 后，在对话中让模型列出可用工具，
#    或直接触发如「用 <你的 mcp> 查询数据」
```

---

## 四、配置 workspace 级（项目级）

### 4.0 直接兼容（推荐，零配置）

**项目根原有的 `.claude/`、`.mcp.json`、`CLAUDE.md` 直接生效**，无需移动或复制：

```powershell
# 什么都不用做！插件自动扫描：
#   .claude/skills/  → skills 直接可用
#   .claude/rules/   → rules 自动转 skill
#   .mcp.json        → MCP 自动识别
#   CLAUDE.md        → DSH 原生加载
```

如果你想把某些配置**只放在项目里**（不进 `.claude/`），用下面的扩展区：

### 4.1 扩展区 skills（项目级）

```powershell
mkdir "<项目根>\.dsh\dsh-claude-migrator\skills"
# 放 .md 文件（扁平）或 <name>/SKILL.md（目录）
Copy-Item ".claude\skills\my-skill" "<项目根>\.dsh\dsh-claude-migrator\skills\" -Recurse
```

### 4.2 rules（项目级，自动转 skill）

```powershell
mkdir "<项目根>\.dsh\dsh-claude-migrator\rules"
# 放 <name>.md，带 paths frontmatter 自动转 whenToUse
Copy-Item ".claude\rules\backend.md" "<项目根>\.dsh\dsh-claude-migrator\rules\"
```

### 4.3 CLAUDE.md（项目级指令）

```powershell
# 直接放这里即可 —— DSH 原生自动加载（已实测，无需插件处理）
Copy-Item "CLAUDE.md" "<项目根>\.dsh\dsh-claude-migrator\CLAUDE.md"
```

### 4.4 hooks（项目级事件钩子）

```powershell
mkdir "<项目根>\.dsh\dsh-claude-migrator\hooks"
```

hook 文件支持两种写法（`.js` 或 `.cjs`）：

```js
// 写法 1：默认导出函数 (ctx) => disposer（最灵活）
export default function hook(ctx) {
  const disposer = ctx.on('tools/pre-execute', async (exec) => {
    console.log('[hook] tool:', exec?.toolName)
  })
  return disposer
}
```

```js
// 写法 2：命名导出 { event, handler }
export const event = 'tools/post-execute'
export function handler(result) {
  // 处理工具结果
}
```

可监听事件：`tools/pre-execute`、`tools/execute`、`tools/post-execute`、`tools/result`。

### 4.5 MCP（项目级）

```powershell
# 放 .mcp.json（与 Claude 相同格式）
Copy-Item ".mcp.json" "<项目根>\.dsh\dsh-claude-migrator\.mcp.json"
```

### 4.6 .claude（迁移来源）

```powershell
# 直接把整个 .claude 目录放进来，插件的 skills/rules 扫描兼容此布局
Copy-Item ".claude" "<项目根>\.dsh\dsh-claude-migrator\.claude" -Recurse
```

---

## 五、CLAUDE 配置中心（看板）

插件自带一个 **CLAUDE 配置中心看板**，让你在 GUI 里直接看到用户级 / 项目级的 skills、rules、MCP 及连接状况。

### 入口

重启 `dsh web` 后，侧边栏「新建会话」行下方会出现 **「CLAUDE 配置中心」** 入口，点击弹出完整看板；工作区「⋯」更多菜单里也有同名菜单项。

### 看板内容（四个可折叠区块）

| 区块 | 展示内容 |
|------|----------|
| **Skills**（可折叠） | 用户级 + 项目级 skill 列表：名称 + 触发描述 + whenToUse |
| **Rules**（可折叠） | 已转换的规则（`rule-*`）：适用路径（whenToUse）+ 来源 |
| **MCP 服务器**（可折叠） | 每个服务器的 serverName、transport、命令/URL、工具数量（可展开工具名列表） |
| **连接状态** | 🟢 **已连接（绿色标签）** / 🟡 连接中 / ⚪ 已禁用；顶部汇总「共 X · 已连接 X · 连接中 X · 禁用 X」 |

- 面板 **5 秒自动轮询**，也可点「刷新」手动刷新（刷新时图标旋转动画）。
- **区块可折叠**：点击各区块标题（▸）展开/收起，**默认收起**（点击展开）。
- **主题自适应**：颜色走 `--dsh-cm-*` CSS 变量，`body[data-ds-dark-theme]` 时自动切深色（深蓝背景 + 浅色文字），与 DSH 皮肤（如鲸吟）协调；已连接用绿色胶囊标签。

### 技术说明

- Host 端：`src/index.js` 注册 `/api/dsh-claude-dashboard` 路由（仅回环访问），扫描**用户级 + 工作区级 + 插件级**三层配置，从 tools 注册表统计 `mcp__` 前缀工具判断连接状态。
- MCP 真实连接：`.mcp.json` 的服务器在启动时被**动态注册为 dsh-mcp-client 实例**（`ctx.plugin` + `ctx.loader.import`），密钥占位符 `${VAR}` 自动展开为环境变量，带自动重连。
- Browser 端：`status/client.js` 以 `window.__ModuleLoader__.load` 契约挂载侧边栏入口与看板（纯 DOM，无构建链）。
- 状态判断：`disabled`（配置层）→ 禁用；有 `mcp__<server>` 工具 → 已连接；已启用但无工具 → 连接中。

---

## 六、常见问题

| 问题 | 原因与解决 |
|------|------------|
| 新增 skill 后模型看不到 | ① 目录名不是 kebab-case 或 SKILL.md 缺 `name`/`description`；② 深层嵌套（只扫一层）；③ 当前进程在插件安装前启动 → **重启 dsh web** |
| MCP 工具不可用 | ① 对应环境变量未设置（server 自动禁用）；② 服务器地址/密钥错误；③ 未重启 |
| MCP 显示「连接中」不变 | 动态注册的连接带自动重连（指数退避）；持续失败多为密钥/地址问题，查看日志确认 |
| 修改 patch 不生效 | `cordis.patch.yml` 只在进程启动时读取 → 重启 dsh web |
| 用 file: 安装的插件改了源码不生效 | file 方式会复制一份到 profile，需重新 `dsh plugin add`；推荐 junction/link 方式（改动实时可见） |
| 想恢复默认（移除插件） | `dsh plugin --profile web remove dsh-claude-migrator` 后重启 |

---

## 七、维护约定

- **skills**：`skills/<name>/SKILL.md`，新增/修改即生效（junction 安装时）。
- **rules**：`skills/rule-<name>/SKILL.md`，规则内容源自 `.claude/rules/`，改动时两边同步。
- **MCP**：`.mcp.json`（用户 / workspace / 插件三级）→ 启动时动态注册，密钥用 `${VAR}` 占位符。
- **文档**：本文件与 `README.md` 同目录，随插件一起维护。
