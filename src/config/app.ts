// Craft'zaar Application Configuration
// Romanian language constants and branding settings

export const APP_NAME = "Craft'zaar";
export const APP_NAME_FULL = "Craft'zaar by Deco Kubik";

// Single source of truth for the legal/company identity shown on the
// Terms / Privacy / Returns pages. Update here → all three stay in sync.
export const COMPANY = {
  legalName: "Deco Kubik SRL",
  address: "Odobești 13, București",
  cui: "RO24386414",
  regCom: "J40/64417/2008",
  // Official contact from the lawyer's finalised Privacy Policy.
  email: "info.craftology.shop@gmail.com",
  legalUpdated: "2 iulie 2026",
} as const;

// Top-level categories (the home/search chips). Kept deliberately small —
// this is a curated artisan marketplace, not Temu. Each has subcategories
// below for the sell form + secondary filtering. No food/cosmetics category
// by design (handmade goods only).
export const CATEGORIES = {
  Accesorii: "Accesorii",
  Haine: "Haine",
  Home: "Home",
} as const;

export type CategoryKey = keyof typeof CATEGORIES;

// Subcategories per top-level category. Order = display order in the form +
// the secondary filter row. Expand freely; the first item is not special.
export const SUBCATEGORIES: Record<CategoryKey, readonly string[]> = {
  Accesorii: [
    "Bijuterii",
    "Genți & posete",
    "Căciuli & pălării",
    "Mănuși",
    "Șosete",
    "Ochelari",
    "Încălțăminte",
    "Eșarfe & fulare",
  ],
  Haine: [
    "Rochii",
    "Bluze & tricouri",
    "Pulovere & cardigane",
    "Jachete & paltoane",
    "Fuste",
    "Pantaloni",
    "Pentru copii",
  ],
  Home: [
    "Lumânări",
    "Ceramică",
    "Decorațiuni",
    "Textile (perne, pături)",
    "Bucătărie",
    "Artă de perete",
  ],
} as const;

// Flat lookup: subcategory label → its parent category (for validation +
// showing the right parent on a listing).
export const SUBCATEGORY_PARENT: Record<string, CategoryKey> = Object.fromEntries(
  (Object.keys(SUBCATEGORIES) as CategoryKey[]).flatMap((cat) =>
    SUBCATEGORIES[cat].map((sub) => [sub, cat]),
  ),
);

export const CATEGORY_LABELS = CATEGORIES;

// Report reasons (buyer flags a product/seller). Kept here (not in the
// 'use server' action file, which may only export async functions) so both the
// action and the UI can import the labels.
export const REPORT_REASONS = [
  { value: 'not_handmade', label: 'Nu pare handmade (ex: din import)' },
  { value: 'not_artisan', label: 'Vânzătorul nu pare artizan' },
  { value: 'prohibited', label: 'Produs interzis / neconform' },
  { value: 'other', label: 'Altceva' },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]['value'];

export const BOTTOM_NAV_ITEMS = [
  { id: 'home', label: 'Acasă', icon: 'home', href: '/' },
  { id: 'search', label: 'Căutare', icon: 'search', href: '/search' },
  { id: 'sell', label: '+ Vinde', icon: 'plus', href: '/sell' },
  { id: 'messages', label: 'Mesaje', icon: 'message-square', href: '/messages' },
  { id: 'profile', label: 'Profil', icon: 'user', href: '/profile' },
] as const;

export const PRICING = {
  currency: 'RON',
  symbol: 'lei',
  decimalPlaces: 2
};

export const PLACEHOLDERS = {
  avatar: 'https://ui-avatars.com/api/?name=Utilizator&background=f0d9cc&color=984427&size=128',
  listing: 'https://placehold.co/600x600/f0d9cc/984427?text=Imagine+produs',
};

export const MESSAGES = {
  authRequired: 'Vă rugăm să vă autentificați pentru a accesa această funcție.',
  listingCreated: 'Produsul a fost adăugat cu succes!',
  messageSent: 'Mesajul a fost trimis.',
  error: 'A apărut o eroare. Vă rugăm să încercați din nou.',
  noListings: 'Nu există produse în această categorie momentan.',
  loadMore: 'Încarcă mai mult',
  endOfFeed: 'Ai văzut toate produsele',
  sellPrompt: 'Vinde un produs handmade',
  chatPrompt: 'Scrie un mesaj…',
};

export const STYLES = {
  mobileMaxWidth: '640px',
  safeAreaBottom: 'env(safe-area-inset-bottom, 0px)',
  safeAreaTop: 'env(safe-area-inset-top, 0px)',
};