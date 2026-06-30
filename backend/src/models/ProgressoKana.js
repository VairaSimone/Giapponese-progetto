'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Utente = require('./Utente');

// Tipi di sillabario tracciati.
const TIPI_KANA = ['hiragana', 'katakana'];

// Range del punteggio SRS del singolo carattere.
//   0 = appena sbagliato/sconosciuto · 3 = neutro (default) · 5 = padroneggiato.
const PUNTEGGIO_MIN = 0;
const PUNTEGGIO_MAX = 5;
const PUNTEGGIO_DEFAULT = 3;

/**
 * ProgressoKana — Sistema di Ripetizione Spaziata (SRS) per singolo carattere.
 *
 * Traccia, per ogni utente e per ogni kana, un punteggio di conoscenza che
 * guida la selezione dei caratteri nei quiz successivi:
 *   - `generateQuizPool` pesca prima i kana con punteggio < 3 (da rivedere);
 *   - ad ogni risposta corretta il punteggio sale (max 5), ad ogni errore
 *     scende (min 0).
 *
 * Vincolo di unicità composito (utente_id + kana): un solo record di
 * progresso per coppia utente/carattere. Hiragana e katakana non collidono
 * mai a livello di carattere, quindi la coppia è sufficiente; `tipo` resta
 * memorizzato per filtraggio e visualizzazione.
 */
class ProgressoKana extends Model {
  /** Dati esponibili al client. */
  toPublicJSON() {
    return {
      kana: this.kana,
      tipo: this.tipo,
      punteggio: this.punteggio,
      tentativi: this.tentativi,
      errori: this.errori,
      erroriTratti: this.errori_tratti,
      // Tasso di errore nelle risposte (0..1); 0 se non ancora tentato.
      tassoErrore: this.tentativi > 0 ? this.errori / this.tentativi : 0,
    };
  }
}

ProgressoKana.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Proprietario del progresso.
    utente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'utente_id',
    },

    // Il carattere kana (es. 'あ', 'しゃ'). Gli yōon occupano 2 code unit.
    kana: {
      type: DataTypes.STRING(8),
      allowNull: false,
      validate: {
        notEmpty: { msg: 'Il kana non può essere vuoto' },
      },
    },

    tipo: {
      type: DataTypes.ENUM(...TIPI_KANA),
      allowNull: false,
      validate: {
        isIn: {
          args: [TIPI_KANA],
          msg: `Il tipo deve essere uno di: ${TIPI_KANA.join(', ')}`,
        },
      },
    },

    punteggio: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: PUNTEGGIO_DEFAULT,
      validate: {
        min: { args: [PUNTEGGIO_MIN], msg: `Il punteggio minimo è ${PUNTEGGIO_MIN}` },
        max: { args: [PUNTEGGIO_MAX], msg: `Il punteggio massimo è ${PUNTEGGIO_MAX}` },
        isInt: { msg: 'Il punteggio deve essere un numero intero' },
      },
    },

    // ─────────────────────────────────────────────
    // Statistiche di errore (Caratteri problematici / Allenamento Intensivo)
    // Contatori MONOTÒNI a vita per carattere: alimentano la sezione dei
    // "caratteri problematici" e la selezione della modalità intensiva.
    // ─────────────────────────────────────────────

    // Numero totale di volte in cui il carattere è stato proposto in un quiz.
    tentativi: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'I tentativi non possono essere negativi' },
        isInt: { msg: 'I tentativi devono essere un numero intero' },
      },
    },

    // Numero di risposte ERRATE al carattere nei quiz (≤ tentativi).
    errori: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: 'Gli errori non possono essere negativi' },
        isInt: { msg: 'Gli errori devono essere un numero intero' },
      },
    },

    // Numero di volte in cui l'ORDINE DEI TRATTI è stato sbagliato durante gli
    // esercizi di scrittura su canvas. Indipendente dagli errori di quiz.
    errori_tratti: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'errori_tratti',
      validate: {
        min: { args: [0], msg: 'Gli errori di tratto non possono essere negativi' },
        isInt: { msg: 'Gli errori di tratto devono essere un numero intero' },
      },
    },
  },
  {
    sequelize,
    modelName: 'ProgressoKana',
    tableName: 'progressi_kana',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      // Unicità composita: un solo progresso per coppia utente/kana.
      // È anche la chiave usata dall'upsert (ON DUPLICATE KEY UPDATE).
      { unique: true, fields: ['utente_id', 'kana'], name: 'progressi_kana_utente_kana' },
      // Lookup rapido di tutti i progressi di un utente.
      { fields: ['utente_id'], name: 'progressi_kana_utente_id' },
      // Indice composito per le query della dashboard (mastered / peggiori).
      { fields: ['utente_id', 'punteggio'], name: 'progressi_kana_utente_punteggio' },
      // Indice per la sezione "caratteri problematici": filtra rapidamente i
      // caratteri con errori dell'utente prima dell'ordinamento applicativo.
      { fields: ['utente_id', 'errori'], name: 'progressi_kana_utente_errori' },
    ],
  }
);

// ─────────────────────────────────────────────
// Associazioni
//   La cancellazione di un utente rimuove a cascata i suoi progressi.
// ─────────────────────────────────────────────
ProgressoKana.belongsTo(Utente, { as: 'utente', foreignKey: 'utente_id', onDelete: 'CASCADE' });
Utente.hasMany(ProgressoKana, { as: 'progressiKana', foreignKey: 'utente_id', onDelete: 'CASCADE' });

ProgressoKana.TIPI_KANA = TIPI_KANA;
ProgressoKana.PUNTEGGIO_MIN = PUNTEGGIO_MIN;
ProgressoKana.PUNTEGGIO_MAX = PUNTEGGIO_MAX;
ProgressoKana.PUNTEGGIO_DEFAULT = PUNTEGGIO_DEFAULT;

module.exports = ProgressoKana;
