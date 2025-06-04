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
        let page = req.query.page || 1;

        const data = await Event.aggregate([{
            $sort: {createdAt: -1},
        }]).skip(perPage * page - perPage).limit(perPage).exec();

        const count = await Event.countDocuments();
        const nextPage = page + 1;
        const hasNextPage = nextPage < Math.ceil(count / perPage);
        const trentoApi = await axios.get('https://www.comune.trento.it/api/opendata/v2/content/search/classes%20%27event%27');
        const dataComune = trentoApi.data.searchHits;

        res.render('index', { locals,
            data,
            dataComune,
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
        let searchTerm = req.body.searchTerm;
        const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-O]/g, ""); //RIMOZIONE CARATTERI SPECIALI

        const data = await Event.find({
            $or: [
                {title: {$regex: new RegExp(searchNoSpecialChar, 'i')}},
                {description: {$regex: new RegExp(searchNoSpecialChar, 'i')}}
            ]
        });
        res.render('search', { locals, data });
    }catch (e) {
        //error page
    }
    //res.send('index');
});

module.exports = router;
