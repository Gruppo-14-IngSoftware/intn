const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require('passport-google-oauth20').Strategy
const bcrypt = require('bcrypt');
const passport = require('passport');
const User = require('../models/User');

//LOGIN IN IN LOCALE, SENZA GOOGLE
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
//LOGIN TRAMITE GOOGLE CON CONNESSIONE DI ACCOUNT SE ESISTE GIà
passport.use(new GoogleStrategy({
  clientID: 'GOOGLE_CLIENT_ID',
  clientSecret: 'GOOGLE_CLIENT_SECRET',
  callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, Profiler, done) => {
  const email = profile.emails[0].value;
  let user = await User.findOne({ googleId: profile.id });
  if (user) {
    return done(null, user);
  }
  //RICERCA UTENTE
  user = await User.findOne({ email });
  if (user) {
    user.googleId = profile.id;
    await user.save();
    return done(null, user);
  }
  user = await User.create({
    username: profile.displayName,
    email,
    googleId: profile.id
  });
  return done(null, user);
}));

//SERIALIZZAZIONE UTENTE PER SALVARE L'ID
passport.serializeUser((user, done) => {
  done(null, user.id);
});

//DESERIALIZZAZIONE UTENTE PER OTTENERE L'ID SALVATO NELLA SESSIONE
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // salva tutto l’oggetto user in req.user
  } catch (err) {
    done(err);
  }
});
