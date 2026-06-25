import { z } from 'zod';

export const reviewSchema = z
  .object({
    // A product review carries listingId; a pure seller review carries sellerId.
    listingId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    rating: z.number().int().min(1, 'Alege un punctaj').max(5),
    comment: z
      .string()
      .trim()
      .max(1000, 'Comentariul nu poate depăși 1000 de caractere')
      .optional(),
  })
  .refine((d) => d.listingId || d.sellerId, { message: 'Lipsește ținta recenziei', path: ['listingId'] });

export type ReviewInput = z.infer<typeof reviewSchema>;
