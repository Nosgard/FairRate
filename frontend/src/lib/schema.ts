/** Form validation rules. Deliberately mirrors ReviewInput in the backend
 *  (app/core/models.py) — the backend stays authoritative, this is here so
 *  the user sees a problem before a request is sent, not after. */

import { z } from "zod";

export const VENUE_CATEGORIES = [
  "restaurant",
  "cafe",
  "bar",
  "hotel",
  "cinema",
  "theatre",
  "museum",
  "shop",
  "service",
  "other",
] as const;

export const TONES = ["neutral", "friendly", "concise"] as const;

export const PERSPECTIVES = ["impersonal", "i", "we"] as const;

/** The messages the rules below put on screen. Declared here rather than
 *  imported from the dictionary so the schema stays free of the i18n layer;
 *  the dictionary implements this shape instead. */
export interface ValidationMessages {
  venueTooLong: string;
  tooLong: string;
  needOneField: string;
}

/** Built per language rather than once at module load: the messages are
 *  shown to the user, so they have to follow the interface. */
export function createReviewFormSchema(messages: ValidationMessages) {
  return z
    .object({
      venue_name: z.string().trim().max(120, messages.venueTooLong),
      category: z.enum(VENUE_CATEGORIES),
      liked: z.string().trim().max(2000, messages.tooLong),
      disliked: z.string().trim().max(2000, messages.tooLong),
      suggestions: z.string().trim().max(1000, messages.tooLong),
      tone: z.enum(TONES),
      perspective: z.enum(PERSPECTIVES),
    })
    // Mirrors require_content in the backend: without either field there is
    // nothing to review. Attached to `liked` so the message appears at a
    // field rather than floating above the form.
    .refine((data) => data.liked.length > 0 || data.disliked.length > 0, {
      message: messages.needOneField,
      path: ["liked"],
    });
}

export type ReviewFormValues = z.infer<
  ReturnType<typeof createReviewFormSchema>
>;
