/** `"Hola {name}"` + `{ name: 'Diego' }` → `"Hola Diego"`. Los mensajes de facturación usan `{llave}`. */
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => vars[key] ?? match);
}
