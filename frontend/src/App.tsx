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

  /** Bridges form values to the API request shape. The two are close but
   *  not identical: `language` is fixed for now and never asked for in the
   *  form. Keeping the conversion explicit means a change on either side
   *  surfaces here, not silently at runtime. */
  function handleSubmit(values: ReviewFormValues) {
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
          />
        </div>

        <div className="mt-6">
          <ResultPanel state={state} onRetry={regenerate} />
        </div>
      </div>
    </main>
  );
}
