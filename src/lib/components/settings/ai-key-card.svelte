<script lang="ts">
	import FormEnhance from '$lib/components/form-enhance.svelte';
	import Icon from '$lib/components/icon.svelte';

	let {
		gemini
	}: {
		gemini: {
			keySet: boolean;
			maskedKey: string | null;
			envKeyPresent: boolean;
			model: string;
			baseUrl: string;
		};
	} = $props();

	// Password visibility toggles
	let showGeminiKey = $state(false);
	let clearingGeminiKey = $state(false);
	// svelte-ignore state_referenced_locally
	let aiModel = $state(gemini.model);
	// svelte-ignore state_referenced_locally
	let aiBaseUrl = $state(gemini.baseUrl);
</script>

<section class="card bg-base-100 rounded-lg border border-none p-6 shadow-md">
	<FormEnhance
		action="?/save-gemini-key"
		onsuccess={({ form }) => {
			form.reset();
		}}
	>
		{#snippet children({ submitting, invalid })}
			<header class="mb-4 space-y-2">
				<h2 class="text-xl font-semibold">Kunci API</h2>
				<p class="text-base-content/70 text-sm">
					Konfigurasi kunci API untuk fitur "Generate" Tujuan Pembelajaran di halaman
					Intrakurikuler. Mendukung Google Gemini langsung (native API) dan semua penyedia yang
					kompatibel dengan OpenAI chat completions (OpenRouter, DeepSeek, Groq, dsb). Satu kunci
					dipakai untuk seluruh sekolah di aplikasi ini.
				</p>
				{#if gemini.keySet}
					<div class="alert alert-success">
						<Icon name="success" />
						<span>Kunci API aktif: {gemini.maskedKey}</span>
					</div>
				{:else if gemini.envKeyPresent}
					<div class="alert alert-info alert-soft">
						<Icon name="info" />
						<span
							>Kunci API aktif dari variabel lingkungan <code>GEMINI_API_KEY</code> (file .env). Kunci
							di atas tidak dapat diubah dari halaman ini.</span
						>
					</div>
				{:else}
					<div class="alert alert-warning alert-soft">
						<Icon name="warning" />
						<span>Belum ada kunci API. Fitur "Generate" belum dapat digunakan.</span>
					</div>
				{/if}
			</header>

			<fieldset class="fieldset">
				<legend class="fieldset-legend">Kunci API</legend>
				<div class="form-control">
					<label
						class="input bg-base-200 dark:bg-base-300 validator w-full border-base-300 dark:border-none"
					>
						<span class="pl-2"><Icon name="key" /></span>
						<input
							type={showGeminiKey ? 'text' : 'password'}
							id="geminiApiKey"
							name="apiKey"
							required
							minlength={10}
							placeholder="AIzaSy… / sk-… / ds-…"
							autocomplete="off"
						/>
						<button
							type="button"
							class="cursor-pointer pr-2"
							onclick={() => (showGeminiKey = !showGeminiKey)}
							aria-label="Toggle API key visibility"
						>
							<Icon name={showGeminiKey ? 'eye-off' : 'eye'} />
						</button>
					</label>
					<p class="text-base-content/70 mt-1 text-xs">
						Masukkan kunci API baru untuk mengganti kunci yang tersimpan.
					</p>
				</div>
			</fieldset>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<fieldset class="fieldset">
					<legend class="fieldset-legend">Model</legend>
					<input
						class="input bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
						type="text"
						name="model"
						bind:value={aiModel}
						placeholder="gemini-3.6-flash"
						list="ai-model-list"
					/>
					<datalist id="ai-model-list">
						<option value="gemini-3.6-flash"></option>
						<option value="gemini-3.1-pro"></option>
						<option value="gemini-3.7-flash"></option>
						<option value="claude-opus-4.8"></option>
						<option value="claude-opus-5"></option>
						<option value="claude-sonnet-5"></option>
						<option value="gpt-5.6-sol"></option>
						<option value="gpt-5.6-terra"></option>
						<option value="deepseek-v4-flash"></option>
						<option value="deepseek-v4-pro"></option>
						<option value="glm-5.2"></option>
						<option value="glm-5.3"></option>
						<option value="kimi-k3"></option>
						<option value="qwen3.8-max"></option>
					</datalist>
					<p class="text-base-content/70 mt-1 text-xs">
						Nama model sesuai penyedia API yang digunakan.
					</p>
				</fieldset>

				<fieldset class="fieldset">
					<legend class="fieldset-legend">Base URL</legend>
					<input
						class="input bg-base-200 dark:bg-base-300 w-full border-base-300 dark:border-none"
						type="text"
						name="baseUrl"
						bind:value={aiBaseUrl}
						placeholder="contoh: https://generativelanguage.googleapis.com"
						autocomplete="off"
						required
					/>
					<p class="text-base-content/70 mt-1 text-xs">
						Endpoint API lengkap termasuk <code>/v1</code> jika diperlukan.
					</p>
				</fieldset>
			</div>

			<div class="mt-6 flex items-center gap-2">
				{#if gemini.keySet}
					<button
						class="btn btn-soft btn-error shadow-none"
						type="submit"
						form="gemini-key-clear"
						disabled={clearingGeminiKey}
					>
						<Icon name="del" />
						{clearingGeminiKey ? 'Menghapus…' : 'Hapus Kunci'}
					</button>
				{/if}

				<button
					class="btn btn-primary shadow-none ml-auto"
					type="submit"
					disabled={submitting || invalid}
				>
					<Icon name="save" />
					{submitting ? 'Menyimpan…' : 'Simpan'}
				</button>
			</div>
		{/snippet}
	</FormEnhance>

	{#if gemini.keySet}
		<FormEnhance
			id="gemini-key-clear"
			action="?/clear-gemini-key"
			submitStateChange={(s) => (clearingGeminiKey = s)}
		>
			{#snippet children({ submitting })}
				<button type="submit" class="hidden" disabled={submitting}>Hapus</button>
			{/snippet}
		</FormEnhance>
	{/if}
</section>
