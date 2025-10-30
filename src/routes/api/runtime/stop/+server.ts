import { json } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

const SHUTDOWN_SIGNALS: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGBREAK'];

function requestShutdown() {
	for (const signal of SHUTDOWN_SIGNALS) {
		try {
			if (process.listenerCount(signal) > 0) {
				process.kill(process.pid, signal);
				return;
			}
		} catch (error) {
			console.warn(`Gagal mengirim sinyal ${signal} untuk penghentian server.`, error);
		}
	}

	setTimeout(() => {
		console.warn('Memaksa penghentian Rapkumer karena sinyal tidak tersedia.');
		process.exit(0);
	}, 200);
}

export const POST = async (event: RequestEvent) => {
	const { locals } = event;
	// Server-side permission check: require 'server_stop'
	const user = locals?.user as { permissions?: string[] } | undefined;
	const hasPermission = Array.isArray(user?.permissions) && user!.permissions!.includes('server_stop');
	if (!hasPermission) {
		return json({ message: 'Akses ditolak: Anda tidak memiliki izin untuk menghentikan server.' }, { status: 403 });
	}

	requestShutdown();
	return json({ message: 'Server akan dihentikan. Tutup jendela Rapkumer ini.' });
};
