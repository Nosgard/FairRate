/** Counts `seconds` down to zero, one step a second, and starts over
 *  whenever `token` changes identity.
 *
 *  The token matters: two rate limits in a row usually carry the same
 *  retry-after, so watching the number alone would miss the second one.
 *
 *  Counts steps instead of reading a clock, because Date.now() may not be
 *  called while rendering. The trade-off is drift in a background tab, where
 *  browsers throttle timers.
 */

import { useEffect, useState } from "react";

export function useCountDown(seconds: number, token: unknown): number {
  const [remaining, setRemaining] = useState(seconds);

  // Resetting on a new token belongs in render, not an effect: React re-runs
  // before painting, so the stale count is never shown.
  const [lastToken, setLastToken] = useState(token);
  if (token !== lastToken) {
    setLastToken(token);
    setRemaining(seconds);
  }

  useEffect(() => {
    if (seconds <= 0) return;

    // setState from the interval callback, not from the effect body.
    const timer = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastToken, seconds]);

  return remaining;
}
