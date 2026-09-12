/** Failure display. Two sentences: what happened, what to do now.
 *  No apology, no "Error:" prefix, no blaming the user. */

import { ERROR_CODES } from "../lib/types";

interface ErrorStateProps {
  code: string;
  message: string;
  /** Seconds left on the cooldown, 0 when none runs. App owns the clock
   *  because the submit button depends on it too. */
  retryIn: number;
  onRetry: () => void;
}

export function ErrorState({ code, message, retryIn, onRetry }: ErrorStateProps) {
  // Once the clock runs out a retry is allowed again, so the panel stops
  // withholding its button.
  const isCoolingDown = code === ERROR_CODES.rateLimited && retryIn > 0;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <p className="text-base font-medium text-slate-900">
        {isCoolingDown ? "A short pause is needed" : "That didn't work"}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
        {message}
        {isCoolingDown && ` Try again in ${retryIn}s.`}
      </p>

      {isCoolingDown ? (
        // No retry button here on purpose: it would only trigger the next
        // 429. The countdown above tells the user when to come back.
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-amber-50 p-3">
          <span className="text-sm text-amber-900">
            Your input has been kept.
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 w-full cursor-pointer rounded-lg border border-edge bg-white px-4 py-3 text-base font-medium text-slate-900 shadow-sm transition duration-150 ease-out hover:border-slate-900 hover:shadow-md motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
          >
            Try again
          </button>
          <p className="mt-3 text-center text-xs text-slate-500">
            Error code: {code}
          </p>
        </>
      )}
    </section>
  );
}
