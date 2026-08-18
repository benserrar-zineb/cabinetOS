// ADR-0015, point 5 : les listes ville/langue/couverture deviendront
// personnalisables par cabinet via Settings (module a venir). Listes par defaut
// codees en attendant -- reportee nommee, pas oubliee.

export const COVERAGE_OPTIONS = [
  { value: '', label: '—' },
  { value: 'sans', label: 'Sans couverture' },
  { value: 'cnss', label: 'CNSS' },
  { value: 'cnops', label: 'CNOPS' },
  { value: 'amo', label: 'AMO' },
  { value: 'mutuelle_privee', label: 'Mutuelle privée' },
] as const;

export const CITY_OPTIONS = ['', 'Casablanca', 'Rabat', 'Marrakech', 'Fès', 'Tanger', 'Agadir'];

export const LANGUAGE_OPTIONS = ['', 'Français', 'العربية'];

export const DIAL_CODE_OPTIONS = [
  { value: '212', label: '🇲🇦 +212' },
  { value: '33', label: '🇫🇷 +33' },
  { value: '34', label: '🇪🇸 +34' },
  { value: '32', label: '🇧🇪 +32' },
  { value: '1', label: '🇺🇸 +1' },
];
