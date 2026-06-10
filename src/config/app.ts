// Craftology Application Configuration
// Romanian language constants and branding settings

export const APP_NAME = "Craftology";
export const APP_NAME_FULL = "Craftology by Deco Kubik";

export const CATEGORIES = {
  Bijuterii: "Bijuterii",
  Haine: "Haine",
  Lumânări: "Lumânări",
  Accesorii: "Accesorii",
  Frumusețe: "Frumusețe"
} as const;

export const CATEGORY_LABELS = {
  Bijuterii: "Bijuterii",
  Haine: "Haine",
  Lumânări: "Lumânări",
  Accesorii: "Accesorii",
  Frumusețe: "Frumusețe"
};

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