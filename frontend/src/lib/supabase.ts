import { createClient as createSupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "";

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    "[VaultStay] Supabase env vars (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) are missing. " +
      "Rich metadata (titles, images, etc.) will not load. Check your frontend/.env file."
  );
}

const isConfigured = Boolean(supabaseUrl && supabaseKey);

// Singleton supabase client for the browser
let _client: ReturnType<typeof createSupabaseClient> | null = null;

/**
 * Full no-op query builder — every chainable method that PostgREST supports
 * is represented so callers never crash when Supabase is unconfigured.
 */
function makeNoop(): Record<string, unknown> {
  const pending = Promise.resolve({ data: null, error: null });
  const noop: Record<string, unknown> = {
    // Filters
    select: () => noop,
    insert: () => pending,
    upsert: () => pending,
    update: () => noop,
    delete: () => noop,
    // Query modifiers
    eq: () => noop,
    neq: () => noop,
    in: () => noop,
    is: () => noop,
    lt: () => noop,
    lte: () => noop,
    gt: () => noop,
    gte: () => noop,
    ilike: () => noop,
    like: () => noop,
    filter: () => noop,
    match: () => noop,
    order: () => noop,
    limit: () => noop,
    range: () => noop,
    // Terminators
    maybeSingle: () => pending,
    single: () => pending,
    // Promise interface so .then() works directly on select() chains
    then: (resolve: (v: { data: null; error: null }) => void) =>
      pending.then(resolve),
    catch: (reject: (e: unknown) => void) => pending.catch(reject),
    finally: (fn: () => void) => pending.finally(fn),
  };
  return noop;
}

export function createClient(): any {
  if (!isConfigured) {
    return {
      from: () => makeNoop(),
    } as unknown as ReturnType<typeof createSupabaseClient>;
  }

  if (!_client) {
    _client = createSupabaseClient(supabaseUrl, supabaseKey);
  }
  return _client;
}

/**
 * Normalize an Ethereum address to lowercase before storing in Supabase.
 * The RLS policy requires '^0x[0-9a-f]{40}$' (lowercase hex).
 */
export function normalizeAddress(addr: string): string {
  return addr.toLowerCase();
}
