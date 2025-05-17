const express = require('express');
const router = express.Router();
const User = require('../models/User');

router.get('/signup', (req, res) => {
    res.render('./signup', {
            title: 'Registrati',
            error: [],
            formData: {},
            showLayoutParts: false
        }
    );
});

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
    if(password && password < 8) {
        error.push("La password deve contenere almeno 8 caratteri");
    }
    if(existingMail || existingUser) {
        error.push("Email o username già in uso");
    }
    if(error.length > 0) {
        return res.render('./layouts/signUp', {
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

module.exports = router;

const express = require('express');
const passport = require('passport');
const router = express.Router();

//Login with email/password
router.post('/login', passport.authenticate('local', {
    successRedirect: '/dashboard',
    failureRedirect: '/login?error=1'
}));

//Login with Google 
router.get('/google', passport.authenticate('google', {
    scope: ['email', 'profile']
}));
router.get('/google/callback', passport.authenticate('google', {
    successRedirect: '/dashboard',
    failureRedirect: '/login'
}));


module.exports = router;