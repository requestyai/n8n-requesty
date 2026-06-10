export type CustomHeader = { name?: string; value?: string };

// Attribution headers identifying traffic as coming from the n8n Requesty
// community node. Always sent; can be overridden by user-supplied custom headers.
export const ATTRIBUTION_HEADERS: Record<string, string> = {
	'HTTP-Referer': 'https://github.com/requestyai/n8n-requesty',
	'X-Title': 'n8n Requesty Community Node',
};

/**
 * Merges the default attribution headers with any user-supplied custom headers.
 * User headers take precedence on name collision (case-insensitively), so a user
 * can override the defaults. Empty names/values are skipped.
 */
export function buildHeaders(customHeaders?: { header?: CustomHeader[] }): Record<string, string> {
	const headers: Record<string, string> = { ...ATTRIBUTION_HEADERS };

	for (const entry of customHeaders?.header ?? []) {
		const name = entry.name?.trim();
		if (!name || entry.value === undefined || entry.value === '') continue;

		// Drop any default whose name matches case-insensitively, then set the
		// user's header with their exact casing.
		const lower = name.toLowerCase();
		for (const key of Object.keys(headers)) {
			if (key.toLowerCase() === lower) delete headers[key];
		}
		headers[name] = entry.value;
	}

	return headers;
}
