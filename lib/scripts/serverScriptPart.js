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
var maxLogEntrySize = require("system").env['PHANTON_MAX_LOG_ENTRY_SIZE']
var page = webpage.create();

var service = webserver.listen(host + ':' + port, function (req, res){
    $log

    console.log('Converting in http server based phantomjs ' + phantom.version.major + '.' + phantom.version.minor + '.' + phantom.version.patch);

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');

    var body = JSON.parse(req.post);

    function respond(page, body){
        res.statusCode = 200;
        res.write(JSON.stringify({
            numberOfPages: body.numberOfPages,
            logs: messages
        }));
        res.close();
    }

    try {
        $conversion
    }
    catch (e) {
        console.error(e.message);
        res.statusCode = 500;
        e = new Error(e.message + '; log:' + JSON.stringify(messages));
        e.isError = true;

        res.write(JSON.stringify(e));
        res.close();
    }
});
