// Lightweight stand-in for the Supabase client, used when no valid credentials
// are present (see isSupabaseConfigured). It lets the entire app run as a
// mock-data demo without ever throwing. Every data path falls back to local
// mock data *before* reaching these methods, so this is mainly a safety net
// that keeps auth/storage/query calls from crashing in demo mode.

type QueryResult = { data: unknown; error: { message: string } | null };

const NOT_CONFIGURED = {
  message: 'Supabase nu este configurat. Adaugă cheile reale în .env.local pentru funcționalitate live.',
};

// A chainable, awaitable query builder where every operator returns itself and
// awaiting resolves to an empty result.
function queryBuilder(): Record<string, unknown> {
  const empty: QueryResult = { data: [], error: null };
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  for (const method of [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is', 'in',
    'or', 'and', 'not', 'filter', 'match', 'contains', 'order', 'limit', 'range',
  ]) {
    builder[method] = chain;
  }
  builder.single = async () => ({ data: null, error: null });
  builder.maybeSingle = async () => ({ data: null, error: null });
  // Make the builder awaitable (Promise-like).
  builder.then = (resolve: (r: QueryResult) => unknown) => resolve(empty);
  return builder;
}

const auth = {
  getUser: async () => ({ data: { user: null }, error: null }),
  getSession: async () => ({ data: { session: null }, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signInWithPassword: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED }),
  signUp: async () => ({ data: { user: null, session: null }, error: NOT_CONFIGURED }),
  signInWithOAuth: async () => ({ data: null, error: NOT_CONFIGURED }),
  signOut: async () => ({ error: null }),
};

const storage = {
  from: () => ({
    upload: async () => ({ data: null, error: NOT_CONFIGURED }),
    getPublicUrl: () => ({ data: { publicUrl: '' } }),
    remove: async () => ({ error: null }),
  }),
};

// Returned as `any` so it slots in wherever a real SupabaseClient is expected
// without dragging the full generated types through the mock.
export function createMockClient(): any {
  return {
    auth,
    storage,
    from: () => queryBuilder(),
  };
}
