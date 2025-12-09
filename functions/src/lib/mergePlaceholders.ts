export function mergePlaceholders(html: string, data: Record<string, any>): string {
	const helpers = {
		formatCurrency: (val: any): string => {
			const num = Number(val);
			return isNaN(num) ? '0.00' : num.toFixed(2);
		},
		formatPercent: (val: any, decimals: number = 2): string => {
			const num = Number(val);
			return isNaN(num) ? '0.00' : num.toFixed(decimals);
		},
		hasCosting: (offer: any): boolean => {
			return offer && offer.calcSummary && offer.calcSummary !== null;
		},
	};

	// First pass: resolve nested paths
	let result = String(html || '').replace(/\{\{([^}]+)\}\}/g, (_: any, key: string) => {
		const trimmed = key.trim();
		
		// Check for helper function calls (format: helperName(arg))
		const helperMatch = trimmed.match(/^(\w+)\(([^)]+)\)$/);
		if (helperMatch) {
			const [, helperName, arg] = helperMatch;
			const helperFn = (helpers as any)[helperName];
			if (helperFn) {
				// Resolve the argument (could be a nested path)
				const argPath = arg.trim().split('.');
				let argValue: any = data;
				for (const p of argPath) argValue = argValue?.[p];
				return helperFn(argValue);
			}
		}
		
		// Regular nested path resolution
		const path = trimmed.split('.');
		let cur: any = data;
		for (const p of path) cur = cur?.[p];
		return cur == null ? '' : String(cur);
	});

	// Second pass: handle conditional blocks {{#if offer.calcSummary}}...{{/if}}
	result = result.replace(/\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_: any, condition: string, content: string) => {
		const path = condition.trim().split('.');
		let cur: any = data;
		for (const p of path) cur = cur?.[p];
		// Check truthiness
		const isTruthy = cur != null && cur !== false && cur !== '' && cur !== 0;
		return isTruthy ? content : '';
	});

	return result;
}


