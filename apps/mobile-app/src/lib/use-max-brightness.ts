import * as Brightness from 'expo-brightness';
import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * Brillo al máximo mientras la pantalla está montada, y de vuelta al valor
 * anterior al salir. Con brillo bajo, el lector de recepción de branch-app es
 * justo lo que falla al leer el QR desde un teléfono.
 *
 * En web no hay API de brillo: no hace nada.
 */
export function useMaxBrightness() {
  useEffect(() => {
    if (Platform.OS === 'web') return;

    let previous: number | null = null;
    let cancelled = false;

    (async () => {
      try {
        previous = await Brightness.getBrightnessAsync();
        if (!cancelled) await Brightness.setBrightnessAsync(1);
      } catch {
        // Sin brillo máximo el QR sigue funcionando; no vale la pena romper la pantalla.
      }
    })();

    return () => {
      cancelled = true;
      if (previous !== null) Brightness.setBrightnessAsync(previous).catch(() => {});
    };
  }, []);
}
