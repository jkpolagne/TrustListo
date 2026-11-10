import { createApp } from './app';
import { env } from './env';
import { ensureBucket } from './lib/storage';
import { resumePendingDocuments } from './modules/docai/pipeline';

const app = createApp();

ensureBucket().catch((e) => console.warn('Storage not reachable (is MinIO running?):', e.message));

// The job queue lives in memory, so jobs are lost on restart. Re-queue anything left unread
// (this also picks up the documents the demo seed leaves for the AI to read).
resumePendingDocuments()
  .then((n) => n && console.log(`[docai] reading ${n} queued document${n === 1 ? '' : 's'}`))
  .catch((e) => console.warn('Could not re-queue pending documents:', e.message));

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
