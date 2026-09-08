// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightClientMermaid from '@pasqal-io/starlight-client-mermaid';
import { unified } from '@astrojs/markdown-remark';

// https://astro.build/config
export default defineConfig({
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
			plugins: [starlightClientMermaid()],
		}),
	],
});
