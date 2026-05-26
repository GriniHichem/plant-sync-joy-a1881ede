import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface ManualContextValue {
  open: boolean;
  sectionId: string | null;
  openManual: (sectionId?: string | null) => void;
  closeManual: () => void;
  setSectionId: (id: string | null) => void;
}

const ManualContext = createContext<ManualContextValue | undefined>(undefined);

const LAST_KEY = "manual:last-section";

export function ManualProvider({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [sectionId, setSectionIdState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(LAST_KEY);
    } catch {
      return null;
    }
  });

  // Sync from URL ?manual=... on mount and when search changes
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const m = sp.get("manual");
    if (m) {
      setSectionIdState(m);
      setOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const setSectionId = useCallback((id: string | null) => {
    setSectionIdState(id);
    if (id) {
      try {
        localStorage.setItem(LAST_KEY, id);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const openManual = useCallback(
    (id?: string | null) => {
      if (id !== undefined && id !== null) setSectionId(id);
      setOpen(true);
    },
    [setSectionId],
  );

  const closeManual = useCallback(() => {
    setOpen(false);
    // remove ?manual param if present
    const sp = new URLSearchParams(location.search);
    if (sp.has("manual")) {
      sp.delete("manual");
      navigate({ pathname: location.pathname, search: sp.toString() ? `?${sp.toString()}` : "" }, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  // Keyboard shortcut "?" (Shift+/) — only when not in an editable element
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);
      if (isEditable) return;
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const value = useMemo(
    () => ({ open, sectionId, openManual, closeManual, setSectionId }),
    [open, sectionId, openManual, closeManual, setSectionId],
  );

  return <ManualContext.Provider value={value}>{children}</ManualContext.Provider>;
}

export function useManual(): ManualContextValue {
  const ctx = useContext(ManualContext);
  if (!ctx) throw new Error("useManual must be used inside <ManualProvider>");
  return ctx;
}
