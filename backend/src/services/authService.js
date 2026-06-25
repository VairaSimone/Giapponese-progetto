'use strict';

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const Utente = require('../models/Utente');
const AppError = require('../utils/AppError');
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwtHelpers');
const { hashToken } = require('../utils/tokenHash');
const logger = require('../utils/logger');
const emailService = require('./emailService');

/**
 * AuthService — responsabilità ESCLUSIVA: autenticazione e ciclo di vita
 * delle credenziali.
 *
 *   register · login · logout · refresh · verify email ·
 *   resend verification · forgot/reset password · google auth
 *
 * La gestione utenti (cambio email, eliminazione account, operazioni
 * amministrative dell'insegnante) è stata spostata in `userService.js`.
 */

const MAX_TENTATIVI_FALLITI = 5;
const TEMPO_BLOCCO_MINUTI = 15;

// ─────────────────────────────────────────────
// REGISTRAZIONE
// ─────────────────────────────────────────────
const registraUtente = async ({ nome, cognome, eta, email, password, classe, lingua = 'it' }) => {
  const tokenVerifica = crypto.randomBytes(32).toString('hex');
  const scadenzaVerifica = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 ore di validità

  const nuovoUtente = await Utente.create({
    nome: nome.trim(),
    cognome: cognome.trim(),
    eta,
    email: email.toLowerCase().trim(),
    password,
    ruolo: 'studente',
    classe,
    lingua,
    email_verificata: false,
    profilo_completo: true,
    email_verification_token: hashToken(tokenVerifica),
    email_verification_expire: scadenzaVerifica,
  });

  try {
    await emailService.sendVerificationEmail(nuovoUtente.email, tokenVerifica, nuovoUtente.lingua);
  } catch (err) {
    logger.error(`Errore nell'invio dell'email di verifica a ${nuovoUtente.email}: ${err.message}`);
  }

  logger.info(`Nuovo utente registrato: ${nuovoUtente.email} (ID: ${nuovoUtente.id})`);
  return nuovoUtente;
};

// ─────────────────────────────────────────────
// LOGIN
// ─────────────────────────────────────────────
const loginUtente = async (email, password) => {
  const utente = await Utente.findOne({ where: { email: email.toLowerCase().trim() } });

  if (!utente) {
    await fakeHashCompare();
    throw new AppError('Credenziali non valide', 401, 'INVALID_CREDENTIALS');
  }

  // Account creato via Google e mai dotato di password locale.
  if (!utente.password) {
    throw new AppError('Questo account utilizza l\'accesso con Google.', 401, 'USE_GOOGLE_LOGIN');
  }

  if (utente.bloccato_fino_al && new Date(utente.bloccato_fino_al) > new Date()) {
    const millisecondiRimanenti = new Date(utente.bloccato_fino_al).getTime() - Date.now();
    const minutiRimanenti = Math.ceil(millisecondiRimanenti / 60000);
    throw new AppError(
      `Account bloccato per troppi tentativi. Riprova tra ${minutiRimanenti} minuti.`,
      403,
      'ACCOUNT_LOCKED'
    );
  }

  // Il blocco è scaduto: azzera il contatore PRIMA di valutare la password,
  // così un singolo errore successivo non causa un re-blocco immediato.
  if (utente.bloccato_fino_al) {
    utente.tentativi_falliti = 0;
    utente.bloccato_fino_al = null;
  }

  const isPasswordValid = await utente.verificaPassword(password);

  if (!isPasswordValid) {
    utente.tentativi_falliti += 1;

    if (utente.tentativi_falliti >= MAX_TENTATIVI_FALLITI) {
      const dataSblocco = new Date();
      dataSblocco.setMinutes(dataSblocco.getMinutes() + TEMPO_BLOCCO_MINUTI);
      utente.bloccato_fino_al = dataSblocco;

      await utente.save();
      throw new AppError(
        `Troppi tentativi falliti. Account bloccato per ${TEMPO_BLOCCO_MINUTI} minuti.`,
        403,
        'ACCOUNT_LOCKED'
      );
    } else {
      await utente.save();
      throw new AppError('Credenziali non valide', 401, 'INVALID_CREDENTIALS');
    }
  }

  if (!utente.email_verificata) {
    // Persiste un eventuale reset contatore effettuato sopra
    if (utente.changed()) {
      await utente.save();
    }
    throw new AppError(
      'Email non verificata. Controlla la tua casella di posta.',
      401,
      'EMAIL_NOT_VERIFIED'
    );
  }

  const accessToken = generateAccessToken(utente);
  const refreshToken = generateRefreshToken(utente);

  utente.tentativi_falliti = 0;
  utente.bloccato_fino_al = null;
  utente.refresh_token = hashToken(refreshToken);
  await utente.save();

  return { utente, accessToken, refreshToken };
};

const fakeHashCompare = async () => {
  await bcrypt.compare('fake_password', '$2a$12$fakehashfakehashfakehashfakehashfakehashfakeha');
  return false;
};

// ─────────────────────────────────────────────
// LOGOUT
// Invalida tutti i refresh/access token incrementando token_version.
// ─────────────────────────────────────────────
const logoutUtente = async (userId) => {
  const utente = await Utente.findByPk(userId);

  if (utente) {
    utente.token_version += 1;
    utente.refresh_token = null;
    await utente.save();
  }
};

// ─────────────────────────────────────────────
// REFRESH TOKEN
// Versioning: il payload contiene token_version, verificata in modo STRETTO
// contro quella persistita. Dopo logout/reset/revoca le versioni divergono
// e ogni refresh token precedente viene rifiutato.
// ─────────────────────────────────────────────
const refreshAccessToken = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token mancante.', 401, 'NO_REFRESH_TOKEN');
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError('Sessione scaduta. Effettua nuovamente il login.', 401, 'REFRESH_TOKEN_EXPIRED');
    }
    throw new AppError('Refresh token non valido.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const utente = await Utente.findOne({
    where: {
      id: decoded.id,
      refresh_token: hashToken(refreshToken),
    },
  });

  if (!utente) {
    throw new AppError('Refresh token non valido o sessione terminata.', 401, 'INVALID_REFRESH_TOKEN');
  }

  // Verifica STRETTA della versione del token (refresh token versioning).
  if (decoded.token_version !== utente.token_version) {
    throw new AppError('Refresh token non valido o sessione terminata.', 401, 'INVALID_REFRESH_TOKEN');
  }

  const nuovoAccessToken = generateAccessToken(utente);
  const nuovoRefreshToken = generateRefreshToken(utente);

  utente.refresh_token = hashToken(nuovoRefreshToken);
  await utente.save();

  return { accessToken: nuovoAccessToken, refreshToken: nuovoRefreshToken };
};

// ─────────────────────────────────────────────
// VERIFICA EMAIL
// ─────────────────────────────────────────────
const verificaEmail = async (token) => {
  const utente = await Utente.findOne({
    where: {
      email_verification_token: hashToken(token),
      nuova_email_pendente: null,
    },
  });

  if (!utente) {
    throw new AppError('Token di verifica non valido o scaduto.', 400, 'INVALID_VERIFICATION_TOKEN');
  }

  const adesso = new Date();
  if (utente.email_verification_expire && new Date(utente.email_verification_expire) < adesso) {
    throw new AppError('Token di verifica scaduto.', 400, 'EXPIRED_VERIFICATION_TOKEN');
  }

  await utente.update({
    email_verificata: true,
    email_verification_token: null,
    email_verification_expire: null,
  });

  logger.info(`Email verificata con successo per l'utente ID: ${utente.id}`);
};

// ─────────────────────────────────────────────
// RE-INVIO EMAIL DI VERIFICA
// Protezione anti user-enumeration: la risposta al client è SEMPRE generica
// e con lo stesso status, indipendentemente dall'esistenza dell'account o
// dal fatto che sia già verificato.
// ─────────────────────────────────────────────
const reinviaVerificaEmail = async (email) => {
  const utente = await Utente.findOne({ where: { email: email.toLowerCase().trim() } });

  // Caso 1: utente inesistente → equalizza il costo computazionale e ritorna
  // un esito generico (nessuna informazione trapela al chiamante).
  if (!utente) {
    crypto.randomBytes(32).toString('hex');
    logger.info(`Re-invio verifica richiesto per email inesistente: ${email}`);
    return { inviata: false };
  }

  // Caso 2: email già verificata → non si re-invia nulla, ma la risposta
  // esterna resta identica al caso "inviata".
  if (utente.email_verificata) {
    logger.info(`Re-invio verifica richiesto per email già verificata: ${utente.id}`);
    return { inviata: false };
  }

  // Caso 3: utente esistente e non verificato → genera un nuovo token e
  // re-invia l'email di verifica.
  const tokenVerifica = crypto.randomBytes(32).toString('hex');
  const scadenzaVerifica = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await utente.update({
    email_verification_token: hashToken(tokenVerifica),
    email_verification_expire: scadenzaVerifica,
  });

  try {
    await emailService.sendVerificationEmail(utente.email, tokenVerifica, utente.lingua);
  } catch (err) {
    logger.error(`Errore nel re-invio dell'email di verifica a ${utente.email}: ${err.message}`);
  }

  return { inviata: true, tokenDebug: process.env.NODE_ENV !== 'production' ? tokenVerifica : undefined };
};

// ─────────────────────────────────────────────
// FORGOT PASSWORD
// ─────────────────────────────────────────────
const forgotPassword = async (email) => {
  const utente = await Utente.findOne({ where: { email: email.toLowerCase().trim() } });

  if (!utente) {
    // Equalizza approssimativamente il costo computazionale per ridurre
    // la possibilità di user-enumeration via timing.
    crypto.randomBytes(32).toString('hex');
    logger.info(`Reset password richiesto per email inesistente: ${email}`);
    return { emailInviata: false, tokenDebug: undefined };
  }

  const token = crypto.randomBytes(32).toString('hex');
  const oreScadenza = parseInt(process.env.RESET_PASSWORD_EXPIRES_HOURS) || 1;
  const scadenza = new Date(Date.now() + oreScadenza * 60 * 60 * 1000);

  await utente.update({
    reset_password_token: hashToken(token),
    reset_password_expire: scadenza,
  });

  try {
    await emailService.sendPasswordResetEmail(utente.email, token, utente.lingua);
  } catch (err) {
    // Non rilanciare: uno status diverso (500) rispetto al caso "email
    // inesistente" (200) permetterebbe user-enumeration. La risposta al
    // client resta sempre generica e con status 200.
    logger.error(`Errore nell'invio dell'email di reset a ${utente.email}: ${err.message}`);
  }

  return {
    emailInviata: true,
    tokenDebug: process.env.NODE_ENV !== 'production' ? token : undefined,
  };
};

// ─────────────────────────────────────────────
// RESET PASSWORD
// ─────────────────────────────────────────────
const resetPassword = async (token, nuovaPassword) => {
  const utente = await Utente.findOne({
    where: {
      reset_password_token: hashToken(token),
    },
    attributes: { include: ['password'] },
  });

  if (!utente) {
    throw new AppError('Token non valido o scaduto.', 400, 'INVALID_RESET_TOKEN');
  }

  const adesso = new Date();
  if (utente.reset_password_expire && new Date(utente.reset_password_expire) < adesso) {
    throw new AppError('Token di verifica scaduto.', 400, 'EXPIRED_VERIFICATION_TOKEN');
  }

  // Incrementa token_version per invalidare anche gli access/refresh token
  // già emessi: dopo un reset password nessuna sessione precedente resta valida.
  await utente.update({
    password: nuovaPassword,
    reset_password_token: null,
    reset_password_expire: null,
    refresh_token: null,
    token_version: utente.token_version + 1,
  });

  logger.info(`Password reimpostata per utente: ${utente.email}`);
};

// ─────────────────────────────────────────────
// GOOGLE OAUTH 2.0
// Login o registrazione automatica a partire dal profilo Google verificato
// dalla Passport GoogleStrategy. Restituisce l'utente applicativo.
// ─────────────────────────────────────────────
const loginOrRegisterGoogle = async ({ googleId, email, nome, cognome, emailVerificata }) => {
  const emailNorm = email ? email.toLowerCase().trim() : null;

  // 1. Account già collegato a questo google_id.
  let utente = await Utente.findOne({ where: { google_id: googleId } });

  // 2. Nessun collegamento: prova ad agganciare un account esistente con la
  //    stessa email (collegamento account esistente tramite email).
  if (!utente && emailNorm) {
    utente = await Utente.findOne({ where: { email: emailNorm } });
    if (utente) {
      utente.google_id = googleId;
      // L'email è verificata da Google: se l'account locale non lo era,
      // lo diventa ora.
      if (emailVerificata && !utente.email_verificata) {
        utente.email_verificata = true;
      }
      await utente.save();
      logger.info(`Account esistente collegato a Google: ${utente.id}`);
    }
  }

  // 3. Nessun account: registrazione automatica. Profilo "incompleto"
  //    (manca età/classe), password locale casuale non utilizzabile.
  if (!utente) {
    if (!emailNorm) {
      throw new AppError('Profilo Google senza email: impossibile registrarsi.', 400, 'GOOGLE_NO_EMAIL');
    }

    const passwordCasuale = crypto.randomBytes(32).toString('hex');

    utente = await Utente.create({
      nome: (nome && nome.trim().length >= 2 ? nome.trim() : 'Utente'),
      cognome: (cognome && cognome.trim().length >= 2 ? cognome.trim() : 'Google'),
      email: emailNorm,
      password: passwordCasuale,
      ruolo: 'studente',
      eta: null,
      classe: null,
      lingua: 'it',
      email_verificata: emailVerificata !== false,
      profilo_completo: false,
      google_id: googleId,
    });

    logger.info(`Nuovo utente registrato via Google: ${utente.email} (ID: ${utente.id})`);
  }

  const accessToken = generateAccessToken(utente);
  const refreshToken = generateRefreshToken(utente);

  utente.refresh_token = hashToken(refreshToken);
  await utente.save();

  return { utente, accessToken, refreshToken };
};

module.exports = {
  registraUtente,
  loginUtente,
  logoutUtente,
  refreshAccessToken,
  verificaEmail,
  reinviaVerificaEmail,
  forgotPassword,
  resetPassword,
  loginOrRegisterGoogle,
};
