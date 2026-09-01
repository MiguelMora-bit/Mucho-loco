'use client';

import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import { startFireCanvas } from '../fire';

interface FireOpts {
  count?: number;
}

export function useFireCanvas(opts?: FireOpts): RefObject<HTMLCanvasElement | null> {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (ref.current) {
      const stop = startFireCanvas(ref.current, opts);
      return stop;
    }
    // Intentionally mount-only: opts is read once to seed the effect;
    // re-running on every opts identity change would restart the canvas loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
}
