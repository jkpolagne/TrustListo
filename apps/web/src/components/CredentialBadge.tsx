import { CREDENTIAL_NAME, credentialState, type Credential } from '../lib/team';
import { Badge } from './ui';

const fmt = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' });

/**
 * Gold appears only for a credential a broker approved and that hasn't expired.
 * Everything else is gray or red, so gold keeps its meaning.
 */
export function CredentialBadge({
  credential,
  showName = true,
}: {
  credential: Credential;
  showName?: boolean;
}) {
  const state = credentialState(credential);
  const name = showName ? `${CREDENTIAL_NAME[credential.type]} ` : '';
  const exp = credential.expiresAt ? fmt.format(new Date(credential.expiresAt)) : null;

  switch (state) {
    case 'verified':
      return (
        <span title={exp ? `Valid until ${exp}` : undefined}>
          <Badge tone="verified">{name}verified</Badge>
        </span>
      );
    case 'expired':
      return (
        <Badge tone="danger">
          {name}expired {exp}
        </Badge>
      );
    case 'review':
      return <Badge>{name}waiting for broker</Badge>;
    case 'reading':
      return <Badge tone="info">{name}being checked</Badge>;
    case 'attention':
      return <Badge tone="danger">{name}flagged</Badge>;
    case 'rejected':
      return <Badge tone="danger">{name}rejected</Badge>;
  }
}
