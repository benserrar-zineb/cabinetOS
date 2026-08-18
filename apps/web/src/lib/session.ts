// Aucun ecran de connexion ni de selection d'organisation n'existe encore dans le
// frontend (hors perimetre de ce brief, qui ne nomme que les 3 ecrans du module
// Patient). En attendant cette brique, l'organisation courante est lue depuis un
// cookie pose par un flux de connexion futur -- ce fichier ne fait que la lire,
// il n'invente aucune logique de connexion.
//
// Signale explicitement (pas improvise) : quand l'ecran de connexion / selection
// d'organisation existera, cette fonction devra etre mise a jour pour lire son
// mecanisme reel (probablement le meme cookie, ou un contexte React) -- a discuter
// avec l'encadrant si le mecanisme choisi differe.

const ORGANIZATION_COOKIE = 'cabinetos_organization_id';

export function getOrganizationId(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }
  const match = document.cookie.match(new RegExp(`(?:^|; )${ORGANIZATION_COOKIE}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
