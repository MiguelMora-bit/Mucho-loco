import { useCallback, useEffect, useState } from 'react';

export type ResourceState<T> =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: T };

/**
 * Carga datos de un repositorio al montar la pantalla.
 *
 * En customer-app esto lo hace el Server Component (`page.tsx` async llama al
 * repositorio y pasa props). En el móvil no hay servidor que renderice: todo
 * corre en el teléfono, así que cada pantalla pide sus datos al montarse — lo
 * mismo que un `useEffect` + `fetch` en una SPA de React.
 *
 * `load` TIENE que venir de `useCallback`: si cambia en cada render, el efecto
 * vuelve a correr en cada render y la pantalla nunca termina de cargar.
 *
 * `reload()` vuelve a pedir sin regresar a `loading`: los datos viejos se
 * quedan en pantalla hasta que llegan los nuevos (sin parpadeo).
 */
export function useResource<T>(load: () => Promise<T>) {
  const [state, setState] = useState<ResourceState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    load().then(
      (data) => {
        if (!cancelled) setState({ status: 'ready', data });
      },
      () => {
        if (!cancelled) setState({ status: 'error' });
      },
    );
    // Si la pantalla se desmonta (o `load` cambia) antes de que conteste, la
    // respuesta vieja se descarta en vez de pisar el estado.
    return () => {
      cancelled = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  return { state, reload };
}
