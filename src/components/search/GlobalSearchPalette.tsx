import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Search, X, ScanLine } from "lucide-react";
import { ScannerDialog } from "@/components/scanner/ScannerDialog";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import {
  FALLBACK_MODULE,
  getModuleDefinition,
  type ModuleDefinition,
} from "@/lib/searchCatalog";
import type { SearchResult } from "@/lib/search";

const RECENT_KEY = "search.recent.v1";
const RECENT_MAX = 8;

function loadRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(q: string) {
  const trimmed = q.trim();
  if (!trimmed || trimmed.length < 2) return;
  try {
    const current = loadRecent();
    const next = [trimmed, ...current.filter((x) => x.toLowerCase() !== trimmed.toLowerCase())].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage indisponible (mode privé) — silencieux
  }
}

/** Retire les balises <mark>…</mark> renvoyées par ts_headline pour un rendu sûr. */
function renderSnippet(snippet: string | null): React.ReactNode {
  if (!snippet) return null;
  const parts = snippet.split(/(<mark>[^<]*<\/mark>)/g);
  return parts.map((part, i) => {
    const m = part.match(/^<mark>([^<]*)<\/mark>$/);
    if (m) {
      return (
        <mark key={i} className="bg-primary/15 text-primary rounded-sm px-0.5">
          {m[1]}
        </mark>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export interface GlobalSearchPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GlobalSearchPalette({ open, onOpenChange }: GlobalSearchPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>(() => loadRecent());
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Reset à la fermeture
  useEffect(() => {
    if (!open) {
      const t = window.setTimeout(() => setQuery(""), 150);
      return () => window.clearTimeout(t);
    }
    setRecent(loadRecent());
  }, [open]);

  const { data, isFetching, isDebouncing, isActive } = useGlobalSearch(query, {
    limitPerModule: 5,
    maxTotal: 40,
    minLength: 2,
  });

  const groupsOrdered = useMemo(() => {
    const entries = Object.entries(data.grouped);
    entries.sort((a, b) => {
      const ma = (a[1][0]?.score ?? 0) as number;
      const mb = (b[1][0]?.score ?? 0) as number;
      return mb - ma;
    });
    return entries;
  }, [data.grouped]);

  const totalResults = data.total;
  const hasResults = totalResults > 0;
  const showEmpty = isActive && !isFetching && !hasResults;

  const goTo = (url: string | null, fallback?: ModuleDefinition, entityId?: string) => {
    saveRecent(query);
    onOpenChange(false);
    const target = url || (fallback && entityId ? fallback.buildUrl(entityId) : null);
    if (target) navigate(target);
  };

  const goToFullPage = () => {
    saveRecent(query);
    onOpenChange(false);
    const params = new URLSearchParams({ q: query.trim() });
    navigate(`/recherche?${params.toString()}`);
  };

  const [scanOpen, setScanOpen] = useState(false);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <div className="relative">
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder='Rechercher partout… (ex: "fuite huile", module:tickets crit:A)'
        />
        {(isFetching || isDebouncing) && (
          <Loader2 className="absolute right-16 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="absolute right-9 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Scanner un code"
          title="Scanner un QR ou un code-barres"
        >
          <ScanLine className="h-4 w-4" />
        </button>
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Effacer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <ScannerDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onResolved={(r) => {
          if (r.url) { onOpenChange(false); navigate(r.url); }
        }}
        onRawValue={(raw) => { setQuery(raw); }}
        title="Scanner pour ouvrir une fiche"
      />

      <CommandList className="max-h-[480px]">
        {/* Recherches récentes */}
        {!isActive && recent.length > 0 && (
          <CommandGroup heading="Recherches récentes">
            {recent.map((r) => (
              <CommandItem key={r} value={`recent:${r}`} onSelect={() => setQuery(r)}>
                <Search className="h-4 w-4 text-muted-foreground" />
                <span className="ml-2 truncate">{r}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Astuce opérateurs */}
        {!isActive && recent.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">Tapez pour chercher partout</p>
            <p>
              Astuces : <code className="px-1 rounded bg-muted">module:tickets</code>{" "}
              <code className="px-1 rounded bg-muted">crit:A</code>{" "}
              <code className="px-1 rounded bg-muted">"fuite huile"</code>{" "}
              <code className="px-1 rounded bg-muted">-resolu</code>{" "}
              <code className="px-1 rounded bg-muted">from:2026-01-01</code>
            </p>
          </div>
        )}

        {/* Empty state actif */}
        {showEmpty && (
          <CommandEmpty>
            Aucun résultat pour <span className="font-semibold">« {query} »</span>.
          </CommandEmpty>
        )}

        {/* Résultats groupés */}
        {hasResults &&
          groupsOrdered.map(([moduleKey, rows], idx) => {
            const def = getModuleDefinition(moduleKey) ?? FALLBACK_MODULE;
            const Icon = def.icon;
            return (
              <div key={moduleKey}>
                {idx > 0 && <CommandSeparator />}
                <CommandGroup
                  heading={
                    <span className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{def.pluralLabel}</span>
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-medium">
                        {rows.length}
                      </Badge>
                    </span>
                  }
                >
                  {rows.map((r: SearchResult) => (
                    <CommandItem
                      key={`${r.module}:${r.entity_id}`}
                      value={`${r.module}-${r.entity_id}-${r.code ?? ""}-${r.label ?? ""}`}
                      onSelect={() => goTo(r.url, def, r.entity_id)}
                      className="flex flex-col items-start gap-1 py-2.5"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className={cn("h-6 w-6 rounded-md flex items-center justify-center shrink-0", def.accent)}>
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground shrink-0">
                          {r.code ?? def.label}
                        </span>
                        <span className="font-medium truncate flex-1 text-[13px]">
                          {r.label ?? "—"}
                        </span>
                        {r.severity && (
                          <Badge variant="outline" className="text-[10px] capitalize shrink-0">
                            {r.severity}
                          </Badge>
                        )}
                      </div>
                      {r.snippet && (
                        <p className="text-[12px] text-muted-foreground/90 line-clamp-2 pl-8">
                          {renderSnippet(r.snippet)}
                        </p>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </div>
            );
          })}

        {/* Footer : voir tous les résultats */}
        {hasResults && (
          <>
            <CommandSeparator />
            <CommandGroup>
              <CommandItem value="__see_all__" onSelect={goToFullPage}>
                <Search className="h-4 w-4 text-primary" />
                <span className="ml-2 font-medium">
                  Voir tous les résultats pour « {query.trim()} »
                </span>
                <CommandShortcut>↵</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
