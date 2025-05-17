// app.js
require('dotenv').config();

const express = require('express');
const expressLayout = require('express-ejs-layouts');
const path = require('path');
const main = require('./service/routes/main');
const connectDB = require('./service/config/db');
const authRoutes = require('./service/routes/auth');
const session = require('express-session');
const passport = require('passport');
const MongoStore = require('connect-mongo');

// Inizializza Express
const app = express();

// connessione al db
const connectDB = require('./service/config/db');
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Middleware statici
app.use(expressLayout);
app.use(express.static(path.join(__dirname, 'public')));

// Sessione
app.use(session({
  secret: process.env.SESSION_SECRET || 'c6ace9c5a0d129c50a4314d1a9d2688531a230f3276e7a263104c1074025d43d9284d16c5a2199f09964d65a36b2def589da0afe1d32deaabed9708a365e48f4ta',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

// Passport setup
require('./service/auth/passportConfig');
require('./service/auth/local');
require('./service/auth/google');

app.use(passport.initialize());
app.use(passport.session());

// Templating Engine
app.use(expressLayout);
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

app.use('/', main);
app.use('/', authRoutes);

module.exports = app;