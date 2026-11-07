/**
 * Tiny in-process job queue (SPEC §8.1 "in-process queue for prototype").
 * Upload requests return immediately; jobs run one at a time in the background.
 */
type Job = () => Promise<void>;

const jobs: Job[] = [];
let running = false;
let idleWaiters: (() => void)[] = [];

export function enqueue(job: Job): void {
  jobs.push(job);
  void drain();
}

async function drain(): Promise<void> {
  if (running) return;
  running = true;
  while (jobs.length) {
    const job = jobs.shift()!;
    try {
      await job();
    } catch (e) {
      console.error('[docai] job failed', e);
    }
  }
  running = false;
  idleWaiters.forEach((resolve) => resolve());
  idleWaiters = [];
}

/** Resolves when every queued job has finished. Used by tests. */
export function whenIdle(): Promise<void> {
  if (!running && jobs.length === 0) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}
