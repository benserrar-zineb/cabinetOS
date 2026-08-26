import { medecins, medecinSpecialtyEnum } from '../../src/business/medecin/infrastructure/schema';

// TASK-038 (BUILD-003, EA-010) : critere d acceptation explicite (Passe 2, F.2) --
// seuls organizationId, firstName et lastName sont obligatoires. Tout le reste,
// y compris l identifiant professionnel (INPE, numero d Ordre), reste nullable au
// niveau schema -- toute exigence plus stricte est une validation applicative
// (TASK-043), jamais une contrainte de colonne.

describe('medecins schema (TASK-038)', () => {
  it('est definie', () => {
    expect(medecins).toBeDefined();
  });

  it('impose organizationId, firstName et lastName', () => {
    expect(medecins.organizationId.notNull).toBe(true);
    expect(medecins.firstName.notNull).toBe(true);
    expect(medecins.lastName.notNull).toBe(true);
  });

  it('laisse nullable tout le reste, y compris l identifiant professionnel (F.2)', () => {
    expect(medecins.userId.notNull).toBe(false);
    expect(medecins.specialty.notNull).toBe(false);
    expect(medecins.inpe.notNull).toBe(false);
    expect(medecins.numeroOrdre.notNull).toBe(false);
    expect(medecins.description.notNull).toBe(false);
    expect(medecins.phoneCountryCode.notNull).toBe(false);
    expect(medecins.phoneNationalNumber.notNull).toBe(false);
    expect(medecins.email.notNull).toBe(false);
    expect(medecins.city.notNull).toBe(false);
    expect(medecins.locationReference.notNull).toBe(false);
  });

  it("contient les 35 specialites, sans code 'medecine_generale' (absence = generaliste, F.4)", () => {
    expect(medecinSpecialtyEnum.enumValues).toHaveLength(35);
    expect(medecinSpecialtyEnum.enumValues).not.toContain('medecine_generale');
    expect(medecinSpecialtyEnum.enumValues).toContain('cardiologie');
    expect(medecinSpecialtyEnum.enumValues).toContain('medecine_urgence');
  });
});
