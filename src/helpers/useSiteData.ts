import { useEffect, useReducer } from "react";
import { api } from "./api";
import type { SiteData } from "../types/site";

type Raw = Omit<SiteData, "lastUpdated"> & { lastUpdated: string | null };

let cache: SiteData | null = null;
let failure: string | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function load(): Promise<void> {
  if (!inflight) {
    inflight = api<Raw>("/site")
      .then((raw) => {
        cache = { ...raw, lastUpdated: raw.lastUpdated ? new Date(raw.lastUpdated) : null };
        failure = null;
      })
      .catch((e: unknown) => {
        failure = e instanceof Error ? e.message : "Could not load the site.";
      })
      .finally(() => {
        inflight = null;
        listeners.forEach((l) => l());
      });
  }
  return inflight;
}

/** Re-fetch the content (call after the admin saves something). */
export function refreshSite() {
  return load();
}

/** Site content from the server. `data` is undefined until it has loaded. */
export function useSiteData() {
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    listeners.add(rerender);
    if (!cache) void load();
    return () => {
      listeners.delete(rerender);
    };
  }, []);
  return {
    data: cache ?? undefined,
    isLoading: !cache && !failure,
    error: failure,
  };
}
