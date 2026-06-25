import { useTranslation } from 'react-i18next';
import styles from './GoogleAuthButton.module.css';

/**
 * Pulsante "Continua con Google".
 *
 * Avvia il flusso OAuth con una NAVIGAZIONE del browser (non una chiamata
 * XHR/axios) verso l'endpoint backend `GET /api/auth/google`. Il redirect
 * di livello superiore è necessario perché:
 *   - Google richiede una vera navigazione (non è chiamabile via fetch);
 *   - i cookie httpOnly (access/refresh) vengono impostati dal backend
 *     durante il redirect finale verso il frontend.
 *
 * Al ritorno, l'app ricostruisce la sessione tramite GET /me (useCurrentUser),
 * quindi non serve gestire token lato client.
 */
const GoogleAuthButton = ({ label }) => {
  const { t } = useTranslation();

  const handleClick = () => {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    // Rimuove un eventuale slash finale per evitare doppi slash.
    const normalized = base.replace(/\/$/, '');
    window.location.href = `${normalized}/auth/google`;
  };

  return (
    <button type="button" className={styles.googleButton} onClick={handleClick}>
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 18 18" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
          <path
            fill="#4285F4"
            d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
          />
          <path
            fill="#34A853"
            d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.33A9 9 0 0 0 9 18z"
          />
          <path
            fill="#FBBC05"
            d="M3.98 10.72a5.41 5.41 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.02-2.33z"
          />
          <path
            fill="#EA4335"
            d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58z"
          />
        </svg>
      </span>
      <span>{label || t('auth.google.button')}</span>
    </button>
  );
};

export default GoogleAuthButton;
