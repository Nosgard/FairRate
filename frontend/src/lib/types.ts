/** Convenience aliases over the generated OpenAPI types.
 *  api-types.ts is generated and must not be edited by hand;
 *  this file is where the rest of the app imports from. */

import type { components } from "./api-types";

export type ReviewRequest = components["schemas"]["ReviewRequestSchema"];
export type ReviewResponse = components["schemas"]["ReviewResponseSchema"];
export type Omission = components["schemas"]["Omission"];
export type OmissionType = components["schemas"]["OmissionType"];
export type VenueCategory = components["schemas"]["VenueCategory"];
export type Tone = components["schemas"]["ToneSchema"];
export type Perspective = components["schemas"]["PerspectiveSchema"];
export type Language = components["schemas"]["LanguageSchema"];

/** Explicit union for the four UI states from the UI concept.
 *  Forces every consumer to handle the error case — it cannot be
 *  forgotten the way an optional error field can. */
export type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; review: ReviewResponse }
  | {
      status: "error";
      code: string;
      message: string;
      /** Only set for rate limiting (429). The backend sends this so the
       *  UI can show a countdown instead of a retry button that would
       *  immediately fail again. */
      retryAfterSeconds?: number;
    };

/** Error codes the backend can return, plus one the client raises itself
 *  when the server is unreachable at all. Kept as constants so the UI can
 *  branch on them without repeating string literals. */
export const ERROR_CODES = {
  rateLimited: "rate_limited",
  llmUnavailable: "llm_unavailable",
  llmInvalidOutput: "llm_invalid_output",
  contentRejected: "content_rejected",
  networkError: "network_error",
} as const;
