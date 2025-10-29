import type { GroupBobotState } from '$lib/components/tp-rl/types';

type RefreshOptions = {
 	preserveKey?: string;
 	rawValue?: string;
};

export function refreshBobotDrafts(
 	state: Record<string, GroupBobotState>,
 	bobotDrafts: Record<string, string>,
 	formatBobotValue: (n: number) => string,
 	options: RefreshOptions = {}
): Record<string, string> {
 	const nextDrafts: Record<string, string> = {};
 	for (const [key, entry] of Object.entries(state)) {
 		if (options.preserveKey === key && options.rawValue !== undefined) {
 			nextDrafts[key] = options.rawValue;
 			continue;
 		}

 		const existingDraft = bobotDrafts[key];
 		if (entry.isManual && existingDraft !== undefined) {
 			nextDrafts[key] = existingDraft;
 			continue;
 		}

 		nextDrafts[key] = formatBobotValue(entry.value);
 	}
 	return nextDrafts;
}
