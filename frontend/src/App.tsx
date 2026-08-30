import { ReviewForm } from "./components/ReviewForm";
import { ReviewResult } from "./components/ReviewResult";
import { useReviewGeneration } from "./hooks/useReviewGeneration";
import type { ReviewFormValues } from "./lib/schema";

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

        {state.status === "success" && (
          <div className="mt-6">
            <ReviewResult review={state.review} onRegenerate={regenerate} />
          </div>
        )}

        {state.status === "error" && (
          <p className="mt-6 text-sm text-red-700">{state.message}</p>
        )}
      </div>
    </main>
  );
}
