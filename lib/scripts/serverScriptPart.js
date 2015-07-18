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
var port = require("system").stdin.readLine();
var host = require("system").stdin.readLine();
var page = webpage.create();

var service = webserver.listen(host + ':' + port, function (req, res) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');

    var body = JSON.parse(req.post);

    function render(page, body) {
        setTimeout(function() {
            page.render(body.output);

            res.statusCode = 200;
            res.write(body.numberOfPages);
            res.close();
        }, body.printDelay || 0);
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
