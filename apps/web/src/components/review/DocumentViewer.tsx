import { ExternalLink, Minus, Plus } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { useDocumentUrl } from '../../lib/reviews';
import { Card } from '../ui';

const STEPS = [1, 1.5, 2, 3];

/**
 * The uploaded file, zoomable, for side-by-side checking (SPEC §8.6). PDFs use the
 * browser's own viewer. `below` renders under the file inside the same card.
 */
export function DocumentViewer({
  documentId,
  alt,
  below,
}: {
  documentId: string | undefined;
  alt: string;
  below?: ReactNode;
}) {
  const doc = useDocumentUrl(documentId);
  const [step, setStep] = useState(0);
  const isPdf = doc.data?.mimeType === 'application/pdf';
  const zoom = STEPS[step]!;

  return (
    <Card padded={false} className="min-w-0 self-start overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <p className="text-sm font-semibold">Uploaded file</p>
        <div className="flex items-center gap-1">
          {!isPdf && doc.data && (
            <div className="flex items-center rounded-lg border border-line" aria-label="Zoom">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
                aria-label="Zoom out"
                className="grid size-8 place-items-center rounded-l-lg text-muted hover:bg-canvas hover:text-ink disabled:opacity-40"
              >
                <Minus aria-hidden className="size-4" />
              </button>
              <span
                className="w-12 text-center text-xs font-semibold tabular-nums"
                aria-live="polite"
              >
                {Math.round(zoom * 100)}%
              </span>
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                disabled={step === STEPS.length - 1}
                aria-label="Zoom in"
                className="grid size-8 place-items-center rounded-r-lg text-muted hover:bg-canvas hover:text-ink disabled:opacity-40"
              >
                <Plus aria-hidden className="size-4" />
              </button>
            </div>
          )}
          {doc.data && (
            <a
              href={doc.data.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-muted hover:bg-canvas hover:text-ink"
            >
              Open <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      </div>

      <div className="bg-canvas p-3 sm:p-4">
        {!documentId && (
          <p className="py-10 text-center text-sm text-muted">No file was uploaded.</p>
        )}
        {documentId && !doc.data && (
          <div className="grid h-80 place-items-center rounded-lg bg-line/40 text-sm text-muted motion-safe:animate-pulse">
            {doc.isError ? "The file couldn't be loaded. Reload the page." : 'Loading file…'}
          </div>
        )}
        {doc.data &&
          (isPdf ? (
            <iframe
              src={doc.data.url}
              title={alt}
              className="h-[70vh] w-full rounded-lg bg-paper"
            />
          ) : (
            <div className="max-h-[70vh] overflow-auto rounded-lg">
              <img
                src={doc.data.url}
                alt={alt}
                style={{ width: `${zoom * 100}%`, maxWidth: 'none' }}
                className="mx-auto block rounded-lg shadow-sm"
              />
            </div>
          ))}
      </div>
      {below}
    </Card>
  );
}
