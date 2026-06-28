import { useTranslation } from 'react-i18next';
import TeacherRequestRow from './TeacherRequestRow';
import Skeleton from '../../../components/shared/Skeleton';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import styles from './Admin.module.css';

const TeacherRequestsList = ({ requests, isLoading, isError, errorMessage, onRetry }) => {
  const { t } = useTranslation();

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`req-skeleton-${index}`} variant="block" height="5rem" />
        ))}
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return (
      <EmptyState
        title={t('admin.requests.emptyTitle')}
        description={t('admin.requests.emptyDescription')}
      />
    );
  }

  return (
    <div className={styles.list}>
      {requests.map((candidatura) => (
        <TeacherRequestRow key={candidatura.id} candidatura={candidatura} />
      ))}
    </div>
  );
};

export default TeacherRequestsList;
