import type { Copy } from "./copy";

/** Addresses the guest as "vous". German reads better with "du" and French
 *  with "vous" — each language's own convention beats matching the other.
 *
 *  The space before "?" and ":" is French punctuation. A narrow no-break
 *  space would be the typographic ideal; a plain one is used here because an
 *  invisible character in source is a maintenance hazard. */
export const fr: Copy = {
  language: { legend: "Langue" },
  form: {
    venueLabel: "Quel établissement évaluez-vous ?",
    optional: "(facultatif)",
    venuePlaceholder: "Trattoria Bella, Lyon",
    categoryLabel: "Type d'établissement",
    likedLabel: "Qu'avez-vous apprécié ?",
    likedPlaceholder: "Pâtes maison, accueil très chaleureux",
    dislikedLabel: "Qu'est-ce qui vous a déplu ?",
    dislikedPlaceholder: "Quarante minutes d'attente pour l'entrée",
    pairNote: "Un seul des deux champs suffit.",
    suggestionShow: "Ajouter une suggestion d'amélioration",
    suggestionHide: "Masquer le champ de suggestion",
    suggestionPlaceholder: "Une personne de plus le week-end",
    suggestionLabel: "Suggestion d'amélioration",
    perspectiveLabel: "Point de vue",
    toneLabel: "Ton",
    submit: "Créer l'avis",
    editInputs: "Modifier les réponses",
  },
  status: {
    writing: "Rédaction de votre avis…",
    expectedWait: "Cela prend généralement quelques secondes.",
  },
  result: {
    heading: "Votre avis",
    edited: "modifié",
    ratingLabel: (rating) => `Note suggérée : ${rating} sur 5`,
    ratingShort: (rating) => `${rating} sur 5`,
    omissionsHeading: "Ce que nous avons écarté",
    regenerate: "Générer à nouveau",
    regenerateEdited: "Générer à nouveau — remplace votre texte modifié",
    edit: "Modifier le texte",
    doneEditing: "Terminé",
    revert: "Rétablir",
    characters: (count) =>
      count === 1 ? "1 caractère" : `${count} caractères`,
  },
  copyButton: {
    copy: "Copier",
    copied: "Copié",
    unavailable:
      "La copie n'est pas possible ici — sélectionnez le texte et appuyez sur Ctrl+C.",
  },
  error: {
    title: "Cela n'a pas fonctionné",
    coolingTitle: "Une courte pause est nécessaire",
    retryIn: (seconds) => `Réessayez dans ${seconds} s.`,
    inputKept: "Vos réponses ont été conservées.",
    retry: "Réessayer",
    code: (code) => `Code d'erreur : ${code}`,
    byCode: {
      rate_limited: "Trop de requêtes en peu de temps.",
      llm_unavailable:
        "Le service est temporairement indisponible. Veuillez réessayer dans un instant.",
      llm_invalid_output:
        "L'avis n'a pas pu être généré. Veuillez réessayer.",
      content_rejected:
        "Aucun avis n'a pu être rédigé à partir de ces informations.",
      network_error:
        "Le serveur est injoignable. Veuillez vérifier votre connexion.",
    },
  },
  category: {
    restaurant: "Restaurant",
    cafe: "Café",
    bar: "Bar",
    hotel: "Hôtel",
    cinema: "Cinéma",
    theatre: "Théâtre",
    museum: "Musée",
    shop: "Boutique",
    service: "Service",
    other: "Autre",
  },
  perspective: { impersonal: "Impersonnel", i: "Je", we: "Nous" },
  tone: { neutral: "Neutre", friendly: "Amical", concise: "Concis" },
  validation: {
    venueTooLong: "Ce nom est trop long.",
    tooLong: "C'est un peu trop long.",
    needOneField: "Veuillez remplir au moins un des deux champs.",
  },
};
