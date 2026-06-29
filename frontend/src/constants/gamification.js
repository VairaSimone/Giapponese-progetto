/**
 * Costanti di gamification (lato frontend).
 *
 * Rispecchiano ESATTAMENTE la fonte di verità del backend
 * (`backend/src/constants/badges.js`):
 *   - i 13 codici badge stabili e le loro 6 categorie;
 *   - il tetto rigido di tratti per chiamata a `POST /quiz/scrittura`.
 *
 * Il backend persiste e restituisce SOLO il codice del badge: nome,
 * descrizione e categoria-label sono localizzati qui via i18n
 * (`quiz.badges.items.<CODICE>` e `quiz.badges.categories.<categoria>`).
 * Questo file aggiunge soltanto l'icona di visualizzazione e l'ordine delle
 * categorie, che sono pura presentazione e non hanno senso lato server.
 */

/**
 * Tetto di tratti dichiarabili in una singola chiamata a `POST /quiz/scrittura`.
 * Deve combaciare con `MAX_TRATTI_SCRITTURA` del validator backend (50): un
 * singolo componente kana ha sempre molti meno tratti, quindi questo limite
 * non viene mai raggiunto in condizioni normali — serve solo come guardia.
 */
export const MAX_TRATTI_SCRITTURA = 50;

/**
 * Ordine di visualizzazione delle categorie di badge nel profilo.
 * Coincide con i raggruppamenti `categoria` definiti dal backend.
 */
export const ORDINE_CATEGORIE_BADGE = Object.freeze([
  'streak',
  'livello',
  'quiz',
  'maestria',
  'scrittura',
  'sblocco',
]);

/**
 * Icona (emoji) associata a ciascun codice badge. Puramente decorativa:
 * il significato del badge è veicolato dal nome/descrizione localizzati.
 * Le chiavi sono i 13 codici stabili restituiti da `GET /quiz/badge`.
 */
export const ICONE_BADGE = Object.freeze({
  STREAK_3: '🔥',
  STREAK_7: '🔥',
  STREAK_30: '🔥',
  LIVELLO_5: '⭐',
  LIVELLO_10: '🌟',
  PRIMO_QUIZ: '🎯',
  QUIZ_50: '🏆',
  PERFEZIONISTA: '💯',
  MAESTRO_HIRAGANA: 'あ',
  MAESTRO_KATAKANA: 'ア',
  PRIMI_TRATTI: '🖌️',
  SCRITTORE_INSTANCABILE: '✍️',
  ESPLORATORE: '🗺️',
});

/** Icona di fallback se un nuovo codice non avesse ancora un'icona dedicata. */
export const ICONA_BADGE_DEFAULT = '🏅';

/** Risolve l'icona di un codice badge con fallback sicuro. */
export const iconaBadge = (codice) => ICONE_BADGE[codice] || ICONA_BADGE_DEFAULT;
