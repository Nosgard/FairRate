import { useEffect, useRef, useState } from "react";

import { ReviewForm } from "./components/ReviewForm";
import { ReviewResult } from "./components/ReviewResult";
import { useCountDown } from "./hooks/useCountDown";
import { useReviewGeneration } from "./hooks/useReviewGeneration";
import type { ReviewFormValues } from "./lib/schema";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { ERROR_CODES } from "./lib/types";
import type { GenerationState } from "./lib/types";

/** Renders whichever state the generation is currently in. Written as an
 *  exhaustive switch so a new state cannot be added without handling it
 *  here — the compiler flags the missing case. */
function ResultPanel({
  state,
  retryIn,
  onRetry,
}: {
  state: GenerationState;
  /** Seconds left on the rate-limit cooldown, 0 when none is running. */
  retryIn: number;
  onRetry: () => void;
}) {
  switch (state.status) {
    case "idle":
      return null;
    case "loading":
      return <LoadingState />;
    case "success":
      // Keyed on the review id so a fresh generation gets a fresh
      // component — that is what discards any hand edit still held inside.
      return (
        <ReviewResult
          key={state.review.id}
          review={state.review}
          onRegenerate={onRetry}
        />
      );
    case "error":
      return (
        <ErrorState
          code={state.code}
          message={state.message}
          retryIn={retryIn}
          onRetry={onRetry}
        />
      );
  }
}

export default function App() {
  const { state, generate, regenerate } = useReviewGeneration();

  // Whether the user asked to edit their input again while a result is on
  // screen. Only this override is stored — the collapse itself is derived
  // below, so the two can never drift apart.
  const [isEditing, setIsEditing] = useState(false);

  // A request in flight collapses the form just as a finished result does:
  // as soon as there is something to look at below, the inputs give up the
  // space for it. "idle" and "error" stay expanded — the error panel
  // promises the input was kept, and that is only credible while it shows.
  const hasResult = state.status === "loading" || state.status === "success";

  const isCollapsed = hasResult && !isEditing;

  // The countdown lives here, not in ErrorState, because the submit button
  // depends on it too. Split in two they would drift, and the button could
  // stay shut after the wait ended. `state` is a new object per request, so
  // it doubles as the restart token.
  const retryIn = useCountDown(
    state.status === "error" ? (state.retryAfterSeconds ?? 0) : 0,
    state,
  );

  // Submitting while the clock runs would only earn another 429.
  const isRateLimited =
    state.status === "error" &&
    state.code === ERROR_CODES.rateLimited &&
    retryIn > 0;

  // Where the answer appears. Focus moves here once a request settles: the
  // submit button disables itself, which drops focus to <body>, leaving a
  // keyboard user nowhere. Focusing also scrolls the panel into view.
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.status !== "success" && state.status !== "error") return;
    panelRef.current?.focus();
  }, [state.status]);

  /** Bridges form values to the API request shape. The two are close but
   *  not identical: `language` is fixed for now and never asked for in the
   *  form. Keeping the conversion explicit means a change on either side
   *  surfaces here, not silently at runtime. */
  function handleSubmit(values: ReviewFormValues) {
    // A fresh submission ends any manual edit, so the next result collapses
    // the form again rather than staying open behind it.
    setIsEditing(false);
    generate({
      venue_name: values.venue_name,
      category: values.category,
      liked: values.liked,
      disliked: values.disliked,
      suggestions: values.suggestions,
      tone: values.tone,
      perspective: values.perspective,
      language: "en",
    });
  }

  /** Regeneration is a new request for the same input, so it collapses the
   *  form the way a submission does. Without this an earlier "Edit inputs"
   *  would hold the form open across the whole request. Wrapping it here
   *  keeps useReviewGeneration unaware of the form entirely. */
  function handleRegenerate() {
    setIsEditing(false);
    regenerate();
  }

  // A masthead, not a hero: the name in the text face, the promise in the
  // interface face, a rule closing the block.
  return (
    <main className="min-h-dvh bg-paper p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-[2rem] leading-none font-medium tracking-tight text-ink">
          FairRate
        </h1>
        <p className="mt-2 border-b border-rule pb-5 text-sm text-ink-muted">
          Tell us how it was — we'll write a fair review from it.
        </p>

        <div className="mt-6">
          <ReviewForm
            onSubmit={handleSubmit}
            isLoading={state.status === "loading"}
            isRateLimited={isRateLimited}
            isCollapsed={isCollapsed}
            onExpand={() => setIsEditing(true)}
          />
        </div>

        {state.status !== "idle" && (
          // tabIndex -1 makes the panel focusable for the effect above
          // without putting it in the tab order. No ring: a box drawn around
          // the whole card would read as an error.
          <div ref={panelRef} tabIndex={-1} className="mt-6 focus:outline-none">
            <ResultPanel
              state={state}
              retryIn={retryIn}
              onRetry={handleRegenerate}
            />
          </div>
        )}
      </div>
    </main>
  );
}
