const faseBadgeColors: Record<string, string> = {
	'Fase A': 'badge-primary',
	'Fase B': 'badge-secondary',
	'Fase C': 'badge-accent',
	'Fase D': 'badge-info',
	'Fase E': 'badge-success',
	'Fase F': 'badge-warning'
};

export const faseBadgeClass = (fase?: string | null) =>
	faseBadgeColors[fase ?? ''] ?? 'badge-ghost';
