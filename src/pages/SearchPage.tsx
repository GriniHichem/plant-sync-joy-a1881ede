import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import {
  FALLBACK_MODULE,
  getModuleDefinition,
} from "@/lib/searchCatalog";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ExportCsvButton } from "@/components/common/ExportCsvButton";

/**
 * Page de résultats complète (Phase 3 minimale).
 * La version riche avec facettes, onglets et export CSV est livrée en Phase 4.
 * Pour l'instant : barre de recherche + résultats groupés par module.
 */
export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initial = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initial);

  // Sync URL quand on tape (debounce naturel via useGlobalSearch)
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (query.trim()) next.set("q", query.trim());
    else next.delete("q");
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const { data, isFetching, isActive } = useGlobalSearch(query, {
    limitPerModule: 25,
    minLength: 2,
  });

  const groups = Object.entries(data.grouped);

  return (
    <div className="container max-w-5xl mx-auto py-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Recherche avancée</h1>
        <p className="text-sm text-muted-foreground">
          Cherche dans toute l'application : machines, PDR, tickets, OF, audit, notifications…
        </p>
      </header>

      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Rechercher… (ex: module:tickets crit:A "fuite huile")'
            className="pl-9 h-11"
            autoFocus
          />
        </div>
      </div>

      {!isActive && (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Tape au moins 2 caractères pour lancer la recherche.
        </div>
      )}

      {isActive && isFetching && data.total === 0 && (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Recherche en cours…
        </div>
      )}

      {isActive && !isFetching && data.total === 0 && (
        <div className="rounded-md border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">
          Aucun résultat pour <span className="font-semibold">« {query} »</span>.
        </div>
      )}

      {data.total > 0 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {data.total} résultat{data.total > 1 ? "s" : ""} dans {groups.length} module
            {groups.length > 1 ? "s" : ""}.
          </p>
          <ExportCsvButton
            data={groups.flatMap(([, rows]) => rows)}
            columns={[
              { key: "module", label: "Module" },
              { key: "code", label: "Code" },
              { key: "label", label: "Libellé" },
              { key: "severity", label: "Sévérité" },
              { key: "snippet", label: "Extrait", format: (v) => (v ? String(v).replace(/<\/?mark>/g, "") : "") },
              { key: "url", label: "URL" },
            ]}
            filename="recherche"
            size="sm"
          />
        </div>
      )}

      <div className="space-y-6">
        {groups.map(([moduleKey, rows]) => {
          const def = getModuleDefinition(moduleKey) ?? FALLBACK_MODULE;
          const Icon = def.icon;
          return (
            <section key={moduleKey} className="space-y-2">
              <header className="flex items-center gap-2">
                <span className={cn("h-7 w-7 rounded-md flex items-center justify-center", def.accent)}>
                  <Icon className="h-4 w-4" />
                </span>
                <h2 className="text-sm font-semibold uppercase tracking-wider">{def.pluralLabel}</h2>
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{rows.length}</Badge>
              </header>

              <div className="rounded-md border border-border/60 divide-y divide-border/60">
                {rows.map((r) => (
                  <button
                    key={`${r.module}:${r.entity_id}`}
                    type="button"
                    onClick={() => navigate(r.url || def.buildUrl(r.entity_id))}
                    className="w-full text-left px-3 py-2.5 hover:bg-accent/40 transition-colors flex flex-col gap-1"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-muted-foreground">{r.code ?? def.label}</span>
                      <span className="font-medium text-[13px] truncate">{r.label ?? "—"}</span>
                      {r.severity && (
                        <Badge variant="outline" className="text-[10px] capitalize ml-auto">
                          {r.severity}
                        </Badge>
                      )}
                    </div>
                    {r.snippet && (
                      <p
                        className="text-[12px] text-muted-foreground line-clamp-2"
                        // ts_headline renvoie déjà du HTML <mark> sûr (pas de saisie utilisateur brute)
                        dangerouslySetInnerHTML={{ __html: r.snippet }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      <footer className="pt-4 border-t border-border/60 text-xs text-muted-foreground">
        Astuce : <code className="px-1 rounded bg-muted">module:tickets</code>{" "}
        <code className="px-1 rounded bg-muted">crit:A</code>{" "}
        <code className="px-1 rounded bg-muted">"phrase exacte"</code>{" "}
        <code className="px-1 rounded bg-muted">-exclusion</code>{" "}
        <code className="px-1 rounded bg-muted">from:2026-01-01</code>{" "}
        <code className="px-1 rounded bg-muted">to:2026-04-30</code>
        <Button variant="link" className="ml-2 h-auto p-0 text-xs" onClick={() => setQuery("")}>
          Réinitialiser
        </Button>
      </footer>
    </div>
  );
}
