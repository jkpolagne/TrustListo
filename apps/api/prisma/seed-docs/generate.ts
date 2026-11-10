/**
 * Renders the Module 1 evaluation set (SPEC §8.8) into prisma/seed-docs/samples/ with a
 * labels.json describing the expected reading of each file.
 *   pnpm --filter api docai:samples
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { EVAL_TODAY, SAMPLES } from './samples';

const dir = path.join(import.meta.dirname, 'samples');
mkdirSync(dir, { recursive: true });

const labels = [];
for (const s of SAMPLES) {
  const { render, ...label } = s;
  writeFileSync(path.join(dir, s.file), await render());
  labels.push(label);
  console.log(`  ${s.file}`);
}
writeFileSync(
  path.join(dir, 'labels.json'),
  `${JSON.stringify({ today: EVAL_TODAY, samples: labels }, null, 2)}\n`,
);
console.log(`Wrote ${SAMPLES.length} samples and labels.json to ${dir}`);
