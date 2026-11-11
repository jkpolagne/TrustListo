import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Stage, Task, Waiting } from '../../lib/work';
import { ButtonLink, Card, CardHeader, EmptyState } from '../ui';

/**
 * How a sale moves, as one strip: each stage shows how many deals are in it now and who acts.
 * It's the office's map of the flow; every stage opens the page where that work happens.
 */
export function SaleFlow({ stages, title }: { stages: Stage[]; title: string }) {
  return (
    <section aria-labelledby="flow-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="flow-title" className="text-base font-bold">
          {title}
        </h2>
        <p className="text-xs text-muted">
          Every deal moves left to right. Open a step to work on it.
        </p>
      </div>
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((s, i) => (
          <li key={s.key} className="bg-paper">
            <Link
              to={s.to}
              className="group flex h-full flex-col p-4 transition-colors hover:bg-canvas focus-visible:bg-canvas"
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span
                  aria-hidden
                  className={`grid size-5 shrink-0 place-items-center rounded-full text-[0.6875rem] font-bold ${
                    s.count ? 'bg-ink text-paper' : 'bg-canvas text-muted'
                  }`}
                >
                  {i + 1}
                </span>
                {s.name}
              </span>
              <span
                className={`mt-2 text-3xl font-bold tabular-nums ${s.count ? '' : 'text-rule'}`}
                aria-label={`${s.count} ${s.count === 1 ? 'deal' : 'deals'}`}
              >
                {s.count}
              </span>
              <span className="mt-1 text-xs leading-snug text-muted">{s.who}</span>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}

const SHOW = 7;

/** "Do next": concrete tasks, most urgent first, each with one button named for its action. */
export function TaskList({ tasks, empty }: { tasks: Task[]; empty: string }) {
  const [all, setAll] = useState(false);
  const shown = all ? tasks : tasks.slice(0, SHOW);
  return (
    <Card padded={false}>
      <div className="p-5 pb-0 sm:p-6 sm:pb-0">
        <CardHeader
          title="Do next"
          description={
            tasks.length
              ? `${tasks.length} thing${tasks.length === 1 ? '' : 's'} waiting for you, most urgent first.`
              : undefined
          }
        />
      </div>
      {tasks.length === 0 ? (
        <div className="px-5 pb-5 sm:px-6 sm:pb-6">
          <EmptyState>{empty}</EmptyState>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-line border-t border-line">
            {shown.map((t) => (
              <li
                key={t.key}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:px-6"
              >
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    {t.urgent && (
                      <span aria-hidden className="size-2 shrink-0 rounded-full bg-flag" />
                    )}
                    {t.urgent && <span className="sr-only">Urgent: </span>}
                    {t.title}
                  </p>
                  <p className={`mt-0.5 text-sm ${t.urgent ? 'text-flag' : 'text-muted'}`}>
                    {t.detail}
                  </p>
                </div>
                <ButtonLink
                  to={t.to}
                  variant="secondary"
                  className="shrink-0 self-start px-3 py-2 sm:self-center"
                >
                  {t.action}
                </ButtonLink>
              </li>
            ))}
          </ul>
          {tasks.length > SHOW && (
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              className="w-full border-t border-line px-5 py-3 text-sm font-semibold hover:bg-canvas sm:px-6"
            >
              {all ? 'Show fewer' : `Show all ${tasks.length}`}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/** Things in someone else's hands, so the user knows they don't need to chase them. */
export function WaitingList({
  items,
  title = 'Waiting on others',
}: {
  items: Waiting[];
  title?: string;
}) {
  if (!items.length) return null;
  return (
    <Card>
      <CardHeader title={title} description="Nothing to do here; it moves once they act." />
      <ul className="-mx-2 divide-y divide-line">
        {items.slice(0, 8).map((w) => (
          <li key={w.key}>
            <Link
              to={w.to}
              className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-graphite hover:bg-canvas hover:text-ink"
            >
              <span className="min-w-0 flex-1">{w.text}</span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
