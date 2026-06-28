import { useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useApproveTeacher, useRejectTeacher } from '../../../hooks/useTeacherRequests';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';
import { ACCOUNT_STATES } from '../../../constants/domain';
import Badge from '../../../components/ui/Badge';
import Button from '../../../components/ui/Button';
import ConfirmDialog from '../../../components/shared/ConfirmDialog';
import styles from './Admin.module.css';

const STATE_TONE = {
  [ACCOUNT_STATES.ATTIVO]: 'matcha',
  [ACCOUNT_STATES.IN_ATTESA]: 'gold',
  [ACCOUNT_STATES.RIFIUTATO]: 'danger',
};

const TeacherRequestRow = ({ candidatura }) => {
  const { t, i18n } = useTranslation();
  const approveMutation = useApproveTeacher();
  const rejectMutation = useRejectTeacher();
  const [isConfirmingReject, setIsConfirmingReject] = useState(false);

  const isPending = candidatura.stato === ACCOUNT_STATES.IN_ATTESA;
  const fullName = `${candidatura.nome} ${candidatura.cognome}`;
  const submitted = candidatura.created_at
    ? new Date(candidatura.created_at).toLocaleDateString(i18n.language)
    : '—';

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync(candidatura.id);
      toast.success(t('admin.requests.approved', { name: fullName }));
    } catch (err) {
      toast.error(getApiErrorMessage(t, err));
    }
  };

  const handleReject = async () => {
    try {
      await rejectMutation.mutateAsync({ id: candidatura.id });
      toast.success(t('admin.requests.rejected', { name: fullName }));
    } catch (err) {
      toast.error(getApiErrorMessage(t, err));
    } finally {
      setIsConfirmingReject(false);
    }
  };

  const busy = approveMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <div className={styles.item}>
        <div className={styles.itemMain}>
          <span className={styles.fullName}>{fullName}</span>
          <span className={styles.email}>{candidatura.email}</span>
          <div className={styles.meta}>
            <Badge tone={STATE_TONE[candidatura.stato] ?? 'neutral'}>
              {t(`stati.${candidatura.stato}`)}
            </Badge>
            <span>{t('admin.requests.submittedOn', { date: submitted })}</span>
          </div>
          {candidatura.nota_candidatura && (
            <p className={styles.note}>{candidatura.nota_candidatura}</p>
          )}
        </div>

        {isPending && (
          <div className={styles.actions}>
            <Button size="sm" onClick={handleApprove} isLoading={approveMutation.isPending} disabled={busy}>
              {t('admin.requests.approve')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsConfirmingReject(true)}
              disabled={busy}
            >
              {t('admin.requests.reject')}
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={isConfirmingReject}
        title={t('admin.requests.confirmRejectTitle')}
        description={t('admin.requests.confirmRejectDescription', { name: fullName })}
        confirmLabel={t('admin.requests.reject')}
        isLoading={rejectMutation.isPending}
        onConfirm={handleReject}
        onCancel={() => setIsConfirmingReject(false)}
      />
    </>
  );
};

export default TeacherRequestRow;
