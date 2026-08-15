/**
 * dsh-claude-migrator —— host 端（Node 进程内运行）。
 *
 * 泛化的「Claude → DSH 迁移器」：把用户拖入 import/ 目录的 Claude 配置
 * （.claude/skills、.claude/rules、.mcp.json、CLAUDE.md）自动加载为 DSH 能力，
 * 并提供一个看板 API（/api/dsh-claude-dashboard）展示 skill / rule / mcp
 * 列表与连接状态。
 *
 * 目录约定（import 根 = 插件目录下的 import/）：
 *   import/.claude/skills/<name>/SKILL.md   → skill（DSH 格式原生兼容）
 *   import/.claude/rules/<name>.md          → rule（自动转 skill，whenToUse 保留 paths）
 *   import/.mcp.json                        → MCP 服务器（动态启动 dsh-mcp-client）
 *   import/CLAUDE.md / AGENTS.md            → 指令（复制进 import，由 agent-instructions 读取）
 *   import/skills/ 与 import/rules/         → 也接受不带 .claude 前缀的扁平布局
 */

import { readFileSync, existsSync, readdirSync, mkdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// 插件自身目录（ESM 下基于 import.meta.url 解析）
const __dirname = dirname(fileURLToPath(import.meta.url))
// import 根目录：插件目录/import
export const IMPORT_ROOT = join(__dirname, '..', 'import')
// 内置 skills 根目录：插件目录/skills
export const SKILLS_ROOT = join(__dirname, '..', 'skills')

/** 看板 API 路由。 */
export const DASHBOARD_API = '/api/dsh-claude-dashboard'

/** 插件在 cordis 中的标识。 */
export const name = 'dsh-claude-migrator'

/** 注入的服务：webServer（HTTP 路由）、loader（读 mcp 条目状态）、tools（读工具注册表）、skills（skill 注册表）。 */
export const inject = ['webServer', 'loader', 'tools', 'skills']

/** 写 JSON 响应。 */
function writeJson(res, status, body) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'referrer-policy': 'no-referrer',
  })
  res.end(JSON.stringify(body))
}

/** 仅回环访问（与 dsh-ssh 信任栅栏一致）。 */
function isLoopbackRequest(req) {
  const address = req.socket.remoteAddress
  if (address !== '127.0.0.1' && address !== '::1' && address !== '::ffff:127.0.0.1') return false
  const host = req.headers.host
  if (typeof host !== 'string') return false
  let hostUrl
  try {
    hostUrl = new URL(`http://${host}`)
  } catch {
    return false
  }
  if (hostUrl.hostname !== '127.0.0.1' && hostUrl.hostname !== 'localhost' && hostUrl.hostname !== '[::1]') return false
  return true
}

/** 读取并解析 YAML frontmatter（name/description/whenToUse）。 */
function parseFrontmatter(content) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)
  if (!match) return {}
  const meta = {}
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
    if (key && value) meta[key] = value
  }
  return meta
}

/** 目录是否存在且含 SKILL.md。 */
function isSkillDir(dir) {
  return existsSync(join(dir, 'SKILL.md'))
}

/**
 * 扫描多个根下的 skills（SKILL.md 目录或扁平 md）。
 * 兼容两种布局：内置 skills/ 目录（发布自带）与 import/ 目录（用户拖入）。
 * @param roots - 要扫描的根目录数组。
 * @returns {Array<{name, description, whenToUse, path}>}
 */
function scanSkills(roots) {
  const out = []
  const seen = new Set()
  for (const root of roots) {
    if (!existsSync(root)) continue
    const tryRoots = [
      join(root, '.claude', 'skills'),
      join(root, 'skills'),
    ]
    for (const dir of tryRoots) {
      if (!existsSync(dir)) continue
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name)
        let content = null
        if (entry.isDirectory() && isSkillDir(full)) {
          content = readFileSync(join(full, 'SKILL.md'), 'utf8')
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          content = readFileSync(full, 'utf8')
        }
        if (content === null) continue
        const meta = parseFrontmatter(content)
        const name = meta.name || entry.name.replace(/\.md$/, '')
        if (seen.has(name)) continue
        seen.add(name)
        out.push({ name, description: meta.description || '', whenToUse: meta.whenToUse || '', path: full })
      }
    }
  }
  return out
}

/**
 * 扫描 import/ 下的 rules，并转换为 DSH skill 格式写到 import/.dsh-rules/。
 * rule 的 paths frontmatter 语义保留在 whenToUse 中。
 * @returns {Array<{name, description, whenToUse, source}>}
 */
function scanAndConvertRules(root) {
  const out = []
  const ruleRoots = [join(root, '.claude', 'rules'), join(root, 'rules')]
  let sourceDir
  for (const dir of ruleRoots) {
    if (existsSync(dir)) { sourceDir = dir; break }
  }
  if (!sourceDir) return out

  const destDir = join(root, '.dsh-rules')
  mkdirSync(destDir, { recursive: true })

  for (const entry of readdirSync(sourceDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue
    const full = join(sourceDir, entry.name)
    const content = readFileSync(full, 'utf8')
    const meta = parseFrontmatter(content)
    const base = entry.name.replace(/\.md$/, '')
    const ruleName = `rule-${base}`
    // paths → whenToUse（多条用分号连接）
    const paths = Array.isArray(meta.paths) ? meta.paths : (meta.paths ? [meta.paths] : [])
    const whenToUse = paths.length > 0 ? `处理 ${paths.join(' 或 ')} 时` : '本工作区相关改动时'
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    const skillDir = join(destDir, ruleName)
    mkdirSync(skillDir, { recursive: true })
    const skill = `---\nname: ${ruleName}\ndescription: ${meta.description || base} 的编码规则（源自 Claude rule）。\nwhenToUse: ${whenToUse}\n---\n\n${body}`
    writeFileSync(join(skillDir, 'SKILL.md'), skill, 'utf8')
    out.push({ name: ruleName, description: meta.description || '', whenToUse, source: entry.name })
  }
  return out
}

/** 读取 .mcp.json 配置（存在则解析）。 */
function readMcpJson(root) {
  const candidates = [join(root, '.mcp.json'), join(root, 'mcp.json')]
  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        return { path, servers: JSON.parse(readFileSync(path, 'utf8')) }
      } catch {
        return { path, servers: null, error: 'invalid json' }
      }
    }
  }
  return null
}

/**
 * 从 tools 注册表统计每个 MCP server 已同步的工具数。
 * 工具名格式 mcp__<serverName>__<rawName>。
 */
function collectMcpTools(tools) {
  const byServer = new Map()
  let schemas = []
  try { schemas = tools.schemas() } catch { /* noop */ }
  for (const tool of schemas) {
    const tname = tool.name ?? tool.id
    if (typeof tname !== 'string' || !tname.startsWith('mcp__')) continue
    const server = tname.split('__')[1]
    if (!server) continue
    if (!byServer.has(server)) byServer.set(server, [])
    byServer.get(server).push(tname)
  }
  return byServer
}

/** 从 loader 读取已配置的 mcp-* 条目状态（静态 patch 配置的 mcp 服务器）。 */
function collectStaticMcp(loader) {
  const out = []
  for (const entry of loader.entries()) {
    if (entry.options.group) continue
    if (entry.options.name !== '@deepseek-ai/dsh-mcp-client') continue
    const config = entry.options.config ?? {}
    out.push({
      entryId: entry.id,
      serverName: config.serverName ?? entry.id.replace(/^mcp-/, ''),
      transport: config.transport ?? 'unknown',
      disabled: entry.disabled === true,
      command: config.command,
      url: config.url,
      args: (config.args ?? []).map((a) => (a && typeof a === 'object' && '__jsExpr' in a ? `(${a.__jsExpr})` : String(a))),
    })
  }
  return out
}

/** 汇总看板数据。 */
export function buildDashboard(ctx) {
  // 内置 skills/ 目录 + 用户拖入的 import/ 目录
  const BUILTIN_ROOT = join(__dirname, '..')
  const allSkills = scanSkills([BUILTIN_ROOT, IMPORT_ROOT])
  // rules：import/ 下的 .claude/rules 转 skill + 内置 rule-* 目录（rule- 前缀归入 rules 区块）
  const convertedRules = scanAndConvertRules(IMPORT_ROOT)
  const builtinRules = allSkills.filter((s) => s.name.startsWith('rule-'))
  const skills = allSkills.filter((s) => !s.name.startsWith('rule-'))
  const rules = [
    ...convertedRules,
    ...builtinRules.filter((s) => !convertedRules.some((r) => r.name === s.name))
      .map((s) => ({ name: s.name, description: s.description, whenToUse: s.whenToUse, source: '内置' })),
  ]
  const mcpJson = readMcpJson(IMPORT_ROOT)
  const toolsByServer = collectMcpTools(ctx.tools)
  const staticMcp = collectStaticMcp(ctx.loader)

  // 动态 .mcp.json 里的服务器（推断状态：与静态配置合并后统一判断）
  const dynamicServers = []
  if (mcpJson && mcpJson.servers && typeof mcpJson.servers === 'object') {
    for (const [serverName, cfg] of Object.entries(mcpJson.servers)) {
      if (cfg && typeof cfg === 'object') {
        dynamicServers.push({
          serverName,
          transport: cfg.type === 'http' ? 'streamable-http' : (cfg.transport ?? 'stdio'),
          command: cfg.command,
          url: cfg.url,
          args: cfg.args ?? [],
        })
      }
    }
  }

  // 合并静态 + 动态，统一判断连接状态
  const allServers = [...staticMcp, ...dynamicServers]
  const seen = new Set()
  const merged = []
  for (const s of allServers) {
    if (seen.has(s.serverName)) continue
    seen.add(s.serverName)
    const toolNames = toolsByServer.get(s.serverName) ?? []
    let status
    if (s.disabled) status = 'disabled'
    else if (toolNames.length > 0) status = 'connected'
    else status = 'connecting'
    merged.push({ ...s, toolCount: toolNames.length, toolNames, status })
  }

  return {
    importRoot: IMPORT_ROOT,
    skills,
    rules,
    mcpJson: mcpJson ? { path: mcpJson.path, servers: dynamicServers.length } : null,
    mcpServers: merged,
    summary: {
      skills: skills.length,
      rules: rules.length,
      mcp: merged.length,
      mcpConnected: merged.filter((s) => s.status === 'connected').length,
      mcpDisabled: merged.filter((s) => s.status === 'disabled').length,
    },
  }
}

/**
 * 基于 scanSkills 结果补读正文，生成可注册的 skill 定义。
 * @param roots - 要扫描的根目录数组。
 * @returns {Array<{name, description, whenToUse, body}>}
 */
function collectSkillDefinitions(roots) {
  const skills = scanSkills(roots)
  return skills.map((skill) => {
    // SKILL.md 正文 = 去掉 frontmatter 的剩余部分
    const content = readFileSync(skill.path, 'utf8')
    const body = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '')
    return {
      name: skill.name,
      description: skill.description || `skill ${skill.name}`,
      whenToUse: skill.whenToUse || undefined,
      body,
    }
  })
}

/**
 * 把插件目录内的 skills 注册进 DSH skill 注册表（ctx.skills.register）。
 * 自包含实现：不依赖 dsh 内部包，任何安装位置都能工作。
 * @param ctx - cordis 上下文（含 skills 服务）。
 * @returns 卸载函数数组。
 */
function registerPluginSkills(ctx) {
  const disposers = []
  const definitions = collectSkillDefinitions([SKILLS_ROOT, IMPORT_ROOT])
  for (const def of definitions) {
    try {
      disposers.push(ctx.skills.register(def))
    } catch (error) {
      ctx.logger?.warn(`dsh-claude-migrator: register skill "${def.name}" failed: ${String(error?.message ?? error)}`)
    }
  }
  return disposers
}

/** 插件入口：注册看板路由 + 动态挂载插件目录 skills。 */
export function apply(ctx) {
  const handler = async (req, res) => {
    if (!isLoopbackRequest(req)) {
      writeJson(res, 403, { error: 'forbidden: loopback-only' })
      return
    }
    if ((req.method ?? 'GET') !== 'GET') {
      writeJson(res, 405, { error: `method not allowed: ${req.method}` })
      return
    }
    try {
      writeJson(res, 200, buildDashboard(ctx))
    } catch (error) {
      writeJson(res, 500, { error: String(error?.message ?? error) })
    }
  }
  ctx.webServer.register({ kind: 'exact', path: DASHBOARD_API, handler })
  // 旧版路由兼容（老客户端仍可读 MCP 状态）
  ctx.webServer.register({ kind: 'exact', path: '/api/dsh-mcp-status', handler })

  // 动态挂载 skills：把插件内 skills/ 与 import/ 注册为 DSH skill 来源。
  // 用 ctx.skills.register 自包含实现，不依赖任何绝对路径 —— 发布后任意位置安装都能工作。
  const disposers = registerPluginSkills(ctx)
  ctx.effect(() => {
    return () => {
      for (const dispose of disposers.splice(0)) dispose()
    }
  }, 'dsh-claude-migrator: skills')
}
