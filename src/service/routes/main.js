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
        const locals = {
            title : data.title,
            description : data.description,
            showLayoutParts: true
        }
        res.render('event',{locals, data});
    }catch (e) {
        //error page
    }
    //res.send('index');
});

module.exports = router;
