<script lang="ts">
	/* eslint-disable @typescript-eslint/no-unused-vars */
	import { page } from '$app/state';
	import PreviewHeader from '$lib/components/cetak/PreviewHeader.svelte';
	import DocumentMuridSelector from '$lib/components/cetak/DocumentMuridSelector.svelte';
	import PreviewFooter from '$lib/components/cetak/PreviewFooter.svelte';
	import PreviewContent from '$lib/components/cetak/PreviewContent.svelte';
	import { toast } from '$lib/components/toast.svelte';
	import { tick, onMount } from 'svelte';
	import {
		loadSinglePreview,
		isPreviewableDocument,
		type DocumentType,
		type MuridData,
		type PreviewPayload
	} from '$lib/single-preview-logic';
	import { loadBulkPreviews_robust, buildBulkErrorMessage } from '$lib/bulk-preview-logic';
	import { DEFAULT_RAPOR_CRITERIA } from '$lib/rapor-params';
	import { downloadKeasramaanPDF } from '$lib/utils/pdf/keasramaan-pdf-generator';
	import { downloadRaporPDF } from '$lib/utils/pdf/rapor-pdf-generator';
	import { downloadCoverPDF } from '$lib/utils/pdf/cover-pdf-generator';
	import { downloadBiodataPDF } from '$lib/utils/pdf/biodata-pdf-generator';
	import { downloadPiagamPDF } from '$lib/utils/pdf/piagam-pdf-generator';

	let { data } = $props();

	const documentOptions: Array<{ value: DocumentType; label: string }> = [
		{ value: 'cover', label: 'Cover' },
		{ value: 'biodata', label: 'Biodata' },
		{ value: 'rapor', label: 'Rapor' },
		{ value: 'piagam', label: 'Piagam' },
		{ value: 'keasramaan', label: 'Rapor Keasramaan' }
	];

	const documentPaths: Record<DocumentType, string> = {
		cover: '/cetak/cover',
		biodata: '/cetak/biodata',
		rapor: '/cetak/rapor',
		piagam: '/cetak/piagam',
		keasramaan: '/cetak/keasramaan'
	};

	const printFailureMessages: Record<DocumentType, string> = {
		cover: 'Elemen cover belum siap untuk dicetak. Coba muat ulang halaman.',
		biodata: 'Elemen biodata belum siap untuk dicetak. Coba muat ulang halaman.',
		rapor: 'Elemen rapor belum siap untuk dicetak. Coba muat ulang halaman.',
		piagam: 'Elemen piagam belum siap untuk dicetak. Coba muat ulang halaman.',
		keasramaan: 'Elemen rapor keasramaan belum siap untuk dicetak. Coba muat ulang halaman.'
	};

	let selectedDocument = $state<DocumentType | ''>('');
	let selectedMuridId = $state('');
	let selectedTemplate = $state<'1' | '2'>('1');
	let previewDocument = $state<DocumentType | ''>('');
	let previewMetaTitle = $state('');
	let previewData = $state<PreviewPayload | null>(null);
	let previewMurid = $state<MuridData | null>(null);
	let previewPrintable = $state<HTMLDivElement | null>(null);
	let previewLoading = $state(false);
	let previewError = $state<string | null>(null);
	let showBgLogo = $state(false);
	let downloadLoading = $state(false);

	// show TP listing: 'compact' | 'full-desc'
	let fullTP = $state<'compact' | 'full-desc'>('compact');

	// Kriteria intrakurikuler (defaults per spec)

	let kritCukup = $state<number>(DEFAULT_RAPOR_CRITERIA.kritCukup);
	let kritBaik = $state<number>(DEFAULT_RAPOR_CRITERIA.kritBaik);

	// Load persisted criteria from localStorage (if available)
	// Load persisted criteria from server (if available). Falls back to defaults.
	onMount(async () => {
		try {
			const res = await fetch('/api/sekolah/rapor-kriteria');
			if (res.ok) {
				const json = await res.json();
				const lc = json?.cukup;
				const lb = json?.baik;
				if (lc !== undefined && !Number.isNaN(Number(lc))) kritCukup = Number(lc);
				if (lb !== undefined && !Number.isNaN(Number(lb))) kritBaik = Number(lb);
			}
		} catch {
			// ignore network errors — keep defaults
		}
	});

	// bulk print state
	let isBulkMode = $state(false);
	let bulkPreviewData = $state<Array<{ murid: MuridData; data: PreviewPayload }>>([]);
	let bulkPrintableNodes = $state<HTMLDivElement[]>([]);
	let waitingForPrintable = $state(false);
	let bulkLoadProgress = $state<{ current: number; total: number } | null>(null);

	// increment this to bust background cache after upload
	let bgRefreshKey = $state<number>(0);

	const academicContext = $derived(data.academicContext ?? null);

	const kelasAktif = $derived(page.data.kelasAktif ?? null);
	const kelasAktifLabel = $derived.by(() => {
		if (!kelasAktif) return null;
		return kelasAktif.fase ? `${kelasAktif.nama} - ${kelasAktif.fase}` : kelasAktif.nama;
	});

	const piagamRankingOptions = $derived(data.piagamRankingOptions ?? []);
	const hasPiagamRankingOptions = $derived.by(() => piagamRankingOptions.length > 0);
	const daftarMurid = $derived(data.daftarMurid ?? []);
	const muridCount = $derived.by(() => daftarMurid.length);
	const hasMurid = $derived.by(() => muridCount > 0);
	const selectedMurid = $derived.by<MuridData | null>(() => {
		const murid = daftarMurid.find((item) => String(item.id) === selectedMuridId);
		return murid
			? {
					id: murid.id,
					nama: murid.nama,
					nis: murid.nis,
					nisn: murid.nisn
				}
			: null;
	});
	const isPiagamSelected = $derived.by(() => selectedDocument === 'piagam');
	const navigationMuridIds = $derived.by(() => {
		if (isPiagamSelected) {
			return piagamRankingOptions.map((option) => String(option.muridId));
		}
		return daftarMurid.map((murid) => String(murid.id));
	});
	const selectedMuridIndex = $derived.by(() => {
		if (!selectedMuridId) return -1;
		return navigationMuridIds.findIndex((id) => id === selectedMuridId);
	});
	const hasPrevMurid = $derived.by(() => selectedMuridIndex > 0);
	const hasNextMurid = $derived.by(
		() => selectedMuridIndex >= 0 && selectedMuridIndex < navigationMuridIds.length - 1
	);
	const hasSelectionOptions = $derived.by(() =>
		isPiagamSelected ? hasPiagamRankingOptions : hasMurid
	);
	const canNavigateMurid = $derived.by(() => {
		if (!selectedDocument) return false;
		if (!hasSelectionOptions) return false;
		return selectedMuridIndex >= 0 && navigationMuridIds.length > 0;
	});
	const isPreviewMatchingSelection = $derived.by(() =>
		Boolean(previewDocument && selectedDocument && selectedDocument === previewDocument)
	);

	// Reset preview state when document selection changes
	$effect(() => {
		if (selectedDocument) {
			resetCetak();
		}
	});

	$effect(() => {
		if (isPiagamSelected) {
			const rankingOptions = piagamRankingOptions;
			if (!rankingOptions.length) {
				if (selectedMuridId) {
					selectedMuridId = '';
				}
				return;
			}
			if (
				selectedMuridId &&
				!rankingOptions.some((option) => String(option.muridId) === selectedMuridId)
			) {
				selectedMuridId = '';
			}
			return;
		}

		const list = daftarMurid;
		if (!list.length) {
			if (selectedMuridId) {
				selectedMuridId = '';
			}
			return;
		}
		if (selectedMuridId && !list.some((murid) => String(murid.id) === selectedMuridId)) {
			selectedMuridId = '';
		}
	});

	const selectedDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === selectedDocument) ?? null
	);
	const previewDocumentEntry = $derived.by(
		() => documentOptions.find((option) => option.value === previewDocument) ?? null
	);
	const headingDocumentLabel = $derived.by(() => {
		if (previewDocumentEntry?.label) return previewDocumentEntry.label;
		if (selectedDocumentEntry?.label) return selectedDocumentEntry.label;
		return 'Dokumen';
	});
	const headingMuridName = $derived.by(() => {
		if (previewMurid?.nama) return previewMurid.nama;
		if (selectedMurid?.nama) return selectedMurid.nama;
		return '';
	});
	const headingTitle = $derived.by(() => {
		const parts: string[] = ['Cetak'];
		const docLabel = headingDocumentLabel.trim();
		if (docLabel) parts.push(docLabel);
		const muridLabel = headingMuridName.trim();
		if (muridLabel) parts.push(muridLabel);
		return parts.join(' - ');
	});

	const downloadDisabled = $derived.by(
		() => !selectedDocument || !hasSelectionOptions || !selectedMurid || downloadLoading
	);
	const downloadButtonTitle = $derived.by(() => {
		if (!selectedDocument) return 'Pilih dokumen terlebih dahulu';
		if (!hasSelectionOptions) {
			return isPiagamSelected
				? 'Tidak ada data peringkat piagam untuk kelas ini'
				: 'Tidak ada murid di kelas ini';
		}
		if (!selectedMurid) {
			return isPiagamSelected ? 'Pilih peringkat piagam' : 'Pilih murid';
		}
		if (downloadLoading) return 'Sedang membuat PDF...';
		return `Download PDF ${selectedDocumentEntry?.label ?? 'dokumen'} untuk ${selectedMurid.nama}`;
	});

	let previewAbortController: AbortController | null = null;
	let keydownHandler: ((event: KeyboardEvent) => void) | null = null;

	function resetCetak() {
		previewDocument = '';
		previewMetaTitle = '';
		previewData = null;
		previewMurid = null;
		previewPrintable = null;
		isBulkMode = false;
		bulkPreviewData = [];
		bulkPrintableNodes = [];
		waitingForPrintable = false;
	}

	async function handleDownloadSingle() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen terlebih dahulu', 'warning');
			return;
		}
		if (!isPreviewableDocument(documentType)) {
			return;
		}
		if (!hasSelectionOptions) {
			const message =
				documentType === 'piagam'
					? 'Tidak ada data peringkat piagam untuk kelas ini.'
					: 'Tidak ada murid di kelas ini.';
			toast(message, 'warning');
			return;
		}
		const murid = selectedMurid;
		if (!murid) {
			const message =
				documentType === 'piagam'
					? 'Pilih peringkat piagam yang ingin diunduh.'
					: 'Pilih murid yang ingin diunduh.';
			toast(message, 'warning');
			return;
		}

		downloadLoading = true;

		try {
			const result = await loadSinglePreview({
				documentType,
				murid,
				kelasId: data.kelasId ? Number(data.kelasId) : undefined,
				tpMode: fullTP,
				criteria: { kritCukup, kritBaik },
				signal: new AbortController().signal
			});

			await generatePDFFromPreviewData(documentType, result.data);
			toast('PDF berhasil dibuat!', 'success');
		} catch (err) {
			console.error('Download error:', err);
			const errorMsg = err instanceof Error ? err.message : 'Gagal membuat PDF';
			toast(errorMsg, 'error');
		} finally {
			downloadLoading = false;
		}
	}

	async function navigateMurid(direction: 'prev' | 'next') {
		if (!canNavigateMurid) return;
		const list = navigationMuridIds;
		const currentIndex = selectedMuridIndex;
		if (currentIndex < 0) return;
		const offset = direction === 'next' ? 1 : -1;
		const targetIndex = currentIndex + offset;
		if (targetIndex < 0 || targetIndex >= list.length) return;
		const targetId = list[targetIndex];
		selectedMuridId = targetId;
		await tick();
	}

	async function handleDownloadBulk() {
		const documentType = selectedDocument;
		if (!documentType) {
			toast('Pilih dokumen terlebih dahulu', 'warning');
			return;
		}
		if (!isPreviewableDocument(documentType)) {
			return;
		}

		// untuk piagam gunakan ranking options, untuk lainnya gunakan semua murid
		const muridList = isPiagamSelected
			? piagamRankingOptions.map((option) => ({
					id: option.muridId,
					nama: option.nama,
					nis: null,
					nisn: null
				}))
			: daftarMurid;

		if (!muridList.length) {
			const message = isPiagamSelected
				? 'Tidak ada data peringkat piagam untuk kelas ini.'
				: 'Tidak ada murid di kelas ini.';
			toast(message, 'warning');
			return;
		}

		downloadLoading = true;

		try {
			toast(`Memproses ${muridList.length} murid...`, 'info');

			const result = await loadBulkPreviews_robust({
				documentType,
				muridList,
				kelasId: data.kelasId ? Number(data.kelasId) : undefined,
				tpMode: fullTP,
				criteria: { kritCukup, kritBaik },
				signal: new AbortController().signal
			});

			if (!result.isValid) {
				const docLabel = selectedDocumentEntry?.label ?? 'dokumen';
				const errorMsg = buildBulkErrorMessage(docLabel, result.failureCount, result.failedMurids);
				toast(errorMsg, 'warning');

				if (result.data.length === 0) {
					return;
				}
			}

			let successCount = 0;
			let failCount = 0;

			for (let i = 0; i < result.data.length; i++) {
				const item = result.data[i];
				try {
					await generatePDFFromPreviewData(documentType, item.data);
					successCount++;
				} catch (error) {
					console.error(`Error generating PDF for ${item.murid.nama}:`, error);
					failCount++;
				}
			}

			if (failCount > 0) {
				toast(
					`${successCount} PDF berhasil dibuat, ${failCount} gagal`,
					successCount > 0 ? 'warning' : 'error'
				);
			} else {
				toast(`${successCount} PDF berhasil dibuat!`, 'success');
			}
		} catch (err) {
			console.error('Bulk download error:', err);
			const errorMsg = err instanceof Error ? err.message : 'Gagal membuat PDF';
			toast(errorMsg, 'error');
		} finally {
			downloadLoading = false;
		}
	}

	function handlePrintableReady(node: HTMLDivElement | null) {
		previewPrintable = node;
	}

	function handleBulkPrintableReady(index: number, node: HTMLDivElement | null) {
		if (node) {
			bulkPrintableNodes[index] = node;
		}
	}

	// Watch for all bulk printable nodes to be ready
	$effect(() => {
		if (!isBulkMode || bulkPreviewData.length === 0) {
			return;
		}

		const nodes = bulkPrintableNodes;
		const expectedCount = bulkPreviewData.length;
		const readyCount = nodes.filter(Boolean).length;

		if (readyCount === expectedCount) {
			// All nodes are ready, but for rapor we need to wait for pagination
			const isRapor = previewDocument === 'rapor';
			const isFullDesc = fullTP === 'full-desc';

			// Delay calculation:
			// - Rapor + Full Desc: 800ms (reduced from 3s)
			// - Rapor + Compact: 600ms (reduced from 1.5s)
			// - Other docs: 200ms (reduced from 300ms)
			let delay = 200;
			if (isRapor) {
				delay = isFullDesc ? 800 : 600;
			}

			const timeoutId = setTimeout(() => {
				const wrapper = document.createElement('div');
				nodes.forEach((n) => {
					if (n) {
						const clone = n.cloneNode(true) as HTMLDivElement;
						wrapper.appendChild(clone);
					}
				});
				previewPrintable = wrapper;
				waitingForPrintable = false;
			}, delay);

			return () => clearTimeout(timeoutId);
		}

		// Safety timeout - if nodes aren't ready after 15 seconds, give up and use what we have
		const timeoutId = setTimeout(() => {
			if (readyCount > 0) {
				const wrapper = document.createElement('div');
				nodes.forEach((n) => {
					if (n) {
						const clone = n.cloneNode(true) as HTMLDivElement;
						wrapper.appendChild(clone);
					}
				});
				previewPrintable = wrapper;
				waitingForPrintable = false;
				console.warn(
					`Bulk preview timeout: only ${readyCount}/${expectedCount} nodes ready, proceeding anyway`
				);
			}
		}, 15000);

		return () => clearTimeout(timeoutId);
	});

	// When bulk mode showBgLogo changes, reset bulk nodes to wait for re-render
	$effect(() => {
		if (!isBulkMode) {
			return;
		}
		void showBgLogo; // track dependency
		bulkPrintableNodes = [];
		waitingForPrintable = true;
	});

	async function generatePDFFromPreviewData(doc: DocumentType, previewData: PreviewPayload) {
		if (doc === 'keasramaan') {
			const keasramaanData = (previewData as { keasramaanData?: typeof previewData })
				.keasramaanData;
			if (!keasramaanData || typeof keasramaanData !== 'object') {
				toast('Data keasramaan tidak tersedia', 'error');
				return;
			}

			// Type assertion untuk keasramaanData
			const data = keasramaanData as any;

			try {
				await downloadKeasramaanPDF({
					sekolah: {
						nama: data.sekolah.nama,
						npsn: data.sekolah.npsn || '',
						alamat: data.sekolah.alamat || '',
						logoUrl: data.sekolah.logoUrl
					},
					murid: {
						nama: data.murid.nama,
						nis: data.murid.nis || '',
						nisn: data.murid.nisn || ''
					},
					rombel: {
						nama: data.rombel.nama,
						fase: data.rombel.fase
					},
					periode: {
						tahunAjaran: data.periode.tahunAjaran,
						semester: data.periode.semester
					},
					waliAsrama: data.waliAsrama
						? {
								nama: data.waliAsrama.nama,
								nip: data.waliAsrama.nip || ''
							}
						: undefined,
					waliAsuh: data.waliAsuh
						? {
								nama: data.waliAsuh.nama,
								nip: data.waliAsuh.nip || ''
							}
						: undefined,
					kepalaSekolah: data.kepalaSekolah
						? {
								nama: data.kepalaSekolah.nama,
								nip: data.kepalaSekolah.nip || '',
								statusKepalaSekolah: data.kepalaSekolah.statusKepalaSekolah
							}
						: undefined,
					ttd: data.ttd
						? {
								tempat: data.ttd.tempat,
								tanggal: data.ttd.tanggal
							}
						: undefined,
					kehadiran: data.kehadiran
						? {
								sakit: data.kehadiran.sakit,
								izin: data.kehadiran.izin,
								alfa: data.kehadiran.alfa
							}
						: undefined,
					keasramaanRows: data.keasramaanRows || [],
					showBgLogo: showBgLogo
				});
			} catch (error) {
				console.error('PDF generation error:', error);
				toast('Gagal membuat PDF', 'error');
			}
		} else if (doc === 'rapor') {
			const raporData = (previewData as { raporData?: typeof previewData }).raporData;
			if (!raporData || typeof raporData !== 'object') {
				toast('Data rapor tidak tersedia', 'error');
				return;
			}

			// Type assertion untuk raporData
			const data = raporData as any;

			try {
				// Build intrakurikuler data
				const intrakurikuler =
					data.nilaiIntrakurikuler?.map((item: any, idx: number) => ({
						nomor: idx + 1,
						mataPelajaran: item.mataPelajaran || '',
						nilai: item.nilaiAkhir,
						deskripsi: item.deskripsi || '',
						jenis: item.jenis || 'wajib'
					})) || [];

				// Build ekstrakurikuler data (already in correct format)
				const ekstrakurikuler = Array.isArray(data.ekstrakurikuler)
					? data.ekstrakurikuler.map((item: any) => ({
							nama: item.nama || '',
							deskripsi: item.deskripsi || ''
						}))
					: [];

				// Build kokurikuler data (kokurikuler is a string, not array)
				// Convert to array format for PDF with single entry
				const kokurikuler =
					data.kokurikuler && typeof data.kokurikuler === 'string' && data.hasKokurikuler
						? [
								{
									dimensi: 'Profil Pelajar Pancasila',
									deskripsi: data.kokurikuler
								}
							]
						: [];

				await downloadRaporPDF({
					sekolah: {
						nama: data.sekolah.nama || '',
						npsn: data.sekolah.npsn || '',
						alamat: data.sekolah.alamat || '',
						logoUrl: data.sekolah.logoUrl
					},
					murid: {
						nama: data.murid.nama || '',
						nis: data.murid.nis || '',
						nisn: data.murid.nisn || ''
					},
					rombel: {
						nama: data.rombel.nama || '',
						fase: data.rombel.fase
					},
					periode: {
						tahunPelajaran: data.periode.tahunPelajaran || '',
						semester: data.periode.semester || ''
					},
					waliKelas: data.waliKelas
						? {
								nama: data.waliKelas.nama || '',
								nip: data.waliKelas.nip || ''
							}
						: undefined,
					kepalaSekolah: data.kepalaSekolah
						? {
								nama: data.kepalaSekolah.nama || '',
								nip: data.kepalaSekolah.nip || '',
								statusKepalaSekolah: data.kepalaSekolah.statusKepalaSekolah
							}
						: undefined,
					ttd: data.ttd
						? {
								tempat: data.ttd.tempat || '',
								tanggal: data.ttd.tanggal || ''
							}
						: undefined,
					kehadiran: data.ketidakhadiran
						? {
								sakit: data.ketidakhadiran.sakit ?? 0,
								izin: data.ketidakhadiran.izin ?? 0,
								alfa: data.ketidakhadiran.tanpaKeterangan ?? 0
							}
						: undefined,
					catatanWali: data.catatanWali,
					tanggapanOrangTua: data.tanggapanOrangTua || '',
					intrakurikuler,
					ekstrakurikuler,
					kokurikuler,
					hasKokurikuler: data.hasKokurikuler,
					jenjangVariant: data.sekolah?.jenjangVariant,
					showBgLogo: showBgLogo
				});
			} catch (error) {
				console.error('PDF generation error:', error);
				toast('Gagal membuat PDF', 'error');
			}
		} else if (doc === 'cover') {
			const coverData = (previewData as { coverData?: typeof previewData }).coverData;
			if (!coverData || typeof coverData !== 'object') {
				toast('Data cover tidak tersedia', 'error');
				return;
			}

			// Type assertion untuk coverData
			const data = coverData as any;

			try {
				await downloadCoverPDF({
					sekolah: {
						nama: data.sekolah.nama,
						jenjang: data.sekolah.jenjang,
						jenjangVariant: data.sekolah.jenjangVariant,
						npsn: data.sekolah.npsn,
						naungan: data.sekolah.naungan,
						alamat: data.sekolah.alamat,
						website: data.sekolah.website,
						email: data.sekolah.email,
						logoUrl: data.sekolah.logoUrl
					},
					murid: data.murid,
					showBgLogo: showBgLogo
				});
			} catch (error) {
				console.error('PDF generation error:', error);
				toast('Gagal membuat PDF', 'error');
			}
		} else if (doc === 'biodata') {
			const biodataData = (previewData as { biodataData?: typeof previewData }).biodataData;
			if (!biodataData || typeof biodataData !== 'object') {
				toast('Data biodata tidak tersedia', 'error');
				return;
			}

			// Type assertion untuk biodataData
			const data = biodataData as any;

			try {
				await downloadBiodataPDF({
					sekolah: {
						nama: data.sekolah.nama,
						logoUrl: data.sekolah.logoUrl,
						statusKepalaSekolah: data.sekolah.statusKepalaSekolah
					},
					murid: {
						id: data.murid.id,
						foto: data.murid.foto,
						nama: data.murid.nama,
						nis: data.murid.nis,
						nisn: data.murid.nisn,
						tempatLahir: data.murid.tempatLahir,
						tanggalLahir: data.murid.tanggalLahir,
						jenisKelamin: data.murid.jenisKelamin,
						agama: data.murid.agama,
						pendidikanSebelumnya: data.murid.pendidikanSebelumnya,
						alamat: data.murid.alamat
					},
					orangTua: {
						ayah: {
							nama: data.orangTua.ayah.nama,
							pekerjaan: data.orangTua.ayah.pekerjaan
						},
						ibu: {
							nama: data.orangTua.ibu.nama,
							pekerjaan: data.orangTua.ibu.pekerjaan
						},
						alamat: data.orangTua.alamat
					},
					wali: {
						nama: data.wali.nama,
						pekerjaan: data.wali.pekerjaan,
						alamat: data.wali.alamat
					},
					ttd: {
						tempat: data.ttd.tempat,
						tanggal: data.ttd.tanggal,
						kepalaSekolah: data.ttd.kepalaSekolah,
						nip: data.ttd.nip
					},
					showBgLogo: showBgLogo
				});
			} catch (error) {
				console.error('PDF generation error:', error);
				toast('Gagal membuat PDF', 'error');
			}
		} else if (doc === 'piagam') {
			const piagamData = (previewData as { piagamData?: typeof previewData }).piagamData;
			if (!piagamData || typeof piagamData !== 'object') {
				toast('Data piagam tidak tersedia', 'error');
				return;
			}

			// Type assertion untuk piagamData
			const data = piagamData as any;

			try {
				// Load background image
				let bgImage: string | null = null;
				try {
					const response = await fetch(`/api/sekolah/piagam-bg/${selectedTemplate}`);
					const blob = await response.blob();
					bgImage = await new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.onloadend = () => resolve(reader.result as string);
						reader.readAsDataURL(blob);
					});
				} catch (error) {
					console.error('Error loading piagam background:', error);
				}

				await downloadPiagamPDF({
					sekolah: {
						nama: data.sekolah.nama,
						jenjang: data.sekolah.jenjang,
						npsn: data.sekolah.npsn,
						alamat: {
							jalan: data.sekolah.alamat.jalan || '',
							desa: data.sekolah.alamat.desa || '',
							kecamatan: data.sekolah.alamat.kecamatan || '',
							kabupaten: data.sekolah.alamat.kabupaten || '',
							provinsi: data.sekolah.alamat.provinsi,
							kodePos: data.sekolah.alamat.kodePos
						},
						website: data.sekolah.website,
						email: data.sekolah.email,
						logoUrl: data.sekolah.logoUrl,
						logoDinasUrl: data.sekolah.logoDinasUrl
					},
					murid: {
						nama: data.murid.nama
					},
					penghargaan: {
						rataRata: data.penghargaan.rataRata,
						rataRataFormatted: data.penghargaan.rataRataFormatted,
						ranking: data.penghargaan.ranking,
						rankingLabel: data.penghargaan.rankingLabel,
						judul: data.penghargaan.judul,
						subjudul: data.penghargaan.subjudul,
						motivasi: data.penghargaan.motivasi
					},
					periode: {
						semester: data.periode.semester,
						tahunAjaran: data.periode.tahunAjaran
					},
					ttd: {
						tempat: data.ttd.tempat,
						tanggal: data.ttd.tanggal,
						kepalaSekolah: {
							nama: data.ttd.kepalaSekolah.nama,
							nip: data.ttd.kepalaSekolah.nip,
							statusKepalaSekolah: data.ttd.kepalaSekolah.statusKepalaSekolah
						},
						waliKelas: {
							nama: data.ttd.waliKelas.nama,
							nip: data.ttd.waliKelas.nip
						}
					},
					template: selectedTemplate,
					bgImage
				});
			} catch (error) {
				console.error('PDF generation error:', error);
				toast('Gagal membuat PDF', 'error');
			}
		} else {
			toast(
				'Export PDF hanya tersedia untuk Cover, Biodata, Rapor, Piagam, dan Rapor Keasramaan',
				'warning'
			);
		}
	}

	async function handleBgRefresh() {
		bgRefreshKey = Date.now();
	}
</script>

<div class="card bg-base-100 rounded-lg border border-none p-4 shadow-md">
	<PreviewHeader
		{headingTitle}
		{kelasAktifLabel}
		{academicContext}
		{canNavigateMurid}
		{hasPrevMurid}
		{hasNextMurid}
		onNavigatePrev={() => navigateMurid('prev')}
		onNavigateNext={() => navigateMurid('next')}
	/>

	<DocumentMuridSelector
		bind:selectedDocument
		bind:selectedTemplate
		bind:selectedMuridId
		{daftarMurid}
		{piagamRankingOptions}
		onDownload={handleDownloadSingle}
		onBulkDownload={handleDownloadBulk}
		{downloadDisabled}
		{downloadButtonTitle}
		{downloadLoading}
	/>

	<PreviewFooter
		{hasMurid}
		{muridCount}
		{isPiagamSelected}
		{selectedTemplate}
		isRaporSelected={selectedDocument === 'rapor'}
		isBiodataSelected={selectedDocument === 'biodata'}
		isKeasramaanSelected={selectedDocument === 'keasramaan'}
		{kritCukup}
		{kritBaik}
		tpMode={fullTP}
		kelasId={data.kelasId}
		{showBgLogo}
		onToggleBgLogo={(value: boolean) => {
			showBgLogo = value;
		}}
		onSetKriteria={(cukup: number, baik: number) => {
			// optimistic update in UI
			kritCukup = cukup;
			kritBaik = baik;
			// persist to server (requires sekolah_manage permission)
			fetch('/api/sekolah/rapor-kriteria', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ cukup: kritCukup, baik: kritBaik })
			})
				.then(async (res) => {
					if (res.ok) {
						toast('Kriteria rapor tersimpan di server.', 'success');
					} else {
						const payload = await res.json().catch(() => ({}));
						console.error('Gagal menyimpan kriteria rapor', payload);
						toast(payload?.error ?? 'Gagal menyimpan kriteria rapor.', 'error');
					}
				})
				.catch((err) => {
					console.error('Error saving kriteria rapor', err);
					toast('Gagal menyimpan kriteria rapor (jaringan).', 'error');
				});
		}}
		onToggleFullTP={(value: 'compact' | 'full-desc') => {
			fullTP = value;
		}}
		onBgRefresh={handleBgRefresh}
	/>
</div>

<PreviewContent
	{previewDocument}
	{previewData}
	{previewLoading}
	{previewError}
	{isBulkMode}
	{bulkPreviewData}
	{bulkLoadProgress}
	{waitingForPrintable}
	{selectedTemplate}
	{bgRefreshKey}
	{showBgLogo}
	onPrintableReady={handlePrintableReady}
	onBulkPrintableReady={handleBulkPrintableReady}
/>
