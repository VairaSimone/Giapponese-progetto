'use strict';

/**
 * Effettua l'escape dei caratteri speciali di un pattern LIKE SQL.
 *
 * In MySQL i caratteri `%` e `_` sono wildcard e `\` è il carattere di
 * escape di default. Senza escape, un input utente come `%` o `a_b`
 * verrebbe interpretato come pattern, causando:
 *   - LIKE injection (l'utente controlla il pattern di ricerca);
 *   - query estremamente costose (es. `%` da solo forza la scansione
 *     dell'intera tabella).
 *
 * Questa funzione va applicata SOLO al frammento dinamico inserito dall'utente,
 * mantenendo i `%` "strutturali" aggiunti dal codice:
 *
 *   { [Op.like]: `%${escapeLike(input)}%` }
 *
 * @param {string} value valore grezzo proveniente dall'utente
 * @returns {string} valore con `\`, `%` e `_` resi letterali
 */
const escapeLike = (value) => {
  if (value === null || value === undefined) return '';
  // L'ordine è importante: il backslash va escapato per primo.
  return String(value).replace(/[\\%_]/g, '\\$&');
};

module.exports = { escapeLike };
