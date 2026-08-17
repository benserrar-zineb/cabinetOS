import { normalizePhone } from '../../src/business/patient/presentation/phone-normalization';

// TASK-026 : critere d acceptation explicite -- 0651.../651.../+212 651.../
// 00212 651... doivent tous produire la meme forme normalisee.

describe('normalizePhone (TASK-026)', () => {
  it('normalise un numero national avec le zero initial', () => {
    expect(normalizePhone('0651234567')).toEqual({
      countryCode: '212',
      nationalNumber: '651234567',
    });
  });

  it('normalise un numero national sans le zero initial', () => {
    expect(normalizePhone('651234567')).toEqual({
      countryCode: '212',
      nationalNumber: '651234567',
    });
  });

  it('normalise un numero avec l indicatif international (+212)', () => {
    expect(normalizePhone('+212651234567')).toEqual({
      countryCode: '212',
      nationalNumber: '651234567',
    });
  });

  it('normalise un numero avec l indicatif international et des espaces (+212 651 234 567)', () => {
    expect(normalizePhone('+212 651 234 567')).toEqual({
      countryCode: '212',
      nationalNumber: '651234567',
    });
  });

  it('normalise un numero avec le prefixe international 00 (00212651234567)', () => {
    expect(normalizePhone('00212651234567')).toEqual({
      countryCode: '212',
      nationalNumber: '651234567',
    });
  });

  it('les quatre formes citees par l encadrant produisent exactement le meme resultat', () => {
    const forms = ['0651234567', '651234567', '+212 651234567', '00212 651234567'];
    const normalized = forms.map((f) => normalizePhone(f));
    expect(new Set(normalized.map((n) => `${n.countryCode}-${n.nationalNumber}`)).size).toBe(1);
  });

  it('un numero deja normalise redonne le meme resultat (idempotent)', () => {
    const once = normalizePhone('0651234567');
    const twice = normalizePhone(once.nationalNumber);
    expect(twice).toEqual(once);
  });
});
