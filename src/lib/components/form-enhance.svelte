<script lang="ts">
	import { enhance } from '$app/forms';
	import { flatten, populateForm } from '$lib/utils';
	import type { SubmitFunction } from '@sveltejs/kit';
	import type { Snippet } from 'svelte';
	import type { HTMLFormAttributes } from 'svelte/elements';
	import { toast } from './toast.svelte';

	interface Props {
		children: Snippet<[{ submitting: boolean }]>;
		action: string;
		enctype?: HTMLFormAttributes['enctype'];
		init?: Record<string, unknown>;
	}

	let { children, action, enctype, init }: Props = $props();
	let submitting = $state(false);

	const enhancedSubmit: SubmitFunction = () => {
		submitting = true;
		return async ({ update, result }) => {
			try {
				await update({ reset: false, invalidateAll: false });
				switch (result.type) {
					case 'success':
						toast(result.data?.message || 'Sukses', 'success');
						break;
					case 'failure':
						toast(result.data?.fail || 'Gagal', 'warning');
						break;
					case 'error':
						const message =
							`Formulir error. (${result.status}): \n` +
							(result.error?.message || JSON.stringify(result.error));
						toast(message, 'error');
					default:
						break;
				}
			} catch (error) {
				console.error(error);
				toast(`Gagal mengirim formulir`, 'error');
			} finally {
				submitting = false;
			}
		};
	};

	function loader(form: HTMLFormElement) {
		// well, this is client side loader, doesn't make us of
		// ssr, but this make form element value loading ease
		if (init) populateForm(form, flatten(init));
	}
</script>

<form {action} method="POST" {enctype} use:enhance={enhancedSubmit} use:loader>
	{@render children({ submitting })}
</form>
