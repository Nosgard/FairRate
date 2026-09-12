/** Displays a generated review. The text is the product, so it gets the
 *  least UI chrome — no card border around the prose itself. */

import { CopyButton } from "./CopyButton";
import type { ReviewResponse } from "../lib/types";

interface ReviewResultProps {
  review: ReviewResponse;
  onRegenerate: () => void;
}

function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="text-lg tracking-wide text-amber-500"
      aria-label={`Suggested rating: ${rating} out of 5`}
    >
      {"★".repeat(rating)}
      <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

export function ReviewResult({ review, onRegenerate }: ReviewResultProps) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-600">Your review</h2>
        <span className="text-xs text-slate-500">{review.venue_name}</span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Stars rating={review.suggested_rating} />
        <span aria-hidden="true" className="text-xs text-slate-500">
          Suggested: {review.suggested_rating} of 5
        </span>
      </div>

      {review.headline && (
        <p className="mt-3.5 text-base font-medium leading-snug text-slate-900">
          {review.headline}
        </p>
      )}

      <p className="mt-2 text-[15px] leading-relaxed text-slate-900">
        {review.review}
      </p>

      <div className="mt-4 flex gap-2">
        <CopyButton text={review.review} />
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Generate again"
          title="Generate again"
          className="w-12 cursor-pointer rounded-lg border border-edge text-slate-600 transition duration-150 hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          ↻
        </button>
      </div>

      {/* Omitted deliberately when the list is empty: "nothing was removed"
          is noise, and most reviews trigger no rule at all. */}
      {review.omissions.length > 0 && (
        <div className="mt-4 rounded-lg bg-blue-50 p-3">
          <p className="text-sm font-medium text-blue-900">Fairly worded</p>
          <ul className="mt-2 space-y-1">
            {review.omissions.map((omission, index) => (
              <li key={index} className="text-xs leading-relaxed text-blue-800">
                — {omission.note}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-3.5 flex items-center justify-between border-t border-slate-200 pt-3">
        <span className="text-xs text-slate-600">Edit text</span>
        <span className="text-xs text-slate-500">
          {review.review.length} characters
        </span>
      </div>
    </section>
  );
}
