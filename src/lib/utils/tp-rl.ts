import type { TujuanPembelajaranGroup, GroupEntry, GroupBobotState } from '$lib/components/tp-rl/types';

export function buildGroupedTujuanPembelajaran(
  items: Array<Omit<TujuanPembelajaran, 'mataPelajaran'>> = []
): TujuanPembelajaranGroup[] {
  const groups = new Map<string, TujuanPembelajaranGroup>();
  for (const item of items) {
    const key = (item.lingkupMateri ?? '').trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.items = [...existing.items, item];
      if (existing.bobot == null && item.bobot != null) {
        existing.bobot = item.bobot;
      }
      continue;
    }
    groups.set(key, {
      lingkupMateri: item.lingkupMateri,
      items: [item],
      bobot: item.bobot ?? null
    });
  }
  return Array.from(groups.values());
}

export function areGroupsEqual(
  prev: TujuanPembelajaranGroup[],
  next: TujuanPembelajaranGroup[]
) {
  if (prev.length !== next.length) return false;
  for (let groupIndex = 0; groupIndex < prev.length; groupIndex += 1) {
    const a = prev[groupIndex];
    const b = next[groupIndex];
    if (a.lingkupMateri !== b.lingkupMateri) return false;
    if (a.items.length !== b.items.length) return false;
    for (let itemIndex = 0; itemIndex < a.items.length; itemIndex += 1) {
      const itemA = a.items[itemIndex];
      const itemB = b.items[itemIndex];
      if (itemA.id !== itemB.id) return false;
      if (itemA.deskripsi !== itemB.deskripsi) return false;
    }
  }
  return true;
}

export function ensureTrailingEntry(entries: GroupEntry[]): GroupEntry[] {
  const normalized = entries.map((entry) => ({
    id: entry.id,
    deskripsi: entry.deskripsi ?? '',
    deleted: entry.deleted ?? false
  }));

  const active = normalized.filter((entry) => !entry.deleted);

  while (active.length > 1) {
    const last = active[active.length - 1];
    const prev = active[active.length - 2];
    if (
      last.deskripsi.trim() === '' &&
      last.id === undefined &&
      prev.deskripsi.trim() === '' &&
      prev.id === undefined
    ) {
      active.pop();
    } else {
      break;
    }
  }

  const last = active[active.length - 1];
  if (!last || last.deskripsi.trim() !== '' || last.id !== undefined) {
    active.push({ id: undefined, deskripsi: '', deleted: false });
  }

  const deletedEntries = normalized.filter((entry) => entry.deleted && entry.id !== undefined);

  return [
    ...active,
    ...deletedEntries.map((entry) => ({ ...entry, deskripsi: '', deleted: true }))
  ];
}

export function sanitizeBobotValue(value: number) {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value;
}

export function formatBobotValue(value: number) {
  return sanitizeBobotValue(value).toFixed(2);
}

export type ApplyBobotResult = { state: Record<string, GroupBobotState>; manualSum: number };
export function applyBobotDistribution(state: Record<string, GroupBobotState>): ApplyBobotResult {
  const next: Record<string, GroupBobotState> = {};
  const autoKeys: string[] = [];
  let manualSum = 0;

  for (const [key, entry] of Object.entries(state)) {
    const sanitizedValue = sanitizeBobotValue(entry?.value ?? 0);
    const isManual = Boolean(entry?.isManual);
    if (isManual) {
      manualSum += sanitizedValue;
    } else {
      autoKeys.push(key);
    }
    next[key] = { value: sanitizedValue, isManual };
  }

  if (autoKeys.length > 0) {
    let average = (100 - manualSum) / autoKeys.length;
    if (!Number.isFinite(average) || average < 0) {
      average = 0;
    }
    for (const key of autoKeys) {
      next[key] = { value: average, isManual: false };
    }
  }

  return { state: next, manualSum };
}

export function isSameBobotState(
  prev: Record<string, GroupBobotState>,
  next: Record<string, GroupBobotState>
) {
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (const key of prevKeys) {
    if (!(key in next)) return false;
    const left = prev[key];
    const right = next[key];
    if (!left || !right) return false;
    if (Boolean(left.isManual) !== Boolean(right.isManual)) return false;
    const leftValue = sanitizeBobotValue(left.value);
    const rightValue = sanitizeBobotValue(right.value);
    if (Math.abs(leftValue - rightValue) > 0.005) return false;
  }
  return true;
}

// deriveInitialBobotState requires a groupKey function because key generation lives in page
export function deriveInitialBobotState(
  groups: TujuanPembelajaranGroup[],
  groupKey: (g: TujuanPembelajaranGroup) => string
) {
  const initial: Record<string, GroupBobotState> = {};
  for (const group of groups) {
    const key = groupKey(group);
    const rawValue = group.bobot ?? null;
    const sanitized = sanitizeBobotValue(rawValue ?? 0);
    if (rawValue === null || sanitized === 0) {
      initial[key] = { value: 0, isManual: false };
      continue;
    }
    initial[key] = { value: sanitized, isManual: true };
  }
  return applyBobotDistribution(initial).state;
}

export function computeTotalBobot(state: Record<string, GroupBobotState> = {}) {
  return Object.values(state).reduce((sum, entry) => sum + sanitizeBobotValue(entry.value), 0);
}

export function cloneBobotState(state: Record<string, GroupBobotState>) {
  const next: Record<string, GroupBobotState> = {};
  for (const [key, entry] of Object.entries(state)) {
    next[key] = {
      value: sanitizeBobotValue(entry.value ?? 0),
      isManual: Boolean(entry.isManual)
    };
  }
  return next;
}
