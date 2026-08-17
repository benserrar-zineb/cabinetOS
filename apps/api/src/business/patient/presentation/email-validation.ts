// Spec de design, Ecran 1 (creation) : "E-mail : avertissement doux si la structure est
// manifestement incorrecte, jamais de blocage." Meme philosophie que le CIN (Q2) -- une
// verification de plausibilite, jamais un rejet. Contrairement au CIN, aucune
// normalisation n'est appliquee (l e-mail est stocke tel quel, en minuscules par
// convention habituelle, mais ce n est pas une exigence explicite ici).

const EMAIL_PLAUSIBLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isPlausibleEmail(email: string): boolean {
  return EMAIL_PLAUSIBLE.test(email);
}
