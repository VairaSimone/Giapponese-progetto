import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuizBadge } from '../../../hooks/useQuizBadge';
import { getApiErrorMessage } from '../../../utils/getApiErrorMessage';
import { ORDINE_CATEGORIE_BADGE, iconaBadge } from '../../../constants/gamification';
import Card from '../../../components/ui/Card';
import Spinner from '../../../components/ui/Spinner';
import ErrorState from '../../../components/shared/ErrorState';
import styles from './BadgeSection.module.css';

/** Percentuale 0..100 robusta a denominatore 0/assente. */
const percentuale = (parte, totale) => {
  if (!totale || totale <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((parte / totale) * 100)));
};

/** Barretta di progresso etichettata (maestria, righe sbloccate). */
const BarraProgresso = ({ label, valore, totale, suffisso }) => {
  const pct = percentuale(valore, totale);
  return (
    <div className={styles.progressItem}>
      <div className={styles.progressHead}>
        <span className={styles.progressLabel}>{label}</span>
        <span className={styles.progressValue}>
          {valore}
          {suffisso ? ` ${suffisso}` : ''} / {totale}
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={styles.progressFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

/**
 * BadgeSection — sezione "Obiettivi e badge" del profilo.
 *
 * Consuma `GET /quiz/badge` e mostra:
 *   - il conteggio badge sbloccati / totale;
 *   - le barre di progresso (maestria hiragana/katakana, righe sbloccate);
 *   - la griglia completa dei badge raggruppati per categoria, con stato di
 *     sblocco, icona, nome/descrizione localizzati e data di sblocco.
 *
 * Nome, descrizione e label di categoria sono risolti via i18n a partire dai
 * codici stabili restituiti dal backend (`quiz.badges.items.<CODICE>` e
 * `quiz.badges.categories.<categoria>`).
 */
const BadgeSection = () => {
  const { t, i18n } = useTranslation();
  const { data, isLoading, isError, error, refetch } = useQuizBadge();

  // Badge raggruppati per categoria, nell'ordine di visualizzazione previsto.
  const perCategoria = useMemo(() => {
    const elenco = data?.badge || [];
    const gruppi = new Map(ORDINE_CATEGORIE_BADGE.map((c) => [c, []]));
    for (const b of elenco) {
      if (!gruppi.has(b.categoria)) gruppi.set(b.categoria, []);
      gruppi.get(b.categoria).push(b);
    }
    return Array.from(gruppi.entries()).filter(([, items]) => items.length > 0);
  }, [data]);

  const formattaData = (iso) => {
    if (!iso) return null;
    try {
      return new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(iso));
    } catch {
      return null;
    }
  };

  return (
    <Card>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>{t('profile.badgesTitle')}</h2>
        {data && (
          <span className={styles.summary}>
            {t('quiz.badges.summary', {
              unlocked: data.riepilogo?.sbloccati ?? 0,
              total: data.riepilogo?.totale ?? 0,
            })}
          </span>
        )}
      </div>
      <p className={styles.sectionDescription}>{t('profile.badgesDescription')}</p>

      {isLoading && (
        <div className={styles.center}>
          <Spinner size="lg" label={t('common.loading')} />
        </div>
      )}

      {isError && <ErrorState message={getApiErrorMessage(t, error)} onRetry={refetch} />}

      {data && (
        <>
          {/* Barre di progresso (maestria + righe sbloccate) */}
          <div className={styles.progressGrid}>
            <BarraProgresso
              label={t('quiz.badges.masteryHiragana')}
              valore={data.progresso?.masteredHiragana ?? 0}
              totale={data.progresso?.totaleHiragana ?? 0}
            />
            <BarraProgresso
              label={t('quiz.badges.masteryKatakana')}
              valore={data.progresso?.masteredKatakana ?? 0}
              totale={data.progresso?.totaleKatakana ?? 0}
            />
            <BarraProgresso
              label={t('quiz.badges.rowsUnlocked')}
              valore={data.progresso?.righeSbloccate ?? 0}
              totale={data.progresso?.totaleRigheBase ?? 0}
            />
          </div>

          {/* Griglia dei badge per categoria */}
          <div className={styles.categories}>
            {perCategoria.map(([categoria, items]) => (
              <section key={categoria} className={styles.category}>
                <h3 className={styles.categoryTitle}>
                  {t(`quiz.badges.categories.${categoria}`)}
                </h3>
                <ul className={styles.grid}>
                  {items.map((b) => {
                    const dataSblocco = formattaData(b.dataSblocco);
                    return (
                      <li
                        key={b.codice}
                        className={[styles.badge, b.sbloccato ? styles.badgeOn : styles.badgeOff].join(
                          ' '
                        )}
                        title={t(`quiz.badges.items.${b.codice}.description`)}
                      >
                        <span className={styles.badgeIcon} aria-hidden="true">
                          {iconaBadge(b.codice)}
                        </span>
                        <span className={styles.badgeName}>
                          {t(`quiz.badges.items.${b.codice}.name`)}
                        </span>
                        <span className={styles.badgeDesc}>
                          {t(`quiz.badges.items.${b.codice}.description`)}
                        </span>
                        <span className={styles.badgeStatus}>
                          {b.sbloccato
                            ? dataSblocco
                              ? t('quiz.badges.unlockedOn', { date: dataSblocco })
                              : t('quiz.badges.unlocked')
                            : t('quiz.badges.locked')}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </Card>
  );
};

export default BadgeSection;
