/** The input form. Presentational only — collecting and validating input.
 *  Everything about calling the backend lives in useReviewGeneration. */

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";

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

export function ReviewForm({ onSubmit, isLoading }: ReviewFormProps) {
  const {
    register,
    handleSubmit,
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

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <p className="mt-1 text-sm text-red-700">{errors.liked.message}</p>
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
              className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 px-2 py-2.5 text-center text-sm has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white"
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
              className="flex cursor-pointer items-center justify-center rounded-lg border border-neutral-300 py-2.5 text-sm capitalize has-[:checked]:border-neutral-900 has-[:checked]:bg-neutral-900 has-[:checked]:text-white"
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full cursor-pointer rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isLoading ? "Writing your review…" : "Create review"}
      </button>
    </form>
  );
}
