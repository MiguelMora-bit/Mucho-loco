'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../api-client';

interface UseAsyncSubmitOptions {
  errorMessage?: string;
  connectionErrorMessage?: string;
}

export function useAsyncSubmit(options: UseAsyncSubmitOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Plain-English defaults are a dev-safety net only — every real caller
  // passes translated strings from `t`, so these should never reach a user.
  const { errorMessage = 'Something went wrong. Try again.', connectionErrorMessage = 'Connection error. Try again.' } = options;

  const run = useCallback(async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage : connectionErrorMessage);
    } finally {
      setLoading(false);
    }
  }, [errorMessage, connectionErrorMessage]);

  return { loading, error, run };
}
