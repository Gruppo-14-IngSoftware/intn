/* CONFIGURAZIONE PASSPORT PER AUTENTICAZIONE*/
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const bcrypt = require('bcrypt');
const passport = require('passport');
const mongoose = require('mongoose');
const User = require('../models/User');

//STRATEGIA LOGIN LOCALE
passport.use(new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    if (!user) return done(null, false, { message: 'Email non trovata' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return done(null, false, { message: 'Password errata' });
    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

//STRATEGIA LOGIN CON GOOGLE
passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'http://localhost:5000/auth/google/callback'
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails[0].value;
    let user = await User.findOne({ email });

    if (!user) {
      //NON REGISTRATO: RIFIUTA L'ACCESSO
      return done(null, false, { message: 'Utente non registrato' });
    }

    //COLLEGA GOOGLE ID SE NON GIÀ PRESENTE
    if (!user.googleId) {
      user.googleId = profile.id;
      await user.save();
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
}));

//SERIALIZZAZIONE E DESERIALIZZAZIONE UTENTE
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});
