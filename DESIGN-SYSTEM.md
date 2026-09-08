# Design System — Mucho Loco Gym

Sistema visual de los 3 frontends del monorepo (`customer-app`, `branch-app`, `owner-panel`). Generado a partir de una auditoría del código real (no aspiracional) el 2026-09-08. Decisiones marcadas **(decidido 2026-09-08)** fueron confirmadas con Miguel en esa fecha.

## 1. Dos lenguajes visuales, uno por audiencia

Este proyecto **no tiene un solo design system** — tiene dos, deliberadamente distintos, y eso es correcto (ya documentado en los `CLAUDE.md` de cada app):

| | **Marca / Landing** | **Herramienta interna** |
|---|---|---|
| Dónde vive | `customer-app`: landing pública (`components/landing/*`), auth (`components/account/*`) | `branch-app` y `owner-panel` completos + `customer-app`: dashboard/checkout/performance/product |
| Audiencia | Cliente final, primera impresión, marketing | Staff/dueño, uso diario, densidad de información |
| Implementación | Clases CSS a mano en `app/globals.css` (`.btn-primary`, `.memb-card`, `.hero-*`, etc.), variables CSS (`--red`, `--cream`...) | Utilidades Tailwind directas sobre la paleta `ml.*` |
| Tipografía | Anton, Bebas Neue, Permanent Marker, JetBrains Mono, Inter | Solo Inter (body) + JetBrains Mono (datos/labels) |
| Decoración | Glow shadows, gradientes de "flama", `clip-path`, animaciones | Ninguna — bordes planos, sin sombra, sin animación |
| Border-radius | Recorte anguloso (`clip-path`) en CTAs, `0` en la mayoría | Siempre `rounded` (4px), nunca `sm/md/lg/full` |

**Por qué**: la landing vende la marca; las herramientas de staff/dueño priorizan legibilidad y velocidad de desarrollo para un solo dev. Mezclar los dos sistemas en un solo lenguaje visual no aporta nada — la regla no es "unificar todo", es que cada mitad sea internamente consistente.

`customer-app` está a medio migrar de CSS heredado a Tailwind (política ya fijada en su `CLAUDE.md`: "Tailwind v3 para estilos nuevos; clases CSS del diseño original para lo heredado"). Este doc trata esa migración como la dirección correcta — lo que hoy vive en CSS heredado fuera de la landing (auth, checkout, dashboard viejo) es deuda a migrar, no un tercer sistema a mantener.

---

## 2. Tokens compartidos (paleta `ml.*`)

Definidos de forma idéntica en los 3 `tailwind.config.js` (`customer-app`, `branch-app`, `owner-panel`):

| Token | Hex | Uso |
|---|---|---|
| `ml-black` | `#0a0606` | Fondo base |
| `ml-black-2` | `#140909` | Fondo de header/nav, un tono arriba del base |
| `ml-card` | `#1a0a0a` | Fondo de tarjetas/paneles |
| `ml-card-2` | `#221010` | Fondo de tarjeta anidada / input (uso mixto, ver §5) |
| `ml-border` | `#2a1414` | Todos los bordes neutros |
| `ml-red` | `#e1141c` | Color de marca, CTA primario |
| `ml-red-deep` | `#a30b11` | Definido, casi sin uso — candidato a retirar si sigue sin usarse |
| `ml-red-bright` | `#ff1a24` | Hover de rojo, estado "urgente/HOT" |
| `ml-orange` | `#ff6b1a` | Acento secundario, warning, conteos |
| `ml-yellow` | `#ffb627` | Acento terciario, tier "Premium" |
| `ml-cream` | `#f4ebe0` | Texto principal (nunca `white` puro — ver §6) |
| `ml-cream-dim` | `#b8a99c` | Texto secundario (el "muted" por default) |
| `ml-muted` | `#6b5a52` | Texto terciario — la mínima énfasis |
| `ml-green` | `#6dd56d` | Estado positivo (delta, "activo", "pagado") |

**Jerarquía de texto apagado (decidido 2026-09-08):** 3 niveles, no 2.
- `text-ml-cream` — texto principal.
- `text-ml-cream-dim` — texto secundario, el caso normal de "muted" (subtítulos, timestamps, ayuda de formulario). **Default cuando dudes.**
- `text-ml-muted` — la mínima énfasis: separadores (`·`), texto deshabilitado/vacío, notas al pie, texto sobre fondo blanco (QR).

Solo `customer-app` extiende la paleta con tokens decorativos de landing (fuentes display, `fontSize.10/11/22`, `spacing.4.5/5.5`, `letterSpacing.wide-xl/wide-2xl`, `boxShadow.red/red-lg/red-xl/orange`) — `branch-app`/`owner-panel` los omiten a propósito.

**Regla de radio:** en herramientas internas, todo elemento redondeado usa `rounded` (4px) y nada más — ya es 100% consistente en los 3 apps auditados, tratarlo como regla dura, no coincidencia.

---

## 3. Botones — herramientas internas (`branch-app` + `owner-panel`)

No existe un componente `&lt;Button&gt;` compartido (ni debería, por ahora — ver nota de arquitectura sobre no compartir código de runtime entre apps). Cada app repite las clases a mano; este doc fija **la receta canónica** para que ambas apps repitan lo mismo.

| Variante | Clases canónicas | Uso |
|---|---|---|
| **Primario** | `px-4 py-2 rounded bg-ml-red text-ml-cream text-sm font-medium hover:bg-ml-red-bright disabled:opacity-40 transition-colors` | Submit de formulario (alta, transferencia, correr nómina) |
| **Nav pill** | `px-3 py-1.5 rounded text-sm font-medium transition-colors` + activo `bg-ml-red text-ml-cream` / inactivo `text-ml-cream-dim hover:text-ml-cream` | Links de navegación en `AppShell` |
| **Toggle pill (idioma)** | `px-2 py-1 rounded text-xs font-mono` + mismos colores activo/inactivo que nav pill | Selector ES/EN |
| **Selector segmentado** (pago/tier/periodo/modo) | `flex-1 py-2 rounded text-sm font-medium border` + activo `bg-ml-red border-ml-red text-ml-cream` / inactivo `border-ml-border text-ml-cream-dim` | Elegir una de N opciones dentro de un formulario |
| **Secundario/outline** | `px-4 py-2 rounded border border-ml-border text-ml-cream-dim text-sm hover:text-ml-cream` | Botones de apoyo (buscar, código demo) |
| **Ghost/link** | `text-xs font-mono text-ml-cream-dim hover:text-ml-cream underline` | Acción de solo-lectura inline en tabla (ver/ocultar recibo) |
| **Icono stepper** | `w-7 h-7 rounded bg-ml-card-2 border border-ml-border disabled:opacity-40` | +/- de cantidad |

`disabled:opacity-40` es el valor canónico único — antes había 3 valores distintos (`30/40/50`) sin razón.

**Insignia de estado (badge) — receta única para los 3 dominios (decidido 2026-09-08):**
```
px-2 py-1 rounded text-xs font-mono uppercase border bg-ml-{color}/10 border-ml-{color} text-ml-{color}
```
Antes había 3 sistemas distintos (pedidos `/20` sin `border` consistente, QR `px-3 py-1 text-sm font-bold`, nómina ya casi correcta). Ya aplicado en el código:
- Pedidos (`ready`→orange, `delivered`→green) — `apps/branch-app/src/routes/PickupOrdersPage.tsx`
- QR/membresía (`active`→green, `grace`→orange, `expired`→red) — `apps/branch-app/src/routes/QrValidationPage.tsx`, `apps/branch-app/src/routes/counter/MembershipTab.tsx`
- Nómina (`open`→green, `closed`→muted) — `apps/owner-panel/src/routes/PayrollPage.tsx`

---

## 4. Cards, inputs y tablas — herramientas internas

**Card:** `bg-ml-card border border-ml-border rounded p-4`. `p-3` para tarjetas anidadas/compactas dentro de otra card, `p-4` es el default — evitar introducir más valores de padding sin razón (`p-5`/`p-6` que aparecen hoy en `customer-app`/`branch-app` deberían converger a `p-4` cuando se toque ese archivo).

**Banner de alerta** (variante de card, tintado): `bg-ml-{red|green}/10 border border-ml-{red|green} text-ml-{red|green} rounded p-3 text-sm`.

**Input de texto:** `w-full bg-ml-black-2 border border-ml-border rounded px-3 py-2 text-sm focus:outline-none focus:border-ml-red`.

**Select:** misma receta que el input **incluyendo el estado focus** — ya corregido en `owner-panel` (antes 5 selects no tenían ningún estilo de focus, inaccesible). `branch-app` no usa `&lt;select&gt;` todavía, pero si agrega uno debe seguir esta misma receta desde el día uno.

**Label de campo:** `text-xs font-mono uppercase text-ml-cream-dim block mb-1.5`.

**Tabla:** `w-full text-sm border-collapse`; header `text-left text-ml-cream-dim font-mono text-xs uppercase border-b border-ml-border`; filas `border-b border-ml-border`, celdas `py-2` sin padding horizontal; la columna numérica principal de cada fila lleva `font-medium`. Sin hover ni striping — ya es así en las 6 tablas auditadas, mantenerlo.

**Tipografía de página (herramienta interna):**
- Título de página: `text-2xl font-bold mb-1`
- Subtítulo: `text-ml-cream-dim text-sm`
- Header de sección: `text-sm font-mono uppercase tracking-wide text-ml-cream-dim mb-3`
- Label de stat: `text-xs font-mono uppercase text-ml-cream-dim mb-1`
- Valor de stat: `text-2xl font-bold` + color semántico (`ml-red` dinero, `ml-orange` conteos)
- Contenedor de página: `max-w-4xl mx-auto space-y-10`

---

## 5. Landing y app-shell de `customer-app`

La landing (`Hero`, `Memberships`, `Shop`, `Contact`, `Branches`, `Footer`, `Nav`) usa el sistema CSS heredado casi en su totalidad (`.btn-primary`, `.btn-ghost`, `.memb-card`, `.product-card`, `.section-title`...) definido en `app/globals.css`. Es intencional (diseño original) y está bien encapsulado — no requiere cambios.

Las páginas de cuenta (`dashboard`, `performance`, `checkout`, `product/[id]`, `account`) están **a medio migrar**: `dashboard`/`performance` ya son mayormente Tailwind; `account`/`checkout`/`product` todavía dependen de clases CSS heredadas (`.field`, `.auth-*`, `.pd-*`, `.ck-*`) para estructura, con Tailwind solo para retoques puntuales. Mientras eso avanza, la regla para lo que **sí** es Tailwind:

- Texto sobre `bg-ml-red` es siempre `text-ml-cream`, nunca `text-white` **(decidido 2026-09-08, ya corregido)** — el sistema heredado siempre usó `cream`; varios botones Tailwind nuevos se habían desviado a blanco puro.
- Títulos hero-scale usan `font-display` + `clamp()` — hoy hay 4 variantes de `clamp()` casi iguales sin token compartido (ver Auditoría, no bloqueante).
- Inputs de `account`/`checkout` siguen 100% en CSS heredado (`.auth-form .field input`, `.ck-card .field input`) — no tienen aún equivalente Tailwind; no inventar uno nuevo ad hoc, esperar a que se migre la página completa.

---

## 6. Auditoría — 2026-09-08

### Corregido en esta sesión (bugs reales)

| App | Archivo:línea | Problema | Fix aplicado |
|---|---|---|---|
| owner-panel | `PayrollPage.tsx` (pill nómina) | Borde `border-ml-border` no coincidía con el color del texto/fondo (`ml-muted`) en el estado "closed" | `border-ml-muted` |
| owner-panel | `PayrollPage.tsx:221` | Clase `font-display` no existe en el tema de owner-panel (solo `inter`/`mono`) — no hacía nada, título del recibo caía a la fuente por default | `font-bold text-lg` |
| owner-panel | `PayrollPage.tsx` (select de periodo) | Sin estado `focus` visible | + `focus:outline-none focus:border-ml-red` |
| owner-panel | `ExpensesPage.tsx` (2 selects), `TransfersPage.tsx` (3 selects) | Mismo problema — inputs de texto sí tenían focus, selects no, en el mismo formulario | + `focus:outline-none focus:border-ml-red` |
| branch-app | `PickupOrdersPage.tsx` (badge pedido) | Tinte `/20` fuera de la receta unificada | `/10` |
| branch-app | `QrValidationPage.tsx` (badge QR/membresía) | Receta distinta (`px-3 py-1 text-sm font-bold`, sin uppercase) | Unificado a la receta canónica de §3 |
| branch-app | `MembershipTab.tsx:222` | Estado del socio encontrado se mostraba como texto plano sin badge | Ahora usa la misma insignia que `QrValidationPage` |
| customer-app | `Header.tsx:18`, `HomePane.tsx:34`, `ProfilePane.tsx:38`, `AccessPane.tsx:30`, `Gallery.tsx:14`, `ConfirmationStep.tsx:20` | `text-white` sobre `bg-ml-red`/`bg-ml-red-bright` en vez de `text-ml-cream` | `text-ml-cream` |
| customer-app | `QrModal.tsx:15` | `text-[#333]` — hex crudo sin pasar por la paleta | `text-ml-muted` |
| customer-app | `ConfirmationStep.tsx:20` | Mezclaba la clase heredada `.btn-primary` (padding/fuente/color propios, incluye `clip-path`) con utilidades Tailwind que pisaban las mismas propiedades — doble receta peleando en el mismo botón | Se quitó `.btn-primary`, queda solo Tailwind puro (igual que el botón vecino) |

### Documentado, no corregido (deriva de estilo — decisión de Miguel cuándo tocarlo)

**branch-app** — botón primario tiene 3 variantes de padding/hover/disabled distintas entre `PickupOrdersPage.tsx:61`, `QrValidationPage.tsx:63`, `ProductSaleTab.tsx:209`/`MembershipTab.tsx:242`; el selector segmentado (pago/tier/periodo/modo) tiene 4 variantes de padding/font-weight en `MembershipTab.tsx` (líneas 39, 73, 91, 166); fondo de input de texto inconsistente (`bg-ml-card` en `QrValidationPage.tsx:58` vs `bg-ml-card-2` en `MembershipTab.tsx`); padding de card sin escala fija (`p-3/p-4/p-5/p-6` repartidos sin regla); un valor arbitrario `grid-cols-[1fr_320px]` en `ProductSaleTab.tsx:88`.

**owner-panel** — card del recibo de nómina usa `bg-ml-card-2` en vez de `bg-ml-card` (única excepción, `PayrollPage.tsx:220`); `PayrollPage` es la única página sin header de sección (`&lt;h2&gt;`); 3 anchos `max-w-*` ad hoc sin regla (`max-w-xs`, `max-w-2xl`, `max-w-md`); sin badge/tag para categoría de gasto o rol de empleado (datos categóricos sin tratamiento visual, solo texto plano en tabla).

**customer-app** — 4 variantes casi idénticas de título hero-scale (`clamp(40px,5vw,64px)` duplicado en `HomePane.tsx:23`/`PerformanceClient.tsx:29`, más 3 variantes más en `PaymentStep.tsx:37`, `CartStep.tsx:27`, `ConfirmationStep.tsx:13`) sin un token compartido; letter-spacing arbitrario repetido en 5 magnitudes distintas (`tracking-[0.04em]` a `[0.12em]`) que deberían sumarse a `wide-xl`/`wide-2xl` en el config; gradiente de "flama" duplicado a mano en `HomePane.tsx:24` (inline style) y `globals.css:1871` (`.auth-headline .flame`) con stops de color ligeramente distintos; `Sidebar.tsx:25` usa un gradiente hex crudo (`#100606`→`#050202`) más oscuro que `ml-black`/`ml-black-2` sin token — si el sidebar más oscuro es intencional, vale la pena promoverlo a un token nuevo (`ml-black-3` o similar) en vez de dejarlo hardcodeado; inputs de `account`/`checkout` siguen 100% en CSS heredado, sin equivalente Tailwind todavía (bloqueado por la migración pendiente de esas páginas, no es un fix de una línea).

### Nota

`ml-red-deep` y `ml-yellow` están definidos en la paleta de `owner-panel`/`branch-app` pero no se usan en ningún componente — no es una violación, solo constancia por si en algún momento se quiere podar el tema.
