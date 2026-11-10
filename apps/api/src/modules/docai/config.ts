/**
 * Module 1 tuning knobs (SPEC §8). Kept in one place so the thresholds used in the
 * manuscript's evaluation are easy to find and change.
 */
export const DOCAI = {
  /** §8.5 name matching: ≥ match is a match, between warn and match is a WARNING, below warn a BLOCKER. */
  name: { match: 0.92, warn: 0.8 },
  /** §8.2: the best classifier score must reach this to name a type; otherwise UNKNOWN. */
  classifyThreshold: 4,
  /** §8.3: a required field read below this OCR confidence (0–100) gets a LOW_CONFIDENCE flag. */
  lowConfidence: 60,
  /** §8.3: tax declaration lot area may differ from the title by this much before AREA_MISMATCH. */
  areaTolerance: { sqm: 1, pct: 0.02 },
  /** §8.3: LTS_EXPIRING_SOON window. */
  ltsSoonDays: 90,
  /** §8.1 OCR: retry with binarization + PSM 6 when the first pass is below this confidence. */
  ocrRetryBelow: 70,
  /** PDFs: only the first pages are read (titles and LTS are 1–2 pages). */
  maxPdfPages: 3,
  /** Rasterize PDFs at 300 DPI (PDF points are 1/72 inch). */
  pdfScale: 300 / 72,
} as const;
