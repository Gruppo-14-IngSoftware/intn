//JS FRONTEND
const express = require('express');
const router = express.Router();
//ROUTING ALLA PAGINA PRINCIPALE CON PASSAGGIO DI VARIABILI
router.get('', (req, res) => {
    const locals = {
        title : "intn",
        description : "events webapp",
        showLayoutParts: true
    }
    //res.send('index');
    res.render('index', { locals });
})

router.get('/about', (req, res) =>{
    res.send('about');
})

module.exports = router;
