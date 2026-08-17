// TASK-026 (BUILD-002, EA-009) : precision de l encadrant -- la recherche par
// telephone doit trouver le meme patient quelle que soit la forme de saisie :
// indicatif international (+212, 00212) ou national (0651...), avec ou sans le
// zero initial, avec ou sans espaces. La normalisation s applique des deux cotes
// (saisie ET stockage) -- c est la meme fonction qui sert aux deux, pour garantir
// que la comparaison se fait toujours sur des formes identiques.
//
// Indicatif par defaut : Maroc (212), seul marche adresse par ce Build. Un numero
// deja normalise (ex. venant de la base) repasse par la meme fonction sans effet
// indesirable -- '651234567' redonne '651234567', jamais modifie une seconde fois.

const DEFAULT_COUNTRY_CODE = '212';

export interface NormalizedPhone {
  countryCode: string;
  nationalNumber: string;
}

export function normalizePhone(
  input: string,
  defaultCountryCode: string = DEFAULT_COUNTRY_CODE,
): NormalizedPhone {
  let digits = input.replace(/[^\d+]/g, '');

  if (digits.startsWith('+')) {
    digits = digits.slice(1);
  } else if (digits.startsWith('00')) {
    digits = digits.slice(2);
  }

  const rest = digits.startsWith(defaultCountryCode)
    ? digits.slice(defaultCountryCode.length)
    : digits;

  const nationalNumber = rest.replace(/^0+/, '');

  return { countryCode: defaultCountryCode, nationalNumber };
}
