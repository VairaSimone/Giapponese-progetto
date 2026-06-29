import toast from 'react-hot-toast';
import { iconaBadge } from '../../constants/gamification';

/**
 * Mostra un toast per ogni badge appena sbloccato.
 *
 * I codici arrivano dal backend (`risultatoRound.nuoviBadge` dal submit del
 * quiz, `risultato.nuoviBadge` dalla registrazione scrittura). Nome e
 * messaggio sono localizzati via i18n; l'icona viene dal catalogo frontend.
 *
 * Tollerante: ignora input vuoti o non-array, così i chiamanti possono
 * passare direttamente il campo della risposta senza guardie aggiuntive.
 *
 * @param {(key:string, opts?:object) => string} t  funzione di traduzione i18next
 * @param {string[]} codici  codici badge stabili (es. ['STREAK_3'])
 */
export const mostraBadgeSbloccati = (t, codici) => {
  if (!Array.isArray(codici) || codici.length === 0) return;

  codici.forEach((codice) => {
    const nome = t(`quiz.badges.items.${codice}.name`);
    toast.success(t('quiz.badges.unlockedToast', { name: nome }), {
      icon: iconaBadge(codice),
      duration: 4500,
    });
  });
};
