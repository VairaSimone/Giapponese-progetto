'use strict';

const { DataTypes } = require('sequelize');

/**
 * Heatmap attività + Streak record + Caratteri problematici.
 *
 * 1) Tabella `utenti` — primato della streak:
 *    - `streak_record` INTEGER NOT NULL DEFAULT 0 → massima striscia di giorni
 *      consecutivi mai raggiunta (monotòna). Inizializzata al valore corrente
 *      di `streak` per non azzerare il primato degli utenti esistenti.
 *
 * 2) Tabella `progressi_kana` — statistiche di errore per carattere
 *    (sezione "Caratteri problematici" / Allenamento Intensivo):
 *    - `tentativi`     INTEGER NOT NULL DEFAULT 0 → volte in cui il carattere
 *      è stato proposto in un quiz;
 *    - `errori`        INTEGER NOT NULL DEFAULT 0 → risposte errate (≤ tentativi);
 *    - `errori_tratti` INTEGER NOT NULL DEFAULT 0 → errori di ordine dei tratti
 *      negli esercizi di scrittura su canvas.
 *    + indice (utente_id, errori) per il filtraggio dei caratteri problematici.
 *
 * 3) Nuova tabella `attivita_giornaliera` — HEATMAP (griglia dei contributi):
 *    - una riga per coppia (utente, giorno) con i contatori aggregati del giorno;
 *    - unique composito (utente_id, giorno) → accumulo incrementale idempotente;
 *    - indice (utente_id, giorno) per la lettura della finestra temporale;
 *    - cancellazione a cascata con l'utente.
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;

    // 1. Primato della streak sulla tabella utenti.
    await queryInterface.addColumn('utenti', 'streak_record', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    // Inizializza il record alla streak corrente per gli utenti esistenti.
    await sequelize.query('UPDATE utenti SET streak_record = streak WHERE streak > streak_record;');

    // 2. Statistiche di errore per carattere su progressi_kana.
    await queryInterface.addColumn('progressi_kana', 'tentativi', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('progressi_kana', 'errori', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('progressi_kana', 'errori_tratti', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addIndex('progressi_kana', ['utente_id', 'errori'], {
      name: 'progressi_kana_utente_errori',
    });

    // 3. Tabella dell'attività giornaliera (heatmap).
    await queryInterface.createTable('attivita_giornaliera', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      utente_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'utenti', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      giorno: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      quiz_completati: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      risposte_totali: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      risposte_corrette: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      tratti_validati: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      xp_guadagnati: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('attivita_giornaliera', ['utente_id', 'giorno'], {
      name: 'attivita_utente_giorno',
      unique: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    // 3. Tabella attività giornaliera.
    await queryInterface.dropTable('attivita_giornaliera');

    // 2. Statistiche di errore per carattere.
    await queryInterface.removeIndex('progressi_kana', 'progressi_kana_utente_errori');
    await queryInterface.removeColumn('progressi_kana', 'errori_tratti');
    await queryInterface.removeColumn('progressi_kana', 'errori');
    await queryInterface.removeColumn('progressi_kana', 'tentativi');

    // 1. Primato della streak.
    await queryInterface.removeColumn('utenti', 'streak_record');
  },
};
