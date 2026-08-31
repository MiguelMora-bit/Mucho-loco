import type { Branch, Coach, Product, Announcement, Lang, ProductCat, Translations } from '@mucho-loco/types';

export const I18N: Record<Lang, Translations> = {
  es: {
    nav: { gym: "El Gym", branches: "Sucursales", coaches: "Coaches", memberships: "Membresías", shop: "Tienda", contact: "Contacto" },
    hero: {
      live: "15 SUCURSALES · CDMX & EDO. MÉX.",
      titleA: "ES HORA", titleB: "DE LIBERAR", titleC: "A LA BESTIA",
      lead: "Entrena como toro suelto. 15 sucursales, los mejores coaches y la energía más intensa de la ciudad. Tú vienes con el hambre, nosotros ponemos el incendio.",
      ctaJoin: "ÚNETE AL CAOS", ctaTour: "AGENDA TU TOUR",
    },
    stats: [
      { n: "15", l: "Sucursales" }, { n: "120+", l: "Coaches certificados" },
      { n: "5-23H", l: "Horario amplio" }, { n: "12K+", l: "Locos activos" },
    ],
    branches: { eyebrow: "Encuentra tu manada", titleA: "MAPA DEL", titleB: "INFIERNO", sub: "15 sucursales ardiendo por todo el país. Toca un pin para ver fotos, instructores y precios.", quote: "Cada sucursal es una jaula distinta. Encuentra la tuya.", classes: "Clases", coaches: "Coaches", price: "Desde", viewMore: "Ver detalles", hours: "Horario" },
    coaches: { eyebrow: "Los que prenden la mecha", titleA: "TUS", titleB: "COACHES", sub: "No son influencers. Son los que te van a romper en mil pedazos para que vuelvas más fuerte.", quote: "Si no te grita, no te quiere. Acostúmbrate.", spec: "Especialidad", branch: "Sucursal" },
    memberships: { eyebrow: "Sin letra chica", titleA: "MEMBRESÍAS", titleB: "QUE QUEMAN", sub: "Precios reales por sucursal. También entras con TotalPass y Wellhub.", visit: "Visita", weekly: "Semana", monthly: "Mes", quarterly: "Trimestral", annual: "Anual", popular: "MÁS LOCO", choose: "Elegir sucursal", select: "Seleccionar", perks: ["Acceso en horario amplio","Todas las clases","Locker incluido","Invitado al mes","Asesoría nutricional","App con rutinas"], partners: "Acceso con tus apps de bienestar", partnersSub: "Si tu empresa te da TotalPass o Wellhub, entras directo. Solo presenta tu QR en recepción." },
    shop: { eyebrow: "Combustible para fieras", titleA: "MUCHO LOCO", titleB: "STORE", sub: "Lo que tomamos los locos. Recoge en sucursal o te lo mandamos a casa.", filterAll: "Todo", add: "Al carrito", added: "AGREGADO", quote: "No es magia, es química. Y huevos." },
    cart: { title: "Tu Bolsa Loca", empty: "La bolsa está más vacía que tu motivación de lunes.", subtotal: "Subtotal", checkout: "Pagar ahora", remove: "Quitar", continue: "Seguir comprando" },
    contact: { eyebrow: "Háblanos sin miedo", titleA: "VENTE A", titleB: "QUEMARLA", sub: "Reserva un día gratis, pregunta lo que quieras o búscanos en redes.", name: "Nombre", email: "Correo", branch: "Sucursal de interés", message: "Cuéntanos qué te trae", send: "MANDAR", followUs: "Síguenos" },
    avisos: { board: "Avisos", title: "TABLÓN DE AVISOS", sub: "Todo lo que está prendiendo en Mucho Loco.", empty: "Sin avisos por ahora.", close: "Cerrar", newTag: "NUEVO", seeAll: "Ver todos los avisos" },
  },
  en: {
    nav: { gym: "The Gym", branches: "Locations", coaches: "Coaches", memberships: "Memberships", shop: "Shop", contact: "Contact" },
    hero: {
      live: "15 LOCATIONS · MEXICO CITY METRO",
      titleA: "IT'S TIME", titleB: "TO UNLEASH", titleC: "THE BEAST",
      lead: "Train like a loose bull. 15 locations, the meanest coaches in town and the most savage energy. You bring the hunger — we bring the fire.",
      ctaJoin: "JOIN THE CHAOS", ctaTour: "BOOK A TOUR",
    },
    stats: [
      { n: "15", l: "Locations" }, { n: "120+", l: "Certified coaches" },
      { n: "5-23H", l: "Wide schedule" }, { n: "12K+", l: "Active members" },
    ],
    branches: { eyebrow: "Find your pack", titleA: "MAP OF THE", titleB: "INFERNO", sub: "15 locations burning across the country. Tap a pin for pics, coaches and pricing.", quote: "Every location is a different cage. Pick yours.", classes: "Classes", coaches: "Coaches", price: "From", viewMore: "View details", hours: "Hours" },
    coaches: { eyebrow: "The ones who light the fuse", titleA: "YOUR", titleB: "COACHES", sub: "Not influencers. The ones who'll wreck you so you come back stronger.", quote: "If they don't yell, they don't care. Get used to it.", spec: "Specialty", branch: "Location" },
    memberships: { eyebrow: "No fine print", titleA: "MEMBERSHIPS", titleB: "THAT BURN", sub: "Real prices per location. TotalPass & Wellhub also accepted.", visit: "Day Pass", weekly: "Weekly", monthly: "Monthly", quarterly: "Quarterly", annual: "Annual", popular: "MOST LOCO", choose: "Pick location", select: "Select", perks: ["Wide schedule access","All classes","Locker included","One guest/month","Nutrition coaching","App with workouts"], partners: "Access with your wellness apps", partnersSub: "If your company gives you TotalPass or Wellhub, you're in. Just show your QR at the counter." },
    shop: { eyebrow: "Fuel for beasts", titleA: "MUCHO LOCO", titleB: "STORE", sub: "What us locos drink. Pickup at any branch or we ship it.", filterAll: "All", add: "Add to bag", added: "ADDED", quote: "It's not magic. It's chemistry. And balls." },
    cart: { title: "Your Loco Bag", empty: "Bag is emptier than your Monday motivation.", subtotal: "Subtotal", checkout: "Checkout", remove: "Remove", continue: "Keep shopping" },
    contact: { eyebrow: "Talk to us, no fear", titleA: "COME", titleB: "BURN IT", sub: "Book a free day pass, ask anything, or hit us on socials.", name: "Name", email: "Email", branch: "Location of interest", message: "Tell us what brings you", send: "SEND IT", followUs: "Follow us" },
    avisos: { board: "News", title: "NEWS BOARD", sub: "Everything that's on fire at Mucho Loco.", empty: "No news right now.", close: "Close", newTag: "NEW", seeAll: "See all news" },
  }
};

export const BRANCHES: Branch[] = [
  { id: 1,  name: "ROMA SUR",       city: "CDMX",        addr: "Av. Cuauhtémoc 612, Roma Sur",               phone: "55 5564 1101", x: 0.46, y: 0.57, classes: 26, coaches: 9,  price: 1090, tier: "Premium", featured: true,  hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70" },
  { id: 2,  name: "ROMA NORTE",     city: "CDMX",        addr: "Álvaro Obregón 185, Roma Norte",             phone: "55 5208 9923", x: 0.47, y: 0.56, classes: 22, coaches: 7,  price: 1090, tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=900&q=70" },
  { id: 3,  name: "CONDESA",        city: "CDMX",        addr: "Av. Tamaulipas 90, Hipódromo Condesa",       phone: "55 5212 4477", x: 0.45, y: 0.58, classes: 24, coaches: 8,  price: 1190, tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1540497077202-7c8a3999166f?auto=format&fit=crop&w=900&q=70" },
  { id: 4,  name: "INTERLOMAS",     city: "Edo. Méx.",   addr: "Blvd. Magnocentro 26, Huixquilucan",        phone: "55 5290 1010", x: 0.42, y: 0.54, classes: 26, coaches: 8,  price: 1190, tier: "Premium", featured: true,  hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=70" },
  { id: 5,  name: "SANTA FE",       city: "CDMX",        addr: "Vasco de Quiroga 3800, Santa Fe",            phone: "55 5292 7733", x: 0.43, y: 0.56, classes: 30, coaches: 11, price: 1390, tier: "Premium",                 hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1593079831268-3381b0db4a77?auto=format&fit=crop&w=900&q=70" },
  { id: 6,  name: "DEL VALLE",      city: "CDMX",        addr: "Av. Cuauhtémoc 1235, Del Valle",             phone: "55 5536 8821", x: 0.46, y: 0.59, classes: 20, coaches: 6,  price: 990,  tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1576678927484-cc907957088c?auto=format&fit=crop&w=900&q=70" },
  { id: 7,  name: "COYOACÁN",       city: "CDMX",        addr: "Av. Universidad 1900, Coyoacán",             phone: "55 5658 4412", x: 0.46, y: 0.61, classes: 18, coaches: 5,  price: 890,  tier: "Lite",                    hours: "5:00 — 22:00", img: "https://images.unsplash.com/photo-1623874514711-0f321325f318?auto=format&fit=crop&w=900&q=70" },
  { id: 8,  name: "SATELITE",       city: "Edo. Méx.",   addr: "Blvd. Manuel Ávila Camacho 2350, Naucalpan", phone: "55 5374 3322", x: 0.44, y: 0.53, classes: 24, coaches: 8,  price: 1090, tier: "Core",    featured: true,  hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?auto=format&fit=crop&w=900&q=70" },
  { id: 9,  name: "PEDREGAL",       city: "CDMX",        addr: "Periférico Sur 4690, Jardines del Pedregal", phone: "55 5645 6677", x: 0.44, y: 0.62, classes: 22, coaches: 7,  price: 1190, tier: "Premium",                 hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=900&q=70" },
  { id: 10, name: "ECATEPEC",       city: "Edo. Méx.",   addr: "Av. Central 145, Ecatepec",                  phone: "55 5775 9988", x: 0.48, y: 0.52, classes: 20, coaches: 6,  price: 790,  tier: "Lite",                    hours: "5:00 — 22:00", img: "https://images.unsplash.com/photo-1568599924649-b5c0e0a2b5dd?auto=format&fit=crop&w=900&q=70" },
  { id: 11, name: "TLALNEPANTLA",   city: "Edo. Méx.",   addr: "Av. Mario Colín 220, Tlalnepantla",          phone: "55 5390 4433", x: 0.46, y: 0.52, classes: 20, coaches: 6,  price: 890,  tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1605296867304-46d5465a13f1?auto=format&fit=crop&w=900&q=70" },
  { id: 12, name: "TOLUCA",         city: "Edo. Méx.",   addr: "Paseo Tollocan 800, Toluca",                 phone: "72 2280 7766", x: 0.40, y: 0.55, classes: 22, coaches: 7,  price: 890,  tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1517344884509-a0c97ec11bcc?auto=format&fit=crop&w=900&q=70" },
  { id: 13, name: "CUAJIMALPA",     city: "CDMX",        addr: "Av. Veracruz 24, Cuajimalpa",               phone: "55 5814 1122", x: 0.42, y: 0.57, classes: 22, coaches: 7,  price: 1090, tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=900&q=70" },
  { id: 14, name: "CUAUTITLÁN",     city: "Edo. Méx.",   addr: "Blvd. Ayuntamiento 92, Cuautitlán Izcalli", phone: "55 5870 0099", x: 0.45, y: 0.51, classes: 18, coaches: 5,  price: 790,  tier: "Lite",                    hours: "5:00 — 22:00", img: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=900&q=70" },
  { id: 15, name: "TLALPAN",        city: "CDMX",        addr: "Calz. de Tlalpan 4860, Tlalpan",            phone: "55 5573 2244", x: 0.46, y: 0.63, classes: 20, coaches: 6,  price: 890,  tier: "Core",                    hours: "5:00 — 23:00", img: "https://images.unsplash.com/photo-1571019613540-996a73c44a14?auto=format&fit=crop&w=900&q=70" },
];

export const COACHES: Coach[] = [
  { name: "DIEGO 'EL TORO' RAMÍREZ",  spec: "Powerlifting · Hypertrofia",    branch: "Roma Sur",    img: "https://images.unsplash.com/photo-1567013127542-490d757e51fc?auto=format&fit=crop&w=600&q=70" },
  { name: "RENATA CASTRO",            spec: "HIIT · Boxeo funcional",         branch: "Roma Norte",  img: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=600&q=70" },
  { name: "CARLOS MUÑOZ",             spec: "Strongman · Crosstraining",      branch: "Santa Fe",    img: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=600&q=70" },
  { name: "VALERIA 'LA FIERA' OLMOS", spec: "Glúteo · Hip thrust",            branch: "Interlomas",  img: "https://images.unsplash.com/photo-1609899537878-88d5ba429bdf?auto=format&fit=crop&w=600&q=70" },
  { name: "MARCO ANTONIO LEÓN",       spec: "Calistenia · Movilidad",         branch: "Condesa",     img: "https://images.unsplash.com/photo-1583500178690-f7fd39c2bf8d?auto=format&fit=crop&w=600&q=70" },
  { name: "ALEX 'EL CHAMUCO' VEGA",   spec: "Boxeo · MMA conditioning",       branch: "Satelite",    img: "https://images.unsplash.com/photo-1583468982228-19f19164aee2?auto=format&fit=crop&w=600&q=70" },
  { name: "ISABELLA TORRES",          spec: "Yoga & Mobility brutal",         branch: "Pedregal",    img: "https://images.unsplash.com/photo-1518310383802-640c2de681b3?auto=format&fit=crop&w=600&q=70" },
  { name: "JONATHAN 'POLLO' RUIZ",    spec: "Bodybuilding · Pre-contest",     branch: "Toluca",      img: "https://images.unsplash.com/photo-1581009137042-c552e485697a?auto=format&fit=crop&w=600&q=70" },
];

export const PRODUCTS: Product[] = [
  { id: 'p1',  cat: 'proteinas', name: 'Whey Protein 5LBS',           flav: 'Strawberry',        price: 1290, img: '/assets/prod-whey-strawberry.jpg', tag: 'BEST' },
  { id: 'p2',  cat: 'proteinas', name: 'Whey Protein 2.2LBS',         flav: 'Cappuccino',        price: 990,  img: '/assets/prod-whey-cappuccino.jpg' },
  { id: 'p3',  cat: 'proteinas', name: 'Whey Protein 2.2LBS',         flav: 'Cookies & Cream',   price: 990,  img: '/assets/prod-whey-flavors.jpg' },
  { id: 'p4',  cat: 'proteinas', name: 'Whey Protein 2.2LBS',         flav: 'Sprinkle Donut',    price: 990,  img: '/assets/prod-whey-flavors.jpg', tag: 'NEW' },
  { id: 'p5',  cat: 'proteinas', name: 'Whey Protein 1KG',            flav: 'Cinnamon Roll',     price: 690,  img: '/assets/prod-whey-flavors.jpg' },
  { id: 'p6',  cat: 'proteinas', name: 'Whey Protein 1KG',            flav: 'Chocolate',         price: 690,  img: '/assets/prod-whey-flavors.jpg' },
  { id: 'p7',  cat: 'pre',       name: 'Pre-Entreno Bestia',          flav: 'Mango Chamoy',      price: 790,  img: '/assets/prod-pre-mango.jpg', tag: 'HOT' },
  { id: 'p8',  cat: 'pre',       name: 'Creatine Monohydrate',        flav: '500g · 5g por servicio', price: 590, img: '/assets/prod-creatine.jpg' },
  { id: 'p9',  cat: 'energy',    name: 'Mucho Loco Energy 473ml',     flav: 'Mora-Uva',          price: 45,   img: '/assets/prod-energy.jpg' },
  { id: 'p10', cat: 'energy',    name: 'Mucho Loco Energy 473ml',     flav: 'Sin azúcar',        price: 45,   img: '/assets/prod-energy.jpg' },
  { id: 'p11', cat: 'gomitas',   name: "BCAA's en polvo",             flav: 'Watermelon',        price: 690,  img: '/assets/prod-bcaa.jpg' },
  { id: 'p12', cat: 'gomitas',   name: "BCAA's en polvo",             flav: 'Blueberry',         price: 690,  img: '/assets/prod-bcaa.jpg' },
  { id: 'p13', cat: 'gomitas',   name: 'Goma de Mascar Energética',   flav: 'Energía Bestial',   price: 95,   img: '/assets/prod-goma.jpg', tag: 'NEW' },
  { id: 'p14', cat: 'gomitas',   name: 'Goma de Mascar Sin Límite',   flav: 'Cafeína + taurina', price: 95,   img: '/assets/prod-goma.jpg' },
  { id: 'p15', cat: 'gomitas',   name: 'Goma de Mascar Bestia',       flav: 'Cafeína + taurina', price: 95,   img: '/assets/prod-goma.jpg' },
  { id: 'p16', cat: 'agua',      name: 'Agua Mucho 1L',               flav: 'Natural',           price: 25,   img: '/assets/prod-energy.jpg' },
  { id: 'p17', cat: 'agua',      name: 'Agua Electrolitos 750ml',     flav: 'Limón sal',         price: 45,   img: '/assets/prod-bcaa.jpg' },
  { id: 'p18', cat: 'merch',     name: 'Shaker Loco',                 flav: '700ml',             price: 290,  img: '/assets/mucho-loco-logo.jpg' },
];

export const PRODUCT_CATS: Record<Lang, Record<'all' | ProductCat, string>> = {
  es: { all: 'TODO', proteinas: 'PROTEÍNAS', pre: 'PRE-ENTRENO', energy: 'ENERGÉTICAS', gomitas: 'GOMITAS & CHICLES', agua: 'HIDRATACIÓN', merch: 'MERCH' },
  en: { all: 'ALL',  proteinas: 'PROTEIN',   pre: 'PRE-WORKOUT', energy: 'ENERGY',      gomitas: 'GUMMIES & GUM',     agua: 'HYDRATION',   merch: 'MERCH' },
};

export const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'aniv-8',
    type: 'fiesta',
    badge: { es: 'FIESTA', en: 'PARTY' },
    date: '2026-06-21',
    dateLabel: { es: '21 JUN · 21:00', en: 'JUN 21 · 9:00 PM' },
    title: { es: '8 AÑOS DE PURO FUEGO', en: '8 YEARS OF PURE FIRE' },
    subtitle: { es: 'Fiesta de aniversario Mucho Loco', en: 'Mucho Loco anniversary party' },
    body: {
      es: 'Cumplimos 8 años incendiando la ciudad y lo vamos a celebrar a lo grande. Música en vivo, food trucks, retas de fuerza, rifas de membresías anuales y mucha proteína. Entrada gratis para socios + 1 invitado.',
      en: 'We turn 8 years setting the city on fire, and we will celebrate big. Live music, food trucks, strength challenges, annual membership raffles and lots of protein. Free entry for members + 1 guest.',
    },
    cta: { es: 'CONFIRMAR ASISTENCIA', en: 'RSVP NOW' },
    location: { es: 'Sucursal Roma Sur · Terraza', en: 'Roma Sur · Rooftop' },
    emoji: '🎉',
    accent: '#e1141c',
  },
  {
    id: 'pre-mango',
    type: 'producto',
    badge: { es: 'NUEVO PRODUCTO', en: 'NEW DROP' },
    date: '2026-06-10',
    dateLabel: { es: 'YA DISPONIBLE', en: 'OUT NOW' },
    title: { es: 'PRE-ENTRENO BESTIA · MANGO CHAMOY', en: 'BEAST PRE-WORKOUT · MANGO CHAMOY' },
    subtitle: { es: 'El sabor más loco de la tienda', en: 'The wildest flavor in the store' },
    body: {
      es: 'Llegó el nuevo Pre-Entreno Bestia sabor Mango Chamoy. 300mg de cafeína, beta-alanina y un golpe de chile que despierta a cualquiera. Lánzate a la tienda y pruébalo con 15% de descuento de lanzamiento.',
      en: 'The new Beast Pre-Workout in Mango Chamoy is here. 300mg caffeine, beta-alanine and a chili kick that wakes anyone up. Hit the store and try it with 15% launch discount.',
    },
    cta: { es: 'VER EN LA TIENDA', en: 'SHOP NOW' },
    link: '/producto/p7',
    location: { es: 'Tienda Mucho Loco', en: 'Mucho Loco Store' },
    emoji: '🔥',
    accent: '#ff6b1a',
  },
  {
    id: 'reto-verano',
    type: 'reunion',
    badge: { es: 'RETO ESPECIAL', en: 'CHALLENGE' },
    date: '2026-07-01',
    dateLabel: { es: '1 JUL — 31 JUL', en: 'JUL 1 — JUL 31' },
    title: { es: 'RETO VERANO: 20 DÍAS', en: 'SUMMER CHALLENGE: 20 DAYS' },
    subtitle: { es: 'Entrena 20 días en julio y gana premios', en: 'Train 20 days in July and win prizes' },
    body: {
      es: 'Asiste 20 días durante julio y participa por un año de membresía gratis, kits de suplementos y merch exclusivo. Registra tu asistencia con tu QR y sigue tu avance en el tablón del gym.',
      en: 'Show up 20 days during July and enter to win a free year membership, supplement kits and exclusive merch. Track attendance with your QR and follow your progress on the gym board.',
    },
    cta: { es: 'INSCRIBIRME AL RETO', en: 'JOIN THE CHALLENGE' },
    location: { es: 'Todas las sucursales', en: 'All locations' },
    emoji: '🏆',
    accent: '#ffb627',
  },
];
