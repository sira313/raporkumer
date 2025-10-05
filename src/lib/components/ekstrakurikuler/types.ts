import type { tableEkstrakurikuler } from '$lib/server/db/schema';

export type EkstrakurikulerRow = typeof tableEkstrakurikuler.$inferSelect;
