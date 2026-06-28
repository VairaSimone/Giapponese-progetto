'use strict';

const { DataTypes } = require('sequelize');

/**
 * Sistema Quiz Kana — statistiche di gioco + SRS per carattere.
 *
 * Modifiche alla tabella `utenti` (statistiche globali):
 *   - `xp`                 INTEGER NOT NULL DEFAULT 0  → punti esperienza;
 *   - `streak`             INTEGER NOT NULL DEFAULT 0  → giorni consecutivi;
 *   - `ultima_data_studio` DATE (solo data), NULL      → continuità streak;
 *   - `punteggio_record`   INTEGER NOT NULL DEFAULT 0  → % massima in un quiz.
 *   (Il livello NON è una colonna: è derivato dagli XP a runtime.)
 *
 * Nuova tabella `progressi_kana` (SRS):
 *   - un record per coppia utente/kana, con punteggio 0-5 (default 3);
 *   - unique composito (utente_id, kana) → usato anche dall'upsert;
 *   - cancellazione a cascata con l'utente.
 */
const TIPI_KANA = ['hiragana', 'katakana'];

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;

    // 1. Statistiche di gioco sulla tabella utenti.
    await queryInterface.addColumn('utenti', 'xp', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('utenti', 'streak', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('utenti', 'ultima_data_studio', {
      type: DataTypes.DATEONLY,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('utenti', 'punteggio_record', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    // 2. Tabella dei progressi SRS per singolo kana.
    await queryInterface.createTable('progressi_kana', {
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
      kana: {
        type: DataTypes.STRING(8),
        allowNull: false,
      },
      tipo: {
        type: DataTypes.ENUM(...TIPI_KANA),
        allowNull: false,
      },
      punteggio: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
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

    await queryInterface.addIndex('progressi_kana', ['utente_id', 'kana'], {
      name: 'progressi_kana_utente_kana',
      unique: true,
    });
    await queryInterface.addIndex('progressi_kana', ['utente_id'], {
      name: 'progressi_kana_utente_id',
    });
    await queryInterface.addIndex('progressi_kana', ['utente_id', 'punteggio'], {
      name: 'progressi_kana_utente_punteggio',
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('progressi_kana');

    await queryInterface.removeColumn('utenti', 'punteggio_record');
    await queryInterface.removeColumn('utenti', 'ultima_data_studio');
    await queryInterface.removeColumn('utenti', 'streak');
    await queryInterface.removeColumn('utenti', 'xp');

    // Rimuove il tipo ENUM orfano creato da Postgres (no-op su MySQL).
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_progressi_kana_tipo";');
    }
  },
};
