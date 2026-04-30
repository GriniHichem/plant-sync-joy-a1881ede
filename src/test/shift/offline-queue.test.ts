import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory stub for idb-keyval
const store = new Map<string, any>();
vi.mock("idb-keyval", () => ({
  get: vi.fn(async (k: string) => store.get(k)),
  set: vi.fn(async (k: string, v: any) => { store.set(k, v); }),
  del: vi.fn(async (k: string) => { store.delete(k); }),
  keys: vi.fn(async () => Array.from(store.keys())),
}));

// Supabase stub — capture inserts and let tests force failures
const insertCalls: { table: string; payload: any }[] = [];
let nextInsertError: any = null;
let throwOnInsert = false;
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      insert: async (payload: any) => {
        insertCalls.push({ table, payload });
        if (throwOnInsert) throw new Error("network down");
        return { error: nextInsertError };
      },
    }),
  },
}));

import {
  enqueueShiftAction,
  listQueuedActions,
  flushShiftQueue,
  insertOrQueue,
} from "@/lib/shiftOfflineQueue";

describe("shiftOfflineQueue", () => {
  beforeEach(() => {
    store.clear();
    insertCalls.length = 0;
    nextInsertError = null;
    throwOnInsert = false;
    Object.defineProperty(navigator, "onLine", { value: true, configurable: true });
  });

  it("enqueues and lists actions in chronological order", async () => {
    await enqueueShiftAction({ table: "tickets", payload: { a: 1 }, kind: "production" });
    await new Promise((r) => setTimeout(r, 2));
    await enqueueShiftAction({ table: "quality_checks", payload: { b: 2 }, kind: "quality" });
    const items = await listQueuedActions();
    expect(items).toHaveLength(2);
    expect(items[0].table).toBe("tickets");
    expect(items[1].table).toBe("quality_checks");
  });

  it("flushShiftQueue clears items on success", async () => {
    await enqueueShiftAction({ table: "tickets", payload: { x: 1 }, kind: "production" });
    const res = await flushShiftQueue();
    expect(res).toEqual({ ok: 1, failed: 0 });
    expect(insertCalls).toHaveLength(1);
    expect(await listQueuedActions()).toHaveLength(0);
  });

  it("flushShiftQueue stops at first failure and keeps the item", async () => {
    await enqueueShiftAction({ table: "tickets", payload: { x: 1 }, kind: "production" });
    await enqueueShiftAction({ table: "tickets", payload: { x: 2 }, kind: "production" });
    nextInsertError = { message: "RLS" };
    const res = await flushShiftQueue();
    expect(res.failed).toBe(1);
    expect(res.ok).toBe(0);
    expect((await listQueuedActions()).length).toBe(2);
  });

  it("insertOrQueue: offline → queued, no insert call", async () => {
    Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    const r = await insertOrQueue("tickets", { hello: 1 }, { kind: "production" });
    expect(r.online).toBe(false);
    expect(insertCalls).toHaveLength(0);
    expect(await listQueuedActions()).toHaveLength(1);
  });

  it("insertOrQueue: online → direct insert, nothing queued", async () => {
    const r = await insertOrQueue("tickets", { hello: 1 }, { kind: "production" });
    expect(r.online).toBe(true);
    expect(r.error).toBeNull();
    expect(insertCalls).toHaveLength(1);
    expect(await listQueuedActions()).toHaveLength(0);
  });

  it("insertOrQueue: online but network throws → falls back to queue", async () => {
    throwOnInsert = true;
    const r = await insertOrQueue("tickets", { hello: 1 }, { kind: "production" });
    expect(r.online).toBe(false);
    expect(await listQueuedActions()).toHaveLength(1);
  });
});
