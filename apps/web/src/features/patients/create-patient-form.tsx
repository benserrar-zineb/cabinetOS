'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getOrganizationId } from '../../lib/session';
import { apiFetch, ApiRequestError } from '../../lib/api-client';
import {
  COVERAGE_OPTIONS,
  CITY_OPTIONS,
  LANGUAGE_OPTIONS,
  DIAL_CODE_OPTIONS,
} from './patient-options';
import './create-patient-form.css';

// Ecran 1 (creation) -- port fidele de docs/design/maquettes/creation-fiche-patient.html
// et de docs/design/module-patient-spec.md. Regles reimplementees cote client ET
// revalidees cote serveur (l API refait le meme controle, ce formulaire ne fait que
// l anticiper pour une meilleure experience -- il ne remplace jamais la validation
// serveur, voir brief : "toute regle vue dans la maquette doit exister cote serveur").

interface CreatedPatient {
  id: string;
  record: { id: string };
}

const EMAIL_PLAUSIBLE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CIN_PLAUSIBLE = /^[A-Za-z]{1,2}[0-9]+$/;

function isPlausiblePhone(nationalNumber: string): boolean {
  if (nationalNumber.trim() === '') return true;
  const digits = nationalNumber.replace(/[\s\-().]/g, '');
  return /^[0-9]+$/.test(digits) && digits.length >= 6;
}

export function CreatePatientForm({ locale }: { locale: string }) {
  const t = useTranslations('PatientCreate');
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [dateOfBirthUnknown, setDateOfBirthUnknown] = useState(false);
  const [dialCode, setDialCode] = useState('212');
  const [phoneNationalNumber, setPhoneNationalNumber] = useState('');
  const [email, setEmail] = useState('');
  const [cin, setCin] = useState('');
  const [sex, setSex] = useState('');
  const [coverageType, setCoverageType] = useState('');
  const [coverageNumber, setCoverageNumber] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Maroc');
  const [language, setLanguage] = useState('');

  const [moreOpen, setMoreOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    firstName?: boolean;
    lastName?: boolean;
    dateOfBirth?: boolean;
  }>({});
  const [formErrorMessage, setFormErrorMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const organizationId = getOrganizationId();

  function handlePhoneChange(value: string) {
    // Retrait automatique du zero national initial (l'indicatif porte le pays,
    // ADR-0015) -- reproduit fidelement le comportement de la maquette.
    setPhoneNationalNumber(value.replace(/^0+/, ''));
  }

  function buildPayload() {
    const payload: Record<string, unknown> = { firstName, lastName };
    if (dateOfBirthUnknown) {
      payload.dateOfBirthUnknown = true;
    } else {
      payload.dateOfBirth = dateOfBirth;
    }
    if (phoneNationalNumber.trim()) {
      payload.phoneCountryCode = dialCode;
      payload.phoneNationalNumber = phoneNationalNumber.trim();
    }
    if (email.trim()) payload.email = email.trim();
    if (cin.trim()) payload.cin = cin.trim();
    if (sex) payload.sex = sex;
    if (coverageType) payload.coverageType = coverageType;
    if (coverageType && coverageType !== 'sans' && coverageNumber.trim()) {
      payload.coverageNumber = coverageNumber.trim();
    }
    if (address.trim()) payload.address = address.trim();
    if (city) payload.city = city;
    if (country.trim()) payload.country = country.trim();
    if (language) payload.language = language;
    return payload;
  }

  async function handleSubmit(event: FormEvent, openAfter: boolean) {
    event.preventDefault();
    setSuccessMessage(null);

    const errors: { firstName?: boolean; lastName?: boolean; dateOfBirth?: boolean } = {};
    if (firstName.trim() === '') errors.firstName = true;
    if (lastName.trim() === '') errors.lastName = true;
    if (dateOfBirth === '' && !dateOfBirthUnknown) errors.dateOfBirth = true;

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const labels: Record<string, string> = {
        firstName: t('field.firstName.label'),
        lastName: t('field.lastName.label'),
        dateOfBirth: t('validation.dobOrUnknown'),
      };
      const missing = Object.keys(errors)
        .map((key) => labels[key])
        .join(', ');
      setFormErrorMessage(`${t('validation.formErrorPrefix')} ${missing}.`);
      return;
    }

    setFormErrorMessage(null);

    if (!organizationId) {
      setFormErrorMessage(t('validation.noOrganization'));
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiFetch<CreatedPatient>('/api/v1/patients', {
        method: 'POST',
        organizationId,
        body: JSON.stringify(buildPayload()),
      });
      setWarnings(result.meta.warnings ?? []);
      if (openAfter) {
        router.push(`/${locale}/patients/${result.data.id}`);
        return;
      }
      setSuccessMessage(t('success.created'));
      setFirstName('');
      setLastName('');
      setDateOfBirth('');
      setDateOfBirthUnknown(false);
      setPhoneNationalNumber('');
      setEmail('');
      setCin('');
      setSex('');
      setCoverageType('');
      setCoverageNumber('');
      setAddress('');
      setCity('');
      setLanguage('');
    } catch (err) {
      const message = err instanceof ApiRequestError ? err.message : t('validation.unexpected');
      setFormErrorMessage(message);
    } finally {
      setSubmitting(false);
    }
  }

  const phoneWarn = !isPlausiblePhone(phoneNationalNumber);
  const emailWarn = email.trim() !== '' && !EMAIL_PLAUSIBLE.test(email.trim());
  const cinWarn = cin.trim() !== '' && !CIN_PLAUSIBLE.test(cin.trim().toUpperCase());
  const showCoverageNumber = coverageType !== '' && coverageType !== 'sans';

  return (
    <div className="cpf-wrap">
      <div className="cpf-pagehead">
        <h1>{t('title')}</h1>
        <div className="cpf-hint">
          {t('requiredHint.prefix')} <span className="cpf-req-marker">•</span>{' '}
          {t('requiredHint.suffix')}
        </div>
      </div>
      <p className="cpf-subhead">{t('subhead')}</p>

      {formErrorMessage && (
        <div className="cpf-form-error" role="alert">
          <span aria-hidden>⚠</span>
          <span>{formErrorMessage}</span>
        </div>
      )}
      {successMessage && (
        <div className="cpf-created-ok" role="status">
          <span aria-hidden>✓</span>
          <span>{successMessage}</span>
        </div>
      )}
      {warnings.map((warning) => (
        <div
          className="cpf-form-error"
          role="alert"
          key={warning}
          style={{ background: '#FBF3E4', borderColor: '#E8D4A8', color: '#B26B00' }}
        >
          <span aria-hidden>⚠</span>
          <span>{warning}</span>
        </div>
      ))}

      <form onSubmit={(event) => handleSubmit(event, false)}>
        <div className="cpf-core">
          <div className="cpf-corelabel">
            <span className="cpf-dot" aria-hidden />
            {t('coreLabel')}
          </div>

          <div className="cpf-row">
            <div className={`cpf-field ${fieldErrors.firstName ? 'cpf-error' : ''}`}>
              <label htmlFor="firstName">
                {t('field.firstName.label')}
                <span className="cpf-req-marker">•</span>
              </label>
              <input
                id="firstName"
                type="text"
                autoFocus
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              {fieldErrors.firstName && (
                <div className="cpf-field-err">{t('field.firstName.error')}</div>
              )}
            </div>
            <div className={`cpf-field ${fieldErrors.lastName ? 'cpf-error' : ''}`}>
              <label htmlFor="lastName">
                {t('field.lastName.label')}
                <span className="cpf-req-marker">•</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
              {fieldErrors.lastName && (
                <div className="cpf-field-err">{t('field.lastName.error')}</div>
              )}
            </div>
          </div>

          <div className="cpf-row">
            <div
              className={`cpf-field ${fieldErrors.dateOfBirth ? 'cpf-error' : ''}`}
              style={{ flex: 1 }}
            >
              <label htmlFor="dateOfBirth">
                {t('field.dateOfBirth.label')}
                <span className="cpf-req-marker">•</span>
              </label>
              <div className="cpf-dob-controls">
                <input
                  id="dateOfBirth"
                  type="date"
                  disabled={dateOfBirthUnknown}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
                <label className="cpf-unknown">
                  <input
                    type="checkbox"
                    checked={dateOfBirthUnknown}
                    onChange={(e) => {
                      setDateOfBirthUnknown(e.target.checked);
                      if (e.target.checked) setDateOfBirth('');
                    }}
                  />
                  {t('field.dateOfBirth.unknown')}
                </label>
              </div>
              {fieldErrors.dateOfBirth && (
                <div className="cpf-field-err">{t('field.dateOfBirth.error')}</div>
              )}
              {dateOfBirthUnknown && (
                <div className="cpf-dob-note">{t('field.dateOfBirth.unknownNote')}</div>
              )}
            </div>
            <div className="cpf-field" style={{ flex: 1 }}>
              <label htmlFor="phone">
                {t('field.phone.label')}
                <span className="cpf-opt">{t('field.phone.recommended')}</span>
              </label>
              <div className="cpf-phone-group">
                <select
                  aria-label={t('field.phone.dialCodeLabel')}
                  value={dialCode}
                  onChange={(e) => setDialCode(e.target.value)}
                >
                  {DIAL_CODE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <input
                  id="phone"
                  type="tel"
                  placeholder="612 345 678"
                  value={phoneNationalNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                />
              </div>
              {phoneWarn ? (
                <div className="cpf-warn-text">{t('field.phone.warning')}</div>
              ) : (
                <div className="cpf-hint-text">{t('field.phone.hint')}</div>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="cpf-more-toggle"
          aria-expanded={moreOpen}
          onClick={() => setMoreOpen((v) => !v)}
        >
          <span>
            {t('more.toggle')} <span className="cpf-count">{t('more.toggleHint')}</span>
          </span>
          <span className="cpf-chev" aria-hidden>
            ▼
          </span>
        </button>

        {moreOpen && (
          <div className="cpf-more-inner">
            <div className="cpf-grp">{t('more.groupContact')}</div>
            <div className="cpf-row">
              <div className="cpf-field">
                <label htmlFor="email">
                  {t('field.email.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                {emailWarn && <div className="cpf-warn-text">{t('field.email.warning')}</div>}
              </div>
              <div className="cpf-field" />
            </div>

            <div className="cpf-grp">{t('more.groupIdentification')}</div>
            <div className="cpf-row">
              <div className="cpf-field">
                <label htmlFor="cin">
                  {t('field.cin.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <input
                  id="cin"
                  type="text"
                  style={{ textTransform: 'uppercase' }}
                  value={cin}
                  onChange={(e) => setCin(e.target.value)}
                />
                {cinWarn ? (
                  <div className="cpf-warn-text">{t('field.cin.warning')}</div>
                ) : (
                  <div className="cpf-hint-text">{t('field.cin.hint')}</div>
                )}
              </div>
              <div className="cpf-field">
                <label htmlFor="sex">
                  {t('field.sex.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <select id="sex" value={sex} onChange={(e) => setSex(e.target.value)}>
                  <option value="">—</option>
                  <option value="feminin">{t('field.sex.female')}</option>
                  <option value="masculin">{t('field.sex.male')}</option>
                </select>
              </div>
            </div>
            <div className="cpf-row">
              <div className="cpf-field">
                <label htmlFor="coverageType">
                  {t('field.coverage.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <select
                  id="coverageType"
                  value={coverageType}
                  onChange={(e) => setCoverageType(e.target.value)}
                >
                  {COVERAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {showCoverageNumber && (
                <div className="cpf-field">
                  <label htmlFor="coverageNumber">
                    {t('field.coverageNumber.label')}
                    <span className="cpf-opt">{t('field.optional')}</span>
                  </label>
                  <input
                    id="coverageNumber"
                    type="text"
                    value={coverageNumber}
                    onChange={(e) => setCoverageNumber(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="cpf-grp">{t('more.groupAddress')}</div>
            <div className="cpf-row">
              <div className="cpf-field" style={{ flex: 2 }}>
                <label htmlFor="address">
                  {t('field.address.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div className="cpf-field" style={{ flex: 1 }}>
                <label htmlFor="city">
                  {t('field.city.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <select id="city" value={city} onChange={(e) => setCity(e.target.value)}>
                  {CITY_OPTIONS.map((c) => (
                    <option key={c} value={c}>
                      {c || '—'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="cpf-row">
              <div className="cpf-field">
                <label htmlFor="country">
                  {t('field.country.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <input
                  id="country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
              <div className="cpf-field">
                <label htmlFor="language">
                  {t('field.language.label')}
                  <span className="cpf-opt">{t('field.optional')}</span>
                </label>
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((l) => (
                    <option key={l} value={l}>
                      {l || '—'}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="cpf-cfg-note">{t('more.configurableListsNote')}</div>
          </div>
        )}

        <div className="cpf-actions">
          <button type="submit" className="cos-btn cos-btn-primary" disabled={submitting}>
            {t('actions.create')}
          </button>
          <button
            type="button"
            className="cos-btn cos-btn-ghost"
            disabled={submitting}
            onClick={(event) => handleSubmit(event, true)}
          >
            {t('actions.createAndOpen')}
          </button>
          <div className="cpf-spacer" />
        </div>
      </form>
    </div>
  );
}
