import { useEffect, useMemo, useRef } from 'react';

const squash = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

/** Index of the transcript line a field value was most likely read from. */
export function sourceLine(lines: string[], value: string | null | undefined): number {
  if (!value) return -1;
  const v = squash(value);
  if (v.length < 2) return -1;
  const exact = lines.findIndex((l) => squash(l).includes(v));
  if (exact >= 0) return exact;
  // Fall back to the longest word of the value (e.g. a surname in a reordered name).
  const word = value
    .split(/[\s,]+/)
    .map(squash)
    .sort((a, b) => b.length - a.length)[0];
  return word && word.length >= 4 ? lines.findIndex((l) => squash(l).includes(word)) : -1;
}

/**
 * What the AI read, line by line. The line behind the field the broker is checking is
 * highlighted and scrolled into view, so every value can be traced back to the page.
 */
export function OcrTranscript({
  text,
  confidence,
  highlight,
}: {
  text: string | null;
  confidence: number | null;
  highlight: string | null;
}) {
  const lines = useMemo(() => (text ?? '').split('\n').filter((l) => l.trim().length > 0), [text]);
  const active = sourceLine(lines, highlight);
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(() => {
    if (active < 0) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el?.scrollIntoView({ block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
  }, [active]);

  return (
    <section className="border-t border-line" aria-labelledby="ocr-heading">
      <div className="flex items-baseline justify-between gap-3 px-4 pt-3 pb-2">
        <h2 id="ocr-heading" className="text-sm font-semibold">
          Text the AI read
        </h2>
        {confidence !== null && (
          <p className="text-xs text-muted">OCR confidence {Math.round(confidence)}%</p>
        )}
      </div>
      {lines.length === 0 ? (
        <p className="px-4 pb-4 text-sm text-muted">
          No text was read from this file. Check it by eye.
        </p>
      ) : (
        <ol
          ref={listRef}
          className="max-h-72 overflow-y-auto px-2 pb-3 font-mono text-[0.8125rem] leading-relaxed"
        >
          {lines.map((l, i) => (
            <li
              key={i}
              className={`rounded px-2 whitespace-pre-wrap transition-colors ${
                i === active ? 'bg-ink text-paper' : 'text-graphite'
              }`}
            >
              {l}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
