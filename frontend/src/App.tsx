import { useState } from "react";

import { ReviewForm } from "./components/ReviewForm";
import { ReviewResult } from "./components/ReviewResult";
import { useReviewGeneration } from "./hooks/useReviewGeneration";
import type { ReviewFormValues } from "./lib/schema";
import { EmptyState } from "./components/EmptyState";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import type { GenerationState } from "./lib/types";

/** Renders whichever state the generation is currently in. Written as an
 *  exhaustive switch so a new state cannot be added without handling it
 *  here — the compiler flags the missing case. */
function ResultPanel({
  state,
  onRetry,
}: {
  state: GenerationState;
  onRetry: () => void;
}) {
  switch (state.status) {
    case "idle":
      return <EmptyState />;
    case "loading":
      return <LoadingState />;
    case "success":
      return <ReviewResult review={state.review} onRegenerate={onRetry} />;
    case "error":
      return (
        <ErrorState
          code={state.code}
          message={state.message}
          retryAfterSeconds={state.retryAfterSeconds}
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

  return (
    <main className="min-h-dvh bg-neutral-50 p-6">
      <div className="mx-auto max-w-2xl">
        <h1 className="text-2xl font-medium text-neutral-900">FairRate</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Tell us how it was — we'll write a fair review from it.
        </p>

        <div className="mt-6">
          <ReviewForm
            onSubmit={handleSubmit}
            isLoading={state.status === "loading"}
            isCollapsed={isCollapsed}
            onExpand={() => setIsEditing(true)}
          />
        </div>

        <div className="mt-6">
          <ResultPanel state={state} onRetry={handleRegenerate} />
        </div>
      </div>
    </main>
  );
}
