# skills/ — 把你的 skills 放这里

本目录存放插件自带的 skills。每个 skill 是一个子目录，内含 `SKILL.md`：

```
skills/
└── my-skill/
    ├── SKILL.md           # 必填：frontmatter（name/description/whenToUse）+ 正文
    └── references/        # 可选：按需引用的资源文件
```

## SKILL.md 模板

```markdown
---
name: my-skill
description: 触发描述 —— 写清什么场景、哪些关键词会让模型加载本 skill。
whenToUse: 可选，更明确的适用条件。
---

# My Skill

具体指令正文……
```

## 说明

- `name` 必须为 kebab-case（小写连字符），与目录名一致。
- `skill-filesystem` 只扫一层：必须是 `skills/<name>/SKILL.md`，不识别深层嵌套。
- 修改后保存即生效（link/junction 安装时 watcher 自动发现；file 安装需重装）。
- 也可以不放在这里，而是把整个 `.claude/skills/` 拖入 `import/` 目录（见 `import/README.md`）。
