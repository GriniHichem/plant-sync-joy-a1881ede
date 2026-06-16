import { vi } from "vitest";

// =============================================
// Configurable Supabase client mock for testing
// the validation engine (src/lib/validation.ts).
// Each test file imports `mockState` and mutates it
// before calling the engine functions.
// =============================================

export interface MockUser {
  id: string;
  email: string | null;
}

export interface CapturedUpdate {
  table: string;
  payload: Record<string, unknown>;
  filters: Array<{ col: string; val: unknown }>;
}

export interface MockState {
  user: MockUser | null;
  profile: Record<string, unknown> | null;
  // validation_rules query result + error simulation
  rules: unknown[];
  rulesReject: boolean;
  // single()/maybeSingle() results keyed by table
  singleByTable: Record<string, { data: unknown; error: unknown }>;
  // error returned by insert/update terminal operations
  insertError: unknown;
  updateError: unknown;
  // captured side-effects
  inserted: Record<string, unknown> | null;
  insertedTable: string | null;
  updates: CapturedUpdate[];
}

export const mockState: MockState = createInitialState();

export function createInitialState(): MockState {
  return {
    user: { id: "user-1", email: "user@test.dz" },
    profile: { first_name: "Test", last_name: "User" },
    rules: [],
    rulesReject: false,
    singleByTable: {},
    insertError: null,
    updateError: null,
    inserted: null,
    insertedTable: null,
    updates: [],
  };
}

export function resetMockState() {
  Object.assign(mockState, createInitialState());
}

function makeBuilder(table: string) {
  const filters: Array<{ col: string; val: unknown }> = [];
  let mode: "select" | "insert" | "update" | "delete" = "select";
  let updatePayload: Record<string, unknown> = {};

  const builder: Record<string, unknown> = {};

  const chain = () => builder;

  builder.select = vi.fn(chain);
  builder.insert = vi.fn((row: Record<string, unknown>) => {
    mode = "insert";
    mockState.inserted = row;
    mockState.insertedTable = table;
    return builder;
  });
  builder.update = vi.fn((payload: Record<string, unknown>) => {
    mode = "update";
    updatePayload = payload;
    return builder;
  });
  builder.delete = vi.fn(() => {
    mode = "delete";
    return builder;
  });
  ["neq", "not", "order", "limit", "in", "is", "gt", "lt", "gte", "lte", "like", "ilike", "or"].forEach((m) => {
    builder[m] = vi.fn(chain);
  });
  builder.eq = vi.fn((col: string, val: unknown) => {
    filters.push({ col, val });
    return builder;
  });

  builder.single = vi.fn(async () => {
    if (mode === "insert") {
      return { data: mockState.inserted, error: mockState.insertError };
    }
    return mockState.singleByTable[table] ?? { data: null, error: null };
  });
  builder.maybeSingle = vi.fn(async () => {
    if (table === "profiles") return { data: mockState.profile, error: null };
    return mockState.singleByTable[table] ?? { data: null, error: null };
  });

  // Thenable terminal (used by awaited queries without single())
  builder.then = (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) => {
    if (mode === "update" || mode === "delete") {
      mockState.updates.push({ table, payload: updatePayload, filters });
      return resolve({ data: null, error: mockState.updateError });
    }
    // select query
    if (table === "validation_rules") {
      if (mockState.rulesReject && reject) return reject(new Error("backend down"));
      return resolve({ data: mockState.rules, error: null });
    }
    return resolve({ data: [], error: null });
  };

  return builder;
}

export function createConfigurableSupabase() {
  return {
    from: vi.fn((table: string) => makeBuilder(table)),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockState.user }, error: null })),
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  };
}
