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

/** Shared by all five inputs. `bg-white` is structural, not decoration:
 *  with no card around the form, each field is its own surface.
 *
 *  Margins stay out. The suggestions textarea needs mt-2 where the others
 *  use mt-1.5, and two utilities of equal specificity are decided by
 *  stylesheet order, not string order — so each call site passes its own. */
const FIELD_BASE =
  "w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900 shadow-sm " +
  "shadow-slate-900/5 transition duration-150 placeholder:text-slate-500 " +
  "focus:outline-none focus:ring-2";

// border-edge, not a slate step: the resting outline needs 3:1 against the
// page and that scale jumps past it. Token in index.css.
const FIELD_IDLE =
  "border-edge hover:border-slate-600 focus:border-brand-500 focus:ring-brand-300";

const FIELD_ERROR =
  "border-red-500 hover:border-red-600 focus:border-red-600 focus:ring-red-200";

/** A field's border colour, red once it is the one being complained about.
 *  Both states in one place, so border and focus ring cannot drift apart. */
function fieldClass(margin: string, hasError = false) {
  return `${margin} ${FIELD_BASE} ${hasError ? FIELD_ERROR : FIELD_IDLE}`;
}

/** Radio chips. The real input is sr-only, so the label draws every state,
 *  focus ring included — the hidden input could never show one.
 *
 *  text-xs below sm: at 375px "No first person" wrapped to two lines and
 *  stretched its row to 62px against the tone row's 42px. */
const CHIP =
  "flex cursor-pointer items-center justify-center rounded-lg border border-edge bg-white " +
  "py-2.5 text-xs text-slate-600 shadow-sm shadow-slate-900/5 transition duration-150 sm:text-sm " +
  "hover:border-slate-600 hover:text-slate-900 " +
  "has-[:checked]:border-slate-900 has-[:checked]:bg-slate-50 has-[:checked]:font-medium " +
  "has-[:checked]:text-slate-900 has-[:checked]:shadow-sm " +
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-300";

const GROUP_LABEL = "block text-sm font-medium text-slate-800";

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
    .join(" · ");

  // The fields are swapped out inside the form, never around it: the
  // <form> and its useForm instance stay mounted, so react-hook-form keeps
  // every value while collapsed and hands them back on expand.
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isCollapsed ? (
        <div className="summary-in flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm shadow-slate-900/5">
          <p className="truncate text-sm text-slate-700">{summary}</p>
          {/* Negative margin against the padding: the hit area grows to
              32px without the row growing with it. 20px was below the
              24px minimum. */}
          <button
            type="button"
            onClick={onExpand}
            className="-my-1.5 shrink-0 cursor-pointer px-1 py-1.5 text-sm font-medium text-slate-900 underline-offset-2 transition hover:underline"
          >
            Edit inputs
          </button>
        </div>
      ) : (
        <>
          <div>
            <label
              htmlFor="venue_name"
              className="block text-sm font-medium text-slate-800"
            >
              Which place are you reviewing?
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
              className="block text-sm font-medium text-slate-800"
            >
              Type of place
            </label>
            {/* The OS-drawn arrow ignores the palette, so an inline chevron
                replaces it. pr-10 clears the text; the box keeps its size. */}
            <select
              id="category"
              className={`${fieldClass("mt-1.5")} appearance-none bg-[url("data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20viewBox='0%200%2020%2020'%20fill='none'%20stroke='%237f8da3'%20stroke-width='1.6'%20stroke-linecap='round'%20stroke-linejoin='round'%3E%3Cpath%20d='M6%208l4%204%204-4'/%3E%3C/svg%3E")] bg-[length:1.25rem_1.25rem] bg-[right_0.65rem_center] bg-no-repeat pr-10`}
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
              className="block text-sm font-medium text-slate-800"
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
              className="block text-sm font-medium text-slate-800"
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
              <p id={pairNoteId} className="mt-1 text-sm text-slate-500">
                One of these two fields is enough.
              </p>
            )}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setShowSuggestions((v) => !v)}
              aria-expanded={showSuggestions}
              aria-controls={suggestionsId}
              className="-my-1 cursor-pointer py-1 text-sm text-slate-600 underline decoration-slate-400 underline-offset-2 transition hover:text-slate-900 hover:decoration-slate-600"
            >
              {showSuggestions
                ? "Hide the suggestion field"
                : "Add a suggestion for improvement"}{" "}
              <span className="text-slate-500">(optional)</span>
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
          <div className="space-y-4 border-t border-slate-200 pt-4">
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
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-edge bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition duration-150 ease-out hover:border-slate-900 hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-edge disabled:hover:shadow-sm"
      >
        {/* Decorative only — the label already names the action, so it is
            hidden from screen readers. Drawn inline in currentColor rather
            than as an emoji, which would bring its own colour into a button
            that should carry only the accent. Gone while loading: it
            promises an action that is already under way. */}
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
