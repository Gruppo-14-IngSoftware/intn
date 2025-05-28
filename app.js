//SETUP EXPRESS APP, MIDDLEWARE e ROTTE
const express = require('express');
const expressLayout = require('express-ejs-layouts');
const path = require('path');
const main = require('./src/service/routes/main');
const admin = require('./src/service/routes/admin');
const connectDB = require('./src/service/config/db');
const MongoStore = require('connect-mongo');
const authRoutes = require('./src/service/routes/auth');
const session = require('express-session');
const passport = require('passport');
const app = express();
const flash = require('connect-flash');
const { storage } = require('./src/service/utilities/cloudinary');
const eventsRouter = require('./src/service/routes/event');
const methodOverride = require('method-override');
const admin = require('./src/service/routes/admin');
const cors = require('cors');
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

//CONNESSIONE AL DB
connectDB();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

//CONFIG MIDDLEWARE STATICI (da spostare)
app.use(expressLayout);
app.use(express.static(path.join(__dirname, 'src', 'public')));

//CONFIG SESSIONE
app.use(session({
  secret: process.env.SESSION_SECRET || 'c6ace9c5a0d129c50a4314d1a9d2688531a230f3276e7a263104c1074025d43d9284d16c5a2199f09964d65a36b2def589da0afe1d32deaabed9708a365e48f4ta',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

app.use(passport.initialize());
app.use(passport.session());

require('./src/service/config/passport');

//Flash message (error, success)
app.use(flash());
// Middleware per rendere i messaggi flash accessibili nei template
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error'); // messaggio di errore di Passport
  next();
});

// Middleware per rendere l'utente disponibile nei template
app.use((req, res, next) => {
    res.locals.user = req.user || null;
    res.locals.role = req.user ? req.user.role : null;
    next();
});

//TEMPLATE PER FRONTEND ENGINE
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('layout', 'layouts/main');
app.set('view engine', 'ejs');

app.use('/', main);
app.use('/', authRoutes);
app.use('/events', eventsRouter);
app.use('/', admin);
app.use('/', admin);

// Rotte stats
app.use('/api/stats', admin);


app.get('/admin/dashboard', (req, res) => {
  res.render('dashboard');
});

module.exports = app;