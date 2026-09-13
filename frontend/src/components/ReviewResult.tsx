/** Displays a generated review, and lets the user edit it before copying.
 *  The review is set as prose in the text face — it is the product, and
 *  everything around it is machinery in the interface face. */

import { useId, useLayoutEffect, useRef, useState } from "react";

import { CopyButton } from "./CopyButton";
import type { ReviewResponse } from "../lib/types";

interface ReviewResultProps {
  review: ReviewResponse;
  onRegenerate: () => void;
}

/** Gold, the colour a review star has everywhere else. It is the one warm
 *  thing on the page, which is the point: a rating is not part of the prose.
 *  The empty stars take the page's own rule colour rather than a cool grey,
 *  so they sit with the rest of the palette. */
function Stars({ rating }: { rating: number }) {
  return (
    <span
      className="text-lg tracking-wide text-amber-500"
      aria-label={`Suggested rating: ${rating} out of 5`}
    >
      {"★".repeat(rating)}
      <span className="text-rule">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

/** The review sits in the same box whether you read it or edit it, so the
 *  mode change moves nothing. Everything matches except the fill: white means
 *  "type here" throughout this app, so the review is only white while it
 *  actually is editable.
 *
 *  -mx-3 cancels the block's padding and stops at the gutter, which belongs
 *  to the change bar. `block` because a textarea is inline-block by default,
 *  and its descender space made the card taller in edit mode. */
const REVIEW_BOX =
  "mt-3 -mx-3 block w-[calc(100%+1.5rem)] rounded-edge border border-edge " +
  "px-3 py-2 font-serif text-[1.0625rem] leading-relaxed text-ink " +
  "shadow-sm shadow-ink/5";

/** Footer text buttons. Underlined because they carry no border or fill,
 *  and padded to clear the 24px minimum without the row growing. */
const FOOTER_BUTTON =
  "-my-1 cursor-pointer py-1 text-xs text-ink-muted underline decoration-edge " +
  "underline-offset-2 transition hover:text-ink hover:decoration-ink " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15";

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

  // Something was taken out of this passage, and it is still the passage we
  // generated. Both have to hold for the change bar to mean anything.
  const showChangeBar = !isEdited && review.omissions.length > 0;

  /** Grow the box to its content. The borders have to be added back:
   *  scrollHeight covers content and padding but not the border, and under
   *  box-sizing: border-box that leaves the last line clipped. */
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

    // A pixel height is only true for the width it was measured at. Resize
    // the window or let a webfont land, and the text rewraps behind a
    // scrollbar. Observing the element catches every cause.
    let lastWidth = el.clientWidth;
    const observer = new ResizeObserver(() => {
      // Width only — reacting to height would chase this callback's own work.
      if (el.clientWidth === lastWidth) return;
      lastWidth = el.clientWidth;
      fitToContent(el);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [isEditing]);

  return (
    <section className="rounded-edge border border-rule bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-sm font-medium text-ink-muted">Your review</h2>
          {isEdited && <span className="text-xs text-ink-muted">edited</span>}
        </div>
        <span className="truncate text-xs text-ink-muted">
          {review.venue_name}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2.5">
        <Stars rating={review.suggested_rating} />
        <span aria-hidden="true" className="text-xs text-ink-muted">
          {review.suggested_rating} of 5
        </span>
      </div>

      {/* A change bar in the margin, the mark a copy editor puts beside an
          altered passage. It appears only when something was actually taken
          out, so its presence is the information. */}
      <div
        className={`mt-4 -ml-3 border-l-2 pl-3 ${
          showChangeBar ? "border-ink" : "border-transparent"
        }`}
      >
        {/* The block has its own padding so the box has somewhere to sit.
            Without it the field's outline landed flush against the change
            bar. The gutter belongs to the mark. */}
        <div className="px-3">
          {review.headline && (
            <p className="font-serif text-xl leading-snug font-medium text-ink">
              {review.headline}
            </p>
          )}

          {isEditing ? (
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
              className={`${REVIEW_BOX} resize-none bg-white transition duration-150 focus:border-ink focus:ring-2 focus:ring-ink/15 focus:outline-none`}
            />
          ) : (
            // whitespace-pre-wrap: a <p> would swallow line breaks typed
            // in the editor.
            <p id={textId} className={`${REVIEW_BOX} bg-ink/[0.03] whitespace-pre-wrap`}>
              {text}
            </p>
          )}

        {/* Claiming we removed something from the user's own words is worth
            a sentence, not a badge. Hidden once the text is hand-edited —
            the claim covers the generated wording only. */}
          {showChangeBar && (
            <div className="mt-4">
              <p className="text-sm font-medium text-ink">What we left out</p>
              <ul className="mt-1 space-y-1">
                {review.omissions.map((omission, index) => (
                  <li
                    key={index}
                    className="text-sm leading-relaxed text-ink-muted"
                  >
                    {omission.note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
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
          className="w-12 cursor-pointer rounded-edge border border-edge text-ink-muted transition duration-150 hover:border-ink hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/15"
        >
          ↻
        </button>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-rule pt-3">
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
        <span id={counterId} className="text-xs text-ink-muted">
          {text.length} characters
        </span>
      </div>
    </section>
  );
}
