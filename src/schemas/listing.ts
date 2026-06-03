'use client';

import { z } from 'zod';

export const listingFormSchema = z.object({
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
  category: z.string().min(1, 'Vă rugăm să selectați o categorie'),
});

export type ListingFormValues = z.infer<typeof listingFormSchema>;