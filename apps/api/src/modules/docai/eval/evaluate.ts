/**
 * Module 1 accuracy evaluation (SPEC §8.8, for Chapter 4).
 * Runs the real pipeline steps (OCR → classify → extract → cross-check) on every labeled
 * sample in prisma/seed-docs/samples and reports:
 *   - classification accuracy per document type
 *   - field extraction accuracy per field
 *   - whether the expected flags (and only those) were raised
 * Writes the same tables to eval/results.md.
 *   pnpm --filter api docai:samples   (once, renders the samples)
 *   pnpm --filter api docai:eval
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import type { DocType } from '@prisma/client';
import { computeFlags, type CheckContext } from '../checks';
import { classify } from '../classify';
import { extract } from '../extractors';
import { nameTokens } from '../names';
import { closeOcr, runOcr } from '../ocr';
import { alnum, norm } from '../text';

type Label = {
  file: string;
  declaredType: DocType;
  type: DocType;
  fields: Record<string, string>;
  context: Partial<CheckContext>;
  flags: string[];
};

const samplesDir = path.resolve(import.meta.dirname, '../../../../prisma/seed-docs/samples');
const { today, samples } = JSON.parse(
  readFileSync(path.join(samplesDir, 'labels.json'), 'utf8'),
) as { today: string; samples: Label[] };

const MIME: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  pdf: 'application/pdf',
};
const NAME_FIELDS = new Set(['ownerName', 'fullName']);

/** A field is correct when it means the same thing, ignoring case, spacing and punctuation. */
function fieldCorrect(key: string, expected: string, got: string | null): boolean {
  if (got === null) return false;
  // Names: the same words in any order ("SANTOS, MARIA" = "MARIA SANTOS"), nothing extra.
  if (NAME_FIELDS.has(key)) {
    const words = (s: string) => nameTokens(s).sort().join(' ');
    return words(expected) === words(got);
  }
  if (/^\d+(\.\d+)?$/.test(expected)) return Number(expected) === Number(got);
  return norm(expected) === norm(got) || alnum(expected) === alnum(got);
}

const pct = (a: number, b: number) => (b ? `${((100 * a) / b).toFixed(1)}%` : '-');

const byType = new Map<string, { n: number; ok: number }>();
const byField = new Map<string, { n: number; ok: number }>();
let flagsExact = 0;
let totalMs = 0;
let totalConf = 0;
const rows: string[] = [];

for (const s of samples) {
  const started = Date.now();
  const ocr = await runOcr(
    readFileSync(path.join(samplesDir, s.file)),
    MIME[s.file.split('.').pop()!]!,
  );
  const detected = classify(ocr.text);
  const extracted = extract(s.declaredType, ocr);
  const flags = computeFlags(extracted, {
    ...s.context,
    today: new Date(`${today}T08:00:00`),
    declaredType: s.declaredType,
    detectedType: detected.type,
    ocrFailed: false,
    duplicateFile: false,
  });
  const ms = Date.now() - started;
  totalMs += ms;
  totalConf += ocr.confidence;

  const t = byType.get(s.type) ?? { n: 0, ok: 0 };
  t.n++;
  if (detected.type === s.type) t.ok++;
  byType.set(s.type, t);

  const wrong: string[] = [];
  for (const [key, expected] of Object.entries(s.fields)) {
    const f = byField.get(key) ?? { n: 0, ok: 0 };
    f.n++;
    const got = extracted[key]?.value ?? null;
    if (fieldCorrect(key, expected, got)) f.ok++;
    else wrong.push(`${key}: expected "${expected}", got "${got ?? '—'}"`);
    byField.set(key, f);
  }

  const got = [...new Set(flags.map((f) => f.code))].sort();
  const want = [...s.flags].sort();
  const exact = JSON.stringify(got) === JSON.stringify(want);
  if (exact) flagsExact++;

  const status = detected.type === s.type && !wrong.length && exact ? 'OK ' : 'ERR';
  console.log(
    `${status} ${s.file.padEnd(26)} ${detected.type.padEnd(16)} conf ${String(ocr.confidence).padStart(3)}  ${ms} ms`,
  );
  for (const w of wrong) console.log(`      ${w}`);
  if (!exact) console.log(`      flags: expected [${want.join(', ')}], got [${got.join(', ')}]`);
  rows.push(
    `| ${s.file} | ${s.type} | ${detected.type} | ${Object.keys(s.fields).length - wrong.length}/${Object.keys(s.fields).length} | ${want.join(', ') || '—'} | ${got.join(', ') || '—'} | ${ocr.confidence} | ${ms} |`,
  );
}
await closeOcr();

const typeRows = [...byType].map(([t, v]) => `| ${t} | ${v.ok}/${v.n} | ${pct(v.ok, v.n)} |`);
const fieldRows = [...byField].map(([k, v]) => `| ${k} | ${v.ok}/${v.n} | ${pct(v.ok, v.n)} |`);
const typeOk = [...byType.values()].reduce((s, v) => s + v.ok, 0);
const fieldN = [...byField.values()].reduce((s, v) => s + v.n, 0);
const fieldOk = [...byField.values()].reduce((s, v) => s + v.ok, 0);

const summary = [
  `Samples: ${samples.length} · evaluated as of ${today}`,
  `Classification accuracy: ${typeOk}/${samples.length} (${pct(typeOk, samples.length)})`,
  `Field extraction accuracy: ${fieldOk}/${fieldN} (${pct(fieldOk, fieldN)})`,
  `Flags exactly as expected: ${flagsExact}/${samples.length} (${pct(flagsExact, samples.length)})`,
  `Mean OCR confidence: ${(totalConf / samples.length).toFixed(1)} · mean time per document: ${Math.round(totalMs / samples.length)} ms`,
];
console.log(`\n${summary.join('\n')}`);

const md = `# Module 1 evaluation results

Generated by \`pnpm --filter api docai:eval\` on the mock samples in \`prisma/seed-docs/samples\` (SPEC §8.8).
Machine-dependent numbers (time) vary between runs.

${summary.map((s) => `- ${s}`).join('\n')}

## Classification by document type

| Type | Correct | Accuracy |
|---|---|---|
${typeRows.join('\n')}

## Extraction by field

| Field | Correct | Accuracy |
|---|---|---|
${fieldRows.join('\n')}

## Per document

| File | Expected type | Detected | Fields | Expected flags | Raised flags | OCR conf. | ms |
|---|---|---|---|---|---|---|---|
${rows.join('\n')}
`;
writeFileSync(path.join(import.meta.dirname, 'results.md'), md);
