<script lang="ts">
	let modal: HTMLDialogElement;
	export function openModal() {
		modal.showModal();
	}
</script>

<dialog bind:this={modal} id="masukkan_modal" class="modal">
	<fieldset class="fieldset modal-box p-4 sm:w-full sm:max-w-2xl">
		<legend class="fieldset-legend">
			<pre class="bg-base-200 rounded-xl px-2"> Formulir Masukan </pre>
		</legend>
		<div class="mt-2 flex flex-col gap-2">
			<div class="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
				<fieldset>
					<div class="floating-label form-group">
						<span>Nama depan</span>
						<input
							type="text"
							name="first_name"
							class="bg-base-200 validator form-control input w-full rounded-lg dark:border-none"
							placeholder="Nama Depan"
							required
						/>
					</div>
				</fieldset>
				<fieldset>
					<div class="floating-label form-group">
						<span>Nama belakang</span>
						<input
							type="text"
							name="last_name"
							class="bg-base-200 validator form-control input w-full rounded-lg dark:border-none"
							placeholder="Nama Belakang"
							required
						/>
					</div>
				</fieldset>
			</div>
			<fieldset class="mb-4">
				<div class="floating-label form-group">
					<span>Email</span>
					<input
						type="email"
						name="email"
						class="bg-base-200 validator form-control input w-full rounded-lg dark:border-none"
						placeholder="Email Anda"
						required
					/>
				</div>
			</fieldset>
			<fieldset>
				<div class="floating-label form-group">
					<span>Ketik pesan Anda di sini...</span>
					<textarea
						class="validator bg-base-200 form-control textarea h-fit w-full rounded-lg dark:border-none"
						name="message"
						placeholder="Ketik pesan Anda di sini..."
						required
					></textarea>
					<input
						type="submit"
						value="Kirim"
						class="btn btn-primary mt-6 ml-auto shadow-none"
						id="submitBtn"
					/>
				</div>
			</fieldset>
		</div>
	</fieldset>
	<form method="dialog" class="modal-backdrop">
		<button>close</button>
	</form>
</dialog>
