/*!
 * Copyright(c) 2015 Jan Blaha
 */
/* globals phantom */

var maxLogEntrySize = require("system").env['PHANTON_MAX_LOG_ENTRY_SIZE']
$log

try {
    console.log('Converting in dedicated phantomjs ' + phantom.version.major + '.' + phantom.version.minor + '.' + phantom.version.patch);
    var webpage = require('webpage');
    var system = require('system');
    var fs = require('fs');
    var page = webpage.create();

    var settingsFile = system.args[system.args.length - 1];
    var stream = fs.open(settingsFile, "r");
    var body = JSON.parse(stream.read());
    stream.close();

    function respond(page, body){
        system.stdout.write(JSON.stringify({
            logs: messages,
            numberOfPages: body.numberOfPages
        }));

        // Work-around to avoid "Unsafe JavaScript attempt to access frame" warning in PhantomJS 1.9.8.
        // See: https://github.com/ariya/phantomjs/issues/12697
        // since we rely on stdout for the dedicated-process strategy this work-around
        // ensures the phantom process don't log anything we don't want
        page.close();

        setTimeout(function (){
            phantom.exit(0);
        }, 0);
    }

    $conversion
}
catch(e) {
    console.error(e.message);
    e.message += '; log: ' + JSON.stringify(messages);
    system.stderr.write(JSON.stringify(e));
    phantom.exit(1);
}



