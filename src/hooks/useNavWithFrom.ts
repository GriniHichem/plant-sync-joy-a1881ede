import { useCallback } from "react";
import { useLocation, useNavigate, type NavigateOptions } from "react-router-dom";

/**
 * Drop-in replacement for `useNavigate` that automatically attaches the current
 * location (pathname + search) as `state.from`. Detail/edit pages reached this
 * way can use `useSmartBack(fallback)` to return to the originating page.
 *
 * Pass `{ state: { from: ... } }` explicitly to override.
 */
export function useNavWithFrom() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.pathname + location.search;

  return useCallback(
    (to: string | number, options?: NavigateOptions) => {
      if (typeof to === "number") {
        navigate(to);
        return;
      }
      const state = { from, ...(options?.state as object | undefined) };
      navigate(to, { ...options, state });
    },
    [navigate, from]
  );
}
