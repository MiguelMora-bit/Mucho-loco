import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

// En web, el login social se abre en un popup que regresa a esta ruta; esto
// le entrega el resultado a la ventana que lo abrió y cierra el popup. En el
// app nativo no hace nada: ahí el navegador del sistema intercepta el deep
// link antes de que llegue al router.
WebBrowser.maybeCompleteAuthSession();

/**
 * `mucholoco://auth/callback`. Si el deep link sí llega al router (por
 * ejemplo, el app estaba cerrada), se manda al socio a su cuenta en vez de a
 * una pantalla de "ruta no encontrada".
 */
export default function AuthCallback() {
  return <Redirect href="/account" />;
}
