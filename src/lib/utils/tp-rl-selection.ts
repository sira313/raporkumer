import type {
	GroupFormState,
	SelectedGroupState,
	TujuanPembelajaranGroup
} from '$lib/components/tp-rl/types';

export function groupKey(group: TujuanPembelajaranGroup) {
 	return `${group.lingkupMateri ?? ''}::${group.items.map((item) => item.id).join('-')}`;
}

export function groupSelectionPayload(group: TujuanPembelajaranGroup): SelectedGroupState {
 	return {
 		lingkupMateri: group.lingkupMateri,
 		ids: group.items.map((item) => item.id)
 	};
}

export function removeSelectionByKey(
 	selectedGroups: Record<string, SelectedGroupState>,
 	key: string
): Record<string, SelectedGroupState> {
 	if (!(key in selectedGroups)) return selectedGroups;
 	const rest = { ...selectedGroups };
 	delete rest[key];
 	return rest;
}

export function isGroupSelected(
 	selectedGroups: Record<string, SelectedGroupState>,
 	group: TujuanPembelajaranGroup
): boolean {
 	return Boolean(selectedGroups[groupKey(group)]);
}

export function computeToggleSelection(
 	selectedGroups: Record<string, SelectedGroupState>,
 	group: TujuanPembelajaranGroup,
 	checked: boolean
): Record<string, SelectedGroupState> {
 	const key = groupKey(group);
 	if (checked) {
 		return {
 			...selectedGroups,
 			[key]: groupSelectionPayload(group)
 		};
 	}
 	return removeSelectionByKey(selectedGroups, key);
}

export function computeSelectAllChange(
 	selectableGroups: TujuanPembelajaranGroup[],
 	checked: boolean
): Record<string, SelectedGroupState> {
 	if (checked) {
 		return Object.fromEntries(
 			selectableGroups.map((group) => [groupKey(group), groupSelectionPayload(group)] as const)
 		);
 	}
 	return {};
}

export function isEditingGroup(group: TujuanPembelajaranGroup, groupForm: GroupFormState | null) {
 	if (!groupForm || groupForm.mode !== 'edit') return false;
 	const targetSet = new Set(groupForm.targetIds);
 	return (
 		group.items.length === targetSet.size && group.items.every((item) => targetSet.has(item.id))
 	);
}
