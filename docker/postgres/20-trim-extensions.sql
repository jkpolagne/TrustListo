-- The postgis image also installs these; TrustListo only needs postgis.
-- Removing them keeps Prisma migrations free of drift.
DROP EXTENSION IF EXISTS postgis_tiger_geocoder CASCADE;
DROP EXTENSION IF EXISTS postgis_topology CASCADE;
DROP EXTENSION IF EXISTS fuzzystrmatch CASCADE;
DROP SCHEMA IF EXISTS tiger CASCADE;
DROP SCHEMA IF EXISTS tiger_data CASCADE;
DROP SCHEMA IF EXISTS topology CASCADE;
