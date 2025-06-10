//JS ROUTING
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const { isAuthenticated, isEventOwnerOrAdmin } = require('../middlewares/auth');

//ROUTING CON INDICATORE NUMERO DELLE PAGINE
router.get('/', async (req, res) => {
    try{
        const locals = {
            title: "intn",
            description: "events webapp",
            showLayoutParts: true
        }
        let perPage = 10;
        let page = parseInt(req.query.page) || 1;

        const dataDB = await Event.aggregate([{
            $sort: {createdAt: -1},
        }]).skip(perPage * (page - 1)).limit(perPage).exec();

        const count = await Event.countDocuments();

        const apiTrento = await axios.get('https://www.comune.trento.it/api/opendata/v2/content/search/classes%20%27event%27');
        const dataAPI = apiTrento.data.searchHits;

        const userEvents = dataDB.map(e => ({
            id: e._id,
            title: e.title,
            description: e.description,
            images: e.images && e.images.length ? e.images : [e.imageUrl],
            source: 'local',
            date: new Date(e.date)
        }));

        const TrentoEvents = dataAPI.map(e => {
            const dateStr = e.metadata.published || e.metadata.modified || null;
            return {
                id: e.metadata.id,
                title: e.metadata.name?.['ita-IT'] || 'Evento Comune di Trento',
                description: e.metadata.description?.['ita-IT']?.substring(0, 100) || 'Descrizione non disponibile',
                images: e.images,
                source: 'trento',
                date: dateStr ? new Date(dateStr) : new Date(0)
            };
        });

        const allEvents = [...userEvents, ...TrentoEvents];
        allEvents.sort((a, b) => b.date - a.date);

        const totalCount = count + TrentoEvents.length;
        const nextPage = page + 1;
        const hasNextPage = nextPage <= Math.ceil(totalCount / perPage);

        const paginatedEvents = allEvents.slice((page - 1) * perPage, page * perPage);
        res.render('index', { locals,
            events: paginatedEvents,
            current: page,
            user: req.user,
            nextPage: hasNextPage ? nextPage : null
        });
    }catch (e) {
        //error page
    }
    //res.send('index');
});

router.get('/about', (req, res) =>{
    res.send('about');
});

//EVENT PAGE
router.get('/event/:id', async (req, res) => {
    try {
        const slug = req.params.id;
        const { DateTime } = require('luxon');
        if (slug.startsWith("trento-")) {
            const trentoId = slug.split("trento-")[1];
            const response = await axios.get(`https://www.comune.trento.it/api/opendata/v2/content/read/${trentoId}`);

            const event = response.data;
            const title = event.metadata.name["ita-IT"] || "Evento Comune di Trento";
            const description = event.metadata.description?.["ita-IT"] || "Nessuna descrizione disponibile";
            const location = event.metadata.address?.["ita-IT"] || "Trento";
            const date = event.metadata.published;
            const formattedDate = DateTime.fromISO(date, { zone: 'utc' })
                .setZone('Europe/Rome')
                .toFormat("dd/MM/yyyy HH:mm");
            const image = event.metadata.image_url || "";
            const images = image ? [image]: [];
            const locals = {
                title,
                description,
                location,
                date: formattedDate,
                tag: "Comune Comunale",
                images,
                createdBy: "Comune di Trento",
                createdByRole: "Ammministrazione Comunale",
                verified: true,
                showLayoutParts: true
            };
            return res.render('event/eventAPI', { locals, data: null, mapboxToken: process.env.MAPBOX_TOKEN });
        } else {
            const data = await Event.findById(slug)
                .populate('createdBy', 'username')
                .populate('comments.author', 'username');
            const options = { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
            const formattedDate = DateTime
                .fromJSDate(data.date, { zone: 'utc' })
                .setZone('Europe/Rome')
                .toFormat("dd/MM/yyyy HH:mm");
            const locals = {
                title: data.title,
                description: data.description,
                location: data.location,
                date: formattedDate,
                tag: data.tag,
                images: data.images && data.images.length ? data.images : [data.imageUrl],
                createdBy: data.createdBy,
                createdByRole: data.createdByRole,
                verified: data.verified,
                comments: data.comments,
                showLayoutParts: true
            };
            return res.render('event/event', { locals, data, user: req.user, mapboxToken: process.env.MAPBOX_TOKEN });
            console.log("Ruolo utente al momento dell'acceso evento:", req.user.role);
        }
    } catch (e) {
        console.error("Errore nella visualizzazione evento:", e.message);
        res.status(404).render('404', { showLayoutParts: true });
    }
});

router.get('/event/:id/edit', isAuthenticated, isEventOwnerOrAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send("Evento");

    const [street, city, province, country] = event.location.split(',').map(x => x.trim());

    res.render('event/edit', {
        data: event,
        user: req.user,
        values: {
            title: event.title,
            description: event.description,
            street,
            city,
            province,
            country,
            date: event.date.toISOString().slice(0, 16),
            tag: event.tag
        }
    });
    console.log("Ruolo utente al momento dell'acceso edit:", req.user.role);
});

router.put('/event/:id/edit', isAuthenticated, isEventOwnerOrAdmin, upload.array('image'), async (req, res) => {
    try {
        const { title, description, street, city, province, country, date, tag } = req.body;

        const data = await Event.findById(req.params.id);
        if (!data) return res.status(404).send("Evento non trovato");

        data.title = title;
        data.description = description;
        data.location = `${street}, ${city}, ${province}, ${country}`;
        data.date = new Date(date);
        data.tag = tag;

        if (req.files.length) {
            data.images = req.files.map(file => '/uploads/' + file.filename);
        }

        await data.save();
        res.redirect(`/event/${data._id}`);
        console.log("Ruolo utente al momento del post edit:", req.user.role);
    } catch (err) {
        console.error("Errore", err);
        res.status(500).send("Errore");
    }
});


router.post('/event/:id/comment', async (req, res) => {
    try {
        const { comment } = req.body;
        const event = await Event.findById(req.params.id);

        if (!event) {
            return res.status(404).send("Evento non trovato.");
        }

        event.comments.push({
            text: comment,
            author: req.user._id
        });

        await event.save();
        res.redirect(`/event/${req.params.id}`);
    } catch (err) {
        console.error("Errore nel salvataggio commento:", err);
        res.status(500).send("Errore interno.");
    }
});

router.get('/event/:id/delete', isAuthenticated, isEventOwnerOrAdmin, async (req, res) => {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).send('Evento non trovato');

    res.render('event/delete', {
        event,
        user: req.user
    });
});

router.delete('/event/:id', isAuthenticated, isEventOwnerOrAdmin, async (req, res) => {
    try {
        await Event.findByIdAndDelete(req.params.id);
        res.redirect('/');
    } catch (err) {
        console.error("Errore eliminazione:", err);
        res.status(500).send('Errore server');
    }
});



//POST ROUTE
//POST search
router.post('/search', async (req, res) => {
    try{
        const locals = {
            title : "intn",
            description : "events webapp",
            showLayoutParts: true
        }
        const searchTerm = req.body.searchTerm.toLowerCase();
        const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9\s]/g, ""); //RIMOZIONE CARATTERI SPECIALI

        const dataDB = await Event.find({
            $or: [
                {title: {$regex: new RegExp(searchNoSpecialChar, 'i')}},
                {description: {$regex: new RegExp(searchNoSpecialChar, 'i')}}
            ]
        });

        const axios = require('axios');
        const dataAPI = await axios.get('https://www.comune.trento.it/api/opendata/v2/content/search', {
            params: {
                classes: 'event'
            }
        });
        const dataTrentoRaw = dataAPI.data.searchHits || [];

        const dataTrento = dataTrentoRaw
            .filter(hit => {
                const title = hit.metadata.name?.['ita-IT']?.toLowerCase() || '';
                const description = hit.metadata.description?.['ita-IT']?.toLowerCase() || '';
                return title.includes(searchTerm) || description.includes(searchTerm);
            })
            .map(hit => ({
                _id: `trento-${hit.metadata.id}`,
                title: hit.metadata.name?.['ita-IT'] || 'Evento',
                description: hit.metadata.description?.['ita-IT'] || 'Nessuna descrizione disponibile',
                imageUrl: '/images/default.jpg',
                location: hit.metadata.location?.['ita-IT'] || 'Trento',
                externalLink: hit.metadata.link
            }));

        const allEvents = [...dataDB, ...dataTrento];

        res.render('search', { locals, data: allEvents});
    }catch (e) {
        //error page
    }
    //res.send('index');
});

module.exports = router;
