import type { FieldRow } from '../../lib/reviews';

/** Below this the AI wasn't sure; matches the API's LOW_CONFIDENCE threshold. */
const UNSURE = 60;

/**
 * The fields the AI read, editable by the broker before approving (SPEC §8.6). Each shows
 * how sure the OCR was; focusing one highlights its source line in the transcript.
 */
export function FieldSheet({
  fields,
  values,
  onChange,
  onFocusValue,
  readOnly,
}: {
  fields: FieldRow[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onFocusValue: (value: string | null) => void;
  readOnly: boolean;
}) {
  if (!fields.length) {
    return <p className="text-sm text-muted">No fields are read from this kind of document.</p>;
  }
  return (
    <div className="space-y-4">
      {fields.map((f) => {
        const current = values[f.key] ?? f.value ?? '';
        const changed = current !== (f.value ?? '');
        const missing = !f.value && !f.edited;
        const unsure = !f.edited && f.value !== null && f.confidence < UNSURE;
        const id = `field-${f.key}`;
        return (
          <div key={f.key}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label htmlFor={id} className="text-sm font-semibold">
                {f.label}
                {f.required && <span className="sr-only"> (required)</span>}
              </label>
              <span className={`text-xs ${missing || unsure ? 'text-flag' : 'text-muted'}`}>
                {f.edited
                  ? 'Corrected by broker'
                  : changed
                    ? 'Your correction'
                    : missing
                      ? 'Not found'
                      : `${f.confidence}% sure`}
              </span>
            </div>
            {readOnly ? (
              <p
                id={id}
                tabIndex={0}
                onFocus={() => onFocusValue(f.aiValue ?? f.value)}
                className="rounded-lg bg-canvas px-3 py-2 text-sm"
              >
                {f.value ?? '—'}
              </p>
            ) : (
              <input
                id={id}
                className={`input ${missing || unsure ? 'border-flag/40' : ''}`}
                value={current}
                placeholder={missing ? 'Type it from the document' : undefined}
                onChange={(e) => onChange(f.key, e.target.value)}
                onFocus={() => onFocusValue(f.value)}
              />
            )}
            {/* Confidence bar: how sure the OCR was about this reading. */}
            {!f.edited && f.value !== null && (
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-line" aria-hidden>
                <div
                  className={`h-full rounded-full ${unsure ? 'bg-flag' : 'bg-graphite'}`}
                  style={{ width: `${Math.max(4, f.confidence)}%` }}
                />
              </div>
            )}
            {f.edited && f.aiValue !== undefined && (
              <p className="mt-1 text-xs text-muted">The AI read: {f.aiValue ?? 'nothing'}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
