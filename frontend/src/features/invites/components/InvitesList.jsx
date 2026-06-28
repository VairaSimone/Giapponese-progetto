import { useTranslation } from 'react-i18next';
import InviteRow from './InviteRow';
import Skeleton from '../../../components/shared/Skeleton';
import EmptyState from '../../../components/shared/EmptyState';
import ErrorState from '../../../components/shared/ErrorState';
import styles from './Invites.module.css';

const InvitesList = ({ invites, isLoading, isError, errorMessage, onRetry }) => {
  const { t } = useTranslation();

  if (isError) {
    return <ErrorState message={errorMessage} onRetry={onRetry} />;
  }

  if (isLoading) {
    return (
      <div className={styles.list}>
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={`invite-skeleton-${index}`} variant="block" height="4rem" />
        ))}
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <EmptyState
        title={t('invites.list.emptyTitle')}
        description={t('invites.list.emptyDescription')}
      />
    );
  }

  return (
    <div className={styles.list}>
      {invites.map((invito) => (
        <InviteRow key={invito.id} invito={invito} />
      ))}
    </div>
  );
};

export default InvitesList;
