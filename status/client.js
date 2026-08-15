window.__ModuleLoader__.load({
	id: "dsh-claude-migrator",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		/**
		 * dsh-claude-migrator 看板 —— browser 端（在 dsh web GUI 中运行）。
		 *
		 * 手写 window.__ModuleLoader__.load 契约（与官方 dsh-client-modules 同格式），
		 * 无需构建链。功能：
		 *   - 侧边栏「配置中心」入口行（纯 DOM，MutationObserver 自愈）
		 *   - 点击弹出完整看板：Skill 列表 / Rules 列表 / MCP 列表与连接状态
		 *   - 工作区「⋯」更多菜单注入「配置中心看板」菜单项
		 *   - 面板头部：刷新按钮（带旋转动画）、关闭按钮
		 *
		 * 主题适配：所有颜色走 CSS 变量（--dsh-cm-*），并通过 body[data-ds-dark-theme]
		 * 自动切换深/浅色，与 DSH 主题、皮肤保持一致。
		 */

		/** 轮询刷新间隔（毫秒）。 */
		var REFRESH_MS = 5000;

		/** 看板 API（host 端 src/index.js 注册）。 */
		var API = "/api/dsh-claude-dashboard";

		/** 稳定 data 属性。 */
		var ENTRY_SELECTOR = "[data-dsh-cm-entry]";
		var PANEL_SELECTOR = "[data-dsh-cm-panel]";

		/** apply 创建的控制器（供关闭按钮等模块级函数使用）。 */
		var panelController = undefined;

		/** 侧边栏入口图标（仪表盘）。 */
		var ICON = '<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="2" width="5.2" height="5.2" rx="1"/><rect x="8.8" y="2" width="5.2" height="3.4" rx="1"/><rect x="8.8" y="8.6" width="5.2" height="5.4" rx="1"/><rect x="2" y="8.6" width="5.2" height="3.2" rx="1"/></svg>';

		/** 中文文案。 */
		var T = {
			entry: "配置中心",
			tooltip: "查看项目 skills / rules / MCP 与连接状态",
			loading: "加载中…",
			error: "加载失败",
			refresh: "刷新",
			close: "关闭",
			connected: "已连接",
			connecting: "连接中",
			disabled: "已禁用",
			tools: "工具",
			none: "（空）",
			sectionSkills: "Skills",
			sectionRules: "Rules",
			sectionMcp: "MCP 服务器",
			skillCount: "skills",
			ruleCount: "rules",
			mcpCount: "mcp",
			importRoot: "导入目录",
		};

		/**
		 * 主题变量样式（注入一次）。深色标记：body[data-ds-dark-theme]。
		 * 浅色默认值 + 深色覆盖，保证与 DSH 皮肤（如鲸吟）协调。
		 */
		var THEME_CSS =
			":root{" +
			"--dsh-cm-bg:#ffffff;--dsh-cm-bg-2:#f7f8fa;--dsh-cm-border:#e4e7ed;" +
			"--dsh-cm-text:#1f2329;--dsh-cm-text-2:#4e5969;--dsh-cm-text-3:#86909c;" +
			"--dsh-cm-green:#00b42a;--dsh-cm-green-bg:rgba(0,180,42,.1);--dsh-cm-green-border:rgba(0,180,42,.35);" +
			"--dsh-cm-yellow:#ff7d00;--dsh-cm-yellow-bg:rgba(255,125,0,.1);--dsh-cm-yellow-border:rgba(255,125,0,.35);" +
			"--dsh-cm-gray:#86909c;--dsh-cm-gray-bg:rgba(134,144,156,.12);--dsh-cm-gray-border:rgba(134,144,156,.35);" +
			"--dsh-cm-shadow:0 8px 30px rgba(15,23,42,.15);" +
			"}" +
			"body[data-ds-dark-theme]{" +
			"--dsh-cm-bg:#0d234e;--dsh-cm-bg-2:rgba(18,36,76,.65);--dsh-cm-border:rgba(168,200,232,.18);" +
			"--dsh-cm-text:#d8e5f5;--dsh-cm-text-2:#a8c8e8;--dsh-cm-text-3:#7a94b8;" +
			"--dsh-cm-green:#3ddc68;--dsh-cm-green-bg:rgba(61,220,104,.12);--dsh-cm-green-border:rgba(61,220,104,.4);" +
			"--dsh-cm-yellow:#ffb84d;--dsh-cm-yellow-bg:rgba(255,184,77,.12);--dsh-cm-yellow-border:rgba(255,184,77,.4);" +
			"--dsh-cm-gray:#8ea3c4;--dsh-cm-gray-bg:rgba(142,163,196,.12);--dsh-cm-gray-border:rgba(142,163,196,.35);" +
			"--dsh-cm-shadow:0 8px 30px rgba(0,0,0,.4);" +
			"}";

		/** 注入主题样式（幂等）。 */
		function ensureTheme() {
			if (document.getElementById("dsh-cm-theme")) return
			var style = document.createElement("style")
			style.id = "dsh-cm-theme"
			style.textContent = THEME_CSS
			document.head.appendChild(style)
		}

		/** 找到侧边栏根元素。 */
		function sidebarRoot() {
			var column = document.querySelector('[data-pane="sidebar"], [class*="sidebarCol"]')
			if (column === null) return undefined
			var logoOwner = column.querySelector('[class*="logoRow"]')?.parentElement
			return logoOwner ?? (column.firstElementChild ?? undefined)
		}

		/** 找到「新建会话」按钮（入口插入锚点）。 */
		function newSessionButton(root) {
			var nested = root.querySelector('button[class*="newSession"]')
			if (nested !== null) return nested
			for (var i = 0; i < root.children.length; i++) {
				if (root.children[i].tagName === "BUTTON") return root.children[i]
			}
			return undefined
		}

		/** 创建入口行。 */
		function createEntry(onClick) {
			var entry = document.createElement("button")
			entry.type = "button"
			entry.dataset.dshCmEntry = ""
			entry.title = T.tooltip
			entry.setAttribute("aria-label", T.entry)
			entry.style.cssText = "display:flex;align-items:center;gap:8px;width:100%;padding:8px 14px;background:none;border:none;color:inherit;font:inherit;cursor:pointer;text-align:left;opacity:.9;"
			entry.innerHTML = '<span style="display:inline-flex;flex-shrink:0;">' + ICON + "</span><span>" + T.entry + "</span>"
			entry.addEventListener("click", onClick)
			return entry
		}

		/** 将入口行插入插件族块末尾（新建会话行之后）。 */
		function placeEntry(root, entry) {
			var button = newSessionButton(root)
			if (button === undefined) return false
			if (entry.parentElement !== root) {
				var family = Array.prototype.filter.call(root.children, function (el) {
					return el instanceof HTMLElement && el.matches("[data-dsh-taskboard-entry], [data-dsh-ssh-entry], [data-dsh-cm-entry]")
				})
				var anchor = family.length > 0 ? family[family.length - 1].nextElementSibling : button.nextElementSibling
				root.insertBefore(entry, anchor)
			}
			return true
		}

		/** 找到对话列（面板挂载点）。 */
		function conversationColumn() {
			return document.querySelector('[data-pane="conversation"], [class*="conversationCol"]') ?? undefined
		}

		/** 创建面板容器。 */
		function createPanel() {
			var div = document.createElement("div")
			div.dataset.dshCmPanel = ""
			div.style.cssText =
				"position:absolute;right:12px;top:64px;z-index:60;width:460px;max-width:calc(100vw - 24px);max-height:74vh;overflow:auto;" +
				"background:var(--dsh-cm-bg);border:1px solid var(--dsh-cm-border);border-radius:12px;" +
				"box-shadow:var(--dsh-cm-shadow);padding:14px;display:none;font-size:13px;line-height:1.55;" +
				"color:var(--dsh-cm-text);"
			return div
		}

		/** 转义 HTML。 */
		function esc(value) {
			return String(value).replace(/[&<>"']/g, function (ch) {
				return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
			})
		}

		/** 状态标签（已连接=绿色标签，连接中=黄色，禁用=灰色）。 */
		function statusBadge(status, label) {
			var map = {
				connected: ["var(--dsh-cm-green)", "var(--dsh-cm-green-bg)", "var(--dsh-cm-green-border)"],
				connecting: ["var(--dsh-cm-yellow)", "var(--dsh-cm-yellow-bg)", "var(--dsh-cm-yellow-border)"],
				disabled: ["var(--dsh-cm-gray)", "var(--dsh-cm-gray-bg)", "var(--dsh-cm-gray-border)"],
			}
			var c = map[status] || map.disabled
			return (
				'<span style="display:inline-flex;align-items:center;gap:5px;padding:1px 9px;border-radius:999px;' +
				"font-size:12px;font-weight:600;color:" + c[0] + ";background:" + c[1] + ";border:1px solid " + c[2] + ';">' +
				'<span style="width:6px;height:6px;border-radius:50%;background:' + c[0] + ';"></span>' +
				esc(label) +
				"</span>"
			)
		}

		/** 渲染一个 skill 卡片。 */
		function renderSkill(skill) {
			return (
				'<div style="padding:7px 9px;border:1px solid var(--dsh-cm-border);border-radius:8px;margin-bottom:6px;">' +
				'<div style="font-weight:600;word-break:break-all;">' + esc(skill.name) + "</div>" +
				(skill.description ? '<div style="margin-top:3px;font-size:12px;color:var(--dsh-cm-text-2);">' + esc(skill.description) + "</div>" : "") +
				(skill.whenToUse ? '<div style="margin-top:3px;font-size:12px;color:var(--dsh-cm-text-3);">' + esc(skill.whenToUse) + "</div>" : "") +
				"</div>"
			)
		}

		/** 渲染一个 rule 卡片。 */
		function renderRule(rule) {
			return (
				'<div style="padding:7px 9px;border:1px solid var(--dsh-cm-border);border-radius:8px;margin-bottom:6px;">' +
				'<div style="font-weight:600;word-break:break-all;">' + esc(rule.name) + "</div>" +
				(rule.whenToUse ? '<div style="margin-top:3px;font-size:12px;color:var(--dsh-cm-text-3);">' + esc(rule.whenToUse) + "</div>" : "") +
				(rule.source ? '<div style="margin-top:2px;font-size:11px;color:var(--dsh-cm-text-3);">来源: ' + esc(rule.source) + "</div>" : "") +
				"</div>"
			)
		}

		/** 渲染一个 MCP 服务器卡片。 */
		function renderMcp(server) {
			var label = { connected: T.connected, connecting: T.connecting, disabled: T.disabled }[server.status] || server.status
			var location = server.transport === "stdio" ? (server.command || "") + " " + (server.args || []).join(" ") : (server.url || "")
			var toolsBlock
			if (server.toolNames && server.toolNames.length > 0) {
				toolsBlock =
					'<details style="margin-top:6px;"><summary style="cursor:pointer;color:var(--dsh-cm-text-2);">' +
					T.tools + " (" + server.toolNames.length + ")</summary>" +
					'<div style="margin-top:4px;padding-left:10px;border-left:2px solid var(--dsh-cm-border);word-break:break-all;color:var(--dsh-cm-text-2);">' +
					server.toolNames.map(function (n) { return "<div>" + esc(n) + "</div>" }).join("") +
					"</div></details>"
			} else {
				toolsBlock = '<div style="margin-top:6px;font-size:12px;color:var(--dsh-cm-text-3);">' + T.none + "</div>"
			}
			return (
				'<div style="padding:8px 10px;border:1px solid var(--dsh-cm-border);border-radius:8px;margin-bottom:8px;">' +
				'<div style="display:flex;align-items:center;gap:8px;">' +
				"<strong>" + esc(server.serverName) + "</strong>" +
				'<span style="margin-left:auto;">' + statusBadge(server.status, label) + "</span>" +
				"</div>" +
				'<div style="margin-top:4px;font-size:12px;color:var(--dsh-cm-text-2);word-break:break-all;">transport: ' + esc(server.transport) + (location ? " · " + esc(location) : "") + "</div>" +
				toolsBlock +
				"</div>"
			)
		}

		/** 区块标题。 */
		function sectionTitle(title, count) {
			return (
				'<div style="display:flex;align-items:baseline;gap:6px;margin:12px 0 8px;">' +
				'<strong style="font-size:13px;">' + esc(title) + "</strong>" +
				'<span style="font-size:12px;color:var(--dsh-cm-text-3);">' + esc(count) + "</span>" +
				"</div>"
			)
		}

		/** 渲染完整看板。 */
		function renderPanel(panel, data) {
			if (data === undefined) {
				panel.innerHTML = '<div style="color:var(--dsh-cm-text-2);">' + T.error + "</div>"
				return
			}
			// 头部：标题 + 刷新（带旋转动画）+ 关闭（✕）
			var head =
				'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">' +
				'<strong style="display:flex;align-items:center;gap:6px;">' + ICON + " " + esc(T.entry) + "</strong>" +
				'<span style="display:flex;align-items:center;gap:6px;">' +
				'<button data-dsh-cm-refresh title="' + T.refresh + '" style="display:inline-flex;align-items:center;gap:4px;background:none;border:1px solid var(--dsh-cm-border);border-radius:6px;padding:2px 8px;cursor:pointer;font-size:12px;color:inherit;">' +
				'<span data-dsh-cm-refresh-icon style="display:inline-flex;transition:transform .4s ease;">↻</span>' +
				T.refresh + "</button>" +
				'<button data-dsh-cm-close title="' + T.close + '" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:none;border:none;border-radius:6px;cursor:pointer;font-size:14px;color:var(--dsh-cm-text-2);">✕</button>' +
				"</span></div>" +
				'<div style="font-size:12px;color:var(--dsh-cm-text-3);margin-bottom:8px;">' +
				(data.summary ? data.summary.skills + " " + T.skillCount + " / " + data.summary.rules + " " + T.ruleCount + " / " + data.summary.mcp + " " + T.mcpCount : "") +
				"</div>"

			// Skills
			var skillsBlock =
				sectionTitle(T.sectionSkills, data.skills ? data.skills.length + " " + T.skillCount : "0")
				+ (data.skills && data.skills.length > 0
					? data.skills.map(renderSkill).join("")
					: '<div style="font-size:12px;color:var(--dsh-cm-text-3);">' + T.none + "</div>")

			// Rules
			var rulesBlock =
				sectionTitle(T.sectionRules, data.rules ? data.rules.length + " " + T.ruleCount : "0")
				+ (data.rules && data.rules.length > 0
					? data.rules.map(renderRule).join("")
					: '<div style="font-size:12px;color:var(--dsh-cm-text-3);">' + T.none + "</div>")

			// MCP
			var mcpSummary =
				"共 " + (data.summary ? data.summary.mcp : 0) + " · 已连接 " + (data.summary ? data.summary.mcpConnected : 0) +
				" · 连接中 " + (data.summary ? data.summary.mcpConnecting || 0 : 0) +
				" · 禁用 " + (data.summary ? data.summary.mcpDisabled : 0)
			var mcpBlock =
				sectionTitle(T.sectionMcp, mcpSummary)
				+ (data.mcpServers && data.mcpServers.length > 0
					? data.mcpServers.map(renderMcp).join("")
					: '<div style="font-size:12px;color:var(--dsh-cm-text-3);">' + T.none + "</div>")

			panel.innerHTML = head + skillsBlock + rulesBlock + mcpBlock

			var refreshBtn = panel.querySelector("[data-dsh-cm-refresh]")
			if (refreshBtn) {
				refreshBtn.addEventListener("click", function () {
					// 刷新图标旋转动画
					var icon = panel.querySelector("[data-dsh-cm-refresh-icon]")
					if (icon) icon.style.transform = "rotate(360deg)"
					refreshPanel(panel)
				})
			}
			var closeBtn = panel.querySelector("[data-dsh-cm-close]")
			if (closeBtn) {
				closeBtn.addEventListener("click", function () {
					closePanel()
				})
			}
		}

		/** 拉取一次看板数据并渲染。 */
		function refreshPanel(panel) {
			fetch(API, { headers: { accept: "application/json" } })
				.then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); return res.json() })
				.then(function (data) { renderPanel(panel, data) })
				.catch(function () { renderPanel(panel, undefined) })
		}

		/** 面板显示状态切换。 */
		function setPanelOpen(panel, open, controller) {
			panel.style.display = open ? "block" : "none"
			if (open && !controller.timer) {
				refreshPanel(panel)
				controller.timer = setInterval(function () { refreshPanel(panel) }, REFRESH_MS)
			} else if (!open && controller.timer) {
				clearInterval(controller.timer)
				controller.timer = undefined
			}
		}

		/** 关闭面板（关闭按钮点击调用）。 */
		function closePanel() {
			var panel = document.querySelector(PANEL_SELECTOR)
			if (panel && panelController) setPanelOpen(panel, false, panelController)
		}

		/** 插件入口（browser 半面 apply）。 */
		function apply(ctx) {
			var controller = { open: false, timer: undefined }
			// 暴露给模块级 closePanel()（关闭按钮使用）
			panelController = controller
			var disposers = []

			/** 切换看板面板（侧边栏入口与工作区菜单共用）。 */
			function togglePanel() {
				controller.open = !controller.open
				var panel = document.querySelector(PANEL_SELECTOR)
				if (panel) setPanelOpen(panel, controller.open, controller)
			}

			/**
			 * 往工作区「⋯」更多菜单注入「配置中心看板」菜单项。
			 * DSH 官方菜单项硬编码（重命名/删除），无插件注册接口，因此用 DOM 注入：
			 * 监听 role="menu" 的菜单容器，若已含「重命名」项（工作区菜单特征）且未注入过，
			 * 追加一个 role="menuitem" 的「配置中心看板」项。
			 */
			function injectWorkspaceMenu() {
				try {
					var menus = document.querySelectorAll('[role="menu"]')
					for (var i = 0; i < menus.length; i++) {
						var menu = menus[i]
						if (menu.querySelector('[data-dsh-cm-menuitem]')) continue
						// 工作区菜单特征：包含「重命名」文本的菜单项
						var hasRename = Array.prototype.some.call(menu.querySelectorAll('[role="menuitem"]'), function (item) {
							return item.textContent.indexOf("重命名") !== -1 || item.textContent.indexOf("Rename") !== -1
						})
						if (!hasRename) continue
						// 构造菜单项（仿官方 menuitem 结构）
						var item = document.createElement("div")
						item.setAttribute("role", "menuitem")
						item.dataset.dshCmMenuitem = ""
						item.tabIndex = -1
						item.style.cssText =
							"display:flex;align-items:center;gap:8px;padding:6px 10px;cursor:pointer;font-size:13px;" +
							"color:var(--dsh-cm-text);border-radius:6px;user-select:none;white-space:nowrap;"
						item.innerHTML = ICON + '<span>' + T.entry + "</span>"
						item.addEventListener("click", function (e) {
							e.stopPropagation()
							togglePanel()
						})
						item.addEventListener("mouseenter", function () {
							item.style.background = "var(--dsh-cm-bg-2)"
						})
						item.addEventListener("mouseleave", function () {
							item.style.background = "transparent"
						})
						menu.appendChild(item)
					}
				} catch (error) {
					console.warn("[dsh-claude-migrator] workspace menu inject failed:", error)
				}
			}

			function ensureMount() {
				try {
					ensureTheme()
					var root = sidebarRoot()
					var entry = document.querySelector(ENTRY_SELECTOR)
					// querySelector 找不到返回 null（不是 undefined），必须用 !entry 判断
					if (root !== undefined && !entry) {
						entry = createEntry(function () { togglePanel() })
						placeEntry(root, entry)
					}
					var panel = document.querySelector(PANEL_SELECTOR)
					if (!panel) {
						var column = conversationColumn()
						if (column !== undefined) {
							panel = createPanel()
							column.appendChild(panel)
						}
					}
				} catch (error) {
					console.warn("[dsh-claude-migrator] mount failed:", error)
				}
			}

			// 多重保险：同步 + setTimeout + DOMContentLoaded + MutationObserver
			ensureMount()
			setTimeout(ensureMount, 0)
			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", ensureMount, { once: true })
				disposers.push(function () { document.removeEventListener("DOMContentLoaded", ensureMount) })
			}
			var rootNode = document.documentElement ?? document
			var observer = new MutationObserver(function () {
				ensureMount()
				injectWorkspaceMenu()
			})
			observer.observe(rootNode, { childList: true, subtree: true })
			disposers.push(function () { observer.disconnect() })

			ctx.effect(function () {
				return function () {
					for (var i = 0; i < disposers.length; i++) disposers[i]()
					if (controller.timer) clearInterval(controller.timer)
					var e = document.querySelector(ENTRY_SELECTOR)
					if (e) e.remove()
					var p = document.querySelector(PANEL_SELECTOR)
					if (p) p.remove()
				}
			}, "dsh-claude-migrator: ui")
		}

		exports.apply = apply
		// shell 按 inject 声明调度 apply 时机：与 package.json 的 dsh.client.inject 对应，
		// 声明 client-runtime / connection / ui-settings，确保 UI 服务就绪后再激活。
		exports.inject = ['slots', 'locale']
		return module.exports
	}
})
