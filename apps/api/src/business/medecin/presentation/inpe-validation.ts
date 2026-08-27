// TASK-043 (BUILD-003, EA-011) : F.1 du Decision Gate -- format exactement 9
// chiffres, verifie mais JAMAIS bloquant (avertissement seulement -- l INPE reste
// optionnel dans tous les cas, ADR-0018). Normalisation systematique avant
// stockage et avant tout controle d unicite -- meme discipline que le CIN
// (TASK-022) : c est cette valeur normalisee qui doit etre stockee, pas la saisie
// brute, pour que l unicite scopee (TASK-039) et une eventuelle recherche future
// retrouvent le meme medecin quelle que soit la faaon dont l INPE a ete saisi ou
// copie-colle.
//
// Explicitement hors perimetre (F.1, F.2) : aucune verification d existence contre
// un registre externe (ANAM) -- reportee au futur module d acces (ADR-0017, point
// 9). Ici, uniquement la forme (9 chiffres), jamais le fond.

const INPE_FORMAT = /^\d{9}$/;

export interface InpeValidationResult {
  normalized: string;
  formatValid: boolean;
}

export function validateInpe(inpe: string): InpeValidationResult {
  const normalized = inpe.replace(/\s+/g, '');
  return {
    normalized,
    formatValid: INPE_FORMAT.test(normalized),
  };
}
