import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

import { LanguageContext, dictionaryFor, documentLanguage } from "./language";
import type { LanguageCode } from "./language";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<LanguageCode>("en");

  // WCAG 3.1.1: the page declares the language it is actually written in,
  // which is not always the one chosen — a screen reader given the wrong
  // one applies that language's pronunciation rules to every word.
  useEffect(() => {
    document.documentElement.lang = documentLanguage(language);
  }, [language]);

  const state = useMemo(
    () => ({ language, setLanguage, copy: dictionaryFor(language) }),
    [language],
  );

  return (
    <LanguageContext.Provider value={state}>
      {children}
    </LanguageContext.Provider>
  );
}
