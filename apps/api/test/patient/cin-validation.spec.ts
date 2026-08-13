import { validateCin } from '../../src/business/patient/presentation/cin-validation';

// TASK-022 : cas limites explicitement exiges par les criteres d acceptation --
// CIN sans lettre, CIN minuscule (normalise), longueur inhabituelle (accepte, seule
// la forme lettres+chiffres compte). Aucun de ces cas ne doit jamais faire echouer
// la creation -- validateCin ne leve jamais, elle renvoie juste un indicateur.

describe('validateCin (TASK-022, Q2 du Decision Gate)', () => {
  it('reconnait un format valide (1 lettre + chiffres)', () => {
    const result = validateCin('A123456');
    expect(result.formatValid).toBe(true);
    expect(result.normalized).toBe('A123456');
  });

  it('reconnait un format valide (2 lettres + chiffres)', () => {
    const result = validateCin('AB123456');
    expect(result.formatValid).toBe(true);
  });

  it('normalise en majuscules, meme pour un format valide saisi en minuscules', () => {
    const result = validateCin('ab123456');
    expect(result.normalized).toBe('AB123456');
    expect(result.formatValid).toBe(true);
  });

  it('signale un format invalide sans lettre, mais renvoie quand meme une valeur normalisee (jamais de rejet)', () => {
    const result = validateCin('123456');
    expect(result.formatValid).toBe(false);
    expect(result.normalized).toBe('123456');
  });

  it('accepte une longueur de chiffres inhabituelle (Q2 : la longueur n est pas validee)', () => {
    const short = validateCin('A1');
    const long = validateCin('AB123456789012');
    expect(short.formatValid).toBe(true);
    expect(long.formatValid).toBe(true);
  });

  it('signale un format invalide avec plus de deux lettres', () => {
    const result = validateCin('ABC123456');
    expect(result.formatValid).toBe(false);
  });

  it('signale un format invalide si aucun chiffre ne suit les lettres', () => {
    const result = validateCin('AB');
    expect(result.formatValid).toBe(false);
  });
});
