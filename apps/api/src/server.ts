import { createApp } from './app';
import { env } from './env';
import { ensureBucket } from './lib/storage';

const app = createApp();

ensureBucket().catch((e) => console.warn('Storage not reachable (is MinIO running?):', e.message));

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
