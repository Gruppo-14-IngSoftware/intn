//Local authentication with 

const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/User');
const bcrypt = require('bcrypt');

passport.use(new LocalStrategy({usernameField: 'email' }, async(email, password, done) => {
    const user = await User.findOne({ email });
    if(!user || !await bcrypt.compare(password, user.password)) {
        return done(null, false, {message: 'Creadenziali non valide'});
    }

    return done(null, user);
}));