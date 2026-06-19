'use strict';

const catchAsync = require('../utils/catchAsync');
const authService = require('../services/authService');
const Utente = require('../models/Utente');
const crypto = require('crypto');
const emailService = require('../services/emailService');

/**
 * Controller Auth — livello sottile tra route e service.
 * NON contiene logica di business: solo estrazione parametri dalla request
 * e formattazione della response.
 */

// ─────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────
exports.register = catchAsync(async (req, res) => {
  const { nome, cognome, eta, email, password, classe } = req.body;

  const utente = await authService.registraUtente({ nome, cognome, eta, email, password, classe });

  res.status(201).json({
    status: 'success',
    message: 'Registrazione completata. Puoi effettuare il login.',
    data: {
      utente: utente.toPublicJSON(),
    },
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;
  
  // Il service ti restituisce i token generati
  const { accessToken, refreshToken } = await authService.loginUtente(email, password);

  // Configurazione base per i cookie di sicurezza
  const cookieOptions = {
    httpOnly: true, // Non accessibile da JavaScript nel browser (Protezione XSS)
    secure: process.env.NODE_ENV === 'production', // True se sei in HTTPS
    sameSite: 'lax', 
  };

  // Setta i cookie nella response (imposta i maxAge coerenti con il config dei token)
  res.cookie('access_token', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minuti in millisecondi
  });

  res.cookie('refresh_token', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
  });

  res.status(200).json({
    status: 'success',
    message: 'Login effettuato con successo'
    // NON inviare i token nel body
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────
exports.logout = catchAsync(async (req, res, next) => {
  // 1. Invoca il service per incrementare il token_version
  await authService.logout(req.user.id);

  // 2. Cancella i cookie lato client
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');

  res.status(200).json({
    status: 'success',
    message: 'Logout completato con successo'
  });
});

// ─────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────
exports.me = catchAsync(async (req, res) => {
  // req.user è già stato caricato e sanitizzato dal middleware authenticateJWT
  const { id, nome, cognome, eta, email, ruolo, classe } = req.user;

  res.status(200).json({
    status: 'success',
    data: {
      utente: { id, nome, cognome, eta, email, ruolo, classe },
    },
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/refresh-token
// ─────────────────────────────────────────────
exports.refreshToken = catchAsync(async (req, res, next) => {
    // PRIMA: const { refreshToken } = req.body;
    
    // DOPO (CORRETTO):
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) {
        return next(new AppError(req.t('auth.refresh_token_required'), 401));
    }

    // Prosegui con la tua logica esistente di verifica del servizio...
    const tokens = await authService.refreshSession(refreshToken);

    // Se rigeneri anche il refresh token (consigliato per il token rotation), 
    // ricordati di reimpostarlo nel cookie:
    res.cookie('refresh_token', tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 giorni
    });

    res.status(200).json({
        status: 'success',
        data: {
            accessToken: tokens.accessToken
        }
    });
});

// ─────────────────────────────────────────────
// POST /api/auth/forgot-password
// ─────────────────────────────────────────────
exports.forgotPassword = catchAsync(async (req, res) => {
  const { email } = req.body;

  const risultato = await authService.forgotPassword(email);

  // Risposta sempre 200 per non rivelare se l'email esiste
  res.status(200).json({
    status: 'success',
    message: 'Se l\'email è registrata, riceverai le istruzioni per il reset della password.',
    // tokenDebug presente solo in sviluppo (viene da authService)
    ...(risultato.tokenDebug && { _debug_token: risultato.tokenDebug }),
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/reset-password
// ─────────────────────────────────────────────
exports.resetPassword = catchAsync(async (req, res) => {
  const { token, nuovaPassword } = req.body;

  await authService.resetPassword(token, nuovaPassword);

  res.status(200).json({
    status: 'success',
    message: 'Password aggiornata con successo. Puoi effettuare il login.',
  });
});


// ─────────────────────────────────────────────
// POST /api/auth/verify-email
// ─────────────────────────────────────────────
exports.verifyEmail = catchAsync(async (req, res) => {
  const { token } = req.body;

  await authService.verificaEmail(token);

  res.status(200).json({
    status: 'success',
    message: 'Email verificata con successo! Ora puoi effettuare il login.',
  });
});

// ─────────────────────────────────────────────
// POST /api/auth/request-email-change
// ─────────────────────────────────────────────
exports.requestEmailChange = catchAsync(async (req, res) => {
  const { nuovaEmail } = req.body;
  const userId = req.user.id; 

  const tokenVerifica = await authService.richiediCambioEmail(userId, nuovaEmail);

  res.status(200).json({
    status: 'success',
    message: 'Richiesta di cambio email presa in carico. Controlla la tua NUOVA casella postale.',
    _debug_token: tokenVerifica
  });
});

// GET /api/auth/confirm-email-change
exports.confirmEmailChange = catchAsync(async (req, res) => {
  const { token } = req.query; // Estrae il token dai parametri dell'URL (?token=...)

  if (!token) {
    return res.status(400).json({ status: 'fail', message: 'Token mancante.' });
  }

  await authService.confermaCambioEmail(token);
  
  res.status(200).json({
    status: 'success',
    message: 'Email modificata e confermata con successo.',
  });
});

// ─────────────────────────────────────────────
// DELETE /api/auth/me
// ─────────────────────────────────────────────
exports.deleteMe = catchAsync(async (req, res) => {
  // req.user.id viene iniettato dal middleware authenticateJWT
  await authService.eliminaAccount(req.user.id);

  res.status(200).json({
    status: 'success',
    message: 'Il tuo account e tutti i dati associati sono stati eliminati definitivamente.',
  });
});

// ─────────────────────────────────────────────
// GET /api/auth/gestione/utenti (Solo Insegnanti)
// ─────────────────────────────────────────────
exports.getAllUsers = catchAsync(async (req, res) => {
  const { ruolo, classe, nome } = req.query;

  const utenti = await authService.getUtentiPerInsegnante({ ruolo, classe, nome });

  res.status(200).json({
    status: 'success',
    results: utenti.length,
    data: {
      utenti,
    },
  });
});

// ─────────────────────────────────────────────
// PATCH /api/auth/gestione/utenti/:id/ruolo (Solo Insegnanti)
// ─────────────────────────────────────────────
exports.updateUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { ruolo } = req.body;

  const utenteAggiornato = await authService.aggiornaRuoloUtente(id, ruolo);

  res.status(200).json({
    status: 'success',
    message: 'Ruolo dell\'utente aggiornato con successo.',
    data: {
      utente: utenteAggiornato,
    },
  });
});

// ─────────────────────────────────────────────
// DELETE /api/auth/gestione/utenti/:id (Solo Insegnanti)
// ─────────────────────────────────────────────
exports.deleteUserByTeacher = catchAsync(async (req, res) => {
  const { id } = req.params;

  await authService.eliminaAccount(id);

  res.status(200).json({
    status: 'success',
    message: 'L\'account dell\'utente è stato eliminato definitivamente dall\'insegnante.',
  });
});


// ─────────────────────────────────────────────
// PATCH /api/auth/me/lingua
// ─────────────────────────────────────────────
exports.updateLanguage = catchAsync(async (req, res) => {
  const { lingua } = req.body;

  if (!['it', 'en'].includes(lingua)) {
    return res.status(400).json({ status: 'fail', message: 'Lingua non supportata.' });
  }

  // Puoi creare una funzione in authService, o usare direttamente il modello
  const utente = await Utente.findByPk(req.user.id);
  utente.lingua = lingua;
  await utente.save();

  res.status(200).json({
    status: 'success',
    // Utilizziamo req.t per rispondere nella lingua appena selezionata o rilevata
    message: req.t('messages.langChanged'), 
    data: { utente: utente.toPublicJSON() }
  });
});