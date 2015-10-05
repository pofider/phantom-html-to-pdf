/*!
 * Copyright(c) 2014 Jan Blaha
 *
 * Phantomjs script responsible for converting html into pdf.
 */
/* globals phantom */


var webpage = require('webpage');
var webserver = require('webserver').create();
var system = require('system');
var fs = require('fs');
var port = require("system").env['PHANTOM_WORKER_PORT'];
var host = require("system").env['PHANTOM_WORKER_HOST'];
var page = webpage.create();

var service = webserver.listen(host + ':' + port, function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');

    var body = JSON.parse(req.post);

    function respond(page, body) {
        res.statusCode = 200;
        res.write(body.numberOfPages);
        res.close();
    }

    try {
        $conversion
    }
     catch (e) {
        system.stdout.writeLine(JSON.stringify(e));
        res.statusCode = 500;
        res.write(JSON.stringify(e));
        res.close();
    }
});
