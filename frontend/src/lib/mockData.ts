/** Fixed sample response for frontend work without a running backend.
 *  Mirrors the FakeGenerator on the backend side — same purpose, one
 *  layer further out: layout and state work with no server at all. */

import type { ReviewRequest, ReviewResponse } from "./types";

export function mockReview(request: ReviewRequest): ReviewResponse {
  return {
    id: "00000000-0000-4000-8000-000000000000",
    venue_name: request.venue_name,
    category: request.category,
    review:
      "The homemade pasta was excellent and the welcome was warm. Service " +
      "felt stretched during our visit — we waited around forty minutes " +
      "for the starter. An extra pair of hands at weekends would likely " +
      "smooth this out.",
    headline: "Excellent food, service under pressure",
    suggested_rating: 4,
    omissions: [
      {
        type: "personal_attack",
        note: "Removed a remark aimed at a member of staff",
      },
    ],
  };
}
