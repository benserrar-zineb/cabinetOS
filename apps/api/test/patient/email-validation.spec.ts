import { isPlausibleEmail } from '../../src/business/patient/presentation/email-validation';

// Spec de design, Ecran 1 : "avertissement doux si la structure est manifestement
// incorrecte, jamais de blocage" -- meme philosophie que le CIN. Ce test verifie
// uniquement l indicateur de plausibilite ; le non-blocage lui-meme est prouve au
// niveau du controleur (patient.controller.e2e-spec.ts).

describe('isPlausibleEmail', () => {
  it('reconnait une adresse plausible', () => {
    expect(isPlausibleEmail('fatima@example.com')).toBe(true);
  });

  it('signale une adresse sans @ comme non plausible', () => {
    expect(isPlausibleEmail('fatima-example.com')).toBe(false);
  });

  it('signale une adresse sans domaine comme non plausible', () => {
    expect(isPlausibleEmail('fatima@example')).toBe(false);
  });
});
