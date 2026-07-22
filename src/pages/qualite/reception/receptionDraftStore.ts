import * as React from "react";

let active = false;
const listeners = new Set<() => void>();

export const receptionDraftStore = {
  get: () => active,
  set: (v: boolean) => {
    if (v !== active) {
      active = v;
      listeners.forEach((l) => l());
    }
  },
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useHasActiveReceptionTicket() {
  const [v, setV] = React.useState(active);
  React.useEffect(() => {
    const unsub = receptionDraftStore.subscribe(() => setV(receptionDraftStore.get()));
    setV(receptionDraftStore.get());
    return () => { unsub; };
  }, []);
  return v;
}

export const DRAFT_KEY = "reception.qualitative.draft.v1";
export const DRAFT_MAX_AGE_MS = 24 * 60 * 60 * 1000;
