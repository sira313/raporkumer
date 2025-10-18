/**
 * Client helper for piagam background operations.
 * Keeps fetch calls centralized so pages/components remain tidy.
 */
export async function deletePiagamBg(template: string) {
	const res = await fetch(`/api/sekolah/piagam-bg/${template}`, { method: 'DELETE' });
	if (!res.ok) {
		// try to read body for better error
		let body: string | null = null;
		try {
			body = await res.text();
		} catch {
			void 0;
		}
		throw new Error(body || String(res.status));
	}
}
