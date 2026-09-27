/** Every string the interface shows, in one shape.
 *
 *  Each dictionary is typed against this, so a missing key fails the build.
 *  The Record types take their keys from the app's own lists: a new venue
 *  category or error code forces a translation for it. Strings that carry a
 *  value are functions, because word order differs between languages.
 */

import type { ERROR_CODES } from "../types";
import type {
  PERSPECTIVES,
  TONES,
  VENUE_CATEGORIES,
  ValidationMessages,
} from "../schema";

type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

export interface Copy {
  language: {
    /** Names the switcher for screen readers; never drawn. */
    legend: string;
  };
  form: {
    venueLabel: string;
    optional: string;
    venuePlaceholder: string;
    categoryLabel: string;
    likedLabel: string;
    likedPlaceholder: string;
    dislikedLabel: string;
    dislikedPlaceholder: string;
    pairNote: string;
    suggestionShow: string;
    suggestionHide: string;
    suggestionPlaceholder: string;
    suggestionLabel: string;
    perspectiveLabel: string;
    toneLabel: string;
    submit: string;
    editInputs: string;
  };
  /** Shared by the submit button and the loading panel on purpose: they say
   *  the same thing about the same request, and one key cannot drift. */
  status: {
    writing: string;
    expectedWait: string;
  };
  result: {
    heading: string;
    edited: string;
    ratingLabel: (rating: number) => string;
    ratingShort: (rating: number) => string;
    omissionsHeading: string;
    regenerate: string;
    regenerateEdited: string;
    edit: string;
    doneEditing: string;
    revert: string;
    characters: (count: number) => string;
  };
  copyButton: {
    copy: string;
    copied: string;
    /** Names the shortcut key as the keyboard actually prints it. */
    unavailable: string;
  };
  error: {
    title: string;
    coolingTitle: string;
    retryIn: (seconds: number) => string;
    inputKept: string;
    retry: string;
    code: (code: string) => string;
    /** The panel's own wording per code, rather than the server's English.
     *  The server keeps sending its message; it is the fallback for a code
     *  this table does not know. */
    byCode: Record<ErrorCode, string>;
  };
  category: Record<(typeof VENUE_CATEGORIES)[number], string>;
  perspective: Record<(typeof PERSPECTIVES)[number], string>;
  tone: Record<(typeof TONES)[number], string>;
  validation: ValidationMessages;
}
