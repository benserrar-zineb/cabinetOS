import { validateInpe } from '../../src/business/medecin/presentation/inpe-validation';

// TASK-043 (BUILD-003, EA-011) : F.1 du Decision Gate -- format exactement 9
// chiffres. Aucun de ces cas ne doit jamais faire echouer la creation --
// validateInpe ne leve jamais, elle renvoie juste un indicateur (meme discipline
// que validateCin, TASK-022).

describe('validateInpe (TASK-043, F.1 du Decision Gate)', () => {
  it('reconnait un format valide (exactement 9 chiffres)', () => {
    const result = validateInpe('123456789');
    expect(result.formatValid).toBe(true);
    expect(result.normalized).toBe('123456789');
  });

  it('retire les espaces (saisie ou copier-coller avec espaces), pour que l unicite scopee retrouve la meme fiche', () => {
    const result = validateInpe('123 456 789');
    expect(result.normalized).toBe('123456789');
    expect(result.formatValid).toBe(true);
  });

  it('signale un format invalide si moins de 9 chiffres, mais renvoie quand meme une valeur normalisee (jamais de rejet)', () => {
    const result = validateInpe('12345678');
    expect(result.formatValid).toBe(false);
    expect(result.normalized).toBe('12345678');
  });

  it('signale un format invalide si plus de 9 chiffres', () => {
    const result = validateInpe('1234567890');
    expect(result.formatValid).toBe(false);
  });

  it('signale un format invalide si des lettres sont presentes', () => {
    const result = validateInpe('12345678A');
    expect(result.formatValid).toBe(false);
  });

  it('signale un format invalide pour une chaine vide', () => {
    const result = validateInpe('');
    expect(result.formatValid).toBe(false);
    expect(result.normalized).toBe('');
  });
});
