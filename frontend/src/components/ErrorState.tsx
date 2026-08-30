/** Failure display. Two sentences: what happened, what to do now.
 *  No apology, no "Error:" prefix, no blaming the user. */

import { useEffect, useState } from "react";

import { ERROR_CODES } from "../lib/types";

interface ErrorStateProps {
  code: string;
  message: string;
  retryAfterSeconds?: number;
  onRetry: () => void;
}

function useCountDown(from: number | undefined) {
  const [remaining, setRemaining] = useState(from ?? 0);

  useEffect(() => {
    if (from === undefined) return;
    const timer = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [from]);

  return remaining;
}

export function ErrorState({
  code,
  message,
  retryAfterSeconds,
  onRetry,
}: ErrorStateProps) {
  const remaining = useCountDown(retryAfterSeconds);
  const isRateLimited = code === ERROR_CODES.rateLimited;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <p className="text-base font-medium text-neutral-900">
        {isRateLimited ? "A short pause is needed" : "That didn't work"}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-neutral-600">
        {message}
        {isRateLimited && remaining > 0 && ` Try again in ${remaining}s.`}
      </p>

      {isRateLimited ? (
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
            className="mt-4 w-full cursor-pointer rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white"
          >
            Try again
          </button>
          <p className="mt-3 text-center text-xs text-neutral-500">
            Error code: {code}
          </p>
        </>
      )}
    </section>
  );
}
