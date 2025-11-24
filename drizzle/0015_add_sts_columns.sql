-- Add columns to store Sumatif Tengah Semester (STS) scores
ALTER TABLE asesmen_sumatif ADD COLUMN stsTes REAL;
ALTER TABLE asesmen_sumatif ADD COLUMN stsNonTes REAL;
ALTER TABLE asesmen_sumatif ADD COLUMN sts REAL;
