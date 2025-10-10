<script lang="ts">
	import { enhance } from '$app/forms';
	import { flatten, populateForm } from '$lib/utils';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { toast } from './toast.svelte';

	interface Props {
		children: Snippet<[{ submitting: boolean; invalid: boolean }]>;
		action: string;
		id?: string;
		enctype?: HTMLFormAttributes['enctype'];
		init?: Record<string, unknown>;
		onsuccess?: (params: { form: HTMLFormElement; data?: Record<string, unknown> }) => void;
		submitStateChange?: (submitting: boolean) => void;
		showToast?: boolean;
	}

	let {
		children,
		action,
		id,
		enctype,
		init,
		onsuccess,
		submitStateChange,
		showToast = true
	}: Props = $props();
	let submitting = $state(false);
	let invalid = $state(true);

	type GenericActionResult = ActionResult<Record<string, unknown>, Record<string, unknown>>;
	type SubmitOutcome = GenericActionResult | Response | undefined;

	function isActionResult(value: SubmitOutcome): value is GenericActionResult {
		return typeof value === 'object' && value !== null && 'type' in value;
	}

	function resolveResultType(result: SubmitOutcome) {
		if (!result) return 'success';
		if (result instanceof Response) {
			if (result.ok) return 'success';
			if (result.status >= 400 && result.status < 500) return 'failure';
			return 'error';
		}
		if (isActionResult(result)) {
			if (result.type) return result.type;
			if (typeof result.status === 'number') {
				if (result.status >= 200 && result.status < 300) return 'success';
				if (result.status >= 400 && result.status < 500) return 'failure';
				return 'error';
			}
		}
		return 'success';
	}

	async function extractSuccessData(result: SubmitOutcome) {
		try {
			if (!result) return undefined;
			if (result instanceof Response) {
				const contentType = result.headers.get('content-type') || '';
				if (contentType.includes('application/json')) {
					const clone = result.clone();
					return (await clone.json()) as Record<string, unknown>;
				}
				return undefined;
			}
			if (isActionResult(result) && 'data' in result) {
				return result.data as Record<string, unknown> | undefined;
			}
		} catch (error) {
			console.warn('[form-enhance] gagal mengekstrak data sukses', error);
		}
		return undefined;
	}

	const enhancedSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ update, formElement, result }) => {
			const resolvedType = resolveResultType(result);
			const actionResult = isActionResult(result) ? result : undefined;
			const status = result instanceof Response ? result.status : actionResult?.status;
			const initialType = actionResult?.type;
			console.debug('[form-enhance] submit result', {
				action,
				initialType,
				resolvedType,
				status
			});
			try {
				switch (resolvedType) {
					case 'success': {
						const successData = await extractSuccessData(result);
						const successMessage =
							successData && 'message' in successData ? String(successData.message) : 'Sukses';
						if (showToast) {
							toast(successMessage, 'success');
						}
						onsuccess?.({ form: formElement, data: successData });
						break;
					}
					case 'failure': {
						const failureData =
							actionResult && 'data' in actionResult
								? (actionResult.data as { fail?: string; message?: string } | undefined)
								: undefined;
						if (showToast) {
							toast(failureData?.fail || failureData?.message || 'Gagal', 'warning');
						}
						break;
					}
					case 'error': {
						let message = 'Terjadi kesalahan.';
						if (result instanceof Response) {
							message = `Error (${result.status})`;
						} else if (actionResult) {
							const detail = 'error' in actionResult ? actionResult.error : undefined;
							const detailMessage =
								typeof detail === 'object' && detail && 'message' in detail
									? String(detail.message)
									: detail
										? JSON.stringify(detail)
										: undefined;
							message = status
								? `Error (${status}): ${detailMessage ?? 'Terjadi kesalahan.'}`
								: (detailMessage ?? 'Terjadi kesalahan.');
						}
						if (showToast) {
							toast(message, 'error');
						}
						break;
					}
					default:
						await update();
						break;
				}
			} catch (error) {
				console.error(error);
				toast(`Gagal mengirim formulir`, 'error');
			} finally {
				submitting = false;
				invalid = !formElement.checkValidity();
			}
		};
	};

	function loader(form: HTMLFormElement) {
		// well, this is client side loader, doesn't make us of
		// ssr, but this make form element value loading ease
		if (init) {
			populateForm(form, flatten(init));
			invalid = !form.checkValidity();
		}
	}

	$effect(() => {
		submitStateChange?.(submitting);
	});
</script>

<form
	{id}
	{action}
	method="POST"
	{enctype}
	use:enhance={enhancedSubmit}
	use:loader
	oninput={(e) => (invalid = !e.currentTarget.checkValidity())}
	onchange={(e) => (invalid = !e.currentTarget.checkValidity())}
>
	{@render children({ submitting, invalid })}
</form>
