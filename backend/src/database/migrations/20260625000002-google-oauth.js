'use strict';

const { DataTypes } = require('sequelize');

/**
 * Supporto al login Google OAuth 2.0:
 *  - `google_id`: identificativo univoco dell'account Google collegato;
 *  - `profilo_completo`: false per gli account creati via Google senza
 *    età/classe;
 *  - rende `eta` e `classe` opzionali a livello DB (la registrazione classica
 *    continua a richiederle via validator applicativi).
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.addColumn('utenti', 'google_id', {
      type: DataTypes.STRING(255),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addIndex('utenti', ['google_id'], {
      name: 'utenti_google_id',
    });

    await queryInterface.addColumn('utenti', 'profilo_completo', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });

    await queryInterface.changeColumn('utenti', 'eta', {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: true,
    });

    await queryInterface.changeColumn('utenti', 'classe', {
      type: DataTypes.ENUM('Prima', 'Seconda', 'Terza', 'Quarta', 'Quinta'),
      allowNull: true,
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.changeColumn('utenti', 'classe', {
      type: DataTypes.ENUM('Prima', 'Seconda', 'Terza', 'Quarta', 'Quinta'),
      allowNull: false,
    });

    await queryInterface.changeColumn('utenti', 'eta', {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
    });

    await queryInterface.removeColumn('utenti', 'profilo_completo');
    await queryInterface.removeIndex('utenti', 'utenti_google_id');
    await queryInterface.removeColumn('utenti', 'google_id');
  },
};
