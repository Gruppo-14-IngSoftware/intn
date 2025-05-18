//Google authentication

const GoogleStrategy = require('passport-google-oauth20').Strategy;
const passport = require('passport');
const User = require('../models/User');

passport.use(new GoogleStrategy({
    clientID: 'GOOGLE_CLIENT_ID',
    clientSecret: 'GOOGLE_CLIENT_SECRET',
    callbackURL: '/auth/google/callback'
}, async (accessToken, refreshToken, Profiler, done) => {
    let user = await User.findOne({googleId: Profiler.id});
    if(!user){
        user = await User.create({googleId: profile.id, email: profile.emails[0].value });
    }
    done(null, user);
}));