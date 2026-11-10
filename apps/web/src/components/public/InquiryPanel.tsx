import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { errorText } from '../Form';
import { api } from '../../lib/api';
import { CIVIL_STATUS, NATURE_OF_WORK, PAYMENT_PREF, useInquiryRouting } from '../../lib/leads';
import type { AgentCard } from '../../lib/sellers';
import { ConsultantCard } from './ConsultantCard';

/**
 * Buyer inquiry (SPEC §7.2). Who receives it is decided by the server: a referral link's
 * consultant, the seller's chosen agent, or — for developer listings — the consultant the
 * buyer picks from the firm's shuffled, verified pool. No account, no chat.
 */
export function InquiryPanel({
  propertyId,
  propertyTitle,
  firmName,
  refCode,
  onClose,
}: {
  propertyId: string;
  propertyTitle: string;
  firmName?: string;
  refCode: string | null;
  onClose: () => void;
}) {
  const routing = useInquiryRouting(propertyId, refCode, true);
  const [chosen, setChosen] = useState<AgentCard | null>(null);
  const [shown, setShown] = useState(4);
  const [form, setForm] = useState({
    buyerName: '',
    buyerPhone: '',
    buyerEmail: '',
    natureOfWork: '',
    paymentPref: '',
    civilStatus: '',
    message: '',
    consent: false,
    website: '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const mode = routing.data?.mode;
  const fixed = mode && mode !== 'PICK' ? routing.data!.data[0] : null;
  const recipient = fixed ?? chosen;

  const send = useMutation({
    mutationFn: () =>
      api<{ consultant: { firstName: string; lastName: string; firm: { name: string } | null } }>(
        '/public/inquiries',
        {
          json: {
            ...form,
            propertyId,
            consultantId: mode === 'PICK' ? chosen?.id : undefined,
            ref: refCode ?? undefined,
            message: form.message || undefined,
          },
        },
      ),
  });

  let content: ReactNode;
  if (send.isSuccess) {
    const c = send.data.consultant;
    content = (
      <div>
        <h2 id="inq-title" className="font-display text-3xl leading-tight">
          Sent to {c.firstName} {c.lastName}
        </h2>
        <p className="mt-3 leading-relaxed text-graphite">
          {c.firstName} of {c.firm?.name} will call or text you at {form.buyerPhone}. TrustListo has
          no chat; your consultant takes it from here.
        </p>
        <button
          type="button"
          onClick={onClose}
          className="mt-6 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper"
        >
          Back to the listing
        </button>
      </div>
    );
  } else if (routing.isPending) {
    content = <p className="text-sm text-muted">Loading…</p>;
  } else if (routing.isError) {
    content = <p className="text-sm text-flag">{errorText(routing.error)}</p>;
  } else if (mode === 'PICK' && !chosen) {
    const list = routing.data!.data;
    content = (
      <div>
        <h2 id="inq-title" className="text-2xl font-bold">
          Choose who to talk to
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-graphite">
          These are {firmName ?? 'the firm'}'s consultants with a broker-verified license. They
          appear in a random order; nobody pays to be first.
        </p>
        {list.length === 0 ? (
          <p className="mt-5 rounded-xl bg-canvas p-4 text-sm">
            No verified consultant of this firm is available right now. Try again later.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {list.slice(0, shown).map((c) => (
              <li key={c.id}>
                <ConsultantCard c={c} showFirm={false} onSelect={() => setChosen(c)} />
              </li>
            ))}
          </ul>
        )}
        {shown < list.length && (
          <button
            type="button"
            onClick={() => setShown((n) => n + 4)}
            className="mt-4 text-sm font-semibold underline underline-offset-4"
          >
            Show more consultants
          </button>
        )}
      </div>
    );
  } else {
    content = (
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send.mutate();
        }}
        className="space-y-4"
      >
        <div>
          <h2 id="inq-title" className="text-2xl font-bold">
            Ask about this home
          </h2>
          {recipient && (
            <p className="mt-2 text-sm text-graphite">
              {mode === 'ASSIGNED'
                ? `The owner chose ${recipient.firstName} ${recipient.lastName} to handle this property; your inquiry goes to them.`
                : mode === 'REFERRAL'
                  ? `Your inquiry goes to ${recipient.firstName} ${recipient.lastName}, who shared this link with you.`
                  : `Your inquiry goes to ${recipient.firstName} ${recipient.lastName}.`}{' '}
              {mode === 'PICK' && (
                <button
                  type="button"
                  className="font-semibold underline underline-offset-2"
                  onClick={() => setChosen(null)}
                >
                  Choose someone else
                </button>
              )}
            </p>
          )}
        </div>
        <Row id="q-name" label="Your full name">
          <input
            id="q-name"
            className="input"
            required
            autoComplete="name"
            value={form.buyerName}
            onChange={set('buyerName')}
          />
        </Row>
        <div className="grid gap-4 sm:grid-cols-2">
          <Row id="q-phone" label="Mobile number">
            <input
              id="q-phone"
              className="input"
              required
              inputMode="tel"
              autoComplete="tel"
              placeholder="09171234567"
              value={form.buyerPhone}
              onChange={set('buyerPhone')}
            />
          </Row>
          <Row id="q-email" label="Email (optional)">
            <input
              id="q-email"
              type="email"
              className="input"
              autoComplete="email"
              value={form.buyerEmail}
              onChange={set('buyerEmail')}
            />
          </Row>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Row id="q-work" label="Work">
            <select
              id="q-work"
              className="input"
              required
              value={form.natureOfWork}
              onChange={set('natureOfWork')}
            >
              <option value="">Choose…</option>
              {Object.entries(NATURE_OF_WORK).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Row>
          <Row id="q-pay" label="How you'd pay">
            <select
              id="q-pay"
              className="input"
              required
              value={form.paymentPref}
              onChange={set('paymentPref')}
            >
              <option value="">Choose…</option>
              {Object.entries(PAYMENT_PREF).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Row>
          <Row id="q-civil" label="Civil status">
            <select
              id="q-civil"
              className="input"
              required
              value={form.civilStatus}
              onChange={set('civilStatus')}
            >
              <option value="">Choose…</option>
              {Object.entries(CIVIL_STATUS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Row>
        </div>
        <Row id="q-msg" label="Message (optional)">
          <textarea
            id="q-msg"
            className="input"
            rows={3}
            placeholder="When can I see it? Is it still available?"
            value={form.message}
            onChange={set('message')}
          />
        </Row>
        <input
          tabIndex={-1}
          aria-hidden
          autoComplete="off"
          className="hidden"
          name="website"
          value={form.website}
          onChange={set('website')}
        />
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            required
            checked={form.consent}
            onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
            className="mt-1 size-4 accent-ink"
          />
          <span>
            I agree that {firmName ?? 'the listing firm'} may use these details to contact me about{' '}
            {propertyTitle}, as allowed by the Data Privacy Act of 2012.
          </span>
        </label>
        {send.error && (
          <p className="text-sm text-flag" role="alert">
            {errorText(send.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={send.isPending}
          className="rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-paper disabled:opacity-50"
        >
          {send.isPending ? 'Sending…' : 'Send inquiry'}
        </button>
      </form>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-end justify-center bg-ink/40 sm:items-center sm:p-6"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="inq-title"
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-paper p-5 shadow-xl sm:rounded-2xl sm:p-8"
      >
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 grid size-9 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
        >
          <X aria-hidden className="size-5" />
        </button>
        {content}
      </div>
    </div>
  );
}

function Row({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}
