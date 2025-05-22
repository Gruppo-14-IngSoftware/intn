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

module.exports = router;
