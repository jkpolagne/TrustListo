import { createApp } from './app';
import { env } from './env';
import { prisma } from './lib/prisma';
import { ensureBucket } from './lib/storage';
import { queueCredentialCheck } from './modules/docai/credentialStub';

const app = createApp();

ensureBucket().catch((e) => console.warn('Storage not reachable (is MinIO running?):', e.message));

// The job queue lives in memory, so jobs are lost on restart. Re-queue anything left unchecked.
prisma.credential
  .findMany({ where: { status: 'PENDING_AI' }, select: { id: true } })
  .then((rows) => rows.forEach((r) => queueCredentialCheck(r.id)))
  .catch((e) => console.warn('Could not re-queue pending checks:', e.message));

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
