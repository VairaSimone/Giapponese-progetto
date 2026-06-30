'use strict';

/**
 * dateUtils — helper per le date di gioco, normalizzate in UTC e compatibili
 * con le colonne `DATEONLY` ('YYYY-MM-DD') usate da streak e attività.
 *
 * Estratti qui da `quizService` per essere condivisi senza duplicazioni tra il
 * Quiz Kana (streak), il `statisticheService` (heatmap/streak) e il modello
 * `AttivitaGiornaliera`, evitando derive di logica tra i vari punti d'uso.
 *
 * Convenzione UNICA del progetto: il "giorno di studio" è sempre il giorno
 * solare in UTC. Questo rende streak e heatmap deterministici e indipendenti
 * dal fuso del server.
 */

/** Mezzanotte UTC odierna come oggetto Date. */
const mezzanotteOdiernaUTC = () => {
  const ora = new Date();
  return new Date(Date.UTC(ora.getUTCFullYear(), ora.getUTCMonth(), ora.getUTCDate()));
};

/** Formatta una Date in stringa 'YYYY-MM-DD' (porzione data dell'ISO UTC). */
const formattaDataOnly = (d) => d.toISOString().slice(0, 10);

/**
 * Costruisce un oggetto Date (mezzanotte UTC) a partire da una stringa
 * 'YYYY-MM-DD'. Tollerante: accetta anche una Date già pronta.
 */
const dataDaStringa = (dataStr) => {
  if (dataStr instanceof Date) {
    return new Date(Date.UTC(dataStr.getUTCFullYear(), dataStr.getUTCMonth(), dataStr.getUTCDate()));
  }
  const [anno, mese, giorno] = String(dataStr).split('-').map(Number);
  return new Date(Date.UTC(anno, mese - 1, giorno));
};

/**
 * Differenza in giorni tra una data memorizzata ('YYYY-MM-DD' o Date) e una
 * Date di riferimento (mezzanotte UTC). Positiva se la data memorizzata è nel
 * passato rispetto al riferimento.
 */
const differenzaGiorni = (dataStr, riferimento) => {
  const memorizzata = dataDaStringa(dataStr);
  return Math.round((riferimento.getTime() - memorizzata.getTime()) / 86400000);
};

/**
 * Restituisce la mezzanotte UTC di `giorni` giorni fa rispetto a oggi.
 * Usato per delimitare la finestra della heatmap (es. ultimi 365 giorni).
 */
const giorniFaUTC = (giorni) => {
  const oggi = mezzanotteOdiernaUTC();
  return new Date(oggi.getTime() - Math.max(0, giorni) * 86400000);
};

module.exports = {
  mezzanotteOdiernaUTC,
  formattaDataOnly,
  dataDaStringa,
  differenzaGiorni,
  giorniFaUTC,
};
