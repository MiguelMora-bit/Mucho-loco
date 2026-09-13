import * as SecureStore from 'expo-secure-store';

/**
 * Dónde vive la sesión en el teléfono: Keychain (iOS) / Keystore (Android),
 * cifrado por el sistema operativo.
 *
 * Es el equivalente móvil de la cookie httpOnly `ml_session` de customer-app.
 * Allá el token nunca lo toca el JS del navegador; aquí no hay navegador, y el
 * lugar seguro es el llavero del SO — NO AsyncStorage, que es texto plano en
 * disco.
 *
 * Existe `secure-storage.web.ts` al lado: Metro elige ese archivo al compilar
 * para web y este para iOS/Android (extensiones por plataforma).
 */
export const secureStorage = {
  get: (key: string): Promise<string | null> => SecureStore.getItemAsync(key),
  set: (key: string, value: string): Promise<void> => SecureStore.setItemAsync(key, value),
  remove: (key: string): Promise<void> => SecureStore.deleteItemAsync(key),
};
