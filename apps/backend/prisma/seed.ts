// Mismos ids/nombres que apps/customer-app/lib/data.ts (BRANCHES, PRODUCTS,
// MEMBERSHIP_TIERS) — branch-app y owner-panel ya referencian estos mismos
// ids de sucursal/producto en sus propios mocks (BRANCH_INVENTORY, etc.), así
// que cuando esos apps conecten a este backend (Fase 5+ de la metodología)
// los ids deben coincidir sin necesidad de un mapeo.
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const branches = [
  { id: 1, name: 'ROMA SUR', city: 'CDMX', addr: 'Av. Cuauhtémoc 612, Roma Sur', phone: '55 5564 1101', lat: 19.408, lng: -99.1593, classes: 26, coaches: 9, price: 1090, tier: 'Premium' as const, featured: true, promo: { label: { es: 'Oferta de apertura', en: 'Opening offer' }, detail: { es: '20% de descuento en tu primer mes', en: '20% off your first month' }, discountPercent: 20 }, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70' },
  { id: 2, name: 'ROMA NORTE', city: 'CDMX', addr: 'Álvaro Obregón 185, Roma Norte', phone: '55 5208 9923', lat: 19.4195, lng: -99.1636, classes: 22, coaches: 7, price: 1090, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=70' },
  { id: 3, name: 'CONDESA', city: 'CDMX', addr: 'Av. Tamaulipas 90, Hipódromo Condesa', phone: '55 5212 4477', lat: 19.4117, lng: -99.1735, classes: 24, coaches: 8, price: 1190, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=70' },
  { id: 4, name: 'INTERLOMAS', city: 'Edo. Méx.', addr: 'Blvd. Magnocentro 26, Huixquilucan', phone: '55 5290 1010', lat: 19.386, lng: -99.2665, classes: 26, coaches: 8, price: 1190, tier: 'Premium' as const, featured: true, promo: { label: { es: 'Promo de temporada', en: 'Seasonal promo' }, detail: { es: '15% de descuento en tu primer mes', en: '15% off your first month' }, discountPercent: 15 }, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=70' },
  { id: 5, name: 'SANTA FE', city: 'CDMX', addr: 'Vasco de Quiroga 3800, Santa Fe', phone: '55 5292 7733', lat: 19.3599, lng: -99.2647, classes: 30, coaches: 11, price: 1390, tier: 'Premium' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=900&q=70' },
  { id: 6, name: 'DEL VALLE', city: 'CDMX', addr: 'Av. Cuauhtémoc 1235, Del Valle', phone: '55 5536 8821', lat: 19.3829, lng: -99.1668, classes: 20, coaches: 6, price: 990, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=70' },
  { id: 7, name: 'COYOACÁN', city: 'CDMX', addr: 'Av. Universidad 1900, Coyoacán', phone: '55 5658 4412', lat: 19.3466, lng: -99.1644, classes: 18, coaches: 5, price: 890, tier: 'Lite' as const, featured: false, promo: null, hours: '5:00 — 22:00', img: 'https://images.unsplash.com/photo-1623874514711-0f321325f318?auto=format&fit=crop&w=900&q=70' },
  { id: 8, name: 'SATELITE', city: 'Edo. Méx.', addr: 'Blvd. Manuel Ávila Camacho 2350, Naucalpan', phone: '55 5374 3322', lat: 19.5091, lng: -99.2385, classes: 24, coaches: 8, price: 1090, tier: 'Core' as const, featured: true, promo: { label: { es: 'Regreso a clases', en: 'Back to gym' }, detail: { es: '10% de descuento en tu primer mes', en: '10% off your first month' }, discountPercent: 10 }, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=70' },
  { id: 9, name: 'PEDREGAL', city: 'CDMX', addr: 'Periférico Sur 4690, Jardines del Pedregal', phone: '55 5645 6677', lat: 19.3177, lng: -99.1938, classes: 22, coaches: 7, price: 1190, tier: 'Premium' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=70' },
  { id: 10, name: 'ECATEPEC', city: 'Edo. Méx.', addr: 'Av. Central 145, Ecatepec', phone: '55 5775 9988', lat: 19.6018, lng: -99.05, classes: 20, coaches: 6, price: 790, tier: 'Lite' as const, featured: false, promo: null, hours: '5:00 — 22:00', img: 'https://images.unsplash.com/photo-1568599924649-b5c0e0a2b5dd?auto=format&fit=crop&w=900&q=70' },
  { id: 11, name: 'TLALNEPANTLA', city: 'Edo. Méx.', addr: 'Av. Mario Colín 220, Tlalnepantla', phone: '55 5390 4433', lat: 19.5409, lng: -99.1954, classes: 20, coaches: 6, price: 890, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=900&q=70' },
  { id: 12, name: 'TOLUCA', city: 'Edo. Méx.', addr: 'Paseo Tollocan 800, Toluca', phone: '72 2280 7766', lat: 19.2925, lng: -99.6408, classes: 22, coaches: 7, price: 890, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?auto=format&fit=crop&w=900&q=70' },
  { id: 13, name: 'CUAJIMALPA', city: 'CDMX', addr: 'Av. Veracruz 24, Cuajimalpa', phone: '55 5814 1122', lat: 19.3594, lng: -99.2908, classes: 22, coaches: 7, price: 1090, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=70' },
  { id: 14, name: 'CUAUTITLÁN', city: 'Edo. Méx.', addr: 'Blvd. Ayuntamiento 92, Cuautitlán Izcalli', phone: '55 5870 0099', lat: 19.6497, lng: -99.2267, classes: 18, coaches: 5, price: 790, tier: 'Lite' as const, featured: false, promo: null, hours: '5:00 — 22:00', img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70' },
  { id: 15, name: 'TLALPAN', city: 'CDMX', addr: 'Calz. de Tlalpan 4860, Tlalpan', phone: '55 5573 2244', lat: 19.2924, lng: -99.1632, classes: 20, coaches: 6, price: 890, tier: 'Core' as const, featured: false, promo: null, hours: '5:00 — 23:00', img: 'https://images.unsplash.com/photo-1571019613540-996a73c44a14?auto=format&fit=crop&w=900&q=70' },
];

const products = [
  { id: 'p1', cat: 'proteinas' as const, name: { es: 'Whey Protein 5LBS', en: 'Whey Protein 5LBS' }, flav: { es: 'Strawberry', en: 'Strawberry' }, price: 1290, img: '/assets/prod-whey-strawberry.jpg', tag: 'BEST' },
  { id: 'p2', cat: 'proteinas' as const, name: { es: 'Whey Protein 2.2LBS', en: 'Whey Protein 2.2LBS' }, flav: { es: 'Cappuccino', en: 'Cappuccino' }, price: 990, img: '/assets/prod-whey-cappuccino.jpg', tag: null },
  { id: 'p3', cat: 'proteinas' as const, name: { es: 'Whey Protein 2.2LBS', en: 'Whey Protein 2.2LBS' }, flav: { es: 'Cookies & Cream', en: 'Cookies & Cream' }, price: 990, img: '/assets/prod-whey-flavors.jpg', tag: null },
  { id: 'p4', cat: 'proteinas' as const, name: { es: 'Whey Protein 2.2LBS', en: 'Whey Protein 2.2LBS' }, flav: { es: 'Sprinkle Donut', en: 'Sprinkle Donut' }, price: 990, img: '/assets/prod-whey-flavors.jpg', tag: 'NEW' },
  { id: 'p5', cat: 'proteinas' as const, name: { es: 'Whey Protein 1KG', en: 'Whey Protein 1KG' }, flav: { es: 'Cinnamon Roll', en: 'Cinnamon Roll' }, price: 690, img: '/assets/prod-whey-flavors.jpg', tag: null },
  { id: 'p6', cat: 'proteinas' as const, name: { es: 'Whey Protein 1KG', en: 'Whey Protein 1KG' }, flav: { es: 'Chocolate', en: 'Chocolate' }, price: 690, img: '/assets/prod-whey-flavors.jpg', tag: null },
  { id: 'p7', cat: 'pre' as const, name: { es: 'Pre-Entreno Bestia', en: 'Beast Pre-Workout' }, flav: { es: 'Mango Chamoy', en: 'Mango Chamoy' }, price: 790, img: '/assets/prod-pre-mango.jpg', tag: 'HOT' },
  { id: 'p8', cat: 'pre' as const, name: { es: 'Creatine Monohydrate', en: 'Creatine Monohydrate' }, flav: { es: '500g · 5g por servicio', en: '500g · 5g per serving' }, price: 590, img: '/assets/prod-creatine.jpg', tag: null },
  { id: 'p9', cat: 'energy' as const, name: { es: 'Mucho Loco Energy 473ml', en: 'Mucho Loco Energy 473ml' }, flav: { es: 'Mora-Uva', en: 'Berry-Grape' }, price: 45, img: '/assets/prod-energy.jpg', tag: null },
  { id: 'p10', cat: 'energy' as const, name: { es: 'Mucho Loco Energy 473ml', en: 'Mucho Loco Energy 473ml' }, flav: { es: 'Sin azúcar', en: 'Sugar-free' }, price: 45, img: '/assets/prod-energy.jpg', tag: null },
  { id: 'p11', cat: 'gomitas' as const, name: { es: "BCAA's en polvo", en: "BCAA's Powder" }, flav: { es: 'Watermelon', en: 'Watermelon' }, price: 690, img: '/assets/prod-bcaa.jpg', tag: null },
  { id: 'p12', cat: 'gomitas' as const, name: { es: "BCAA's en polvo", en: "BCAA's Powder" }, flav: { es: 'Blueberry', en: 'Blueberry' }, price: 690, img: '/assets/prod-bcaa.jpg', tag: null },
  { id: 'p13', cat: 'gomitas' as const, name: { es: 'Goma de Mascar Energética', en: 'Energy Chewing Gum' }, flav: { es: 'Energía Bestial', en: 'Beast Energy' }, price: 95, img: '/assets/prod-goma.jpg', tag: 'NEW' },
  { id: 'p14', cat: 'gomitas' as const, name: { es: 'Goma de Mascar Sin Límite', en: 'No Limit Chewing Gum' }, flav: { es: 'Cafeína + taurina', en: 'Caffeine + taurine' }, price: 95, img: '/assets/prod-goma.jpg', tag: null },
  { id: 'p15', cat: 'gomitas' as const, name: { es: 'Goma de Mascar Bestia', en: 'Beast Chewing Gum' }, flav: { es: 'Cafeína + taurina', en: 'Caffeine + taurine' }, price: 95, img: '/assets/prod-goma.jpg', tag: null },
  { id: 'p16', cat: 'agua' as const, name: { es: 'Agua Mucho 1L', en: 'Mucho Water 1L' }, flav: { es: 'Natural', en: 'Natural' }, price: 25, img: '/assets/prod-energy.jpg', tag: null },
  { id: 'p17', cat: 'agua' as const, name: { es: 'Agua Electrolitos 750ml', en: 'Electrolyte Water 750ml' }, flav: { es: 'Limón sal', en: 'Lime salt' }, price: 45, img: '/assets/prod-bcaa.jpg', tag: null },
  { id: 'p18', cat: 'merch' as const, name: { es: 'Shaker Loco', en: 'Shaker Loco' }, flav: { es: '700ml', en: '700ml' }, price: 290, img: '/assets/mucho-loco-logo.jpg', tag: null },
];

// Registro de cobros (2026-09-14). Mismas filas que inserta la migración
// 20260914150000_charges_ledger. 01010101 ("No existe en el catálogo") es
// válida pero genérica: la clave real de cada categoría la define el
// contador antes de emitir la primera factura.
const taxCategories = [
  { id: 'supplement', name: 'Suplementos alimenticios', satProductKey: '01010101', satUnitKey: 'H87', taxRateBp: 1600 },
  { id: 'energy_drink', name: 'Bebidas energizantes', satProductKey: '01010101', satUnitKey: 'H87', taxRateBp: 1600 },
  { id: 'beverage', name: 'Agua y bebidas', satProductKey: '01010101', satUnitKey: 'H87', taxRateBp: 1600 },
  { id: 'merch', name: 'Mercancía', satProductKey: '01010101', satUnitKey: 'H87', taxRateBp: 1600 },
  { id: 'gym_membership', name: 'Membresía de gimnasio', satProductKey: '01010101', satUnitKey: 'E48', taxRateBp: 1600 },
  { id: 'shipping', name: 'Envío a domicilio', satProductKey: '01010101', satUnitKey: 'E48', taxRateBp: 1600 },
  { id: 'unclassified', name: 'Sin clasificar', satProductKey: '01010101', satUnitKey: 'H87', taxRateBp: 1600 },
];

const TAX_CATEGORY_BY_CAT: Record<(typeof products)[number]['cat'], string> = {
  proteinas: 'supplement',
  pre: 'supplement',
  gomitas: 'supplement',
  energy: 'energy_drink',
  agua: 'beverage',
  merch: 'merch',
};

const membershipTiers = [
  {
    key: 'single' as const,
    name: { es: 'UNA SUCURSAL', en: 'ONE GYM' },
    factor: 1.0,
    popular: false,
    perks: {
      es: ['Acceso a tu sucursal elegida', 'Todas las clases de esa sucursal', 'Locker incluido', 'Horario completo 5:00 – 23:00', 'Acceso a la app con rutinas'],
      en: ['Access to your chosen gym', 'All classes at that location', 'Locker included', 'Full schedule 5:00 – 11:00 PM', 'App with workouts'],
    },
    badge: { es: '1 SUCURSAL', en: '1 GYM' },
  },
  {
    key: 'all' as const,
    name: { es: 'TODAS LAS SUCURSALES', en: 'ALL GYMS' },
    // Mismo precio en las 15 sucursales (2026-09-15) — basePrice gana sobre
    // factor × branch.price. Ver membership-plans.ts, TIER_BASE_PRICES.
    factor: 1.5,
    basePrice: 1550,
    popular: true,
    perks: {
      es: ['Acceso a las 15 sucursales', 'Todas las clases en cualquier sede', 'Locker incluido', 'Horario completo en todas', 'Invitado al mes', 'Asesoría nutricional', 'App con rutinas'],
      en: ['Access to all 15 gyms', 'All classes at any location', 'Locker included', 'Full schedule everywhere', 'One guest/month', 'Nutrition coaching', 'App with workouts'],
    },
    badge: { es: '15 SUCURSALES', en: '15 GYMS' },
  },
];

// Mismo contenido que apps/customer-app/lib/data.ts (ANNOUNCEMENTS, SOCIAL_LINKS, SOCIAL_FEED)
// — editorial fijo, no ligado a un usuario.
const announcements = [
  {
    id: 'aniv-8',
    type: 'fiesta',
    badge: { es: 'FIESTA', en: 'PARTY' },
    date: new Date('2026-06-21'),
    dateLabel: { es: '21 JUN · 21:00', en: 'JUN 21 · 9:00 PM' },
    title: { es: '8 AÑOS DE PURO FUEGO', en: '8 YEARS OF PURE FIRE' },
    subtitle: { es: 'Fiesta de aniversario Mucho Loco', en: 'Mucho Loco anniversary party' },
    body: {
      es: 'Cumplimos 8 años incendiando la ciudad y lo vamos a celebrar a lo grande. Música en vivo, food trucks, retas de fuerza, rifas de membresías anuales y mucha proteína. Entrada gratis para socios + 1 invitado.',
      en: 'We turn 8 years setting the city on fire, and we will celebrate big. Live music, food trucks, strength challenges, annual membership raffles and lots of protein. Free entry for members + 1 guest.',
    },
    cta: { es: 'CONFIRMAR ASISTENCIA', en: 'RSVP NOW' },
    link: null,
    location: { es: 'Sucursal Roma Sur · Terraza', en: 'Roma Sur · Rooftop' },
    emoji: '🎉',
    accent: '#e1141c',
  },
  {
    id: 'pre-mango',
    type: 'producto',
    badge: { es: 'NUEVO PRODUCTO', en: 'NEW DROP' },
    date: new Date('2026-06-10'),
    dateLabel: { es: 'YA DISPONIBLE', en: 'OUT NOW' },
    title: { es: 'PRE-ENTRENO BESTIA · MANGO CHAMOY', en: 'BEAST PRE-WORKOUT · MANGO CHAMOY' },
    subtitle: { es: 'El sabor más loco de la tienda', en: 'The wildest flavor in the store' },
    body: {
      es: 'Llegó el nuevo Pre-Entreno Bestia sabor Mango Chamoy. 300mg de cafeína, beta-alanina y un golpe de chile que despierta a cualquiera. Lánzate a la tienda y pruébalo con 15% de descuento de lanzamiento.',
      en: 'The new Beast Pre-Workout in Mango Chamoy is here. 300mg caffeine, beta-alanine and a chili kick that wakes anyone up. Hit the store and try it with 15% launch discount.',
    },
    cta: { es: 'VER EN LA TIENDA', en: 'SHOP NOW' },
    link: '/product/p7',
    location: { es: 'Tienda Mucho Loco', en: 'Mucho Loco Store' },
    emoji: '🔥',
    accent: '#ff6b1a',
  },
  {
    id: 'reto-verano',
    type: 'reunion',
    badge: { es: 'RETO ESPECIAL', en: 'CHALLENGE' },
    date: new Date('2026-07-01'),
    dateLabel: { es: '1 JUL — 31 JUL', en: 'JUL 1 — JUL 31' },
    title: { es: 'RETO VERANO: 20 DÍAS', en: 'SUMMER CHALLENGE: 20 DAYS' },
    subtitle: { es: 'Entrena 20 días en julio y gana premios', en: 'Train 20 days in July and win prizes' },
    body: {
      es: 'Asiste 20 días durante julio y participa por un año de membresía gratis, kits de suplementos y merch exclusivo. Registra tu asistencia con tu QR y sigue tu avance en el tablón del gym.',
      en: 'Show up 20 days during July and enter to win a free year membership, supplement kits and exclusive merch. Track attendance with your QR and follow your progress on the gym board.',
    },
    cta: { es: 'INSCRIBIRME AL RETO', en: 'JOIN THE CHALLENGE' },
    link: null,
    location: { es: 'Todas las sucursales', en: 'All locations' },
    emoji: '🏆',
    accent: '#ffb627',
  },
];

const socialLinks = [
  { key: 'instagram' as const, name: 'Instagram', handle: '@mucholoco.fit', followers: '128K', url: '#' },
  { key: 'tiktok' as const, name: 'TikTok', handle: '@mucholoco', followers: '342K', url: '#' },
  { key: 'youtube' as const, name: 'YouTube', handle: 'Mucho Loco Gym', followers: '56K', url: '#' },
  { key: 'facebook' as const, name: 'Facebook', handle: '/mucholocogym', followers: '89K', url: '#' },
];

const socialFeedPosts = [
  { net: 'instagram' as const, img: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1000&q=70', cap: { es: 'Leg day no perdona 🔥 Roma Sur a tope', en: 'Leg day shows no mercy 🔥 Roma Sur going hard' }, likes: '2.4K', ago: '3h', url: '#' },
  { net: 'instagram' as const, img: 'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1000&q=70', cap: { es: 'Nueva clase de HIIT en Condesa 💥', en: 'New HIIT class at Condesa 💥' }, likes: '1.8K', ago: '9h', url: '#' },
  { net: 'facebook' as const, img: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1000&q=70', cap: { es: 'Reto de 30 días: ¿te atreves, bestia?', en: '30-day challenge: you in, beast?' }, likes: '973', ago: '1d', url: '#' },
  { net: 'instagram' as const, img: 'https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=1000&q=70', cap: { es: 'PR de peso muerto en Santa Fe 🏋️', en: 'Deadlift PR at Santa Fe 🏋️' }, likes: '3.1K', ago: '1d', url: '#' },
  { net: 'facebook' as const, img: 'https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=1000&q=70', cap: { es: 'Coaches nuevos en Interlomas. Bienvenidos 🐂', en: 'New coaches at Interlomas. Welcome 🐂' }, likes: '654', ago: '2d', url: '#' },
  { net: 'instagram' as const, img: 'https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=1000&q=70', cap: { es: 'Domingo de cardio al aire libre ☀️', en: 'Sunday outdoor cardio ☀️' }, likes: '2.0K', ago: '3d', url: '#' },
];

// Performance no se siembra: todo sale de lo que registra cada socio
// (entrenamientos, spec 017) y de su asistencia (visitas, spec 012).


// --- Operación de sucursal y HQ (2026-09-12) ---------------------------------
// Los mocks de branch-app y owner-panel tenían CADA UNO su propio
// BRANCH_INVENTORY con cantidades distintas para la misma (sucursal, producto)
// — eran islas, nadie las cuadraba. Aquí hay un solo número: se toma el de
// owner-panel donde ambos listaban el SKU (es la vista de la cadena completa)
// y se agregan los SKUs que solo branch-app tenía en Roma Sur.
const branchInventory = [
  { branchId: 1, productId: 'p1', qty: 30 },
  { branchId: 1, productId: 'p7', qty: 50 },
  { branchId: 1, productId: 'p9', qty: 200 },
  { branchId: 1, productId: 'p11', qty: 0 },
  { branchId: 1, productId: 'p13', qty: 25 },
  { branchId: 1, productId: 'p18', qty: 120 },

  { branchId: 2, productId: 'p1', qty: 20 },
  { branchId: 2, productId: 'p7', qty: 40 },
  { branchId: 2, productId: 'p9', qty: 150 },
  { branchId: 2, productId: 'p18', qty: 80 },

  // Condesa todavía no maneja 'p1' — la fila se abre sola cuando una
  // transferencia le lleve stock, en vez de listar todo el catálogo en las 15.
  { branchId: 3, productId: 'p7', qty: 26 },
  { branchId: 3, productId: 'p9', qty: 112 },
  { branchId: 3, productId: 'p18', qty: 60 },

  { branchId: 5, productId: 'p1', qty: 20 },
  { branchId: 5, productId: 'p7', qty: 40 },
  { branchId: 5, productId: 'p9', qty: 150 },
  { branchId: 5, productId: 'p18', qty: 80 },
];

// Mismos empleados que EMPLOYEES en owner-panel, con el email que la nómina
// necesita para cruzarse con la asistencia que captura branch-app. Los dos
// primeros son los usuarios de prueba reales de Cognito (ana = manager,
// luis = staff, ver staffDirectory.ts de branch-app y la "Nota operativa" del
// CLAUDE.md raíz) — así fichar entrada con la cuenta de prueba SÍ suma días a
// un empleado real de la nómina, que es justo lo que los mocks no podían.
const employees = [
  { id: 'emp-1', branchId: 1, name: 'Ana Sofía Martínez', email: 'ana@mucholoco.mx', role: 'manager' as const, dailyRate: 850, hireDate: new Date('2021-03-15'), active: true },
  { id: 'emp-2', branchId: 1, name: 'Luis Ángel Ortega', email: 'luis@mucholoco.mx', role: 'counter' as const, dailyRate: 500, hireDate: new Date('2023-06-01'), active: true },
  { id: 'emp-3', branchId: 2, name: 'Rodrigo Beltrán', email: 'rodrigo.beltran@mucholoco.mx', role: 'manager' as const, dailyRate: 850, hireDate: new Date('2020-11-10'), active: true },
  { id: 'emp-4', branchId: 2, name: 'Paulina Cortés', email: 'paulina.cortes@mucholoco.mx', role: 'counter' as const, dailyRate: 500, hireDate: new Date('2024-02-20'), active: true },
  { id: 'emp-5', branchId: 3, name: 'Mauricio Villalobos', email: 'mauricio.villalobos@mucholoco.mx', role: 'manager' as const, dailyRate: 850, hireDate: new Date('2022-01-05'), active: true },
  { id: 'emp-6', branchId: 3, name: 'Ximena Rosales', email: 'ximena.rosales@mucholoco.mx', role: 'counter' as const, dailyRate: 500, hireDate: new Date('2023-09-18'), active: true },
  { id: 'emp-7', branchId: 5, name: 'Alejandro Zúñiga', email: 'alejandro.zuniga@mucholoco.mx', role: 'manager' as const, dailyRate: 850, hireDate: new Date('2019-07-22'), active: true },
  { id: 'emp-8', branchId: 5, name: 'Renata Ibarra', email: 'renata.ibarra@mucholoco.mx', role: 'counter' as const, dailyRate: 500, hireDate: new Date('2024-08-12'), active: true },
  { id: 'emp-9', branchId: 5, name: 'Gael Contreras', email: 'gael.contreras@mucholoco.mx', role: 'coach' as const, dailyRate: 700, hireDate: new Date('2022-05-30'), active: true },
];

const expenses = [
  { id: 'exp-1', branchId: 1, category: 'rent' as const, description: 'Renta local Roma Sur', amount: 45000, date: new Date('2026-08-01') },
  { id: 'exp-2', branchId: 1, category: 'utilities' as const, description: 'CFE + agua Roma Sur', amount: 8200, date: new Date('2026-08-03') },
  { id: 'exp-3', branchId: 2, category: 'rent' as const, description: 'Renta local Roma Norte', amount: 38000, date: new Date('2026-08-01') },
  { id: 'exp-4', branchId: 3, category: 'maintenance' as const, description: 'Mantenimiento de equipo de cardio', amount: 12500, date: new Date('2026-08-05') },
  { id: 'exp-5', branchId: 5, category: 'supplies' as const, description: 'Papelería y artículos de limpieza', amount: 3100, date: new Date('2026-08-06') },
  { id: 'exp-6', branchId: null, category: 'marketing' as const, description: 'Campaña de redes sociales nacional', amount: 22000, date: new Date('2026-08-02') },
  { id: 'exp-7', branchId: null, category: 'other' as const, description: 'Nómina de oficina corporativa', amount: 65000, date: new Date('2026-08-01') },
];

// Quincenas. La primera va cerrada (ya se corrió su nómina en el mock) y la
// segunda abierta, para que el panel del dueño tenga algo que correr.
const payrollPeriods = [
  { id: 'period-1', startDate: new Date('2026-08-01'), endDate: new Date('2026-08-15'), totalDays: 15, status: 'closed' as const },
  { id: 'period-2', startDate: new Date('2026-08-16'), endDate: new Date('2026-08-31'), totalDays: 16, status: 'open' as const },
];

async function main() {
  // Antes que productos y tiers: los dos apuntan a una categoría fiscal.
  for (const category of taxCategories) {
    await prisma.taxCategory.upsert({ where: { id: category.id }, create: category, update: category });
  }
  for (const branch of branches) {
    // Prisma exige el sentinel Prisma.JsonNull para "esta columna JSON es
    // NULL" — un `null` de JS ahí significaría literalmente el string JSON "null".
    const data = { ...branch, promo: branch.promo ?? Prisma.JsonNull };
    await prisma.branch.upsert({ where: { id: branch.id }, create: data, update: data });
  }
  for (const product of products) {
    const data = { ...product, taxCategoryId: TAX_CATEGORY_BY_CAT[product.cat] };
    await prisma.product.upsert({ where: { id: product.id }, create: data, update: data });
  }
  for (const tier of membershipTiers) {
    const data = { ...tier, taxCategoryId: 'gym_membership' };
    await prisma.membershipTier.upsert({ where: { key: tier.key }, create: data, update: data });
  }
  for (const announcement of announcements) {
    await prisma.announcement.upsert({ where: { id: announcement.id }, create: announcement, update: announcement });
  }
  for (const link of socialLinks) {
    await prisma.socialLink.upsert({ where: { key: link.key }, create: link, update: link });
  }

  // SocialFeedPost no tiene una key
  // natural en el mock (nunca fueron editables ahí) — a diferencia de
  // branches/products/tiers/announcements/socialLinks, se re-siembran por
  // completo (delete + create) en vez de upsert por id generado.
  await prisma.socialFeedPost.deleteMany();
  await prisma.socialFeedPost.createMany({
    data: socialFeedPosts.map((post, i) => ({ ...post, sortOrder: i })),
  });

  for (const level of branchInventory) {
    await prisma.branchInventory.upsert({
      where: { branchId_productId: { branchId: level.branchId, productId: level.productId } },
      create: level,
      update: { qty: level.qty },
    });
  }
  for (const employee of employees) {
    await prisma.employee.upsert({ where: { id: employee.id }, create: employee, update: employee });
  }
  for (const expense of expenses) {
    await prisma.expense.upsert({ where: { id: expense.id }, create: expense, update: expense });
  }
  for (const period of payrollPeriods) {
    await prisma.payrollPeriod.upsert({ where: { id: period.id }, create: period, update: period });
  }

  console.log(
    `Seeded ${branches.length} branches, ${products.length} products, ${membershipTiers.length} membership tiers, ` +
      `${announcements.length} announcements, ${socialLinks.length} social links, ${socialFeedPosts.length} social feed posts, ` +
      `` +
      `${branchInventory.length} inventory levels, ${employees.length} employees, ${expenses.length} expenses, ${payrollPeriods.length} payroll periods.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
