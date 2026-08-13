import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePatientDto } from '../../src/business/patient/presentation/create-patient.dto';

// TASK-022 : critere d acceptation explicite -- une creation sans dateOfBirth ni
// dateOfBirthUnknown: true est rejetee (400 au niveau du futur controleur, TASK-025) ;
// dateOfBirthUnknown: true dispense entierement de dateOfBirth.

describe('CreatePatientDto (TASK-022)', () => {
  it('rejette une creation sans dateOfBirth ni dateOfBirthUnknown (Q1 du Decision Gate)', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      firstName: 'Fatima',
      lastName: 'Test',
    });
    const errors = await validate(dto);
    const dateOfBirthError = errors.find((e) => e.property === 'dateOfBirth');
    expect(dateOfBirthError).toBeDefined();
  });

  it('accepte une creation avec dateOfBirth fournie', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      firstName: 'Fatima',
      lastName: 'Test',
      dateOfBirth: '1990-01-01',
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'dateOfBirth')).toBeUndefined();
  });

  it('accepte une creation sans dateOfBirth quand dateOfBirthUnknown vaut true', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      firstName: 'Fatima',
      lastName: 'Test',
      dateOfBirthUnknown: true,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'dateOfBirth')).toBeUndefined();
  });

  it('rejette toujours l absence de dateOfBirth si dateOfBirthUnknown vaut false explicitement', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      firstName: 'Fatima',
      lastName: 'Test',
      dateOfBirthUnknown: false,
    });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'dateOfBirth')).toBeDefined();
  });

  it('rejette une fiche sans prenom ni nom (jamais les champs strictement obligatoires)', async () => {
    const dto = plainToInstance(CreatePatientDto, { dateOfBirthUnknown: true });
    const errors = await validate(dto);
    expect(errors.find((e) => e.property === 'firstName')).toBeDefined();
    expect(errors.find((e) => e.property === 'lastName')).toBeDefined();
  });

  it('accepte une fiche minimale sans aucun champ optionnel', async () => {
    const dto = plainToInstance(CreatePatientDto, {
      firstName: 'Karim',
      lastName: 'Minimal',
      dateOfBirthUnknown: true,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });
});
