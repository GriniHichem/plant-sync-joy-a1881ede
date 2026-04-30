/**
 * Shift offline queue — IndexedDB via idb-keyval.
 *
 * Buffers shift declarations / quality checks / NCs / tickets when the device
 * goes offline, and flushes them to Supabase when connectivity returns.
 *
 * IMPORTANT: this is purely client-side. We do NOT change schemas. Each queued
 * item describes a Supabase insert against an existing table.
 */
import { get, set, del, keys } from "idb-keyval";
import { supabase } from "@/integrations/supabase/client";

const QUEUE_PREFIX = "shift-queue:";

export type QueuedShiftAction = {
  id: string;
  table: string;
  payload: Record<string, unknown>;
  kind: "production" | "maintenance" | "quality";
  createdAt: number;
  label?: string;
};

function makeId() {
  // Browser-safe id; avoids needing crypto.randomUUID in older targets.
  return `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function enqueueShiftAction(
  item: Omit<QueuedShiftAction, "id" | "createdAt">
): Promise<QueuedShiftAction> {
  const full: QueuedShiftAction = {
    ...item,
    id: makeId(),
    createdAt: Date.now(),
  };
  await set(QUEUE_PREFIX + full.id, full);
  return full;
}

export async function listQueuedActions(): Promise<QueuedShiftAction[]> {
  const all = await keys();
  const ours = all.filter((k) => typeof k === "string" && (k as string).startsWith(QUEUE_PREFIX)) as string[];
  const items = await Promise.all(ours.map((k) => get<QueuedShiftAction>(k)));
  return items
    .filter((x): x is QueuedShiftAction => !!x)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeQueuedAction(id: string) {
  await del(QUEUE_PREFIX + id);
}

export async function flushShiftQueue(): Promise<{ ok: number; failed: number }> {
  const items = await listQueuedActions();
  let ok = 0;
  let failed = 0;
  for (const it of items) {
    try {
      const { error } = await (supabase as any).from(it.table).insert(it.payload);
      if (error) {
        failed++;
        // Stop the batch on the first failure to avoid retry storms.
        break;
      }
      await removeQueuedAction(it.id);
      ok++;
    } catch {
      failed++;
      break;
    }
  }
  return { ok, failed };
}

/**
 * Try insert; if offline OR insert throws a network-ish error, fall back to queue.
 * Returns whether the insert was performed online.
 */
export async function insertOrQueue(
  table: string,
  payload: Record<string, unknown>,
  meta: { kind: QueuedShiftAction["kind"]; label?: string }
): Promise<{ online: boolean; error: any }> {
  const online = typeof navigator !== "undefined" ? navigator.onLine : true;
  if (!online) {
    await enqueueShiftAction({ table, payload, ...meta });
    return { online: false, error: null };
  }
  try {
    const { error } = await (supabase as any).from(table).insert(payload);
    if (error) return { online: true, error };
    return { online: true, error: null };
  } catch (e: any) {
    // Network failure mid-flight → queue.
    await enqueueShiftAction({ table, payload, ...meta });
    return { online: false, error: null };
  }
}
