export function parseForwardedHeader(value: string | null): Record<string, string> | null {
	if (!value) return null;
	const entries = value.split(',').map((entry) => entry.trim());
	for (const entry of entries) {
		const params = entry.split(';').map((param) => param.trim());
		const result: Record<string, string> = {};
		for (const param of params) {
			const [key, rawValue] = param.split('=');
			if (!key || !rawValue) continue;
			const normalizedKey = key.toLowerCase();
			const strippedValue = rawValue.replace(/^"|"$/g, '');
			result[normalizedKey] = strippedValue;
		}
		if (Object.keys(result).length > 0) {
			return result;
		}
	}
	return null;
}

export function resolveRequestProtocol(request: Request, url: URL): string {
	const xForwardedProto = request.headers.get('x-forwarded-proto');
	if (xForwardedProto) {
		const proto = xForwardedProto.split(',')[0]?.trim().toLowerCase();
		if (proto) return proto;
	}

	const forwarded = parseForwardedHeader(request.headers.get('forwarded'));
	if (forwarded?.proto) {
		return forwarded.proto.toLowerCase();
	}

	const originHeader = request.headers.get('origin');
	if (originHeader) {
		try {
			return new URL(originHeader).protocol.replace(/:$/, '').toLowerCase();
		} catch {
			// ignore malformed origin header
		}
	}

	const refererHeader = request.headers.get('referer');
	if (refererHeader) {
		try {
			return new URL(refererHeader).protocol.replace(/:$/, '').toLowerCase();
		} catch {
			// ignore malformed referer header
		}
	}

	return url.protocol.replace(/:$/, '').toLowerCase();
}

export function isSecureRequest(request: Request, url: URL): boolean {
	return resolveRequestProtocol(request, url) === 'https';
}
