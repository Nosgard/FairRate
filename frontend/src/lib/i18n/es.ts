import type { Copy } from "./copy";

/** Addresses the guest as "tú", the usual register for a consumer product
 *  in Spanish.
 *
 *  "reseña" throughout, not "valoración" — this app produces a written
 *  text, and "valoración" names the score. */
export const es: Copy = {
  language: { legend: "Idioma" },
  form: {
    venueLabel: "¿Qué lugar estás valorando?",
    optional: "(opcional)",
    venuePlaceholder: "Trattoria Bella, Madrid",
    categoryLabel: "Tipo de lugar",
    likedLabel: "¿Qué te gustó?",
    likedPlaceholder: "Pasta casera, acogida muy cordial",
    dislikedLabel: "¿Qué te molestó?",
    dislikedPlaceholder: "Cuarenta minutos de espera para el entrante",
    pairNote: "Basta con uno de los dos campos.",
    suggestionShow: "Añadir una sugerencia de mejora",
    suggestionHide: "Ocultar el campo de sugerencia",
    suggestionPlaceholder: "Una persona más los fines de semana",
    suggestionLabel: "Sugerencia de mejora",
    perspectiveLabel: "Punto de vista",
    toneLabel: "Tono",
    submit: "Crear la reseña",
    editInputs: "Editar respuestas",
  },
  status: {
    writing: "Redactando tu reseña…",
    expectedWait: "Esto suele tardar unos segundos.",
  },
  result: {
    heading: "Tu reseña",
    edited: "editada",
    ratingLabel: (rating) => `Valoración sugerida: ${rating} de 5`,
    ratingShort: (rating) => `${rating} de 5`,
    omissionsHeading: "Lo que hemos omitido",
    regenerate: "Generar de nuevo",
    regenerateEdited: "Generar de nuevo — reemplaza tu texto editado",
    edit: "Editar el texto",
    doneEditing: "Listo",
    revert: "Restablecer",
    characters: (count) => (count === 1 ? "1 carácter" : `${count} caracteres`),
  },
  copyButton: {
    copy: "Copiar",
    copied: "Copiado",
    unavailable:
      "Aquí no se puede copiar — selecciona el texto y pulsa Ctrl+C.",
  },
  error: {
    title: "No ha funcionado",
    coolingTitle: "Hace falta una pausa breve",
    retryIn: (seconds) => `Inténtalo de nuevo en ${seconds} s.`,
    inputKept: "Tus respuestas se han conservado.",
    retry: "Intentar de nuevo",
    code: (code) => `Código de error: ${code}`,
    byCode: {
      rate_limited: "Demasiadas peticiones en poco tiempo.",
      llm_unavailable:
        "El servicio no está disponible temporalmente. Inténtalo de nuevo en un momento.",
      llm_invalid_output: "No se pudo generar la reseña. Inténtalo de nuevo.",
      content_rejected: "No se ha podido redactar una reseña con estos datos.",
      network_error:
        "No se puede contactar con el servidor. Comprueba tu conexión.",
    },
  },
  category: {
    restaurant: "Restaurante",
    cafe: "Cafetería",
    bar: "Bar",
    hotel: "Hotel",
    cinema: "Cine",
    theatre: "Teatro",
    museum: "Museo",
    shop: "Tienda",
    service: "Servicio",
    other: "Otro",
  },
  perspective: { impersonal: "Impersonal", i: "Yo", we: "Nosotros" },
  tone: { neutral: "Neutro", friendly: "Cordial", concise: "Conciso" },
  validation: {
    venueTooLong: "Este nombre es demasiado largo.",
    tooLong: "Esto es un poco largo.",
    needOneField: "Rellena al menos uno de los dos campos.",
  },
};
