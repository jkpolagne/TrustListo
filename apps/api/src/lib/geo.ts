import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * PostGIS helpers. Prisma can't read or write `geography` columns directly, so these use
 * parameterized raw SQL (tagged templates → no string concatenation of values, SPEC §14).
 */
type GeoTable = 'Project' | 'Property';
const table = (t: GeoTable) => Prisma.raw(`"${t}"`); // fixed whitelist, never user input

export interface LatLng {
  lat: number;
  lng: number;
}

export async function setPoint(t: GeoTable, id: string, p: LatLng | null): Promise<void> {
  if (!p) {
    await prisma.$executeRaw`UPDATE ${table(t)} SET geom = NULL WHERE id = ${id}`;
    return;
  }
  await prisma.$executeRaw`
    UPDATE ${table(t)}
    SET geom = ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography
    WHERE id = ${id}`;
}

export async function getPoints(t: GeoTable, ids: string[]): Promise<Map<string, LatLng>> {
  if (ids.length === 0) return new Map();
  const rows = await prisma.$queryRaw<{ id: string; lat: number; lng: number }[]>`
    SELECT id, ST_Y(geom::geometry) AS lat, ST_X(geom::geometry) AS lng
    FROM ${table(t)}
    WHERE id IN (${Prisma.join(ids)}) AND geom IS NOT NULL`;
  return new Map(rows.map((r) => [r.id, { lat: r.lat, lng: r.lng }]));
}

/** [minLng, minLat, maxLng, maxLat] */
export type Bbox = [number, number, number, number];

/** Ids of properties whose point falls inside the box (uses the GIST index). */
export async function propertyIdsInBbox([minLng, minLat, maxLng, maxLat]: Bbox): Promise<string[]> {
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Property"
    WHERE geom && ST_MakeEnvelope(${minLng}, ${minLat}, ${maxLng}, ${maxLat}, 4326)::geography`;
  return rows.map((r) => r.id);
}

export function parseBbox(raw: unknown): Bbox | null {
  if (typeof raw !== 'string') return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return null;
  const [minLng, minLat, maxLng, maxLat] = parts as Bbox;
  if (minLng >= maxLng || minLat >= maxLat) return null;
  if (Math.abs(minLat) > 90 || Math.abs(maxLat) > 90) return null;
  return [minLng, minLat, maxLng, maxLat];
}
