'use client';

import { useCallback, useState } from 'react';
import { ApiError } from '../api-client';

interface UseAsyncSubmitOptions {
  errorMessage?: string;
}

export function useAsyncSubmit(options: UseAsyncSubmitOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { errorMessage = 'No pudimos procesar tu solicitud. Intenta de nuevo.' } = options;

  const run = useCallback(async (action: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? errorMessage : 'Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [errorMessage]);

  return { loading, error, run };
}
