import { createContext, useContext } from "react";

import type { Language } from "../types";
import type { Copy } from "./copy";
import { de } from "./de";
import { en } from "./en";
import { fr } from "./fr";

/** The languages the switcher offers, in the order it draws them, each
 *  written in its own name. */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "de", name: "Deutsch" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];

/** The dictionaries that exist. Adding a language means adding its file
 *  here and pointing its code at it below. */
const DICTIONARIES = { en, de, fr } satisfies Record<string, Copy>;

type Translated = keyof typeof DICTIONARIES;

/** Which dictionary each offered language reads. `fr` and `es` have none of
 *  their own yet, so they resolve to English.
 *
 *  The only place a fallback is decided: the copy, the page's lang attribute
 *  and the review's language all follow it, so they cannot disagree. Every
 *  code needs an entry, so a new language is a build error here. */
const RESOLVES_TO: Record<LanguageCode, Translated> = {
  en: "en",
  de: "de",
  fr: "fr",
  es: "en",
};

export function dictionaryFor(code: LanguageCode): Copy {
  return DICTIONARIES[RESOLVES_TO[code]];
}

/** The language the interface is actually written in, which is not the
 *  chosen code when that code has no dictionary of its own. */
export function documentLanguage(code: LanguageCode): Translated {
  return RESOLVES_TO[code];
}

/** The languages the API can write a review in. A set with a compile-time
 *  completeness check: add one to the backend enum and this stops
 *  compiling until it is named here too. */
const API_LANGUAGES = { de: true, en: true, fr: true } as const satisfies Record<
  Language,
  true
>;

/** The language to ask the review in. Resolved first, so a language the
 *  interface cannot show is never asked for; a dictionary the API cannot
 *  write falls back to English while the interface stays in it. */
export function reviewLanguage(code: LanguageCode): Language {
  const written = RESOLVES_TO[code];
  return written in API_LANGUAGES ? (written as Language) : "en";
}

export interface LanguageState {
  language: LanguageCode;
  setLanguage: (code: LanguageCode) => void;
  copy: Copy;
}

export const LanguageContext = createContext<LanguageState | null>(null);

/** Throws rather than handing back a default. A component rendered outside
 *  the provider would otherwise show English for ever, and silently. */
export function useLanguage(): LanguageState {
  const state = useContext(LanguageContext);
  if (!state) {
    throw new Error("useLanguage must be used inside a LanguageProvider");
  }
  return state;
}
