import { getTranslations } from 'next-intl/server';
import { PatientConsultationView } from '../../../../features/patients/patient-consultation-view';
import '../../../../styles/cabinetos-tokens.css';

export default async function PatientConsultationPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const t = await getTranslations({ locale, namespace: 'PatientConsultation' });

  return (
    <div className="cos-body">
      <div className="cos-topbar">
        <div className="cos-brand">
          Cabinet<span>OS</span>
        </div>
        <div className="cos-crumb">{t('breadcrumb.patients')}</div>
      </div>
      <PatientConsultationView patientId={id} />
    </div>
  );
}
