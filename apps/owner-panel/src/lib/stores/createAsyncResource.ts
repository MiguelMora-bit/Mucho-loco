import { create } from 'zustand';

interface AsyncResourceState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  /** Seeds the store from data the server already fetched — no loader shown. */
  hydrate: (data: T) => void;
  /** Re-runs the mock/API call, flipping `loading` — use this to demo the loader. */
  fetch: () => Promise<void>;
}

export function createAsyncResourceStore<T>(fetcher: () => Promise<T>) {
  return create<AsyncResourceState<T>>()((set) => ({
    data: null,
    loading: false,
    error: null,
    hydrate: (data) => set({ data, loading: false, error: null }),
    fetch: async () => {
      set({ loading: true, error: null });
      try {
        const data = await fetcher();
        set({ data, loading: false });
      } catch (e) {
        set({ error: e instanceof Error ? e.message : 'Unknown error', loading: false });
      }
    },
  }));
}
