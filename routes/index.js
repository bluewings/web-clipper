/*jslint unparam: true */
var express = require('express');
var router = express.Router();
var templates = {};
var useTemplateCache = false;

/* GET home page. */
router.get('/', function (req, res) {

    res.render('index', {
        title: 'Web Clipper',
        stylesheets: ['/stylesheets/web-clipper.css'],
        javascripts: [
            '/javascripts/web-clipper.js'
        ]
    });
});

router.get('/proxy/image/:url', function (req, res) {

    var request = require('request');

    var url = 'http://imgnews.naver.net/image/origin/079/2014/05/14/2596165.jpg';

 request({uri:url, encoding:'binary'}, function (error, response, body) {
      if (!error && response.statusCode == 200) {

        response.setEncoding('binary');

              var data_uri_prefix = "data:" + response.headers["content-type"] + ";base64,";
                var buf = new Buffer(body, 'binary');
                var image = buf.toString('base64');

                image = data_uri_prefix + image;        

         var base64Data = new Buffer(body).toString('base64');
        console.log('SUCCESES');
        console.log(base64Data);

           res.jsonp({
            code: 200,
            message: 'ok',
            result: {
     
     image: image
            }
        });        
      }
});




    console.log(req.params);



});


router.get('/template/:id', function (req, res) {

    var fs = require('fs'),
        path = require('path'),
        jade = require('jade'),
        template = templates[req.params.id];

    if (useTemplateCache && template) {

        res.jsonp({
            code: 200,
            message: 'ok',
            result: {
                template: template
            }
        });

    } else {

        fs.readFile(path.join(__dirname, '..', 'views', 'template.' + req.params.id + '.jade'), 'utf8', function (err, data) {

            if (data) {
                res.jsonp({
                    code: 200,
                    message: 'ok',
                    result: {
                        template: jade.compile(data, {
                            pretty: true
                        })({})
                    }
                });
            } else {
                res.jsonp({
                    code: 500,
                    message: 'template not found'
                });
            }
        });
    }
});

function registerTemnplate(name, filepath, options) {

    var fs = require('fs'),
        jade = require('jade');

    fs.readFile(filepath, 'utf8', function (err, data) {

        if (!err) {
            templates[name] = jade.compile(data, {
                pretty: true
            })({});
        }
    });
}

function bootstrap() {

    var fs = require('fs'),
        path = require('path'),
        dir = path.join(__dirname, '..', 'views'),
        allFiles = fs.readdirSync(dir),
        inx,
        matches;

    for (inx = 0; inx < allFiles.length; inx++) {
        matches = path.basename(allFiles[inx]).match(/^template\.([0-9a-zA-Z]+)\.jade$/);
        if (matches) {
            registerTemnplate(matches[1], path.join(dir, allFiles[inx]));
        }
    }
}

bootstrap();


module.exports = router;