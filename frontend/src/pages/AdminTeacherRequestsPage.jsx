import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTeacherRequestsList } from '../hooks/useTeacherRequests';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { ACCOUNT_STATES } from '../constants/domain';
import TeacherRequestsList from '../features/admin/components/TeacherRequestsList';
import pageStyles from './UsersManagementPage.module.css';
import styles from '../features/admin/components/Admin.module.css';

const AdminTeacherRequestsPage = () => {
  const { t } = useTranslation();
  // Default: solo candidature in attesa (filtro lato backend).
  const [stato, setStato] = useState(ACCOUNT_STATES.IN_ATTESA);

  const filters = stato === 'tutte' ? { stato: 'tutte' } : { stato };
  const { data, isLoading, isError, error, refetch } = useTeacherRequestsList(filters);

  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <h1 className={pageStyles.title}>{t('admin.requests.title')}</h1>
        <p className={pageStyles.subtitle}>{t('admin.requests.subtitle')}</p>
      </header>

      <div className={styles.filter}>
        <label htmlFor="request-stato-filter" className={styles.filterLabel}>
          {t('admin.requests.filterLabel')}
        </label>
        <select
          id="request-stato-filter"
          className={styles.filterSelect}
          value={stato}
          onChange={(event) => setStato(event.target.value)}
        >
          <option value={ACCOUNT_STATES.IN_ATTESA}>{t('stati.in_attesa')}</option>
          <option value={ACCOUNT_STATES.ATTIVO}>{t('stati.attivo')}</option>
          <option value={ACCOUNT_STATES.RIFIUTATO}>{t('stati.rifiutato')}</option>
          <option value="tutte">{t('admin.requests.filterAll')}</option>
        </select>
      </div>

      <TeacherRequestsList
        requests={data ?? []}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? getApiErrorMessage(t, error) : null}
        onRetry={refetch}
      />
    </div>
  );
};

export default AdminTeacherRequestsPage;
