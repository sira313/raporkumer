<script lang="ts">
  import { enhance } from '$app/forms';
  import { flatten, populateForm } from '$lib/utils';
  import type { ActionResult, SubmitFunction } from '@sveltejs/kit';
  import type { Snippet } from 'svelte';
  import type { HTMLFormAttributes } from 'svelte/elements';
  import { toast } from './toast.svelte';

  export interface Props {
    children: Snippet<[{ submitting: boolean; invalid: boolean }]>
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

  function resolveResultType(result: SubmitOutcome) {
    if (!result) return 'success';
    if (result instanceof Response) {
      if (result.ok) return 'success';
      if (result.status >= 300 && result.status < 400) return 'redirect';
      if (result.status >= 400 && result.status < 500) return 'failure';
      return 'error';
    }
    if (isActionResult(result)) {
      if (result.type) return result.type;
      return 'success';
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
      console.debug('[form-enhance] submit result', { action, initialType, resolvedType, status });
      try {
        switch (resolvedType) {
          case 'success': {
            const successData = await extractSuccessData(result);
            const successMessage = successData && 'message' in successData ? String(successData.message) : 'Sukses';
            if (showToast) {
              toast(successMessage, 'success');
            }
            onsuccess?.({ form: formElement, data: successData });
            break;
          }
          case 'redirect': {
            await update();
            break;
          }
          case 'failure': {
            const failureData = actionResult && 'data' in actionResult ? (actionResult.data as { fail?: string; message?: string } | undefined) : undefined;
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
              const detailMessage = typeof detail === 'object' && detail && 'message' in detail ? String(detail.message) : detail ? JSON.stringify(detail) : undefined;
              message = status ? `Error (${status}): ${detailMessage ?? 'Terjadi kesalahan.'}` : (detailMessage ?? 'Terjadi kesalahan.');
            }
            if (showToast) {
              toast(message, 'error');
            }
            break;
          }
          default: {
            await update();
            break;
          }
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
  function preSubmit(e: Event) {
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
  oninput={(e) => (invalid = !e.currentTarget.checkValidity())}
  onchange={(e) => (invalid = !e.currentTarget.checkValidity())}
>
  {@render children({ submitting, invalid })}
</form>
