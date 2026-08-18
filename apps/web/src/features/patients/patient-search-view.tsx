'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { getOrganizationId } from '../../lib/session';
import { apiFetch, ApiRequestError } from '../../lib/api-client';
import { COVERAGE_OPTIONS } from './patient-options';
import './patient-search-view.css';

// Ecran 3 (recherche) -- port fidele de
// docs/design/maquettes/recherche-patients.html et de
// docs/design/module-patient-spec.md.
//
// Deux ecarts assumes par rapport a la maquette, signales explicitement (pas
// improvises) car ils touchent des capacites absentes de l API existante --
// "rien de nouveau cote modele ou API" pour ce Build :
//
// 1. Etat par defaut ("patients recents"). Aucune fonction de l API ne permet de
//    lister des patients sans un des trois criteres de recherche -- la fonction
//    de recherche par nom exige un terme non vide (le trigram operateur % ne
//    matche rien sur une chaine vide). Plutot que d inventer un nouvel endpoint,
//    l ecran affiche une invitation a taper. A discuter avec l encadrant si la
//    liste des recents devient necessaire -- ce serait un nouvel ADR/TASK cote
//    API, pas une improvisation cote ecran.
//
// 2. Enrichissement des resultats. searchPatientsByName (recherche par nom) ne
//    renvoie que id/prenom/nom/date de naissance -- pas le telephone, la
//    couverture, ni le statut/numero de dossier (qui vivent dans patientRecords,
//    non jointe par cette fonction). Pour afficher une ligne de resultat
//    coherente quel que soit le chemin de recherche (comme la maquette le
//    montre), chaque resultat est enrichi par un appel a l endpoint EXISTANT
//    GET /api/v1/patients/:id -- aucune fonction ni endpoint nouveau, juste un
//    appel supplementaire a ce qui existe deja.

interface SearchHit {
  id: string;
}

interface EnrichedPatient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  dateOfBirthUnknown: boolean;
  phoneCountryCode: string | null;
  phoneNationalNumber: string | null;
  coverageType: string | null;
  record: {
    status: 'active' | 'archived' | 'deceased';
    sequentialNumber: number;
  };
}

type SearchType = 'phone' | 'cin' | 'name';

function detectSearchType(raw: string): SearchType {
  const digits = raw.replace(/[^\d]/g, '');
  const hasLetter = /[A-Za-z]/.test(raw);
  if (digits.length >= 3 && !hasLetter) return 'phone';
  if (/^[A-Za-z]{1,2}[0-9]+$/.test(raw) && digits.length > 0) return 'cin';
  return 'name';
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

function formatDate(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  return dob.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPhone(countryCode: string | null, nationalNumber: string | null): string {
  if (!nationalNumber) return '';
  return countryCode ? `+${countryCode} ${nationalNumber}` : nationalNumber;
}

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

export function PatientSearchView({ locale }: { locale: string }) {
  const t = useTranslations('PatientSearch');
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EnrichedPatient[]>([]);
  const [searchType, setSearchType] = useState<SearchType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const organizationId = getOrganizationId();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function runSearch(raw: string) {
    if (!organizationId) {
      setError(t('noOrganization'));
      return;
    }
    const type = detectSearchType(raw);
    setSearchType(type);
    setLoading(true);
    setError(null);
    try {
      const param =
        type === 'phone'
          ? `phone=${encodeURIComponent(raw)}`
          : type === 'cin'
            ? `cin=${encodeURIComponent(raw)}`
            : `q=${encodeURIComponent(raw)}`;
      const result = await apiFetch<SearchHit[]>(`/api/v1/patients?${param}`, {
        method: 'GET',
        organizationId,
      });
      const enriched = await Promise.all(
        result.data.map((hit) =>
          apiFetch<EnrichedPatient>(`/api/v1/patients/${hit.id}`, {
            method: 'GET',
            organizationId,
          })
            .then((r) => r.data)
            .catch(() => null),
        ),
      );
      setResults(enriched.filter((p): p is EnrichedPatient => p !== null));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : t('unexpectedError'));
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed === '') {
      setResults([]);
      setSearchType(null);
      setError(null);
      return;
    }
    debounceRef.current = setTimeout(() => runSearch(trimmed), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  const hasHomonyms = useMemo(() => {
    if (results.length < 2) return false;
    const counts = new Map<string, number>();
    for (const r of results) counts.set(r.lastName, (counts.get(r.lastName) ?? 0) + 1);
    return [...counts.values()].some((c) => c > 1);
  }, [results]);

  return (
    <div className="psv-wrap">
      <div className="psv-pagehead">
        <h1>{t('title')}</h1>
        <Link href={`/${locale}/patients/new`} className="psv-btn-new">
          {t('newPatient')}
        </Link>
      </div>

      <div className="psv-searchbox">
        <span className="ic" aria-hidden>
          ⌕
        </span>
        <input
          type="text"
          placeholder={t('placeholder')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="psv-searchhint">
        <span>
          <span className="k">{t('hint.nameLabel')}</span> {t('hint.nameDesc')}
        </span>
        <span>
          <span className="k">{t('hint.phoneLabel')}</span> {t('hint.phoneDesc')}
        </span>
        <span>
          <span className="k">{t('hint.cinLabel')}</span> {t('hint.cinDesc')}
        </span>
      </div>

      {error && (
        <div className="psv-homonym" role="alert">
          <span aria-hidden>⚠</span>
          <span>{error}</span>
        </div>
      )}

      {query.trim() === '' ? (
        <div className="psv-invite">{t('invite')}</div>
      ) : (
        <>
          {hasHomonyms && (
            <div className="psv-homonym">
              <span aria-hidden>⚠</span>
              <span>{t('homonymWarning')}</span>
            </div>
          )}
          <div className="psv-listlabel">
            <span>
              {loading
                ? t('searching')
                : t('resultCount', {
                    count: results.length,
                    type: searchType ? t(`type.${searchType}`) : '',
                  })}
            </span>
          </div>
          <div className="psv-results">
            {results.length === 0 && !loading ? (
              <div className="psv-empty">{t('noResults')}</div>
            ) : (
              results.map((p) => {
                const age = computeAge(p.dateOfBirth);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="psv-prow"
                    onClick={() => router.push(`/${locale}/patients/${p.id}`)}
                  >
                    <div className="psv-pav" aria-hidden>
                      {initials(p.firstName, p.lastName)}
                    </div>
                    <div className="psv-pinfo">
                      <div className="psv-pn">
                        {p.firstName} {p.lastName}
                        <span className={`psv-badge ${p.record.status}`}>
                          {t(`status.${p.record.status}`)}
                        </span>
                      </div>
                      <div className="psv-psub">
                        <span>
                          {formatPhone(p.phoneCountryCode, p.phoneNationalNumber) || t('noPhone')}
                        </span>
                        <span className="sep">&middot;</span>
                        <span>
                          {COVERAGE_OPTIONS.find((o) => o.value === p.coverageType)?.label ||
                            t('noCoverage')}
                        </span>
                        <span className="sep">&middot;</span>
                        <span>
                          {t('recordNumber')} {p.record.sequentialNumber}
                        </span>
                      </div>
                    </div>
                    <div className="psv-pdob">
                      <b>{age !== null ? t('ageYears', { age }) : t('unknownAge')}</b>
                      {formatDate(p.dateOfBirth) ?? ''}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
