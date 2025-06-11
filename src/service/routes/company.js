/*GESTIONE ROTTE PROFILI AZIENDALI*/

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { isAuthenticated, isCompany } = require('../middlewares/auth');
const User = require('../models/User');


//SETUP UPLOAD DOCUMENTI
const storage = multer.diskStorage({
  destination: path.resolve('src/public/uploads'),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, '-');
    cb(null, Date.now() + '-' + safeName);
    }
});
const upload = multer({ storage });


// GET richiesta accesso azienda (solo utenti normali)
router.get('/request-access', isAuthenticated, (req, res) => {
  if (req.user.role !== 'user') {
    return res.redirect('/profile');
  }
  res.render('company/request-access', { user: req.user, message: null });
});

const uploadSingle = multer({ storage }).single('identityDoc');

//POST RICHIESTA ACCESSO AZIENDA
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

      //verifica stato attuale
      const currentStatus = req.user.verification?.status;

      //blocchi stati non modificabili
      if (['pending', 'approved', 'blocked'].includes(currentStatus)) {
        return res.status(403).render('company/request-access', {
          user: req.user,
          message: 'Non puoi inviare una nuova richiesta in questo stato.'
        });
      }

      //se è stato rejected → pulizia dati
      if (currentStatus === 'rejected') {
        req.user.verification = { status: 'none' };
      }

      //validazione P.IVA
      if (!/^\d{11}$/.test(vatNumber)) {
        return res.status(400).render('company/request-access', {
          user: req.user,
          message: 'La Partita IVA deve contenere esattamente 11 cifre numeriche.'
        });
      }

      const duplicate = await User.findOne({ 'verification.vatNumber': vatNumber });

      //blocco se P.IVA già usata da altro utente
      if (duplicate && !duplicate._id.equals(req.user._id)) {
        return res.status(400).render('company/request-access', {
          user: req.user,
          message: 'Questa Partita IVA è già stata utilizzata per una richiesta.'
        });
      }

      const docPath = req.file ? '/uploads/' + req.file.filename : null;

      //aggiorna dati verifica
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

//FORM PER RICHIEDERE AL COMUNE I REQUISITI PER CREARE EVENTI
//ACCESSIBILE SOLO DA UTENTI CON RUOLO 'COMPANY'
router.get('/request-info', isAuthenticated, isCompany, (req, res) => {
  res.render('company/request-info', { user: req.user, message: null });
});

// GESTISCE L'INVIO DELLA RICHIESTA AL COMUNE DA PARTE DELL'AZIENDA
// PER ORA SIMULA L'INVIO SCRIVENDO IL MESSAGGIO NEL TERMINALE (CONSOLE.LOG)
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
