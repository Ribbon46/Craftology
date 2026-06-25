'use client';

import { z } from 'zod';
import { CATEGORIES, SUBCATEGORY_PARENT } from '@/config/app';

const CATEGORY_KEYS = Object.keys(CATEGORIES) as [keyof typeof CATEGORIES, ...(keyof typeof CATEGORIES)[]];
const SUBCATEGORY_KEYS = Object.keys(SUBCATEGORY_PARENT) as [string, ...string[]];

export const listingFormSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Titlul trebuie să aibă cel puțin 3 caractere')
      .max(100, 'Titlul nu poate avea mai mult de 100 de caractere')
      .trim(),
    description: z
      .string()
      .min(20, 'Descrierea trebuie să aibă cel puțin 20 de caractere')
      .max(1000, 'Descrierea nu poate avea mai mult de 1000 de caractere')
      .trim(),
    price: z
      .number()
      .min(1, 'Prețul trebuie să fie cel puțin 1 leu')
      .max(1000000, 'Prețul nu poate depăși 1.000.000 de lei'),
    // Constrain to the known taxonomy so arbitrary values can't be injected
    // into the public feed/filters via a direct server-action call.
    category: z.enum(CATEGORY_KEYS),
    subcategory: z.enum(SUBCATEGORY_KEYS),
  })
  // The chosen subcategory must actually belong to the chosen category.
  .refine((d) => SUBCATEGORY_PARENT[d.subcategory] === d.category, {
    message: 'Subcategoria nu corespunde categoriei',
    path: ['subcategory'],
  });

export type ListingFormValues = z.infer<typeof listingFormSchema>;