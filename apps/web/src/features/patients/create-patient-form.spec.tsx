import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreatePatientForm } from './create-patient-form';
import messages from '../../messages/fr.json';

// Brief "Implementation des interfaces" : le test doit prouver le comportement,
// pas seulement que l'ecran s'affiche -- les deux regles explicitement citees :
// 1) refus sans date ni case "inconnue" ; 2) CIN mal forme jamais bloquant.
//
// next-intl est distribue en ESM (node_modules non transforme par Jest par defaut) --
// useTranslations est simule ici par une simple lecture dans les vrais messages
// fr.json, pour tester le comportement reel sans depender du transform ESM.

function getNested(obj: unknown, path: string): string {
  const value = path
    .split('.')
    .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);
  return typeof value === 'string' ? value : path;
}

jest.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string) =>
    getNested((messages as Record<string, unknown>)[namespace], key),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('../../lib/session', () => ({
  getOrganizationId: () => 'org-test-id',
}));

function renderForm() {
  return render(<CreatePatientForm locale="fr" />);
}

describe('CreatePatientForm (comportement)', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  it('refuse la creation sans date de naissance ni case "date inconnue" (Q1)', async () => {
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Prénom/), 'Fatima');
    await user.type(screen.getByLabelText(/^Nom/), 'Test');
    await user.click(screen.getByRole('button', { name: 'Créer la fiche' }));

    expect(await screen.findByText(/date de naissance \(ou « inconnue »\)/)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('accepte la creation sans date quand "date inconnue" est cochee', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'p1', record: { id: 'r1' } }, meta: {} }),
    });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Prénom/), 'Fatima');
    await user.type(screen.getByLabelText(/^Nom/), 'Test');
    await user.click(screen.getByLabelText('Date inconnue'));
    await user.click(screen.getByRole('button', { name: 'Créer la fiche' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.dateOfBirthUnknown).toBe(true);
    expect(body.dateOfBirth).toBeUndefined();
  });

  it("un CIN mal forme n'est jamais bloquant : la creation reussit quand meme", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { id: 'p1', record: { id: 'r1' } },
        meta: { warnings: ['Le format du CIN ne correspond pas au format attendu.'] },
      }),
    });
    const user = userEvent.setup();
    renderForm();

    await user.type(screen.getByLabelText(/^Prénom/), 'Fatima');
    await user.type(screen.getByLabelText(/^Nom/), 'Test');
    await user.click(screen.getByLabelText('Date inconnue'));
    await user.click(screen.getByText("Ajouter plus d'informations"));
    await user.type(screen.getByLabelText(/^CIN/), '123456');

    // Avertissement doux visible avant meme la soumission -- jamais de blocage.
    expect(screen.getByText(/Ce format ne ressemble pas à une CIN habituelle/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Créer la fiche' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.cin).toBe('123456');
    expect(await screen.findByText('Fiche créée.')).toBeInTheDocument();
  });

  it('un telephone national avec un zero initial est automatiquement nettoye (ADR-0015)', async () => {
    const user = userEvent.setup();
    renderForm();

    const phoneInput = screen.getByLabelText(/^Téléphone/);
    await user.type(phoneInput, '0651234567');

    expect(phoneInput).toHaveValue('651234567');
  });

  it("le champ CIN n'apparait qu'apres avoir ouvert \"Ajouter plus d'informations\"", () => {
    renderForm();
    expect(screen.queryByLabelText(/^CIN/)).not.toBeInTheDocument();
  });
});
