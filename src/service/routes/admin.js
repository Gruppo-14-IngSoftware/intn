const express = require('express');
const router = express.Router();
const passport = require('passport');

const adminLayout = '../views/layouts/admin';

// Middleware di protezione
function isAdmin(req, res, next) {
  if (req.isAuthenticated() && req.user.role === 'admin') {
    return next();
  }
  req.flash('error_msg', 'Accesso riservato agli amministratori');
  res.redirect('/admin');
}

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

//DASHBOARD ADMIN
// 1. GET – visualizza tutti gli utenti
router.get('/users', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: 'Errore durante il recupero utenti' });
  }
});

// 2. POST – cambia ruolo a admin
router.post('/promote', async (req, res) => {
  const { email } = req.body;
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  try {
    const user = await User.findOneAndUpdate({ email }, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ error: 'Utente non trovato' });
    res.json({ message: `${user.email} promosso a admin.` });
  } catch (err) {
    res.status(500).json({ error: 'Errore durante la promozione' });
  }
});

// 3. POST – aggiunge un nuovo utente admin
router.post('/add', async (req, res) => {
  const { email, password, name } = req.body;

  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso negato' });
  }

  try {
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Utente già esistente' });

    const newUser = await User.create({ email, password, name, role: 'admin' });
    res.json({ message: `Utente admin ${newUser.email} creato con successo.` });
  } catch (err) {
    res.status(500).json({ error: 'Errore durante la creazione utente' });
  }
});

module.exports = router;
