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
			logo: {
				light: './public/logo.svg',
				dark: './public/logo-dark.svg',
				alt: 'RTC Agent Logo',
			},
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/rtc-agent/rtc-agent' },
			],
			sidebar: [
				{
					label: 'Getting Started',
					translations: { 'zh-CN': '开始' },
					items: [
						{ label: 'What is RTC Agent', link: '/introduction/', translations: { 'zh-CN': '什么是 RTC Agent' } },
						{ label: 'Quick Start', link: '/getting-started/', translations: { 'zh-CN': '快速开始' } },
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
			],
			plugins: [starlightClientMermaid()],
		}),
	],
});
