import { Check, ExternalLink, Link2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatPeso } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Badge, ButtonLink, Card, EmptyState, StatCard } from '../../components/ui';
import { useMe } from '../../lib/auth';
import {
  STATUS_LABEL,
  ltsState,
  useProjects,
  useUnits,
  type ListingStatus,
} from '../../lib/catalog';
import { TYPE_LABEL } from '../../lib/marketplace';
import { referralLink } from '../../lib/paths';

const peso = (v: string) => formatPeso(v).replace(/\.00$/, '');
const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

export function StatusBadge({ status }: { status: ListingStatus }) {
  const tone =
    status === 'LIVE'
      ? 'info'
      : status === 'REJECTED' || status === 'SUSPENDED' || status === 'NEEDS_ATTENTION'
        ? 'danger'
        : 'neutral';
  return <Badge tone={tone}>{STATUS_LABEL[status]}</Badge>;
}

/**
 * Firm listings. CompanyAdmin manages them; Broker, Sales Manager and Sales Person read (§5.2).
 */
export function Listings() {
  const { data: me } = useMe();
  const isAdmin = me?.role === 'COMPANY_ADMIN';
  const units = useUnits();
  const projects = useProjects();

  const rows = units.data ?? [];
  const live = rows.filter((u) => u.status === 'LIVE').length;
  const expiring = (projects.data ?? []).filter((p) => ltsState(p) === 'expiring');
  const expired = (projects.data ?? []).filter(
    (p) => ltsState(p) === 'expired' && p._count.properties > 0,
  );

  return (
    <>
      <PageHeader
        title="Listings"
        intro="Developer units your firm sells. Buyers see only live units whose project has a valid License to Sell."
        actions={
          isAdmin && (
            <>
              <ButtonLink to="/admin/projects" variant="secondary">
                Developers and projects
              </ButtonLink>
              <ButtonLink to="/admin/listings/new">Add unit</ButtonLink>
            </>
          )
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Live on the marketplace" value={live} />
        <StatCard label="Drafts" value={rows.filter((u) => u.status === 'DRAFT').length} />
        <StatCard
          label="Licenses to sell expiring in 30 days"
          value={expiring.length}
          tone={expiring.length ? 'danger' : undefined}
          hint={expiring.map((p) => p.name).join(', ') || undefined}
        />
      </div>

      {expired.length > 0 && (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-flag-pale px-4 py-3 text-sm font-medium text-flag"
        >
          {expired.map((p) => p.name).join(', ')}: License to Sell expired. Its units are hidden
          from buyers until a new one is approved.
        </p>
      )}

      <Card padded={false} className="mt-6 overflow-hidden">
        {units.data && rows.length === 0 ? (
          <div className="p-6">
            <EmptyState>
              No units yet.{isAdmin && ' Add a developer and project first, then add units.'}
            </EmptyState>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas text-xs text-muted">
                <tr>
                  <th className="px-5 py-3 font-semibold">Unit</th>
                  <th className="px-5 py-3 font-semibold">Project</th>
                  <th className="px-5 py-3 text-right font-semibold">Price</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 text-right font-semibold">Photos</th>
                  <th className="px-5 py-3 text-right font-semibold">Updated</th>
                  <th className="px-5 py-3">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((u) => (
                  <tr key={u.id} className="hover:bg-canvas/60">
                    <td className="px-5 py-3">
                      {isAdmin ? (
                        <Link
                          to={`/admin/listings/${u.id}`}
                          className="font-semibold hover:underline"
                        >
                          {u.title}
                        </Link>
                      ) : (
                        <span className="font-semibold">{u.title}</span>
                      )}
                      <p className="text-xs text-muted">{TYPE_LABEL[u.type]}</p>
                    </td>
                    <td className="px-5 py-3 text-muted">{u.project?.name}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {peso(u.price)}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {u._count.photos}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-muted">
                      {date.format(new Date(u.updatedAt))}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {u.status === 'LIVE' && me?.referralCode && (
                        <CopyReferral slug={u.slug} code={me.referralCode} title={u.title} />
                      )}
                      {u.status === 'LIVE' && (
                        <a
                          href={`/properties/${u.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          title="See it as buyers do"
                          className="inline-grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink"
                        >
                          <ExternalLink aria-hidden className="size-4" />
                          <span className="sr-only">Open public page for {u.title}</span>
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}

/**
 * Copies this consultant's referral link for a listing (SPEC §10.7). A buyer who inquires
 * through it is assigned to them automatically, without the picker.
 */
function CopyReferral({ slug, code, title }: { slug: string; code: string; title: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(referralLink(slug, code));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="mr-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted hover:bg-canvas hover:text-ink"
    >
      {copied ? (
        <Check aria-hidden className="size-3.5" />
      ) : (
        <Link2 aria-hidden className="size-3.5" />
      )}
      {copied ? 'Copied' : 'Copy my link'}
      <span className="sr-only"> for {title}</span>
    </button>
  );
}
