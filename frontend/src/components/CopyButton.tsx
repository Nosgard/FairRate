/** Copies text to the clipboard with visible confirmation.
 *  The Clipboard API needs a secure context (HTTPS or localhost) and must
 *  be called directly from the user gesture — the text is already in state
 *  when the click happens, so nothing is awaited before writeText. */

import { useEffect, useState } from "react";

interface CopyButtonProps {
  text: string;
}

export function CopyButton({ text }: CopyButtonProps) {
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
          className="w-full rounded-lg border border-neutral-300 p-2 text-sm"
          rows={3}
        />
        <p className="mt-1 text-xs text-neutral-500">
          Copying is unavailable here — select the text and press Ctrl+C.
        </p>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex-1 cursor-pointer rounded-lg bg-neutral-900 px-4 py-3 text-base font-medium text-white"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
