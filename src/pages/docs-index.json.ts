import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

export const GET: APIRoute = async () => {
	const docs = await getCollection('docs');

	const index: Record<string, {
		title: string;
		description: string;
		locale: string;
		body: string;
	}> = {};

	for (const doc of docs) {
		const id = doc.id;
		const data = doc.data;

		// 转换为 URL 路径
		let slug = id.replace(/\.mdx?$/, '').replace(/\/index$/, '');
		if (!slug) slug = 'introduction';

		// 判断语言
		const locale = slug.startsWith('en/') ? 'en' : 'zh-CN';

		const path = '/' + slug + '/';
		index[path] = {
			title: data.title,
			description: data.description || '',
			locale,
			body: doc.body || '', // 包含完整的 Markdown 内容
		};
	}

	return new Response(JSON.stringify(index), {
		headers: {
			'Content-Type': 'application/json',
			'Cache-Control': 'public, max-age=3600',
		},
	});
};
