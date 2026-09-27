import { LANGUAGES, useLanguage } from "../lib/i18n/language";

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

export function LanguageChoice() {
  const { language, setLanguage, copy } = useLanguage();

  return (
    <fieldset className="mt-3">
      {/* The group needs a name for screen readers, but not the space a
          drawn one would take. */}
      <legend className="sr-only">{copy.language.legend}</legend>
      {/* The negative margin cancels the first option's own padding, so its
          text starts on the wordmark's left edge rather than beside it. */}
      <div className="-ml-2.5 flex flex-wrap gap-0.5">
        {LANGUAGES.map(({ code, name }) => (
          <label key={code} className={OPTION}>
            <input
              type="radio"
              name="language"
              value={code}
              checked={language === code}
              onChange={() => setLanguage(code)}
              className="sr-only"
            />
            {/* The name stays in its own language whatever is selected —
                translating it would hide the option from the person who
                needs it. */}
            <span lang={code}>{name}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
