/** The input form. Presentational only — collecting and validating input.
 *  Everything about calling the backend lives in useReviewGeneration. */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import {
  TONES,
  PERSPECTIVES,
  VENUE_CATEGORIES,
  reviewFormSchema,
} from "../lib/schema";
import type { ReviewFormValues } from "../lib/schema";

interface ReviewFormProps {
  onSubmit: (values: ReviewFormValues) => void;
  isLoading: boolean;
  /** Shows the one-line summary instead of the fields. The parent decides
   *  when that happens; this component only renders it. */
  isCollapsed: boolean;
  onExpand: () => void;
}

const CATEGORY_LABELS: Record<(typeof VENUE_CATEGORIES)[number], string> = {
  restaurant: "Restaurant",
  cafe: "Café",
  bar: "Bar",
  hotel: "Hotel",
  cinema: "Cinema",
  theatre: "Theatre",
  museum: "Museum",
  shop: "Shop",
  service: "Service",
  other: "Other",
};

const PERSPECTIVE_LABELS: Record<(typeof PERSPECTIVES)[number], string> = {
  impersonal: "No first person",
  i: "I",
  we: "We",
};

export function ReviewForm({
  onSubmit,
  isLoading,
  isCollapsed,
  onExpand,
}: ReviewFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      venue_name: "",
      category: "other",
      liked: "",
      disliked: "",
      suggestions: "",
      tone: "neutral",
      perspective: "impersonal",
    },
  });

  const [showSuggestions, setShowSuggestions] = useState(false);

  // Only the three fields the summary shows are subscribed to, so typing in
  // the text areas does not re-render the whole form on every keystroke.
  const [venueName, category, perspective] = useWatch({
    control,
    name: ["venue_name", "category", "perspective"],
  });

  const summary = [
    venueName.trim(),
    CATEGORY_LABELS[category],
    PERSPECTIVE_LABELS[perspective],
  ]
    .filter(Boolean)
    .join(" · ");

  // The fields are swapped out inside the form, never around it: the
  // <form> and its useForm instance stay mounted, so react-hook-form keeps
  // every value while collapsed and hands them back on expand.
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isCollapsed ? (
        <div className="summary-in flex items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3">
          <p className="truncate text-sm text-neutral-700">{summary}</p>
          <button
            type="button"
            onClick={onExpand}
            className="shrink-0 cursor-pointer text-sm font-medium text-neutral-900"
          >
            Edit inputs
          </button>
        </div>
      ) : (
        <>
          <div>
            <label
              htmlFor="venue_name"
              className="block text-sm font-medium text-neutral-800"
            >
              Which place are you reviewing?
            </label>
            <input
              id="venue_name"
              type="text"
              placeholder="Trattoria Bella, New York"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              {...register("venue_name")}
            />
            {errors.venue_name && (
              <p className="mt-1 text-sm text-red-700">
                {errors.venue_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-neutral-800"
            >
              Type of place
            </label>
            <select
              id="category"
              className="mt-1.5 w-full rounded-lg border border-neutral-300 px-3 py-2 text-base"
              {...register("category")}
            >
              {VENUE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {CATEGORY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="liked"
              className="block text-sm font-medium text-neutral-800"
            >
              What did you like?
            </label>
            <textarea
              id="liked"
              rows={3}
              placeholder="Homemade pasta, very friendly welcome"
              className="mt-1.5 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-base leading-relaxed"
              {...register("liked")}
            />
          </div>

          <div>
            <label
              htmlFor="disliked"
              className="block text-sm font-medium text-neutral-800"
            >
              What bothered you?
            </label>
            <textarea
              id="disliked"
              rows={3}
              placeholder="Waited 40 minutes for the starter"
              className="mt-1.5 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-base leading-relaxed"
              {...register("disliked")}
            />
            {/* The refine rule in schema.ts attaches its message to `liked`,
                but it concerns both fields — so it is shown here, below the
                pair, rather than under the first one in isolation. */}
            {errors.liked ? (
              <p className="mt-1 text-sm text-red-700">
                {errors.liked.message}
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-500">
                One of these two fields is enough.
              </p>
            )}
          </div>

          <div className="border-t border-neutral-200 pt-4">
            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              className="cursor-pointer text-sm text-neutral-600"
            >
              {showSuggestions ? "Hide" : "Add"} a suggestion for improvement{" "}
              <span className="text-neutral-400">(optional)</span>
            </button>
            {showSuggestions && (
              <textarea
                rows={2}
                placeholder="One more person on weekends"
                aria-label="Suggestion for improvement"
                className="mt-2 w-full resize-y rounded-lg border border-neutral-300 px-3 py-2 text-base leading-relaxed"
                {...register("suggestions")}
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Point of view
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {PERSPECTIVES.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 px-2 py-2.5 text-center text-sm hover:border-neutral-400 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50 has-[:checked]:text-neutral-900 has-[:checked]:shadow-sm"
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register("perspective")}
                  />
                  {PERSPECTIVE_LABELS[value]}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-800">
              Tone
            </label>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {TONES.map((value) => (
                <label
                  key={value}
                  className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 py-2.5 text-sm capitalize hover:border-neutral-400 has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-50 has-[:checked]:text-neutral-900 has-[:checked]:shadow-sm"
                >
                  <input
                    type="radio"
                    value={value}
                    className="sr-only"
                    {...register("tone")}
                  />
                  {value}
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Outside the ternary on purpose: collapsing must not take the
          button away, because it is what reports "Writing your review…"
          while the request is in flight. */}
      <button
        type="submit"
        disabled={isLoading}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base font-medium text-neutral-900 shadow-sm transition duration-150 ease-out hover:border-neutral-900 hover:shadow-md motion-safe:hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm disabled:hover:border-neutral-300"
      >
        {/* Decorative only — the label already names the action, so it is
            hidden from screen readers. Drawn inline in currentColor rather
            than as an emoji, which would bring its own colour into a button
            the palette keeps neutral. Gone while loading: it promises an
            action that is already under way. */}
        {!isLoading && (
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 shrink-0"
          >
            <path d="M9 5Q10.2 11.8 16 13Q10.2 14.2 9 21Q7.8 14.2 2 13Q7.8 11.8 9 5Z" />
            <path d="M18 2Q18.6 4.4 21 5Q18.6 5.6 18 8Q17.4 5.6 15 5Q17.4 4.4 18 2Z" />
          </svg>
        )}
        {isLoading ? "Writing your review…" : "Create review"}
      </button>
    </form>
  );
}
