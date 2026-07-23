import { useSyncExternalStore } from "react"

/**
 * Returns `false` on the server and during the first client (hydration) render,
 * then `true` once hydrated — without a post-paint `setState`, so it avoids the
 * mount-time flicker that `useState(false)` + `useEffect(setState)` causes.
 *
 * Use it to gate client-only UI whose value differs between server and browser
 * (e.g. theme icons read from localStorage) while keeping the initial markup
 * identical on both sides.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}
