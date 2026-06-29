import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuizDashboard } from '../../../hooks/useQuizDashboard';
import { ROUTES } from '../../../constants/routes';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Spinner from '../../../components/ui/Spinner';
import styles from './GamificationSummary.module.css';

/**
 * GamificationSummary — scheda di progresso mostrata nella Dashboard.
 *
 * Riassume in un colpo d'occhio lo stato di gioco dell'utente:
 *   - fiamma + contatore della streak (giorni di studio consecutivi);
 *   - livello attuale con barra di avanzamento XP;
 *   - badge sbloccati su totale, con scorciatoia al profilo.
 *
 * Si auto-alimenta da `GET /quiz/dashboard` (stesso endpoint usato dalla home
 * del Quiz). È resiliente: in caricamento mostra uno spinner, in errore non
 * renderizza nulla per non degradare il resto della Dashboard.
 */
const GamificationSummary = () => {
  const { t } = useTranslation();
  const { data, isLoading, isError } = useQuizDashboard();

  if (isError) return null;

  if (isLoading || !data) {
    return (
      <Card className={styles.card}>
        <h2 className={styles.cardTitle}>{t('quiz.gamification.title')}</h2>
        <div className={styles.center}>
          <Spinner label={t('common.loading')} />
        </div>
      </Card>
    );
  }

  const { statistiche, badge } = data;
  const {
    xp = 0,
    streak = 0,
    livello = 1,
    xpProssimoLivello = 100,
    progressoLivello = 0,
  } = statistiche ?? {};
  const sbloccati = badge?.sbloccati ?? 0;
  const totaleBadge = badge?.totale ?? 0;

  const streakSpento = streak === 0;

  return (
    <Card className={styles.card}>
      <h2 className={styles.cardTitle}>{t('quiz.gamification.title')}</h2>

      {/* Streak: fiamma + giorni consecutivi */}
      <div className={styles.streakRow}>
        <span
          className={[styles.flame, streakSpento ? styles.flameOff : ''].join(' ')}
          aria-hidden="true"
        >
          🔥
        </span>
        <div className={styles.streakText}>
          <span className={styles.streakValue}>
            {t('quiz.gamification.streakDays', { count: streak })}
          </span>
          <span className={styles.streakHint}>
            {streakSpento
              ? t('quiz.gamification.streakHintEmpty')
              : t('quiz.gamification.streakHint')}
          </span>
        </div>
      </div>

      {/* Livello + barra XP */}
      <div className={styles.levelBlock}>
        <div className={styles.levelHeader}>
          <span className={styles.levelLabel}>{t('quiz.stats.level')}</span>
          <span className={styles.levelValue}>{livello}</span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuenow={progressoLivello}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('quiz.stats.levelProgress')}
        >
          <div className={styles.progressFill} style={{ width: `${progressoLivello}%` }} />
        </div>
        <p className={styles.xpText}>{t('quiz.stats.xpProgress', { xp, next: xpProssimoLivello })}</p>
      </div>

      {/* Riepilogo badge + scorciatoie */}
      <div className={styles.footer}>
        <span className={styles.badgeCount}>
          {t('quiz.gamification.badgeSummary', { unlocked: sbloccati, total: totaleBadge })}
        </span>
        <div className={styles.actions}>
          <Link to={ROUTES.QUIZ}>
            <Button size="sm">{t('quiz.gamification.goToQuiz')}</Button>
          </Link>
          <Link to={ROUTES.PROFILE}>
            <Button variant="secondary" size="sm">
              {t('quiz.gamification.viewBadges')}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};

export default GamificationSummary;
