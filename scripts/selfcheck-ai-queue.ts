// Runnable check for src/lib/server/ai-queue.ts (no deps, Node >= 22.6 type stripping).
// Run: node scripts/selfcheck-ai-queue.ts
import assert from 'node:assert/strict';
import {
	AiQueueBusyError,
	AI_MAX_QUEUE,
	AI_MIN_INTERVAL_MS,
	enqueueAi
} from '../src/lib/server/ai-queue.ts';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function testSerialOrderAndSpacing() {
	const starts: number[] = [];
	const tasks = [1, 2, 3].map((n) =>
		enqueueAi('lane-a', async () => {
			starts.push(Date.now());
			await sleep(20);
			return n;
		})
	);
	const results = await Promise.all(tasks);
	assert.deepEqual(results, [1, 2, 3], 'FIFO order');
	for (let i = 1; i < starts.length; i++) {
		const gap = starts[i] - starts[i - 1];
		assert.ok(
			gap >= AI_MIN_INTERVAL_MS - 10,
			`start ${i} spaced (${gap}ms < ${AI_MIN_INTERVAL_MS}ms)`
		);
	}
}

async function testLaneIsolation() {
	// A slow lane-A task must not delay lane-B.
	let aDone = false;
	const a = enqueueAi('iso-a', async () => {
		await sleep(300);
		aDone = true;
	});
	const bStart = Date.now();
	const b = enqueueAi('iso-b', async () => true);
	await b;
	assert.ok(Date.now() - bStart < 200, 'lane B ran while lane A busy');
	await a;
	assert.ok(aDone);
}

async function testCapacityCap() {
	const tasks: Promise<number>[] = [];
	for (let i = 0; i <= AI_MAX_QUEUE; i++) {
		tasks.push(enqueueAi('cap', async () => i));
	}
	await assert.rejects(tasks[AI_MAX_QUEUE], AiQueueBusyError, 'overflow rejected');
	// Let the lane drain before later tests.
	await Promise.allSettled(tasks.slice(0, AI_MAX_QUEUE));
}

async function testMaxWaitTimeout() {
	// Simulate waiting past AI_MAX_WAIT_MS by shifting the clock while a
	// blocker occupies the lane; queued entries must fail fast, not run.
	const realNow = Date.now;
	let offset = 0;
	Date.now = () => realNow() + offset;
	try {
		const blocker = enqueueAi('wait', () => new Promise<void>((r) => setTimeout(r, 150)));
		const victims = [enqueueAi('wait', async () => 1), enqueueAi('wait', async () => 2)];
		await sleep(50); // let all entries enqueue
		offset += 46_000; // now every waiter is past its deadline
		await assert.rejects(victims[0], AiQueueBusyError, 'expired waiter rejected');
		await assert.rejects(victims[1], AiQueueBusyError, 'expired waiter rejected');
		await blocker;
	} finally {
		Date.now = realNow;
	}
}

for (const fn of [
	testSerialOrderAndSpacing,
	testLaneIsolation,
	testCapacityCap,
	testMaxWaitTimeout
]) {
	await fn();
	console.log(`ok: ${fn.name}`);
}
console.log('all ai-queue checks passed');
