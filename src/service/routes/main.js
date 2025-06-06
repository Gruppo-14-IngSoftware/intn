//JS ROUTING
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const User = require('../models/User');
const axios = require('axios');

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

        const localsEvent = dataDB.map(e => ({
            id: e._id,
            title: e.title,
            description: e.description,
            imageUrl: e.imageUrl || '/images/default.jpg',
            source: 'local',
            date: new Date(e.date)
        }));

        const TrentoEvents = dataAPI.map(e => {
            const dateStr = e.metadata.published || e.metadata.modified || null;
            return {
                id: e.metadata.id,
                title: e.metadata.name?.['ita-IT'] || 'Evento Comune di Trento',
                description: e.metadata.description?.['ita-IT']?.substring(0, 100) || 'Descrizione non disponibile',
                imageUrl: '/images/comune-trento.jpg',
                source: 'trento',
                date: dateStr ? new Date(dateStr) : new Date(0)
            };
        });

        const allEvents = [...localsEvent, ...TrentoEvents];
        allEvents.sort((a, b) => b.date - a.date);

        const totalCount = count + TrentoEvents.length;
        const nextPage = page + 1;
        const hasNextPage = nextPage <= Math.ceil(totalCount / perPage);

        const paginatedEvents = allEvents.slice((page - 1) * perPage, page * perPage);
        res.render('index', { locals,
            events: paginatedEvents,
            current: page,
            nextPage: hasNextPage ? nextPage : null
        });
    }catch (e) {
        //error page
    }
    //res.send('index');
});

/*
//ROUTING ALLA PAGINA PRINCIPALE CON PASSAGGIO DI VARIABILI
router.get('', async (req, res) => {
    const locals = {
        title : "intn",
        description : "events webapp",
        showLayoutParts: true
    }

    try{
        const data = await Event.find();
        res.render('index', { locals, data });
    }catch (e) {
        //error page
    }
    //res.send('index');
});
/*
function insertEventData(){
    Event.insertMany([{
        title : "Primo evento",
        description : "evento test",
        location : "trento",
        date : Date.now(),
        tag : "scuola",
    },
    ])
}
*/
router.get('/about', (req, res) =>{
    res.send('about');
});

//EVENT PAGE ROUTING DA RENDERE PIù OTTIMIZZATA!!!!
router.get('/event/:id', async (req, res) => {
    try{
        const slug = req.params.id;
        if(slug.startsWith("trento-")){
            const trentoId = slug.split("trento-")[1];
            const response = await axios.get(`https://www.comune.trento.it/api/opendata/v2/content/read/${trentoId}`);

            const event = response.data;
            const title = event.metadata.name["ita-IT"] || "Evento Comune di Trento";
            const description = event.metadata.description?.["ita-IT"] || "Nessuna descrizione disponibile";
            const location = event.metadata.address?.["ita-IT"] || "Trento";
            const date = event.metadata.published;
            const formattedDate = new Date(date).toLocaleString('it-IT', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            const image = event.metadata.image_url || "";
            const locals = {
                title,
                description,
                location,
                date: formattedDate,
                tag: "Comune di Trento",
                image,
                showLayoutParts: true
            };
            return res.render('event', { locals, data: null, mapboxToken: process.env.MAPBOX_TOKEN });
        }else {
            const data = await Event.findById(slug);
            const options = {day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'};
            const formattedDate = new Date(data.date).toLocaleString('it-IT', options);
            const locals = {
                title: data.title,
                description: data.description,
                location: data.location,
                date: formattedDate,
                tag: data.tag,
                image: data.imageUrl,
                showLayoutParts: true
            };
            res.render('event', {locals, data, mapboxToken: process.env.MAPBOX_TOKEN});
        }
    }catch (e) {
        //error page
    }
    //res.send('index');
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
