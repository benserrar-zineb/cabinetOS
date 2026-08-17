import {
  patients,
  patientRecords,
  patientRecordCounters,
  patientRecordStatusEnum,
} from '../../src/business/patient/infrastructure/schema';

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
    expect(patients.phoneCountryCode.notNull).toBe(false);
    expect(patients.phoneNationalNumber.notNull).toBe(false);
    expect(patients.city.notNull).toBe(false);
    expect(patients.coverageType.notNull).toBe(false);
    expect(patients.coverageNumber.notNull).toBe(false);
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

// TASK-018 : critere d acceptation explicite -- sequentialNumber unique par
// (organizationId, sequentialNumber) ; status par defaut 'active' ;
// responsiblePatientRecordId nullable, auto-reference vers patientRecords.

describe('patientRecords schema (TASK-018)', () => {
  it('est definie, avec son enum de statut et son compteur', () => {
    expect(patientRecords).toBeDefined();
    expect(patientRecordStatusEnum).toBeDefined();
    expect(patientRecordCounters).toBeDefined();
  });

  it('impose organizationId, patientId, sequentialNumber, status', () => {
    expect(patientRecords.organizationId.notNull).toBe(true);
    expect(patientRecords.patientId.notNull).toBe(true);
    expect(patientRecords.sequentialNumber.notNull).toBe(true);
    expect(patientRecords.status.notNull).toBe(true);
    expect(patientRecords.attachedAt.notNull).toBe(true);
  });

  it("statut par defaut 'active' -- jamais archive/decede a la creation", () => {
    expect(patientRecords.status.default).toBe('active');
  });

  it('accepte exactement trois valeurs de statut (Q3 du Decision Gate)', () => {
    expect(patientRecordStatusEnum.enumValues).toEqual(['active', 'archived', 'deceased']);
  });

  it('responsiblePatientRecordId est nullable (dependant sans identite autonome, Q5)', () => {
    expect(patientRecords.responsiblePatientRecordId.notNull).toBe(false);
  });

  it('patientRecordCounters demarre a 1 par organisation', () => {
    expect(patientRecordCounters.organizationId.notNull).toBe(true);
    expect(patientRecordCounters.nextValue.notNull).toBe(true);
    expect(patientRecordCounters.nextValue.default).toBe(1);
  });
});
