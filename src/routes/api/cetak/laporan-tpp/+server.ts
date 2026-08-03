import { json } from '@sveltejs/kit';
import ExcelJS from 'exceljs';
import { eq, inArray } from 'drizzle-orm';
import db from '$lib/server/db';
import { ensurePresensiGuruSchema } from '$lib/server/db/ensure-presensi-guru';
import { tableAuthUser, tablePegawai, tableSekolah } from '$lib/server/db/schema';
import { listPresensiBulanan, getPresensiGuruSettings } from '$lib/server/presensi-guru';
import type { RequestHandler } from './$types';

const BULAN_NAMES = [
	'Januari',
	'Februari',
	'Maret',
	'April',
	'Mei',
	'Juni',
	'Juli',
	'Agustus',
	'September',
	'Oktober',
	'November',
	'Desember'
];

const LAST_COL = 15;

/** Extract only the numeric digits from a NIP/NIPPPK value (e.g. "NIP. 1970…" → "1970…"). */
function nipDigits(value: string | null | undefined): string {
	return (value ?? '').replace(/\D+/g, '');
}

const GOLONGAN_ROMANS: Record<string, number> = {
	I: 1,
	II: 2,
	III: 3,
	IV: 4,
	V: 5,
	IX: 9
};

/** Numeric rank of a golongan (e.g. "IV/d" → 44, "II" → 20). Higher = higher rank. */
function golonganRank(golongan: string): number {
	const m = /^([IVX]+)(?:\/([a-e]))?$/i.exec(golongan.trim());
	if (!m) return 0;
	const roman = GOLONGAN_ROMANS[m[1].toUpperCase()] ?? 0;
	const letter = m[2] ? m[2].toLowerCase().charCodeAt(0) - 96 : 0;
	return roman * 10 + letter;
}

function lastColLetter(n: number): string {
	let s = '';
	while (n > 0) {
		const m = (n - 1) % 26;
		s = String.fromCharCode(65 + m) + s;
		n = Math.floor((n - 1) / 26);
	}
	return s;
}

const thinBorder = {
	top: { style: 'thin' as const },
	left: { style: 'thin' as const },
	bottom: { style: 'thin' as const },
	right: { style: 'thin' as const }
};

export const GET: RequestHandler = async ({ locals, url }) => {
	const user = locals.user;
	if (!user) return json({ error: 'Unauthorized' }, { status: 401 });
	if (user.type !== 'admin' && user.type !== 'kepala_sekolah') {
		return json({ error: 'Hanya admin yang dapat mengunduh Laporan TPP.' }, { status: 403 });
	}

	const sekolahId = locals.sekolah?.id;
	if (!sekolahId) return json({ error: 'Sekolah belum diatur.' }, { status: 400 });

	const presensiSettings = await getPresensiGuruSettings(sekolahId);
	if (presensiSettings?.presensiGuruEnabled === false) {
		return json({ error: 'Fitur presensi guru sedang dinonaktifkan.' }, { status: 400 });
	}

	const bulan = Number(url.searchParams.get('bulan'));
	const tahun = Number(url.searchParams.get('tahun'));
	const status = url.searchParams.get('status');

	if (!Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
		return json({ error: 'Parameter bulan tidak valid.' }, { status: 400 });
	}
	if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2099) {
		return json({ error: 'Parameter tahun tidak valid.' }, { status: 400 });
	}
	if (status !== 'PNS' && status !== 'PPPK') {
		return json({ error: 'Parameter status tidak valid.' }, { status: 400 });
	}

	await ensurePresensiGuruSchema();

	const sekolah = await db.query.tableSekolah.findFirst({
		columns: { nama: true, kepalaSekolahId: true, statusKepalaSekolah: true },
		where: eq(tableSekolah.id, sekolahId)
	});
	const sekolahNama = sekolah?.nama ?? '';

	const { rows, redDays, totalHariBelajar, daysInMonth } = await listPresensiBulanan(
		sekolahId,
		bulan,
		tahun
	);

	const guruIds = rows.map((r) => r.userId);
	const profiles = guruIds.length
		? await db.query.tableAuthUser.findMany({
				columns: {
					id: true,
					namaLengkap: true,
					jabatan: true,
					golongan: true,
					statusKepegawaian: true
				},
				with: { pegawai: { columns: { nama: true, nip: true } } },
				where: inArray(tableAuthUser.id, guruIds)
			})
		: [];
	const profileByUser = new Map(profiles.map((p) => [p.id, p]));

	// CPNS is included as PNS.
	const allowedStatuses = status === 'PNS' ? new Set(['PNS', 'CPNS']) : new Set(['PPPK']);
	const filtered = rows.filter((row) => {
		const prof = profileByUser.get(row.userId);
		return prof?.statusKepegawaian != null && allowedStatuses.has(prof.statusKepegawaian);
	});

	// Rank golongan (IV/d > IV/c > … > II); sort PNS/CPNS from highest to lowest.
	if (status === 'PNS') {
		filtered.sort((a, b) => {
			const ra = golonganRank(profileByUser.get(a.userId)?.golongan ?? '');
			const rb = golonganRank(profileByUser.get(b.userId)?.golongan ?? '');
			return rb - ra;
		});
	}

	// Total working Mondays in the selected month (exclude libur days).
	let countSenin = 0;
	for (let d = 1; d <= daysInMonth; d++) {
		if (new Date(tahun, bulan - 1, d).getDay() === 1 && !redDays.includes(d)) countSenin++;
	}

	// Kepala sekolah for the signature block.
	let kepalaNama = '';
	let kepalaNip = '';
	if (sekolah?.kepalaSekolahId) {
		const kepala = await db.query.tablePegawai.findFirst({
			columns: { nama: true, nip: true },
			where: eq(tablePegawai.id, sekolah.kepalaSekolahId)
		});
		kepalaNama = kepala?.nama ?? '';
		kepalaNip = (kepala?.nip ?? '').trim();
	}
	const kepalaTitle = sekolah?.statusKepalaSekolah === 'plt' ? 'Plt. Kepala' : 'Kepala';
	const kepalaNipLabel = nipDigits(kepalaNip);

	// Date = last working day of the month (not on a libur day).
	let tanggalTtd = '';
	for (let d = daysInMonth; d >= 1; d--) {
		if (!redDays.includes(d)) {
			const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][
				new Date(tahun, bulan - 1, d).getDay()
			];
			tanggalTtd = `${hari}, ${d} ${BULAN_NAMES[bulan - 1]} ${tahun}`;
			break;
		}
	}

	const workbook = new ExcelJS.Workbook();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const worksheet: any = workbook.addWorksheet('Laporan TPP');

	// Row 1: title
	worksheet.mergeCells(`A1:${lastColLetter(LAST_COL)}1`);
	const titleCell = worksheet.getCell(1, 1);
	const titleStatus = status === 'PNS' ? 'CPNS DAN PNS' : status;
	titleCell.value = `REKAPITULASI KEHADIRAN ${titleStatus} TAHUN ANGGARAN ${tahun}`;
	titleCell.font = { bold: true, size: 14 };
	titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
	worksheet.getRow(1).height = 26;

	// Row 2: blank spacer
	worksheet.getRow(2).height = 12;

	// Row 3: unit kerja, Row 4: bulan
	const unitKerjaLabel = worksheet.getCell(3, 1);
	unitKerjaLabel.value = 'UNIT KERJA';
	unitKerjaLabel.font = { bold: true, size: 11 };
	unitKerjaLabel.alignment = { vertical: 'middle' };
	worksheet.getCell(3, 3).value = `: ${sekolahNama}`;

	const bulanLabel = worksheet.getCell(4, 1);
	bulanLabel.value = 'BULAN';
	bulanLabel.font = { bold: true, size: 11 };
	bulanLabel.alignment = { vertical: 'middle' };
	worksheet.getCell(4, 3).value = `: ${BULAN_NAMES[bulan - 1]}`;

	// Row 5: blank spacer
	worksheet.getRow(5).height = 10;

	// Row 6-7: headers (two-level with merges)
	const header1 = [
		'NO',
		'NAMA',
		status === 'PPPK' ? 'NIPPPK' : 'NIP',
		'JABATAN',
		'JUMLAH HARI KERJA',
		'HADIR',
		'ABSENSI',
		'ABSENSI',
		'ABSENSI',
		'KETERANGAN LAIN',
		'KETERANGAN LAIN',
		'UPACARA',
		'UPACARA',
		'JUMLAH PERSENTASE KETIDAKHADIRAN',
		'KETERANGAN'
	];
	const header2 = [
		'',
		'',
		'',
		'',
		'',
		'',
		'S',
		'I',
		'TK',
		'DL',
		'CUTI',
		'SENIN',
		'HARI BESAR',
		'',
		''
	];
	for (let colNum = 1; colNum <= LAST_COL; colNum++) {
		worksheet.getCell(6, colNum).value = header1[colNum - 1];
		worksheet.getCell(7, colNum).value = header2[colNum - 1];
	}

	worksheet.mergeCells('A6:A7');
	worksheet.mergeCells('B6:B7');
	worksheet.mergeCells('C6:C7');
	worksheet.mergeCells('D6:D7');
	worksheet.mergeCells('E6:E7');
	worksheet.mergeCells('F6:F7');
	worksheet.mergeCells('G6:I6');
	worksheet.mergeCells('J6:K6');
	worksheet.mergeCells('L6:M6');
	worksheet.mergeCells('N6:N7');
	worksheet.mergeCells('O6:O7');

	for (let rowNum = 6; rowNum <= 7; rowNum++) {
		const row = worksheet.getRow(rowNum);
		row.height = 28;
		for (let colNum = 1; colNum <= LAST_COL; colNum++) {
			const cell = worksheet.getCell(rowNum, colNum);
			cell.border = thinBorder;
			cell.font = { bold: true };
			cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			cell.fill = {
				type: 'pattern',
				pattern: 'solid',
				fgColor: { argb: 'FFD9D9D9' }
			};
		}
	}

	// Data rows
	const firstDataRow = 8;
	filtered.forEach((row, i) => {
		const prof = profileByUser.get(row.userId);
		const nama = prof?.namaLengkap ?? prof?.pegawai?.nama ?? row.nama;
		const dataRow = [
			i + 1,
			nama,
			nipDigits(prof?.pegawai?.nip),
			prof?.jabatan ?? '',
			totalHariBelajar,
			row.countHadir,
			row.countSakit,
			row.countIzin,
			row.countBelum,
			row.countDinasLuar,
			row.countCuti,
			countSenin,
			'',
			'',
			''
		];
		const rowNum = firstDataRow + i;
		for (let colNum = 1; colNum <= LAST_COL; colNum++) {
			worksheet.getCell(rowNum, colNum).value = dataRow[colNum - 1];
		}
	});

	const lastDataRow = firstDataRow + filtered.length - 1;
	for (let rowNum = firstDataRow; rowNum <= lastDataRow; rowNum++) {
		const row = worksheet.getRow(rowNum);
		row.height = 20;
		for (let colNum = 1; colNum <= LAST_COL; colNum++) {
			const cell = worksheet.getCell(rowNum, colNum);
			cell.border = thinBorder;
			if (colNum === 2) {
				cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
			} else {
				cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
			}
		}
	}

	// Signature block (right-aligned) below the table
	const sigStartCol = 10; // J
	const sigEndCol = LAST_COL; // O
	let sigRow = lastDataRow + 2;
	const writeSigLine = (value: string, opts?: { bold?: boolean; height?: number }) => {
		worksheet.mergeCells(
			`${lastColLetter(sigStartCol)}${sigRow}:${lastColLetter(sigEndCol)}${sigRow}`
		);
		const cell = worksheet.getCell(sigRow, sigStartCol);
		cell.value = value;
		cell.font = { bold: opts?.bold ?? false, size: 11 };
		cell.alignment = { horizontal: 'left', vertical: 'middle' };
		if (opts?.height) worksheet.getRow(sigRow).height = opts.height;
		sigRow++;
	};

	writeSigLine(tanggalTtd);
	writeSigLine(kepalaTitle);
	writeSigLine(sekolahNama);
	writeSigLine('', { height: 50 });
	writeSigLine(kepalaNama, { bold: true });
	writeSigLine(kepalaNipLabel);

	const widths = [5, 30, 20, 18, 12, 8, 6, 6, 6, 8, 8, 8, 11, 15, 22];
	for (let colNum = 1; colNum <= LAST_COL; colNum++) {
		worksheet.getColumn(colNum).width = widths[colNum - 1];
	}

	const buffer = await workbook.xlsx.writeBuffer();
	const filename = `Laporan-TPP-${BULAN_NAMES[bulan - 1]}-${tahun}-${status}.xlsx`;

	return new Response(new Uint8Array(buffer as ArrayBuffer), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${filename}"`
		}
	});
};
