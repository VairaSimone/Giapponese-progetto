'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sequelize = require('../config/database');
const logger = require('../utils/logger');
const Utente = require('../models/Utente');

/**
 * Crea (o promuove) l'utente amministratore iniziale.
 *
 * In un sistema ad inviti rigido non esiste alcun percorso pubblico per
 * creare il primo admin: questo script è il bootstrap. Da eseguire UNA volta
 * dopo le migrazioni.
 *
 * Variabili d'ambiente richieste:
 *   ADMIN_EMAIL      email dell'amministratore
 *   ADMIN_PASSWORD   password (≥8 char, maiuscola, minuscola, numero, speciale)
 *   ADMIN_NOME       (opzionale, default "Admin")
 *   ADMIN_COGNOME    (opzionale, default "Sistema")
 *
 * Uso:
 *   npm run seed:admin
 *
 * Comportamento idempotente:
 *   - se l'email non esiste → crea un admin attivo e verificato;
 *   - se l'email esiste ma non è admin → la promuove ad admin attiva;
 *   - se è già un admin attivo → non fa nulla.
 */
const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  const nome = process.env.ADMIN_NOME || 'Admin';
  const cognome = process.env.ADMIN_COGNOME || 'Sistema';

  if (!email || !password) {
    logger.error('Seed admin: definire ADMIN_EMAIL e ADMIN_PASSWORD nelle variabili d\'ambiente.');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();

    const esistente = await Utente.findOne({ where: { email } });

    if (esistente) {
      if (esistente.ruolo === 'admin' && esistente.stato === 'attivo') {
        logger.info(`Seed admin: l'admin ${email} esiste già ed è attivo. Nessuna azione.`);
      } else {
        await esistente.update({
          ruolo: 'admin',
          stato: 'attivo',
          email_verificata: true,
        });
        logger.info(`Seed admin: utente esistente ${email} promosso ad admin attivo.`);
      }
    } else {
      const admin = await Utente.create({
        nome,
        cognome,
        email,
        password, // hashata dall'hook beforeCreate del modello
        ruolo: 'admin',
        stato: 'attivo',
        eta: null,
        classe: null,
        lingua: 'it',
        email_verificata: true,
        profilo_completo: true,
      });
      logger.info(`Seed admin: amministratore creato con successo (ID: ${admin.id}, email: ${email}).`);
    }

    await sequelize.close();
    process.exit(0);
  } catch (err) {
    logger.error(`Seed admin: errore — ${err.message}`);
    process.exit(1);
  }
};

seedAdmin();
