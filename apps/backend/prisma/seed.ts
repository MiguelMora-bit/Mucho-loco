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
    factor: 1.5,
    popular: true,
    perks: {
      es: ['Acceso a las 15 sucursales', 'Todas las clases en cualquier sede', 'Locker incluido', 'Horario completo en todas', 'Invitado al mes', 'Asesoría nutricional', 'App con rutinas'],
      en: ['Access to all 15 gyms', 'All classes at any location', 'Locker included', 'Full schedule everywhere', 'One guest/month', 'Nutrition coaching', 'App with workouts'],
    },
    badge: { es: '15 SUCURSALES', en: '15 GYMS' },
  },
];

async function main() {
  for (const branch of branches) {
    // Prisma exige el sentinel Prisma.JsonNull para "esta columna JSON es
    // NULL" — un `null` de JS ahí significaría literalmente el string JSON "null".
    const data = { ...branch, promo: branch.promo ?? Prisma.JsonNull };
    await prisma.branch.upsert({ where: { id: branch.id }, create: data, update: data });
  }
  for (const product of products) {
    await prisma.product.upsert({ where: { id: product.id }, create: product, update: product });
  }
  for (const tier of membershipTiers) {
    await prisma.membershipTier.upsert({ where: { key: tier.key }, create: tier, update: tier });
  }
  console.log(`Seeded ${branches.length} branches, ${products.length} products, ${membershipTiers.length} membership tiers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
