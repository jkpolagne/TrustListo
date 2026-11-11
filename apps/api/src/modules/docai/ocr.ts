import { createRequire } from 'node:module';
import path from 'node:path';
import sharp from 'sharp';
import { createWorker, PSM, type Worker } from 'tesseract.js';
import { DOCAI } from './config';
import type { OcrLine, OcrResult } from './types';

/**
 * OCR step of the pipeline (SPEC §8.1):
 *   PDF → page images (300 DPI) → preprocess with sharp → Tesseract (psm 3, fallback psm 6).
 * The Tesseract worker is created once and reused. Its English model ships with the project
 * (@tesseract.js-data/eng, the same "best_int" model tesseract.js would otherwise download), so
 * OCR works offline: no internet needed at a demo or on a locked-down server.
 */

const require = createRequire(import.meta.url);
const LANG_PATH = path.join(
  path.dirname(require.resolve('@tesseract.js-data/eng/package.json')),
  '4.0.0_best_int',
);

let worker: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  worker ??= createWorker('eng', 1, {
    langPath: LANG_PATH, // a local folder, read with fs
    gzip: true, // eng.traineddata.gz
    cacheMethod: 'none', // nothing to cache: the model is already on disk
  });
  return worker;
}

/** Stops the worker thread (tests and scripts call this so the process can exit). */
export async function closeOcr(): Promise<void> {
  const w = worker;
  worker = null;
  if (w) await (await w).terminate();
}

/**
 * Cleans up a photo or scan for OCR: fix EXIF rotation, grayscale, scale so small text is big
 * enough (≥ 2000 px wide), stretch contrast, remove speckles. `binarize` also turns it pure
 * black/white, which helps faint scans and hides colored watermarks.
 */
export async function preprocess(image: Buffer, binarize = false): Promise<Buffer> {
  const meta = await sharp(image).rotate().metadata();
  const width = meta.autoOrient?.width ?? meta.width ?? 0;
  // Remove speckles at the original size first: once upscaled they are too big for the filter.
  // (sharp runs its operations in a fixed order, so this is a separate pass.)
  const clean = await sharp(image).rotate().grayscale().median(3).png().toBuffer();
  let p = sharp(clean);
  if (width && width < 2000) p = p.resize({ width: 2000 });
  else if (width > 3600) p = p.resize({ width: 3000 });
  p = p.normalize();
  if (binarize) p = p.threshold(150);
  return p.png().toBuffer();
}

type Pass = { text: string; confidence: number; lines: OcrLine[] };

async function recognize(image: Buffer, psm: PSM): Promise<Pass> {
  const w = await getWorker();
  await w.setParameters({ tessedit_pageseg_mode: psm, preserve_interword_spaces: '1' });
  const { data } = await w.recognize(image, {}, { text: true, blocks: true });
  const lines: OcrLine[] = [];
  for (const block of data.blocks ?? []) {
    for (const para of block.paragraphs) {
      for (const line of para.lines) {
        const text = line.text.trim();
        if (text) lines.push({ text, confidence: Math.round(line.confidence) });
      }
    }
  }
  return { text: data.text, confidence: Math.round(data.confidence), lines };
}

/** OCR of one page image, with the fallback pass when the first read is poor. */
export async function ocrImage(image: Buffer): Promise<Pass> {
  const first = await recognize(await preprocess(image), PSM.AUTO);
  if (first.confidence >= DOCAI.ocrRetryBelow && first.text.trim().length >= 20) return first;
  const second = await recognize(await preprocess(image, true), PSM.SINGLE_BLOCK);
  return second.confidence > first.confidence ? second : first;
}

/** PDF pages as PNG images at 300 DPI. */
async function rasterize(pdfBytes: Buffer): Promise<Buffer[]> {
  const { pdf } = await import('pdf-to-img');
  const doc = await pdf(pdfBytes, { scale: DOCAI.pdfScale });
  const pages: Buffer[] = [];
  for await (const page of doc) {
    pages.push(page);
    if (pages.length >= DOCAI.maxPdfPages) break;
  }
  return pages;
}

export type OcrEngine = (file: Buffer, mimeType: string) => Promise<OcrResult>;

const tesseractEngine: OcrEngine = async (file, mimeType) => {
  const images = mimeType === 'application/pdf' ? await rasterize(file) : [file];
  const passes: Pass[] = [];
  for (const img of images) passes.push(await ocrImage(img));
  const chars = passes.reduce((n, p) => n + p.text.length, 0) || 1;
  return {
    text: passes.map((p) => p.text.trim()).join('\n\n'),
    // Pages with more text weigh more in the overall confidence.
    confidence: Math.round(passes.reduce((s, p) => s + p.confidence * p.text.length, 0) / chars),
    lines: passes.flatMap((p) => p.lines),
    pages: passes.length,
  };
};

let engine: OcrEngine = tesseractEngine;

export const runOcr: OcrEngine = (file, mimeType) => engine(file, mimeType);

/** Tests can swap in a fake engine; pass nothing to restore Tesseract. */
export function setOcrEngine(e?: OcrEngine): void {
  engine = e ?? tesseractEngine;
}
