import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Upload } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { errorText, Field, FormError, PrimaryButton } from '../../components/Form';
import { Button, Card, CardHeader } from '../../components/ui';
import { api } from '../../lib/api';
import {
  EMPLOYMENT,
  METHOD,
  needsEmployment,
  useDocumentStatus,
  type CivilStatus,
  type EmploymentType,
  type PaymentMethod,
} from '../../lib/clients';
import { CIVIL_STATUS, type LeadDetail } from '../../lib/leads';
import { basePath } from '../../lib/paths';
import type { Role } from '@trustlisto/shared';

const WORK_TO_EMPLOYMENT: Record<string, EmploymentType | ''> = {
  EMPLOYED: 'LOCALLY_EMPLOYED',
  OFW: 'OFW',
  BUSINESS: 'SELF_EMPLOYED',
  OTHER: '',
};

/**
 * Lead → client (SPEC §10.1). The reservation receipt comes first: Module 1 reads its amount
 * and date to fill the form, and the consultant confirms them (§8.3). Converting creates the
 * client, records the reservation payment, and builds the requirements checklist (§9).
 */
export function ConvertLead({ l, role }: { l: LeadDetail; role: Role }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const input = useRef<HTMLInputElement>(null);
  const [docId, setDocId] = useState<string | null>(null);
  const doc = useDocumentStatus(docId);
  const reading =
    !!docId && (!doc.data || doc.data.aiStatus === 'QUEUED' || doc.data.aiStatus === 'PROCESSING');
  const [form, setForm] = useState({
    amount: '',
    paidAt: new Date().toISOString().slice(0, 10),
    tcp: '',
    paymentMethod: (l.paymentPref === 'NOT_SURE' ? '' : l.paymentPref) as PaymentMethod | '',
    civilStatus: l.civilStatus as CivilStatus,
    employmentType: WORK_TO_EMPLOYMENT[l.natureOfWork] ?? '',
    downpaymentAmount: '',
  });
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Fill amount and date from what the AI read, once.
  const filled = useRef(false);
  useEffect(() => {
    if (filled.current || !doc.data || reading) return;
    const ex = doc.data.extracted ?? {};
    setForm((f) => ({
      ...f,
      amount: ex.amount?.value ?? f.amount,
      paidAt: ex.paymentDate?.value ?? f.paidAt,
    }));
    filled.current = true;
  }, [doc.data, reading]);

  const upload = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.append('file', file);
      return api<{ documentId: string }>(`/inquiries/${l.id}/receipt`, { method: 'POST', body });
    },
    onSuccess: (r) => {
      filled.current = false;
      setDocId(r.documentId);
    },
  });
  const convert = useMutation({
    mutationFn: () =>
      api<{ clientId: string }>(`/inquiries/${l.id}/convert`, {
        json: {
          receiptDocumentId: docId,
          amount: Number(form.amount),
          paidAt: form.paidAt,
          tcp: Number(form.tcp),
          paymentMethod: form.paymentMethod,
          civilStatus: form.civilStatus,
          employmentType: needsEmployment(form.paymentMethod)
            ? form.employmentType
            : form.employmentType || null,
          // Bank and Pag-IBIG commissions are released at % of the downpayment (§10.3).
          downpaymentAmount: needsEmployment(form.paymentMethod)
            ? Number(form.downpaymentAmount)
            : null,
        },
      }),
    onSuccess: ({ clientId }) => {
      qc.invalidateQueries({ queryKey: ['leads'] });
      qc.invalidateQueries({ queryKey: ['clients'] });
      navigate(`${basePath(role)}/clients/${clientId}`);
    },
  });

  const ai = doc.data?.extracted?.amount;
  const serious = (doc.data?.flags ?? []).filter((f) => f.severity !== 'INFO');

  return (
    <Card>
      <CardHeader
        title="The buyer reserved"
        description="Upload the reservation receipt to make this lead a client. The amount is read for you; check it before saving."
      />
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload.mutate(f);
          e.target.value = '';
        }}
      />
      {!docId ? (
        <>
          <Button
            variant="secondary"
            onClick={() => input.current?.click()}
            disabled={upload.isPending}
          >
            <Upload aria-hidden className="size-4" />
            {upload.isPending ? 'Uploading…' : 'Upload reservation receipt'}
          </Button>
          {upload.error && <p className="mt-2 text-sm text-flag">{errorText(upload.error)}</p>}
        </>
      ) : reading ? (
        <p className="text-sm text-muted" role="status">
          Reading the receipt…
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e: FormEvent) => {
            e.preventDefault();
            convert.mutate();
          }}
        >
          {serious.length > 0 && (
            <ul className="space-y-1.5">
              {serious.map((f, i) => (
                <li key={i} className="rounded-lg bg-flag-pale px-3 py-2 text-sm text-flag">
                  {f.message}
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Amount paid (₱)"
              htmlFor="c-amount"
              hint={
                ai?.value
                  ? `Read from the receipt (${ai.confidence}% sure). Correct it if wrong.`
                  : "Couldn't read it; type it from the receipt."
              }
            >
              <input
                id="c-amount"
                className="input"
                inputMode="decimal"
                required
                value={form.amount}
                onChange={set('amount')}
              />
            </Field>
            <Field label="Date paid" htmlFor="c-date">
              <input
                id="c-date"
                type="date"
                className="input"
                required
                value={form.paidAt}
                onChange={set('paidAt')}
              />
            </Field>
          </div>
          <Field
            label="Total contract price (₱)"
            htmlFor="c-tcp"
            hint="As agreed, which may differ from the listed price."
          >
            <input
              id="c-tcp"
              className="input"
              inputMode="decimal"
              required
              value={form.tcp}
              onChange={set('tcp')}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="How the buyer will pay" htmlFor="c-method">
              <select
                id="c-method"
                className="input"
                required
                value={form.paymentMethod}
                onChange={set('paymentMethod')}
              >
                <option value="">Choose…</option>
                {(Object.keys(METHOD) as PaymentMethod[]).map((m) => (
                  <option key={m} value={m}>
                    {METHOD[m]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Civil status" htmlFor="c-civil">
              <select
                id="c-civil"
                className="input"
                value={form.civilStatus}
                onChange={set('civilStatus')}
              >
                {Object.entries(CIVIL_STATUS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          {needsEmployment(form.paymentMethod) && (
            <Field
              label="Required downpayment (₱)"
              htmlFor="c-dp"
              hint={`The total downpayment from the developer's computation${
                Number(form.tcp) > 0
                  ? `, e.g. 10% of the price is ${Math.round(Number(form.tcp) * 0.1).toLocaleString('en-PH')}`
                  : ''
              }. Commission milestones count against it.`}
            >
              <input
                id="c-dp"
                className="input"
                inputMode="decimal"
                required
                value={form.downpaymentAmount}
                onChange={set('downpaymentAmount')}
              />
            </Field>
          )}
          {needsEmployment(form.paymentMethod) && (
            <Field
              label="Employment"
              htmlFor="c-emp"
              hint="Bank and Pag-IBIG need different documents for each."
            >
              <select
                id="c-emp"
                className="input"
                required
                value={form.employmentType}
                onChange={set('employmentType')}
              >
                <option value="">Choose…</option>
                {(Object.keys(EMPLOYMENT) as EmploymentType[]).map((m) => (
                  <option key={m} value={m}>
                    {EMPLOYMENT[m]}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <FormError error={convert.error} />
          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton pending={convert.isPending}>
              {convert.isPending ? 'Saving…' : 'Make client'}
            </PrimaryButton>
            <button
              type="button"
              className="text-sm font-semibold text-muted underline"
              onClick={() => input.current?.click()}
            >
              Upload a different receipt
            </button>
          </div>
        </form>
      )}
    </Card>
  );
}
