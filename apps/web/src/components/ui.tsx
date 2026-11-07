import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

/* Shared office UI (dashboards). Rounded, soft borders, black primary, gold only for "verified". */

export function Card({
  children,
  className = '',
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-paper shadow-[0_1px_2px_rgb(0_0_0/0.04)] ${padded ? 'p-5 sm:p-6' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-base font-bold">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';
const variants: Record<Variant, string> = {
  primary: 'bg-ink text-paper hover:bg-[#262624]',
  secondary: 'border border-rule bg-paper text-ink hover:bg-canvas',
  danger: 'border border-flag/30 bg-paper text-flag hover:bg-flag-pale',
  ghost: 'text-ink hover:bg-canvas',
};
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50';

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button {...props} className={`${buttonBase} ${variants[variant]} ${className}`} />;
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: LinkProps & { variant?: Variant }) {
  return <Link {...props} className={`${buttonBase} ${variants[variant]} ${className}`} />;
}

type Tone = 'verified' | 'neutral' | 'danger' | 'info';
const tones: Record<Tone, string> = {
  verified: 'bg-gold-pale text-bronze',
  neutral: 'bg-canvas text-muted',
  danger: 'bg-flag-pale text-flag',
  info: 'bg-[#eef1f6] text-[#334155]',
};

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap ${tones[tone]}`}
    >
      {tone === 'verified' && <span aria-hidden className="size-1.5 rounded-full bg-gold" />}
      {tone === 'danger' && <span aria-hidden className="size-1.5 rounded-full bg-flag" />}
      {children}
    </span>
  );
}

export function Avatar({
  first,
  last,
  size = 'md',
}: {
  first: string;
  last: string;
  size?: 'sm' | 'md';
}) {
  const s = size === 'sm' ? 'size-8 text-xs' : 'size-10 text-sm';
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full bg-ink font-bold text-paper ${s}`}
    >
      {(first[0] ?? '').toUpperCase()}
      {(last[0] ?? '').toUpperCase()}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  tone?: 'danger' | 'verified';
}) {
  return (
    <Card>
      <p className="text-sm font-medium text-muted">{label}</p>
      <p
        className={`mt-2 text-3xl font-bold tabular-nums ${tone === 'danger' ? 'text-flag' : tone === 'verified' ? 'text-bronze' : ''}`}
      >
        {value}
      </p>
      {hint && <p className="mt-1 text-sm text-muted">{hint}</p>}
    </Card>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl bg-canvas px-4 py-6 text-center text-sm text-muted">{children}</p>
  );
}
