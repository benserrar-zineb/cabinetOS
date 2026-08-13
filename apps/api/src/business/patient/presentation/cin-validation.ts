// TASK-022 (BUILD-002, EA-008) : Q2 du Decision Gate -- format ^[A-Za-z]{1,2}[0-9]+$
// (1-2 lettres puis des chiffres), verifie mais JAMAIS bloquant (avertissement
// seulement -- le CIN reste optionnel dans tous les cas, ADR-0014). Normalisation en
// majuscules systematique, avant stockage et avant tout controle d unicite -- c est
// cette valeur normalisee qui doit etre stockee, pas la saisie brute.
//
// Explicitement hors perimetre (Q2) : la longueur des chiffres n est pas validee, la
// lettre n est pas verifiee contre une liste de prefixes regionaux valides.

const CIN_FORMAT = /^[A-Za-z]{1,2}[0-9]+$/;

export interface CinValidationResult {
  normalized: string;
  formatValid: boolean;
}

export function validateCin(cin: string): CinValidationResult {
  const normalized = cin.toUpperCase();
  return {
    normalized,
    formatValid: CIN_FORMAT.test(normalized),
  };
}
