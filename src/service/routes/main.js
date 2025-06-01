//JS FRONTEND
const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
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

        res.render('index', { locals,
            data,
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

//EVENT PAGE ROUTING
router.get('/event/:id', async (req, res) => {
    try{
        let slug = req.params.id;
        const data = await Event.findById({_id: slug});
        const options = { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const formattedDate = new Date(data.date).toLocaleString('it-IT', options);
        const locals = {
            title : data.title,
            description : data.description,
            location: data.location,
            date: formattedDate,
            tag : data.tag,
            image : data.imageUrl,
            showLayoutParts: true
        }
        res.render('event',{locals, data, mapboxToken: process.env.MAPBOX_TOKEN });
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
