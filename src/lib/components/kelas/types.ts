export type KelasCard = Omit<Kelas, 'sekolah'> & {
	jumlahMurid: number;
	jumlahMapel: number;
	jumlahEkstrakurikuler: number;
	jumlahKokurikuler: number;
};

export type DeleteKelasModalHandle = {
	open: (kelas: KelasCard) => void;
	close: () => void;
};
