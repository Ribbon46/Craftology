// Shared mock dataset for demo mode (when Supabase isn't configured yet).
// A single source of truth so the feed, search, and listing-detail pages all
// agree — clicking a card opens the matching product, not a hardcoded one.

export interface SellerProfile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  rating: number | null;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  image_urls: string[];
  seller_id: string;
  status: 'active' | 'sold';
  created_at: string;
  profiles: SellerProfile | null;
}

/** A neutral, always-available avatar generated from the seller's name —
 *  tinted clay-soft/clay-deep so it sits in the Atelier palette. */
export function avatarFor(name: string): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=f0d9cc&color=984427&size=128`;
}

function img(text: string): string {
  return `https://placehold.co/600x600/f0d9cc/984427?text=${encodeURIComponent(text)}`;
}

function seller(id: string, username: string, full_name: string, rating: number): SellerProfile {
  return { id, username, full_name, avatar_url: avatarFor(full_name), rating };
}

const SELLERS = {
  maria: seller('user-1', 'maria_p', 'Maria Popescu', 4.8),
  andrei: seller('user-2', 'andrei_c', 'Andrei Constantin', 4.9),
  elena: seller('user-3', 'elena_d', 'Elena Dumitru', 4.7),
  roxana: seller('user-4', 'roxana_k', 'Roxana Kovacs', 4.6),
  cristi: seller('user-5', 'cristi_m', 'Cristian Marin', 4.9),
  dana: seller('user-6', 'dana_b', 'Dana Barbu', 4.7),
  ioana: seller('user-7', 'ioana_v', 'Ioana Vasile', 4.8),
};

export const MOCK_LISTINGS: Listing[] = [
  {
    id: '1',
    title: 'Colier Mărgele Colorate - Handmade',
    description:
      'Un colier unic, lucrat manual din mărgele colorate de sticlă. Fiecare piesă este realizată cu atenție și pasiune. Ideal ca un cadou special sau pentru a-ți completa ținuta cu un accent handmade autentic.',
    price: 85,
    category: 'Bijuterii',
    image_urls: [img('Colier margele'), img('Colier margele lateral'), img('Colier margele detaliu')],
    seller_id: SELLERS.maria.id,
    status: 'active',
    created_at: '2026-06-01T09:00:00.000Z',
    profiles: SELLERS.maria,
  },
  {
    id: '2',
    title: 'Pantofi Piele Artizanal - Românești',
    description:
      'Pantofi din piele naturală, cusuți manual de un meșter român. Confortabili, durabili și eleganți, potriviți pentru orice ocazie.',
    price: 250,
    category: 'Haine',
    image_urls: [img('Pantofi piele'), img('Pantofi piele talpa')],
    seller_id: SELLERS.andrei.id,
    status: 'active',
    created_at: '2026-05-31T12:30:00.000Z',
    profiles: SELLERS.andrei,
  },
  {
    id: '3',
    title: 'Lumânare artizanală cu ulei esențial',
    description:
      'Lumânare din ceară naturală de soia, parfumată cu uleiuri esențiale pure. Ardere lungă și o aromă fină care relaxează atmosfera oricărei camere.',
    price: 45,
    category: 'Lumânări',
    image_urls: [img('Lumanare'), img('Lumanare aprinsa')],
    seller_id: SELLERS.elena.id,
    status: 'active',
    created_at: '2026-05-30T08:15:00.000Z',
    profiles: SELLERS.elena,
  },
  {
    id: '4',
    title: 'Brățară Mărgele Tăiate Manual',
    description:
      'Brățară delicată din mărgele tăiate și lustruite manual. Se potrivește perfect cu colierul asortat din colecția noastră handmade.',
    price: 65,
    category: 'Bijuterii',
    image_urls: [img('Bratara margele'), img('Bratara detaliu')],
    seller_id: SELLERS.maria.id,
    status: 'active',
    created_at: '2026-05-29T15:45:00.000Z',
    profiles: SELLERS.maria,
  },
  {
    id: '5',
    title: 'Cămașă Bumbac Artizanal',
    description:
      'Cămașă din bumbac 100% natural, cu broderie tradițională cusută manual. O piesă vestimentară unică, inspirată din motivele populare românești.',
    price: 180,
    category: 'Haine',
    image_urls: [img('Camasa bumbac'), img('Camasa broderie')],
    seller_id: SELLERS.roxana.id,
    status: 'active',
    created_at: '2026-05-28T10:00:00.000Z',
    profiles: SELLERS.roxana,
  },
  {
    id: '6',
    title: 'Set Lumânări Parfumate',
    description:
      'Set de trei lumânări parfumate, perfecte pentru a crea o ambianță caldă. Realizate din ceară naturală, fără aditivi sintetici.',
    price: 120,
    category: 'Lumânări',
    image_urls: [img('Set lumanari'), img('Set lumanari cutie')],
    seller_id: SELLERS.cristi.id,
    status: 'active',
    created_at: '2026-05-27T18:20:00.000Z',
    profiles: SELLERS.cristi,
  },
  {
    id: '7',
    title: 'Plic din piele naturală',
    description:
      'Plic (clutch) din piele naturală, lucrat manual. Compartiment spațios și finisaje atente — accesoriul ideal pentru o ținută elegantă.',
    price: 150,
    category: 'Accesorii',
    image_urls: [img('Plic piele'), img('Plic piele interior')],
    seller_id: SELLERS.dana.id,
    status: 'active',
    created_at: '2026-05-26T11:10:00.000Z',
    profiles: SELLERS.dana,
  },
  {
    id: '8',
    title: 'Cremă hidratantă artizanală',
    description:
      'Cremă hidratantă naturală, preparată în loturi mici din ingrediente bio. Hrănește pielea fără parfumuri sau conservanți sintetici.',
    price: 55,
    category: 'Frumusețe',
    image_urls: [img('Crema'), img('Crema textura')],
    seller_id: SELLERS.ioana.id,
    status: 'active',
    created_at: '2026-05-25T14:05:00.000Z',
    profiles: SELLERS.ioana,
  },
];

export function findMockListing(id: string): Listing | null {
  return MOCK_LISTINGS.find((l) => l.id === id) ?? null;
}
