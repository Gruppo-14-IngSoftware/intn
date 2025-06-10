const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const statsController = require('../controllers/statsController');
const CompanyInfoRequest = require('../models/CompanyInfoRequest');
const nodemailer = require('nodemailer'); 
const adminLayout = '../views/layouts/admin';
const fs = require('fs');
const path = require('path');


// Middleware di protezione
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Accesso riservato agli amministratori');
  res.redirect('/admin');
}

// middleware di log
router.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// GET login admin
router.get('/admin', (req, res) => {
  res.render('admin/index', { layout: adminLayout });
});

// POST login con Passport
router.post('/admin', (req, res, next) => {
  passport.authenticate('local', {
    successRedirect: '/admin/dashboard',
    failureRedirect: '/admin',
    failureFlash: true
  })(req, res, next);
});

// Dashboard admin protetta
router.get('/admin/dashboard', isAdmin, (req, res) => {
  res.render('admin/dashboard', { layout: 'layouts/admin' });
});

// GET – lista richieste profilo aziendale (pending)
router.get('/admin/verify-companies', isAdmin, async (req, res) => {
  try {
    const requests = await User.find({ 'verification.status': 'pending', role: 'user' });
    res.render('admin/verify-companies', { layout: adminLayout, requests });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore caricamento richieste');
  }
});

// POST – approva richiesta
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

// POST – rifiuta richiesta
router.post('/admin/verify-companies/:id/reject', isAdmin, async (req, res) => {
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

    // Pulisce tutto tranne lo stato
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



// POST – blocca la richiesta di azienda (senza bloccare account)
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



// GET – visualizza tutte le richieste aperte
router.get('/admin/info-requests', isAdmin, async (req, res) => {
  try {
    const requests = await CompanyInfoRequest.find({ status: 'open' }).populate('company');
    res.render('admin/info-requests', { layout: adminLayout, requests });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nel recupero delle richieste');
  }
});

// POST – invia risposta via email
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


// Archivia msg delle company
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

// Recupero msg archiviati delle company
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


// Elimina msg delle company
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



// Logout
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success_msg', 'Logout effettuato con successo');
    res.redirect('/admin');
  });
});

//DASHBOARD ADMIN

// 0. GET - visualizza grafici utenti

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

// 1. GET – visualizza tutti gli utenti
router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il recupero utenti' });
  }
});

// 2. POST – cambia ruolo a admin
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

// 3. POST – aggiunge un nuovo utente admin
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

module.exports = router;
