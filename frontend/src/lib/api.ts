/** Thin wrapper around the backend. Components never call fetch directly.
 * This is the one place that changes if the base URL, auth, or error shape
 * ever does.
 */

import type { GenerationState, ReviewRequest, ReviewResponse } from "./types";

interface ApiErrorBody {
  code: string;
  message: string;
  retry_after_seconds?: number | null;
}

export async function createReview(
  request: ReviewRequest,
): Promise<GenerationState> {
  try {
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const review = (await res.json()) as ReviewResponse;
      return { status: "success", review };
    }

    const body = (await res.json()) as ApiErrorBody;
    return {
      status: "error",
      code: body.code,
      message: body.message,
      retryAfterSeconds: body.retry_after_seconds ?? undefined,
    };
  } catch {
    // Network failure, not an HTTP error status — the backend was
    // unreachable at all, not just unhappy with the request.
    return {
      status: "error",
      code: "network_error",
      message: "Could not reach the server. Please check your connection.",
    };
  }
}
