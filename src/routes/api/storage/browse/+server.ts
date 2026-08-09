import fs from 'node:fs/promises';
import path from 'node:path';
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listDirectories, listRootDrives, type BrowseResponse } from '$lib/server/storage-browse';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (locals.user?.type !== 'admin') {
		error(403, 'Hanya admin yang dapat menjelajah folder.');
	}

	const requested = url.searchParams.get('path')?.trim() ?? '';
	const subName = url.searchParams.get('name')?.trim() ?? '';

	// No path -> filesystem root (drives on Windows).
	if (!requested) {
		if (process.platform === 'win32') {
			const drives = await listRootDrives();
			return json({ current: '', parent: null, entries: [], drives } satisfies BrowseResponse);
		}
		const root = path.parse(path.resolve('/')).root;
		const entries = await listDirectories(root);
		return json({ current: root, parent: null, entries, drives: [] } satisfies BrowseResponse);
	}

	// Resolve server-side so sub-folder names join with the correct separator.
	const dir = subName ? path.resolve(requested, subName) : path.resolve(requested);
	const current = dir;
	let parent: string | null;
	let drives: string[] = [];

	let stat;
	try {
		stat = await fs.stat(dir);
	} catch {
		error(400, 'Folder tidak ditemukan atau tidak dapat diakses.');
	}
	if (!stat.isDirectory()) {
		error(400, 'Path yang dipilih bukan folder.');
	}

	const root = path.parse(dir).root;
	if (process.platform === 'win32' && path.dirname(dir) === dir) {
		// at a drive root, e.g. C:\ -> show all drives so users can switch
		parent = null;
		drives = await listRootDrives();
	} else {
		parent = dir === root ? null : path.dirname(dir);
	}

	let entries: string[] = [];
	try {
		entries = await listDirectories(dir);
	} catch {
		error(400, 'Folder tidak dapat dibaca.');
	}

	return json({ current, parent, entries, drives } satisfies BrowseResponse);
};
