import { patients } from '../../src/business/patient/infrastructure/schema';

// TASK-017 : critere d acceptation explicite (docs/specs/BUILD-002-patient.md) --
// firstName/lastName non nullables, tous les autres champs metier nullables.
// dateOfBirthUnknown est technique (defaut false), pas un champ metier optionnel.

describe('patients schema (TASK-017)', () => {
  it('est definie', () => {
    expect(patients).toBeDefined();
  });

  it('impose organizationId, firstName, lastName et dateOfBirthUnknown', () => {
    expect(patients.organizationId.notNull).toBe(true);
    expect(patients.firstName.notNull).toBe(true);
    expect(patients.lastName.notNull).toBe(true);
    expect(patients.dateOfBirthUnknown.notNull).toBe(true);
  });

  it('laisse nullable tout le reste (saisie rapide, complete plus tard)', () => {
    expect(patients.dateOfBirth.notNull).toBe(false);
    expect(patients.sex.notNull).toBe(false);
    expect(patients.cin.notNull).toBe(false);
    expect(patients.nationalHealthId.notNull).toBe(false);
    expect(patients.phone.notNull).toBe(false);
    expect(patients.email.notNull).toBe(false);
    expect(patients.address.notNull).toBe(false);
    expect(patients.country.notNull).toBe(false);
    expect(patients.language.notNull).toBe(false);
    expect(patients.deletedAt.notNull).toBe(false);
  });

  it('dateOfBirthUnknown vaut false par defaut (jamais "inconnu" par defaut)', () => {
    expect(patients.dateOfBirthUnknown.default).toBe(false);
  });
});
