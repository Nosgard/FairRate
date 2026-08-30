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

export const reviewFormSchema = z
  .object({
    venue_name: z
      .string()
      .trim()
      .min(2, "Please enter at least two characters.")
      .max(120, "That name is too long."),
    category: z.enum(VENUE_CATEGORIES),
    liked: z.string().trim().max(2000, "That is a bit too long."),
    disliked: z.string().trim().max(2000, "That is a bit too long."),
    suggestions: z.string().trim().max(1000, "That is a bit too long."),
    tone: z.enum(TONES),
    perspective: z.enum(PERSPECTIVES),
  })
  // Mirrors require_content in the backend: without either field there is
  // nothing to review. Attached to `liked` so the message appears at a
  // field rather than floating above the form.
  .refine((data) => data.liked.length > 0 || data.disliked.length > 0, {
    message: "Please fill in at least one of these two fields.",
    path: ["liked"],
  });

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
