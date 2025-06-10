const express = require('express');
const router = express.Router();
const passport = require('passport');
const bcrypt = require('bcrypt');
const User = require('../models/User');
const Event = require('../models/Event');
const { isAuthenticated } = require('../middlewares/auth');

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect('/login');
}

//ROUTING ALLA REGISTRAZIONE GET
router.get('/signup', (req, res) => {
    res.render('auth/signup', {
            title: 'Registrati',
            error: [],
            formData: {},
            showLayoutParts: false
        }
    );
});

//ROUTING ALLA REGISTRAZIONE POST CON CONTROLLO DEI DATI
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
    res.render('auth/login', {
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
    res.redirect('/');
  });
});

//Questa rotta carica la pagina profile.ejs e passa i dati dell’utente loggato
router.get('/profile', isAuthenticated, async (req, res) => {
  try {
    const createdEvents = await Event.find({ createdBy: req.user._id }).sort({ date: -1 });
    const subscribedEventsData = await Event.find({ _id: { $in: req.user.subscribedEvents } }).sort({ date: -1 });

    res.render('user/profile', {
      title: 'Profilo utente',
      user: {
        ...req.user.toObject(),
        createdEvents,
        subscribedEventsData
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore nel caricamento profilo');
  }
});


//Quando viene effettuato l'update aggiorna i dati dell’utente nel DB (compreso di change psw)
router.post('/profile/update', ensureAuthenticated, async (req, res) => {
  const {
    firstname,
    lastname,
    email,
    username = req.user.username, // fallback automatico
    currentPassword,
    newPassword,
    confirmNewPassword
  } = req.body;

  try {
    const user = await User.findById(req.user._id);

    // Verifica che username sia presente
    if (!username) {
      return res.status(400).send('Lo username è obbligatorio.');
    }

    // Controllo modifica username (evita conflitti)
    const existingUser = await User.findOne({ username });
    if (existingUser && existingUser._id.toString() !== req.user._id.toString()) {
      return res.status(400).send('Username già in uso.');
    }

    // Cambio password
    if (currentPassword || newPassword || confirmNewPassword) {
      if (!currentPassword || !newPassword || !confirmNewPassword) {
        return res.status(400).send('Compila tutti i campi per il cambio password.');
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).send('La password attuale non è corretta.');
      }

      if (newPassword !== confirmNewPassword) {
        return res.status(400).send('Le nuove password non coincidono.');
      }

      if (newPassword.length < 8) {
        return res.status(400).send('La nuova password deve contenere almeno 8 caratteri.');
      }

      user.password = newPassword; // sarà hashata dal middleware pre('save')
    }

    // Aggiorna gli altri dati
    user.firstname = firstname;
    user.lastname = lastname;
    user.email = email;
    user.username = username;

    await user.save();
    res.redirect('/profile');

  } catch (err) {
    console.error(err);
    res.status(500).send("Errore durante l'aggiornamento del profilo.");
  }
});

//Elimina l’account dal database, termina la sessione e reindirizza alla homepage
router.post('/profile/delete', ensureAuthenticated, async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    req.logout(function (err) {
      if (err) return next(err);
      req.flash('success_msg', 'Account eliminato con successo!');
      res.redirect('/');
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Errore durante l'eliminazione dell'account");
  }
});

// Event user history
router.get('/event/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate('createdBy');
    if (!event) return res.status(404).send('Evento non trovato');

    const isCreator = req.user && event.createdBy.equals(req.user._id);
    const isSubscribed = req.user && req.user.subscribedEvents.includes(event._id.toString());

    // Accesso consentito solo se:
    const accessGranted =
      event.createdByRole === 'user' || // evento pubblico
      isCreator ||                      // o sei il creatore
      isSubscribed;                     // o sei iscritto

    if (!accessGranted) return res.status(403).send('Non hai accesso a questo evento.');

    res.render('event/show', { event, user: req.user });
  } catch (err) {
    console.error(err);
    res.status(500).send('Errore caricamento evento');
  }
});

module.exports = router;

