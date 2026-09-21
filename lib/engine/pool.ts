/**
 * The engine's only concurrency primitive.
 *
 * A run is a set of independent sequences: one walk through an adventure, one
 * game of an iterated dilemma, one character answering the trolley once. Within
 * a sequence the order matters (round n+1 needs round n); between sequences it
 * does not. `mergePool` runs up to `limit` sequences at a time and yields their
 * items as they arrive, so a slow model does not hold up the rest of the run and
 * progress reaches the store as soon as a decision is made.
 */

/** A sequence of decisions, started only when the pool has room for it. */
export type Source<T> = () => AsyncGenerator<T>;

type Entry<T> = {
  key: number;
  iterator: AsyncGenerator<T>;
  pending: Promise<Settled<T>>;
};

type Settled<T> = { key: number; result?: IteratorResult<T>; error?: unknown };

function step<T>(entry: Entry<T>): void {
  entry.pending = entry.iterator.next().then(
    (result) => ({ key: entry.key, result }),
    (error: unknown) => ({ key: entry.key, error }),
  );
}

/**
 * Interleaves `sources`, at most `limit` of them running at once, yielding each
 * item as it is produced. A source that throws is dropped, the rest are drained,
 * and the first such error is rethrown once they are done — a setup bug fails the
 * run, but not before the work already finished has been reported.
 *
 * When `signal` aborts, no further source is started and the pool stops after the
 * item in hand; the sources still open are closed on the way out.
 */
export async function* mergePool<T>(
  sources: readonly Source<T>[],
  limit: number,
  signal?: AbortSignal,
): AsyncGenerator<T> {
  const size = Math.max(1, Math.trunc(limit));
  const active = new Map<number, Entry<T>>();
  let next = 0;
  let failure: unknown;

  const fill = (): void => {
    while (active.size < size && next < sources.length && failure === undefined && !signal?.aborted) {
      const key = next;
      next += 1;
      const source = sources[key];
      if (!source) continue;
      const entry: Entry<T> = { key, iterator: source(), pending: Promise.resolve({ key }) };
      step(entry);
      active.set(key, entry);
    }
  };

  try {
    fill();
    while (active.size > 0) {
      const settled = await Promise.race([...active.values()].map((entry) => entry.pending));
      const entry = active.get(settled.key);
      if (!entry) continue;

      if (settled.error !== undefined) {
        failure ??= settled.error;
        active.delete(settled.key);
        continue;
      }
      if (!settled.result || settled.result.done) {
        active.delete(settled.key);
        fill();
        continue;
      }

      yield settled.result.value;
      if (signal?.aborted) return;
      step(entry);
    }
  } finally {
    for (const entry of active.values()) {
      void entry.pending.catch(() => undefined);
      void entry.iterator.return(undefined as never).catch(() => undefined);
    }
  }

  if (failure !== undefined) throw failure;
}
