import { CREDENTIAL_NAME, credentialState, type Credential } from '../lib/team';

const fmt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

/**
 * Gold appears only for a credential a broker approved and that hasn't expired.
 * Everything else is plain text or red, so gold keeps its meaning.
 */
export function CredentialBadge({ credential }: { credential: Credential }) {
  const state = credentialState(credential);
  const name = CREDENTIAL_NAME[credential.type];
  const exp = credential.expiresAt ? fmt.format(new Date(credential.expiresAt)) : null;

  switch (state) {
    case 'verified':
      return (
        <span
          className="inline-flex items-center gap-1.5 text-sm font-semibold"
          title={exp ? `Valid until ${exp}` : undefined}
        >
          <span aria-hidden className="size-2.5 rounded-full bg-gold ring-2 ring-ink" />
          {name} verified
        </span>
      );
    case 'expired':
      return (
        <span className="text-sm font-semibold text-flag">
          {name} expired {exp}
        </span>
      );
    case 'review':
      return <span className="text-sm text-graphite">{name} waiting for broker review</span>;
    case 'reading':
      return <span className="text-sm text-graphite">{name} being read</span>;
    case 'attention':
      return <span className="text-sm font-semibold text-flag">{name} flagged for review</span>;
    case 'rejected':
      return <span className="text-sm font-semibold text-flag">{name} rejected</span>;
  }
}
