-- Add 'kejuruan' to jenis enum for mata_pelajaran
-- This migration updates the mata_pelajaran table to support Kejuruan subject type
-- Supported jenis values: 'wajib', 'pilihan', 'mulok', 'kejuruan'

-- SQLite doesn't support direct enum modification, so we document the schema change
-- The schema.ts file has been updated with the new enum value
-- No data needs to be migrated as this is a new optional type
