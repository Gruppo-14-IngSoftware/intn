const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { isAuthenticated, isCompany } = require('../middlewares/auth'); // <-- fixato qui
const User = require('../models/User');


// Setup upload
const storage = multer.diskStorage({
  destination: path.resolve('src/public/uploads'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });

// GET verifica
router.get('/verify', isAuthenticated, isCompany, (req, res) => {
  res.render('company/verify', { user: req.user, message: null });
});

// POST verifica
router.post('/verify', isAuthenticated, isCompany, upload.array('documents'), async (req, res) => {
  try {
    const files = req.files.map(f => '/uploads/' + f.filename);

    req.user.verification = {
      status: 'pending',
      documents: files
    };
    await req.user.save();

    res.render('company/verify', { user: req.user, message: 'Richiesta inviata con successo' });
  } catch (err) {
    console.error(err);
    res.status(500).render('company/verify', { user: req.user, message: 'Errore durante l’invio' });
  }
});

// GET richiesta accesso azienda (solo utenti normali)
router.get('/request-access', isAuthenticated, (req, res) => {
  if (req.user.role !== 'user') {
    return res.redirect('/profile');
  }
  res.render('company/request-access', { user: req.user, message: null });
});

const uploadSingle = multer({ storage }).single('identityDoc');

// POST richiesta accesso azienda
router.post('/request-access', isAuthenticated, (req, res) => {
  if (req.user.role !== 'user') {
    return res.redirect('/profile');
  }

  uploadSingle(req, res, async function (err) {
    if (err) {
      console.error('Errore upload:', err);
      return res.status(500).render('company/request-access', {
        user: req.user,
        message: 'Errore durante il caricamento'
      });
    }

    try {
      const { companyName, vatNumber, address, companyEmail } = req.body;

      // Verifica stato attuale
      const currentStatus = req.user.verification?.status;

      // Blocchi stati non modificabili
      if (['pending', 'approved', 'blocked'].includes(currentStatus)) {
        return res.status(403).render('company/request-access', {
          user: req.user,
          message: 'Non puoi inviare una nuova richiesta in questo stato.'
        });
      }

      // Se è stato rejected → pulizia dati
      if (currentStatus === 'rejected') {
        req.user.verification = { status: 'none' };
      }

      // Validazione P.IVA
      if (!/^\d{11}$/.test(vatNumber)) {
        return res.status(400).render('company/request-access', {
          user: req.user,
          message: 'La Partita IVA deve contenere esattamente 11 cifre numeriche.'
        });
      }

      const duplicate = await User.findOne({ 'verification.vatNumber': vatNumber });

      // Blocco se P.IVA già usata da altro utente
      if (duplicate && !duplicate._id.equals(req.user._id)) {
        return res.status(400).render('company/request-access', {
          user: req.user,
          message: 'Questa Partita IVA è già stata utilizzata per una richiesta.'
        });
      }

      const docPath = req.file ? '/uploads/' + req.file.filename : null;

      // Aggiorna dati verifica
      req.user.verification = {
        status: 'pending',
        companyName,
        vatNumber,
        address,
        companyEmail,
        document: docPath
      };

      await req.user.save();

      res.render('company/request-access', {
        user: req.user,
        message: 'Richiesta inviata, in attesa di approvazione.'
      });
    } catch (error) {
      console.error(error);
      res.status(500).render('company/request-access', {
        user: req.user,
        message: 'Errore durante il salvataggio dei dati'
      });
    }
  });
});

// Mostra il form per richiedere al comune i requisiti per creare eventi.
// Accessibile solo da utenti con ruolo 'company'.
router.get('/request-info', isAuthenticated, isCompany, (req, res) => {
  res.render('company/request-info', { user: req.user, message: null });
});

// Gestisce l'invio della richiesta al comune da parte dell'azienda.
// Per ora simula l'invio scrivendo il messaggio nel terminale (console.log).

const CompanyInfoRequest = require('../models/CompanyInfoRequest');

router.post('/request-info', isAuthenticated, isCompany, async (req, res) => {
  try {
    const { message } = req.body;

    await CompanyInfoRequest.create({
        company: req.user._id,
        message
    });

    res.render('company/request-info', {
      user: req.user,
      message: 'Richiesta inviata al comune. Riceverai risposta via email.'
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('company/request-info', {
      user: req.user,
      message: 'Errore durante l’invio della richiesta.'
    });
  }
});


module.exports = router;
