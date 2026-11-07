-- GIST indexes for PostGIS map/radius queries (SPEC §6 notes).
CREATE INDEX IF NOT EXISTS "Project_geom_gist" ON "Project" USING GIST ("geom");
CREATE INDEX IF NOT EXISTS "Property_geom_gist" ON "Property" USING GIST ("geom");
