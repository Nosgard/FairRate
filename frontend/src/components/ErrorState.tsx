/** Failure display. Two sentences: what happened, what to do now.
 *  No apology, no "Error:" prefix, no blaming the user. */

import { useLanguage } from "../lib/i18n/language";
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
  const { copy } = useLanguage();

  // Once the clock runs out a retry is allowed again, so the panel stops
  // withholding its button.
  const isCoolingDown = code === ERROR_CODES.rateLimited && retryIn > 0;

  // The panel words the failure itself; the server's English message only
  // covers a code this build does not know.
  const byCode: Record<string, string | undefined> = copy.error.byCode;
  const explanation = byCode[code] ?? message;

  return (
    <section
      role="alert"
      className="rounded-edge border border-rule bg-white p-4 sm:p-5"
    >
      <p className="font-serif text-xl leading-snug font-medium text-ink">
        {isCoolingDown ? copy.error.coolingTitle : copy.error.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">
        {explanation}
        {isCoolingDown && ` ${copy.error.retryIn(retryIn)}`}
      </p>

      {isCoolingDown ? (
        // No retry button here on purpose: it would only trigger the next
        // 429. The countdown above tells the user when to come back.
        // Unmarked on purpose: the change bar means "something was taken
        // out here" and nothing else.
        <p className="mt-4 text-sm text-ink-muted">{copy.error.inputKept}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={onRetry}
            className="mt-5 w-full cursor-pointer rounded-edge border border-ink bg-ink px-4 py-3 text-base font-medium text-paper transition duration-150 hover:bg-ink/85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
          >
            {copy.error.retry}
          </button>
          <p className="mt-3 text-center text-xs text-ink-muted">
            {copy.error.code(code)}
          </p>
        </>
      )}
    </section>
  );
}
