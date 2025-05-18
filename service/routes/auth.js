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