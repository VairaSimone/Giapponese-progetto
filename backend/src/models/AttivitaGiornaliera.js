'use strict';

const { DataTypes, Model } = require('sequelize');
const sequelize = require('../config/database');
const Utente = require('./Utente');
const { mezzanotteOdiernaUTC, formattaDataOnly } = require('../utils/dateUtils');

/**
 * AttivitaGiornaliera — registro giornaliero dell'attività di studio.
 *
 * Una riga per coppia (utente, giorno): aggrega TUTTO ciò che l'utente fa in
 * un giorno solare UTC (quiz completati, risposte date/corrette, tratti
 * validati sul canvas, XP guadagnati). È la sorgente della HEATMAP in stile
 * "griglia dei contributi di GitHub".
 *
 * Perché una tabella aggregata per-giorno e non un log per-evento:
 *   - la heatmap legge al massimo ~365 righe per utente (una per giorno),
 *     senza GROUP BY su un log potenzialmente enorme;
 *   - gli incrementi sono idempotenti rispetto allo schema (UPSERT sulla
 *     coppia unica utente/giorno) e atomici dentro la transazione del quiz.
 *
 * Vincolo di unicità composito (utente_id + giorno): garantisce una sola riga
 * per giorno ed è la chiave usata dall'accumulo incrementale.
 */
class AttivitaGiornaliera extends Model {
  /** Dati esponibili al client per un singolo giorno. */
  toPublicJSON() {
    return {
      giorno: this.giorno,
      quizCompletati: this.quiz_completati,
      risposteTotali: this.risposte_totali,
      risposteCorrette: this.risposte_corrette,
      trattiValidati: this.tratti_validati,
      xpGuadagnati: this.xp_guadagnati,
    };
  }

  /**
   * Registra (accumula) l'attività di un utente per il giorno corrente, dentro
   * una transazione esistente. Crea la riga del giorno se assente, altrimenti
   * incrementa i contatori. Tutti i delta sono opzionali e default 0.
   *
   * IMPORTANTE: va chiamata SEMPRE con una transazione `t` (è invocata dentro
   * le transazioni di submit quiz / scrittura) per restare coerente con le
   * altre mutazioni dello stesso round.
   *
   * @param {string} utenteId
   * @param {{quizCompletati?:number, risposteTotali?:number,
   *          risposteCorrette?:number, trattiValidati?:number,
   *          xpGuadagnati?:number}} delta
   * @param {import('sequelize').Transaction} t
   */
  static async registra(utenteId, delta = {}, t = null) {
    const giorno = formattaDataOnly(mezzanotteOdiernaUTC());

    const incr = {
      quiz_completati: Math.max(0, Number(delta.quizCompletati) || 0),
      risposte_totali: Math.max(0, Number(delta.risposteTotali) || 0),
      risposte_corrette: Math.max(0, Number(delta.risposteCorrette) || 0),
      tratti_validati: Math.max(0, Number(delta.trattiValidati) || 0),
      xp_guadagnati: Math.max(0, Number(delta.xpGuadagnati) || 0),
    };

    const opzioni = t ? { transaction: t } : {};

    // findOrCreate + increment: portabile tra MySQL e Postgres e atomico sotto
    // la transazione passata. La riga del giorno è "calda" (poche righe), il
    // costo extra di una findOrCreate è trascurabile.
    const [riga, creata] = await AttivitaGiornaliera.findOrCreate({
      where: { utente_id: utenteId, giorno },
      defaults: { utente_id: utenteId, giorno, ...incr },
      ...opzioni,
    });

    if (!creata) {
      await riga.increment(incr, opzioni);
    }

    return riga;
  }
}

AttivitaGiornaliera.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },

    // Proprietario dell'attività.
    utente_id: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'utente_id',
    },

    // Giorno solare UTC (solo data) a cui l'attività è imputata.
    giorno: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },

    // Numero di quiz completati nel giorno.
    quiz_completati: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'quiz_completati',
      validate: { min: { args: [0], msg: 'Valore non negativo richiesto' } },
    },

    // Risposte totali date nei quiz del giorno.
    risposte_totali: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'risposte_totali',
      validate: { min: { args: [0], msg: 'Valore non negativo richiesto' } },
    },

    // Risposte corrette del giorno (≤ risposte_totali).
    risposte_corrette: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'risposte_corrette',
      validate: { min: { args: [0], msg: 'Valore non negativo richiesto' } },
    },

    // Tratti validati sul canvas di scrittura nel giorno.
    tratti_validati: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'tratti_validati',
      validate: { min: { args: [0], msg: 'Valore non negativo richiesto' } },
    },

    // XP totali guadagnati nel giorno (quiz + scrittura + sblocco righe).
    xp_guadagnati: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'xp_guadagnati',
      validate: { min: { args: [0], msg: 'Valore non negativo richiesto' } },
    },
  },
  {
    sequelize,
    modelName: 'AttivitaGiornaliera',
    tableName: 'attivita_giornaliera',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',

    indexes: [
      // Unicità composita: una sola riga per coppia utente/giorno.
      // È anche la chiave dell'accumulo incrementale (findOrCreate) e copre la
      // lettura della finestra heatmap (WHERE utente_id = ? AND giorno >= ?).
      { unique: true, fields: ['utente_id', 'giorno'], name: 'attivita_utente_giorno' },
    ],
  }
);

// ─────────────────────────────────────────────
// Associazioni
//   La cancellazione di un utente rimuove a cascata il suo storico attività.
// ─────────────────────────────────────────────
AttivitaGiornaliera.belongsTo(Utente, { as: 'utente', foreignKey: 'utente_id', onDelete: 'CASCADE' });
Utente.hasMany(AttivitaGiornaliera, { as: 'attivita', foreignKey: 'utente_id', onDelete: 'CASCADE' });

module.exports = AttivitaGiornaliera;
