/**
 * In-memory serial queue for AI requests, one lane per API key.
 *
 * Free-tier Gemini allows roughly 10 requests/minute per key. When many users
 * share the school key they would otherwise fire requests simultaneously and
 * hit 429s. This queue serializes execution per key and enforces a minimum
 * interval between request starts so shared-key traffic stays under the limit.
 * Personal keys get their own lane and never wait behind the school key.
 *
 * ponytail: constants are hardcoded; promote to settings UI if real usage
 * demands tuning. Also single-process only — a multi-instance deployment would
 * need an external queue (not a realistic scenario for this app).
 */

/** Minimum gap between two request starts on the same lane (~9 req/min). */
export const AI_MIN_INTERVAL_MS = 6_500;
/** Max time a request may sit in the queue before failing fast. */
export const AI_MAX_WAIT_MS = 45_000;
/** Max queued requests per lane; beyond this, new requests are rejected immediately. */
export const AI_MAX_QUEUE = 30;

const lanes = new Map<string, Lane>();

type Lane = {
	queue: QueueEntry[];
	draining: boolean;
	lastStartAt: number;
};

type QueueEntry = {
	enqueuedAt: number;
	task: () => Promise<unknown>;
	resolve: (value: unknown) => void;
	reject: (reason?: unknown) => void;
};

export class AiQueueBusyError extends Error {
	constructor() {
		super(
			'Server AI sedang ramai. Antrean penuh atau waktu tunggu habis — coba lagi beberapa saat.'
		);
		this.name = 'AiQueueBusyError';
	}
}

function sleep(ms: number) {
	return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

async function drain(laneKey: string, lane: Lane) {
	if (lane.draining) return;
	lane.draining = true;
	try {
		while (lane.queue.length > 0) {
			const entry = lane.queue.shift()!;
			// Fail fast for entries whose patience ran out while waiting their turn.
			if (Date.now() - entry.enqueuedAt > AI_MAX_WAIT_MS) {
				entry.reject(new AiQueueBusyError());
				continue;
			}
			const sinceLastStart = Date.now() - lane.lastStartAt;
			const spacing = AI_MIN_INTERVAL_MS - sinceLastStart;
			if (spacing > 0) await sleep(spacing);
			lane.lastStartAt = Date.now();
			try {
				entry.resolve(await entry.task());
			} catch (err) {
				entry.reject(err);
			}
		}
	} finally {
		lane.draining = false;
	}
}

/**
 * Run `task` on the lane identified by `laneKey`, strictly serialized with at
 * least `AI_MIN_INTERVAL_MS` between starts. Rejects with `AiQueueBusyError`
 * when the lane is over capacity or the entry waited past `AI_MAX_WAIT_MS`.
 */
export function enqueueAi<T>(laneKey: string, task: () => Promise<T>): Promise<T> {
	let lane = lanes.get(laneKey);
	if (!lane) lanes.set(laneKey, (lane = { queue: [], draining: false, lastStartAt: 0 }));
	if (lane.queue.length >= AI_MAX_QUEUE) return Promise.reject(new AiQueueBusyError());
	return new Promise<T>((resolve, reject) => {
		const entry: QueueEntry = {
			enqueuedAt: Date.now(),
			task: async () => task(),
			resolve: (value) => resolve(value as T),
			reject
		};
		lane!.queue.push(entry);
		void drain(laneKey, lane!);
	});
}
