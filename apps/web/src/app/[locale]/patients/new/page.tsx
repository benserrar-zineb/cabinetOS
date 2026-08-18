import { getTranslations } from 'next-intl/server';
import { CreatePatientForm } from '../../../../features/patients/create-patient-form';
import '../../../../styles/cabinetos-tokens.css';

export default async function NewPatientPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'PatientCreate' });

  return (
    <div className="cos-body">
      <div className="cos-topbar">
        <div className="cos-brand">
          Cabinet<span>OS</span>
        </div>
        <div className="cos-crumb">
          {t('breadcrumb.patients')} &rsaquo; <b>{t('breadcrumb.current')}</b>
        </div>
      </div>
      <CreatePatientForm locale={locale} />
    </div>
  );
}
