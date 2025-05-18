const express = require('express');
const router = express.Router();

router.get('', (req, res) => {
    const locals = {
        title : "intn",
        description : "events webapp"
    }
    //res.send('index');
    res.render('index', { locals });
})

router.get('/about', (req, res) =>{
    res.send('about');
})

//render to login page
router.get('/login', (req, res) => {
  res.render('login');
});


module.exports = router;
