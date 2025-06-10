const Event = require('../models/Event');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const path = require('path');
const axios = require('axios');
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const { isAuthenticated, isEventOwnerOrAdmin } = require('../middlewares/auth');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
//ROTTA DI CREAZIONE PAGINA EVENTI PER UTENTI NORMALI
router.get('/create', (req, res) => {
    res.render('event/userCreate', {
        mapboxToken: process.env.MAPBOX_TOKEN,
        showLayoutParts: true
    });
});
//ROTTA DI CREAZIONE PAGINA EVENTI PER UTENTI NORMALI
router.post('/create', upload.array('image', 5), async (req, res) => {
    try {
        const { DateTime } = require('luxon');
        const { title, description, street, city, province, country, date, tag } = req.body;
        const fullAddress = `${street}, ${city}, ${province}, ${country}`;
        const geoRes = await axios.get('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(fullAddress) + '.json', {
            params: {
                access_token: process.env.MAPBOX_TOKEN,
                limit:1,
                autocomplete: false
            }
        });
        const coords = geoRes.data.features[0]?.center || [null, null];
        const parsedDate = DateTime.fromISO(date, { zone: 'Europe/Rome' }).toUTC().toJSDate();
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => cloudinary.uploader.upload(file.path));
            const uploadResults = await Promise.all(uploadPromises);
            imageUrls = uploadResults.map(result => result.secure_url);
        }
        const newEvent = new Event({
            title,
            description,
            location: fullAddress,
            coordinates: { latitude: coords[1], longitude: coords[0] },
            date: parsedDate,
            tag,
            images: imageUrls,
            createdByRole: 'user',
            createdBy: req.user._id,
        });
        await newEvent.save();
        res.redirect('/event/' + newEvent._id);
        console.log('GEOCODING:', geoRes.data.features[0]);
        console.log("FILES RICEVUTI:", req.files);
        console.log("Ruolo utente al momento della creazione:", req.user.role);
    } catch (err) {
        console.error('Errore creazione evento:', err);
        res.status(500).send('Errore nella creazione evento');
        console.log('Cloudinary config:', process.env.CLOUD_NAME, process.env.CLOUD_API_KEY);
    }
});
//ROTTA DI CREAZIONE PAGINA EVENTI PER UTENTI COMPANY
router.get('/create-public', (req, res) => {
    res.render('event/organizationCreate', {
        mapboxToken: process.env.MAPBOX_TOKEN,
        showLayoutParts: true
    });
});
//ROTTA DI CREAZIONE PAGINA EVENTI PER UTENTI COMPANY, DA OTTIMIZZARE
router.post('/create-public', upload.array('image', 5), async (req, res) => {
    try {
        const { DateTime } = require('luxon');
        const { title, description, street, city, province, country, date, tag } = req.body;
        const fullAddress = `${street}, ${city}, ${province}, ${country}`;
        const geoRes = await axios.get('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(fullAddress) + '.json', {
            params: {
                access_token: process.env.MAPBOX_TOKEN,
                limit:1,
                autocomplete: false
            }
        });
        const coords = geoRes.data.features[0]?.center || [null, null];
        const parsedDate = DateTime.fromISO(date, { zone: 'Europe/Rome' }).toUTC().toJSDate();
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const uploadPromises = req.files.map(file => cloudinary.uploader.upload(file.path));
            const uploadResults = await Promise.all(uploadPromises);
            imageUrls = uploadResults.map(result => result.secure_url);
        }

        const documents = await Promise.all(
            (req.files.documents || []).map(file => cloudinary.uploader.upload(file.path, { resource_type: 'auto' }))
        );
        const documentUrls = documents.map(upload => upload.secure_url);

        const newEvent = new Event({
            title,
            description,
            location: fullAddress,
            coordinates: { latitude: coords[1], longitude: coords[0] },
            date: parsedDate,
            tag,
            images: imageUrls,
            documents: documentUrls,
            verified: false,
            createdByRole: 'enterprise',
            createdBy: req.user._id,
        });
        await newEvent.save();
        res.redirect('/event/' + newEvent._id);
        console.log('GEOCODING:', geoRes.data.features[0]);
        console.log("FILES RICEVUTI:", req.files);
    } catch (err) {
        console.error('Errore creazione evento:', err);
        res.status(500).send('Errore nella creazione evento');
        console.log('Cloudinary config:', process.env.CLOUD_NAME, process.env.CLOUD_API_KEY);
    }
});
//ROTTA PER L'ISCIZIONE AGLI EVENTI
router.post('/:id/subscribe', async (req, res) => {
    if (!req.user) return res.redirect('/login');

    try {
        const event = await Event.findById(req.params.id);
        const userEmail = req.user.email;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            }
        });

        await transporter.sendMail({
            from: `"Eventi" <${process.env.GMAIL_USER}>`,
            to: userEmail,
            subject: `Conferma iscrizione all'evento: ${event.title}`,
            text: `Hai effettuato l'iscrizione all'evento "${event.title}" il ${new Date(event.date).toLocaleString('it-IT')} presso ${event.location}.`
        });

        res.redirect('/event/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send('Errore durante l\'iscrizione');
    }
});
//ROTTA PER L'ISCIZIONE AGLI EVENTI
router.post('/:id/unsubscribe', async (req, res) => {
    if (!req.user) return res.status(401).send("Non autenticato");

    try {
        const user = await User.findById(req.user._id);
        user.subscribedEvents = user.subscribedEvents.filter(eId => eId.toString() !== req.params.id);
        await user.save();

        res.redirect('/event/' + req.params.id);
    } catch (err) {
        console.error(err);
        res.status(500).send("Errore durante la disiscrizione");
    }
});
//ROTTA PER IL REPORT EVENTO
router.post('/:id/report', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).send('Devi essere autenticato per segnalare un evento.');
        }

        const eventId = req.params.id;
        const userId = req.user._id;
        const username = req.user.username;

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).send('Evento non trovato.');

        const alreadyReported = event.reports.some(r => r.userId.equals(userId));
        if (alreadyReported) {
            return res.status(400).send('Hai già segnalato questo evento.');
        }

        event.reports.push({ userId, username });
        await event.save();

        res.redirect(`/event/${eventId}`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Errore durante la segnalazione.');
    }
});

//FUNZIONE DI NOTIFICA
/*
async function notifySubscribers(eventId, newData) {
    const event = await Event.findById(eventId);
    const users = await User.find({ subscribedEvents: eventId });

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
        }
    });

    for (const user of users) {
        await transporter.sendMail({
            from: '"Eventi" <no-reply@eventi.it>',
            to: user.email,
            subject: `Evento aggiornato: ${event.title}`,
            text: `L'evento "${event.title}" è stato modificato. Dai un'occhiata! https://tuosito.it/event/${event._id}`
        });
    }
}
*/



module.exports = router;