import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatPeso, type Role } from '@trustlisto/shared';
import { PageHeader } from '../../components/AppShell';
import { Badge, Card, EmptyState } from '../../components/ui';
import { useMe } from '../../lib/auth';
import { TYPE_LABEL } from '../../lib/marketplace';
import { REQUEST_STATUS, useSellerRequests, type SellerRequestStatus } from '../../lib/sellers';

const BASE: Record<Role, string> = {
  SUPER_ADMIN: '/superadmin',
  COMPANY_ADMIN: '/admin',
  BROKER: '/broker',
  SALES_MANAGER: '/manager',
  SALES_PERSON: '/salesperson',
};
export const sellersPath = (role: Role) => `${BASE[role]}/sellers`;

const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });
const peso = (v: string) => formatPeso(v).replace(/\.00$/, '');

export function RequestStatusBadge({ status }: { status: SellerRequestStatus }) {
  const tone =
    status === 'NEW'
      ? 'info'
      : status === 'LISTED'
        ? 'verified'
        : status === 'DECLINED'
          ? 'danger'
          : 'neutral';
  return <Badge tone={tone}>{REQUEST_STATUS[status]}</Badge>;
}

/**
 * Seller listing requests (SPEC §7.6). Agents see the requests where a seller chose them;
 * the CompanyAdmin and Broker see every request of the firm, read-only (§5.2).
 */
export function SellerRequests() {
  const { data: me } = useMe();
  const requests = useSellerRequests();
  if (!me) return null;
  const isAgent = me.role === 'SALES_MANAGER' || me.role === 'SALES_PERSON';
  const rows = requests.data ?? [];
  const waiting = rows.filter((r) => r.status === 'NEW').length;

  return (
    <>
      <PageHeader
        title="Seller requests"
        intro={
          isAgent
            ? 'Property owners who chose you on TrustListo. Accept a request, collect the four documents, then send it to your broker.'
            : 'Property owners who chose an agent of your firm, and where each listing stands.'
        }
      />
      <Card padded={false}>
        {rows.length === 0 ? (
          <div className="p-5">
            <EmptyState>
              {requests.isPending
                ? 'Loading…'
                : isAgent
                  ? 'No seller has chosen you yet. Sellers pick agents on the public "List your property" page.'
                  : 'No seller requests yet.'}
            </EmptyState>
          </div>
        ) : (
          <>
            {isAgent && waiting > 0 && (
              <p className="border-b border-line px-5 py-3 text-sm">
                <span className="font-semibold">{waiting}</span> new request
                {waiting === 1 ? '' : 's'} waiting for your answer.
              </p>
            )}
            <ul className="divide-y divide-line">
              {rows.map((r) => {
                const approved = r.documents.filter((d) => d.reviewStatus === 'APPROVED').length;
                return (
                  <li key={r.id}>
                    <Link
                      to={`${sellersPath(me.role)}/${r.id}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 hover:bg-canvas"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{r.sellerName}</p>
                        <p className="text-sm text-muted">
                          {TYPE_LABEL[r.propertyType]} in {r.locationText}, asking{' '}
                          {peso(r.askingPrice)}
                        </p>
                      </div>
                      <div className="text-right text-xs text-muted">
                        {!isAgent && r.agent && (
                          <p>
                            Agent: {r.agent.firstName} {r.agent.lastName}
                          </p>
                        )}
                        <p>
                          {r.documents.length}/4 documents uploaded, {approved} approved
                        </p>
                        <p>Received {date.format(new Date(r.createdAt))}</p>
                      </div>
                      <RequestStatusBadge status={r.status} />
                      <ChevronRight aria-hidden className="size-4 text-muted" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>
    </>
  );
}
