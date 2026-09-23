// Craft'zaar Application Configuration
// Romanian language constants and branding settings

/** Romanian standard VAT rate. Prices are always shown final (VAT-inclusive
 *  when the seller charges it) — this is used only to break the amount down. */
export const VAT_RATE = 0.21;

export const APP_NAME = "Craft'zaar";
export const APP_NAME_FULL = "Craft'zaar | Produse handmade românești";

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

/** The buyer is always refunded in full when an order is cancelled (by anyone,
 *  at any time). Craft'zaar's commission on a marketplace order goes back to
 *  the seller only when the cancellation happens within this many hours of
 *  the order; after that the platform keeps it (owner's rule, sep 2026).
 *  The seller dashboard also counts orders this recent as "new". */
export const COMMISSION_REFUND_WINDOW_HOURS = 48;

/** Whether cancelling an order placed at `createdAt` returns the commission,
 *  judged at `at` (now by default). */
export function commissionRefundable(createdAt: string, at: number = Date.now()): boolean {
  return at - new Date(createdAt).getTime() <= COMMISSION_REFUND_WINDOW_HOURS * 3_600_000;
}

/** Why a seller refuses an order. The label is what the buyer reads in the
 *  cancellation email; "other" requires the seller to write the reason. */
export const SELLER_CANCEL_REASONS = [
  { code: "out_of_stock", label: "Produsul nu mai este disponibil în stoc" },
  { code: "damaged", label: "Produsul s-a deteriorat și nu mai poate fi livrat" },
  { code: "cannot_ship", label: "Nu putem livra la adresa sau în termenul cerut" },
  { code: "listing_error", label: "Eroare de preț sau în descrierea produsului" },
  { code: "buyer_request", label: "La cererea clientului" },
  { code: "other", label: "Alt motiv" },
] as const;

export type SellerCancelReasonCode = (typeof SELLER_CANCEL_REASONS)[number]["code"];

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