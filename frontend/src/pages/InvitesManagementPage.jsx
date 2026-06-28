import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useInvitesList } from '../hooks/useInvites';
import { useAuthStore, selectIsAdmin } from '../store/authStore';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { INVITE_STATES } from '../constants/domain';
import StudentInviteForm from '../features/invites/components/StudentInviteForm';
import TeacherInviteForm from '../features/invites/components/TeacherInviteForm';
import InvitesList from '../features/invites/components/InvitesList';
import pageStyles from './UsersManagementPage.module.css';
import styles from '../features/invites/components/Invites.module.css';

const InvitesManagementPage = () => {
  const { t } = useTranslation();
  const isAdmin = useAuthStore(selectIsAdmin);
  const [filters, setFilters] = useState({});

  const { data, isLoading, isError, error, refetch } = useInvitesList(filters);

  const handleFilterChange = (event) => {
    const value = event.target.value;
    setFilters(value ? { stato: value } : {});
  };

  return (
    <div className={pageStyles.page}>
      <header className={pageStyles.intro}>
        <h1 className={pageStyles.title}>{t('invites.managementTitle')}</h1>
        <p className={pageStyles.subtitle}>{t('invites.managementSubtitle')}</p>
      </header>

      <div className={[styles.panels, isAdmin ? styles.twoCols : ''].join(' ')}>
        <StudentInviteForm />
        {isAdmin && <TeacherInviteForm />}
      </div>

      <h2 className={styles.sectionTitle}>{t('invites.list.title')}</h2>

      <div className={styles.filter}>
        <label htmlFor="invite-stato-filter" className={styles.filterLabel}>
          {t('invites.filters.statoLabel')}
        </label>
        <select
          id="invite-stato-filter"
          className={styles.filterSelect}
          value={filters.stato ?? ''}
          onChange={handleFilterChange}
        >
          <option value="">{t('invites.filters.statoAll')}</option>
          <option value={INVITE_STATES.PENDENTE}>{t('invites.status.pendente')}</option>
          <option value={INVITE_STATES.COMPLETATO}>{t('invites.status.completato')}</option>
          <option value={INVITE_STATES.REVOCATO}>{t('invites.status.revocato')}</option>
        </select>
      </div>

      <InvitesList
        invites={data ?? []}
        isLoading={isLoading}
        isError={isError}
        errorMessage={isError ? getApiErrorMessage(t, error) : null}
        onRetry={refetch}
      />
    </div>
  );
};

export default InvitesManagementPage;
