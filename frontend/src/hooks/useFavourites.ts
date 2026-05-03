import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "vaultstay_favourites";

function readStorage(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function writeStorage(s: Set<number>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...s]));
}

/**
 * Global singleton so all components sharing this hook stay in sync
 * within the same tab without needing a context provider.
 */
let _globalFavs: Set<number> = readStorage();
const _listeners = new Set<() => void>();

function subscribe(fn: () => void) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

function notify() {
  _listeners.forEach((fn) => fn());
}

export function useFavourites() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const unsub = subscribe(() => forceUpdate((n) => n + 1));
    return unsub;
  }, []);

  const toggle = useCallback((id: number) => {
    const next = new Set(_globalFavs);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    _globalFavs = next;
    writeStorage(next);
    notify();
  }, []);

  const isFav = useCallback((id: number) => _globalFavs.has(id), []);
  const count = _globalFavs.size;

  return { toggle, isFav, count, favIds: _globalFavs };
}
