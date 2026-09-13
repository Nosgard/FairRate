/** Copies text to the clipboard with visible confirmation.
 *  The Clipboard API needs a secure context (HTTPS or localhost) and must
 *  be called directly from the user gesture — the text is already in state
 *  when the click happens, so nothing is awaited before writeText. */

import { useEffect, useState } from "react";

interface CopyButtonProps {
  text: string;
  /** Nothing to copy. Without this an empty review would still report
   *  "Copied", which is worse than the button being visibly unavailable. */
  disabled?: boolean;
}

export function CopyButton({ text, disabled = false }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  // Reset the confirmation after a moment, and clean up if the component
  // unmounts first so the timer never fires against a gone component.
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
    } catch {
      // Older browsers, or a page served over plain HTTP.
      setFailed(true);
    }
  }

  if (failed) {
    return (
      <div className="flex-1">
        <textarea
          readOnly
          value={text}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full rounded-edge border border-edge bg-white p-2 font-serif text-sm text-ink"
          rows={3}
        />
        <p className="mt-1 text-xs text-ink-muted">
          Copying is unavailable here — select the text and press Ctrl+C.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={disabled}
      // Outlined: the submit button above is the filled one, and two filled
      // blocks on a screen read as two main actions.
      className="flex-1 cursor-pointer rounded-edge border border-edge bg-white px-4 py-3 text-base font-medium text-ink transition duration-150 hover:border-ink hover:bg-ink/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-edge disabled:hover:bg-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
