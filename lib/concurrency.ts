// Runs `fn` over `items` with at most `limit` in flight at once. Preserves
// input order in the returned array. Used to parallelize per-business website
// analysis without firing an unbounded number of simultaneous outbound
// requests (which tends to make things *slower*, not faster, once a batch
// gets large).
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (true) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }

  const workerCount = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: workerCount }, worker));

  return results;
}
