import type { Copy } from "./copy";

/** Addresses the guest as "du". The English copy is plain and direct, and
 *  "Sie" reads stiff beside it. Moving the whole interface to "Sie" is a
 *  change to this file alone. */
export const de: Copy = {
  language: { legend: "Sprache" },
  form: {
    venueLabel: "Welchen Ort bewertest du?",
    optional: "(optional)",
    // The example moves with the language: a German guest is more likely to
    // be reviewing somewhere German-speaking.
    venuePlaceholder: "Trattoria Bella, Berlin",
    categoryLabel: "Art des Ortes",
    likedLabel: "Was hat dir gefallen?",
    likedPlaceholder: "Hausgemachte Pasta, sehr freundlicher Empfang",
    dislikedLabel: "Was hat dich gestört?",
    dislikedPlaceholder: "40 Minuten auf die Vorspeise gewartet",
    pairNote: "Eines der beiden Felder genügt.",
    suggestionShow: "Verbesserungsvorschlag hinzufügen",
    suggestionHide: "Vorschlagsfeld ausblenden",
    suggestionPlaceholder: "Am Wochenende eine Person mehr",
    suggestionLabel: "Verbesserungsvorschlag",
    perspectiveLabel: "Perspektive",
    toneLabel: "Tonfall",
    submit: "Bewertung erstellen",
    editInputs: "Eingaben ändern",
  },
  status: {
    writing: "Bewertung wird geschrieben…",
    takesAMoment: "Das dauert meist ein paar Sekunden.",
  },
  result: {
    heading: "Deine Bewertung",
    edited: "bearbeitet",
    ratingLabel: (rating) => `Vorgeschlagene Bewertung: ${rating} von 5`,
    ratingShort: (rating) => `${rating} von 5`,
    omissionsHeading: "Was wir weggelassen haben",
    regenerate: "Neu erstellen",
    regenerateEdited: "Neu erstellen — ersetzt deinen bearbeiteten Text",
    edit: "Text bearbeiten",
    doneEditing: "Fertig",
    revert: "Zurücksetzen",
    // Same word either way, so no plural branch — the English side needs
    // one, which is why this is a function rather than a template.
    characters: (count) => `${count} Zeichen`,
  },
  copyButton: {
    copy: "Kopieren",
    copied: "Kopiert",
    // Strg, not Ctrl: that is what a German keyboard has printed on it.
    unavailable:
      "Kopieren ist hier nicht möglich — markiere den Text und drücke Strg+C.",
  },
  error: {
    title: "Das hat nicht geklappt",
    coolingTitle: "Eine kurze Pause ist nötig",
    retryIn: (seconds) => `Versuche es in ${seconds}s erneut.`,
    inputKept: "Deine Eingaben sind erhalten geblieben.",
    retry: "Erneut versuchen",
    code: (code) => `Fehlercode: ${code}`,
    byCode: {
      rate_limited: "Zu viele Anfragen in kurzer Zeit.",
      llm_unavailable:
        "Der Dienst ist vorübergehend nicht erreichbar. Bitte versuche es gleich noch einmal.",
      llm_invalid_output:
        "Die Bewertung konnte nicht erzeugt werden. Bitte versuche es erneut.",
      content_rejected:
        "Aus dieser Eingabe ließ sich keine Bewertung schreiben.",
      network_error:
        "Der Server ist nicht erreichbar. Bitte prüfe deine Verbindung.",
    },
  },
  category: {
    restaurant: "Restaurant",
    cafe: "Café",
    bar: "Bar",
    hotel: "Hotel",
    cinema: "Kino",
    theatre: "Theater",
    museum: "Museum",
    shop: "Geschäft",
    service: "Dienstleistung",
    other: "Sonstiges",
  },
  // The chip row is a fixed third of the width, and "Unpersönlich" is three
  // characters longer than "Impersonal" — measured at 320px before choosing
  // it over a shorter but vaguer word.
  perspective: { impersonal: "Unpersönlich", i: "Ich", we: "Wir" },
  tone: { neutral: "Neutral", friendly: "Freundlich", concise: "Knapp" },
  validation: {
    venueTooLong: "Dieser Name ist zu lang.",
    tooLong: "Das ist etwas zu lang.",
    needOneField: "Bitte fülle mindestens eines der beiden Felder aus.",
  },
};
