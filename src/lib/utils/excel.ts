export async function readBufferToAoA(
	buffer: ArrayBuffer | Buffer
): Promise<Array<Array<string | number>>> {
	const mod = (await import('./excel.js')) as {
		readBufferToAoA: (b: ArrayBuffer | Buffer) => Promise<Array<Array<string | number>>>;
	};
	return mod.readBufferToAoA(buffer);
}

export async function writeAoaToBuffer(rows: Array<Array<unknown>>): Promise<Buffer> {
	const mod = (await import('./excel.js')) as {
		writeAoaToBuffer: (rows: Array<Array<unknown>>) => Promise<Buffer>;
	};
	return mod.writeAoaToBuffer(rows);
}
