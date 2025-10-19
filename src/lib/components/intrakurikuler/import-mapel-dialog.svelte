<script lang="ts">
  import FormEnhance from '$lib/components/form-enhance.svelte';
  import Icon from '$lib/components/icon.svelte';
  import { hideModal } from '$lib/components/global-modal.svelte';
  import { invalidate } from '$app/navigation';

  interface Props {
    onSuccess?: () => void;
  }

  let { onSuccess }: Props = $props();

  const fileInputId = 'import-mapel-file';
  let fileInput: HTMLInputElement | null = null;
  let hasFile = $state(false);
  let fileName = $state('');

  function handleFileChange(e: Event) {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    hasFile = Boolean(file);
    fileName = file ? file.name : '';
  }

  function resetForm(form?: HTMLFormElement | null) {
    hasFile = false;
    fileName = '';
    if (fileInput) fileInput.value = '';
    form?.reset();
  }

  function handleClose() {
    resetForm();
    hideModal();
  }
</script>

<div>
  <h3 class="mb-2 text-lg font-bold">Import Mata Pelajaran</h3>
  <p class="text-base-content/70 mb-4 text-sm">Unggah file Excel (.xlsx) yang berisi kolom <strong>Nama</strong>, <strong>Jenis</strong>, dan <strong>KKM</strong>. Baris kosong akan diabaikan.</p>

  <div class="bg-base-200 border-base-300 dark:bg-base-300 mb-4 overflow-x-auto rounded-lg border p-3 text-sm">
    <table class="table-compact table w-full">
      <thead>
        <tr>
          <th class="bg-base-300 dark:bg-base-200">Nama</th>
          <th class="bg-base-300 dark:bg-base-200">Jenis</th>
          <th class="bg-base-300 dark:bg-base-200">KKM</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Bahasa Indonesia</td>
          <td>wajib</td>
          <td>65</td>
        </tr>
        <tr>
          <td>Matematika</td>
          <td>wajib</td>
          <td>65</td>
        </tr>
      </tbody>
    </table>
  </div>

  <FormEnhance action="?/import_mapel" enctype="multipart/form-data" showToast={true} onsuccess={async ({ form }) => {
      // revalidate the same dependency token used in the page load (depends('app:mapel'))
      await invalidate('app:mapel');
      onSuccess?.();
      resetForm(form);
      hideModal();
    }}>
    {#snippet children({ submitting })}
      <fieldset class="fieldset">
        <legend class="fieldset-legend font-semibold">Pilih File Excel (.xlsx)</legend>
        <input id={fileInputId} bind:this={fileInput} onchange={handleFileChange} required name="file" type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" class="file-input file-input-ghost" />
        <label class="label" for={fileInputId}>
          <span class="label-text-alt text-base-content/60 text-xs">Maksimal 2MB. Pastikan kolom Nama, Jenis (wajib/pilihan/mulok), dan KKM tersedia.</span>
          {#if fileName}
            <span class="label-text-alt text-base-content/60 text-xs">File dipilih: <strong>{fileName}</strong></span>
          {/if}
        </label>
      </fieldset>

      <div class="mt-6 flex justify-end gap-2">
        <button type="button" class="btn shadow-none btn-soft" onclick={handleClose} disabled={submitting}>Batal</button>
        <button type="submit" class="btn btn-primary shadow-none btn-soft" disabled={submitting || !hasFile}>
          {#if submitting}
            <span class="loading loading-spinner"></span>
          {:else}
            <Icon name="import" /> Import
          {/if}
        </button>
      </div>
    {/snippet}
  </FormEnhance>
</div>
