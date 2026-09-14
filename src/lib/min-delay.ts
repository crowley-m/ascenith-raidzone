/**
 * Holds `promise`'s resolution back until at least `ms` have passed, without
 * adding anything on top of a fetch that already takes longer. Used on the
 * handful of routes with a `loading.tsx` skeleton — the app and Postgres sit
 * on the same box, so most queries resolve in a few ms, far too fast for the
 * skeleton to ever be visible. This gives it an actually-visible window.
 */
export async function minDelay<T>(promise: Promise<T>, ms = 400): Promise<T> {
  const [result] = await Promise.all([promise, new Promise<void>((resolve) => setTimeout(resolve, ms))]);
  return result;
}
