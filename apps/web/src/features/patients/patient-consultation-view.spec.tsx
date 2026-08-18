import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientConsultationView } from './patient-consultation-view';
import messages from '../../messages/fr.json';

// Ecran 2 (consultation) : le test doit prouver le comportement -- affichage des
// donnees reelles, bascule "Fiche complete", et surtout la bascule edition/lecture
// "un seul ecran, pas de navigation entre consulter et editer" (spec design).

function getNested(obj: unknown, path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
  return typeof value === 'string' ? value : path;
}

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, params?: Record<string, unknown>) => {
    let text = getNested((messages as Record<string, unknown>)[namespace], key);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, String(v));
      }
    }
    return text;
  },
}));

jest.mock('../../lib/session', () => ({
  getOrganizationId: () => 'org-test-id',
}));

const patientFixture = {
  id: 'p1',
  firstName: 'Fatima',
  lastName: 'Bennani',
  dateOfBirth: '1990-01-01',
  dateOfBirthUnknown: false,
  sex: 'feminin',
  cin: 'AB123456',
  nationalHealthId: null,
  phoneCountryCode: '212',
  phoneNationalNumber: '651234567',
  email: null,
  address: null,
  city: null,
  country: 'Maroc',
  language: null,
  coverageType: 'cnss',
  coverageNumber: '123456789',
  record: {
    id: 'r1',
    sequentialNumber: 142,
    status: 'active' as const,
    attachedAt: '2024-01-01',
    responsiblePatientRecordId: null,
  },
};

describe('PatientConsultationView (comportement)', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: patientFixture, meta: {} }),
    });
  });

  it('affiche le nom, le statut et le numero de dossier apres chargement', async () => {
    render(<PatientConsultationView patientId="p1" />);

    expect(await screen.findByText('Fatima Bennani')).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('142')).toBeInTheDocument();
  });

  it('le detail complet est replie par defaut, et se deplie au clic', async () => {
    render(<PatientConsultationView patientId="p1" />);
    await screen.findByText('Fatima Bennani');

    expect(screen.queryByText('AB123456')).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByText(/Fiche complète/));

    expect(screen.getByText('AB123456')).toBeInTheDocument();
  });

  it('le bouton Modifier bascule vers des champs editables, sans changer d ecran', async () => {
    render(<PatientConsultationView patientId="p1" />);
    await screen.findByText('Fatima Bennani');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));

    // Toujours le meme ecran (le nom reste affiche), mais le CIN est maintenant
    // un champ modifiable plutot qu un texte simple.
    expect(screen.getByText('Fatima Bennani')).toBeInTheDocument();
    expect(screen.getByDisplayValue('AB123456')).toBeInTheDocument();
  });

  it('Enregistrer envoie une requete PATCH avec les champs modifies', async () => {
    render(<PatientConsultationView patientId="p1" />);
    await screen.findByText('Fatima Bennani');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Modifier' }));

    const cinInput = screen.getByDisplayValue('AB123456');
    await user.clear(cinInput);
    await user.type(cinInput, 'CD987654');

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { ...patientFixture, cin: 'CD987654' },
        meta: {},
      }),
    });

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    const [url, options] = (global.fetch as jest.Mock).mock.calls[1];
    expect(url).toBe('/api/v1/patients/p1');
    expect(options.method).toBe('PATCH');
    const body = JSON.parse(options.body);
    expect(body.cin).toBe('CD987654');
  });

  it('Demarrer la consultation affiche une note (module pas encore construit), sans planter', async () => {
    render(<PatientConsultationView patientId="p1" />);
    await screen.findByText('Fatima Bennani');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Démarrer la consultation' }));

    expect(
      screen.getByText("Le module Consultation n'est pas encore disponible."),
    ).toBeInTheDocument();
  });

  it('les quatre zones reservees affichent bien le badge "A venir"', async () => {
    render(<PatientConsultationView patientId="p1" />);
    await screen.findByText('Fatima Bennani');

    expect(screen.getAllByText('À venir')).toHaveLength(4);
  });
});
