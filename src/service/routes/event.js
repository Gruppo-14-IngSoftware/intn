const Event = require('../models/event');
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

router.get('/create', (req, res) => {
    res.render('create', {
        mapboxToken: process.env.MAPBOX_TOKEN,
        showLayoutParts: true
    });
});

router.post('/create', upload.single('image'), async (req, res) => {
    try {
        const { title, description, location, date, tag } = req.body;
        const geoRes = await axios.get('https://api.mapbox.com/geocoding/v5/mapbox.places/' + encodeURIComponent(location) + '.json', {
            params: {
                access_token: process.env.MAPBOX_TOKEN,
                proximity: '7.6869,45.0703'
            }
        });
        const coords = geoRes.data.features[0]?.center || [null, null];

        let imageUrl = '';
        if (req.file) {
            const uploadRes = await cloudinary.uploader.upload(req.file.path);
            imageUrl = uploadRes.secure_url;
        }
        const newEvent = new Event({
            title,
            description,
            location,
            coordinates: { lat: coords[1], lng: coords[0] },
            date,
            tag,
            imageUrl
        });
        await newEvent.save();
        res.redirect('/event/' + newEvent._id);
    } catch (err) {
        console.error('Errore creazione evento:', err);
        res.status(500).send('Errore nella creazione evento');
        console.log('Cloudinary config:', process.env.CLOUD_NAME, process.env.CLOUD_API_KEY);

    }
});
module.exports = router;