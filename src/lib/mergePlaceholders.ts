export function mergePlaceholders(html: string, data: Record<string, any>): string {
	return String(html || '').replace(/\{\{([^}]+)\}\}/g, (_: any, key: string) => {
		const path = key.trim().split('.');
		let cur: any = data;
		for (const p of path) cur = cur?.[p];
		return cur == null ? '' : String(cur);
	});
}














