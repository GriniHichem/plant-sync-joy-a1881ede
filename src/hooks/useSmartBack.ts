import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Returns a callback that navigates back to `location.state.from` when present,
 * otherwise to the provided `fallback` route. Use together with passing
 * `{ state: { from: location.pathname + location.search } }` when navigating
 * into a detail/edit page.
 */
export function useSmartBack(fallback: string) {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from as string | undefined;
  return useCallback(() => {
    navigate(from || fallback);
  }, [navigate, from, fallback]);
}

/**
 * Helper to build the `state` object to pass when navigating into a sub-page,
 * preserving the current location for the smart back button.
 */
export function withFrom(pathname: string, search = "") {
  return { from: pathname + search };
}
