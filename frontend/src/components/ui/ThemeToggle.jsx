import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import styles from './ThemeToggle.module.css';

/**
 * Icona "sole" (tema chiaro attivo -> click per passare a scuro).
 */
const SunIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
);

/**
 * Icona "luna" (tema scuro attivo -> click per passare a chiaro).
 */
const MoonIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/**
 * Toggle del tema (Chiaro / Scuro).
 *
 * - Inverte il tema in tempo reale (nessun refresh) via useTheme/themeStore.
 * - Accessibile: `aria-pressed` riflette lo stato "scuro", `aria-label`/`title`
 *   localizzati descrivono l'azione risultante dal click.
 * - L'icona mostra lo stato CORRENTE (sole = chiaro, luna = scuro).
 */
const ThemeToggle = () => {
  const { t } = useTranslation();
  const { isDark, toggleTheme } = useTheme();

  // Etichetta orientata all'azione: cosa farà il click.
  const label = isDark ? t('theme.toggleToLight') : t('theme.toggleToDark');

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={isDark}
      title={label}
    >
      <span className={styles.icon} aria-hidden="true">
        {isDark ? <MoonIcon /> : <SunIcon />}
      </span>
    </button>
  );
};

export default ThemeToggle;
