import type { tableKokurikuler } from '$lib/server/db/schema';

export type KokurikulerRow = typeof tableKokurikuler.$inferSelect;
