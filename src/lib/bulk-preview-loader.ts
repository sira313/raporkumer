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
	let completedCount = 0;

	// Create a semaphore-like queue manager
	const inProgress = new Set<Promise<void>>();

	const processRequest = async (request: BulkLoadRequest): Promise<void> => {
		try {
			if (signal?.aborted) {
				throw new Error('Bulk preview loading was cancelled');
			}

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
			completedCount++;
			onProgress?.(completedCount, requests.length);
		}
	};

	// Process requests with controlled concurrency
	for (const request of requests) {
		if (signal?.aborted) {
			break;
		}

		// Wait if we have max concurrent requests in progress
		while (inProgress.size >= concurrency) {
			await Promise.race(inProgress);
		}

		const promise = processRequest(request);
		inProgress.add(promise);
		promise.finally(() => inProgress.delete(promise));
	}

	// Wait for all remaining requests to complete
	await Promise.all(inProgress);
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
