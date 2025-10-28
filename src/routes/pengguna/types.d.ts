type UserPermissionGroup = typeof import('./permissions').groupedUserPermissions;

type UserPermissionValue<K extends keyof UserPermissionGroup, V extends string> = `${K}_${V}`;

type UserPermission = {
	[K in keyof UserPermissionGroup]: Exclude<
		ValueOf<UserPermissionGroup[K]['values'][number]>,
		UserPermissionGroup[K]['values'][number][1]
	> extends infer U
		? U extends string
			? UserPermissionValue<K, U>
			: never
		: never;
}[keyof UserPermissionGroup];
