/** The four languages the interface offers, each written in its own name. */
const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** The colour behaviour of the chips in the form — muted until hovered,
 *  ink and a tint once chosen — but without their border. The hero is a
 *  masthead; four boxed controls under the wordmark would read as a
 *  toolbar. The real input is sr-only, so the label draws every state. */
const OPTION =
  "cursor-pointer rounded-edge px-2.5 py-1.5 text-sm text-ink-muted " +
  "transition duration-150 hover:bg-ink/[0.03] hover:text-ink " +
  "has-[:checked]:bg-ink/[0.06] has-[:checked]:font-medium " +
  "has-[:checked]:text-ink " +
  // Windows high contrast drops every background, and the weight alone
  // would be left to say which one is chosen. Draws nothing otherwise.
  "forced-colors:has-[:checked]:outline forced-colors:has-[:checked]:outline-1 " +
  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink/15";

export function LanguageChoice({
  value,
  onChange,
}: {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
}) {
  return (
    <fieldset className="mt-3">
      {/* The group needs a name for screen readers, but not the space a
          drawn one would take. */}
      <legend className="sr-only">Review language</legend>
      {/* The negative margin cancels the first option's own padding, so its
          text starts on the wordmark's left edge rather than beside it. */}
      <div className="-ml-2.5 flex flex-wrap gap-0.5">
        {LANGUAGES.map(({ code, name }) => (
          <label key={code} className={OPTION}>
            <input
              type="radio"
              name="language"
              value={code}
              checked={value === code}
              onChange={() => onChange(code)}
              className="sr-only"
            />
            {name}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
