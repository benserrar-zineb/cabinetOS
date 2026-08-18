'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { getOrganizationId } from '../../lib/session';
import { apiFetch, ApiRequestError } from '../../lib/api-client';
import { COVERAGE_OPTIONS, CITY_OPTIONS, LANGUAGE_OPTIONS } from './patient-options';
import './patient-consultation-view.css';

// Ecran 2 (consultation) -- port fidele de
// docs/design/maquettes/consultation-fiche-patient.html et de
// docs/design/module-patient-spec.md. "Un seul ecran, lecture par defaut, bascule
// modification via un bouton Modifier -- pas de navigation entre consulter et
// editer" (spec design, Ecran 2).
//
// Les quatre zones d activite medicale restent des emplacements reserves (badge
// "A venir") -- leur contenu viendra des modules Agenda/Consultation/Prescription,
// hors perimetre de ce Build.

interface PatientRecord {
  id: string;
  sequentialNumber: number;
  status: 'active' | 'archived' | 'deceased';
  attachedAt: string;
  responsiblePatientRecordId: string | null;
}

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfBirthUnknown: boolean;
  sex: string | null;
  cin: string | null;
  nationalHealthId: string | null;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  language: string | null;
  coverageType: string | null;
  coverageNumber: string | null;
  record: PatientRecord;
}

function computeAge(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

function formatPhone(countryCode: string | null, nationalNumber: string | null): string {
  if (!nationalNumber) return '';
  return countryCode ? `+${countryCode} ${nationalNumber}` : nationalNumber;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

function formatDate(dateOfBirth: string | null): string | undefined {
  if (!dateOfBirth) return undefined;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return undefined;
  return dob.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function PatientConsultationView({ patientId }: { patientId: string }) {
  const t = useTranslations('PatientConsultation');

  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<
    | { kind: 'key'; key: 'noOrganization' | 'unexpectedError' }
    | { kind: 'raw'; message: string }
    | null
  >(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [consultNote, setConsultNote] = useState<string | null>(null);

  const [form, setForm] = useState<Partial<Patient>>({});

  const organizationId = getOrganizationId();

  const load = useCallback(async () => {
    if (!organizationId) {
      setLoadError({ kind: 'key', key: 'noOrganization' });
      setLoading(false);
      return;
    }
    try {
      const result = await apiFetch<Patient>(`/api/v1/patients/${patientId}`, {
        method: 'GET',
        organizationId,
      });
      setPatient(result.data);
      setForm(result.data);
    } catch (err) {
      if (err instanceof ApiRequestError) {
        setLoadError({ kind: 'raw', message: err.message });
      } else {
        setLoadError({ kind: 'key', key: 'unexpectedError' });
      }
    } finally {
      setLoading(false);
    }
  }, [organizationId, patientId]);

  useEffect(() => {
    load();
  }, [load]);

  function startEditing() {
    if (!patient) return;
    setForm(patient);
    setSaveError(null);
    setEditing(true);
    setDetailOpen(true);
  }

  async function handleSave() {
    if (!organizationId || !patient) return;
    setSaving(true);
    setSaveError(null);
    try {
      const editableFields = {
        firstName: form.firstName,
        lastName: form.lastName,
        dateOfBirth: form.dateOfBirth ?? undefined,
        dateOfBirthUnknown: form.dateOfBirthUnknown,
        sex: form.sex ?? undefined,
        cin: form.cin ?? undefined,
        nationalHealthId: form.nationalHealthId ?? undefined,
        phoneCountryCode: form.phoneCountryCode ?? undefined,
        phoneNationalNumber: form.phoneNationalNumber ?? undefined,
        email: form.email ?? undefined,
        address: form.address ?? undefined,
        city: form.city ?? undefined,
        country: form.country ?? undefined,
        language: form.language ?? undefined,
        coverageType: form.coverageType ?? undefined,
        coverageNumber: form.coverageNumber ?? undefined,
      };
      const result = await apiFetch<Patient>(`/api/v1/patients/${patientId}`, {
        method: 'PATCH',
        organizationId,
        body: JSON.stringify(editableFields),
      });
      setPatient(result.data);
      setForm(result.data);
      setEditing(false);
    } catch (err) {
      setSaveError(err instanceof ApiRequestError ? err.message : t('unexpectedError'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="pcv-loading">{t('loading')}</div>;
  }
  if (loadError || !patient) {
    const message = loadError
      ? loadError.kind === 'raw'
        ? loadError.message
        : t(loadError.key)
      : t('notFound');
    return <div className="pcv-error">{message}</div>;
  }

  const age = computeAge(patient.dateOfBirth);
  const coverageLabel = COVERAGE_OPTIONS.find((o) => o.value === patient.coverageType)?.label ?? '';

  return (
    <div className="pcv-wrap">
      <div className="pcv-idstrip">
        <div className="pcv-avatar" aria-hidden>
          {initials(patient.firstName, patient.lastName)}
        </div>
        <div className="pcv-idmain">
          <span className="pcv-idname">
            {patient.firstName} {patient.lastName}
          </span>
          <span className={`pcv-badge ${patient.record.status}`}>
            {t(`status.${patient.record.status}`)}
          </span>
          <span className="pcv-idfacts">
            {age !== null && (
              <>
                <span>
                  <b>{t('ageYears', { age })}</b>
                </span>
                <span className="pcv-sep">&middot;</span>
              </>
            )}
            {formatPhone(patient.phoneCountryCode, patient.phoneNationalNumber) && (
              <>
                <span>
                  <b>{formatPhone(patient.phoneCountryCode, patient.phoneNationalNumber)}</b>
                </span>
                <span className="pcv-sep">&middot;</span>
              </>
            )}
            {coverageLabel && (
              <>
                <span>
                  <b>{coverageLabel}</b>
                </span>
                <span className="pcv-sep">&middot;</span>
              </>
            )}
            <span>
              {t('recordNumber')} <b>{patient.record.sequentialNumber}</b>
            </span>
          </span>
        </div>
        <button className="pcv-more-link" onClick={() => setDetailOpen((v) => !v)}>
          {t('fullRecord')} {detailOpen ? '▲' : '▼'}
        </button>
        <div className="pcv-idactions">
          {!editing && (
            <button className="cos-btn cos-btn-ghost" onClick={startEditing}>
              {t('actions.edit')}
            </button>
          )}
          <button
            className="cos-btn cos-btn-primary"
            onClick={() => setConsultNote(t('consultationComingSoon'))}
          >
            {t('actions.startConsultation')}
          </button>
        </div>
      </div>

      {consultNote && (
        <p className="pcv-hint-text" style={{ marginTop: 8 }}>
          {consultNote}
        </p>
      )}

      {detailOpen && (
        <div className="pcv-iddetail-inner">
          <DetailRow
            label={t('field.dob')}
            value={formatDate(patient.dateOfBirth) ?? t('unknown')}
          />
          <DetailRow
            label={t('field.sex')}
            value={
              patient.sex === 'feminin'
                ? t('sexFemale')
                : patient.sex === 'masculin'
                  ? t('sexMale')
                  : undefined
            }
            editing={editing}
          >
            <select
              value={form.sex ?? ''}
              onChange={(e) => setForm({ ...form, sex: e.target.value })}
            >
              <option value="">—</option>
              <option value="feminin">{t('sexFemale')}</option>
              <option value="masculin">{t('sexMale')}</option>
            </select>
          </DetailRow>
          <DetailRow label={t('field.cin')} value={patient.cin ?? undefined} editing={editing}>
            <input
              type="text"
              style={{ textTransform: 'uppercase' }}
              value={form.cin ?? ''}
              onChange={(e) => setForm({ ...form, cin: e.target.value })}
            />
          </DetailRow>
          <DetailRow
            label={t('field.coverage')}
            value={
              coverageLabel
                ? patient.coverageNumber
                  ? `${coverageLabel} — n° ${patient.coverageNumber}`
                  : coverageLabel
                : undefined
            }
            editing={editing}
          >
            <select
              value={form.coverageType ?? ''}
              onChange={(e) => setForm({ ...form, coverageType: e.target.value })}
            >
              {COVERAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </DetailRow>
          <DetailRow label={t('field.email')} value={patient.email ?? undefined} editing={editing}>
            <input
              type="email"
              value={form.email ?? ''}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </DetailRow>
          <DetailRow
            label={t('field.address')}
            value={patient.address ?? undefined}
            editing={editing}
          >
            <input
              type="text"
              value={form.address ?? ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </DetailRow>
          <DetailRow label={t('field.city')} value={patient.city ?? undefined} editing={editing}>
            <select
              value={form.city ?? ''}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            >
              {CITY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c || '—'}
                </option>
              ))}
            </select>
          </DetailRow>
          <DetailRow
            label={t('field.country')}
            value={patient.country ?? undefined}
            editing={editing}
          >
            <input
              type="text"
              value={form.country ?? ''}
              onChange={(e) => setForm({ ...form, country: e.target.value })}
            />
          </DetailRow>
          <DetailRow
            label={t('field.language')}
            value={patient.language ?? undefined}
            editing={editing}
          >
            <select
              value={form.language ?? ''}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
            >
              {LANGUAGE_OPTIONS.map((l) => (
                <option key={l} value={l}>
                  {l || '—'}
                </option>
              ))}
            </select>
          </DetailRow>

          {editing && (
            <div className="pcv-edit-actions" style={{ gridColumn: '1 / -1' }}>
              {saveError && <div className="cpf-form-error">{saveError}</div>}
              <button className="cos-btn cos-btn-primary" disabled={saving} onClick={handleSave}>
                {t('actions.save')}
              </button>
              <button
                className="cos-btn cos-btn-ghost"
                disabled={saving}
                onClick={() => {
                  setEditing(false);
                  setForm(patient);
                  setSaveError(null);
                }}
              >
                {t('actions.cancel')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="pcv-worklabel">{t('workLabel')}</div>

      <div className="pcv-today">
        <div className="pcv-zhead">
          <h2>{t('zone.visitReason.title')}</h2>
          <span className="pcv-soon">{t('comingSoon')}</span>
        </div>
        <p>{t('zone.visitReason.description')}</p>
        <div className="pcv-placeholder">{t('zone.visitReason.placeholder')}</div>
      </div>

      <div className="pcv-zgrid">
        <div className="pcv-zone">
          <div className="pcv-zhead">
            <h2>{t('zone.history.title')}</h2>
            <span className="pcv-soon">{t('comingSoon')}</span>
          </div>
          <p>{t('zone.history.description')}</p>
          <div className="pcv-placeholder" />
        </div>
        <div className="pcv-zone">
          <div className="pcv-zhead">
            <h2>{t('zone.prescriptions.title')}</h2>
            <span className="pcv-soon">{t('comingSoon')}</span>
          </div>
          <p>{t('zone.prescriptions.description')}</p>
          <div className="pcv-placeholder" />
        </div>
        <div className="pcv-zone pcv-zfull">
          <div className="pcv-zhead">
            <h2>{t('zone.referrals.title')}</h2>
            <span className="pcv-soon">{t('comingSoon')}</span>
          </div>
          <p>{t('zone.referrals.description')}</p>
          <div className="pcv-placeholder" />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  editing,
  children,
}: {
  label: string;
  value?: string;
  editing?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="pcv-kv">
      <div className="pcv-k">{label}</div>
      <div className="pcv-v">
        {editing && children ? children : value || <span className="empty">non renseigné</span>}
      </div>
    </div>
  );
}
