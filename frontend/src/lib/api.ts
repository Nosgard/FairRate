/** Thin wrapper around the backend. Components never call fetch directly.
 * This is the one place that changes if the base URL, auth, or error shape
 * ever does.
 */

import type { GenerationState, ReviewRequest, ReviewResponse } from "./types";
import { mockReview } from "./mockData";

/** Set VITE_USE_MOCK=true in frontend/.env.local to work on the UI
 *  without a backend. Vite only exposes variables prefixed with VITE_. */
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const MOCK_DELAY_MS = 1500;

interface ApiErrorBody {
  code: string;
  message: string;
  retry_after_seconds?: number | null;
}

export async function createReview(
  request: ReviewRequest,
): Promise<GenerationState> {
  if (USE_MOCK) {
    // Deliberately delayed: without it the loading state would flash by
    // too quickly to actually look at while working on it.
    await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));
    return { status: "success", review: mockReview(request) };
  }

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
