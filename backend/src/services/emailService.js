'use strict';

const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

// Configurazione del trasportatore SMTP basato sulle variabili d'ambiente (.env)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true', // true per la porta 465, false per le altre
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Invia l'email di verifica dopo la registrazione
 */
const sendVerificationEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: `"Piattaforma Giapponese" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Verifica il tuo indirizzo Email',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #333;">Benvenuto sulla nostra Piattaforma di Giapponese!</h2>
        <p>Grazie per esserti registrato. Per completare l'attivazione del tuo account, clicca sul pulsante sottostante:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background-color: #e60012; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;">Verifica Email</a>
        </div>
        <p>Se il pulsante non funziona, copia e incolla questo link nel tuo browser:</p>
        <p><a href="${url}">${url}</a></p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #777;">Questo link scadrà tra 24 ore. Se non hai richiesto tu questa registrazione, puoi ignorare questa email.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  logger.info(`Email di verifica inviata con successo a: ${email}`);
};

/**
 * Invia l'email per il ripristino della password
 */
const sendPasswordResetEmail = async (email, token) => {
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;

  const mailOptions = {
from: `"Piattaforma Giapponese" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Richiesta di Ripristino Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee;">
        <h2 style="color: #333;">Ripristino Password</h2>
        <p>Hai richiesto di reimpostare la password del tuo account. Clicca sul link sottostante per procedere:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${url}" style="background-color: #333; color: white; padding: 12px 24px; text-decoration: none; font-weight: bold; border-radius: 4px;">Reimposta Password</a>
        </div>
        <p>Se non hai richiesto tu il ripristino, ignora questa email e la tua password rimarrà invariata.</p>
        <hr style="border: none; border-top: 1px solid #eee;" />
        <p style="font-size: 12px; color: #777;">Questo link scadrà tra 1 ora.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  logger.info(`Email di reset password inviata con successo a: ${email}`);
};
const sendEmailChangeEmail = async (email, token) => {
  // Qui cambi la rotta in /verify-email-change
  const url = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email-change?token=${token}`;
  
const mailOptions = {
      from: `"Piattaforma Giapponese" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: 'Conferma il cambio del tuo indirizzo Email',
      html: `<p>Clicca qui per confermare il cambio email: <a href="${url}">${url}</a></p>`
  };

  await transporter.sendMail(mailOptions);
};
module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
sendEmailChangeEmail};