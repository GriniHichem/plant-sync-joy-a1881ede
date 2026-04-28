/**
 * Couche client pour la recherche globale.
 * Encapsule les RPC `global_search` et `search_suggest` côté Supabase,
 * applique le parser d'opérateurs et des post-filtres (exclusions).
 */

import { supabase } from "@/integrations/supabase/client";
import { parseSearchQuery, type ParsedQuery } from "@/lib/searchQueryParser";
import { KNOWN_MODULE_KEYS } from "@/lib/searchCatalog";

export interface SearchResult {
  module: string;
  entity_id: string;
  code: string | null;
  label: string | null;
  snippet: string | null;
  score: number;
  severity: string | null;
  url: string | null;
  updated_at: string | null;
}

export interface SearchSuggestion {
  module: string;
  code: string | null;
  label: string | null;
  url: string | null;
  score: number;
}

export interface GlobalSearchOptions {
  limitPerModule?: number;
  /** Limite "dure" en cas d'absence de modules pertinents (ex: ⌘K) */
  maxTotal?: number;
  /** Modules forcés (override le parser). */
  forceModules?: string[];
  signal?: AbortSignal;
}

/** Sanitize : retire les modules inconnus pour ne pas casser le RPC. */
function sanitizeModules(modules: string[]): string[] {
  if (!modules.length) return [];
  const known = new Set<string>(KNOWN_MODULE_KEYS);
  return modules.filter((m) => known.has(m));
}

/** Applique les exclusions client-side sur snippet/label/code. */
function filterExcluded(rows: SearchResult[], excluded: string[]): SearchResult[] {
  if (!excluded.length) return rows;
  const lowers = excluded.map((e) => e.toLowerCase());
  return rows.filter((r) => {
    const hay = [r.code, r.label, r.snippet]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !lowers.some((ex) => hay.includes(ex));
  });
}

export interface GlobalSearchResponse {
  parsed: ParsedQuery;
  results: SearchResult[];
  /** Résultats groupés par module (clé = module DB) */
  grouped: Record<string, SearchResult[]>;
  /** Total après filtres */
  total: number;
}

export async function globalSearch(
  rawQuery: string,
  options: GlobalSearchOptions = {},
): Promise<GlobalSearchResponse> {
  const parsed = parseSearchQuery(rawQuery);
  const empty: GlobalSearchResponse = {
    parsed,
    results: [],
    grouped: {},
    total: 0,
  };

  // FTS vide ET pas de filtre de date/module → on ne lance pas la requête.
  if (!parsed.fts && !parsed.dateFrom && !parsed.dateTo && !parsed.modules.length) {
    return empty;
  }

  const modules = sanitizeModules(options.forceModules ?? parsed.modules);

  const { data, error } = await supabase.rpc("global_search", {
    q: parsed.fts || "",
    modules: modules.length ? modules : undefined,
    date_from: parsed.dateFrom ?? undefined,
    date_to: parsed.dateTo ?? undefined,
    limit_per_module: options.limitPerModule ?? 10,
  });

  if (error) {
    throw new Error(`Recherche globale: ${error.message}`);
  }

  let rows = (data ?? []) as SearchResult[];
  rows = filterExcluded(rows, parsed.excluded);

  if (options.maxTotal && rows.length > options.maxTotal) {
    rows = rows.slice(0, options.maxTotal);
  }

  const grouped = rows.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.module] ??= []).push(r);
    return acc;
  }, {});

  return { parsed, results: rows, grouped, total: rows.length };
}

export async function searchSuggest(
  q: string,
  maxResults = 8,
): Promise<SearchSuggestion[]> {
  const trimmed = (q ?? "").trim();
  if (trimmed.length < 2) return [];

  const { data, error } = await supabase.rpc("search_suggest", {
    q: trimmed,
    max_results: maxResults,
  });

  if (error) {
    throw new Error(`Suggestions: ${error.message}`);
  }
  return (data ?? []) as SearchSuggestion[];
}
