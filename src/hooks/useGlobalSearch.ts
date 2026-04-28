import { useEffect, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  globalSearch,
  searchSuggest,
  type GlobalSearchOptions,
  type GlobalSearchResponse,
  type SearchSuggestion,
} from "@/lib/search";

/** Petit hook de debounce générique. */
export function useDebounced<T>(value: T, delay = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export interface UseGlobalSearchOptions extends GlobalSearchOptions {
  enabled?: boolean;
  debounceMs?: number;
  /** Longueur minimale avant déclenchement (défaut 2) */
  minLength?: number;
}

const EMPTY: GlobalSearchResponse = {
  parsed: {
    fts: "",
    excluded: [],
    phrases: [],
    modules: [],
    filters: {},
    dateFrom: null,
    dateTo: null,
    raw: "",
  },
  results: [],
  grouped: {},
  total: 0,
};

export function useGlobalSearch(
  query: string,
  options: UseGlobalSearchOptions = {},
) {
  const {
    enabled = true,
    debounceMs = 250,
    minLength = 2,
    ...searchOpts
  } = options;
  const debounced = useDebounced(query, debounceMs);
  const trimmed = debounced.trim();
  const shouldRun = enabled && trimmed.length >= minLength;

  const result = useQuery<GlobalSearchResponse>({
    queryKey: [
      "global-search",
      trimmed,
      searchOpts.limitPerModule ?? 10,
      searchOpts.maxTotal ?? null,
      (searchOpts.forceModules ?? []).join(","),
    ],
    queryFn: () => globalSearch(trimmed, searchOpts),
    enabled: shouldRun,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return {
    ...result,
    data: result.data ?? EMPTY,
    isDebouncing: query !== debounced,
    isActive: shouldRun,
  };
}

export function useSearchSuggest(query: string, maxResults = 8) {
  const debounced = useDebounced(query, 200);
  const trimmed = debounced.trim();
  const enabled = trimmed.length >= 2;

  const result = useQuery<SearchSuggestion[]>({
    queryKey: ["search-suggest", trimmed, maxResults],
    queryFn: () => searchSuggest(trimmed, maxResults),
    enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });

  return {
    ...result,
    data: result.data ?? [],
    isActive: enabled,
  };
}
