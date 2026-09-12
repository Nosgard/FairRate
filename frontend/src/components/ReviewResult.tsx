/** Displays a generated review, and lets the user edit it before copying.
 *  The text is the product, so it gets the least UI chrome — no card border
 *  around the prose, and the editor only appears when asked for. */

import { useId, useLayoutEffect, useRef, useState } from "react";

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

/** The two text buttons in the footer. Underlined because they carry no
 *  border or fill of their own, and padded out to clear the 24px minimum
 *  without the footer row growing — the negative margin absorbs it. */
const FOOTER_BUTTON =
  "-my-1 cursor-pointer py-1 text-xs text-slate-600 underline decoration-slate-400 " +
  "underline-offset-2 transition hover:text-slate-900 hover:decoration-slate-600 " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300";

export function ReviewResult({ review, onRegenerate }: ReviewResultProps) {
  // The edit lives here, not in App: it is not part of the request
  // lifecycle that useReviewGeneration owns. A new generation replaces this
  // component (App keys it on review.id), so the draft resets on its own.
  const [text, setText] = useState(review.review);
  const [isEditing, setIsEditing] = useState(false);

  const isEdited = text !== review.review;

  const uid = useId();
  const textId = `${uid}-text`;
  const counterId = `${uid}-counter`;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /** Grow the box to its content, so switching out of the paragraph does not
   *  cut the text off or leave empty space below it.
   *
   *  The borders have to be added back: scrollHeight covers content and
   *  padding but not the border, while box-sizing is border-box — setting
   *  the height to scrollHeight alone leaves the box two pixels short and
   *  clips the last line. */
  function fitToContent(el: HTMLTextAreaElement) {
    const style = getComputedStyle(el);
    const borders =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + borders}px`;
  }

  // Layout effect, not a plain one: sizing after paint would show a
  // one-frame flash at the default height first.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    fitToContent(el);
    el.focus();
    // Caret at the end rather than selecting everything — the usual intent
    // is to adjust a phrase, not to replace the whole review.
    el.setSelectionRange(el.value.length, el.value.length);
  }, [isEditing]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium text-slate-600">Your review</h2>
          {isEdited && (
            <span className="text-xs text-slate-500">· edited</span>
          )}
        </div>
        <span className="text-xs text-slate-500">{review.venue_name}</span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Stars rating={review.suggested_rating} />
        <span aria-hidden="true" className="text-xs text-slate-500">
          Suggested: {review.suggested_rating} of 5
        </span>
      </div>

      {review.headline && (
        <p className="mt-4 text-base font-medium leading-snug text-slate-900">
          {review.headline}
        </p>
      )}

      {isEditing ? (
        // -mx-3 px-3 cancels out: the box grows into the card's padding
        // while the text column stays exactly where the paragraph had it.
        <textarea
          id={textId}
          ref={textareaRef}
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            fitToContent(event.currentTarget);
          }}
          aria-label="Your review"
          aria-describedby={counterId}
          className="mt-2 -mx-3 w-[calc(100%+1.5rem)] resize-none rounded-lg border border-edge bg-white px-3 py-2 text-[15px] leading-relaxed text-slate-900 shadow-sm shadow-slate-900/5 transition duration-150 focus:border-brand-500 focus:ring-2 focus:ring-brand-300 focus:outline-none"
        />
      ) : (
        <p
          id={textId}
          className="mt-2 text-[15px] leading-relaxed text-slate-900"
        >
          {text}
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <CopyButton text={text} disabled={text.trim().length === 0} />
        <button
          type="button"
          onClick={onRegenerate}
          aria-label="Generate again"
          title={
            isEdited
              ? "Generate again — replaces your edited text"
              : "Generate again"
          }
          className="w-12 cursor-pointer rounded-lg border border-edge text-slate-600 transition duration-150 hover:border-slate-400 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          ↻
        </button>
      </div>

      {/* Omitted when the list is empty: "nothing was removed" is noise, and
          most reviews trigger no rule at all. Omitted again once the text is
          edited — the note describes what was kept out of the *generated*
          review, and the app cannot vouch for it after a hand edit. It comes
          back if the text is reverted. */}
      {!isEdited && review.omissions.length > 0 && (
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

      <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setIsEditing((editing) => !editing)}
            aria-expanded={isEditing}
            aria-controls={textId}
            className={FOOTER_BUTTON}
          >
            {isEditing ? "Done editing" : "Edit text"}
          </button>
          {isEdited && (
            <button
              type="button"
              onClick={() => setText(review.review)}
              className={FOOTER_BUTTON}
            >
              Revert
            </button>
          )}
        </div>
        <span id={counterId} className="text-xs text-slate-500">
          {text.length} characters
        </span>
      </div>
    </section>
  );
}
