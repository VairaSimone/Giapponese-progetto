'use strict';

const { Op } = require('sequelize');
const sequelize = require('../config/database');
const Utente = require('../models/Utente');
const AppError = require('../utils/AppError');
const { escapeLike } = require('../utils/escapeLike');
const logger = require('../utils/logger');
const emailService = require('./emailService');

/**
 * AdminService — operazioni riservate al ruolo `admin`.
 *
 *   elenco candidature insegnante · approvazione · rifiuto
 *
 * La creazione diretta di insegnanti da parte dell'admin avviene tramite il
 * sistema di inviti (`inviteService.creaInvitoInsegnante`).
 */

// ─────────────────────────────────────────────
// ELENCO CANDIDATURE INSEGNANTE
// Default: solo quelle in attesa. Filtrabile per stato/nome.
// ─────────────────────────────────────────────
const elencoCandidatureInsegnante = async ({ stato = 'in_attesa', nome, page, limit }) => {
  const where = { ruolo: 'insegnante' };

  if (stato !== 'tutte') {
    if (!Utente.STATI_VALIDI.includes(stato)) {
      throw new AppError('Stato non valido.', 422, 'INVALID_STATE');
    }
    where.stato = stato;
  }

  if (nome) {
    const termine = `%${escapeLike(nome)}%`;
    where[Op.or] = [
      { nome: { [Op.like]: termine } },
      { cognome: { [Op.like]: termine } },
      { email: { [Op.like]: termine } },
    ];
  }

  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const usaPaginazione =
    Number.isInteger(pageNum) && Number.isInteger(limitNum) && pageNum > 0 && limitNum > 0;

  const queryOptions = {
    where,
    attributes: [
      'id', 'nome', 'cognome', 'email', 'ruolo', 'stato',
      'nota_candidatura', 'created_at',
    ],
    order: [['created_at', 'ASC']],
  };

  if (usaPaginazione) {
    queryOptions.limit = limitNum;
    queryOptions.offset = (pageNum - 1) * limitNum;

    const { count, rows } = await Utente.findAndCountAll(queryOptions);
    return {
      candidature: rows,
      paginazione: {
        paginaCorrente: pageNum,
        elementiPerPagina: limitNum,
        totaleElementi: count,
        totalePagine: Math.ceil(count / limitNum),
      },
    };
  }

  const candidature = await Utente.findAll(queryOptions);
  return { candidature, paginazione: null };
};

// ─────────────────────────────────────────────
// APPROVA CANDIDATURA INSEGNANTE
// Porta l'account a 'attivo' e verifica l'email (l'admin vouches). In
// transazione con lock di riga per evitare doppie approvazioni concorrenti.
// ─────────────────────────────────────────────
const approvaInsegnante = async (adminId, targetId) => {
  return sequelize.transaction(async (t) => {
    const utente = await Utente.findByPk(targetId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!utente || utente.ruolo !== 'insegnante') {
      throw new AppError('Candidatura insegnante non trovata.', 404, 'REQUEST_NOT_FOUND');
    }
    if (utente.stato === 'attivo') {
      throw new AppError('Questo insegnante è già attivo.', 409, 'ALREADY_ACTIVE');
    }

    await utente.update(
      {
        stato: 'attivo',
        email_verificata: true,
        // Invalida eventuali token emessi mentre l'account non era attivo.
        token_version: utente.token_version + 1,
        refresh_token: null,
      },
      { transaction: t }
    );

    try {
      await emailService.sendInsegnanteApprovatoEmail(utente.email, utente.lingua);
    } catch (err) {
      logger.error(`Errore invio email approvazione a ${utente.email}: ${err.message}`);
    }

    logger.info(`[ADMIN] Candidatura insegnante ${targetId} APPROVATA da admin ${adminId}`);
    return utente.toPublicJSON();
  });
};

// ─────────────────────────────────────────────
// RIFIUTA CANDIDATURA INSEGNANTE
// Imposta stato 'rifiutato' (record conservato per audit). Il login resta
// negato dal gate sullo stato.
// ─────────────────────────────────────────────
const rifiutaInsegnante = async (adminId, targetId, motivazione) => {
  return sequelize.transaction(async (t) => {
    const utente = await Utente.findByPk(targetId, { transaction: t, lock: t.LOCK.UPDATE });

    if (!utente || utente.ruolo !== 'insegnante') {
      throw new AppError('Candidatura insegnante non trovata.', 404, 'REQUEST_NOT_FOUND');
    }
    if (utente.stato === 'attivo') {
      throw new AppError('Impossibile rifiutare un insegnante già attivo.', 409, 'ALREADY_ACTIVE');
    }

    await utente.update(
      {
        stato: 'rifiutato',
        token_version: utente.token_version + 1,
        refresh_token: null,
      },
      { transaction: t }
    );

    try {
      await emailService.sendInsegnanteRifiutatoEmail(utente.email, utente.lingua);
    } catch (err) {
      logger.error(`Errore invio email rifiuto a ${utente.email}: ${err.message}`);
    }

    logger.info(
      `[ADMIN] Candidatura insegnante ${targetId} RIFIUTATA da admin ${adminId}` +
      (motivazione ? ` (motivo: ${String(motivazione).slice(0, 200)})` : '')
    );
    return utente.toPublicJSON();
  });
};

module.exports = {
  elencoCandidatureInsegnante,
  approvaInsegnante,
  rifiutaInsegnante,
};
