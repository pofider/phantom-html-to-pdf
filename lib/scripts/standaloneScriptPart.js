/*!
 * Copyright(c) 2015 Jan Blaha
 */
/* globals phantom */


var webpage = require('webpage');
var system = require('system');
var fs = require('fs');
var page = webpage.create();

var settingsFile = system.args[system.args.length - 1];
var stream = fs.open(settingsFile, "r");
var body = JSON.parse(stream.read());
stream.close();

function render(page, body) {
    setTimeout(function () {
        page.render(body.output);
        console.log(body.numberOfPages);
        phantom.exit(0);

    }, body.printDelay || 0);
}

$conversion



