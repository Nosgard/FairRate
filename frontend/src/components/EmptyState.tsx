/** Placeholder shown before the first submission. Its real purpose comes
 *  with the two-column desktop layout: it holds the right column open so
 *  nothing jumps when the first result arrives. */

export function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 p-9 text-center">
      <p className="text-sm font-medium text-neutral-600">
        Your review will appear here
      </p>
      <p className="mt-1 text-sm text-neutral-500">
        Fill in the form — the rest is automatic.
      </p>
    </div>
  );
}
