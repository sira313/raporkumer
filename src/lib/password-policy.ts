/**
 * Shared password strength rules enforced server-side whenever a password is
 * set or changed (login password change, user creation, credential updates).
 * Client-safe (no server imports) so forms can pre-validate before submit.
 */
export const PASSWORD_MIN_LENGTH = 8;

export function validatePasswordStrength(password: string): string | null {
	if (!password) return 'Kata sandi wajib diisi.';
	if (password.length < PASSWORD_MIN_LENGTH) {
		return `Kata sandi minimal ${PASSWORD_MIN_LENGTH} karakter.`;
	}
	if (!/[A-Za-z]/.test(password)) {
		return 'Kata sandi harus mengandung huruf.';
	}
	if (!/\d/.test(password)) {
		return 'Kata sandi harus mengandung angka.';
	}
	return null;
}
