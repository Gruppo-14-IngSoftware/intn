const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const Event = require('../models/Event');
const statsController = require('../controllers/statsController');
const eventController = require('../controllers/eventController');
const CompanyInfoRequest = require('../models/CompanyInfoRequest');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const { isAdmin } = require('../middlewares/auth');
const adminLayout = '../views/layouts/admin';

//ROUTING DI LOG
router.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

//GET LOGIN ADMIN
router.get('/admin', (req, res) => {
  res.render('admin/index', { layout: adminLayout });
});

//POST LOGIN CON PASSPORT
router.post('/admin', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin',
    failureFlash: true
  })(req, res, next);
});

//DASHBOARD ADMIN PROTETTA
router.get('/admin/dashboard', isAdmin, (req, res) => {
  res.render('admin/dashboard', { layout: 'layouts/admin' });
});

//GET – LISTA RICHIESTE PROFILO AZIENDALE (PENDING)
router.get('/admin/verify-companies', isAdmin, async (req, res) => {
  try {
    const requests = await User.find({ 'verification.status': 'pending', role: 'user' });
    res.render('admin/verify-companies', { layout: adminLayout, requests });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore caricamento richieste');
  }
});

//POST – APPROVA RICHIESTA
router.post('/admin/verify-companies/:id/approve', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('Utente non trovato');

    user.role = 'company';
    user.verification.status = 'approved';
    await user.save();

    req.flash('success_msg', 'Utente approvato come azienda');
    res.redirect('/admin/verify-companies');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore approvazione');
  }
});

//POST – RIFIUTA RICHIESTA (AI HELP)
router.post('/admin/verify-companies/:id/reject', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('Utente non trovato');

    //CANCELLA FILE DOCUMENTO, SE ESISTE
    if (user.verification?.document) {
      const filePath = path.resolve('src/public' + user.verification.document);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    //PULISCE TUTTO TRANNE LO STATO
    user.verification = {
      status: 'rejected'
    };

    await user.save();

    req.flash('success_msg', 'Richiesta rifiutata e file eliminato.');
    res.redirect('/admin/verify-companies');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore rifiuto');
  }
});

//POST – BLOCCA LA RICHIESTA DI AZIENDA (SENZA BLOCCARE ACCOUNT)
router.post('/admin/verify-companies/:id/block', isAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).send('Utente non trovato');

    // Cancella file documento, se esiste
    if (user.verification?.document) {
      const filePath = path.resolve('src/public' + user.verification.document);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    user.verification = {
      status: 'blocked'
    };

    await user.save();

    req.flash('success_msg', 'Richiesta bloccata e file eliminato.');
    res.redirect('/admin/verify-companies');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore blocco richiesta');
  }
});

//GET – VISUALIZZA TUTTE LE RICHIESTE APERTE
router.get('/admin/info-requests', isAdmin, async (req, res) => {
  try {
    const requests = await CompanyInfoRequest.find({ status: 'open' }).populate('company');
    res.render('admin/info-requests', { layout: adminLayout, requests });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nel recupero delle richieste');
  }
});

//POST – INVIA RISPOSTA VIA EMAIL (AI HELP)
router.post('/admin/info-requests/:id/send', isAdmin, async (req, res) => {
  try {
    const request = await CompanyInfoRequest.findById(req.params.id).populate('company');
    if (!request) return res.status(404).send('Richiesta non trovata');

    const { replyMessage } = req.body;

    // Invia email (SMTP da configurare)
    const transporter = nodemailer.createTransport({
      service: 'gmail', // o altro provider
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: `"Comune di Trento" <${process.env.SMTP_USER}>`,
      to: request.company.email,
      subject: 'Risposta alla tua richiesta informativa',
      text: replyMessage
    });

    request.status = 'answered';
    await request.save();

    req.flash('success_msg', 'Risposta inviata con successo');
    res.redirect('/admin/info-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nell’invio della risposta');
  }
});


//ARCHIVIA MSG DELLE COMPANY
router.post('/admin/info-requests/:id/archive', isAdmin, async (req, res) => {
  try {
    const request = await CompanyInfoRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Richiesta non trovata');

    request.status = 'answered';
    await request.save();

    req.flash('success_msg', 'Richiesta archiviata.');
    res.redirect('/admin/info-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore durante l’archiviazione');
  }
});

//RECUPERO MSG ARCHIVIATI DELLE COMPANY
router.get('/admin/info-requests/archive', isAdmin, async (req, res) => {
  try {
    const archived = await CompanyInfoRequest.find({ status: 'answered' }).populate('company');
    res.render('admin/info-requests-archive', {
      layout: adminLayout,
      archived
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nel recupero dell’archivio');
  }
});

router.post('/admin/info-requests/:id/reopen', isAdmin, async (req, res) => {
  try {
    const request = await CompanyInfoRequest.findById(req.params.id);
    if (!request) return res.status(404).send('Richiesta non trovata');

    request.status = 'open';
    await request.save();

    req.flash('success_msg', 'Richiesta ripristinata con successo.');
    res.redirect('/admin/info-requests/archive');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore durante il ripristino');
  }
});

//ELIMINA MSG DELLE COMPANY
router.post('/admin/info-requests/:id/delete', isAdmin, async (req, res) => {
  try {
    await CompanyInfoRequest.findByIdAndDelete(req.params.id);
    req.flash('success_msg', 'Richiesta eliminata.');
    res.redirect('/admin/info-requests');
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore durante l’eliminazione');
  }
});

//LOGOUT
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success_msg', 'Logout effettuato con successo');
    res.redirect('/admin');
  });
});

/*DASHBOARD ADMIN - UTENTI (AI HELP)*/
//GET - VISUALIZZA GRAFICI UTENTI
router.get('/overview', statsController.getOverview);
router.get('/users/trend', statsController.getUserTrend);
router.get('/users/active', statsController.getActiveUsers);


router.get('/users-by-month', async (req, res) => {
  try {
    const result = await User.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          month: '$_id',
          count: 1
        }
      }
    ]);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Errore durante il recupero dei dati' });
  }
});

//GET – VISUALIZZA TUTTI GLI UTENTI
router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il recupero utenti' });
  }
});

//POST – CAMBIA RUOLO A ADMIN
router.post('/admin/promote', async (req, res) => {
  const { email } = req.body;
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  try {
    const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ message: user.email + "promosso admin" });
  } catch (err) {
    console.error('error message:', err.message, err.stack);
    res.status(500).json({ error: 'Errore durante la promozione' });
  }
});

//POST – AGGIUNGE UN NUOVO UTENTE ADMIN
router.post('/admin/add', async (req, res) => {
  const { firstname, lastname, birthdate, username, email, password } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Utente già esistente' });

    const newUser = await User.create({firstname, lastname, username, email, birthdate, password, role: 'admin' });
    res.json({ message: `Utente admin ${newUser.email} creato con successo.` });
  } catch (err) {
    console.error('error message:', err.message, err.stack);
    res.status(500).json({ error: 'Errore durante la creazione utente' });
  }
});

//DASHBOARD ADMIN - EVENT(AI HELP)
router.get('/admin/eventAdministrationFull', isAdmin, async (req, res) => {
  try {
    const events = await Event.find().populate('createdBy', 'username').lean();

    const privati = events.filter(e => e.createdByRole === 'user');
    const impresaToVerify = events.filter(e => e.createdByRole === 'impresa' && !e.verified);
    const impresaVerified = events.filter(e => e.createdByRole === 'impresa' && e.verified);
    const reportedEvents = events.filter(e => e.reports && e.reports.length > 0);

    res.render('admin/eventFullAdmin', {
      events: { privati, impresaToVerify, impresaVerified },
      reportedEvents,
      showLayoutParts: true,
      layout: adminLayout
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore caricamento pagina amministrazione');
  }
});

// ROTTE API PER GRAFICI EVENTI
router.get('/events-by-month', isAdmin, eventController.getEventsByMonth);
router.get('/events-by-tag', isAdmin, eventController.getEventsByTag);
router.get('/events-verified', isAdmin, eventController.getEventsVerified);
router.get('/events-by-role', isAdmin, eventController.getEventsByRole);

module.exports = router;
