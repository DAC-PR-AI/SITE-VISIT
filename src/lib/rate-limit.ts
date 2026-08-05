/**
 * Simple in-memory rate limiter for write operations.
 *
 * Works per-process instance (adequate for Vercel serverless cold-starts and
 * this internal tool's traffic volume). For multi-region or high-traffic
 * deployments, replace with Upstash Redis or similar edge KV store.
 *
 * Limits: MAX_WRITES per IP per WINDOW_MS (default 15 writes/60 s).
 */

interface RateEntry {
  count: number;
  windowStart: number;
}

const store = new Map<string, RateEntry>();
const WINDOW_MS = 60_000; // 1 minute sliding window
const MAX_WRITES = 15; // maximum write operations per IP per window

/** Removes stale entries to prevent unbounded memory growth. */
function sweep(): void {
  const cutoff = Date.now() - WINDOW_MS;
  for (const [key, entry] of store) {
    if (entry.windowStart < cutoff) store.delete(key);
  }
}

/**
 * Checks whether the given identifier (IP or user key) is within the rate limit.
 *
 * @param identifier - Client IP address or any unique key.
 * @param operation  - Logical operation name, used to namespace the bucket.
 * @returns `true` if the request is allowed; `false` if it should be rejected.
 */
export function checkRateLimit(identifier: string, operation = "write"): boolean {
  const key = `${operation}:${identifier}`;
  const now = Date.now();

  // Periodic cleanup — runs on every check, lightweight since the store is small.
  if (store.size > 500) sweep();

  const entry = store.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    store.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_WRITES) return false;
  entry.count += 1;
  return true;
}

/**
 * Throws a rate-limit error if the identifier has exceeded the limit.
 * Use inside server functions.
 */
export function enforceRateLimit(identifier: string, operation = "write"): void {
  if (!checkRateLimit(identifier, operation)) {
    throw new Error("Too many requests. Please wait a moment before trying again.");
  }
}
