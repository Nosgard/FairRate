/** Owns the request lifecycle so components stay presentational.
 *  Separating this from ReviewForm is the SRP part of the UI concept:
 *  the form renders and collects, this hook calls and tracks state. */

import { useCallback, useRef, useState } from "react";

import { createReview } from "../lib/api";
import type { GenerationState, ReviewRequest } from "../lib/types";

export function useReviewGeneration() {
  const [state, setState] = useState<GenerationState>({ status: "idle" });

  // Kept in a ref, not state: regenerating must not depend on the form
  // still holding the values, and remembering them should never itself
  // trigger a re-render.
  const lastRequest = useRef<ReviewRequest | null>(null);

  const generate = useCallback(async (request: ReviewRequest) => {
    setState({ status: "loading" });
    // createReview never throws — it returns a GenerationState either way,
    // so there is no error branch to forget here.
    setState(await createReview(request));
  }, []);

  const regenerate = useCallback(async () => {
    const request = lastRequest.current;
    if (!request) return;
    setState({ status: "loading" });
    setState(await createReview(request));
  }, []);

  const reset = useCallback(() => {
    setState({ status: "idle" });
  }, []);

  return { state, generate, regenerate, reset };
}
