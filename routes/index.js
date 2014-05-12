var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {

    res.render('index', {
        title: 'Web Clipper',
        stylesheets: ['/stylesheets/web-clipper.css'],
        javascripts: [
            '/javascripts/web-clipper.js'
        ]
    });
});

module.exports = router;
