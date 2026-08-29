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
export type Language = components["schemas"]["LanguageSchema"];

/** Explicit union for the four UI states from the UI concept.
 *  Forces every consumer to handle the error case — it cannot be
 *  forgotten the way an optional error field can. */
export type GenerationState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; review: ReviewResponse }
  | { status: "error"; code: string; message: string };
