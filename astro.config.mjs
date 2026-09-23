// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightClientMermaid from '@pasqal-io/starlight-client-mermaid';
import { unified } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
	site: 'https://rtc-agent.github.io',
	base: '/docs',
	markdown: {
		processor: unified(),
	},
	integrations: [
		starlight({
			title: 'RTC Agent',
			defaultLocale: 'root',
			locales: {
				root: {
					label: '简体中文',
					lang: 'zh-CN',
				},
				en: {
					label: 'English',
					lang: 'en',
				},
			},
			head: [
				{ tag: 'script', attrs: { type: 'module', src: 'https://cdn.jsdelivr.net/npm/@rtc-agent/component@0.1.0/dist/index.js' } },
				{ tag: 'script', attrs: { type: 'module' }, content: `
					let DOCS_INDEX = null;
					const loadIndex = () => DOCS_INDEX || fetch('/docs/docs-index.json').then(r => r.json()).then(d => DOCS_INDEX = d);

					const locale = () => location.pathname.startsWith('/docs/en/') ? 'en' : 'zh-CN';

					const searchDocs = async ({ query } = {}) => {
						if (!query || typeof query !== 'string') return [];
						const idx = await loadIndex();
						// 按空格分词，支持多关键词搜索（AND 逻辑）
						const keywords = query.trim().split(/\s+/).filter(Boolean).map(k => k.toLowerCase());
						if (keywords.length === 0) return [];
						return Object.entries(idx)
							.filter(([, p]) => {
								const text = (p.title + ' ' + (p.description || '') + ' ' + p.body).toLowerCase();
								// 所有关键词都必须匹配
								return keywords.every(kw => text.includes(kw));
							})
							.slice(0, 10)
							.map(([path, p]) => ({ path, title: p.title, description: p.description }));
					};

					const getPageMarkdown = async ({ path } = {}) => {
						if (!path || typeof path !== 'string') return null;
						const page = (await loadIndex())[path] || null;
						return page;
					};

					const listPages = async ({ section } = {}) => {
						const idx = await loadIndex();
						// 去掉首尾斜杠
						let sec = section || '';
						while (sec.startsWith('/')) sec = sec.slice(1);
						while (sec.endsWith('/')) sec = sec.slice(0, -1);
						return Object.entries(idx).filter(([p]) => !sec || p.includes('/' + sec + '/')).map(([path, p]) => ({ path, title: p.title }));
					};

					const navigateTo = ({ path } = {}) => {
						if (!path || typeof path !== 'string') return { success: false, error: 'path is required' };
						location.href = '/docs' + path; return { success: true };
					};
					const getCurrentPageInfo = async () => {
						const path = location.pathname.replace('/docs', '');
						return (await loadIndex())[path] || { path, title: document.title };
					};
					const getCodeExamples = () => [...document.querySelectorAll('pre code')].map((b, i) => ({ index: i, language: b.className.replace('language-', ''), code: b.textContent }));

					const syncTheme = () => { const a = document.querySelector('rtc-agent'); if (a) a.theme = document.documentElement.getAttribute('data-theme') || 'system'; };
					new MutationObserver(syncTheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

					const initRtcAgent = () => {
						// 如果已经初始化过，直接返回
						if (document.querySelector('#rtc-agent-global')) return;

						const agent = document.createElement('rtc-agent');
						const loc = locale();
						const rtcLang = loc === 'en' ? 'en-US' : 'zh-CN';
						Object.entries({ 'server-url': 'https://rtc-agent.cherish.chat', 'app-label': loc === 'en' ? 'RTC Agent Assistant' : 'RTC Agent 助手', theme: 'system', lang: rtcLang, 'redirect-uri': '/docs/auth/callback.html', 'database-name': 'docs-rtc-agent' }).forEach(([k, v]) => agent.setAttribute(k, v));

						const container = document.createElement('div');
						container.id = 'rtc-agent-global';
						container.appendChild(agent);
						document.body.appendChild(container);

						agent.addEventListener('rtc-agent-ready', async () => {
							agent.windowConfig = { defaultMode: 'minimized', draggable: true, resizable: true, bubblePosition: { corner: 'bottom-right', offset: { x: -24, y: 24 } } };
							// 加载文档索引，注入到 persona
							const idx = await loadIndex();
							const docList = Object.entries(idx).map(([path, p]) => "- '" + path + "': " + p.title).join('\\n');
							agent.agentConfig = {
								name: 'DocsAssistant', description: 'RTC Agent Documentation Assistant',
								persona: 'You are a patient and proactive RTC Agent documentation teacher. Your goal is to guide users through learning RTC Agent, not just answer questions.\\n\\nTeaching approach:\\n- Guide users through learning paths, suggest related topics after answering\\n- When explaining a concept, use getPageMarkdown({ path }) to navigate to relevant docs so users can see full context\\n- Use getCurrentPageInfo to understand what the user is currently viewing and provide contextual guidance\\n- Break complex topics into digestible steps with examples\\n- Ask clarifying questions to understand the user\\'s goal before diving deep\\n- Start with \"why\" before \"how\" - explain purpose before implementation\\n\\nAvailable documentation pages:\\n' + docList,
								groups: [{ name: 'docs', description: 'Documentation functions', functions: [
									{ name: 'searchDocs', description: 'Search documentation by keywords. Parameter: query (string) - search keywords, space-separated for multiple terms', parameters: [{ name: 'query', schema: { type: 'string' } }], returns: { schema: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' } } } } }, handler: searchDocs },
									{ name: 'getPageMarkdown', description: 'Get full Markdown content of a documentation page and optionally navigate to it. Parameters: path (string) - the page path from the documentation index, e.g. /introduction/ or /getting-started/;', parameters: [{ name: 'path', schema: { type: 'string' } }], returns: { schema: { type: 'object' } }, handler: getPageMarkdown },
									{ name: 'listPages', description: 'List pages in a documentation section. Parameter: section (string) - the section name from the path, e.g. "getting-started" for /getting-started/ pages, or empty to list all', parameters: [{ name: 'section', schema: { type: 'string' } }], returns: { schema: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, title: { type: 'string' } } } } }, handler: listPages },
									{ name: 'navigateTo', description: 'Navigate the browser to a documentation page. Parameter: path (string) - the page path, e.g. /introduction/', parameters: [{ name: 'path', schema: { type: 'string' } }], returns: { schema: { type: 'object' } }, handler: navigateTo },
									{ name: 'getCurrentPageInfo', description: 'Get information about the current documentation page being viewed. No parameters required.', parameters: [], returns: { schema: { type: 'object' } }, handler: getCurrentPageInfo },
									{ name: 'getCodeExamples', description: 'Extract all code examples from the current page. No parameters required. Returns array of code blocks with index, language, and code content.', parameters: [], returns: { schema: { type: 'array', items: { type: 'object', properties: { index: { type: 'number' }, language: { type: 'string' }, code: { type: 'string' } } } } }, handler: getCodeExamples },
								] }]
							};
							syncTheme();
						}, { once: true });

						const style = document.createElement('style');
						style.textContent = '#rtc-agent-global{position:fixed;bottom:0;right:0;z-index:9999;pointer-events:none}#rtc-agent-global rtc-agent{pointer-events:auto}';
						document.head.appendChild(style);
					};

					// 初始页面加载
					document.addEventListener('DOMContentLoaded', initRtcAgent);
				` },
			],
			logo: {
				light: './public/logo.svg',
				dark: './public/logo-dark.svg',
				alt: 'RTC Agent Logo',
			},
			social: [
				{ icon: 'github', label: 'Server', href: 'https://github.com/rtc-agent/server' },
			],
			sidebar: [
				{
					label: 'About',
					translations: { 'zh-CN': '关于', 'en': 'About' },
					items: [
						{ label: 'Resume', link: '/resume/', translations: { 'zh-CN': '个人简历', 'en': 'Resume' } },
					],
				},
				{
					label: 'Getting Started',
					translations: { 'zh-CN': '开始' },
					items: [
						{ label: 'What is RTC Agent', link: '/introduction/', translations: { 'zh-CN': '什么是 RTC Agent' } },
						{ label: 'Quick Start', link: '/getting-started/', translations: { 'zh-CN': '快速开始' } },
						{ label: 'Build from Source', link: '/deployment/source-build/', translations: { 'zh-CN': '源码构建' } },
						{ label: 'CDN Deployment', link: '/deployment/cdn/', translations: { 'zh-CN': 'CDN 部署' } },
						{ label: 'Distributed Cluster', link: '/deployment/distributed-deploy/', translations: { 'zh-CN': '分布式集群' } },
					],
				},
				{
					label: 'Core Concepts',
					translations: { 'zh-CN': '核心概念' },
					items: [
						{ label: 'Remote Tool Calling', link: '/concepts/rtc/', translations: { 'zh-CN': 'Remote Tool Calling' } },
						{ label: 'Virtual File System', link: '/concepts/virtual-fs/', translations: { 'zh-CN': '虚拟文件系统' } },
						{ label: 'Script Engine', link: '/concepts/script-engine/', translations: { 'zh-CN': '脚本执行引擎' } },
						{ label: 'Work Modes', link: '/concepts/work-modes/', translations: { 'zh-CN': '工作模式' } },
					],
				},
				{
					label: 'Features',
					translations: { 'zh-CN': '功能' },
					items: [
						{ label: 'Session Management', link: '/features/session/', translations: { 'zh-CN': '会话管理' } },
						{ label: 'Messaging', link: '/features/messaging/', translations: { 'zh-CN': '消息与对话' } },
						{ label: 'Skill System', link: '/features/skill-system/', translations: { 'zh-CN': 'Skill 系统' } },
						{ label: 'Commands', link: '/features/commands/', translations: { 'zh-CN': '命令系统' } },
						{ label: 'Memory', link: '/features/memory/', translations: { 'zh-CN': '记忆系统' } },
						{ label: 'Context Management', link: '/features/context-management/', translations: { 'zh-CN': '上下文管理' } },
						{ label: 'Real-time Communication', link: '/features/realtime/', translations: { 'zh-CN': '实时通信' } },
						{ label: 'LLM Built-in Tools', link: '/features/llm-tools/', translations: { 'zh-CN': 'LLM 内置工具' } },
						{ label: 'Notifications', link: '/features/notifications/', translations: { 'zh-CN': '通知系统' } },
						{ label: 'Settings', link: '/features/settings/', translations: { 'zh-CN': '全局设置系统' } },
					],
				},
				{
					label: 'Integration Guide',
					translations: { 'zh-CN': '集成指南' },
					items: [
						{ label: 'Authentication', link: '/integration/auth/', translations: { 'zh-CN': '认证与授权' } },
						{ label: 'Web Component API', link: '/integration/component-api/', translations: { 'zh-CN': 'Web Component API' } },
						{ label: 'Function Registration', link: '/integration/function-registration/', translations: { 'zh-CN': 'Function 注册指南' } },
						{ label: 'Scenario Authoring', link: '/integration/scenario-authoring/', translations: { 'zh-CN': 'Scenario 编写指南' } },
						{ label: 'i18n Integration', link: '/integration/i18n/', translations: { 'zh-CN': '国际化集成指南' } },
						{ label: 'Integration Tutorial', link: '/integration/integration-tutorial/', translations: { 'zh-CN': '接入实战' } },
						{ label: 'FAQ', link: '/integration/faq/', translations: { 'zh-CN': '常见问题' } },
					],
				},
				{
					label: 'Protocol Reference',
					translations: { 'zh-CN': '协议参考' },
					items: [
						{ label: 'Overview', link: '/protocol/', translations: { 'zh-CN': '协议总览' } },
						{ label: 'HTTP API', link: '/protocol/http-api/', translations: { 'zh-CN': 'HTTP API' } },
						{ label: 'WebSocket RPC', link: '/protocol/rpc/', translations: { 'zh-CN': 'WebSocket RPC' } },
						{ label: 'Real-time Events', link: '/protocol/events/', translations: { 'zh-CN': '实时事件' } },
					],
				},
				{
					label: 'Architecture',
					translations: { 'zh-CN': '架构' },
					items: [
						{ label: 'Overview', link: '/architecture/', translations: { 'zh-CN': '架构总览' } },
						{ label: 'Frontend', link: '/architecture/frontend/', translations: { 'zh-CN': '前端架构' } },
						{ label: 'Backend', link: '/architecture/backend/', translations: { 'zh-CN': '后端架构' } },
					],
				},
				{
					label: 'Operations',
					translations: { 'zh-CN': '运维' },
					items: [
						{ label: 'Cache Analyzer', link: '/operations/cache-analyzer/', translations: { 'zh-CN': 'LLM 缓存分析工具' } },
						{ label: 'Common Query Patterns', link: '/operations/common-query-patterns/', translations: { 'zh-CN': '通用日志查询模式' } },
						{ label: 'Script Observability', link: '/operations/script-observability/', translations: { 'zh-CN': 'Script 可观测性' } },
						{ label: 'Session Logs', link: '/operations/session-logs/', translations: { 'zh-CN': '会话生命周期日志' } },
						{ label: 'RTC & Turn Logs', link: '/operations/rtc-turn-logs/', translations: { 'zh-CN': 'RTC 与 Turn 执行日志' } },
						{ label: 'Agent & LLM Observability', link: '/operations/agent-llm-observability/', translations: { 'zh-CN': 'Agent 与 LLM 可观测性' } },
						{ label: 'Realtime Connection Logs', link: '/operations/realtime-connection-logs/', translations: { 'zh-CN': '实时通信日志' } },
						{ label: 'Recovery & Workflow Logs', link: '/operations/recovery-workflow-logs/', translations: { 'zh-CN': '错误恢复与工作流日志' } },
					],
				},
				{
					label: 'Community Showcase',
					translations: { 'zh-CN': '社区案例' },
					items: [
						{ label: 'Overview', link: '/showcase/', translations: { 'zh-CN': '案例总览' } },
						{ label: 'Mermaid Live Editor', link: '/showcase/mermaid-live-editor/', translations: { 'zh-CN': 'Mermaid Live Editor' } },
						{ label: 'Peep', link: '/showcase/peep/', translations: { 'zh-CN': 'Peep 命理工作台' } },
					],
				},
				{
					label: 'Legal',
					translations: { 'zh-CN': '法律' },
					items: [
						{ label: 'Privacy Policy', link: '/legal/privacy-policy/', translations: { 'zh-CN': '隐私权政策' } },
						{ label: 'Terms of Service', link: '/legal/terms-of-service/', translations: { 'zh-CN': '服务条款' } },
					],
				},
			],
			plugins: [starlightClientMermaid()],
		}),
	],
});
