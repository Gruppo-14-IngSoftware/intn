const express = require('express');
const router = express.Router();
const passport = require('passport');
const User = require('../models/User');
const Event = require('../models/Event');
const statsController = require('../controllers/statsController');
const eventController = require('../controllers/eventController');

const adminLayout = '../views/layouts/admin';

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

// Logout
router.get('/logout', (req, res) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash('success_msg', 'Logout effettuato con successo');
    res.redirect('/admin');
  });
});

//DASHBOARD ADMIN - UTENTI

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

//DASHBOARD ADMIN - EVENT

router.get('/admin/eventAdministrationFull', isAdmin, async (req, res) => {
  try {
    const events = await Event.find().populate('createdBy', 'username').lean();

    const privati = events.filter(e => e.createdByRole === 'user');
    const impresaToVerify = events.filter(e => e.createdByRole === 'impresa' && !e.verified);
    const impresaVerified = events.filter(e => e.createdByRole === 'impresa' && e.verified);
    const reportedEvents = events.filter(e => e.reports && e.reports.length > 0);  // ✅ Fix: Cambiato da `reportedEvents` a `reports`

    res.render('admin/eventFullAdmin', {
      events: { privati, impresaToVerify, impresaVerified },
      reportedEvents,  // ✅ Passato correttamente al template
      showLayoutParts: true,
      layout: adminLayout
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore caricamento pagina amministrazione');
  }
});


// Rotte API per grafici eventi
router.get('/events-by-month', isAdmin, eventController.getEventsByMonth);
router.get('/events-by-tag', isAdmin, eventController.getEventsByTag);
router.get('/events-verified', isAdmin, eventController.getEventsVerified);
router.get('/events-by-role', isAdmin, eventController.getEventsByRole);



module.exports = router;
