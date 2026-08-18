import { PatientSearchView } from '../../../features/patients/patient-search-view';
import '../../../styles/cabinetos-tokens.css';

export default async function PatientsSearchPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="cos-body">
      <div className="cos-topbar">
        <div className="cos-brand">
          Cabinet<span>OS</span>
        </div>
        <div className="cos-crumb">Patients</div>
      </div>
      <PatientSearchView locale={locale} />
    </div>
  );
}
