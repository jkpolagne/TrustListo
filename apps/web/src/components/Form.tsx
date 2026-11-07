import type { ReactNode } from 'react';
import { ApiError } from '../lib/api';
import { Button } from './ui';

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
      {hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** Turns an API error into one sentence the person can act on. */
export function errorText(error: unknown): string | null {
  if (!error) return null;
  if (error instanceof ApiError) {
    if (error.code === 'VALIDATION_FAILED' && Array.isArray(error.details)) {
      const first = error.details[0] as { message?: string } | undefined;
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
    <p role="alert" className="rounded-lg bg-flag-pale px-3 py-2.5 text-sm font-medium text-flag">
      {text}
    </p>
  );
}

export function FormSuccess({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="rounded-lg bg-canvas px-3 py-2.5 text-sm font-medium">
      {children}
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
    <Button type={type} onClick={onClick} disabled={pending}>
      {children}
    </Button>
  );
}
