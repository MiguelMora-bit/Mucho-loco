# Feature Specification: Tienda: catálogo, detalle y carrito

**Feature Branch**: `022-catalog-and-cart` (spec retroactivo, rama `docs/retro-specs`)

**Created**: 2026-09-26

**Status**: Implementado — spec retroactivo: documenta lo que ya existe, no pide código nuevo

**Input**: Spec retroactivo de la tienda de la web (customer-app) y del móvil (mobile-app): lo que existía antes de adoptar Spec Kit.

## Clarifications

### Decisiones ya tomadas (del historial documentado)

- Catálogo compartido en `@mucho-loco/customer-core/data` (18 productos semilla, 6 categorías: proteínas, pre-entreno, energéticas, gomitas y chicles, hidratación, merch); el backend los siembra con los mismos ids (`prisma/seed.ts`).
- Nombre y sabor son `LocalizedString` (2026-09-02): el catálogo cambia de idioma; un pedido congela el texto en el idioma de compra.
- Precios en pesos enteros en el catálogo; quien cobra (el backend) convierte a centavos.
- Imágenes relativas (`/assets/prod-*.jpg`): la web las sirve de `public/`, el móvil las empaqueta (`src/lib/images.ts`).
- El carrito persiste en el dispositivo: web con zustand `persist` (`ml-cart`, localStorage), móvil con AsyncStorage. Al servidor solo viajan `productId` + `qty`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Explorar la tienda (Priority: P1)

El visitante ve los productos y filtra por categoría, sin cuenta.

**Independent Test**: mock: la tienda lista los 18 productos; filtrar "Gomitas" reduce la lista; contra el backend, el contrato HTTP devuelve lo mismo campo por campo.

**Acceptance Scenarios**:

1. **Given** la tienda abierta, **When** elige una categoría, **Then** solo ve productos de esa categoría.
2. **Given** el filtro activo, **When** elige "Todo", **Then** vuelve a ver el catálogo completo.

### User Story 2 - Ver un producto y agregarlo (Priority: P1)

Detalle de producto con nombre, sabor, precio e imagen, y botón para agregar al carrito.

**Independent Test**: walkthrough del móvil y `shop-checkout.spec.ts` de la web.

**Acceptance Scenarios**:

1. **Given** un producto existente, **When** abre su detalle, **Then** ve nombre, sabor y precio en su idioma.
2. **Given** un id que no existe, **When** abre el detalle, **Then** ve "no encontrado" (el repositorio devuelve null).

### User Story 3 - Carrito (Priority: P1)

Cambiar cantidades, ver subtotal y conservarlo entre visitas.

**Independent Test**: `apps/mobile-app/src/lib/cart.test.ts`.

**Acceptance Scenarios**:

1. **Given** un producto en el carrito, **When** lo vuelve a agregar, **Then** la cantidad sube a 2, sin renglón duplicado.
2. **Given** cantidad 1, **When** baja una más, **Then** el producto sale del carrito.
3. **Given** un carrito con productos, **When** cierra y vuelve a abrir la app, **Then** el carrito sigue ahí.

### Edge Cases

- Producto sin stock: la tienda en línea no lo limita (el envío sale de bodega central); el stock por sucursal aplica a mostrador.
- Idioma cambiado con productos en el carrito: nombres y sabores se ven en el idioma nuevo.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El catálogo MUST leerse por `IProductRepository` (mock por defecto, HTTP con `*_DATA_SOURCE=http`): `getAll()`, `getById(id)` (`null` si no existe).
- **FR-002**: La tienda MUST filtrar por categoría (`PRODUCT_CATS`, traducidas) con "Todo" para quitar el filtro.
- **FR-003**: Agregar un producto ya presente MUST sumar 1 a su cantidad; bajar a 0 MUST quitarlo.
- **FR-004**: El carrito MUST persistir en el dispositivo y mostrar conteo y subtotal (precio × cantidad).
- **FR-005**: El backend MUST exponer `GET /products` y `GET /products/:id` públicos (sin token) con los datos sembrados.

### Key Entities

- Product (`id`, `cat`, `name`, `flav`, `price`, `img`, `tag?`), CartItem (Product + `qty`).

## Success Criteria *(mandatory)*

- **SC-001**: Mock y backend devuelven el mismo catálogo campo por campo (test de contrato).
- **SC-002**: El carrito sobrevive a cerrar la app en web y móvil.

## Assumptions

- El precio que se ve es informativo; el que se cobra lo calcula el servidor (spec 023).

## Fuera de alcance / pendiente conocido

- Inventario en línea (hoy la tienda no descuenta stock de bodega).
- Búsqueda por texto en la tienda.
