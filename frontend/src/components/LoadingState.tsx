/** Shown while generation runs. Skeleton bars rather than a centred
 *  spinner: they have the shape of the result, so the layout does not
 *  jump when the text arrives. */

interface BarProps {
  width: string;
}

function Bar({ width }: BarProps) {
  return (
    <div
      className="skeleton h-2.5 rounded bg-slate-400"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

export function LoadingState() {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
      aria-busy="true"
      aria-live="polite"
    >
      <p className="text-sm font-medium text-slate-900">
        Writing your review…
      </p>

      <div className="mt-5">
        <Bar width="62%" />
      </div>

      <div className="mt-4 space-y-2.5">
        <Bar width="100%" />
        <Bar width="96%" />
        <Bar width="100%" />
        <Bar width="78%" />
        <Bar width="88%" />
      </div>

      <p className="mt-5 border-t border-slate-200 pt-3.5 text-xs text-slate-500">
        This usually takes a few seconds.
      </p>
    </section>
  );
}
