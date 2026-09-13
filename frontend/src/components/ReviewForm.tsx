/** The input form. Presentational only — collecting and validating input.
 *  Everything about calling the backend lives in useReviewGeneration. */

import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
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
  /** A rate limit is running. ErrorState hides its retry button then, and
   *  the submit button has to agree — otherwise it fires the next 429. */
  isRateLimited: boolean;
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

/** Written out rather than left to CSS `capitalize`, so the spoken label
 *  matches the visible one. */
const TONE_LABELS: Record<(typeof TONES)[number], string> = {
  neutral: "Neutral",
  friendly: "Friendly",
  concise: "Concise",
};

/** Shared by all five inputs. White against the paper ground: white means
 *  "write here" throughout this app. Margins stay out — one textarea needs
 *  mt-2 where the rest use mt-1.5, and equal-specificity utilities are
 *  decided by stylesheet order, not string order. */
const FIELD_BASE =
  "w-full rounded-edge border bg-white px-3 py-2 text-base text-ink " +
  "transition duration-150 placeholder:text-ink-muted " +
  "focus:outline-none focus:ring-2";

// The resting outline has to clear 3:1 against paper; on focus it goes to
// full ink with a quiet halo rather than a second colour.
const FIELD_IDLE =
  "border-edge hover:border-ink focus:border-ink focus:ring-ink/15";

const FIELD_ERROR =
  "border-red-600 hover:border-red-700 focus:border-red-700 focus:ring-red-600/20";

/** A field's border colour, red once it is the one being complained about.
 *  Both states in one place, so border and focus ring cannot drift apart. */
function fieldClass(margin: string, hasError = false) {
  return `${margin} ${FIELD_BASE} ${hasError ? FIELD_ERROR : FIELD_IDLE}`;
}

/** Radio chips. The real input is sr-only, so the label draws every state,
 *  focus ring included. The chosen one takes a border and a faint tint, not
 *  a fill — filled, it outweighed the submit button, and did so on first
 *  paint for two defaults nobody picked. text-xs below sm keeps "No first
 *  person" on one line at 375px. */
const CHIP =
  "flex cursor-pointer items-center justify-center rounded-edge border border-edge bg-white " +
  "py-2.5 text-xs text-ink-muted transition duration-150 sm:text-sm " +
  "hover:border-ink hover:text-ink " +
  "has-[:checked]:border-ink has-[:checked]:bg-ink/[0.06] has-[:checked]:font-medium " +
  "has-[:checked]:text-ink " +
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink/15";

const GROUP_LABEL = "block text-sm font-medium text-ink";

/** Filled in every state. Writing the review is what this page is for, and
 *  the button says so whether or not one already exists. */
const SUBMIT =
  "flex w-full cursor-pointer items-center justify-center gap-2 rounded-edge " +
  "border border-ink bg-ink px-4 py-3 text-base font-medium text-paper " +
  "transition duration-150 hover:bg-ink/85 focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ink/25 disabled:cursor-not-allowed " +
  "disabled:opacity-40 disabled:hover:bg-ink";

export function ReviewForm({
  onSubmit,
  isLoading,
  isRateLimited,
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

  // Stable ids for the aria-* wiring below.
  const uid = useId();
  const venueErrorId = `${uid}-venue-error`;
  const pairNoteId = `${uid}-pair-note`;
  const suggestionsId = `${uid}-suggestions`;
  const perspectiveLabelId = `${uid}-perspective`;
  const toneLabelId = `${uid}-tone`;

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
    .join(", ");

  // The fields are swapped out inside the form, never around it: the
  // <form> and its useForm instance stay mounted, so react-hook-form keeps
  // every value while collapsed and hands them back on expand.
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isCollapsed ? (
        <div className="summary-in flex items-center justify-between gap-3 rounded-edge border border-rule bg-white px-4 py-3">
          <p className="truncate text-sm text-ink-muted">{summary}</p>
          {/* Negative margin against the padding: the hit area grows to
              32px without the row growing with it. 20px was below the
              24px minimum. */}
          <button
            type="button"
            onClick={onExpand}
            className="-my-1.5 shrink-0 cursor-pointer px-1 py-1.5 text-sm font-medium text-ink underline-offset-2 transition hover:underline"
          >
            Edit inputs
          </button>
        </div>
      ) : (
        <>
          <div>
            <label
              htmlFor="venue_name"
              className="block text-sm font-medium text-ink"
            >
              Which place are you reviewing?{" "}
              <span className="font-normal text-ink-muted">(optional)</span>
            </label>
            <input
              id="venue_name"
              type="text"
              placeholder="Trattoria Bella, New York"
              aria-invalid={errors.venue_name ? true : undefined}
              aria-describedby={errors.venue_name ? venueErrorId : undefined}
              className={fieldClass("mt-1.5", Boolean(errors.venue_name))}
              {...register("venue_name")}
            />
            {errors.venue_name && (
              <p
                id={venueErrorId}
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {errors.venue_name.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="category"
              className="block text-sm font-medium text-ink"
            >
              Type of place
            </label>
            {/* The OS-drawn arrow ignores the palette, so an inline chevron
                replaces it. pr-10 clears the text; the box keeps its size. */}
            <select
              id="category"
              className={`${fieldClass("mt-1.5")} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2020%2020'%20fill='none'%20stroke='%238a8681'%20stroke-width='1.6'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M6%208l4%204%204-4'/%3E%3C/svg%3E")] bg-[length:1.25rem_1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`}
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
              className="block text-sm font-medium text-ink"
            >
              What did you like?
            </label>
            <textarea
              id="liked"
              rows={3}
              placeholder="Homemade pasta, very friendly welcome"
              aria-invalid={errors.liked ? true : undefined}
              aria-describedby={pairNoteId}
              className={`${fieldClass("mt-1.5", Boolean(errors.liked))} resize-y leading-relaxed`}
              {...register("liked")}
            />
          </div>

          <div>
            <label
              htmlFor="disliked"
              className="block text-sm font-medium text-ink"
            >
              What bothered you?
            </label>
            <textarea
              id="disliked"
              rows={3}
              placeholder="Waited 40 minutes for the starter"
              aria-invalid={errors.liked ? true : undefined}
              aria-describedby={pairNoteId}
              className={`${fieldClass("mt-1.5", Boolean(errors.liked))} resize-y leading-relaxed`}
              {...register("disliked")}
            />
            {/* The refine rule in schema.ts attaches its message to `liked`,
                but it concerns both fields, so it sits below the pair. Both
                textareas point at it via aria-describedby. */}
            {errors.liked ? (
              <p
                id={pairNoteId}
                role="alert"
                className="mt-1 text-sm text-red-700"
              >
                {errors.liked.message}
              </p>
            ) : (
              <p id={pairNoteId} className="mt-1 text-sm text-ink-muted">
                One of these two fields is enough.
              </p>
            )}
          </div>

          <div className="border-t border-rule pt-4">
            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              aria-expanded={showSuggestions}
              aria-controls={suggestionsId}
              className="-my-1 cursor-pointer py-1 text-sm text-ink-muted underline decoration-edge underline-offset-2 transition hover:text-ink hover:decoration-ink"
            >
              {showSuggestions
                ? "Hide the suggestion field"
                : "Add a suggestion for improvement"}{" "}
              <span className="text-ink-muted">(optional)</span>
            </button>
            {showSuggestions && (
              <textarea
                id={suggestionsId}
                rows={2}
                placeholder="One more person on weekends"
                aria-label="Suggestion for improvement"
                className={`${fieldClass("mt-2")} resize-y leading-relaxed`}
                {...register("suggestions")}
              />
            )}
          </div>

          {/* Perspective and tone belong together — they shape how the review
              is written, not what it says. Without the rule the form was seven
              blocks at one pitch, required and optional looking alike. */}
          <div className="space-y-4 border-t border-rule pt-4">
            <div>
              <span id={perspectiveLabelId} className={GROUP_LABEL}>
                Point of view
              </span>
              {/* role="radiogroup" rather than a fieldset: it names the group
                  for screen readers without a fieldset's own box model, so
                  nothing shifts. The <label> that stood here named nothing. */}
              <div
                role="radiogroup"
                aria-labelledby={perspectiveLabelId}
                className="mt-1.5 grid grid-cols-3 gap-2"
              >
                {PERSPECTIVES.map((value) => (
                  <label key={value} className={`${CHIP} px-2 text-center`}>
                    <input
                      type="radio"
                      value={value}
                      aria-label={PERSPECTIVE_LABELS[value]}
                      className="sr-only"
                      {...register("perspective")}
                    />
                    {PERSPECTIVE_LABELS[value]}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span id={toneLabelId} className={GROUP_LABEL}>
                Tone
              </span>
              <div
                role="radiogroup"
                aria-labelledby={toneLabelId}
                className="mt-1.5 grid grid-cols-3 gap-2"
              >
                {TONES.map((value) => (
                  <label key={value} className={CHIP}>
                    <input
                      type="radio"
                      value={value}
                      aria-label={TONE_LABELS[value]}
                      className="sr-only"
                      {...register("tone")}
                    />
                    {TONE_LABELS[value]}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Outside the ternary on purpose: collapsing must not take the
          button away, because it is what reports "Writing your review…"
          while the request is in flight. */}
      <button
        type="submit"
        disabled={isLoading || isRateLimited}
        className={SUBMIT}
      >
        {/* Decorative — the label already names the action, so it is hidden
            from screen readers. Drawn in currentColor rather than as an
            emoji, so it inherits paper on the filled button and ink on the
            outlined one instead of dragging its own colour in. Gone while
            loading: it promises an action already under way. */}
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
