// Bulk Preview Loading with Error Recovery
// Handles multiple murid previews with graceful error handling

export type BulkLoadRequest = {
	muridId: number;
	muridNama: string;
};

export type BulkLoadResult<T> = {
	muridId: number;
	muridNama: string;
	success: boolean;
	data?: T;
	error?: string;
};

export type BulkLoadOptions = {
	signal?: AbortSignal;
	concurrency?: number; // Default 3 concurrent requests
	onProgress?: (current: number, total: number) => void;
};

/**
 * Load multiple previews with error recovery and progress tracking
 */
export async function loadBulkPreviews<T>(
	requests: BulkLoadRequest[],
	fetchFn: (muridId: number) => Promise<T>,
	options: BulkLoadOptions = {}
): Promise<BulkLoadResult<T>[]> {
	const { signal, concurrency = 3, onProgress } = options;
	const results: BulkLoadResult<T>[] = [];
	const queue = [...requests];
	let activeCount = 0;
	let completedCount = 0;

	const processNext = async (): Promise<void> => {
		while (queue.length > 0 && activeCount < concurrency) {
			if (signal?.aborted) {
				throw new Error('Bulk preview loading was cancelled');
			}

			const request = queue.shift();
			if (!request) break;

			activeCount++;

			try {
				const data = await fetchFn(request.muridId);
				results.push({
					muridId: request.muridId,
					muridNama: request.muridNama,
					success: true,
					data
				});
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Unknown error';
				results.push({
					muridId: request.muridId,
					muridNama: request.muridNama,
					success: false,
					error: errorMsg
				});
			} finally {
				activeCount--;
				completedCount++;
				onProgress?.(completedCount, requests.length);
				void processNext();
			}
		}
	};

	// Start initial batch
	const promises: Promise<void>[] = [];
	for (let i = 0; i < Math.min(concurrency, requests.length); i++) {
		promises.push(processNext());
	}

	await Promise.all(promises);
	return results;
}

/**
 * Validate bulk results - check if we have enough successful loads
 */
export function validateBulkResults<T>(
	results: BulkLoadResult<T>[],
	minSuccessful: number = 1
): { isValid: boolean; successCount: number; failureCount: number; failedMurids: string[] } {
	const successCount = results.filter((r) => r.success).length;
	const failureCount = results.filter((r) => !r.success).length;
	const failedMurids = results.filter((r) => !r.success).map((r) => r.muridNama);

	return {
		isValid: successCount >= minSuccessful,
		successCount,
		failureCount,
		failedMurids
	};
}

/**
 * Get successful results only
 */
export function getSuccessfulResults<T>(
	results: BulkLoadResult<T>[]
): Array<{ muridId: number; muridNama: string; data: T }> {
	return results
		.filter((r): r is BulkLoadResult<T> & { data: T } => r.success && r.data !== undefined)
		.map((r) => ({
			muridId: r.muridId,
			muridNama: r.muridNama,
			data: r.data
		}));
}
