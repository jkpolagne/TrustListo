import { useMutation, useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { errorText } from '../../components/Form';
import { PublicLayout } from '../../components/public/PublicLayout';
import { api, ApiError } from '../../lib/api';

const WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

type Info = {
  consultant: { firstName: string; lastName: string };
  firm: { name: string };
  property: { title: string } | null;
};

/**
 * SPEC §12: the buyer rates their agent through a one-time link, without an account.
 * Stars are black on purpose: gold on TrustListo only ever means "a broker checked this".
 */
export function Rate() {
  const { token = '' } = useParams();
  const info = useQuery({
    queryKey: ['rating', token],
    queryFn: () => api<Info>(`/public/ratings/${token}`),
    retry: false,
  });
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const send = useMutation({
    mutationFn: () =>
      api(`/public/ratings/${token}`, { json: { stars, comment, consent, website } }),
  });

  if (info.isPending) return <PublicLayout>{null}</PublicLayout>;

  if (send.isSuccess || info.error) {
    const done =
      send.isSuccess || (info.error instanceof ApiError && info.error.code === 'ALREADY_RATED');
    return (
      <PublicLayout>
        <div className="mx-auto max-w-xl px-5 py-16 sm:py-24">
          <h1 className="font-display text-[clamp(2rem,6vw,2.75rem)] leading-tight">
            {done ? 'Thank you.' : 'This link doesn’t work'}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-graphite">
            {done
              ? 'Your rating is saved. It helps the next buyer choose an agent.'
              : errorText(info.error)}
          </p>
          <Link
            to="/properties"
            className="mt-8 inline-block text-sm font-semibold underline underline-offset-4"
          >
            Browse homes on TrustListo
          </Link>
        </div>
      </PublicLayout>
    );
  }

  const d = info.data!;
  const name = `${d.consultant.firstName} ${d.consultant.lastName}`;
  const shown = hover || stars;

  return (
    <PublicLayout>
      <form
        className="mx-auto max-w-xl px-5 py-12 sm:py-20"
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <p className="text-sm font-semibold text-graphite">
          {d.property?.title ?? 'Your home'}, through {d.firm.name}
        </p>
        <h1 className="font-display mt-3 text-[clamp(2rem,6vw,2.75rem)] leading-tight">
          How did {d.consultant.firstName} do?
        </h1>
        <p className="mt-3 leading-relaxed text-graphite">
          Rate {name}, who handled your purchase. Other buyers see the average, not your name.
        </p>

        <fieldset className="mt-10">
          <legend className="sr-only">Your rating, from 1 to 5 stars</legend>
          <div className="flex gap-1 sm:gap-2" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <label
                key={n}
                onMouseEnter={() => setHover(n)}
                className="cursor-pointer rounded-xl p-1 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-gold"
              >
                <input
                  type="radio"
                  name="stars"
                  value={n}
                  checked={stars === n}
                  onChange={() => setStars(n)}
                  className="sr-only"
                  required
                />
                <Star
                  aria-hidden
                  strokeWidth={1.5}
                  className={`size-12 transition-transform motion-reduce:transition-none sm:size-14 ${
                    n <= shown ? 'fill-ink text-ink' : 'text-rule'
                  } ${n === stars ? 'scale-110' : ''}`}
                />
                <span className="sr-only">
                  {n} {n === 1 ? 'star' : 'stars'}, {WORDS[n]}
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 h-6 text-sm font-semibold" aria-live="polite">
            {WORDS[shown]}
          </p>
        </fieldset>

        <label htmlFor="comment" className="mt-8 block text-sm font-semibold">
          Anything to add? <span className="font-normal text-muted">Optional</span>
        </label>
        <textarea
          id="comment"
          rows={4}
          maxLength={500}
          className="input mt-1.5"
          placeholder={`What was it like working with ${d.consultant.firstName}?`}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          className="hidden"
          name="website"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />

        <label className="mt-6 flex items-start gap-3 text-sm leading-relaxed">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 size-4 accent-ink"
          />
          <span>
            I agree that {d.firm.name} and TrustListo may keep my rating and comment to show {name}
            &rsquo;s average rating, as allowed by the Data Privacy Act of 2012.
          </span>
        </label>

        {send.error && (
          <p role="alert" className="mt-4 text-sm text-flag">
            {errorText(send.error)}
          </p>
        )}
        <button
          type="submit"
          disabled={send.isPending || !stars}
          className="mt-8 w-full rounded-lg bg-ink px-6 py-3.5 text-base font-semibold text-paper hover:bg-[#262624] disabled:opacity-50 sm:w-auto"
        >
          {send.isPending ? 'Sending…' : 'Send rating'}
        </button>
      </form>
    </PublicLayout>
  );
}
