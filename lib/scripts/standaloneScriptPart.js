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

function respond(page, body) {
    console.log(body.numberOfPages);

    // Work-around to avoid "Unsafe JavaScript attempt to access frame" warning in PhantomJS 1.9.8.
    // See: https://github.com/ariya/phantomjs/issues/12697
    // since we rely on stdout for the dedicated-process strategy this work-around
    // ensures the phantom process don't log anything we don't want
    page.close();

    setTimeout(function() {
        phantom.exit(0);
    }, 0);
}

$conversion



