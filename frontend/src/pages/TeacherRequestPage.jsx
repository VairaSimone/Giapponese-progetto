import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { buildTeacherRequestSchema } from '../validators/authSchemas';
import { useTeacherRequest } from '../hooks/useInviteRegistration';
import { parseApiError } from '../utils/parseApiError';
import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { ROUTES } from '../constants/routes';
import Card from '../components/ui/Card';
import TextField from '../components/ui/TextField';
import Button from '../components/ui/Button';
import FormError from '../components/shared/FormError';
import styles from './AuthPage.module.css';

const TeacherRequestPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const teacherRequest = useTeacherRequest();
  const [formError, setFormError] = useState(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const schema = useMemo(() => buildTeacherRequestSchema(t), [t]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async ({ confermaPassword: _confermaPassword, motivazione, ...rest }) => {
    setFormError(null);
    const payload = { ...rest };
    if (motivazione && motivazione.trim()) payload.motivazione = motivazione.trim();

    try {
      await teacherRequest.mutateAsync(payload);
      setIsSuccess(true);
    } catch (err) {
      const parsed = parseApiError(err);
      if (parsed.fieldErrors) {
        Object.entries(parsed.fieldErrors).forEach(([field, message]) => {
          if (field in payload || field === 'confermaPassword') {
            setError(field, { type: 'server', message });
          }
        });
      }
      setFormError(getApiErrorMessage(t, err));
    }
  };

  if (isSuccess) {
    return (
      <div className={styles.wrapper}>
        <Card className={styles.card}>
          <div className={styles.successBox}>
            <div className={styles.successIcon} aria-hidden="true">
              済
            </div>
            <h1 className={styles.title}>{t('auth.teacherRequest.successTitle')}</h1>
            <p className={styles.successText}>{t('auth.teacherRequest.successText')}</p>
            <Button fullWidth onClick={() => navigate(ROUTES.LOGIN)}>
              {t('auth.teacherRequest.successCta')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <Card className={styles.cardWide}>
        <div className={styles.header}>
          <span className={styles.mark} aria-hidden="true">
            師
          </span>
          <h1 className={styles.title}>{t('auth.teacherRequest.title')}</h1>
          <p className={styles.subtitle}>{t('auth.teacherRequest.subtitle')}</p>
        </div>

        <FormError message={formError} />

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className={styles.formRow}>
            <TextField
              label={t('auth.fields.nome')}
              autoComplete="given-name"
              required
              error={errors.nome?.message}
              {...register('nome')}
            />
            <TextField
              label={t('auth.fields.cognome')}
              autoComplete="family-name"
              required
              error={errors.cognome?.message}
              {...register('cognome')}
            />
          </div>

          <TextField
            label={t('auth.fields.email')}
            type="email"
            autoComplete="email"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <TextField
            label={t('auth.fields.password')}
            type="password"
            autoComplete="new-password"
            required
            hint={t('auth.passwordHint')}
            error={errors.password?.message}
            {...register('password')}
          />

          <TextField
            label={t('auth.fields.confirmPassword')}
            type="password"
            autoComplete="new-password"
            required
            error={errors.confermaPassword?.message}
            {...register('confermaPassword')}
          />

          <TextField
            label={t('auth.teacherRequest.motivazioneLabel')}
            hint={t('auth.teacherRequest.motivazioneHint')}
            error={errors.motivazione?.message}
            {...register('motivazione')}
          />

          <Button type="submit" fullWidth size="lg" isLoading={teacherRequest.isPending}>
            {t('auth.teacherRequest.submit')}
          </Button>
        </form>

        <p className={styles.switchAuth}>
          {t('auth.teacherRequest.haveAccount')}{' '}
          <Link to={ROUTES.LOGIN}>{t('nav.login')}</Link>
        </p>
      </Card>
    </div>
  );
};

export default TeacherRequestPage;
