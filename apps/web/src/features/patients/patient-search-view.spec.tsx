import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PatientSearchView } from './patient-search-view';
import messages from '../../messages/fr.json';

// Ecran 3 (recherche) : le test doit prouver le comportement -- detection
// automatique du type de saisie (nom/telephone/CIN), alerte homonymes, et
// l etat d invitation quand la barre est vide (a la place des "patients
// recents", capacite absente de l API -- voir commentaire dans le composant).

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

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/session', () => ({
  getOrganizationId: () => 'org-test-id',
}));

function patientFixture(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'p1',
    firstName: 'Fatima',
    lastName: 'Bennani',
    dateOfBirth: '1990-01-01',
    dateOfBirthUnknown: false,
    phoneCountryCode: '212',
    phoneNationalNumber: '651234567',
    coverageType: 'cnss',
    record: { status: 'active' as const, sequentialNumber: 142 },
    ...overrides,
  };
}

describe('PatientSearchView (comportement)', () => {
  it("affiche une invitation a taper quand la barre est vide (pas de 'patients recents', capacite absente de l API)", () => {
    render(<PatientSearchView locale="fr" />);
    expect(screen.getByText(/Tapez un nom, un numéro de téléphone ou une CIN/)).toBeInTheDocument();
  });

  it('une saisie tout en lettres declenche une recherche par nom (q=)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/patients?q=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'p1' }], meta: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: patientFixture(), meta: {} }),
      });
    });
    const user = userEvent.setup();
    render(<PatientSearchView locale="fr" />);

    await user.type(screen.getByPlaceholderText(/Rechercher un patient/), 'fatma bennani');

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/patients?q='),
        expect.anything(),
      ),
    );
    expect(await screen.findByText('Fatima Bennani')).toBeInTheDocument();
  });

  it('une saisie tout en chiffres declenche une recherche par telephone (phone=)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/patients?phone=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'p1' }], meta: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: patientFixture(), meta: {} }),
      });
    });
    const user = userEvent.setup();
    render(<PatientSearchView locale="fr" />);

    await user.type(screen.getByPlaceholderText(/Rechercher un patient/), '0651234567');

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/patients?phone='),
        expect.anything(),
      ),
    );
  });

  it('une saisie lettres+chiffres (format CIN) declenche une recherche par CIN (cin=)', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/patients?cin=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'p1' }], meta: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: patientFixture(), meta: {} }),
      });
    });
    const user = userEvent.setup();
    render(<PatientSearchView locale="fr" />);

    await user.type(screen.getByPlaceholderText(/Rechercher un patient/), 'BK449182');

    await waitFor(() =>
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/patients?cin='),
        expect.anything(),
      ),
    );
  });

  it('affiche une alerte quand plusieurs resultats partagent le meme nom de famille', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/patients?q=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'p1' }, { id: 'p2' }], meta: {} }),
        });
      }
      if (url.includes('/p2')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: patientFixture({ id: 'p2', firstName: 'Youssef' }),
            meta: {},
          }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: patientFixture(), meta: {} }),
      });
    });
    const user = userEvent.setup();
    render(<PatientSearchView locale="fr" />);

    await user.type(screen.getByPlaceholderText(/Rechercher un patient/), 'bennani');

    expect(await screen.findByText(/Plusieurs patients portent ce nom/)).toBeInTheDocument();
  });

  it('chaque ligne de resultat affiche telephone, couverture et numero de dossier, meme pour une recherche par nom', async () => {
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/patients?q=')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [{ id: 'p1' }], meta: {} }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: patientFixture(), meta: {} }),
      });
    });
    const user = userEvent.setup();
    render(<PatientSearchView locale="fr" />);

    await user.type(screen.getByPlaceholderText(/Rechercher un patient/), 'fatima');

    expect(await screen.findByText('+212 651234567')).toBeInTheDocument();
    expect(screen.getByText('CNSS')).toBeInTheDocument();
    expect(screen.getByText(/Dossier 142/)).toBeInTheDocument();
    expect(screen.getByText('Actif')).toBeInTheDocument();
  });
});
