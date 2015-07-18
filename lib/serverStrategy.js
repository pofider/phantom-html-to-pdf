var Phantom = require("phantom-workers"),
    fs = require("fs");

var phantom;

var startCb = [];
var starting, started;
function ensurePhantom(cb) {
    if (phantom.running)
        return cb();

    if (started)
        return cb();

    startCb.push(cb);

    if (starting)
        return;

    starting = true;
    phantom.start(function() {
        started = true;
        startCb.forEach(function(cb) { cb();})
    });
}

module.exports = function(options, requestOptions, id, cb) {
    if (!phantom)
        phantom = Phantom(options);


    ensurePhantom(function(err) {
        if (err)
            return cb(err);

        phantom.execute(requestOptions, function (err, res) {
            if (err)
                return cb(err);

            cb(null, {
                stream: fs.createReadStream(requestOptions.output),
                numberOfPages: res
            });
        });
    })
};
