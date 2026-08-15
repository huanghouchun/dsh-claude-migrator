# import/ — 把你的 Claude 配置拖进来即可

本目录是 **dsh-claude-migrator** 的「即插即用」导入区。把任意 Claude 项目的配置拖入本目录，重启 `dsh web` 后自动加载，无需任何手动配置。

## 支持的文件（放入本目录任意位置，插件自动识别）

| 你要拖入的内容 | 插件行为 |
|----------------|----------|
| `.claude/skills/<name>/SKILL.md` | 直接作为 DSH skill 使用（格式原生兼容） |
| `.claude/rules/<name>.md` | 自动转换为 skill（`whenToUse` 保留 paths 路径语义） |
| `.mcp.json` | 自动读取并启动其中配置的 MCP 服务器 |
| `CLAUDE.md` / `AGENTS.md` | 放入后由 DSH 指令加载链自动读取 |
| `skills/` / `rules/`（不带 .claude 前缀） | 同样支持（扁平布局） |

## 布局示例

```
import/
├── .claude/
│   ├── skills/
│   │   └── my-skill/SKILL.md
│   └── rules/
│       └── my-rule.md
├── .mcp.json
└── CLAUDE.md
```

## 怎么看效果

侧边栏「**Claude 迁移**」入口 → 看板实时展示 Skills / Rules / MCP 列表与连接状态（5 秒自动刷新）。

## 说明

- 密钥不存本目录明文：`.mcp.json` 里的 `${XXX}` 占位符对应系统环境变量，未设置的服务器自动禁用。
- 本目录内容**随插件一起分发**：发布到 npm 后，用户装完即自带这些配置；其他用户也可往自己的 import/ 里拖入自己的 Claude 配置。
