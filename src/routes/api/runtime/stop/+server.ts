import { json } from '@sveltejs/kit';

export const POST = async () => {
	setTimeout(() => {
		console.warn('Rapkumer server shutting down by user request.');
		process.exit(0);
	}, 150);

	return json({ message: 'Server akan dihentikan. Tutup jendela Rapkumer ini.' });
};
