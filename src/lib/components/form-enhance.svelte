<script lang="ts">
	import { enhance } from '$app/forms';
	import { flatten, populateForm } from '$lib/utils';
	import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { toast } from './toast.svelte';

	export interface Props {
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
	let formEl: HTMLFormElement | null = null;

	type GenericActionResult = ActionResult<Record<string, unknown>, Record<string, unknown>>;
	type SubmitOutcome = GenericActionResult | Response | undefined;

	function isActionResult(value: SubmitOutcome): value is GenericActionResult {
		return typeof value === 'object' && value !== null && 'type' in value;
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
			// Some endpoints return a plain JSON object (not a Response nor an ActionResult)
			// (for example when the enhance shim already parsed JSON). Accept that shape
			// as success data as well.
			if (typeof result === 'object' && result !== null) {
				return result as Record<string, unknown>;
			}
		} catch (error) {
			console.warn('[form-enhance] gagal mengekstrak data sukses', error);
		}
		return undefined;
	}


	const enhancedSubmit: SubmitFunction = () => {
		submitting = true;
		return async (args) => {
			// `result` may be an ActionResult (for server actions) or a Response
			// (for endpoint responses). Some environments may provide a plain
			// Response-like object without `type`, so handle both cases. Use a
			// local `raw` variable to avoid TypeScript narrowing issues.
			const raw = (args as any).result as SubmitOutcome;
			const update = (args as any).update as (() => Promise<void>) | undefined;
			const actionResult = isActionResult(raw) ? (raw as GenericActionResult) : undefined;
			const isResponse = raw instanceof Response;
			const status = isResponse ? (raw as Response).status : actionResult?.status;
			const initialType = actionResult?.type;
			console.debug('[form-enhance] submit result', {
				action,
				initialType,
				raw,
				status
			});
			try {
				// Resolve the kind of result we have. Prefer `result.type` when
				// available (ActionResult). Otherwise, infer from HTTP status on
				// Response objects.
				// If the raw result is a plain object with a `message` it is likely a
				// parsed JSON response from the endpoint; treat that as success.
				const isPlainObject = typeof raw === 'object' && raw !== null && !isResponse;
				const resultType = actionResult
					? actionResult.type
					: isResponse
					? (raw as Response).ok
						? 'success'
						: 'error'
					: isPlainObject && 'message' in (raw as Record<string, unknown>)
					? 'success'
					: undefined;
				switch (resultType) {
					case 'success': {
						const successData = await extractSuccessData(raw);
						const successMessage =
							successData && 'message' in successData ? String(successData.message) : 'Sukses';
						if (showToast) {
							toast(successMessage, 'success');
						}
						onsuccess?.({ form: (args as any).form ?? (args as any).formElement, data: successData });
						break;
					}
					case 'redirect': {
						if (update) await update();
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
						let message = `Error (${status ?? '??'}): ${
							// try to pick a helpful error message from the action/result
							(actionResult && (actionResult as any).error?.message) ||
							(isResponse ? String((raw as Response).statusText) : JSON.stringify(raw))
						} \n\ndebug: "${(actionResult && (actionResult as any).error?.debug) || ''}"`;
						if (showToast) {
							toast({
								message: message,
								type: 'error',
								persist: true
							});
						}
						console.error(message);
						break;
					}
					default: {
						// If we couldn't determine a type, still attempt an update so any
						// server-driven state changes are applied to the page.
						try {
							if (update) await update();
						} catch (e) {
							console.debug('[form-enhance] update() failed for unknown result type', e);
						}
						break;
					}
				}
			} catch (error) {
				console.error(error);
				toast(`Gagal mengirim formulir`, 'error');
			} finally {
				submitting = false;
					const formEl = (args as any).form ?? (args as any).formElement;
					invalid = !(formEl && (formEl as HTMLFormElement).checkValidity());
			}
		};
	};

	// action used to populate the form on mount
	function loader(form: HTMLFormElement) {
		if (init) {
			populateForm(form, flatten(init));
			invalid = !form.checkValidity();
		}
	}

	$effect(() => {
		submitStateChange?.(submitting);
	});

	// Ensure jenjangVariant hidden input gets populated from the selected option right before submit.
	function preSubmit() {
		try {
			const form = formEl;
			if (!form) return;
			const sel = form.querySelector<HTMLSelectElement>('select[name="jenjangPendidikan"]');
			if (!sel) return;
			const opt = sel.selectedOptions?.[0];
			const variant = opt?.dataset?.variant ?? '';
			const hidden = form.elements.namedItem('jenjangVariant') as HTMLInputElement | null;
			if (hidden) hidden.value = variant;
		} catch (err) {
			console.warn('[form-enhance] preSubmit failed to set jenjangVariant', err);
		}
	}
</script>

<form
	bind:this={formEl}
	{id}
	{action}
	method="POST"
	{enctype}
	use:enhance={enhancedSubmit}
	use:loader
	onsubmit={preSubmit}
	oninput={() => (invalid = !(formEl && formEl.checkValidity()))}
	onchange={() => (invalid = !(formEl && formEl.checkValidity()))}
>
	{@render children({ submitting, invalid })}
</form>
