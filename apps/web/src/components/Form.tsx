import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-sm text-graphite">{hint}</p>}
    </div>
  );
}

/** Turns an API error into one sentence the person can act on. */
export function errorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_FAILED' && Array.isArray(error.details)) {
      const first = error.details[0] as { message?: string; path?: string[] } | undefined;
      if (first?.message) return first.message;
    }
    return error.message;
  }
  return 'Something went wrong. Check your connection and try again.';
}

export function FormError({ error }: { error: unknown }) {
  const text = errorText(error);
  if (!text) return null;
  return (
    <p role="alert" className="border-l-4 border-flag bg-flag/5 px-3 py-2 text-sm text-flag">
      {text}
    </p>
  );
}

export function PrimaryButton({
  children,
  pending,
  type = 'submit',
  onClick,
}: {
  children: ReactNode;
  pending?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending}
      className="bg-ink px-5 py-3 font-semibold text-paper hover:bg-graphite disabled:opacity-60"
    >
      {children}
    </button>
  );
}
