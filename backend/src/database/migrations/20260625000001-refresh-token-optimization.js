'use strict';

const { DataTypes } = require('sequelize');

/**
 * Ottimizzazione del lookup del refresh token:
 *  - converte `refresh_token` da TEXT a STRING(64) (lunghezza fissa di un
 *    hash SHA-256 in hex), così la colonna può essere indicizzata;
 *  - aggiunge un indice su `refresh_token` per eliminare il full table scan.
 */
module.exports = {
  up: async ({ context: queryInterface }) => {
    await queryInterface.changeColumn('utenti', 'refresh_token', {
      type: DataTypes.STRING(64),
      allowNull: true,
      defaultValue: null,
    });

    await queryInterface.addIndex('utenti', ['refresh_token'], {
      name: 'utenti_refresh_token',
    });
  },

  down: async ({ context: queryInterface }) => {
    await queryInterface.removeIndex('utenti', 'utenti_refresh_token');

    await queryInterface.changeColumn('utenti', 'refresh_token', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },
};
