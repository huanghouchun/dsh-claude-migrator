# 使用与发布指南

本文档说明：**插件日常怎么用**、**如何发布到 npm 插件库**、**发布后用户怎么安装**。

---

## 一、日常使用（本机 / 已安装后）

### 1. 安装到 DSH

```sh
# 方式一：本地 link 安装（开发调试，改动实时生效）
dsh plugin --profile web add "link:<本插件绝对路径>"

# 方式二：从 npm 安装（发布后，见下文「四、用户安装」）
dsh plugin --profile web add dsh-claude-migrator
```

装完**重启 `dsh web`** 生效。验证：

```sh
dsh --profile web --dump-config | grep -i claude-migrator
# 应看到 skill-filesystem（providerName: claude-migrator）与 dsh-claude-migrator 插件行
```

### 2. 看板入口

重启后侧边栏「新建会话」下方出现 **「Claude 迁移」** 入口，点击弹出完整看板：

- **Skills**：已导入的 skill 列表（名称 + 描述 + whenToUse）
- **Rules**：已转换的规则（`rule-*` + 适用路径 + 来源）
- **MCP 服务器**：每个服务器的 transport / 命令 / URL / 工具数（可展开）
- **连接状态**：🟢 已连接（绿色标签）/ 🟡 连接中 / ⚪ 已禁用；顶部汇总「共 X · 已连接 X · 连接中 X · 禁用 X」
- 5 秒自动轮询，可手动「刷新」；主题自适应（浅色/深色自动切换）

### 3. Skills 怎么生效

- 插件内置的 `skills/` 目录（8 个 Claude skills + 10 条规则转 skill）在重启后自动进入 DSH 的 skill 目录。
- 模型在对话中按 `whenToUse`/`description` **自动加载**；也可直接说「用 xxx skill 帮我…」。
- 新增 skill：在 `skills/<name>/SKILL.md` 新建即可（link 安装实时生效），详见 `USAGE.md` 第二节。

### 4. MCP 怎么生效

- MCP 配置在 `cordis.patch.yml` 的 `insert` 段，密钥走环境变量占位符（`!!js process.env.X`）。
- 设置对应环境变量后重启生效；未设置的服务器自动禁用，不阻塞启动。
- 密钥：MCP 服务器所需的环境变量（如 `MY_API_KEY` 等），见 `USAGE.md` 第三节。

### 5. CLAUDE.md / AGENTS.md

无需处理——DSH 的 `dsh-agent-instructions` 默认加载（候选 `AGENTS.md`/`CLAUDE.md`），项目根目录的文件自动生效。

---

## 二、发布准备（一次性）

### 1. 包名与版本

- 推荐包名：**`dsh-claude-migrator`**（语义清晰，已确认 npm 可用）。
- 版本号语义化：`0.1.0` 起步，`0.2.0` 加功能，`0.2.1` 修 bug。

### 2. package.json 补全

发布前需要：

```jsonc
{
  "name": "dsh-claude-migrator",       // 改成目标包名
  "version": "0.1.0",
  "private": false,                    // 发布必须为 false 或删除该字段
  "description": "……",
  "license": "MIT",
  "author": "你的名字或组织",
  "repository": {
    "type": "git",
    "url": "https://github.com/<你的用户名>/<仓库>.git"
  },
  "homepage": "https://github.com/<你的用户名>/<仓库>#readme",
  "keywords": ["dsh", "deepseek-harness", "claude", "migrator", "mcp", "skill"],
  "files": [                            // 只发布这些（白名单）
    "src",
    "status",
    "skills",
    "cordis.patch.yml",
    "README.md",
    "USAGE.md"
  ],
  "engines": { "node": ">=18" }
}
```

> ⚠️ `files` 白名单非常重要：不列 `scripts/`（开发脚本）、不列测试文件，只发布运行时需要的。

### 3. 确认导出契约

- `exports["."]` → host 端插件入口（`src/index.js`）
- `exports["./client"]` → browser 端（`status/client.js`）
- `dsh.bundle.patch` → `cordis.patch.yml`
- `dsh.client.platform` → `"web"`，`dsh.client.inject` → 服务依赖列表

这些都是 DSH 插件加载的关键，发布前用 `npm pack` 验证产物。

---

## 三、发布到 npm

### 1. 注册 npm 账号

```sh
npm adduser        # 按提示输入用户名/密码/邮箱
npm whoami         # 确认已登录
```

### 2. 本地打包检查（务必先做）

```sh
cd dsh-plugin
npm pack           # 生成 dsh-claude-migrator-0.1.0.tgz
# 解压 tgz 检查内容是否齐全：src/ status/ skills/ cordis.patch.yml 等
```

### 3. 发布

```sh
npm publish        # 发布到 npm（公开包，默认）
npm publish --access public   # 若包名带 scope（如 @user/dsh-claude-migrator）需显式公开
```

### 4. 验证

```sh
npm view dsh-claude-migrator version    # 应显示 0.1.0
# 或直接在任意机器：
dsh plugin --profile web add dsh-claude-migrator
```

### 5. 版本更新

```sh
npm version patch    # 0.1.0 → 0.1.1
npm version minor    # 0.1.1 → 0.2.0
npm publish
```

---

## 四、用户安装（发布后）

用户只需要一条命令：

```sh
dsh plugin --profile web add dsh-claude-migrator
```

装完重启 `dsh web`，侧边栏出现「Claude 迁移」入口即成功。

---

## 五、让更多 DSH 用户发现它（可选）

1. **awesome-dsh-plugin 列表**：在 [awesome-dsh-plugin](https://github.com/bruc3van/awesome-dsh-plugin) 仓库提 PR，登记你的插件（名称、用途、安装命令）。
2. **GitHub 仓库**：把 `dsh-plugin/` 目录推到一个独立 GitHub 仓库，README 写清安装方式（`dsh plugin --profile web add dsh-claude-migrator`）。
3. **社区**：在 linux.do、DSH 相关社区发帖介绍，附 GitHub 链接。
4. **dsh-web-ui 全家桶登记**：若与 zhu1090093659/dsh-web-ui 生态相关，可在其「社区插件」卡片登记。

---

## 六、注意事项

| 事项 | 说明 |
|------|------|
| 密钥安全 | 插件内**绝不放明文密钥**，统一走环境变量占位符；发布前检查 skills 里无敏感信息 |
| Windows 安装 | pnpm 对 `link:`/`file:` 盘符路径有 bug，但用户从 **npm 安装**不受影响 |
| 兼容性 | 发布前在干净环境用 `npm pack` + 安装验证一次，确保导出契约完整 |
| 版本纪律 | 破坏性改动升 major（0.x 阶段可用 minor），新功能 minor，修复 patch |
| 许可证 | 当前 MIT；发布时确认 skills 内容来源允许分发（本项目 skills 为项目自有） |
