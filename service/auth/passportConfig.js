//Specifies how to check whether a user is valid or not (for example by checking the email and password in the database).

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcrypt');
const User = require('../models/User');

// Strategia Local
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

// Serializzazione utente (per sessione)
passport.serializeUser((user, done) => {
  done(null, user.id); // salva solo l’ID nella sessione
});

// Deserializzazione utente (dalla sessione al DB)
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user); // salva tutto l’oggetto user in req.user
  } catch (err) {
    done(err);
  }
});
