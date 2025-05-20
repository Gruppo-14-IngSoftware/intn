const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/User');

//ROUTING ALLA REGISTRAZIONE GET
router.get('/signup', (req, res) => {
    res.render('./signup', {
            title: 'Registrati',
            error: [],
            formData: {},
            showLayoutParts: false
        }
    );
});

//REOUTING ALLA REGISTRAZIONE POST CON CONTROLLO DEI DATI
router.post('/signup', async (req, res) => {
    const { firstname, lastname, birthdate, username, email, password, confirmPassword } = req.body;
    const error = [];
    const existingMail = await User.findOne({ email });
    const existingUser = await User.findOne({ username });

    if (!username || !email || !password || !confirmPassword) {
        error.push("Username e password obbligatori!");
    }
    if(password !== confirmPassword) {
        error.push("Le password non coincidono");
    }
    if(password && password.length < 8) {
        error.push("La password deve contenere almeno 8 caratteri");
    }
    if(existingMail || existingUser) {
        error.push("Email o username già in uso");
    }
    if(error.length > 0) {
        return res.render('signup', {
                title: 'Registrati',
                error,
                formData: {username, email},
                showLayoutParts: false
            }
        );
    }
    try {
        const user = new User({ firstname, lastname, birthdate, username, email, password, confirmPassword });
        await user.save();
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Errore del server');
    }
});

//ROUTING AL LOGIN GET
router.get('/login', (req, res) => {
    res.render('./login', {
            showLayoutParts: false
        }
    );
});

//ROUTING AL LOGIN POST
router.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true,
    successFlash: 'Login effettuato con successo!'
  })
);


//ROUTING AL LOGIN GET
router.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

router.get('/auth/google/callback', passport.authenticate('google', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

//ROUTING AL LOGOUT
router.get('/logout', (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);
    req.flash('success_msg', 'Logout effettuato con successo!');
    res.redirect('/login');
  });
});

module.exports = router;

