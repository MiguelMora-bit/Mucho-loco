# MUCHO LOCO GYM — Next.js 14

App de tienda y membresías para una cadena de gym. Frontend en Next.js 14 (App Router, JavaScript). Backend con AWS — próximamente.

## Stack

| Tecnología | Uso |
|---|---|
| Next.js 14 (App Router) | Framework frontend |
| React 18 | UI |
| CSS puro | Estilos (sin Tailwind) |
| next/font/google | Tipografías (Anton, Bebas Neue, Inter…) |
| Next.js Middleware | Protección de rutas con cookies |
| Route Handlers (API Routes) | Login/logout mock |

## Estructura del proyecto

```
mucho-loco-nextjs/
├── app/
│   ├── layout.js              # HTML raíz, fuentes, globals.css
│   ├── page.js                # Landing principal
│   ├── globals.css            # Todos los estilos (styles + sections + mobile)
│   ├── cuenta/page.js         # Login / Registro
│   ├── checkout/page.js       # Checkout — RUTA PROTEGIDA
│   ├── producto/[id]/page.js  # Detalle de producto (ruta dinámica)
│   ├── panel/page.js          # Dashboard del socio — RUTA PROTEGIDA
│   ├── rendimiento/page.js    # Estadísticas de entrenamiento — RUTA PROTEGIDA
│   └── api/auth/
│       ├── login/route.js     # POST → establece cookie ml_session
│       └── logout/route.js    # POST → elimina cookie
├── components/
│   └── MuchoLoco.jsx          # Componente principal de la landing ('use client')
├── lib/
│   ├── data.js                # Todos los datos (I18N, BRANCHES, PRODUCTS…)
│   ├── fire.js                # Canvas de partículas de fuego
│   └── auth.js                # Constantes de autenticación
├── middleware.js              # Protección de rutas protegidas
└── public/
    └── assets/                # Imágenes (bull-head, productos…)
```

## Rutas

| Ruta | Acceso | Descripción |
|---|---|---|
| `/` | Público | Landing completa (Hero, Tienda, Sucursales, Membresías, Contacto) |
| `/cuenta` | Público | Login y registro |
| `/producto/[id]` | Público | Detalle de producto con variantes |
| `/checkout` | **Protegida** | Proceso de compra paso a paso |
| `/panel` | **Protegida** | Dashboard del socio (QR, historial, pedidos) |
| `/rendimiento` | **Protegida** | Estadísticas y PRs de entrenamiento |

## Autenticación

El sistema de auth es mock (sin backend real aún). Funciona con una cookie `ml_session` httpOnly.

- **Login** → `POST /api/auth/login` → setea cookie → redirect a `/panel` (o al path original)
- **Logout** → `POST /api/auth/logout` → borra cookie → redirect a `/`
- **Middleware** → `middleware.js` intercepta `/panel/*`, `/rendimiento/*`, `/checkout/*` y redirige a `/cuenta?next=<ruta>` si no hay cookie

Cuando conectes el backend AWS (Cognito / Lambda), solo necesitas cambiar el `route.js` de login para validar contra la API real. El resto del flujo no cambia.

## Comandos

```bash
# Desarrollo
npm run dev

# Build de producción
npm run build

# Servidor de producción
npm start
```

## Características implementadas

- **Landing completa**: Hero con canvas de fuego, Tienda con filtros por categoría, Mapa de sucursales SVG interactivo, Calculadora de membresías, Feed de redes sociales, Footer
- **Carrito**: Drawer lateral con contador, add/remove/qty
- **Tablón de avisos**: FAB con badge de no leídos, board lateral, splash al primer carga
- **Idioma ES/EN**: Switch en la navbar, todo el contenido i18n
- **Detalle de producto**: Galería, variantes, productos relacionados, wishlist
- **Checkout**: Flujo de 3 pasos (carrito → pago → confirmación), métodos OXXO/tarjeta/transferencia/crypto
- **Dashboard**: QR de acceso, historial de entradas, pedidos, perfil
- **Rendimiento**: Estadísticas mensuales, PRs, heatmap de asistencia
- **Auth middleware**: Rutas protegidas con cookie httpOnly, redirect inteligente

## Próximos pasos (backend AWS)

- [ ] Cognito User Pool para auth real (email + Google/Facebook OAuth)
- [ ] DynamoDB para socios, pedidos, historial de accesos
- [ ] API Gateway + Lambda para los Route Handlers
- [ ] S3 + CloudFront para assets
- [ ] SES para emails de confirmación
- [ ] Stripe / Conekta para pagos reales
