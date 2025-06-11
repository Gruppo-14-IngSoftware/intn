//GESTIONE ROTTE PRINCIPALI
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const axios = require('axios');
const { isAuthenticated, isEventOwnerOrAdmin } = require('../middlewares/auth');
const {cloudinary} = require("../utilities/cloudinary");
const { getAllEvents } = require('../utilities/eventUtilities'); //richiesta utility eventi

//ROUTING CON INDICATORE NUMERO DELLE PAGINE
router.get('/', async (req, res) => {
    try {
        const locals = {
            title: "intn",
            description: "events webapp",
            showLayoutParts: true,
            showLayoutCar: true
        };
        const perPage = 10;
        const page = parseInt(req.query.page) || 1;

        const { allEvents, totalCount } = await getAllEvents({});

        const paginatedEvents = allEvents.slice((page - 1) * perPage, page * perPage);
        const hasNextPage = page * perPage < totalCount;

        res.render('index', {
            locals,
            events: paginatedEvents,
            current: page,
            user: req.user,
            nextPage: hasNextPage ? page + 1 : null
        });
    } catch (e) {
        console.error("Errore nella home:", e);
        res.status(500).render('500');
    }
});
//ROTTA PAGINA ABOUT
router.get('/about', (req, res) =>{
    res.render('about');
});
//ROTTA PER LA LISTA COMPLETA DEGLI EVENTI ORDINATA PER DATA PERTINENTE
router.get('/eventList', async (req, res) => {
    try {
        const locals = {
            title: "intn",
            description: "events webapp",
            showLayoutParts: true,
        };

        const now = new Date();

        const { allEvents } = await getAllEvents({
            query: {}, // nessun filtro
            customSortFunction: (a, b) => {
                const aDiff = Math.abs(a.date - now);
                const bDiff = Math.abs(b.date - now);
                return aDiff - bDiff;
            }
        });

        res.render('event/eventList', {
            ...locals,
            events: allEvents,
            user: req.user
        });
    } catch (e) {
        console.error("Errore nella lista eventi:", e);
        res.status(500).render('500');
    }
});

//ROTTA CHE INDIRIZZA ALLA SINGOLA PAGINA (SI PUò OTTIMIZZARE)
router.get('/event/:id', async (req, res) => {
    try {
        const slug = req.params.id;
        const { DateTime } = require('luxon');

        if (slug.startsWith("trento-")) {
            const trentoId = slug.split("trento-")[1];
            const response = await axios.get(`https://www.comune.trento.it/api/opendata/v2/content/read/${trentoId}`);

            const event = response.data;
            const itaData = event.data['ita-IT'];

            const title = itaData?.event_title || event.metadata.name["ita-IT"] || "Evento Comune di Trento";

            const description = itaData?.event_abstract
                ? itaData.event_abstract.replace(/<[^>]*>?/gm, '')
                : "Nessuna descrizione disponibile";

            let location = "Trento";
            let addressForMap = "Trento, Italia";
            if (itaData.virtual_takes_place_in && itaData.virtual_takes_place_in.length > 0) {
                const place = itaData.virtual_takes_place_in[0];
                location = place.name || location;
                if (place.address) {
                    addressForMap = place.address + ", Trento, Italia";
                } else {
                    addressForMap = location + ", Trento, Italia";
                }
            }

            const baseUrl = 'https://www.comune.trento.it';
            const defaultImage = "/img/default.webp";
            const images = itaData?.virtual_image && itaData.virtual_image.length > 0
                ? [baseUrl + itaData.virtual_image[0].url]
                : [defaultImage];

            const dateStr = itaData?.time_interval?.input?.startDateTime || event.metadata.published || event.metadata.modified;

            const formattedDate = dateStr
                ? DateTime.fromISO(dateStr, { zone: 'utc' }).setZone('Europe/Rome').toFormat("dd/MM/yyyy HH:mm")
                : "Data non disponibile";

            let officialLink = null;
            if (event.extradata && event.extradata['ita-IT'] && event.extradata['ita-IT'].urlAlias) {
                officialLink = "https://www.comune.trento.it" + event.extradata['ita-IT'].urlAlias;
            }

            const locals = {
                title,
                description,
                location,
                date: formattedDate,
                tag: "Comune Comunale",
                images,
                createdBy: "Comune di Trento",
                createdByRole: "Amministrazione Comunale",
                officialLink,
                addressForMap,
                verified: true,
                showLayoutParts: true
            };
            console.log("MAPBOX_TOKEN in backend:", process.env.MAPBOX_TOKEN);
            return res.render('event/eventAPI', { layout: 'layouts/main', locals, data: null, mapboxToken: process.env.MAPBOX_TOKEN });
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
                showLayoutParts: true,
            };
            return res.render('event/event', { layout: 'layouts/main', locals, data, user: req.user, mapboxToken: process.env.MAPBOX_TOKEN });
        }
    } catch (e) {
        console.error("Errore nella visualizzazione evento:", e.message);
        res.status(404).render('404', { showLayoutParts: true });
    }
});
/* ROTTE DI MODIFICA (SI POSSONO SPOSTARE NELL'ALTRO FILE)*/
//ROTTA PER LA MODIFICA EVENTI
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
            images: event.images,
            date: event.date.toISOString().slice(0, 16),
            tag: event.tag
        }
    });
    console.log("Ruolo utente al momento dell'acceso edit:", req.user.role);
});

//ROTTA PER LA MODIFICA EVENTI
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
            const uploadPromises = req.files.map(file => cloudinary.uploader.upload(file.path));
            const uploadResults = await Promise.all(uploadPromises);
            const newImageUrls = uploadResults.map(result => result.secure_url);
            data.images.push(...newImageUrls);
        }


        await data.save();
        res.redirect(`/event/${data._id}`);
        console.log("Ruolo utente al momento del post edit:", req.user.role);
        console.log("Immagini prima della modifica:", data.images);
        console.log("Nuove immagini caricate:", req.files.map(file => '/uploads/' + file.filename));

    } catch (err) {
        console.error("Errore", err);
        res.status(500).send("Errore 500");
    }
});

//ROTTA I COMMENTI (AI HELP)
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

//ROTTA PER L-ELIMINAZIONE EVENTI
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

//ROTTA PER LA RICERCA (OTTIMIZZABILE)
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

        res.render('search', {layout: 'layouts/main', locals, data: allEvents});
    }catch (e) {
        //error page
    }
    //res.send('index');
});

module.exports = router;
