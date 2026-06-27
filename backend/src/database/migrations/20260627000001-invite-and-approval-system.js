'use strict';

const { DataTypes } = require('sequelize');

/**
 * Sistema ad inviti + flusso di approvazione insegnanti.
 *
 * Modifiche alla tabella `utenti`:
 *   - estende l'ENUM `ruolo` aggiungendo il ruolo `admin`;
 *   - aggiunge `stato` ENUM('attivo','in_attesa','rifiutato'): governa il
 *     ciclo di vita dell'account. Gli insegnanti candidati restano
 *     'in_attesa' finché un admin non li approva e NON possono autenticarsi.
 *     Default 'attivo' → gli account già presenti restano operativi.
 *   - aggiunge `nota_candidatura` (TEXT): messaggio facoltativo inviato
 *     dall'insegnante in fase di candidatura, visibile all'admin.
 *
 * Nuova tabella `inviti`:
 *   - traccia gli inviti generati da insegnanti (studenti) e admin (insegnanti);
 *   - il token è salvato SOLO come hash SHA-256 (64 hex), indicizzato e univoco;
 *   - `classe` valorizzata solo per gli inviti studente.
 */
const CLASSI = ['Prima', 'Seconda', 'Terza', 'Quarta', 'Quinta'];

module.exports = {
  up: async ({ context: queryInterface }) => {
    const sequelize = queryInterface.sequelize;

    // 1. Estende l'ENUM dei ruoli con `admin`.
    await queryInterface.changeColumn('utenti', 'ruolo', {
      type: DataTypes.ENUM('studente', 'insegnante', 'admin'),
      allowNull: false,
      defaultValue: 'studente',
    });

    // 2. Stato dell'account (ciclo di vita / approvazione).
    await queryInterface.addColumn('utenti', 'stato', {
      type: DataTypes.ENUM('attivo', 'in_attesa', 'rifiutato'),
      allowNull: false,
      defaultValue: 'attivo',
    });

    // 3. Nota di candidatura insegnante (facoltativa).
    await queryInterface.addColumn('utenti', 'nota_candidatura', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addIndex('utenti', ['stato'], { name: 'utenti_stato' });

    // 4. Tabella inviti.
    await queryInterface.createTable('inviti', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      ruolo: {
        type: DataTypes.ENUM('studente', 'insegnante'),
        allowNull: false,
      },
      classe: {
        type: DataTypes.ENUM(...CLASSI),
        allowNull: true,
      },
      token_hash: {
        type: DataTypes.STRING(64),
        allowNull: false,
        unique: true,
      },
      stato: {
        type: DataTypes.ENUM('pendente', 'completato', 'revocato'),
        allowNull: false,
        defaultValue: 'pendente',
      },
      scadenza: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      invitato_da: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'utenti', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      },
      utente_creato_id: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'utenti', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
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

    await queryInterface.addIndex('inviti', ['token_hash'], {
      name: 'inviti_token_hash',
      unique: true,
    });
    await queryInterface.addIndex('inviti', ['email'], { name: 'inviti_email' });
    await queryInterface.addIndex('inviti', ['stato'], { name: 'inviti_stato' });
    await queryInterface.addIndex('inviti', ['invitato_da'], { name: 'inviti_invitato_da' });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.dropTable('inviti');

    await queryInterface.removeIndex('utenti', 'utenti_stato');
    await queryInterface.removeColumn('utenti', 'nota_candidatura');
    await queryInterface.removeColumn('utenti', 'stato');

    // Ripristina l'ENUM ruolo originale (best-effort: eventuali utenti `admin`
    // andrebbero prima riassegnati a un ruolo valido).
    await queryInterface.changeColumn('utenti', 'ruolo', {
      type: DataTypes.ENUM('studente', 'insegnante'),
      allowNull: false,
      defaultValue: 'studente',
    });

    // Rimuove i tipi ENUM orfani creati da Postgres (no-op su MySQL).
    const dialect = queryInterface.sequelize.getDialect();
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_utenti_stato";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inviti_ruolo";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inviti_classe";');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_inviti_stato";');
    }
  },
};
